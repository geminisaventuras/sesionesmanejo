// @build: 2026-11-20 | id: FIX-ADMIN-BLOQUEOS-REALTIME | desc: Listener real de bloqueosAdmin para que el Paso 3 reaccione sin F5
// Estrategia: onSnapshot mientras el consumidor está activo (Paso 3 / modal).
// La colección es pequeña; el listener se destruye al salir del paso.
//
// ALT-A (confluencia FIRE + MAMBA + Deek, 2026-10-13):
//   `bloqueos === null` significa "no cargado aún".
//   `bloqueos === []`   significa "cargado, sin bloqueos".
// Esta distinción es crítica: `cargando` es true desde el primer render
// del consumidor, evitando que el auto-jump corra con datos vacíos.

import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

const APP_ID = 'motoescuela-pro-v1';
const COLL = 'bloqueosAdmin';

/**
 * Carga y escucha todos los bloqueosAdmin activos.
 *
 * @param {boolean} activo - Si false, no carga y limpia el estado.
 * @returns {{ bloqueos: object[], cargando: boolean, refrescar: () => Promise<void> }}
 */
export function useBloqueosAdmin(activo = true) {
  // ALT-A: null = "no cargado aún" | [] = "cargado, sin bloqueos"
  const [bloqueos, setBloqueos] = useState(null);

  // Refresco manual opcional para consumidores que no quieran esperar
  // al listener (no se usa en el flujo normal).
  const cargar = useCallback(async () => {
    try {
      const snap = await getDocs(collection(db, COLL));
      setBloqueos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error('[useBloqueosAdmin] Error cargando:', error);
      setBloqueos([]); // Fail-open: "cargado, sin bloqueos"
    }
  }, []);

  useEffect(() => {
    if (!activo) {
      setBloqueos(null); // Reset al desactivar
      return;
    }

    const unsubscribe = onSnapshot(
      collection(db, COLL),
      (snap) => {
        setBloqueos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      },
      (error) => {
        console.error('[useBloqueosAdmin] Error en listener:', error);
        setBloqueos([]); // Fail-open: evita dejar la UI bloqueada
      }
    );

    return () => unsubscribe();
  }, [activo]);

  // Derivado: cargando = activo Y aún no tenemos datos
  const cargando = activo && bloqueos === null;

  return {
    bloqueos: bloqueos || [], // Contrato de salida: siempre array
    cargando,
    refrescar: cargar,
  };
}
