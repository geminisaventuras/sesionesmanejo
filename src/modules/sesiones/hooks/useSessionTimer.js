// @build: 2026-09-04 | id: OPTIMIZACION-HEARTBEAT-PRESENCIA | backup: useSessionTimer.backup-20260904-000000 | desc: Heartbeat de presencia solo en mount/visibility/online/unmount. Lógica D1/D2 intacta.
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../shared/firebase/firebase';
import { SGTA_DEFAULTS } from '../constants';
import { alertas } from '../../shared/utils/alertas';
import { reproducirBeepModuloCompletado } from '../../shared/utils/audio';

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

function obtenerFechaVenezuela() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });
}

function esMismoDiaVenezuela(timestamp) {
  if (!timestamp) return false;
  const fechaTimestamp = new Date(timestamp).toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });
  return fechaTimestamp === obtenerFechaVenezuela();
}

function calcularDiaActual(reserva) {
  if (!reserva?.fecha2) return 1;
  const hoy = obtenerFechaVenezuela();
  return hoy >= reserva.fecha2 ? 2 : 1;
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

  // ── Heartbeat de presencia OPTIMIZADO (solo ciclo de vida) ──
  useEffect(() => {
    if (esInstructor || !reservaId) return;
    const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'reservas', reservaId);

    const actualizarPresencia = () => {
      if (navigator.onLine) {
        updateDoc(ref, { estudiantePresente: Date.now() }).catch(() => {});
      }
    };

    // Actualizar al montar
    actualizarPresencia();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') actualizarPresencia();
    };
    const handleOnline = () => {
      setConexionPerdida(false);
      actualizarPresencia();
    };
    const handleOffline = () => setConexionPerdida(true);

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
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
        diaActual: 1, sesionIniciada: false, reservaRestante: 0,
        tiempoTotalSegundos: 0, tiempoRestanteCurso: 0, tiempoRestanteHoy: 0,
      };
    }

    const ahora = Date.now();
    const curso = opcionesRef.current?.curso;
    const limiteTotal = reserva.sesionTotalLimite || curso?.duracionTotal || 240;
    const duracionTotalCurso = curso?.duracionTotal || 240;
    const duracionDiariaCurso = reserva.fecha2 ? Math.floor(duracionTotalCurso / 2) : duracionTotalCurso;
    const limiteDiario = reserva.sesionDiariaLimite || duracionDiariaCurso;

    const diaActual = calcularDiaActual(reserva);

    const pausaAcumuladaBase = reserva.pausaTotalAcumulada ??
      (reserva.pausas || []).reduce((acc, p) => acc + (p.duracionSegundos || (p.duracion || 0) * 60), 0);
    const pausaSegundos = (localPausaActiva && localPausaInicio)
      ? Math.floor((ahora - localPausaInicio) / 1000)
      : 0;
    const pausaTotalAcumulada = pausaAcumuladaBase + pausaSegundos;

    const pausasHastaD1 = reserva.pausasHastaD1 || 0;
    const pausasD1 = diaActual === 1 ? pausaTotalAcumulada : pausasHastaD1;
    const pausasD2 = diaActual === 2 ? (pausaTotalAcumulada - pausasHastaD1) : 0;

    let tiempoD1 = 0;
    if (diaActual === 1) {
      if (reserva.sesionTotalInicio) {
        tiempoD1 = Math.floor((ahora - reserva.sesionTotalInicio) / 1000) - pausasD1;
        tiempoD1 = Math.max(0, tiempoD1);
        if (tiempoD1 > duracionDiariaCurso * 60) tiempoD1 = duracionDiariaCurso * 60;
      }
    } else {
      tiempoD1 = reserva.tiempoAcumuladoHastaD1 || 0;
    }

        // ✅ FIX-032 + FIX-033: Detectar transición o sesión diaria de otro día
    const diaTransicionando = diaActual === 2 && (
      reserva.diaActual === 1 ||
      !esMismoDiaVenezuela(reserva.sesionDiariaInicio)
    );
    let tiempoD2 = 0;
    if (diaActual === 2 && reserva.sesionDiariaInicio && !diaTransicionando) {
      tiempoD2 = Math.floor((ahora - reserva.sesionDiariaInicio) / 1000) - pausasD2;
      tiempoD2 = Math.max(0, tiempoD2);
      if (tiempoD2 > duracionDiariaCurso * 60) tiempoD2 = duracionDiariaCurso * 60;
    }

    const tiempoTotalSegundos = Math.min(tiempoD1 + tiempoD2, limiteTotal * 60);
    const generalSegundos = tiempoTotalSegundos;
    const diarioSegundos = diaActual === 1
      ? tiempoD1
      : (diaTransicionando ? 0 : tiempoD2);
    let moduloSegundos = 0;
    const tieneModulo = !!reserva.moduloEnProgreso?.inicio;
    if (tieneModulo) {
      const inicioReal = reserva.moduloEnProgreso.inicio -
        (reserva.modulosEstado?.[reserva.moduloEnProgreso.modulo]?.duracionParcial || 0) * 60000;
      moduloSegundos = Math.max(0, Math.floor((ahora - inicioReal) / 1000));
      if (localPausaActiva) {
        moduloSegundos = Math.max(0, moduloSegundos - pausaSegundos);
      }
    }

    const totalCompletado = generalSegundos >= limiteTotal * 60;
    const diarioCompletado = !diaTransicionando && diarioSegundos >= duracionDiariaCurso * 60;   
     const tiempoEfectivo = Math.max(0, limiteTotal * 60 - pausaTotalAcumulada);

    let reservaRestante = 0;
    if (reserva.reservaActiva && reserva.reservaInicio) {
      const reservaInicioMs = typeof reserva.reservaInicio === 'number'
        ? reserva.reservaInicio
        : (reserva.reservaInicio?.toMillis?.() || 0);
      const transcurrido = Math.floor((ahora - reservaInicioMs) / 1000);
      reservaRestante = Math.max(0, (reserva.reservaRestanteInicial || 0) - transcurrido);
    } else if (reserva.reservaActiva && !reserva.reservaInicio) {
      reservaRestante = reserva.reservaRestante || 0;
    } else {
      reservaRestante = reserva.reservaRestanteInicial || reserva.reservaRestante || 0;
    }

    const tiempoRestanteCurso = Math.max(0, limiteTotal * 60 - generalSegundos);
    const tiempoRestanteHoy = Math.max(0, duracionDiariaCurso * 60 - diarioSegundos);

    return {
      generalSegundos,
      diarioSegundos,
      moduloSegundos,
      pausaSegundos,
      pausaTotalAcumulada,
      tiempoEfectivo,
      totalCompletado,
      diarioCompletado,
      moduloActivo: tieneModulo && !localPausaActiva && moduloSegundos < 3600,
      moduloExcedido: tieneModulo && moduloSegundos >= 3600,
      limiteDiario: duracionDiariaCurso,
      limiteTotal,
      diaActual,
      sesionIniciada: !!reserva.sesionDiariaInicio || !!reserva.sesionTotalInicio,
      reservaRestante,
      tiempoTotalSegundos,
      tiempoRestanteCurso,
      tiempoRestanteHoy,
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
    reservaRestante: derivados.reservaRestante,
    _moduloExcedido: derivados.moduloExcedido,
    _recesoAlerta: localRecesoAlerta,
    generalActivo: derivados.sesionIniciada && !localPausaActiva && !derivados.totalCompletado,
    puedeGestionarSesion: derivados.sesionIniciada && !localPausaActiva && !derivados.totalCompletado,
    puedeReanudarSesion: localPausaActiva && (!derivados.totalCompletado || (localReservaActiva && derivados.pausaTotalAcumulada > 0)),
puedeIniciarModulo: !localPausaActiva && ((!derivados.totalCompletado && !derivados.diarioCompletado) || (localReservaActiva && derivados.pausaTotalAcumulada > 0)),    
    
    
    puedeUsarReserva: (derivados.totalCompletado || derivados.diarioCompletado) && !localReservaActiva && derivados.pausaTotalAcumulada > 0,
  }), [derivados, localPausaActiva, localPausaInicio, localPausaMotivo, localReservaActiva, localReservaRestante, localRecesoAlerta, reserva]);

  const sgtaRef = useRef(sgta);
  useEffect(() => { sgtaRef.current = sgta; }, [sgta]);

   const actualizar = useCallback(async (campos) => {
    if (!reserva?.id) return;
    try {
      await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'reservas', reserva.id), campos);
    } catch (error) {
      // A2.1: si el instructor fue reasignado mientras tenía el aula abierta,
      // Firestore revoca el permiso de escritura. Rollback local + aviso + redirect.
      if (error?.code === 'permission-denied') {
        // Rollback de estados locales (evita UI inconsistente)
        setLocalPausaActiva(false);
        setLocalPausaInicio(null);
        setLocalPausaMotivo('');
        setLocalReservaActiva(false);
        // Aviso al usuario
        showToast('La clase fue reasignada a otro instructor. Cerrando el aula...', 'error');
        // Redirect DESPUÉS de que el toast alcance a verse
        setTimeout(() => { window.location.href = '/instructor'; }, 4000);
        // NO relanzamos el error: así el caller no dispara un segundo toast
        // que reemplazaría al nuestro antes de que el usuario lo lea.
        return;
      }
      throw error;
    }
  }, [reserva, showToast]);

  const iniciarModulo = useCallback(async (nombre) => {
    if (!reserva) return;
    const curso = opcionesRef.current?.curso;
    const horario = opcionesRef.current?.hor;
    if (!curso || !horario) { showToast('Datos del curso no disponibles.', 'error'); return; }
    if (reserva.estadoPago !== 'Aprobado') { showToast('Pago no aprobado.', 'error'); return; }

    const haySesionIniciada = !!reserva.sesionTotalInicio;
    const hayModuloCompletado = Object.values(reserva.modulosEstado || {}).some(mod => mod.fecha);
    const esPrimerModulo = !haySesionIniciada && !hayModuloCompletado;

    if (esPrimerModulo && (!reserva.estudiantePresente || (Date.now() - reserva.estudiantePresente) > 2 * 60 * 1000)) {
      showToast('Estudiante no presente. El estudiante debe tener la sesión abierta para iniciar el primer módulo.', 'error');
      return;
    }

    const hoy = obtenerFechaVenezuela();
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
    const diaCalculado = calcularDiaActual(reserva);
    const primerInicioDia = !reserva.sesionDiariaInicio ||
                            (diaCalculado === 2 && reserva.diaActual === 1) ||
                            !esMismoDiaVenezuela(reserva.sesionDiariaInicio);
    let limiteDiario = duracionDiariaCurso;

    if (primerInicioDia) {
      limiteDiario = duracionDiariaCurso;
      const horaFinLabel = horario?.label?.split('-')[1]?.trim();
      const horaFinMinutos = horaFinLabel ? parseHora(horaFinLabel) : null;
      if (horaFinMinutos !== null) {
        const ahoraMinutos = new Date().getHours() * 60 + new Date().getMinutes();
        const minutosRestantesBloque = horaFinMinutos - ahoraMinutos;
        if (minutosRestantesBloque > 0 && minutosRestantesBloque < 30) {
          showToast(`Quedan ${minutosRestantesBloque} min del bloque. Puedes pausar y continuar en otro día.`, 'info');
        }
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
      campos.diaActual = diaCalculado;

      if (diaCalculado === 2) {
        const ahora = Date.now();
        const pausasD1Calculadas = sgtaRef.current.pausaTotalAcumulada || reserva.pausaTotalAcumulada || 0;
        const tiempoD1Calculado = reserva.sesionTotalInicio
          ? Math.min(Math.max(0, Math.floor((ahora - reserva.sesionTotalInicio) / 1000) - pausasD1Calculadas), duracionDiariaCurso * 60)
          : 0;
        campos.tiempoAcumuladoHastaD1 = tiempoD1Calculado;
        campos.pausasHastaD1 = pausasD1Calculadas;
      }
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

    const curso = opcionesRef.current?.curso;
    const totalModulos = curso?.modulos?.length || 0;
    const dur = Math.ceil((sgtaRef.current?.moduloSegundos || 0) / 60);
    const modulosEstado = { ...(reserva.modulosEstado || {}) };

    modulosEstado[nombre] = {
      fecha: new Date().toISOString().split('T')[0],
      duracion: Math.min(dur, 60),
      duracionExtra: Math.max(0, dur - 60)
    };

    delete modulosEstado[nombre].duracionParcial;
    delete modulosEstado[nombre].duracionExtraParcial;

    const modulos = (curso?.modulos || []).map(mod => typeof mod === 'string' ? mod : mod.nombre);
    const todosCompletados = modulos.length > 0 && modulos.every(mod => (modulosEstado[mod] || {}).fecha);

    const campos = { modulosEstado, moduloEnProgreso: null };
    if (todosCompletados) campos.estadoCurso = 'Aprobado';

    alertas.moduloCompletado();
    reproducirBeepModuloCompletado();
    await actualizar(campos);

    showToast(todosCompletados ? 'Curso completado exitosamente' : `"${nombre}" completado (${dur} min)`, 'success');
  }, [reserva, opcionesRef, showToast, actualizar]);

  const pausarSesion = useCallback(async (motivo) => {
    if (!reserva || sgtaRef.current.pausaActiva) return;
    alertas.sesionPausada();
    const ahora = Date.now();
    setLocalPausaActiva(true);
    setLocalPausaInicio(ahora);
    setLocalPausaMotivo(motivo);
    try {
      await actualizar({ pausaActiva: { motivo, inicio: ahora } });
    } catch (error) {
      setLocalPausaActiva(false);
      setLocalPausaInicio(null);
      setLocalPausaMotivo('');
      showToast('Error al pausar. Intente de nuevo.', 'error');
    }
  }, [reserva, actualizar, showToast]);

  const reanudarSesion = useCallback(async () => {
    if (!reserva || !sgtaRef.current.pausaActiva || !sgtaRef.current.pausaInicio) return;

    const pausaInicio = sgtaRef.current.pausaInicio;
    const motivo = sgtaRef.current.pausaMotivo;

    setLocalPausaActiva(false);
    setLocalPausaInicio(null);
    setLocalPausaMotivo('');

    const durSegundos = Math.floor((Date.now() - pausaInicio) / 1000);
    if (durSegundos > 3600) {
      alertas.pausaExcedida();
      showToast('Pausa excedió 60 min. Sesión finalizada.', 'error');
      try { await actualizar({ pausaActiva: null, moduloEnProgreso: null }); } catch (e) {}
      return;
    }

    const pausas = [...(reserva.pausas || []), { inicio: pausaInicio, fin: Date.now(), motivo, duracionSegundos: durSegundos }];
    const totalAcumulado = sgtaRef.current.pausaTotalAcumulada;
    const tiempoEfectivo = Math.max(0, (sgtaRef.current.limiteTotal || 240) * 60 - totalAcumulado);

    try {
      await actualizar({ pausas, pausaActiva: null, pausaTotalAcumulada: totalAcumulado, tiempoEfectivo });
      alertas.sesionReanudada();
    } catch (error) {
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
        setModalConfirmacion({
          titulo: 'Revertir módulo',
          mensaje: `¿Revertir "${nombre}"?`,
          onConfirm: () => { setModalConfirmacion(null); resolve(true); },
          onCancel: () => { setModalConfirmacion(null); resolve(false); }
        });
      });
      if (!confirmado) return;
      const duracionParcial = modulosEstado[nombre].duracion || 0;
      const duracionExtraParcial = modulosEstado[nombre].duracionExtra || 0;
      delete modulosEstado[nombre];
      modulosEstado[nombre] = { duracionParcial, duracionExtraParcial };
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
        setModalConfirmacion({
          titulo: 'Finalizar módulo',
          mensaje: `¿Finalizar "${nombre}"? Duró ${durMinutos} min.`,
          onConfirm: () => { setModalConfirmacion(null); resolve(true); },
          onCancel: () => { setModalConfirmacion(null); resolve(false); }
        });
      });
      if (!confirmado) return;
      await finalizarModulo(nombre);
      return;
    }
    await iniciarModulo(nombre);
  }, [reserva, iniciarModulo, finalizarModulo, actualizar, showToast]);

  const activarReserva = useCallback(async () => {
    if (!sgtaRef.current.totalCompletado || sgtaRef.current.pausaTotalAcumulada <= 0) return;
    const ahora = Date.now();
    const restanteInicial = sgtaRef.current.pausaTotalAcumulada;
    setLocalReservaActiva(true);
    setLocalReservaRestante(restanteInicial);
    await actualizar({
      reservaActiva: true,
      reservaInicio: ahora,
      reservaRestanteInicial: restanteInicial,
      reservaRestante: restanteInicial,
      pausaTotalAcumulada: 0
    });
  }, [actualizar]);

  const pausarReserva = useCallback(async () => {
    if (!sgtaRef.current.reservaActiva) return;
    const restanteActual = sgtaRef.current.reservaRestante || 0;
    setLocalReservaActiva(false);
    setLocalReservaRestante(restanteActual);
    await actualizar({ reservaActiva: false, reservaInicio: null, reservaRestanteInicial: restanteActual, reservaRestante: restanteActual });
  }, [actualizar]);

  const reanudarReserva = useCallback(async () => {
    const restanteActual = sgtaRef.current.reservaRestante || 0;
    if (restanteActual <= 0) return;
    const ahora = Date.now();
    setLocalReservaActiva(true);
    setLocalReservaRestante(restanteActual);
    await actualizar({ reservaActiva: true, reservaInicio: ahora, reservaRestanteInicial: restanteActual, reservaRestante: restanteActual });
  }, [actualizar]);

  const completarCursoManualmente = useCallback(async () => {
    try {
      const curso = opcionesRef.current?.curso;
      if (!curso || !curso.modulos || curso.modulos.length === 0) {
        return { success: false, modulosCompletados: 0 };
      }
      const hoy = new Date().toISOString().split('T')[0];
      const modulosEstadoActual = reserva.modulosEstado || {};
      const nuevoModulosEstado = { ...modulosEstadoActual };
      let modulosCompletados = 0;

      curso.modulos.forEach(modulo => {
        const nombreModulo = typeof modulo === 'string' ? modulo : modulo.nombre;
        if (!nuevoModulosEstado[nombreModulo]?.fecha) {
          nuevoModulosEstado[nombreModulo] = { fecha: hoy, duracion: 0, duracionExtra: 0, completadoManualmente: true };
          modulosCompletados++;
        }
      });

      if (modulosCompletados === 0) {
        return { success: true, modulosCompletados: 0 };
      }

      await actualizar({ modulosEstado: nuevoModulosEstado, moduloEnProgreso: null, estadoCurso: 'Aprobado' });
      return { success: true, modulosCompletados };
    } catch (error) {
      console.error('[completarCursoManualmente] Error:', error);
      return { success: false, modulosCompletados: 0, error };
    }
  }, [reserva, actualizar, opcionesRef]);

  const detenerReserva = useCallback(async () => {
    const restanteActual = sgtaRef.current.reservaRestante || 0;
    const pausaTotalActual = sgtaRef.current.pausaTotalAcumulada || 0;
    setLocalReservaActiva(false);
    setLocalReservaRestante(0);
    await actualizar({
      reservaActiva: false,
      reservaInicio: null,
      reservaRestanteInicial: 0,
      reservaRestante: 0,
      pausaTotalAcumulada: pausaTotalActual + restanteActual
    });
  }, [actualizar]);

  useEffect(() => {
    if (!derivados.moduloSegundos) return;
    if (derivados.moduloSegundos >= 3300 && derivados.moduloSegundos < 3600 && !localRecesoAlerta) {
      alertas.recesoAutomatico();
      showToast('Receso automático en 5 minutos', 'info');
      setLocalRecesoAlerta(true);
    }
    if (derivados.moduloSegundos >= 3600 && !sgtaRef.current._moduloExcedido) {
      alertas.limiteModulo();
      showToast('Módulo excedido (60 min).', 'error');
    }
  }, [derivados.moduloSegundos, localRecesoAlerta, showToast]);

  return {
    reserva, sgta, modalConfirmacion,
    conexionPerdida,
    toggleModulo: esInstructor ? toggleModulo : () => {},
    pausarSesion: esInstructor ? pausarSesion : () => {},
    reanudarSesion: esInstructor ? reanudarSesion : () => {},
    activarReserva: esInstructor ? activarReserva : () => {},
    pausarReserva: esInstructor ? pausarReserva : () => {},
    reanudarReserva: esInstructor ? reanudarReserva : () => {},
    detenerReserva: esInstructor ? detenerReserva : () => {},
    completarCursoManualmente: esInstructor ? completarCursoManualmente : () => {},
  };
}
