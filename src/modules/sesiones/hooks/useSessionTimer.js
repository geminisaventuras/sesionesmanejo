import { useState, useEffect, useRef, useCallback } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../shared/firebase/firebase';
import { SGTA_DEFAULTS } from '../constants';

const APP_ID = 'motoescuela-pro-v1';

export function useSessionTimer(reservaActual, saveReserva, showToast) {
  const [sgta, setSgta] = useState(() => ({ ...SGTA_DEFAULTS }));
  const sgtaRef = useRef(sgta);
  useEffect(() => { sgtaRef.current = sgta; }, [sgta]);

  // Tick
  useEffect(() => {
    const interval = setInterval(() => {
      setSgta(prev => {
        const nuevo = { ...prev };
        if (prev.generalActivo) nuevo.generalSegundos = (prev.generalSegundos || 0) + 1;
        if (prev.moduloActivo) nuevo.moduloSegundos = (prev.moduloSegundos || 0) + 1;
        if (prev.pausaActiva) nuevo.pausaSegundos = (prev.pausaSegundos || 0) + 1;
        return nuevo;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const actualizarCampos = async (campos) => {
    if (!reservaActual?.id) return;
    const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'reservas', reservaActual.id);
    await updateDoc(ref, campos);
  };

  // Receso automático
  useEffect(() => {
    if (!sgta.moduloActivo || !sgta.moduloEnProgreso || !reservaActual) return;
    const duracionMaxima = 60;
    const tiempoTotal = duracionMaxima * 60 + 5 * 60;
    if (sgta.moduloSegundos >= tiempoTotal) {
      const modulosEstado = { ...(reservaActual.modulosEstado || {}) };
      const fecha = new Date().toISOString().split('T')[0];
      modulosEstado[sgta.moduloEnProgreso] = { fecha, duracion: duracionMaxima };
      actualizarCampos({ modulosEstado, moduloEnProgreso: null });
      setSgta(prev => ({ ...prev, moduloEnProgreso: null, moduloSegundos: 0, moduloActivo: false, generalActivo: true }));
      showToast(`"${sgta.moduloEnProgreso}" completado con receso`, 'success');
    }
  }, [sgta.moduloSegundos]);

  const iniciarModulo = useCallback(async (nombreModulo) => {
    if (!reservaActual) return;
    setSgta(prev => ({ ...prev, moduloEnProgreso: nombreModulo, moduloSegundos: 0, moduloActivo: true, generalActivo: true }));
    await actualizarCampos({ moduloEnProgreso: { modulo: nombreModulo, inicio: Date.now() } });
  }, [reservaActual]);

  const finalizarModulo = useCallback(async (nombreModulo) => {
    if (!reservaActual) return;
    const duracionMinutos = Math.ceil((sgtaRef.current?.moduloSegundos || 0) / 60);
    const modulosEstado = { ...(reservaActual.modulosEstado || {}) };
    const fecha = new Date().toISOString().split('T')[0];
    modulosEstado[nombreModulo] = { fecha, duracion: duracionMinutos };
    await actualizarCampos({ modulosEstado, moduloEnProgreso: null });
    setSgta(prev => ({ ...prev, moduloEnProgreso: null, moduloSegundos: 0, moduloActivo: false, generalActivo: true }));
    showToast(`"${nombreModulo}" completado (${duracionMinutos} min)`, 'success');
  }, [reservaActual, showToast]);

  const pausarSesion = useCallback(async (motivo) => {
    if (!reservaActual) return;
    setSgta(prev => ({ ...prev, pausaActiva: true, pausaInicio: Date.now(), pausaMotivo: motivo, pausaSegundos: 0, generalActivo: false, moduloActivo: false }));
    await actualizarCampos({ pausaActiva: { motivo, inicio: Date.now() } });
  }, [reservaActual]);

  const reanudarSesion = useCallback(async () => {
    if (!reservaActual) return;
    const pausaInicio = sgtaRef.current.pausaInicio;
    if (pausaInicio) {
      const duracionPausaMinutos = Math.floor((Date.now() - pausaInicio) / 60000);
      if (duracionPausaMinutos > 60) {
        showToast('Pausa excedió 60 min. Sesión finalizada.', 'error');
        setSgta(prev => ({ ...prev, generalActivo: false, moduloActivo: false, pausaActiva: false }));
        await actualizarCampos({ pausaActiva: null, moduloEnProgreso: null });
        return;
      }
      const nuevaDuracionSegundos = sgtaRef.current.pausaSegundos;
      const totalAcumulado = (sgtaRef.current.pausaTotalAcumulada || 0) + nuevaDuracionSegundos;
      const pausas = [...(reservaActual.pausas || []), {
        inicio: pausaInicio, fin: Date.now(),
        motivo: sgtaRef.current.pausaMotivo, duracion: duracionPausaMinutos
      }];
      await actualizarCampos({ pausas, pausaActiva: null, pausaTotalAcumulada: totalAcumulado });
      setSgta(prev => ({
        ...prev, pausaTotalAcumulada: totalAcumulado,
        pausaActiva: false, pausaInicio: null, pausaMotivo: '', pausaSegundos: 0,
        generalActivo: !!prev.moduloEnProgreso, moduloActivo: !!prev.moduloEnProgreso
      }));
    } else {
      setSgta(prev => ({
        ...prev, pausaActiva: false, pausaInicio: null, pausaMotivo: '', pausaSegundos: 0,
        generalActivo: !!prev.moduloEnProgreso, moduloActivo: !!prev.moduloEnProgreso
      }));
    }
  }, [reservaActual, showToast]);

  const toggleModulo = useCallback(async (nombreModulo) => {
    if (!reservaActual) return;
    const modulosEstado = { ...(reservaActual.modulosEstado || {}) };
    if (modulosEstado[nombreModulo]?.fecha) {
      if (!window.confirm(`¿Desmarcar "${nombreModulo}"?`)) return;
      delete modulosEstado[nombreModulo];
      if (sgtaRef.current.moduloEnProgreso === nombreModulo) {
        setSgta(prev => ({ ...prev, moduloEnProgreso: null, moduloSegundos: 0, moduloActivo: false }));
      }
      await actualizarCampos({ modulosEstado });
      showToast('Módulo reversado', 'info');
      return;
    }
    if (sgtaRef.current.moduloEnProgreso === nombreModulo && sgtaRef.current.moduloActivo) {
      await finalizarModulo(nombreModulo);
      return;
    }
    await iniciarModulo(nombreModulo);
  }, [reservaActual, showToast, iniciarModulo, finalizarModulo]);

  return { sgta, toggleModulo, pausarSesion, reanudarSesion };
}
