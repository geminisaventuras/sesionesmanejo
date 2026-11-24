// @build: 2026-11-23 | id: T-071-FILTROS-PANEL | desc: Panel inline de filtros para escritorio (280 px, aplicación inmediata y Limpiar).
import { Filter } from 'lucide-react';
import { CamposFiltros } from './FiltrosCampos';

export default function FiltrosPanel({
  id,
  titulo = 'Filtros',
  campos = [],
  valores = {},
  onChange,
  onLimpiar,
  contadorActivo = 0,
  resumenActivo = [],
  cargando = false,
  error,
  className = '',
}) {
  const resumenTexto = (Array.isArray(resumenActivo) ? resumenActivo : []).filter(Boolean).join(' · ');

  return (
    <aside
      aria-label={titulo}
      className={`hidden min-w-0 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm lg:sticky lg:top-0 lg:block lg:w-[280px] lg:shrink-0 ${className}`}
    >
      <div className="mb-3 flex min-w-0 items-center justify-between gap-2">
        <h3 className="flex min-w-0 items-center gap-1.5 text-[13px] font-extrabold text-gray-900">
          <Filter size={14} aria-hidden="true" className="text-gray-500" />
          {titulo}
          {contadorActivo > 0 ? (
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10.5px] font-extrabold text-blue-700">
              {contadorActivo}
            </span>
          ) : null}
        </h3>
        <button
          type="button"
          onClick={onLimpiar}
          className="min-h-11 shrink-0 rounded-lg px-1 text-[11px] font-bold text-blue-700 hover:underline"
        >
          Limpiar
        </button>
      </div>

      {resumenTexto ? (
        <p className="mb-3 m-0 rounded-lg bg-gray-50 px-2.5 py-1.5 text-[10.5px] font-semibold leading-snug text-gray-600">
          {resumenTexto}
        </p>
      ) : null}

      {error?.mensaje ? (
        <div
          role="alert"
          className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11.5px] font-semibold text-red-800"
        >
          <p className="m-0">No pudimos cargar las opciones.</p>
          <p className="m-0 mt-0.5 font-medium text-red-700">{error.mensaje}</p>
          {error.onReintentar ? (
            <button
              type="button"
              onClick={error.onReintentar}
              className="mt-2 min-h-11 rounded-lg border border-red-300 bg-white px-3 text-[11.5px] font-bold text-red-800 hover:bg-red-100"
            >
              Reintentar
            </button>
          ) : null}
        </div>
      ) : null}

      {cargando ? (
        <p role="status" className="mb-3 text-[11.5px] font-semibold text-gray-600">
          Cargando opciones…
        </p>
      ) : null}

      <CamposFiltros campos={campos} valores={valores} onCambio={onChange} idPrefijo={`${id}-panel`} />

      <p className="mb-0 mt-3 text-[10.5px] font-medium leading-snug text-gray-500">
        Los cambios se aplican al instante.
      </p>
    </aside>
  );
}
