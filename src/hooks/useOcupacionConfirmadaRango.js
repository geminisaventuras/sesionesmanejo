// @build: 2026-11-20 | id: FIX-DISPONIBILIDAD-RANGO | desc: Ocupación confirmada para todo el rango de fechas visible (no solo D1/D2)
import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, limit, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useStableArray } from './useStableArray';

const ESTADOS_PAGO_ACTIVOS = ['Pendiente', 'Aprobado'];

/**
 * Carga reservas activas del espejo público `ocupacionConfirmada` para un
 * rango de fechas. Se consultan `fecha` y `fecha2` porque un curso de dos
 * días ocupa ambas fechas.
 *
 * La cinta de fechas y el auto-jump necesitan este rango completo: si solo
 * se cargan las reservas de la fecha seleccionada, las demás fechas parecen
 * libres y luego “rebotan” al seleccionarlas.
 */
export function useOcupacionConfirmadaRango({
  fechaInicio,
  fechaFin,
  fecha = null,
  limitDocs = 500,
  tiempoReal = true
}) {
  const [ocupacionRaw, setOcupacion] = useState([]);
  const ocupacion = useStableArray(ocupacionRaw);
  const [cargando, setCargando] = useState(Boolean(fechaInicio && fechaFin));
  const [error, setError] = useState(null);

  const rangoKey = useMemo(() => `${fechaInicio || ''}|${fechaFin || ''}`, [fechaInicio, fechaFin]);

  useEffect(() => {
    if (!fechaInicio || !fechaFin) {
      setOcupacion([]);
      setCargando(false);
      return;
    }

    setCargando(true);
    setError(null);

    if (!tiempoReal) {
      const cargar = async () => {
        try {
          const base = collection(db, 'ocupacionConfirmada');
          const [s1, s2] = await Promise.all([
            getDocs(query(base, where('fecha', '>=', fechaInicio), where('fecha', '<=', fechaFin), limit(limitDocs))),
            getDocs(query(base, where('fecha2', '>=', fechaInicio), where('fecha2', '<=', fechaFin), limit(limitDocs)))
          ]);
          const map = new Map();
          [...s1.docs, ...s2.docs].forEach(d => {
            const data = d.data();
            if (ESTADOS_PAGO_ACTIVOS.includes(data.estadoPago)) {
              map.set(d.id, { id: d.id, ...data });
            }
          });
          setOcupacion(Array.from(map.values()));
        } catch (err) {
          console.error('[useOcupacionConfirmadaRango] Error:', err);
          setError(err);
          setOcupacion([]);
        } finally {
          setCargando(false);
        }
      };
      cargar();
      return;
    }

    const mapFecha = new Map();
    const mapFecha2 = new Map();
    let listos = 0;
    const emitir = () => {
      const combinado = new Map(mapFecha);
      mapFecha2.forEach((v, k) => combinado.set(k, v));
      setOcupacion(Array.from(combinado.values()));
      if (listos >= 2) setCargando(false);
    };
    const leer = (snap, target) => {
      target.clear();
      snap.docs.forEach(d => {
        const data = d.data();
        if (ESTADOS_PAGO_ACTIVOS.includes(data.estadoPago)) {
          target.set(d.id, { id: d.id, ...data });
        }
      });
      listos += 1;
      emitir();
    };
    const onError = (err) => {
      console.error('[useOcupacionConfirmadaRango] Error listener:', err);
      setError(err);
      listos += 1;
      if (listos >= 2) setCargando(false);
    };

    const base = collection(db, 'ocupacionConfirmada');
    const qFecha = query(
      base,
      where('fecha', '>=', fechaInicio),
      where('fecha', '<=', fechaFin),
      limit(limitDocs)
    );
    const qFecha2 = query(
      base,
      where('fecha2', '>=', fechaInicio),
      where('fecha2', '<=', fechaFin),
      limit(limitDocs)
    );

    const unsub1 = onSnapshot(qFecha, (snap) => leer(snap, mapFecha), onError);
    const unsub2 = onSnapshot(qFecha2, (snap) => leer(snap, mapFecha2), onError);

    return () => {
      unsub1();
      unsub2();
    };
  }, [rangoKey, limitDocs, tiempoReal]);

  return {
    ocupacion,
    cargando,
    error,
    // El rango ya está cargado para todas las fechas; la fecha actual es
    // válida para el guard ALT-4 en cuanto termina la carga.
    fechaConsultada: cargando ? null : (fecha || null)
  };
}
