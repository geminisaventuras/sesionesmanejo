// @build: 2026-06-22 | id: CURSO-SERVICE | desc: Servicio para consultar cursos desde Firestore.
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../shared/firebase/firebase';

const APP_ID = 'motoescuela-pro-v1';

export const CursoService = {
  async obtenerCurso(cursoId) {
    if (!cursoId) return { success: false, error: { code: 'missing-id', message: 'Falta el ID del curso' } };
    try {
      const snap = await getDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'cursos', String(cursoId)));
      if (snap.exists()) {
        return { success: true, data: { id: snap.id, ...snap.data() } };
      }
      return { success: true, data: null };
    } catch (error) {
      return { success: false, error: { code: error.code, message: error.message } };
    }
  }
};