// @build: 2026-09-25.A2.14 | id: HOOK-ADMIN-RESERVAS-V2 | desc: Agrega listener a reservasPack para packs comerciales
import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebase';

export function useAdminReservas() {
  const [reservas, setReservas] = useState([]);
  const [packs, setPacks] = useState([]);
  const [cargandoReservas, setCargandoReservas] = useState(true);
  const [cargandoPacks, setCargandoPacks] = useState(true);
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

  return {
    reservas,
    packs,
    cargando: cargandoReservas || cargandoPacks,
    error
  };
}