// @build: 2026-09-10.00-41-00 | id: FIX-028-PRIORIDAD-INSTRUCTOR-A | backup: InscripcionView.jsx.backup-20260910-004100 | desc: Prioridad determinista in-line para instructor principal

import { useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppContext } from '../../../context/AppContextValue';
import { auth } from '../../../firebase';
import { ReservaService } from '../../../services/ReservaService';
import { LockService } from '../../../services/LockService';
import { AuthService } from '../../../services/AuthService';
import UsuarioService from '../../shared/services/UsuarioService';
import ModalConfirmacion from '../../shared/components/ModalConfirmacion';
import { Button, Spinner } from '../../../components/UI';
import { useToast } from '../../shared/components/ToastProvider';
import AppShell from '../../shared/components/AppShell';
import DashboardHeader from '../../shared/components/DashboardHeader';
import { useInscripcionState } from '../hooks/useInscripcionState';
import { Paso1DatosPersonales } from '../components/Paso1DatosPersonales';
import { Paso2Configuracion } from '../components/Paso2Configuracion';
import { Paso2Pack } from '../components/Paso2Pack';
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



import { useBloqueosProveedor } from '../../../hooks/useBloqueosProveedor';
import { useBloqueosAdmin } from '../../../hooks/useBloqueosAdmin';
import { useBloqueosInstructor } from '../../../hooks/useBloqueosInstructor';
import { afectaFechaAdmin, afectaHorarioAdmin, afectaProveedor, afectaInstructor } from '../../shared/utils/bloqueosHelpers';
import { calcularNecesitaMoto, puedeCalcularDisponibilidad } from '../../shared/utils/motoHelpers';
import { EmailService } from '../../shared/services/EmailService';
import { ordenarHorarios } from '../../shared/utils/horarios';
import { filtrarLocksDeOtros, eliminarLockLocal } from '../utils/locksHelpers';
import { getHoraIdOcupacion } from '../../shared/utils/reservaHelpers';
import { cumplePrerequisito } from '../../../constants/cursoSecuencia';
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

// ─── SSOT-BLOQUEOS: helpers de invalidación de lock ─────
// LOCK-INVALIDATION-SSOT-V1: contexto que invalida el lock si cambia.
const LOCK_CONTEXT_KEY = 'inscripcion_lock_context';

const serializeTraeMotoPorCurso = (obj) => {
  if (!obj || typeof obj !== 'object') return '{}';
  const sortedKeys = Object.keys(obj).sort();
  const sorted = {};
  sortedKeys.forEach(k => { sorted[k] = obj[k]; });
  return JSON.stringify(sorted);
};

const capturarContextoLock = (form, esPack, packId) => ({
  fecha1: form.fecha1 || '',
  sedeId: form.sedeId || '',
  cursoId: form.cursoId || '',
  tipoMoto: form.tipoMoto || '',
  traeMoto: form.traeMoto || '',
  packId: esPack ? (packId || null) : null,
  traeMotoPorCursoSerializado: serializeTraeMotoPorCurso(form.traeMotoPorCurso),
});

// ─── Función pura de disponibilidad ─────────────────────
const evaluarDisponibilidad = ({
  form, horarios, instructores, motos, reservasConfirmadas, activeLocks, selectingBlockId, currentUserId, todayStr, lockId, bloqueosProveedor, cursoUnDia, cursoSeleccionado, sedeSeleccionada, bloqueosAdmin, bloqueosInstructor
}) => {
    // SSOT-MOTO-HELPERS: derivar necesidad de moto desde helper único.
  const { cursoIncluyeMoto, necesitaMoto } = calcularNecesitaMoto(cursoSeleccionado, form.traeMoto);

  // FIX-INSTRUCTORES-PERMITIDOS: SSOT para filtrar instructores permitidos por curso.
  // Si el curso no define instructoresPermitidos (o está vacío), todos los activos son válidos.
  const instructoresPermitidosCurso = cursoSeleccionado?.instructoresPermitidos;
  // FIX-ALT-B: fail-closed. Si el curso NO tiene instructoresPermitidos configurado,
  // NADIE puede impartirlo. Detecta config faltante antes de asignar instructor no calificado.
  const estaPermitido = (i) => {
    if (!Array.isArray(instructoresPermitidosCurso) || instructoresPermitidosCurso.length === 0) return false;
    return instructoresPermitidosCurso.includes(String(i.id));
  };
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
      // Helper unificado: resuelve el bloque efectivo según la fecha buscada.
      if (fecha1 && getHoraIdOcupacion(r, fecha1) === bloqueId) return true;
      if (fecha2 && getHoraIdOcupacion(r, fecha2) === bloqueId) return true;
      return false;
    });
    if (enReserva) return true;
    const enLock = locksDeOtros.some(lock => {
      if (lock.instructorId !== instructorId) return false;
      if (lock.horaId !== bloqueId) return false;
      return lock.fecha === fecha1 || (fecha2 && lock.fecha === fecha2);
    });
    return enLock;
  };
  const isMotoOcupada = (motoId, bloqueId, fecha1, fecha2) => {
    const enReserva = reservasDeOtros.some(r => {
      if (r.estadoPago !== 'Pendiente' && r.estadoPago !== 'Aprobado') return false;
      if (r.motoAsignadaId !== motoId && r.motoReposicionId !== motoId) return false;
      if (r.traeMoto === 'Sí') return false;
      if (fecha1 && getHoraIdOcupacion(r, fecha1) === bloqueId) return true;
      if (fecha2 && getHoraIdOcupacion(r, fecha2) === bloqueId) return true;
      return false;
    });
    if (enReserva) return true;
    const enLock = locksDeOtros.some(lock => {
      if (lock.motoAsignadaId !== motoId) return false;
      if (lock.horaId !== bloqueId) return false;
      return lock.fecha === fecha1 || (fecha2 && lock.fecha === fecha2);
    });
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
    // SSOT-BLOQUEOS: validar bloqueosAdmin contra fecha1 Y fecha2 (cursos de 2 días).
    const hayBloqueoAdmin = (bloqueosAdmin || []).some(b => {
      if (!afectaHorarioAdmin(b, bloque.id)) return false;
      if (afectaFechaAdmin(b, fecha1, form.sedeId)) return true;
      if (fecha2 && afectaFechaAdmin(b, fecha2, form.sedeId)) return true;
      return false;
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
      .filter(i => estaPermitido(i))
      .filter(i => !isInstructorOcupado(i.id, bloque.id, fecha1, fecha2))
      .filter(i => !(bloqueosInstructor || []).some(b =>
        afectaInstructor(b, i.id, fecha1, bloque.id, form.sedeId) ||
        (fecha2 && afectaInstructor(b, i.id, fecha2, bloque.id, form.sedeId))
      ));


        let motosDisponibles = [];
    if (necesitaMoto) {
      motosDisponibles = (motos || [])
        .filter(m => m.activo && m.tipo === form.tipoMoto && (m.sedes || []).includes(form.sedeId))
        .filter(m => !isMotoOcupada(m.id, bloque.id, fecha1, fecha2));
    }
    const motosDisponiblesBase = motosDisponibles;
      // Filtrar motos bloqueadas por el proveedor (solo si el estudiante necesita moto)
    if (necesitaMoto && motosDisponibles.length > 0) {
      // SSOT-BLOQUEOS: bloqueo de proveedor contra fecha1 Y fecha2 (cursos de 2 días).
      motosDisponibles = motosDisponibles.filter(m => {
        const bloqueado = (bloqueosProveedor || []).some(b =>
          afectaProveedor(b, m.id, fecha1, bloque.label) ||
          (fecha2 && afectaProveedor(b, m.id, fecha2, bloque.label))
        );
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

    // FIX-NO-DISPONIBLE: contar instructores permitidos ANTES del filtro de bloqueo.
    // Si todos los permitidos están bloqueados por bloqueosInstructor → NO_DISPONIBLE.
    // Si hay algún permitido libre pero ocupado por reserva → RESERVADO (comportamiento actual).
    const instructoresPermitidosTotal = (instructores || [])
      .filter(i => i.activo && (i.sedes || []).includes(form.sedeId))
      .filter(i => estaPermitido(i))
      .length;
    const instructoresTotal = (instructores || []).filter(i => i.activo && (i.sedes || []).includes(form.sedeId))
      .filter(i => estaPermitido(i))
      .filter(i => !(bloqueosInstructor || []).some(b =>
        afectaInstructor(b, i.id, fecha1, bloque.id, form.sedeId) ||
        (fecha2 && afectaInstructor(b, i.id, fecha2, bloque.id, form.sedeId))
      ));
           const motosTotal = (motos || []).filter(m => m.activo && m.tipo === form.tipoMoto && (m.sedes || []).includes(form.sedeId));
        const instructoresLibresSinLocks = instructoresTotal.filter(i => !reservasDeOtros.some(r => {
      if (r.instructorId !== i.id) return false;
      if (fecha1 && getHoraIdOcupacion(r, fecha1) === bloque.id) return true;
      if (fecha2 && getHoraIdOcupacion(r, fecha2) === bloque.id) return true;
      return false;
    })).length;

    const motosLibresSinLocks = necesitaMoto
      ? motosTotal.filter(m => !reservasDeOtros.some(r => {
          if (r.traeMoto === 'Sí') return false;
          if (r.motoAsignadaId !== m.id && r.motoReposicionId !== m.id) return false;
          if (fecha1 && getHoraIdOcupacion(r, fecha1) === bloque.id) return true;
          if (fecha2 && getHoraIdOcupacion(r, fecha2) === bloque.id) return true;
          return false;
        })).length
      : 999;
    // FIX-NO-DISPONIBLE: discriminar entre "todos los permitidos bloqueados" (NO_DISPONIBLE)
    // y "instructores ocupados por reserva" (RESERVADO, comportamiento actual).
    const reasonInactividad = (instructoresPermitidosTotal > 0 && instructoresTotal.length === 0)
      ? 'NO_DISPONIBLE'
      : 'RESERVADO';
    if (!necesitaMoto) {
      
      if (instructoresLibresSinLocks === 0) return { ...bloque, disponible: false, reason: reasonInactividad, instructorId: null, motoAsignadaId: null };
    
      return { ...bloque, disponible: false, reason: 'EN_ESPERA_PAGO', instructorId: null, motoAsignadaId: null };
    } else {
      if (instructoresLibresSinLocks === 0 || motosLibresSinLocks === 0) return { ...bloque, disponible: false, reason: reasonInactividad, instructorId: null, motoAsignadaId: null };
      return { ...bloque, disponible: false, reason: 'EN_ESPERA_PAGO', instructorId: null, motoAsignadaId: null };
    }
  };

  const today = todayStr;
  
  const maxDate = (() => { const d = new Date(); d.setDate(d.getDate() + MAX_DIAS_RESERVA - 1); return d.toISOString().split('T')[0]; })();

  const diasDisponibles = [];
  // SSOT-MOTO-HELPERS: calcular días cuando sede + (tipoMoto O curso sin moto).
  if (puedeCalcularDisponibilidad(form.sedeId, form.tipoMoto, cursoSeleccionado)) {
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
  const { ocupacion: ocupacionConfirmada, cargando: cargandoOcupacion, fechaConsultada } = useOcupacionConfirmada({ 
    fecha: form.fecha1,
    fecha2: fecha2Calc,
    limitDocs: 100 
  });

    const navigate = useNavigate();
    const location = useLocation();
       const esRecompra = location.state?.esRecompra && location.state?.modo === 'nueva';
      const esReintento = location.state?.esReintento && location.state?.modo === 'nueva' && !esRecompra;
       // Fase 3 Pack: detección. Prioridad: location.state → sessionStorage (para sobrevivir F5).
       // FIX-PACK-FLAG-RESIDUAL: limpiar flag residual si viene con intención nueva que NO es pack.
       // Preserva F5 vía performance.navigation.type === 'reload'.
       // FIX-PACK-FLAG-RESIDUAL-V2: ALT-E (contrato explícito) + TTL numérico 4h.
       // Reemplaza performance.getEntriesByType (roto en SPA: refleja solo carga inicial).
       const hasNewIntent = location.state !== null && location.state !== undefined;
       const isExplicitlyNotPack = hasNewIntent && location.state?.esPack !== true;

       // ALT-E: si hay intención explícita NO-pack, limpiar flags de pack.
       if (isExplicitlyNotPack) {
         sessionStorage.removeItem('inscripcion_esPack');
         sessionStorage.removeItem('inscripcion_packId');
         sessionStorage.removeItem('inscripcion_pack_ts');
       }

       // TTL 4h: si el flag de pack es viejo, limpiar (cubre URL directa/marcadores).
       const TS_GUARDADO = parseInt(sessionStorage.getItem('inscripcion_pack_ts') || '0', 10);
       const TTL_MS = 4 * 60 * 60 * 1000;
       if (TS_GUARDADO > 0 && (Date.now() - TS_GUARDADO > TTL_MS)) {
         sessionStorage.removeItem('inscripcion_esPack');
         sessionStorage.removeItem('inscripcion_packId');
         sessionStorage.removeItem('inscripcion_pack_ts');
       }

       const esPackFromState = location.state?.esPack === true && !!location.state?.packId;
       const packIdFromState = location.state?.packId || null;
       if (esPackFromState && packIdFromState) {
         sessionStorage.setItem('inscripcion_esPack', 'true');
         sessionStorage.setItem('inscripcion_packId', packIdFromState);
         sessionStorage.setItem('inscripcion_pack_ts', Date.now().toString());
       }
       const esPack = esPackFromState || sessionStorage.getItem('inscripcion_esPack') === 'true';
       const packId = packIdFromState || sessionStorage.getItem('inscripcion_packId') || null;
  const packActivo = useMemo(
    () => esPack ? (ctx.packs || []).find(p => String(p.id) === String(packId)) : null,
    [ctx.packs, esPack, packId]
  );
   const recompraInicializadaRef = useRef(false);
    const reintentoInicializadoRef = useRef(false);
      const bootstrapEjecutado = useRef(false);
    const packInicializadoRef = useRef(false);
  const [inicializandoRecompra, setInicializandoRecompra] = useState(esRecompra);
  const [inicializandoReintento, setInicializandoReintento] = useState(esReintento);
  


  // ✅ FIX-REGISTRO-BOOTSTRAP: Consolidación de useEffect de mount.
  // Reemplaza: origen público + restauración de progreso + redirección FIX-035.
  // 6 fases secuenciales, sin race conditions.
  useEffect(() => {
    if (bootstrapEjecutado.current) return;

    let isMounted = true;

    const bootstrap = async () => {
      try {
        const state = location.state || {};

        // FASE 1 — Origen público: limpiar + Paso 1 con curso preseleccionado
        if (state.origen === 'publico' && state.cursoSugerido && state.cursoId) {
          // ALT-E: FASE 1 no requiere auth → sella y sale.
          bootstrapEjecutado.current = true;
          limpiarSesion();
          resetForm();
          updateForm({
            cursoId: state.cursoId,
            cursoSugeridoActivo: true,
            cursoSeleccionadoManual: false,
            origenPublico: true
          });
          navigate(location.pathname, { replace: true, state: {} });
          setStep('1');
          return;
        }

        // FASE 2 — Sin sesión: terminar bootstrap
        // ALT-E: si authReady es false, sale SIN sellar → permite re-ejecución.
        if (!ctx.authReady) return;

        // Auth resuelto → sellar ejecución una sola vez.
        bootstrapEjecutado.current = true;

        // Sin usuario autenticado → terminar bootstrap.
        if (!ctx.fbUser) return;

        // FASE 3 — Rol no-estudiante: redirigir a su panel
        const rol = ctx.user?.role;
        if (rol === 'admin') { navigate('/admin', { replace: true }); return; }
        if (rol === 'instructor') { navigate('/instructor', { replace: true }); return; }
        if (rol === 'proveedor') { navigate('/proveedor', { replace: true }); return; }

        // FASE 4 — Excepciones: recompra, reintento, pack (dejar sus flujos)
        if (state.esRecompra || state.esReintento || state.esPack) return;

        // FASE 5 — Redirección temprana: usuario con reservas (cualquier estado)
        const resReservas = await ReservaService.obtenerReservasPorUsuario(ctx.fbUser.uid);
        if (!isMounted) return;
        const reservas = resReservas.success ? (resReservas.data || []) : [];

        if (reservas.length > 0) {
          showToast('Ya tienes cursos en gestión. Te llevamos a tu portal.', 'info');
          navigate('/portal-reservas', { replace: true });
          return;
        }

        // FASE 6 — Restauración de progreso (usuario sin reserva)
        const pinSession = sessionStorage.getItem('inscripcion_generatedPin');
        if (pinSession) {
          if (!generatedPinRef.current) generatedPinRef.current = pinSession;
          if (!generatedPin) setGeneratedPin(pinSession);
          return;
        }
        if (generatedPinRef.current || generatedPin) return;

        const correoBusqueda = form.correo || ctx.fbUser.email;
        if (!correoBusqueda) return;

        const progreso = await ReservaService.buscarProgresoPorCorreo(correoBusqueda);
        if (!isMounted) return;

        if (progreso.success && progreso.data) {
          const cedulaGuardada = progreso.data.cedula || progreso.data.datosFormulario?.cedula;
          const cedulaIngresada = form.cedula;
          if (cedulaIngresada && cedulaGuardada && cedulaIngresada !== cedulaGuardada) {
            showToast('La cédula no coincide con la registrada. No puedes continuar.', 'error');
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
            setStep(String(progreso.data.paso || '2'));
          }
          return;
        }

        // FASE 7 — Precarga correo (usuario sin reserva, sin progreso)
        if (!form.correo && ctx.fbUser.email) {
          updateForm({ correo: ctx.fbUser.email });
        }
      } catch (err) {
        console.error('[InscripcionView] Error en bootstrap:', err);
      }
    };

    bootstrap();

    return () => { isMounted = false; };
  }, [ctx.authReady, ctx.fbUser?.uid]); // ALT-E: re-ejecutar cuando auth resuelva

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
    const fechaAnteriorRef = useRef(form.fecha1);

  // LOCK-INVALIDATION-SSOT-V1: contexto de invalidación (solo inputs).
  // Si cambia cualquiera de estos campos, el lock se libera automáticamente.
  const lockContext = useMemo(() => capturarContextoLock(form, esPack, packId),
    [form.fecha1, form.sedeId, form.cursoId, form.tipoMoto, form.traeMoto, form.traeMotoPorCurso, esPack, packId]);
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

  // A2.6: useEffect de reintento (estudiante con reserva cancelada por pago no coincidente)
  useEffect(() => {
    const state = location.state || {};
    if (!ctx.fbUser || !state.esReintento || state.modo !== 'nueva') return;
    if (reintentoInicializadoRef.current) return;
    reintentoInicializadoRef.current = true;

    const iniciarReintento = async () => {
      setInicializandoReintento(true);
      limpiarSesion();
      resetForm();
      try {
        const resultado = await ReservaService.obtenerReservasCanceladas(ctx.fbUser.uid);
        if (!resultado.success || !resultado.data || resultado.data.length === 0) {
          showToast('No se encontraron reservas canceladas para reintento', 'error');
          navigate('/portal-reservas');
          return;
        }

        // La primera ya viene ordenada por createdAt desc
        const r = resultado.data[0];

        // Solo se prellenan datos estáticos / semi-estáticos.
        // Los campos volátiles (sabeBicicleta, tipoMoto, traeMoto, curso, sede)
        // quedan vacíos para forzar confirmación explícita del estudiante en Paso 2.
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
          condicionMedica: r.condicionMedica || '',
          detalleCondicion: r.detalleCondicion || '',
                  // Volátiles vacíos — el estudiante los confirma en Paso 2
          sabeBicicleta: '',
          tipoMoto: '',
          traeMoto: '',
          cursoId: state.cursoId || '',
          // A2.7-bis: mismos flags que el flujo público para que el dropdown
          // de cursos aparezca con el curso prellenado (editables ambos)
          origenPublico: true,
          cursoSugeridoActivo: true,
          cursoSeleccionadoManual: false,
          sedeId: '',
          horaId: '',
          fecha1: '',
          fecha2: '',
          pagoBanco: '',
          pagoTelefono: '',
          pagoCedula: '',
          pagoRef: '',
          esReintento: true
        });

        // FIRE + MAMBA (P4): aterrizar en Paso 1 con datos prellenados
        setStep('1');
      } catch (error) {
        showToast('Error al preparar la reinscripción', 'error');
        navigate('/portal-reservas');
      } finally {
        setInicializandoReintento(false);
      }
    };

    iniciarReintento();
  }, [ctx.fbUser, location.state, navigate, limpiarSesion, resetForm, setStep, showToast, updateForm]);

  useEffect(() => { if (generatedPin) generatedPinRef.current = generatedPin; }, [generatedPin]);

  // Fase 3 Pack: cargar pack y prellenar form cuando llega desde /packs o panel
  useEffect(() => {
    if (!esPack || !packId || !ctx.cursos?.length) return;
    if (packInicializadoRef.current) return;

    const pack = (ctx.packs || []).find(p => String(p.id) === String(packId));
    if (!pack) {
      showToast('Pack no encontrado. Contacta a la escuela.', 'error');
      navigate('/packs', { replace: true });
      return;
    }

    const cursosPack = (pack.cursoIds || [])
      .map(id => (ctx.cursos || []).find(c => String(c.id) === String(id)))
      .filter(Boolean);

    const cursoEquilibrio = cursosPack[0];
    const cursoBasico = cursosPack[1];
    if (!cursoEquilibrio || !cursoBasico) {
      showToast('El pack está mal configurado. Contacta a la escuela.', 'error');
      navigate('/packs', { replace: true });
      return;
    }

    packInicializadoRef.current = true;

    // FIX-PACK-HEREDA-FECHA: resetear form antes de precargar el pack.
    // Previene que fecha1/horaId/lockId del flujo individual se hereden
    // (updateForm hace merge, no reemplazo). Mismo patrón que recompra/reintento.
    resetForm();

    // FIX-PACK-TIPOMOTO: SSOT es el curso a agendar (Equilibrio), no el básico.
    const tiposEq = cursoEquilibrio.tiposMotoEscuela;
    const tipoMotoDerivado = Array.isArray(tiposEq) && tiposEq.length > 0 ? tiposEq[0] : null;

    // Precarga desde SSOT (usuarios/{uid}) si el usuario está logueado
    const ssot = ctx.user?.data || {};
    const fechaNac = ssot.fechaNacimiento || '';
    const partesFecha = fechaNac ? fechaNac.split('-') : [];

    updateForm({
      // Datos personales del SSOT
      nombre: ssot.nombre || '',
      apellido: ssot.apellido || '',
      cedula: ssot.cedula || '',
      correo: ssot.correo || ctx.fbUser?.email || '',
      telefono: ssot.telefono || '',
      contactoEmergencia: ssot.contactoEmergencia || '',
      diaNac: partesFecha[2] ? String(Number(partesFecha[2])) : '',
      mesNac: partesFecha[1] ? String(Number(partesFecha[1])) : '',
      anoNac: partesFecha[0] ? String(Number(partesFecha[0])) : '',
      sexo: ssot.sexo || '',
      estado: ssot.estado || '',
      zona: ssot.zona || '',
      condicionMedica: ssot.condicionMedica || '',
      detalleCondicion: ssot.detalleCondicion || '',
      // Datos del pack
      cursoId: cursoEquilibrio.id,
      cursoSugeridoActivo: true,
      cursoSeleccionadoManual: false,
      tipoMoto: tipoMotoDerivado,
      sedeId: '',
      traeMoto: 'No',
      // FIX-PACK-DEFAULT-MOTO: si el mapa está vacío, prellenar con 'No'
      // (moto App por defecto) para cada curso preguntable del pack.
      traeMotoPorCurso: (() => {
        const actual = form.traeMotoPorCurso || {};
        if (Object.keys(actual).length > 0) return actual;
        const inicial = {};
        cursosPack.forEach(c => {
          const esPreguntable = c.tipoCurso !== 'equilibrio' && c.motoIncluida !== false;
          if (esPreguntable) inicial[String(c.id)] = 'No';
        });
        return inicial;
      })(),
      sabeBicicleta: 'No',
      esPack: true,
      packId
    });

    // Usuario logueado → Paso 2 (datos del SSOT ya precargados).
    // Usuario nuevo → Paso 1 (necesita crear cuenta + generar PIN).
    setStep(ctx.fbUser ? '2' : '1');
   }, [esPack, packId, ctx.cursos, ctx.packs, ctx.fbUser, ctx.user, updateForm, setStep, navigate, showToast, resetForm]);


  
useEffect(() => {
  if (!ctx.fbUser) return;
  const fechaAEscuchar = form.fecha1 || ctx.getTodayStr();
  const cleanup = LockService.escucharOcupacionTemporal(fechaAEscuchar, (locks) => {
    setActiveLocks(locks);
  });
  return () => cleanup();
}, [form.fecha1, ctx.fbUser, ctx.getTodayStr]);

// SSOT-BLOQUEOS: reemplazado por useBloqueosAdmin hook (más abajo en el componente).

 

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

  // LOCK-INVALIDATION-SSOT-V1: invalidar lock cuando cambia cualquier
  // input de disponibilidad (traeMoto, tipoMoto, sedeId, cursoId, packId, traeMotoPorCurso).
  // El useEffect anterior cubre SOLO fecha1. Este cubre el resto.
  // Guard: no tocar si está en Paso 4 (punto de no retorno del lock).
  useEffect(() => {
    if (step !== '3' || !lockId || !form.horaId) return;
    const stored = sessionStorage.getItem(LOCK_CONTEXT_KEY);
    if (!stored) return;

    let prev;
    try { prev = JSON.parse(stored); } catch { return; }
    if (!prev) return;

    // Comparar todos los campos EXCEPTO fecha1 (ya cubierto por el useEffect anterior).
    const changedKeys = Object.keys(lockContext).filter(k =>
      k !== 'fecha1' && String(prev[k]) !== String(lockContext[k])
    );
    if (changedKeys.length === 0) return;

    console.info('[SRE-LOCK-INVALIDATION] Contexto mutado. Lock liberado limpiamente.', {
      lockId,
      changedKeys,
      prev,
      current: lockContext,
    });

    LockService.liberarLock(lockId).catch(() => {});
    limpiarLockPropioOptimista(lockId);
    updateLockId(null);
    updateLockExpiresAt(null);
    setTiempoRestante(null);
    updateForm({ horaId: '' });
    sessionStorage.removeItem(LOCK_CONTEXT_KEY);
    showToast('Actualizaste tu configuración. Elegí un nuevo horario.', 'info');
  }, [step, lockId, form.horaId, lockContext, limpiarLockPropioOptimista, updateLockId, updateLockExpiresAt, updateForm, showToast]);

    useEffect(() => {
    if (step === '3' && !ctx.fbUser) {
      showToast('Tu sesión ha expirado. Inicia sesión nuevamente.', 'error');
      if (ctx.logoutUser) ctx.logoutUser();
      navigate('/login');
    }
  }, [step, ctx.fbUser, ctx.logoutUser, showToast, navigate]);

 

  // ─── Cálculo de disponibilidad ────────────────────────
      const todayStr = ctx.getTodayStr();
  const bloqueosProveedor = useBloqueosProveedor(form.fecha1, step === '3');
  const { bloqueos: bloqueosAdmin, cargando: cargandoBloqueos } = useBloqueosAdmin(step === '3');
  // FEATURE-BLOQUEOS-INSTRUCTORES: carga TODOS los bloqueos activos.
  // El filtro por fecha + instructor + hora lo hace afectaInstructor.
  const bloqueosInstructor = useBloqueosInstructor(step === '3');
  const sedeSeleccionada = (ctx.sedes || []).find(s => String(s.id) === String(form.sedeId));

 
const disponibilidad = useMemo(() => {
  if (!ctx.instructores?.length || !ctx.motos?.length || !ctx.horarios?.length) return null;
 return evaluarDisponibilidad({
    form, horarios: ctx.horarios, instructores: ctx.instructores, motos: ctx.motos,
    reservasConfirmadas: ocupacionConfirmada, activeLocks: activeLocks || [], selectingBlockId,
    currentUserId: ctx.fbUser?.uid, todayStr, lockId, bloqueosProveedor, cursoUnDia, cursoSeleccionado, sedeSeleccionada, bloqueosAdmin, bloqueosInstructor
  });
}, [form, ctx.horarios, ctx.instructores, ctx.motos, ocupacionConfirmada, activeLocks, selectingBlockId, ctx.fbUser?.uid, todayStr, lockId, clockTick, bloqueosProveedor, cursoUnDia, cursoSeleccionado, sedeSeleccionada, bloqueosAdmin, bloqueosInstructor]);
  useEffect(() => {
    if (step !== '3') return;
    if (cargandoBloqueos) return;
    if (cargandoOcupacion) return;

    // ALT-4 (FIX-HUEVO-GALLINA): esperar a que la ocupación esté sincronizada
    // con la fecha actual. Si form.fecha1 está seteado pero fechaConsultada
    // todavía no coincide, la disponibilidad fue calculada con datos stale.
    if (form.fecha1 && fechaConsultada !== form.fecha1) return;

    // ALT-5 acotada: si la fecha actual quedó inválida (todos los bloques
    // sin disponibilidad), re-elegir. Agnóstico al origen: si el usuario
    // eligió una fecha que se volvió inválida, el sistema la corrige.
    if (form.fecha1) {
      const infoFecha = disponibilidad?.diasDisponibles?.find(d => d.fecha === form.fecha1);
      if (infoFecha?.disponible) return;
    }

    if (!disponibilidad?.diasDisponibles?.length) return;
    const primerDiaLibre = disponibilidad.diasDisponibles.find(dia => dia.disponible);
    if (!primerDiaLibre) return;
    if (primerDiaLibre.fecha === form.fecha1) return;
    updateForm({ fecha1: primerDiaLibre.fecha });
  }, [step, form.fecha1, disponibilidad, updateForm, todayStr, cargandoBloqueos, cargandoOcupacion, fechaConsultada]);

    
    const baseUSD = ctx.calcularBaseUSD(form.sedeId, form.sabeBicicleta, form.traeMoto, cursoSeleccionado);

  // Fase 3 Pack: cuando es pack, el precio total se calcula desde packActivo
  const packPrecioBase = useMemo(() => {
    if (!esPack || !packActivo) return 0;
    const baseCursos = (packActivo.cursoIds || []).reduce((acc, cid) => {
      const c = (ctx.cursos || []).find(x => String(x.id) === String(cid));
      return acc + (Number(c?.precioBase) || 0);
    }, 0);
    const baseTeoricos = packActivo.sumarTeoricosAlPrecio
      ? (packActivo.cursosTeoricosIncluidos || []).reduce((acc, ctId) => {
          const ct = (ctx.cursosTeoricos || []).find(x => String(x.id) === String(ctId));
          return acc + (Number(ct?.precio) || 0);
        }, 0)
      : 0;
    return baseCursos + baseTeoricos;
  }, [esPack, packActivo, ctx.cursos, ctx.cursosTeoricos]);

  const packDescuentoMonto = useMemo(() => {
    if (!esPack || !packActivo) return 0;
    return packActivo.descuentoTipo === 'porcentaje'
      ? (packPrecioBase * (Number(packActivo.descuentoValor) || 0)) / 100
      : (Number(packActivo.descuentoValor) || 0);
  }, [esPack, packActivo, packPrecioBase]);

  const packPrecioFinal = Math.max(0, packPrecioBase - packDescuentoMonto);

  // Precio efectivo a cobrar (pack o curso individual)
  const baseUSDFinal = esPack ? packPrecioFinal : baseUSD;

  const precioBaseMostrar = esPack
    ? packPrecioFinal
    : (cursoSeleccionado?.precioBase ?? ctx.config.precioBase ?? 0);
    const sedeActual = (ctx.sedes || []).find(s => String(s.id) === String(form.sedeId));
  const recargoSede = sedeActual?.nombre === 'Guarenas' ? (Number(ctx.config.recargoGuarenas) || 0) : 0;
  const recargoSinBici = form.sabeBicicleta === 'No' ? (Number(ctx.config.recargoSinBici) || 0) : 0;
  const descuentoMotoPropia = form.traeMoto === 'Sí' ? (Number(ctx.config.descuentoMotoPropia) || 0) : 0;
  const descuentoPromo = Number(ctx.config.descuentoPromo) || 0;
   const recargoAlquilerMoto = (form.traeMoto !== 'Sí' && cursoSeleccionado?.motoIncluida !== false)
    ? (Number(cursoSeleccionado?.precioAlquilerMoto) || 0)
    : 0;
    const tasaCobro = ctx.config.monedaCobroClientes === 'USD' ? ctx.config.tasaUSD : ctx.config.tasaEUR;
  const precioFinalVES = (baseUSDFinal * (Number(tasaCobro) || 1)).toFixed(2);  const fechaNacimiento = (form.diaNac && form.mesNac && form.anoNac) ? form.anoNac + '-' + String(form.mesNac).padStart(2,'0') + '-' + String(form.diaNac).padStart(2,'0') : '';

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
    // FIX-PACK-LOGUEADO-PIN: el toast solo aplica a usuarios NUEVOS
    // (los logueados ya redirigieron al portal antes de esta validación)
    if (!pinParaMostrar && !ctx.fbUser) {
      console.error('🚨 [PIN] CRÍTICO: No se pudo recuperar el PIN');
      showToast(
        'Tu registro se completará, pero contacta a soporte para recuperar tu PIN.',
        'warning'
      );
    }

    // ✅ PASO 4: Crear reserva incluyendo el PIN
    const { esRecompra: _esRecompra, ...formLimpio } = form;
    let result;

    if (esPack && packActivo) {
      // ─── Compra de pack ──────────────────────────
      const cursosPackSnapshot = (packActivo.cursoIds || [])
        .map(cid => (ctx.cursos || []).find(c => String(c.id) === String(cid)))
        .filter(Boolean);

            const traeMotoPorCurso = form.traeMotoPorCurso || {};
      result = await ReservaService.crearReservaPack({
        packId: packActivo.id,
        userId: uid,
        nombre: form.nombre,
        apellido: form.apellido,
        cedula: form.cedula,
        correo: form.correo,
        telefono: form.telefono,
        contactoEmergencia: form.contactoEmergencia,
        fechaNacimiento,
        sexo: form.sexo,
        estado: form.estado,
        zona: form.zona,
        condicionMedica: form.condicionMedica,
        detalleCondicion: form.detalleCondicion,
        sedeId: form.sedeId,
        tipoMoto: form.tipoMoto,
        traeMotoPorCurso,
        cursoSnapshot: cursosPackSnapshot,
        fecha: form.fecha1,
        fecha2: disponibilidad?.fecha2Calc || null,
        horaId: form.horaId,
        instructorId: form.instructorId,
        motoAsignadaId: form.motoAsignadaId,
        proveedorId: form.proveedorId || null,
        pagoTotalMoneda: baseUSDFinal,
        pagoTotalVES: parseFloat(precioFinalVES),
        pagoBanco: form.pagoBanco,
        pagoTelefono: form.pagoTelefono,
        pagoCedula: form.pagoCedula,
        pagoRef: form.pagoRef,
        pin: pinParaMostrar,
        terminosAceptados: true,
        fechaAceptacionTerminos: new Date().toISOString(),
        origen: 'pack-publico'
      }, lockId);
    } else {
      // ─── Reserva individual (flujo normal) ────────
      result = await ReservaService.crearReserva({      ...formLimpio,
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
      })(),
        // A2.6: trazabilidad del origen de la inscripción para métricas
      origenReinscripcion: esRecompra ? 'recompra' : (esReintento ? 'reintento' : 'nueva')
      }, lockId);
    }

    setIsSubmitting(false);

    if (result.success) {
      if (esRecompra) {
        showToast('Reserva creada correctamente', 'success');
        limpiarSesion();
        navigate('/portal-reservas');
        return;
      }

      // FIX-PACK-LOGUEADO-PIN: usuario logueado SIN PIN → redirect directo
      // Usuario nuevo (aunque esté logueado tras crear cuenta) → sí necesita ver PIN
      if (ctx.fbUser && !pinParaMostrar) {
        showToast(
          esPack
            ? 'Pack adquirido correctamente. Gestiónalo desde tu portal.'
            : 'Reserva creada correctamente.',
          'success'
        );
        limpiarSesion();
        if (esPack) {
          sessionStorage.removeItem('inscripcion_esPack');
          sessionStorage.removeItem('inscripcion_packId');
        }
        navigate('/portal-reservas', { replace: true });
        return;
      }

      // ===== A PARTIR DE AQUÍ: SOLO USUARIOS NUEVOS =====

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
        console.warn('[InscripcionView] No se envió correo de bienvenida. Valores:', {
          correo: form.correo,
          nombre: form.nombre,
          apellido: form.apellido,
          pin: pinParaMostrar,
          esPack
        });
      }

      // ✅ PASO 6: Limpiar sesión
      limpiarSesion();

      // FIX-PACK-FLAG-RESIDUAL: limpiar flag al terminar el flujo (éxito)
      if (esPack) {
        sessionStorage.removeItem('inscripcion_esPack');
        sessionStorage.removeItem('inscripcion_packId');
      }

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
    }, [lockId, form, disponibilidad, fechaNacimiento, baseUSD, baseUSDFinal, precioFinalVES, limpiarSesion, showToast, generatedPin, esRecompra, esReintento, esPack, packActivo, ctx.cursos, navigate, updateForm]);
  const handleIrAlPanel = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) { showToast('Error de sesión. No se puede acceder al panel.', 'error'); return; }
    // FIX-PACK-FLAG-RESIDUAL: limpiar flag al salir del flujo de inscripción
    sessionStorage.removeItem('inscripcion_esPack');
    sessionStorage.removeItem('inscripcion_packId');
    // Leer SSOT completo (el form puede estar limpio por limpiarSesion)
    try {
      const res = await UsuarioService.obtenerPerfil(uid);
      const perfil = res.success && res.data
        ? res.data
        : { nombre: form.nombre, apellido: form.apellido, cedula: form.cedula };
      ctx.setUser({ role: 'estudiante', data: perfil, uid });
    } catch (e) {
      ctx.setUser({ role: 'estudiante', data: { nombre: form.nombre, apellido: form.apellido, cedula: form.cedula }, uid });
    }
    navigate('/portal-reservas');
  }, [ctx, form, navigate, showToast]);

   const handleSelectHorario = useCallback(async (bloque) => {
    if (lockId && form.horaId === bloque.id) { setModalLiberar({ bloque }); return; }
    if (isSelectingHorario) return;
    if (!ctx.fbUser) { showToast('Espera un momento...', 'error'); return; }

    // SSOT-BLOQUEOS: revalidar bloqueos admin (fecha1 y fecha2) usando helper.
    const bloqueadoAdmin = (bloqueosAdmin || []).some(b => {
      if (!afectaHorarioAdmin(b, bloque.id)) return false;
      if (afectaFechaAdmin(b, form.fecha1, form.sedeId)) return true;
      if (disponibilidad?.fecha2Calc && afectaFechaAdmin(b, disponibilidad.fecha2Calc, form.sedeId)) return true;
      return false;
    });
    if (bloqueadoAdmin) {
      showToast('Este horario acaba de ser bloqueado por la administración.', 'error');
      return;
    }

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
     // SSOT-MOTO-HELPERS: derivar necesidad de moto desde helper único.
  const { necesitaMoto } = calcularNecesitaMoto(cursoSeleccionado, form.traeMoto);
   // FIX-INSTRUCTORES-PERMITIDOS + FIX-ALT-B: revalidar en handler con fail-closed.
   // Mismo criterio que estaPermitido en evaluarDisponibilidad.
   const instructoresPermitidosCursoH = cursoSeleccionado?.instructoresPermitidos;
   const estaPermitidoH = (i) => {
     if (!Array.isArray(instructoresPermitidosCursoH) || instructoresPermitidosCursoH.length === 0) return false;
     return instructoresPermitidosCursoH.includes(String(i.id));
   };
   const instructoresLibres = (ctx.instructores || [])
  .filter(i => i.activo && (i.sedes || []).includes(form.sedeId))
  .filter(i => estaPermitidoH(i))
  .filter(i => !locksDeOtros.some(lock => lock.instructorId === i.id && lock.horaId === bloque.id && (lock.fecha === form.fecha1 || (disponibilidad?.fecha2Calc && lock.fecha === disponibilidad.fecha2Calc))))  .filter(i => !reservasDeOtros.some(r => {
    if (r.estadoPago !== 'Pendiente' && r.estadoPago !== 'Aprobado') return false;
    if (r.instructorId !== i.id) return false;
    if (String(r.horaId) !== String(bloque.id)) return false;
    return r.fecha === form.fecha1 || (disponibilidad?.fecha2Calc && r.fecha === disponibilidad.fecha2Calc) || r.fecha2 === form.fecha1 || (disponibilidad?.fecha2Calc && r.fecha2 === disponibilidad.fecha2Calc);  }))
  .filter(i => !(bloqueosInstructor || []).some(b =>
    afectaInstructor(b, i.id, form.fecha1, bloque.id, form.sedeId) ||
    (disponibilidad?.fecha2Calc && afectaInstructor(b, i.id, disponibilidad.fecha2Calc, bloque.id, form.sedeId))
  ));
     let motosLibres = [];
if (necesitaMoto) {
  motosLibres = (ctx.motos || [])
    .filter(m => m.activo && m.tipo === form.tipoMoto && (m.sedes || []).includes(form.sedeId))
    .filter(m => !locksDeOtros.some(lock => lock.motoAsignadaId === m.id && lock.horaId === bloque.id && (lock.fecha === form.fecha1 || (disponibilidad?.fecha2Calc && lock.fecha === disponibilidad.fecha2Calc))))    .filter(m => !reservasDeOtros.some(r => {
      if (r.estadoPago !== 'Pendiente' && r.estadoPago !== 'Aprobado') return false;
      if (r.motoAsignadaId !== m.id) return false;
      if (r.traeMoto === 'Sí') return false;
      if (String(r.horaId) !== String(bloque.id)) return false;
      return r.fecha === form.fecha1 || (disponibilidad?.fecha2Calc && r.fecha === disponibilidad.fecha2Calc) || r.fecha2 === form.fecha1 || (disponibilidad?.fecha2Calc && r.fecha2 === disponibilidad.fecha2Calc);    }))
    // SSOT-BLOQUEOS: filtrar motos bloqueadas por proveedor (fecha1 y fecha2).
    .filter(m => !(bloqueosProveedor || []).some(b =>
      afectaProveedor(b, m.id, form.fecha1, bloque.label) ||
      (disponibilidad?.fecha2Calc && afectaProveedor(b, m.id, disponibilidad.fecha2Calc, bloque.label))
    ));
}


    const instructorId = instructoresLibres.find(i => i.esPrincipal)?.id || instructoresLibres[0]?.id;
    const motoAsignadaId = necesitaMoto ? motosLibres[0]?.id : null;
    if (!instructorId || (necesitaMoto && !motoAsignadaId)) {
      showToast('Este bloque acaba de quedarse sin recursos. Por favor, selecciona otro.', 'error');
      return;
    }

    // LOCK-INVALIDATION-SSOT-V1 (ALT-D): freno defensivo antes de crear el lock.
    // Si existe un snapshot previo y NO coincide con el contexto actual,
    // el usuario llegó con estado inconsistente (race o manipulación).
    // Bloqueamos para forzar re-selección limpia.
    const storedSnapshot = sessionStorage.getItem(LOCK_CONTEXT_KEY);
    if (storedSnapshot && lockId) {
      let prevSnap = null;
      try { prevSnap = JSON.parse(storedSnapshot); } catch { /* corrupto */ }
      if (prevSnap) {
        const snapshotCambio = Object.keys(lockContext).some(k =>
          k !== 'fecha1' && String(prevSnap[k]) !== String(lockContext[k])
        );
        if (snapshotCambio) {
          console.warn('[SRE-SECURITY] Freno Táctico: Intento de creación de lock con contexto obsoleto.', {
            lockIdActual: lockId,
            prevSnap,
            currentContext: lockContext,
          });
          // Liberar lock viejo + limpiar snapshot + forzar re-selección
          await LockService.liberarLock(lockId).catch(() => {});
          limpiarLockPropioOptimista(lockId);
          updateLockId(null);
          updateLockExpiresAt(null);
          setTiempoRestante(null);
          updateForm({ horaId: '' });
          sessionStorage.removeItem(LOCK_CONTEXT_KEY);
          showToast('Tu configuración cambió. Elegí un nuevo horario.', 'info');
          return;
        }
      }
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
      // LOCK-INVALIDATION-SSOT-V1: guardar snapshot del contexto al crear el lock.
      // Se compara al volver al Paso 3 para detectar cambios en inputs.
      sessionStorage.setItem(LOCK_CONTEXT_KEY, JSON.stringify(capturarContextoLock(form, esPack, packId)));
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
  }, [lockId, form, disponibilidad, ctx, isSelectingHorario, renovacionUsada, activeLocks, bloqueosAdmin, bloqueosProveedor, bloqueosInstructor, updateLockId, updateForm, updateLockExpiresAt, showToast]);
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

  // A6 + OP-A: guardar progreso con retry (1s + 2s). Si falla 3 veces, retorna {success: false}.
  const guardarProgresoConRetry = async (uid, paso, datos, correo, intentos = 3) => {
    for (let i = 0; i < intentos; i++) {
      const res = await ReservaService.guardarProgreso(uid, paso, datos, correo);
      if (res.success) return res;
      if (i === intentos - 1) return res;
      showToast(`Reintentando guardar progreso (${i + 2}/${intentos})...`, 'info');
      await new Promise(resolve => setTimeout(resolve, i === 0 ? 1000 : 2000));
    }
  };

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
          // SSOT: guardar perfil en usuarios/{uid} (fire-and-forget, no bloquea el flujo)
          UsuarioService.guardarPerfil(uid, form.correo, form).catch((err) => {
            console.warn('[InscripcionView] Error guardando perfil SSOT:', err);
          });
          const guardadoPaso1 = await guardarProgresoConRetry(uid, 2, { ...form, pin }, form.correo);
          if (!guardadoPaso1.success) {
            console.error('[InscripcionView] Error guardando progreso paso 1:', guardadoPaso1.error);
            showToast('Error de conexión al guardar tu progreso. Verifica tu internet e intenta de nuevo.', 'error');
            setIsSubmitting(false);
            return;
          }
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

          // FIX-REGISTRO: Sin sesión → verificar si el usuario ya existe
      if (!ctx.fbUser && form.correo && form.cedula) {
        try {
          const progreso = await ReservaService.buscarProgresoPorCorreo(form.correo);
          if (progreso.success && progreso.data) {
            showToast('Ya tienes una cuenta. Ingresa tu PIN para continuar.', 'info');
            navigate('/login');
            return;
          }
        } catch (err) {
          console.error('[InscripcionView] Error verificando cuenta existente:', err);
        }
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

      // FIX-PACK-VALIDATE-MOTO: freno táctico del pack.
      // Aunque la UI prellene 'No' por defecto, revalidamos por si el estado
      // fue manipulado o el mapa quedó incompleto.
      if (esPack && packActivo) {
        const cursosPackV = (packActivo.cursoIds || [])
          .map(cid => (ctx.cursos || []).find(c => String(c.id) === String(cid)))
          .filter(Boolean);
        const preguntables = cursosPackV.filter(c =>
          c.tipoCurso !== 'equilibrio' && c.motoIncluida !== false
        );
        const faltantes = preguntables.filter(c =>
          !form.traeMotoPorCurso?.[String(c.id)]
        );
        if (faltantes.length > 0) {
          showToast(`Falta elegir moto para: ${faltantes.map(c => c.nombre).join(', ')}`, 'error');
          return;
        }
      }

      // ✅ NUEVO: Validar prerequisitos (excepto básicos que son soft)
      const cursoSel = (ctx.cursos || []).find(c => String(c.id) === String(form.cursoId));
      const esBasico = cursoSel?.tipoCurso === 'basico_auto' || cursoSel?.tipoCurso === 'basico_sincro';

      if (cursoSel && !esBasico) {
        const resultado = await ReservaService.obtenerReservasAprobadas(ctx.fbUser?.uid);
        const reservasAprobadas = resultado.success ? (resultado.data || []) : [];

        const cumple = cumplePrerequisito(
          cursoSel.tipoCurso,
          reservasAprobadas,
          cursoSel,
          ctx.cursos || []
        );

        if (!cumple) {
          showToast('Este curso requiere que apruebes un curso previo primero.', 'error');
          return;
        }
      }

      if (!esRecompra) {
        const guardadoPaso2 = await guardarProgresoConRetry(ctx.fbUser?.uid, 3, form, form.correo);
        if (!guardadoPaso2.success) {
          console.error('[InscripcionView] Error guardando progreso paso 2:', guardadoPaso2.error);
          showToast('Error de conexión al guardar tu progreso. Verifica tu internet e intenta de nuevo.', 'error');
          return;
        }
      }
      setStep('3');
      return;
    }
    if (step === '3') {
      if (!form.horaId || !lockId) { showToast('Selecciona un horario', 'error'); return; }
      await LockService.renovarLock(lockId).catch(() => {});      updateLockExpiresAt(Date.now() + LOCK_DURATION - 10000);
      setLockExpirado(false); setRenovacionUsada(false);
      if (!esRecompra) {
        const guardadoPaso3 = await guardarProgresoConRetry(ctx.fbUser?.uid, 4, form, form.correo);
        if (!guardadoPaso3.success) {
          console.error('[InscripcionView] Error guardando progreso paso 3:', guardadoPaso3.error);
          showToast('Error de conexión al guardar tu progreso. Verifica tu internet e intenta de nuevo.', 'error');
          return;
        }
      }
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
    else {
      // LOCK-INVALIDATION-SSOT-V1: limpiar snapshot al abandonar el flujo.
      limpiarSesion();
      navigate('/');
    }
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

  // A2.6: spinner durante la preparación del reintento
  if (esReintento && inicializandoReintento) {
    return (
      <AppShell bgColor="bg-white">
        <div className="flex items-center justify-center min-h-full">
          <Spinner message="Preparando reinscripción..." />
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
          <p className="text-sm text-gray-500 mb-8">Bienvenido a Moto App. Guarda tu PIN de acceso.</p>
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
        {step === '2' && (esPack && packActivo ? (
          <Paso2Pack
            form={form}
            updateForm={updateForm}
            pack={packActivo}
            cursos={ctx.cursos}
            sedes={ctx.sedes}
          />
        ) : (
                    <Paso2Configuracion form={form} updateForm={updateForm} cursos={ctx.cursos} sedes={ctx.sedes} recargoSinBici={ctx.config.recargoSinBici} reservas={ctx.reservas} fbUser={ctx.fbUser} />
        ))}        {step === '3' && !ctx.fbUser ? (
  <div className="flex-1 flex items-center justify-center"><Spinner message="Verificando sesión..." /></div>
) : step === '3' && (!ctx.instructores?.length || !ctx.motos?.length || !ctx.horarios?.length || cargandoBloqueos) ? (
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
        {step === '4' && <Paso4Pago form={form} updateForm={updateForm} precioFinalVES={precioFinalVES} baseUSD={baseUSDFinal} precioCurso={precioBaseMostrar} tasaCobro={tasaCobro} monedaCobroClientes={ctx.config.monedaCobroClientes} config={ctx.config} 
 desglosePrecio={() => {
  if (esPack && packActivo) {
    const baseSesionesPack = (packActivo.cursoIds || []).reduce((acc, cid) => {
      const c = (ctx.cursos || []).find(x => String(x.id) === String(cid));
      return acc + (Number(c?.precioBase) || 0);
    }, 0);
    const baseTeoricosPack = packActivo.sumarTeoricosAlPrecio
      ? (packActivo.cursosTeoricosIncluidos || []).reduce((acc, ctId) => {
          const ct = (ctx.cursosTeoricos || []).find(x => String(x.id) === String(ctId));
          return acc + (Number(ct?.precio) || 0);
        }, 0)
      : 0;
    const items = [
      { label: 'Suma de sesiones', value: '$' + baseSesionesPack.toFixed(2) }
    ];
    if (baseTeoricosPack > 0) {
      items.push({ label: 'Módulos formativos', value: '$' + baseTeoricosPack.toFixed(2) });
    }
    const descLabel = packActivo.descuentoTipo === 'porcentaje'
      ? `Descuento (${packActivo.descuentoValor}%)`
      : 'Descuento';
    if (packDescuentoMonto > 0) {
      items.push({ label: descLabel, value: '-$' + packDescuentoMonto.toFixed(2) });
    }
    items.push({ label: 'Total USD', value: '$' + packPrecioFinal.toFixed(2), bold: true });
    return items;
  }
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
}}
 lockId={lockId} step={step} lockTimer={<LockTimerFlotante tiempoRestante={tiempoRestante} renovacionUsada={renovacionUsada} onRenovarLock={handleRenovarLock} />} mostrarDetallesPago={mostrarDetallesPago} onToggleDetalles={() => setMostrarDetallesPago(!mostrarDetallesPago)} captchaA={captchaA} captchaB={captchaB} captchaValue={captchaValue} onCaptchaChange={(e) => setCaptchaValue(e.target.value.replace(/\D/g, '').slice(0, 2))} showToast={showToast} terminosAceptados={terminosAceptados} onToggleTerminos={() => setTerminosAceptados(!terminosAceptados)} onVerTerminos={() => setMostrarTerminos(true)} mostrarTerminos={mostrarTerminos} onCerrarTerminos={() => setMostrarTerminos(false)} />}
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
