// @build: 2026-10-01 | id: FIX-NOTIF-DUPLICADOS-V1 | backup: FirestoreProvider.js.backup-<timestamp> | desc: saveNotificacion memoizada + idempotencia de setNotifications
import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, doc, setDoc, updateDoc, onSnapshot, query, where, orderBy, getDocs, getDoc, limit, writeBatch, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { LockService } from '../services/LockService';
import { StaffService } from '../modules/admin/services/StaffService';
import { obtenerFechaVenezuela } from '../modules/shared/utils/zonahoraria';
import { construirPreciosCurso, construirProyeccionesCursos } from '../modules/inscripcion/utils/preciosCurso';

const APP_ID = 'motoescuela-pro-v1';

export function useFirestoreProvider(fbUser, authReady, isAdmin, showToast, user) {
  const [activeLocks, setActiveLocks] = useState([]);
  const prevReservasRef = useRef([]);
  // Evita llenar la consola cuando la regla de `proveedoresPublicos` aún no
  // está desplegada: se avisa una sola vez por sesión.
  const proveedoresPublicosWarnedRef = useRef(false);

  const buildPath = useCallback((colName) => {
    return 'artifacts/' + APP_ID + '/public/data/' + colName;
  }, []);

  const warnProveedoresPublicosUnaVez = useCallback((error) => {
    if (proveedoresPublicosWarnedRef.current) return;
    proveedoresPublicosWarnedRef.current = true;
    console.warn(
      '[FirestoreProvider] proveedoresPublicos no disponible; se usa lista vacía (legacy):',
      error?.code || error?.message
    );
  }, []);

  // Colección espejo opcional: su lectura NUNCA debe tumbar el resto de
  // catálogos. Si la regla aún no está desplegada (`permission-denied`) o hay
  // error de red, se degrada a `{ docs: [] }` y la UI trata la lista vacía como
  // legacy (no oculta motos).
  const getProveedoresPublicosSeguro = useCallback(() => {
    return getDocs(collection(db, buildPath('proveedoresPublicos'))).catch((error) => {
      warnProveedoresPublicosUnaVez(error);
      return { docs: [] };
    });
  }, [buildPath, warnProveedoresPublicosUnaVez]);

  const [sedes, setSedes] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [metodosPago, setMetodosPago] = useState([]);
  const [packs, setPacks] = useState([]);  
   const [cursos, setCursos] = useState([]);
  const [cursosTeoricos, setCursosTeoricos] = useState([]);
  const [recursos, setRecursos] = useState([]);
  const [instructores, setInstructores] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  // Opción B aprobada: espejo público `{ activo }` de cada proveedor, legible
  // por cualquier autenticado. No contiene datos personales del proveedor.
  const [proveedoresPublicos, setProveedoresPublicos] = useState([]);
  const [motos, setMotos] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [reservas, setReservas] = useState([]);

  const pickInstructorPublic = (data, id, opciones = {}) => {
    const out = { id: String(id) };
    ['nombre', 'apellido', 'esPrincipal', 'sedes', 'activo', 'especialidad', 'bio'].forEach((k) => {
      if (data[k] !== undefined) out[k] = data[k];
    });
    if (!opciones.onlyPresent) {
      if (!Array.isArray(out.sedes)) out.sedes = [];
      if (typeof out.esPrincipal !== 'boolean') out.esPrincipal = false;
      if (typeof out.activo !== 'boolean') out.activo = true;
    }
    return out;
  };

  const cargarCatalogos = useCallback(async () => {
    if (!fbUser || !authReady) return;
    try {
                 const [sedesSnap, horariosSnap, metodosPagoSnap, cursosSnap, cursosTeoricosSnap, recursosSnap, packsSnap, instructoresSnap, proveedoresSnap, proveedoresPublicosSnap, motosSnap, adminsSnap, movimientosSnap] = await Promise.all([
        getDocs(collection(db, buildPath('sedes'))),
        getDocs(collection(db, buildPath('horarios'))),
        getDocs(collection(db, buildPath('metodosPago'))),
        getDocs(collection(db, buildPath('cursos'))),
        getDocs(collection(db, buildPath('cursosTeoricos'))),
        getDocs(collection(db, buildPath('recursos'))),
        getDocs(collection(db, buildPath('packs'))),
        isAdmin
          ? getDocs(collection(db, buildPath('instructores')))
          : getDocs(collection(db, buildPath('instructoresPublicos'))),
        isAdmin
          ? getDocs(collection(db, buildPath('proveedores')))
          : Promise.resolve({ docs: [] }),
        getProveedoresPublicosSeguro(),
        getDocs(collection(db, buildPath('motos'))),
        isAdmin ? getDocs(collection(db, buildPath('admins'))) : Promise.resolve({ docs: [] }),
        isAdmin ? getDocs(collection(db, buildPath('movimientos'))) : Promise.resolve({ docs: [] })
      ]);

      setSedes(sedesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            setHorarios(horariosSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setMetodosPago(metodosPagoSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setPacks(packsSnap.docs.map(d => ({ id: d.id, ...d.data() })));      setCursos(cursosSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setCursosTeoricos(cursosTeoricosSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setRecursos(recursosSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setInstructores(instructoresSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setProveedores(proveedoresSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      // Proyección mínima: solo `{ id, activo }`. `activo` ausente o `true` no
      // bloquea; únicamente `activo === false` marca al proveedor inactivo.
      setProveedoresPublicos(proveedoresPublicosSnap.docs.map(d => ({ id: d.id, activo: d.data()?.activo })));
      setMotos(motosSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setAdmins(adminsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setMovimientos(movimientosSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error('[FirestoreProvider] Error cargando catálogos:', error);
    }
  }, [fbUser, authReady, isAdmin, buildPath, getProveedoresPublicosSeguro]);

  useEffect(() => { cargarCatalogos(); }, [cargarCatalogos]);

  const saveCatalogo = (setter) => async (item) => {
    const id = item.id ? String(item.id) : Date.now().toString();
    const newItem = { ...item, id };
       const colName = setter === setSedes ? 'sedes' : setter === setHorarios ? 'horarios' : setter === setMetodosPago ? 'metodosPago' : setter === setCursos ? 'cursos' : setter === setCursosTeoricos ? 'cursosTeoricos' : setter === setRecursos ? 'recursos' : setter === setPacks ? 'packs' : setter === setInstructores ? 'instructores' : setter === setProveedores ? 'proveedores' : setter === setMotos ? 'motos' : setter === setAdmins ? 'admins' : 'movimientos';
    try {
      await setDoc(doc(db, buildPath(colName), id), newItem);
      setter(prev => prev.find(i => String(i.id) === id) ? prev.map(i => String(i.id) === id ? newItem : i) : [...prev, newItem]);
      return newItem;
    } catch (error) {
      console.error(`[FirestoreProvider] Error guardando en ${colName}:`, error);
      throw error;
    }
  };

  const saveSede = async (item) => {
    const id = item?.id ? String(item.id) : Date.now().toString();
    const nuevo = { ...item, id };
    // ERR-056: el recargo de la sede alimenta `preciosCurso`, que es la
    // autoridad de precio en `reservas.create`. Si sólo se guarda la sede, la
    // matriz queda obsoleta y la regla deniega el registro. Se leen los
    // catálogos y se escribe todo (sede + proyecciones) en un solo batch.
    const [configSnap, sedesSnap, cursosSnap] = await Promise.all([
      getDoc(doc(db, buildPath('configuraciones'), 'main')),
      getDocs(collection(db, buildPath('sedes'))),
      getDocs(collection(db, buildPath('cursos')))
    ]);
    const sedesActuales = sedesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const indice = sedesActuales.findIndex(s => String(s.id) === id);
    if (indice >= 0) sedesActuales[indice] = nuevo;
    else sedesActuales.push(nuevo);
    const cursosActuales = cursosSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (cursosActuales.length > 0 && !configSnap.exists()) {
      throw new Error('Falta configuraciones/main: no se puede reproyectar preciosCurso.');
    }
    const proyecciones = configSnap.exists()
      ? construirProyeccionesCursos(cursosActuales, configSnap.data(), sedesActuales)
      : [];
    const batch = writeBatch(db);
    batch.set(doc(db, buildPath('sedes'), id), nuevo);
    for (const { id: cursoId, proyeccion } of proyecciones) {
      batch.set(doc(db, buildPath('preciosCurso'), cursoId), {
        ...proyeccion,
        updatedAt: serverTimestamp()
      });
    }
    await batch.commit();
    setSedes(prev => prev.find(i => String(i.id) === id) ? prev.map(i => String(i.id) === id ? nuevo : i) : [...prev, nuevo]);
    return nuevo;
  };
    const saveHorario = saveCatalogo(setHorarios);
  const saveMetodoPago = saveCatalogo(setMetodosPago);
  const savePack = saveCatalogo(setPacks);
  // T-098 / T-056: `cursos` y `preciosCurso` se escriben en el mismo batch para
  // que la allowlist y la matriz de precios nunca queden desincronizadas. Si la
  // proyección falla, no se guarda el curso (fail-closed, sin venta rota).
  const saveCurso = async (item) => {
    const id = item?.id ? String(item.id) : Date.now().toString();
    const nuevo = { ...item, id };
    const [configSnap, sedesSnap] = await Promise.all([
      getDoc(doc(db, buildPath('configuraciones'), 'main')),
      getDocs(collection(db, buildPath('sedes')))
    ]);
    if (!configSnap.exists()) {
      throw new Error('Falta configuraciones/main: no se puede proyectar preciosCurso.');
    }
    const sedesActuales = sedesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (sedesActuales.length === 0) {
      throw new Error('No hay sedes: no se puede proyectar preciosCurso.');
    }
    const proyeccion = construirPreciosCurso(nuevo, configSnap.data(), sedesActuales);
    const batch = writeBatch(db);
    batch.set(doc(db, buildPath('cursos'), id), nuevo);
    batch.set(doc(db, buildPath('preciosCurso'), id), {
      ...proyeccion,
      updatedAt: serverTimestamp()
    });
    await batch.commit();
    setCursos(prev => prev.find(i => String(i.id) === id)
      ? prev.map(i => String(i.id) === id ? nuevo : i)
      : [...prev, nuevo]);
    return nuevo;
  };
  const saveCursoTeorico = saveCatalogo(setCursosTeoricos);
  const saveRecurso = saveCatalogo(setRecursos);
  const saveInstructor = useCallback(async (datos, opciones = {}) => {
    const safe = { ...(datos || {}) };
    delete safe.password;
    if (!safe.id) throw new Error('No se puede guardar un instructor sin id');
    const id = String(safe.id);
    const merge = opciones.merge === true;
    const publico = pickInstructorPublic(safe, id, { onlyPresent: merge });
    const batch = writeBatch(db);
    batch.set(doc(db, buildPath('instructores'), id), safe, merge ? { merge: true } : undefined);
    batch.set(doc(db, buildPath('instructoresPublicos'), id), publico, merge ? { merge: true } : undefined);
    await batch.commit();
    setInstructores(prev => prev.find(i => String(i.id) === id)
      ? prev.map(i => String(i.id) === id ? safe : i)
      : [...prev, safe]);
    return safe;
  }, [buildPath]);
  const saveProveedorRawBase = saveCatalogo(setProveedores);
  const saveProveedorRaw = useCallback(async (datos) => {
    const safe = { ...(datos || {}) };
    delete safe.password;
    return saveProveedorRawBase(safe);
  }, [saveProveedorRawBase]);
  const saveMoto = saveCatalogo(setMotos);
  const saveAdmin = saveCatalogo(setAdmins);
  const saveMovimientoRaw = saveCatalogo(setMovimientos);

  useEffect(() => {
    if (!isAdmin || !fbUser || !authReady) { setReservas([]); return; }
    const q = query(collection(db, buildPath('reservas')), orderBy('fecha', 'desc'), limit(100));
    const unsub = onSnapshot(q, (snap) => setReservas(snap.docs.map(d => ({ id: d.id, ...d.data() }))), (err) => { console.warn('[FirestoreProvider] Error en reservas:', err.code); setReservas([]); });
    return () => unsub();
  }, [isAdmin, fbUser, authReady, buildPath]);

    const refreshNotificaciones = useCallback(async () => {
    if (!fbUser || !authReady) { setNotifications([]); return; }
    const uidNotif = fbUser?.uid || user?.uid;
    if (!isAdmin && !uidNotif) { setNotifications([]); return; }
    const ref = collection(db, buildPath('notificaciones'));
    try {
      const q = isAdmin
        ? query(ref, orderBy('createdAt', 'desc'), limit(30))
        : query(ref, where('userId', '==', String(uidNotif)), limit(50));
      const snapshot = await getDocs(q);
      let docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      if (!isAdmin) {
        docs.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        docs = docs.slice(0, 30);
      }
      setNotifications(docs);
    } catch (err) {
      console.warn('[FirestoreProvider] Error en notificaciones:', err.code || err.message);
      setNotifications([]);
    }
  }, [fbUser, authReady, isAdmin, user?.uid, buildPath]);

  useEffect(() => {
    refreshNotificaciones();
  }, [refreshNotificaciones]);

  const saveReserva = async (item) => {
    const id = item.id ? String(item.id) : Date.now().toString();
    const newItem = { ...item, id };
    await setDoc(doc(db, buildPath('reservas'), id), newItem);
    setReservas(prev => prev.find(i => String(i.id) === id) ? prev.map(i => String(i.id) === id ? newItem : i) : [...prev, newItem]);
    return newItem;
  };

    const saveNotificacion = useCallback(async (item) => {
        const id = item.id ? String(item.id) : (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
    const newItem = { ...item, id };
    await setDoc(doc(db, buildPath('notificaciones'), id), newItem);
    setNotifications(prev => prev.find(i => String(i.id) === id) ? prev.map(i => String(i.id) === id ? newItem : i) : [...prev, newItem]);
    return newItem;
  }, [buildPath]);

   const markNotificationRead = useCallback(async (id) => {
    if (!db || !fbUser) return;
    try {
      await updateDoc(doc(db, buildPath('notificaciones'), id), { leida: true });
      setNotifications(prev => prev.map(n => String(n.id) === String(id) ? { ...n, leida: true } : n));
    } catch (e) {
      console.warn('[FirestoreProvider] Error marking notification:', e.code || e.message);
    }
  }, [fbUser, buildPath]);

  const saveMovimiento = useCallback(async (item) => {
    const tipo = item?.tipo === 'ingreso' ? 'ingreso' : 'egreso';
    const categoria = item?.categoria || (tipo === 'ingreso' ? 'ingreso_reserva' : 'gasto_operativo');
    const id = item?.id
      ? String(item.id)
      : (typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `mov_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
    const itemConUsuario = {
      ...item,
      id,
      tipo,
      categoria,
      userId: item?.userId || fbUser?.uid || user?.uid || '',
      createdBy: fbUser?.uid || user?.uid || '',
      createdAt: item?.createdAt || Timestamp.now(),
      estado: item?.estado || 'confirmado',
      moneda: item?.moneda || 'USD',
      fecha: item?.fecha || obtenerFechaVenezuela(),
      desc: item?.desc || categoria
    };
    await saveMovimientoRaw(itemConUsuario);
    return itemConUsuario;
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

  // Opción B: escribe el espejo público de un proveedor con SOLO `{ activo }`.
  // Nunca incluye nombre, correo, cédula ni otros datos del proveedor.
  // Si la escritura falla (`permission-denied` con la regla aún no desplegada o
  // red), NO rompe el guardado del proveedor: el backfill poblará el espejo.
  const guardarProveedorPublico = useCallback(async (id, datos) => {
    const proveedorId = String(id || '').trim();
    if (!proveedorId) return;
    const publico = { activo: datos?.activo !== false };
    try {
      await setDoc(doc(db, buildPath('proveedoresPublicos'), proveedorId), publico);
    } catch (error) {
      warnProveedoresPublicosUnaVez(error);
      return;
    }
    setProveedoresPublicos(prev => prev.find(p => String(p.id) === proveedorId)
      ? prev.map(p => (String(p.id) === proveedorId ? { id: proveedorId, ...publico } : p))
      : [...prev, { id: proveedorId, ...publico }]);
  }, [buildPath, warnProveedoresPublicosUnaVez]);

  const refrescarProveedoresPublicos = useCallback(async () => {
    if (!fbUser || !authReady) return;
    // El helper ya degrada a `{ docs: [] }` y avisa una sola vez si falla.
    const snap = await getProveedoresPublicosSeguro();
    setProveedoresPublicos(snap.docs.map(d => ({ id: d.id, activo: d.data()?.activo })));
  }, [fbUser, authReady, getProveedoresPublicosSeguro]);

  const saveProveedorSeguro = async (datos) => {
    let proveedorId = datos?.id ? String(datos.id) : '';
    if (!datos.id && datos.email && datos.password) {
      const res = await StaffService.crearStaff(datos.email, datos.password, 'proveedor', datos);
      if (!res.success) { showToast(res.error.message, 'error'); return; }
      proveedorId = String(res.data.uid);
      await saveProveedorRaw({ ...datos, id: proveedorId });
      await guardarProveedorPublico(proveedorId, datos);
      await refrescarProveedoresPublicos();
      showToast('Usuario creado correctamente', 'success');
      return;
    }
    const guardado = await saveProveedorRaw(datos);
    proveedorId = String(guardado?.id ?? proveedorId);
    await guardarProveedorPublico(proveedorId, datos);
    await refrescarProveedoresPublicos();
    showToast('Guardado exitoso');
  };

  const refreshCatalogos = useCallback(() => cargarCatalogos(), [cargarCatalogos]);

    return {
    sedes, saveSede, horarios, saveHorario, metodosPago, saveMetodoPago, cursos, saveCurso, cursosTeoricos, saveCursoTeorico, recursos, saveRecurso, packs, savePack,    instructores, saveInstructor, handleSaveInstructorSeguro,
    proveedores, saveProveedorSeguro, motos, saveMoto,    reservas, saveReserva, movimientos, saveMovimiento, admins, saveAdmin,
    proveedoresPublicos, setProveedoresPublicos,
    notifications, saveNotificacion, markNotificationRead, refreshNotificaciones,    
    activeLocks, suscribirLocks,
    getTodayStr, isReservaActiva, isReservationConflict, findAvailableResources,
    seedDatabase, cleanExpiredLocks, createStaffUser,
    prevReservasRef,
    refreshCatalogos
  };
}
