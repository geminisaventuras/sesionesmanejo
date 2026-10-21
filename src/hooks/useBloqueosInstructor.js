// @build: 2026-10-20 | id: FEATURE-BLOQUEOS-INSTRUCTORES-HOOK-v2 | desc: Hook corregido sin filtro de fecha (SSOT con afectaInstructor).
// Estrategia (FIRE + MAMBA): onSnapshot con filtro por estado=activo.
// El filtro por fecha se hace en cada llamada a afectaInstructor (helper),
// NO en el hook. Razón:
//   - La cinta de fechas evalúa 30 días futuros, no solo form.fecha1.
//   - Las sesiones de 2 días necesitan evaluar fecha1 Y fecha2.
//   - Filtrar por fecha en el hook descartaría bloqueos válidos para otros días.
//
// Consistencia con useBloqueosAdmin (que también carga todos los bloqueos
// y delega el filtro por fecha al helper afectaFechaAdmin).
//
// Schema de bloqueosInstructores:
//   { instructorId, fechaInicio, fechaFin, todoElDia, horarios[], sedeId,
//     motivo, estado: 'activo'|'cancelado', creadoPor, createdAt, updatedAt }

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Carga TODOS los bloqueos activos de instructores.
 * El filtro por fecha + instructor + hora lo hace afectaInstructor.
 *
 * @param {boolean} activo - Si false, no carga y limpia el estado.
 * @returns {object[]} Array de bloqueos activos (sin filtro de fecha).
 */
export function useBloqueosInstructor(activo = true) {
  const [bloqueos, setBloqueos] = useState([]);

  useEffect(() => {
    if (!activo) {
      setBloqueos([]);
      return;
    }

    // Solo bloqueos activos (soft-delete filtra 'cancelado').
    // Sin filtro de fecha: el hook es agnóstico al día evaluado.
    const q = query(
      collection(db, 'bloqueosInstructores'),
      where('estado', '==', 'activo')
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const datos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setBloqueos(datos);
      },
      (error) => {
        console.warn('[useBloqueosInstructor] Error:', error);
        setBloqueos([]);
      }
    );

    return () => unsubscribe();
  }, [activo]);

  return bloqueos;
}
