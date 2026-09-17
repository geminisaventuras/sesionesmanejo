// @build: 2026-08-28.16-10-00 | id: BXX-BYY | backup: AdminReservaDetalle.jsx.backup-20260828-161000 | desc: Añade reasignación de instructor y cambio de horario
import { useContext, useState, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppContext } from '../../../context/AppContextValue';
import { Button } from '../../../components/UI';
import { useToast } from '../../shared/components/ToastProvider';
import AppShell from '../../shared/components/AppShell';
import DashboardHeader from '../../shared/components/DashboardHeader';
import DashboardFooter from '../../shared/components/DashboardFooter';
import {
  ChevronLeft, CheckCircle, AlertCircle, X, User, Users, Phone, Mail, MapPin,
  Calendar, Clock, Bike, BookOpen, CreditCard, Activity, Wallet, Settings
} from 'lucide-react';
import { writeBatch, doc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase';
import CambiarHorarioModal from './CambiarHorarioModal';
import ModalReasignarInstructor from './ModalReasignarInstructor';

const formatearFecha = (fechaStr) => {
  if (!fechaStr) return '—';
  const [y, m, d] = fechaStr.split('-');
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return `${parseInt(d)} ${meses[parseInt(m)-1]} ${y}`;
};

const AdminReservaDetalle = () => {
  const { reservaId } = useParams();
  const navigate = useNavigate();
  const { reservas, instructores, cursos, horarios, sedes, saveReserva, saveMovimiento, user, logoutUser } = useContext(AppContext);
  const { showToast } = useToast();
  
  const [mostrarCambiarHorario, setMostrarCambiarHorario] = useState(false);
  const [mostrarReasignar, setMostrarReasignar] = useState(false);

  const isAdmin = user?.role === 'admin';
  const res = (reservas || []).find(r => String(r.id) === String(reservaId));

  const curso = (cursos || []).find(c => String(c.id) === String(res?.cursoId));
  const horario = (horarios || []).find(h => String(h.id) === String(res?.horaId));
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

  const header = <DashboardHeader title={`Reserva: ${res?.nombre || ''} ${res?.apellido || ''}`} onBack={() => navigate('/admin/reservas')} onLogout={handleLogout} notifications={notifications} />;
  const footer = <DashboardFooter
    tabs={footerTabs}
    activeTab="reservas"
    onTabChange={(id) => {
      const tab = footerTabs.find(t => t.id === id);
      if (tab?.action) tab.action();
    }}
  />;

  if (!res) {
    return (
      <AppShell header={header} footer={footer} bgColor="bg-gray-50">
        <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
          <AlertCircle size={48} className="text-red-400 mb-4" />
          <h2 className="text-lg font-black text-gray-900 mb-2">Reserva no encontrada</h2>
          <p className="text-sm text-gray-500 mb-6">La reserva que buscas no existe o fue eliminada.</p>
          <Button onClick={() => navigate('/admin/reservas')} variant="primary">Volver a Reservas</Button>
        </div>
      </AppShell>
    );
  }

  const instructorActual = (instructores || []).find(i => String(i.id) === String(res.instructorId));
  
  

  
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
      estadoPago: 'Aprobado'
    }, { merge: true });    
    
    try {
      await batch.commit();
      await saveMovimiento({ id: Date.now().toString(), tipo: 'ingreso', monto: res.pagoTotalMoneda, desc: `Inscripción C-${String(res.id).slice(-4)}`, fecha: new Date().toISOString().split('T')[0], userId: res.userId });
      showToast('Pago aprobado y curso activado', 'success');
      navigate('/admin/reservas');
    } catch (error) {
      showToast('Error al aprobar: ' + error.message, 'error');
    }
  };

  const rechazarPago = async (tipo = 'rechazar') => {
    if (!isAdmin) return;
    const batch = writeBatch(db);
    const reservaRef = doc(db, 'artifacts/motoescuela-pro-v1/public/data/reservas', res.id);
    const espejoRef = doc(db, 'ocupacionConfirmada', res.id);
    
      if (tipo === 'cancelar') {
      batch.update(reservaRef, { estadoPago: 'Cancelado', estadoCurso: 'Cancelado' });
      batch.delete(espejoRef);

     
            // ✅ CORRECCIÓN: purgar locks por instructor y filtrar en memoria (evita índice compuesto)
      const temporalRef = collection(db, 'ocupacionTemporal');
      const qLocks = query(temporalRef, where('instructorId', '==', res.instructorId));

      const snapLocks = await getDocs(qLocks);
      const fechasBloqueadas = [res.fecha, res.fecha2].filter(Boolean);

      snapLocks.forEach(docSnap => {
        const lockData = docSnap.data();
        const coincideHora = String(lockData.horaId) === String(res.horaId);
        const coincideFecha = fechasBloqueadas.includes(lockData.fecha) || fechasBloqueadas.includes(lockData.fecha2);

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
        intentosCorreccion: intentosActuales + 1 
      });
      batch.set(espejoRef, {
        userId: res.userId,
        fecha: res.fecha,
        fecha2: res.fecha2,
        horaId: res.horaId,
        instructorId: res.instructorId,
        motoAsignadaId: res.motoAsignadaId || null,
        traeMoto: res.traeMoto || 'No',
        estadoPago: 'Pendiente'
      }, { merge: true });
    }
    
    try {
      await batch.commit();
      showToast(
        tipo === 'cancelar' 
          ? 'Reserva cancelada definitivamente. Horario liberado.' 
          : 'Pago rechazado. El estudiante puede corregir la referencia.', 
        'info'
      );
      navigate('/admin/reservas');
    } catch (error) {
      showToast('Error al rechazar: ' + error.message, 'error');
    }
  };

   // Reasignación de instructor con split de comisión (MVP A→B)
  const reasignarInstructor = async ({ instructorDestinoId, instructorDestinoNombre, porcentajeDestino, motivo }) => {
    if (!isAdmin) return showToast('Sin permisos', 'error');
    if (!instructorDestinoId) return showToast('Selecciona un instructor', 'error');
    if (instructorDestinoId === res.instructorId) return showToast('Selecciona un instructor diferente', 'error');

    // Bloqueos de negocio
    if (res.estadoPago === 'Cancelado') {
      return showToast('No se puede reasignar una reserva cancelada', 'error');
    }
    if (res.pagadoInstructor === true) {
      return showToast('No se puede reasignar: la comisión ya fue pagada', 'error');
    }
    if (res.esReservaCompartida === true) {
      return showToast('Función avanzada no disponible todavía para reservas ya compartidas', 'error');
    }

    // Verificar conflicto de horario del instructor destino
    const conflicto = (reservas || []).some(r => {
      if (String(r.id) === String(res.id)) return false;
      if (String(r.instructorId) !== String(instructorDestinoId)) return false;
      if (r.estadoPago !== 'Aprobado' && r.estadoPago !== 'Pendiente') return false;
      const mismaFecha = r.fecha === res.fecha || r.fecha === res.fecha2 || r.fecha2 === res.fecha;
      const mismoHorario = r.horaId === res.horaId;
      return mismaFecha && mismoHorario;
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

    // Detectar si el instructor original ya inició el curso.
    // Si NO inició: reasignación simple (sin split de comisión).
    // Si SÍ inició: split entre A y B.
    const modulosEstadoArr = res.modulosEstado ? Object.values(res.modulosEstado) : [];
    const instructorInicioCurso = Boolean(
      res.sesionTotalInicio ||
      res.sesionDiariaInicio ||
      res.moduloEnProgreso ||
      (typeof res.tiempoEfectivo === 'number' && res.tiempoEfectivo > 0) ||
      res.pausaActiva ||
      modulosEstadoArr.some(v => v === true || v?.completado === true)
    );

    try {
      const batch = writeBatch(db);
      const reservaRef = doc(db, 'artifacts/motoescuela-pro-v1/public/data/reservas', res.id);
      const espejoRef = doc(db, 'ocupacionConfirmada', res.id);

      const instructorOrigenId = res.instructorId;

      let datosActualizacion;

      if (!instructorInicioCurso) {
        // Reasignación simple — sin split. La comisión va completa al nuevo instructor.
        datosActualizacion = {
          instructorId: instructorDestinoId,
          instructorAnteriorId: instructorOrigenId,
          motivoRelevo: motivo || '',
          reasignadoPor: user?.uid || 'admin',
          reasignadoEn: serverTimestamp()
        };
      } else {
        // Split — A inició el curso, se reparte la comisión.
        const instructorOrigenNombre = instructorActual
          ? `${instructorActual.nombre || ''} ${instructorActual.apellido || ''}`.trim()
          : 'Instructor anterior';

        const porcentajeOrigen = 100 - Number(porcentajeDestino);

        const instructoresInvolucrados = [
          {
            id: instructorOrigenId,
            nombre: instructorOrigenNombre,
            porcentaje: porcentajeOrigen,
            pagado: false,
            pagadoEn: null
          },
          {
            id: instructorDestinoId,
            nombre: instructorDestinoNombre || '',
            porcentaje: Number(porcentajeDestino),
            pagado: false,
            pagadoEn: null
          }
        ];

        const implicadosIds = [instructorOrigenId, instructorDestinoId].filter(Boolean);

        datosActualizacion = {
          instructorId: instructorDestinoId,
          instructorOriginalId: instructorOrigenId,
          instructorAnteriorId: instructorOrigenId,
          instructoresInvolucrados,
          implicadosIds,
          esReservaCompartida: true,
          motivoRelevo: motivo || '',
          reasignadoPor: user?.uid || 'admin',
          reasignadoEn: serverTimestamp()
        };
      }

      batch.update(reservaRef, datosActualizacion);
      batch.set(espejoRef, { ...datosActualizacion, estadoPago: res.estadoPago }, { merge: true });

      await batch.commit();

      showToast(
        instructorInicioCurso
          ? 'Instructor reasignado con split de comisión'
          : 'Instructor reasignado (sin split, no había iniciado)',
        'success'
      );
      setMostrarReasignar(false);
      navigate('/admin/reservas');
    } catch (error) {
      showToast('Error al reasignar: ' + error.message, 'error');
    }
  };

  // Cambio de horario (NUEVO)
  const cambiarHorario = async ({ nuevaFecha, nuevaFecha2, nuevoHoraId }) => {
    try {
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
          '• La experiencia del estudiante\n' +
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
      
      const datosActualizacion = {
        fecha: nuevaFecha,
        fecha2: nuevaFecha2,
        horaId: nuevoHoraId,
        horarioAnterior: horarioAnterior,
        horarioNuevo: horarioNuevo,
        cambiadoPor: user?.uid || 'admin',
        cambiadoEn: serverTimestamp()
      };
      
      batch.update(reservaRef, datosActualizacion);
      batch.set(ocupacionRef, { ...datosActualizacion, estadoPago: res.estadoPago }, { merge: true });
      
           // Liberar TODOS los locks asociados a esta reserva (independiente del estado)
      const locksOriginales = await obtenerLocksDeReserva(res);
      locksOriginales.forEach(lock => {
        batch.delete(doc(db, 'locks', lock.id));
        batch.delete(doc(db, 'ocupacionTemporal', lock.id));
      });
      
      await batch.commit();
      
      showToast('Horario cambiado correctamente', 'success');
      setMostrarCambiarHorario(false);
      
      console.log('[AdminReservaDetalle] Horario cambiado:', {
        reservaId: res.id,
        horarioAnterior,
        horarioNuevo,
        cambiadoPor: user?.uid
      });
      
      // Recargar la página para reflejar cambios en el contexto local
      navigate('/admin/reservas', { replace: true });
      
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
      // Consulta en la colección viva de disponibilidad (ocupacionTemporal)
      const q1 = query(
        collection(db, 'ocupacionTemporal'),
        where('instructorId', '==', reserva.instructorId),
        where('fecha', '==', reserva.fecha),
        where('horaId', '==', reserva.horaId)
      );

      const snapshot1 = await getDocs(q1);
      snapshot1.docs.forEach(d => resultadosMap.set(d.id, { id: d.id, ...d.data() }));

      // Si el curso es de dos días, buscar también en fecha2
      if (reserva.fecha2) {
        const q2 = query(
          collection(db, 'ocupacionTemporal'),
          where('instructorId', '==', reserva.instructorId),
          where('fecha', '==', reserva.fecha2),
          where('horaId', '==', reserva.horaId)
        );

        const snapshot2 = await getDocs(q2);
        snapshot2.docs.forEach(d => resultadosMap.set(d.id, { id: d.id, ...d.data() }));
      }

      // Respaldo: construir IDs directos por si la consulta no encontró algo
      if (reserva.instructorId && reserva.horaId) {
        const motoPart = reserva.motoAsignadaId ? String(reserva.motoAsignadaId) : 'sinmoto';
        const lockIdDirecto = `${reserva.fecha}_${reserva.horaId}_${reserva.instructorId}_${motoPart}`;
        if (!resultadosMap.has(lockIdDirecto)) {
          resultadosMap.set(lockIdDirecto, { id: lockIdDirecto, eliminacionDirecta: true });
        }

        if (reserva.fecha2) {
          const lockIdDirecto2 = `${reserva.fecha2}_${reserva.horaId}_${reserva.instructorId}_${motoPart}`;
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

  return (
    <AppShell header={header} footer={footer} bgColor="bg-gray-50">
      <div className="flex flex-col h-[calc(100vh-56px)]">
        <div className="bg-white border-b px-3 py-2 flex items-center gap-2 shrink-0">
          <button onClick={() => navigate('/admin/reservas')} className="p-1.5 bg-gray-100 rounded-full">
            <ChevronLeft size={18} className="text-gray-600" />
          </button>
          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${estadoBadge[res.estadoPago] || 'bg-gray-100'}`}>
            {res.estadoPago === 'Cancelado' ? 'CANCELADO' : res.estadoPago}
          </span>
          <h2 className="text-sm font-bold text-gray-900 truncate flex-1">{res.nombre} {res.apellido}</h2>
        </div>

        <div className="flex-1 p-3 space-y-2 overflow-hidden">
          {/* Datos del estudiante y curso */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
            <h3 className="text-[11px] font-black text-gray-700 uppercase tracking-wider mb-2">Datos del Estudiante y Curso</h3>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
              <div className="flex items-center gap-1"><User size={12} className="text-gray-400 flex-shrink-0" /><span className="font-medium">CI: {res.cedula}</span></div>
              <div className="flex items-center gap-1"><Phone size={12} className="text-gray-400 flex-shrink-0" /><span className="truncate">{res.telefono || '—'}</span></div>
              <div className="flex items-center gap-1"><Mail size={12} className="text-gray-400 flex-shrink-0" /><span className="truncate">{res.correo || '—'}</span></div>
              <div className="flex items-center gap-1"><Phone size={12} className="text-gray-400 flex-shrink-0" /><span className="truncate">Emerg: {res.contactoEmergencia || '—'}</span></div>
              <div className="flex items-center gap-1 col-span-2"><MapPin size={12} className="text-gray-400 flex-shrink-0" /><span className="truncate">{res.estado || '—'}{res.zona ? `, ${res.zona}` : ''}</span></div>
              <div className="col-span-2 border-t border-gray-100 my-1"></div>
              <div className="flex items-center gap-1"><BookOpen size={12} className="text-gray-400 flex-shrink-0" /><span className="font-medium">{curso?.nombre || res.cursoId || '—'}</span></div>
              <div className="flex items-center gap-1"><User size={12} className="text-gray-400 flex-shrink-0" /><span className="truncate">Inst: {instructorActual ? `${instructorActual.nombre} ${instructorActual.apellido || ''}` : 'Sin asignar'}</span></div>
              <div className="flex items-center gap-1"><Calendar size={12} className="text-gray-400 flex-shrink-0" /><span>{formatearFecha(res.fecha)} – {formatearFecha(res.fecha2)}</span></div>
              <div className="flex items-center gap-1"><Clock size={12} className="text-gray-400 flex-shrink-0" /><span>{horario?.label || res.horaId || '—'}</span></div>
              <div className="flex items-center gap-1"><MapPin size={12} className="text-gray-400 flex-shrink-0" /><span>Sede: {sede?.nombre || res.sedeId || '—'}</span></div>
              <div className="flex items-center gap-1"><Bike size={12} className="text-gray-400 flex-shrink-0" /><span>{res.tipoMoto} · {res.traeMoto === 'Sí' ? 'Propia' : 'Escuela'} · Bici: {res.sabeBicicleta}</span></div>
            </div>
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

          {/* Acciones administrativas */}
          {isAdmin && (res.estadoPago === 'Pendiente' || res.estadoPago === 'Rechazado' || res.estadoPago === 'Aprobado') && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
              <h3 className="text-[11px] font-black text-gray-700 uppercase tracking-wider mb-2">Acciones</h3>
              
              {res.estadoPago === 'Aprobado' && (
                <div className="bg-yellow-50 border border-yellow-200 p-2 rounded mb-2 text-[10px] font-bold text-yellow-800">
                  ⚠️ Esta reserva está aprobada. Reasignar instructor o cambiar horario afectará la disponibilidad y la experiencia del estudiante.
                </div>
              )}
              
              {(res.estadoPago === 'Pendiente' || res.estadoPago === 'Rechazado') && (
                <div className="flex gap-2 flex-wrap mb-2">
                  <Button type="button" onClick={aprobarPago} variant="success" className="!py-1.5 !text-[10px] flex-1" icon={CheckCircle}>Aprobar Pago</Button>
                  <Button type="button" onClick={() => rechazarPago('rechazar')} variant="danger" className="!py-1.5 !text-[10px] flex-1" icon={AlertCircle}>Rechazar (corregir)</Button>
                  <Button type="button" onClick={() => rechazarPago('cancelar')} variant="outline" className="!py-1.5 !text-[10px] w-full" icon={X}>Cancelar definitivamente</Button>
                </div>
              )}

                           {/* Reasignación de instructor con split */}
              <Button 
                type="button" 
                onClick={() => setMostrarReasignar(true)} 
                variant="secondary" 
                className="!py-1.5 !text-[10px] w-full mb-2"
                icon={Users}
                disabled={
                  availableInstructors.length === 0 ||
                  res.estadoPago === 'Cancelado' ||
                  res.pagadoInstructor === true ||
                  res.esReservaCompartida === true
                }
              >
                Reasignar / Relevo
              </Button>

              {availableInstructors.length === 0 && (
                <p className="text-[10px] text-gray-500 mb-2">No hay instructores disponibles para reasignar.</p>
              )}

              {res.esReservaCompartida === true && (
                <p className="text-[10px] text-gray-500 mb-2">Esta reserva ya es compartida. Función avanzada próximamente.</p>
              )}

              {res.pagadoInstructor === true && (
                <p className="text-[10px] text-gray-500 mb-2">La comisión ya fue pagada. No se puede reasignar.</p>
              )}

              {/* Botón cambiar horario */}
              <Button 
                type="button" 
                onClick={() => setMostrarCambiarHorario(true)} 
                variant="outline" 
                className="!py-1.5 !text-[10px] w-full"
                icon={Calendar}
              >
                Cambiar Horario
              </Button>
            </div>
          )}

          {res.estadoPago === 'Aprobado' && (
            <div className="bg-green-50 p-3 rounded-xl border border-green-200 text-center text-xs font-bold text-green-700">✅ Esta reserva ya fue aprobada.</div>
          )}
          {res.estadoPago === 'Cancelado' && (
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-center text-xs font-bold text-gray-700">🚫 Esta reserva fue cancelada.</div>
          )}
        </div>
      </div>

           {/* Modal de cambio de horario */}
      {mostrarCambiarHorario && (
        <CambiarHorarioModal
          reserva={res}
          ctx={{ horarios, ocupacionConfirmada: reservas, cursos, instructores, motos: [] }}
          onConfirmar={cambiarHorario}
          onCancelar={() => setMostrarCambiarHorario(false)}
        />
      )}

          {/* Modal de reasignación / relevo */}
      {mostrarReasignar && (
        <ModalReasignarInstructor
          reserva={res}
          instructoresDisponibles={availableInstructors}
          instructorActual={instructorActual}
          instructorInicioCurso={Boolean(
            res.sesionTotalInicio ||
            res.sesionDiariaInicio ||
            res.moduloEnProgreso ||
            (typeof res.tiempoEfectivo === 'number' && res.tiempoEfectivo > 0) ||
            res.pausaActiva ||
            (res.modulosEstado && Object.values(res.modulosEstado).some(v => v === true || v?.completado === true))
          )}
          onConfirmar={reasignarInstructor}
          onCancelar={() => setMostrarReasignar(false)}
        />
      )}
    </AppShell>
  );
};

export default AdminReservaDetalle;