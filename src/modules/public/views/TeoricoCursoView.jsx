// @build: 2026-10-04 | id: TEORICO-CURSO-VIEW | desc: Vista de curso teórico con lista secuencial de módulos y progreso
import { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { AppContext } from '../../../context/AppContextValue';
import { ChevronLeft, BookOpen, Video, HelpCircle, Check, Lock, Play, Loader2, AlertCircle } from 'lucide-react';
import LegalFooter from '../../shared/components/LegalFooter';

const APP_ID = 'motoescuela-pro-v1';

const ICONO_TIPO = {
  leccion: BookOpen,
  video: Video,
  quiz: HelpCircle
};

const LABEL_TIPO = {
  leccion: 'Lección',
  video: 'Video',
  quiz: 'Reto'
};

export default function TeoricoCursoView() {
  const { cursoId } = useParams();
  const navigate = useNavigate();
  const ctx = useContext(AppContext);
  const { fbUser, authReady, cursosTeoricos } = ctx;
  const uid = fbUser?.uid;

  const [modulos, setModulos] = useState([]);
  const [progreso, setProgreso] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [accesosAprobados, setAccesosAprobados] = useState(new Set());

  const curso = useMemo(
    () => (cursosTeoricos || []).find(c => String(c.id) === String(cursoId)),
    [cursosTeoricos, cursoId]
  );

  const cargarDatos = useCallback(async () => {
    if (!cursoId) { setError('Curso no especificado'); setCargando(false); return; }
    if (!authReady) return; // esperar a que Firebase Auth esté listo
    setCargando(true);
    setError(null);
    try {
      const modsRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'modulosTeoricos');
      const modsQuery = query(
        modsRef,
        where('cursoId', '==', String(cursoId))
      );

      const promises = [getDocs(modsQuery)];

      if (uid) {
        const progRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'logrosUsuario', uid);
        promises.push(getDoc(progRef));
        const accRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'accesosTeoricos');
        const accQuery = query(accRef, where('userId', '==', String(uid)));
        promises.push(getDocs(accQuery));
      }

      const [modsSnap, progSnap, accSnap] = await Promise.all(promises);

      const modsDocs = modsSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (Number(a.orden) || 99) - (Number(b.orden) || 99));
      setModulos(modsDocs);

      if (progSnap && progSnap.exists()) {
        const data = progSnap.data();
        const stats = data.stats || {};
        setProgreso(stats[String(cursoId)] || { modulosCompletados: [], puntajeQuizzes: {} });
      } else {
        setProgreso({ modulosCompletados: [], puntajeQuizzes: {} });
      }

      const setAccesos = new Set();
      (accSnap?.docs || []).forEach(d => {
        const a = d.data();
        if (a.estadoPago === 'Aprobado') setAccesos.add(String(a.cursoTeoricoId));
      });
      setAccesosAprobados(setAccesos);
    } catch (err) {
      console.error('[TeoricoCursoView] Error:', err);
      setError('No se pudo cargar el contenido. Intenta de nuevo.');
    } finally {
      setCargando(false);
    }
  }, [cursoId, uid, authReady]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  // Progreso
  const modulosCompletados = useMemo(() => {
    return new Set((progreso?.modulosCompletados || []).map(String));
  }, [progreso]);

  const totalModulos = modulos.length;
  const completadosCount = modulos.filter(m => modulosCompletados.has(String(m.id))).length;
  const pctProgreso = totalModulos > 0 ? Math.round((completadosCount / totalModulos) * 100) : 0;

  // Determinar estado de cada módulo
  const modulosConEstado = useMemo(() => {
    let todosAnterioresCompletados = true;
    return modulos.map((m, i) => {
      const completado = modulosCompletados.has(String(m.id));
      const esActual = !completado && todosAnterioresCompletados;
      const bloqueado = !completado && !esActual;
      if (!completado) todosAnterioresCompletados = false;
      return { ...m, completado, esActual, bloqueado, indice: i };
    });
  }, [modulos, modulosCompletados]);

  const handleClickModulo = (modulo) => {
    if (modulo.bloqueado) return;
    navigate('/teorico/' + cursoId + '/modulo/' + modulo.id);
  };

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 size={32} className="text-teal-600 animate-spin mx-auto" />
          <p className="mt-4 text-gray-600 text-sm">Cargando contenido...</p>
        </div>
      </div>
    );
  }

  const esGratis = (Number(curso?.precio) || 0) === 0;
  const tieneAcceso = esGratis || accesosAprobados.has(String(cursoId));

  if (!tieneAcceso) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <button
          onClick={() => {
            const esEstudiante = ctx.user?.role === 'estudiante' && ctx.fbUser;
            if (esEstudiante) {
              navigate('/portal-reservas?tab=formacion');
            } else {
              navigate('/teorico');
            }
          }}
          className="fixed top-4 left-4 z-40 bg-black/30 backdrop-blur rounded-full p-2 text-white hover:bg-black/40 transition-colors"
          aria-label="Volver"
        >
          <ChevronLeft size={24} />
        </button>

        <div className="bg-gradient-to-r from-teal-600 to-cyan-700 text-white pt-16 pb-8 px-6">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-2xl md:text-3xl font-black mb-2">
              {curso?.nombre || 'Formación'}
            </h1>
            {curso?.descripcion && (
              <p className="text-sm text-teal-100">{curso.descripcion}</p>
            )}
          </div>
        </div>

        <div className="max-w-md mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl border-2 border-teal-200 p-6 text-center shadow-lg">
            <Lock size={48} className="text-teal-600 mx-auto mb-4" />
            <h2 className="text-xl font-black text-gray-900 mb-2">Contenido exclusivo</h2>
            <p className="text-sm text-gray-600 mb-6">
              Este módulo formativo requiere una inscripción previa.
            </p>
            {curso?.precio > 0 && (
              <p className="text-3xl font-black text-teal-700 mb-6">
                ${curso.precio} USD
              </p>
            )}
            <button
              onClick={() => navigate('/teorico/' + cursoId + '/comprar')}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold px-6 py-3 rounded-xl transition-colors"
            >
              Inscribirme
            </button>
          </div>
        </div>

        <LegalFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Botón volver */}
      <button
        onClick={() => {
          const esEstudiante = ctx.user?.role === 'estudiante' && ctx.fbUser;
          if (esEstudiante) {
            navigate('/portal-reservas?tab=formacion');
          } else {
            navigate('/teorico');
          }
        }}
        className="fixed top-4 left-4 z-40 bg-black/30 backdrop-blur rounded-full p-2 text-white hover:bg-black/40 transition-colors"
        aria-label="Volver"
      >
        <ChevronLeft size={24} />
      </button>

      {/* Header del curso */}
      <div className="bg-gradient-to-r from-teal-600 to-cyan-700 text-white pt-16 pb-8 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-black mb-2">
            {curso?.nombre || 'Formación'}
          </h1>
          {curso?.descripcion && (
            <p className="text-sm text-teal-100 mb-4">{curso.descripcion}</p>
          )}

          <div className="bg-white/15 rounded-xl p-4 mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-teal-100">Progreso</span>
              <span className="text-sm font-black">{completadosCount}/{totalModulos}</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
              <div
                className="h-2 bg-white rounded-full transition-all duration-500"
                style={{ width: pctProgreso + '%' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Lista de módulos */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex items-start gap-3">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {!error && modulos.length === 0 && (
          <div className="text-center py-12">
            <BookOpen size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Este curso aún no tiene contenido disponible.</p>
          </div>
        )}

        {modulos.length > 0 && (
          <div className="space-y-3">
            {modulosConEstado.map(m => {
              const Icono = ICONO_TIPO[m.tipo] || BookOpen;
              const label = LABEL_TIPO[m.tipo] || 'Módulo';

              return (
                <button
                  key={m.id}
                  onClick={() => handleClickModulo(m)}
                  disabled={m.bloqueado}
                  className={
                    'w-full text-left rounded-2xl p-4 transition-all flex items-center gap-3 border ' +
                    (m.completado
                      ? 'bg-green-50 border-green-200 hover:border-green-300 cursor-pointer'
                      : m.esActual
                        ? 'bg-white border-teal-300 shadow-md hover:shadow-lg cursor-pointer active:scale-[0.98]'
                        : 'bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed')
                  }
                >
                  {/* Indicador numerado / check / lock */}
                  <div className={
                    'w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ' +
                    (m.completado
                      ? 'bg-green-500 text-white'
                      : m.esActual
                        ? 'bg-teal-600 text-white'
                        : 'bg-gray-300 text-gray-500')
                  }>
                    {m.completado ? (
                      <Check size={20} />
                    ) : m.bloqueado ? (
                      <Lock size={18} />
                    ) : (
                      <span className="font-black text-sm">{m.orden || m.indice + 1}</span>
                    )}
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Icono size={12} className={
                        m.completado ? 'text-green-600' : m.esActual ? 'text-teal-600' : 'text-gray-400'
                      } />
                      <span className={
                        'text-[10px] font-bold uppercase tracking-wider ' +
                        (m.completado ? 'text-green-700' : m.esActual ? 'text-teal-700' : 'text-gray-500')
                      }>
                        {label}
                      </span>
                    </div>
                    <p className={
                      'font-bold text-sm truncate ' +
                      (m.bloqueado ? 'text-gray-500' : 'text-gray-900')
                    }>
                      {m.titulo}
                    </p>
                    {m.duracionMin > 0 && (
                      <p className="text-xs text-gray-500 mt-0.5">{m.duracionMin} min</p>
                    )}
                  </div>

                  {/* Flecha / acción */}
                  {!m.bloqueado && (
                    <div className="flex-shrink-0">
                      <Play size={18} className={
                        m.completado ? 'text-green-600' : 'text-teal-600'
                      } fill="currentColor" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Estado final */}
        {totalModulos > 0 && completadosCount === totalModulos && (
          <div className="mt-6 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6 text-center">
            <Check size={40} className="text-green-600 mx-auto mb-3" />
            <h3 className="font-black text-lg text-green-900 mb-1">¡Sesión Completada!</h3>
            <p className="text-sm text-green-700">Has finalizado todos los módulos de esta formación.</p>
          </div>
        )}
      </div>

      <LegalFooter />
    </div>
  );
}
