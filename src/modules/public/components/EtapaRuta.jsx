// @build: 2026-11-22 | id: FT-034-ETAPA-RUTA | desc: Sección semántica de una etapa de la ruta.
//
// Recibe la etapa ya derivada por rutaAprendizaje y solo la presenta.
// No decide precios, gating ni orden de negocio.

import TarjetaCursoRuta from './TarjetaCursoRuta';
import RutaIlustracion from './RutaIlustracion';

function VacioEtapa({ children }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-4 py-5 text-sm text-slate-500">
      {children}
    </div>
  );
}

export default function EtapaRuta({
  etapa,
  prerequisitoDe,
  estaBloqueado,
  onInscribirme,
  onVerDetalle,
  className = ''
}) {
  if (!etapa) return null;

  const tituloId = `ruta-etapa-${etapa.clave}-titulo`;

  const renderCurso = (curso, indice) => (
    <TarjetaCursoRuta
      key={String(curso.id ?? indice)}
      curso={curso}
      numero={indice + 1}
      prerequisitoLabel={prerequisitoDe?.(curso) || null}
      bloqueado={Boolean(estaBloqueado?.(curso))}
      onInscribirme={onInscribirme}
      onVerDetalle={onVerDetalle}
    />
  );

  return (
    <section
      id={`ruta-etapa-${etapa.clave}`}
      data-etapa-clave={etapa.clave}
      aria-labelledby={tituloId}
      className={`ruta-ancla relative lg:grid lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] lg:items-start lg:gap-8 ${className}`}
    >
      <header
        data-ruta-hito
        data-ruta-reveal
        className="lg:sticky lg:top-20"
      >
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="ruta-hito-dot inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-blue-600 bg-white text-sm font-black text-blue-700"
          >
            {etapa.numero}
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">
              Etapa {etapa.numero}
            </p>
            <h2 id={tituloId} className="mt-0.5 break-words text-2xl font-black leading-tight text-slate-900 sm:text-3xl">
              {etapa.titulo}
            </h2>
            <p className="mt-2 max-w-prose text-sm leading-relaxed text-slate-600">
              {etapa.descripcion}
            </p>
          </div>
        </div>

        <RutaIlustracion tipo={etapa.clave} className="mt-3" />
      </header>

      <div data-ruta-stagger className="mt-4 space-y-4 lg:mt-0">
        {etapa.tipo === 'bifurcacion' ? (
          etapa.carriles.map((carril) => {
            const carrilId = `ruta-etapa-${etapa.clave}-${carril.tipoCurso}`;
            return (
              <div
                key={carril.tipoCurso}
                data-ruta-reveal
                role="group"
                aria-labelledby={carrilId}
                className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 sm:p-4"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 id={carrilId} className="text-sm font-black uppercase tracking-wider text-slate-800">
                    {carril.etiqueta}
                  </h3>
                  <span className="text-xs text-slate-500">
                    {carril.cursos.length} {carril.cursos.length === 1 ? 'sesión' : 'sesiones'}
                  </span>
                </div>

                {carril.cursos.length === 0 ? (
                  <VacioEtapa>
                    Aún no hay una sesión publicada para este tipo de vehículo.
                  </VacioEtapa>
                ) : (
                  <div className="space-y-3">
                    {carril.cursos.map((curso, indice) => renderCurso(curso, indice))}
                  </div>
                )}
              </div>
            );
          })
        ) : etapa.cursos.length === 0 ? (
          <div data-ruta-reveal>
            <VacioEtapa>
              Aún no hay sesiones publicadas en esta etapa. Vuelve pronto para ver las novedades.
            </VacioEtapa>
          </div>
        ) : (
          etapa.cursos.map((curso, indice) => (
            <div key={String(curso.id ?? indice)} data-ruta-reveal>
              {renderCurso(curso, indice)}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
