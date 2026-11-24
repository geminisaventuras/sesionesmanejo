// @build: 2026-11-22 | id: T-052-PRECIO-PACK-PUBLICO | desc: Resuelve el total completo de un pack para la vista pública sin exponer IDs/nombres de teóricos.
//
// Reglas duras:
// - Prioridad 1: proyección pública `pack.preciosPublicos` (T-060) si es válida: moneda USD,
//   base > 0, 0 <= final <= base y ahorro coherente con base-final (tolerancia 0.005).
// - Prioridad 2: snapshot `pack.precios` (precioBaseTotal/precioTotal) generado por FormPack.
// - Prioridad 3: recalcular con `calcularPreciosPack` usando los precios públicos de teóricos.
// - Si falta cualquier dato del total, devolver `no_disponible`: nunca un monto incompleto.
// - La salida solo contiene montos; no incluye IDs, nombres ni precios individuales.

import { calcularPreciosPack } from '../../inscripcion/utils/packPricing.js';

const redondear2 = (valor) => Number((Number(valor) || 0).toFixed(2));

/**
 * Monto estricto: `null`, `''`, `'   '`, booleanos, objetos y texto no numérico se rechazan.
 * `Number(null)`/`Number('')` darían 0 y publicarían un total subestimado (H-1/ERR-027).
 */
function montoEstricto(valor) {
  if (valor == null) return null;
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
  if (typeof valor !== 'string') return null;
  const texto = valor.trim();
  if (!texto) return null;
  const monto = Number(texto);
  return Number.isFinite(monto) ? monto : null;
}

/**
 * Valida y normaliza `pack.preciosPublicos` (proyección T-060) con la misma disciplina
 * monetaria que `construirPackPublico`: moneda USD, base > 0, 0 <= final <= base y
 * ahorro >= 0 coherente con base-final (tolerancia 0.005).
 *
 * @param {*} precios
 * @returns {{base:number, final:number, ahorro:number}|null}
 */
function preciosPublicosValidos(precios) {
  if (!precios || typeof precios !== 'object' || Array.isArray(precios)) return null;
  if (precios.moneda !== 'USD') return null;

  const base = montoEstricto(precios.base);
  const final = montoEstricto(precios.final);
  const ahorro = montoEstricto(precios.ahorro);
  if (base === null || final === null || ahorro === null) return null;

  // Centavos para evitar comparaciones con error de coma flotante.
  const baseCents = Math.round(base * 100);
  const finalCents = Math.round(final * 100);
  if (baseCents <= 0 || finalCents < 0 || finalCents > baseCents) return null;
  if (ahorro < 0 || Math.abs(ahorro - (base - final)) > 0.005) return null;

  return {
    base: redondear2(baseCents / 100),
    final: redondear2(finalCents / 100),
    ahorro: redondear2(ahorro)
  };
}

function precioDesdeSnapshot(precios) {
  if (!precios || typeof precios !== 'object' || Array.isArray(precios)) return null;

  // Validación estricta: un snapshot corrupto ('abc', NaN, true, [5], objetos)
  // no puede degradarse a 0/1 por coerción (ERR-028).
  const base = montoEstricto(precios.precioBaseTotal);
  const final = montoEstricto(precios.precioTotal);
  if (base === null || final === null) return null;
  if (base <= 0 || final < 0) return null;
  const baseCents = Math.round(base * 100);
  const finalCents = Math.round(final * 100);
  if (finalCents > baseCents) return null;
  return {
    estado: 'disponible',
    base: redondear2(baseCents / 100),
    final: redondear2(finalCents / 100),
    ahorro: redondear2((baseCents - finalCents) / 100),
    origen: 'snapshot'
  };
}

function precioTeorico(preciosTeoricos, id) {
  if (preciosTeoricos == null) return undefined;
  const clave = String(id);
  if (preciosTeoricos instanceof Map) return preciosTeoricos.get(clave);
  if (Array.isArray(preciosTeoricos)) {
    const encontrado = preciosTeoricos.find((item) => String(item?.id) === clave);
    return encontrado?.precio;
  }
  if (typeof preciosTeoricos === 'object') {
    const valor = preciosTeoricos[clave];
    return valor && typeof valor === 'object' ? valor.precio : valor;
  }
  return undefined;
}

/**
 * Indica si el pack necesita los precios públicos de teóricos para calcular su total.
 * Los `preciosPublicos` de la proyección T-060 o un snapshot válido evitan la lectura adicional.
 */
export function packRequierePreciosTeoricos(pack) {
  if (!pack) return false;
  if (preciosPublicosValidos(pack.preciosPublicos)) return false;
  if (!pack.sumarTeoricosAlPrecio) return false;
  const ids = Array.isArray(pack.cursosTeoricosIncluidos) ? pack.cursosTeoricosIncluidos : [];
  if (ids.length === 0) return false;
  return precioDesdeSnapshot(pack.precios) === null;
}

/**
 * Resuelve el precio visible de un pack para un visitante anónimo.
 *
 * @param {object} opciones
 * @param {object} opciones.pack Pack público (idealmente normalizado por `construirRutaAprendizaje`).
 * @param {object[]} [opciones.cursos] Catálogo público de sesiones.
 * @param {Map|object[]|object} [opciones.preciosTeoricos] Precios públicos de teóricos (id → precio).
 * @returns {{estado:'disponible',base:number,final:number,ahorro:number,origen:'preciosPublicos'|'snapshot'|'calculado'}|{estado:'no_disponible'}}
 */
export function resolverPrecioPackPublico({ pack, cursos = [], preciosTeoricos = null } = {}) {
  if (!pack || typeof pack !== 'object') return { estado: 'no_disponible' };

  // T-060: la proyección pública ya trae montos validados; gana sobre snapshot y recálculo.
  const preciosPublicos = preciosPublicosValidos(pack.preciosPublicos);
  if (preciosPublicos) {
    return {
      estado: 'disponible',
      base: preciosPublicos.base,
      final: preciosPublicos.final,
      ahorro: preciosPublicos.ahorro,
      origen: 'preciosPublicos'
    };
  }

  const snapshot = precioDesdeSnapshot(pack.precios);
  if (snapshot) return snapshot;

  const cursoIds = Array.isArray(pack.cursoIds) ? pack.cursoIds : [];
  if (cursoIds.length === 0) return { estado: 'no_disponible' };

  const cursosPorId = new Map(
    (Array.isArray(cursos) ? cursos : [])
      .filter((curso) => curso && curso.id != null)
      .map((curso) => [String(curso.id), curso])
  );

  const cursosPack = [];
  for (const id of cursoIds) {
    const curso = cursosPorId.get(String(id));
    if (!curso) return { estado: 'no_disponible' };
    const precioBaseCrudo = curso.precioBase;
    if (precioBaseCrudo == null || precioBaseCrudo === '') return { estado: 'no_disponible' };
    const precioBase = Number(precioBaseCrudo);
    if (!Number.isFinite(precioBase)) return { estado: 'no_disponible' };
    cursosPack.push({ id: curso.id, precioBase });
  }

  const teoricosIncluidos = pack.sumarTeoricosAlPrecio && Array.isArray(pack.cursosTeoricosIncluidos)
    ? pack.cursosTeoricosIncluidos
    : [];
  const teoricosPack = [];
  if (teoricosIncluidos.length > 0) {
    // Sin precios públicos de teóricos no se puede garantizar el total completo.
    if (preciosTeoricos == null) return { estado: 'no_disponible' };
    for (const id of teoricosIncluidos) {
      const precioCrudo = precioTeorico(preciosTeoricos, id);
      if (precioCrudo == null || precioCrudo === '') return { estado: 'no_disponible' };
      const precio = Number(precioCrudo);
      if (!Number.isFinite(precio)) return { estado: 'no_disponible' };
      teoricosPack.push({ id, precio });
    }
  }

  try {
    const calculado = calcularPreciosPack({
      cursos: cursosPack,
      cursosTeoricos: teoricosPack,
      // Igual que la UI existente: solo 'porcentaje' descuenta porcentaje; el resto es monto fijo.
      descuentoTipo: pack.descuentoTipo === 'porcentaje' ? 'porcentaje' : 'monto',
      descuentoValor: Number(pack.descuentoValor) || 0,
      sumarTeoricosAlPrecio: teoricosPack.length > 0
    });
    return {
      estado: 'disponible',
      base: calculado.precioBaseTotal,
      final: calculado.precioTotal,
      ahorro: calculado.descuentoMonto,
      origen: 'calculado'
    };
  } catch {
    return { estado: 'no_disponible' };
  }
}
