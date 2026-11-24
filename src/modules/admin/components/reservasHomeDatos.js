// @build: 2026-11-22 | id: T-064-V3 | desc: Normaliza reservas, packs y accesos teóricos para la Home (sin consultas ni reglas nuevas).
// Solo presentación: no cambia conteos, filtros ni reglas de negocio.
import { getHoraIdOcupacion } from '../../shared/utils/reservaHelpers';
import { esReservaEnCurso, obtenerFechaMasCercana } from '../utils/reservasHelpers';

const pad2 = (valor) => String(valor).padStart(2, '0');

export const formatearFechaISO = (iso) => {
  if (!iso) return '';
  const [anio, mes, dia] = String(iso).split('-').map(Number);
  if (!anio || !mes || !dia) return String(iso);
  return `${pad2(dia)}/${pad2(mes)}/${String(anio).slice(-2)}`;
};

export const formatearFechaTimestamp = (timestamp) => {
  if (!timestamp) return '';
  const fecha = typeof timestamp.toDate === 'function'
    ? timestamp.toDate()
    : (typeof timestamp.seconds === 'number' ? new Date(timestamp.seconds * 1000) : null);
  if (!fecha || Number.isNaN(fecha.getTime())) return '';
  return `${pad2(fecha.getDate())}/${pad2(fecha.getMonth() + 1)}/${String(fecha.getFullYear()).slice(-2)}`;
};

export const identificadorCorto = (valor, longitud = 6) => {
  const texto = String(valor || '').trim();
  if (!texto) return '—';
  return texto.length > longitud ? texto.slice(-longitud).toUpperCase() : texto.toUpperCase();
};

const minutosDeTimestamp = (timestamp) => (
  timestamp?.toMillis?.()
  || (typeof timestamp?.seconds === 'number' ? timestamp.seconds * 1000 : 0)
);

export const etiquetaHora = (reserva, horarios = [], fechaBuscada) => {
  if (!reserva || !fechaBuscada) return '';
  let horaId = null;
  try {
    horaId = getHoraIdOcupacion(reserva, fechaBuscada);
  } catch {
    horaId = reserva.horaId || null;
  }
  const horario = (horarios || []).find((h) => String(h.id) === String(horaId ?? reserva.horaId));
  if (!horario) return '';
  if (horario.horaInicio && horario.horaFin) return `${horario.horaInicio} – ${horario.horaFin}`;
  return horario.label || '';
};

// Misma lectura de estado académico que la lista v2 (presentación).
export const estadoAcademicoReserva = (reserva) => {
  if (!reserva) return null;
  if (reserva.estadoPago === 'Cancelado') return null;
  if (reserva.estadoCurso === 'Aprobado') return 'Completado';
  if (reserva.estadoCurso === 'Ausente') return 'Ausente';
  if (reserva.sesionTotalInicio) return 'Iniciado';
  return 'NoIniciado';
};

const TEXTO_ACADEMICO = {
  NoIniciado: 'Académico: sin iniciar',
  Iniciado: 'Académico: iniciado',
  Completado: 'Académico: completado',
  Ausente: 'Académico: ausente',
};

const MOTIVO_POR_ESTADO = {
  reserva: {
    Rechazado: 'Pago rechazado · contactar para reiniciar',
    Pendiente: 'Comprobante por validar · espera confirmación',
  },
  pack: {
    Rechazado: 'Pago rechazado · corregir para reactivar',
    Pendiente: 'Comprobante por validar · espera validación',
  },
  teorico: {
    Rechazado: 'Pago rechazado · acceso sin habilitar',
    Pendiente: 'Pago por validar · acceso sin habilitar',
  },
};

const motivoDe = (tipo, estadoPago) => MOTIVO_POR_ESTADO[tipo]?.[estadoPago] || '';

export const itemDesdeReserva = (reserva, { horarios = [], hoyStr, minutosActuales = 0 } = {}) => {
  const fecha = obtenerFechaMasCercana(reserva, hoyStr)
    || reserva?.fecha
    || reserva?.fecha1
    || '';
  const academico = estadoAcademicoReserva(reserva);
  const horasPendientes = Number(reserva?.horasPendientes) || 0;
  return {
    key: `reserva-${reserva.id}`,
    tipo: 'reserva',
    id: reserva.id,
    nombre: `${reserva.nombre || ''} ${reserva.apellido || ''}`.trim() || 'Reserva sin nombre',
    identificador: reserva.cedula ? `CI ${reserva.cedula}` : 'CI —',
    fecha: formatearFechaISO(fecha),
    hora: etiquetaHora(reserva, horarios, fecha),
    estadoPago: reserva.estadoPago || 'Pendiente',
    academico,
    academiaTexto: TEXTO_ACADEMICO[academico] || 'Académico: no aplica',
    horasPendientes,
    enCurso: esReservaEnCurso(reserva, horarios || [], hoyStr, minutosActuales),
    motivo: motivoDe('reserva', reserva.estadoPago),
    motivoTono: reserva.estadoPago === 'Rechazado' ? 'alta' : 'media',
    creadoMs: minutosDeTimestamp(reserva.createdAt),
    ruta: `/admin/reserva/${reserva.id}`,
    state: { from: '/admin/reservas' },
  };
};

export const itemDesdePack = (pack) => {
  const subReservas = Array.isArray(pack?.subReservas) ? pack.subReservas : [];
  const completados = subReservas.filter((s) => s?.estado === 'completado').length;
  const totalCursos = subReservas.length;
  const cancelado = pack?.estado === 'cancelado';
  const completado = pack?.estado === 'completado';
  const academico = cancelado ? null : (completado ? 'Completado' : (completados > 0 ? 'Iniciado' : 'NoIniciado'));
  let academiaTexto = 'Pack sin iniciar';
  if (cancelado) academiaTexto = 'Pack cancelado';
  else if (completado) academiaTexto = 'Pack completado';
  else if (completados > 0) {
    academiaTexto = totalCursos > 0
      ? `Pack en curso · ${completados}/${totalCursos} cursos`
      : 'Pack en curso';
  }
  return {
    key: `pack-${pack.id}`,
    tipo: 'pack',
    id: pack.id,
    nombre: pack.packNombre || 'Pack sin nombre',
    identificador: pack.pagoCedula ? `CI ${pack.pagoCedula}` : `ID ${identificadorCorto(pack.id)}`,
    fecha: formatearFechaTimestamp(pack.fechaCompra),
    hora: '',
    estadoPago: pack.estadoPago || 'Pendiente',
    academico,
    academiaTexto,
    horasPendientes: 0,
    enCurso: false,
    motivo: motivoDe('pack', pack.estadoPago),
    motivoTono: pack.estadoPago === 'Rechazado' ? 'alta' : 'media',
    creadoMs: minutosDeTimestamp(pack.fechaCompra),
    ruta: `/admin/pack/${pack.id}`,
  };
};

export const itemDesdeAcceso = (acceso, cursosTeoricos = []) => {
  const curso = (cursosTeoricos || []).find((c) => String(c.id) === String(acceso.cursoTeoricoId));
  const rechazado = acceso.estadoPago === 'Rechazado';
  const aprobado = acceso.estadoPago === 'Aprobado';
  return {
    key: `teorico-${acceso.id}`,
    tipo: 'teorico',
    id: acceso.id,
    nombre: curso?.nombre || acceso.cursoTeoricoId || 'Módulo teórico',
    identificador: acceso.pagoCedula ? `CI ${acceso.pagoCedula}` : `ID ${identificadorCorto(acceso.id)}`,
    fecha: formatearFechaTimestamp(acceso.fechaCompra),
    hora: '',
    estadoPago: acceso.estadoPago || 'Pendiente',
    academico: rechazado ? null : (aprobado ? 'Completado' : 'NoIniciado'),
    academiaTexto: rechazado
      ? 'Acceso teórico rechazado'
      : (aprobado ? 'Acceso teórico habilitado' : 'Acceso teórico por habilitar'),
    horasPendientes: 0,
    enCurso: false,
    motivo: motivoDe('teorico', acceso.estadoPago),
    motivoTono: rechazado ? 'alta' : 'media',
    creadoMs: minutosDeTimestamp(acceso.fechaCompra),
    ruta: `/admin/acceso-teorico/${acceso.id}`,
  };
};

// Rechazos primero y, dentro de cada grupo, lo más reciente arriba.
export const ordenarCola = (items = []) => [...items].sort((a, b) => {
  const peso = (item) => (item.estadoPago === 'Rechazado' ? 0 : 1);
  const diferencia = peso(a) - peso(b);
  if (diferencia !== 0) return diferencia;
  return (b.creadoMs || 0) - (a.creadoMs || 0);
});
