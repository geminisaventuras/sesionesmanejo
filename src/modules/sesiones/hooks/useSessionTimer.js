// @build: 2026-06-23 | id: CENTINELA-FASE3-CORRECCION-BLOQUEO-Y-RESILIENCIA | desc: Bloqueo optimista en pausarSesion y reanudarSesion. Listeners de visibilidad y red para heartbeat. Variable conexionPerdida expuesta.
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../shared/firebase/firebase';
import { SGTA_DEFAULTS } from '../constants';
import { alertas } from '../../shared/utils/alertas';

const APP_ID = 'motoescuela-pro-v1';

function parseHora(str) {
  const match = str.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const mins = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();
  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  return hours * 60 + mins;
}

export function useSessionTimer(reservaId, esInstructor, saveReserva, showToast, opcionesRef) {
  const [reserva, setReserva] = useState(null);
  const [tick, setTick] = useState(0);
  const [modalConfirmacion, setModalConfirmacion] = useState(null);

  const [localPausaActiva, setLocalPausaActiva] = useState(false);
  const [localPausaInicio, setLocalPausaInicio] = useState(null);
  const [localPausaMotivo, setLocalPausaMotivo] = useState('');
  const [localReservaActiva, setLocalReservaActiva] = useState(false);
  const [localReservaRestante, setLocalReservaRestante] = useState(0);
  const [localRecesoAlerta, setLocalRecesoAlerta] = useState(false);

  // CORRECCIÓN FASE 3: Estado de conexión para propagar a RelojSesion
  const [conexionPerdida, setConexionPerdida] = useState(!navigator.onLine);

  // ── Suscripción a Firestore ──
  useEffect(() => {
    if (!reservaId) return;
    const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'reservas', reservaId);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setReserva({ id: snap.id, ...data });
        setLocalPausaActiva(!!data.pausaActiva);
        setLocalPausaInicio(data.pausaActiva?.inicio || null);
        setLocalPausaMotivo(data.pausaActiva?.motivo || '');
        if (data.reservaActiva !== undefined) setLocalReservaActiva(data.reservaActiva);
        if (data.reservaRestante !== undefined) setLocalReservaRestante(data.reservaRestante);
      }
    }, () => {});
    return () => unsub();
  }, [reservaId]);

  // ── Heartbeat de presencia del estudiante (CORRECCIÓN FASE 3: Resiliencia) ──
  useEffect(() => {
    if (esInstructor || !reservaId) return;
    const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'reservas', reservaId);

    const enviarHeartbeat = () => {
      if (navigator.onLine) {
        updateDoc(ref, { estudiantePresente: Date.now() }).catch(() => {});
      }
    };

    enviarHeartbeat();
    const interval = setInterval(enviarHeartbeat, 60000);

    // CORRECCIÓN FASE 3: Forzar heartbeat al volver a primer plano (mitiga throttling)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        enviarHeartbeat();
      }
    };
    const handleOnline = () => { setConexionPerdida(false); enviarHeartbeat(); };
    const handleOffline = () => setConexionPerdida(true);

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      updateDoc(ref, { estudiantePresente: null }).catch(() => {});
    };
  }, [reservaId, esInstructor]);

  // ── Tick cada segundo ──
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // ── Cálculos derivados ──
  const derivados = useMemo(() => {
    if (!reserva) {
      return {
        generalSegundos: 0, diarioSegundos: 0, moduloSegundos: 0, pausaSegundos: 0,
        pausaTotalAcumulada: 0, tiempoEfectivo: 0, totalCompletado: false, diarioCompletado: false,
        moduloActivo: false, moduloExcedido: false, limiteDiario: 120, limiteTotal: 240,
        diaActual: 1, sesionIniciada: false,
      };
    }
    const ahora = Date.now();
    const tieneSesionDiaria = !!reserva.sesionDiariaInicio;
    const tieneSesionTotal = !!reserva.sesionTotalInicio;
    const tieneModulo = !!reserva.moduloEnProgreso?.inicio;

    const curso = opcionesRef.current?.curso;
    const limiteDiario = reserva.sesionDiariaLimite || 120;
    const limiteTotal = reserva.sesionTotalLimite || curso?.duracionTotal || 240;

    let diarioSegundos = 0;
    if (tieneSesionDiaria) {
      diarioSegundos = Math.floor((ahora - reserva.sesionDiariaInicio) / 1000);
      if (diarioSegundos > limiteDiario * 60) diarioSegundos = limiteDiario * 60;
    }

    let generalSegundos = 0;
    if (tieneSesionTotal) {
      generalSegundos = Math.floor((ahora - reserva.sesionTotalInicio) / 1000);
      if (generalSegundos > limiteTotal * 60) generalSegundos = limiteTotal * 60;
    }

    const pausaActiva = localPausaActiva;
    let pausaSegundos = 0;
    if (pausaActiva && localPausaInicio) {
      pausaSegundos = Math.floor((ahora - localPausaInicio) / 1000);
    }

    let moduloSegundos = 0;
    if (tieneModulo) {
      const inicioReal = reserva.moduloEnProgreso.inicio -
        (reserva.modulosEstado?.[reserva.moduloEnProgreso.modulo]?.duracionParcial || 0) * 60000;
      moduloSegundos = Math.max(0, Math.floor((ahora - inicioReal) / 1000));
      if (pausaActiva) {
        moduloSegundos = Math.max(0, moduloSegundos - pausaSegundos);
      }
    }

    const pausaAcumuladaBase = reserva.pausaTotalAcumulada ??
      (reserva.pausas || []).reduce((acc, p) => acc + (p.duracionSegundos || (p.duracion || 0) * 60), 0);
    const pausaTotalAcumulada = pausaAcumuladaBase + pausaSegundos;
    const tiempoEfectivo = Math.max(0, limiteTotal * 60 - pausaTotalAcumulada);

    const totalCompletado = generalSegundos >= limiteTotal * 60;
    const diarioCompletado = diarioSegundos >= limiteDiario * 60;
    const moduloActivo = tieneModulo && !pausaActiva && moduloSegundos < 3600;
    const moduloExcedido = tieneModulo && moduloSegundos >= 3600;

    return {
      generalSegundos, diarioSegundos, moduloSegundos, pausaSegundos,
      pausaTotalAcumulada, tiempoEfectivo, totalCompletado, diarioCompletado,
      moduloActivo, moduloExcedido, limiteDiario, limiteTotal,
      diaActual: reserva.diaActual || 1, sesionIniciada: tieneSesionDiaria,
    };
  }, [tick, reserva, localPausaActiva, localPausaInicio, opcionesRef]);

  const sgta = useMemo(() => ({
    ...SGTA_DEFAULTS,
    ...derivados,
    pausaActiva: localPausaActiva,
    pausaInicio: localPausaInicio,
    pausaMotivo: localPausaMotivo,
    moduloEnProgreso: reserva?.moduloEnProgreso?.modulo || null,
    reservaActiva: localReservaActiva,
    reservaRestante: localReservaRestante,
    _moduloExcedido: derivados.moduloExcedido,
    _recesoAlerta: localRecesoAlerta,
    generalActivo: derivados.sesionIniciada && !localPausaActiva && !derivados.totalCompletado && !derivados.diarioCompletado,
  }), [derivados, localPausaActiva, localPausaInicio, localPausaMotivo, localReservaActiva, localReservaRestante, localRecesoAlerta, reserva]);

  const sgtaRef = useRef(sgta);
  useEffect(() => { sgtaRef.current = sgta; }, [sgta]);

  const actualizar = useCallback(async (campos) => {
    if (!reserva?.id) return;
    await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'reservas', reserva.id), campos);
  }, [reserva]);

  const iniciarModulo = useCallback(async (nombre) => {
    if (!reserva) return;
    const curso = opcionesRef.current?.curso;
    const horario = opcionesRef.current?.hor;
    if (!curso || !horario) { showToast('Datos del curso no disponibles.', 'error'); return; }
    if (reserva.estadoPago !== 'Aprobado') { showToast('Pago no aprobado.', 'error'); return; }
    if (!reserva.estudiantePresente || (Date.now() - reserva.estudiantePresente) > 2 * 60 * 1000) {
      showToast('Estudiante no presente.', 'error'); return;
    }
    const hoy = new Date().toISOString().split('T')[0];
    if (hoy < reserva.fecha) { showToast(`Curso programado para ${reserva.fecha}.`, 'error'); return; }
    if ((reserva.fecha2 && hoy > reserva.fecha2) || (!reserva.fecha2 && hoy > reserva.fecha)) {
      showToast('Curso vencido.', 'error'); return;
    }
    const horaInicioLabel = horario?.label?.split('-')[0]?.trim();
    const horaInicioMinutos = horaInicioLabel ? parseHora(horaInicioLabel) : null;
    if (horaInicioMinutos !== null) {
      const ahoraMinutos = new Date().getHours() * 60 + new Date().getMinutes();
      if (ahoraMinutos < horaInicioMinutos) {
        showToast(`Bloque comienza a las ${horaInicioLabel}.`, 'error'); return;
      }
    }

    const duracionTotalCurso = curso?.duracionTotal || 240;
    const fecha2Curso = reserva.fecha2;
    const duracionDiariaCurso = fecha2Curso ? Math.floor(duracionTotalCurso / 2) : duracionTotalCurso;
    let diaActual = reserva.diaActual || 1;
    if (fecha2Curso && hoy === fecha2Curso && reserva.diaActual === 1) diaActual = 2;

    const primerInicioDia = !reserva.sesionDiariaInicio || (diaActual === 2 && reserva.diaActual === 1);
    let limiteDiario = duracionDiariaCurso;
    if (primerInicioDia) {
      const horaFinLabel = horario?.label?.split('-')[1]?.trim();
      const horaFinMinutos = horaFinLabel ? parseHora(horaFinLabel) : null;
      if (horaFinMinutos !== null) {
        const ahoraMinutos = new Date().getHours() * 60 + new Date().getMinutes();
        const minutosRestantesBloque = horaFinMinutos - ahoraMinutos;
        limiteDiario = Math.min(duracionDiariaCurso, Math.max(0, minutosRestantesBloque));
        if (limiteDiario < 30) showToast(`Solo quedan ${limiteDiario} min del bloque.`, 'info');
      }
    } else {
      limiteDiario = reserva.sesionDiariaLimite || duracionDiariaCurso;
    }

    const duracionPrevia = (reserva.modulosEstado || {})[nombre]?.duracionParcial || 0;
    const duracionExtraPrevia = (reserva.modulosEstado || {})[nombre]?.duracionExtraParcial || 0;
    const segundosIniciales = (duracionPrevia + duracionExtraPrevia) * 60;

    const campos = { moduloEnProgreso: { modulo: nombre, inicio: Date.now() - segundosIniciales * 1000 } };
    if (primerInicioDia) {
      campos.sesionDiariaInicio = Date.now();
      campos.sesionDiariaLimite = limiteDiario;
      campos.diaActual = diaActual;
    }
    if (!reserva.sesionTotalInicio) {
      campos.sesionTotalInicio = Date.now();
      campos.sesionTotalLimite = duracionTotalCurso;
    }

    alertas.inicioModulo();
    setLocalRecesoAlerta(false);
    await actualizar(campos);
  }, [reserva, opcionesRef, showToast, actualizar]);

  const finalizarModulo = useCallback(async (nombre) => {
    if (!reserva) return;
    const dur = Math.ceil((sgtaRef.current?.moduloSegundos || 0) / 60);
    const modulosEstado = { ...(reserva.modulosEstado || {}) };
    modulosEstado[nombre] = { fecha: new Date().toISOString().split('T')[0], duracion: Math.min(dur, 60), duracionExtra: Math.max(0, dur - 60) };
    delete modulosEstado[nombre].duracionParcial; delete modulosEstado[nombre].duracionExtraParcial;
    alertas.moduloCompletado();
    await actualizar({ modulosEstado, moduloEnProgreso: null });
    showToast(`"${nombre}" completado (${dur} min)`, 'success');
  }, [reserva, showToast, actualizar]);

  // CORRECCIÓN FASE 3: Bloqueo optimista en pausarSesion
  const pausarSesion = useCallback(async (motivo) => {
    if (!reserva) return;
    if (sgtaRef.current.pausaActiva) return; // Prevenir doble pausa
    alertas.sesionPausada();
    const ahora = Date.now();
    // Limpiar/actualizar estado local antes de la red
    setLocalPausaActiva(true);
    setLocalPausaInicio(ahora);
    setLocalPausaMotivo(motivo);
    try {
      await actualizar({ pausaActiva: { motivo, inicio: ahora } });
    } catch (error) {
      // Rollback en caso de fallo
      setLocalPausaActiva(false);
      setLocalPausaInicio(null);
      setLocalPausaMotivo('');
      showToast('Error al pausar. Intente de nuevo.', 'error');
    }
  }, [reserva, actualizar, showToast]);

  // CORRECCIÓN FASE 3: Bloqueo optimista en reanudarSesion
  const reanudarSesion = useCallback(async () => {
    if (!reserva || !sgtaRef.current.pausaActiva || !sgtaRef.current.pausaInicio) return;
    
    // Capturar valores actuales antes de limpiar estado
    const pausaInicio = sgtaRef.current.pausaInicio;
    const motivo = sgtaRef.current.pausaMotivo;
    
    // BLOQUEO OPTIMISTA: Limpiar estado local inmediatamente para prevenir doble-clic
    setLocalPausaActiva(false);
    setLocalPausaInicio(null);
    setLocalPausaMotivo('');

    const durSegundos = Math.floor((Date.now() - pausaInicio) / 1000);
    if (durSegundos > 3600) {
      alertas.pausaExcedida();
      showToast('Pausa excedió 60 min. Sesión finalizada.', 'error');
      try {
        await actualizar({ pausaActiva: null, moduloEnProgreso: null });
      } catch (e) {
        // Si falla la red, al menos el estado local ya está limpio
      }
      return;
    }

    const pausas = [...(reserva.pausas || []), { inicio: pausaInicio, fin: Date.now(), motivo, duracionSegundos: durSegundos }];
    const totalAcumulado = sgtaRef.current.pausaTotalAcumulada;
    const tiempoEfectivo = Math.max(0, (sgtaRef.current.limiteTotal || 240) * 60 - totalAcumulado);

    try {
      await actualizar({ pausas, pausaActiva: null, pausaTotalAcumulada: totalAcumulado, tiempoEfectivo });
      alertas.sesionReanudada();
    } catch (error) {
      // Rollback en caso de fallo de red
      setLocalPausaActiva(true);
      setLocalPausaInicio(pausaInicio);
      setLocalPausaMotivo(motivo);
      showToast('Error al reanudar. Intente de nuevo.', 'error');
    }
  }, [reserva, showToast, actualizar]);

  const toggleModulo = useCallback(async (nombre) => {
    if (!reserva) return;
    const modulosEstado = { ...(reserva.modulosEstado || {}) };
    if (modulosEstado[nombre]?.fecha) {
      const confirmado = await new Promise(resolve => {
        setModalConfirmacion({ titulo: 'Revertir módulo', mensaje: `¿Revertir "${nombre}"?`, onConfirm: () => { setModalConfirmacion(null); resolve(true); }, onCancel: () => { setModalConfirmacion(null); resolve(false); } });
      });
      if (!confirmado) return;
      const duracionParcial = modulosEstado[nombre].duracion || 0;
      const duracionExtraParcial = modulosEstado[nombre].duracionExtra || 0;
      delete modulosEstado[nombre]; modulosEstado[nombre] = { duracionParcial, duracionExtraParcial };
      await actualizar({ modulosEstado });
      const segundosIniciales = (duracionParcial + duracionExtraParcial) * 60;
      setLocalRecesoAlerta(false);
      await actualizar({ moduloEnProgreso: { modulo: nombre, inicio: Date.now() - segundosIniciales * 1000 } });
      showToast('Módulo reversado.', 'info');
      return;
    }
    if (sgtaRef.current.moduloEnProgreso === nombre && (sgtaRef.current.moduloActivo || sgtaRef.current._moduloExcedido)) {
      const durMinutos = Math.ceil((sgtaRef.current?.moduloSegundos || 0) / 60);
      const confirmado = await new Promise(resolve => {
        setModalConfirmacion({ titulo: 'Finalizar módulo', mensaje: `¿Finalizar "${nombre}"? Duró ${durMinutos} min.`, onConfirm: () => { setModalConfirmacion(null); resolve(true); }, onCancel: () => { setModalConfirmacion(null); resolve(false); } });
      });
      if (!confirmado) return;
      await finalizarModulo(nombre);
      return;
    }
    await iniciarModulo(nombre);
  }, [reserva, iniciarModulo, finalizarModulo, actualizar, showToast]);

  const activarReserva = useCallback(async () => {
    if (!sgtaRef.current.totalCompletado && !sgtaRef.current.diarioCompletado) return;
    if (sgtaRef.current.pausaTotalAcumulada <= 0) return;
    setLocalReservaActiva(true);
    setLocalReservaRestante(sgtaRef.current.pausaTotalAcumulada);
    await actualizar({ reservaActiva: true, reservaRestante: sgtaRef.current.pausaTotalAcumulada });
  }, [actualizar]);
  const pausarReserva = useCallback(async () => { setLocalReservaActiva(false); await actualizar({ reservaActiva: false }); }, [actualizar]);
  const reanudarReserva = useCallback(async () => {
    if (localReservaRestante <= 0) return;
    setLocalReservaActiva(true);
    await actualizar({ reservaActiva: true, reservaRestante: localReservaRestante });
  }, [localReservaRestante, actualizar]);
  const detenerReserva = useCallback(async () => {
    setLocalReservaActiva(false); setLocalReservaRestante(0);
    await actualizar({ reservaActiva: false, reservaRestante: 0, pausaTotalAcumulada: 0, tiempoEfectivo: sgtaRef.current.limiteTotal * 60 });
  }, [actualizar]);

  useEffect(() => {
    if (!derivados.moduloSegundos) return;
    if (derivados.moduloSegundos >= 3300 && derivados.moduloSegundos < 3600 && !localRecesoAlerta) {
      alertas.recesoAutomatico();
      showToast('Receso automático en 5 minutos', 'info');
      setLocalRecesoAlerta(true);
    }
    if (derivados.moduloSegundos >= 3600) {
      if (!sgtaRef.current._moduloExcedido) {
        alertas.limiteModulo();
        showToast('Módulo excedido (60 min).', 'error');
      }
    }
  }, [derivados.moduloSegundos, localRecesoAlerta, showToast]);

  useEffect(() => {
    if (!localReservaActiva || localReservaRestante <= 0) return;
    const interval = setInterval(() => {
      setLocalReservaRestante(prev => {
        if (prev <= 1) {
          setLocalReservaActiva(false);
          actualizar({ reservaActiva: false, reservaRestante: 0, pausaTotalAcumulada: 0, tiempoEfectivo: derivados.limiteTotal * 60 });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [localReservaActiva, derivados.limiteTotal, actualizar]);

  return {
    reserva, sgta, modalConfirmacion,
    conexionPerdida, // CORRECCIÓN FASE 3: Expuesto para propagar a RelojSesion
    toggleModulo: esInstructor ? toggleModulo : () => {},
    pausarSesion: esInstructor ? pausarSesion : () => {},
    reanudarSesion: esInstructor ? reanudarSesion : () => {},
    activarReserva: esInstructor ? activarReserva : () => {},
    pausarReserva: esInstructor ? pausarReserva : () => {},
    reanudarReserva: esInstructor ? reanudarReserva : () => {},
    detenerReserva: esInstructor ? detenerReserva : () => {},
  };
}