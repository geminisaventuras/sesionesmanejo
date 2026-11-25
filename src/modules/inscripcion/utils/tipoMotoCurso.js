/**
 * ERR-072: el tipo de moto de un curso sale de su configuracion
 * (`tiposMotoEscuela`), no de hardcodes por `tipoCurso`.
 *
 * - Curso con tipos configurados: solo se aceptan esos tipos.
 * - Curso sin tipos (legacy): se conserva el fallback que envie el llamador,
 *   porque el historico permitia cualquier tipo y no queremos romper cursos
 *   viejos sin configuracion.
 */
export function tiposMotoCurso(curso) {
  if (!Array.isArray(curso?.tiposMotoEscuela)) return [];
  return curso.tiposMotoEscuela
    .map((tipo) => (typeof tipo === 'string' ? tipo.trim() : ''))
    .filter(Boolean);
}

export function resolverTipoMotoCurso(curso, tipoActual, fallback = '') {
  const tipos = tiposMotoCurso(curso);
  if (tipos.length === 0) return fallback;

  const actual = typeof tipoActual === 'string' ? tipoActual.trim() : '';
  return tipos.includes(actual) ? actual : tipos[0];
}

export default resolverTipoMotoCurso;
