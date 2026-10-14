// @build: 2026-10-13 | id: FIX-HUEVO-GALLINA-ALT4 | backup: useOcupacionConfirmada.backup-20261013-2248
// ALT-4 (confluencia FIRE + MAMBA + Deek, 2026-10-13):
// Expone `fechaConsultada` = la fecha que disparó la última carga COMPLETA
// (ambos listeners emitieron). Previene el deadlock huevo-gallina:
// el auto-jump espera a que fechaConsultada === form.fecha1 antes de confiar
// en la disponibilidad calculada.
import { useState, useEffect, useRef, useMemo } from 'react';
import { collection, query, where, limit, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

// Constantes estables fuera del hook
const ESTADOS_PAGO_ACTIVOS = ['Pendiente', 'Aprobado'];

/**
 * Hook para obtener ocupación confirmada con actualización en tiempo real.
 * Detecta solapamientos en cursos de 1 y 2 días usando operador 'in' para
 * cubrir todos los vectores de colisión (fecha y fecha2 del curso existente).
 *
 * ALT-4: expone `fechaConsultada`. Solo se setea cuando AMBOS listeners
 * (fecha + fecha2) han emitido para la misma consulta. Si `fecha === ''`,
 * `fechaConsultada` queda en `null` (hook idle).
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
  const [fechaConsultada, setFechaConsultada] = useState(null);

  // ✅ FIX-027: Dos Maps separados (uno por listener) para evitar acumulación de fantasmas
  const fechaMapRef = useRef(new Map());
  const fecha2MapRef = useRef(new Map());
  // ALT-4: control de emisión por listener (para setear fechaConsultada solo cuando ambos emitieron)
  const listenersEmitidosRef = useRef({ fecha: false, fecha2: false });

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
      // ALT-4: hook idle → fechaConsultada = null
      setFechaConsultada(null);
      listenersEmitidosRef.current = { fecha: false, fecha2: false };
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
          // ALT-4: ambas consultas completaron → fechaConsultada válida
          setFechaConsultada(fecha);
        } catch (err) {
          console.error('[useOcupacionConfirmada] Error cargando datos:', err);
          setError(err);
          setOcupacion([]);
          // ALT-4: incluso en error, marcamos la fecha (para no bloquear el flujo)
          setFechaConsultada(fecha);
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
    // ALT-4: reset de emisiones al re-montar
    listenersEmitidosRef.current = { fecha: false, fecha2: false };

    // ✅ FIX-027: Recombinación local (idempotente, sin dependencias externas)
    const recombinarYEmitir = () => {
      const combinado = new Map();
      fechaMapRef.current.forEach((v, k) => combinado.set(k, v));
      fecha2MapRef.current.forEach((v, k) => combinado.set(k, v));
      setOcupacion(Array.from(combinado.values()));
    };

    // ALT-4: helper que setea fechaConsultada solo cuando ambos listeners emitieron
    const marcarEmision = (cual) => {
      listenersEmitidosRef.current[cual] = true;
      if (listenersEmitidosRef.current.fecha && listenersEmitidosRef.current.fecha2) {
        setFechaConsultada(fecha);
      }
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
        marcarEmision('fecha');
      },
      (err) => {
        console.error('[useOcupacionConfirmada] Error en listener fecha:', err);
        setError(err);
        setCargando(false);
        // ALT-4: marcar emisión igual para no bloquear
        marcarEmision('fecha');
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
        marcarEmision('fecha2');
      },
      (err) => {
        console.error('[useOcupacionConfirmada] Error en listener fecha2:', err);
        setError(err);
        // ALT-4: marcar emisión igual para no bloquear
        marcarEmision('fecha2');
      }
    );

    // ✅ FIX-027: Cleanup completo: destruir listeners y vaciar Maps
    return () => {
      unsubFecha();
      unsubFecha2();
      fechaMapRef.current = new Map();
      fecha2MapRef.current = new Map();
      listenersEmitidosRef.current = { fecha: false, fecha2: false };
    };
  }, [fechasKey, limitDocs, tiempoReal]);

  return {
    ocupacion,
    cargando,
    error,
    fechaConsultada,
  };
}
