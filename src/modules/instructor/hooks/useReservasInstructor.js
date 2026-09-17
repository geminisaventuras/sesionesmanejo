// @build: 2026-09-08 | id: FIX-020-ESTADOS-CANCELADOS | backup: useReservasInstructor.backup-20260908-000000 | desc: Hook con separación de activas y todas para historial
import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebase';

const APP_ID = 'motoescuela-pro-v1';

export function useReservasInstructor(uid) {
  const [reservas, setReservas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [reintentarTrigger, setReintentarTrigger] = useState(0);

  const reintentar = useCallback(() => {
    setCargando(true);
    setError(null);
    setReintentarTrigger(prev => prev + 1);
  }, []);

  useEffect(() => {
    if (!uid) {
      setCargando(false);
      setError(null);
      setReservas([]);
      return;
    }

    setCargando(true);
    setError(null);

    const ref = collection(db, 'artifacts', APP_ID, 'public', 'data', 'reservas');
    const q = query(
      ref,
      where('instructorId', '==', String(uid)),
      orderBy('fecha', 'desc'),
      limit(100)
    );

    const unsub = onSnapshot(q, (snap) => {
      setReservas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setCargando(false);
      setError(null);
    }, (err) => {
      console.error('[useReservasInstructor] Error al cargar reservas:', {
        action: 'loadReservas',
        userId: uid,
        error: err.message,
        code: err.code,
        timestamp: new Date().toISOString()
      });
      setReservas([]);
      setCargando(false);
      setError('No se pudieron cargar las reservas. Verifica tu conexión.');
    });

    return () => {
      unsub();
    };
  }, [uid, reintentarTrigger]);

  const reservasActivas = useMemo(() => {
    return reservas.filter(r => 
      r.estadoPago !== 'Cancelado' && 
      r.estadoPago !== 'Rechazado'
    );
  }, [reservas]);

  return { reservas, reservasActivas, cargando, error, reintentar };
}
