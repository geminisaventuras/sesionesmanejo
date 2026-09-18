import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, doc, onSnapshot, getDoc, query, where } from 'firebase/firestore';import { db } from '../../../firebase';
import { CURSO_SECUENCIA } from '../../../constants/cursoSecuencia';
import { AlertCircle, Clock, MapPin, Phone, CheckCircle, GraduationCap, ChevronLeft } from 'lucide-react';
import ModalCursoDetalle from '../components/ModalCursoDetalle';
import TextoEnriquecido from '../../shared/components/TextoEnriquecido';
const APP_ID = 'motoescuela-pro-v1';


const formatearDuracion = (minutos) => {
  if (!minutos && minutos !== 0) return 'N/A';
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;
  if (horas === 0) return `${mins} min`;
  if (mins === 0) return `${horas} ${horas === 1 ? 'hora' : 'horas'}`;
  return `${horas}h ${mins} min`;
};
const getPrerequisitoLabel = (tipoCurso, curso = null, cursos = []) => {
  // A2.2: preferir curso.prerequisitos (editable), fallback al hardcode
  const prereqs = Array.isArray(curso?.prerequisitos)
    ? curso.prerequisitos
    : (CURSO_SECUENCIA[tipoCurso]?.prerequisito || []);

  if (!Array.isArray(prereqs) || prereqs.length === 0) return null;

  const labels = {
    basico_auto: 'Curso Básico Automática',
    basico_sincro: 'Curso Básico Sincrónica',
    general: 'Práctica en la Vía'
  };

  // Preferir nombre real del curso si está en la lista; fallback al label hardcodeado
  return prereqs.map(p => {
    const c = (cursos || []).find(x => x.tipoCurso === p);
    return c?.nombre || labels[p] || p;
  }).join(' o ');
};

function AvisoMoto({ curso }) {
  const motoIncluida = curso?.motoIncluida;
  const tiposMoto = curso?.tiposMotoEscuela || [];
  const precioAlquiler = curso?.precioAlquilerMoto || 0;

  if (motoIncluida === false) {
    return (
      <div className="inline-flex items-center gap-1 bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm">
        <AlertCircle className="w-4 h-4" />
        <span>Debes traer tu propia moto</span>
      </div>
    );
  }

  if (motoIncluida === true) {
    const tiposLabel = tiposMoto.length > 0 ? ` (${tiposMoto.join(' o ')})` : '';
    return (
      <div className="inline-flex items-center gap-1 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
        <CheckCircle className="w-4 h-4" />
        <span>La escuela pone moto{tiposLabel}</span>
        {precioAlquiler > 0 && <span className="ml-1 font-bold">+${precioAlquiler}</span>}
      </div>
    );
  }

  return null;
}

export default function CursosPublicosView() {
  const navigate = useNavigate();
  const [cursos, setCursos] = useState([]);
  const [contacto, setContacto] = useState(null);
  const [sedes, setSedes] = useState(null);
    const [cursoDetalle, setCursoDetalle] = useState(null);
  const [avisoBasico, setAvisoBasico] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cursosRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'cursos');
const q = query(cursosRef, where('activo', '==', true));
const unsub = onSnapshot(q, (snap) => {
          const activos = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const ordenA = CURSO_SECUENCIA[a.tipoCurso]?.orden || 99;
          const ordenB = CURSO_SECUENCIA[b.tipoCurso]?.orden || 99;
          return ordenA - ordenB;
        });
      setCursos(activos);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    async function cargarContacto() {
      try {
        const contactoSnap = await getDoc(doc(db, 'informacionPublica', 'contacto'));
        if (contactoSnap.exists()) setContacto(contactoSnap.data());
      } catch (error) {
        console.warn('[CursosPublicosView] Error leyendo contacto:', error);
      }
    }

    cargarContacto();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'informacionPublica', 'sedes'),
      (docSnap) => {
        if (docSnap.exists()) {
          setSedes(docSnap.data());
        } else {
          console.warn('[CursosPublicosView] Documento sedes no encontrado');
          setSedes(null);
        }
      },
      (error) => {
        console.error('[CursosPublicosView] Error leyendo sedes:', error);
        setSedes(null);
      }
    );

    return () => unsubscribe();
  }, []);

    const handleInscribirme = (cursoId) => {
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
        cursoSugerido: true
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
            cursoSugerido: true
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
            cursoSugerido: true
          }
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando cursos...</p>
        </div>
      </div>
    );
  }

    return (
    <div className="min-h-screen bg-gray-50">
          <button
        onClick={() => navigate('/')}
        className="fixed top-4 left-4 z-40 bg-black/30 backdrop-blur rounded-full p-2 text-white hover:bg-black/40 transition-colors"
        aria-label="Volver"
      >
        <ChevronLeft size={24} />
      </button>

      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-16">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <GraduationCap className="w-16 h-16 mx-auto mb-4" />
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Nuestros Cursos de Manejo</h1>
          <p className="text-xl text-blue-100 max-w-3xl mx-auto">
            Formación profesional con instructores certificados. Elige el curso que mejor se adapte a tu nivel y objetivos.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cursos.map(curso => (
            <div key={curso.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow">
              <div className="bg-blue-50 p-4 border-b">
                <h2 className="text-xl font-bold text-gray-900 mb-2">{curso.nombre}</h2>
                              <AvisoMoto curso={curso} />
              </div>

              <div className="p-4 space-y-4">
                <TextoEnriquecido texto={curso.descripcion} className="text-gray-700 text-sm" />
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span><strong>Duración:</strong> {formatearDuracion(curso.duracionTotal)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <span className="text-2xl font-bold text-blue-600">${curso.precioBase || 0}</span>
                    <span className="text-gray-500">USD</span>
                  </div>
                </div>

                {curso.modulos && curso.modulos.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-sm text-gray-900 mb-2">Contenido del curso:</h3>
                    <ul className="space-y-1">
                      {curso.modulos.slice(0, 4).map((modulo, i) => (
                        <li key={i} className="text-xs text-gray-600 flex items-start gap-1">
                          <span className="text-blue-600 mt-0.5">•</span>
                          <span>{typeof modulo === 'string' ? modulo : modulo.nombre}</span>
                        </li>
                      ))}
                      {curso.modulos.length > 4 && (
                        <li className="text-xs text-gray-500 italic">+ {curso.modulos.length - 4} módulos más</li>
                      )}
                    </ul>
                  </div>
                )}

                                {getPrerequisitoLabel(curso.tipoCurso, curso, cursos) && (
                  <div className="bg-yellow-50 border border-yellow-200 p-3 rounded">
                    <p className="text-xs text-yellow-800 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>
                                                <strong>Requisito:</strong> {getPrerequisitoLabel(curso.tipoCurso, curso, cursos)}.
                      </span>
                    </p>
                  </div>
                )}

                                <div className="flex flex-col gap-2 pt-2">
                  <button
                    onClick={() => setCursoDetalle(curso)}
                    className="w-full border-2 border-blue-600 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors font-medium text-sm"
                  >
                    Leer más
                  </button>
                                    {(() => {
                    const tienePrereq = Array.isArray(curso.prerequisitos) && curso.prerequisitos.length > 0;
                    const esBasico = curso.tipoCurso === 'basico_auto' || curso.tipoCurso === 'basico_sincro';
                    const bloqueado = tienePrereq && !esBasico;
                    return bloqueado ? (
                      <div className="w-full bg-gray-100 text-gray-500 px-4 py-3 rounded-lg text-center font-medium text-sm">
                        Requiere curso previo
                      </div>
                    ) : (
                      <button
                        onClick={() => handleInscribirme(curso.id)}
                        className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        Inscribirme
                      </button>
                    );
                  })()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

           <div className="bg-white py-12">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-8">Ubicación</h2>

          {sedes ? (
            <div className="space-y-4 max-w-3xl mx-auto">
              {sedes.caracas && sedes.guarenas && sedes.caracas.horario === sedes.guarenas.horario ? (
                <p className="text-center text-gray-600 font-bold">
                  🕐 {sedes.caracas.horario}
                </p>
              ) : (
                <div className="space-y-2 text-sm text-gray-600">
                  {sedes.caracas && (
                    <p className="text-center">
                      <strong>Caracas:</strong> {sedes.caracas.horario}
                    </p>
                  )}
                  {sedes.guarenas && (
                    <p className="text-center">
                      <strong>Guarenas:</strong> {sedes.guarenas.horario}
                    </p>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-3 text-sm text-gray-700 border-t pt-4">
                {sedes.caracas && (
                  <p>
                    <strong>📍 {sedes.caracas.nombre}:</strong>{' '}
                    {sedes.caracas.direccion}
                    {sedes.caracas.puntoReferencia && ` (${sedes.caracas.puntoReferencia})`}
                  </p>
                )}
                {sedes.guarenas && (
                  <p>
                    <strong>📍 {sedes.guarenas.nombre}:</strong>{' '}
                    {sedes.guarenas.direccion}
                    {sedes.guarenas.puntoReferencia && ` (${sedes.guarenas.puntoReferencia})`}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-500">Cargando información de sedes...</p>
          )}
        </div>
      </div>

      {contacto && (
        <div className="bg-gray-100 py-12">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-6">¿Tienes dudas? Contáctanos</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <a
                href={`tel:${contacto.telefono}`}
                className="bg-white p-6 rounded-lg shadow block hover:shadow-lg transition-all cursor-pointer"
              >
                <Phone className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                <h3 className="font-bold mb-2">Teléfono</h3>
                <p className="text-gray-700">{contacto.telefono}</p>
              </a>

              <a
                href={`https://wa.me/${String(contacto.whatsapp).replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white p-6 rounded-lg shadow block hover:shadow-lg transition-all cursor-pointer"
              >
                <Phone className="w-8 h-8 text-green-600 mx-auto mb-3" />
                <h3 className="font-bold mb-2">WhatsApp</h3>
                <p className="text-gray-700">{contacto.whatsapp}</p>
              </a>

              <a
                href={`mailto:${contacto.email}`}
                className="bg-white p-6 rounded-lg shadow block hover:shadow-lg transition-all cursor-pointer"
              >
                <Clock className="w-8 h-8 text-orange-600 mx-auto mb-3" />
                <h3 className="font-bold mb-2">Correo</h3>
                <p className="text-gray-700">{contacto.email}</p>
              </a>
            </div>
          </div>
        </div>
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
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setAvisoBasico(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-orange-500 flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-2">Aviso importante</h2>
                <p className="text-sm text-gray-700 mb-3">
                  Este curso (<strong>{avisoBasico.nombre}</strong>) recomienda haber completado el curso de <strong>Equilibrio</strong> primero.
                </p>
                <p className="text-sm text-gray-700 mb-2">
                  Si ya sabes andar en bicicleta o has manejado moto y tienes equilibrio, puedes continuar.
                </p>
                <p className="text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded-lg p-2">
                  ⚠️ Si te estás saltando el curso de Equilibrio adrede, va a ser perjudicial para ti porque no dominarás el equilibrio y el avance del curso será muy lento.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => confirmarAvisoBasico(true)}
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-medium transition-colors"
              >
                Hacer Equilibrio primero
              </button>
              <button
                onClick={() => confirmarAvisoBasico(false)}
                className="w-full border-2 border-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Ya sé andar, continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
