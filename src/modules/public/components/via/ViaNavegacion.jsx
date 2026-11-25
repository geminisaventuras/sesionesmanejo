// @build: 2026-11-24 | id: F-02-VIA-NAVEGACION | desc: Barra fija oscura "Moto App · La Vía" con pista de progreso y sede activa.
//
// Presentacional: recibe la etapa activa y el hito de packs. No consulta datos
// ni decide gating. El desplazamiento lo resuelve la vista con `onSaltar`.

import { ChevronLeft, MapPin } from 'lucide-react';
import { ETAPAS_NAV } from './viaDatos';

function MotoSilueta() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="none" aria-hidden="true" focusable="false">
      <circle cx="12.5" cy="6.2" r="2.3" fill="currentColor" />
      <path d="M13.2 5.6h1.6v1.1h-1.6z" fill="#0F172A" />
      <circle cx="6.2" cy="17.5" r="2.6" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.8" cy="17.5" r="2.6" stroke="currentColor" strokeWidth="2" />
      <path
        d="M6.2 17.5L10 12.2h4.2l3.6 5.3M11.5 9.2l2.3 2.5h2.4"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ViaNavegacion({
  activa = 'equilibrio',
  enPacks = false,
  sedeActual = null,
  onVolver,
  onCambiarSede,
  onSaltar,
  mostrarEtapas = true,
}) {
  const claveActual = enPacks ? 'packs' : activa || ETAPAS_NAV[0].clave;
  const indiceActivo = Math.max(
    0,
    ETAPAS_NAV.findIndex((hito) => hito.clave === claveActual)
  );
  const progresoPct = ETAPAS_NAV.length > 1 ? (indiceActivo / (ETAPAS_NAV.length - 1)) * 100 : 0;
  const etiquetaSede = sedeActual?.nombreCorto || sedeActual?.nombre || sedeActual?.ciudad || null;

  return (
    <nav
      aria-label={mostrarEtapas ? 'Progreso en La Vía' : 'Navegación principal'}
      className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-[#0F172A]/95 text-white backdrop-blur-md"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="mx-auto w-full max-w-3xl px-3 pb-2 pt-2 sm:px-5">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onVolver}
            aria-label="Volver al inicio"
            className="inline-flex h-11 w-11 shrink-0 cursor-pointer touch-manipulation items-center justify-center rounded-full bg-white/10 text-white transition-all hover:bg-white/20 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
          >
            <ChevronLeft size={20} aria-hidden="true" />
          </button>

          <div className="min-w-0 flex-1 text-center">
            <span className="block truncate text-sm font-black tracking-tight text-white">
              Moto App · La Vía
            </span>
          </div>

          {etiquetaSede ? (
            <button
              type="button"
              onClick={onCambiarSede}
              aria-label={`Sede activa: ${etiquetaSede}. Toca para cambiarla`}
              className="inline-flex min-h-[44px] shrink-0 cursor-pointer touch-manipulation items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 text-[11px] font-extrabold text-slate-100 transition-all hover:bg-white/20 active:scale-95"
            >
              <MapPin size={13} className="shrink-0 text-[#FF6B00]" aria-hidden="true" />
              <span className="max-w-[7.5rem] truncate">{etiquetaSede}</span>
            </button>
          ) : (
            <span className="h-11 w-11 shrink-0" aria-hidden="true" />
          )}
        </div>

        {mostrarEtapas && (
          <div className="mt-2.5 px-2">
            <div className="relative mx-5 h-1.5 rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#2563EB] via-sky-400 to-[#FF6B00] transition-all duration-300 ease-out"
                style={{ width: `${progresoPct}%` }}
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-3.5 -translate-x-1/2 transition-all duration-300 ease-out"
                style={{ left: `${progresoPct}%` }}
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#2563EB] shadow-lg ring-2 ring-[#0F172A]">
                  <MotoSilueta />
                </div>
              </div>
            </div>

            <ol className="mt-2 grid grid-cols-4 gap-1 text-center" aria-label="Etapas de la ruta">
              {ETAPAS_NAV.map((hito, indice) => {
                const actual = indice === indiceActivo;
                const superado = indice < indiceActivo;
                return (
                  <li key={hito.clave}>
                    <button
                      type="button"
                      onClick={() => onSaltar?.(hito.clave)}
                      aria-current={actual ? 'step' : undefined}
                      className={`w-full cursor-pointer touch-manipulation rounded-lg py-0.5 text-[10px] font-extrabold transition-colors ${
                        actual
                          ? 'text-white'
                          : superado
                            ? 'text-emerald-400 hover:text-emerald-300'
                            : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className="block truncate">
                        {hito.corto} <span className="hidden sm:inline">· {hito.titulo}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </div>
    </nav>
  );
}
