// @build: 2026-07-21 | id: INSC-B154-FIX | desc: Corrección reinscripción con progreso en Firestore
import { useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../../context/AppContextValue';
import { auth } from '../../../firebase';
import { ReservaService } from '../../../services/ReservaService';
import { LockService } from '../../../services/LockService';
import { AuthService } from '../../../services/AuthService';
import ModalConfirmacion from '../../shared/components/ModalConfirmacion';
import { Button, Spinner } from '../../../components/UI';
import { useToast } from '../../shared/components/ToastProvider';
import AppShell from '../../shared/components/AppShell';
import DashboardHeader from '../../shared/components/DashboardHeader';
import { useInscripcionState } from '../hooks/useInscripcionState';
import { Paso1DatosPersonales } from '../components/Paso1DatosPersonales';
import { Paso2Configuracion } from '../components/Paso2Configuracion';
import { Paso3Horario } from '../components/Paso3Horario';
import { Paso4Pago } from '../components/Paso4Pago';
import { Stepper } from '../components/Stepper';
import { CalendarioFlotante } from '../components/CalendarioFlotante';
import { FormularioSalud } from '../components/FormularioSalud';
import { CalendarioNacimiento } from '../components/CalendarioNacimiento';
import { LockTimerFlotante } from '../components/LockTimerFlotante';
import { ModalExpiracion } from '../components/ModalExpiracion';
import { ArrowRight, Check, Award, Bike } from 'lucide-react';
import { validarPaso1, validarPaso4 } from '../../shared/schemas/validations';

const LOCK_DURATION = 10 * 60 * 1000;
const MAX_REINTENTOS_EXPIRACION = 3;
const MAX_DIAS_RESERVA = 30;

// ─── Blindaje temporal absoluto (America/Caracas) ──────
const getCaracasTime = () => {
  const d = new Date();
  const caracasStr = d.toLocaleString('en-US', { timeZone: 'America/Caracas' });
  return new Date(caracasStr);
};

const isPastBlock = (fecha, label, todayStr) => {
  if (fecha !== todayStr || !label) return false;
  try {
    const startStr = label.split('-')[0].trim();
    const parts = startStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!parts) return false;
    let hours = parseInt(parts[1], 10);
    const mins = parseInt(parts[2], 10);
    const modifier = parts[3].toUpperCase();
    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
    const blockTime = getCaracasTime();
    blockTime.setHours(hours, mins, 0, 0);
    return getCaracasTime() > blockTime;
  } catch (e) { return false; }
};

// ─── Función pura de disponibilidad ─────────────────────
const evaluarDisponibilidad = ({
  form, horarios, instructores, motos, reservasConfirmadas, activeLocks, selectingBlockId, currentUserId, todayStr, lockId
}) => {
  const necesitaMoto = form.traeMoto !== 'Sí';
  const locksDeOtros = (activeLocks || []).filter(l => l.userId !== currentUserId);

  const isInstructorOcupado = (instructorId, bloqueId, fecha1, fecha2) => {
    const enReserva = (reservasConfirmadas || []).some(r => {
      if (r.estadoPago !== 'Pendiente' && r.estadoPago !== 'Aprobado') return false;
      if (r.instructorId !== instructorId) return false;
      if (r.horaId !== bloqueId) return false;            // ← añadir esta línea
      return r.fecha === fecha1 || r.fecha === fecha2 || r.fecha2 === fecha1 || r.fecha2 === fecha2;
    });
    if (enReserva) return true;
    const enLock = locksDeOtros.some(lock => {
      if (lock.instructorId !== instructorId) return false;
      if (lock.horaId !== bloqueId) return false;
      return lock.fecha === fecha1 || lock.fecha === fecha2;
    });
    return enLock;
  };
  const isMotoOcupada = (motoId, bloqueId, fecha1, fecha2) => {
    const enReserva = (reservasConfirmadas || []).some(r => {
      if (r.estadoPago !== 'Pendiente' && r.estadoPago !== 'Aprobado') return false;
      if (r.motoAsignadaId !== motoId) return false;
      if (r.traeMoto === 'Sí') return false;
      if (r.horaId !== bloqueId) return false;             // ← añadir esta línea
      return r.fecha === fecha1 || r.fecha === fecha2 || r.fecha2 === fecha1 || r.fecha2 === fecha2;
    });
    if (enReserva) return true;
    const enLock = locksDeOtros.some(lock => {
      if (lock.motoAsignadaId !== motoId) return false;
      if (lock.horaId !== bloqueId) return false;          // ← añadir esta línea
      return lock.fecha === fecha1 || lock.fecha === fecha2;
    });
    return enLock;
  };

  const fecha2Calc = form.fecha1 ? (() => { const d = new Date(form.fecha1 + 'T12:00:00'); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; })() : '';

  const calcularBloque = (bloque, fecha1, fecha2) => {
    if (bloque.isLunch) return { ...bloque, disponible: false, reason: 'ALMUERZO', instructorId: null, motoAsignadaId: null };
    if (fecha1 < todayStr || isPastBlock(fecha1, bloque.label, todayStr))
      return { ...bloque, disponible: false, reason: 'CERRADO', instructorId: null, motoAsignadaId: null };
    if (bloque.id === selectingBlockId)
      return { ...bloque, disponible: true, reason: '', instructorId: null, motoAsignadaId: null, seleccionando: true };
    if (lockId && form.horaId === bloque.id)
      return { ...bloque, disponible: true, reason: '', restaurado: true };

    const instructoresDisponibles = (instructores || [])
      .filter(i => i.activo && (i.sedes || []).includes(form.sedeId))
      .filter(i => !isInstructorOcupado(i.id, bloque.id, fecha1, fecha2));

    let motosDisponibles = [];
    if (necesitaMoto) {
      motosDisponibles = (motos || [])
        .filter(m => m.activo && m.tipo === form.tipoMoto && (m.sedes || []).includes(form.sedeId))
        .filter(m => !isMotoOcupada(m.id, bloque.id, fecha1, fecha2));
    }

    if (!necesitaMoto) {
      if (instructoresDisponibles.length > 0)
        return { ...bloque, disponible: true, reason: '', instructorId: instructoresDisponibles[0].id, motoAsignadaId: null };
    } else {
      if (instructoresDisponibles.length > 0 && motosDisponibles.length > 0)
        return { ...bloque, disponible: true, reason: '', instructorId: instructoresDisponibles[0].id, motoAsignadaId: motosDisponibles[0].id };
    }

    const instructoresTotal = (instructores || []).filter(i => i.activo && (i.sedes || []).includes(form.sedeId));
    const motosTotal = (motos || []).filter(m => m.activo && m.tipo === form.tipoMoto && (m.sedes || []).includes(form.sedeId));
        const instructoresLibresSinLocks = instructoresTotal.filter(i => !reservasConfirmadas.some(r => r.instructorId === i.id && r.horaId === bloque.id && (r.fecha === fecha1 || r.fecha === fecha2 || r.fecha2 === fecha1 || r.fecha2 === fecha2))).length;
    const motosLibresSinLocks = necesitaMoto ? motosTotal.filter(m => !reservasConfirmadas.some(r => r.motoAsignadaId === m.id && r.traeMoto !== 'Sí' && r.horaId === bloque.id && (r.fecha === fecha1 || r.fecha === fecha2 || r.fecha2 === fecha1 || r.fecha2 === fecha2))).length : 999;
    if (!necesitaMoto) {
      if (instructoresLibresSinLocks === 0) return { ...bloque, disponible: false, reason: 'RESERVADO', instructorId: null, motoAsignadaId: null };
      return { ...bloque, disponible: false, reason: 'EN_ESPERA_PAGO', instructorId: null, motoAsignadaId: null };
    } else {
      if (instructoresLibresSinLocks === 0 || motosLibresSinLocks === 0) return { ...bloque, disponible: false, reason: 'RESERVADO', instructorId: null, motoAsignadaId: null };
      return { ...bloque, disponible: false, reason: 'EN_ESPERA_PAGO', instructorId: null, motoAsignadaId: null };
    }
  };

  const today = todayStr;
  const maxDate = (() => { const d = new Date(); d.setDate(d.getDate() + MAX_DIAS_RESERVA - 1); return d.toISOString().split('T')[0]; })();

  const diasDisponibles = [];
  if (form.sedeId && form.tipoMoto) {
    const cursor = new Date(today + 'T12:00:00');
    const fin = new Date(maxDate + 'T12:00:00');
    while (cursor <= fin) {
      const fechaStr = cursor.toISOString().split('T')[0];
      const d2 = new Date(cursor); d2.setDate(d2.getDate() + 1);
      const fecha2Candidate = d2.toISOString().split('T')[0];
      const hayAlguno = (horarios || []).filter(h => h.activo && !h.isLunch).some(bloque => {
        const info = calcularBloque(bloque, fechaStr, fecha2Candidate);
        return info.disponible;
      });
      diasDisponibles.push({ fecha: fechaStr, disponible: hayAlguno });
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  const bloques = (horarios || []).filter(h => h.activo).sort((a, b) => a.id.localeCompare(b.id)).map(b => calcularBloque(b, form.fecha1, fecha2Calc));

  return { diasDisponibles, bloques, fecha2Calc, maxDate };
};

// ─── Componente ─────────────────────────────────────────
export const InscripcionView = () => {
  const ctx = useContext(AppContext);
  const { showToast } = useToast();
  const navigate = useNavigate();

  const {
    step, setStep,
    form, updateForm,
    lockId, updateLockId,
    lockExpiresAt, updateLockExpiresAt,
    limpiarSesion
  } = useInscripcionState();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSelectingHorario, setIsSelectingHorario] = useState(false);
  const [selectingBlockId, setSelectingBlockId] = useState(null);
  const [captchaValue, setCaptchaValue] = useState('');
  const [captchaA, setCaptchaA] = useState(() => Math.floor(Math.random() * 8) + 1);
  const [captchaB, setCaptchaB] = useState(() => Math.floor(Math.random() * 8) + 1);
  const [tiempoRestante, setTiempoRestante] = useState(null);
  const [renovacionUsada, setRenovacionUsada] = useState(false);
  const [mostrarDetallesPago, setMostrarDetallesPago] = useState(false);
  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const [mesCalendario, setMesCalendario] = useState(() => { const hoy = new Date(); return new Date(hoy.getFullYear(), hoy.getMonth(), 1); });
  const [modalLiberar, setModalLiberar] = useState(null);
  const [mostrarCalendarioNacimiento, setMostrarCalendarioNacimiento] = useState(false);
  const [tempFechaNacimiento, setTempFechaNacimiento] = useState({ dia: '', mes: '', ano: '' });
  const [mostrarFormularioSalud, setMostrarFormularioSalud] = useState(false);
  const [lockExpirado, setLockExpirado] = useState(false);
  const [reintentosExpiracion, setReintentosExpiracion] = useState(0);
  const [mostrarModalExpiracion, setMostrarModalExpiracion] = useState(false);

  const [activeLocks, setActiveLocks] = useState([]);  
  const calendarioRef = useRef(null);
  const generatedPinRef = useRef(null);
  const [generatedPin, setGeneratedPin] = useState(() => {
    return sessionStorage.getItem('inscripcion_generatedPin') || null;
  });

  const [mostrarPantallaExito, setMostrarPantallaExito] = useState(false);
  const [pinFinal, setPinFinal] = useState(null);

  const [clockTick, setClockTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setClockTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { if (generatedPin) generatedPinRef.current = generatedPin; }, [generatedPin]);

useEffect(() => {
  if (!ctx.fbUser) return;
  const fechaAEscuchar = form.fecha1 || ctx.getTodayStr();
  const cleanup = LockService.escucharOcupacionTemporal(fechaAEscuchar, (locks) => {
    setActiveLocks(locks);
  });
  return () => cleanup();
}, [form.fecha1, ctx.fbUser, ctx.getTodayStr]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarioRef.current && !calendarioRef.current.contains(event.target)) {
        setMostrarCalendario(false);
      }
    };
    if (mostrarCalendario) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mostrarCalendario]);

  useEffect(() => {
    if (!lockExpiresAt) { setTiempoRestante(null); setLockExpirado(false); setMostrarModalExpiracion(false); return; }
    const actualizarContador = () => {
      const restante = lockExpiresAt - Date.now();
      if (restante <= 0) { setTiempoRestante(0); if (!lockExpirado) { setLockExpirado(true); setMostrarModalExpiracion(true); } return; }
      setTiempoRestante(restante);
    };
    actualizarContador();
    const interval = setInterval(actualizarContador, 1000);
    return () => clearInterval(interval);
  }, [lockExpiresAt, lockExpirado]);

  useEffect(() => {
    if (lockId && form.horaId && step !== '4') {
      LockService.liberarLock(lockId).catch(() => {});
      updateLockId(null); updateLockExpiresAt(null); setTiempoRestante(null); updateForm({ horaId: '' });
    }
  }, [form.fecha1]);

  useEffect(() => {
    if (step === '3' && !ctx.fbUser) {
      showToast('Tu sesión ha expirado. Inicia sesión nuevamente.', 'error');
      if (ctx.logoutUser) ctx.logoutUser();
      navigate('/login');
    }
  }, [step, ctx.fbUser, ctx.logoutUser, showToast, navigate]);

  // ─── Cálculo de disponibilidad ────────────────────────
  const todayStr = ctx.getTodayStr();
const disponibilidad = useMemo(() => {
  if (!ctx.instructores?.length || !ctx.motos?.length || !ctx.horarios?.length) return null;
  return evaluarDisponibilidad({
    form, horarios: ctx.horarios, instructores: ctx.instructores, motos: ctx.motos,
    reservasConfirmadas: ctx.ocupacionConfirmada, activeLocks: activeLocks || [], selectingBlockId,
    currentUserId: ctx.fbUser?.uid, todayStr, lockId
  });
}, [form, ctx.horarios, ctx.instructores, ctx.motos, ctx.ocupacionConfirmada, activeLocks, selectingBlockId, ctx.fbUser?.uid, todayStr, lockId, clockTick]);
  useEffect(() => {
    if (step === '3' && !form.fecha1 && disponibilidad?.diasDisponibles?.length > 0) {
      const primerDiaLibre = disponibilidad.diasDisponibles.find(dia => dia.disponible);
      updateForm({ fecha1: primerDiaLibre ? primerDiaLibre.fecha : todayStr });
    }
  }, [step, form.fecha1, disponibilidad, updateForm, todayStr]);

  const baseUSD = ctx.calcularBaseUSD(form.sedeId, form.sabeBicicleta, form.traeMoto);
  const tasaCobro = ctx.config.monedaCobroClientes === 'USD' ? ctx.config.tasaUSD : ctx.config.tasaEUR;
  const precioFinalVES = (baseUSD * (Number(tasaCobro) || 1)).toFixed(2);
  const fechaNacimiento = (form.diaNac && form.mesNac && form.anoNac) ? form.anoNac + '-' + String(form.mesNac).padStart(2,'0') + '-' + String(form.diaNac).padStart(2,'0') : '';

  const handleConfirmarPago = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) { showToast('Error: Sesión no encontrada. Recarga la página.', 'error'); return; }
    if (!lockId) { showToast('Error: No se encontró el bloqueo del horario.', 'error'); return; }
    setIsSubmitting(true);
    const result = await ReservaService.crearReserva({
      ...form, userId: uid, fecha: form.fecha1, fecha2: disponibilidad?.fecha2Calc || '',
      fechaNacimiento, pagoTotalMoneda: baseUSD, pagoTotalVES: parseFloat(precioFinalVES)
    }, lockId);
    setIsSubmitting(false);
    if (result.success) {
      await ReservaService.limpiarProgreso(form.correo).catch(() => {});
      limpiarSesion();
      setPinFinal(generatedPinRef.current || generatedPin);
      setMostrarPantallaExito(true);
    } else {
      const codigo = result.error?.code;
      if (codigo === 'invalid-data') showToast(result.error.message || 'Datos inválidos', 'error');
      else showToast(result.error.message || 'Error al crear la reserva', 'error');
    }
  }, [lockId, form, disponibilidad, fechaNacimiento, baseUSD, precioFinalVES, limpiarSesion, showToast, generatedPin]);

  const handleIrAlPanel = useCallback(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) { showToast('Error de sesión. No se puede acceder al panel.', 'error'); return; }
    ctx.setUser({ role: 'estudiante', data: { nombre: form.nombre, apellido: form.apellido, cedula: form.cedula }, uid: uid });
    navigate('/portal-reservas');
  }, [ctx, form, navigate, showToast]);

  const handleSelectHorario = useCallback(async (bloque) => {
    if (lockId && form.horaId === bloque.id) { setModalLiberar({ bloque }); return; }
    if (isSelectingHorario) return;
    if (!ctx.fbUser) { showToast('Espera un momento...', 'error'); return; }

    const locksDeOtros = (activeLocks || []).filter(l => l.userId !== ctx.fbUser?.uid);
    const necesitaMoto = form.traeMoto !== 'Sí';
    const instructoresLibres = (ctx.instructores || [])
      .filter(i => i.activo && (i.sedes || []).includes(form.sedeId))
      .filter(i => !locksDeOtros.some(lock => lock.instructorId === i.id && lock.horaId === bloque.id && (lock.fecha === form.fecha1 || lock.fecha === disponibilidad?.fecha2Calc)));
    let motosLibres = [];
    if (necesitaMoto) {
      motosLibres = (ctx.motos || [])
        .filter(m => m.activo && m.tipo === form.tipoMoto && (m.sedes || []).includes(form.sedeId))
        .filter(m => !locksDeOtros.some(lock => lock.motoAsignadaId === m.id && lock.horaId === bloque.id && (lock.fecha === form.fecha1 || lock.fecha === disponibilidad?.fecha2Calc)));
    }

    const instructorId = instructoresLibres[0]?.id;
    const motoAsignadaId = necesitaMoto ? motosLibres[0]?.id : null;
    if (!instructorId || (necesitaMoto && !motoAsignadaId)) {
      showToast('Este bloque acaba de quedarse sin recursos. Por favor, selecciona otro.', 'error');
      return;
    }

    setIsSelectingHorario(true); setSelectingBlockId(bloque.id);
    if (lockId && !renovacionUsada) { await LockService.liberarLock(lockId).catch(() => {}); }
    const nuevoLockId = form.fecha1 + '_' + bloque.id + '_' + instructorId + '_' + (motoAsignadaId || 'sinmoto');
    const result = await LockService.crearLock(nuevoLockId, ctx.fbUser.uid, {
      fecha: form.fecha1, horaId: bloque.id, instructorId, motoAsignadaId
    });
    if (result.success) {
      updateLockId(nuevoLockId);
      updateForm({ horaId: bloque.id, instructorId, motoAsignadaId });
      updateLockExpiresAt(Date.now() + LOCK_DURATION);
      setLockExpirado(false); setReintentosExpiracion(0); setRenovacionUsada(false);
      showToast('Horario seleccionado. Tienes 10 minutos para completar el pago.', 'success');
    } else {
      const codigo = result.error?.code;
      if (codigo === 'permission-denied') showToast('Este horario acaba de ser separado por otro usuario.', 'error');
      else if (codigo === 'network-error' || codigo === 'unavailable') showToast('Error de conexión. Intente de nuevo.', 'error');
      else showToast(result.error?.message || 'No se pudo bloquear el horario', 'error');
    }
    setIsSelectingHorario(false); setSelectingBlockId(null);
  }, [lockId, form, disponibilidad, ctx, isSelectingHorario, renovacionUsada, activeLocks, updateLockId, updateForm, updateLockExpiresAt, showToast]);

  const handleRenovarLock = useCallback(async () => {
    if (!lockId || renovacionUsada) return;
    setRenovacionUsada(true);
    const result = await LockService.crearLock(lockId, ctx.fbUser.uid, { fecha: form.fecha1, horaId: form.horaId });
    if (result.success) {
      updateLockExpiresAt(Date.now() + LOCK_DURATION);
      showToast('Tiempo renovado. Tienes 10 minutos adicionales.', 'success');
    } else showToast(result.error.message || 'No se pudo renovar el tiempo', 'error');
  }, [lockId, renovacionUsada, ctx.fbUser, form.fecha1, form.horaId, updateLockExpiresAt, showToast]);

  const handleLiberarHorario = useCallback(async () => {
    if (!lockId) { setModalLiberar(null); return; }
    try {
      await LockService.liberarLock(lockId);
      updateLockId(null); updateLockExpiresAt(null); setTiempoRestante(null);
      updateForm({ horaId: '' }); setRenovacionUsada(false);
      showToast('Horario liberado. Puedes seleccionar otro.', 'success');
    } catch (error) { showToast('Error al liberar el horario', 'error'); }
    setModalLiberar(null);
  }, [lockId, updateLockId, updateLockExpiresAt, updateForm, showToast]);

  const handleSeleccionarBloqueDesdeExpiracion = useCallback(async () => {
    const nuevoReintentos = reintentosExpiracion + 1;
    setReintentosExpiracion(nuevoReintentos);
    if (lockId) { await LockService.liberarLock(lockId).catch(() => {}); }
    updateLockId(null); updateLockExpiresAt(null); setTiempoRestante(null);
    setLockExpirado(false); setMostrarModalExpiracion(false);
    updateForm({ horaId: '' });
    if (nuevoReintentos >= MAX_REINTENTOS_EXPIRACION) {
      showToast('Has excedido el límite de intentos. Debes salir del sistema.', 'error');
      if (ctx.logoutUser) await ctx.logoutUser();
      limpiarSesion(); navigate('/');
      return;
    }
    showToast('Selecciona un nuevo horario.', 'info');
    setStep('3');
  }, [reintentosExpiracion, lockId, ctx.logoutUser, limpiarSesion, navigate, showToast, setStep, updateLockId, updateLockExpiresAt, updateForm]);

  const handleSalirDesdeExpiracion = useCallback(async () => {
    if (lockId) { await LockService.liberarLock(lockId).catch(() => {}); }
    setMostrarModalExpiracion(false);
    limpiarSesion();
    if (ctx.logoutUser) await ctx.logoutUser();
    navigate('/');
  }, [lockId, limpiarSesion, ctx.logoutUser, navigate]);

  const handleNext = async () => {
        if (step === '1') {
      // Validar siempre con Zod antes de cualquier acción
      const validacion = validarPaso1(form);
      if (!validacion.success) {
        showToast(Object.values(validacion.errores)[0] || 'Datos inválidos', 'error');
        return;
      }

      if (!ctx.fbUser) {
        setIsSubmitting(true);
        const result = await AuthService.crearEstudiante(form.cedula, form.correo);
        setIsSubmitting(false);

        if (result.success) {
          // Cuenta nueva creada → guardar progreso y avanzar
          const pin = result.data.pin;
          generatedPinRef.current = pin;
          setGeneratedPin(pin);
          sessionStorage.setItem('inscripcion_generatedPin', pin);
          const uid = result.data.user?.uid || auth.currentUser?.uid;
          await ReservaService.guardarProgreso(uid, 2, { ...form, pin }, form.correo).catch(() => {});
          setStep('2');
        } else if (result.error.code === 'already-enrolled' || result.error.code === 'auth/email-already-in-use') {
          // El correo ya existe → buscar progreso en Firestore
          const progreso = await ReservaService.buscarProgresoPorCorreo(form.correo);
          if (progreso.success && progreso.data) {
            const { pin: pinGuardado, paso: pasoGuardado, datosFormulario } = progreso.data;
            const loginResult = await AuthService.loginEstudiante(form.correo, pinGuardado);
            if (loginResult.success) {
              if (datosFormulario) {
                updateForm(datosFormulario);
              }
              setStep(String(pasoGuardado));
              showToast(`Bienvenido de vuelta. Continúas en el paso ${pasoGuardado}.`, 'success');
            } else {
              showToast('Tu correo ya está registrado pero el PIN no coincide. Contacta al administrador.', 'error');
            }
          } else {
            showToast('Este correo ya está registrado. Si olvidaste tu PIN, contacta al administrador.', 'error');
          }
        } else {
          showToast(result.error.message, 'error');
        }
        return;
      }
      // Ya hay sesión activa → validación ya hecha, avanzar
      setStep('2');
      return;
    }
        if (step === '2') {
      // Validar campos requeridos del paso 2
      if (!form.cursoId) {
        showToast('Selecciona un curso', 'error');
        return;
      }
      if (!form.sedeId) {
        showToast('Selecciona una sede', 'error');
        return;
      }
      if (!form.tipoMoto) {
        showToast('Selecciona el tipo de moto', 'error');
        return;
      }
      if (!form.sabeBicicleta) {
        showToast('Indica si sabes andar en bicicleta', 'error');
        return;
      }
      await ReservaService.guardarProgreso(ctx.fbUser?.uid, 3, form, form.correo).catch(() => {});
      setStep('3');
      return;
    }
    if (step === '3') {
      if (!form.horaId || !lockId) { showToast('Selecciona un horario', 'error'); return; }
      await LockService.crearLock(lockId, ctx.fbUser.uid, { fecha: form.fecha1, horaId: form.horaId }).catch(() => {});
      updateLockExpiresAt(Date.now() + LOCK_DURATION);
      setLockExpirado(false); setRenovacionUsada(false);
      await ReservaService.guardarProgreso(ctx.fbUser?.uid, 4, form, form.correo).catch(() => {});
      setStep('4');
      return;
    }
        if (step === '4') {
      if (lockExpirado) { showToast('El tiempo expiró. Debes seleccionar un nuevo horario.', 'error'); return; }
      // Validar campos de pago con Zod
      const validacionPago = validarPaso4(form);
      if (!validacionPago.success) {
        showToast(Object.values(validacionPago.errores)[0] || 'Datos de pago inválidos', 'error');
        return;
      }
      if (captchaValue !== String(captchaA + captchaB)) {
        setCaptchaA(Math.floor(Math.random() * 8) + 1);
        setCaptchaB(Math.floor(Math.random() * 8) + 1);
        setCaptchaValue('');
        showToast('Resultado incorrecto', 'error'); return;
      }
      handleConfirmarPago();
    }
  };

  const handleBack = () => {
    if (step === '2') setStep('1');
    else if (step === '3') setStep('2');
    else if (step === '4') setStep('3');
    else navigate('/');
  };

  if (!ctx.authReady) return <Spinner message="Cargando..." />;

  if (mostrarPantallaExito) {
    return (
      <AppShell header={<DashboardHeader title="Inscripción Completada" showNotifications={false} />} bgColor="bg-white">
        <div className="flex flex-col items-center justify-center min-h-full p-6 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6"><Award size={48} className="text-green-600" /></div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">¡Inscripción Completada!</h2>
          <p className="text-sm text-gray-500 mb-8">Bienvenido a MotoEscuela. Guarda tu PIN de acceso.</p>
          <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-6 mb-8 w-full max-w-xs">
            <p className="text-sm text-gray-600 mb-3">Tu PIN de acceso es:</p>
            <p className="text-5xl font-black text-blue-600 tracking-[0.5rem] font-mono">{pinFinal}</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-8 w-full max-w-xs">
            <p className="text-sm font-bold text-yellow-800">⚠️ Anota este PIN. No se volverá a mostrar.</p>
          </div>
          <Button onClick={handleIrAlPanel} variant="primary" icon={Bike}>Ir a mi panel</Button>
        </div>
      </AppShell>
    );
  }

  const titulosPasos = { '1': 'Datos Personales', '2': 'Configurar Clase', '3': 'Fechas y Horarios', '4': 'Realizar Pago' };

  return (
    <AppShell header={
      <DashboardHeader 
        title={titulosPasos[step] || 'Inscripción'} 
        onBack={handleBack}
        onLogout={async () => { limpiarSesion(); if (ctx.logoutUser) await ctx.logoutUser(); navigate('/'); }}
        showNotifications={false}
      />
    } footer={
      <div className="bg-white border-t p-4">
        <Button onClick={handleNext} icon={step === '4' ? Check : ArrowRight} disabled={isSubmitting || (step === '3' && !form.horaId) || (step === '4' && lockExpirado)}>
          {isSubmitting ? 'Procesando...' : step === '4' ? 'Confirmar y Enviar Pago' : step === '3' ? 'Continuar a Pago' : step === '2' ? 'Continuar a Horario' : 'Continuar'}
        </Button>
      </div>
    } bgColor="bg-white">
      <div className="px-5 pt-2 pb-1 relative overflow-visible">
        <Stepper currentStep={parseInt(step)} onStepClick={(s) => { if (s < parseInt(step)) setStep(String(s)); }} />
      </div>
      <div className="px-5 pb-4">
        {step === '1' && <Paso1DatosPersonales form={form} updateForm={updateForm} onOpenSalud={() => setMostrarFormularioSalud(true)} onOpenFechaNacimiento={() => { setTempFechaNacimiento({ dia: form.diaNac || '01', mes: form.mesNac || String(new Date().getMonth() + 1).padStart(2, '0'), ano: form.anoNac || String(new Date().getFullYear()) }); setMostrarCalendarioNacimiento(true); }} />}
        {step === '2' && <Paso2Configuracion form={form} updateForm={updateForm} cursos={ctx.cursos} sedes={ctx.sedes} recargoSinBici={ctx.config.recargoSinBici} />}
        {step === '3' && !ctx.fbUser ? (
  <div className="flex-1 flex items-center justify-center"><Spinner message="Verificando sesión..." /></div>
) : step === '3' && (!ctx.instructores?.length || !ctx.motos?.length || !ctx.horarios?.length) ? (
  <div className="flex-1 flex items-center justify-center"><Spinner message="Sincronizando disponibilidad..." /></div>
) : (
  step === '3' && disponibilidad && (
            <Paso3Horario
              form={form} updateForm={updateForm}
              diasDisponibles={disponibilidad.diasDisponibles} bloques={disponibilidad.bloques}
              onSelectHorario={handleSelectHorario} onMostrarCalendario={() => setMostrarCalendario(true)}
              isSelectingHorario={isSelectingHorario} selectingBlockId={selectingBlockId}
              fbUser={ctx.fbUser} lockId={lockId}
              recursosListos={ctx.instructores?.length > 0 && ctx.motos?.length > 0}
              showToast={showToast} cargando={!ctx.instructores?.length || !ctx.motos?.length || !ctx.horarios?.length}
              cursoNombre={(ctx.cursos || []).find(c => String(c.id) === String(form.cursoId))?.nombre || 'Curso'}
              sedeNombre={(ctx.sedes || []).find(s => String(s.id) === String(form.sedeId))?.nombre || 'Sede'}
              tipoMoto={form.tipoMoto}
              traeMoto={form.traeMoto}
            />
          )
        )}
        {step === '4' && <Paso4Pago form={form} updateForm={updateForm} precioFinalVES={precioFinalVES} baseUSD={baseUSD} tasaCobro={tasaCobro} monedaCobroClientes={ctx.config.monedaCobroClientes} config={ctx.config} desglosePrecio={() => [ { label: 'Precio', value: '$' + (ctx.config.precioBase || 0) }, { label: 'Recargo Sede', value: '+$' + (ctx.config.recargoGuarenas || 0) }, { label: 'Recargo sin Bici', value: '+$' + (ctx.config.recargoSinBici || 0) }, { label: 'Descuento Moto', value: '-$' + (ctx.config.descuentoMotoPropia || 0) }, { label: 'Total USD', value: '$' + baseUSD, bold: true } ]} lockId={lockId} step={step} lockTimer={<LockTimerFlotante tiempoRestante={tiempoRestante} renovacionUsada={renovacionUsada} onRenovarLock={handleRenovarLock} />} mostrarDetallesPago={mostrarDetallesPago} onToggleDetalles={() => setMostrarDetallesPago(!mostrarDetallesPago)} captchaA={captchaA} captchaB={captchaB} captchaValue={captchaValue} onCaptchaChange={(e) => setCaptchaValue(e.target.value.replace(/\D/g, '').slice(0, 2))} showToast={showToast} />}
      </div>
      {mostrarCalendario && <CalendarioFlotante ref={calendarioRef} form={form} updateForm={updateForm} diasDisponibles={disponibilidad?.diasDisponibles || []} maxDate={disponibilidad?.maxDate || ''} mesCalendario={mesCalendario} setMesCalendario={setMesCalendario} onClose={() => setMostrarCalendario(false)} showToast={showToast} />}
      {mostrarFormularioSalud && <FormularioSalud form={form} updateForm={updateForm} onClose={() => setMostrarFormularioSalud(false)} />}
      {mostrarCalendarioNacimiento && <CalendarioNacimiento tempFechaNacimiento={tempFechaNacimiento} setTempFechaNacimiento={setTempFechaNacimiento} onConfirm={() => { updateForm({ diaNac: tempFechaNacimiento.dia, mesNac: tempFechaNacimiento.mes, anoNac: tempFechaNacimiento.ano }); setMostrarCalendarioNacimiento(false); }} onClose={() => setMostrarCalendarioNacimiento(false)} />}
      {modalLiberar && <ModalConfirmacion titulo="Liberar horario" mensaje="¿Deseas liberar este horario? Si lo haces, deberás seleccionar otro bloque para continuar." onConfirm={handleLiberarHorario} onCancel={() => setModalLiberar(null)} />}
      {mostrarModalExpiracion && <ModalExpiracion reintentosExpiracion={reintentosExpiracion} maxReintentos={MAX_REINTENTOS_EXPIRACION} onSeleccionarBloque={handleSeleccionarBloqueDesdeExpiracion} onSalirSistema={handleSalirDesdeExpiracion} />}
    </AppShell>
  );
};

export default InscripcionView;
