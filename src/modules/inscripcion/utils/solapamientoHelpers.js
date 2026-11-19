// @build: 2026-11-19 | id: BUG2-CROSSCHECK-OCUPACION | desc: Deteccion pura de solapamiento de instructor/moto (espejo + locks temporales)
import { getHoraIdOcupacion } from '../../shared/utils/reservaHelpers.js';

const ESTADOS_OCUPACION = ['Pendiente', 'Aprobado'];

// Normaliza texto: trim, minusculas y sin diacriticos.
// Necesario porque el negocio guarda 'Si' con tilde en traeMoto.
function normalizarTexto(valor) {
  return String(valor ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function traeMotoPropia(traeMoto) {
  return normalizarTexto(traeMoto) === 'si';
}

export function motoValida(motoId) {
  if (motoId === null || motoId === undefined) return false;
  const texto = String(motoId).trim();
  if (!texto) return false;
  return normalizarTexto(texto) !== 'sinmoto';
}

// Slots que ocupa la reserva objetivo: fecha + fecha2 con su bloque efectivo.
export function construirSlotsObjetivo({ fecha, fecha2 = null, horaId, horaId2 = null }) {
  const slots = [];
  if (fecha && horaId) slots.push({ fecha, bloqueId: horaId });
  if (fecha2 && fecha2 !== fecha && horaId) {
    slots.push({ fecha: fecha2, bloqueId: horaId2 || horaId });
  }
  return slots;
}

// Cross-check contra el espejo ocupacionConfirmada.
// NO excluye al propio usuario: una reserva propia solapada tambien es conflicto
// (idempotencia ante reintentos y doble sesion). Dictamen MAMBA 19/11/2026.
export function detectarSolapamiento({
  reservasConfirmadas = [],
  slotsObjetivo = [],
  instructorId = null,
  motoAsignadaId = null
}) {
  const conflictos = [];
  const motoObjetivo = motoValida(motoAsignadaId) ? String(motoAsignadaId) : null;

  if (slotsObjetivo.length === 0 || (!instructorId && !motoObjetivo)) {
    return { haySolapamiento: false, conflictos };
  }

  for (const reserva of reservasConfirmadas) {
    if (!reserva) continue;
    if (!ESTADOS_OCUPACION.includes(reserva.estadoPago)) continue;

    const conflictoInstructor = Boolean(instructorId) && reserva.instructorId === instructorId;
    const conflictoMoto = Boolean(motoObjetivo)
      && !traeMotoPropia(reserva.traeMoto)
      && (String(reserva.motoAsignadaId || '') === motoObjetivo
        || String(reserva.motoReposicionId || '') === motoObjetivo);

    if (!conflictoInstructor && !conflictoMoto) continue;

    for (const slot of slotsObjetivo) {
      const bloqueReserva = getHoraIdOcupacion(reserva, slot.fecha);
      if (!bloqueReserva || String(bloqueReserva) !== String(slot.bloqueId)) continue;

      conflictos.push({
        reservaId: reserva.id || null,
        fecha: slot.fecha,
        bloqueId: slot.bloqueId,
        tipo: conflictoInstructor && conflictoMoto
          ? 'instructor+moto'
          : (conflictoInstructor ? 'instructor' : 'moto'),
        instructorId: reserva.instructorId || null,
        motoAsignadaId: reserva.motoAsignadaId || null
      });
      break; // Un conflicto por reserva es suficiente para bloquear.
    }
  }

  return { haySolapamiento: conflictos.length > 0, conflictos };
}

// Cross-check contra locks temporales (ocupacionTemporal).
// Cierra la ventana "mismo instructor + distinta moto" (Escenario 3 del analisis TOCTOU).
// Excluye unicamente el lock del propio usuario.
export function detectarLocksActivos({
  locksTemporales = [],
  slotsObjetivo = [],
  instructorId = null,
  currentUserId = null,
  ahora = Date.now()
}) {
  const conflictos = [];
  if (!instructorId || slotsObjetivo.length === 0) {
    return { hayConflicto: false, conflictos };
  }

  for (const lock of locksTemporales) {
    if (!lock || !lock.userId || !lock.instructorId || !lock.horaId || !lock.fecha) continue;
    if (lock.userId === currentUserId) continue;
    if (lock.instructorId !== instructorId) continue;

    const expira = lock.expiresAt?.toMillis?.() ?? null;
    if (!expira || expira <= ahora) continue;

    const coincide = slotsObjetivo.some(
      slot => slot.fecha === lock.fecha && String(slot.bloqueId) === String(lock.horaId)
    );
    if (!coincide) continue;

    conflictos.push({
      lockId: lock.id || null,
      fecha: lock.fecha,
      bloqueId: lock.horaId,
      motivo: 'lock_activo_otro_usuario'
    });
  }

  return { hayConflicto: conflictos.length > 0, conflictos };
}
