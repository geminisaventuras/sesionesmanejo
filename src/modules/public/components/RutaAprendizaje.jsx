// @build: 2026-11-22 | id: FT-034-RUTA-APRENDIZAJE | desc: Composición mobile-first de "La Vía" con etapas y packs.
//
// Presentacional: recibe catálogo, packs y handlers. No consulta Firestore,
// no calcula precios y no decide el gating. El H1 vive solo en el hero.

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowRight, ChevronDown, ChevronUp, Package, Sparkles } from 'lucide-react';
import { construirRutaAprendizaje } from '../utils/rutaAprendizaje';
import { resolverPrecioPackPublico } from '../utils/precioPackPublico';
import { recargosSedeDePack } from '../../inscripcion/utils/packPublico';
import EtapaRuta from './EtapaRuta';
import TarjetaCursoRuta from './TarjetaCursoRuta';
import TarjetaPackRuta from './TarjetaPackRuta';

export default function RutaAprendizaje({
  cursos = [],
  packs = [],
  sedes = [],
  mostrarPacks = true,
  anonimo = true,
  cursosTeoricos = [],
  prerequisitoDe,
  estaBloqueado,
  onInscribirme,
  onVerDetalle,
  onVerPack,
  packsError = null,
  onReintentarPacks,
  className = ''
}) {
  const packsConRecargos = useMemo(
    () => (Array.isArray(packs) ? packs : []).map((pack) =>
      Array.isArray(pack?.recargosSede)
        ? pack
        : { ...pack, recargosSede: recargosSedeDePack(pack, sedes) }
    ),
    [packs, sedes]
  );
  const ruta = useMemo(() => construirRutaAprendizaje(cursos, packsConRecargos), [cursos, packsConRecargos]);
  const preciosTeoricos = useMemo(() => {
    const mapa = new Map();
    (cursosTeoricos || []).forEach((curso) => {
      const precio = Number(curso?.precio);
      if (Number.isFinite(precio)) mapa.set(String(curso.id), precio);
    });
    return mapa;
  }, [cursosTeoricos]);
  const preciosPacks = useMemo(() => {
    const mapa = new Map();
    ruta.packs.forEach((pack) => {
      mapa.set(String(pack.id), resolverPrecioPackPublico({ pack, cursos, preciosTeoricos }));
    });
    return mapa;
  }, [ruta.packs, cursos, preciosTeoricos]);
  const [mostrarExtra, setMostrarExtra] = useState(false);
  const packsBasicos = ruta.packs.filter((pack) => pack.cursos.length === 3 && pack.cubreRutaCompleta);
  const primeraEtapa = ruta.etapas[0];
  const primeraEtapaClave = primeraEtapa?.clave || 'equilibrio';
  const primeraEtapaTitulo = primeraEtapa?.titulo || 'el inicio';

  return (
    <div className={`relative ${className}`}>
      <header id="ruta-inicio" className="mx-auto w-full max-w-3xl px-4 pb-6 pt-2 sm:px-6">
        <p className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">
          <Sparkles size={13} aria-hidden="true" />
          Ruta de sesiones
        </p>
        <h1 className="mt-3 break-words text-4xl font-black leading-[1.05] tracking-tight text-slate-900 sm:text-5xl">
          Ruta de sesiones
        </h1>
        <p className="mt-3 max-w-prose text-base leading-relaxed text-slate-600 sm:text-lg">
          Las tres etapas base para pasar de nunca haber tocado una moto a rodar con seguridad.
          Empieza por el equilibrio y avanza a tu ritmo.
        </p>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <a
            href={`#ruta-etapa-${primeraEtapaClave}`}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition-transform duration-150 hover:bg-blue-700 active:scale-[.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Empezar por {primeraEtapaTitulo}
            <ArrowDown size={17} aria-hidden="true" />
          </a>
          <a
            href="#ruta-packs"
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-800 transition-transform duration-150 hover:bg-slate-50 active:scale-[.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <Package size={17} aria-hidden="true" />
            Ver packs
          </a>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          Sin registro para explorar. Elige una etapa y te acompañamos en la inscripción.
        </p>
      </header>

      <div className="relative mx-auto w-full max-w-3xl px-4 sm:px-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-[2.25rem] w-px bg-gradient-to-b from-blue-200 via-slate-300 to-transparent sm:left-[2.75rem] lg:hidden"
        >
          <div
            data-ruta-linea
            className="ruta-linea h-full w-full origin-top bg-gradient-to-b from-blue-600 via-blue-400 to-emerald-400"
          />
        </div>

        <div className="relative z-10 space-y-10 pb-4 sm:space-y-12">
          {ruta.etapas.map((etapa) => (
            <EtapaRuta
              key={etapa.clave}
              etapa={etapa}
              prerequisitoDe={prerequisitoDe}
              estaBloqueado={estaBloqueado}
              onInscribirme={onInscribirme}
              onVerDetalle={onVerDetalle}
            />
          ))}
        </div>
      </div>

      {ruta.cursosExtra.length > 0 && (
        <section
          id="ruta-mas-sesiones"
          aria-labelledby="ruta-mas-sesiones-titulo"
          className="mx-auto mt-8 w-full max-w-3xl px-4 sm:px-6"
        >
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
              Más sesiones
            </p>
            <h2
              id="ruta-mas-sesiones-titulo"
              className="mt-1 text-2xl font-black leading-tight text-slate-900"
            >
              Ver todas las sesiones
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Sesiones adicionales como equilibrio avanzado y otras opciones que se publiquen.
            </p>
            <button
              type="button"
              onClick={() => setMostrarExtra((valor) => !valor)}
              aria-expanded={mostrarExtra}
              aria-controls="ruta-sesiones-extra"
              className="mt-3 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:w-auto"
            >
              {mostrarExtra ? <ChevronUp size={17} aria-hidden="true" /> : <ChevronDown size={17} aria-hidden="true" />}
              {mostrarExtra ? 'Ocultar sesiones adicionales' : `Ver todas las sesiones (${ruta.cursosExtra.length})`}
            </button>
            {mostrarExtra && (
              <div id="ruta-sesiones-extra" className="mt-4 space-y-4">
                {ruta.cursosExtra.map((curso, indice) => (
                  <TarjetaCursoRuta
                    key={String(curso.id ?? indice)}
                    curso={curso}
                    numero={indice + 1}
                    prerequisitoLabel={prerequisitoDe?.(curso) || null}
                    bloqueado={Boolean(estaBloqueado?.(curso))}
                    onInscribirme={onInscribirme}
                    onVerDetalle={onVerDetalle}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {mostrarPacks && (
        <section
          id="ruta-packs"
          aria-labelledby="ruta-packs-titulo"
          className="ruta-ancla mx-auto mt-8 w-full max-w-3xl px-4 pb-4 sm:px-6"
        >
          <div data-ruta-reveal>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-indigo-700">
              Ahorra y sigue la ruta completa
            </p>
            <h2
              id="ruta-packs-titulo"
              className="mt-1 break-words text-2xl font-black leading-tight text-slate-900 sm:text-3xl"
            >
              Packs básicos
            </h2>
            <p className="mt-2 max-w-prose text-sm leading-relaxed text-slate-600">Solo mostramos packs básicos con las tres sesiones base. El precio y las condiciones se muestran en la página de packs.</p>
          </div>

          {packsError && packsBasicos.length > 0 && (
            <div
              role="alert"
              className="mt-4 flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="text-sm font-semibold text-red-800">{packsError}</p>
              {onReintentarPacks && (
                <button
                  type="button"
                  onClick={onReintentarPacks}
                  className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-xl border-2 border-red-300 bg-white px-4 py-2 text-sm font-bold text-red-800 transition-transform duration-150 hover:bg-red-100 active:scale-[.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                >
                  Reintentar
                </button>
              )}
            </div>
          )}

          <div data-ruta-stagger className="mt-4 space-y-4">
            {packsBasicos.length === 0 ? (
              <div data-ruta-reveal>
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-4 py-5 text-sm text-slate-500">
                  <p>
                    {packsError || 'Aún no hay packs básicos de tres sesiones publicados. Puedes empezar por una sesión individual.'}
                  </p>
                  {packsError && onReintentarPacks && (
                    <button
                      type="button"
                      onClick={onReintentarPacks}
                      className="mt-3 inline-flex min-h-[44px] items-center justify-center rounded-xl border-2 border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 transition-transform duration-150 hover:bg-slate-50 active:scale-[.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                    >
                      Reintentar
                    </button>
                  )}
                </div>
              </div>
            ) : (
              packsBasicos.map((pack) => (
                <div key={String(pack.id)} data-ruta-reveal>
                  <TarjetaPackRuta
                    pack={pack}
                    precio={preciosPacks.get(String(pack.id))}
                    anonimo={anonimo}
                    cursosTeoricos={cursosTeoricos}
                    ctaLabel="Ver pack"
                    onComprar={() => onVerPack?.(pack)}
                  />
                </div>
              ))
            )}
          </div>

          <Link
            to="/packs"
            className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl px-2 text-sm font-bold text-indigo-700 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Ver todos los packs
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </section>
      )}
    </div>
  );
}
