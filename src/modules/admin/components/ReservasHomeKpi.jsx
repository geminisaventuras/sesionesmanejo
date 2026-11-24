// @build: 2026-11-23 | id: T-064-V4 | desc: KPI accionable de la Home de reservas con gradientes corporativos del Home admin.
import { AlertTriangle, CheckCircle2, ChevronRight, Clock, Package } from 'lucide-react';

const ESTILO = {
  warn: {
    gradiente: 'from-indigo-600 to-indigo-800',
    Icono: Clock,
  },
  pack: {
    gradiente: 'from-purple-600 to-purple-800',
    Icono: Package,
  },
  bad: {
    gradiente: 'from-rose-600 to-red-700',
    Icono: AlertTriangle,
  },
  ok: {
    gradiente: 'from-emerald-600 to-emerald-800',
    Icono: CheckCircle2,
  },
};

export default function ReservasHomeKpi({
  etiqueta,
  valor,
  ayuda,
  tono = 'warn',
  ariaLabel,
  textoAccion = 'Ver filtradas',
  onClick,
}) {
  const estilo = ESTILO[tono] || ESTILO.warn;
  const Icono = estilo.Icono;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`relative flex min-h-[92px] min-w-0 flex-col overflow-hidden rounded-2xl bg-gradient-to-br ${estilo.gradiente} p-2.5 text-left shadow-sm transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-50 motion-reduce:transition-none lg:min-h-[104px] lg:p-3.5`}
    >
      <span className="pointer-events-none absolute -right-5 -top-5 h-14 w-14 rounded-full bg-white/10 blur-xl" aria-hidden="true" />
      <span className="relative flex min-w-0 items-center justify-between gap-1.5 text-[9.5px] font-extrabold uppercase leading-tight tracking-wide text-white/80 lg:text-[10.5px]">
        <span className="min-w-0 break-words">{etiqueta}</span>
        <Icono size={14} aria-hidden="true" className="shrink-0 text-white/80" />
      </span>
      <span className="relative mt-0.5 text-[24px] font-extrabold leading-none tracking-tight text-white tabular-nums lg:text-[28px]">
        {valor}
      </span>
      <span className="relative mt-0.5 text-[10px] leading-snug text-white/80 lg:text-[11px]">{ayuda}</span>
      <span className="relative mt-auto flex items-center gap-0.5 pt-1 text-[10px] font-extrabold text-white">
        {textoAccion}
        <ChevronRight size={12} aria-hidden="true" className="shrink-0" />
      </span>
    </button>
  );
}
