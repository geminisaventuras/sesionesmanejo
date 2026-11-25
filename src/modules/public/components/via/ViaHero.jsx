// @build: 2026-11-24 | id: F-02-VIA-HERO | desc: Hero oscuro y diagnóstico en 2 toques con recomendación basada en el catálogo real.
//
// Copy de marca provisto en el diseño aprobado. Los montos y duraciones salen
// del curso real; si el catálogo no publica precio, no se muestra monto.

import { ArrowDown, Bike, Check, Compass, HeartHandshake, ShieldCheck, Sparkles, UserCheck } from 'lucide-react';
import { duracionCurso, formatearMonto, precioCurso, precioCursoConSede } from './viaDatos';

const OPCIONES_EXPERIENCIA = [
  { id: 'cero', texto: 'Desde cero (no manejo bicicleta)', tag: 'Muy común' },
  { id: 'bici_nervios', texto: 'Sé andar en bicicleta, pero me da nervios la moto', tag: 'Paso firme' },
  { id: 'manejo_poco', texto: 'Ya manejo un poco, quiero soltarme y mejorar', tag: 'Autonomía' },
];

export default function ViaHero({
  experiencia,
  setExperiencia,
  tipoMoto,
  setTipoMoto,
  tiposBasicos = [],
  recomendacion,
  ahorroPack = null,
  sede = null,
  onIrARecomendada,
  onVerPack,
}) {
  const base = precioCurso(recomendacion?.curso);
  const precio = precioCursoConSede(recomendacion?.curso, sede);
  const recargo = base != null && precio != null ? Math.round((precio - base) * 100) / 100 : 0;
  const duracion = duracionCurso(recomendacion?.curso);
  const ahorro = formatearMonto(ahorroPack);
  const hayAuto = tiposBasicos.includes('auto');
  const haySincro = tiposBasicos.includes('sincro');

  return (
    <>
      <header
        id="ruta-inicio"
        className="relative overflow-hidden rounded-b-[28px] bg-gradient-to-b from-[#0F172A] via-[#131F3A] to-[#1E293B] text-white shadow-lg"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 right-0 h-56 w-56 rounded-full bg-[#2563EB]/20 blur-3xl"
        />

        <div className="relative mx-auto w-full max-w-3xl px-4 pb-12 pt-4 sm:px-6 sm:pt-6">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-blue-200">
            <Compass size={13} className="text-[#FF6B00]" aria-hidden="true" />
            <span>Ruta de sesiones · 1 a 1</span>
          </div>

          <h1 className="mt-3 text-3xl font-black leading-[1.06] tracking-tight text-white sm:text-5xl">
            De cero a rodar con total confianza
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
            Sesiones privadas 1 a 1, a tu ritmo y sin presiones. No necesitas saber andar en
            bicicleta ni tener moto propia.
          </p>

          <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-extrabold text-slate-100">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5">
              <UserCheck size={13} className="text-[#10B981]" aria-hidden="true" />
              1 a 1 personalizada
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5">
              <Bike size={13} className="text-blue-300" aria-hidden="true" />
              Motos livianas
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5">
              <ShieldCheck size={13} className="text-[#FF6B00]" aria-hidden="true" />
              Espacio sin tráfico
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5">
              <HeartHandshake size={13} className="text-emerald-300" aria-hidden="true" />
              Cero juicios
            </span>
          </div>
        </div>
      </header>

      <section
        aria-labelledby="diagnostico-titulo"
        className="relative z-10 mx-auto -mt-7 w-full max-w-3xl px-4 sm:px-6"
      >
        <div className="space-y-5 rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xl shadow-slate-900/5 sm:p-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#2563EB] text-white">
              <Sparkles size={17} aria-hidden="true" />
            </span>
            <div>
              <h2 id="diagnostico-titulo" className="text-base font-black leading-tight text-slate-900 sm:text-lg">
                ¿Cuál es tu punto de partida?
              </h2>
              <p className="text-xs text-slate-500">
                Elige 2 opciones y te mostramos la parada ideal para ti
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              1. ¿Cómo llegas hoy?
            </p>
            <div className="space-y-2">
              {OPCIONES_EXPERIENCIA.map((op) => {
                const activa = experiencia === op.id;
                return (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => setExperiencia(op.id)}
                    aria-pressed={activa}
                    className={`flex min-h-[48px] w-full cursor-pointer touch-manipulation items-center justify-between gap-2 rounded-2xl border-2 px-3.5 py-2.5 text-left text-xs font-bold transition-all sm:text-sm ${
                      activa
                        ? 'border-[#2563EB] bg-[#EFF6FF] text-slate-900 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                          activa ? 'border-[#2563EB] bg-[#2563EB] text-white' : 'border-slate-300 bg-white'
                        }`}
                      >
                        {activa && <Check size={12} strokeWidth={3} aria-hidden="true" />}
                      </span>
                      <span>{op.texto}</span>
                    </span>
                    <span
                      className={`hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold sm:inline-block ${
                        activa ? 'bg-[#EFF6FF] text-[#1D4ED8]' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {op.tag}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {(hayAuto || haySincro) && (
            <div className="space-y-2">
              <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                2. ¿Qué moto quieres dominar?
              </p>
              <div className={`grid gap-2 ${hayAuto && haySincro ? 'sm:grid-cols-2' : 'grid-cols-1'}`}>
                {hayAuto && (
                  <button
                    type="button"
                    onClick={() => setTipoMoto('auto')}
                    aria-pressed={tipoMoto === 'auto'}
                    className={`min-h-[48px] cursor-pointer touch-manipulation rounded-2xl border-2 px-3.5 py-2.5 text-left text-xs font-extrabold transition-all sm:text-sm ${
                      tipoMoto === 'auto'
                        ? 'border-[#2563EB] bg-[#EFF6FF] text-slate-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span className="block">Automática</span>
                    <span className="block text-[11px] font-semibold text-slate-500">
                      Más fácil para empezar
                    </span>
                  </button>
                )}

                {haySincro && (
                  <button
                    type="button"
                    onClick={() => setTipoMoto('sincro')}
                    aria-pressed={tipoMoto === 'sincro'}
                    className={`min-h-[48px] cursor-pointer touch-manipulation rounded-2xl border-2 px-3.5 py-2.5 text-left text-xs font-extrabold transition-all sm:text-sm ${
                      tipoMoto === 'sincro'
                        ? 'border-[#2563EB] bg-[#EFF6FF] text-slate-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span className="block">Sincrónica</span>
                    <span className="block text-[11px] font-semibold text-slate-500">
                      Con cambios y embrague
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}

          {recomendacion?.curso && (
            <div className="space-y-3 rounded-2xl border border-[#6EE7B7] bg-[#ECFDF5] p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-[#047857]">
                    <Sparkles size={11} aria-hidden="true" />
                    Tu mejor primera parada
                  </span>
                  <h3 className="text-sm font-black text-slate-900 sm:text-base">
                    {recomendacion.titulo}
                  </h3>
                </div>
                {precio != null && (
                  <div className="shrink-0 text-right">
                    <span
                      className="text-lg font-black tabular-nums text-[#047857]"
                      data-precio-base={base ?? undefined}
                      data-recargo={recargo}
                      data-precio-final={precio}
                    >
                      {recargo > 0 && (
                        <span className="mr-1 align-middle text-[9px] font-black uppercase tracking-wider text-emerald-700/80">
                          Desde
                        </span>
                      )}
                      ${formatearMonto(precio)}
                    </span>
                    <span className="block text-[10px] font-bold text-emerald-700/80">
                      USD{duracion ? ` · ${duracion}` : ''}
                    </span>
                  </div>
                )}
              </div>

              <p className="text-xs leading-relaxed text-slate-700">{recomendacion.mensaje}</p>

              {ahorro && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-white/80 px-3 py-2 text-[11px] font-bold text-slate-800">
                  <span>
                    O ahorra <strong className="text-[#4F46E5]">${ahorro} USD</strong> llevando el{' '}
                    <strong>Pack Ruta Completa</strong>
                  </span>
                  <button
                    type="button"
                    onClick={onVerPack}
                    className="cursor-pointer font-black text-[#4F46E5] underline underline-offset-2"
                  >
                    Ver pack
                  </button>
                </div>
              )}

              {onIrARecomendada && (
                <button
                  type="button"
                  onClick={onIrARecomendada}
                  className="flex min-h-[48px] w-full cursor-pointer touch-manipulation items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-4 py-3 text-xs font-black text-white shadow-sm transition-all hover:bg-[#1D4ED8] active:scale-[0.98] sm:text-sm"
                >
                  <span>Ir a mi parada recomendada</span>
                  <ArrowDown size={16} aria-hidden="true" />
                </button>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
