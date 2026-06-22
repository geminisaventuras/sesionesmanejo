// @build: 2026-06-20.08-00-00 | id: TIMER-DERIVADO | desc: Cálculo derivado desde timestamps. Persiste tras recarga. Cero impacto en plan Spark.
import { useState, useEffect, useRef } from 'react';
import { SGTA_DEFAULTS } from '../constants';

export function useTimerBase(reservaActual) {
  // Inicialización derivada de Firestore (no usa estado acumulativo)
  const [sgta, setSgta] = useState(() => {
    const ahora = Date.now();
    const acumulado = reservaActual?.pausaTotalAcumulada ?? 
      (reservaActual?.pausas || []).reduce((acc, p) => acc + (p.duracion || 0) * 60, 0);
    
    let generalSegundosInicial = 0;
    let moduloSegundosInicial = 0;
    let pausaSegundosInicial = 0;
    
    if (reservaActual?.moduloEnProgreso?.inicio) {
      const transcurrido = Math.max(0, Math.floor((ahora - reservaActual.moduloEnProgreso.inicio) / 1000));
      generalSegundosInicial = transcurrido;
      moduloSegundosInicial = transcurrido;
    }
    
    if (reservaActual?.pausaActiva?.inicio) {
      pausaSegundosInicial = Math.max(0, Math.floor((ahora - reservaActual.pausaActiva.inicio) / 1000));
    }
    
    return {
      ...SGTA_DEFAULTS,
      pausaTotalAcumulada: acumulado,
      generalSegundos: generalSegundosInicial,
      moduloSegundos: moduloSegundosInicial,
      pausaSegundos: pausaSegundosInicial,
      moduloEnProgreso: reservaActual?.moduloEnProgreso?.modulo || null,
      moduloActivo: !!reservaActual?.moduloEnProgreso && !reservaActual?.pausaActiva,
      generalActivo: !!reservaActual?.moduloEnProgreso && !reservaActual?.pausaActiva,
      pausaActiva: !!reservaActual?.pausaActiva,
      pausaMotivo: reservaActual?.pausaActiva?.motivo || '',
      pausaInicio: reservaActual?.pausaActiva?.inicio || null,
    };
  });
  
  const sgtaRef = useRef(sgta);
  useEffect(() => { sgtaRef.current = sgta; }, [sgta]);

  // Tick del temporizador (cálculo derivado, no acumulativo)
  useEffect(() => {
    const interval = setInterval(() => {
      setSgta(prev => {
        const nuevo = { ...prev };
        const ahora = Date.now();
        
        if (prev.generalActivo) {
          nuevo.generalSegundos = (prev.generalSegundos || 0) + 1;
        }
        if (prev.moduloActivo) {
          nuevo.moduloSegundos = (prev.moduloSegundos || 0) + 1;
        }
        // Cálculo derivado para pausa: siempre desde el timestamp real
        if (prev.pausaActiva && prev.pausaInicio) {
          nuevo.pausaSegundos = Math.floor((ahora - prev.pausaInicio) / 1000);
        } else {
          nuevo.pausaSegundos = 0;
        }
        return nuevo;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sincronización con Firestore en tiempo real
  useEffect(() => {
    if (!reservaActual) return;
    const ahora = Date.now();
    const pausaActiva = !!reservaActual.pausaActiva;
    const moduloEnProgreso = reservaActual.moduloEnProgreso?.modulo || null;
    const generalActivo = !!reservaActual.moduloEnProgreso && !pausaActiva;
    const moduloActivo = !!reservaActual.moduloEnProgreso && !pausaActiva;
    
    setSgta(prev => ({
      ...prev,
      pausaActiva,
      pausaMotivo: reservaActual.pausaActiva?.motivo || '',
      pausaInicio: reservaActual.pausaActiva?.inicio || null,
      pausaSegundos: pausaActiva && reservaActual.pausaActiva?.inicio 
        ? Math.floor((ahora - reservaActual.pausaActiva.inicio) / 1000) 
        : 0,
      moduloEnProgreso,
      generalActivo,
      moduloActivo,
    }));
  }, [reservaActual?.pausaActiva?.inicio, reservaActual?.moduloEnProgreso?.modulo]);

  return { sgta, setSgta, sgtaRef };
}
