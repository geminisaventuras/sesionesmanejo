// @build: 2026-11-22 | id: ERR-019-D10 | desc: Política SSOT de instructoresPermitidos por curso (fail-closed: vacío/ausente = nadie permitido).

export const MOTIVO_CURSO_SIN_INSTRUCTORES = 'curso-sin-instructores-permitidos';
export const MOTIVO_INSTRUCTOR_NO_PERMITIDO = 'instructor-no-permitido-curso';
export const MOTIVO_CURSO_ACTIVO_SIN_INSTRUCTORES = 'curso-activo-sin-instructores';

const normalizarId = (valor) => (valor === null || valor === undefined ? '' : String(valor).trim());

/**
 * D10: normaliza la allowlist del curso. No interpreta "vacío" como
 * "todos": devuelve una lista vacía y `configurado: false`.
 */
export function obtenerPermitidosCurso(curso) {
  const lista = curso?.instructoresPermitidos;
  if (!Array.isArray(lista)) return { configurado: false, permitidos: [] };

  const permitidos = [];
  const vistos = new Set();
  for (const valor of lista) {
    const id = normalizarId(valor);
    if (!id || vistos.has(id)) continue;
    vistos.add(id);
    permitidos.push(id);
  }

  return { configurado: permitidos.length > 0, permitidos };
}

/**
 * D10: fail-closed. Sin allowlist configurada NADIE está permitido.
 */
export function instructorPermitidoEnCurso(curso, instructorId) {
  const { configurado, permitidos } = obtenerPermitidosCurso(curso);
  if (!configurado) return false;
  const id = normalizarId(instructorId);
  return id !== '' && permitidos.includes(id);
}

/**
 * Mensaje único para UI/servicio. No enumera tutores no permitidos.
 */
export function mensajeCursoSinInstructores() {
  return 'Este curso no tiene tutores habilitados. Contacta a la administración para completar la configuración del curso.';
}

/**
 * Validación para el admin: un curso activo debe declarar al menos un tutor.
 * Evita crear cursos que nazcan fail-closed y no puedan venderse.
 */
export function validarCursoActivoConInstructores(curso = {}) {
  if (curso?.activo === false) return { ok: true };
  const { configurado } = obtenerPermitidosCurso(curso);
  if (!configurado) {
    return {
      ok: false,
      code: MOTIVO_CURSO_ACTIVO_SIN_INSTRUCTORES,
      message: 'Selecciona al menos un instructor permitido: un curso activo sin allowlist no puede vender.'
    };
  }
  return { ok: true };
}

/**
 * Validación reutilizable por la UI y por ReservaService.
 */
export function validarInstructorPermitidoCurso({ curso, instructorId } = {}) {
  const { configurado } = obtenerPermitidosCurso(curso);
  if (!configurado) {
    return { ok: false, code: MOTIVO_CURSO_SIN_INSTRUCTORES, message: mensajeCursoSinInstructores() };
  }
  if (!instructorPermitidoEnCurso(curso, instructorId)) {
    return {
      ok: false,
      code: MOTIVO_INSTRUCTOR_NO_PERMITIDO,
      message: 'El tutor asignado no está habilitado para este curso. Elige otro horario.'
    };
  }
  return { ok: true };
}
