// @build: 2026-10-13 | id: SSOT-BLOQUEOS-PASO1 | desc: Helpers puros para validación de bloqueos (admin + proveedor)
// SSOT único de validación de bloqueos. Prohibido duplicar esta lógica en consumidores.
//
// ESQUEMAS (conviven, NO normalizar sin consulta):
// - bloqueosAdmin: { fechaInicio, fechaFin, todoElDia, horarios[], sedeId }
// - bloqueosProveedor: { motoId, fecha, horaInicio, horaFin }
//
// Fecha siempre en formato 'YYYY-MM-DD' (zona América/Caracas).

/**
 * ¿El bloqueoAdmin afecta esta fecha + sede?
 * NO evalúa si el bloqueo cubre el horario — para eso usar afectaHorarioAdmin.
 *
 * @param {object} bloqueo  - Doc de bloqueosAdmin
 * @param {string} fecha    - 'YYYY-MM-DD'
 * @param {string} sedeId   - ID de la sede del contexto (form.sedeId, reserva.sedeId, etc.)
 * @returns {boolean}
 */
export function afectaFechaAdmin(bloqueo, fecha, sedeId) {
  if (!bloqueo || !fecha) return false;
  if (fecha < bloqueo.fechaInicio) return false;
  const fin = bloqueo.fechaFin || bloqueo.fechaInicio;
  if (fecha > fin) return false;
  // Si el bloqueo tiene sede específica, debe coincidir con la del contexto
  if (bloqueo.sedeId && String(bloqueo.sedeId) !== String(sedeId)) return false;
  return true;
}

/**
 * ¿El bloqueoAdmin cubre este horario?
 * Debe combinarse con afectaFechaAdmin. Si `todoElDia`, cubre todos.
 *
 * @param {object} bloqueo  - Doc de bloqueosAdmin
 * @param {string} horaId   - 'h1', 'h2', ...
 * @returns {boolean}
 */
export function afectaHorarioAdmin(bloqueo, horaId) {
  if (!bloqueo || !horaId) return false;
  if (bloqueo.todoElDia) return true;
  return (bloqueo.horarios || []).includes(horaId);
}

/**
 * ¿El bloqueoProveedor afecta esta moto + fecha + horario?
 *
 * @param {object} bloqueo   - Doc de bloqueosGlobales (proveedor)
 * @param {string} motoId    - ID de la moto asignada
 * @param {string} fecha     - 'YYYY-MM-DD'
 * @param {string} horaLabel - '08:00 AM - 10:00 AM' (label del horario)
 * @returns {boolean}
 */
export function afectaProveedor(bloqueo, motoId, fecha, horaLabel) {
  if (!bloqueo || !fecha || !horaLabel) return false;
  if (bloqueo.motoId !== motoId && bloqueo.motoId !== 'ALL') return false;
  if (bloqueo.fecha !== fecha) return false;

  // Convertir rango [horaInicio, horaFin] a minutos
  const [hIni, mIni] = (bloqueo.horaInicio || '00:00').split(':').map(Number);
  const [hFin, mFin] = (bloqueo.horaFin || '23:59').split(':').map(Number);
  const rangoInicio = hIni * 60 + mIni;
  const rangoFin = hFin * 60 + mFin;

  // Extraer hora de inicio del bloque (formato '08:00 AM')
  const labelParts = horaLabel.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!labelParts) return false;

  let hBloque = parseInt(labelParts[1], 10);
  const mBloque = parseInt(labelParts[2], 10);
  const mod = labelParts[3].toUpperCase();

  if (mod === 'PM' && hBloque < 12) hBloque += 12;
  if (mod === 'AM' && hBloque === 12) hBloque = 0;

  const bloqueMinutos = hBloque * 60 + mBloque;
  return bloqueMinutos >= rangoInicio && bloqueMinutos < rangoFin;
}

/**
 * ¿El bloqueoInstructor afecta a este instructor en esta fecha + horario?
 * Schema de bloqueosInstructores:
 *   { instructorId, fechaInicio, fechaFin, todoElDia, horarios[], sedeId, motivo, estado, ... }
 *
 * Debe combinarse con el filtro por instructorId del array de bloqueos.
 *
 * @param {object} bloqueo   - Doc de bloqueosInstructores
 * @param {string} instructorId - ID del instructor a evaluar
 * @param {string} fecha     - 'YYYY-MM-DD'
 * @param {string} horaId    - 'h1', 'h2', ... (o null para todoElDia)
 * @returns {boolean}
 */
export function afectaInstructor(bloqueo, instructorId, fecha, horaId, sedeId) {
  if (!bloqueo || !instructorId || !fecha) return false;
  if (String(bloqueo.instructorId) !== String(instructorId)) return false;
  // Soft-delete: cancelados no afectan.
  if (bloqueo.estado === 'cancelado') return false;
  // FIX-SEDE: si el bloqueo es específico de una sede, debe coincidir con la del contexto.
  // Si bloqueo.sedeId es null (o no existe) → aplica a todas las sedes.
  if (bloqueo.sedeId && String(bloqueo.sedeId) !== String(sedeId || '')) return false;
  // Rango de fechas
  if (fecha < bloqueo.fechaInicio) return false;
  const fin = bloqueo.fechaFin || bloqueo.fechaInicio;
  if (fecha > fin) return false;
  // Si es todoElDia, cubre cualquier hora.
  if (bloqueo.todoElDia) return true;
  // Si no es todoElDia, debe matchear alguno de los horarios seleccionados.
  if (!horaId) return false;
  return (bloqueo.horarios || []).includes(horaId);
}
