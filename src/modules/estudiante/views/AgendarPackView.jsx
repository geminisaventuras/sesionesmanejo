// @build: 2026-09-30 | id: LEGAL-TERMINOLOGIA-AGENDAR-PACK | desc: Página dedicada para agendar la siguiente sesión del pack
import { useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase';
import { AppContext } from '../../../context/AppContextValue';
import { ReservaService } from '../../inscripcion/services/ReservaService';
import { LockService } from '../../../services/LockService';
import { useDisponibilidadPack } from '../../inscripcion/hooks/useDisponibilidadPack';
import { useOcupacionConfirmadaRango } from '../../../hooks/useOcupacionConfirmadaRango';
import { useStableArray } from '../../../hooks/useStableArray';
import { useBloqueosProveedorEstado } from '../../../hooks/useBloqueosProveedor';
import { useBloqueosAdmin } from '../../../hooks/useBloqueosAdmin';
import { afectaFechaAdmin, afectaHorarioAdmin } from '../../shared/utils/bloqueosHelpers';
import { Paso3Horario } from '../../inscripcion/components/Paso3Horario';
import { CalendarioFlotante } from '../../inscripcion/components/CalendarioFlotante';
import { Spinner, Button } from '../../../components/UI';
import { useToast } from '../../shared/components/ToastProvider';
import AppShell from '../../shared/components/AppShell';
import DashboardHeader from '../../shared/components/DashboardHeader';
import DashboardFooter from '../../shared/components/DashboardFooter';
import { ArrowRight, Check, Package, Activity, BookOpen, Compass, Library, Settings, FileText } from 'lucide-react';
import { formatearSede } from '../../shared/utils/sedesHelpers';
import { enriquecerDiasConRoles } from '../../inscripcion/utils/disponibilidadRoles';
import { instructorPermitidoEnCurso } from '../../inscripcion/utils/instructoresPermitidos';
import { derivarTraeMotoPermitido } from '../../shared/utils/motoHelpers';
const APP_ID = 'motoescuela-pro-v1';
const LOCK_DURATION = 10 * 60 * 1000;
const MAX_AUTOJUMPS = 3;
const MAX_DIAS_RESERVA = 30;

export function AgendarPackView() {
  const { packReservaId } = useParams();
  const navigate = useNavigate();
  const ctx = useContext(AppContext);
  const { showToast } = useToast();
  const { cursos = [], sedes = [], instructores = [], motos = [], proveedoresPublicos = [], horarios = [], user, fbUser, logoutUser, notifications = [] } = ctx;

  const uid = fbUser?.uid || user?.uid;

  const [pack, setPack] = useState(null);
  const [childAnterior, setChildAnterior] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [estadoPagoError, setEstadoPagoError] = useState(null);

  const [fecha1, setFecha1] = useState('');
    const [horaId, setHoraId] = useState('');
  const [lockId, setLockId] = useState('');
  const [instructorId, setInstructorId] = useState('');
  const [motoAsignadaId, setMotoAsignadaId] = useState('');
  
  const [lockExpiresAt, setLockExpiresAt] = useState(null);
  const [selectingBlockId, setSelectingBlockId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeLocksRaw, setActiveLocks] = useState([]);
  const activeLocks = useStableArray(activeLocksRaw);
  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const [mesCalendario, setMesCalendario] = useState(() => new Date());
  const [tiempoRestante, setTiempoRestante] = useState(null);
  const todayStr = ctx.getTodayStr();
  const fechaFinRango = useMemo(() => {
    const d = new Date(todayStr + 'T12:00:00');
    d.setDate(d.getDate() + MAX_DIAS_RESERVA - 1);
    return d.toISOString().split('T')[0];
  }, [todayStr]);

  const { bloqueos: bloqueosAdmin, cargando: cargandoBloqueos } = useBloqueosAdmin(true);
  const calendarioRef = useRef(null);

  // Deriva cursoUnDia prematuramente para el hook de ocupación
  const cursoUnDiaPack = useMemo(() => {
    if (!pack) return false;
    const subA = (pack.subReservas || [])[pack.cursoActual];
    if (!subA) return false;
    const c = (cursos || []).find(x => String(x.id) === String(subA.cursoId));
    return (c?.duracionTotal || 240) <= 120;
  }, [pack, cursos]);

  // Ocupación confirmada (reservas reales de otros) para disponibilidad real
  const fecha2CalcOcupacion = useMemo(() => {
    if (!fecha1 || cursoUnDiaPack) return null;
    const d = new Date(fecha1 + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, [fecha1, cursoUnDiaPack]);

  // FIX-PROVEEDOR-D2: los bloqueos del proveedor deben incluir D1 y D2.
  const { bloqueos: bloqueosProveedor, cargando: cargandoProveedor } = useBloqueosProveedorEstado(fecha1, true, fecha2CalcOcupacion);

  const { ocupacion: ocupacionConfirmada, cargando: cargandoOcupacion, fechaConsultada } = useOcupacionConfirmadaRango({
    fechaInicio: todayStr,
    fechaFin: fechaFinRango,
    fecha: fecha1,
    limitDocs: 500
  });

  // ─── Cargar pack + child anterior (para datos personales) ───────
  useEffect(() => {
    if (!packReservaId || !uid) { setCargando(false); return; }
    let activo = true;
    const cargar = async () => {
      try {
        const packRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'reservasPack', packReservaId);
        const packSnap = await getDoc(packRef);
        if (!activo) return;
        if (!packSnap.exists) { setError('Pack no encontrado.'); setCargando(false); return; }
        const packData = { id: packSnap.id, ...packSnap.data() };
        if (String(packData.userId) !== String(uid)) {
          setError('No tienes acceso a este pack.'); setCargando(false); return;
        }
        
                // Validación de estadoPago (allowlist). Bloquea cualquier pack no aprobado.
        if (packData.estadoPago !== 'Aprobado') {
          const mensajes = {
            Pendiente: 'Tu pack está pendiente de aprobación. Espera a que el administrador verifique el pago.',
            Rechazado: 'Tu pack fue rechazado. Corrige la referencia de pago para continuar.',
            Cancelado: 'Tu pack fue cancelado. Contactá al administrador.'
          };
          setError(mensajes[packData.estadoPago] || 'Tu pack no tiene el pago aprobado.');
          setEstadoPagoError(packData.estadoPago);
          setCargando(false);
          return;
        }
        
        
        
        if (packData.estado !== 'activo') {
          setError('Este pack no está activo.'); setCargando(false); return;
        }
        const venc = packData.vencimiento?.toMillis?.() || 0;
        if (venc > 0 && venc < Date.now()) {
          setError('Tu pack está vencido. Contacta al administrador.'); setCargando(false); return;
        }

        // Child actual debe estar sin agendar
        const subActual = (packData.subReservas || [])[packData.cursoActual];
        if (!subActual) { setError('El pack está mal configurado.'); setCargando(false); return; }
        if (subActual.reservaId) { setError('Esta sesión ya tiene una fecha agendada.'); setCargando(false); return; }

        // Buscar cualquier child anterior para copiar datos personales
        const subConReserva = (packData.subReservas || []).find(s => s.reservaId);
        let childAnteriorData = null;
        if (subConReserva?.reservaId) {
          const cRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'reservas', subConReserva.reservaId);
          const cSnap = await getDoc(cRef);
          if (activo && cSnap.exists()) childAnteriorData = cSnap.data();
        }
        if (!activo) return;
        setPack(packData);
        setChildAnterior(childAnteriorData);
        setCargando(false);
      } catch (err) {
        console.error('[AgendarPackView] Error:', err);
        if (activo) { setError('No se pudo cargar el pack.'); setCargando(false); }
      }
    };
    cargar();
    return () => { activo = false; };
  }, [packReservaId, uid]);

  // ─── Bloqueos admin ─────────────────────────────────────────────
  // SSOT-BLOQUEOS: reemplazado por useBloqueosAdmin hook (más abajo en el componente).

  // ─── Listener de locks ──────────────────────────────────────────
  const getTodayStrRef = useRef(ctx.getTodayStr);

  useEffect(() => {
    if (!fbUser?.uid) return;
    const fechaAEscuchar = fecha1 || getTodayStrRef.current();
    const fechasAEscuchar = [fechaAEscuchar, fecha2CalcOcupacion].filter(Boolean);
    const cleanup = LockService.escucharOcupacionTemporal(fechasAEscuchar, (locks) => {
      setActiveLocks(locks);
    });
    return () => cleanup();
  }, [fecha1, fecha2CalcOcupacion, fbUser?.uid]);

  // ─── Contador del lock ──────────────────────────────────────────
  useEffect(() => {
    if (!lockExpiresAt) { setTiempoRestante(null); return; }
    const tick = () => {
      const r = lockExpiresAt - Date.now();
      setTiempoRestante(r > 0 ? r : 0);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [lockExpiresAt]);

    // ─── Derivar curso actual ───────────────────────────────────────
  const subActual = pack ? (pack.subReservas || [])[pack.cursoActual] : null;
  const cursoData = useMemo(() => {
    if (!subActual) return null;
    return (cursos || []).find(c => String(c.id) === String(subActual.cursoId));
  }, [subActual, cursos]);

  // FIX-PACK-SEDE-POR-SESION: calcular sedes válidas para la sesión actual (intersección curso ∩ pack).
  const sedesPack = useMemo(() => {
    const fromPack = pack?.packSnapshot?.sedesPermitidas || pack?.sedesPermitidas || [];
    if (Array.isArray(fromPack) && fromPack.length > 0) return fromPack;
    return pack?.sedeId ? [pack.sedeId] : [];
  }, [pack]);

  const sedesCurso = useMemo(() => {
    if (!cursoData) return [];
    const fromMap = pack?.sedesPermitidasPorCurso?.[String(cursoData.id)];
    if (Array.isArray(fromMap) && fromMap.length > 0) return fromMap;
    if (Array.isArray(cursoData.sedesPermitidas) && cursoData.sedesPermitidas.length > 0) return cursoData.sedesPermitidas;
    return [];
  }, [cursoData, pack]);

  const sedesValidasSesion = useMemo(() => {
    if (sedesCurso.length === 0) return sedesPack;
    return sedesCurso.filter(s => sedesPack.includes(s));
  }, [sedesCurso, sedesPack]);

  // Sede seleccionada por el usuario (default = pack.sedeId si está permitida).
  const [sedeSeleccionadaId, setSedeSeleccionadaId] = useState('');

  // Auto-fallback: si la sede por defecto del pack no es válida, usar la primera válida.
  useEffect(() => {
    if (sedesValidasSesion.length === 0) return;
    if (sedeSeleccionadaId && sedesValidasSesion.includes(sedeSeleccionadaId)) return;
    const sedeDefault = (pack?.sedeId && sedesValidasSesion.includes(pack.sedeId))
      ? pack.sedeId
      : sedesValidasSesion[0];
    setSedeSeleccionadaId(sedeDefault);
    if (pack?.sedeId && sedeDefault !== pack.sedeId) {
      const sedeObj = (sedes || []).find(s => String(s.id) === String(sedeDefault));
const sedeNombre = formatearSede(sedeObj) || sedeDefault;
      showToast(`Este curso se ofrece en ${sedeNombre}. Se seleccionó automáticamente.`, 'info');
    }
  }, [sedesValidasSesion, sedeSeleccionadaId, pack?.sedeId, sedes]);

  const sede = useMemo(() => (sedes || []).find(s => String(s.id) === String(sedeSeleccionadaId)), [sedes, sedeSeleccionadaId]);
    const cursoUnDia = (cursoData?.duracionTotal || 240) <= 120;

  // FIX-PACK-TIPOMOTO: derivar tipoMoto del curso específico (SSOT).
  // - length === 1 → forzar ese (único permitido)
  // - length > 1 → usar pack.tipoMoto si está permitido, sino el primero
  // - length === 0 → heredar del pack (Fix-PACK-TIPOMOTO-HERENCIA-BASICO-V1)
  const tipoMotoEfectivo = useMemo(() => {
    const tipos = cursoData?.tiposMotoEscuela;

    // Curso con tipos definidos → lógica existente.
    if (Array.isArray(tipos) && tipos.length > 0) {
      if (tipos.length === 1) return tipos[0];
      if (pack?.tipoMoto && tipos.includes(pack.tipoMoto)) return pack.tipoMoto;
      return tipos[0];
    }

    // FIX-PACK-TIPOMOTO-HERENCIA-BASICO-V1: curso sin tiposMotoEscuela
    // → heredar del pack (SSOT ya guardado al comprar).
    if (pack?.tipoMoto) return pack.tipoMoto;

    // FIX (17/11/2026): Heredar del básico del pack SIEMPRE (dictamen FIRE + MAMBA).
    // El pack se construye a partir de un básico, así que es la fuente confiable.
    const basicos = (pack?.cursoIds || [])
      .map(id => (ctx.cursos || []).find(c => String(c.id) === String(id)))
      .filter(c => c?.tipoCurso === 'basico_auto' || c?.tipoCurso === 'basico_sincro');

    const basicoConTipos = basicos.find(b => b?.tiposMotoEscuela?.length > 0);
    if (basicoConTipos) {
      return basicoConTipos.tiposMotoEscuela[0];
    }

    // Fail-safe: pack sin tipoMoto y sin básico con tipos definidos.
    console.warn('[SRE-PACK-TIPOMOTO] Pack sin tipoMoto y sin básico con tipos. Contactar admin.', {
      packId: pack?.id,
      cantidadBasicos: basicos.length,
      cursoActual: cursoData?.id,
    });
    return null;
  }, [cursoData, pack, ctx.cursos]);

 


  // ─── Form mínimo para el hook de disponibilidad ─────────────────
  const form = useMemo(() => ({
    cursoId: cursoData?.id || '',
    sedeId: sedeSeleccionadaId || pack?.sedeId || '',
    tipoMoto: tipoMotoEfectivo || '',
    traeMoto: derivarTraeMotoPermitido(
      cursoData,
      (pack?.traeMotoPorCurso || {})[String(cursoData?.id)] || 'No'
    ),
    fecha1,
    horaId
  }), [cursoData, pack, sedeSeleccionadaId, fecha1, horaId]);

  const updateForm = useCallback((patch) => {
    if ('fecha1' in patch) setFecha1(patch.fecha1);
    if ('horaId' in patch) setHoraId(patch.horaId);
    if ('sedeId' in patch) setSedeSeleccionadaId(patch.sedeId);
  }, []);

  const disponibilidad = useDisponibilidadPack({
    form,
    horarios,
    instructores,
    motos,
    proveedoresPublicos,
    reservasConfirmadas: ocupacionConfirmada || [],    activeLocks,
    selectingBlockId,
    currentUserId: uid,
    todayStr,
    lockId,
    bloqueosProveedor,
    bloqueosAdmin,
    cursoSeleccionado: cursoData,
    sedeSeleccionada: sede
  });

  // Solo presentación: agrega rol D1/D2 sobre la disponibilidad ya calculada.
  // No modifica diasDisponibles ni el auto-jump del pack.
  const diasDisponiblesUI = useMemo(
    () => enriquecerDiasConRoles(disponibilidad?.diasDisponibles || [], { esCursoDosDias: !cursoUnDiaPack }),
    [disponibilidad, cursoUnDiaPack]
  );

  // FIX-PACK-AUTOJUMP-FECHA: si fecha1 está vacía o quedó inválida, saltar
  // a la primera fecha con disponibilidad real. Mismo patrón acotado que
  // InscripcionView (máximo 3 saltos, sin mover fechas con lock/hora).
  const isAutoJumpRef = useRef(false);
  const autoJumpIntentosRef = useRef(0);
  const autoJumpAvisoRef = useRef(false);
  const fechaAnteriorRef = useRef(fecha1);

  useEffect(() => {
    if (cargando) return;
    if (!tipoMotoEfectivo) return;
    if (disponibilidad?.error) return;
    if (cargandoBloqueos || cargandoProveedor || cargandoOcupacion) return;

    // Si el bloque elegido se invalida por un bloqueo posterior, se libera
    // el lock y se obliga a elegir otro horario.
    if (!selectingBlockId && horaId) {
      const bloqueActual = disponibilidad?.bloques?.find(b => b.id === horaId);
      if (bloqueActual && !bloqueActual.disponible) {
        if (lockId) {
          LockService.liberarLock(lockId).catch(() => {});
        }
        setLockId('');
        setLockExpiresAt(null);
        setHoraId('');
        setInstructorId('');
        setMotoAsignadaId('');
        showToast('El horario que habías seleccionado ya no está disponible. Elige otro bloque.', 'error');
        return;
      }
    }

    if (lockId || horaId || selectingBlockId) return;

    // ALT-4 (FIX-HUEVO-GALLINA): esperar a que la ocupación esté sincronizada
    // con la fecha actual. Si fecha1 está seteada pero fechaConsultada
    // todavía no coincide, la disponibilidad fue calculada con datos stale.
    if (fecha1 && fechaConsultada !== fecha1) return;

    // ALT-5 acotada: si la fecha actual quedó inválida (todos los bloques
    // sin disponibilidad), re-elegir. Agnóstico al origen.
    if (fecha1) {
      const infoFecha = disponibilidad?.diasDisponibles?.find(d => d.fecha === fecha1);
      if (infoFecha?.disponible) return;
    }

    if (!disponibilidad?.diasDisponibles?.length) return;
    const primerDiaLibre = disponibilidad.diasDisponibles.find(d => d.disponible);
    if (!primerDiaLibre) {
      if (!autoJumpAvisoRef.current) {
        autoJumpAvisoRef.current = true;
        showToast('No hay fechas disponibles en este momento. Intenta más tarde.', 'info');
      }
      return;
    }
    if (primerDiaLibre.fecha === fecha1) return;

    if (autoJumpIntentosRef.current >= MAX_AUTOJUMPS) {
      if (!autoJumpAvisoRef.current) {
        autoJumpAvisoRef.current = true;
        showToast('No pudimos encontrar una fecha estable. Elige una fecha manualmente.', 'info');
      }
      return;
    }

    isAutoJumpRef.current = true;
    autoJumpIntentosRef.current += 1;
    setFecha1(primerDiaLibre.fecha);
  }, [cargando, tipoMotoEfectivo, fecha1, horaId, lockId, selectingBlockId, disponibilidad, cargandoBloqueos, cargandoProveedor, cargandoOcupacion, fechaConsultada, showToast]);

  // ─── Reset lock si cambia la fecha ──────────────────────────────
  useEffect(() => {
    if (fechaAnteriorRef.current === fecha1) return;

    // Si el cambio vino del auto-jump, no liberar lock ni resetear el
    // presupuesto; el guard del efecto ya impide saltar con lock activo.
    if (isAutoJumpRef.current) {
      isAutoJumpRef.current = false;
      fechaAnteriorRef.current = fecha1;
      return;
    }

    autoJumpIntentosRef.current = 0;
    autoJumpAvisoRef.current = false;

    if (lockId && horaId) {
      LockService.liberarLock(lockId).catch(() => {});
      setLockId('');
      setLockExpiresAt(null);
      setHoraId('');
    }
    fechaAnteriorRef.current = fecha1;
  }, [fecha1, lockId, horaId]);

  // FIX-PACK-SEDE-POR-SESION: invalidar lock si cambia la sede seleccionada.
  // Mismo patrón que fecha1. La sede cambia el pool de instructores/motos.
  const sedeAnteriorRef = useRef(sedeSeleccionadaId);
  useEffect(() => {
    if (sedeAnteriorRef.current === sedeSeleccionadaId) return;
    // Solo liberar si ya había una sede previa (evitar liberar en el mount inicial).
    if (sedeAnteriorRef.current && lockId && horaId) {
      LockService.liberarLock(lockId).catch(() => {});
      setLockId('');
      setLockExpiresAt(null);
      setHoraId('');
      showToast('Cambiaste de sede. Elige un nuevo horario.', 'info');
    }
    sedeAnteriorRef.current = sedeSeleccionadaId;
  }, [sedeSeleccionadaId, lockId, horaId, showToast]);

  // ─── Seleccionar horario → crear lock ───────────────────────────
  const handleSelectHorario = useCallback(async (bloque) => {
    if (!fbUser) return;
    if (isSubmitting) return;

    // Si ya hay lock en este bloque, liberarlo
    if (lockId && horaId === bloque.id) {
      await LockService.liberarLock(lockId).catch(() => {});
      setLockId(''); setLockExpiresAt(null); setHoraId('');
      showToast('Horario liberado. Puedes seleccionar otro.', 'success');
      return;
    }

    // SSOT-BLOQUEOS: revalidar bloqueos admin (por si cambiaron).
    const bloqueadoAdmin = (bloqueosAdmin || []).some(b => {
      if (!afectaHorarioAdmin(b, bloque.id)) return false;
      if (afectaFechaAdmin(b, fecha1, form.sedeId)) return true;
      if (disponibilidad?.fecha2Calc && afectaFechaAdmin(b, disponibilidad.fecha2Calc, form.sedeId)) return true;
      return false;
    });
    if (bloqueadoAdmin) {
      showToast('Este horario acaba de ser bloqueado por la administración.', 'error');
      return;
    }

       if (!bloque.instructorId) {
      showToast('Este bloque acaba de quedarse sin tutor. Selecciona otro.', 'error');
      return;
    }

    // Defensa en profundidad: D10 fail-closed. Sin allowlist configurada
    // (vacía/ausente) el tutor NO está permitido; tampoco uno fuera de la lista.
    if (!instructorPermitidoEnCurso(cursoData, bloque.instructorId)) {
      showToast('El tutor asignado no está habilitado para este curso. Selecciona otro horario.', 'error');
      return;
    }
    const necesitaMoto = form.traeMoto !== 'Sí';
    if (necesitaMoto && !bloque.motoAsignadaId) {
      showToast('Este bloque acaba de quedarse sin moto. Selecciona otro.', 'error');
      return;
    }

    setSelectingBlockId(bloque.id);

    // Liberar SIEMPRE el lock anterior (aunque ya se haya renovado) y limpiar
    // la selección antes de tomar el nuevo bloque. Así no queda un lock
    // huérfano ni una selección fantasma si el nuevo bloque falla (ERR-010).
    if (lockId) {
      await LockService.liberarLock(lockId).catch(() => {});
      setLockId('');
      setLockExpiresAt(null);
      setHoraId('');
      setInstructorId('');
      setMotoAsignadaId('');
    }

    const nuevoLockId = `${fecha1}_${bloque.id}_${bloque.instructorId}_${bloque.motoAsignadaId || 'sinmoto'}`;
    const res = await LockService.crearLock(nuevoLockId, uid, {
      fecha: fecha1,
      horaId: bloque.id,
      instructorId: bloque.instructorId,
      motoAsignadaId: bloque.motoAsignadaId || null,
      // ERR-048: retener D1+D2 con la misma fecha2 que usa la reserva.
      fecha2: disponibilidad?.fecha2Calc || null,
      horaId2: bloque.id
    });

      if (res.success) {
      setLockId(nuevoLockId);
      setHoraId(bloque.id);
      setInstructorId(bloque.instructorId);
      setMotoAsignadaId(bloque.motoAsignadaId || '');
      setLockExpiresAt(Date.now() + LOCK_DURATION - 10000);
      showToast('Horario separado. Tienes 10 minutos para confirmar.', 'success');
    } else {
      const c = res.error?.code;
      // El bloque anterior ya fue liberado; dejar la vista sin selección.
      setLockId('');
      setLockExpiresAt(null);
      setHoraId('');
      setInstructorId('');
      setMotoAsignadaId('');
      if (c === 'lock-owner-mismatch' || c === 'lock-taken') showToast('Este horario acaba de ser separado por otro usuario.', 'error');
      else if (c === 'lock-own-active') showToast('Ya tienes este horario separado. Continúa con el pago o espera a que expire.', 'info');
      else if (c === 'permission-denied') showToast('No pudimos separar el horario. Revisa tu sesión o intenta de nuevo.', 'error');
      else showToast(res.error?.message || 'No se pudo separar el horario', 'error');
    }
    setSelectingBlockId(null);
  }, [fbUser, isSubmitting, lockId, horaId, fecha1, form, bloqueosAdmin, disponibilidad, showToast, uid]);

  // ─── Confirmar y agendar ────────────────────────────────────────
  const handleConfirmar = useCallback(async () => {
    if (!uid || !lockId || !horaId) {
      showToast('Selecciona un horario primero', 'error');
      return;
    }
    if (!childAnterior || !cursoData) {
      showToast('Faltan datos del pack', 'error');
      return;
    }

    setIsSubmitting(true);

     if (!instructorId) {
      setIsSubmitting(false);
      showToast('No se encontró tutor para el bloque. Reintentá.', 'error');
      return;
    }

    // Encontrar proveedorId desde la moto
    let proveedorId = null;
    if (motoAsignadaId) {
      const moto = (motos || []).find(m => String(m.id) === String(motoAsignadaId));
      proveedorId = moto?.proveedorId || null;
    }

  

    const result = await ReservaService.agendarSiguienteCursoPack({
      packReservaId: packReservaId,
      cedula: childAnterior.cedula || null,
      nombre: childAnterior.nombre || null,
      apellido: childAnterior.apellido || null,
      correo: childAnterior.correo || null,
      telefono: childAnterior.telefono || null,
      contactoEmergencia: childAnterior.contactoEmergencia || null,
      fechaNacimiento: childAnterior.fechaNacimiento || null,
      sexo: childAnterior.sexo || null,
      estado: childAnterior.estado || null,
      zona: childAnterior.zona || null,
      condicionMedica: childAnterior.condicionMedica || null,
      detalleCondicion: childAnterior.detalleCondicion || null,
      sedeId: sedeSeleccionadaId || pack.sedeId || null,
      tipoMoto: tipoMotoEfectivo || null,
      cursoSnapshot: cursoData,
            fecha: fecha1,
      fecha2: disponibilidad?.fecha2Calc || null,
      horaId: horaId,
      instructorId: instructorId,
      motoAsignadaId: motoAsignadaId || null,
      proveedorId
    }, lockId);

    setIsSubmitting(false);

    if (result.success) {
      showToast('¡Sesión agendada! Ya puedes ver la fecha en tu pack.', 'success');
      navigate(`/mi-pack/${packReservaId}`);
    } else {
      const c = result.error?.code;
      const requiereNuevoHorario = ['slot-occupied', 'lock-expired', 'lock-invalid', 'lock-mismatch', 'lock-resource-mismatch', 'lock-owner-mismatch'].includes(c);
      if (requiereNuevoHorario) {
        // El servicio (o el cross-check) ya liberó el lock; limpiar la
        // selección evita confirmar otra vez con un lock inexistente.
        if (c !== 'slot-occupied') LockService.liberarLock(lockId).catch(() => {});
        setLockId('');
        setLockExpiresAt(null);
        setHoraId('');
        setInstructorId('');
        setMotoAsignadaId('');
        setSelectingBlockId(null);
      }
      showToast('Error al agendar: ' + (result.error?.message || 'Intentá de nuevo'), 'error');
    }
  }, [uid, lockId, horaId, childAnterior, cursoData, disponibilidad, motos, pack, packReservaId, fecha1, showToast, navigate]);

  const handleLogout = useCallback(async () => {
    if (logoutUser) await logoutUser();
    navigate('/');
  }, [logoutUser, navigate]);

  const header = <DashboardHeader nombre={pack?.packNombre || 'Mi Pack'} role="estudiante" onBack={() => navigate(`/mi-pack/${packReservaId}`)} onLogout={handleLogout} notifications={notifications} />;
  const footerTabs = [
    { id: 'miCurso', icon: BookOpen, label: 'Mi Sesión', action: () => navigate('/portal-reservas') },
    { id: 'cursos', icon: Compass, label: 'Sesiones', action: () => navigate('/portal-reservas?tab=cursos') },
    { id: 'recursos', icon: Library, label: 'Recursos', action: () => navigate('/portal-reservas') },
    { id: 'perfil', icon: Settings, label: 'Perfil', action: () => navigate('/portal-reservas') }
  ];
  const footer = <DashboardFooter tabs={footerTabs} activeTab="miCurso" onTabChange={(id) => {
    const t = footerTabs.find(x => x.id === id);
    if (t?.action) t.action();
  }} />;

  if (cargando) {
    return (
      <AppShell header={header} footer={footer} bgColor="bg-gray-50">
        <div className="flex items-center justify-center min-h-full">
          <Spinner message="Cargando..." />
        </div>
      </AppShell>
    );
  }

  if (error || !pack || !cursoData || !subActual) {
    return (
      <AppShell header={header} footer={footer} bgColor="bg-gray-50">
        <div className="flex flex-col items-center justify-center p-6 text-center">
          <Package size={48} className="text-gray-300 mb-4" />
          <p className="text-sm text-gray-500 mb-4">{error || 'No se puede agendar.'}</p>
          {estadoPagoError === 'Rechazado' && (
            <button
              onClick={() => navigate('/portal-reservas')}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm mb-2 w-full max-w-xs"
            >
              Corregir referencia de pago
            </button>
          )}
          <button
            onClick={() => navigate(`/mi-pack/${packReservaId}`)}
            className="bg-gray-200 text-gray-700 px-5 py-2.5 rounded-xl font-bold text-sm w-full max-w-xs"
          >
            Volver al pack
          </button>
        </div>
      </AppShell>
    );
  }

  const min = tiempoRestante ? Math.floor(tiempoRestante / 60000) : 0;
  const seg = tiempoRestante ? Math.floor((tiempoRestante % 60000) / 1000) : 0;

  return (
    <AppShell header={header} footer={footer} bgColor="bg-white">
      <div className="px-4 pt-3 pb-4 space-y-3">
        {/* Cabecera del curso a agendar */}
        <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl shadow-lg p-4 text-white">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Agendar sesión</p>
          <h2 className="text-lg font-black truncate">{cursoData.nombre}</h2>
          <p className="text-[11px] opacity-90 mt-1">
            {formatearSede(sede)}{form.tipoMoto ? ` · ${form.tipoMoto}` : ''} · {form.traeMoto === 'Sí' ? 'Moto propia' : 'Moto de Moto App'}
          </p>
        </div>

        {/* FIX-PACK-SEDE-POR-SESION: selector de sede (solo si hay más de 1 sede válida) */}
        {sedesValidasSesion.length > 1 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-3 shadow-sm">
            <label className="block text-[11px] font-black text-gray-700 uppercase tracking-wider mb-1.5">
              Sede de esta sesión
            </label>
            <select
              value={sedeSeleccionadaId}
              onChange={(e) => setSedeSeleccionadaId(e.target.value)}
              className="w-full bg-gray-50 border-2 border-gray-200 focus:border-purple-500 rounded-xl py-2.5 px-3 text-sm outline-none"
            >
              {sedesValidasSesion.map(sid => {
                const s = (sedes || []).find(x => String(x.id) === String(sid));
                return (
                  <option key={sid} value={sid}>
                    {formatearSede(s)}
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {/* D10: sin allowlist de tutores el pack falla cerrado y no se muestra el calendario. */}
        {disponibilidad?.error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-3">
            <p className="text-xs font-black text-red-800">
              No se puede agendar esta sesión
            </p>
            <p className="text-[11px] text-red-700 mt-1">
              {disponibilidad.error.message}
            </p>
          </div>
        )}

        {/* Paso 3 reutilizado */}
        {disponibilidad && !disponibilidad.error && (
          <Paso3Horario
            form={form}
            updateForm={updateForm}
            diasDisponibles={diasDisponiblesUI}
            bloques={disponibilidad.bloques}
            onSelectHorario={handleSelectHorario}
            onMostrarCalendario={() => setMostrarCalendario(true)}
            isSelectingHorario={!!selectingBlockId}
            selectingBlockId={selectingBlockId}
            fbUser={fbUser}
            lockId={lockId}
            recursosListos={instructores?.length > 0 && motos?.length > 0}
            showToast={showToast}
            cargando={!instructores?.length || !motos?.length || !horarios?.length || cargandoBloqueos}
            cursoNombre={cursoData.nombre}
            sedeNombre={formatearSede(sede)}
            tipoMoto={pack.tipoMoto}
            traeMoto={form.traeMoto}
            esCursoDosDias={!cursoUnDiaPack}
            fecha2Calc={disponibilidad.fecha2Calc}
          />
        )}

        {/* Estado del lock */}
        {lockId && tiempoRestante !== null && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-center justify-between">
            <span className="text-xs font-bold text-orange-800">Tiempo para confirmar:</span>
            <span className="text-sm font-black text-orange-700">{min}:{String(seg).padStart(2, '0')}</span>
          </div>
        )}
      </div>

      {/* Footer de confirmación */}
      <div className="bg-white border-t p-4">
        <Button
          onClick={handleConfirmar}
          icon={Check}
          disabled={!lockId || isSubmitting}
        >
          {isSubmitting ? 'Agendando...' : 'Confirmar y agendar'}
        </Button>
      </div>

      {mostrarCalendario && disponibilidad && (
        <CalendarioFlotante
          ref={calendarioRef}
          form={form}
          updateForm={updateForm}
          diasDisponibles={diasDisponiblesUI}
          maxDate={disponibilidad.maxDate}
          mesCalendario={mesCalendario}
          setMesCalendario={setMesCalendario}
          onClose={() => setMostrarCalendario(false)}
          showToast={showToast}
          esCursoDosDias={!cursoUnDiaPack}
          fecha2Calc={disponibilidad.fecha2Calc}
        />
      )}
    </AppShell>
  );
}

export default AgendarPackView;
