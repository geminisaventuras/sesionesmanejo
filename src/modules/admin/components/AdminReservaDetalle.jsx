// @build: 2026-09-30 | id: LEGAL-TERMINOLOGIA-ADMIN-DETALLE | backup: AdminReservaDetalle.jsx.backup-20260828-161000 | desc: Añade reasignación de instructor y cambio de horario
import { useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { AppContext } from '../../../context/AppContextValue';
import { Button } from '../../../components/UI';
import { useToast } from '../../shared/components/ToastProvider';
import AppShell from '../../shared/components/AppShell';
import DashboardHeader from '../../shared/components/DashboardHeader';
import DashboardFooter from '../../shared/components/DashboardFooter';
import {
  ChevronLeft, ChevronRight, CheckCircle, AlertCircle, X, User, Users, Phone, Mail, MapPin,
  Calendar, Clock, Bike, BookOpen, CreditCard, Activity, Wallet, Settings, MessageCircle
} from 'lucide-react';
import { writeBatch, doc, serverTimestamp, collection, query, where, getDocs, getDoc, arrayUnion, increment, Timestamp, updateDoc } from 'firebase/firestore';
import { getHoraIdOcupacion, getMotoIdOcupacion, derivarProveedorReposicion } from '../../shared/utils/reservaHelpers';
import { emitirEvento } from '../../shared/services/NotificacionesEventos';
import { obtenerFechaVenezuela } from '../../shared/utils/zonahoraria';
import {
  construirAsignacionesProveedor,
  calcularDeudasReprogramacionD2,
  calcularRelevoTutor,
  calcularRelevoProveedor,
  comisionProveedorReserva,
  cursoIniciadoParaRelevo
} from '../../shared/utils/finanzasHelpers';
import { construirEventoReprogramacion, COLECCION_AUDITORIA_REPROGRAMACIONES, registrarEvento } from '../services/ReprogramacionAuditService';
import { detectarConflictosReprogramacion, mensajeConflictoReprogramacion } from '../utils/reprogramacionConflictos';
import { mensajeBloqueoConAuditoria } from '../utils/auditoriaReprogramacion';
import { formatearSede } from '../../shared/utils/sedesHelpers';
import { calcularEdad } from '../../shared/utils/fechaNacimiento';
import { MovilidadService } from '../../inscripcion/services/MovilidadService';
import { MOVILIDAD_ETIQUETAS } from '../../inscripcion/utils/movilidadHelpers';
import { db } from '../../../firebase';
import CambiarHorarioModal from './CambiarHorarioModal';
import ModalReasignarInstructor from './ModalReasignarInstructor';
import ModalCambiarMoto from './ModalCambiarMoto';
import BadgeReposicion from '../../shared/components/BadgeReposicion';
import MenuAcciones from '../../shared/components/MenuAcciones';
import ModalMotivoRechazo from '../../shared/components/ModalMotivoRechazo';
import ModalWhatsApp from '../../shared/components/ModalWhatsApp';
import { construirMensajeAprobacion, construirMensajeReprogramacion, construirMensajeRechazo, construirLinkWhatsApp, codigoReservaCorto, getBaseUrl } from '../../shared/services/WhatsAppService';

const formatearFecha = (fechaStr) => {
  if (!fechaStr) return '—';
  const [y, m, d] = fechaStr.split('-');
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return `${parseInt(d)} ${meses[parseInt(m)-1]} ${y}`;
};

// B-D2-AUDITORIA: añade el evento append-only DENTRO del mismo batch que la
// reprogramación. Si el batch falla, no queda auditoría huérfana (ni viceversa).
const agregarAuditoriaReprogramacion = (batch, datos) => {
  batch.set(
    doc(collection(db, COLECCION_AUDITORIA_REPROGRAMACIONES)),
    {
      ...construirEventoReprogramacion(datos),
      createdAt: serverTimestamp()
    }
  );
};

// D9: un intento conflictivo NO modifica la reserva, pero sí queda auditado
// (append-only) con el motivo y los recursos en conflicto. Sin override.
const auditarReprogramacionBloqueada = async ({ reservaId, motivo, antes, despues, conflictos, autorId }) => {
  const resultado = await registrarEvento({
    reservaId,
    tipo: 'reprogramacion_bloqueada',
    origen: 'AdminReservaDetalle',
    motivo: motivo || 'sin motivo',
    antes,
    despues,
    conflictos,
    autorId: autorId || 'admin',
    autorRol: 'admin'
  });
  if (resultado?.success !== true) {
    // El bloqueo D9 se aplica igual; solo se deja evidencia del fallo de auditoría.
    console.error('[AdminReservaDetalle] Auditoría del bloqueo D9 no persistida:', {
      reservaId,
      error: resultado?.error || { code: 'audit-write-failed', message: 'resultado vacío' }
    });
  }
  return resultado;
};

const AdminReservaDetalle = () => {
  const { reservaId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const volverA = location.state?.from || '/admin/reservas';  
  const { reservas, instructores, cursos, horarios, sedes, motos, proveedores, saveReserva, user, logoutUser, estados, municipios, ciudades } = useContext(AppContext);
  const { showToast } = useToast();
  
  const [mostrarCambiarHorario, setMostrarCambiarHorario] = useState(false);
  const [mostrarReasignar, setMostrarReasignar] = useState(false);
  const [mostrarCambiarMoto, setMostrarCambiarMoto] = useState(false);
  // Estado para el modal de motivo de rechazo: null | 'rechazar'
  const [modalMotivo, setModalMotivo] = useState(null);
  const [waModalData, setWaModalData] = useState(null);
  const [solicitudMovilidad, setSolicitudMovilidad] = useState(null);
  const [cargandoMovilidad, setCargandoMovilidad] = useState(false);

  const isAdmin = user?.role === 'admin';
  const [reservaLocal, setReservaLocal] = useState(null);
  
  const res = (reservas || []).find(r => String(r.id) === String(reservaId)) || reservaLocal;

  useEffect(() => {
    if (!res && reservaId) {
      const fetchReserva = async () => {
        try {
          const ref = doc(db, 'artifacts/motoescuela-pro-v1/public/data/reservas', reservaId);
          const snap = await getDoc(ref);
          if (snap.exists()) {
            setReservaLocal({ id: snap.id, ...snap.data() });
          }
        } catch (err) {
          console.error("Error buscando reserva:", err);
        }
      };
      fetchReserva();
    }
  }, [res, reservaId]);

  // T-160 / FT-088: la solicitud de movilidad se registra aparte de la reserva
  // y se paga directo al prestador. El detalle solo la muestra y enlaza.
  useEffect(() => {
    let activo = true;
    const esPack = res?.tipoReserva === 'pack_sub' || Boolean(res?.packReservaId);
    if (!res?.id || esPack) {
      setSolicitudMovilidad(null);
      setCargandoMovilidad(false);
      return () => { activo = false; };
    }
    setCargandoMovilidad(true);
    MovilidadService.listarPorReserva(res.id)
      .then((lista) => {
        if (activo) setSolicitudMovilidad(lista[0] || null);
      })
      .catch((err) => {
        console.warn('[AdminReservaDetalle] No se pudo leer la movilidad:', err);
        if (activo) setSolicitudMovilidad(null);
      })
      .finally(() => {
        if (activo) setCargandoMovilidad(false);
      });
    return () => { activo = false; };
  }, [res?.id, res?.tipoReserva, res?.packReservaId]);

  // FT-089: completar datos del Paso 1 solo si el snapshot de la reserva no los
  // trae. Una única lectura al perfil por reserva; el snapshot siempre gana.
  const [perfilUsuario, setPerfilUsuario] = useState(null);
  const [perfilConsultadoUid, setPerfilConsultadoUid] = useState(null);

  useEffect(() => {
    const faltanDatos = !res?.fechaNacimiento || !res?.sexo || !res?.condicionMedica;
    if (!res?.userId || !faltanDatos || perfilConsultadoUid === res.userId) return;
    let activo = true;
    setPerfilConsultadoUid(res.userId);
    const cargarPerfil = async () => {
      try {
        const ref = doc(db, 'artifacts/motoescuela-pro-v1/public/data/usuarios', res.userId);
        const snap = await getDoc(ref);
        if (activo && snap.exists()) setPerfilUsuario({ uid: res.userId, data: snap.data() });
      } catch (err) {
        console.error('[AdminReservaDetalle] No se pudo leer el perfil del usuario:', err);
      }
    };
    cargarPerfil();
    return () => { activo = false; };
  }, [res?.userId, res?.fechaNacimiento, res?.sexo, res?.condicionMedica, perfilConsultadoUid]);

  const curso = (cursos || []).find(c => String(c.id) === String(res?.cursoId));
  const bloqueEfectivo = res ? getHoraIdOcupacion(res, res.fecha2 || res.fecha) : null;
const horario = (horarios || []).find(h => String(h.id) === String(bloqueEfectivo || res?.horaId));
  const sede = (sedes || []).find(s => String(s.id) === String(res?.sedeId));

  const handleLogout = useCallback(async () => {
    if (logoutUser) await logoutUser();
    navigate('/');
  }, [logoutUser, navigate]);

  const footerTabs = [
    { id: 'inicio', icon: Activity, label: 'Inicio', action: () => navigate('/dashboard') },
    { id: 'reservas', icon: BookOpen, label: 'Reservas', action: () => navigate('/admin/reservas') },
    { id: 'ocupacion', icon: Calendar, label: 'Ocupac.', action: () => navigate('/admin/ocupacion') },
    { id: 'finanzas', icon: Wallet, label: 'Finanzas', action: () => navigate('/admin/finanzas') },
    { id: 'config', icon: Settings, label: 'Config', action: () => navigate('/admin/config') }
  ];

  const { notifications } = useContext(AppContext);
  const availableInstructors = useMemo(() => {
    if (!res) return [];
    return (instructores || []).filter(i => 
      i.activo && 
      (i.sedes || []).includes(res.sedeId) && 
      String(i.id) !== String(res.instructorId)
    );
  }, [instructores, res?.sedeId, res?.instructorId]);

  // FEATURE-CAMBIAR-PROVEEDOR-MOTO: motos candidatas para el cambio.
  // Filtros: activa + sede de la reserva + tipo compatible + no es la actual.
  // La ocupación se valida en el handler cambiarMoto (defensa en profundidad).
  const motosDisponibles = useMemo(() => {
    if (!res) return [];
    return (motos || [])
      .filter(m => m.activo)
      .filter(m => (m.sedes || []).includes(res.sedeId))
      .filter(m => !res.tipoMoto || m.tipo === res.tipoMoto)
      .filter(m => String(m.id) !== String(res.motoAsignadaId))
      .map(m => {
        const prov = (proveedores || []).find(p => String(p.id) === String(m.proveedorId));
        return {
          ...m,
          proveedorNombre: prov ? prov.nombre : 'Sin proveedor'
        };
      });
  }, [motos, proveedores, res?.sedeId, res?.tipoMoto, res?.motoAsignadaId]);

  const header = <DashboardHeader title={`Reserva: ${res?.nombre || ''} ${res?.apellido || ''}`} onBack={() => navigate(volverA)} onLogout={handleLogout} notifications={notifications} />;  const footer = <DashboardFooter
    tabs={footerTabs}
    activeTab="reservas"
    onTabChange={(id) => {
      const tab = footerTabs.find(t => t.id === id);
      if (tab?.action) tab.action();
    }}
  />;

  if (!res) {
    return (
      <AppShell header={header} footer={footer} bgColor="bg-gray-50" maxWidth="max-w-md lg:max-w-5xl">
        <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
          <AlertCircle size={48} className="text-red-400 mb-4" />
          <h2 className="text-lg font-black text-gray-900 mb-2">Reserva no encontrada</h2>
          <p className="text-sm text-gray-500 mb-6">La reserva que buscas no existe o fue eliminada.</p>
          <Button onClick={() => navigate(volverA)} variant="primary">Volver a Reservas</Button>        </div>
      </AppShell>
    );
  }

  const instructorActual = (instructores || []).find(i => String(i.id) === String(res.instructorId));
  const motoActual = (motos || []).find(m => String(m.id) === String(res.motoAsignadaId));
  const proveedorActual = (proveedores || []).find(p => String(p.id) === String(res.proveedorId));
  
  

  
  const aprobarPago = async () => {
    if (!isAdmin) return;
    const batch = writeBatch(db);
    
    const reservaRef = doc(db, 'artifacts/motoescuela-pro-v1/public/data/reservas', res.id);
    batch.update(reservaRef, { estadoPago: 'Aprobado', estadoCurso: 'En Curso' });
    
    const espejoRef = doc(db, 'ocupacionConfirmada', res.id);
    batch.set(espejoRef, {
      userId: res.userId,
      fecha: res.fecha,
      fecha2: res.fecha2,
      horaId: res.horaId,
      instructorId: res.instructorId,
      motoAsignadaId: res.motoAsignadaId || null,
      traeMoto: res.traeMoto || 'No',
      sedeId: res.sedeId || null,
      tipoCurso: res.tipoCurso || null,
      estadoPago: 'Aprobado',
      estadoCurso: 'En Curso',
      pagadoProveedor: res.pagadoProveedor === true,
      pagoProveedorId: res.pagoProveedorId || null,
      proveedorId: res.proveedorId || null,
      comisionProveedor: Number(res.comisionProveedor) || 0
    }, { merge: true });
    
    // FIX-METRICAS-TRIGGER: invalidar caché del hook useMetricasUsuario
    batch.update(doc(db, 'artifacts/motoescuela-pro-v1/public/data/usuarios', res.userId), {
      updatedAt: serverTimestamp()
    });

    // B-MOVIMIENTOS-ATOMICOS: el ingreso nace en el mismo batch que la aprobación.
    const movimientoId = `mov_reserva_${res.id}`;
    batch.set(doc(db, 'artifacts/motoescuela-pro-v1/public/data/movimientos', movimientoId), {
      id: movimientoId,
      tipo: 'ingreso',
      categoria: 'ingreso_reserva',
      origen: 'reserva',
      origenId: res.id,
      monto: Number(res.pagoTotalMoneda) || 0,
      desc: `Inscripción C-${String(res.id).slice(-4)}`,
      fecha: obtenerFechaVenezuela(),
      userId: res.userId,
      createdBy: user?.uid || '',
      createdAt: serverTimestamp(),
      estado: 'confirmado',
      moneda: 'USD'
    });
    
    try {
      await batch.commit();
      if (user?.uid) {
        void emitirEvento({
          tipo: 'pago_aprobado',
          entidadTipo: 'reserva',
          entidadId: res.id,
          actorUid: user.uid,
          token: 'aprobado',
          datos: {
            reservaId: res.id,
            instructorId: res.instructorId || null,
            proveedorId: res.proveedorId || null,
          },
        });
      }
      showToast('Pago aprobado. Ahora puedes enviar la confirmación por WhatsApp.', 'success');
    } catch (error) {
      showToast('Error al aprobar: ' + error.message, 'error');
    }
  };

  const rechazarPago = async (tipo = 'rechazar', motivo = '') => {
    if (!isAdmin) return;
    const batch = writeBatch(db);
    const reservaRef = doc(db, 'artifacts/motoescuela-pro-v1/public/data/reservas', res.id);
    const espejoRef = doc(db, 'ocupacionConfirmada', res.id);
    
      if (tipo === 'cancelar') {
      batch.update(reservaRef, { estadoPago: 'Cancelado', estadoCurso: 'Cancelado' });
      batch.delete(espejoRef);

      // B-PACK-SUBRESERVAS-METADATA: si es una sesión de pack, marcar su
      // metadata como cancelada para no dejar un subReservas activo huérfano.
      if (res.tipoReserva === 'pack_sub' && res.packReservaId) {
        try {
          const masterRef = doc(db, 'artifacts/motoescuela-pro-v1/public/data/reservasPack', res.packReservaId);
          const masterSnap = await getDoc(masterRef);
          if (masterSnap.exists()) {
            const master = masterSnap.data();
            const subs = Array.isArray(master.subReservas) ? [...master.subReservas] : [];
            const idx = Number(res.packCursoIndex);
            if (Number.isInteger(idx) && subs[idx]) {
              subs[idx] = { ...subs[idx], estado: 'cancelado' };
              batch.update(masterRef, { subReservas: subs });
            }
          }
        } catch (err) {
          console.warn('[AdminReservaDetalle] No se pudo normalizar subReservas:', err);
        }
      }

      // FIX-METRICAS-TRIGGER: invalidar caché del hook
      batch.update(doc(db, 'artifacts/motoescuela-pro-v1/public/data/usuarios', res.userId), {
        updatedAt: serverTimestamp()
      });

     
            // ✅ CORRECCIÓN: purgar locks por instructor y filtrar en memoria (evita índice compuesto)
      const temporalRef = collection(db, 'ocupacionTemporal');
      const qLocks = query(temporalRef, where('instructorId', '==', res.instructorId));

      const snapLocks = await getDocs(qLocks);
      const fechasBloqueadas = [res.fecha, res.fecha2].filter(Boolean);

         snapLocks.forEach(docSnap => {
        const lockData = docSnap.data();

        // Determinar qué bloque se espera en la fecha del lock:
        //   - Si coincide con reserva.fecha  → horaId
        //   - Si coincide con reserva.fecha2 → horaIdReposicion || horaId
        let bloqueEsperado = null;
        if (lockData.fecha === res.fecha) bloqueEsperado = res.horaId;
        else if (lockData.fecha === res.fecha2) bloqueEsperado = res.horaIdReposicion || res.horaId;

        const coincideHora = bloqueEsperado && String(lockData.horaId) === String(bloqueEsperado);
        const coincideFecha = fechasBloqueadas.includes(lockData.fecha);

        if (coincideHora && coincideFecha) {
          batch.delete(docSnap.ref); // elimina de ocupacionTemporal
          batch.delete(doc(db, 'locks', docSnap.id)); // elimina de locks legacy
        }
      });
    } else {
      const intentosActuales = res.intentosCorreccion || 0;
      batch.update(reservaRef, { 
        estadoPago: 'Rechazado', 
        rechazadoEn: Date.now(), 
        intentosCorreccion: intentosActuales + 1,
        motivoRechazo: motivo || 'La referencia del pago no coincide' 
      });
      // FIX-METRICAS-TRIGGER: invalidar caché del hook
      batch.update(doc(db, 'artifacts/motoescuela-pro-v1/public/data/usuarios', res.userId), {
        updatedAt: serverTimestamp()
      });
      batch.set(espejoRef, {
        userId: res.userId,
        fecha: res.fecha,
        fecha2: res.fecha2,
        horaId: res.horaId,
        horaIdReposicion: res.horaIdReposicion || null,
        instructorId: res.instructorId,
        motoAsignadaId: res.motoAsignadaId || null,
        motoReposicionId: res.motoReposicionId || null,
        traeMoto: res.traeMoto || 'No',
        sedeId: res.sedeId || null,
        tipoCurso: res.tipoCurso || null,
        estadoPago: 'Pendiente',
        estadoCurso: res.estadoCurso || 'Pendiente',
        pagadoProveedor: res.pagadoProveedor === true,
        pagoProveedorId: res.pagoProveedorId || null,
        proveedorId: res.proveedorId || null,
        comisionProveedor: Number(res.comisionProveedor) || 0
      }, { merge: true });
    }
    
    try {
      await batch.commit();
      // FT-090: si la reserva se cancela, su movilidad también.
      if (tipo === 'cancelar') {
        await MovilidadService.sincronizarConReserva(res.id, {
          fecha: res.fecha,
          fecha2: res.fecha2,
          horaId: res.horaId,
          horaIdReposicion: res.horaIdReposicion || null,
          estadoReserva: 'Cancelado',
        }).catch((err) => console.warn('[AdminReservaDetalle] Movilidad no sincronizada:', err?.code || err?.message));
      }
      if (user?.uid) {
        void emitirEvento({
          tipo: tipo === 'cancelar' ? 'reserva_cancelada' : 'pago_rechazado',
          entidadTipo: 'reserva',
          entidadId: res.id,
          actorUid: user.uid,
          token: tipo === 'cancelar' ? 'cancelado' : 'rechazado',
          datos: {
            reservaId: res.id,
            instructorId: res.instructorId || null,
            proveedorId: res.proveedorId || null,
          },
        });
      }
      showToast(
        tipo === 'cancelar' 
          ? 'Reserva cancelada definitivamente. Horario liberado.' 
          : 'Pago rechazado. El usuario puede corregir la referencia.', 
        'info'
      );

      if (tipo === 'rechazar') {
        const intentosRestantes = Math.max(0, 3 - ((res.intentosCorreccion || 0) + 1));
        const msg = construirMensajeRechazo({
          nombre: res.nombre,
          curso: curso?.nombre || 'tu sesión',
          motivo: motivo || 'La referencia del pago no coincide',
          codigoReserva: codigoReservaCorto(res.id),
          intentosRestantes,
          linkCorreccion: `${getBaseUrl()}/corregir-pago/reserva/${res.id}`
        });
        const waUrl = construirLinkWhatsApp(res.telefono, msg);
        if (waUrl) {
          setWaModalData({ url: waUrl, mensaje: msg, titulo: 'Notificar Rechazo' });
          return;
        }
      }

      navigate(volverA);
    } catch (error) {
      showToast('Error al rechazar: ' + error.message, 'error');
    }
  };

   // Reasignación de instructor con la regla aprobada FT-001:
   // D1 pagado se conserva; 50/50 fijo si inició; 100% al nuevo si no inició;
   // deuda al tutor saliente por el exceso; auditoría y deuda en el mismo batch.
  const reasignarInstructor = async ({ instructorDestinoId, instructorDestinoNombre, motivo }) => {
    if (!isAdmin) return showToast('Sin permisos', 'error');
    if (!instructorDestinoId) return showToast('Selecciona un tutor', 'error');
    if (instructorDestinoId === res.instructorId) return showToast('Selecciona un tutor diferente', 'error');

    // Bloqueos de negocio (T-025 permite reasignar aunque pagadoInstructor sea true).
    if (res.estadoPago === 'Cancelado') {
      return showToast('No se puede reasignar una reserva cancelada', 'error');
    }
    if (res.esReservaCompartida === true && !res.pagosInstructorDia) {
      return showToast('Función avanzada no disponible todavía para reservas ya compartidas', 'error');
    }

    // Verificar conflicto de horario del instructor destino
       const conflicto = (reservas || []).some(r => {
      if (String(r.id) === String(res.id)) return false;
      if (String(r.instructorId) !== String(instructorDestinoId)) return false;
      if (r.estadoPago !== 'Aprobado' && r.estadoPago !== 'Pendiente') return false;

      // Evaluar solapamiento real: por cada fecha de la reserva actual,
      // ¿está el mismo bloque ocupado por r en esa fecha?
      const fechasRes = [res.fecha, res.fecha2].filter(Boolean);
      for (const f of fechasRes) {
        const bloqueRes = getHoraIdOcupacion(res, f);
        const bloqueR = getHoraIdOcupacion(r, f);
        if (bloqueRes && bloqueR && bloqueRes === bloqueR) return true;
      }
      return false;
    });
    if (conflicto) {
      const confirmado = window.confirm(
        '⚠️ Este instructor ya tiene otra clase en esa fecha y hora. Puede haber doble asignación.\n\n' +
        '¿Deseas continuar de todos modos?'
      );
      if (!confirmado) return;
    }


      // Confirmación especial para reservas aprobadas
    if (res.estadoPago === 'Aprobado') {
      const haySesionActiva = res.pausaActiva || res.moduloEnProgreso || (res.tiempoEfectivo && res.tiempoEfectivo > 0);
      if (haySesionActiva) {
        const confirmadoSesion = window.confirm(
          '⚠️ Hay una sesión del Aula Virtual en curso. Reasignar el instructor ahora puede afectar la sesión.\n\n' +
          '¿Deseas continuar de todos modos?'
        );
        if (!confirmadoSesion) return;
      }
    }

    // Detectar si el curso ya inició (estado del curso o marcas de sesión).
    // Si NO inició: 100% al nuevo tutor. Si SÍ inició: 50/50 fijo.
    const instructorInicioCurso = cursoIniciadoParaRelevo(res);

    const instructorOrigenId = res.instructorId;
    const relevo = calcularRelevoTutor(res, {
      instructorDestinoId,
      instructorDestinoNombre: instructorDestinoNombre || '',
      inicioCurso: instructorInicioCurso
    });
    if (!relevo) return showToast('No se pudo calcular el relevo del tutor', 'error');

    const {
      pagosInstructorDia,
      deudas: deudasRelevo,
      pagadoInstructor
    } = relevo;

    try {
      const batch = writeBatch(db);
      const reservaRef = doc(db, 'artifacts/motoescuela-pro-v1/public/data/reservas', res.id);
      const espejoRef = doc(db, 'ocupacionConfirmada', res.id);

      const antes = {
        instructorId: instructorOrigenId || null,
        pagadoInstructor: res.pagadoInstructor === true,
        pagosInstructorDia: res.pagosInstructorDia || null
      };
      const despues = {
        instructorId: instructorDestinoId,
        instructorOriginalId: res.instructorOriginalId || instructorOrigenId || null,
        pagadoInstructor,
        pagosInstructorDia
      };

      const datosActualizacion = {
        instructorId: instructorDestinoId,
        instructorOriginalId: res.instructorOriginalId || instructorOrigenId || null,
        instructorAnteriorId: instructorOrigenId || null,
        pagosInstructorDia,
        pagadoInstructor,
        motivoRelevo: motivo || '',
        reasignadoPor: user?.uid || 'admin',
        reasignadoEn: serverTimestamp(),
        reprogramaciones: arrayUnion({
          tipo: 'reasignacion_tutor',
          timestamp: Timestamp.now(),
          autor: user?.uid || 'admin',
          autorRol: 'admin',
          motivo: (motivo || '').trim(),
          esSplit: instructorInicioCurso,
          inicioCurso: instructorInicioCurso,
          regla: instructorInicioCurso ? '50_50_d1_d2' : '100_nuevo_tutor',
          antes,
          despues,
          deudas: deudasRelevo
        }),
        reprogramacionesCount: increment(1)
      };

      batch.update(reservaRef, datosActualizacion);
      batch.set(espejoRef, {
        ...datosActualizacion,
        estadoPago: res.estadoPago,
        proveedorId: res.proveedorId || null,
        comisionProveedor: Number(res.comisionProveedor) || 0
      }, { merge: true });

      agregarAuditoriaReprogramacion(batch, {
        reservaId: res.id,
        tipo: 'reasignacion_tutor',
        origen: 'AdminReservaDetalle',
        motivo,
        antes,
        despues,
        autorId: user?.uid || 'admin',
        autorRol: 'admin'
      });

      // Deuda(s) del tutor saliente por el exceso cobrado. IDs determinísticos
      // por reserva/tutor/ciclo para que reintentar no duplique documentos.
      const cicloDeuda = Number(res.reprogramacionesCount) || 0;
      for (const deudaRelevo of deudasRelevo) {
        if (!deudaRelevo?.instructorId || !(deudaRelevo.monto > 0)) continue;

        const deudaId = `deuda_${res.id}_${deudaRelevo.instructorId}_relevo_${cicloDeuda}`;
        const ledgerId = `ledger_${deudaId}`;
        const deudaRef = doc(db, 'deudasInstructor', deudaId);
        const ledgerRef = doc(db, 'ledgerInstructor', ledgerId);
        const [deudaSnap, ledgerSnap] = await Promise.all([getDoc(deudaRef), getDoc(ledgerRef)]);

        if (!deudaSnap.exists()) {
          batch.set(deudaRef, {
            instructorId: deudaRelevo.instructorId,
            reservaId: res.id,
            motivo: deudaRelevo.motivo,
            montoOriginal: deudaRelevo.monto,
            saldo: deudaRelevo.monto,
            moneda: 'USD',
            estado: 'pendiente',
            createdAt: serverTimestamp(),
            createdBy: user?.uid || 'admin',
            abonos: []
          });
        }

        if (!ledgerSnap.exists()) {
          batch.set(ledgerRef, {
            tipo: 'deuda',
            instructorId: deudaRelevo.instructorId,
            deudaId,
            reservaId: res.id,
            monto: deudaRelevo.monto,
            createdAt: serverTimestamp(),
            createdBy: user?.uid || 'admin',
            idempotencyKey: `deuda:${res.id}:${deudaRelevo.instructorId}:relevo:${cicloDeuda}`
          });
        }
      }

      await batch.commit();

      showToast(
        instructorInicioCurso
          ? 'Tutor reasignado: D1 conservado y D2 al 50% para el nuevo tutor'
          : 'Tutor reasignado: 100% de la comisión al nuevo tutor',
        'success'
      );
      setMostrarReasignar(false);
            navigate(volverA);
    } catch (error) {
      showToast('Error al reasignar: ' + error.message, 'error');
    }
  };

  // Cambio de moto asignada. Deriva proveedorId del motoDestino (SSOT).
  const cambiarMoto = async ({ motoDestinoId, motoDestinoNombre, proveedorDestinoId, proveedorDestinoNombre, motivo }) => {
    if (!isAdmin) return showToast('Sin permisos', 'error');
    if (!motoDestinoId) return showToast('Selecciona una moto', 'error');
    if (String(motoDestinoId) === String(res.motoAsignadaId)) {
      return showToast('Selecciona una moto diferente', 'error');
    }
    if (res.estadoPago === 'Cancelado') {
      return showToast('No se puede cambiar una reserva cancelada', 'error');
    }
    if (cursoIniciadoParaRelevo(res)) {
      return showToast('El curso ya inició: usa Reponer D2 para cambiar la moto/proveedor del segundo día', 'error');
    }

    const motoDestino = (motos || []).find(m => String(m.id) === String(motoDestinoId));
    if (!motoDestino) return showToast('Moto destino no encontrada', 'error');

    // Verificar que la moto no esté ocupada por OTRA reserva en las fechas de esta reserva.
    // D2: compara la moto/bloque EFECTIVOS de cada fecha (motoReposicionId /
    // horaIdReposicion en fecha2), no solo motoAsignadaId.
    const fechasRes = [res.fecha, res.fecha2].filter(Boolean);
    const conflicto = (reservas || []).some(r => {
      if (String(r.id) === String(res.id)) return false;
      if (r.estadoPago !== 'Aprobado' && r.estadoPago !== 'Pendiente') return false;
      for (const f of fechasRes) {
        // En D1 el cambio aplica a motoDestinoId; en D2 rige la moto efectiva.
        const motoRes = f === res.fecha ? motoDestinoId : getMotoIdOcupacion(res, f);
        const motoR = getMotoIdOcupacion(r, f);
        if (!motoRes || !motoR || String(motoRes) !== String(motoR)) continue;
        const bloqueRes = getHoraIdOcupacion(res, f);
        const bloqueR = getHoraIdOcupacion(r, f);
        if (bloqueRes && bloqueR && String(bloqueRes) === String(bloqueR)) return true;
      }
      return false;
    });
    if (conflicto) {
      const confirmado = window.confirm(
        'âš ï¸ Esta moto ya tiene otra reserva en esa fecha y bloque. Puede haber doble asignaciÃ³n.\n\nÂ¿Deseas continuar?'
      );
      if (!confirmado) return;
    }

    const cambiaProveedor = proveedorDestinoId &&
      String(proveedorDestinoId) !== String(res.proveedorId || '');
    const relevoProveedor = cambiaProveedor
      ? calcularRelevoProveedor(res, {
        proveedorDestinoId,
        proveedorDestinoNombre,
        inicioCurso: false
      })
      : null;
    if (cambiaProveedor && !relevoProveedor) {
      return showToast('No se pudo calcular el relevo del proveedor', 'error');
    }

    try {
      const batch = writeBatch(db);
      const reservaRef = doc(db, 'artifacts/motoescuela-pro-v1/public/data/reservas', res.id);
      const espejoRef = doc(db, 'ocupacionConfirmada', res.id);

      const pagoAntes = {
        pagadoProveedor: res.pagadoProveedor === true,
        pagoProveedorId: res.pagoProveedorId || null
      };
      const pagoDespues = relevoProveedor
        ? {
          pagadoProveedor: relevoProveedor.pagadoProveedor === true,
          pagoProveedorId: relevoProveedor.pagoProveedorId || null
        }
        : pagoAntes;

      const evento = {
        id: `cambio_moto_${Date.now()}`,
        timestamp: Timestamp.now(),
        autor: user?.uid || 'admin',
        autorRol: 'admin',
        tipo: 'cambio_moto',
        motivo: motivo || '',
        antes: { motoAsignadaId: res.motoAsignadaId || null, proveedorId: res.proveedorId || null, ...pagoAntes },
        despues: { motoAsignadaId: motoDestinoId, proveedorId: proveedorDestinoId || null, ...pagoDespues }
      };

      const datosActualizacion = {
        motoAsignadaId: motoDestinoId,
        proveedorId: proveedorDestinoId || null,
        motoAnteriorId: res.motoAsignadaId || null,
        proveedorAnteriorId: res.proveedorId || null,
        proveedorOriginalId: res.proveedorOriginalId || res.proveedorId || null,
        ...(relevoProveedor ? {
          pagosProveedorDia: relevoProveedor.pagosProveedorDia,
          pagadoProveedor: relevoProveedor.pagadoProveedor,
          pagoProveedorId: relevoProveedor.pagoProveedorId
        } : {}),
        reprogramaciones: arrayUnion(evento),
        reprogramacionesCount: (res.reprogramacionesCount || 0) + 1,
        ultimaReprogramacion: serverTimestamp(),
        cambiadoPor: user?.uid || 'admin',
        cambiadoEn: serverTimestamp()
      };

      batch.update(reservaRef, datosActualizacion);
      batch.set(espejoRef, {
        motoAsignadaId: motoDestinoId,
        proveedorId: proveedorDestinoId || null,
        comisionProveedor: Number(res.comisionProveedor) || 0,
        ...(relevoProveedor ? {
          pagosProveedorDia: relevoProveedor.pagosProveedorDia,
          pagadoProveedor: relevoProveedor.pagadoProveedor,
          pagoProveedorId: relevoProveedor.pagoProveedorId
        } : {})
      }, { merge: true });

      if (relevoProveedor?.deudas?.length) {
        const cicloDeuda = Number(res.reprogramacionesCount) || 0;
        for (const deuda of relevoProveedor.deudas) {
          if (!deuda?.proveedorId || !(deuda.monto > 0)) continue;
          const deudaId = `deuda_${res.id}_${deuda.proveedorId}_prov_${cicloDeuda}`;
          const ledgerId = `ledger_${deudaId}`;
          const deudaRef = doc(db, 'deudasProveedor', deudaId);
          const ledgerRef = doc(db, 'ledgerProveedor', ledgerId);
          const [deudaSnap, ledgerSnap] = await Promise.all([getDoc(deudaRef), getDoc(ledgerRef)]);

          if (!deudaSnap.exists()) {
            batch.set(deudaRef, {
              proveedorId: deuda.proveedorId,
              reservaId: res.id,
              motivo: deuda.motivo,
              montoOriginal: deuda.monto,
              saldo: deuda.monto,
              moneda: 'USD',
              estado: 'pendiente',
              createdAt: serverTimestamp(),
              createdBy: user?.uid || 'admin',
              abonos: []
            });
          }
          if (!ledgerSnap.exists()) {
            batch.set(ledgerRef, {
              tipo: 'deuda',
              proveedorId: deuda.proveedorId,
              deudaId,
              reservaId: res.id,
              monto: deuda.monto,
              createdAt: serverTimestamp(),
              createdBy: user?.uid || 'admin',
              idempotencyKey: `deuda:${res.id}:${deuda.proveedorId}:prov:${cicloDeuda}`
            });
          }
        }
      }

      agregarAuditoriaReprogramacion(batch, {
        reservaId: res.id,
        tipo: 'cambio_moto',
        origen: 'AdminReservaDetalle',
        motivo,
        antes: { motoAsignadaId: res.motoAsignadaId || null, proveedorId: res.proveedorId || null, ...pagoAntes },
        despues: { motoAsignadaId: motoDestinoId, proveedorId: proveedorDestinoId || null, ...pagoDespues },
        autorId: user?.uid || 'admin',
        autorRol: 'admin'
      });

      await batch.commit();

      showToast(`Moto cambiada. Proveedor: ${proveedorDestinoNombre || 'Sin asignar'}`, 'success');
      setMostrarCambiarMoto(false);
      navigate(volverA, { replace: true });

    } catch (error) {
      console.error('[AdminReservaDetalle] Error cambiando moto:', error);
      showToast('Error al cambiar moto: ' + error.message, 'error');
    }
  };

   const cambiarHorario = async (payload) => {
    // Guardia de cancelada: no se escribe reserva, espejo, locks ni auditoría.
    if (res.estadoPago === 'Cancelado') {
      return showToast('No se puede reprogramar una reserva cancelada', 'error');
    }

    const { modo } = payload;

    try {
      // ─────────────────────────────────────────────────────
      // MODO REPONER D2 (post-inicio, D1 inmutable)
      // ─────────────────────────────────────────────────────
      if (modo === 'reponer_d2') {
        const { nuevaFecha2, horaIdReposicion, motoReposicionId, motivo, categoriaMotivo, notasAdmin } = payload;

        if (!nuevaFecha2 || !horaIdReposicion || !motivo) {
          return showToast('Faltan datos: fecha D2, bloque o motivo', 'error');
        }

        // D9: el guardado se bloquea si otra reserva ocupa el tutor/moto en el
        // bloque de reposición. Se audita el intento (motivo + conflictos).
        const motoD2 = res.traeMoto === 'Sí' ? null : (motoReposicionId || res.motoAsignadaId || null);
        const conflictoD2 = detectarConflictosReprogramacion({
          reserva: res,
          ocupacionConfirmada: reservas,
          fechas: [nuevaFecha2],
          horaId: horaIdReposicion,
          instructorId: res.instructorId,
          motoId: motoD2,
          excluirReservaId: res.id
        });
        if (conflictoD2.bloqueado) {
          const resultadoAuditoria = await auditarReprogramacionBloqueada({
            reservaId: res.id,
            motivo,
            antes: {
              fecha: res.fecha,
              fecha2: res.fecha2,
              horaId: res.horaId,
              horaIdReposicion: res.horaIdReposicion || null,
              motoAsignadaId: res.motoAsignadaId || null,
              motoReposicionId: res.motoReposicionId || null
            },
            despues: {
              fecha: res.fecha,
              fecha2: nuevaFecha2,
              horaId: res.horaId,
              horaIdReposicion,
              motoAsignadaId: res.motoAsignadaId || null,
              motoReposicionId: motoReposicionId || null
            },
            conflictos: conflictoD2.conflictos,
            autorId: user?.uid
          });
          return showToast(
            mensajeBloqueoConAuditoria(
              mensajeConflictoReprogramacion(conflictoD2.conflictos),
              resultadoAuditoria
            ),
            'error'
          );
        }

        // Proveedor de reposición derivado del catálogo de motos (SSOT).
        // NO sobrescribe proveedorId de D1.
        const proveedorReposicionId = derivarProveedorReposicion(motoReposicionId, motos);

        // D2-FINANZAS: si D2 lo cubre otro proveedor, se normaliza el mapa
        // D1/D2 y se calcula la deuda del original por sobrepago legacy.
        const esSplitD2 = Boolean(
          proveedorReposicionId &&
          res.proveedorId &&
          String(proveedorReposicionId) !== String(res.proveedorId)
        );

        let pagosProveedorDiaSplit = null;
        let proveedoresInvolucradosSplit = null;
        let deudasD2 = [];

        if (esSplitD2) {
          const reservaSplit = { ...res, proveedorReposicionId };
          const asignaciones = construirAsignacionesProveedor(reservaSplit);
          const comisionTotal = comisionProveedorReserva(res);
          const mapaPrevio = res.pagosProveedorDia || null;
          const legacyPagado = res.pagadoProveedor === true && !mapaPrevio;
          const redondear = (valor) => Math.round((Number(valor) + Number.EPSILON) * 100) / 100;

          pagosProveedorDiaSplit = {};
          asignaciones.forEach((asignacion) => {
            const previoBruto = mapaPrevio?.[asignacion.dia] || {};
            const previoDelMismo = !previoBruto.proveedorId ||
              String(previoBruto.proveedorId) === String(asignacion.proveedorId);
            const previo = previoDelMismo ? previoBruto : {};
            const teniaPago = previoDelMismo &&
              (previo.pagado === true || Boolean(previo.pagoId) || previo.montoPagado != null);
            let pagado = asignacion.pagado === true;
            let pagoId = asignacion.pagoId || null;
            let montoPagado = pagado ? asignacion.monto : 0;

            if (legacyPagado && asignacion.dia === 'd1') {
              // Legacy cobró el 100%; el mapa deja constancia del exceso.
              pagado = true;
              pagoId = res.pagoProveedorId || null;
              montoPagado = comisionTotal;
            } else if (teniaPago) {
              pagado = previo.pagado === true || Boolean(previo.pagoId);
              pagoId = previo.pagoId || null;
              montoPagado = Number(previo.montoPagado);
              if (!Number.isFinite(montoPagado)) montoPagado = pagado ? asignacion.monto : 0;
            }

            pagosProveedorDiaSplit[asignacion.dia] = {
              proveedorId: asignacion.proveedorId,
              monto: asignacion.monto,
              montoPagado: redondear(montoPagado),
              pagado,
              pagoId
            };
          });

          deudasD2 = calcularDeudasReprogramacionD2(reservaSplit);
          proveedoresInvolucradosSplit = Array.from(new Set(
            [
              ...(res.proveedoresInvolucrados || []),
              res.proveedorId,
              mapaPrevio?.d2?.proveedorId,
              proveedorReposicionId
            ]
              .filter((id) => id != null && id !== '')
              .map(String)
          ));
        }

        // Confirmación especial si hay sesión activa
        const haySesionActiva = res.pausaActiva || res.moduloEnProgreso || (res.tiempoEfectivo && res.tiempoEfectivo > 0);
        if (haySesionActiva) {
          const confirmado = window.confirm(
            '⚠️ Hay una sesión del Aula Virtual en curso. Reponer D2 ahora puede afectar la sesión.\n\n¿Deseas continuar?'
          );
          if (!confirmado) return;
        }

        const batch = writeBatch(db);
        const reservaRef = doc(db, 'artifacts/motoescuela-pro-v1/public/data/reservas', res.id);
        const ocupacionRef = doc(db, 'ocupacionConfirmada', res.id);

        const snapshotAntes = {
          fecha: res.fecha,
          fecha2: res.fecha2,
          horaId: res.horaId,
          horaIdReposicion: res.horaIdReposicion || null,
          motoAsignadaId: res.motoAsignadaId || null,
          motoReposicionId: res.motoReposicionId || null,
          proveedorReposicionId: res.proveedorReposicionId || null
        };

        const snapshotDespues = {
          fecha: res.fecha,                      // D1 inmutable
          fecha2: nuevaFecha2,                    // D2 movido
          horaId: res.horaId,                     // bloque original inmutable
          horaIdReposicion,                       // bloque real de reposición
          motoAsignadaId: res.motoAsignadaId || null,
          motoReposicionId: motoReposicionId || null,
          proveedorReposicionId
        };

        const evento = {
          id: `reprog_${Date.now()}`,
          timestamp: Timestamp.now(),
          autor: user?.uid || 'admin',
          autorRol: 'admin',
          tipo: 'post_inicio_reposicion',
          motivo,
          categoriaMotivo,
          antes: snapshotAntes,
          despues: snapshotDespues,
          notasAdmin: notasAdmin || ''
        };

        batch.update(reservaRef, {
          fecha2: nuevaFecha2,
          horaIdReposicion,
          motoReposicionId: motoReposicionId || null,
          proveedorReposicionId,
          ...(esSplitD2 ? {
            pagosProveedorDia: pagosProveedorDiaSplit,
            proveedoresInvolucrados: proveedoresInvolucradosSplit
          } : {}),
          reprogramaciones: arrayUnion(evento),
          reprogramacionesCount: (res.reprogramacionesCount || 0) + 1,
          ultimaReprogramacion: serverTimestamp()
        });

        // Espejo: reflejar la nueva fecha2 + horaIdReposicion para que otros vean ocupación
        batch.set(ocupacionRef, {
          fecha: res.fecha,
          fecha2: nuevaFecha2,
          horaId: res.horaId,
          horaIdReposicion,
          motoAsignadaId: res.motoAsignadaId || null,
          motoReposicionId: motoReposicionId || null,
          proveedorReposicionId,
          instructorId: res.instructorId,
          tipoCurso: res.tipoCurso || null,
          userId: res.userId,
          traeMoto: res.traeMoto,
          sedeId: res.sedeId,
          estadoPago: res.estadoPago,
          proveedorId: res.proveedorId || null,
          comisionProveedor: Number(res.comisionProveedor) || 0,
          ...(esSplitD2 ? {
            pagosProveedorDia: pagosProveedorDiaSplit,
            proveedoresInvolucrados: proveedoresInvolucradosSplit
          } : {})
        }, { merge: true });

        // Deuda(s) por sobrepago D2: exceso legacy del original y/o un
        // proveedor D2 anterior que ya cobró y deja de servir. IDs
        // determinísticos por proveedor para que reintentar no duplique
        // docs ni asientos.
        if (esSplitD2 && deudasD2.length > 0) {
          const cicloDeuda = Number(res.reprogramacionesCount) || 0;
          for (const deudaD2 of deudasD2) {
            if (!deudaD2?.proveedorId || !(deudaD2.monto > 0)) continue;

            const deudaId = `deuda_${res.id}_${deudaD2.proveedorId}_d2_${cicloDeuda}`;
            const ledgerId = `ledger_${deudaId}`;
            const deudaRef = doc(db, 'deudasProveedor', deudaId);
            const ledgerRef = doc(db, 'ledgerProveedor', ledgerId);
            const [deudaSnap, ledgerSnap] = await Promise.all([getDoc(deudaRef), getDoc(ledgerRef)]);

            if (!deudaSnap.exists()) {
              batch.set(deudaRef, {
                proveedorId: deudaD2.proveedorId,
                reservaId: res.id,
                motivo: deudaD2.motivo,
                montoOriginal: deudaD2.monto,
                saldo: deudaD2.monto,
                moneda: 'USD',
                estado: 'pendiente',
                createdAt: serverTimestamp(),
                createdBy: user?.uid || 'admin',
                abonos: []
              });
            }

            if (!ledgerSnap.exists()) {
              batch.set(ledgerRef, {
                tipo: 'deuda',
                proveedorId: deudaD2.proveedorId,
                deudaId,
                reservaId: res.id,
                monto: deudaD2.monto,
                createdAt: serverTimestamp(),
                createdBy: user?.uid || 'admin',
                idempotencyKey: `deuda:${res.id}:${deudaD2.proveedorId}:d2:${cicloDeuda}`
              });
            }
          }
        }

        agregarAuditoriaReprogramacion(batch, {
          reservaId: res.id,
          tipo: 'post_inicio_reposicion',
          origen: 'AdminReservaDetalle',
          motivo,
          antes: snapshotAntes,
          despues: snapshotDespues,
          autorId: user?.uid || 'admin',
          autorRol: 'admin'
        });

        // Liberar locks asociados
        const locksOriginales = await obtenerLocksDeReserva(res);
        locksOriginales.forEach(lock => {
          batch.delete(doc(db, 'locks', lock.id));
          batch.delete(doc(db, 'ocupacionTemporal', lock.id));
        });

        await batch.commit();

        // FT-090: D2 repuesto → mover la movilidad de D2 y avisar al prestador.
        await MovilidadService.sincronizarConReserva(res.id, {
          fecha: res.fecha,
          fecha2: nuevaFecha2,
          horaId: res.horaId,
          horaIdReposicion,
          estadoReserva: res.estadoPago,
        }).catch((err) => console.warn('[AdminReservaDetalle] Movilidad D2 no sincronizada:', err?.code || err?.message));

        const msg = construirMensajeReprogramacion({
          nombre: res.nombre,
          curso: curso?.nombre || 'tu sesión',
          fecha: formatearFecha(nuevaFecha2),
          horario: (horarios || []).find(h => String(h.id) === String(horaIdReposicion))?.label || horaIdReposicion,
          sede: sede || {},
          motivo: motivo || '',
          codigoReserva: codigoReservaCorto(res.id)
        });
        const waUrl = construirLinkWhatsApp(res.telefono, msg);
        if (waUrl) setWaModalData({ url: waUrl, mensaje: msg, titulo: 'Notificar Reposición D2' });

        showToast('D2 repuesto correctamente', 'success');
        setMostrarCambiarHorario(false);
        return;
      }

      // ─────────────────────────────────────────────────────
      // MODO CAMBIO TOTAL (comportamiento original + motivo)
      // ─────────────────────────────────────────────────────
      const { nuevaFecha, nuevaFecha2, nuevoHoraId, motivo, categoriaMotivo, notasAdmin } = payload;

      if (!nuevaFecha || !nuevoHoraId) {
        return showToast('Faltan datos: fecha y horario', 'error');
      }

      // D9: cross-check duro antes de escribir. Si el tutor/moto ya están
      // ocupados en D1 o D2, se bloquea y se audita el intento.
      const motoTotal = res.traeMoto === 'Sí' ? null : (res.motoAsignadaId || null);
      const conflictoTotal = detectarConflictosReprogramacion({
        reserva: res,
        ocupacionConfirmada: reservas,
        fechas: [nuevaFecha, nuevaFecha2].filter(Boolean),
        horaId: nuevoHoraId,
        instructorId: res.instructorId,
        motoId: motoTotal,
        excluirReservaId: res.id
      });
      if (conflictoTotal.bloqueado) {
        const resultadoAuditoria = await auditarReprogramacionBloqueada({
          reservaId: res.id,
          motivo,
          antes: {
            fecha: res.fecha,
            fecha2: res.fecha2,
            horaId: res.horaId,
            motoAsignadaId: res.motoAsignadaId || null
          },
          despues: {
            fecha: nuevaFecha,
            fecha2: nuevaFecha2,
            horaId: nuevoHoraId,
            motoAsignadaId: res.motoAsignadaId || null
          },
          conflictos: conflictoTotal.conflictos,
          autorId: user?.uid
        });
        return showToast(
          mensajeBloqueoConAuditoria(
            mensajeConflictoReprogramacion(conflictoTotal.conflictos),
            resultadoAuditoria
          ),
          'error'
        );
      }

      const horarioAnterior = {
        fecha: res.fecha,
        fecha2: res.fecha2,
        horaId: res.horaId
      };

      const horarioNuevo = {
        fecha: nuevaFecha,
        fecha2: nuevaFecha2,
        horaId: nuevoHoraId
      };

      // Confirmación especial para reservas aprobadas
      if (res.estadoPago === 'Aprobado') {
        const confirmado = window.confirm(
          '⚠️ Esta reserva está APROBADA.\n\n' +
          'Cambiar el horario afectará:\n' +
          '• La disponibilidad del sistema\n' +
          '• La experiencia del usuario\n' +
          '• La planificación del instructor\n\n' +
          '¿Deseas continuar?'
        );
        if (!confirmado) return;
      }

      // Verificar sesión activa
      const haySesionActiva = res.pausaActiva || res.moduloEnProgreso || (res.tiempoEfectivo && res.tiempoEfectivo > 0);
      if (haySesionActiva) {
        const confirmado = window.confirm(
          '⚠️ Hay una sesión del Aula Virtual en curso. Cambiar el horario ahora puede afectar la sesión.\n\n' +
          '¿Deseas continuar de todos modos?'
        );
        if (!confirmado) return;
      }

      const batch = writeBatch(db);
      const reservaRef = doc(db, 'artifacts/motoescuela-pro-v1/public/data/reservas', res.id);
      const ocupacionRef = doc(db, 'ocupacionConfirmada', res.id);

      const evento = {
        id: `reprog_${Date.now()}`,
        timestamp: Timestamp.now(),
        autor: user?.uid || 'admin',
        autorRol: 'admin',
        tipo: 'pre_inicio_total',
        motivo: motivo || '',
        categoriaMotivo: categoriaMotivo || 'admin',
        antes: horarioAnterior,
        despues: horarioNuevo,
        notasAdmin: notasAdmin || ''
      };

      const datosActualizacion = {
        fecha: nuevaFecha,
        fecha2: nuevaFecha2,
        horaId: nuevoHoraId,
        // BUG-2/F1: un cambio total de horario invalida la reposicion D2 previa.
        // Evita que horaIdReposicion/motoReposicionId obsoletos contaminen el espejo.
        horaIdReposicion: null,
        motoReposicionId: null,
        horarioAnterior: horarioAnterior,
        horarioNuevo: horarioNuevo,
        reprogramaciones: arrayUnion(evento),
        reprogramacionesCount: (res.reprogramacionesCount || 0) + 1,
        ultimaReprogramacion: serverTimestamp(),
        cambiadoPor: user?.uid || 'admin',
        cambiadoEn: serverTimestamp()
      };

      batch.update(reservaRef, datosActualizacion);
      batch.set(ocupacionRef, {
        ...datosActualizacion,
        estadoPago: res.estadoPago,
        proveedorId: res.proveedorId || null,
        comisionProveedor: Number(res.comisionProveedor) || 0
      }, { merge: true });

      agregarAuditoriaReprogramacion(batch, {
        reservaId: res.id,
        tipo: 'pre_inicio_total',
        origen: 'AdminReservaDetalle',
        motivo,
        antes: horarioAnterior,
        despues: horarioNuevo,
        autorId: user?.uid || 'admin',
        autorRol: 'admin'
      });

      const locksOriginales = await obtenerLocksDeReserva(res);
      locksOriginales.forEach(lock => {
        batch.delete(doc(db, 'locks', lock.id));
        batch.delete(doc(db, 'ocupacionTemporal', lock.id));
      });

      await batch.commit();

      // FT-090: cambio total de fecha/hora → sincronizar D1 (y D2 si aplica).
      await MovilidadService.sincronizarConReserva(res.id, {
        fecha: nuevaFecha,
        fecha2: nuevaFecha2,
        horaId: nuevoHoraId,
        horaIdReposicion: null,
        estadoReserva: res.estadoPago,
      }).catch((err) => console.warn('[AdminReservaDetalle] Movilidad no sincronizada:', err?.code || err?.message));

      const msg = construirMensajeReprogramacion({
        nombre: res.nombre,
        curso: curso?.nombre || 'tu sesión',
        fecha: formatearFecha(nuevaFecha),
        horario: (horarios || []).find(h => String(h.id) === String(nuevoHoraId))?.label || nuevoHoraId,
        sede: sede || {},
        motivo: motivo || '',
        codigoReserva: codigoReservaCorto(res.id)
      });
      const waUrl = construirLinkWhatsApp(res.telefono, msg);
      if (waUrl) setWaModalData({ url: waUrl, mensaje: msg, titulo: 'Notificar Reprogramación' });

      showToast('Horario cambiado correctamente', 'success');
      setMostrarCambiarHorario(false);

    } catch (error) {
      console.error('[AdminReservaDetalle] Error cambiando horario:', error);
      showToast('Error al cambiar horario: ' + error.message, 'error');
    }
  };

      // Función auxiliar para obtener locks de una reserva (por instructorId y fechas)
  const obtenerLocksDeReserva = async (reserva) => {
    if (!reserva || !reserva.instructorId) return [];

    const resultadosMap = new Map();

    try {
            // Consulta en la colección viva de disponibilidad (ocupacionTemporal).
      // Buscamos TODOS los locks del instructor y filtramos en memoria,
      // porque horaId puede ser h6 (original) o h4 (reposición).
            const q1 = query(
        collection(db, 'ocupacionTemporal'),
        where('instructorId', '==', reserva.instructorId)
      );

      const snapshot1 = await getDocs(q1);

      // Filtrar en memoria: solo locks de ESTA reserva.
      // En fecha:  horaId. En fecha2: horaIdReposicion || horaId.
      const bloqueD1Filtro = reserva.horaId;
      const bloqueD2Filtro = reserva.horaIdReposicion || reserva.horaId;

      snapshot1.docs.forEach(d => {
        const lockData = d.data();
        const matchD1 = reserva.fecha && lockData.fecha === reserva.fecha
                        && String(lockData.horaId) === String(bloqueD1Filtro);
        const matchD2 = reserva.fecha2 && lockData.fecha === reserva.fecha2
                        && String(lockData.horaId) === String(bloqueD2Filtro);
        if (matchD1 || matchD2) {
          resultadosMap.set(d.id, { id: d.id, ...lockData });
        }
      });

      // Respaldo: construir IDs directos por si la consulta no encontró algo.
      // Para fecha usa horaId; para fecha2 usa horaIdReposicion || horaId.
      if (reserva.instructorId) {
        const motoPart = reserva.motoAsignadaId ? String(reserva.motoAsignadaId) : 'sinmoto';
        const bloqueD1 = reserva.horaId;
        const bloqueD2 = reserva.horaIdReposicion || reserva.horaId;

        if (reserva.fecha && bloqueD1) {
          const lockIdDirecto = `${reserva.fecha}_${bloqueD1}_${reserva.instructorId}_${motoPart}`;
          if (!resultadosMap.has(lockIdDirecto)) {
            resultadosMap.set(lockIdDirecto, { id: lockIdDirecto, eliminacionDirecta: true });
          }
        }

        if (reserva.fecha2 && bloqueD2) {
          const lockIdDirecto2 = `${reserva.fecha2}_${bloqueD2}_${reserva.instructorId}_${motoPart}`;
          if (!resultadosMap.has(lockIdDirecto2)) {
            resultadosMap.set(lockIdDirecto2, { id: lockIdDirecto2, eliminacionDirecta: true });
          }
        }
      }

      return Array.from(resultadosMap.values());
    } catch (error) {
      console.error('[obtenerLocksDeReserva] Error:', error);
      return [];
    }
  };

  const estadoBadge = {
    Pendiente: 'bg-orange-100 text-orange-700',
    Aprobado: 'bg-green-100 text-green-700',
    Rechazado: 'bg-red-100 text-red-700',
    Cancelado: 'bg-gray-200 text-gray-700',
  };

  // ── Datos derivados solo para presentación (no alteran handlers ni reglas) ──
  const intentosCorreccion = res.intentosCorreccion || 0;
  const intentosAgotados = intentosCorreccion >= 3;
  const whatsappDisponible = Boolean(construirLinkWhatsApp(res.telefono, ''));

  const estadosModulos = res.modulosEstado || {};
  const modulosDelCurso = (curso?.modulos || []).map((mod) =>
    typeof mod === 'string' ? { nombre: mod } : mod
  );
  const totalModulos = modulosDelCurso.length;
  const completadosModulos = modulosDelCurso.filter((m) => estadosModulos[m.nombre]?.fecha).length;
  const pctModulos = totalModulos > 0 ? Math.round((completadosModulos / totalModulos) * 100) : 0;

  const abrirWhatsApp = (url) => {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
    showToast('Se abrió WhatsApp. Presiona Enviar.', 'info');
  };

  const enviarWaAprobacion = () => {
    const mensaje = construirMensajeAprobacion({
      nombre: res.nombre,
      curso: curso?.nombre || 'tu sesión',
      fecha: formatearFecha(res.fecha),
      horario: horario?.label || bloqueEfectivo || res.horaId || '',
      sede: sede || {},
      codigoReserva: codigoReservaCorto(res.id)
    });
    abrirWhatsApp(construirLinkWhatsApp(res.telefono, mensaje));
  };

  const enviarWaRechazo = () => {
    const motivo = res.motivoRechazo || 'La referencia del pago no coincide';
    const mensaje = construirMensajeRechazo({
      nombre: res.nombre,
      curso: curso?.nombre || 'tu sesión',
      motivo,
      codigoReserva: codigoReservaCorto(res.id),
      intentosRestantes: Math.max(0, 3 - intentosCorreccion),
      linkCorreccion: `${getBaseUrl()}/corregir-pago/reserva/${res.id}`
    });
    abrirWhatsApp(construirLinkWhatsApp(res.telefono, mensaje));
  };

  const enviarWaReprogramacion = () => {
    const mensaje = construirMensajeReprogramacion({
      nombre: res.nombre,
      curso: curso?.nombre || 'tu sesión',
      fecha: formatearFecha(res.fecha2 || res.fecha),
      horario: horario?.label || bloqueEfectivo || res.horaId || '',
      sede: sede || {},
      motivo: '',
      codigoReserva: codigoReservaCorto(res.id)
    });
    abrirWhatsApp(construirLinkWhatsApp(res.telefono, mensaje));
  };

  const abrirChatWhatsApp = () => {
    const url = construirLinkWhatsApp(res.telefono, '');
    abrirWhatsApp(url ? url.replace(/\?text=$/, '') : null);
  };

  const accionesPago = [
    {
      id: 'pago-aprobar',
      etiqueta: 'Aprobar pago',
      descripcion: 'Registra el ingreso y activa el curso',
      icon: CheckCircle,
      tono: 'success',
      onSelect: aprobarPago
    },
    {
      id: 'pago-rechazar',
      etiqueta: 'Rechazar (corregir)',
      descripcion: intentosAgotados
        ? 'Sin intentos: el usuario ya no puede corregir'
        : `Permite corregir la referencia (${intentosCorreccion}/3 rechazos)`,
      icon: AlertCircle,
      tono: 'danger',
      deshabilitado: intentosAgotados,
      onSelect: () => setModalMotivo('rechazar')
    },
    {
      id: 'pago-cancelar',
      etiqueta: 'Cancelar definitivamente',
      descripcion: 'Cancela la reserva y libera el horario',
      icon: X,
      tono: 'neutral',
      onSelect: () => rechazarPago('cancelar')
    }
  ];

  const accionesCambios = [
    {
      id: 'cambio-reasignar',
      etiqueta: 'Reasignar / Relevo',
      descripcion: availableInstructors.length === 0
        ? 'No hay tutores disponibles en la sede'
        : 'Cambia el tutor y recalcula la comisión',
      icon: Users,
      tono: 'primary',
      deshabilitado:
        availableInstructors.length === 0 ||
        res.estadoPago === 'Cancelado' ||
        (res.esReservaCompartida === true && !res.pagosInstructorDia),
      onSelect: () => setMostrarReasignar(true)
    },
    {
      id: 'cambio-moto',
      etiqueta: 'Cambiar proveedor / moto',
      descripcion: cursoIniciadoParaRelevo(res)
        ? 'Curso iniciado: el cambio de D2 se hace con Reponer D2'
        : res.pagadoProveedor === true
          ? 'Pago registrado; se aplica la regla de relevo del proveedor'
          : !res.motoAsignadaId
            ? 'Esta reserva no tiene moto asignada'
            : 'El proveedor se deriva de la moto',
      icon: Bike,
      tono: 'neutral',
      deshabilitado: res.estadoPago === 'Cancelado' || !res.motoAsignadaId,
      onSelect: () => setMostrarCambiarMoto(true)
    },
    {
      id: 'cambio-horario',
      etiqueta: 'Cambiar horario',
      descripcion: 'Reprograma fecha y bloque de la reserva',
      icon: Calendar,
      tono: 'neutral',
      deshabilitado: res.estadoPago === 'Cancelado',
      onSelect: () => setMostrarCambiarHorario(true)
    }
  ];

  const accionesWhatsApp = [
    ...(res.estadoPago === 'Aprobado'
      ? [{
        id: 'wa-aprobacion',
        etiqueta: 'Confirmación de pago',
        descripcion: 'Aprobación con fecha, hora y sede',
        icon: CheckCircle,
        tono: 'success',
        deshabilitado: !whatsappDisponible,
        onSelect: enviarWaAprobacion
      }]
      : []),
    ...(res.estadoPago === 'Rechazado'
      ? [{
        id: 'wa-rechazo',
        etiqueta: 'Notificar rechazo',
        descripcion: 'Motivo, intentos restantes y link de corrección',
        icon: AlertCircle,
        tono: 'danger',
        deshabilitado: !whatsappDisponible,
        onSelect: enviarWaRechazo
      }]
      : []),
    ...((Number(res.reprogramacionesCount) || 0) > 0
      ? [{
        id: 'wa-reprogramacion',
        etiqueta: 'Notificar reprogramación',
        descripcion: 'Fecha y horario vigentes de la reserva',
        icon: Calendar,
        tono: 'primary',
        deshabilitado: !whatsappDisponible,
        onSelect: enviarWaReprogramacion
      }]
      : []),
    {
      id: 'wa-chat',
      etiqueta: 'Abrir chat',
      descripcion: 'Conversación sin mensaje predefinido',
      icon: MessageCircle,
      tono: 'whatsapp',
      deshabilitado: !whatsappDisponible,
      onSelect: abrirChatWhatsApp
    }
  ];

  // FT-089: datos del Paso 1; el snapshot de la reserva gana sobre el perfil.
  const perfilDatos = perfilUsuario?.uid === res?.userId ? perfilUsuario.data : null;
  const fechaNacimientoDato = res?.fechaNacimiento || perfilDatos?.fechaNacimiento || '';
  const sexoDato = res?.sexo || perfilDatos?.sexo || '';
  const condicionMedicaDato = res?.condicionMedica || perfilDatos?.condicionMedica || '';
  const detalleCondicionDato = res?.detalleCondicion || perfilDatos?.detalleCondicion || '';
  const edadDato = calcularEdad(fechaNacimientoDato);

  return (
    <AppShell header={header} footer={footer} bgColor="bg-gray-50" maxWidth="max-w-md lg:max-w-5xl">
      <div className="flex flex-col h-full">        
        <div className="bg-white border-b px-3 py-2 flex items-center gap-2 shrink-0">
                   <button onClick={() => navigate(volverA)} className="p-1.5 bg-gray-100 rounded-full">
            <ChevronLeft size={18} className="text-gray-600" />
          </button>
          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${estadoBadge[res.estadoPago] || 'bg-gray-100'}`}>
            {res.estadoPago === 'Cancelado' ? 'CANCELADO' : res.estadoPago}
          </span>
          {res.estadoCurso === 'Ausente' && (
            <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-700 text-white flex-shrink-0">AUSENTE</span>
          )}
          {res.horasPendientes > 0 && (
            <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500 text-white flex-shrink-0">⏱ {res.horasPendientes}h pend.</span>
          )}
          <h2 className="text-sm font-bold text-gray-900 truncate flex-1">{res.nombre} {res.apellido}</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid min-w-0 grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
            <div className="min-w-0 space-y-2">
          {/* Datos del Usuario y Sesión */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
            <h3 className="text-[11px] font-black text-gray-700 uppercase tracking-wider mb-2">Datos del Usuario y Sesión</h3>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
              <div className="flex items-center justify-between col-span-2 border-b border-gray-100 pb-1 mb-1">
                <div className="flex items-center gap-1"><User size={12} className="text-gray-400 flex-shrink-0" /><span className="font-medium">CI: {res.cedula}</span></div>
                <button 
                  onClick={() => navigate(`/admin/usuario/${res.userId}`)}
                  className="text-[10px] bg-indigo-50 text-indigo-600 font-bold px-2 py-0.5 rounded hover:bg-indigo-100 transition-colors"
                >
                  Ver Ficha del Cliente →
                </button>
              </div>
              <div className="flex items-center gap-1"><Phone size={12} className="text-gray-400 flex-shrink-0" />{res.telefono ? <a href={`tel:${String(res.telefono).replace(/\D/g, '')}`} className="truncate text-blue-600 underline">{res.telefono}</a> : <span className="truncate">—</span>}</div>              
              <div className="flex items-center gap-1"><Mail size={12} className="text-gray-400 flex-shrink-0" /><span className="truncate">{res.correo || '—'}</span></div>
              <div className="flex items-center gap-1"><Phone size={12} className="text-gray-400 flex-shrink-0" /><span>Emerg: </span>{res.contactoEmergencia ? <a href={`tel:${String(res.contactoEmergencia).replace(/\D/g, '')}`} className="truncate text-blue-600 underline">{res.contactoEmergencia}</a> : <span>—</span>}</div>              
              <div className="flex items-center gap-1 col-span-2"><MapPin size={12} className="text-gray-400 flex-shrink-0" /><span className="truncate">{res.estado || '—'}{res.zona ? `, ${res.zona}` : ''}</span></div>
              <div className="flex items-center gap-1"><Calendar size={12} className="text-gray-400 flex-shrink-0" /><span>Edad: {edadDato != null ? `${edadDato} años` : '—'}</span></div>
              <div className="flex items-center gap-1"><User size={12} className="text-gray-400 flex-shrink-0" /><span className="truncate">Sexo: {sexoDato || '—'}</span></div>
              <div className="flex items-start gap-1 col-span-2"><Activity size={12} className="text-gray-400 flex-shrink-0 mt-0.5" /><span className="min-w-0 break-words">Salud: {condicionMedicaDato === 'si' ? (<><span className="font-bold text-amber-600">Sí</span>{detalleCondicionDato ? <span className="text-gray-600"> · {detalleCondicionDato}</span> : null}</>) : condicionMedicaDato === 'no' ? 'No' : '—'}</span></div>
              <div className="col-span-2 border-t border-gray-100 my-1"></div>
              <div className="flex items-center gap-1"><BookOpen size={12} className="text-gray-400 flex-shrink-0" /><span className="font-medium">{curso?.nombre || res.cursoId || '—'}</span></div>
              <div className="flex items-center gap-1"><User size={12} className="text-gray-400 flex-shrink-0" /><span className="truncate">Tutor: {instructorActual ? `${instructorActual.nombre} ${instructorActual.apellido || ''}` : 'Sin asignar'}</span></div>
              <div className="flex items-center gap-1"><Users size={12} className="text-gray-400 flex-shrink-0" /><span className="truncate">Proveedor: {proveedorActual ? proveedorActual.nombre : 'Sin asignar'}</span></div>
              <div className="flex items-center gap-1"><Calendar size={12} className="text-gray-400 flex-shrink-0" /><span>{formatearFecha(res.fecha)} – {formatearFecha(res.fecha2)}</span></div>
              <div className="flex items-center gap-1"><Clock size={12} className="text-gray-400 flex-shrink-0" /><span>{horario?.label || bloqueEfectivo || res.horaId || '—'}</span></div>
              <div className="flex items-center gap-1"><MapPin size={12} className="text-gray-400 flex-shrink-0" /><span>Sede: {formatearSede(sede, { catalogos: { estados, municipios, ciudades } })}</span></div>
                         <div className="flex items-center gap-1"><Bike size={12} className="text-gray-400 flex-shrink-0" /><span>{res.tipoMoto} · {res.traeMoto === 'Sí' ? 'Propia' : 'Moto App'} · Bici: {res.sabeBicicleta}</span></div>
              <div className="col-span-2 flex flex-wrap items-center gap-1 border-t border-gray-100 pt-1 mt-0.5">
                <Bike size={12} className="text-gray-400 flex-shrink-0" />
                <span>Movilidad:</span>
                {cargandoMovilidad ? (
                  <span className="text-gray-400">Cargando…</span>
                ) : solicitudMovilidad ? (
                  <>
                    <span className="font-bold text-emerald-700">{MOVILIDAD_ETIQUETAS[solicitudMovilidad.estado] || solicitudMovilidad.estado || 'Solicitada'}</span>
                    <button
                      type="button"
                      onClick={() => navigate(`/movilidad?reservaId=${encodeURIComponent(res.id)}`)}
                      className="text-[10px] font-bold text-indigo-600 underline"
                    >
                      Ver en Movilidad →
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-gray-500">{res.tipoReserva === 'pack_sub' || res.packReservaId ? 'No aplica (pack)' : 'No solicitada'}</span>
                    <button
                      type="button"
                      onClick={() => navigate('/movilidad')}
                      className="text-[10px] font-bold text-indigo-600 underline"
                    >
                      Abrir Movilidad →
                    </button>
                  </>
                )}
              </div>
            </div>
            <BadgeReposicion reserva={res} horarios={horarios} variant="compact" />
            {res.estadoCurso === 'Ausente' && (
              <div className="mt-2 bg-slate-100 border border-slate-300 rounded-lg p-2 text-[10px]">
                <p className="font-bold text-slate-800">⚠️ Estudiante marcado como Ausente</p>
                {res.ausenteMotivo && <p className="text-slate-600 mt-0.5">Motivo: {res.ausenteMotivo}</p>}
              </div>
            )}
            {res.horasPendientes > 0 && (
              <div className="mt-2 bg-amber-50 border border-amber-300 rounded-lg p-2 text-[10px]">
                <p className="font-bold text-amber-800">⏱ {res.horasPendientes} hora(s) pendiente(s) de servicio</p>
                <p className="text-amber-700 mt-0.5">Pendiente de reprogramación o compensación</p>
              </div>
            )}
          </div>

          {/* Pago */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
            <h3 className="text-[11px] font-black text-gray-700 uppercase tracking-wider mb-2">Pago</h3>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
              <div className="flex items-center gap-1"><CreditCard size={12} className="text-gray-400 flex-shrink-0" /><span>Bco: {res.pagoBanco || '—'}</span></div>
              <div className="flex items-center gap-1"><Phone size={12} className="text-gray-400 flex-shrink-0" /><span>Tlf: {res.pagoTelefono || '—'}</span></div>
              <div className="flex items-center gap-1"><User size={12} className="text-gray-400 flex-shrink-0" /><span>CI: {res.pagoCedula || '—'}</span></div>
              <div className="flex items-center gap-1"><span className="font-bold">Ref: {res.pagoRef || '—'}</span></div>
              <div className="col-span-2 flex items-center gap-1 font-bold text-blue-700">
                <span>Total: Bs. {res.pagoTotalVES || '—'}</span>
                <span className="text-gray-400">| USD {res.pagoTotalMoneda || '—'}</span>
              </div>
            </div>
                   </div>

       
          {/* Banner de estado */}
          {res.estadoPago === 'Aprobado' && (
            <div className="bg-green-50 p-3 rounded-xl border border-green-200 text-center text-xs font-bold text-green-700">✅ Esta reserva ya fue aprobada.</div>
          )}
          {res.estadoPago === 'Cancelado' && (
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-center text-xs font-bold text-gray-700">🚫 Esta reserva fue cancelada.</div>
          )}

          {/* Progreso académico: barra + contador. La gestión de módulos vive en la vista de progreso. */}
          <button
            type="button"
            onClick={() => navigate(`/reservas/${res.id}/progreso`, { state: { from: volverA } })}
            aria-label={`Ver avance detallado: ${completadosModulos} de ${totalModulos} módulos completados`}
            className="w-full min-h-12 rounded-xl border border-gray-100 bg-white p-3 text-left shadow-sm transition-colors hover:border-indigo-300 hover:bg-indigo-50/40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/20"
          >
            <span className="mb-2 flex items-center justify-between gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-gray-700">Progreso Académico</span>
              <span className="flex items-center gap-1 text-[11px] font-bold text-indigo-600">
                {completadosModulos}/{totalModulos}
                <ChevronRight size={14} aria-hidden="true" />
              </span>
            </span>
            <span
              aria-hidden="true"
              className="block h-2 w-full overflow-hidden rounded-full bg-gray-200"
            >
              <span
                className="block h-2 rounded-full bg-indigo-500 transition-all duration-500"
                style={{ width: `${pctModulos}%` }}
              />
            </span>
            <span className="mt-1.5 block text-[10.5px] font-semibold text-gray-500">Toca para ver el avance detallado</span>
          </button>
            </div>

            <aside className="min-w-0 space-y-2">
              {/* Acciones administrativas */}
              {isAdmin && (res.estadoPago === 'Pendiente' || res.estadoPago === 'Rechazado' || res.estadoPago === 'Aprobado') && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
                  <h3 className="text-[11px] font-black text-gray-700 uppercase tracking-wider mb-2">Acciones</h3>

                  {res.estadoPago === 'Aprobado' && (
                    <div className="bg-yellow-50 border border-yellow-200 p-2 rounded mb-2 text-[10px] font-bold text-yellow-800">
                      ⚠️ Esta reserva está aprobada. Reasignar tutor o cambiar horario afectará la disponibilidad y la experiencia del usuario.
                    </div>
                  )}

                  {(res.estadoPago === 'Pendiente' || res.estadoPago === 'Rechazado') && (
                    <div className="space-y-2 mb-2">
                      {/* FIX-ADMIN-INTENTOS: aviso cuando el usuario agotó los 3 intentos */}
                      {intentosAgotados ? (
                        <div className="bg-red-100 border-2 border-red-400 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <AlertCircle size={16} className="text-red-700 flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-black text-red-800">
                                ⚠️ El usuario agotó los 3 intentos de corrección
                              </p>
                              <p className="text-[10px] text-red-700 mt-0.5">
                                Ya no puede corregir la referencia. Decide: <strong>Aprobar</strong> el pago o <strong>Cancelar definitivamente</strong>.
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : intentosCorreccion > 0 ? (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 text-[10px] font-bold text-orange-800">
                          ⚠️ Rechazos acumulados: {intentosCorreccion} de 3
                        </div>
                      ) : null}

                      <MenuAcciones
                        id="admin-reserva-pago"
                        etiqueta="Pago"
                        icon={CreditCard}
                        titulo="Acciones de pago"
                        tono="primary"
                        acciones={accionesPago}
                      />
                    </div>
                  )}

                  <MenuAcciones
                    id="admin-reserva-cambios"
                    etiqueta="Cambios"
                    icon={Settings}
                    titulo="Cambios de la reserva"
                    acciones={accionesCambios}
                  />

                  {availableInstructors.length === 0 && (
                    <p className="text-[10px] text-gray-500 mt-2">No hay tutores disponibles para reasignar.</p>
                  )}

                  {res.esReservaCompartida === true && !res.pagosInstructorDia && (
                    <p className="text-[10px] text-gray-500 mt-2">Esta reserva ya es compartida. Función avanzada próximamente.</p>
                  )}

                  {res.pagadoInstructor === true && !res.pagosInstructorDia && (
                    <p className="text-[10px] text-gray-500 mt-2">La comisión ya fue pagada: el relevo conservará su D1 y generará deuda si hay exceso.</p>
                  )}

                  {res.pagosInstructorDia && (
                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-2 mt-2 text-[10px] text-indigo-800">
                      <p className="font-black">Relevo de tutor registrado</p>
                      {['d1', 'd2', 'unico'].filter((dia) => res.pagosInstructorDia[dia]).map((dia) => {
                        const asignacion = res.pagosInstructorDia[dia];
                        return (
                          <p key={dia} className="mt-0.5">
                            {dia === 'unico' ? 'Comisión' : dia.toUpperCase()}: {asignacion.nombre || asignacion.instructorId} · USD {Number(asignacion.monto || 0).toFixed(2)} · {asignacion.pagado ? 'pagado' : 'pendiente'}
                          </p>
                        );
                      })}
                    </div>
                  )}

                  {res.pagadoProveedor === true && (
                    <p className="text-[10px] text-gray-500 mt-2">La comisión al proveedor ya fue pagada. Si cambias proveedor/moto antes de iniciar, el 100% pasa al nuevo y se genera deuda al anterior; si el curso ya inició, usa Reponer D2.</p>
                  )}

                  {!res.motoAsignadaId && res.traeMoto !== 'Sí' && (
                    <p className="text-[10px] text-gray-500 mt-2">Esta reserva no tiene moto asignada.</p>
                  )}
                </div>
              )}

              {/* WhatsApp: menú contextual con builders existentes */}
              {isAdmin && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
                  <h3 className="text-[11px] font-black text-gray-700 uppercase tracking-wider mb-2">WhatsApp</h3>
                  <MenuAcciones
                    id="admin-reserva-whatsapp"
                    etiqueta="WhatsApp"
                    icon={MessageCircle}
                    titulo="Notificar por WhatsApp"
                    tono="whatsapp"
                    acciones={accionesWhatsApp}
                  />
                  {!whatsappDisponible && (
                    <p className="text-[10px] text-gray-500 mt-2">Sin teléfono válido para enviar mensajes.</p>
                  )}
                </div>
              )}
            </aside>
          </div>
        </div>
      </div>

           {/* Modal de cambio de horario */}
      {mostrarCambiarHorario && (
        <CambiarHorarioModal
          reserva={res}
          ctx={{ horarios, ocupacionConfirmada: reservas, cursos, instructores, motos }}
          onConfirmar={cambiarHorario}
          onCancelar={() => setMostrarCambiarHorario(false)}
          onConflicto={async (payload) => {
            const resultadoAuditoria = await auditarReprogramacionBloqueada({
              reservaId: res.id,
              motivo: payload?.motivo,
              antes: payload?.antes,
              despues: payload?.despues,
              conflictos: payload?.conflictos,
              autorId: user?.uid
            });
            showToast(
              mensajeBloqueoConAuditoria(
                mensajeConflictoReprogramacion(payload?.conflictos || []),
                resultadoAuditoria
              ),
              'error'
            );
          }}
        />
      )}

          {/* Modal de reasignación / relevo */}
      {mostrarReasignar && (
        <ModalReasignarInstructor
          reserva={res}
          instructoresDisponibles={availableInstructors}
          instructorActual={instructorActual}
          instructorInicioCurso={cursoIniciadoParaRelevo(res)}
          onConfirmar={reasignarInstructor}
          onCancelar={() => setMostrarReasignar(false)}
        />
      )}

      {/* Modal de motivo de rechazo */}
      {modalMotivo === 'rechazar' && (
        <ModalMotivoRechazo
          onConfirm={(motivo) => {
            rechazarPago('rechazar', motivo);
            setModalMotivo(null);
          }}
          onCancel={() => setModalMotivo(null)}
        />
      )}

      {/* Modal de WhatsApp */}
      {waModalData && (
        <ModalWhatsApp
          url={waModalData.url}
          mensaje={waModalData.mensaje}
          titulo={waModalData.titulo}
          onClose={() => { setWaModalData(null); navigate(volverA, { replace: true }); }}
        />
      )}

      {/* Modal de cambio de proveedor / moto */}
      {mostrarCambiarMoto && (
        <ModalCambiarMoto
          reserva={res}
          motosDisponibles={motosDisponibles}
          motoActual={motoActual}
          proveedorActual={proveedorActual}
          onConfirmar={cambiarMoto}
          onCancelar={() => setMostrarCambiarMoto(false)}
        />
      )}
    </AppShell>
  );
};

export default AdminReservaDetalle;