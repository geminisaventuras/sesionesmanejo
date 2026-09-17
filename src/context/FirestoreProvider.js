// @build: 2026-09-04 | id: OPTIMIZACION-FIRESTORE-V3 | backup: FirestoreProvider.backup-20260904-000000 | desc: Catálogos getDocs, reservas admin onSnapshot limit 100, sin ocupacionConfirmada global
import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, doc, setDoc, updateDoc, onSnapshot, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { LockService } from '../services/LockService';
import { StaffService } from '../modules/admin/services/StaffService';

const APP_ID = 'motoescuela-pro-v1';

export function useFirestoreProvider(fbUser, authReady, isAdmin, showToast, user) {
  const [activeLocks, setActiveLocks] = useState([]);
  const prevReservasRef = useRef([]);

  const buildPath = useCallback((colName) => {
    return 'artifacts/' + APP_ID + '/public/data/' + colName;
  }, []);

  const [sedes, setSedes] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [metodosPago, setMetodosPago] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [instructores, setInstructores] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [motos, setMotos] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [reservas, setReservas] = useState([]);

  const cargarCatalogos = useCallback(async () => {
    if (!fbUser || !authReady) return;
    try {
           const [sedesSnap, horariosSnap, metodosPagoSnap, cursosSnap, instructoresSnap, proveedoresSnap, motosSnap, adminsSnap, movimientosSnap] = await Promise.all([
        getDocs(collection(db, buildPath('sedes'))),
        getDocs(collection(db, buildPath('horarios'))),
        getDocs(collection(db, buildPath('metodosPago'))),
        getDocs(collection(db, buildPath('cursos'))),
        getDocs(collection(db, buildPath('instructores'))),
        getDocs(collection(db, buildPath('proveedores'))),
        getDocs(collection(db, buildPath('motos'))),
        isAdmin ? getDocs(collection(db, buildPath('admins'))) : Promise.resolve({ docs: [] }),
        isAdmin ? getDocs(collection(db, buildPath('movimientos'))) : Promise.resolve({ docs: [] })
      ]);

      setSedes(sedesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            setHorarios(horariosSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setMetodosPago(metodosPagoSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setCursos(cursosSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setInstructores(instructoresSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setProveedores(proveedoresSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setMotos(motosSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setAdmins(adminsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setMovimientos(movimientosSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error('[FirestoreProvider] Error cargando catálogos:', error);
    }
  }, [fbUser, authReady, isAdmin, buildPath]);

  useEffect(() => { cargarCatalogos(); }, [cargarCatalogos]);

  const saveCatalogo = (setter) => async (item) => {
    const id = item.id ? String(item.id) : Date.now().toString();
    const newItem = { ...item, id };
    try {
            const colName = setter === setSedes ? 'sedes' : setter === setHorarios ? 'horarios' : setter === setMetodosPago ? 'metodosPago' : setter === setCursos ? 'cursos' : setter === setInstructores ? 'instructores' : setter === setProveedores ? 'proveedores' : setter === setMotos ? 'motos' : setter === setAdmins ? 'admins' : 'movimientos';
      await setDoc(doc(db, buildPath(colName), id), newItem);
      setter(prev => prev.find(i => String(i.id) === id) ? prev.map(i => String(i.id) === id ? newItem : i) : [...prev, newItem]);
      return newItem;
    } catch (error) {
      console.error(`[FirestoreProvider] Error guardando en ${colName}:`, error);
      throw error;
    }
  };

  const saveSede = saveCatalogo(setSedes);
    const saveHorario = saveCatalogo(setHorarios);
  const saveMetodoPago = saveCatalogo(setMetodosPago);
  const saveCurso = saveCatalogo(setCursos);
  const saveInstructor = saveCatalogo(setInstructores);
  const saveProveedorRaw = saveCatalogo(setProveedores);
  const saveMoto = saveCatalogo(setMotos);
  const saveAdmin = saveCatalogo(setAdmins);
  const saveMovimientoRaw = saveCatalogo(setMovimientos);

  useEffect(() => {
    if (!isAdmin || !fbUser || !authReady) { setReservas([]); return; }
    const q = query(collection(db, buildPath('reservas')), orderBy('fecha', 'desc'), limit(100));
    const unsub = onSnapshot(q, (snap) => setReservas(snap.docs.map(d => ({ id: d.id, ...d.data() }))), (err) => { console.warn('[FirestoreProvider] Error en reservas:', err.code); setReservas([]); });
    return () => unsub();
  }, [isAdmin, fbUser, authReady, buildPath]);

    useEffect(() => {
    if (!fbUser || !authReady) { setNotifications([]); return; }

    const ref = collection(db, buildPath('notificaciones'));

    if (isAdmin) {
      const q = query(ref, orderBy('fecha', 'desc'), limit(100));
      const unsub = onSnapshot(q, (snap) => setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() }))), (err) => { console.warn('[FirestoreProvider] Error en notificaciones:', err.code); setNotifications([]); });
      return () => unsub();
    }

    // No admin: cargar una sola vez con getDocs
    const cargarNotificaciones = async () => {
      try {
        const q = query(ref, where('userId', '==', user?.uid || ''), orderBy('fecha', 'desc'), limit(50));
        const snapshot = await getDocs(q);
        setNotifications(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.warn('[FirestoreProvider] Error en notificaciones:', err.code || err.message);
        setNotifications([]);
      }
    };

    cargarNotificaciones();
  }, [fbUser, authReady, isAdmin, user?.uid, buildPath]);

  const saveReserva = async (item) => {
    const id = item.id ? String(item.id) : Date.now().toString();
    const newItem = { ...item, id };
    await setDoc(doc(db, buildPath('reservas'), id), newItem);
    setReservas(prev => prev.find(i => String(i.id) === id) ? prev.map(i => String(i.id) === id ? newItem : i) : [...prev, newItem]);
    return newItem;
  };

  const saveNotificacion = async (item) => {
    const id = item.id ? String(item.id) : Date.now().toString();
    const newItem = { ...item, id };
    await setDoc(doc(db, buildPath('notificaciones'), id), newItem);
    setNotifications(prev => [...prev, newItem]);
    return newItem;
  };

  const markNotificationRead = useCallback(async (id) => {
    if (!db || !fbUser) return;
    await updateDoc(doc(db, buildPath('notificaciones'), id), { leida: true });
  }, [fbUser, buildPath]);

  const saveMovimiento = useCallback(async (item) => {
    const itemConUsuario = { ...item, userId: fbUser?.uid || user?.uid || '' };
    await saveMovimientoRaw(itemConUsuario);
  }, [fbUser, user, saveMovimientoRaw]);

  const getTodayStr = useCallback(() => {
    const now = new Date();
    const options = { timeZone: 'America/Caracas', year: 'numeric', month: '2-digit', day: '2-digit' };
    const parts = new Intl.DateTimeFormat('en-CA', options).formatToParts(now);
    const dateObj = {};
    parts.forEach(({ type, value }) => { if (type !== 'literal') dateObj[type] = value; });
    return `${dateObj.year}-${dateObj.month}-${dateObj.day}`;
  }, []);

  const isReservaActiva = useCallback((r) => {
    if (!r) return false;
    if (r.estadoPago === 'Aprobado' || r.estadoPago === 'Pendiente') return true;
    if (r.estadoPago === 'Rechazado') {
      if (r.rechazadoEn) return (Date.now() - r.rechazadoEn) / 60000 < 20;
      return true;
    }
    if (r.estadoPago === 'Cancelado') return false;
    return false;
  }, []);

 const isReservationConflict = useCallback((r, fecha1, fecha2, horaId) => {
  const f1 = r.fecha;
  const f2 = r.fecha2 || r.fecha;
  return String(r.horaId) === String(horaId) && isReservaActiva(r) &&
    (f1 === fecha1 || f1 === fecha2 || f2 === fecha1 || f2 === fecha2);
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
      const motosDelTipo = (motos || []).filter(m => m.activo && m.tipo === tipoMoto && (m.sedes || []).includes(sedeId));
      const ocupadas = reservas.filter(r => isReservationConflict(r, fecha1, fecha2, horaId) && r.traeMoto !== 'Sí').map(r => String(r.motoAsignadaId));
      const libre = motosDelTipo.find(m => !ocupadas.includes(String(m.id)) && !isLockedResource(selected.id, m.id));
      if (!libre) return null;
      motoId = libre.id;
    }
    return { instructorId: selected.id, motoAsignadaId: motoId };
  }, [instructores, motos, reservas, isReservationConflict]);

  const suscribirLocks = useCallback((fecha) => {
    return LockService.escucharLocks(fecha, (locks) => setActiveLocks(locks));
  }, []);

  const seedDatabase = async () => {
    const res = await StaffService.seedDatabase();
    if (res.success) showToast('Base de datos inicializada correctamente.', 'success');
    else if (res.error.code === 'already-seeded') showToast('La base de datos ya tiene datos.', 'info');
    else showToast(res.error.message, 'error');
  };

  const cleanExpiredLocks = async () => { await StaffService.cleanExpiredLocks(); };

  const createStaffUser = async (email, password, role, data) => {
    return await StaffService.crearStaff(email, password, role, data);
  };

  const handleSaveInstructorSeguro = async (datos) => {
    if (!datos.id && datos.email && datos.password) {
      const res = await StaffService.crearStaff(datos.email, datos.password, 'instructor', datos);
      if (!res.success) { showToast(res.error.message, 'error'); return; }
      await saveInstructor({ ...datos, id: res.data.uid });
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
      await saveProveedorRaw({ ...datos, id: res.data.uid });
      showToast('Usuario creado correctamente', 'success');
      return;
    }
    await saveProveedorRaw(datos);
    showToast('Guardado exitoso');
  };

  const refreshCatalogos = useCallback(() => cargarCatalogos(), [cargarCatalogos]);

    return {
    sedes, saveSede, horarios, saveHorario, metodosPago, saveMetodoPago, cursos, saveCurso,
    instructores, saveInstructor, handleSaveInstructorSeguro,
    proveedores, saveProveedorSeguro, motos, saveMoto,
    reservas, saveReserva, movimientos, saveMovimiento, admins, saveAdmin,
    notifications, saveNotificacion, markNotificationRead,
    activeLocks, suscribirLocks,
    getTodayStr, isReservaActiva, isReservationConflict, findAvailableResources,
    seedDatabase, cleanExpiredLocks, createStaffUser,
    prevReservasRef,
    refreshCatalogos
  };
}
