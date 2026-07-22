import { db } from '../../shared/firebase/firebase';
import { collection, doc, setDoc, getDocs, writeBatch, Timestamp } from 'firebase/firestore';

const APP_ID = 'motoescuela-pro-v1';

const buildPath = (colName) => {
  if (colName === 'ocupacionConfirmada') return colName;
  if (colName === 'locks') return colName;
  if (colName === 'ocupacionTemporal') return colName;
  return `artifacts/${APP_ID}/public/data/${colName}`;
};

export const StaffService = {
  async crearStaff(email, password, role, data) {
    if (!email || !password || !role) {
      return { success: false, error: { code: 'missing-fields', message: 'Faltan datos del staff' } };
    }
    try {
      const { getAuth, createUserWithEmailAndPassword } = await import('firebase/auth');
      const auth = getAuth();
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCred.user.uid;
      const collectionName = role === 'instructor' ? 'instructores' : 'proveedores';
      const ref = doc(db, buildPath(collectionName), uid);
      await setDoc(ref, { ...data, email, uid });
      return { success: true, data: { uid } };
    } catch (error) {
      return { success: false, error: { code: error.code || 'unknown', message: error.message } };
    }
  },

  async seedDatabase() {
    try {
      const basePath = `artifacts/${APP_ID}/public/data`;

      const configSnap = await getDocs(collection(db, basePath, 'configuraciones'));
      if (!configSnap.empty) {
        return { success: false, error: { code: 'already-seeded', message: 'La base de datos ya tiene datos.' } };
      }

      await setDoc(doc(db, basePath, 'configuraciones', 'main'), {
        monedaPagoStaff: 'USD',
        tasaUSD: 600,
        tasaEUR: 700,
        precioBase: 35,
        recargoGuarenas: 5,
        recargoSinBici: 10,
        descuentoMotoPropia: 5,
        descuentoPromo: 0,
        pagoInstructor: 15,
        pagoProveedor: 10,
        autoTasas: false,
        pagoMovilEscuela: {
          banco: 'Banesco',
          telefono: '04127185256',
          cedula: '19497344',
          codigo: '0134'
        },
        monedaCobroClientes: 'EUR'
      });

      await setDoc(doc(db, basePath, 'sedes', 'sede1'), { id: 'sede1', nombre: 'Guarenas', direccion: 'Av. Principal', activo: true });
      await setDoc(doc(db, basePath, 'sedes', 'sede2'), { id: 'sede2', nombre: 'Caracas', direccion: 'Centro', activo: true });

      const horarios = [
        { id: 'h1', label: '08:00 AM - 10:00 AM', activo: true, isLunch: false },
        { id: 'h2', label: '10:00 AM - 12:00 PM', activo: true, isLunch: false },
        { id: 'h3', label: '12:00 PM - 02:00 PM', activo: true, isLunch: true },
        { id: 'h4', label: '02:00 PM - 04:00 PM', activo: true, isLunch: false },
        { id: 'h5', label: '04:00 PM - 06:00 PM', activo: true, isLunch: false }
      ];
      for (const h of horarios) {
        await setDoc(doc(db, basePath, 'horarios', h.id), h);
      }

      await setDoc(doc(db, basePath, 'cursos', 'c1'), { id: 'c1', nombre: 'Básico', modulos: ['Teoría', 'Práctica'], activo: true });
      await setDoc(doc(db, basePath, 'cursos', 'c2'), { id: 'c2', nombre: 'Intermedio', modulos: ['Teoría', 'Práctica', 'Carretera'], activo: true });

      await setDoc(doc(db, basePath, 'instructores', '095xu7THRRXnvRNfCVkm4xFy1vm1'), {
        id: '095xu7THRRXnvRNfCVkm4xFy1vm1', nombre: 'Armando', email: 'armandoaventurasve@gmail.com', sedes: ['sede2', 'sede1'], activo: true, esPrincipal: true
      });
      await setDoc(doc(db, basePath, 'instructores', 'oImFwkGGjDRxxG2unUB7T762IuA2'), {
        id: 'oImFwkGGjDRxxG2unUB7T762IuA2', nombre: 'Leonardo', email: 'leonardo@example.com', sedes: ['sede2'], activo: true, esPrincipal: false
      });

      await setDoc(doc(db, basePath, 'motos', '1782055081899'), { id: '1782055081899', tipo: 'Automática', sedes: ['sede1', 'sede2'], activo: true });
      await setDoc(doc(db, basePath, 'motos', '1782055104779'), { id: '1782055104779', tipo: 'Sincrónica', sedes: ['sede2'], activo: true });

      await setDoc(doc(db, basePath, 'admins', 'admin1'), { email: 'armandoaventurasve@gmail.com', role: 'admin' });

      return { success: true };
    } catch (e) {
      return { success: false, error: { code: 'seed-error', message: e.message } };
    }
  },

  async cleanExpiredLocks() {
    const { LockService } = await import('../../inscripcion/services/LockService');
    const today = new Date().toISOString().split('T')[0];
    return await LockService.limpiarLocksExpirados(today, 'admin');
  }
};
