// Helper centralizado para resolver "hora efectiva" y "moto efectiva"
// de una reserva según el día actual del curso.
//
// Regla de negocio:
//   - Día 1: usa `horaId` y `motoAsignadaId` originales.
//   - Día 2: si existe `horaIdReposicion` / `motoReposicionId`,
//            esos son los efectivos (post-reprogramación).
//            Si no existen, usa los originales.
//
// La reserva original (fecha, horaId, motoAsignadaId) es INMUTABLE.
// Solo fecha2, horaIdReposicion y motoReposicionId se mueven.

// Calcula el día actual del curso según fecha y fecha2.
// Retorna 1 si aún no empezó D2 o no hay fecha2.
// Retorna 2 si hoy >= fecha2.
// Usa zona horaria Venezuela (America/Caracas).
export function getDiaActualReserva(reserva) {
  if (!reserva?.fecha2) return 1;
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });
  return hoy >= reserva.fecha2 ? 2 : 1;
}

// Retorna el horaId efectivo según el día actual.
// D1: horaId original. D2: horaIdReposicion si existe, sino horaId.
export function getHoraIdEfectivo(reserva, diaActual) {
  if (diaActual === 2 && reserva?.horaIdReposicion) {
    return reserva.horaIdReposicion;
  }
  return reserva?.horaId || null;
}

// Retorna el motoId efectivo según el día actual.
// D1: motoAsignadaId original. D2: motoReposicionId si existe, sino original.
export function getMotoIdEfectivo(reserva, diaActual) {
  if (diaActual === 2 && reserva?.motoReposicionId) {
    return reserva.motoReposicionId;
  }
  return reserva?.motoAsignadaId || null;
}

// Conveniencia: calcular diaActual + resolver horaId.
// Para consumidores que no tienen `diaActual` en mano.
export function getHoraIdEfectivoHoy(reserva) {
  return getHoraIdEfectivo(reserva, getDiaActualReserva(reserva));
}

// Conveniencia: calcular diaActual + resolver motoId.
export function getMotoIdEfectivoHoy(reserva) {
  return getMotoIdEfectivo(reserva, getDiaActualReserva(reserva));
}

// ─────────────────────────────────────────────────────────────
// Blindaje temporal (America/Caracas) — para filtrar bloques pasados
// ─────────────────────────────────────────────────────────────

// Convierte un instante a un Date cuyos componentes locales son el reloj de
// pared de America/Caracas. `ahora` puede ser Date o epoch ms; por defecto es
// el instante actual (comportamiento histórico de getCaracasTime).
function toCaracasWallClock(ahora = new Date()) {
  const base = ahora instanceof Date ? ahora : new Date(ahora);
  const caracasStr = base.toLocaleString('en-US', { timeZone: 'America/Caracas' });
  return new Date(caracasStr);
}

// Retorna la hora actual en zona horaria America/Caracas.
export function getCaracasTime() {
  return toCaracasWallClock(new Date());
}

// Fecha de hoy (YYYY-MM-DD) en Venezuela para el instante dado.
export function fechaVetHoy(ahora = new Date()) {
  const base = ahora instanceof Date ? ahora : new Date(ahora);
  return base.toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });
}

// Detecta si un bloque ya pasó (solo si la fecha es HOY).
// Recibe: fecha (YYYY-MM-DD), label del bloque (ej. "08:00 AM - 10:00 AM"),
// todayStr (YYYY-MM-DD en Venezuela) y `ahora` inyectable (default: instante actual).
export function isPastBlock(fecha, label, todayStr, ahora = new Date()) {
  if (fecha !== todayStr || !label) return false;
  try {
    const startStr = label.split('-')[0].trim();
    const parts = startStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!parts) return false;
    let hours = parseInt(parts[1], 10);
    const mins = parseInt(parts[2], 10);
    const modifier = parts[3].toUpperCase();
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    const caracasAhora = toCaracasWallClock(ahora);
    const blockTime = new Date(caracasAhora);
    blockTime.setHours(hours, mins, 0, 0);
    return caracasAhora > blockTime;
  } catch (e) { return false; }
}

// true si el bloque ya inició (fecha pasada, o hoy con la hora de inicio
// alcanzada). `ahora` es inyectable para pruebas y recalculos por tick.
export function bloqueYaInicio(fecha, label, ahora = new Date()) {
  if (!fecha) return false;
  const hoy = fechaVetHoy(ahora);
  if (fecha < hoy) return true;
  if (fecha > hoy) return false;
  return isPastBlock(fecha, label, hoy, ahora);
}

// Guard puro fail-closed para servicios de reserva:
//  - fecha pasada => `slot-past` (sin necesidad de label);
//  - fecha futura => permitido;
//  - hoy => exige label verificable (`slot-no-verificable` si falta) y
//    rechaza con `slot-past` si el bloque ya inició.
export function evaluarSlotPasado({ fecha, label = null, ahora = new Date() } = {}) {
  const hoy = fechaVetHoy(ahora);
  const mensajeVencido = 'Ese horario ya comenzó. Elige otro bloque.';
  if (!fecha) {
    return {
      ok: false,
      error: {
        code: 'slot-no-verificable',
        message: 'No pudimos verificar el horario. Recarga e intenta de nuevo.'
      }
    };
  }
  if (fecha < hoy) {
    return { ok: false, error: { code: 'slot-past', message: mensajeVencido } };
  }
  if (fecha > hoy) return { ok: true };
  if (!label) {
    return {
      ok: false,
      error: {
        code: 'slot-no-verificable',
        message: 'No pudimos verificar el horario. Recarga e intenta de nuevo.'
      }
    };
  }
  if (bloqueYaInicio(fecha, label, ahora)) {
    return { ok: false, error: { code: 'slot-past', message: mensajeVencido } };
  }
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────
// Helpers para disponibilidad (input: fecha buscada)
// ─────────────────────────────────────────────────────────────
//
// ⚠️ IMPORTANTE: NUNCA leer doc.horaId o doc.motoAsignadaId directamente
// desde documentos de `ocupacionConfirmada` para cálculos de disponibilidad.
// Usar SIEMPRE estos helpers.
//
// Razón: las reservas pueden tener horaIdReposicion y motoReposicionId
// para D2 reprogramado. Leer directamente causa overbooking (ver bug
// DISPONIBILIDAD-D2-REPUESTO-V1).
//
// Uso:
//   import { getHoraIdOcupacion } from '.../reservaHelpers';
//   const horaOcupada = getHoraIdOcupacion(doc, fechaBuscada);

// Determina qué horaId aplica en la fecha buscada.
// Casos:
//   - fecha === doc.fecha  → horaId (D1 original)
//   - fecha === doc.fecha2 → horaIdReposicion || horaId (D2 con/sin reposición)
//   - otro                 → null (fecha no aplica a la reserva)
export function getHoraIdOcupacion(doc, fechaBuscada) {
  if (!doc) return null;
  if (!fechaBuscada) {
    throw new TypeError('[reservaHelpers.getHoraIdOcupacion] fechaBuscada es requerida');
  }

  if (doc.fecha === fechaBuscada) {
    return doc.horaId ?? null;
  }

  if (doc.fecha2 === fechaBuscada) {
    return doc.horaIdReposicion || doc.horaId || null;
  }

  return null;
}

// Determina qué motoAsignadaId aplica en la fecha buscada.
// Casos:
//   - fecha === doc.fecha  → motoAsignadaId (D1 original)
//   - fecha === doc.fecha2 → motoReposicionId || motoAsignadaId (D2 con/sin reposición)
//   - otro                 → null
export function getMotoIdOcupacion(doc, fechaBuscada) {
  if (!doc) return null;
  if (!fechaBuscada) {
    throw new TypeError('[reservaHelpers.getMotoIdOcupacion] fechaBuscada es requerida');
  }

  if (doc.fecha === fechaBuscada) {
    return doc.motoAsignadaId ?? null;
  }

  if (doc.fecha2 === fechaBuscada) {
    return doc.motoReposicionId || doc.motoAsignadaId || null;
  }

  return null;
}

// ─────────────────────────────────────────────────────────────
// D2: conflicto por fecha usando bloque/moto EFECTIVOS
// ─────────────────────────────────────────────────────────────
// Comparan la ocupación de `fechaBuscada` resolviendo horaIdReposicion /
// motoReposicionId (no solo horaId / motoAsignadaId). Puras: sin Firestore.

export const ESTADOS_OCUPAN = ['Aprobado', 'Pendiente'];

export function estaReservaCancelada(reserva) {
  return reserva?.estadoPago === 'Cancelado';
}

// Deriva el proveedor de una moto de reposición desde el catálogo `motos`.
// No toca proveedorId de D1.
export function derivarProveedorReposicion(motoId, motos) {
  if (!motoId) return null;
  const moto = (motos || []).find(m => String(m.id) === String(motoId));
  return moto?.proveedorId ?? null;
}

// true si OTRA reserva ocupa el mismo bloque efectivo del mismo instructor
// en `fechaBuscada`. Excluye la propia reserva por id.
export function detectarConflictoBloquePorFecha(
  reserva,
  fechaBuscada,
  ocupacionConfirmada,
  excluirReservaId
) {
  if (!reserva || !fechaBuscada) return false;
  const bloque = getHoraIdOcupacion(reserva, fechaBuscada);
  if (!bloque) return false;
  const excluir = excluirReservaId ?? reserva.id;

  return (ocupacionConfirmada || []).some(r => {
    if (r?.id != null && String(r.id) === String(excluir)) return false;
    if (!ESTADOS_OCUPAN.includes(r?.estadoPago)) return false;
    if (String(r.instructorId) !== String(reserva.instructorId)) return false;
    const bloqueR = getHoraIdOcupacion(r, fechaBuscada);
    return bloqueR != null && String(bloqueR) === String(bloque);
  });
}

// true si OTRA reserva ocupa `motoId` en el bloque efectivo de `fechaBuscada`.
export function detectarConflictoMotoPorFecha(
  reserva,
  motoId,
  fechaBuscada,
  ocupacionConfirmada,
  excluirReservaId
) {
  if (!motoId || !fechaBuscada) return false;
  const excluir = excluirReservaId ?? reserva?.id;

  return (ocupacionConfirmada || []).some(r => {
    if (r?.id != null && String(r.id) === String(excluir)) return false;
    if (r?.traeMoto === 'Sí') return false;
    if (!ESTADOS_OCUPAN.includes(r?.estadoPago)) return false;
    const motoR = getMotoIdOcupacion(r, fechaBuscada);
    return motoR != null && String(motoR) === String(motoId);
  });
}
