// @build: 2026-11-23 | id: T-098-PRECIOS-CURSO | desc: Proyección determinista de preciosCurso compartida por backfill y admin (fuente única).
import { calcularPrecioIndividual, resolverTasaFXVigente } from './precioIndividual.js';

const CAMPOS_VARIANTE = [
  'precioBase', 'recargoSede', 'recargoSinBici', 'recargoAlquilerMoto',
  'descuentoMotoPropia', 'descuentoPromo', 'precioTotal', 'pagoTotalVES',
  'comisionInstructor', 'comisionProveedor', 'deficitComision',
  'motoIncluida', 'permiteTraerMotoPropia', 'sedeNombre', 'guarenas',
  'tasaFX', 'monedaCobro',
];

function varianteDe(precio) {
  const variante = {};
  for (const campo of CAMPOS_VARIANTE) variante[campo] = precio[campo];
  return variante;
}

/**
 * Genera la proyección determinista de un curso (pura, sin IO).
 * La usan el backfill (`scripts/backfill-precios-curso.mjs`) y el guardado
 * de cursos del admin para que `cursos` y `preciosCurso` no diverjan.
 */
export function construirPreciosCurso(curso, config, sedes) {
  const listaSedes = Array.isArray(sedes) ? sedes : [];
  const variantes = {};
  for (const sede of listaSedes) {
    for (const traeMoto of ['Sí', 'No']) {
      for (const sabeBicicleta of ['Sí', 'No']) {
        const precio = calcularPrecioIndividual({
          curso,
          config,
          sede,
          sedeId: sede.id,
          sabeBicicleta,
          traeMoto,
        });
        // La clave usa el traeMoto resuelto por el curso.
        variantes[`${precio.sedeId}|${precio.traeMoto}|${precio.sabeBicicleta}`] =
          varianteDe(precio);
      }
    }
  }
  return {
    version: 1,
    cursoId: String(curso.id),
    instructoresPermitidos: Array.isArray(curso.instructoresPermitidos)
      ? curso.instructoresPermitidos
      : [],
    motoIncluida: curso.motoIncluida !== false,
    permiteTraerMotoPropia: curso.permiteTraerMotoPropia !== false,
    comisionInstructor: Number(curso.comisionInstructor) || 0,
    monedaCobro: config?.monedaCobroClientes || 'EUR',
    tasaFX: resolverTasaFXVigente(config),
    variantes,
  };
}

/**
 * Proyecciones de todos los cursos para un catálogo de sedes (pura, sin IO).
 * La usan `saveCurso`, `saveSede` y el backfill: si cambia el recargo de una
 * sede, la matriz `preciosCurso` se regenera completa para que la regla
 * `precioIndividualValido` no compare contra valores obsoletos (ERR-056).
 */
export function construirProyeccionesCursos(cursos, config, sedes) {
  const lista = Array.isArray(cursos) ? cursos : [];
  return lista
    .filter((curso) => curso && curso.id != null)
    .map((curso) => ({
      id: String(curso.id),
      proyeccion: construirPreciosCurso(curso, config, sedes),
    }));
}
