// @build: 2026-11-22 | id: FT-034-RUTA-PROGRESO | desc: Barra fija con Volver y los 3 hitos de la ruta.
//
// El hito activo se actualiza con IntersectionObserver (sin listener de scroll)
// y se expone con aria-current="step". Sin JS, el primer hito queda como actual.

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft } from 'lucide-react';

export default function RutaProgreso({ etapas = [], onVolver, mostrarEtapas = true, className = '' }) {
  const claves = useMemo(() => etapas.map((etapa) => etapa.clave).join('|'), [etapas]);
  const [activa, setActiva] = useState(() => etapas[0]?.clave || null);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.IntersectionObserver !== 'function') {
      return undefined;
    }

    const secciones = etapas
      .map((etapa) => document.getElementById(`ruta-etapa-${etapa.clave}`))
      .filter(Boolean);

    if (secciones.length === 0) return undefined;

    const inicio = document.getElementById('ruta-inicio');
    const primeraClave = etapas[0]?.clave || null;

    const observadorInicio = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((entrada) => entrada.isIntersecting)) setActiva(primeraClave);
      },
      { rootMargin: '-15% 0px -75% 0px', threshold: 0 }
    );

    if (inicio) observadorInicio.observe(inicio);

    const observador = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((entrada) => {
          if (!entrada.isIntersecting) return;
          const clave = entrada.target.getAttribute('data-etapa-clave');
          if (clave) setActiva(clave);
        });
      },
      { rootMargin: '-42% 0px -48% 0px', threshold: 0 }
    );

    secciones.forEach((seccion) => observador.observe(seccion));
    return () => {
      observador.disconnect();
      observadorInicio.disconnect();
    };
  }, [claves, etapas]);

  return (
    <nav
      aria-label={mostrarEtapas ? 'Barra de progreso de la ruta' : 'Navegación de la página'}
      className={`fixed inset-x-0 top-0 z-40 border-b border-slate-200 bg-white ${className}`}
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="mx-auto flex h-14 w-full max-w-3xl items-center gap-2 px-2 sm:px-4">
        <button
          type="button"
          onClick={onVolver}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-slate-600 transition-transform duration-150 hover:bg-slate-100 hover:text-slate-900 active:scale-[.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          aria-label="Volver"
        >
          <ChevronLeft size={24} aria-hidden="true" />
        </button>

        <ol
          aria-hidden={!mostrarEtapas}
          className="flex flex-1 items-center justify-center gap-1 sm:gap-2"
          aria-label="Etapas"
        >
          {mostrarEtapas && etapas.map((etapa) => {
            const actual = etapa.clave === activa;
            return (
              <li key={etapa.clave} className="flex items-center">
                <a
                  href={`#ruta-etapa-${etapa.clave}`}
                  aria-current={actual ? 'step' : undefined}
                  aria-label={`Ir a la etapa ${etapa.numero}: ${etapa.titulo}`}
                  className="group inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-full px-1 text-slate-500 transition-colors duration-150 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:px-2"
                >
                  <span
                    aria-hidden="true"
                    className={`block h-2.5 w-2.5 rounded-full border-2 transition-colors duration-150 ${
                      actual
                        ? 'border-blue-600 bg-blue-600'
                        : 'border-slate-400 bg-white group-hover:border-slate-600'
                    }`}
                  />
                  <span
                    className={`hidden max-w-[9rem] truncate text-xs font-semibold sm:block ${
                      actual ? 'text-slate-900' : 'text-slate-500'
                    }`}
                  >
                    {etapa.titulo}
                  </span>
                </a>
              </li>
            );
          })}
        </ol>

        <span aria-hidden="true" className="w-[44px]" />
      </div>
    </nav>
  );
}
