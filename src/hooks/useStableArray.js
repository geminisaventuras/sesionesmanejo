// @build: 2026-11-17 | id: USE-STABLE-ARRAY | desc: Estabiliza arrays comparando por ID (evita re-renders infinitos)
import { useRef } from 'react';

/**
 * Compara un array nuevo contra el anterior por IDs.
 * Si el contenido es identico, retorna la misma referencia (evita re-render).
 * Si hay diferencias, actualiza la ref y retorna el nuevo array.
 * 
 * Uso:
 *   const [rawArray, setRawArray] = useState([]);
 *   const stableArray = useStableArray(rawArray);
 * 
 * @param {Array} newArray - Array a estabilizar
 * @returns {Array} - Array estable (misma referencia si contenido identico)
 */
export function useStableArray(newArray) {
  const lastArrayRef = useRef(newArray);

  // Guard: si el nuevo array no existe o esta vacio, no tocar la ref
  if (!Array.isArray(newArray)) return lastArrayRef.current;

  const sonIguales =
    newArray.length === lastArrayRef.current.length &&
    newArray.every((item, i) => item?.id === lastArrayRef.current[i]?.id);

  if (sonIguales) {
    return lastArrayRef.current; // Misma referencia, evita re-render
  }

  lastArrayRef.current = newArray;
  return newArray;
}
