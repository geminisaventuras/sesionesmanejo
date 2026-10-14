// @build: 2026-10-09 | id: PROGRESO-TEORICO-SERVICE | desc: Servicio de progreso de módulos teóricos (logrosUsuario.stats)
import { doc, getDoc, setDoc, updateDoc, arrayUnion, Timestamp } from 'firebase/firestore';
import { db } from '../../../firebase';

const APP_ID = 'motoescuela-pro-v1';
const buildRef = (uid) => doc(db, 'artifacts', APP_ID, 'public', 'data', 'logrosUsuario', uid);

export const ProgresoTeoricoService = {
  async obtenerProgreso(uid, cursoId) {
    if (!uid || !cursoId) return { success: false, error: 'Faltan parámetros' };
    try {
      const snap = await getDoc(buildRef(uid));
      if (!snap.exists()) {
        return { success: true, data: { modulosCompletados: [], puntajeQuizzes: {}, ultimoModuloVisto: null } };
      }
      const data = snap.data();
      const stats = (data.stats || {})[String(cursoId)] || {};
      return {
        success: true,
        data: {
          modulosCompletados: Array.isArray(stats.modulosCompletados) ? stats.modulosCompletados : [],
          puntajeQuizzes: stats.puntajeQuizzes || {},
          ultimoModuloVisto: stats.ultimoModuloVisto || null
        }
      };
    } catch (error) {
      console.error('[ProgresoTeoricoService] Error obteniendo:', error);
      return { success: false, error: error.message };
    }
  },

  async marcarModuloCompletado(uid, cursoId, moduloId, puntajeQuiz = null) {
    if (!uid || !cursoId || !moduloId) return { success: false, error: 'Faltan parámetros' };
    try {
      const ref = buildRef(uid);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        await setDoc(ref, {
          userId: uid,
          logros: [],
          streak: {},
          stats: {
            [String(cursoId)]: {
              modulosCompletados: [String(moduloId)],
              puntajeQuizzes: puntajeQuiz !== null ? { [String(moduloId)]: puntajeQuiz } : {},
              ultimoModuloVisto: String(moduloId)
            }
          },
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
        return { success: true };
      }

      const updates = {
        [`stats.${cursoId}.modulosCompletados`]: arrayUnion(String(moduloId)),
        [`stats.${cursoId}.ultimoModuloVisto`]: String(moduloId)
      };

      if (puntajeQuiz !== null) {
        updates[`stats.${cursoId}.puntajeQuizzes.${moduloId}`] = puntajeQuiz;
      }

      await updateDoc(ref, updates);
      return { success: true };
    } catch (error) {
      console.error('[ProgresoTeoricoService] Error marcando:', error);
      return { success: false, error: error.message };
    }
  },

  async marcarUltimoVisto(uid, cursoId, moduloId) {
    if (!uid || !cursoId || !moduloId) return { success: false, error: 'Faltan parámetros' };
    try {
      const ref = buildRef(uid);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        await setDoc(ref, {
          userId: uid,
          logros: [],
          streak: {},
          stats: {
            [String(cursoId)]: {
              modulosCompletados: [],
              puntajeQuizzes: {},
              ultimoModuloVisto: String(moduloId)
            }
          },
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
        return { success: true };
      }

      await updateDoc(ref, {
        [`stats.${cursoId}.ultimoModuloVisto`]: String(moduloId)
      });
      return { success: true };
    } catch (error) {
      console.error('[ProgresoTeoricoService] Error marcando visto:', error);
      return { success: false, error: error.message };
    }
  }
};

export default ProgresoTeoricoService;
