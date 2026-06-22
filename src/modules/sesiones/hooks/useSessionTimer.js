// @build: 2026-06-22 | id: TIMER-PAUSA-DINAMICA | desc: Tick actualiza pausaTotalAcumulada y tiempoEfectivo en tiempo real. Botón de reserva visible dinámicamente.
import { useState, useEffect, useRef, useCallback } from 'react';
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
  const [sgta, setSgta] = useState(() => ({
    ...SGTA_DEFAULTS,
    _moduloExcedido: false,
    reservaActiva: false,
    reservaRestante: 0,
    pausaAlIniciarReserva: null,
    sesionIniciada: false
  }));
  const sgtaRef = useRef(sgta);
  useEffect(() => { sgtaRef.current = sgta; }, [sgta]);

  // Refs para valores que necesita el tick (evitan dependencia de 'reserva')
  const tickDataRef = useRef({
    sesionIniciada: false,
    totalCompletado: false,
    diarioCompletado: false,
    limiteTotal: 240,
    limiteDiario: 120,
    pausaActiva: false,
    pausaInicio: null,
    pausaAcumuladaBase: 0,      // lo guardado en Firestore (sin la pausa actual)
    moduloActivo: false,
    _moduloExcedido: false,
  });

  const [modalConfirmacion, setModalConfirmacion] = useState(null);
  const pedirConfirmacion = useCallback((titulo, mensaje) => {
    return new Promise((resolve) => {
      setModalConfirmacion({ titulo, mensaje, onConfirm: () => { setModalConfirmacion(null); resolve(true); }, onCancel: () => { setModalConfirmacion(null); resolve(false); } });
    });
  }, []);

  // Suscripción a Firestore
  useEffect(() => {
    if (!reservaId) return;
    const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'reservas', reservaId);
    const unsub = onSnapshot(ref, (snap) => { if (snap.exists()) setReserva({ id: snap.id, ...snap.data() }); }, () => {});
    return () => unsub();
  }, [reservaId]);

  // Presencia del estudiante (solo si NO es instructor)
  const presenciaEscrita = useRef(false);
  useEffect(() => {
    if (esInstructor || !reservaId || presenciaEscrita.current) return;
    const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'reservas', reservaId);
    updateDoc(ref, { estudiantePresente: Date.now() }).then(() => { presenciaEscrita.current = true; });
    return () => {
      updateDoc(ref, { estudiantePresente: null }).catch(() => {});
    };
  }, [reservaId, esInstructor]);

  // Sincronizar tickDataRef con los últimos valores derivados, incluyendo pausa acumulada base
  useEffect(() => {
    if (!reserva) return;
    const ahora = Date.now();
    const pausaActiva = !!reserva.pausaActiva;
    const tieneSesionDiaria = !!reserva.sesionDiariaInicio;
    const tieneSesionTotal = !!reserva.sesionTotalInicio;

    const curso = opcionesRef.current?.curso;
    const limiteDiario = reserva.sesionDiariaLimite || 120;
    const limiteTotal = reserva.sesionTotalLimite || curso?.duracionTotal || 240;

    const diarioCompletado = tieneSesionDiaria && (Math.max(0, Math.floor((ahora - reserva.sesionDiariaInicio) / 1000)) >= limiteDiario * 60);
    const totalCompletado = tieneSesionTotal && (Math.max(0, Math.floor((ahora - reserva.sesionTotalInicio) / 1000)) >= limiteTotal * 60);

    // Pausa acumulada base = lo que ya está guardado (sin contar la pausa actual)
    const pausaAcumuladaBase = reserva.pausaTotalAcumulada ?? (reserva.pausas || []).reduce((acc, p) => acc + (p.duracion || 0) * 60, 0);

    tickDataRef.current = {
      sesionIniciada: tieneSesionDiaria,
      totalCompletado,
      diarioCompletado,
      limiteTotal,
      limiteDiario,
      pausaActiva,
      pausaInicio: reserva.pausaActiva?.inicio || null,
      pausaAcumuladaBase,
      moduloActivo: !!reserva.moduloEnProgreso && !pausaActiva && !sgtaRef.current._moduloExcedido,
      _moduloExcedido: sgtaRef.current._moduloExcedido,
    };
  }, [reserva, opcionesRef]);

  // Tick estable: ahora calcula pausaTotalAcumulada y tiempoEfectivo en tiempo real
  useEffect(() => {
    if (!reservaId) return;
    const interval = setInterval(() => {
      const d = tickDataRef.current;
      setSgta(prev => {
        const nuevo = { ...prev };
        const ahora = Date.now();

        // Reloj general (continúa hasta completar total)
        if (d.sesionIniciada && !d.totalCompletado) {
          nuevo.generalSegundos = (prev.generalSegundos || 0) + 1;
          if (nuevo.generalSegundos >= d.limiteTotal * 60) {
            nuevo.generalSegundos = d.limiteTotal * 60;
            nuevo.totalCompletado = true;
          }
        }

        // Reloj diario
        if (d.sesionIniciada && !d.diarioCompletado) {
          nuevo.diarioSegundos = (prev.diarioSegundos || 0) + 1;
          if (nuevo.diarioSegundos >= d.limiteDiario * 60) {
            nuevo.diarioSegundos = d.limiteDiario * 60;
            nuevo.diarioCompletado = true;
          }
        }

        // Módulo actual
        if ((d.moduloActivo || d._moduloExcedido) && !d.pausaActiva) {
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

        // Pausa: calcular segundos actuales y total acumulado en tiempo real
        if (d.pausaActiva && d.pausaInicio) {
          nuevo.pausaSegundos = Math.floor((ahora - d.pausaInicio) / 1000);
          nuevo.pausaTotalAcumulada = d.pausaAcumuladaBase + nuevo.pausaSegundos;
        } else {
          nuevo.pausaSegundos = 0;
          nuevo.pausaTotalAcumulada = d.pausaAcumuladaBase;
        }
        // Tiempo efectivo = límite total - acumulado total de pausa
        nuevo.tiempoEfectivo = Math.max(0, (d.limiteTotal * 60) - nuevo.pausaTotalAcumulada);

        // Reserva activa (botón naranja)
        if (prev.reservaActiva && prev.reservaRestante > 0) {
          nuevo.reservaRestante = prev.reservaRestante - 1;
          nuevo.generalSegundos = (prev.generalSegundos || 0) + 1;
          if (nuevo.reservaRestante <= 0) {
            nuevo.reservaActiva = false;
            nuevo.reservaRestante = 0;
            nuevo.pausaTotalAcumulada = 0;
            nuevo.tiempoEfectivo = d.limiteTotal * 60;
          }
        }

        return nuevo;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [reservaId]); // Solo depende de reservaId

  const actualizar = async (campos) => {
    if (!reserva?.id) return;
    await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'reservas', reserva.id), campos);
  };

  const iniciarModulo = useCallback(async (nombre) => {
    if (!reserva) return;
    const curso = opcionesRef.current?.curso;
    const horario = opcionesRef.current?.hor;

    if (!curso || !horario) {
      showToast('Datos del curso no disponibles. Intenta de nuevo.', 'error');
      return;
    }

    if (reserva.estadoPago !== 'Aprobado') {
      showToast('El pago no ha sido aprobado. No se puede iniciar el curso.', 'error');
      return;
    }

    if (!reserva.estudiantePresente || (Date.now() - reserva.estudiantePresente) > 2 * 60 * 1000) {
      showToast('El estudiante no está presente. Pídele que abra el Aula Virtual.', 'error');
      return;
    }

    const hoy = new Date().toISOString().split('T')[0];
    const fechaCurso = reserva.fecha;
    const fecha2Curso = reserva.fecha2;
    if (hoy < fechaCurso) {
      showToast(`El curso está programado para el ${fechaCurso}. No puedes iniciarlo antes.`, 'error');
      return;
    }
    if (fecha2Curso && hoy > fecha2Curso) {
      showToast('El curso ha vencido. Contacta al administrador para reprogramar.', 'error');
      return;
    }
    if (!fecha2Curso && hoy > fechaCurso) {
      showToast('El curso ha vencido. Contacta al administrador para reprogramar.', 'error');
      return;
    }

    const horaInicioLabel = horario?.label?.split('-')[0]?.trim();
    const horaInicioMinutos = horaInicioLabel ? parseHora(horaInicioLabel) : null;
    if (horaInicioMinutos !== null) {
      const ahoraMinutos = new Date().getHours() * 60 + new Date().getMinutes();
      if (ahoraMinutos < horaInicioMinutos) {
        showToast(`El bloque comienza a las ${horaInicioLabel}. Espera hasta esa hora.`, 'error');
        return;
      }
    }

    const duracionTotalCurso = curso?.duracionTotal || 240;
    const duracionDiariaCurso = fecha2Curso ? Math.floor(duracionTotalCurso / 2) : duracionTotalCurso;
    let diaActual = reserva.diaActual || 1;

    if (fecha2Curso && hoy === fecha2Curso && reserva.diaActual === 1) {
      diaActual = 2;
    }

    const primerInicioDia = !reserva.sesionDiariaInicio || (diaActual === 2 && reserva.diaActual === 1);

    let limiteDiario = duracionDiariaCurso;
    if (primerInicioDia) {
      const horaFinLabel = horario?.label?.split('-')[1]?.trim();
      const horaFinMinutos = horaFinLabel ? parseHora(horaFinLabel) : null;
      if (horaFinMinutos !== null) {
        const ahoraMinutos = new Date().getHours() * 60 + new Date().getMinutes();
        const minutosRestantesBloque = horaFinMinutos - ahoraMinutos;
        limiteDiario = Math.min(duracionDiariaCurso, Math.max(0, minutosRestantesBloque));
        if (limiteDiario < 30) {
          showToast(`Solo quedan ${limiteDiario} min antes del cierre del bloque.`, 'info');
        }
      }
    } else {
      limiteDiario = reserva.sesionDiariaLimite || duracionDiariaCurso;
    }

    const duracionPrevia = (reserva.modulosEstado || {})[nombre]?.duracionParcial || 0;
    const duracionExtraPrevia = (reserva.modulosEstado || {})[nombre]?.duracionExtraParcial || 0;
    const segundosIniciales = (duracionPrevia + duracionExtraPrevia) * 60;

    const campos = {
      moduloEnProgreso: { modulo: nombre, inicio: Date.now() - segundosIniciales * 1000 }
    };

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
    setSgta(prev => ({
      ...prev,
      moduloEnProgreso: nombre,
      moduloSegundos: segundosIniciales,
      moduloActivo: true,
      generalActivo: true,
      _recesoAlerta: false,
      _moduloExcedido: segundosIniciales >= 3600,
      sesionIniciada: true
    }));
    await actualizar(campos);
  }, [reserva, showToast, actualizar, opcionesRef]);

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
  }, [reserva, showToast, actualizar]);

  const pausarSesion = useCallback(async (motivo) => {
    if (!reserva) return;
    alertas.sesionPausada();
    setSgta(prev => ({ ...prev, pausaActiva: true, pausaInicio: Date.now(), pausaMotivo: motivo, pausaSegundos: 0, moduloActivo: false }));
    await actualizar({ pausaActiva: { motivo, inicio: Date.now() } });
  }, [reserva, actualizar]);

  const reanudarSesion = useCallback(async () => {
    if (!reserva) return;
    const pausaInicio = sgtaRef.current.pausaInicio;
    if (pausaInicio) {
      const durMin = Math.floor((Date.now() - pausaInicio) / 60000);
      if (durMin > 60) {
        alertas.pausaExcedida();
        showToast('Pausa excedió 60 min. Sesión finalizada.', 'error');
        setSgta(prev => ({ ...prev, pausaActiva: false }));
        await actualizar({ pausaActiva: null, moduloEnProgreso: null });
        return;
      }
      const pausas = [...(reserva.pausas || []), { inicio: pausaInicio, fin: Date.now(), motivo: sgtaRef.current.pausaMotivo, duracion: durMin }];
      const totalAcumulado = (sgtaRef.current.pausaTotalAcumulada || 0); // Ya incluye lo que se acumuló durante la pausa
      const tiempoEfectivo = Math.max(0, (sgtaRef.current.limiteTotal || 240) * 60 - totalAcumulado);
      await actualizar({ pausas, pausaActiva: null, pausaTotalAcumulada: totalAcumulado, tiempoEfectivo });
      setSgta(prev => ({ ...prev, pausaTotalAcumulada: totalAcumulado, tiempoEfectivo }));
    }
    alertas.sesionReanudada();
    setSgta(prev => ({ ...prev, pausaActiva: false, pausaInicio: null, pausaMotivo: '', pausaSegundos: 0, moduloActivo: !!prev.moduloEnProgreso && !prev._moduloExcedido }));
  }, [reserva, showToast, actualizar]);

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
      if (!confirmado) return;
      await finalizarModulo(nombre);
      return;
    }
    await iniciarModulo(nombre);
  }, [reserva, showToast, iniciarModulo, finalizarModulo, pedirConfirmacion, actualizar]);

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
  }, [reserva, actualizar]);

  return {
    reserva, sgta, modalConfirmacion,
    toggleModulo: esInstructor ? toggleModulo : () => {},
    pausarSesion: esInstructor ? pausarSesion : () => {},
    reanudarSesion: esInstructor ? reanudarSesion : () => {},
    activarReserva, pausarReserva, reanudarReserva, detenerReserva
  };
}