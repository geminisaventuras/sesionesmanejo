// @build: 2026-06-16.06-00-00 | id: B5 | desc: Polling robusto de locks cada 5 segundos
import { doc, setDoc, query, collection, where, Timestamp, deleteDoc, getDocs } from 'firebase/firestore';
import { db } from '../../shared/firebase/firebase';

const MAX_LIMPIEZA = 10;

export const LockService = {
  async crearLock(lockId, userId, metadata = {}) {
    if (!lockId || !userId)
      return { success: false, error: { code: 'missing-fields', message: 'Faltan datos del lock' } };
    const lockRef = doc(db, 'locks', lockId);
    try {
      await setDoc(lockRef, {
        expiresAt: Timestamp.fromDate(new Date(Date.now() + 10 * 60 * 1000)),
        userId,
        ...metadata,
      });
      return { success: true, data: { lockId } };
    } catch (error) {
      return { success: false, error: { code: error.code, message: error.message } };
    }
  },

  async liberarLock(lockId) {
    if (!lockId)
      return { success: false, error: { code: 'missing-fields', message: 'Falta el ID del lock' } };
    try {
      await deleteDoc(doc(db, 'locks', lockId));
      return { success: true };
    } catch (error) {
      return { success: false, error: { code: error.code, message: error.message } };
    }
  },

  async limpiarLocksExpirados(fecha) {
    try {
      const locksRef = collection(db, 'locks');
      const q = query(locksRef, where('fecha', '==', fecha), where('expiresAt', '<=', Timestamp.now()));
      const snapshot = await getDocs(q);
      const expirados = snapshot.docs.slice(0, MAX_LIMPIEZA);
      const batch = [];
      expirados.forEach(doc => batch.push(deleteDoc(doc.ref).catch(() => {})));
      await Promise.all(batch);
      return { success: true, data: { eliminados: expirados.length } };
    } catch (error) {
      return { success: false, error: { code: error.code, message: error.message } };
    }
  },

  escucharLocks(fecha, callback) {
    this.limpiarLocksExpirados(fecha).catch(() => {});
    const locksRef = collection(db, 'locks');
    const q = query(locksRef, where('fecha', '==', fecha), where('expiresAt', '>', Timestamp.now()));

    // Usar polling cada 5 segundos (más robusto que onSnapshot en algunos entornos)
    const interval = setInterval(async () => {
      try {
        const snap = await getDocs(q);
        const locks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        callback(locks);
      } catch (e) {
        console.error('Error en polling de locks:', e);
      }
    }, 5000);

    // Ejecutar una primera consulta inmediata
    getDocs(q).then(snap => {
      const locks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(locks);
    }).catch(() => {});

    // Devolver función de limpieza
    return () => clearInterval(interval);
  }
};
