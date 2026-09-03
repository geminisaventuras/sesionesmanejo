import { doc, setDoc, query, collection, where, Timestamp, deleteDoc, getDocs, onSnapshot, writeBatch } from 'firebase/firestore';
import { db } from '../../shared/firebase/firebase';

const MAX_LIMPIEZA = 10;
const LOCK_DURATION_MS = 10 * 60 * 1000;
const CLOCK_SKEW_MARGIN_MS = 10 * 1000;

export const LockService = {
  async crearLock(lockId, userId, metadata = {}) {
    if (!lockId || !userId)
      return { success: false, error: { code: 'missing-fields', message: 'Faltan datos del lock' } };

    const batch = writeBatch(db);
    const lockRef = doc(db, 'locks', lockId);
    const ocupacionRef = doc(db, 'ocupacionTemporal', lockId);
const expiresAt = Timestamp.fromMillis(Date.now() + LOCK_DURATION_MS - CLOCK_SKEW_MARGIN_MS);
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
      userId,
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

  async renovarLock(lockId) {
    if (!lockId)
      return { success: false, error: { code: 'missing-fields', message: 'Falta el ID del lock' } };

    const batch = writeBatch(db);
    const lockRef = doc(db, 'locks', lockId);
    const ocupacionRef = doc(db, 'ocupacionTemporal', lockId);
    const expiresAt = Timestamp.fromMillis(Date.now() + LOCK_DURATION_MS - CLOCK_SKEW_MARGIN_MS);

    batch.update(lockRef, { expiresAt });
    batch.update(ocupacionRef, { expiresAt });

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

    /**
   * Valida estructura de un lock
   * @param {Object} lock - Datos del lock
   * @returns {Object} { valido: boolean, razon?: string }
   */
  validarLock(lock) {
    if (!lock) return { valido: false, razon: 'lock_nulo' };
    if (!lock.userId) return { valido: false, razon: 'sin_userId' };
    if (!lock.fecha) return { valido: false, razon: 'sin_fecha' };
    if (!lock.horaId) return { valido: false, razon: 'sin_horaId' };
    if (!lock.instructorId) return { valido: false, razon: 'sin_instructorId' };
    if (!lock.expiresAt) return { valido: false, razon: 'sin_expiresAt' };
    
    const ahora = Date.now();
    if (lock.expiresAt.toMillis() <= ahora) {
      return { valido: false, razon: 'expirado' };
    }
    
    // Verificar moto si aplica (el campo necesitaMoto no está en locks actualmente;
    // se valida si motoAsignadaId es null y no se puede determinar, se omite)
    // Para evitar falsos positivos, no validamos moto aquí a menos que sea obligatoria.
    
    return { valido: true };
  },

  /**
   * Purga locks corruptos para una fecha específica
   * @param {string} fecha - Fecha a purgar (YYYY-MM-DD)
   * @returns {Promise<{success: boolean, purgados: number}>}
   */
     async purgarLocksCorruptos(fecha) {
    try {
      const locksSnapshot = await getDocs(
        query(collection(db, 'locks'), where('fecha', '==', fecha))
      );
      const ocupacionSnapshot = await getDocs(
        query(collection(db, 'ocupacionTemporal'), where('fecha', '==', fecha))
      );

      const corruptos = [];

      locksSnapshot.docs.forEach(docSnap => {
        const lock = docSnap.data();
        const validacion = this.validarLock(lock);
        if (!validacion.valido) {
          corruptos.push({ id: docSnap.id, razon: validacion.razon });
        }
      });

      const locksIds = new Set(locksSnapshot.docs.map(d => d.id));
      ocupacionSnapshot.docs.forEach(docSnap => {
        if (locksIds.has(docSnap.id)) return;
        const temp = docSnap.data();
        const validacion = this.validarLock(temp);
        if (!validacion.valido) {
          corruptos.push({ id: docSnap.id, razon: validacion.razon });
        }
      });

      if (corruptos.length === 0) {
        return { success: true, purgados: 0 };
      }

      const resultados = await Promise.allSettled(
        corruptos.map(async (lock) => {
          try {
            await deleteDoc(doc(db, 'locks', lock.id));
            await deleteDoc(doc(db, 'ocupacionTemporal', lock.id));
            return { id: lock.id, eliminado: true, razon: lock.razon };
          } catch (error) {
            console.warn(`[LockService] No se pudo purgar ${lock.id} (${lock.razon}):`, error.message);
            return { id: lock.id, eliminado: false, razon: lock.razon, error: error.message };
          }
        })
      );

      const purgados = resultados.filter(r => r.status === 'fulfilled' && r.value.eliminado).length;
      const fallidos = resultados.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.eliminado)).length;

      console.log(`[LockService] Purga completada para ${fecha}: ${purgados} eliminados, ${fallidos} fallidos`);

      return { success: true, purgados, fallidos };
    } catch (error) {
      console.error('[LockService] Error purgando locks:', error);
      return { success: false, purgados: 0, error };
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
        console.log('[LockService] Locks recibidos:', locks.length, 'Primeros locks:', locks.slice(0, 2).map(l => l.id));
      callback(locks);
    }, (error) => {
      console.warn('[LockService] Error en listener de ocupación temporal:', error);
    });

    return () => unsub();
  },
};