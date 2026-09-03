// @build: 2026-08-28.14-30-00 | id: BXX-BYY | backup: reservasHelpers.js.backup-20260828-143000 | desc: Utilidades de fecha/hora y detección de reservas en curso
// src/modules/admin/utils/reservasHelpers.js
/**
 * Obtiene la fecha de hoy en formato YYYY-MM-DD usando zona horaria de Venezuela
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
export function obtenerHoyVenezuela() {
  return new Date().toLocaleDateString('en-CA', { 
    timeZone: 'America/Caracas' 
  });
}

/**
 * Obtiene la hora actual en minutos desde medianoche (zona Venezuela)
 * @returns {number} Minutos desde medianoche
 */
export function obtenerMinutosActualesVenezuela() {
  const ahora = new Date();
  const horaVenezuela = new Date(ahora.toLocaleString('en-US', { 
    timeZone: 'America/Caracas' 
  }));
  return horaVenezuela.getHours() * 60 + horaVenezuela.getMinutes();
}

/**
 * Obtiene el rango horario de un horario en minutos
 * @param {Object} horario - Objeto horario con horaInicio/horaFin o label
 * @returns {Object|null} { inicio, fin } en minutos o null
 */
export function obtenerRangoHorario(horario) {
  if (!horario) return null;
  
  // Prioridad 1: Campos explícitos
  if (horario.horaInicio && horario.horaFin) {
    return {
      inicio: convertirAMinutos(horario.horaInicio),
      fin: convertirAMinutos(horario.horaFin)
    };
  }
  
  // Prioridad 2: Parseo del label (fallback legacy)
  const match = horario.label?.match(/(\d+:\d+)\s*(AM|PM)\s*-\s*(\d+:\d+)\s*(AM|PM)/i);
  if (match) {
    return {
      inicio: convertirA24hMinutos(match[1], match[2]),
      fin: convertirA24hMinutos(match[3], match[4])
    };
  }
  
  return null;
}

function convertirAMinutos(hora) {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

function convertirA24hMinutos(hora, ampm) {
  let [h, m] = hora.split(':').map(Number);
  if (ampm.toUpperCase() === 'PM' && h < 12) h += 12;
  if (ampm.toUpperCase() === 'AM' && h === 12) h = 0;
  return h * 60 + m;
}

/**
 * Determina si una reserva está en curso
 */
export function esReservaEnCurso(reserva, horarios, hoyStr, minutosActuales) {
  if (reserva.estadoPago !== 'Aprobado') return false;
  if (reserva.estadoCurso === 'Completado') return false;
  if (reserva.fecha !== hoyStr && reserva.fecha2 !== hoyStr) return false;
  
  const horario = horarios.find(h => String(h.id) === String(reserva.horaId));
  if (!horario) return false;
  
  const rango = obtenerRangoHorario(horario);
  if (!rango) return true; // Si no se puede parsear, validar solo día
  
  return minutosActuales >= rango.inicio && minutosActuales <= rango.fin;
}

/**
 * Determina la fecha más cercana de una reserva (fecha o fecha2)
 */
export function obtenerFechaMasCercana(reserva, hoyStr) {
  const fechas = [reserva.fecha, reserva.fecha2].filter(f => f && f >= hoyStr);
  return fechas.length > 0 ? fechas.sort()[0] : null;
}