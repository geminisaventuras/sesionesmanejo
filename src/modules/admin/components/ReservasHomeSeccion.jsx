// @build: 2026-11-23 | id: T-064-V4 | desc: Sección plegable accesible con header tintado por estado y contador de color.
import { ChevronRight } from 'lucide-react';
import ReservasHomeRow from './ReservasHomeRow';

const TONO = {
  indigo: {
    caja: 'border-indigo-100',
    header: 'bg-indigo-50/80 hover:bg-indigo-100/70',
    icono: 'bg-indigo-100 text-indigo-700',
    chip: 'border-indigo-200 bg-indigo-100 text-indigo-700',
    chevron: 'text-indigo-500',
  },
  amber: {
    caja: 'border-amber-100',
    header: 'bg-amber-50/80 hover:bg-amber-100/70',
    icono: 'bg-amber-100 text-amber-800',
    chip: 'border-amber-200 bg-amber-100 text-amber-800',
    chevron: 'text-amber-600',
  },
  rose: {
    caja: 'border-rose-100',
    header: 'bg-rose-50/80 hover:bg-rose-100/70',
    icono: 'bg-rose-100 text-rose-700',
    chip: 'border-rose-200 bg-rose-100 text-rose-700',
    chevron: 'text-rose-500',
  },
  emerald: {
    caja: 'border-emerald-100',
    header: 'bg-emerald-50/80 hover:bg-emerald-100/70',
    icono: 'bg-emerald-100 text-emerald-700',
    chip: 'border-emerald-200 bg-emerald-100 text-emerald-700',
    chevron: 'text-emerald-600',
  },
  purple: {
    caja: 'border-purple-100',
    header: 'bg-purple-50/80 hover:bg-purple-100/70',
    icono: 'bg-purple-100 text-purple-700',
    chip: 'border-purple-200 bg-purple-100 text-purple-700',
    chevron: 'text-purple-500',
  },
  neutral: {
    caja: 'border-gray-200',
    header: 'bg-white hover:bg-gray-50',
    icono: 'bg-gray-100 text-gray-600',
    chip: 'border-gray-200 bg-gray-100 text-gray-600',
    chevron: 'text-gray-400',
  },
};

export default function ReservasHomeSeccion({
  id,
  titulo,
  subtitulo,
  Icono,
  items,
  abierta,
  onToggle,
  onVerTodas,
  textoVerTodas = 'Ver todas',
  onAbrirItem,
  botonRef,
  tono = 'neutral',
}) {
  const panelId = `${id}-panel`;
  const botonId = `${id}-titulo`;
  const clave = TONO[tono] ? tono : 'neutral';
  const estilo = TONO[clave];

  return (
    <section
      aria-labelledby={botonId}
      className={`min-w-0 overflow-hidden rounded-2xl border bg-white shadow-sm ${estilo.caja}`}
    >
      <h3 className="m-0">
        <button
          id={botonId}
          ref={botonRef}
          type="button"
          aria-expanded={abierta}
          aria-controls={panelId}
          onClick={onToggle}
          className={`flex min-h-12 w-full min-w-0 items-center gap-2 px-3 py-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 motion-reduce:transition-none ${estilo.header}`}
        >
          <span aria-hidden="true" className={`grid h-[26px] w-[26px] shrink-0 place-items-center rounded-lg ${estilo.icono}`}>
            <Icono size={14} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12.5px] font-extrabold tracking-tight text-gray-900">
              {titulo}
            </span>
            {subtitulo && (
              <span className="block truncate text-[10px] font-medium text-gray-600">{subtitulo}</span>
            )}
          </span>
          <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[10.5px] font-extrabold tabular-nums ${estilo.chip}`}>
            {items.length}
          </span>
          <ChevronRight
            size={16}
            aria-hidden="true"
            className={`shrink-0 transition-transform motion-reduce:transition-none ${estilo.chevron} ${abierta ? 'rotate-90' : ''}`}
          />
        </button>
      </h3>

      <div
        id={panelId}
        role="region"
        aria-labelledby={botonId}
        hidden={!abierta}
        className="border-t border-gray-100"
      >
        {items.map((item) => (
          <ReservasHomeRow key={item.key} item={item} tonoFila={clave === 'neutral' ? undefined : clave} onClick={() => onAbrirItem(item)} />
        ))}
        {onVerTodas && (
          <div className="flex justify-end px-2 py-1">
            <button
              type="button"
              onClick={onVerTodas}
              className="inline-flex min-h-11 items-center gap-0.5 rounded-lg px-2 text-[11px] font-extrabold text-indigo-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              {textoVerTodas}
              <ChevronRight size={12} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
