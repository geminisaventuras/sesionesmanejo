import { useTimerBase } from './useTimerBase';

/**
 * Hook para el estudiante. Solo lectura del temporizador.
 */
export function useTimerLectura(reservaActual) {
  const { sgta, setSgta, sgtaRef } = useTimerBase(reservaActual);
  
  return { 
    sgta, 
    setSgta, 
    sgtaRef,
    // Funciones vacías (no operativas)
    toggleModulo: () => {},
    pausarSesion: () => {},
    reanudarSesion: () => {}
  };
}
