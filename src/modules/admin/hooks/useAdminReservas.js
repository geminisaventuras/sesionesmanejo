// @build: 2026-09-25.A2.14 | id: HOOK-ADMIN-RESERVAS-V2 | desc: Agrega listener a reservasPack para packs comerciales
import { useState, useEffect } from 'react';
import { collection, query, orderBy, where, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebase';

export function useAdminReservas({ incluirPendientes = false } = {}) {
  const [reservas, setReservas] = useState([]);
  const [reservasPendientes, setReservasPendientes] = useState([]);
  const [packs, setPacks] = useState([]);
  const [accesosTeoricos, setAccesosTeoricos] = useState([]);
  const [cargandoReservas, setCargandoReservas] = useState(true);
  const [cargandoPacks, setCargandoPacks] = useState(true);
  const [cargandoAccesos, setCargandoAccesos] = useState(true);
  const [error, setError] = useState(null);

  // Listener 1: reservas (individuales + children de pack)
  useEffect(() => {
    const q = query(
      collection(db, 'artifacts', 'motoescuela-pro-v1', 'public', 'data', 'reservas'),
      orderBy('fecha', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setReservas(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        setCargandoReservas(false);
        setError(null);
      },
      (err) => {
        console.error('[useAdminReservas] Error reservas:', err);
        setError(err);
        setCargandoReservas(false);
      }
    );

    return () => {
      console.log('[useAdminReservas] Cleanup reservas');
      unsubscribe();
    };
  }, []);

  // Listener 1-bis: reservas pendientes por estado (ERR-058). Opt-in: solo las
  // pantallas que muestran alertas lo activan, para no sumar lecturas en el resto.
  // El listener principal ordena por `fecha` de curso y limita a 100, así que una
  // reserva nueva con clase lejana/pasada puede quedar fuera del top; este filtra
  // por estadoPago para que el centro de alertas no dependa de ese orden.
  useEffect(() => {
    if (!incluirPendientes) {
      setReservasPendientes([]);
      return undefined;
    }
    const q = query(
      collection(db, 'artifacts', 'motoescuela-pro-v1', 'public', 'data', 'reservas'),
      where('estadoPago', '==', 'Pendiente'),
      limit(100)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setReservasPendientes(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      },
      (err) => {
        console.error('[useAdminReservas] Error reservas pendientes:', err);
        setReservasPendientes([]);
      }
    );

    return () => {
      console.log('[useAdminReservas] Cleanup reservas pendientes');
      unsubscribe();
    };
  }, [incluirPendientes]);

  // Listener 2: reservasPack (maestras de pack)
  useEffect(() => {
    const q = query(
      collection(db, 'artifacts', 'motoescuela-pro-v1', 'public', 'data', 'reservasPack'),
      orderBy('fechaCompra', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      q,
          (snapshot) => {
        console.log('[useAdminReservas] packs recibidos:', snapshot.docs.length, snapshot.docs.map(d => ({ id: d.id, estadoPago: d.data().estadoPago, userId: d.data().userId, packNombre: d.data().packNombre })));
        setPacks(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        setCargandoPacks(false);
      },
      (err) => {
        console.error('[useAdminReservas] Error packs:', err);
        setCargandoPacks(false);
      }
    );

    return () => {
      console.log('[useAdminReservas] Cleanup packs');
      unsubscribe();
    };
  }, []);

  // Listener 3: accesosTeoricos (compras de módulos formativos)
  useEffect(() => {
    const q = query(
      collection(db, 'artifacts', 'motoescuela-pro-v1', 'public', 'data', 'accesosTeoricos'),
      orderBy('fechaCompra', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setAccesosTeoricos(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        setCargandoAccesos(false);
      },
      (err) => {
        console.error('[useAdminReservas] Error accesosTeoricos:', err);
        setCargandoAccesos(false);
      }
    );

    return () => {
      console.log('[useAdminReservas] Cleanup accesosTeoricos');
      unsubscribe();
    };
  }, []);

  return {
    reservas,
    reservasPendientes,
    packs,
    accesosTeoricos,
    cargando: cargandoReservas || cargandoPacks || cargandoAccesos,
    error
  };
}