// @build: 2026-09-30 | id: LEGAL-TERMINOLOGIA-AGENDAR-PACK | desc: Página dedicada para agendar la siguiente sesión del pack
import { useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase';
import { AppContext } from '../../../context/AppContextValue';
import { ReservaService } from '../../inscripcion/services/ReservaService';
import { LockService } from '../../../services/LockService';
import { useDisponibilidadPack } from '../../inscripcion/hooks/useDisponibilidadPack';
import { useOcupacionConfirmada } from '../../../hooks/useOcupacionConfirmada';
import { useBloqueosProveedor } from '../../../hooks/useBloqueosProveedor';
import { Paso3Horario } from '../../inscripcion/components/Paso3Horario';
import { CalendarioFlotante } from '../../inscripcion/components/CalendarioFlotante';
import { Spinner, Button } from '../../../components/UI';
import { useToast } from '../../shared/components/ToastProvider';
import AppShell from '../../shared/components/AppShell';
import DashboardHeader from '../../shared/components/DashboardHeader';
import DashboardFooter from '../../shared/components/DashboardFooter';
import { ArrowRight, Check, Package, Activity, BookOpen, Compass, Library, Settings, FileText } from 'lucide-react';

const APP_ID = 'motoescuela-pro-v1';
const LOCK_DURATION = 10 * 60 * 1000;

export function AgendarPackView() {
  const { packReservaId } = useParams();
  const navigate = useNavigate();
  const ctx = useContext(AppContext);
  const { showToast } = useToast();
  const { cursos = [], sedes = [], instructores = [], motos = [], horarios = [], user, fbUser, logoutUser, notifications = [] } = ctx;

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
  const [activeLocks, setActiveLocks] = useState([]);
  const [bloqueosAdmin, setBloqueosAdmin] = useState([]);
  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const [mesCalendario, setMesCalendario] = useState(() => new Date());
  const [tiempoRestante, setTiempoRestante] = useState(null);

  const bloqueosProveedor = useBloqueosProveedor(fecha1, true);
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
  }, [fecha1]);

  const { ocupacion: ocupacionConfirmada } = useOcupacionConfirmada({
    fecha: fecha1,
    fecha2: fecha2CalcOcupacion,
    limitDocs: 100
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
            Pendiente: 'Tu pack está pendiente de aprobación. Esperá a que el administrador verifique el pago.',
            Rechazado: 'Tu pack fue rechazado. Corregí la referencia de pago para continuar.',
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
  useEffect(() => {
    let activo = true;
    const cargar = async () => {
      try {
        const snap = await getDocs(collection(db, 'bloqueosAdmin'));
        if (activo) setBloqueosAdmin(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.warn('[AgendarPackView] bloqueosAdmin:', err);
        if (activo) setBloqueosAdmin([]);
      }
    };
    cargar();
    return () => { activo = false; };
  }, []);

  // ─── Listener de locks ──────────────────────────────────────────
  useEffect(() => {
    if (!fbUser) return;
    const fechaAEscuchar = fecha1 || ctx.getTodayStr();
    const cleanup = LockService.escucharOcupacionTemporal(fechaAEscuchar, (locks) => {
      setActiveLocks(locks);
    });
    return () => cleanup();
  }, [fecha1, fbUser, ctx]);

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

  const sede = useMemo(() => (sedes || []).find(s => String(s.id) === String(pack?.sedeId)), [sedes, pack]);
    const cursoUnDia = (cursoData?.duracionTotal || 240) <= 120;

  // FIX-PACK-TIPOMOTO: derivar tipoMoto del curso específico (SSOT).
  // - length === 1 → forzar ese (único permitido)
  // - length > 1 → usar pack.tipoMoto si está permitido, sino el primero
  // - length === 0 → null (no requiere moto)
  const tipoMotoEfectivo = useMemo(() => {
    const tipos = cursoData?.tiposMotoEscuela;
    if (!Array.isArray(tipos) || tipos.length === 0) return null;
    if (tipos.length === 1) return tipos[0];
    if (pack?.tipoMoto && tipos.includes(pack.tipoMoto)) return pack.tipoMoto;
    return tipos[0];
  }, [cursoData, pack]);

 


  // ─── Form mínimo para el hook de disponibilidad ─────────────────
  const form = useMemo(() => ({
    cursoId: cursoData?.id || '',
    sedeId: pack?.sedeId || '',
    tipoMoto: tipoMotoEfectivo || '',
    traeMoto: (pack?.traeMotoPorCurso || {})[String(cursoData?.id)] || 'No',
    fecha1,
    horaId
  }), [cursoData, pack, fecha1, horaId]);

  const updateForm = useCallback((patch) => {
    if ('fecha1' in patch) setFecha1(patch.fecha1);
    if ('horaId' in patch) setHoraId(patch.horaId);
  }, []);

  const disponibilidad = useDisponibilidadPack({
    form,
    horarios,
    instructores,
    motos,
    reservasConfirmadas: ocupacionConfirmada || [],    activeLocks,
    selectingBlockId,
    currentUserId: uid,
    todayStr: ctx.getTodayStr(),
    lockId,
    bloqueosProveedor,
    bloqueosAdmin,
    cursoSeleccionado: cursoData,
    sedeSeleccionada: sede
  });

  // ─── Reset lock si cambia la fecha ──────────────────────────────
  const fechaAnteriorRef = useRef(fecha1);
  useEffect(() => {
    if (fechaAnteriorRef.current === fecha1) return;
    if (lockId && horaId) {
      LockService.liberarLock(lockId).catch(() => {});
      setLockId('');
      setLockExpiresAt(null);
      setHoraId('');
    }
    fechaAnteriorRef.current = fecha1;
  }, [fecha1, lockId, horaId]);

  // ─── Seleccionar horario → crear lock ───────────────────────────
  const handleSelectHorario = useCallback(async (bloque) => {
    if (!fbUser) return;
    if (isSubmitting) return;

    // Si ya hay lock en este bloque, liberarlo
    if (lockId && horaId === bloque.id) {
      await LockService.liberarLock(lockId).catch(() => {});
      setLockId(''); setLockExpiresAt(null); setHoraId('');
      return;
    }

    // Validar revalidando bloqueos admin (por si cambiaron)
    const afectaFechaLocal = (b, f) => {
      if (!f) return false;
      if (f < b.fechaInicio) return false;
      const fin = b.fechaFin || b.fechaInicio;
      if (f > fin) return false;
      if (b.sedeId && String(b.sedeId) !== String(form.sedeId)) return false;
      if (b.todoElDia) return true;
      return (b.horarios || []).includes(bloque.id);
    };
    const bloqueadoAdmin = (bloqueosAdmin || []).some(b =>
      afectaFechaLocal(b, fecha1) || afectaFechaLocal(b, disponibilidad?.fecha2Calc)
    );
    if (bloqueadoAdmin) {
      showToast('Este horario acaba de ser bloqueado por la administración.', 'error');
      return;
    }

       if (!bloque.instructorId) {
      showToast('Este bloque acaba de quedarse sin tutor. Selecciona otro.', 'error');
      return;
    }

    // Defensa en profundidad: revalidar que el instructor sigue permitido para este curso
    const permitidos = cursoData?.instructoresPermitidos;
    if (Array.isArray(permitidos) && permitidos.length > 0 && !permitidos.map(String).includes(String(bloque.instructorId))) {
      showToast('El tutor asignado ya no está habilitado para esta sesión. Selecciona otro horario.', 'error');
      return;
    }
    const necesitaMoto = form.traeMoto !== 'Sí';
    if (necesitaMoto && !bloque.motoAsignadaId) {
      showToast('Este bloque acaba de quedarse sin moto. Selecciona otro.', 'error');
      return;
    }

    setSelectingBlockId(bloque.id);

    // Liberar lock anterior si existía en otro bloque
    if (lockId) {
      await LockService.liberarLock(lockId).catch(() => {});
    }

    const nuevoLockId = `${fecha1}_${bloque.id}_${bloque.instructorId}_${bloque.motoAsignadaId || 'sinmoto'}`;
    const res = await LockService.crearLock(nuevoLockId, uid, {
      fecha: fecha1,
      horaId: bloque.id,
      instructorId: bloque.instructorId,
      motoAsignadaId: bloque.motoAsignadaId || null
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
      if (c === 'permission-denied') showToast('Este horario acaba de ser separado por otro usuario.', 'error');
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
      sedeId: pack.sedeId || null,
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
      showToast('¡Sesión agendada! Ya podés ver la fecha en tu pack.', 'success');
      navigate(`/mi-pack/${packReservaId}`);
    } else {
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
            {sede?.nombre || 'Sede'} · {pack.tipoMoto || ''} · {form.traeMoto === 'Sí' ? 'Moto propia' : 'Moto de Moto App'}
          </p>
        </div>

        {/* Paso 3 reutilizado */}
        {disponibilidad && (
          <Paso3Horario
            form={form}
            updateForm={updateForm}
            diasDisponibles={disponibilidad.diasDisponibles}
            bloques={disponibilidad.bloques}
            onSelectHorario={handleSelectHorario}
            onMostrarCalendario={() => setMostrarCalendario(true)}
            isSelectingHorario={!!selectingBlockId}
            selectingBlockId={selectingBlockId}
            fbUser={fbUser}
            lockId={lockId}
            recursosListos={instructores?.length > 0 && motos?.length > 0}
            showToast={showToast}
            cargando={!instructores?.length || !motos?.length || !horarios?.length}
            cursoNombre={cursoData.nombre}
            sedeNombre={sede?.nombre || 'Sede'}
            tipoMoto={pack.tipoMoto}
            traeMoto={form.traeMoto}
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
          diasDisponibles={disponibilidad.diasDisponibles}
          maxDate={disponibilidad.maxDate}
          mesCalendario={mesCalendario}
          setMesCalendario={setMesCalendario}
          onClose={() => setMostrarCalendario(false)}
          showToast={showToast}
        />
      )}
    </AppShell>
  );
}

export default AgendarPackView;
