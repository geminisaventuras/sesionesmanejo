// @build: 2026-09-04 | id: HOOK-ADMIN-RESERVAS | backup: useAdminReservas.backup-20260904-000000 | desc: Hook local para suscripción de reservas del admin con limit 100
import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebase';

export function useAdminReservas() {
  const [reservas, setReservas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

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
        setCargando(false);
        setError(null);
      },
      (err) => {
        console.error('[useAdminReservas] Error en suscripción:', err);
        setError(err);
        setCargando(false);
      }
    );

    return () => {
      console.log('[useAdminReservas] Cleanup: desuscribiendo listener');
      unsubscribe();
    };
  }, []);

  return { reservas, cargando, error };
}
