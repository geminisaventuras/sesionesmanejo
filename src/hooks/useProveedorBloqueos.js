import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { fechaVetHoy } from '../modules/shared/utils/reservaHelpers';

const CACHE_KEY_PREFIX = 'bloqueos_proveedor_';
const CACHE_DURATION = 10 * 60 * 1000;

const leerCache = (cacheKey) => {
  try {
    const raw = localStorage.getItem(cacheKey);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (!Array.isArray(data) || !timestamp) return null;
    if (Date.now() - timestamp >= CACHE_DURATION) return null;
    return data;
  } catch {
    return null;
  }
};

const guardarCache = (cacheKey, data) => {
  try {
    localStorage.setItem(cacheKey, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    // Sin cache: la agenda sigue funcionando con la lectura en vivo.
  }
};

export function useProveedorBloqueos(proveedorId) {
  const [bloqueos, setBloqueos] = useState([]);
  const [loading, setLoading] = useState(true);

  const cargarBloqueos = useCallback(async ({ forzar = false } = {}) => {
    if (!proveedorId) {
      setBloqueos([]);
      setLoading(false);
      return;
    }

    const cacheKey = CACHE_KEY_PREFIX + proveedorId;
    setLoading(true);

    if (!forzar) {
      const cached = leerCache(cacheKey);
      if (cached) {
        const fechaHoy = fechaVetHoy();
        setBloqueos(cached.filter((b) => b.fecha && b.fecha >= fechaHoy));
        setLoading(false);
        return;
      }
    }

    try {
      const fechaHoy = fechaVetHoy();
      const q = query(collection(db, 'bloqueosGlobales'), where('proveedorId', '==', proveedorId));
      const snapshot = await getDocs(q);
      const datos = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((b) => b.fecha && b.fecha >= fechaHoy);

      guardarCache(cacheKey, datos);
      setBloqueos(datos);
    } catch (error) {
      console.error('[useProveedorBloqueos] Error:', error);
    } finally {
      setLoading(false);
    }
  }, [proveedorId]);

  useEffect(() => {
    cargarBloqueos();
  }, [cargarBloqueos]);

  const invalidarCache = useCallback(() => {
    try {
      localStorage.removeItem(CACHE_KEY_PREFIX + proveedorId);
    } catch {
      // Nada que invalidar si el almacenamiento no está disponible.
    }
  }, [proveedorId]);

  return { bloqueos, loading, recargar: cargarBloqueos, invalidarCache };
}
