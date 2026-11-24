// @build: 2026-11-23 | id: T-071-FILTROS-BARRA | desc: Barra compacta de filtros para móvil (buscador opcional + botón Filtros (N)) y accesos rápidos de escritorio.
import { Filter, Search } from 'lucide-react';

export default function FiltrosBarra({
  id,
  abierto = false,
  onAbrir,
  contadorActivo = 0,
  resumenActivo = [],
  busqueda,
  accesosRapidos = [],
  cargando = false,
  etiqueta = 'Filtros',
  botonRef,
  className = '',
}) {
  const resumenTexto = (Array.isArray(resumenActivo) ? resumenActivo : []).filter(Boolean).join(' · ');
  const activo = contadorActivo > 0;
  const etiquetaAccesible = activo
    ? `${etiqueta}, ${contadorActivo} activo${contadorActivo === 1 ? '' : 's'}${resumenTexto ? `: ${resumenTexto}` : ''}`
    : etiqueta;

  if (cargando && !activo) {
    return (
      <div aria-busy="true" aria-live="polite" className={`min-w-0 ${className}`}>
        <span className="sr-only">Cargando filtros</span>
        <div className="h-14 w-full animate-pulse rounded-xl bg-gray-100 motion-reduce:animate-none" />
      </div>
    );
  }

  const clasesBoton = [
    'flex min-h-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border px-3 text-center transition-colors lg:hidden',
    busqueda ? 'min-w-[128px] max-w-[55%]' : 'w-full',
    activo
      ? 'border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100'
      : 'border-gray-200 bg-white text-gray-900 hover:bg-gray-50',
  ].join(' ');

  return (
    <div aria-busy={cargando || undefined} className={`min-w-0 ${className}`}>
      <div className="flex min-w-0 items-center gap-2">
        {busqueda ? (
          <div className="relative min-w-0 flex-1">
            <label htmlFor={`${id}-busqueda`} className="sr-only">
              {busqueda.label || 'Buscar'}
            </label>
            <Search
              size={16}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              id={`${id}-busqueda`}
              type="search"
              enterKeyHint="search"
              value={busqueda.valor ?? ''}
              onChange={(event) => busqueda.onChange?.(event.target.value)}
              placeholder={busqueda.placeholder || 'Buscar'}
              aria-label={busqueda.label || 'Buscar'}
              disabled={Boolean(busqueda.deshabilitado) || cargando}
              className="h-11 w-full min-w-0 max-w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 text-[12.5px] font-semibold text-gray-900 outline-none transition-colors placeholder:text-gray-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 disabled:cursor-not-allowed disabled:bg-gray-50"
            />
          </div>
        ) : null}

        <button
          ref={botonRef}
          type="button"
          onClick={onAbrir}
          aria-expanded={abierto}
          aria-controls={`${id}-sheet`}
          aria-label={etiquetaAccesible}
          className={clasesBoton}
        >
          <span className="flex items-center gap-1.5 text-[13px] font-extrabold leading-tight">
            <Filter size={16} aria-hidden="true" />
            {etiqueta}
            {activo ? ` (${contadorActivo})` : ''}
          </span>
          {resumenTexto ? (
            <span className="max-w-full truncate text-[10.5px] font-semibold leading-tight text-gray-500">
              {resumenTexto}
            </span>
          ) : null}
        </button>
      </div>

      {Array.isArray(accesosRapidos) && accesosRapidos.length > 0 ? (
        <div className="mt-2 hidden min-w-0 gap-1.5 overflow-x-auto pb-1 lg:flex">
          {accesosRapidos.map((acceso) => (
            <button
              key={acceso.id}
              type="button"
              aria-pressed={Boolean(acceso.activo)}
              onClick={acceso.onClick}
              className={`min-h-11 shrink-0 rounded-full border px-3 text-[11.5px] font-bold transition-colors ${
                acceso.activo
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-gray-200 bg-white text-gray-800 hover:bg-gray-50'
              }`}
            >
              {acceso.etiqueta}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
