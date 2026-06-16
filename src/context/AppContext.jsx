// @build: 2026-06-16.10-00-00 | id: B5 | desc: Corrección de appId a motoescuela-dev
import { useState, useEffect, useCallback } from 'react';
import { AuthService } from '../services/AuthService';
import { LockService } from '../services/LockService';
import { AppContext } from './AppContextValue';
import { collection, doc, setDoc, onSnapshot, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

const INITIAL_CONFIG = {
  monedaPagoStaff: 'USD', tasaUSD: 36.50, tasaEUR: 39.10, precioBase: 35, recargoGuarenas: 5,
  recargoSinBici: 10, descuentoMotoPropia: 5, descuentoPromo: 0, pagoInstructor: 15, pagoProveedor: 10,
  autoTasas: false, pagoMovilEscuela: { banco: 'Banesco', telefono: '04141234567', cedula: '12345678' }
};

// -------------------------------------------------------------------
// CONSTANTE: APP_ID
// Identificador de la aplicación en Firestore (corregido)
// -------------------------------------------------------------------
const APP_ID = 'motoescuela-dev';

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

  useEffect(() => {
    const unsubscribe = AuthService.onAuthChange((currentUser) => {
      setFbUser(currentUser);
      setAuthReady(true);
      if (!currentUser) setUser(null);
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

  // -----------------------------------------------------------------
  // FUNCIÓN: buildPath
  // Construye la ruta base para colecciones dentro de Firestore
  // -----------------------------------------------------------------
  const buildPath = (colName) => {
    return `artifacts/${APP_ID}/public/data/${colName}`;
  };

  const useFirebaseCollection = (colName, initialData = [], condition = true, queryConstraint = null, requireAuth = true) => {
    const [data, setData] = useState(initialData);
    useEffect(() => {
      if (!db || (requireAuth && (!fbUser || !authReady)) || !condition) return;
      let ref = collection(db, buildPath(colName));
      if (queryConstraint) ref = query(ref, queryConstraint);
      const unsub = onSnapshot(ref, (snap) => {
        if (!snap.empty) setData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        else setData([]);
      }, (err) => { if (err.code !== 'permission-denied') console.error(`Error en colección ${colName}:`, err); });
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
  const [sedes, saveSede] = useFirebaseCollection('sedes', [], true, null, false);
  const [horarios, saveHorario] = useFirebaseCollection('horarios', [], true, null, false);
  const [cursos, saveCurso] = useFirebaseCollection('cursos', [], true, null, false);
  const [instructores, saveInstructor] = useFirebaseCollection('instructores', [], true, null, false);
  const [proveedores, saveProveedor] = useFirebaseCollection('proveedores', [], true, null, false);
  const [motos, saveMoto] = useFirebaseCollection('motos', [], true, null, false);

  const fechaHace30Dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [reservas, saveReserva] = useFirebaseCollection('reservas', [], true, where('fecha1', '>=', fechaHace30Dias), false);
  const [movimientos, saveMovimiento] = useFirebaseCollection('movimientos', [], isAdmin, where('fecha', '>=', fechaHace30Dias));
  const [admins, saveAdmin] = useFirebaseCollection('admins', [], isAdmin);

  const getTodayStr = useCallback(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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

  const contextValue = {
    config, saveConfig, sedes, saveSede, horarios, saveHorario, cursos, saveCurso,
    instructores, saveInstructor, proveedores, saveProveedor, motos, saveMoto,
    reservas, saveReserva, movimientos, saveMovimiento, admins, saveAdmin,
    user, setUser, toast, showToast, autoLoginData, setAutoLoginData,
    getTodayStr, isReservaActiva, isReservationConflict, findAvailableResources, calcularBaseUSD,
    fbUser, authReady, loginWithGoogle, loginWithEmail, loginEstudiante, crearEstudiante, logoutUser,
    activeLocks, suscribirLocks
  };

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};
