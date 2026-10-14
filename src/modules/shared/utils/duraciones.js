// @build: 2026-10-14 | id: FEATURE-DIAS-DURACION | desc: Helper para calcular y formatear días de duración.
// Regla de negocio: cada día = 2 horas (120 minutos).
// 120 min -> 1 día | 240 min -> 2 días | 600 min -> 5 días.

/**
 * Calcula la cantidad de días de una duración dada.
 * Regla: cada día son 120 minutos (2 horas).
 *
 * @param {number} minutos - Duración total en minutos.
 * @returns {number} Cantidad de días (entero, redondeo hacia arriba).
 */
export const calcularDias = (minutos) => {
  const m = Number(minutos);
  if (!m || m <= 0) return 0;
  return Math.ceil(m / 120);
};

/**
 * Calcula la cantidad de días de un pack sumando la duración de todos sus cursos.
 *
 * @param {object[]} cursosPack - Array de cursos con `duracionTotal`.
 * @returns {number} Cantidad de días totales del pack.
 */
export const calcularDiasPack = (cursosPack) => {
  if (!Array.isArray(cursosPack) || cursosPack.length === 0) return 0;
  const total = cursosPack.reduce((acc, c) => acc + (Number(c?.duracionTotal) || 0), 0);
  return calcularDias(total);
};

/**
 * Formatea una cantidad de días con singular/plural correcto.
 * Ej: 1 -> "1 día" | 2 -> "2 días" | 0 -> "0 días"
 *
 * @param {number} dias - Cantidad de días.
 * @returns {string} Texto formateado.
 */
export const formatearDias = (dias) => {
  const d = Number(dias) || 0;
  return `${d} ${d === 1 ? 'día' : 'días'}`;
};
