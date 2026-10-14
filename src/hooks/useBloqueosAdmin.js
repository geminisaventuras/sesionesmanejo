// @build: 2026-10-13 | id: FIX-AUTOJUMP-RACE-ALT-A | desc: Refactor ALT-A. Estado inicial null = "no cargado". Previene race condition en auto-jump.
// Estrategia (FIRE + MAMBA): getDocs puntual con filtrado en cliente.
// Colección pequeña (<50 docs). Evita listeners persistentes (Plan Spark).
// Estrategia diferenciada vs useBloqueosProveedor (que sí usa onSnapshot
// porque proveedores actualizan frecuentemente).
//
// ALT-A (confluencia FIRE + MAMBA + Deek, 2026-10-13):
//   `bloqueos === null` significa "no cargado aún".
//   `bloqueos === []`   significa "cargado, sin bloqueos".
// Esta distinción es crítica: `cargando` es true desde el primer render
// del consumidor, evitando que el auto-jump corra con datos vacíos.

import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

const APP_ID = 'motoescuela-pro-v1';
const COLL = 'bloqueosAdmin';

/**
 * Carga todos los bloqueosAdmin activos.
 *
 * @param {boolean} activo - Si false, no carga y limpia el estado.
 * @returns {{ bloqueos: object[], cargando: boolean, refrescar: () => Promise<void> }}
 */
export function useBloqueosAdmin(activo = true) {
  // ALT-A: null = "no cargado aún" | [] = "cargado, sin bloqueos"
  const [bloqueos, setBloqueos] = useState(null);

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
    cargar();
  }, [activo, cargar]);

  // Derivado: cargando = activo Y aún no tenemos datos
  const cargando = activo && bloqueos === null;

  return {
    bloqueos: bloqueos || [], // Contrato de salida: siempre array
    cargando,
    refrescar: cargar,
  };
}
