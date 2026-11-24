// Helpers puros de la tarjeta de reserva admin.
// La fecha de creación llega como Firestore Timestamp; se muestra el día calendario VET.
import { obtenerFechaVenezuela } from '../../shared/utils/zonahoraria.js';

const RE_FECHA_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export const formatearFechaCorta = (fechaStr) => {
  if (!fechaStr) return null;
  const [year, month, day] = String(fechaStr).split('-');
  if (!year || !month || !day) return String(fechaStr);
  return `${day}/${month}/${year.slice(2)}`;
};

// Acepta Firestore Timestamp, { seconds }, Date, ISO o YYYY-MM-DD. Devuelve dd/mm/aa o null.
export const formatearFechaCreacion = (createdAt) => {
  if (createdAt == null) return null;

  try {
    // Un string date-only ya representa el día calendario VET: no se reinterpreta como UTC.
    // Se valida con obtenerFechaVenezuela para rechazar fechas imposibles (p. ej. 2026-02-31).
    if (typeof createdAt === 'string' && RE_FECHA_DATE_ONLY.test(createdAt)) {
      return formatearFechaCorta(obtenerFechaVenezuela(createdAt));
    }

    let fecha;
    if (typeof createdAt?.toDate === 'function') fecha = createdAt.toDate();
    else if (typeof createdAt?.seconds === 'number') fecha = new Date(createdAt.seconds * 1000);
    else if (createdAt instanceof Date) fecha = createdAt;
    else if (typeof createdAt === 'number' || typeof createdAt === 'string') fecha = new Date(createdAt);

    if (!(fecha instanceof Date) || Number.isNaN(fecha.getTime())) return null;

    return formatearFechaCorta(obtenerFechaVenezuela(fecha));
  } catch {
    return null;
  }
};
