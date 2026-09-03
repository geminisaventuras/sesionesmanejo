// @build: 2026-08-28.16-10-00 | id: BXX-BYY | backup: AdminReservaDetalle.jsx.backup-20260828-161000 | desc: Añade reasignación de instructor y cambio de horario
import { useContext, useState, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppContext } from '../../../context/AppContextValue';
import { Button, Select } from '../../../components/UI';
import { useToast } from '../../shared/components/ToastProvider';
import AppShell from '../../shared/components/AppShell';
import DashboardHeader from '../../shared/components/DashboardHeader';
import DashboardFooter from '../../shared/components/DashboardFooter';
import {
  ChevronLeft, CheckCircle, AlertCircle, X, User, Phone, Mail, MapPin,
  Calendar, Clock, Bike, BookOpen, CreditCard, Activity, Wallet, Settings
} from 'lucide-react';
import { writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase';
import CambiarHorarioModal from './CambiarHorarioModal';

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
  const [selectedInstructor, setSelectedInstructor] = useState('');
  const [mostrarCambiarHorario, setMostrarCambiarHorario] = useState(false);

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
  
  // Instructores disponibles para reasignar
  const availableInstructors = useMemo(() => {
    return (instructores || []).filter(i => 
      i.activo && 
      (i.sedes || []).includes(res.sedeId) && 
      String(i.id) !== String(res.instructorId)
    );
  }, [instructores, res.sedeId, res.instructorId]);

  // Validación de disponibilidad del instructor seleccionado (para reasignación)
  const verificarDisponibilidadInstructor = (instructorId) => {
    if (!instructorId || !res.fecha) return true;
    const conflictos = (reservas || []).filter(r => {
      if (r.instructorId !== instructorId) return false;
      if (r.id === res.id) return false;
      if (r.estadoPago !== 'Aprobado' && r.estadoPago !== 'Pendiente') return false;
      const mismaFecha = r.fecha === res.fecha || 
                         r.fecha === res.fecha2 || 
                         r.fecha2 === res.fecha;
      const mismoHorario = r.horaId === res.horaId;
      return mismaFecha && mismoHorario;
    });
    return conflictos.length === 0;
  };

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
      batch.update(reservaRef, { estadoPago: 'Cancelado' });
      batch.delete(espejoRef);
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

  // Reasignación de instructor (mantiene la funcionalidad anterior)
  const reasignarInstructor = async () => {
    if (!isAdmin || !selectedInstructor) return showToast('Selecciona un instructor', 'error');
    if (selectedInstructor === res.instructorId) return showToast('Selecciona un instructor diferente', 'error');
    
    if (res.estadoPago === 'Aprobado') {
      const confirmado = window.confirm(
        '⚠️ Esta reserva está aprobada. La reasignación afectará la disponibilidad y la experiencia del estudiante.\n\n' +
        '¿Deseas continuar?'
      );
      if (!confirmado) return;
      
      const haySesionActiva = res.pausaActiva || res.moduloEnProgreso || (res.tiempoEfectivo && res.tiempoEfectivo > 0);
      if (haySesionActiva) {
        const confirmadoSesion = window.confirm(
          '⚠️ Hay una sesión del Aula Virtual en curso. Reasignar el instructor ahora puede afectar la sesión.\n\n' +
          '¿Deseas continuar de todos modos?'
        );
        if (!confirmadoSesion) return;
      }
    }
    
    try {
      const batch = writeBatch(db);
      const reservaRef = doc(db, 'artifacts/motoescuela-pro-v1/public/data/reservas', res.id);
      const espejoRef = doc(db, 'ocupacionConfirmada', res.id);
      
      const datosActualizacion = {
        instructorId: selectedInstructor,
        instructorAnteriorId: res.instructorId || null,
        reasignadoPor: user?.uid || 'admin',
        reasignadoEn: serverTimestamp()
      };
      
      batch.update(reservaRef, datosActualizacion);
      batch.set(espejoRef, { ...datosActualizacion, estadoPago: res.estadoPago }, { merge: true });
      
      await batch.commit();
      
      showToast('Instructor reasignado correctamente', 'success');
      setSelectedInstructor('');
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

    // Función auxiliar para obtener locks de una reserva (por userId y fechas)
  const obtenerLocksDeReserva = async (reserva) => {
    try {
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const q = query(
        collection(db, 'locks'),
        where('userId', '==', reserva.userId),
        where('fecha', '==', reserva.fecha),
        where('horaId', '==', reserva.horaId)
      );
      
      const snapshot = await getDocs(q);
      // Si el curso es de dos días, también buscar locks en fecha2
      if (reserva.fecha2) {
        const q2 = query(
          collection(db, 'locks'),
          where('userId', '==', reserva.userId),
          where('fecha', '==', reserva.fecha2),
          where('horaId', '==', reserva.horaId)
        );
        const snapshot2 = await getDocs(q2);
        return [
          ...snapshot.docs.map(d => ({ id: d.id, ...d.data() })),
          ...snapshot2.docs.map(d => ({ id: d.id, ...d.data() }))
        ];
      }
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
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

              {/* Reasignación de instructor */}
              <div className="flex items-center gap-2 mb-2">
                <Select 
                  label="" 
                  options={availableInstructors} 
                  value={selectedInstructor} 
                  onChange={e => setSelectedInstructor(e.target.value)} 
                  className="!mb-0 flex-1" 
                />
                <Button 
                  type="button" 
                  onClick={reasignarInstructor} 
                  variant="secondary" 
                  className="!py-1.5 !px-3 !text-[10px] !w-auto" 
                  disabled={!selectedInstructor || selectedInstructor === res.instructorId || availableInstructors.length === 0}
                >
                  Reasignar
                </Button>
              </div>
              
              {availableInstructors.length === 0 && (
                <p className="text-[10px] text-gray-500 mb-2">No hay instructores disponibles para reasignar.</p>
              )}
              
              {selectedInstructor && !verificarDisponibilidadInstructor(selectedInstructor) && (
                <p className="text-[10px] font-bold text-orange-600 mb-2">
                  ⚠️ Este instructor podría tener conflictos de horario en la fecha de la reserva.
                </p>
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
    </AppShell>
  );
};

export default AdminReservaDetalle;