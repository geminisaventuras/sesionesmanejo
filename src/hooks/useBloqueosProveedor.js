import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export function useBloqueosProveedor(fecha, activo = true) {
  const [bloqueos, setBloqueos] = useState([]);

  useEffect(() => {
    if (!fecha || !activo) {
      setBloqueos([]);
      return;
    }

    const q = query(collection(db, 'bloqueosGlobales'), where('fecha', '==', fecha));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const datos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBloqueos(datos);
    }, (error) => {
      console.warn('[useBloqueosProveedor] Error:', error);
      setBloqueos([]);
    });

    return () => unsubscribe();
  }, [fecha, activo]);

  return bloqueos;
}