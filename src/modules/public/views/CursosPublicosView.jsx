// @build: 2026-11-22 | id: FT-034-CURSOS-PUBLICOS | desc: Ruta pública "La Vía" mobile-first con estados de error y vacío neutro.
import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, doc, onSnapshot, getDoc, query, where } from 'firebase/firestore';
import { db } from '../../../firebase';
import { CURSO_SECUENCIA } from '../../../constants/cursoSecuencia';
import { AlertCircle, ChevronDown, Clock, Mail, MapPin, Phone } from 'lucide-react';
import ModalCursoDetalle from '../components/ModalCursoDetalle';
import LegalFooter from '../../shared/components/LegalFooter';
import RutaAprendizaje from '../components/RutaAprendizaje';
import RutaProgreso from '../components/RutaProgreso';
import { ETAPAS_RUTA } from '../utils/rutaAprendizaje';
import { PACKS_SOURCE } from '../utils/packsSource';
import { nombreSedeCanonico } from '../../shared/utils/sedesHelpers';
import { crearFlowId } from '../../inscripcion/hooks/useInscripcionState';
import { AppContext } from '../../../context/AppContextValue';

const APP_ID = 'motoescuela-pro-v1';

const capitalizar = (texto) => {
  const valor = String(texto || '').trim();
  return valor ? valor.charAt(0).toUpperCase() + valor.slice(1) : '';
};

const nombreSedePublica = (sede) => {
  const canonico = nombreSedeCanonico(sede);
  if (canonico !== '—') return canonico;
  return capitalizar(sede?.id) || 'Sede';
};

const getPrerequisitoLabel = (tipoCurso, curso = null, cursos = []) => {
  // A2.2: preferir curso.prerequisitos (editable), fallback al hardcode
  const prereqs = Array.isArray(curso?.prerequisitos)
    ? curso.prerequisitos
    : (CURSO_SECUENCIA[tipoCurso]?.prerequisito || []);

  if (!Array.isArray(prereqs) || prereqs.length === 0) return null;

  const labels = {
    basico_auto: 'Sesión Básica Automática',
    basico_sincro: 'Sesión Básica Sincrónica',
    general: 'Refuerzo Práctico'
  };

  // Preferir nombre real del curso si está en la lista; fallback al label hardcodeado
  return prereqs.map(p => {
    const c = (cursos || []).find(x => x.tipoCurso === p);
    return c?.nombre || labels[p] || p;
  }).join(' o ');
};

function CargandoRuta() {
  return (
    <main id="ruta-contenido" tabIndex={-1} className="mx-auto w-full max-w-3xl px-4 pb-12 ruta-offset-top sm:px-6">
      <h1 className="sr-only">Cargando ruta de aprendizaje</h1>
      <div className="ruta-skeleton h-8 w-40" />
      <div className="ruta-skeleton mt-3 h-12 w-11/12" />
      <div className="ruta-skeleton mt-3 h-5 w-full" />
      <div className="ruta-skeleton mt-2 h-5 w-4/5" />
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <div className="ruta-skeleton h-12 w-full" />
        <div className="ruta-skeleton h-12 w-full" />
      </div>
      <div className="mt-8 space-y-4">
        <div className="ruta-skeleton h-64 w-full" />
        <div className="ruta-skeleton h-64 w-full" />
        <div className="ruta-skeleton h-64 w-full" />
      </div>
    </main>
  );
}

function ErrorRuta({ mensaje, onReintentar }) {
  return (
    <main id="ruta-contenido" tabIndex={-1} className="mx-auto w-full max-w-3xl px-4 pb-12 ruta-offset-top sm:px-6">
      <div role="alert" className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <AlertCircle size={22} aria-hidden="true" className="mt-0.5 shrink-0 text-red-600" />
          <div>
            <h1 className="text-2xl font-black text-slate-900">No pudimos cargar tu ruta</h1>
            <p className="mt-1 break-words text-sm text-slate-600">{mensaje}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onReintentar}
          className="mt-4 inline-flex min-h-[48px] items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition-transform duration-150 hover:bg-blue-700 active:scale-[.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          Reintentar
        </button>
      </div>
    </main>
  );
}

export default function CursosPublicosView() {
  const navigate = useNavigate();
  const ctx = useContext(AppContext);
  const [cursos, setCursos] = useState([]);
  const [packs, setPacks] = useState([]);
  const [contacto, setContacto] = useState(null);
  const [sedes, setSedes] = useState(null);
  const [cursoDetalle, setCursoDetalle] = useState(null);
  const [avisoBasico, setAvisoBasico] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorCursos, setErrorCursos] = useState(null);
  const [errorPacks, setErrorPacks] = useState(null);
  const [reintento, setReintento] = useState(0);

  useEffect(() => {
    const cursosRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'cursos');
    const q = query(cursosRef, where('activo', '==', true));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const activos = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => {
            const ordenA = CURSO_SECUENCIA[a.tipoCurso]?.orden || 99;
            const ordenB = CURSO_SECUENCIA[b.tipoCurso]?.orden || 99;
            return ordenA - ordenB;
          });
        setCursos(activos);
        setErrorCursos(null);
        setLoading(false);
      },
      (error) => {
        console.error('[CursosPublicosView] Error cargando cursos:', error);
        setErrorCursos('Revisa tu conexión e inténtalo de nuevo. No se muestran datos parciales.');
        setLoading(false);
      }
    );

    return () => unsub();
  }, [reintento]);

  useEffect(() => {
    // T-060: fuente configurable (default `packs`; staging puede usar `packsPublicos`).
    const packsRef = collection(db, 'artifacts', APP_ID, 'public', 'data', PACKS_SOURCE);
    const q = query(packsRef, where('activo', '==', true));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setPacks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setErrorPacks(null);
      },
      (error) => {
        console.error('[CursosPublicosView] Error cargando packs:', error);
        setErrorPacks('No pudimos cargar los packs en este momento.');
      }
    );

    return () => unsub();
  }, [reintento]);

  useEffect(() => {
    let activo = true;
    async function cargarContacto() {
      try {
        const contactoSnap = await getDoc(doc(db, 'informacionPublica', 'contacto'));
        if (activo && contactoSnap.exists()) setContacto(contactoSnap.data());
      } catch (error) {
        console.warn('[CursosPublicosView] Error leyendo contacto:', error);
      }
    }

    cargarContacto();
    return () => { activo = false; };
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'informacionPublica', 'sedes'),
      (docSnap) => {
        if (docSnap.exists()) {
          setSedes(docSnap.data());
        } else {
          console.warn('[CursosPublicosView] Documento sedes no encontrado');
          setSedes({});
        }
      },
      (error) => {
        console.error('[CursosPublicosView] Error leyendo sedes:', error);
        setSedes({});
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!avisoBasico) return undefined;
    const cerrarConEsc = (evento) => {
      if (evento.key === 'Escape') setAvisoBasico(null);
    };
    window.addEventListener('keydown', cerrarConEsc);
    return () => window.removeEventListener('keydown', cerrarConEsc);
  }, [avisoBasico]);

  const handleInscribirme = (cursoId) => {
    if (cursoId == null) return;
    const curso = (cursos || []).find(c => String(c.id) === String(cursoId));
    const esBasico = curso?.tipoCurso === 'basico_auto' || curso?.tipoCurso === 'basico_sincro';
    const tienePrereq = Array.isArray(curso?.prerequisitos) && curso.prerequisitos.length > 0;

    // A2.2-bis: aviso para básicos con prereq de Equilibrio
    if (esBasico && tienePrereq) {
      setAvisoBasico(curso);
      return;
    }

    navigate('/inscripcion', {
      state: {
        cursoId,
        origen: 'publico',
        cursoSugerido: true,
        entryToken: crearFlowId()
      }
    });
  };

  const confirmarAvisoBasico = (hacerEquilibrio) => {
    if (hacerEquilibrio) {
      // Buscar Equilibrio y navegar a su inscripción
      const equilibrio = (cursos || []).find(c => c.tipoCurso === 'equilibrio');
      if (equilibrio) {
        setAvisoBasico(null);
        navigate('/inscripcion', {
          state: {
            cursoId: equilibrio.id,
            origen: 'publico',
            cursoSugerido: true,
            entryToken: crearFlowId()
          }
        });
      } else {
        setAvisoBasico(null);
      }
    } else {
      // Continuar con el básico elegido
      const cursoId = avisoBasico?.id;
      setAvisoBasico(null);
      if (cursoId) {
        navigate('/inscripcion', {
          state: {
            cursoId,
            origen: 'publico',
            cursoSugerido: true,
            entryToken: crearFlowId()
          }
        });
      }
    }
  };

  const reintentar = () => {
    setErrorCursos(null);
    setErrorPacks(null);
    setLoading(true);
    setReintento(n => n + 1);
  };

  const prerequisitoDe = (curso) => getPrerequisitoLabel(curso?.tipoCurso, curso, cursos);
  const estaBloqueado = (curso) => {
    const tienePrereq = Array.isArray(curso?.prerequisitos) && curso.prerequisitos.length > 0;
    const esBasico = curso?.tipoCurso === 'basico_auto' || curso?.tipoCurso === 'basico_sincro';
    return tienePrereq && !esBasico;
  };

  const skipLink = (
    <a
      href="#ruta-contenido"
      className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:text-sm focus:font-bold focus:text-blue-700 focus:shadow-lg"
    >
      Saltar a la ruta
    </a>
  );

  if (errorCursos) {
    return (
      <div className="min-h-screen bg-slate-50">
        {skipLink}
        <RutaProgreso etapas={ETAPAS_RUTA} onVolver={() => navigate('/')} mostrarEtapas={false} />
        <ErrorRuta mensaje={errorCursos} onReintentar={reintentar} />
        <LegalFooter />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        {skipLink}
        <RutaProgreso etapas={ETAPAS_RUTA} onVolver={() => navigate('/')} mostrarEtapas={false} />
        <CargandoRuta />
        <LegalFooter />
      </div>
    );
  }

  // Sedes públicas: no asumir claves "caracas"/"guarenas". Se itera el objeto,
  // se usa el nombre canónico cuando existe y se agrupan horarios idénticos.
  const sedesLista = Object.entries(sedes || {})
    .map(([clave, valor]) => {
      if (!valor || typeof valor !== 'object') return null;
      return { ...valor, id: valor.id == null ? clave : valor.id };
    })
    .filter(Boolean);

  const gruposHorario = [];
  const indiceHorario = new Map();
  for (const sede of sedesLista) {
    const horario = String(sede.horario || '').trim();
    if (!horario) continue;
    if (!indiceHorario.has(horario)) {
      const grupo = { horario, sedes: [] };
      indiceHorario.set(horario, grupo);
      gruposHorario.push(grupo);
    }
    indiceHorario.get(horario).sedes.push(sede);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {skipLink}

      <RutaProgreso etapas={ETAPAS_RUTA} onVolver={() => navigate('/')} />

      <main id="ruta-contenido" tabIndex={-1} className="ruta-offset-top">
        <RutaAprendizaje
          cursos={cursos}
          packs={packs}
          sedes={ctx.sedes || []}
          anonimo={!ctx.fbUser}
          cursosTeoricos={ctx.fbUser ? (ctx.cursosTeoricos || []) : []}
          prerequisitoDe={prerequisitoDe}
          estaBloqueado={estaBloqueado}
          onInscribirme={handleInscribirme}
          onVerDetalle={setCursoDetalle}
          onVerPack={() => navigate('/packs')}
          packsError={errorPacks}
          onReintentarPacks={reintentar}
        />
      </main>

      <section aria-labelledby="sedes-titulo" className="mx-auto w-full max-w-3xl px-4 pb-8 pt-2 sm:px-6">
        <h2 id="sedes-titulo" className="text-2xl font-black text-slate-900">Sedes y horarios</h2>
        <details className="mt-3 rounded-2xl border border-slate-200 bg-white">
          <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-bold text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
            <span className="inline-flex items-center gap-2">
              <MapPin size={17} aria-hidden="true" className="text-blue-600" />
              Ver ubicaciones y horarios
            </span>
            <ChevronDown size={18} aria-hidden="true" className="shrink-0 text-slate-500" />
          </summary>
          <div className="border-t border-slate-100 px-4 py-4">
            {sedes ? (
              sedesLista.length > 0 ? (
                <div className="space-y-4">
                  {gruposHorario.length > 0 && (
                    <div className="space-y-2 text-sm text-slate-600">
                      {gruposHorario.map((grupo) => (
                        grupo.sedes.length > 1 ? (
                          <p key={grupo.horario} className="flex items-start gap-2 font-bold">
                            <Clock size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-slate-500" />
                            <span>{grupo.horario}</span>
                          </p>
                        ) : (
                          <p key={grupo.horario} className="flex items-start gap-2">
                            <Clock size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-slate-500" />
                            <span>
                              <strong>{nombreSedePublica(grupo.sedes[0])}:</strong> {grupo.horario}
                            </span>
                          </p>
                        )
                      ))}
                    </div>
                  )}

                  <div className="space-y-3 border-t border-slate-100 pt-4 text-sm text-slate-700">
                    {sedesLista.map((sede) => (
                      <p key={sede.id} className="flex items-start gap-2">
                        <MapPin size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-blue-600" />
                        <span className="break-words">
                          <strong>{nombreSedePublica(sede)}:</strong>{' '}
                          {sede.direccion}
                          {sede.puntoReferencia && ` (${sede.puntoReferencia})`}
                        </span>
                      </p>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">Información de sedes no disponible.</p>
              )
            ) : (
              <p className="text-sm text-slate-500">Cargando información de sedes...</p>
            )}
          </div>
        </details>
      </section>

      {contacto && (
        <section aria-labelledby="contacto-titulo" className="mx-auto w-full max-w-3xl px-4 pb-10 sm:px-6">
          <h2 id="contacto-titulo" className="text-2xl font-black text-slate-900">¿Tienes dudas?</h2>
          <details className="mt-3 rounded-2xl border border-slate-200 bg-white">
            <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-bold text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
              <span className="inline-flex items-center gap-2">
                <Phone size={17} aria-hidden="true" className="text-blue-600" />
                Ver teléfono, WhatsApp y correo
              </span>
              <ChevronDown size={18} aria-hidden="true" className="shrink-0 text-slate-500" />
            </summary>
            <div className="grid grid-cols-1 gap-3 border-t border-slate-100 p-4 sm:grid-cols-3">
              <a
                href={`tel:${contacto.telefono}`}
                className="flex min-h-[44px] items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-800 transition-transform duration-150 hover:bg-slate-100 active:scale-[.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                <Phone size={18} aria-hidden="true" className="shrink-0 text-blue-600" />
                <span className="break-words">
                  <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">Teléfono</span>
                  {contacto.telefono}
                </span>
              </a>

              <a
                href={`https://wa.me/${String(contacto.whatsapp).replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-[44px] items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-800 transition-transform duration-150 hover:bg-slate-100 active:scale-[.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                <Phone size={18} aria-hidden="true" className="shrink-0 text-emerald-600" />
                <span className="break-words">
                  <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">WhatsApp</span>
                  {contacto.whatsapp}
                </span>
              </a>

              <a
                href={`mailto:${contacto.email}`}
                className="flex min-h-[44px] items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-800 transition-transform duration-150 hover:bg-slate-100 active:scale-[.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                <Mail size={18} aria-hidden="true" className="shrink-0 text-orange-600" />
                <span className="break-words">
                  <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">Correo</span>
                  {contacto.email}
                </span>
              </a>
            </div>
          </details>
        </section>
      )}

      {cursoDetalle && (
        <ModalCursoDetalle
          curso={cursoDetalle}
          prerequisitoLabel={getPrerequisitoLabel(cursoDetalle.tipoCurso, cursoDetalle, cursos)}
          onClose={() => setCursoDetalle(null)}
          onInscribirme={(cursoId) => {
            setCursoDetalle(null);
            handleInscribirme(cursoId);
          }}
        />
      )}

      {/* A2.2-bis: Aviso para básicos con prereq de Equilibrio */}
      {avisoBasico && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setAvisoBasico(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="aviso-basico-titulo"
            aria-describedby="aviso-basico-descripcion"
            className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-6 w-6 shrink-0 text-orange-500" aria-hidden="true" />
              <div>
                <h2 id="aviso-basico-titulo" className="mb-2 text-lg font-bold text-slate-900">
                  Aviso importante
                </h2>
                <p id="aviso-basico-descripcion" className="mb-3 text-sm text-slate-700">
                  Esta sesión (<strong>{avisoBasico.nombre}</strong>) recomienda haber completado la sesión de <strong>Equilibrio</strong> primero.
                </p>
                <p className="mb-2 text-sm text-slate-700">
                  Si ya sabes andar en bicicleta o has manejado moto y tienes equilibrio, puedes continuar.
                </p>
                <p className="rounded-lg border border-orange-200 bg-orange-50 p-2 text-xs text-orange-700">
                  Si te estás saltando la sesión de Equilibrio adrede, va a ser perjudicial para ti porque no dominarás el equilibrio y el avance de la sesión será muy lento.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => confirmarAvisoBasico(true)}
                className="min-h-[48px] w-full rounded-lg bg-blue-600 py-3 font-medium text-white transition-colors hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Hacer Equilibrio primero
              </button>
              <button
                type="button"
                onClick={() => confirmarAvisoBasico(false)}
                className="min-h-[48px] w-full rounded-lg border-2 border-slate-200 py-3 font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Ya sé andar, continuar
              </button>
            </div>
          </div>
        </div>
      )}

      <LegalFooter />
    </div>
  );
}

