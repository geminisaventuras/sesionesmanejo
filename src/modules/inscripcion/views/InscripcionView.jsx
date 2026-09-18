// @build: 2026-09-10.00-41-00 | id: FIX-028-PRIORIDAD-INSTRUCTOR-A | backup: InscripcionView.jsx.backup-20260910-004100 | desc: Prioridad determinista in-line para instructor principal

import { useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
import { getDoc, doc, getDocs, collection } from 'firebase/firestore';

import { db } from '../../../firebase';
import { useBloqueosProveedor } from '../../../hooks/useBloqueosProveedor';
import { EmailService } from '../../shared/services/EmailService';
import { ordenarHorarios } from '../../shared/utils/horarios';
import { filtrarLocksDeOtros, eliminarLockLocal } from '../utils/locksHelpers';
import { useOcupacionConfirmada } from '../../../hooks/useOcupacionConfirmada';
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
  form, horarios, instructores, motos, reservasConfirmadas, activeLocks, selectingBlockId, currentUserId, todayStr, lockId, bloqueosProveedor, cursoUnDia, cursoSeleccionado, sedeSeleccionada, bloqueosAdmin
}) => {
  const necesitaMoto = form.traeMoto !== 'Sí';
    const locksDeOtros = (activeLocks || []).filter(l => {
  if (l.userId === currentUserId) return false;
  // Validar estructura mínima del lock (evita locks corruptos)
  if (!l.instructorId || !l.fecha || !l.horaId || !l.expiresAt) {
    console.warn('[Disponibilidad] Descartando lock inválido:', l);
    return false;
  }
  if (l.expiresAt.toMillis() <= Date.now()) return false;
  return true;
});
    // FIX-035: Sin filtro de userId. Las reservas propias también ocupan.
  const reservasDeOtros = reservasConfirmadas || [];
  const isInstructorOcupado = (instructorId, bloqueId, fecha1, fecha2) => {
       const enReserva = reservasDeOtros.some(r => {
      if (r.estadoPago !== 'Pendiente' && r.estadoPago !== 'Aprobado') return false;
      if (r.instructorId !== instructorId) return false;
      if (r.horaId !== bloqueId) return false;            // ← añadir esta línea
          return r.fecha === fecha1 || (fecha2 && r.fecha === fecha2) || r.fecha2 === fecha1 || (fecha2 && r.fecha2 === fecha2);
    });
    if (enReserva) return true;
    const enLock = locksDeOtros.some(lock => {
      if (lock.instructorId !== instructorId) return false;
      if (lock.horaId !== bloqueId) return false;
      return lock.fecha === fecha1 || (fecha2 && lock.fecha === fecha2);    });
    return enLock;
  };
  const isMotoOcupada = (motoId, bloqueId, fecha1, fecha2) => {
        const enReserva = reservasDeOtros.some(r => {
      if (r.estadoPago !== 'Pendiente' && r.estadoPago !== 'Aprobado') return false;
      if (r.motoAsignadaId !== motoId) return false;
      if (r.traeMoto === 'Sí') return false;
      if (r.horaId !== bloqueId) return false;             // ← añadir esta línea
          return r.fecha === fecha1 || (fecha2 && r.fecha === fecha2) || r.fecha2 === fecha1 || (fecha2 && r.fecha2 === fecha2);
    });
    if (enReserva) return true;
    const enLock = locksDeOtros.some(lock => {
      if (lock.motoAsignadaId !== motoId) return false;
      if (lock.horaId !== bloqueId) return false;          // ← añadir esta línea
      return lock.fecha === fecha1 || (fecha2 && lock.fecha === fecha2);    });
    return enLock;
  };

  const fecha2Calc = cursoUnDia
    ? null
    : (form.fecha1 ? (() => {
        const d = new Date(form.fecha1 + 'T12:00:00');
        d.setDate(d.getDate() + 1);
        return d.toISOString().split('T')[0];
      })() : null);
  const calcularBloque = (bloque, fecha1, fecha2) => {
   if (bloque.isLunch) return { ...bloque, disponible: false, reason: 'ALMUERZO', instructorId: null, motoAsignadaId: null };
    const hayBloqueoAdmin = (bloqueosAdmin || []).some(b => {
      if (fecha1 < b.fechaInicio) return false;
      const fin = b.fechaFin || b.fechaInicio;
      if (fecha1 > fin) return false;
      if (b.sedeId && String(b.sedeId) !== String(form.sedeId)) return false;
      if (b.todoElDia) return true;
      return (b.horarios || []).includes(bloque.id);
    });
    if (hayBloqueoAdmin) {
      return { ...bloque, disponible: false, reason: 'BLOQUEO_ADMIN', instructorId: null, motoAsignadaId: null };
    }
      const horariosDeSede = sedeSeleccionada?.horariosHabilitados || [];
    const horariosDelCurso = cursoSeleccionado?.horariosPorSede?.[form.sedeId];
    const horariosPermitidos = (horariosDelCurso !== undefined) ? horariosDelCurso : horariosDeSede;
    if (horariosPermitidos.length > 0 && !horariosPermitidos.includes(bloque.id)) {
      return { ...bloque, disponible: false, reason: 'NO_OFRECIDO', instructorId: null, motoAsignadaId: null };
    }
    
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
    const motosDisponiblesBase = motosDisponibles;
    // Filtrar motos bloqueadas por el proveedor (solo si el estudiante necesita moto)
    if (necesitaMoto && motosDisponibles.length > 0) {
      motosDisponibles = motosDisponibles.filter(m => {
        const bloqueado = (bloqueosProveedor || []).some(b => {
          if (b.motoId !== m.id && b.motoId !== 'ALL') return false;
          if (b.fecha !== fecha1) return false;
          const [hIni, mIni] = (b.horaInicio || '00:00').split(':').map(Number);
          const [hFin, mFin] = (b.horaFin || '23:59').split(':').map(Number);
          const bloqueInicio = hIni * 60 + mIni;
          const bloqueFin = hFin * 60 + mFin;
          const labelParts = bloque.label.match(/(\d+):(\d+)\s*(AM|PM)/i);
          if (!labelParts) return false;
          let hBloque = parseInt(labelParts[1], 10);
          const mBloque = parseInt(labelParts[2], 10);
          const mod = labelParts[3].toUpperCase();
          if (mod === 'PM' && hBloque < 12) hBloque += 12;
          if (mod === 'AM' && hBloque === 12) hBloque = 0;
          const bloqueMinutos = hBloque * 60 + mBloque;
          return bloqueMinutos >= bloqueInicio && bloqueMinutos < bloqueFin;
        });
        return !bloqueado;
      });
    }
    // Si originalmente había motos disponibles y el bloqueo del proveedor las eliminó,
    // recién aquí reportamos BLOQUEO_PROVEEDOR.
    if (necesitaMoto && motosDisponibles.length === 0 && instructoresDisponibles.length > 0 && motosDisponiblesBase.length > 0) {
      return { ...bloque, disponible: false, reason: 'BLOQUEO_PROVEEDOR', instructorId: null, motoAsignadaId: null };
    }

   const instructorSeleccionado = instructoresDisponibles.find(i => i.esPrincipal) || instructoresDisponibles[0];

if (!necesitaMoto) {
  if (instructorSeleccionado)
    return { ...bloque, disponible: true, reason: '', instructorId: instructorSeleccionado.id, motoAsignadaId: null };
} else {
  if (instructorSeleccionado && motosDisponibles.length > 0)
    return { ...bloque, disponible: true, reason: '', instructorId: instructorSeleccionado.id, motoAsignadaId: motosDisponibles[0].id };
}

    const instructoresTotal = (instructores || []).filter(i => i.activo && (i.sedes || []).includes(form.sedeId));
           const motosTotal = (motos || []).filter(m => m.activo && m.tipo === form.tipoMoto && (m.sedes || []).includes(form.sedeId));
    const instructoresLibresSinLocks = instructoresTotal.filter(i => !reservasDeOtros.some(r => r.instructorId === i.id && r.horaId === bloque.id && (r.fecha === fecha1 || (fecha2 && r.fecha === fecha2) || r.fecha2 === fecha1 || (fecha2 && r.fecha2 === fecha2)))).length;    const motosLibresSinLocks = necesitaMoto ? motosTotal.filter(m => !reservasDeOtros.some(r => r.motoAsignadaId === m.id && r.traeMoto !== 'Sí' && r.horaId === bloque.id && (r.fecha === fecha1 || (fecha2 && r.fecha === fecha2) || r.fecha2 === fecha1 || (fecha2 && r.fecha2 === fecha2)))).length : 999; if (!necesitaMoto) {
      if (instructoresLibresSinLocks === 0) return { ...bloque, disponible: false, reason: 'RESERVADO', instructorId: null, motoAsignadaId: null };
            console.log('🔍 [DEBUG EN_ESPERA_PAGO]', {
        bloqueId: bloque?.id,
        fecha1,
        fecha2,
        instructoresLibresSinLocks,
        motosLibresSinLocks,
        reservasConfirmadas,
        locksDeOtros,
      });
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
            const fecha2Candidate = cursoUnDia
        ? null
        : (() => {
            const d2 = new Date(cursor);
            d2.setDate(d2.getDate() + 1);
            return d2.toISOString().split('T')[0];
          })();
      const hayAlguno = (horarios || []).filter(h => h.activo && !h.isLunch).some(bloque => {
        const info = calcularBloque(bloque, fechaStr, fecha2Candidate);
        return info.disponible;
      });
      diasDisponibles.push({ fecha: fechaStr, disponible: hayAlguno });
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  const bloques = ordenarHorarios((horarios || []).filter(h => h.activo)).map(b => calcularBloque(b, form.fecha1, fecha2Calc));

  return { diasDisponibles, bloques, fecha2Calc, maxDate };
};

// ─── Componente ─────────────────────────────────────────
export const InscripcionView = () => {
  
const ctx = useContext(AppContext);
const { showToast } = useToast();
const {
    step, setStep,
    form, updateForm,
 lockId, updateLockId,
    lockExpiresAt, updateLockExpiresAt,
    limpiarSesion, resetForm
  } = useInscripcionState();

  // Cálculos derivados ANTES del hook
  const cursoSeleccionado = (ctx.cursos || []).find(c => String(c.id) === String(form.cursoId));
  const cursoUnDia = (cursoSeleccionado?.duracionTotal || 240) <= 120;
  const fecha2Calc = useMemo(() => {
    if (!form.fecha1 || cursoUnDia) return null;
    const d = new Date(form.fecha1 + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, [form.fecha1, cursoUnDia]);

  // Hook con fecha2 correcta
  const { ocupacion: ocupacionConfirmada } = useOcupacionConfirmada({ 
    fecha: form.fecha1,
    fecha2: fecha2Calc,
    limitDocs: 100 
  });

  const navigate = useNavigate();
    const location = useLocation();
      const esRecompra = location.state?.esRecompra && location.state?.modo === 'nueva';
      
  const recompraInicializadaRef = useRef(false);
    const publicoInicializadoRef = useRef(false);
  const [inicializandoRecompra, setInicializandoRecompra] = useState(esRecompra);
  


  useEffect(() => {
    if (publicoInicializadoRef.current) return;

    const state = location.state || {};
    if (state.origen !== 'publico' || !state.cursoSugerido || !state.cursoId) return;

    publicoInicializadoRef.current = true;

    limpiarSesion();
    resetForm();

    updateForm({
      cursoId: state.cursoId,
      cursoSugeridoActivo: true,
      cursoSeleccionadoManual: false,
      origenPublico: true
    });

    setStep('1');
  }, [location.state, limpiarSesion, resetForm, updateForm, setStep]);

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
    const [bloqueosAdmin, setBloqueosAdmin] = useState([]);
    const fechaAnteriorRef = useRef(form.fecha1);
     const limpiarLockPropioOptimista = useCallback((lockId) => {
    if (!lockId) return;
    setActiveLocks(prev => eliminarLockLocal(prev, lockId));
  }, []);
  const calendarioRef = useRef(null);
  const generatedPinRef = useRef(null);
  const [generatedPin, setGeneratedPin] = useState(() => {
    return sessionStorage.getItem('inscripcion_generatedPin') || null;
  });

  const [mostrarPantallaExito, setMostrarPantallaExito] = useState(false);
  const [pinFinal, setPinFinal] = useState(null);
    const [terminosAceptados, setTerminosAceptados] = useState(false);
  const [mostrarTerminos, setMostrarTerminos] = useState(false);

  const [clockTick, setClockTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setClockTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

        useEffect(() => {
    const state = location.state || {};
    if (!ctx.fbUser || !state.esRecompra || state.modo !== 'nueva') return;
    if (recompraInicializadaRef.current) return;
    recompraInicializadaRef.current = true;

     const iniciarRecompra = async () => {
      setInicializandoRecompra(true);
      limpiarSesion();
      resetForm();
      try {
        const resultado = await ReservaService.obtenerReservasAprobadas(ctx.fbUser.uid);
        if (!resultado.success || !resultado.data || resultado.data.length === 0) {
          showToast('No se encontraron reservas aprobadas para recompra', 'error');
          navigate('/portal-reservas');
          return;
        }

        const reservasAprobadas = resultado.data;
        const r = reservasAprobadas[0];

        const cursoRecompra = (ctx.cursos || []).find(c => String(c.id) === String(state.cursoId));
        if (!cursoRecompra) {
          showToast('Curso no encontrado', 'error');
          navigate('/portal-reservas');
          return;
        }

        let tipoMoto = '';

        if (cursoRecompra.tipoCurso === 'general') {
          const ultimoBasico = reservasAprobadas
            .filter(r => r.tipoCurso === 'basico_auto' || r.tipoCurso === 'basico_sincro')
            .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))[0];

          if (!ultimoBasico) {
            showToast('Debes aprobar un curso básico antes de inscribirte en Práctica en la Vía', 'error');
            navigate('/portal-reservas');
            return;
          }

          tipoMoto = ultimoBasico.tipoCurso === 'basico_auto' ? 'Automática' : 'Sincrónica';
        } else if (cursoRecompra.tipoCurso === 'motero') {
          const ultimoGeneral = reservasAprobadas
            .filter(r => r.tipoCurso === 'general')
            .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))[0];

          if (!ultimoGeneral) {
            showToast('Debes aprobar Práctica en la Vía antes de inscribirte en Curso Motero', 'error');
            navigate('/portal-reservas');
            return;
          }

          tipoMoto = ultimoGeneral.tipoMoto || 'Automática';
        } else if (cursoRecompra.tipoCurso === 'basico_sincro') {
          tipoMoto = 'Sincrónica';
        } else {
          tipoMoto = 'Automática';
        }

        updateForm({
          nombre: r.nombre || '',
          apellido: r.apellido || '',
          cedula: r.cedula || '',
          correo: r.correo || ctx.fbUser.email || '',
          telefono: r.telefono || '',
          contactoEmergencia: r.contactoEmergencia || '',
          diaNac: r.fechaNacimiento ? String(Number(r.fechaNacimiento.split('-')[2]) || '') : '',
          mesNac: r.fechaNacimiento ? String(Number(r.fechaNacimiento.split('-')[1]) || '') : '',
          anoNac: r.fechaNacimiento ? String(Number(r.fechaNacimiento.split('-')[0]) || '') : '',
          sexo: r.sexo || '',
          estado: r.estado || '',
          zona: r.zona || '',
          sabeBicicleta: 'Sí',
          traeMoto: r.traeMoto || 'No',
          cursoId: state.cursoId || '',
          tipoCurso: cursoRecompra.tipoCurso || null,
          tipoMoto,
          sedeId: '',
          horaId: '',
          fecha1: '',
          fecha2: '',
          pagoBanco: '',
          pagoTelefono: '',
          pagoCedula: '',
          pagoRef: '',
          condicionMedica: r.condicionMedica || '',
          detalleCondicion: r.detalleCondicion || '',
          esRecompra: true
        });

        setStep('2');
      } catch (error) {
        showToast('Error al preparar la inscripción', 'error');
        navigate('/portal-reservas');
      } finally {
        setInicializandoRecompra(false);
      }
    };

    

    iniciarRecompra();
}, [ctx.fbUser, location.state, navigate, limpiarSesion, resetForm, setStep, showToast, updateForm, ctx.cursos]);
  useEffect(() => { if (generatedPin) generatedPinRef.current = generatedPin; }, [generatedPin]);
    useEffect(() => {
    if (!ctx.authReady || !ctx.fbUser || esRecompra) return;

    const pinSession = sessionStorage.getItem('inscripcion_generatedPin');
    if (pinSession) {
      if (!generatedPinRef.current) generatedPinRef.current = pinSession;
      if (!generatedPin) setGeneratedPin(pinSession);
      return;
    }

    if (generatedPinRef.current || generatedPin) return;

    const correoBusqueda = form.correo || ctx.fbUser?.email;
    if (!correoBusqueda) return;

    let activo = true;

    const restaurarProgreso = async () => {
      try {
        const progreso = await ReservaService.buscarProgresoPorCorreo(correoBusqueda);

        if (!activo) return;

        if (!progreso.success || !progreso.data) return;

        const cedulaGuardada = progreso.data.cedula || progreso.data.datosFormulario?.cedula;
        const cedulaIngresada = form.cedula;

             if (cedulaIngresada && cedulaGuardada && cedulaIngresada !== cedulaGuardada) {
          console.error('[Seguridad] Cédula no coincide:', {
            ingresada: cedulaIngresada,
            guardada: cedulaGuardada
          });

          showToast(
            'La cédula no coincide con la registrada. No puedes continuar.',
            'error'
          );

          if (ctx.logoutUser) await ctx.logoutUser();

          return;
        }

        const pinGuardado = progreso.data.pin || progreso.data.datosFormulario?.pin;

        if (pinGuardado) {
          generatedPinRef.current = pinGuardado;
          setGeneratedPin(pinGuardado);
          sessionStorage.setItem('inscripcion_generatedPin', pinGuardado);
          updateForm({ pin: pinGuardado });
        }

        if (progreso.data.datosFormulario) {
          updateForm(progreso.data.datosFormulario);
        }
      } catch (error) {
        console.error('[PIN] Error restaurando progreso:', error);
      }
    };

    restaurarProgreso();

    return () => {
      activo = false;
    };
  }, [ctx.authReady, ctx.fbUser, esRecompra, form.correo, form.cedula, navigate, showToast, ctx.logoutUser, updateForm, generatedPin]);
useEffect(() => {
  if (!ctx.fbUser) return;
  const fechaAEscuchar = form.fecha1 || ctx.getTodayStr();
  const cleanup = LockService.escucharOcupacionTemporal(fechaAEscuchar, (locks) => {
    setActiveLocks(locks);
  });
  return () => cleanup();
}, [form.fecha1, ctx.fbUser, ctx.getTodayStr]);

useEffect(() => {
  if (step !== '3' || !ctx.fbUser) return;
  let activo = true;
  const cargar = async () => {
    try {
      const snap = await getDocs(collection(db, 'bloqueosAdmin'));
      if (activo) setBloqueosAdmin(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error('[InscripcionView] Error cargando bloqueosAdmin:', error);
      if (activo) setBloqueosAdmin([]);
    }
  };
  cargar();
  return () => { activo = false; };
}, [step, ctx.fbUser, form.fecha1]);

 

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
    const fechaActual = form.fecha1;
    if (fechaAnteriorRef.current === fechaActual) return;
    const fechaAnterior = fechaAnteriorRef.current;
    fechaAnteriorRef.current = fechaActual;

    if (fechaAnterior && lockId && form.horaId && step !== '4') {
      LockService.liberarLock(lockId).catch(() => {});
      limpiarLockPropioOptimista(lockId);
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

  // FIX-035: Redirección temprana si el usuario tiene reserva activa y no es recompra
  useEffect(() => {
    if (!ctx.fbUser || !ctx.authReady) return;
    if (location.state?.esRecompra) return;

    let activo = true;
    const verificar = async () => {
      try {
        const resultado = await ReservaService.obtenerReservasPorUsuario(ctx.fbUser.uid);
        if (!activo) return;
        const reservas = resultado.data || [];
        const tieneActiva = reservas.some(r =>
          (r.estadoPago === 'Pendiente' || r.estadoPago === 'Aprobado') &&
          r.estadoCurso !== 'Aprobado'
        );
        if (tieneActiva) {
          showToast('Ya tienes una reserva activa. Gestiona tus cursos desde el portal.', 'info');
          navigate('/portal-reservas', { replace: true });
        }
      } catch (error) {
        console.error('[InscripcionView] Error verificando reserva activa:', error);
      }
    };
    verificar();
    return () => { activo = false; };
  }, [ctx.fbUser, ctx.authReady, location.state, navigate, showToast]);

  // ─── Cálculo de disponibilidad ────────────────────────
      const todayStr = ctx.getTodayStr();
  const bloqueosProveedor = useBloqueosProveedor(form.fecha1, step === '3');
  const sedeSeleccionada = (ctx.sedes || []).find(s => String(s.id) === String(form.sedeId));

 
const disponibilidad = useMemo(() => {
  if (!ctx.instructores?.length || !ctx.motos?.length || !ctx.horarios?.length) return null;
 return evaluarDisponibilidad({
    form, horarios: ctx.horarios, instructores: ctx.instructores, motos: ctx.motos,
    reservasConfirmadas: ocupacionConfirmada, activeLocks: activeLocks || [], selectingBlockId,
    currentUserId: ctx.fbUser?.uid, todayStr, lockId, bloqueosProveedor, cursoUnDia, cursoSeleccionado, sedeSeleccionada, bloqueosAdmin
  });
}, [form, ctx.horarios, ctx.instructores, ctx.motos, ocupacionConfirmada, activeLocks, selectingBlockId, ctx.fbUser?.uid, todayStr, lockId, clockTick, bloqueosProveedor, cursoUnDia, cursoSeleccionado, sedeSeleccionada, bloqueosAdmin]);
  useEffect(() => {
    if (step === '3' && !form.fecha1 && disponibilidad?.diasDisponibles?.length > 0) {
      const primerDiaLibre = disponibilidad.diasDisponibles.find(dia => dia.disponible);
      updateForm({ fecha1: primerDiaLibre ? primerDiaLibre.fecha : todayStr });
    }
  }, [step, form.fecha1, disponibilidad, updateForm, todayStr]);

    
  const baseUSD = ctx.calcularBaseUSD(form.sedeId, form.sabeBicicleta, form.traeMoto, cursoSeleccionado);
  const precioBaseMostrar = cursoSeleccionado?.precioBase ?? ctx.config.precioBase ?? 0;
    const sedeActual = (ctx.sedes || []).find(s => String(s.id) === String(form.sedeId));
  const recargoSede = sedeActual?.nombre === 'Guarenas' ? (Number(ctx.config.recargoGuarenas) || 0) : 0;
  const recargoSinBici = form.sabeBicicleta === 'No' ? (Number(ctx.config.recargoSinBici) || 0) : 0;
  const descuentoMotoPropia = form.traeMoto === 'Sí' ? (Number(ctx.config.descuentoMotoPropia) || 0) : 0;
  const descuentoPromo = Number(ctx.config.descuentoPromo) || 0;
   const recargoAlquilerMoto = (form.traeMoto !== 'Sí' && cursoSeleccionado?.motoIncluida !== false)
    ? (Number(cursoSeleccionado?.precioAlquilerMoto) || 0)
    : 0;
    const tasaCobro = ctx.config.monedaCobroClientes === 'USD' ? ctx.config.tasaUSD : ctx.config.tasaEUR;
  const precioFinalVES = (baseUSD * (Number(tasaCobro) || 1)).toFixed(2);
  const fechaNacimiento = (form.diaNac && form.mesNac && form.anoNac) ? form.anoNac + '-' + String(form.mesNac).padStart(2,'0') + '-' + String(form.diaNac).padStart(2,'0') : '';

    const handleConfirmarPago = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) { showToast('Error: Sesión no encontrada. Recarga la página.', 'error'); return; }
    if (!lockId) { showToast('Error: No se encontró el bloqueo del horario.', 'error'); return; }
    setIsSubmitting(true);

    // ✅ PASO 1: Capturar PIN INMEDIATAMENTE (antes de cualquier operación)
    let pinParaMostrar = generatedPinRef.current || generatedPin || form.pin || null;

    console.log('[handleConfirmarPago] PIN capturado inicialmente:', pinParaMostrar ? 'SÍ' : 'NO');

    // ✅ PASO 2: Fallback a Firestore si no hay PIN en memoria
    if (!pinParaMostrar) {
      console.warn('[PIN] No disponible en memoria, buscando en Firestore...');
      try {
        const progreso = await ReservaService.buscarProgresoPorCorreo(form.correo);
        if (progreso.success && progreso.data) {
          pinParaMostrar = progreso.data.pin || progreso.data.datosFormulario?.pin || null;
          if (pinParaMostrar) {
            console.log('[PIN] Recuperado desde Firestore');
            // Actualizar refs y estado local
            generatedPinRef.current = pinParaMostrar;
            setGeneratedPin(pinParaMostrar);
            updateForm({ pin: pinParaMostrar });
          }
        }
      } catch (error) {
        console.error('[PIN] Error recuperando desde Firestore:', error);
      }
    }

    // ✅ PASO 3: Validación crítica
    if (!pinParaMostrar) {
      console.error('🚨 [PIN] CRÍTICO: No se pudo recuperar el PIN');
      showToast(
        'Tu registro se completará, pero contacta a soporte para recuperar tu PIN.',
        'warning'
      );
    }

    // ✅ PASO 4: Crear reserva incluyendo el PIN
    const { esRecompra: _esRecompra, ...formLimpio } = form;
    const result = await ReservaService.crearReserva({
      ...formLimpio,
      userId: uid,
      fecha: form.fecha1,
      fecha2: disponibilidad?.fecha2Calc || null,
      fechaNacimiento,
      pagoTotalMoneda: baseUSD,
      pagoTotalVES: parseFloat(precioFinalVES),
      proveedorId: form.proveedorId || null,
      tipoCurso: cursoSeleccionado?.tipoCurso || null,
      terminosAceptados: true,
      fechaAceptacionTerminos: new Date().toISOString(),
      pin: pinParaMostrar,
           comisionInstructor: typeof cursoSeleccionado?.comisionInstructor === 'number' ? cursoSeleccionado.comisionInstructor : 0,
      comisionProveedor: (() => {
        const mapa = cursoSeleccionado?.comisionProveedorPorSede || {};
        const sedeId = form.sedeId;
        if (sedeId && typeof mapa[sedeId] === 'number') return mapa[sedeId];
        return typeof cursoSeleccionado?.comisionProveedor === 'number' ? cursoSeleccionado.comisionProveedor : 0;
      })()
      
    }, lockId);

    setIsSubmitting(false);

    if (result.success) {
      if (esRecompra) {
        showToast('Reserva creada correctamente', 'success');
        limpiarSesion();
        navigate('/portal-reservas');
        return;
      }

      // ✅ PASO 5: Limpiar progreso (el PIN ya está capturado)
      await ReservaService.limpiarProgreso(form.correo).catch(() => {});

            // Enviar correo de bienvenida con PIN (fire-and-forget)
      if (form.correo && form.nombre && form.apellido && pinParaMostrar) {
        EmailService.enviarCorreoBienvenida({
          correo: form.correo,
          nombre: form.nombre,
          apellido: form.apellido,
          pin: pinParaMostrar,
        }).catch((error) => {
          console.warn('[InscripcionView] Error enviando correo de bienvenida:', error);
        });
      } else {
        console.warn('[InscripcionView] No se envió correo de bienvenida: faltan datos del estudiante');
      }

      // ✅ PASO 6: Limpiar sesión
      limpiarSesion();

      // ✅ PASO 7: Mostrar pantalla de éxito con PIN capturado
      setPinFinal(pinParaMostrar);
      setMostrarPantallaExito(true);

      console.log('[handleConfirmarPago] Pantalla de éxito mostrada con PIN:', pinParaMostrar ? 'SÍ' : 'NO');
    } else {
      const codigo = result.error?.code;
      if (codigo === 'invalid-data') {
        showToast(result.error.message || 'Datos inválidos', 'error');
      } else {
        showToast(result.error.message || 'Error al crear la reserva', 'error');
      }
    }
  }, [lockId, form, disponibilidad, fechaNacimiento, baseUSD, precioFinalVES, limpiarSesion, showToast, generatedPin, esRecompra, navigate, updateForm]);
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

        const locksDeOtros = (activeLocks || []).filter(l => {
      if (l.userId === ctx.fbUser?.uid) return false;
      if (!l.instructorId || !l.fecha || !l.horaId || !l.expiresAt) return false;
      if (l.expiresAt.toMillis() <= Date.now()) return false;
      return true;
    });


        console.log('🔍 [DEBUG LOCKS COMPLETOS]', JSON.stringify(activeLocks || [], null, 2));
                // FIX-035: Sin filtro de userId. Las reservas propias también ocupan.
        const reservasDeOtros = ocupacionConfirmada || [];
    console.log('🔍 [DEBUG userIds]', {
      currentUserId: ctx?.fbUser?.uid,
      activeLocks: (activeLocks || []).map(l => ({ id: l.id, userId: l.userId, instructorId: l.instructorId, fecha: l.fecha, horaId: l.horaId })),
    });
        console.log('🔍 [DEBUG handleSelectHorario]', {
      bloqueId: bloque?.id,
      form_horaId: form?.horaId,
      lockId,
      activeLocks,
      locksDeOtros,
      fecha1: form?.fecha1,
      fecha2Calc: disponibilidad?.fecha2Calc,
      ocupacionConfirmada: ocupacionConfirmada,
    });
    const necesitaMoto = form.traeMoto !== 'Sí';
   const instructoresLibres = (ctx.instructores || [])
  .filter(i => i.activo && (i.sedes || []).includes(form.sedeId))
  .filter(i => !locksDeOtros.some(lock => lock.instructorId === i.id && lock.horaId === bloque.id && (lock.fecha === form.fecha1 || (disponibilidad?.fecha2Calc && lock.fecha === disponibilidad.fecha2Calc))))  .filter(i => !reservasDeOtros.some(r => {
    if (r.estadoPago !== 'Pendiente' && r.estadoPago !== 'Aprobado') return false;
    if (r.instructorId !== i.id) return false;
    if (String(r.horaId) !== String(bloque.id)) return false;
    return r.fecha === form.fecha1 || (disponibilidad?.fecha2Calc && r.fecha === disponibilidad.fecha2Calc) || r.fecha2 === form.fecha1 || (disponibilidad?.fecha2Calc && r.fecha2 === disponibilidad.fecha2Calc);  }));
   let motosLibres = [];
if (necesitaMoto) {
  motosLibres = (ctx.motos || [])
    .filter(m => m.activo && m.tipo === form.tipoMoto && (m.sedes || []).includes(form.sedeId))
    .filter(m => !locksDeOtros.some(lock => lock.motoAsignadaId === m.id && lock.horaId === bloque.id && (lock.fecha === form.fecha1 || (disponibilidad?.fecha2Calc && lock.fecha === disponibilidad.fecha2Calc))))    .filter(m => !reservasDeOtros.some(r => {
      if (r.estadoPago !== 'Pendiente' && r.estadoPago !== 'Aprobado') return false;
      if (r.motoAsignadaId !== m.id) return false;
      if (r.traeMoto === 'Sí') return false;
      if (String(r.horaId) !== String(bloque.id)) return false;
      return r.fecha === form.fecha1 || (disponibilidad?.fecha2Calc && r.fecha === disponibilidad.fecha2Calc) || r.fecha2 === form.fecha1 || (disponibilidad?.fecha2Calc && r.fecha2 === disponibilidad.fecha2Calc);    }));
}

    const instructorId = instructoresLibres.find(i => i.esPrincipal)?.id || instructoresLibres[0]?.id;
    const motoAsignadaId = necesitaMoto ? motosLibres[0]?.id : null;
    if (!instructorId || (necesitaMoto && !motoAsignadaId)) {
      showToast('Este bloque acaba de quedarse sin recursos. Por favor, selecciona otro.', 'error');
      return;
    }

    setIsSelectingHorario(true); setSelectingBlockId(bloque.id);
        if (lockId && !renovacionUsada) {
      await LockService.liberarLock(lockId).catch(() => {});
      limpiarLockPropioOptimista(lockId);
    }
    const nuevoLockId = form.fecha1 + '_' + bloque.id + '_' + instructorId + '_' + (motoAsignadaId || 'sinmoto');
    const result = await LockService.crearLock(nuevoLockId, ctx.fbUser.uid, {
      fecha: form.fecha1, horaId: bloque.id, instructorId, motoAsignadaId
    });
    if (result.success) {
      updateLockId(nuevoLockId);
      const motoSeleccionada = (motosLibres || []).find(m => String(m.id) === String(motoAsignadaId)) || null;
      const proveedorId = motoSeleccionada?.proveedorId || null;
      updateForm({ horaId: bloque.id, instructorId, motoAsignadaId, proveedorId });      updateLockExpiresAt(Date.now() + LOCK_DURATION - 10000);
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
    const result = await LockService.renovarLock(lockId);    if (result.success) {
      updateLockExpiresAt(Date.now() + LOCK_DURATION - 10000);
      showToast('Tiempo renovado. Tienes 10 minutos adicionales.', 'success');
    } else showToast(result.error.message || 'No se pudo renovar el tiempo', 'error');
  }, [lockId, renovacionUsada, updateLockExpiresAt, showToast]);

  const handleLiberarHorario = useCallback(async () => {
    if (!lockId) { setModalLiberar(null); return; }
    try {
            await LockService.liberarLock(lockId);
      limpiarLockPropioOptimista(lockId);
      updateLockId(null); updateLockExpiresAt(null); setTiempoRestante(null);
      updateForm({ horaId: '' }); setRenovacionUsada(false);
      showToast('Horario liberado. Puedes seleccionar otro.', 'success');
    } catch (error) { showToast('Error al liberar el horario', 'error'); }
    setModalLiberar(null);
  }, [lockId, updateLockId, updateLockExpiresAt, updateForm, showToast]);

  const handleSeleccionarBloqueDesdeExpiracion = useCallback(async () => {
    const nuevoReintentos = reintentosExpiracion + 1;
    setReintentosExpiracion(nuevoReintentos);
       if (lockId) {
      await LockService.liberarLock(lockId).catch(() => {});
      limpiarLockPropioOptimista(lockId);
    }
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

      // FIX-034: Si hay sesión activa, forzar correo del usuario autenticado
      if (ctx.fbUser && form.correo !== ctx.fbUser.email) {
        console.warn('[InscripcionView] Correo no coincide con sesión. Forzando.');
        updateForm({ correo: ctx.fbUser.email });
        showToast('El correo se ajustó a tu cuenta registrada', 'info');
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
                    updateForm({ pin });
          const uid = result.data.user?.uid || auth.currentUser?.uid;
          await ReservaService.guardarProgreso(uid, 2, { ...form, pin }, form.correo).catch(() => {});
          setStep('2');
                } else if (result.error.code === 'already-enrolled' || result.error.code === 'auth/email-already-in-use') {
          // El correo ya existe → buscar progreso en Firestore (reinscripción)
          const progreso = await ReservaService.buscarProgresoPorCorreo(form.correo);
          if (progreso.success && progreso.data) {
            const { pin: pinGuardado, paso: pasoGuardado, datosFormulario } = progreso.data;
            const loginResult = await AuthService.loginEstudiante(form.correo, pinGuardado);
            if (loginResult.success) {
              const uid = loginResult.data?.user?.uid || auth.currentUser?.uid;
              
              // Verificar si el usuario ya completó una reserva (caso "graduado")
              const reservaCheck = await ReservaService.obtenerReservaPorUsuario(uid);
              if (reservaCheck.success && reservaCheck.data) {
                showToast('Ya completaste tu inscripción. Ingresa desde el Portal.', 'info');
                setIsSubmitting(false);
                navigate('/login?tab=estudiante');
                return;
              }
              
              // CASO ABANDONADO: restaurar PIN en estado local
              generatedPinRef.current = pinGuardado;
              setGeneratedPin(pinGuardado);
              sessionStorage.setItem('inscripcion_generatedPin', pinGuardado);
                            updateForm({ pin: pinGuardado });
              if (datosFormulario && Object.keys(datosFormulario).length > 0) {
                const cedulaIngresada = form.cedula;
                const cedulaGuardada = datosFormulario.cedula;
                  if (cedulaIngresada !== cedulaGuardada) {
                  showToast('La cédula no coincide con la registrada. No puedes continuar.', 'error');
                  setIsSubmitting(false);
                  // Cerrar sesión para forzar re-verificación en el siguiente intento
                  await AuthService.logout();
                  return;
                }
                updateForm(datosFormulario);
              }
              
              showToast('Sesión recuperada. Continuando donde la dejaste...', 'success');
              setStep(String(pasoGuardado || 2));
              setIsSubmitting(false);
              return;
            } else {
              showToast('Tu correo ya está registrado pero el PIN no coincide. Contacta al administrador.', 'error');
            }
          } else {
            showToast('Este correo ya está registrado. Si olvidaste tu PIN, contacta al administrador.', 'error');
          }
          setIsSubmitting(false);
          return;
        } else if (result.error.code === 'duplicate-cedula') {
          showToast('Esta cédula ya está registrada', 'error');
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
            if (!esRecompra) await ReservaService.guardarProgreso(ctx.fbUser?.uid, 3, form, form.correo).catch(() => {});
      setStep('3');
      return;
    }
    if (step === '3') {
      if (!form.horaId || !lockId) { showToast('Selecciona un horario', 'error'); return; }
      await LockService.renovarLock(lockId).catch(() => {});      updateLockExpiresAt(Date.now() + LOCK_DURATION - 10000);
      setLockExpirado(false); setRenovacionUsada(false);
      if (!esRecompra) await ReservaService.guardarProgreso(ctx.fbUser?.uid, 4, form, form.correo).catch(() => {});      setStep('4');
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
      // Validar aceptación de términos
      if (!terminosAceptados) {
        showToast('Debes aceptar los Términos y Condiciones para continuar', 'error');
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
    if (step === '2' && esRecompra) {
      limpiarSesion();
      
      navigate('/portal-reservas');
      return;
    }
    if (step === '2') setStep('1');
    else if (step === '3') setStep('2');
    else if (step === '4') setStep('3');
    else navigate('/');
  };

  if (!ctx.authReady) return <Spinner message="Cargando..." />;
    if (esRecompra && inicializandoRecompra) {
    return (
      <AppShell bgColor="bg-white">
        <div className="flex items-center justify-center min-h-full">
          <Spinner message="Preparando inscripción..." />
        </div>
      </AppShell>
    );
  }

  if (mostrarPantallaExito) {
    return (
      <AppShell header={<DashboardHeader title="Inscripción Completada" showNotifications={false} />} bgColor="bg-white">
        <div className="flex flex-col items-center justify-center min-h-full p-6 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6"><Award size={48} className="text-green-600" /></div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">¡Inscripción Completada!</h2>
          <p className="text-sm text-gray-500 mb-8">Bienvenido a MotoEscuela. Guarda tu PIN de acceso.</p>
                    {pinFinal ? (
            <>
              <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-6 mb-8 w-full max-w-xs">
                <p className="text-sm text-gray-600 mb-3">Tu PIN de acceso es:</p>
                <p className="text-5xl font-black text-blue-600 tracking-[0.5rem] font-mono">{pinFinal}</p>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-8 w-full max-w-xs">
                <p className="text-sm font-bold text-yellow-800">⚠️ Anota este PIN. No se volverá a mostrar.</p>
              </div>
            </>
          ) : (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-8 w-full max-w-xs">
              <p className="text-sm font-bold text-orange-800 mb-2">
                No se pudo mostrar tu PIN automáticamente.
              </p>
              <p className="text-xs text-orange-700">
                Tu inscripción fue exitosa. Contacta a soporte para recuperar tu PIN.
              </p>
            </div>
          )}
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
                {step === '1' && <Paso1DatosPersonales form={form} updateForm={updateForm} fbUser={ctx.fbUser} onOpenSalud={() => setMostrarFormularioSalud(true)} onOpenFechaNacimiento={() => { setTempFechaNacimiento({ dia: form.diaNac || '01', mes: form.mesNac || String(new Date().getMonth() + 1).padStart(2, '0'), ano: form.anoNac || String(new Date().getFullYear()) }); setMostrarCalendarioNacimiento(true); }} />}
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
        {step === '4' && <Paso4Pago form={form} updateForm={updateForm} precioFinalVES={precioFinalVES} baseUSD={baseUSD} precioCurso={precioBaseMostrar} tasaCobro={tasaCobro} monedaCobroClientes={ctx.config.monedaCobroClientes} config={ctx.config} desglosePrecio={() => {
  const items = [
    { label: 'Precio', value: '$' + (precioBaseMostrar || 0) }
  ];
  if (recargoSede > 0) items.push({ label: 'Recargo Sede', value: '+$' + recargoSede });
  if (recargoSinBici > 0) items.push({ label: 'Recargo sin Bici', value: '+$' + recargoSinBici });
   if (recargoAlquilerMoto > 0) items.push({ label: 'Alquiler Moto', value: '+$' + recargoAlquilerMoto });
  if (descuentoMotoPropia > 0) items.push({ label: 'Descuento Moto', value: '-$' + descuentoMotoPropia });
  if (descuentoPromo > 0) items.push({ label: 'Descuento Promo', value: '-$' + descuentoPromo });
  items.push({ label: 'Total USD', value: '$' + baseUSD, bold: true });
  return items;
}} lockId={lockId} step={step} lockTimer={<LockTimerFlotante tiempoRestante={tiempoRestante} renovacionUsada={renovacionUsada} onRenovarLock={handleRenovarLock} />} mostrarDetallesPago={mostrarDetallesPago} onToggleDetalles={() => setMostrarDetallesPago(!mostrarDetallesPago)} captchaA={captchaA} captchaB={captchaB} captchaValue={captchaValue} onCaptchaChange={(e) => setCaptchaValue(e.target.value.replace(/\D/g, '').slice(0, 2))} showToast={showToast} terminosAceptados={terminosAceptados} onToggleTerminos={() => setTerminosAceptados(!terminosAceptados)} onVerTerminos={() => setMostrarTerminos(true)} mostrarTerminos={mostrarTerminos} onCerrarTerminos={() => setMostrarTerminos(false)} />}
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
