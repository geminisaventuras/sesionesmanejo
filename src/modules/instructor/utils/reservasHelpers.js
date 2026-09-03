// @build: 2026-09-03 | id: INSTRUCTOR-RESERVAS-HELPERS | backup: reservasHelpers.backup-20260903-000000 | desc: Utilidades para agrupar, ordenar y calcular estado de reservas del instructor
import { obtenerFechaVenezuela } from '../../shared/utils/zonahoraria';

export function agruparReservasPorPeriodo(reservas, hoyStr = obtenerFechaVenezuela()) {
  const manana = new Date(hoyStr + 'T00:00:00');
  manana.setDate(manana.getDate() + 1);
  const mananaStr = manana.toISOString().split('T')[0];
  
  const proximos7 = new Date(hoyStr + 'T00:00:00');
  proximos7.setDate(proximos7.getDate() + 7);
  const proximos7Str = proximos7.toISOString().split('T')[0];
  
  const grupos = {
    hoy: [],
    manana: [],
    proximos7Dias: [],
    despues: []
  };
  
  reservas.forEach(r => {
    if (r.fecha === hoyStr) {
      grupos.hoy.push(r);
    } else if (r.fecha === mananaStr) {
      grupos.manana.push(r);
    } else if (r.fecha <= proximos7Str) {
      grupos.proximos7Dias.push(r);
    } else {
      grupos.despues.push(r);
    }
  });
  
  return grupos;
}

export function ordenarReservasPorFechaHora(reservas, horarios) {
  return [...reservas].sort((a, b) => {
    if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha);
    const horaA = horarios?.find(h => h.id === a.horaId)?.label?.split('-')[0]?.trim() || '';
    const horaB = horarios?.find(h => h.id === b.horaId)?.label?.split('-')[0]?.trim() || '';
    return horaA.localeCompare(horaB);
  });
}

export function esReservaEnCurso(reserva, horario) {
  if (!reserva || !horario) return false;
  const hoy = obtenerFechaVenezuela();
  if (reserva.fecha !== hoy && reserva.fecha2 !== hoy) return false;
  
  const ahora = new Date();
  const horaActual = ahora.getHours() * 60 + ahora.getMinutes();
  
  const inicioLabel = horario?.label?.split('-')[0]?.trim();
  const finLabel = horario?.label?.split('-')[1]?.trim();
  if (!inicioLabel || !finLabel) return false;
  
  const inicioMin = parseHora(inicioLabel);
  const finMin = parseHora(finLabel);
  if (inicioMin === null || finMin === null) return false;
  
  return horaActual >= inicioMin && horaActual <= finMin;
}

function parseHora(str) {
  const match = str.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const mins = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();
  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  return hours * 60 + mins;
}

export function calcularBadges(reserva, horario) {
  const badges = [];
  const hoy = obtenerFechaVenezuela();
  
  if (reserva.fecha === hoy || reserva.fecha2 === hoy) {
    badges.push('HOY');
  }
  
  if (esReservaEnCurso(reserva, horario)) {
    badges.push('EN CURSO');
  } else if (reserva.fecha > hoy) {
    badges.push('PRÓXIMA');
  }
  
  if (reserva.estadoPago === 'Pendiente') {
    badges.push('PAGO PENDIENTE');
  }
  
  if (reserva.estadoCurso === 'Aprobado') {
    badges.push('COMPLETADA');
  }
  
  return badges;
}
