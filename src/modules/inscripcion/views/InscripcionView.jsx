// @build: 2026-09-10.00-41-00 | id: FIX-028-PRIORIDAD-INSTRUCTOR-A | backup: InscripcionView.jsx.backup-20260910-004100 | desc: Prioridad determinista in-line para instructor principal

import { useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AppContext } from '../../../context/AppContextValue';
import { auth } from '../../../firebase';
import { ReservaService } from '../../../services/ReservaService';
import { MovilidadService } from '../services/MovilidadService';
import { diasSolicitudMovilidad, horaInicioDesdeHorario, MOVILIDAD_AUTORIZACION_VERSION } from '../utils/movilidadHelpers';
import { LockService } from '../../../services/LockService';
import { AuthService } from '../../../services/AuthService';
import UsuarioService from '../../shared/services/UsuarioService';
import ModalConfirmacion from '../../shared/components/ModalConfirmacion';
import { Button, Spinner } from '../../../components/UI';
import { useToast } from '../../shared/components/ToastProvider';
import AppShell from '../../shared/components/AppShell';
import DashboardHeader from '../../shared/components/DashboardHeader';
import { useInscripcionState, crearFlowId } from '../hooks/useInscripcionState';
import { Paso1DatosPersonales } from '../components/Paso1DatosPersonales';
import { Paso2Configuracion } from '../components/Paso2Configuracion';
import { Paso2Pack } from '../components/Paso2Pack';
import { Paso3Horario } from '../components/Paso3Horario';
import { Paso4Pago } from '../components/Paso4Pago';
import { calcularRecargoSedePack } from '../utils/packPricing';
import { Stepper } from '../components/Stepper';
import { CalendarioFlotante } from '../components/CalendarioFlotante';
import { FormularioSalud } from '../components/FormularioSalud';
import { CalendarioNacimiento } from '../components/CalendarioNacimiento';
import { LockTimerFlotante } from '../components/LockTimerFlotante';
import { ModalExpiracion } from '../components/ModalExpiracion';
import { leerConfigCaptcha, verificarCaptcha, mensajeCaptcha } from '../utils/captchaHelpers';
import { ArrowRight, Check, Award, Bike } from 'lucide-react';

import { validarPaso1, validarPaso4 } from '../../shared/schemas/validations';
import { formatearSede } from '../../shared/utils/sedesHelpers';
import { resolverUbicacionInscripcion } from '../../shared/utils/geografiaHelpers';


import { useBloqueosProveedorEstado } from '../../../hooks/useBloqueosProveedor';
import { useBloqueosAdmin } from '../../../hooks/useBloqueosAdmin';
import { useBloqueosInstructor } from '../../../hooks/useBloqueosInstructor';
import { afectaFechaAdmin, afectaHorarioAdmin, afectaProveedor, afectaInstructor } from '../../shared/utils/bloqueosHelpers';
import { calcularNecesitaMoto, puedeCalcularDisponibilidad } from '../../shared/utils/motoHelpers';
import { EmailService } from '../../shared/services/EmailService';
import { ordenarHorarios } from '../../shared/utils/horarios';
import { filtrarLocksDeOtros, eliminarLockLocal } from '../utils/locksHelpers';
import { calcularPrecioIndividual } from '../utils/precioIndividual';
import { enriquecerDiasConRoles } from '../utils/disponibilidadRoles';
import { filtrarMotosProveedorActivo } from '../utils/recursosHelpers';
import { bloqueYaInicio, getHoraIdOcupacion } from '../../shared/utils/reservaHelpers';
import { cumplePrerequisito } from '../../../constants/cursoSecuencia';
import { useOcupacionConfirmadaRango } from '../../../hooks/useOcupacionConfirmadaRango';
// T-159 / FT-085: si faltan site key o URL de verificacion se conserva la suma legada.
const CAPTCHA = leerConfigCaptcha(import.meta.env);
const LOCK_DURATION = 10 * 60 * 1000;
const MAX_REINTENTOS_EXPIRACION = 3;
const MAX_DIAS_RESERVA = 30;
// Freno táctico: el auto-jump no puede encadenar fechas indefinidamente.
// Se reinicia cuando el usuario elige una fecha manualmente.
const MAX_AUTOJUMPS = 3;

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
  form, horarios, instructores, motos, proveedoresPublicos, reservasConfirmadas, activeLocks, selectingBlockId, currentUserId, todayStr, lockId, bloqueosProveedor, cursoUnDia, cursoSeleccionado, sedeSeleccionada, bloqueosAdmin, bloqueosInstructor
}) => {
    // SSOT-MOTO-HELPERS: derivar necesidad de moto desde helper único.
  const { cursoIncluyeMoto, necesitaMoto } = calcularNecesitaMoto(cursoSeleccionado, form.traeMoto);

  // PROVEEDOR-INACTIVO: las motos de un proveedor con `activo === false` no
  // se ofrecen. El filtro es puro y se aplica una sola vez por evaluación.
  // Fuente: espejo público `proveedoresPublicos` (`{ id, activo }`).
  const motosPermitidas = filtrarMotosProveedorActivo(motos, proveedoresPublicos);

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

    // El lock seleccionado NO se restaura a ciegas: debe pasar por las
    // mismas validaciones de admin/proveedor/instructor/moto. Si un bloqueo
    // posterior lo invalida, el efecto de InscripcionView libera el lock.
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
      motosDisponibles = (motosPermitidas || [])
        .filter(m => m.activo && m.tipo === form.tipoMoto && (m.sedes || []).includes(form.sedeId))
        .filter(m => !isMotoOcupada(m.id, bloque.id, fecha1, fecha2));
    }
    const motosDisponiblesBase = motosDisponibles;
      // Filtrar motos bloqueadas por el proveedor (solo si el estudiante necesita moto)
    if (necesitaMoto && motosDisponibles.length > 0) {
      // SSOT-BLOQUEOS: bloqueo de proveedor contra fecha1 Y fecha2 (cursos de 2 días).
      motosDisponibles = motosDisponibles.filter(m => {
        const bloqueado = (bloqueosProveedor || []).some(b =>
          afectaProveedor(b, m.id, fecha1, bloque.label, m.proveedorId) ||
          (fecha2 && afectaProveedor(b, m.id, fecha2, bloque.label, m.proveedorId))
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
           const motosTotal = (motosPermitidas || []).filter(m => m.activo && m.tipo === form.tipoMoto && (m.sedes || []).includes(form.sedeId));
    // PROVEEDOR-INACTIVO: si había motos elegibles y todas quedaron fuera por
    // proveedor inactivo, el bloque se reporta con el estado "No disponible".
    const motosElegiblesBase = (motos || []).filter(m => m.activo && m.tipo === form.tipoMoto && (m.sedes || []).includes(form.sedeId));
    const sinMotoPorProveedorInactivo = necesitaMoto && motosTotal.length === 0 && motosElegiblesBase.length > 0;
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
    // ERR-072: sin motos del tipo elegido en la sede no es "Reservado": no hay
    // flota de ese tipo. El paso 3 lo comunica como SIN_MOTO.
    const sinMotoDelTipo = necesitaMoto && motosTotal.length === 0 && motosElegiblesBase.length === 0;
    // FIX-NO-DISPONIBLE: discriminar entre "todos los permitidos bloqueados" (NO_DISPONIBLE)
    // y "instructores ocupados por reserva" (RESERVADO, comportamiento actual).
    const reasonInactividad = sinMotoDelTipo
      ? 'SIN_MOTO'
      : ((instructoresPermitidosTotal > 0 && instructoresTotal.length === 0) || sinMotoPorProveedorInactivo)
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
  
  const maxDate = (() => {
    const d = new Date(todayStr + 'T12:00:00');
    d.setDate(d.getDate() + MAX_DIAS_RESERVA - 1);
    return d.toISOString().split('T')[0];
  })();

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
    limpiarSesion, resetForm,
    flow, updateFlow
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

  // La cinta y el auto-jump necesitan ocupación de TODO el rango, no solo D1/D2.
  const todayStr = ctx.getTodayStr();
  const fechaFinRango = useMemo(() => {
    const d = new Date(todayStr + 'T12:00:00');
    d.setDate(d.getDate() + MAX_DIAS_RESERVA - 1);
    return d.toISOString().split('T')[0];
  }, [todayStr]);

  const { ocupacion: ocupacionConfirmada, cargando: cargandoOcupacion, fechaConsultada } = useOcupacionConfirmadaRango({ 
    fechaInicio: todayStr,
    fechaFin: fechaFinRango,
    fecha: form.fecha1,
    limitDocs: 500
  });

    const navigate = useNavigate();
    const location = useLocation();

    // Un flujo persistido + una intención de navegación sin token nuevo
    // significa que el usuario recargó, no que abrió una inscripción nueva.
    // Los botones que inician una inscripción mandan entryToken único.
    // Se calcula una sola vez al montar: crear el flujo para un usuario nuevo
    // no debe convertir la resolución posterior de auth en una "recarga".
    const flowAlEntrarRef = useRef(flow);
    const tokenAlEntrarRef = useRef(location.state?.entryToken || location.state?.flowId || null);
    const flowIdInicial = flowAlEntrarRef.current?.flowId || null;
    const tokenInicial = tokenAlEntrarRef.current;
    const mismoFlow = Boolean(flowIdInicial && tokenInicial && tokenInicial === flowIdInicial);
    const esRecarga = Boolean(flowIdInicial && (mismoFlow || !tokenInicial));
    const esEntradaNueva = !flowIdInicial || Boolean(tokenInicial && !mismoFlow);

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
  // En una recarga el flujo ya está restaurado; no mostrar el spinner de una
  // inicialización de recompra/reintento que no se va a ejecutar.
  const [inicializandoRecompra, setInicializandoRecompra] = useState(esRecompra && !esRecarga);
  const [inicializandoReintento, setInicializandoReintento] = useState(esReintento && !esRecarga);
  


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
        if (!esRecarga && state.origen === 'publico' && state.cursoSugerido && state.cursoId) {
          // ALT-E: FASE 1 no requiere auth → sella y sale.
          bootstrapEjecutado.current = true;
          limpiarSesion();
          resetForm();
          updateForm({
            cursoId: state.cursoId,
            sedeId: state.sedeId ? String(state.sedeId) : '',
            cursoSugeridoActivo: true,
            cursoSeleccionadoManual: false,
            origenPublico: true
          });
          updateFlow({
            flowId: tokenInicial || crearFlowId(),
            origen: 'publico',
            cursoId: state.cursoId,
            esPack: false,
            packId: null,
            esRecompra: false,
            esReintento: false,
            step: '1',
            createdAt: Date.now()
          });
          navigate(location.pathname, { replace: true, state: {} });
          setStep('1');
          return;
        }

        // Registrar la intencion nueva (no recarga) antes de que auth resuelva.
        if (esEntradaNueva) {
          updateFlow({
            flowId: tokenInicial || crearFlowId(),
            origen: state.origen || (state.esPack ? 'pack' : 'individual'),
            cursoId: state.cursoId || form.cursoId || '',
            esPack: state.esPack === true,
            packId: state.packId || null,
            esRecompra: state.esRecompra === true,
            esReintento: state.esReintento === true,
            step,
            createdAt: Date.now()
          });
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
        // Si venimos de una recarga con flujo activo, no secuestramos el paso 3.
        if (esRecarga) return;

        const resReservas = await ReservaService.obtenerReservasPorUsuario(ctx.fbUser.uid);
        if (!isMounted) return;
        const reservas = resReservas.success ? (resReservas.data || []) : [];

        if (reservas.length > 0) {
          showToast('Ya tienes cursos en gestión. Te llevamos a tu portal.', 'info');
          navigate('/portal-reservas', { replace: true });
          return;
        }

        // FASE 6 — Restauración de progreso (usuario sin reserva)
        // Nunca sobrescribe un flujo restaurado por una recarga.
        if (esRecarga) return;

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
            const pasoRestaurado = String(progreso.data.paso || '2');
            updateForm(progreso.data.datosFormulario);
            setStep(pasoRestaurado);
            updateFlow({
              flowId: crearFlowId(),
              origen: 'progreso',
              cursoId: progreso.data.datosFormulario.cursoId || '',
              esPack: false,
              packId: null,
              esRecompra: progreso.data.datosFormulario.esRecompra === true,
              esReintento: progreso.data.datosFormulario.esReintento === true,
              step: pasoRestaurado,
              createdAt: Date.now()
            });
          }
          return;
        }

        // FASE 7 — Precarga correo y cédula (usuario sin reserva, sin progreso)
        if (!form.correo && ctx.fbUser.email) {
          updateForm({ correo: ctx.fbUser.email });
        }
        if (!form.cedula) {
          const perfil = await UsuarioService.obtenerPerfil(ctx.fbUser.uid);
          if (!isMounted) return;
          const cedulaPerfil = perfil.success ? String(perfil.data?.cedula || '') : '';
          if (cedulaPerfil) updateForm({ cedula: cedulaPerfil });
        }
      } catch (err) {
        console.error('[InscripcionView] Error en bootstrap:', err);
      }
    };

    bootstrap();

    return () => { isMounted = false; };
  }, [ctx.authReady, ctx.fbUser?.uid]); // ALT-E: re-ejecutar cuando auth resuelva

  // El paso forma parte del flujo persistido: una recarga debe reabrir el
  // mismo paso, aunque el usuario haya avanzado después de crear el flujo.
  useEffect(() => {
    if (!flow?.flowId) return;
    if (String(flow.step || '') === String(step)) return;
    updateFlow({ step });
  }, [flow, step, updateFlow]);

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
  const isAutoJumpRef = useRef(false);
  const autoJumpIntentosRef = useRef(0);
  const autoJumpAvisoRef = useRef(false);
  // Una fecha que viene de sessionStorage/flow se conserva; una fecha que el
  // usuario eligió manualmente tampoco se reemplaza por auto-jump.
  const fechaRestauradaRef = useRef(Boolean(flow?.flowId && form.fecha1));
  const fechaManualRef = useRef(false);

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
  const submitEnCursoRef = useRef(false);
  const selectingHorarioRef = useRef(false);
  const lockValidadoRef = useRef(null);
  const contextoDisponibilidadRef = useRef(null);
    
  const [generatedPin, setGeneratedPin] = useState(() => {
    return sessionStorage.getItem('inscripcion_generatedPin') || null;
  });

  const [mostrarPantallaExito, setMostrarPantallaExito] = useState(false);
  const [pinFinal, setPinFinal] = useState(null);
  const [recordatorioMovilidad, setRecordatorioMovilidad] = useState(null);
    const [terminosAceptados, setTerminosAceptados] = useState(false);
  const [mostrarTerminos, setMostrarTerminos] = useState(false);
  // T-159: captcha real (Turnstile) con verificacion en servidor.
  const captchaRef = useRef(null);
  const captchaEnCursoRef = useRef(false);
  // T-163: si Turnstile no responde (red, DNS, IPv6 ausente) se usa la suma
  // legada en el paso 4 para no bloquear la inscripcion.
  const [captchaFallback, setCaptchaFallback] = useState(false);

  const [clockTick, setClockTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setClockTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

        useEffect(() => {
    const state = location.state || {};
    if (!ctx.fbUser || !state.esRecompra || state.modo !== 'nueva') return;
    if (esRecarga) return;
    // No decidir que el curso no existe antes de que cargue el catálogo.
    if (!ctx.cursos?.length) return;
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
          estadoId: r.estadoId || '',
          municipio: r.municipio || '',
          municipioId: r.municipioId || '',
          ciudad: r.ciudad || '',
          ciudadId: r.ciudadId || '',
          zona: r.zona || '',
          sabeBicicleta: 'Sí',
          // FIX-RECOMPRA-MOTO: si el curso no permite traer propia, forzar 'No'
          // prellenado. Evita que el form muestre 'Sí' seleccionado en un botón
          // deshabilitado (bug histórico: reservas viejas con 'Sí' en Equilibrio).
          // El backend ya forzaba el valor correcto al guardar; este fix alinea la UI.
          traeMoto: (cursoRecompra?.permiteTraerMotoPropia === false) ? 'No' : (r.traeMoto || 'No'),
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
        updateFlow({
          flowId: tokenInicial || crearFlowId(),
          origen: 'recompra',
          cursoId: state.cursoId || '',
          esPack: false,
          packId: null,
          esRecompra: true,
          esReintento: false,
          step: '2',
          createdAt: Date.now()
        });
      } catch (error) {
        showToast('Error al preparar la inscripción', 'error');
        navigate('/portal-reservas');
      } finally {
        setInicializandoRecompra(false);
      }
    };

    

       iniciarRecompra();
}, [ctx.fbUser, location.state, navigate, limpiarSesion, resetForm, setStep, showToast, updateForm, ctx.cursos, updateFlow, esRecarga]);

  // A2.6: useEffect de reintento (estudiante con reserva cancelada por pago no coincidente)
  useEffect(() => {
    const state = location.state || {};
    if (!ctx.fbUser || !state.esReintento || state.modo !== 'nueva') return;
    if (esRecarga) return;
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
          estadoId: r.estadoId || '',
          municipio: r.municipio || '',
          municipioId: r.municipioId || '',
          ciudad: r.ciudad || '',
          ciudadId: r.ciudadId || '',
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
        updateFlow({
          flowId: tokenInicial || crearFlowId(),
          origen: 'reintento',
          cursoId: state.cursoId || '',
          esPack: false,
          packId: null,
          esRecompra: false,
          esReintento: true,
          step: '1',
          createdAt: Date.now()
        });
      } catch (error) {
        showToast('Error al preparar la reinscripción', 'error');
        navigate('/portal-reservas');
      } finally {
        setInicializandoReintento(false);
      }
    };

    iniciarReintento();
  }, [ctx.fbUser, location.state, navigate, limpiarSesion, resetForm, setStep, showToast, updateForm, updateFlow, esRecarga]);

  useEffect(() => { if (generatedPin) generatedPinRef.current = generatedPin; }, [generatedPin]);

  // Fase 3 Pack: cargar pack y prellenar form cuando llega desde /packs o panel
  useEffect(() => {
    if (!esPack || !packId || !ctx.cursos?.length) return;
    if (esRecarga) return;
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
      estadoId: ssot.estadoId || '',
      municipio: ssot.municipio || '',
      municipioId: ssot.municipioId || '',
      ciudad: ssot.ciudad || '',
      ciudadId: ssot.ciudadId || '',
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
    const pasoPack = ctx.fbUser ? '2' : '1';
    setStep(pasoPack);
    updateFlow({
      flowId: tokenInicial || crearFlowId(),
      origen: 'pack',
      cursoId: cursoEquilibrio.id,
      esPack: true,
      packId,
      esRecompra: false,
      esReintento: false,
      step: pasoPack,
      createdAt: Date.now()
    });
   }, [esPack, packId, ctx.cursos, ctx.packs, ctx.fbUser, ctx.user, updateForm, setStep, navigate, showToast, resetForm, updateFlow, esRecarga]);


  
useEffect(() => {
  if (!ctx.fbUser) return;
  const fechaAEscuchar = form.fecha1 || ctx.getTodayStr();
  // D1 + D2: el listener debe cubrir las dos fechas del curso.
  const fechasAEscuchar = [fechaAEscuchar, fecha2Calc].filter(Boolean);
  const cleanup = LockService.escucharOcupacionTemporal(fechasAEscuchar, (locks) => {
    setActiveLocks(locks);
  });
  return () => cleanup();
}, [form.fecha1, fecha2Calc, ctx.fbUser, ctx.getTodayStr]);

  // CAMBIO-DE-CONTEXTO-V2: si el estudiante vuelve al Paso 2 y cambia curso,
  // sede, tipo de moto o modalidad, la fecha anterior ya no es confiable.
  // Limpiar fecha/horario y liberar el lock evita que quede pegado el 22.
  useEffect(() => {
    const actual = {
      cursoId: form.cursoId || '',
      sedeId: form.sedeId || '',
      tipoMoto: form.tipoMoto || '',
      traeMoto: form.traeMoto || '',
      traeMotoPorCursoSerializado: serializeTraeMotoPorCurso(form.traeMotoPorCurso),
      packId: esPack ? (packId || null) : null
    };
    const anterior = contextoDisponibilidadRef.current;
    contextoDisponibilidadRef.current = actual;
    if (!anterior) return;

    const cambio = Object.keys(actual).some(k => String(anterior[k]) !== String(actual[k]));
    if (!cambio) return;

    const teniaSeleccion = Boolean(form.fecha1 || form.horaId || lockId);
    if (lockId) {
      LockService.liberarLock(lockId).catch(() => {});
      limpiarLockPropioOptimista(lockId);
      updateLockId(null);
      updateLockExpiresAt(null);
      setTiempoRestante(null);
    }
    updateForm({ fecha1: '', horaId: '', instructorId: '', motoAsignadaId: '', proveedorId: null });
    sessionStorage.removeItem(LOCK_CONTEXT_KEY);
    if (teniaSeleccion) {
      showToast('Actualizaste tu configuración. Elige nueva fecha y horario.', 'info');
    }
  }, [form.cursoId, form.sedeId, form.tipoMoto, form.traeMoto, form.traeMotoPorCurso, esPack, packId, lockId]);

  // LOCK-RESTORE-V1: al recargar Paso 3, el lock de sessionStorage puede estar
  // vencido o pertenecer a otro contexto. Validarlo antes de permitir pagar.
  useEffect(() => {
    if (step !== '3') return;
    if (!ctx.fbUser?.uid || !lockId) return;
    if (lockValidadoRef.current === lockId) return;
    lockValidadoRef.current = lockId;
    let cancelled = false;

    const validar = async () => {
      const resultado = await LockService.validarLockVigente(lockId, {
        userId: ctx.fbUser.uid,
        fecha: form.fecha1,
        horaId: form.horaId
      });
      if (cancelled) return;

      if (resultado.success) {
        const expiresAt = resultado.data?.expiresAt?.toMillis?.();
        if (expiresAt) updateLockExpiresAt(expiresAt);
        return;
      }

      await LockService.liberarLock(lockId).catch(() => {});
      if (cancelled) return;
      limpiarLockPropioOptimista(lockId);
      updateLockId(null);
      updateLockExpiresAt(null);
      setTiempoRestante(null);
      setRenovacionUsada(false);
      updateForm({ horaId: '', instructorId: '', motoAsignadaId: '', proveedorId: null });
      sessionStorage.removeItem(LOCK_CONTEXT_KEY);
      showToast('Tu bloqueo de horario expiró o ya no es válido. Elige otro bloque.', 'info');
    };

    validar();
    return () => { cancelled = true; };
  }, [ctx.fbUser?.uid, lockId]);

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

    // Si la fecha cambió por auto-jump, no la interpretamos como una
    // selección manual ni liberamos un lock que no existe (guard arriba).
    if (isAutoJumpRef.current) {
      isAutoJumpRef.current = false;
      return;
    }

    // Fecha elegida por el usuario: no permitir que un auto-jump posterior
    // la reemplace, aunque un snapshot transitorio la marque ocupada.
    fechaRestauradaRef.current = false;
    fechaManualRef.current = Boolean(fechaActual);
    autoJumpIntentosRef.current = 0;
    autoJumpAvisoRef.current = false;

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
    showToast('Actualizaste tu configuración. Elige un nuevo horario.', 'info');
  }, [step, lockId, form.horaId, lockContext, limpiarLockPropioOptimista, updateLockId, updateLockExpiresAt, updateForm, showToast]);

    useEffect(() => {
    if (step === '3' && !ctx.fbUser) {
      showToast('Tu sesión ha expirado. Inicia sesión nuevamente.', 'error');
      if (ctx.logoutUser) ctx.logoutUser();
      navigate('/login');
    }
  }, [step, ctx.fbUser, ctx.logoutUser, showToast, navigate]);

 

  // ─── Cálculo de disponibilidad ────────────────────────
  const { bloqueos: bloqueosProveedor, cargando: cargandoProveedor } = useBloqueosProveedorEstado(form.fecha1, step === '3', fecha2Calc);
  const { bloqueos: bloqueosAdmin, cargando: cargandoBloqueos } = useBloqueosAdmin(step === '3');
  // FEATURE-BLOQUEOS-INSTRUCTORES: carga TODOS los bloqueos activos.
  // El filtro por fecha + instructor + hora lo hace afectaInstructor.
  const { bloqueos: bloqueosInstructor, cargando: cargandoInstructor } = useBloqueosInstructor(step === '3');
  const sedeSeleccionada = (ctx.sedes || []).find(s => String(s.id) === String(form.sedeId));

 
const disponibilidad = useMemo(() => {
  if (!ctx.instructores?.length || !ctx.motos?.length || !ctx.horarios?.length) return null;
 return evaluarDisponibilidad({
    form, horarios: ctx.horarios, instructores: ctx.instructores, motos: ctx.motos,
    proveedoresPublicos: ctx.proveedoresPublicos || [],
    reservasConfirmadas: ocupacionConfirmada, activeLocks: activeLocks || [], selectingBlockId,
    currentUserId: ctx.fbUser?.uid, todayStr, lockId, bloqueosProveedor, cursoUnDia, cursoSeleccionado, sedeSeleccionada, bloqueosAdmin, bloqueosInstructor
  });
}, [form, ctx.horarios, ctx.instructores, ctx.motos, ctx.proveedoresPublicos, ocupacionConfirmada, activeLocks, selectingBlockId, ctx.fbUser?.uid, todayStr, lockId, clockTick, bloqueosProveedor, cursoUnDia, cursoSeleccionado, sedeSeleccionada, bloqueosAdmin, bloqueosInstructor]);

  // Solo presentación: agrega rol D1/D2 sobre la disponibilidad ya calculada.
  // No modifica diasDisponibles ni el auto-jump.
  const diasDisponiblesUI = useMemo(
    () => enriquecerDiasConRoles(disponibilidad?.diasDisponibles || [], { esCursoDosDias: !cursoUnDia }),
    [disponibilidad, cursoUnDia]
  );

  useEffect(() => {
    if (step !== '3') return;
    if (cargandoBloqueos || cargandoProveedor || cargandoInstructor) return;
    if (cargandoOcupacion) return;

    // Si el bloque ya seleccionado se invalida (bloqueo admin/proveedor,
    // instructor o moto), no dejamos continuar con un lock obsoleto.
    if (!isSelectingHorario && form.horaId) {
      const bloqueActual = disponibilidad?.bloques?.find(b => b.id === form.horaId);
      if (bloqueActual && !bloqueActual.disponible) {
        if (lockId) {
          LockService.liberarLock(lockId).catch(() => {});
          limpiarLockPropioOptimista(lockId);
        }
        updateLockId(null);
        updateLockExpiresAt(null);
        setTiempoRestante(null);
        setRenovacionUsada(false);
        setSelectingBlockId(null);
        updateForm({ horaId: '', instructorId: '', motoAsignadaId: '', proveedorId: null });
        sessionStorage.removeItem(LOCK_CONTEXT_KEY);
        showToast('El horario que habías seleccionado ya no está disponible. Elige otro bloque.', 'error');
        return;
      }
    }

    // No mover una fecha con un lock ya tomado: el usuario está en el
    // punto de no retorno y el auto-jump podría liberar su selección.
    if (lockId || form.horaId || isSelectingHorario) return;

    // ALT-4 (FIX-HUEVO-GALLINA): esperar a que la ocupación esté sincronizada
    // con la fecha actual. Si form.fecha1 está seteado pero fechaConsultada
    // todavía no coincide, la disponibilidad fue calculada con datos stale.
    if (form.fecha1 && fechaConsultada !== form.fecha1) return;

    // ALT-5 acotada: si la fecha actual quedó inválida (todos los bloques
    // sin disponibilidad), re-elegir. Agnóstico al origen: si el usuario
    // eligió una fecha que se volvió inválida, el sistema la corrige.
    // AUTO-JUMP-SOLO-INICIAL: una fecha restaurada o elegida manualmente no
    // se mueve. Si quedó inválida, la cinta la muestra deshabilitada y el
    // usuario decide. El auto-jump solo corrige una fecha generada por el
    // propio sistema cuando aún no había selección manual.
    if (form.fecha1 && (fechaRestauradaRef.current || fechaManualRef.current)) return;

    // Para fechas generadas por auto-jump, mantener una fecha válida.
    if (form.fecha1) {
      const infoFecha = disponibilidad?.diasDisponibles?.find(d => d.fecha === form.fecha1);
      if (infoFecha?.disponible) return;
    }

    if (!disponibilidad?.diasDisponibles?.length) return;
    const primerDiaLibre = disponibilidad.diasDisponibles.find(dia => dia.disponible);
    if (!primerDiaLibre) {
      if (!autoJumpAvisoRef.current) {
        autoJumpAvisoRef.current = true;
        showToast('No hay fechas disponibles en este momento. Intenta más tarde.', 'info');
      }
      return;
    }
    if (primerDiaLibre.fecha === form.fecha1) return;

    // Freno táctico (INC-2026-11-17): máximo de saltos encadenados.
    // Sin esto, una fecha que se vuelve inválida mientras se recalcula
    // disponibilidad puede re-disparar el efecto indefinidamente.
    if (autoJumpIntentosRef.current >= MAX_AUTOJUMPS) {
      if (!autoJumpAvisoRef.current) {
        autoJumpAvisoRef.current = true;
        showToast('No pudimos encontrar una fecha estable. Elige una fecha manualmente.', 'info');
      }
      return;
    }

    isAutoJumpRef.current = true;
    autoJumpIntentosRef.current += 1;
    updateForm({ fecha1: primerDiaLibre.fecha });
  }, [step, form.fecha1, form.horaId, lockId, isSelectingHorario, disponibilidad, updateForm, updateLockId, updateLockExpiresAt, limpiarLockPropioOptimista, todayStr, cargandoBloqueos, cargandoProveedor, cargandoInstructor, cargandoOcupacion, fechaConsultada, showToast]);

    
  // Fase 3 Pack: cuando es pack, el precio total se calcula desde packActivo
  const packPrecioBase = useMemo(() => {
    if (!esPack || !packActivo) return 0;
    if (packActivo.precios?.precioBaseTotal != null) return Number(packActivo.precios.precioBaseTotal);
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
    if (packActivo.precios?.descuentoMonto != null) return Number(packActivo.precios.descuentoMonto);
    return packActivo.descuentoTipo === 'porcentaje'
      ? (packPrecioBase * (Number(packActivo.descuentoValor) || 0)) / 100
      : (Number(packActivo.descuentoValor) || 0);
  }, [esPack, packActivo, packPrecioBase]);

  const packPrecioFinal = packActivo?.precios?.precioTotal != null
    ? Number(packActivo.precios.precioTotal)
    : Math.max(0, packPrecioBase - packDescuentoMonto);

  const sedeActual = (ctx.sedes || []).find(s => String(s.id) === String(form.sedeId));
  // ERR-053 / ADR-017: el pack suma el recargo de la sede elegida por cada
  // sesión práctica, después del descuento del pack.
  const packSesiones = esPack && packActivo ? (packActivo.cursoIds || []).length : 0;
  const recargoPack = calcularRecargoSedePack({
    sesiones: packSesiones,
    recargoSede: esPack ? sedeActual?.recargo : 0,
  });
  const recargoSedeUnitarioPack = recargoPack.recargoSedeUnitario;
  const recargoSedeTotalPack = recargoPack.recargoSedeTotal;
  const packPrecioFinalConRecargo = Number((packPrecioFinal + recargoSedeTotalPack).toFixed(2));

  // Precio individual: mismo cálculo puro que usa ReservaService (SSOT + snapshot).
  const precioIndividualSnapshot = useMemo(() => {
    if (esPack || !cursoSeleccionado) return null;
    try {
      return calcularPrecioIndividual({
        curso: cursoSeleccionado,
        config: ctx.config,
        sede: sedeActual,
        sedeId: form.sedeId,
        sabeBicicleta: form.sabeBicicleta,
        traeMoto: form.traeMoto
      });
    } catch (error) {
      console.warn('[InscripcionView] No se pudo calcular el precio individual:', error.message);
      return null;
    }
  }, [esPack, cursoSeleccionado, ctx.config, sedeActual, form.sedeId, form.sabeBicicleta, form.traeMoto]);

  const baseUSD = precioIndividualSnapshot?.precioTotal
    ?? ctx.calcularBaseUSD(form.sedeId, form.sabeBicicleta, form.traeMoto, cursoSeleccionado);

  // Precio efectivo a cobrar (pack o curso individual)
  const baseUSDFinal = esPack ? packPrecioFinalConRecargo : baseUSD;

  const precioBaseMostrar = esPack
    ? packPrecioFinal
    : (cursoSeleccionado?.precioBase ?? ctx.config.precioBase ?? 0);
  const recargoSede = precioIndividualSnapshot?.recargoSede
    ?? (Number(sedeActual?.recargo) || 0);
  const recargoSinBici = precioIndividualSnapshot?.recargoSinBici
    ?? (form.sabeBicicleta === 'No' ? (Number(ctx.config.recargoSinBici) || 0) : 0);
  const descuentoMotoPropia = precioIndividualSnapshot?.descuentoMotoPropia
    ?? (form.traeMoto === 'Sí' ? (Number(ctx.config.descuentoMotoPropia) || 0) : 0);
  const descuentoPromo = precioIndividualSnapshot?.descuentoPromo
    ?? (Number(ctx.config.descuentoPromo) || 0);
  const recargoAlquilerMoto = precioIndividualSnapshot?.recargoAlquilerMoto
    ?? ((form.traeMoto !== 'Sí' && cursoSeleccionado?.motoIncluida !== false)
      ? (Number(cursoSeleccionado?.precioAlquilerMoto) || 0)
      : 0);
  const tasaCobro = ctx.config.monedaCobroClientes === 'USD' ? ctx.config.tasaUSD : ctx.config.tasaEUR;
  const precioFinalVES = esPack
    ? (baseUSDFinal * (Number(tasaCobro) || 1)).toFixed(2)
    : (precioIndividualSnapshot?.pagoTotalVES ?? (baseUSDFinal * (Number(tasaCobro) || 1))).toFixed(2);
  const fechaNacimiento = (form.diaNac && form.mesNac && form.anoNac) ? form.anoNac + '-' + String(form.mesNac).padStart(2,'0') + '-' + String(form.diaNac).padStart(2,'0') : '';

    const handleConfirmarPago = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) { showToast('Error: Sesión no encontrada. Recarga la página.', 'error'); return; }
    if (!lockId) { showToast('Error: No se encontró el bloqueo del horario.', 'error'); return; }
    // Freno de doble submit: el primer clic es el único que puede iniciar
    // la transacción, aunque el botón reciba un doble tap/click.
    if (submitEnCursoRef.current) return;
    submitEnCursoRef.current = true;
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
    const { esRecompra: _esRecompra, ...restoForm } = form;
    // FT-048: los IDs/nombres del catálogo mandan; si el formulario venía de un
    // registro legacy se reconstruye la cadena por nombre antes de guardar.
    const ubicacionEnvio = resolverUbicacionInscripcion(form, {
      estados: ctx.estados,
      municipios: ctx.municipios,
      ciudades: ctx.ciudades
    });
    const formLimpio = { ...restoForm, ...ubicacionEnvio };
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
        sexo: formLimpio.sexo,
        estado: formLimpio.estado,
        estadoId: formLimpio.estadoId,
        municipio: formLimpio.municipio,
        municipioId: formLimpio.municipioId,
        ciudad: formLimpio.ciudad,
        ciudadId: formLimpio.ciudadId,
        zona: formLimpio.zona,
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
      pagoTotalMoneda: precioIndividualSnapshot?.precioTotal ?? baseUSD,
      pagoTotalVES: precioIndividualSnapshot?.pagoTotalVES ?? parseFloat(precioFinalVES),
      proveedorId: form.proveedorId || null,
      tipoCurso: cursoSeleccionado?.tipoCurso || null,
      terminosAceptados: true,
      fechaAceptacionTerminos: new Date().toISOString(),
      pin: pinParaMostrar,
        // A2.6: trazabilidad del origen de la inscripción para métricas
      origenReinscripcion: esRecompra ? 'recompra' : (esReintento ? 'reintento' : 'nueva')
      }, lockId);
    }

    setIsSubmitting(false);
    submitEnCursoRef.current = false;

    if (result.success) {
      // FT-058: la movilidad se registra aparte y se paga directo al prestador.
      // Si falla, la reserva queda creada. El aviso se unifica con el del pago
      // para no tapar el mensaje de éxito con dos toasts consecutivos.
      let movilidadAviso = null;
      let movilidadSinHora = false;
      const fecha2Sesion = disponibilidad?.fecha2Calc || fecha2Calc || null;
      if (!esPack && !esRecompra && form.movilidadSolicitada === true && result.data?.id && form.movilidadSnapshot) {
        const horarioD1 = (ctx.horarios || []).find(h => String(h.id) === String(form.horaId));
        const horaInicioD1 = horaInicioDesdeHorario(horarioD1);
        movilidadSinHora = !horaInicioD1;
        const dias = diasSolicitudMovilidad({
          fecha1: form.fecha1,
          fecha2: fecha2Sesion,
          d2Solicitada: form.movilidadD2Solicitada === true,
          cursoUnDia,
        });
        try {
          let todasOk = true;
          for (const dia of dias) {
            const movRes = await MovilidadService.crearSolicitud({
              userId: uid,
              reservaId: result.data.id,
              fechaSesion: dia.fechaSesion,
              dia: dia.dia,
              horaId: form.horaId,
              horaInicio: horaInicioD1,
              sedeId: form.sedeId,
              pin: form.movilidadPin,
              direccion: form.movilidadDireccion || '',
              distanciaKm: form.movilidadDistanciaKm,
              snapshot: form.movilidadSnapshot,
              autorizacion: {
                aceptada: true,
                version: MOVILIDAD_AUTORIZACION_VERSION,
                aceptadaEn: new Date().toISOString(),
              },
              nombreEstudiante: `${form.nombre || ''} ${form.apellido || ''}`.trim(),
              telefonoEstudiante: form.telefono || '',
            });
            if (!movRes.success) todasOk = false;
          }
          movilidadAviso = todasOk ? 'ok' : 'error';
        } catch {
          movilidadAviso = 'error';
        }
      } else if (esPack && form.movilidadSolicitada === true && result.data?.id) {
        // FT-090: la primera sesión del pack captura su propia ubicación y
        // tarifa en el paso 2. Sin snapshot válido no se inventa nada.
        if (
          !form.movilidadPin ||
          !form.movilidadSnapshot ||
          !(form.movilidadSnapshot.montoUSD > 0) ||
          form.movilidadAutorizacion !== true
        ) {
          movilidadAviso = 'error';
        } else {
          try {
            const horarioD1 = (ctx.horarios || []).find(h => String(h.id) === String(form.horaId));
            const horaInicioD1 = horaInicioDesdeHorario(horarioD1);
            movilidadSinHora = !horaInicioD1;
            const dias = diasSolicitudMovilidad({
              fecha1: form.fecha1,
              fecha2: fecha2Sesion,
              d2Solicitada: form.movilidadD2Solicitada === true,
              cursoUnDia,
            });
            let todasOk = true;
            for (const dia of dias) {
              const movRes = await MovilidadService.crearSolicitud({
                userId: uid,
                reservaId: result.data.id,
                childId: result.data.id,
                fechaSesion: dia.fechaSesion,
                dia: dia.dia,
                horaId: form.horaId,
                horaInicio: horaInicioD1,
                sedeId: form.sedeId,
                pin: form.movilidadPin,
                direccion: form.movilidadDireccion || '',
                distanciaKm: form.movilidadDistanciaKm,
                snapshot: form.movilidadSnapshot,
                autorizacion: {
                  aceptada: true,
                  version: MOVILIDAD_AUTORIZACION_VERSION,
                  aceptadaEn: new Date().toISOString(),
                },
                nombreEstudiante: `${form.nombre || ''} ${form.apellido || ''}`.trim(),
                telefonoEstudiante: form.telefono || '',
              });
              if (!movRes.success) todasOk = false;
            }
            movilidadAviso = todasOk ? 'ok' : 'error';
          } catch {
            movilidadAviso = 'error';
          }
        }
      }

      if (movilidadAviso === 'ok') {
        setRecordatorioMovilidad({
          montoUSD: Number(form.movilidadMontoUSD) || 0,
          montoVES: Number(form.movilidadSnapshot?.montoVES) || 0,
          fechaSesion: form.fecha1 || '',
          fechaSesion2: form.movilidadD2Solicitada === true ? fecha2Sesion : null,
          sinHora: movilidadSinHora,
        });
      }

      const mensajeReserva = esPack
        ? (form.movilidadSolicitada === true && movilidadAviso === 'error'
          ? 'Pack adquirido correctamente, pero la movilidad de la primera sesión no se registró. Escríbenos por WhatsApp.'
          : 'Pack adquirido correctamente. Gestiónalo desde tu portal.')
        : movilidadAviso === 'ok'
          ? 'Reserva creada correctamente. Solicitud de movilidad registrada; el prestador te contactará.'
          : movilidadAviso === 'error'
            ? 'Reserva creada correctamente, pero la movilidad no se registró. Escríbenos por WhatsApp.'
            : 'Reserva creada correctamente.';
      const tipoToastReserva = movilidadAviso === 'error' ? 'warning' : 'success';

      if (esRecompra) {
        showToast(mensajeReserva, 'success');
        limpiarSesion();
        navigate('/portal-reservas');
        return;
      }

      // FIX-PACK-LOGUEADO-PIN: usuario logueado SIN PIN → redirect directo
      // Usuario nuevo (aunque esté logueado tras crear cuenta) → sí necesita ver PIN
      if (ctx.fbUser && !pinParaMostrar) {
        showToast(mensajeReserva, tipoToastReserva);
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
      // Un solo mensaje: reserva + movilidad, sin tapar la pantalla de éxito.
      showToast(mensajeReserva, tipoToastReserva);

      console.log('[handleConfirmarPago] Pantalla de éxito mostrada con PIN:', pinParaMostrar ? 'SÍ' : 'NO');
    } else {
      const codigo = result.error?.code;
      const requiereNuevoHorario = ['slot-occupied', 'lock-expired', 'lock-invalid', 'lock-mismatch', 'lock-resource-mismatch', 'lock-owner-mismatch'].includes(codigo);
      if (requiereNuevoHorario) {
        // El servicio ya liberó el lock o el lock ya no es utilizable.
        // Limpiamos el estado local y volvemos al Paso 3.
        if (codigo === 'lock-expired' || codigo === 'lock-invalid') {
          LockService.liberarLock(lockId).catch(() => {});
        }
        limpiarLockPropioOptimista(lockId);
        updateLockId('');
        updateLockExpiresAt(null);
        setRenovacionUsada(false);
        setIsSelectingHorario(false);
        setSelectingBlockId(null);
        sessionStorage.removeItem(LOCK_CONTEXT_KEY);
        updateForm({ horaId: '', instructorId: '', motoAsignadaId: '', proveedorId: null });
        setStep('3');
        showToast(result.error.message || 'Ese horario acaba de ser ocupado. Elige otro bloque.', 'error');
      } else if (codigo === 'invalid-data') {
        showToast(result.error.message || 'Datos inválidos', 'error');
      } else if (codigo === 'price-changed') {
        ctx.refreshCatalogos?.().catch(() => {});
        showToast(result.error.message || 'El precio del curso cambió. Revisa el monto y confirma de nuevo.', 'error');
      } else {
        showToast(result.error.message || 'Error al crear la reserva', 'error');
      }
    }
    }, [lockId, form, disponibilidad, fechaNacimiento, baseUSD, baseUSDFinal, precioFinalVES, precioIndividualSnapshot, limpiarSesion, showToast, generatedPin, esRecompra, esReintento, esPack, packActivo, ctx.cursos, ctx.refreshCatalogos, navigate, updateForm, updateLockId, updateLockExpiresAt, limpiarLockPropioOptimista, setStep]);
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
    if (isSelectingHorario || selectingHorarioRef.current) return;
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
  // PROVEEDOR-INACTIVO: mismo filtro puro que la disponibilidad; evita que el
  // handler elija una moto que la grilla ya no ofrece.
  motosLibres = filtrarMotosProveedorActivo(ctx.motos, ctx.proveedoresPublicos)
    .filter(m => m.activo && m.tipo === form.tipoMoto && (m.sedes || []).includes(form.sedeId))
    .filter(m => !locksDeOtros.some(lock => lock.motoAsignadaId === m.id && lock.horaId === bloque.id && (lock.fecha === form.fecha1 || (disponibilidad?.fecha2Calc && lock.fecha === disponibilidad.fecha2Calc))))    .filter(m => !reservasDeOtros.some(r => {
      if (r.estadoPago !== 'Pendiente' && r.estadoPago !== 'Aprobado') return false;
      if (r.motoAsignadaId !== m.id) return false;
      if (r.traeMoto === 'Sí') return false;
      if (String(r.horaId) !== String(bloque.id)) return false;
      return r.fecha === form.fecha1 || (disponibilidad?.fecha2Calc && r.fecha === disponibilidad.fecha2Calc) || r.fecha2 === form.fecha1 || (disponibilidad?.fecha2Calc && r.fecha2 === disponibilidad.fecha2Calc);    }))
    // SSOT-BLOQUEOS: filtrar motos bloqueadas por proveedor (fecha1 y fecha2).
    .filter(m => !(bloqueosProveedor || []).some(b =>
      afectaProveedor(b, m.id, form.fecha1, bloque.label, m.proveedorId) ||
      (disponibilidad?.fecha2Calc && afectaProveedor(b, m.id, disponibilidad.fecha2Calc, bloque.label, m.proveedorId))
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
          showToast('Tu configuración cambió. Elige un nuevo horario.', 'info');
          return;
        }
      }
    }

    const lockAnterior = lockId;
    selectingHorarioRef.current = true;
    setIsSelectingHorario(true); setSelectingBlockId(bloque.id);
    // Un estudiante solo puede mantener un bloque. Liberar SIEMPRE el anterior
    // (aunque ya haya renovado) evita locks huérfanos al cambiar de bloque y
    // que otros usuarios vean el cupo ocupado por un lock ya abandonado (ERR-010).
    if (lockAnterior) {
      await LockService.liberarLock(lockAnterior).catch(() => {});
      limpiarLockPropioOptimista(lockAnterior);
      updateLockId(null);
      updateLockExpiresAt(null);
      setTiempoRestante(null);
      updateForm({ horaId: '', instructorId: '', motoAsignadaId: '', proveedorId: null });
      sessionStorage.removeItem(LOCK_CONTEXT_KEY);
    }
    const nuevoLockId = form.fecha1 + '_' + bloque.id + '_' + instructorId + '_' + (motoAsignadaId || 'sinmoto');
    const result = await LockService.crearLock(nuevoLockId, ctx.fbUser.uid, {
      fecha: form.fecha1,
      horaId: bloque.id,
      instructorId,
      motoAsignadaId,
      // ERR-048: el lock debe retener D1+D2; misma fecha2 que usará la reserva.
      fecha2: disponibilidad?.fecha2Calc || null,
      horaId2: bloque.id
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
      // El lock anterior ya se liberó: limpiar selección y temporizador para no
      // dejar la UI apuntando a un bloque que ya no está separado (ERR-010).
      updateLockId(null);
      updateLockExpiresAt(null);
      setTiempoRestante(null);
      setRenovacionUsada(false);
      updateForm({ horaId: '', instructorId: '', motoAsignadaId: '', proveedorId: null });
      sessionStorage.removeItem(LOCK_CONTEXT_KEY);
      if (codigo === 'lock-owner-mismatch' || codigo === 'lock-taken') showToast('Este horario acaba de ser separado por otro usuario.', 'error');
      else if (codigo === 'lock-own-active') showToast('Ya tienes este horario separado. Continúa con el pago o espera a que expire.', 'info');
      else if (codigo === 'permission-denied') showToast('No pudimos separar el horario. Revisa tu sesión o intenta de nuevo.', 'error');
      else if (codigo === 'network-error' || codigo === 'unavailable') showToast('Error de conexión. Intente de nuevo.', 'error');
      else showToast(result.error?.message || 'No se pudo bloquear el horario', 'error');
    }
    selectingHorarioRef.current = false;
    setIsSelectingHorario(false); setSelectingBlockId(null);
  }, [lockId, form, disponibilidad, ctx, isSelectingHorario, activeLocks, bloqueosAdmin, bloqueosProveedor, bloqueosInstructor, updateLockId, updateForm, updateLockExpiresAt, showToast]);
  const handleRenovarLock = useCallback(async () => {
    if (!lockId || renovacionUsada) return;
    const bloqueActual = (disponibilidad?.bloques || []).find(b => b.id === form.horaId)
      || (ctx.horarios || []).find(h => h.id === form.horaId);
    // ERR-051: no se renueva un bloque que ya inició; se libera y se limpia.
    if (bloqueYaInicio(form.fecha1, bloqueActual?.label)) {
      await LockService.liberarLock(lockId).catch(() => {});
      limpiarLockPropioOptimista(lockId);
      updateLockId(null); updateLockExpiresAt(null); setTiempoRestante(null);
      updateForm({ horaId: '', instructorId: '', motoAsignadaId: '', proveedorId: null });
      setRenovacionUsada(false);
      showToast('Ese horario ya comenzó. Elige otro bloque.', 'info');
      return;
    }
    setRenovacionUsada(true);
    const result = await LockService.renovarLock(lockId);
    if (result.success) {
      updateLockExpiresAt(Date.now() + LOCK_DURATION - 10000);
      showToast('Tiempo renovado. Tienes 10 minutos adicionales.', 'success');
    } else showToast(result.error.message || 'No se pudo renovar el tiempo', 'error');
  }, [lockId, renovacionUsada, disponibilidad, form.fecha1, form.horaId, ctx.horarios, limpiarLockPropioOptimista, updateLockId, updateLockExpiresAt, updateForm, showToast]);

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

      // FT-058: si pidió movilidad, exige pin, cotización y autorización.
      if (form.traeMoto === 'Sí' && form.movilidadSolicitada === true) {
        if (!form.movilidadPin || !Number.isFinite(Number(form.movilidadPin.lat)) || !Number.isFinite(Number(form.movilidadPin.lng))) {
          showToast('Marca tu ubicación de recogida en el mapa', 'error');
          return;
        }
        if (!(Number(form.movilidadMontoUSD) > 0) || !form.movilidadSnapshot) {
          showToast('No pudimos cotizar la movilidad. Revisa la sede o tu ubicación', 'error');
          return;
        }
        if (form.movilidadAutorizacion !== true) {
          showToast('Debes aceptar la autorización para que un prestador conduzca tu moto', 'error');
          return;
        }
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
      // ERR-051: no renovar ni avanzar con un bloque que ya inició.
      const bloqueActual = (disponibilidad?.bloques || []).find(b => b.id === form.horaId)
        || (ctx.horarios || []).find(h => h.id === form.horaId);
      if (bloqueYaInicio(form.fecha1, bloqueActual?.label)) {
        await LockService.liberarLock(lockId).catch(() => {});
        limpiarLockPropioOptimista(lockId);
        updateLockId(null); updateLockExpiresAt(null); setTiempoRestante(null);
        updateForm({ horaId: '', instructorId: '', motoAsignadaId: '', proveedorId: null });
        setRenovacionUsada(false);
        showToast('Ese horario ya comenzó. Elige otro bloque.', 'info');
        return;
      }
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


      // T-163: Turnstile cuando responde; si falla, suma legada en el paso 4.
      const usarSumaCaptcha = !CAPTCHA.real || captchaFallback;
      if (!usarSumaCaptcha) {
        if (captchaEnCursoRef.current) return;
        captchaEnCursoRef.current = true;
        try {
          let token = '';
          try {
            token = await captchaRef.current?.solicitarToken();
          } catch {
            token = '';
          }
          if (!token) {
            setCaptchaFallback(true);
            showToast('No pudimos verificar con Cloudflare. Resuelve la suma para continuar.', 'info');
            return;
          }
          const verificacion = await verificarCaptcha(token, { verifyUrl: CAPTCHA.verifyUrl });
          if (!verificacion.ok) {
            if (verificacion.motivo === 'red' || verificacion.motivo === 'sin_configuracion') {
              setCaptchaFallback(true);
              showToast('No pudimos verificar con Cloudflare. Resuelve la suma para continuar.', 'info');
              return;
            }
            showToast(mensajeCaptcha(verificacion.motivo), 'error');
            captchaRef.current?.reiniciar();
            return;
          }
        } finally {
          captchaEnCursoRef.current = false;
        }
      } else if (captchaValue !== String(captchaA + captchaB)) {
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
          {recordatorioMovilidad && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8 w-full max-w-xs text-left">
              <p className="text-sm font-bold text-blue-800">Movilidad solicitada</p>
              <p className="mt-1 text-[11px] leading-relaxed text-blue-700">
                {recordatorioMovilidad.montoUSD > 0 ? `USD ${recordatorioMovilidad.montoUSD.toFixed(2)}` : ''}
                {recordatorioMovilidad.montoVES > 0 ? ` · Bs ${recordatorioMovilidad.montoVES.toFixed(2)}` : ''}
                . Se paga directo al prestador; te contactará para coordinar la recogida.
                {recordatorioMovilidad.fechaSesion2 ? ' Incluye el segundo día (D2).' : ''}
              </p>
              {recordatorioMovilidad.sinHora && (
                <p className="mt-1 text-[11px] font-semibold text-amber-700">
                  No pudimos calcular la hora de recogida: el bloque no tiene hora de inicio legible. Te contactaremos para confirmarla.
                </p>
              )}
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
            esCursoDosDias={!cursoUnDia}
            fecha2Calc={disponibilidad?.fecha2Calc || fecha2Calc || null}
          />
        ) : (
                    <Paso2Configuracion form={form} updateForm={updateForm} cursos={ctx.cursos} sedes={ctx.sedes} recargoSinBici={ctx.config.recargoSinBici} reservas={ctx.reservas} fbUser={ctx.fbUser} esCursoDosDias={!cursoUnDia} fecha2Calc={disponibilidad?.fecha2Calc || fecha2Calc || null} />
        ))}        {step === '3' && !ctx.fbUser ? (
  <div className="flex-1 flex items-center justify-center"><Spinner message="Verificando sesión..." /></div>
) : step === '3' && (!ctx.instructores?.length || !ctx.motos?.length || !ctx.horarios?.length || cargandoBloqueos || cargandoProveedor || cargandoInstructor) ? (
  <div className="flex-1 flex items-center justify-center"><Spinner message="Sincronizando disponibilidad..." /></div>
) : (
  step === '3' && disponibilidad && (
            <Paso3Horario
              form={form} updateForm={updateForm}
              diasDisponibles={diasDisponiblesUI} bloques={disponibilidad.bloques}
              onSelectHorario={handleSelectHorario} onMostrarCalendario={() => setMostrarCalendario(true)}
              isSelectingHorario={isSelectingHorario} selectingBlockId={selectingBlockId}
              fbUser={ctx.fbUser} lockId={lockId}
              recursosListos={ctx.instructores?.length > 0 && ctx.motos?.length > 0}
              showToast={showToast} cargando={!ctx.instructores?.length || !ctx.motos?.length || !ctx.horarios?.length}
              cursoNombre={(ctx.cursos || []).find(c => String(c.id) === String(form.cursoId))?.nombre || 'Curso'}
              sedeNombre={formatearSede((ctx.sedes || []).find(s => String(s.id) === String(form.sedeId)), {
                catalogos: { estados: ctx.estados, municipios: ctx.municipios, ciudades: ctx.ciudades },
              })}
              tipoMoto={form.tipoMoto}
              traeMoto={form.traeMoto}
              esCursoDosDias={!cursoUnDia}
              fecha2Calc={disponibilidad.fecha2Calc}
            />
          )
        )}
        {step === '4' && <Paso4Pago form={form} updateForm={updateForm} precioFinalVES={precioFinalVES} baseUSD={baseUSDFinal} precioCurso={precioBaseMostrar} tasaCobro={tasaCobro} monedaCobroClientes={ctx.config.monedaCobroClientes} config={ctx.config} 
 desglosePrecio={() => {
  if (esPack && packActivo) {
    const preciosSnapshot = packActivo.precios;
    const baseSesionesPack = preciosSnapshot?.baseSesiones ?? (packActivo.cursoIds || []).reduce((acc, cid) => {
      const c = (ctx.cursos || []).find(x => String(x.id) === String(cid));
      return acc + (Number(c?.precioBase) || 0);
    }, 0);
    const baseTeoricosPack = preciosSnapshot?.baseTeoricos ?? (packActivo.sumarTeoricosAlPrecio
      ? (packActivo.cursosTeoricosIncluidos || []).reduce((acc, ctId) => {
          const ct = (ctx.cursosTeoricos || []).find(x => String(x.id) === String(ctId));
          return acc + (Number(ct?.precio) || 0);
        }, 0)
      : 0);
    const items = [
      { label: 'Suma de sesiones', value: '$' + Number(baseSesionesPack).toFixed(2) }
    ];
    if (baseTeoricosPack > 0) {
      items.push({ label: 'Módulos formativos', value: '$' + Number(baseTeoricosPack).toFixed(2) });
    }
    const descTipo = preciosSnapshot?.descuentoTipo ?? packActivo.descuentoTipo;
    const descValor = preciosSnapshot?.descuentoValor ?? packActivo.descuentoValor;
    const descLabel = descTipo === 'porcentaje'
      ? `Descuento (${descValor}%)`
      : 'Descuento';
    if (packDescuentoMonto > 0) {
      items.push({ label: descLabel, value: '-$' + packDescuentoMonto.toFixed(2) });
    }
    if (recargoSedeTotalPack > 0) {
      items.push({
        label: `Recargo sede (${packSesiones} × $${recargoSedeUnitarioPack.toFixed(2)})`,
        value: '+$' + recargoSedeTotalPack.toFixed(2)
      });
    }
    items.push({ label: 'Total USD', value: '$' + packPrecioFinalConRecargo.toFixed(2), bold: true });
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
 lockId={lockId} step={step} lockTimer={<LockTimerFlotante tiempoRestante={tiempoRestante} renovacionUsada={renovacionUsada} onRenovarLock={handleRenovarLock} />} mostrarDetallesPago={mostrarDetallesPago} onToggleDetalles={() => setMostrarDetallesPago(!mostrarDetallesPago)} captchaA={captchaA} captchaB={captchaB} captchaValue={captchaValue} onCaptchaChange={(e) => setCaptchaValue(e.target.value.replace(/\D/g, '').slice(0, 2))} captchaRef={captchaRef} usarCaptchaReal={CAPTCHA.real && !captchaFallback} onCaptchaFallar={() => setCaptchaFallback(true)} captchaSiteKey={CAPTCHA.siteKey} showToast={showToast} terminosAceptados={terminosAceptados} onToggleTerminos={() => setTerminosAceptados(!terminosAceptados)} onVerTerminos={() => setMostrarTerminos(true)} mostrarTerminos={mostrarTerminos} onCerrarTerminos={() => setMostrarTerminos(false)} />}
      </div>
      {mostrarCalendario && <CalendarioFlotante ref={calendarioRef} form={form} updateForm={updateForm} diasDisponibles={diasDisponiblesUI} maxDate={disponibilidad?.maxDate || ''} mesCalendario={mesCalendario} setMesCalendario={setMesCalendario} onClose={() => setMostrarCalendario(false)} showToast={showToast} esCursoDosDias={!cursoUnDia} fecha2Calc={disponibilidad?.fecha2Calc || null} />}
      {mostrarFormularioSalud && <FormularioSalud form={form} updateForm={updateForm} onClose={() => setMostrarFormularioSalud(false)} />}
      {mostrarCalendarioNacimiento && <CalendarioNacimiento tempFechaNacimiento={tempFechaNacimiento} setTempFechaNacimiento={setTempFechaNacimiento} onConfirm={() => { updateForm({ diaNac: tempFechaNacimiento.dia, mesNac: tempFechaNacimiento.mes, anoNac: tempFechaNacimiento.ano }); setMostrarCalendarioNacimiento(false); }} onClose={() => setMostrarCalendarioNacimiento(false)} />}
      {modalLiberar && <ModalConfirmacion titulo="Liberar horario" mensaje="¿Deseas liberar este horario? Si lo haces, deberás seleccionar otro bloque para continuar." onConfirm={handleLiberarHorario} onCancel={() => setModalLiberar(null)} />}
      {mostrarModalExpiracion && <ModalExpiracion reintentosExpiracion={reintentosExpiracion} maxReintentos={MAX_REINTENTOS_EXPIRACION} onSeleccionarBloque={handleSeleccionarBloqueDesdeExpiracion} onSalirSistema={handleSalirDesdeExpiracion} />}
    </AppShell>
  );



};

export default InscripcionView;
