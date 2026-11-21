// @build: 2026-11-20 | id: FIX-PROVEEDOR-D2 | desc: Carga bloqueos de proveedor para D1 y D2 (cursos de 2 días)
import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Carga bloqueosGlobales del proveedor para las fechas consultadas.
 * D1 y D2 comparten el mismo array; afectaProveedor decide la fecha.
 *
 * @param {string} fecha  - D1 en 'YYYY-MM-DD'
 * @param {boolean} activo
 * @param {string|null} fecha2 - D2 en 'YYYY-MM-DD' (opcional)
 */
export function useBloqueosProveedorEstado(fecha, activo = true, fecha2 = null) {
  const [bloqueos, setBloqueos] = useState([]);
  const [cargando, setCargando] = useState(Boolean(activo && fecha));

  useEffect(() => {
    if (!fecha || !activo) {
      setBloqueos([]);
      setCargando(false);
      return;
    }

    setCargando(true);
    const fechas = [...new Set([fecha, fecha2].filter(Boolean))];
    const q = query(collection(db, 'bloqueosGlobales'), where('fecha', 'in', fechas));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const datos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBloqueos(datos);
      setCargando(false);
    }, (error) => {
      console.warn('[useBloqueosProveedor] Error:', error);
      setBloqueos([]);
      setCargando(false);
    });

    return () => unsubscribe();
  }, [fecha, fecha2, activo]);

  return { bloqueos, cargando };
}

// Compatibilidad: consumidores que solo necesitan el array.
export function useBloqueosProveedor(fecha, activo = true, fecha2 = null) {
  return useBloqueosProveedorEstado(fecha, activo, fecha2).bloqueos;
}