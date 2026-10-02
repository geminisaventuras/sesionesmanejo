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

// Retorna la hora actual en zona horaria America/Caracas.
export function getCaracasTime() {
  const d = new Date();
  const caracasStr = d.toLocaleString('en-US', { timeZone: 'America/Caracas' });
  return new Date(caracasStr);
}

// Detecta si un bloque ya pasó (solo si la fecha es HOY).
// Recibe: fecha (YYYY-MM-DD), label del bloque (ej. "08:00 AM - 10:00 AM"),
// y todayStr (YYYY-MM-DD en Venezuela).
export function isPastBlock(fecha, label, todayStr) {
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
    const blockTime = getCaracasTime();
    blockTime.setHours(hours, mins, 0, 0);
    return getCaracasTime() > blockTime;
  } catch (e) { return false; }
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
