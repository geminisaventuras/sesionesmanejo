// @build: 2026-06-20.17-00-00 | id: TIMER-SESION-DIARIA | desc: sesionDiariaInicio, sesionDiariaLimite, tiempoExtraSesionAcumulado. Reloj general independiente del módulo.
import { useState, useEffect, useRef, useCallback } from 'react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../shared/firebase/firebase';
import { SGTA_DEFAULTS } from '../constants';
import { alertas } from '../../shared/utils/alertas';

const APP_ID = 'motoescuela-pro-v1';

export function useSessionTimer(reservaId, esInstructor, saveReserva, showToast) {
  const [reserva, setReserva] = useState(null);
  const [sgta, setSgta] = useState({ ...SGTA_DEFAULTS, _moduloExcedido: false });
  const sgtaRef = useRef(sgta);
  useEffect(() => { sgtaRef.current = sgta; }, [sgta]);

  // Modal de confirmación
  const [modalConfirmacion, setModalConfirmacion] = useState(null);
  const pedirConfirmacion = useCallback((titulo, mensaje) => {
    return new Promise((resolve) => {
      setModalConfirmacion({
        titulo, mensaje,
        onConfirm: () => { setModalConfirmacion(null); resolve(true); },
        onCancel: () => { setModalConfirmacion(null); resolve(false); }
      });
    });
  }, []);

  // Suscripción a Firestore
  useEffect(() => {
    if (!reservaId) return;
    const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'reservas', reservaId);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) setReserva({ id: snap.id, ...snap.data() });
    }, (err) => console.error('Error en suscripción:', err));
    return () => unsub();
  }, [reservaId]);

  // Recalcular tiempos cuando cambia la reserva
  useEffect(() => {
    if (!reserva) return;
    const ahora = Date.now();
    const pausaActiva = !!reserva.pausaActiva;
    const tieneModulo = !!reserva.moduloEnProgreso?.inicio;
    const tieneSesionDiaria = !!reserva.sesionDiariaInicio;
    const tieneSesionTotal = !!reserva.sesionTotalInicio;
    
    // Tiempo de sesión diaria (D1/D2)
    let diarioSegundos = 0;
    let diarioCompletado = !!reserva.sesionDiariaCompletada;
    let limiteDiario = reserva.sesionDiariaLimite || 120;
    
    if (tieneSesionDiaria && !diarioCompletado) {
      diarioSegundos = Math.max(0, Math.floor((ahora - reserva.sesionDiariaInicio) / 1000));
      if (diarioSegundos >= limiteDiario * 60) {
        diarioCompletado = true;
        diarioSegundos = limiteDiario * 60;
      }
    }
    
    // Tiempo de sesión total (4h)
    let totalSegundos = 0;
    let totalCompletado = !!reserva.sesionTotalCompletada;
    let limiteTotal = reserva.sesionTotalLimite || 240;
    
    if (tieneSesionTotal && !totalCompletado) {
      totalSegundos = Math.max(0, Math.floor((ahora - reserva.sesionTotalInicio) / 1000));
      if (totalSegundos >= limiteTotal * 60) {
        totalCompletado = true;
        totalSegundos = limiteTotal * 60;
      }
    }
    
    // Tiempo de módulo
    let moduloSegundos = 0;
    let moduloActivo = false;
    if (tieneModulo) {
      const inicioReal = reserva.moduloEnProgreso.inicio - (reserva.modulosEstado?.[reserva.moduloEnProgreso.modulo]?.duracionParcial || 0) * 60000;
      const transcurrido = Math.max(0, Math.floor((ahora - inicioReal) / 1000));
      if (pausaActiva && reserva.pausaActiva?.inicio) {
        const pausaActual = Math.max(0, Math.floor((ahora - reserva.pausaActiva.inicio) / 1000));
        moduloSegundos = Math.max(0, transcurrido - pausaActual);
      } else {
        moduloSegundos = transcurrido;
      }
      moduloActivo = !pausaActiva && !sgtaRef.current._moduloExcedido;
    }
    
    // Tiempo de pausa actual
    let pausaSegundos = 0;
    if (pausaActiva && reserva.pausaActiva?.inicio) {
      pausaSegundos = Math.max(0, Math.floor((ahora - reserva.pausaActiva.inicio) / 1000));
    }
    
    // Pausa acumulada
    const acumulado = reserva.pausaTotalAcumulada ?? 
      (reserva.pausas || []).reduce((acc, p) => acc + (p.duracion || 0) * 60, 0);
    
    // Tiempo extra de sesión
    const tiempoExtra = reserva.tiempoExtraSesionAcumulado || 0;
    
    // General activo = sesión diaria iniciada Y no en pausa Y no completada
    const generalActivo = tieneSesionDiaria && !pausaActiva && !diarioCompletado;
    
    setSgta(prev => ({
      ...prev,
      generalSegundos: totalSegundos,
      diarioSegundos,
      moduloSegundos,
      pausaSegundos,
      pausaTotalAcumulada: acumulado,
      tiempoExtraAcumulado: tiempoExtra,
      moduloEnProgreso: reserva.moduloEnProgreso?.modulo || null,
      generalActivo,
      moduloActivo,
      pausaActiva,
      pausaMotivo: reserva.pausaActiva?.motivo || '',
      pausaInicio: reserva.pausaActiva?.inicio || null,
      diaActual: reserva.diaActual || 1,
      diarioCompletado,
      totalCompletado,
      limiteDiario,
      limiteTotal,
    }));
  }, [
    reserva?.moduloEnProgreso?.inicio,
    reserva?.moduloEnProgreso?.modulo,
    reserva?.pausaActiva?.inicio,
    reserva?.pausaActiva?.motivo,
    reserva?.sesionDiariaInicio,
    reserva?.sesionTotalInicio,
    reserva?.sesionDiariaCompletada,
    reserva?.sesionTotalCompletada
  ]);

  // Tick del temporizador
  useEffect(() => {
    if (!reserva) return;
    const interval = setInterval(() => {
      setSgta(prev => {
        const nuevo = { ...prev };
        const ahora = Date.now();
        
        // Reloj general (sesión total)
        if (prev.generalActivo && !prev.totalCompletado) {
          nuevo.generalSegundos = (prev.generalSegundos || 0) + 1;
          if (nuevo.generalSegundos >= (prev.limiteTotal || 240) * 60) {
            nuevo.generalSegundos = (prev.limiteTotal || 240) * 60;
            nuevo.totalCompletado = true;
          }
        }
        
        // Reloj diario
        if (prev.generalActivo && !prev.diarioCompletado) {
          nuevo.diarioSegundos = (prev.diarioSegundos || 0) + 1;
          if (nuevo.diarioSegundos >= (prev.limiteDiario || 120) * 60) {
            nuevo.diarioSegundos = (prev.limiteDiario || 120) * 60;
            nuevo.diarioCompletado = true;
          }
        }
        
        // Módulo
        if (prev.moduloActivo || prev._moduloExcedido) {
          nuevo.moduloSegundos = (prev.moduloSegundos || 0) + 1;
          
          if (nuevo.moduloSegundos === 3300 && !prev._recesoAlerta) {
            alertas.recesoAutomatico();
            showToast('⏳ Receso automático en 5 minutos', 'info');
            nuevo._recesoAlerta = true;
          }
          
          if (nuevo.moduloSegundos >= 3600 && !prev._moduloExcedido) {
            alertas.limiteModulo();
            showToast(`⏰ Tiempo agotado. El módulo "${prev.moduloEnProgreso}" alcanzó su límite de 60 min.`, 'error');
            nuevo._moduloExcedido = true;
            nuevo.moduloActivo = false;
          }
        }
        
        // Pausa
        if (prev.pausaActiva && prev.pausaInicio) {
          nuevo.pausaSegundos = Math.floor((ahora - prev.pausaInicio) / 1000);
        } else {
          nuevo.pausaSegundos = 0;
        }
        
        return nuevo;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [reserva]);

  // Persistencia del tiempo extra del módulo cada 30 segundos
  useEffect(() => {
    if (!sgta._moduloExcedido || !sgta.moduloEnProgreso || !reserva) return;
    const interval = setInterval(async () => {
      const modulosEstado = { ...(reserva.modulosEstado || {}) };
      if (!modulosEstado[sgta.moduloEnProgreso]) {
        modulosEstado[sgta.moduloEnProgreso] = { duracionExtra: Math.ceil(sgtaRef.current.moduloSegundos / 60) - 60 };
      } else {
        modulosEstado[sgta.moduloEnProgreso].duracionExtra = Math.ceil(sgtaRef.current.moduloSegundos / 60) - 60;
      }
      await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'reservas', reserva.id), { modulosEstado });
    }, 30000);
    return () => clearInterval(interval);
  }, [sgta._moduloExcedido, sgta.moduloEnProgreso]);

  const actualizar = async (campos) => {
    if (!reserva?.id) return;
    await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'reservas', reserva.id), campos);
  };

  const iniciarModulo = useCallback(async (nombre) => {
    if (!reserva) return;
    const duracionPrevia = (reserva.modulosEstado || {})[nombre]?.duracionParcial || 0;
    const duracionExtraPrevia = (reserva.modulosEstado || {})[nombre]?.duracionExtraParcial || 0;
    const segundosIniciales = (duracionPrevia + duracionExtraPrevia) * 60;
    
    // Campos a actualizar
    const campos = {
      moduloEnProgreso: { modulo: nombre, inicio: Date.now() - segundosIniciales * 1000 }
    };
    
    // Si no hay sesión diaria iniciada, iniciarla ahora
    if (!reserva.sesionDiariaInicio) {
      campos.sesionDiariaInicio = Date.now();
      campos.sesionDiariaLimite = 120; // 2 horas por día
      campos.diaActual = reserva.diaActual || 1;
    }
    
    // Si no hay sesión total iniciada, iniciarla ahora
    if (!reserva.sesionTotalInicio) {
      campos.sesionTotalInicio = Date.now();
      campos.sesionTotalLimite = 240; // 4 horas totales
    }
    
    alertas.inicioModulo();
    setSgta(prev => ({
      ...prev,
      moduloEnProgreso: nombre,
      moduloSegundos: segundosIniciales,
      moduloActivo: true,
      generalActivo: true,
      _recesoAlerta: false,
      _moduloExcedido: segundosIniciales >= 3600
    }));
    await actualizar(campos);
  }, [reserva]);

  const finalizarModulo = useCallback(async (nombre) => {
    if (!reserva) return;
    const dur = Math.ceil((sgtaRef.current?.moduloSegundos || 0) / 60);
    const modulosEstado = { ...(reserva.modulosEstado || {}) };
    const fecha = new Date().toISOString().split('T')[0];
    modulosEstado[nombre] = { fecha, duracion: Math.min(dur, 60), duracionExtra: Math.max(0, dur - 60) };
    delete modulosEstado[nombre].duracionParcial;
    delete modulosEstado[nombre].duracionExtraParcial;
    alertas.moduloCompletado();
    
    // Al completar un módulo, NO se borra sesionDiariaInicio ni sesionTotalInicio
    await actualizar({ modulosEstado, moduloEnProgreso: null });
    setSgta(prev => ({
      ...prev,
      moduloEnProgreso: null,
      moduloSegundos: 0,
      moduloActivo: false,
      _moduloExcedido: false
    }));
    showToast(`"${nombre}" completado (${dur} min)`, 'success');
  }, [reserva, showToast]);

  const pausarSesion = useCallback(async (motivo) => {
    if (!reserva) return;
    alertas.sesionPausada();
    setSgta(prev => ({
      ...prev,
      pausaActiva: true,
      pausaInicio: Date.now(),
      pausaMotivo: motivo,
      pausaSegundos: 0,
      generalActivo: false,
      moduloActivo: false
    }));
    await actualizar({ pausaActiva: { motivo, inicio: Date.now() } });
  }, [reserva]);

  const reanudarSesion = useCallback(async () => {
    if (!reserva) return;
    const pausaInicio = sgtaRef.current.pausaInicio;
    if (pausaInicio) {
      const durMin = Math.floor((Date.now() - pausaInicio) / 60000);
      if (durMin > 60) {
        alertas.pausaExcedida();
        showToast('Pausa excedió 60 min. Sesión finalizada.', 'error');
        setSgta(prev => ({ ...prev, generalActivo: false, moduloActivo: false, pausaActiva: false }));
        await actualizar({ pausaActiva: null, moduloEnProgreso: null });
        return;
      }
      const pausas = [...(reserva.pausas || []), {
        inicio: pausaInicio, fin: Date.now(),
        motivo: sgtaRef.current.pausaMotivo, duracion: durMin
      }];
      const totalAcumulado = (sgtaRef.current.pausaTotalAcumulada || 0) + sgtaRef.current.pausaSegundos;
      await actualizar({ pausas, pausaActiva: null, pausaTotalAcumulada: totalAcumulado });
      setSgta(prev => ({ ...prev, pausaTotalAcumulada: totalAcumulado }));
    }
    alertas.sesionReanudada();
    const moduloActivo = !!sgtaRef.current.moduloEnProgreso && !sgtaRef.current._moduloExcedido;
    const generalActivo = !!reserva.sesionDiariaInicio && !sgtaRef.current.diarioCompletado;
    setSgta(prev => ({
      ...prev,
      pausaActiva: false, pausaInicio: null, pausaMotivo: '', pausaSegundos: 0,
      generalActivo, moduloActivo
    }));
  }, [reserva, showToast]);

  const toggleModulo = useCallback(async (nombre) => {
    if (!reserva) return;
    const modulosEstado = { ...(reserva.modulosEstado || {}) };
    
    // Caso 1: Revertir
    if (modulosEstado[nombre]?.fecha) {
      const confirmado = await pedirConfirmacion(
        'Revertir módulo',
        `¿Desea revertir "${nombre}"? El tiempo acumulado se conservará.`
      );
      if (!confirmado) return;
      
      const duracionParcial = modulosEstado[nombre].duracion || 0;
      const duracionExtraParcial = modulosEstado[nombre].duracionExtra || 0;
      delete modulosEstado[nombre];
      modulosEstado[nombre] = { duracionParcial, duracionExtraParcial };
      
      await actualizar({ modulosEstado });
      
      // Reactivar el módulo automáticamente con el tiempo exacto
      const segundosIniciales = (duracionParcial + duracionExtraParcial) * 60;
      setSgta(prev => ({ ...prev, moduloEnProgreso: nombre, moduloSegundos: segundosIniciales, moduloActivo: true, generalActivo: true, _recesoAlerta: false, _moduloExcedido: segundosIniciales >= 3600 }));
      await actualizar({ moduloEnProgreso: { modulo: nombre, inicio: Date.now() - segundosIniciales * 1000 } });
      
      showToast('Módulo reversado. Tiempo conservado.', 'info');
      return;
    }
    
    // Caso 2: Finalizar módulo
    if (sgtaRef.current.moduloEnProgreso === nombre && (sgtaRef.current.moduloActivo || sgtaRef.current._moduloExcedido)) {
      const durMinutos = Math.ceil((sgtaRef.current?.moduloSegundos || 0) / 60);
      const confirmado = await pedirConfirmacion(
        'Finalizar módulo',
        `¿Está seguro de finalizar "${nombre}"? Duró ${durMinutos} minutos.`
      );
      if (!confirmado) return;
      await finalizarModulo(nombre);
      return;
    }
    
    // Caso 3: Iniciar módulo
    await iniciarModulo(nombre);
  }, [reserva, showToast, iniciarModulo, finalizarModulo, pedirConfirmacion]);

  return {
    reserva, sgta, modalConfirmacion,
    toggleModulo: esInstructor ? toggleModulo : () => {},
    pausarSesion: esInstructor ? pausarSesion : () => {},
    reanudarSesion: esInstructor ? reanudarSesion : () => {}
  };
}
