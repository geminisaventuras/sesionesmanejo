// @build: 2026-09-08.15-45-00 | id: FIX-017-SOLAPAMIENTO-COMPLETO | backup: useOcupacionConfirmada.backup-20260908-154500
import { useState, useEffect, useRef, useMemo } from 'react';
import { collection, query, where, limit, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

// Constantes estables fuera del hook
const ESTADOS_PAGO_ACTIVOS = ['Pendiente', 'Aprobado'];

/**
 * Hook para obtener ocupación confirmada con actualización en tiempo real.
 * Detecta solapamientos en cursos de 1 y 2 días usando operador 'in' para
 * cubrir todos los vectores de colisión (fecha y fecha2 del curso existente).
 */
export function useOcupacionConfirmada(options = {}) {
  const {
    fecha,
    fecha2,
    limitDocs = 100,
    tiempoReal = true
  } = options;
  
  const [ocupacion, setOcupacion] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

    // ✅ FIX-027: Dos Maps separados (uno por listener) para evitar acumulación de fantasmas
  const fechaMapRef = useRef(new Map());
  const fecha2MapRef = useRef(new Map());

  // Calcular fechas a consultar (estable con useMemo)
  const fechasConsultar = useMemo(() => {
    if (!fecha) return [];
    return (fecha2 && fecha2 !== fecha) ? [fecha, fecha2] : [fecha];
  }, [fecha, fecha2]);

  // Clave estable para dependencias (evita bucle infinito)
  const fechasKey = fechasConsultar.join(',');

  useEffect(() => {
    if (!fecha || fechasConsultar.length === 0) {
      setOcupacion([]);
      setCargando(false);
      return;
    }

    if (!tiempoReal) {
      // Modo sin tiempo real: cargar una sola vez con getDocs
      const cargarUnaVez = async () => {
        try {
          setCargando(true);
          const todasReservas = new Map();
          
          // Consulta 1: reservas donde fecha está en las fechas a consultar
          const qFecha = query(
            collection(db, 'ocupacionConfirmada'),
            where('fecha', 'in', fechasConsultar),
            limit(limitDocs)
          );
          
          const snapFecha = await getDocs(qFecha);
          snapFecha.docs.forEach(d => {
            const data = d.data();
            if (ESTADOS_PAGO_ACTIVOS.includes(data.estadoPago)) {
              todasReservas.set(d.id, { id: d.id, ...data });
            }
          });
          
          // Consulta 2: reservas donde fecha2 está en las fechas a consultar
          const qFecha2 = query(
            collection(db, 'ocupacionConfirmada'),
            where('fecha2', 'in', fechasConsultar),
            limit(limitDocs)
          );
          
          const snapFecha2 = await getDocs(qFecha2);
          snapFecha2.docs.forEach(d => {
            const data = d.data();
            if (ESTADOS_PAGO_ACTIVOS.includes(data.estadoPago)) {
              todasReservas.set(d.id, { id: d.id, ...data });
            }
          });
          
          setOcupacion(Array.from(todasReservas.values()));
          setError(null);
        } catch (err) {
          console.error('[useOcupacionConfirmada] Error cargando datos:', err);
          setError(err);
          setOcupacion([]);
        } finally {
          setCargando(false);
        }
      };
      
      cargarUnaVez();
      return;
    }

 
        // Modo tiempo real: usar onSnapshot (más eficiente para Plan Spark)
    setCargando(true);
    // ✅ FIX-027: Limpiar Maps al re-montar (cambio de fechas)
    fechaMapRef.current = new Map();
    fecha2MapRef.current = new Map();

    // ✅ FIX-027: Recombinación local (idempotente, sin dependencias externas)
    const recombinarYEmitir = () => {
      const combinado = new Map();
      fechaMapRef.current.forEach((v, k) => combinado.set(k, v));
      fecha2MapRef.current.forEach((v, k) => combinado.set(k, v));
      setOcupacion(Array.from(combinado.values()));
    };

    // Listener 1: reservas donde fecha está en las fechas a consultar
    const qFecha = query(
      collection(db, 'ocupacionConfirmada'),
      where('fecha', 'in', fechasConsultar),
      limit(limitDocs)
    );

    const unsubFecha = onSnapshot(
      qFecha,
      (snapshot) => {
        // ✅ FIX-027: Reconstrucción atómica (refleja borrados y cambios)
        const temporalMap = new Map();
        snapshot.docs.forEach(d => {
          const data = d.data();
          if (ESTADOS_PAGO_ACTIVOS.includes(data.estadoPago)) {
            temporalMap.set(d.id, { id: d.id, ...data });
          }
        });
        fechaMapRef.current = temporalMap;
        recombinarYEmitir();
        setCargando(false);
        setError(null);
      },
      (err) => {
        console.error('[useOcupacionConfirmada] Error en listener fecha:', err);
        setError(err);
        setCargando(false);
      }
    );

    // Listener 2: reservas donde fecha2 está en las fechas a consultar
    const qFecha2 = query(
      collection(db, 'ocupacionConfirmada'),
      where('fecha2', 'in', fechasConsultar),
      limit(limitDocs)
    );

    const unsubFecha2 = onSnapshot(
      qFecha2,
      (snapshot) => {
        // ✅ FIX-027: Reconstrucción atómica
        const temporalMap = new Map();
        snapshot.docs.forEach(d => {
          const data = d.data();
          if (ESTADOS_PAGO_ACTIVOS.includes(data.estadoPago)) {
            temporalMap.set(d.id, { id: d.id, ...data });
          }
        });
        fecha2MapRef.current = temporalMap;
        recombinarYEmitir();
      },
      (err) => {
        console.error('[useOcupacionConfirmada] Error en listener fecha2:', err);
        setError(err);
      }
    );

    // ✅ FIX-027: Cleanup completo: destruir listeners y vaciar Maps
    return () => {
      unsubFecha();
      unsubFecha2();
      fechaMapRef.current = new Map();
      fecha2MapRef.current = new Map();
    };
  }, [fechasKey, limitDocs, tiempoReal]);

  return { 
    ocupacion, 
    cargando, 
    error
  };
}
