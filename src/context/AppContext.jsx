// @build: 2026-06-18.07-30-00 | id: B51 | desc: Lógica de creación de staff centralizada en el contexto + Corrección Timezone
import { useState, useEffect, useCallback } from 'react';
import { AuthService } from '../services/AuthService';
import { LockService } from '../services/LockService';
import { StaffService } from '../modules/admin/services/StaffService';
import { AppContext } from './AppContextValue';
import { collection, doc, setDoc, onSnapshot, query, where, getDocs } from 'firebase/firestore';
// ✅ CORRECCIÓN: Importación correcta desde la raíz del proyecto
import { db } from '../firebase';

const INITIAL_CONFIG = {
  monedaPagoStaff: 'USD', tasaUSD: 36.50, tasaEUR: 39.10, precioBase: 35, recargoGuarenas: 5,
  recargoSinBici: 10, descuentoMotoPropia: 5, descuentoPromo: 0, pagoInstructor: 15, pagoProveedor: 10,
  autoTasas: false, pagoMovilEscuela: { banco: 'Banesco', telefono: '04141234567', cedula: '12345678' }, monedaCobroClientes: 'EUR'
};

const APP_ID = 'motoescuela-pro-v1';

// Se recomienda mover esto a variables de entorno .env
const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'admin@motoescuela.local';

export const AppProvider = ({ children }) => {
  const [fbUser, setFbUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState(null);
  const [toast, setToast] = useState(null);
  const [autoLoginData, setAutoLoginData] = useState(null);
  const [activeLocks, setActiveLocks] = useState([]);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const restoreUserRole = async (currentUser) => {
    if (!currentUser || !currentUser.email) return;
    const email = currentUser.email.toLowerCase();
    if (email === ADMIN_EMAIL.toLowerCase()) {
      setUser({ role: 'admin', data: { nombre: 'Administrador', email }, uid: currentUser.uid });
      return;
    }
    try {
      const basePath = `artifacts/${APP_ID}/public/data`;
      const instQuery = query(collection(db, basePath, 'instructores'), where('email', '==', email));
      const instSnap = await getDocs(instQuery);
      if (!instSnap.empty) {
        const instData = instSnap.docs[0].data();
        if (!instData.activo) { setUser(null); showToast('Tu cuenta de instructor está inactiva', 'error'); return; }
        setUser({ role: 'instructor', data: instData, uid: currentUser.uid });
        return;
      }
      const provQuery = query(collection(db, basePath, 'proveedores'), where('email', '==', email));
      const provSnap = await getDocs(provQuery);
      if (!provSnap.empty) {
        const provData = provSnap.docs[0].data();
        if (!provData.activo) { setUser(null); showToast('Tu cuenta de proveedor está inactiva', 'error'); return; }
        setUser({ role: 'proveedor', data: provData, uid: currentUser.uid });
        return;
      }
      // Si no es staff, asumir que es estudiante
      const cedulaEstudiante = currentUser.email?.split('@')[0] || '';
      setUser({ role: 'estudiante', data: { cedula: cedulaEstudiante }, uid: currentUser.uid });
      
    } catch (e) {
      // Error restaurando rol
    }
  };

  useEffect(() => {
    const unsubscribe = AuthService.onAuthChange((currentUser) => {
      setFbUser(currentUser);
      if (currentUser) { restoreUserRole(currentUser).finally(() => setAuthReady(true)); }
      else { setUser(null); setAuthReady(true); }
    });
    return () => unsubscribe();
  }, []);

  const loginWithGoogle = useCallback(async () => {
    const res = await AuthService.loginConGoogle();
    if (!res.success) showToast(res.error.message, 'error');
    return res;
  }, [showToast]);

  const loginWithEmail = useCallback(async (email, password) => {
    const res = await AuthService.loginConEmail(email, password);
    if (!res.success) showToast(res.error.message, 'error');
    return res;
  }, [showToast]);

  const loginEstudiante = useCallback(async (cedula, pin) => {
    const res = await AuthService.loginEstudiante(cedula, pin);
    if (!res.success) showToast(res.error.message, 'error');
    return res;
  }, [showToast]);

  const crearEstudiante = useCallback(async (cedula) => {
    const res = await AuthService.crearEstudiante(cedula);
    if (!res.success) showToast(res.error.message, 'error');
    return res;
  }, [showToast]);

  const logoutUser = useCallback(async () => {
    const res = await AuthService.logout();
    if (res.success) { setUser(null); }
    else showToast(res.error.message, 'error');
  }, [showToast]);

  const suscribirLocks = useCallback((fecha) => {
    return LockService.escucharLocks(fecha, (locks) => setActiveLocks(locks));
  }, []);

  const buildPath = (colName) => `artifacts/${APP_ID}/public/data/${colName}`;

  const useFirebaseCollection = (colName, initialData = [], condition = true, queryConstraint = null, requireAuth = true) => {
    const [data, setData] = useState(initialData);
    useEffect(() => {
      if (!db || (requireAuth && (!fbUser || !authReady)) || !condition) return;
      let ref = collection(db, buildPath(colName));
      if (queryConstraint) ref = query(ref, queryConstraint);
      const unsub = onSnapshot(ref, (snap) => {
        if (!snap.empty) setData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        else setData([]);
      }, (err) => { 
        // Error en colección (silencioso para permisos denegados)
      });
      return () => unsub();
    }, [fbUser, authReady, condition, colName, requireAuth]);
    const saveItem = async (item) => {
      const id = item.id ? String(item.id) : Date.now().toString();
      const newItem = { ...item, id };
      if (db && fbUser) await setDoc(doc(db, buildPath(colName), id), newItem);
      else setData(prev => prev.find(i => String(i.id) === id) ? prev.map(i => String(i.id) === id ? newItem : i) : [...prev, newItem]);
      return newItem;
    };
    return [data, saveItem];
  };

  const useFirebaseConfig = () => {
    const [cfg, setCfg] = useState(INITIAL_CONFIG);
    useEffect(() => {
      if (!db || !authReady) return;
      const docRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'configuraciones', 'main');
      const unsub = onSnapshot(docRef, (snap) => { if (snap.exists()) setCfg(snap.data()); else setCfg(INITIAL_CONFIG); });
      return () => unsub();
    }, [authReady]);
    const saveCfg = async (newCfg) => { if (db && fbUser && authReady) await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'configuraciones', 'main'), newCfg); else setCfg(newCfg); };
    return [cfg, saveCfg];
  };

  const isAdmin = user?.role === 'admin';
  const [config, saveConfig] = useFirebaseConfig();
  const [sedes, saveSede] = useFirebaseCollection('sedes', [], true, null, true);
  const [horarios, saveHorario] = useFirebaseCollection('horarios', [], true, null, true);
  const [cursos, saveCurso] = useFirebaseCollection('cursos', [], true, null, true);
  const [instructores, saveInstructor] = useFirebaseCollection('instructores', [], true, null, true);
  const [proveedores, saveProveedor] = useFirebaseCollection('proveedores', [], true, null, true);
  const [motos, saveMoto] = useFirebaseCollection('motos', [], true, null, true);
  const [reservas, saveReserva] = useFirebaseCollection('reservas', [], true, null, true);
  const [movimientos, saveMovimientoRaw] = useFirebaseCollection('movimientos', [], isAdmin, null);
  const [admins, saveAdmin] = useFirebaseCollection('admins', [], isAdmin);

  const saveMovimiento = useCallback(async (item) => {
    const itemConUsuario = { ...item, userId: fbUser?.uid || user?.uid || '' };
    await saveMovimientoRaw(itemConUsuario);
  }, [fbUser, user, saveMovimientoRaw]);

  // ✅ CORRECCIÓN CRÍTICA: Zona horaria de Venezuela (America/Caracas)
  const getTodayStr = useCallback(() => {
    const now = new Date();
    const options = {
      timeZone: 'America/Caracas',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    };
    
    // Formateamos manualmente a YYYY-MM-DD para evitar problemas de locale
    const parts = new Intl.DateTimeFormat('en-CA', options).formatToParts(now);
    const dateObj = {};
    parts.forEach(({ type, value }) => {
      if (type !== 'literal') dateObj[type] = value;
    });
    
    return `${dateObj.year}-${dateObj.month}-${dateObj.day}`;
  }, []);

  const isReservaActiva = useCallback((r) => {
    if (!r) return false;
    if (r.estadoPago === 'Aprobado' || r.estadoPago === 'Pendiente') return true;
    if (r.estadoPago === 'Rechazado') {
      if (r.expiraEn) return Date.now() < Number(r.expiraEn);
      if (r.rechazadoEn) return (Date.now() - r.rechazadoEn) / 60000 < 20;
    }
    return false;
  }, []);

  const isReservationConflict = useCallback((r, fecha1, fecha2, horaId) => {
    return String(r.horaId) === String(horaId) && isReservaActiva(r) &&
      (r.fecha1 === fecha1 || r.fecha1 === fecha2 || r.fecha2 === fecha1 || r.fecha2 === fecha2);
  }, [isReservaActiva]);

  const buildLockId = (fecha1, horaId, instructorId, motoAsignadaId) => {
    return `${fecha1}_${horaId}_${String(instructorId)}_${motoAsignadaId ? String(motoAsignadaId) : 'sinmoto'}`;
  };

  const findAvailableResources = useCallback(({ fecha1, fecha2, horaId, sedeId, tipoMoto, traeMoto, activeLockIds = [] }) => {
    if (!fecha1 || !fecha2 || !horaId || !sedeId || !tipoMoto) return null;
    const isLockedResource = (instructorId, motoAsignadaId) => {
      const lockId = buildLockId(fecha1, horaId, instructorId, motoAsignadaId);
      return activeLockIds.includes(lockId);
    };
    const availableInstructors = instructores
      .filter(i => i.activo && (i.sedes || []).includes(sedeId))
      .filter(inst => !reservas.some(r => String(r.instructorId) === String(inst.id) && isReservationConflict(r, fecha1, fecha2, horaId)))
      .filter(inst => !isLockedResource(inst.id, null));
    if (availableInstructors.length === 0) return null;
    const selected = availableInstructors.find(i => i.esPrincipal) || availableInstructors[0];
    let motoId = null;
    if (traeMoto !== 'Sí') {
      const motosDelTipo = (motos || []).filter(m => m.tipo === tipoMoto && m.activa && (m.sedes || []).includes(sedeId));
      const ocupadas = reservas.filter(r => isReservationConflict(r, fecha1, fecha2, horaId) && r.traeMoto !== 'Sí').map(r => String(r.motoAsignadaId));
      const libre = motosDelTipo.find(m => !ocupadas.includes(String(m.id)) && !isLockedResource(selected.id, m.id));
      if (!libre) return null;
      motoId = libre.id;
    }
    return { instructorId: selected.id, motoAsignadaId: motoId };
  }, [instructores, motos, reservas, isReservationConflict]);

  const calcularBaseUSD = useCallback((sedeId, sabeBici, traeMoto) => {
    let total = Number(config.precioBase) || 0;
    const s = sedes.find(x => String(x.id) === String(sedeId));
    if (s?.nombre === 'Guarenas') total += Number(config.recargoGuarenas) || 0;
    if (sabeBici === 'No') total += Number(config.recargoSinBici) || 0;
    if (traeMoto === 'Sí') total -= Number(config.descuentoMotoPropia) || 0;
    total -= Number(config.descuentoPromo) || 0;
    return total > 0 ? total : 0;
  }, [config, sedes]);

  // [B51] Lógica centralizada de creación de staff
  const handleSaveInstructorSeguro = async (datos) => {
    if (!datos.id && datos.email && datos.password) {
      const res = await StaffService.crearStaff(datos.email, datos.password, 'instructor', datos);
      if (!res.success) { showToast(res.error.message, 'error'); return; }
      showToast('Usuario creado correctamente', 'success');
      return;
    }
    if (datos.esPrincipal) {
      for (let inst of instructores) {
        if (String(inst.id) !== String(datos.id) && inst.esPrincipal) await saveInstructor({ ...inst, esPrincipal: false });
      }
    }
    await saveInstructor(datos);
    showToast('Guardado exitoso');
  };

  const saveProveedorSeguro = async (datos) => {
    if (!datos.id && datos.email && datos.password) {
      const res = await StaffService.crearStaff(datos.email, datos.password, 'proveedor', datos);
      if (!res.success) { showToast(res.error.message, 'error'); return; }
      showToast('Usuario creado correctamente', 'success');
      return;
    }
    await saveProveedor(datos);
    showToast('Guardado exitoso');
  };

  const createStaffUser = async (email, password, role, data) => {
    return await StaffService.crearStaff(email, password, role, data);
  };

  const seedDatabase = async () => {
    const res = await StaffService.seedDatabase();
    if (res.success) showToast('Base de datos inicializada correctamente.', 'success');
    else if (res.error.code === 'already-seeded') showToast('La base de datos ya tiene datos.', 'info');
    else showToast(res.error.message, 'error');
  };

  const cleanExpiredLocks = async () => { await StaffService.cleanExpiredLocks(); };

  const contextValue = {
    config, saveConfig, sedes, saveSede, horarios, saveHorario, cursos, saveCurso,
    instructores, saveInstructor, handleSaveInstructorSeguro, proveedores, saveProveedor: saveProveedorSeguro, motos, saveMoto,
    reservas, saveReserva, movimientos, saveMovimiento, admins, saveAdmin,
    user, setUser, toast, showToast, autoLoginData, setAutoLoginData,
    getTodayStr, isReservaActiva, isReservationConflict, findAvailableResources, calcularBaseUSD,
    fbUser, authReady, loginWithGoogle, loginWithEmail, loginEstudiante, crearEstudiante, logoutUser,
    activeLocks, suscribirLocks, createStaffUser, seedDatabase, cleanExpiredLocks
  };

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};