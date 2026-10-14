// @build: 2026-10-13 | id: SSOT-MOTO-HELPERS | desc: Helper SSOT para derivar necesidad de moto de escuela
// SSOT único. Prohibido duplicar esta lógica en consumidores.
//
// Regla de negocio:
// - Si el curso NO incluye moto (motoIncluida: false) → nunca se necesita moto de escuela.
// - Si el curso SÍ incluye moto (motoIncluida: true o undefined) → se necesita
//   moto de escuela SOLO si el usuario no trae la suya (traeMoto !== 'Sí').
//
// Compatibilidad: `undefined` se trata como true (packs legacy sin el campo).

/**
 * Deriva si el usuario necesita moto de escuela para un curso.
 *
 * @param {object} curso     - Curso seleccionado (con campos motoIncluida, etc.)
 * @param {string} traeMoto  - 'Sí' | 'No' | ''
 * @returns {{ cursoIncluyeMoto: boolean, necesitaMoto: boolean }}
 */
export function calcularNecesitaMoto(curso, traeMoto) {
  const cursoIncluyeMoto = curso?.motoIncluida !== false;
  const necesitaMoto = cursoIncluyeMoto && traeMoto !== 'Sí';
  return { cursoIncluyeMoto, necesitaMoto };
}

/**
 * ¿Se puede calcular disponibilidad para este contexto?
 * Regla:
 * - Curso NO incluye moto (motoIncluida: false) → solo requiere sede.
 * - Curso SÍ incluye moto → requiere sede + tipoMoto elegido.
 *
 * @param {string} sedeId
 * @param {string} tipoMoto
 * @param {object} curso
 * @returns {boolean}
 */
export function puedeCalcularDisponibilidad(sedeId, tipoMoto, curso) {
  if (!sedeId) return false;
  const cursoIncluyeMoto = curso?.motoIncluida !== false;
  if (!cursoIncluyeMoto) return true;
  return !!tipoMoto;
}
