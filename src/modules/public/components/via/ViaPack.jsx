// @build: 2026-11-24 | id: F-02-VIA-PACK | desc: Tarjeta premium del Pack Ruta Completa con precios reales calculados.
//
// El precio y el ahorro llegan resueltos por `resolverPrecioPackPublico`.
// No recalcula dinero ni inventa recargos por sede: si no hay total, no se muestra.

import { useMemo } from 'react';
import { ArrowRight, Package } from 'lucide-react';
import { calcularDiasPack, formatearDias } from '../../../shared/utils/duraciones';
import { duracionCurso, formatearMonto, transmisionDePack } from './viaDatos';

export default function ViaPack({
  packs = [],
  tipoMoto = 'auto',
  onChangeTipoMoto,
  onVerPack,
  errorPacks = null,
  onReintentarPacks,
}) {
  const carriles = useMemo(() => {
    const auto = packs.find((item) => transmisionDePack(item.pack) === 'auto') || null;
    const sincro = packs.find((item) => transmisionDePack(item.pack) === 'sincro') || null;
    return { auto, sincro, hayAmbos: Boolean(auto && sincro) };
  }, [packs]);

  const activo =
    (tipoMoto === 'sincro' ? carriles.sincro : carriles.auto) ||
    carriles.auto ||
    carriles.sincro ||
    packs[0] ||
    null;

  if (!activo) {
    return (
      <section id="ruta-packs" className="via-ancla mx-auto mt-10 w-full max-w-3xl px-4 sm:px-6">
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-4 py-5 text-sm text-slate-500">
          <p>
            {errorPacks ||
              'Aún no hay packs básicos de tres sesiones publicados. Puedes empezar por una sesión individual.'}
          </p>
          {errorPacks && onReintentarPacks && (
            <button
              type="button"
              onClick={onReintentarPacks}
              className="mt-3 inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border-2 border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 hover:bg-slate-50"
            >
              Reintentar
            </button>
          )}
        </div>
      </section>
    );
  }

  const { pack, precio } = activo;
  const cursos = Array.isArray(pack?.cursos) ? pack.cursos : [];
  const dias = calcularDiasPack(cursos);
  const base = Number(precio?.base);
  const final = Number(precio?.final);
  const ahorro = Number(precio?.ahorro);
  const hayPrecio = precio?.estado === 'disponible' && Number.isFinite(base) && Number.isFinite(final);

  return (
    <section
      id="ruta-packs"
      data-etapa-clave="packs"
      aria-labelledby="ruta-packs-titulo"
      className="via-ancla mx-auto mt-10 w-full max-w-3xl px-4 sm:px-6"
    >
      <div className="relative overflow-hidden rounded-3xl border border-indigo-400/40 bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#312E81] p-5 text-white shadow-xl shadow-indigo-950/25 sm:p-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-[#4F46E5]/30 blur-3xl"
        />

        <div className="relative space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-indigo-200">
              <Package size={12} className="text-[#FF6B00]" aria-hidden="true" />
              {cursos.length === 3 ? 'Ruta completa · 3 sesiones base' : `Pack de ${cursos.length} sesiones`}
            </span>
            {hayPrecio && ahorro > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#10B981] px-3 py-1 text-[11px] font-black uppercase tracking-wider text-white shadow-sm">
                Ahorras ${formatearMonto(ahorro)} USD
              </span>
            )}
          </div>

          <div>
            <h2 id="ruta-packs-titulo" className="text-2xl font-black leading-tight sm:text-3xl">
              {pack?.nombre || 'Pack Ruta Completa'}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-indigo-100/85 sm:text-sm">
              {pack?.descripcion ||
                'Avanza sin pausas desde tu primera vez hasta salir con seguridad.'}
            </p>
          </div>

          {carriles.hayAmbos && (
            <div className="grid grid-cols-2 gap-1 rounded-2xl border border-white/15 bg-white/10 p-1">
              <button
                type="button"
                onClick={() => onChangeTipoMoto?.('auto')}
                aria-pressed={tipoMoto === 'auto'}
                className={`min-h-[44px] cursor-pointer touch-manipulation rounded-xl text-xs font-extrabold transition-all ${
                  tipoMoto === 'auto' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-indigo-100 hover:bg-white/10'
                }`}
              >
                Automática
              </button>
              <button
                type="button"
                onClick={() => onChangeTipoMoto?.('sincro')}
                aria-pressed={tipoMoto === 'sincro'}
                className={`min-h-[44px] cursor-pointer touch-manipulation rounded-xl text-xs font-extrabold transition-all ${
                  tipoMoto === 'sincro' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-indigo-100 hover:bg-white/10'
                }`}
              >
                Sincrónica
              </button>
            </div>
          )}

          {cursos.length > 0 && (
            <div className="space-y-2.5 rounded-2xl border border-white/15 bg-slate-950/45 p-4">
              {cursos.map((curso, indice) => {
                const meta = ['KM 0', 'KM 1', 'KM 2'][indice] || 'SESIÓN';
                const duracion = duracionCurso(curso);
                return (
                  <div key={String(curso.id ?? indice)} className="flex items-center gap-3 text-xs sm:text-sm">
                    <span className="flex h-6 w-12 shrink-0 items-center justify-center rounded-lg bg-[#4F46E5] text-[10px] font-black text-white">
                      {meta}
                    </span>
                    <span className="min-w-0 flex-1 font-bold text-slate-100">{curso.nombre}</span>
                    {duracion && <span className="shrink-0 text-[10px] text-indigo-200">{duracion}</span>}
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex flex-col justify-between gap-4 pt-1 sm:flex-row sm:items-center">
            <div>
              {hayPrecio ? (
                <>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black tabular-nums text-white">
                      ${formatearMonto(final)}
                      <span className="ml-1 text-xs font-bold text-indigo-200">USD</span>
                    </span>
                    {base > final && (
                      <span className="text-sm font-bold tabular-nums text-slate-400 line-through">
                        ${formatearMonto(base)}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] text-indigo-200/85">
                    {dias > 0 ? `${formatearDias(dias)} de práctica · ` : ''}
                    El total por sede se confirma al elegir horario.
                  </p>
                </>
              ) : (
                <p className="text-xs text-indigo-200/85">
                  Precio del pack disponible al abrir el detalle.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => onVerPack?.(pack)}
              className="flex min-h-[50px] cursor-pointer touch-manipulation items-center justify-center gap-2 rounded-2xl bg-[#FF6B00] px-5 py-3 text-sm font-black text-white shadow-lg shadow-orange-600/30 transition-all hover:bg-[#EA580C] active:scale-[0.98] sm:min-w-[210px]"
            >
              <span>Ver pack y ahorrar</span>
              <ArrowRight size={17} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
