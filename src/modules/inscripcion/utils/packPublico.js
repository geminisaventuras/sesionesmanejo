// @build: 2026-11-22 | id: T-060-PACK-PUBLICO | desc: Proyección pública de packs sin comisiones, déficits ni datos internos; función pura.
//
// Reglas duras:
// - Solo campos públicos. Nunca comisiones*, deficits*, teoricosPrecios, calculadoPor,
//   preciosBase, preciosProrrateados, motoIncluidaPorCurso ni el snapshot `precios`.
// - De los teóricos solo se publica `teoricosCount`: nunca IDs, nombres ni precios individuales.
// - Montos: prioriza el snapshot `pack.precios` ya calculado. Si falta, recalcula con
//   la función pura `calcularPreciosPack` (misma fórmula) usando el catálogo recibido.
// - Si no puede garantizar el total completo, devuelve `null`: nunca un monto parcial.
// - Función pura y determinista: no lee Firestore, reloj, localStorage ni variables de entorno.

import { calcularPreciosPack } from './packPricing.js';

export const PACK_PUBLICO_VERSION = 1;

/** Campos permitidos en `packsPublicos/{packId}` (whitelist estricta, top-level). */
export const CAMPOS_PACK_PUBLICO = Object.freeze([
  'version',
  'id',
  'nombre',
  'descripcion',
  'activo',
  'cursoIds',
  'teoricosCount',
  'sumarTeoricosAlPrecio',
  'descuentoTipo',
  'descuentoValor',
  'vencimientoDias',
  'preciosPublicos',
  'actualizadoEn',
]);

/** Campos de `preciosPublicos` (whitelist estricta). */
export const CAMPOS_PRECIOS_PUBLICOS = Object.freeze(['moneda', 'base', 'final', 'ahorro']);

/** Claves internas que jamás deben aparecer en la proyección, en ningún nivel. */
export const CAMPOS_INTERNOS_PACK = Object.freeze([
  'precios',
  'preciosBase',
  'preciosProrrateados',
  'comisionesInstructor',
  'comisionesProveedorMotoEmpresa',
  'comisionesProveedorMotoPropia',
  'deficitsMotoEmpresa',
  'deficitsMotoPropia',
  'teoricosPrecios',
  'teoricosIds',
  'calculadoPor',
  'calculadoEn',
  'motoIncluidaPorCurso',
  'permiteTraerMotoPropiaPorCurso',
]);

const INTERNOS = new Set(CAMPOS_INTERNOS_PACK);
const PERMITIDOS = new Set(CAMPOS_PACK_PUBLICO);
const PERMITIDOS_PRECIOS = new Set(CAMPOS_PRECIOS_PUBLICOS);

const redondear2 = (valor) => Number((Number(valor) || 0).toFixed(2));

/**
 * Monto estricto para recalcular: `null`, `''`, `'   '`, booleanos, objetos y
 * texto no numérico se rechazan. `Number(null)`/`Number('')` darían 0 y
 * publicarían un total subestimado (H-1/ERR-027).
 */
function aMonto(valor) {
  if (valor == null) return null;
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
  if (typeof valor !== 'string') return null;
  const texto = valor.trim();
  if (!texto) return null;
  const monto = Number(texto);
  return Number.isFinite(monto) ? monto : null;
}

function listaIds(valor) {
  if (!Array.isArray(valor)) return [];
  const ids = [];
  const vistos = new Set();
  for (const item of valor) {
    if (item == null) continue;
    const id = String(item).trim();
    if (!id || vistos.has(id)) continue;
    vistos.add(id);
    ids.push(id);
  }
  return ids;
}

function mapaPorId(items) {
  return new Map(
    (Array.isArray(items) ? items : [])
      .filter((item) => item && typeof item === 'object' && item.id != null)
      .map((item) => [String(item.id), item])
  );
}

/** Montos desde el snapshot ya calculado (`pack.precios`). */
function montosDesdeSnapshot(precios) {
  if (!precios || typeof precios !== 'object' || Array.isArray(precios)) return null;

  // Validación estricta: un snapshot corrupto ('abc', NaN, true, [5], objetos)
  // no puede degradarse a 0/1 por coerción (ERR-028).
  const base = aMonto(precios.precioBaseTotal);
  const final = aMonto(precios.precioTotal);
  if (base === null || final === null) return null;

  const baseCents = Math.round(base * 100);
  const finalCents = Math.round(final * 100);
  if (baseCents <= 0 || finalCents < 0 || finalCents > baseCents) return null;

  return {
    moneda: 'USD',
    base: redondear2(baseCents / 100),
    final: redondear2(finalCents / 100),
    ahorro: redondear2((baseCents - finalCents) / 100),
  };
}

/** Recalcula con la misma fórmula de precios usando el catálogo recibido. */
function montosRecalculados({
  cursoIds,
  cursos,
  cursosTeoricosIncluidos,
  cursosTeoricos,
  descuentoTipo,
  descuentoValor,
  sumarTeoricosAlPrecio,
}) {
  if (cursoIds.length === 0) return null;

  const cursosPorId = mapaPorId(cursos);
  const cursosPack = [];
  for (const id of cursoIds) {
    const curso = cursosPorId.get(id);
    if (!curso) return null;
    const precioBase = aMonto(curso.precioBase);
    if (precioBase === null || precioBase < 0) return null;
    cursosPack.push({ ...curso, id, precioBase });
  }

  const teoricosPorId = mapaPorId(cursosTeoricos);
  const teoricosPack = [];
  if (sumarTeoricosAlPrecio) {
    for (const id of cursosTeoricosIncluidos) {
      const teorico = teoricosPorId.get(id);
      if (!teorico) return null;
      const precio = aMonto(teorico.precio);
      if (precio === null || precio < 0) return null;
      teoricosPack.push({ ...teorico, id, precio });
    }
  }

  try {
    const calculado = calcularPreciosPack({
      cursos: cursosPack,
      cursosTeoricos: teoricosPack,
      descuentoTipo,
      descuentoValor,
      sumarTeoricosAlPrecio: sumarTeoricosAlPrecio && teoricosPack.length > 0,
    });
    return {
      moneda: 'USD',
      base: calculado.precioBaseTotal,
      final: calculado.precioTotal,
      ahorro: calculado.descuentoMonto,
    };
  } catch {
    return null;
  }
}

/**
 * Construye la proyección pública de un pack.
 *
 * @param {object} opciones
 * @param {object} opciones.pack Pack maestro (idealmente con snapshot `precios`).
 * @param {object[]} [opciones.cursos] Catálogo de cursos (solo si falta el snapshot).
 * @param {object[]} [opciones.cursosTeoricos] Catálogo de teóricos (solo si falta el snapshot).
 * @param {*} [opciones.actualizadoEn] Marca de tiempo/valor de trazabilidad (opcional).
 * @returns {object|null} Documento público seguro o `null` si no se puede garantizar el total.
 */
export function construirPackPublico({
  pack,
  cursos = [],
  cursosTeoricos = [],
  actualizadoEn = null,
} = {}) {
  if (!pack || typeof pack !== 'object') return null;

  const id = pack.id == null ? '' : String(pack.id).trim();
  if (!id) return null;

  const nombre = typeof pack.nombre === 'string' ? pack.nombre.trim() : '';
  if (!nombre) return null;

  const cursoIds = listaIds(pack.cursoIds);
  const cursosTeoricosIncluidos = listaIds(pack.cursosTeoricosIncluidos);
  const sumarTeoricosAlPrecio = pack.sumarTeoricosAlPrecio === true;
  const descuentoTipo = typeof pack.descuentoTipo === 'string' && pack.descuentoTipo.trim()
    ? pack.descuentoTipo.trim()
    : 'porcentaje';
  const descuentoValor = Math.max(0, Number(pack.descuentoValor) || 0);

  const preciosPublicos = montosDesdeSnapshot(pack.precios) || montosRecalculados({
    cursoIds,
    cursos,
    cursosTeoricosIncluidos,
    cursosTeoricos,
    descuentoTipo,
    descuentoValor,
    sumarTeoricosAlPrecio,
  });
  if (!preciosPublicos) return null;

  return {
    version: PACK_PUBLICO_VERSION,
    id,
    nombre,
    descripcion: typeof pack.descripcion === 'string' ? pack.descripcion.trim() : '',
    // Paridad con la consulta pública actual `where('activo','==',true)`:
    // un pack sin `activo: true` tampoco se publica hoy.
    activo: pack.activo === true,
    cursoIds,
    // Solo el conteo: los IDs de teóricos son internos (ERR-023).
    teoricosCount: cursosTeoricosIncluidos.length,
    sumarTeoricosAlPrecio,
    descuentoTipo,
    descuentoValor,
    vencimientoDias: Math.max(0, Math.round(Number(pack.vencimientoDias) || 0)),
    preciosPublicos,
    actualizadoEn: actualizadoEn ?? null,
  };
}

function buscarClavesInternas(valor, ruta, encontradas) {
  if (Array.isArray(valor)) {
    valor.forEach((item, indice) => buscarClavesInternas(item, `${ruta}[${indice}]`, encontradas));
    return;
  }
  if (!valor || typeof valor !== 'object') return;
  for (const [clave, hijo] of Object.entries(valor)) {
    const rutaHijo = ruta ? `${ruta}.${clave}` : clave;
    if (INTERNOS.has(clave)) encontradas.push(rutaHijo);
    buscarClavesInternas(hijo, rutaHijo, encontradas);
  }
}

/**
 * Valida que un documento de proyección no exponga campos internos.
 * Usado por el backfill antes de escribir y por las pruebas unitarias.
 *
 * @param {object} doc
 * @returns {{ok: boolean, errores: string[]}}
 */
export function validarPackPublico(doc) {
  const errores = [];
  if (!doc || typeof doc !== 'object') return { ok: false, errores: ['documento vacío o inválido'] };

  const extras = Object.keys(doc).filter((clave) => !PERMITIDOS.has(clave));
  if (extras.length > 0) errores.push(`campos no públicos: ${extras.join(', ')}`);

  const internos = [];
  buscarClavesInternas(doc, '', internos);
  if (internos.length > 0) errores.push(`campos internos: ${[...new Set(internos)].join(', ')}`);

  if (typeof doc.id !== 'string' || doc.id.trim() === '') errores.push('id inválido');
  if (typeof doc.nombre !== 'string' || doc.nombre.trim() === '') errores.push('nombre inválido');
  if (typeof doc.activo !== 'boolean') errores.push('activo debe ser booleano');
  if (!Array.isArray(doc.cursoIds)) errores.push('cursoIds debe ser lista');
  if (!Number.isInteger(doc.teoricosCount) || doc.teoricosCount < 0) {
    errores.push('teoricosCount debe ser entero >= 0');
  }
  if ('cursosTeoricosIncluidos' in doc) errores.push('cursosTeoricosIncluidos no debe publicarse');

  const precios = doc.preciosPublicos;
  if (!precios || typeof precios !== 'object') {
    errores.push('preciosPublicos ausente');
  } else {
    const extrasPrecios = Object.keys(precios).filter((clave) => !PERMITIDOS_PRECIOS.has(clave));
    if (extrasPrecios.length > 0) errores.push(`preciosPublicos con campos no públicos: ${extrasPrecios.join(', ')}`);
    const base = Number(precios.base);
    const final = Number(precios.final);
    const ahorro = Number(precios.ahorro);
    if (!Number.isFinite(base) || base <= 0) errores.push('preciosPublicos.base inválida');
    if (!Number.isFinite(final) || final < 0) errores.push('preciosPublicos.final inválida');
    if (!Number.isFinite(ahorro) || ahorro < 0) errores.push('preciosPublicos.ahorro inválido');
    if (Number.isFinite(base) && Number.isFinite(final) && final > base) {
      errores.push('preciosPublicos.final mayor que base');
    }
    if (Number.isFinite(base) && Number.isFinite(final) && Number.isFinite(ahorro)) {
      if (Math.abs(ahorro - (base - final)) > 0.005) errores.push('preciosPublicos.ahorro incoherente');
    }
    if (precios.moneda !== 'USD') errores.push('preciosPublicos.moneda debe ser USD');
  }

  return { ok: errores.length === 0, errores };
}
