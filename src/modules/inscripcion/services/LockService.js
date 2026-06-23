import { doc, setDoc, query, collection, where, Timestamp, deleteDoc, getDocs, onSnapshot, writeBatch } from 'firebase/firestore';
import { db } from '../../shared/firebase/firebase';

const MAX_LIMPIEZA = 10;

export const LockService = {
  async crearLock(lockId, userId, metadata = {}) {
    if (!lockId || !userId)
      return { success: false, error: { code: 'missing-fields', message: 'Faltan datos del lock' } };

    const batch = writeBatch(db);
    const lockRef = doc(db, 'locks', lockId);
    const ocupacionRef = doc(db, 'ocupacionTemporal', lockId);
    const expiresAt = Timestamp.fromDate(new Date(Date.now() + 10 * 60 * 1000));

    batch.set(lockRef, {
      expiresAt,
      userId,
      fecha: metadata.fecha,
      horaId: metadata.horaId,
      instructorId: metadata.instructorId || null,
      motoAsignadaId: metadata.motoAsignadaId || null
    });

    batch.set(ocupacionRef, {
      expiresAt,
      fecha: metadata.fecha,
      horaId: metadata.horaId,
      instructorId: metadata.instructorId || null,
      motoAsignadaId: metadata.motoAsignadaId || null
    });

    try {
      await batch.commit();
      return { success: true, data: { lockId } };
    } catch (error) {
      return { success: false, error: { code: error.code, message: error.message } };
    }
  },

  async liberarLock(lockId) {
    if (!lockId)
      return { success: false, error: { code: 'missing-fields', message: 'Falta el ID del lock' } };

    const batch = writeBatch(db);
    batch.delete(doc(db, 'ocupacionTemporal', lockId));
    batch.delete(doc(db, 'locks', lockId));

    try {
      await batch.commit();
      return { success: true };
    } catch (error) {
      return { success: false, error: { code: error.code, message: error.message } };
    }
  },

  async limpiarLocksExpirados(fecha, userId) {
    if (!userId)
      return { success: false, error: { code: 'missing-fields', message: 'Falta el userId para limpiar locks' } };
    try {
      const locksRef = collection(db, 'locks');
      const q = query(
        locksRef,
        where('userId', '==', userId),
        where('fecha', '==', fecha),
        where('expiresAt', '<=', Timestamp.now())
      );
      const snapshot = await getDocs(q);
      const expirados = snapshot.docs.slice(0, MAX_LIMPIEZA);
      const batchPromises = [];
      expirados.forEach(d => {
        const batch = writeBatch(db);
        batch.delete(doc(db, 'ocupacionTemporal', d.id));
        batch.delete(d.ref);
        batchPromises.push(batch.commit().catch(() => {}));
      });
      await Promise.all(batchPromises);
      return { success: true, data: { eliminados: expirados.length } };
    } catch (error) {
      return { success: false, error: { code: error.code, message: error.message } };
    }
  },

  escucharOcupacionTemporal(fecha, callback) {
    const ocupacionRef = collection(db, 'ocupacionTemporal');
    const q = query(ocupacionRef, where('fecha', '==', fecha));

    const unsub = onSnapshot(q, (snap) => {
      const ahora = Date.now();
      const locks = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(lock => lock.expiresAt && lock.expiresAt.toMillis() > ahora);
      callback(locks);
    }, (error) => {
      console.warn('[LockService] Error en listener de ocupación temporal:', error);
    });

    return () => unsub();
  },
};