// @build: 2026-09-03 | id: INSTRUCTOR-RESERVAS-HELPERS-D2-ORDEN | backup: reservasHelpers.backup-20260903-000000 | desc: Agrega etiqueta D2 y orden por hora para grupo Hoy
import { obtenerFechaVenezuela } from '../../shared/utils/zonahoraria';

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

function obtenerMinutosHorario(horario) {
  if (!horario?.label) return null;
  const inicioLabel = horario.label.split('-')[0]?.trim();
  return inicioLabel ? parseHora(inicioLabel) : null;
}

export function obtenerDiaReserva(reserva, hoyStr = obtenerFechaVenezuela()) {
  if (!reserva.fecha2) return null;
  if (reserva.fecha === hoyStr) return 1;
  if (reserva.fecha2 === hoyStr) return 2;
  return null;
}

export function agruparReservasPorPeriodo(reservas, hoyStr = obtenerFechaVenezuela()) {
  const manana = new Date(hoyStr + 'T00:00:00');
  manana.setDate(manana.getDate() + 1);
  const mananaStr = manana.toISOString().split('T')[0];

  const proximos7 = new Date(hoyStr + 'T00:00:00');
  proximos7.setDate(proximos7.getDate() + 7);
  const proximos7Str = proximos7.toISOString().split('T')[0];

  const grupos = { hoy: [], manana: [], proximos7Dias: [], despues: [] };

  reservas.forEach(r => {
    const esHoy = r.fecha === hoyStr || r.fecha2 === hoyStr;
    const esManana = r.fecha === mananaStr || r.fecha2 === mananaStr;

    if (esHoy) {
      grupos.hoy.push(r);
    } else if (esManana) {
      grupos.manana.push(r);
    } else if ((r.fecha && r.fecha <= proximos7Str) || (r.fecha2 && r.fecha2 <= proximos7Str)) {
      grupos.proximos7Dias.push(r);
    } else {
      grupos.despues.push(r);
    }
  });

  return grupos;
}

export function ordenarPorHora(reservas, horarios) {
  return [...reservas].sort((a, b) => {
    const horaA = obtenerMinutosHorario(horarios?.find(h => String(h.id) === String(a.horaId)));
    const horaB = obtenerMinutosHorario(horarios?.find(h => String(h.id) === String(b.horaId)));
    if (horaA === null && horaB === null) return 0;
    if (horaA === null) return 1;
    if (horaB === null) return -1;
    return horaA - horaB;
  });
}

export function ordenarReservasPorFechaHora(reservas, horarios) {
  return [...reservas].sort((a, b) => {
    if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha);
    const horaA = obtenerMinutosHorario(horarios?.find(h => String(h.id) === String(a.horaId)));
    const horaB = obtenerMinutosHorario(horarios?.find(h => String(h.id) === String(b.horaId)));
    if (horaA === null && horaB === null) return 0;
    if (horaA === null) return 1;
    if (horaB === null) return -1;
    return horaA - horaB;
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

export function calcularBadges(reserva, horario) {
  const badges = [];
  const hoy = obtenerFechaVenezuela();

  if (reserva.fecha === hoy || reserva.fecha2 === hoy) badges.push('HOY');

  const dia = obtenerDiaReserva(reserva, hoy);
  if (dia === 2) badges.push('D2');

  if (esReservaEnCurso(reserva, horario)) {
    badges.push('EN CURSO');
  } else if (reserva.fecha > hoy) {
    badges.push('PRÓXIMA');
  }

  if (reserva.estadoPago === 'Pendiente') badges.push('PAGO PENDIENTE');
  if (reserva.estadoCurso === 'Aprobado') badges.push('COMPLETADA');

  return badges;
}
