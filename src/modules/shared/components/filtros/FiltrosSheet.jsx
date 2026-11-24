// @build: 2026-11-23 | id: T-071-FILTROS-SHEET | desc: Bottom sheet móvil del sistema compartido de filtros (borrador, focus trap, Escape y footer sticky).
import { useCallback, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { CamposFiltros } from './FiltrosCampos';

export default function FiltrosSheet({
  id,
  titulo = 'Filtros',
  descripcion = 'Aplica los cambios al confirmar.',
  campos = [],
  borrador = {},
  onCambio,
  onLimpiar,
  onAplicar,
  onCerrar,
  contadorBorrador = 0,
  resultados,
  etiquetaAplicar = 'Aplicar',
  cargando = false,
  error,
}) {
  const contenedorRef = useRef(null);
  // El focus trap no debe reenfocar en cada render: estabiliza el callback de Escape.
  const onCerrarRef = useRef(onCerrar);
  onCerrarRef.current = onCerrar;
  const manejarEscape = useCallback(() => onCerrarRef.current?.(), []);
  useFocusTrap(contenedorRef, manejarEscape);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflowPrevio;
    };
  }, []);

  const idTitulo = `${id}-sheet-titulo`;
  const idDescripcion = `${id}-sheet-descripcion`;
  const conResultados = Number.isFinite(resultados);
  const etiquetaResultados = conResultados
    ? `${resultados} ${resultados === 1 ? 'resultado' : 'resultados'}`
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center lg:hidden">
      <div
        aria-hidden="true"
        onClick={onCerrar}
        className="absolute inset-0 h-full w-full bg-slate-900/50"
      />
      <section
        id={`${id}-sheet`}
        ref={contenedorRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        aria-describedby={idDescripcion}
        aria-busy={cargando || undefined}
        className="relative flex max-h-[92dvh] w-full max-w-[480px] flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl"
      >
        <span aria-hidden="true" className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-gray-200" />

        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-100 px-4 pb-2.5 pt-2">
          <div className="min-w-0">
            <p className="m-0 text-[10px] font-extrabold uppercase tracking-[0.12em] text-blue-700">
              Refinar resultados
            </p>
            <h2
              id={idTitulo}
              className="m-0 flex flex-wrap items-center gap-2 text-[20px] font-extrabold leading-tight tracking-tight text-gray-900"
            >
              {titulo}
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10.5px] font-extrabold text-blue-700">
                {contadorBorrador > 0
                  ? `${contadorBorrador} activo${contadorBorrador === 1 ? '' : 's'}`
                  : 'Sin filtros'}
              </span>
            </h2>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar filtros"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-3">
          <p
            id={idDescripcion}
            className="mb-3 rounded-xl bg-gray-50 px-3 py-2 text-[10.5px] font-medium leading-relaxed text-gray-600"
          >
            {descripcion}
          </p>

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

          <CamposFiltros
            campos={campos}
            valores={borrador}
            onCambio={onCambio}
            idPrefijo={`${id}-sheet`}
          />
        </div>

        <footer className="grid shrink-0 grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-2 border-t border-gray-100 px-4 pb-[calc(11px_+_env(safe-area-inset-bottom))] pt-2.5">
          {conResultados ? (
            <p
              role="status"
              aria-live="polite"
              className="col-span-2 m-0 text-center text-[10.5px] font-semibold text-gray-500"
            >
              {etiquetaResultados} con los filtros aplicados
            </p>
          ) : null}
          <button
            type="button"
            onClick={onLimpiar}
            className="min-h-12 rounded-xl border border-gray-200 bg-white px-3 text-[12.5px] font-bold text-gray-800 hover:bg-gray-50"
          >
            Limpiar
          </button>
          <button
            type="button"
            onClick={onAplicar}
            className="min-h-12 rounded-xl bg-blue-600 px-3 text-[12.5px] font-bold text-white hover:bg-blue-700"
          >
            {etiquetaAplicar}
          </button>
        </footer>
      </section>
    </div>
  );
}
