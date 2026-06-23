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
    // ✅ RESTAURADO: Filtro expiresAt para usar el índice compuesto (fecha, expiresAt)
    const q = query(
      ocupacionRef,
      where('fecha', '==', fecha),
      where('expiresAt', '>', Timestamp.now())
    );

    const unsub = onSnapshot(q, (snap) => {
      const ahora = Date.now();
      const locks = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(lock => {
          if (!lock.expiresAt || !lock.expiresAt.toMillis) return true;
          return lock.expiresAt.toMillis() > ahora;
        });
      callback(locks);
    }, (error) => {
      console.warn('[LockService] Error en listener de ocupación temporal:', error);
    });

    return () => unsub();
  },

  async buscarProximaFechaDisponible(fecha1, today, maxDate, horarios) {
    try {
      const basePath = 'artifacts/motoescuela-pro-v1/public/data';
      const hastaStr = maxDate;
      const reservasRef = collection(db, basePath, 'reservas');
      const reservasQ = query(reservasRef, where('fecha', '>=', today), where('fecha', '<=', hastaStr));
      const reservasSnap = await getDocs(reservasQ);

      const ocupacionCache = {};
      reservasSnap.docs.forEach(doc => {
        const res = doc.data();
        if (res.estadoPago === 'Pendiente' || res.estadoPago === 'Aprobado') {
          if (res.fecha && res.horaId) ocupacionCache[`${res.fecha}_${res.horaId}`] = true;
          if (res.fecha2 && res.horaId) ocupacionCache[`${res.fecha2}_${res.horaId}`] = true;
        }
      });

      const hor = (horarios || []).filter(h => h.activo && !h.isLunch);
      let inicioBusqueda = new Date(fecha1 + 'T12:00:00');
      if (isNaN(inicioBusqueda.getTime())) inicioBusqueda = new Date(today + 'T12:00:00');
      inicioBusqueda.setDate(inicioBusqueda.getDate() + 1);
      let fechaIter = inicioBusqueda;
      const fin = new Date(hastaStr + 'T12:00:00');

      while (fechaIter <= fin) {
        const fechaStr = fechaIter.toISOString().split('T')[0];
        if (fechaStr !== fecha1) {
          const hayDisponible = hor.some(b => {
            const key = `${fechaStr}_${b.id}`;
            return !ocupacionCache[key];
          });
          if (hayDisponible) return fechaStr;
        }
        fechaIter.setDate(fechaIter.getDate() + 1);
      }
      return null;
    } catch (e) { return null; }
  },
};