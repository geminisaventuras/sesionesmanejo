// @build: 2026-11-22 | id: T-063-V2-PANEL | desc: Panel lateral de filtros avanzados para escritorio (aplica al instante).
import { Filter } from 'lucide-react';
import {
  CampoFecha,
  CampoSelect,
  ChipsAcademicos,
  SwitchHorasPendientes,
} from './FiltrosReservasCampos';

export default function FiltrosReservasPanel({
  filtros,
  onCambio,
  onLimpiar,
  opcionesSede,
  opcionesCurso,
  opcionesInstructor,
  reservasConHoras,
}) {
  return (
    <aside
      aria-label="Filtros avanzados"
      className="hidden min-w-0 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm lg:sticky lg:top-0 lg:block"
    >
      <div className="mb-3 flex min-w-0 items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-[13px] font-extrabold text-gray-900">
          <Filter size={14} aria-hidden="true" className="text-gray-500" />
          Filtros
        </h3>
        <button
          type="button"
          onClick={onLimpiar}
          className="min-h-11 rounded-lg px-1 text-[11px] font-bold text-blue-700 hover:underline"
        >
          Limpiar
        </button>
      </div>

      <div className="space-y-2.5">
        <CampoFecha
          id="panel-fecha-desde"
          label="Desde"
          value={filtros.fechaDesde}
          onChange={(valor) => onCambio('fechaDesde', valor)}
        />
        <CampoFecha
          id="panel-fecha-hasta"
          label="Hasta"
          value={filtros.fechaHasta}
          onChange={(valor) => onCambio('fechaHasta', valor)}
        />
        <CampoSelect
          id="panel-sede"
          label="Sede"
          value={filtros.filtroSede}
          onChange={(valor) => onCambio('filtroSede', valor)}
          options={opcionesSede}
        />
        <CampoSelect
          id="panel-curso"
          label="Curso"
          value={filtros.filtroCurso}
          onChange={(valor) => onCambio('filtroCurso', valor)}
          options={opcionesCurso}
        />
        <CampoSelect
          id="panel-instructor"
          label="Instructor"
          value={filtros.filtroInstructor}
          onChange={(valor) => onCambio('filtroInstructor', valor)}
          options={opcionesInstructor}
        />
        <ChipsAcademicos
          idGrupo="panel-academicos"
          valor={filtros.filtroAcademico}
          onChange={(valor) => onCambio('filtroAcademico', valor)}
        />
        <SwitchHorasPendientes
          valor={filtros.filtroHorasPendientes}
          onChange={(valor) => onCambio('filtroHorasPendientes', valor)}
          textoSecundario={`${reservasConHoras} reservas coinciden`}
        />
      </div>
    </aside>
  );
}
