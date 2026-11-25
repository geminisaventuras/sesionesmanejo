// @build: 2026-11-24 | id: F-02-VIA-TARJETA | desc: Tarjeta editorial de sesión con datos reales del catálogo público.
//
// No decide gating ni precios: recibe `bloqueado`, `prerequisitoLabel` y el curso.
// El bloque "Cómo llegas / Cómo sales" del diseño se traduce a los campos reales
// `dirigidoA` y `queAprenderas`; nunca se inventan textos de transformación.

import { useEffect, useId, useState } from 'react';
import {
  ArrowRight,
  Bike,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  HeartHandshake,
  Lock,
  Package,
  Sparkles,
  Target,
  UserCheck,
} from 'lucide-react';
import {
  duracionCurso,
  formatearMonto,
  listaTexto,
  precioCurso,
  precioCursoConSede,
  textoPlano,
} from './viaDatos';

export default function ViaTarjetaSesion({
  curso,
  kmLabel,
  etapaNumero,
  recomendada = false,
  bloqueado = false,
  prerequisitoLabel = null,
  sede = null,
  onInscribirme,
  onVerDetalle,
  onIrAPacks,
}) {
  const tituloId = useId();
  const [abierta, setAbierta] = useState(Boolean(recomendada));

  useEffect(() => {
    if (recomendada) setAbierta(true);
  }, [recomendada]);

  if (!curso) return null;

  const base = precioCurso(curso);
  const precio = precioCursoConSede(curso, sede);
  const recargo = base != null && precio != null ? Math.round((precio - base) * 100) / 100 : 0;
  const duracion = duracionCurso(curso);
  const dirigidoA = textoPlano(curso.dirigidoA);
  const queAprenderas = listaTexto(curso.queAprenderas);
  const tiposMoto = Array.isArray(curso.tiposMotoEscuela) ? curso.tiposMotoEscuela.filter(Boolean) : [];
  const primeraDestreza = queAprenderas[0] || null;
  const sinId = curso.id == null;

  return (
    <article
      aria-labelledby={tituloId}
      className={`relative rounded-3xl border-2 bg-white p-4 transition-all duration-200 sm:p-5 ${
        recomendada
          ? 'border-[#2563EB] shadow-lg ring-4 ring-blue-500/15'
          : bloqueado
            ? 'border-slate-200/90 bg-gradient-to-b from-white to-slate-50/70 shadow-sm'
            : 'border-slate-200/90 shadow-sm hover:border-slate-300'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {kmLabel && (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                recomendada ? 'bg-[#0F172A] text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              <span>{kmLabel}</span>
              {etapaNumero ? <span>· Etapa {etapaNumero}</span> : null}
            </span>
          )}

          {recomendada && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#FF6B00] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-sm">
              <Sparkles size={11} aria-hidden="true" />
              <span>Recomendada para ti</span>
            </span>
          )}

          {bloqueado && (
            <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-[#EEF2FF] px-2.5 py-1 text-[10px] font-extrabold text-[#4F46E5]">
              <Lock size={11} aria-hidden="true" />
              <span>Siguiente nivel</span>
            </span>
          )}
        </div>

        {precio != null && (
          <div className="shrink-0 text-right">
            <div
              className="text-2xl font-black leading-none tabular-nums text-slate-900"
              data-precio-base={base ?? undefined}
              data-recargo={recargo}
              data-precio-final={precio}
            >
              {recargo > 0 && (
                <span className="mr-1 align-middle text-[9px] font-black uppercase tracking-wider text-slate-500">
                  Desde
                </span>
              )}
              ${formatearMonto(precio)}
              <span className="ml-0.5 text-[11px] font-bold text-slate-500">USD</span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 space-y-1">
        <h3 id={tituloId} className="break-words text-lg font-black leading-snug text-slate-900 sm:text-xl">
          {curso.nombre || 'Sesión por confirmar'}
        </h3>
        {curso.descripcion && (
          <p className="break-words text-xs leading-relaxed text-slate-600 sm:text-sm">
            {textoPlano(curso.descripcion)}
          </p>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-bold text-slate-600">
        {duracion && (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1">
            <Clock size={12} className="text-[#2563EB]" aria-hidden="true" />
            {duracion}
          </span>
        )}
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1">
          <UserCheck size={12} className="text-[#10B981]" aria-hidden="true" />
          Privada 1 a 1
        </span>
        {curso.motoIncluida === false ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-[#FFF7ED] px-2.5 py-1 text-[#C2410C]">
            <Bike size={12} aria-hidden="true" />
            Trae tu vehículo
          </span>
        ) : (
          curso.motoIncluida === true && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[#6EE7B7] bg-[#ECFDF5] px-2.5 py-1 text-[#047857]">
              <Bike size={12} aria-hidden="true" />
              {tiposMoto.length > 0 ? `Moto incluida · ${tiposMoto.join(' / ')}` : 'Moto incluida'}
            </span>
          )
        )}
      </div>

      {(dirigidoA || primeraDestreza) && (
        <div className="mt-3.5 space-y-2.5 rounded-2xl border border-slate-200/80 bg-[#F8FAFC] p-3.5 sm:grid sm:grid-cols-2 sm:gap-3 sm:space-y-0">
          {dirigidoA && (
            <div className="flex items-start gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-orange-200 bg-[#FFF7ED] text-[10px] font-black text-[#FF6B00]">
                •
              </span>
              <div className="text-xs leading-snug">
                <span className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Para quién es
                </span>
                <span className="font-semibold text-slate-700">{dirigidoA}</span>
              </div>
            </div>
          )}

          {primeraDestreza && (
            <div className="flex items-start gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#6EE7B7] bg-[#ECFDF5] text-[10px] font-black text-[#047857]">
                ✓
              </span>
              <div className="text-xs leading-snug">
                <span className="block text-[10px] font-extrabold uppercase tracking-wider text-[#047857]">
                  Lo que practicarás
                </span>
                <span className="font-bold text-slate-900">{primeraDestreza}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {queAprenderas.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setAbierta((valor) => !valor)}
            aria-expanded={abierta}
            className="flex min-h-[44px] w-full cursor-pointer touch-manipulation items-center justify-between rounded-2xl px-3 py-2 text-xs font-extrabold text-[#2563EB] transition-colors hover:bg-slate-50"
          >
            <span className="inline-flex items-center gap-1.5">
              <Target size={14} aria-hidden="true" />
              <span>¿Qué harás en pista? ({queAprenderas.length} claves)</span>
            </span>
            {abierta ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
          </button>

          {abierta && (
            <ul className="via-fade-in mt-1.5 space-y-2 rounded-2xl border border-slate-200/70 bg-[#EFF6FF] p-3.5 text-xs text-slate-700">
              {queAprenderas.map((objetivo, indice) => (
                <li key={`${objetivo}-${indice}`} className="flex items-start gap-2 leading-relaxed">
                  <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-[#2563EB]" aria-hidden="true" />
                  <span className="break-words">{objetivo}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {prerequisitoLabel && (
        <div
          className={`mt-3 flex items-start gap-2 rounded-2xl border px-3 py-2.5 text-[11px] font-semibold leading-snug ${
            bloqueado
              ? 'border-indigo-200 bg-[#EEF2FF] text-[#4338CA]'
              : 'border-orange-200/80 bg-[#FFF7ED] text-slate-700'
          }`}
        >
          {bloqueado ? (
            <Lock size={14} className="mt-0.5 shrink-0 text-[#4F46E5]" aria-hidden="true" />
          ) : (
            <HeartHandshake size={14} className="mt-0.5 shrink-0 text-[#FF6B00]" aria-hidden="true" />
          )}
          <span>
            {bloqueado
              ? `Se desbloquea tras completar tu Básica (${prerequisitoLabel}). También puedes incluirla en el Pack Ruta Completa.`
              : `Sugerencia previa: ${prerequisitoLabel}. Si ya dominas el equilibrio en bicicleta, puedes iniciar aquí.`}
          </span>
        </div>
      )}

      <div className="mt-4 grid grid-cols-12 gap-2">
        <button
          type="button"
          onClick={() => onVerDetalle?.(curso)}
          className="col-span-5 min-h-[48px] cursor-pointer touch-manipulation rounded-2xl border-2 border-slate-200 bg-white px-3 py-2.5 text-xs font-extrabold text-slate-800 transition-all hover:bg-slate-50 active:scale-[0.98] sm:col-span-4 sm:text-sm"
        >
          Ver detalles
        </button>

        {bloqueado ? (
          <button
            type="button"
            onClick={() => onIrAPacks?.()}
            className="col-span-7 flex min-h-[48px] cursor-pointer touch-manipulation items-center justify-center gap-1.5 rounded-2xl bg-[#4F46E5] px-4 py-2.5 text-xs font-extrabold text-white shadow-sm transition-all hover:bg-[#4338CA] active:scale-[0.98] sm:col-span-8 sm:text-sm"
          >
            <Package size={15} aria-hidden="true" />
            <span>Llegar con el Pack</span>
            <ArrowRight size={15} aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            disabled={sinId}
            onClick={() => onInscribirme?.(curso.id)}
            className="col-span-7 flex min-h-[48px] cursor-pointer touch-manipulation items-center justify-center gap-1.5 rounded-2xl bg-[#2563EB] px-4 py-2.5 text-xs font-extrabold text-white shadow-sm transition-all hover:bg-[#1D4ED8] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-300 sm:col-span-8 sm:text-sm"
          >
            <span>Reservar esta sesión</span>
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        )}
      </div>
    </article>
  );
}
