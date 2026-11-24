// @build: 2026-11-22 | id: ERR-020-D11 | desc: Validación pura de instructor/moto asignados antes de crear una reserva (fail-closed).

const normalizarTexto = (valor) => String(valor ?? '')
  .trim()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

const normalizarId = (valor) => (valor === null || valor === undefined ? '' : String(valor).trim());

const error = (code, message) => ({ ok: false, code, message });

/**
 * D11: el servicio no debe confiar en que el tutor del lock exista, siga
 * activo y cubra la sede elegida. El curso no se valida aquí: la política de
 * `instructoresPermitidos` no cambia en este alcance.
 */
export function validarInstructorAsignado({ instructor, sedeId } = {}) {
  if (!instructor) {
    return error('instructor-not-found', 'El tutor seleccionado ya no existe. Elige otro horario.');
  }
  if (instructor.activo === false) {
    return error('instructor-inactivo', 'El tutor asignado ya no está activo. Elige otro horario.');
  }
  const sedes = Array.isArray(instructor.sedes) ? instructor.sedes.map(normalizarId) : [];
  const sede = normalizarId(sedeId);
  if (sedes.length > 0 && sede && !sedes.includes(sede)) {
    return error('instructor-sede-invalida', 'El tutor no está disponible en la sede seleccionada. Elige otro horario.');
  }
  return { ok: true };
}

/**
 * D11: valida la moto escolar efectiva de la reserva. Si no hay moto (trae su
 * propia moto o el curso no incluye moto) no aplica. La compatibilidad de tipo
 * usa `curso.tiposMotoEscuela` como SSOT, igual que la UI.
 */
export function validarMotoAsignada({ moto, motoId, sedeId, curso } = {}) {
  if (!normalizarId(motoId)) return { ok: true };
  if (!moto) {
    return error('moto-not-found', 'La moto asignada ya no existe. Elige otro horario.');
  }
  if (moto.activo === false) {
    return error('moto-inactiva', 'La moto asignada ya no está activa. Elige otro horario.');
  }
  const sedes = Array.isArray(moto.sedes) ? moto.sedes.map(normalizarId) : [];
  const sede = normalizarId(sedeId);
  if (sedes.length > 0 && sede && !sedes.includes(sede)) {
    return error('moto-sede-invalida', 'La moto asignada no está disponible en la sede seleccionada. Elige otro horario.');
  }
  const tipos = Array.isArray(curso?.tiposMotoEscuela)
    ? curso.tiposMotoEscuela.map(normalizarTexto).filter(Boolean)
    : [];
  const tipoMoto = normalizarTexto(moto.tipo);
  if (tipos.length > 0 && tipoMoto && !tipos.includes(tipoMoto)) {
    return error('moto-tipo-incompatible', 'La moto asignada no es compatible con este curso. Elige otro horario.');
  }
  return { ok: true };
}
