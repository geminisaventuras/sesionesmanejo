// T-138 / FT-070 — Agenda unificada del proveedor.
// Une sesiones (espejo de ocupación) y bloqueos propios en una sola lista
// ordenada por día. Funciones puras: no leen Firestore.
import { fechaVetHoy, getHoraIdOcupacion, getMotoIdOcupacion } from '../../shared/utils/reservaHelpers.js';
import { inicioMinDesdeLabel } from '../../shared/utils/horarios.js';

const horaAMinutos = (hhmm) => {
  const match = String(hhmm || '').match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const horas = Number(match[1]);
  const minutos = Number(match[2]);
  if (horas > 23 || minutos > 59) return null;
  return horas * 60 + minutos;
};

const parseFechaUTC = (fechaISO) => {
  const [anio, mes, dia] = String(fechaISO || '').split('-').map(Number);
  if (!anio || !mes || !dia) return null;
  return Date.UTC(anio, mes - 1, dia);
};

/** Suma días a una fecha ISO (YYYY-MM-DD) sin desfase de zona. */
export function sumarDiasISO(fechaISO, dias) {
  const [anio, mes, dia] = String(fechaISO).split('-').map(Number);
  if (!anio || !mes || !dia) return '';
  const fecha = new Date(anio, mes - 1, dia + dias);
  return [
    fecha.getFullYear(),
    String(fecha.getMonth() + 1).padStart(2, '0'),
    String(fecha.getDate()).padStart(2, '0')
  ].join('-');
}

/** Días inclusivos entre dos fechas ISO; 0 si el rango es inválido. */
export function contarDiasEntre(desde, hasta) {
  const inicio = parseFechaUTC(desde);
  const fin = parseFechaUTC(hasta);
  if (inicio == null || fin == null || fin < inicio) return 0;
  return Math.round((fin - inicio) / 86400000) + 1;
}

/**
 * Serie inclusiva de fechas ISO. Devuelve [] si el rango es inválido o
 * supera `maxDias` (por defecto 90, dentro del límite de un batch).
 */
export function construirSerieFechas(desde, hasta, maxDias = 90) {
  const total = contarDiasEntre(desde, hasta);
  if (!total || total > maxDias) return [];
  return Array.from({ length: total }, (_, i) => sumarDiasISO(desde, i));
}

export const esReservaCancelada = (reserva) => (
  !reserva || reserva.estadoPago === 'Cancelado' || reserva.estadoCurso === 'Cancelado'
);

export const esBloqueoPropio = (bloqueo, proveedorId) => (
  Boolean(bloqueo?.id && bloqueo?.fecha) &&
  String(bloqueo.proveedorId) === String(proveedorId)
);

// El D1 pertenece al proveedor original; el D2, al proveedor de reposición
// cuando existe, o al original si no hubo reasignación.
const responsableDia = (reserva, dia) => String(
  dia === 2
    ? (reserva.proveedorReposicionId || reserva.proveedorId || '')
    : (reserva.proveedorId || '')
);

/**
 * true si la reserva tiene al menos un día desde `hoy` que cubre el proveedor.
 * D1 pertenece al original; D2 al repositor si existe.
 */
export function reservaTieneDiaProximo(reserva, hoy = fechaVetHoy(), proveedorId = null) {
  if (esReservaCancelada(reserva) || !hoy) return false;
  const cubre = (responsable) => (
    !proveedorId || String(responsable) === String(proveedorId)
  );
  if (reserva.fecha && reserva.fecha >= hoy && cubre(reserva.proveedorId)) return true;
  if (reserva.fecha2 && reserva.fecha2 >= hoy) {
    const responsableD2 = reserva.proveedorReposicionId || reserva.proveedorId;
    if (cubre(responsableD2)) return true;
  }
  return false;
}

/**
 * Construye las entradas de agenda (sesiones D1/D2 y bloqueos) desde hoy.
 * Con `proveedorId`, solo incluye los días y bloqueos que cubre ese proveedor.
 * @returns {Array<object>} ordenadas por fecha y hora de inicio.
 */
export function construirEntradasAgenda({
  reservas = [],
  bloqueos = [],
  horarios = [],
  hoy = fechaVetHoy(),
  proveedorId = null
} = {}) {
  const entradas = [];
  const cubreProveedor = (responsable) => (
    !proveedorId || String(responsable) === String(proveedorId)
  );

  (reservas || []).forEach((reserva) => {
    if (esReservaCancelada(reserva)) return;

    const dias = [{ fecha: reserva.fecha, dia: 1 }];
    if (reserva.fecha2 && reserva.fecha2 !== reserva.fecha) {
      dias.push({ fecha: reserva.fecha2, dia: 2 });
    }

    dias.forEach(({ fecha, dia }) => {
      if (!fecha || fecha < hoy) return;
      if (!cubreProveedor(responsableDia(reserva, dia))) return;
      const horaId = getHoraIdOcupacion(reserva, fecha);
      const horario = (horarios || []).find((h) => String(h.id) === String(horaId));
      const inicioMin = horario?.inicioMin ?? inicioMinDesdeLabel(horario?.label) ?? 0;
      entradas.push({
        key: `sesion-${reserva.id}-${fecha}`,
        tipo: 'sesion',
        fecha,
        dia,
        inicioMin,
        reserva,
        horaId,
        horaLabel: horario?.label || (horaId ? String(horaId) : 'Horario por confirmar'),
        motoId: getMotoIdOcupacion(reserva, fecha),
        estadoCurso: reserva.estadoCurso || '',
        estadoPago: reserva.estadoPago || ''
      });
    });
  });

  (bloqueos || []).forEach((bloqueo) => {
    if (!bloqueo?.fecha || bloqueo.fecha < hoy) return;
    if (proveedorId && String(bloqueo.proveedorId) !== String(proveedorId)) return;
    entradas.push({
      key: `bloqueo-${bloqueo.id}`,
      tipo: 'bloqueo',
      fecha: bloqueo.fecha,
      dia: 1,
      inicioMin: horaAMinutos(bloqueo.horaInicio) ?? 0,
      bloqueo,
      horaLabel: `${bloqueo.horaInicio || '--:--'} - ${bloqueo.horaFin || '--:--'}`,
      motoId: bloqueo.motoId && bloqueo.motoId !== 'ALL' ? bloqueo.motoId : null,
      estadoCurso: 'Bloqueo',
      estadoPago: ''
    });
  });

  return entradas.sort((a, b) => {
    if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha);
    if (a.inicioMin !== b.inicioMin) return a.inicioMin - b.inicioMin;
    if (a.tipo === b.tipo) return 0;
    return a.tipo === 'bloqueo' ? -1 : 1;
  });
}

/** Agrupa entradas ya ordenadas por fecha. */
export function agruparPorDia(entradas = []) {
  const mapa = new Map();
  (entradas || []).forEach((entrada) => {
    if (!entrada?.fecha) return;
    if (!mapa.has(entrada.fecha)) mapa.set(entrada.fecha, []);
    mapa.get(entrada.fecha).push(entrada);
  });
  return Array.from(mapa.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fecha, items]) => ({ fecha, entradas: items }));
}

/** Prefijo legible para el encabezado del día: Hoy, Mañana o ''. */
export function etiquetaDia(fecha, hoy = fechaVetHoy()) {
  if (!fecha || !hoy) return '';
  if (fecha === hoy) return 'Hoy';
  const [anio, mes, dia] = hoy.split('-').map(Number);
  if (!anio || !mes || !dia) return '';
  const manana = new Date(anio, mes - 1, dia + 1);
  const iso = [
    manana.getFullYear(),
    String(manana.getMonth() + 1).padStart(2, '0'),
    String(manana.getDate()).padStart(2, '0')
  ].join('-');
  return fecha === iso ? 'Mañana' : '';
}
