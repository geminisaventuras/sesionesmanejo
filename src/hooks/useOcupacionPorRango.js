// @build: 2026-11-05 | id: ADMIN-OCUPACION-REDESIGN-v2 | desc: Hook corregido para traer reservas por fecha y fecha2 (cursos de 2 días).
import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

const APP_ID = 'motoescuela-pro-v1';

/**
 * Hook para obtener todas las reservas activas en un rango de fechas.
 * Hace 2 consultas (fecha y fecha2) para cubrir cursos de 1 y 2 días,
 * y las combina en cliente sin duplicados.
 */
export function useOcupacionPorRango(fechaInicio, fechaFin) {
  const [reservas, setReservas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!fechaInicio || !fechaFin) {
      setReservas([]);
      setCargando(false);
      return;
    }

    setCargando(true);
    
    const reservasRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'reservas');
    
    // Query 1: Reservas que empiezan en el rango (Día 1)
    const q1 = query(
      reservasRef,
      where('fecha', '>=', fechaInicio),
      where('fecha', '<=', fechaFin)
    );

    // Query 2: Reservas que terminan en el rango (Día 2)
    const q2 = query(
      reservasRef,
      where('fecha2', '>=', fechaInicio),
      where('fecha2', '<=', fechaFin)
    );

    let res1 = [];
    let res2 = [];
    let listos1 = false;
    let listos2 = false;

    const combinar = () => {
      if (!listos1 || !listos2) return;
      
      // Unir por ID para evitar duplicados
      const map = new Map();
      [...res1, ...res2].forEach(r => {
        if (
          (r.estadoPago === 'Pendiente' || r.estadoPago === 'Aprobado') &&
          r.estadoCurso !== 'Cancelado'
        ) {
          map.set(r.id, r);
        }
      });
      
      setReservas(Array.from(map.values()));
      setCargando(false);
    };

    const unsub1 = onSnapshot(q1, 
      (snap) => {
        res1 = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        listos1 = true;
        combinar();
      },
      (err) => {
        console.error('[useOcupacionPorRango] Error Q1:', err);
        setError(err); setCargando(false);
      }
    );

    const unsub2 = onSnapshot(q2, 
      (snap) => {
        res2 = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        listos2 = true;
        combinar();
      },
      (err) => {
        console.error('[useOcupacionPorRango] Error Q2:', err);
        setError(err); setCargando(false);
      }
    );

    return () => { unsub1(); unsub2(); };
  }, [fechaInicio, fechaFin]);

  return { reservas, cargando, error };
}
