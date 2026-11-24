// @build: 2026-11-23 | id: T-064-V4 | desc: Fila legible (Reserva/Pack/Teórico) con chip de estado y acento de color por tono.
import { BookOpen, ChevronRight, GraduationCap, Package } from 'lucide-react';

const TIPO = {
  reserva: { etiqueta: 'Reserva', Icono: BookOpen, caja: 'bg-indigo-50 text-indigo-700', tono: 'indigo' },
  pack: { etiqueta: 'Pack', Icono: Package, caja: 'bg-purple-50 text-purple-700', tono: 'purple' },
  teorico: { etiqueta: 'Teórico', Icono: GraduationCap, caja: 'bg-teal-50 text-teal-700', tono: 'teal' },
};

const CHIP = {
  Pendiente: { chip: 'border-amber-200 bg-amber-50 text-amber-800', punto: 'bg-amber-500', texto: 'Pendiente' },
  Aprobado: { chip: 'border-emerald-200 bg-emerald-50 text-emerald-800', punto: 'bg-emerald-600', texto: 'Aprobado' },
  Rechazado: { chip: 'border-rose-200 bg-rose-50 text-rose-700', punto: 'bg-rose-600', texto: 'Rechazado' },
  Cancelado: { chip: 'border-gray-200 bg-gray-50 text-gray-600', punto: 'bg-gray-400', texto: 'Cancelado' },
};

const BORDE = {
  indigo: 'border-l-indigo-500',
  amber: 'border-l-amber-500',
  rose: 'border-l-rose-500',
  emerald: 'border-l-emerald-500',
  purple: 'border-l-purple-500',
  teal: 'border-l-teal-500',
  gray: 'border-l-gray-300',
};

const HOVER = {
  indigo: 'hover:bg-indigo-50/60',
  amber: 'hover:bg-amber-50/60',
  rose: 'hover:bg-rose-50/60',
  emerald: 'hover:bg-emerald-50/60',
  purple: 'hover:bg-purple-50/60',
  teal: 'hover:bg-teal-50/60',
  gray: 'hover:bg-gray-50',
};

const PUNTO_ACADEMICO = {
  NoIniciado: 'bg-gray-300',
  Iniciado: 'bg-indigo-500',
  Completado: 'bg-emerald-600',
  Ausente: 'bg-rose-600',
};

export default function ReservasHomeRow({ item, mostrarMotivo = false, onClick, tonoFila }) {
  const tipo = TIPO[item.tipo] || TIPO.reserva;
  const chip = CHIP[item.estadoPago] || { chip: 'border-gray-200 bg-gray-50 text-gray-600', punto: 'bg-gray-400', texto: item.estadoPago || 'Sin estado' };
  const tono = BORDE[tonoFila] ? tonoFila : tipo.tono;
  const borde = BORDE[tono] || BORDE.gray;
  const hover = HOVER[tono] || HOVER.gray;
  const puntoAcademico = PUNTO_ACADEMICO[item.academico] || 'bg-gray-300';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[78px] w-full min-w-0 items-start gap-2.5 border-b border-l-[3px] border-gray-100 bg-white px-3 py-2.5 text-left transition-colors last:border-b-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 motion-reduce:transition-none ${borde} ${hover}`}
    >
      <span aria-hidden="true" className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${tipo.caja}`}>
        <tipo.Icono size={16} />
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex min-w-0 flex-wrap items-start justify-between gap-1.5">
          <span className="min-w-0 break-words text-[13.5px] font-bold leading-snug text-gray-900">
            {item.nombre}
          </span>
          <span className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-bold leading-tight ${chip.chip}`}>
            <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${chip.punto}`} />
            {chip.texto}
          </span>
        </span>

        <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-gray-600 tabular-nums">
          <span className="min-w-0 break-words">{item.identificador}</span>
          {item.fecha && (
            <>
              <span aria-hidden="true" className="text-gray-300">·</span>
              <span>{item.fecha}</span>
            </>
          )}
          {item.hora && (
            <>
              <span aria-hidden="true" className="text-gray-300">·</span>
              <span>{item.hora}</span>
            </>
          )}
          <span aria-hidden="true" className="text-gray-300">·</span>
          <span className="text-[9.5px] font-extrabold uppercase tracking-[0.06em] text-gray-500">
            {tipo.etiqueta}
          </span>
        </span>

        <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10.5px] text-gray-500">
          <span aria-hidden="true" className={`h-1.5 w-1.5 shrink-0 rounded-full ${puntoAcademico}`} />
          <span className="min-w-0 break-words">{item.academiaTexto}</span>
          {item.horasPendientes > 0 && (
            <span className="font-bold text-amber-700">{item.horasPendientes} h pendientes</span>
          )}
          {item.enCurso && <span className="font-bold text-emerald-700">En curso</span>}
        </span>

        {mostrarMotivo && item.motivo && (
          <span
            className={`mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] font-semibold ${
              item.motivoTono === 'alta' ? 'text-rose-700' : 'text-amber-700'
            }`}
          >
            <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
            <span className="min-w-0 break-words">{item.motivo}</span>
          </span>
        )}
      </span>

      <ChevronRight size={15} aria-hidden="true" className="mt-1 shrink-0 text-gray-400" />
    </button>
  );
}
