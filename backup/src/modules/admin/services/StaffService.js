// @build: 2026-06-17.13-00-00 | id: B51-C2 | desc: Servicio de staff con crearStaff, seedDatabase y cleanExpiredLocks
import { collection, doc, setDoc, getDocs } from 'firebase/firestore';
import { db } from '../../shared/firebase/firebase';
import { LockService } from '../../inscripcion/services/LockService';

const APP_ID = 'motoescuela-pro-v1';

const buildPath = (colName) => {
  return `artifacts/${APP_ID}/public/data/${colName}`;
};

const getTodayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const StaffService = {
  async crearStaff(email, password, rol, datos) {
    if (!email || !password || !rol) {
      return { success: false, error: { code: 'missing-fields', message: 'Faltan datos del staff' } };
    }
    try {
      const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
      const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, returnSecureToken: false })
        }
      );
      const json = await res.json();
      if (json.error) {
        const mensaje = json.error.message || 'Error desconocido';
        return { success: false, error: { code: json.error.message, message: mensaje } };
      }
      const uid = json.localId;
      const path = buildPath(rol === 'instructor' ? 'instructores' : 'proveedores');
      await setDoc(doc(db, path, uid), { ...datos, email, uid });
      return { success: true, data: { uid } };
    } catch (error) {
      return { success: false, error: { code: 'network-error', message: error.message } };
    }
  },

  async seedDatabase() {
    const basePath = buildPath('');
    try {
      const sedesSnap = await getDocs(collection(db, basePath + 'sedes'));
      if (!sedesSnap.empty) return { success: false, error: { code: 'already-seeded', message: 'La base de datos ya tiene datos.' } };

      await setDoc(doc(db, basePath + 'sedes', 'sede1'), { id: 'sede1', nombre: 'Guarenas', direccion: 'Av. Principal', activo: true });
      await setDoc(doc(db, basePath + 'sedes', 'sede2'), { id: 'sede2', nombre: 'Caracas', direccion: 'Centro', activo: true });

      await setDoc(doc(db, basePath + 'horarios', 'h1'), { id: 'h1', label: '08:00 AM - 10:00 AM', activo: true, isLunch: false });
      await setDoc(doc(db, basePath + 'horarios', 'h2'), { id: 'h2', label: '10:00 AM - 12:00 PM', activo: true, isLunch: false });
      await setDoc(doc(db, basePath + 'horarios', 'h3'), { id: 'h3', label: '12:00 PM - 02:00 PM', activo: true, isLunch: true });
      await setDoc(doc(db, basePath + 'horarios', 'h4'), { id: 'h4', label: '02:00 PM - 04:00 PM', activo: true, isLunch: false });
      await setDoc(doc(db, basePath + 'horarios', 'h5'), { id: 'h5', label: '04:00 PM - 06:00 PM', activo: true, isLunch: false });

      await setDoc(doc(db, basePath + 'cursos', 'c1'), { id: 'c1', nombre: 'Básico', modulos: ['Teoría', 'Práctica'], activo: true });
      await setDoc(doc(db, basePath + 'cursos', 'c2'), { id: 'c2', nombre: 'Intermedio', modulos: ['Teoría', 'Práctica', 'Carretera'], activo: true });

      return { success: true };
    } catch (error) {
      return { success: false, error: { code: 'seed-error', message: error.message } };
    }
  },

  async cleanExpiredLocks() {
    return await LockService.limpiarLocksExpirados(getTodayStr());
  }
};
