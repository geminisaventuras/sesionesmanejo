// @build: 2026-06-21.FASE3 | id: FIRESTORE-PROVIDER | desc: Hook de datos Firestore con suscripción a notificaciones para admin y estudiantes
import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, doc, setDoc, updateDoc, onSnapshot, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { LockService } from '../services/LockService';
import { StaffService } from '../modules/admin/services/StaffService';

const APP_ID = 'motoescuela-pro-v1';

export function useFirestoreProvider(fbUser, authReady, isAdmin, showToast, user) {
  const [activeLocks, setActiveLocks] = useState([]);
  const prevReservasRef = useRef([]);

  const buildPath = useCallback((colName) => `artifacts/${APP_ID}/public/data/${colName}`, []);

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
    return [data, saveItem, setData];
  };

  const [sedes, saveSede] = useFirebaseCollection('sedes', [], true, null, true);
  const [horarios, saveHorario] = useFirebaseCollection('horarios', [], true, null, true);
  const [cursos, saveCurso] = useFirebaseCollection('cursos', [], true, null, true);
  const [instructores, saveInstructor] = useFirebaseCollection('instructores', [], true, null, true);
  const [proveedores, saveProveedorRaw] = useFirebaseCollection('proveedores', [], true, null, true);
  const [motos, saveMoto] = useFirebaseCollection('motos', [], true, null, true);
  const [reservas, saveReserva] = useFirebaseCollection('reservas', [], true, null, true);
  const [movimientos, saveMovimientoRaw] = useFirebaseCollection('movimientos', [], isAdmin, null);
  const [admins, saveAdmin] = useFirebaseCollection('admins', [], isAdmin);

  // ✅ Notificaciones: admin ve todas, estudiante filtra por userId
  const notifCondition = isAdmin || !!user?.uid;
  const notifQuery = isAdmin ? null : where('userId', '==', user?.uid || '');
  const [notifications, saveNotificacion] = useFirebaseCollection('notificaciones', [], notifCondition, notifQuery, true);

  const saveMovimiento = useCallback(async (item) => {
    const itemConUsuario = { ...item, userId: fbUser?.uid || user?.uid || '' };
    await saveMovimientoRaw(itemConUsuario);
  }, [fbUser, user, saveMovimientoRaw]);

  const markNotificationRead = useCallback(async (id) => {
    if (!db || !fbUser) return;
    await updateDoc(doc(db, buildPath('notificaciones'), id), { leida: true });
  }, [fbUser, buildPath]);

  const getTodayStr = useCallback(() => {
    const now = new Date();
    const options = {
      timeZone: 'America/Caracas',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    };
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
      if (r.rechazadoEn) return (Date.now() - r.rechazadoEn) / 60000 < 20;
      return true;
    }
    if (r.estadoPago === 'Cancelado') return false;
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
    await saveProveedorRaw(datos);
    showToast('Guardado exitoso');
  };

  return {
    sedes, saveSede, horarios, saveHorario, cursos, saveCurso,
    instructores, saveInstructor, handleSaveInstructorSeguro,
    proveedores, saveProveedorSeguro, motos, saveMoto,
    reservas, saveReserva, movimientos, saveMovimiento, admins, saveAdmin,
    notifications, saveNotificacion, markNotificationRead,
    activeLocks, suscribirLocks,
    getTodayStr, isReservaActiva, isReservationConflict, findAvailableResources,
    seedDatabase, cleanExpiredLocks, createStaffUser,
    prevReservasRef
  };
}