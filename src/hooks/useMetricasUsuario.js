// @build: 2026-10-11 | id: METRICAS-USUARIO-HOOK | desc: Calcula métricas en vivo desde queries (ALT-B)
import { useState, useEffect, useRef } from 'react';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase';

const APP_ID = 'motoescuela-pro-v1';
const CACHE_TTL = 60000;
const LIMITE_QUERIES = 50;

const ESTADOS = ['pendientes', 'activos', 'en_progreso', 'pausados', 'completados', 'cancelados', 'rechazados', 'vencidos'];
const vacios = () => ESTADOS.reduce((a, e) => ({ ...a, [e]: 0 }), {});

function mapEstado(estadoPago, estadoCurso) {
  if (estadoPago === 'Pendiente') return 'pendientes';
  if (estadoPago === 'Rechazado') return 'rechazados';
  if (estadoPago === 'Cancelado') return 'cancelados';
  if (estadoPago === 'Aprobado') {
    // Reservas individuales: estadoCurso === 'Aprobado' (mayúscula) o 'Completado' (legacy).
    // Packs: estado === 'completado' | 'vencido' | 'cancelado' (minúscula, según schema).
    if (estadoCurso === 'Aprobado' || estadoCurso === 'Completado' || estadoCurso === 'completado') return 'completados';
    if (estadoCurso === 'vencido') return 'vencidos';
    if (estadoCurso === 'cancelado') return 'cancelados';
    return 'activos';
  }
  return 'pendientes';
}

export function useMetricasUsuario(uid, triggerInvalidacion) {
  const [cargando, setCargando] = useState(false);
  const [datos, setDatos] = useState(null);
  const cacheRef = useRef({ uid: null, data: null, timestamp: 0, lastTrigger: null });

  useEffect(() => {
    if (!uid) { setDatos(null); return; }
    // FIX-METRICAS-CACHE: caché válido solo si uid coincide, no expiró, y el trigger no cambió
    const cacheVigente = cacheRef.current.uid === uid
      && (Date.now() - cacheRef.current.timestamp) < CACHE_TTL
      && cacheRef.current.lastTrigger === triggerInvalidacion;
    if (cacheVigente) {
      setDatos(cacheRef.current.data);
      return;
    }
    let activo = true;
    setCargando(true);
    (async () => {
      try {
        const base = ['artifacts', APP_ID, 'public', 'data'];
        const [rSnap, aSnap, pSnap] = await Promise.all([
          getDocs(query(collection(db, ...base, 'reservas'),        where('userId', '==', uid), limit(LIMITE_QUERIES))),
          getDocs(query(collection(db, ...base, 'accesosTeoricos'), where('userId', '==', uid), limit(LIMITE_QUERIES))),
          getDocs(query(collection(db, ...base, 'reservasPack'),    where('userId', '==', uid), limit(LIMITE_QUERIES)))
        ]);
        if (!activo) return;
        const totales = vacios();
        const porServicio = { sesionesPracticas: vacios(), modulosTeoricos: vacios(), packs: vacios() };
        rSnap.docs.forEach(d => {
          const r = d.data();
          const est = mapEstado(r.estadoPago, r.estadoCurso);
          if (r.tipoReserva === 'pack_sub') {
            if (r.estadoPago === 'Aprobado') porServicio.sesionesPracticas[est]++;
            return;
          }
          totales[est]++;
          porServicio.sesionesPracticas[est]++;
        });
        aSnap.docs.forEach(d => {
          const a = d.data();
          // FIX-METRICAS-TEORICOS-LEGACY: accesos rechazados con flujo pre-T2.1
          // (estadoPago === 'Pendiente' + motivoRechazo + rechazadoEn) se cuentan como 'rechazados'.
          // Solo es legacy si NO tiene historialRechazos (flujo nuevo).
          const sinHistorial = !Array.isArray(a.historialRechazos) || a.historialRechazos.length === 0;
          const esLegacyRechazado = a.estadoPago === 'Pendiente' && !!a.motivoRechazo && !!a.rechazadoEn && sinHistorial;
          const est = esLegacyRechazado ? 'rechazados' : mapEstado(a.estadoPago, null);
          // Accesos que vienen del pack NO son compras independientes
          // (van incluidos en el precio del pack). Standalone sí cuentan.
          if (a.origen !== 'pack') {
            totales[est]++;
          }
          porServicio.modulosTeoricos[est]++;
        });
        pSnap.docs.forEach(d => {
          const p = d.data();
          const est = mapEstado(p.estadoPago, p.estado);
          totales[est]++;
          porServicio.packs[est]++;
        });
        const resultado = { totales, porServicio };
        cacheRef.current = { uid, data: resultado, timestamp: Date.now(), lastTrigger: triggerInvalidacion };
        setDatos(resultado);
      } catch (err) {
        console.warn('[useMetricasUsuario] Error:', err.code || err.message);
        if (activo) setDatos(null);
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => { activo = false; };
  }, [uid, triggerInvalidacion]);

  return { metricas: datos, cargando };
}

export default useMetricasUsuario;
