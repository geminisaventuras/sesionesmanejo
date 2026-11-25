// @build: 2026-11-25 | id: F-02-VIA-CARRETERA | desc: Carretera viva con estaciones KM 0/1/2, bifurcación auto-sincro y especializadas.
// ERR-075: la ilustración ocupa el ancho del contenido y el carril se une a
// cada estación/META con un conector discreto solo en escritorio.
//
// Composición presentacional sobre la ruta derivada por `construirRutaAprendizaje`.
// Conserva los IDs `ruta-etapa-*` y las tres ilustraciones IA de la ruta real.

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Flag } from 'lucide-react';
import RutaIlustracion from '../RutaIlustracion';
import ViaTarjetaSesion from './ViaTarjetaSesion';
import { duracionCurso, formatearMonto, KM_ETAPAS, precioCursoConSede } from './viaDatos';

const PROGRESO_POR_ETAPA = {
  equilibrio: 14,
  basicas: 50,
  practica: 84,
  packs: 100,
};

function Estacion({ clave, curso, recomendada, ancla = false, ...props }) {
  const meta = KM_ETAPAS[clave];
  if (!curso) return null;
  return (
    <div
      id={ancla ? `ruta-etapa-${clave}` : undefined}
      data-etapa-clave={ancla ? clave : undefined}
      className="via-ancla relative"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-full top-[33px] hidden h-[2px] w-4 bg-slate-300 sm:block"
      />
      <div
        aria-hidden="true"
        className="absolute -left-[50px] top-4 z-10 flex w-[38px] justify-center sm:-left-[62px] sm:w-[46px]"
      >
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-[9px] font-black shadow-sm transition-colors ${
            recomendada ? 'border-white bg-gradient-to-r from-[#2563EB] to-[#7C3AED] text-white' : 'border-slate-500 bg-[#0F172A] text-slate-200'
          }`}
        >
          {meta.km}
        </span>
      </div>

      <ViaTarjetaSesion
        curso={curso}
        kmLabel={meta.km}
        etapaNumero={meta.numero}
        recomendada={recomendada}
        {...props}
      />
    </div>
  );
}

function VacioEstacion({ children }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-4 py-5 text-sm text-slate-500">
      {children}
    </div>
  );
}

export default function ViaCarretera({
  etapas,
  extras = [],
  tiposBasicos = [],
  tipoMoto = 'auto',
  setTipoMoto,
  recomendacionClave,
  prerequisitoDe,
  estaBloqueado,
  activa = 'equilibrio',
  sede = null,
  onInscribirme,
  onVerDetalle,
  onIrAPacks,
}) {
  const [mostrarExtra, setMostrarExtra] = useState(false);
  const carrilRef = useRef(null);
  const motoRef = useRef(null);

  // ERR-074: la moto sigue el scroll con precision (sin saltos entre etapas)
  // y el trazo de la calle se mueve hacia arriba. Se actualiza por rAF y CSS,
  // sin re-render de React en cada frame.
  useEffect(() => {
    const carril = carrilRef.current;
    const moto = motoRef.current;
    if (!carril || !moto) return undefined;

    let frame = 0;
    const pintar = () => {
      frame = 0;
      const rect = carril.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const bruto = ((vh * 0.5 - rect.top) / Math.max(rect.height, 1)) * 100;
      const pct = Math.min(100, Math.max(0, bruto));
      moto.style.top = `${pct}%`;
    };
    const pedir = () => {
      if (!frame) frame = requestAnimationFrame(pintar);
    };

    pintar();
    window.addEventListener('scroll', pedir, { passive: true });
    window.addEventListener('resize', pedir);
    const observador = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(pedir) : null;
    observador?.observe(carril);

    return () => {
      window.removeEventListener('scroll', pedir);
      window.removeEventListener('resize', pedir);
      observador?.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const equilibrio = etapas?.equilibrio || [];
  const basicas = etapas?.basicas || [];
  const practica = etapas?.practica || [];
  const auto = basicas.find((curso) => curso.tipoCurso === 'basico_auto') || null;
  const sincro = basicas.find((curso) => curso.tipoCurso === 'basico_sincro') || null;
  const basicoActivo = tipoMoto === 'sincro' ? sincro || auto : auto || sincro;
  const hayAmbos = Boolean(auto && sincro);

  const progresoPct = PROGRESO_POR_ETAPA[activa] ?? 14;

  const propsTarjeta = (curso) => ({
    prerequisitoLabel: prerequisitoDe?.(curso) || null,
    bloqueado: Boolean(estaBloqueado?.(curso)),
    sede,
    onInscribirme,
    onVerDetalle,
    onIrAPacks,
  });

  return (
    <section
      id="ruta-carretera"
      aria-labelledby="ruta-carretera-titulo"
      className="mx-auto mt-7 w-full max-w-3xl px-3 sm:px-6"
    >
      <div className="mb-5 px-1">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#4F46E5]">
          La Carretera Viva
        </p>
        <h2 id="ruta-carretera-titulo" className="mt-0.5 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
          Tu ruta paso a paso
        </h2>
      </div>

      <div className="relative pl-[50px] sm:pl-[62px]">
        <div
          ref={carrilRef}
          aria-hidden="true"
          data-via-carril="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-[38px] overflow-hidden rounded-full border-x-2 border-slate-300 bg-slate-800 shadow-inner sm:w-[46px]"
        >
          <div
            className="absolute inset-x-0 top-0 bg-gradient-to-b from-[#2563EB] via-indigo-500/80 to-[#7C3AED]/90 opacity-60 transition-all duration-500 ease-out"
            style={{ height: `${progresoPct}%` }}
          />
          <div className="absolute inset-y-0 left-1/2 w-[4px] -translate-x-1/2 overflow-hidden">
            <div className="via-asfalto-dash absolute inset-0" />
          </div>

          <div
            ref={motoRef}
            data-via-moto="true"
            className="absolute left-1/2 z-20 -translate-x-1/2 -translate-y-1/2"
            style={{ top: `${progresoPct}%` }}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0F172A] shadow-md ring-2 ring-[#7C3AED]">
              <svg viewBox="0 0 28 28" className="h-5 w-5" aria-hidden="true" focusable="false">
                <g transform="rotate(180 14 14)">
                  <polygon points="12,21 16,21 21,28 7,28" fill="#FDE047" fillOpacity="0.45" />
                  <rect x="11.5" y="3" width="5" height="6" rx="2" fill="#94A3B8" />
                  <rect x="11.5" y="18" width="5" height="6" rx="2" fill="#94A3B8" />
                  <line x1="6" y1="16" x2="22" y2="16" stroke="#E2E8F0" strokeWidth="2.2" strokeLinecap="round" />
                  <rect x="10.5" y="8" width="7" height="12" rx="3" fill="#4F46E5" />
                  <circle cx="14" cy="12.5" r="3.6" fill="#FFFFFF" stroke="#7C3AED" strokeWidth="1.5" />
                </g>
              </svg>
            </div>
          </div>
        </div>

        <div className="space-y-7">
          <div className="space-y-4">
            <RutaIlustracion tipo="equilibrio" className="ruta-arte--ancho" />
            {equilibrio.length === 0 ? (
              <VacioEstacion>Aún no hay sesiones publicadas en esta etapa. Vuelve pronto.</VacioEstacion>
            ) : (
              equilibrio.map((curso, indice) => (
                <Estacion
                  key={String(curso.id)}
                  clave="equilibrio"
                  curso={curso}
                  ancla={indice === 0}
                  recomendada={recomendacionClave === 'equilibrio' && indice === 0}
                  {...propsTarjeta(curso)}
                />
              ))
            )}
          </div>

          <div id="ruta-etapa-basicas" data-etapa-clave="basicas" className="via-ancla relative space-y-4">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute right-full top-[33px] hidden h-[2px] w-4 bg-slate-300 sm:block"
            />
            <div
              aria-hidden="true"
              className="absolute -left-[50px] top-4 z-10 flex w-[38px] justify-center sm:-left-[62px] sm:w-[46px]"
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-[9px] font-black shadow-sm transition-colors ${
                  recomendacionClave === 'basicas'
                    ? 'border-white bg-gradient-to-r from-[#2563EB] to-[#7C3AED] text-white'
                    : 'border-slate-500 bg-[#0F172A] text-slate-200'
                }`}
              >
                KM 1
              </span>
            </div>

            <RutaIlustracion tipo="basicas" className="ruta-arte--ancho mb-3" />

            {hayAmbos && (
              <div className="grid grid-cols-2 gap-1 rounded-2xl border border-slate-200 bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setTipoMoto?.('auto')}
                  aria-pressed={tipoMoto === 'auto'}
                  className={`min-h-[44px] cursor-pointer touch-manipulation rounded-xl px-2 text-xs font-extrabold transition-all ${
                    tipoMoto === 'auto' ? 'bg-white text-[#4F46E5] shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Automática
                  {precioCursoConSede(auto, sede) != null && ` · $${formatearMonto(precioCursoConSede(auto, sede))}`}
                </button>
                <button
                  type="button"
                  onClick={() => setTipoMoto?.('sincro')}
                  aria-pressed={tipoMoto === 'sincro'}
                  className={`min-h-[44px] cursor-pointer touch-manipulation rounded-xl px-2 text-xs font-extrabold transition-all ${
                    tipoMoto === 'sincro' ? 'bg-white text-[#4F46E5] shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Sincrónica
                  {precioCursoConSede(sincro, sede) != null && ` · $${formatearMonto(precioCursoConSede(sincro, sede))}`}
                </button>
              </div>
            )}

            {basicoActivo ? (
              <ViaTarjetaSesion
                curso={basicoActivo}
                kmLabel="KM 1"
                etapaNumero={2}
                recomendada={recomendacionClave === 'basicas'}
                {...propsTarjeta(basicoActivo)}
              />
            ) : (
              <VacioEstacion>Aún no hay una sesión publicada para este tipo de vehículo.</VacioEstacion>
            )}

            {hayAmbos && basicoActivo && duracionCurso(basicoActivo) && (
              <p className="px-1 text-[11px] text-slate-500">
                {tipoMoto === 'sincro'
                  ? `Incluye ${duracionCurso(sincro) || 'la sesión'} con cambios y embrague.`
                  : `Incluye ${duracionCurso(auto) || 'la sesión'} en moto automática.`}
              </p>
            )}
          </div>

          <div className="space-y-4">
            <RutaIlustracion tipo="practica" className="ruta-arte--ancho" />
            {practica.length === 0 ? (
              <VacioEstacion>Aún no hay sesiones de práctica publicadas.</VacioEstacion>
            ) : (
              practica.map((curso, indice) => (
                <Estacion
                  key={String(curso.id)}
                  clave="practica"
                  curso={curso}
                  ancla={indice === 0}
                  recomendada={recomendacionClave === 'practica' && indice === 0}
                  {...propsTarjeta(curso)}
                />
              ))
            )}
          </div>

          <div className="relative pt-1">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute right-full top-1/2 hidden h-[2px] w-4 -translate-y-1/2 bg-[#6EE7B7] sm:block"
            />
            <div
              aria-hidden="true"
              className="absolute -left-[50px] top-1/2 z-10 flex w-[38px] -translate-y-1/2 justify-center sm:-left-[62px] sm:w-[46px]"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#10B981] text-white shadow-md ring-4 ring-[#F8FAFC]">
                <Flag size={15} aria-hidden="true" />
              </span>
            </div>

            <div
              data-via-meta="true"
              className="flex items-center justify-between gap-2 rounded-3xl border border-[#6EE7B7] bg-[#ECFDF5] px-4 py-3.5"
            >
              <div>
                <div className="text-[11px] font-black uppercase tracking-wider text-[#047857]">
                  META · Libertad y autonomía
                </div>
                <p className="mt-0.5 text-xs font-semibold text-slate-800">
                  Rueda con seguridad, maneja tu tiempo y gana reflejos defensivos reales.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {extras.length > 0 && (
        <section
          id="ruta-mas-sesiones"
          aria-labelledby="ruta-mas-sesiones-titulo"
          className="mt-8 w-full"
        >
          <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                  Cuando quieras ir más allá
                </p>
                <h2 id="ruta-mas-sesiones-titulo" className="text-lg font-black text-slate-900">
                  Otras sesiones especializadas
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setMostrarExtra((valor) => !valor)}
                aria-expanded={mostrarExtra}
                aria-controls="ruta-sesiones-extra"
                className="inline-flex min-h-[48px] cursor-pointer touch-manipulation items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-extrabold text-slate-800 hover:bg-slate-100"
              >
                {mostrarExtra ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
                <span>
                  {mostrarExtra ? 'Ocultar especializadas' : `Ver clínicas adicionales (${extras.length})`}
                </span>
              </button>
            </div>

            {mostrarExtra && (
              <div id="ruta-sesiones-extra" className="via-fade-in mt-4 space-y-4">
                {extras.map((curso) => (
                  <ViaTarjetaSesion
                    key={String(curso.id)}
                    curso={curso}
                    kmLabel="CLÍNICA"
                    {...propsTarjeta(curso)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </section>
  );
}
