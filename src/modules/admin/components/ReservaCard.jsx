// @build: 2026-11-22 | id: T-063-V2-CARD | desc: Tarjeta de reserva con un chip de pago y estado académico en borde/punto.
import { Bike, BookOpen, Calendar, ChevronRight, Clock, MapPin, User } from 'lucide-react';
import { formatearFechaCorta, formatearFechaCreacion } from '../utils/reservaCardHelpers.js';

const ACADEMICO = {
  NoIniciado: {
    etiqueta: 'Académico: sin iniciar',
    borde: 'border-l-gray-200',
    punto: 'bg-gray-300',
  },
  Iniciado: {
    etiqueta: 'Académico: iniciado',
    borde: 'border-l-indigo-500',
    punto: 'bg-indigo-500',
  },
  Completado: {
    etiqueta: 'Académico: completado',
    borde: 'border-l-emerald-600',
    punto: 'bg-emerald-600',
  },
  Ausente: {
    etiqueta: 'Académico: ausente',
    borde: 'border-l-red-600',
    punto: 'bg-red-600',
  },
};

const PUNTO_PAGO = {
  Pendiente: 'bg-orange-500',
  Aprobado: 'bg-green-500',
  Rechazado: 'bg-red-600',
  Cancelado: 'bg-gray-400',
};

export const formatearFechasReserva = (reserva) => {
  if (!reserva) return 'Fecha por definir';
  const fechas = [
    formatearFechaCorta(reserva.fecha || reserva.fecha1),
    formatearFechaCorta(reserva.fecha2),
  ].filter(Boolean);
  const unicas = [...new Set(fechas)];
  return unicas.length > 0 ? unicas.join(' – ') : 'Fecha por definir';
};

const obtenerNombreInstructor = (instructor) => {
  if (!instructor) return 'Sin instructor';
  const nombre = `${instructor.nombre || ''} ${instructor.apellido || ''}`.trim();
  return nombre || 'Sin instructor';
};

export default function ReservaCard({
  reserva,
  instructor,
  sede,
  curso,
  horario,
  enCurso,
  esProxima,
  estadoAcademico,
  onAbrir,
}) {
  const academico = ACADEMICO[estadoAcademico] || null;
  const horasPendientes = Number(reserva?.horasPendientes) || 0;
  const estadoPago = reserva?.estadoPago || 'Sin estado';
  const nombre = `${reserva?.nombre || ''} ${reserva?.apellido || ''}`.trim() || 'Reserva sin nombre';
  const etiquetaPago = estadoPago === 'Cancelado' ? 'Cancelado' : estadoPago;
  const fechaCreacion = formatearFechaCreacion(reserva?.createdAt);

  const ariaLabel = [
    `Abrir reserva de ${nombre}.`,
    esProxima ? 'Próxima reserva.' : '',
    `Pago ${etiquetaPago}.`,
    fechaCreacion ? `Creada el ${fechaCreacion}.` : '',
    academico ? `${academico.etiqueta}.` : '',
    horasPendientes > 0 ? `${horasPendientes} horas pendientes.` : '',
  ]
    .filter(Boolean)
    .join(' ');

  const metadatos = [
    { id: 'sede', etiqueta: 'Sede', valor: sede, Icono: MapPin },
    { id: 'curso', etiqueta: 'Curso', valor: curso, Icono: BookOpen },
    { id: 'instructor', etiqueta: 'Instructor', valor: instructor, Icono: User },
    { id: 'moto', etiqueta: 'Moto', valor: reserva?.tipoMoto || '—', Icono: Bike },
  ];

  return (
    <button
      type="button"
      onClick={onAbrir}
      aria-label={ariaLabel}
      className={`flex w-full min-w-0 flex-col rounded-2xl border border-l-[3px] border-gray-100 bg-white p-3 pl-4 text-left shadow-sm transition-colors hover:bg-gray-50 active:bg-gray-100 ${
        academico?.borde || 'border-l-gray-200'
      }`}
    >
      <span className="flex min-w-0 items-start justify-between gap-2">
        <span className="flex min-w-0 flex-wrap items-center gap-1.5">
          <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2 py-1 text-[10.5px] font-bold leading-none text-gray-700">
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${PUNTO_PAGO[estadoPago] || 'bg-gray-400'}`}
            />
            <span className="min-w-0 break-words">{etiquetaPago}</span>
          </span>
          {esProxima && (
            <span className="inline-flex min-w-0 items-center gap-1 text-[10px] font-extrabold uppercase leading-none tracking-[0.08em] text-blue-700">
              <span aria-hidden="true" className="h-2 w-0.5 shrink-0 rounded-full bg-blue-600" />
              Próxima
            </span>
          )}
        </span>
        <ChevronRight size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-gray-400" />
      </span>

      <span className="mt-2 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="min-w-0 break-words text-[16px] font-extrabold leading-tight tracking-tight text-gray-900 lg:text-[17px]">
          {nombre}
        </span>
        <span className="whitespace-nowrap text-[11.5px] font-semibold tabular-nums text-gray-500">
          {reserva?.cedula ? `CI ${reserva.cedula}` : 'CI —'}
        </span>
      </span>

      <span className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 text-[11.5px] font-medium text-gray-700">
        <span className="inline-flex min-w-0 items-center gap-1 tabular-nums">
          <Calendar size={12} aria-hidden="true" className="shrink-0 text-gray-500" />
          <span className="min-w-0 break-words">{formatearFechasReserva(reserva)}</span>
        </span>
        <span className="inline-flex min-w-0 items-center gap-1 rounded-md bg-gray-100 px-1.5 py-0.5 font-semibold tabular-nums text-gray-800">
          <Clock size={12} aria-hidden="true" className="shrink-0 text-gray-500" />
          <span className="min-w-0 break-words">{horario?.label || reserva?.horaId || '—'}</span>
        </span>
        {fechaCreacion && (
          <span className="inline-flex min-w-0 items-center gap-1 text-[10.5px] font-semibold text-gray-500">
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Creada</span>
            <span className="tabular-nums">{fechaCreacion}</span>
          </span>
        )}
        {enCurso && (
          <span className="inline-flex items-center gap-1 font-bold text-green-700">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full bg-green-500 motion-safe:animate-pulse"
            />
            En curso
          </span>
        )}
      </span>

      <span className="mt-2 grid min-w-0 grid-cols-2 gap-x-3 gap-y-1.5 border-t border-gray-100 pt-2">
        {metadatos.map(({ id, etiqueta, valor, Icono }) => (
          <span key={id} className="min-w-0">
            <span className="mb-0.5 flex items-center gap-1 text-[10px] font-extrabold uppercase leading-tight tracking-wider text-gray-500">
              <Icono size={11} aria-hidden="true" className="shrink-0" />
              {etiqueta}
            </span>
            <span className="block min-w-0 break-words text-[12px] font-semibold leading-snug text-gray-800">
              {valor || '—'}
            </span>
          </span>
        ))}
      </span>

      <span className="mt-auto flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-gray-100 pt-2">
        {academico ? (
          <span className="inline-flex min-w-0 items-center gap-1.5 text-[10.5px] font-semibold leading-tight text-gray-500">
            <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${academico.punto}`} />
            <span className="min-w-0 break-words">{academico.etiqueta}</span>
          </span>
        ) : (
          <span className="text-[10.5px] font-semibold leading-tight text-gray-500">
            Académico: no aplica
          </span>
        )}
        {horasPendientes > 0 && (
          <span className="inline-flex items-center gap-1 whitespace-nowrap text-[10.5px] font-bold leading-tight text-orange-700">
            <Clock size={11} aria-hidden="true" className="shrink-0" />
            {horasPendientes} h pendientes
          </span>
        )}
      </span>
    </button>
  );
}

export { obtenerNombreInstructor };
