import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

const CACHE_KEY_PREFIX = 'bloqueos_proveedor_';
const CACHE_DURATION = 10 * 60 * 1000;

export function useProveedorBloqueos(proveedorId) {
  const [bloqueos, setBloqueos] = useState([]);
  const [loading, setLoading] = useState(true);

  const cargarBloqueos = useCallback(async () => {
    if (!proveedorId) {
      setBloqueos([]);
      setLoading(false);
      return;
    }

    const cacheKey = CACHE_KEY_PREFIX + proveedorId;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        setBloqueos(data);
        setLoading(false);
        return;
      }
    }

    try {
      const hoy = new Date();
      const fechaHoy = hoy.toISOString().split('T')[0];
      const fechaLimite = new Date(hoy);
      fechaLimite.setMonth(fechaLimite.getMonth() + 6);
      const fechaLimiteISO = fechaLimite.toISOString().split('T')[0];

      const q = query(collection(db, 'bloqueosGlobales'), where('proveedorId', '==', proveedorId));
      const snapshot = await getDocs(q);
      const datos = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(b => b.fecha >= fechaHoy && b.fecha <= fechaLimiteISO);

      localStorage.setItem(cacheKey, JSON.stringify({ data: datos, timestamp: Date.now() }));
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
    const cacheKey = CACHE_KEY_PREFIX + proveedorId;
    localStorage.removeItem(cacheKey);
  }, [proveedorId]);

  return { bloqueos, loading, recargar: cargarBloqueos, invalidarCache };
}