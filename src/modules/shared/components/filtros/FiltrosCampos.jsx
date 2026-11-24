// @build: 2026-11-23 | id: T-071-FILTROS-CAMPOS | desc: Primitivas presentacionales de campos de filtro (fecha, rango, select, chips y switch).
// No contiene lógica de negocio ni semántica de una pantalla concreta: recibe
// `campo`, `valor` y emite `onChange`. Targets táctiles de 44 px mínimo.
import { agruparCampos, normalizarOpciones, valoresIguales } from './filtrosHelpers';

export const CLASES_CONTROL =
  'h-11 w-full min-w-0 max-w-full rounded-xl border border-gray-200 bg-white px-2.5 text-[12.5px] font-semibold text-gray-900 outline-none transition-colors focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400';

const CLASES_LABEL = 'mb-1.5 block text-[12px] font-bold leading-tight text-gray-800';
const CLASES_AYUDA = 'mt-1 block text-[10.5px] font-medium leading-snug text-gray-500';

function Envoltorio({ id, etiqueta, ayuda, className = '', children }) {
  const idAyuda = ayuda ? `${id}-ayuda` : undefined;
  return (
    <div className={`min-w-0 ${className}`}>
      {etiqueta ? (
        <label htmlFor={id} className={CLASES_LABEL}>
          {etiqueta}
        </label>
      ) : null}
      {children}
      {ayuda ? (
        <span id={idAyuda} className={CLASES_AYUDA}>
          {ayuda}
        </span>
      ) : null}
    </div>
  );
}

export function CampoFecha({ id, etiqueta, valor, onChange, ayuda, deshabilitado = false, className = '' }) {
  return (
    <Envoltorio id={id} etiqueta={etiqueta} ayuda={ayuda} className={className}>
      <input
        id={id}
        type="date"
        value={valor ?? ''}
        onChange={(event) => onChange(event.target.value)}
        disabled={deshabilitado}
        aria-describedby={ayuda ? `${id}-ayuda` : undefined}
        className={`${CLASES_CONTROL} block`}
      />
    </Envoltorio>
  );
}

export function CampoRango({ id, etiqueta, valor, onChange, ayuda, deshabilitado = false, className = '' }) {
  const desde = valor?.desde ?? '';
  const hasta = valor?.hasta ?? '';
  const idGrupo = `${id}-grupo`;
  return (
    <div className={`min-w-0 ${className}`}>
      <span id={idGrupo} className={CLASES_LABEL}>
        {etiqueta}
      </span>
      <div
        role="group"
        aria-labelledby={idGrupo}
        aria-describedby={ayuda ? `${id}-ayuda` : undefined}
        className="grid min-w-0 grid-cols-1 gap-2 min-[360px]:grid-cols-2"
      >
        <div className="min-w-0">
          <label htmlFor={`${id}-desde`} className="mb-1 block text-[10.5px] font-bold text-gray-600">
            Desde
          </label>
          <input
            id={`${id}-desde`}
            type="date"
            value={desde}
            onChange={(event) => onChange({ ...valor, desde: event.target.value, hasta })}
            disabled={deshabilitado}
            className={`${CLASES_CONTROL} block`}
          />
        </div>
        <div className="min-w-0">
          <label htmlFor={`${id}-hasta`} className="mb-1 block text-[10.5px] font-bold text-gray-600">
            Hasta
          </label>
          <input
            id={`${id}-hasta`}
            type="date"
            value={hasta}
            onChange={(event) => onChange({ ...valor, desde, hasta: event.target.value })}
            disabled={deshabilitado}
            className={`${CLASES_CONTROL} block`}
          />
        </div>
      </div>
      {ayuda ? (
        <span id={`${id}-ayuda`} className={CLASES_AYUDA}>
          {ayuda}
        </span>
      ) : null}
    </div>
  );
}

export function CampoSelect({
  id,
  etiqueta,
  valor,
  onChange,
  campo,
  opciones,
  ayuda,
  deshabilitado = false,
  className = '',
}) {
  const lista = normalizarOpciones({ opciones: opciones ?? campo?.opciones });
  return (
    <Envoltorio id={id} etiqueta={etiqueta} ayuda={ayuda} className={className}>
      <select
        id={id}
        value={valor ?? ''}
        onChange={(event) => onChange(event.target.value)}
        disabled={deshabilitado}
        aria-describedby={ayuda ? `${id}-ayuda` : undefined}
        className={CLASES_CONTROL}
      >
        {lista.map((opcion) => (
          <option key={String(opcion.valor)} value={opcion.valor}>
            {opcion.etiqueta}
          </option>
        ))}
      </select>
    </Envoltorio>
  );
}

export function CampoChips({
  id,
  etiqueta,
  valor,
  onChange,
  campo,
  opciones,
  ayuda,
  deshabilitado = false,
  className = '',
}) {
  const lista = normalizarOpciones({ opciones: opciones ?? campo?.opciones });
  return (
    <div className={`min-w-0 ${className}`}>
      <span id={`${id}-etiqueta`} className={CLASES_LABEL}>
        {etiqueta}
      </span>
      <div
        role="group"
        aria-labelledby={`${id}-etiqueta`}
        aria-describedby={ayuda ? `${id}-ayuda` : undefined}
        className="flex min-w-0 flex-wrap gap-1.5"
      >
        {lista.map((opcion) => {
          const activo = valoresIguales(valor, opcion.valor);
          return (
            <button
              key={String(opcion.valor)}
              type="button"
              aria-pressed={activo}
              disabled={deshabilitado}
              onClick={() => onChange(opcion.valor)}
              className={`min-h-11 min-w-0 rounded-full border px-3 text-[11.5px] font-bold leading-none transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                activo
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-gray-200 bg-white text-gray-800 hover:bg-gray-50'
              }`}
            >
              {opcion.etiqueta}
            </button>
          );
        })}
      </div>
      {ayuda ? (
        <span id={`${id}-ayuda`} className={CLASES_AYUDA}>
          {ayuda}
        </span>
      ) : null}
    </div>
  );
}

export function CampoSwitch({
  id,
  etiqueta,
  valor,
  onChange,
  ayuda,
  deshabilitado = false,
  className = '',
}) {
  return (
    <div
      className={`flex min-h-[56px] min-w-0 items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2 ${className}`}
    >
      <span className="min-w-0">
        <span id={`${id}-etiqueta`} className="block text-[11.5px] font-bold leading-tight text-gray-900">
          {etiqueta}
        </span>
        {ayuda ? (
          <span id={`${id}-ayuda`} className="mt-0.5 block text-[10.5px] font-medium leading-tight text-gray-500">
            {ayuda}
          </span>
        ) : null}
      </span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={Boolean(valor)}
        aria-labelledby={`${id}-etiqueta`}
        aria-describedby={ayuda ? `${id}-ayuda` : undefined}
        disabled={deshabilitado}
        onClick={() => onChange(!valor)}
        className="relative h-11 w-[52px] shrink-0 rounded-full outline-none disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span
          aria-hidden="true"
          className={`absolute inset-x-[3px] inset-y-2 rounded-full transition-colors motion-reduce:transition-none ${
            valor ? 'bg-blue-600' : 'bg-gray-300'
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

/** Renderiza el control correspondiente al `tipo` declarado en el campo. */
export function CampoFiltro({ campo, valor, onChange, idPrefijo = 'filtro' }) {
  if (!campo?.id) return null;
  const id = `${idPrefijo}-${campo.id}`;
  const comunes = {
    id,
    etiqueta: campo.etiqueta || campo.id,
    valor: valor ?? campo.defecto,
    onChange: (nuevoValor) => onChange?.(campo.id, nuevoValor),
    ayuda: campo.ayuda,
    deshabilitado: Boolean(campo.deshabilitado),
    className: campo.className,
  };
  switch (campo.tipo) {
    case 'fecha':
      return <CampoFecha {...comunes} />;
    case 'rango':
      return <CampoRango {...comunes} />;
    case 'select':
      return <CampoSelect {...comunes} campo={campo} />;
    case 'chips':
      return <CampoChips {...comunes} campo={campo} />;
    case 'switch':
      return <CampoSwitch {...comunes} />;
    default:
      return null;
  }
}

export function GrupoCampos({ grupo, campos = [], valores = {}, onCambio, idPrefijo = 'filtro' }) {
  const idLeyenda = `${idPrefijo}-grupo-${String(grupo || 'general').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <fieldset
      className="m-0 min-w-0 border-0 p-0"
      aria-labelledby={grupo ? idLeyenda : undefined}
    >
      {grupo ? (
        <legend
          id={idLeyenda}
          className="mb-2 w-full text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-gray-500"
        >
          {grupo}
        </legend>
      ) : null}
      <div className="min-w-0 space-y-2.5">
        {campos.map((campo) => (
          <CampoFiltro
            key={campo.id}
            campo={campo}
            valor={valores?.[campo.id]}
            onChange={onCambio}
            idPrefijo={idPrefijo}
          />
        ))}
      </div>
    </fieldset>
  );
}

/** Renderiza todos los campos agrupados por `campo.grupo`, conservando el orden. */
export function CamposFiltros({ campos = [], valores = {}, onCambio, idPrefijo = 'filtro', className = '' }) {
  const grupos = agruparCampos(campos);
  return (
    <div className={`min-w-0 space-y-4 ${className}`}>
      {grupos.map((grupo) => (
        <GrupoCampos
          key={grupo.grupo ?? '__sinGrupo'}
          grupo={grupo.grupo}
          campos={grupo.campos}
          valores={valores}
          onCambio={onCambio}
          idPrefijo={idPrefijo}
        />
      ))}
    </div>
  );
}
