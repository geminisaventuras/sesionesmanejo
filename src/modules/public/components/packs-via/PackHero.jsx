// @build: 2026-11-24 | id: F-02-PACKS-HERO | desc: Hero oscuro y recomendador de pack en 2 toques con total real según sede.
import { ArrowDown, Bike, ShieldCheck, Sparkles, Target, UserCheck } from 'lucide-react';
import { formatearMonto } from '../via/viaDatos';
import { nombreVisiblePack } from './packsViaDatos';

const OPCIONES_EXPERIENCIA = [
  { id: 'cero', label: 'Desde cero (sin bicicleta)' },
  { id: 'equilibrio', label: 'Ya tengo equilibrio' },
];

export default function PackHero({
  experiencia,
  setExperiencia,
  transmision,
  setTransmision,
  transmisiones = [],
  recomendado,
  calculoIdeal,
  sedeActual,
  onIrARecomendado,
}) {
  const hayAuto = transmisiones.includes('auto');
  const haySincro = transmisiones.includes('sincro');
  const precio = calculoIdeal ? formatearMonto(calculoIdeal.final) : null;
  const ahorro = calculoIdeal ? formatearMonto(calculoIdeal.ahorro) : null;
  const noDisponible = calculoIdeal && !calculoIdeal.permitida;

  return (
    <header className="relative overflow-hidden rounded-b-[28px] bg-gradient-to-b from-[#0F172A] via-[#131F3A] to-[#1E293B] text-white shadow-lg">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-12 right-0 h-56 w-56 rounded-full bg-[#2563EB]/25 blur-3xl"
      />

      <div className="relative mx-auto w-full max-w-3xl space-y-5 px-4 pb-7 pt-5 sm:px-6 sm:pt-7">
        <div className="space-y-2.5">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-blue-200">
            <Sparkles size={12} className="text-[#FF6B00]" aria-hidden="true" />
            <span>Ahorra y avanza acompañado · 1 a 1</span>
          </div>

          <h1 className="text-3xl font-black leading-[1.06] tracking-tight text-white sm:text-5xl">
            Tu camino completo a rodar con confianza
          </h1>

          <p className="max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
            Combina tus etapas en una sola inscripción, ahorra en cada sesión y avanza sin presiones
            con motos livianas y pista libre de tráfico.
          </p>

          <div className="flex flex-wrap gap-1.5 pt-0.5 text-[11px] font-extrabold text-slate-100">
            <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2.5 py-1">
              <UserCheck size={12} className="text-[#10B981]" aria-hidden="true" />
              1 a 1 privada
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2.5 py-1">
              <Bike size={12} className="text-blue-300" aria-hidden="true" />
              Moto y casco incluidos
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2.5 py-1">
              <ShieldCheck size={12} className="text-[#FF6B00]" aria-hidden="true" />
              Cero juicios
            </span>
          </div>
        </div>

        <div className="space-y-4 rounded-3xl border border-white/15 bg-slate-950/55 p-4 backdrop-blur-md sm:p-5">
          <h2 className="flex items-center gap-1.5 text-sm font-black text-white">
            <Target size={15} className="text-[#FF6B00]" aria-hidden="true" />
            <span>Encuentra tu pack ideal en 2 toques</span>
          </h2>

          <div className="space-y-1.5">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              1. ¿Cómo empiezas hoy?
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {OPCIONES_EXPERIENCIA.map((op) => {
                const activa = experiencia === op.id;
                return (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => setExperiencia(op.id)}
                    aria-pressed={activa}
                    className={`min-h-[46px] cursor-pointer touch-manipulation rounded-xl border-2 px-3 py-2 text-xs font-extrabold transition-all ${
                      activa
                        ? 'border-[#2563EB] bg-[#2563EB] text-white shadow-sm'
                        : 'border-white/15 bg-white/5 text-slate-200 hover:bg-white/10'
                    }`}
                  >
                    {op.label}
                  </button>
                );
              })}
            </div>
          </div>

          {(hayAuto || haySincro) && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                2. ¿Qué moto prefieres?
              </p>
              <div className={`grid gap-2 ${hayAuto && haySincro ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {hayAuto && (
                  <button
                    type="button"
                    onClick={() => setTransmision('auto')}
                    aria-pressed={transmision === 'auto'}
                    className={`min-h-[46px] cursor-pointer touch-manipulation rounded-xl border-2 px-3 py-2 text-xs font-extrabold transition-all ${
                      transmision === 'auto'
                        ? 'border-[#2563EB] bg-[#2563EB] text-white shadow-sm'
                        : 'border-white/15 bg-white/5 text-slate-200 hover:bg-white/10'
                    }`}
                  >
                    Automática (más fácil)
                  </button>
                )}
                {haySincro && (
                  <button
                    type="button"
                    onClick={() => setTransmision('sincro')}
                    aria-pressed={transmision === 'sincro'}
                    className={`min-h-[46px] cursor-pointer touch-manipulation rounded-xl border-2 px-3 py-2 text-xs font-extrabold transition-all ${
                      transmision === 'sincro'
                        ? 'border-[#2563EB] bg-[#2563EB] text-white shadow-sm'
                        : 'border-white/15 bg-white/5 text-slate-200 hover:bg-white/10'
                    }`}
                  >
                    Sincrónica (con cambios)
                  </button>
                )}
              </div>
            </div>
          )}

          {recomendado && (
            <div className="via-fade-in space-y-3 rounded-2xl border border-emerald-400/35 bg-emerald-500/15 p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300">
                    ✨ Tu pack ideal recomendado
                  </span>
                  <div className="mt-0.5 break-words text-sm font-black leading-snug text-white sm:text-base">
                    {nombreVisiblePack(recomendado)}
                  </div>
                </div>
                {noDisponible ? (
                  <span className="shrink-0 text-[10px] font-bold text-amber-200">
                    No disponible en esta sede
                  </span>
                ) : precio ? (
                  <div className="shrink-0 text-right">
                    <div className="text-lg font-black tabular-nums text-white">
                      ${precio}
                      <span className="ml-0.5 text-[10px] text-emerald-200">USD</span>
                    </div>
                    {ahorro && Number(calculoIdeal?.ahorro) > 0 && (
                      <span className="text-[10px] font-black text-emerald-300">
                        Ahorras ${ahorro} USD
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="shrink-0 text-[10px] font-bold text-emerald-200">
                    Precio a confirmar
                  </span>
                )}
              </div>

              {noDisponible && (
                <p className="rounded-xl border border-amber-300/40 bg-amber-400/10 px-3 py-2 text-[11px] font-semibold text-amber-100">
                  Este pack no está habilitado en {sedeActual?.nombre || 'la sede elegida'}. Cambia de
                  sede o elige otro pack.
                </p>
              )}

              <button
                type="button"
                onClick={onIrARecomendado}
                className="flex min-h-[46px] w-full cursor-pointer touch-manipulation items-center justify-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-xs font-black text-[#0F172A] transition-all hover:bg-slate-100 active:scale-[0.98] sm:text-sm"
              >
                <span>Ir a mi pack ideal</span>
                <ArrowDown size={15} aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

