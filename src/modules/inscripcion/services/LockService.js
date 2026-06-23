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

    const interval = setInterval(async () => {
      try {
        const snap = await getDocs(q);
        const locks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        callback(locks);
      } catch (e) {
        // Error en polling de locks
      }
    }, 5000);

    getDocs(q).then(snap => {
      const locks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(locks);
    }).catch(() => {});

    return () => clearInterval(interval);
  },

// @build: 2026-06-22.REFACTOR | id: LOCK-BUSCAR-FECHA | desc: Método para buscar próxima fecha disponible, extraído de InscripcionView.
async buscarProximaFechaDisponible(fecha1, today, maxDate, horarios, getTodayStr) {
  try {
    const basePath = 'artifacts/motoescuela-pro-v1/public/data';
    const hastaStr = maxDate;
    const locksRef = collection(db, 'locks');
    const locksQ = query(locksRef, where('fecha', '>=', today), where('fecha', '<=', hastaStr));
    const locksSnap = await getDocs(locksQ);
    const reservasRef = collection(db, basePath, 'reservas');
    const reservasQ = query(reservasRef, where('fecha', '>=', today), where('fecha', '<=', hastaStr));
    const reservasSnap = await getDocs(reservasQ);
    
    const ocupacionCache = {};
    locksSnap.docs.forEach(doc => { const lock = doc.data(); if (lock.fecha && lock.horaId) ocupacionCache[`${lock.fecha}_${lock.horaId}`] = true; });
    reservasSnap.docs.forEach(doc => { const res = doc.data(); if (res.estadoPago === 'Pendiente' || res.estadoPago === 'Aprobado') { if (res.fecha && res.horaId) ocupacionCache[`${res.fecha}_${res.horaId}`] = true; if (res.fecha2 && res.horaId) ocupacionCache[`${res.fecha2}_${res.horaId}`] = true; } });
    
    const hor = (horarios||[]).filter(h => h.activo && !h.isLunch);
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
