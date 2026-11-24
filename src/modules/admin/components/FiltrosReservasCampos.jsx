// @build: 2026-11-22 | id: T-063-V2-CAMPOS | desc: Controles presentacionales de filtros de reservas (panel y sheet).

export const ESTADOS_PAGO = ['Todas', 'Pendiente', 'Aprobado', 'Rechazado', 'Cancelado'];

export const ESTADOS_ACADEMICOS = ['Todos', 'No iniciado', 'Iniciado', 'Completado', 'Ausente'];

export const OPCIONES_ORDEN = [
  { id: 'curso_cercano', nombre: 'Próximas primero' },
  { id: 'recientes_desc', nombre: 'Más recientes' },
  { id: 'recientes_asc', nombre: 'Más antiguos' },
  { id: 'curso_lejano', nombre: 'Curso más lejano' },
];

export const FILTROS_AVANZADOS_INICIALES = Object.freeze({
  fechaDesde: '',
  fechaHasta: '',
  orden: 'curso_cercano',
  filtroSede: 'todas',
  filtroCurso: 'todos',
  filtroInstructor: 'todos',
  filtroAcademico: 'Todos',
  filtroHorasPendientes: false,
});

export const contarFiltrosAvanzados = (filtros = {}) => {
  let total = 0;
  if (filtros.fechaDesde) total += 1;
  if (filtros.fechaHasta) total += 1;
  if (filtros.filtroSede && filtros.filtroSede !== 'todas') total += 1;
  if (filtros.filtroCurso && filtros.filtroCurso !== 'todos') total += 1;
  if (filtros.filtroInstructor && filtros.filtroInstructor !== 'todos') total += 1;
  if (filtros.filtroAcademico && filtros.filtroAcademico !== 'Todos') total += 1;
  if (filtros.filtroHorasPendientes) total += 1;
  return total;
};

const CLASES_CONTROL =
  'h-11 w-full min-w-0 max-w-full rounded-xl border border-gray-200 bg-white px-2.5 text-[12px] font-semibold text-gray-900 outline-none transition-colors focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15';

export function CampoSelect({ id, label, value, onChange, options, className = '' }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <label htmlFor={id} className="mb-1.5 block text-[12px] font-bold leading-tight text-gray-800">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={CLASES_CONTROL}
      >
        {options.map((opcion) => (
          <option key={opcion.id} value={opcion.id}>
            {opcion.nombre}
          </option>
        ))}
      </select>
    </div>
  );
}

export function CampoFecha({ id, label, value, onChange, className = '' }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <label htmlFor={id} className="mb-1.5 block text-[12px] font-bold leading-tight text-gray-800">
        {label}
      </label>
      <input
        id={id}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${CLASES_CONTROL} block`}
      />
    </div>
  );
}

export function ChipsAcademicos({ valor, onChange, idGrupo = 'academicos' }) {
  return (
    <div className="min-w-0">
      <span id={`${idGrupo}-label`} className="mb-1.5 block text-[12px] font-bold leading-tight text-gray-800">
        Estado académico
      </span>
      <div
        role="group"
        aria-labelledby={`${idGrupo}-label`}
        className="flex min-w-0 flex-wrap gap-1.5"
      >
        {ESTADOS_ACADEMICOS.map((estado) => {
          const activo = valor === estado;
          return (
            <button
              key={estado}
              type="button"
              aria-pressed={activo}
              onClick={() => onChange(estado)}
              className={`min-h-11 min-w-0 rounded-full border px-2.5 text-[11.5px] font-bold leading-none transition-colors ${
                activo
                  ? 'border-gray-900 bg-gray-900 text-white'
                  : 'border-gray-200 bg-white text-gray-800 hover:bg-gray-50'
              }`}
            >
              {estado}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SwitchHorasPendientes({ valor, onChange, textoSecundario }) {
  return (
    <div className="flex min-h-[56px] min-w-0 items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2">
      <span className="min-w-0">
        <span className="block text-[11.5px] font-bold leading-tight text-gray-900">
          Solo con horas pendientes
        </span>
        <span className="mt-0.5 block text-[10.5px] font-medium leading-tight text-gray-500">
          {textoSecundario}
        </span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={valor}
        aria-label="Solo con horas pendientes"
        onClick={() => onChange(!valor)}
        className="relative h-11 w-[52px] shrink-0 rounded-full outline-none"
      >
        <span
          aria-hidden="true"
          className={`absolute inset-x-[3px] inset-y-2 rounded-full transition-colors motion-reduce:transition-none ${
            valor ? 'bg-orange-600' : 'bg-gray-300'
          }`}
        />
        <span
          aria-hidden="true"
          className={`absolute left-1.5 top-2.5 h-[22px] w-[22px] rounded-full bg-white shadow transition-transform motion-reduce:transition-none ${
            valor ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
