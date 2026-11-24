// @build: 2026-11-22 | id: FT-034-TARJETA-CURSO-RUTA | desc: Tarjeta presentacional de una sesión dentro de la ruta.
//
// No decide gating ni precios: recibe `bloqueado` y los datos reales del curso.
// Solo muestra precioBase cuando el catálogo lo trae.

import { useId } from 'react';
import {
  AlertCircle,
  Bike,
  CheckCircle2,
  Clock,
  Info,
  Sparkles
} from 'lucide-react';
import { calcularDias, formatearDias } from '../../shared/utils/duraciones';

const formatearDuracion = (minutos) => {
  if (!minutos && minutos !== 0) return null;
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;
  if (horas === 0) return `${mins} min`;
  if (mins === 0) return `${horas} ${horas === 1 ? 'hora' : 'horas'}`;
  return `${horas}h ${mins} min`;
};

const listaTexto = (valor) => {
  if (Array.isArray(valor)) return valor.map((item) => String(item || '').trim()).filter(Boolean);
  if (typeof valor === 'string') return valor.split('\n').map((item) => item.trim()).filter(Boolean);
  return [];
};

const nombresModulos = (modulos) =>
  (Array.isArray(modulos) ? modulos : [])
    .map((modulo) => (typeof modulo === 'string' ? modulo : modulo?.nombre))
    .map((nombre) => String(nombre || '').trim())
    .filter(Boolean);

export default function TarjetaCursoRuta({
  curso,
  numero,
  prerequisitoLabel = null,
  bloqueado = false,
  onInscribirme,
  onVerDetalle,
  className = ''
}) {
  const tituloId = useId();
  const queAprenderas = listaTexto(curso?.queAprenderas);
  const modulos = nombresModulos(curso?.modulos);
  const duracion = formatearDuracion(curso?.duracionTotal);
  const dias = calcularDias(curso?.duracionTotal);
  const tienePrecio = curso?.precioBase != null && curso?.precioBase !== '';
  const tiposMoto = Array.isArray(curso?.tiposMotoEscuela) ? curso.tiposMotoEscuela.filter(Boolean) : [];
  const alquiler = Number(curso?.precioAlquilerMoto) || 0;

  return (
    <article
      aria-labelledby={tituloId}
      className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      <div className="flex items-start gap-3 border-b border-slate-100 bg-slate-50 p-4 sm:p-5">
        <span
          aria-hidden="true"
          className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white"
        >
          {numero}
        </span>
        <div className="min-w-0 flex-1">
          <h3 id={tituloId} className="break-words text-lg font-bold leading-snug text-slate-900 sm:text-xl">
            {curso?.nombre || 'Sesión por confirmar'}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
            {duracion && (
              <span className="inline-flex items-center gap-1.5">
                <Clock size={14} aria-hidden="true" />
                {duracion}
                {dias > 0 && <span className="text-slate-400">·</span>}
                {dias > 0 && formatearDias(dias)}
              </span>
            )}
            {tienePrecio && (
              <span className="font-bold text-blue-700">
                ${curso.precioBase} <span className="font-normal text-slate-500">USD</span>
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        {queAprenderas.length > 0 && (
          <div>
            <h4 className="mb-2 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-700">
              <Sparkles size={14} aria-hidden="true" className="text-blue-600" />
              Lo que practicarás
            </h4>
            <ul className="space-y-1.5">
              {queAprenderas.slice(0, 3).map((item, indice) => (
                <li key={`${item}-${indice}`} className="flex items-start gap-2 text-sm text-slate-700">
                  <CheckCircle2 size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-emerald-600" />
                  <span className="break-words">{item}</span>
                </li>
              ))}
            </ul>
            {queAprenderas.length > 3 && (
              <p className="mt-1.5 pl-6 text-xs text-slate-500">
                +{queAprenderas.length - 3} destrezas más
              </p>
            )}
          </div>
        )}

        {modulos.length > 0 && (
          <div>
            <h4 className="mb-2 text-xs font-black uppercase tracking-wider text-slate-700">
              Contenido de la sesión
            </h4>
            <ul className="flex flex-wrap gap-1.5">
              {modulos.slice(0, 3).map((modulo, indice) => (
                <li
                  key={`${modulo}-${indice}`}
                  className="max-w-full break-words rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700"
                >
                  {modulo}
                </li>
              ))}
              {modulos.length > 3 && (
                <li className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500">
                  +{modulos.length - 3} módulos
                </li>
              )}
            </ul>
          </div>
        )}

        {curso?.motoIncluida === false && (
          <p className="inline-flex items-start gap-2 rounded-xl bg-orange-50 px-3 py-2 text-xs text-orange-800">
            <Bike size={15} aria-hidden="true" className="mt-0.5 shrink-0" />
            Debes traer tu propio vehículo de práctica.
          </p>
        )}

        {curso?.motoIncluida === true && (
          <p className="inline-flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            <Bike size={15} aria-hidden="true" className="mt-0.5 shrink-0" />
            <span>
              Incluye vehículo de práctica
              {tiposMoto.length > 0 && ` (${tiposMoto.join(' o ')})`}
              {alquiler > 0 && <span className="ml-1 font-bold">+${alquiler}</span>}
            </span>
          </p>
        )}

        {prerequisitoLabel && (
          <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <AlertCircle size={15} aria-hidden="true" className="mt-0.5 shrink-0" />
            <span>
              <strong>Requisito:</strong> {prerequisitoLabel}.
            </span>
          </p>
        )}

        <div className="flex flex-col gap-2 pt-1 sm:flex-row">
          <button
            type="button"
            onClick={() => onVerDetalle?.(curso)}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border-2 border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-transform duration-150 hover:bg-slate-50 active:scale-[.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <Info size={16} aria-hidden="true" />
            Ver detalle
          </button>

          {bloqueado ? (
            <div className="flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-slate-100 px-4 py-2.5 text-center text-sm font-semibold text-slate-500">
              Requiere sesión previa
            </div>
          ) : curso?.id == null ? (
            <div className="flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-slate-100 px-4 py-2.5 text-center text-sm font-semibold text-slate-500">
              No disponible
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onInscribirme?.(curso.id)}
              className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition-transform duration-150 hover:bg-blue-700 active:scale-[.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              Inscribirme
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
