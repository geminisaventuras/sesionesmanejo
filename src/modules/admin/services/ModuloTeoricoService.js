// @build: 2026-10-01 | id: MODULO-TEORICO-SERVICE | desc: Servicio bajo demanda para módulos y quizzes teóricos
import { db } from '../../../firebase';
import { collection, doc, setDoc, deleteDoc, getDocs, getDoc, query, where } from 'firebase/firestore';

const APP_ID = 'motoescuela-pro-v1';
const BASE = `artifacts/${APP_ID}/public/data`;

export const ModuloTeoricoService = {
  async obtenerModulosPorCurso(cursoId) {
    if (!cursoId) return { success: true, data: [] };
    try {
      const ref = collection(db, `${BASE}/modulosTeoricos`);
      const q = query(ref, where('cursoId', '==', cursoId));
      const snap = await getDocs(q);
      const data = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (Number(a.orden) || 99) - (Number(b.orden) || 99));
      return { success: true, data };
    } catch (error) {
      console.error('[ModuloTeoricoService] Error obteniendo módulos:', error);
      return { success: false, error: error.message };
    }
  },

  async guardarModulo(modulo) {
    try {
      const id = modulo.id ? String(modulo.id) : `mod_${Date.now()}`;
      const payload = { ...modulo, id };
      await setDoc(doc(db, `${BASE}/modulosTeoricos`, id), payload);
      return { success: true, data: payload };
    } catch (error) {
      console.error('[ModuloTeoricoService] Error guardando módulo:', error);
      return { success: false, error: error.message };
    }
  },

  async eliminarModulo(moduloId) {
    if (!moduloId) return { success: false, error: 'Falta moduloId' };
    try {
      await deleteDoc(doc(db, `${BASE}/modulosTeoricos`, moduloId));
      return { success: true };
    } catch (error) {
      console.error('[ModuloTeoricoService] Error eliminando módulo:', error);
      return { success: false, error: error.message };
    }
  },

  async guardarQuiz(quiz) {
    try {
      const id = quiz.id ? String(quiz.id) : `quiz_${Date.now()}`;
      const payload = { ...quiz, id };
      await setDoc(doc(db, `${BASE}/quizzesTeoricos`, id), payload);
      return { success: true, data: payload };
    } catch (error) {
      console.error('[ModuloTeoricoService] Error guardando quiz:', error);
      return { success: false, error: error.message };
    }
  },

  async obtenerQuizPorId(quizId) {
    if (!quizId) return { success: false, error: 'Falta quizId' };
    try {
      const ref = doc(db, `${BASE}/quizzesTeoricos`, quizId);
      const snap = await getDoc(ref);
      if (snap.exists()) return { success: true, data: { id: snap.id, ...snap.data() } };
      return { success: false, error: 'Quiz no encontrado' };
    } catch (error) {
      console.error('[ModuloTeoricoService] Error obteniendo quiz:', error);
      return { success: false, error: error.message };
    }
  }
};