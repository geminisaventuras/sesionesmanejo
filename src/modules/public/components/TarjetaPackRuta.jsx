// @build: 2026-11-22 | id: FT-034-TARJETA-PACK-RUTA | desc: Tarjeta presentacional de pack con etapas cubiertas y teóricos sin PII.
//
// Precio: se recibe ya calculado por la vista existente. No recalcula dinero.
// Anónimos: de los módulos formativos solo se muestra el conteo, nunca IDs ni precios.

import { useId } from 'react';
import { Clock, GraduationCap, Info, Package, Sparkles } from 'lucide-react';
import { calcularDiasPack, formatearDias } from '../../shared/utils/duraciones';

export default function TarjetaPackRuta({
  pack,
  precio = null,
  anonimo = true,
  cursosTeoricos = [],
  bloqueado = false,
  ctaLabel = 'Quiero este Pack',
  onComprar,
  onVerCurso,
  totalEtapas = 3,
  className = ''
}) {
  const tituloId = useId();
  const cursos = Array.isArray(pack?.cursos) ? pack.cursos : [];
  const idsTeoricos = Array.isArray(pack?.cursosTeoricosIncluidos)
    ? pack.cursosTeoricosIncluidos
    : [];
  // La proyección pública (packsPublicos) solo expone teoricosCount; el catálogo
  // completo expone los IDs. Se prioriza el conteo entero y se cae al largo de IDs.
  const conteoDeclarado = Number.isInteger(pack?.teoricosCount) && pack.teoricosCount >= 0
    ? pack.teoricosCount
    : null;
  const totalTeoricos = conteoDeclarado ?? idsTeoricos.length;
  const teoricosResueltos = anonimo
    ? []
    : idsTeoricos
        .map((id) => (cursosTeoricos || []).find((curso) => String(curso.id) === String(id)))
        .filter(Boolean);
  const etapasCubiertas = Array.isArray(pack?.etapasCubiertas)
    ? pack.etapasCubiertas.length
    : 0;
  const dias = calcularDiasPack(cursos);
  const base = Number(precio?.base);
  const final = Number(precio?.final);
  const ahorro = Number(precio?.ahorro);
  const mostrarPrecio = Boolean(precio) && Number.isFinite(base) && base > 0;

  const etiquetaCobertura = pack?.cubreRutaCompleta
    ? 'Recomendado'
    : etapasCubiertas > 0
      ? `Cubre ${etapasCubiertas} de ${totalEtapas} etapas`
      : 'Módulos formativos';

  return (
    <article
      aria-labelledby={tituloId}
      className={`overflow-hidden rounded-2xl border-2 border-indigo-100 bg-white shadow-sm ${className}`}
    >
      <div className="border-b border-indigo-100 bg-gradient-to-r from-indigo-50 to-purple-50 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wider ${
                pack?.cubreRutaCompleta
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-indigo-700 ring-1 ring-indigo-200'
              }`}
            >
              <Sparkles size={12} aria-hidden="true" />
              {etiquetaCobertura}
            </span>
            <h3 id={tituloId} className="mt-2 break-words text-xl font-black leading-snug text-slate-900">
              {pack?.nombre || 'Pack por confirmar'}
            </h3>
            {pack?.descripcion && (
              <p className="mt-1 break-words text-sm text-slate-600">{pack.descripcion}</p>
            )}
            {dias > 0 && (
              <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700">
                <Clock size={13} aria-hidden="true" />
                Duración total: {formatearDias(dias)}
              </p>
            )}
          </div>
          <Package size={30} aria-hidden="true" className="shrink-0 text-indigo-500" />
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        {cursos.length > 0 ? (
          <div>
            <h4 className="mb-2 text-xs font-black uppercase tracking-wider text-slate-700">
              Incluye {cursos.length} {cursos.length === 1 ? 'sesión' : 'sesiones'}
            </h4>
            <ol className="space-y-2">
              {cursos.map((curso, indice) => (
                <li key={String(curso.id ?? indice)} className="flex items-start gap-2">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700"
                  >
                    {indice + 1}
                  </span>
                  <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-bold text-slate-900">{curso.nombre}</p>
                      <p className="text-xs text-slate-500">
                        {curso.precioBase != null && `$${curso.precioBase}`}
                        {curso.precioBase != null && curso.duracionTotal ? ' · ' : ''}
                        {curso.duracionTotal ? `${Math.round(curso.duracionTotal / 60)}h` : ''}
                      </p>
                    </div>
                    {onVerCurso && (
                      <button
                        type="button"
                        onClick={() => onVerCurso(curso)}
                        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-indigo-600 transition-transform duration-150 hover:bg-indigo-50 active:scale-[.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                        aria-label={`Ver información de ${curso.nombre || 'la sesión'}`}
                      >
                        <Info size={17} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
            Este pack no incluye sesiones de práctica publicadas por ahora.
          </p>
        )}

        {totalTeoricos > 0 && (
          <div className="rounded-xl border border-teal-200 bg-teal-50 p-3">
            <h4 className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-teal-900">
              <GraduationCap size={14} aria-hidden="true" />
              Módulos formativos
            </h4>
            <p className="mt-1 text-sm font-semibold text-teal-900">
              Incluye {totalTeoricos} {totalTeoricos === 1 ? 'módulo formativo' : 'módulos formativos'}
            </p>
            {teoricosResueltos.length > 0 && (
              <ul className="mt-2 space-y-1">
                {teoricosResueltos.map((curso) => (
                  <li
                    key={String(curso.id)}
                    className="flex items-start gap-2 text-xs text-teal-800"
                  >
                    <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
                    <span className="break-words">{curso.nombre}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {mostrarPrecio && (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-xs text-slate-600">Suma de sesiones:</span>
              <span className="text-sm text-slate-500 line-through">${base.toFixed(2)}</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between gap-3">
              <span className="text-xs font-bold text-emerald-700">Ahorras:</span>
              <span className="text-sm font-bold text-emerald-700">
                ${(Number.isFinite(ahorro) ? ahorro : 0).toFixed(2)}
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-3 border-t border-indigo-300 pt-2">
              <span className="text-sm font-bold text-slate-800">Precio final:</span>
              <span className="text-2xl font-black text-indigo-700 sm:text-3xl">
                ${(Number.isFinite(final) ? final : base).toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {!mostrarPrecio && anonimo && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-bold text-slate-700">Precio no disponible</p>
            <p className="mt-1 text-xs text-slate-500">
              No pudimos calcular el total completo del pack en este momento.
            </p>
          </div>
        )}

        {pack?.vencimientoDias > 0 && (
          <p className="flex items-center gap-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-500">
            <Clock size={14} aria-hidden="true" />
            <span>
              Vigencia: <strong>{pack.vencimientoDias} días</strong> desde la compra
            </span>
          </p>
        )}

        {bloqueado ? (
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 text-xs text-orange-800">
            Ya tienes un pack de sesiones activo. Termínalo antes de comprar otro.
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onComprar?.(pack)}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-base font-bold text-white transition-transform duration-150 hover:bg-indigo-700 active:scale-[.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            <Sparkles size={18} aria-hidden="true" />
            {ctaLabel}
          </button>
        )}
      </div>
    </article>
  );
}
