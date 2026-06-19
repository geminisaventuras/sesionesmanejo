// @build: 2026-06-20.22-00-00 | id: TIMER-SESION-INICIADA | desc: Relojes solo corren si se ha iniciado un módulo (sesionIniciada = true)
import { useState, useEffect, useRef, useCallback } from 'react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../shared/firebase/firebase';
import { SGTA_DEFAULTS } from '../constants';
import { alertas } from '../../shared/utils/alertas';

const APP_ID = 'motoescuela-pro-v1';

export function useSessionTimer(reservaId, esInstructor, saveReserva, showToast) {
  const [reserva, setReserva] = useState(null);
  const [sgta, setSgta] = useState(() => ({
    ...SGTA_DEFAULTS,
    _moduloExcedido: false,
    reservaActiva: false,
    reservaRestante: 0,
    pausaAlIniciarReserva: null,
    sesionIniciada: !!reserva?.sesionDiariaInicio
  }));
  const sgtaRef = useRef(sgta);
  useEffect(() => { sgtaRef.current = sgta; }, [sgta]);

  const [modalConfirmacion, setModalConfirmacion] = useState(null);
  const pedirConfirmacion = useCallback((titulo, mensaje) => {
    return new Promise((resolve) => {
      setModalConfirmacion({ titulo, mensaje, onConfirm: () => { setModalConfirmacion(null); resolve(true); }, onCancel: () => { setModalConfirmacion(null); resolve(false); } });
    });
  }, []);

  useEffect(() => {
    if (!reservaId) return;
    const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'reservas', reservaId);
    const unsub = onSnapshot(ref, (snap) => { if (snap.exists()) setReserva({ id: snap.id, ...snap.data() }); }, (err) => console.error('Error en suscripción:', err));
    return () => unsub();
  }, [reservaId]);

  // Recalcular tiempos
  useEffect(() => {
    if (!reserva) return;
    const ahora = Date.now();
    const pausaActiva = !!reserva.pausaActiva;
    const tieneModulo = !!reserva.moduloEnProgreso?.inicio;
    const tieneSesionDiaria = !!reserva.sesionDiariaInicio;
    const tieneSesionTotal = !!reserva.sesionTotalInicio;
    
    let diarioSegundos = 0, diarioCompletado = !!reserva.sesionDiariaCompletada;
    const limiteDiario = reserva.sesionDiariaLimite || 120;
    if (tieneSesionDiaria && !diarioCompletado) {
      diarioSegundos = Math.max(0, Math.floor((ahora - reserva.sesionDiariaInicio) / 1000));
      if (diarioSegundos >= limiteDiario * 60) { diarioCompletado = true; diarioSegundos = limiteDiario * 60; }
    }
    
    let totalSegundos = 0, totalCompletado = !!reserva.sesionTotalCompletada;
    const limiteTotal = reserva.sesionTotalLimite || 240;
    if (tieneSesionTotal && !totalCompletado) {
      totalSegundos = Math.max(0, Math.floor((ahora - reserva.sesionTotalInicio) / 1000));
      if (totalSegundos >= limiteTotal * 60) { totalCompletado = true; totalSegundos = limiteTotal * 60; }
    }
    
    let moduloSegundos = 0, moduloActivo = false;
    if (tieneModulo) {
      const inicioReal = reserva.moduloEnProgreso.inicio - (reserva.modulosEstado?.[reserva.moduloEnProgreso.modulo]?.duracionParcial || 0) * 60000;
      moduloSegundos = Math.max(0, Math.floor((ahora - inicioReal) / 1000));
      moduloActivo = !pausaActiva && !sgtaRef.current._moduloExcedido;
    }
    
    let pausaSegundos = 0;
    if (pausaActiva && reserva.pausaActiva?.inicio) { pausaSegundos = Math.max(0, Math.floor((ahora - reserva.pausaActiva.inicio) / 1000)); }
    
    const acumulado = reserva.pausaTotalAcumulada ?? (reserva.pausas || []).reduce((acc, p) => acc + (p.duracion || 0) * 60, 0);
    const tiempoExtra = reserva.tiempoExtraSesionAcumulado || 0;
    const tiempoEfectivo = Math.max(0, (limiteTotal * 60) - acumulado);
    
    setSgta(prev => ({
      ...prev, generalSegundos: totalSegundos, diarioSegundos, moduloSegundos, pausaSegundos,
      pausaTotalAcumulada: acumulado, tiempoExtraAcumulado: tiempoExtra, tiempoEfectivo,
      moduloEnProgreso: reserva.moduloEnProgreso?.modulo || null,
      generalActivo: tieneSesionDiaria && !pausaActiva && !diarioCompletado,
      moduloActivo, pausaActiva,
      pausaMotivo: reserva.pausaActiva?.motivo || '', pausaInicio: reserva.pausaActiva?.inicio || null,
      diaActual: reserva.diaActual || 1, diarioCompletado, totalCompletado, limiteDiario, limiteTotal,
      sesionIniciada: tieneSesionDiaria
    }));
  }, [reserva?.moduloEnProgreso?.inicio, reserva?.moduloEnProgreso?.modulo, reserva?.pausaActiva?.inicio, reserva?.pausaActiva?.motivo, reserva?.sesionDiariaInicio, reserva?.sesionTotalInicio, reserva?.sesionDiariaCompletada, reserva?.sesionTotalCompletada]);

  // Tick: RELOJES SOLO CORREN SI sesionIniciada ES TRUE
  useEffect(() => {
    if (!reserva) return;
    const interval = setInterval(() => {
      setSgta(prev => {
        const nuevo = { ...prev };
        const ahora = Date.now();
        
        // Reloj general: solo corre si la sesión fue iniciada
        if (prev.sesionIniciada && !prev.totalCompletado) {
          nuevo.generalSegundos = (prev.generalSegundos || 0) + 1;
          if (nuevo.generalSegundos >= (prev.limiteTotal || 240) * 60) { nuevo.generalSegundos = (prev.limiteTotal || 240) * 60; nuevo.totalCompletado = true; }
        }
        
        // Reloj diario: solo corre si la sesión fue iniciada
        if (prev.sesionIniciada && !prev.diarioCompletado) {
          nuevo.diarioSegundos = (prev.diarioSegundos || 0) + 1;
          if (nuevo.diarioSegundos >= (prev.limiteDiario || 120) * 60) { nuevo.diarioSegundos = (prev.limiteDiario || 120) * 60; nuevo.diarioCompletado = true; }
        }
        
        if ((prev.moduloActivo || prev._moduloExcedido) && !prev.pausaActiva) {
          nuevo.moduloSegundos = (prev.moduloSegundos || 0) + 1;
          if (nuevo.moduloSegundos === 3300 && !prev._recesoAlerta) { alertas.recesoAutomatico(); showToast('⏳ Receso automático en 5 minutos', 'info'); nuevo._recesoAlerta = true; }
          if (nuevo.moduloSegundos >= 3600 && !prev._moduloExcedido) { alertas.limiteModulo(); showToast(`⏰ Tiempo agotado. El módulo "${prev.moduloEnProgreso}" alcanzó su límite de 60 min.`, 'error'); nuevo._moduloExcedido = true; nuevo.moduloActivo = false; }
        }
        
        if (prev.pausaActiva && prev.pausaInicio) {
          nuevo.pausaSegundos = Math.floor((ahora - prev.pausaInicio) / 1000);
        } else {
          nuevo.pausaSegundos = 0;
        }
        
        if (prev.reservaActiva && prev.reservaRestante > 0) {
          nuevo.reservaRestante = prev.reservaRestante - 1;
          nuevo.generalSegundos = (prev.generalSegundos || 0) + 1;
          if (nuevo.reservaRestante <= 0) { nuevo.reservaActiva = false; nuevo.reservaRestante = 0; nuevo.pausaTotalAcumulada = 0; nuevo.tiempoEfectivo = (prev.limiteTotal || 240) * 60; }
        }
        
        return nuevo;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [reserva]);

  const actualizar = async (campos) => { if (!reserva?.id) return; await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'reservas', reserva.id), campos); };

  const activarReserva = useCallback(async () => {
    if (!sgtaRef.current.totalCompletado && !sgtaRef.current.diarioCompletado) return;
    if (sgtaRef.current.pausaTotalAcumulada <= 0) return;
    setSgta(prev => ({ ...prev, reservaActiva: true, reservaRestante: prev.pausaTotalAcumulada, pausaAlIniciarReserva: prev.pausaTotalAcumulada, totalCompletado: false }));
  }, []);
  const pausarReserva = useCallback(() => { setSgta(prev => ({ ...prev, reservaActiva: false })); }, []);
  const reanudarReserva = useCallback(() => { setSgta(prev => prev.reservaRestante > 0 ? { ...prev, reservaActiva: true } : prev); }, []);
  const detenerReserva = useCallback(async () => {
    const restante = sgtaRef.current.reservaRestante;
    setSgta(prev => ({ ...prev, reservaActiva: false, pausaTotalAcumulada: restante, tiempoEfectivo: Math.max(0, (prev.limiteTotal || 240) * 60 - restante), totalCompletado: true }));
    if (reserva) await actualizar({ pausaTotalAcumulada: restante, tiempoEfectivo: Math.max(0, (sgtaRef.current.limiteTotal || 240) * 60 - restante) });
  }, [reserva]);

  const iniciarModulo = useCallback(async (nombre) => {
    if (!reserva) return;
    const duracionPrevia = (reserva.modulosEstado || {})[nombre]?.duracionParcial || 0;
    const duracionExtraPrevia = (reserva.modulosEstado || {})[nombre]?.duracionExtraParcial || 0;
    const segundosIniciales = (duracionPrevia + duracionExtraPrevia) * 60;
    const campos = { moduloEnProgreso: { modulo: nombre, inicio: Date.now() - segundosIniciales * 1000 } };
    if (!reserva.sesionDiariaInicio) { campos.sesionDiariaInicio = Date.now(); campos.sesionDiariaLimite = 120; campos.diaActual = reserva.diaActual || 1; }
    if (!reserva.sesionTotalInicio) { campos.sesionTotalInicio = Date.now(); campos.sesionTotalLimite = 240; }
    alertas.inicioModulo();
    setSgta(prev => ({ ...prev, moduloEnProgreso: nombre, moduloSegundos: segundosIniciales, moduloActivo: true, generalActivo: true, _recesoAlerta: false, _moduloExcedido: segundosIniciales >= 3600, sesionIniciada: true }));
    await actualizar(campos);
  }, [reserva]);

  const finalizarModulo = useCallback(async (nombre) => {
    if (!reserva) return;
    const dur = Math.ceil((sgtaRef.current?.moduloSegundos || 0) / 60);
    const modulosEstado = { ...(reserva.modulosEstado || {}) };
    modulosEstado[nombre] = { fecha: new Date().toISOString().split('T')[0], duracion: Math.min(dur, 60), duracionExtra: Math.max(0, dur - 60) };
    delete modulosEstado[nombre].duracionParcial; delete modulosEstado[nombre].duracionExtraParcial;
    alertas.moduloCompletado();
    await actualizar({ modulosEstado, moduloEnProgreso: null });
    setSgta(prev => ({ ...prev, moduloEnProgreso: null, moduloSegundos: 0, moduloActivo: false, _moduloExcedido: false }));
    showToast(`"${nombre}" completado (${dur} min)`, 'success');
  }, [reserva, showToast]);

  const pausarSesion = useCallback(async (motivo) => {
    if (!reserva) return;
    alertas.sesionPausada();
    setSgta(prev => ({ ...prev, pausaActiva: true, pausaInicio: Date.now(), pausaMotivo: motivo, pausaSegundos: 0, moduloActivo: false }));
    await actualizar({ pausaActiva: { motivo, inicio: Date.now() } });
  }, [reserva]);

  const reanudarSesion = useCallback(async () => {
    if (!reserva) return;
    const pausaInicio = sgtaRef.current.pausaInicio;
    if (pausaInicio) {
      const durMin = Math.floor((Date.now() - pausaInicio) / 60000);
      if (durMin > 60) { alertas.pausaExcedida(); showToast('Pausa excedió 60 min. Sesión finalizada.', 'error'); setSgta(prev => ({ ...prev, pausaActiva: false })); await actualizar({ pausaActiva: null, moduloEnProgreso: null }); return; }
      const pausas = [...(reserva.pausas || []), { inicio: pausaInicio, fin: Date.now(), motivo: sgtaRef.current.pausaMotivo, duracion: durMin }];
      const totalAcumulado = (sgtaRef.current.pausaTotalAcumulada || 0) + sgtaRef.current.pausaSegundos;
      const tiempoEfectivo = Math.max(0, (sgtaRef.current.limiteTotal || 240) * 60 - totalAcumulado);
      await actualizar({ pausas, pausaActiva: null, pausaTotalAcumulada: totalAcumulado, tiempoEfectivo });
      setSgta(prev => ({ ...prev, pausaTotalAcumulada: totalAcumulado, tiempoEfectivo }));
    }
    alertas.sesionReanudada();
    setSgta(prev => ({ ...prev, pausaActiva: false, pausaInicio: null, pausaMotivo: '', pausaSegundos: 0, moduloActivo: !!prev.moduloEnProgreso && !prev._moduloExcedido }));
  }, [reserva, showToast]);

  const toggleModulo = useCallback(async (nombre) => {
    if (!reserva) return;
    const modulosEstado = { ...(reserva.modulosEstado || {}) };
    if (modulosEstado[nombre]?.fecha) {
      const confirmado = await pedirConfirmacion('Revertir módulo', `¿Desea revertir "${nombre}"? El tiempo acumulado se conservará.`);
      if (!confirmado) return;
      const duracionParcial = modulosEstado[nombre].duracion || 0;
      const duracionExtraParcial = modulosEstado[nombre].duracionExtra || 0;
      delete modulosEstado[nombre]; modulosEstado[nombre] = { duracionParcial, duracionExtraParcial };
      await actualizar({ modulosEstado });
      const segundosIniciales = (duracionParcial + duracionExtraParcial) * 60;
      setSgta(prev => ({ ...prev, moduloEnProgreso: nombre, moduloSegundos: segundosIniciales, moduloActivo: true, generalActivo: true, _recesoAlerta: false, _moduloExcedido: segundosIniciales >= 3600 }));
      await actualizar({ moduloEnProgreso: { modulo: nombre, inicio: Date.now() - segundosIniciales * 1000 } });
      showToast('Módulo reversado. Tiempo conservado.', 'info'); return;
    }
    if (sgtaRef.current.moduloEnProgreso === nombre && (sgtaRef.current.moduloActivo || sgtaRef.current._moduloExcedido)) {
      const durMinutos = Math.ceil((sgtaRef.current?.moduloSegundos || 0) / 60);
      const confirmado = await pedirConfirmacion('Finalizar módulo', `¿Está seguro de finalizar "${nombre}"? Duró ${durMinutos} minutos.`);
      if (!confirmado) return; await finalizarModulo(nombre); return;
    }
    await iniciarModulo(nombre);
  }, [reserva, showToast, iniciarModulo, finalizarModulo, pedirConfirmacion]);

  return { reserva, sgta, modalConfirmacion, toggleModulo: esInstructor ? toggleModulo : () => {}, pausarSesion: esInstructor ? pausarSesion : () => {}, reanudarSesion: esInstructor ? reanudarSesion : () => {}, activarReserva, pausarReserva, reanudarReserva, detenerReserva };
}
