// @build: 2026-11-23 | id: T-072-OCUPACION-FUENTE-VERDAD | desc: Ocupación por rango desde el espejo + locks, con `reservas` solo para detalle (ADR-011).
//
// Fuente de verdad de disponibilidad:
//   - `ocupacionConfirmada` (espejo, D1 y D2)
//   - `ocupacionTemporal` (locks activos)
// `reservas` se lee para enriquecer nombre/estado de pago/detalle; NO decide
// por sí sola si un bloque está libre. Cada listener marca su propio estado de
// carga y error: no se publica "libre" con medio rango cargado.
import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { lockVigente } from '../modules/inscripcion/utils/locksHelpers';

const APP_ID = 'motoescuela-pro-v1';
const LIMITE_DOCS = 500;
const ESTADOS_ACTIVOS = ['Pendiente', 'Aprobado'];

const leerSnapshot = (snap) => snap.docs.map(d => ({ id: d.id, ...d.data() }));

export function useOcupacionPorRango(fechaInicio, fechaFin) {
  const [reservas, setReservas] = useState([]);
  const [ocupacion, setOcupacion] = useState([]);
  const [locks, setLocks] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!fechaInicio || !fechaFin) {
      setReservas([]);
      setOcupacion([]);
      setLocks([]);
      setCargando(false);
      setError(null);
      return;
    }

    setCargando(true);
    setError(null);

    const reservasRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'reservas');
    const espejoRef = collection(db, 'ocupacionConfirmada');
    const locksRef = collection(db, 'ocupacionTemporal');

    let resFecha = [];
    let resFecha2 = [];
    let ocuFecha = [];
    let ocuFecha2 = [];
    let locksRango = [];

    const listos = {
      reservasFecha: false,
      reservasFecha2: false,
      ocupacionFecha: false,
      ocupacionFecha2: false,
      locks: false
    };
    let cancelado = false;

    const publicar = () => {
      if (cancelado) return;
      const reservasMap = new Map(
        [...resFecha, ...resFecha2].map(r => [String(r.id), r])
      );
      const ocupacionMap = new Map(
        [...ocuFecha, ...ocuFecha2].map(r => [String(r.id), r])
      );
      const ahora = Date.now();
      setReservas(Array.from(reservasMap.values()));
      setOcupacion(Array.from(ocupacionMap.values()));
      setLocks(locksRango.filter(l => lockVigente(l, ahora)));
      setCargando(!Object.values(listos).every(Boolean));
    };

    const alError = (clave, etiqueta) => (err) => {
      console.error(`[useOcupacionPorRango] Error ${etiqueta}:`, err);
      if (cancelado) return;
      setError(err);
      listos[clave] = true;
      publicar();
    };

    const qResFecha = query(
      reservasRef,
      where('fecha', '>=', fechaInicio),
      where('fecha', '<=', fechaFin),
      limit(LIMITE_DOCS)
    );
    const qResFecha2 = query(
      reservasRef,
      where('fecha2', '>=', fechaInicio),
      where('fecha2', '<=', fechaFin),
      limit(LIMITE_DOCS)
    );

    // Espejo: fuente de verdad de la ocupación (D1 y D2).
    const qOcuFecha = query(
      espejoRef,
      where('fecha', '>=', fechaInicio),
      where('fecha', '<=', fechaFin),
      limit(LIMITE_DOCS)
    );
    const qOcuFecha2 = query(
      espejoRef,
      where('fecha2', '>=', fechaInicio),
      where('fecha2', '<=', fechaFin),
      limit(LIMITE_DOCS)
    );

    // Locks: se filtran vencidos en cliente con un helper tolerante a Timestamp.
    const qLocks = query(
      locksRef,
      where('fecha', '>=', fechaInicio),
      where('fecha', '<=', fechaFin),
      limit(LIMITE_DOCS)
    );

    const unsubs = [
      onSnapshot(
        qResFecha,
        snap => {
          if (cancelado) return;
          resFecha = leerSnapshot(snap);
          listos.reservasFecha = true;
          publicar();
        },
        alError('reservasFecha', 'reservas.fecha')
      ),
      onSnapshot(
        qResFecha2,
        snap => {
          if (cancelado) return;
          resFecha2 = leerSnapshot(snap);
          listos.reservasFecha2 = true;
          publicar();
        },
        alError('reservasFecha2', 'reservas.fecha2')
      ),
      onSnapshot(
        qOcuFecha,
        snap => {
          if (cancelado) return;
          ocuFecha = leerSnapshot(snap);
          listos.ocupacionFecha = true;
          publicar();
        },
        alError('ocupacionFecha', 'ocupacionConfirmada.fecha')
      ),
      onSnapshot(
        qOcuFecha2,
        snap => {
          if (cancelado) return;
          ocuFecha2 = leerSnapshot(snap);
          listos.ocupacionFecha2 = true;
          publicar();
        },
        alError('ocupacionFecha2', 'ocupacionConfirmada.fecha2')
      ),
      onSnapshot(
        qLocks,
        snap => {
          if (cancelado) return;
          locksRango = leerSnapshot(snap);
          listos.locks = true;
          publicar();
        },
        alError('locks', 'ocupacionTemporal.fecha')
      )
    ];

    return () => {
      cancelado = true;
      unsubs.forEach(unsub => unsub());
    };
  }, [fechaInicio, fechaFin]);

  // `reservas` incluye todos los estados para enriquecer el detalle (p. ej.
  // mostrar "Rechazado" retenido). `reservasActivas` conserva la semántica
  // previa para consumidores que solo quieren pendientes/aprobadas.
  const reservasActivas = useMemo(
    () => reservas.filter(r => ESTADOS_ACTIVOS.includes(r.estadoPago) && r.estadoCurso !== 'Cancelado'),
    [reservas]
  );

  return { reservas, reservasActivas, ocupacion, locks, cargando, error };
}
