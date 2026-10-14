// @build: 2026-10-09 | id: TEORICO-MODULO-VIEW | desc: Vista individual de un módulo teórico (lección/video/quiz)
import { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { AppContext } from '../../../context/AppContextValue';
import { ChevronLeft, BookOpen, Video, HelpCircle, Check, Lock, ArrowRight, Loader2, AlertCircle, Award } from 'lucide-react';
import TextoEnriquecido from '../../shared/components/TextoEnriquecido';
import QuizRenderer from '../components/QuizRenderer';
import ProgresoTeoricoService from '../services/ProgresoTeoricoService';
import { useToast } from '../../shared/components/ToastProvider';

const APP_ID = 'motoescuela-pro-v1';

const ICONO_TIPO = { leccion: BookOpen, video: Video, quiz: HelpCircle };
const LABEL_TIPO = { leccion: 'Lección', video: 'Video', quiz: 'Reto' };

export default function TeoricoModuloView() {
  const { cursoId, moduloId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const ctx = useContext(AppContext);
  const { fbUser } = ctx;
  const uid = fbUser?.uid;

  const [curso, setCurso] = useState(null);
  const [modulo, setModulo] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [modulosCurso, setModulosCurso] = useState([]);
  const [progreso, setProgreso] = useState({ modulosCompletados: [], puntajeQuizzes: {} });
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [marcando, setMarcando] = useState(false);

  const cargarTodo = useCallback(async () => {
    if (!cursoId || !moduloId) { setError('Faltan parámetros'); setCargando(false); return; }
    setCargando(true);
    setError(null);
    try {
      // 1. Cargar módulo actual
      const modSnap = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'modulosTeoricos', moduloId));
      if (!modSnap.exists()) { setError('Módulo no encontrado'); setCargando(false); return; }
      const modData = { id: modSnap.id, ...modSnap.data() };
      setModulo(modData);

      // 2. Cargar curso (directo de Firestore)
      const cursoSnap = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'cursosTeoricos', cursoId));
      if (cursoSnap.exists()) setCurso({ id: cursoSnap.id, ...cursoSnap.data() });

      // 3. Cargar módulos del curso (para navegación secuencial)
      const modsRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'modulosTeoricos');
      const modsQ = query(modsRef, where('cursoId', '==', String(cursoId)));
      const modsSnap = await getDocs(modsQ);
      const modsDocs = modsSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (Number(a.orden) || 99) - (Number(b.orden) || 99));
      setModulosCurso(modsDocs);

      // 4. Cargar quiz si aplica
      if (modData.tipo === 'quiz' && modData.quizId) {
        const quizSnap = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'quizzesTeoricos', modData.quizId));
        if (quizSnap.exists()) setQuiz({ id: quizSnap.id, ...quizSnap.data() });
      }

      // 5. Cargar progreso si el usuario está logueado
      if (uid) {
        const prog = await ProgresoTeoricoService.obtenerProgreso(uid, cursoId);
        if (prog.success) setProgreso(prog.data);
      }
    } catch (err) {
      console.error('[TeoricoModuloView] Error:', err);
      setError('No se pudo cargar el módulo. Intenta de nuevo.');
    } finally {
      setCargando(false);
    }
  }, [cursoId, moduloId, uid]);

  useEffect(() => { cargarTodo(); }, [cargarTodo]);

  // Marcar el módulo como visto al abrir (si logueado)
  useEffect(() => {
    if (!uid || !modulo) return;
    ProgresoTeoricoService.marcarUltimoVisto(uid, cursoId, modulo.id).catch(() => {});
  }, [uid, modulo, cursoId]);

  const modulosCompletados = useMemo(() => {
    return new Set((progreso.modulosCompletados || []).map(String));
  }, [progreso]);

  const yaCompletado = modulo ? modulosCompletados.has(String(modulo.id)) : false;

  const siguienteModulo = useMemo(() => {
    if (!modulo) return null;
    const idx = modulosCurso.findIndex(m => String(m.id) === String(modulo.id));
    if (idx < 0 || idx >= modulosCurso.length - 1) return null;
    return modulosCurso[idx + 1];
  }, [modulo, modulosCurso]);

  const esUltimoModulo = useMemo(() => {
    if (!modulo) return false;
    const idx = modulosCurso.findIndex(m => String(m.id) === String(modulo.id));
    return idx === modulosCurso.length - 1;
  }, [modulo, modulosCurso]);

  const handleMarcarCompletado = async (puntajeQuiz = null) => {
    if (!uid) {
      showToast('Inicia sesión para guardar tu progreso.', 'info');
      return;
    }
    if (marcando) return;
    setMarcando(true);
    const res = await ProgresoTeoricoService.marcarModuloCompletado(uid, cursoId, modulo.id, puntajeQuiz);
    setMarcando(false);
    if (res.success) {
      setProgreso(prev => ({
        ...prev,
        modulosCompletados: Array.from(new Set([...(prev.modulosCompletados || []), String(modulo.id)])),
        puntajeQuizzes: puntajeQuiz !== null ? { ...prev.puntajeQuizzes, [modulo.id]: puntajeQuiz } : prev.puntajeQuizzes
      }));
      showToast('¡Módulo completado!', 'success');
    } else {
      showToast('No se pudo guardar tu progreso. Intenta de nuevo.', 'error');
    }
  };

  const handleSiguiente = () => {
    if (esUltimoModulo) {
      showToast('¡Completaste esta formación!', 'success');
      navigate('/teorico/' + cursoId);
      return;
    }
    if (siguienteModulo) {
      navigate('/teorico/' + cursoId + '/modulo/' + siguienteModulo.id);
    }
  };

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 size={32} className="text-teal-600 animate-spin mx-auto" />
          <p className="mt-4 text-gray-600 text-sm">Cargando módulo...</p>
        </div>
      </div>
    );
  }

  if (error || !modulo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="text-center">
          <AlertCircle size={48} className="text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">{error || 'Módulo no encontrado'}</p>
          <button onClick={() => navigate('/teorico/' + cursoId)} className="bg-teal-600 text-white px-6 py-3 rounded-xl font-bold">
            Volver al curso
          </button>
        </div>
      </div>
    );
  }

  const Icono = ICONO_TIPO[modulo.tipo] || BookOpen;
  const label = LABEL_TIPO[modulo.tipo] || 'Módulo';

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Botón volver */}
      <button
        onClick={() => {
          // Si es estudiante logueado → panel del estudiante. Sino → curso público.
          const esEstudiante = ctx.user?.role === 'estudiante' && ctx.fbUser;
          if (esEstudiante) {
            navigate('/portal-reservas?tab=formacion');
          } else {
            navigate('/teorico/' + cursoId);
          }
        }}
        className="fixed top-4 left-4 z-40 bg-black/30 backdrop-blur rounded-full p-2 text-white hover:bg-black/40 transition-colors"
        aria-label="Volver"
      >
        <ChevronLeft size={24} />
      </button>

      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-cyan-700 text-white pt-16 pb-6 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <Icono size={16} className="text-teal-200" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-200">{label}</span>
            {modulo.duracionMin > 0 && (
              <span className="text-[11px] text-teal-100">· {modulo.duracionMin} min</span>
            )}
          </div>
          <h1 className="text-xl md:text-2xl font-black mb-2">{modulo.titulo}</h1>
          {curso && <p className="text-xs text-teal-100">{curso.nombre}</p>}
        </div>
      </div>

      {/* Contenido según tipo */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {modulo.tipo === 'leccion' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <TextoEnriquecido texto={modulo.contenido} className="text-sm text-gray-800 leading-relaxed" />
          </div>
        )}

        {modulo.tipo === 'video' && (
          <div className="space-y-4">
            <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-md">
              <iframe
                src={modulo.videoUrl}
                title={modulo.titulo}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            {modulo.disclaimer && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">{modulo.disclaimer}</p>
              </div>
            )}
          </div>
        )}

        {modulo.tipo === 'quiz' && (
          <>
            {quiz ? (
              <QuizRenderer
                preguntas={quiz.preguntas || []}
                onCompletar={handleMarcarCompletado}
              />
            ) : (
              <div className="text-center py-8 text-gray-500">Cargando preguntas...</div>
            )}
          </>
        )}

        {/* Acciones */}
        <div className="mt-6 space-y-2">
          {modulo.tipo !== 'quiz' && !yaCompletado && uid && (
            <button
              onClick={() => handleMarcarCompletado()}
              disabled={marcando}
              className="w-full bg-teal-600 text-white py-3 rounded-xl font-bold hover:bg-teal-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <Check size={18} />
              {marcando ? 'Guardando...' : 'Marcar como completado'}
            </button>
          )}

          {yaCompletado && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center justify-center gap-2">
              <Check size={18} className="text-green-600" />
              <span className="text-sm font-bold text-green-800">Módulo completado</span>
            </div>
          )}

          {!uid && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
              <p className="text-xs text-blue-800">Inicia sesión para guardar tu progreso y desbloquear el siguiente módulo.</p>
            </div>
          )}

          {(yaCompletado || !uid) && (
            <button
              onClick={handleSiguiente}
              disabled={!yaCompletado && siguienteModulo && !uid}
              className="w-full bg-white border-2 border-teal-600 text-teal-700 py-3 rounded-xl font-bold hover:bg-teal-50 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {esUltimoModulo ? (
                <>
                  <Award size={18} />
                  Finalizar formación
                </>
              ) : (
                <>
                  Siguiente módulo
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
