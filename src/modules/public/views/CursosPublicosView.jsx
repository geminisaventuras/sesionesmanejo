import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, doc, onSnapshot, getDoc, query, where } from 'firebase/firestore';import { db } from '../../../firebase';
import { CURSO_SECUENCIA } from '../../../constants/cursoSecuencia';
import { incluyeMoto } from '../../../constants/tiposCurso';
import { AlertCircle, Clock, MapPin, Phone, CheckCircle, GraduationCap, ChevronLeft } from 'lucide-react';
import ModalCursoDetalle from '../components/ModalCursoDetalle';
const APP_ID = 'motoescuela-pro-v1';


const formatearDuracion = (minutos) => {
  if (!minutos && minutos !== 0) return 'N/A';
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;
  if (horas === 0) return `${mins} min`;
  if (mins === 0) return `${horas} ${horas === 1 ? 'hora' : 'horas'}`;
  return `${horas}h ${mins} min`;
};
const getPrerequisitoLabel = (tipoCurso) => {
  const prerequisito = CURSO_SECUENCIA[tipoCurso]?.prerequisito;
  if (!prerequisito) return null;

  const labels = {
    basico_auto: 'Curso Básico Automática',
    basico_sincro: 'Curso Básico Sincrónica',
    general: 'Práctica en la Vía'
  };

  if (Array.isArray(prerequisito)) {
    return prerequisito.map(p => labels[p] || p).join(' o ');
  }

  return labels[prerequisito] || prerequisito;
};

export default function CursosPublicosView() {
  const navigate = useNavigate();
  const [cursos, setCursos] = useState([]);
  const [contacto, setContacto] = useState(null);
  const [sedes, setSedes] = useState(null);
    const [cursoDetalle, setCursoDetalle] = useState(null);
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
    navigate('/inscripcion', {
      state: {
        cursoId,
        origen: 'publico',
        cursoSugerido: true
      }
    });
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
                {incluyeMoto(curso.tipoCurso) && (
                  <div className="inline-flex items-center gap-1 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                    <CheckCircle className="w-4 h-4" />
                    <span>Incluye moto de práctica</span>
                  </div>
                )}
              </div>

              <div className="p-4 space-y-4">
                <p className="text-gray-700 text-sm">{curso.descripcion}</p>

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

                {getPrerequisitoLabel(curso.tipoCurso) && (
                  <div className="bg-yellow-50 border border-yellow-200 p-3 rounded">
                    <p className="text-xs text-yellow-800 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>Requisito:</strong> {getPrerequisitoLabel(curso.tipoCurso)}.
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
                  <button
                    onClick={() => handleInscribirme(curso.id)}
                    className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Inscribirme
                  </button>
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
          prerequisitoLabel={getPrerequisitoLabel(cursoDetalle.tipoCurso)}
          onClose={() => setCursoDetalle(null)}
          onInscribirme={(cursoId) => {
            setCursoDetalle(null);
            handleInscribirme(cursoId);
          }}
        />
      )}
    </div>
  );
}
