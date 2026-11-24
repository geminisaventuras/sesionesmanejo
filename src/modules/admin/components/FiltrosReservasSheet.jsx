// @build: 2026-11-22 | id: T-063-V2-SHEET | desc: Bottom sheet de filtros para móvil con focus trap, Escape y confirmación.
import { useRef } from 'react';
import { X } from 'lucide-react';
import { useFocusTrap } from '../../shared/hooks/useFocusTrap';
import {
  CampoFecha,
  CampoSelect,
  ChipsAcademicos,
  OPCIONES_ORDEN,
  SwitchHorasPendientes,
} from './FiltrosReservasCampos';

export default function FiltrosReservasSheet({
  filtros,
  onCambio,
  onLimpiar,
  onAplicar,
  onCerrar,
  resultados,
  opcionesSede,
  opcionesCurso,
  opcionesInstructor,
}) {
  const contenedorRef = useRef(null);
  useFocusTrap(contenedorRef, onCerrar);

  const etiquetaResultados = `${resultados} ${resultados === 1 ? 'resultado' : 'resultados'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center lg:hidden">
      <button
        type="button"
        tabIndex={-1}
        aria-label="Cerrar filtros"
        onClick={onCerrar}
        className="absolute inset-0 h-full w-full cursor-default bg-slate-900/50"
      />
      <section
        id="reservas-filtros-sheet"
        ref={contenedorRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reservas-filtros-titulo"
        className="relative flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl"
      >
        <span aria-hidden="true" className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-gray-200" />

        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-100 px-4 pb-2.5 pt-2">
          <div className="min-w-0">
            <p className="m-0 text-[10px] font-extrabold uppercase tracking-[0.12em] text-blue-700">
              Refinar resultados
            </p>
            <h2
              id="reservas-filtros-titulo"
              className="m-0 text-[20px] font-extrabold leading-tight tracking-tight text-gray-900"
            >
              Filtros
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
          <p className="mb-3 rounded-xl bg-gray-50 px-3 py-2 text-[10.5px] font-medium leading-relaxed text-gray-600">
            Aplica los cambios al confirmar. El conteo se actualiza sin cerrar la hoja.
          </p>

          <div className="mb-3 grid min-w-0 grid-cols-2 gap-2">
            <CampoFecha
              id="sheet-fecha-desde"
              label="Desde"
              value={filtros.fechaDesde}
              onChange={(valor) => onCambio('fechaDesde', valor)}
            />
            <CampoFecha
              id="sheet-fecha-hasta"
              label="Hasta"
              value={filtros.fechaHasta}
              onChange={(valor) => onCambio('fechaHasta', valor)}
            />
          </div>

          <div className="space-y-2.5">
            <CampoSelect
              id="sheet-orden"
              label="Ordenar por"
              value={filtros.orden}
              onChange={(valor) => onCambio('orden', valor)}
              options={OPCIONES_ORDEN}
            />
            <CampoSelect
              id="sheet-sede"
              label="Sede"
              value={filtros.filtroSede}
              onChange={(valor) => onCambio('filtroSede', valor)}
              options={opcionesSede}
            />
            <CampoSelect
              id="sheet-curso"
              label="Curso"
              value={filtros.filtroCurso}
              onChange={(valor) => onCambio('filtroCurso', valor)}
              options={opcionesCurso}
            />
            <CampoSelect
              id="sheet-instructor"
              label="Instructor"
              value={filtros.filtroInstructor}
              onChange={(valor) => onCambio('filtroInstructor', valor)}
              options={opcionesInstructor}
            />
            <ChipsAcademicos
              idGrupo="sheet-academicos"
              valor={filtros.filtroAcademico}
              onChange={(valor) => onCambio('filtroAcademico', valor)}
            />
            <SwitchHorasPendientes
              valor={filtros.filtroHorasPendientes}
              onChange={(valor) => onCambio('filtroHorasPendientes', valor)}
              textoSecundario={etiquetaResultados}
            />
          </div>
        </div>

        <footer className="grid shrink-0 grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-2 border-t border-gray-100 px-4 pb-[calc(11px_+_env(safe-area-inset-bottom))] pt-2.5">
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
            Ver {etiquetaResultados}
          </button>
        </footer>
      </section>
    </div>
  );
}
