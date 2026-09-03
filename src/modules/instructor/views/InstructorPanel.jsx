// @build: 2026-09-03 | id: INSTRUCTOR-PANEL-FASE1 | backup: InstructorPanel.backup-20260903-000000 | desc: Refactor Fase 1: integración de ResumenTab, PendientesTab, Filtros, ModalDetalle y aislamiento
import { useState, useMemo, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../../context/AppContextValue';
import { Button, Input, Spinner } from '../../../components/UI';
import AppShell from '../../shared/components/AppShell';
import DashboardHeader from '../../shared/components/DashboardHeader';
import DashboardFooter from '../../shared/components/DashboardFooter';
import ErrorBoundary from '../../shared/components/ErrorBoundary';
import { useReservasInstructor } from '../hooks/useReservasInstructor';
import { perfilInstructorSchema } from '../schemas/perfilSchema';
import { obtenerFechaVenezuela } from '../../shared/utils/zonahoraria';
import { Activity, Wallet, Settings, AlertCircle, RefreshCw } from 'lucide-react';
import ResumenTab from '../components/ResumenTab';
import PendientesTab from '../components/PendientesTab';
import ModalDetalleReserva from '../components/ModalDetalleReserva';
import HistorialTab from '../components/HistorialTab';
import { esReservaEnCurso } from '../utils/reservasHelpers';
export default function InstructorPanel() {
const { user, saveInstructor, showToast, logoutUser, cursos: cursosGlobal, horarios: horariosGlobal, sedes: sedesGlobal } = useContext(AppContext);  const navigate = useNavigate();
  const cursos = cursosGlobal || [];
const horarios = horariosGlobal || [];
const sedes = sedesGlobal || [];
const [tab, setTab] = useState('inicio');
  const [vistaInicio, setVistaInicio] = useState('resumen');
  const [editandoPerfil, setEditandoPerfil] = useState(false);
  const [perfil, setPerfil] = useState(user?.data || {});
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const [reservaSeleccionada, setReservaSeleccionada] = useState(null);

  const uid = user?.uid;
  const {
    reservas: misReservas,
    cargando: cargandoReservas,
    error: errorReservas,
    reintentar
  } = useReservasInstructor(uid);

  const handleLogout = useCallback(async () => {
    if (logoutUser) await logoutUser();
    navigate('/');
  }, [logoutUser, navigate]);

  const handleIniciarClase = useCallback((reserva) => {
    navigate(`/aula/${reserva.id}`);
  }, [navigate]);

  const handleVerDetalle = useCallback((reserva) => {
    setReservaSeleccionada(reserva);
  }, []);

  const handleCerrarModal = useCallback(() => {
    setReservaSeleccionada(null);
  }, []);

  const guardarPerfil = useCallback(async () => {
    setValidationError(null);
    try {
      perfilInstructorSchema.parse(perfil);
    } catch (error) {
      const mensajes = error.errors?.map(e => e.message).join(', ') || 'Datos inválidos';
      setValidationError(mensajes);
      showToast(mensajes, 'error');
      return;
    }

    setIsSaving(true);
    try {
      await saveInstructor({ ...user.data, ...perfil });
      showToast('Perfil actualizado', 'success');
      setEditandoPerfil(false);
    } catch (error) {
      console.error('[InstructorPanel] Error al guardar perfil:', {
        action: 'savePerfil',
        userId: uid,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      showToast('Error al actualizar el perfil', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [saveInstructor, user, perfil, showToast, uid]);

  if (!user) return <Spinner message="Cargando perfil..." />;

  if (cargandoReservas) return <Spinner message="Cargando reservas..." />;

 const header = (
  <DashboardHeader
    title={vistaInicio === 'pendientes' ? 'Pendientes' : vistaInicio === 'historial' ? 'Historial' : undefined}
    onBack={vistaInicio === 'pendientes' || vistaInicio === 'historial' ? () => setVistaInicio('resumen') : undefined}
    nombre={vistaInicio === 'resumen' ? user?.data?.nombre : undefined}
    onLogout={handleLogout}
  />
);

  const footer = (
    <DashboardFooter
      tabs={[
        { id: 'inicio', icon: Activity, label: 'Inicio' },
        { id: 'finanzas', icon: Wallet, label: 'Finanzas' },
        { id: 'config', icon: Settings, label: 'Perfil' }
      ]}
      activeTab={tab}
      onTabChange={setTab}
    />
  );

  

  return (
    <ErrorBoundary>
      <AppShell header={header} footer={footer}>
        <div className="p-4 space-y-4">
          {errorReservas && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-bold text-red-800 mb-1">Error al cargar reservas</p>
                <p className="text-xs text-red-600 mb-3">{errorReservas}</p>
                <button
                  onClick={reintentar}
                  className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-100 px-3 py-1.5 rounded-lg"
                >
                  <RefreshCw size={14} /> Reintentar
                </button>
              </div>
            </div>
          )}

          {tab === 'inicio' && (
  <>
    {vistaInicio === 'resumen' && (
      <ResumenTab
        reservas={misReservas}
        cursos={cursos}
        horarios={horarios}
        sedes={sedes}
        onIniciarClase={handleIniciarClase}
        onVerDetalle={handleVerDetalle}
        onVerTodasPendientes={() => setVistaInicio('pendientes')}
        onVerHistorial={() => setVistaInicio('historial')}
      />
    )}
    {vistaInicio === 'pendientes' && (
      <PendientesTab
        reservas={misReservas}
        cursos={cursos}
        horarios={horarios}
        sedes={sedes}
        onIniciarClase={handleIniciarClase}
        onVerDetalle={handleVerDetalle}
      />
    )}
    {vistaInicio === 'historial' && (
      <HistorialTab
        reservas={misReservas}
        cursos={cursos}
        horarios={horarios}
        sedes={sedes}
        onVerDetalle={handleVerDetalle}
        onVolver={() => setVistaInicio('resumen')}
      />
    )}
  </>
)}

          {tab === 'finanzas' && (
            <div className="space-y-4">
              <h2 className="text-lg font-black text-gray-900 uppercase tracking-widest">Mis Finanzas</h2>
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 text-center">
                <Wallet className="w-12 h-12 text-blue-600 mx-auto mb-3" />
                <h3 className="font-bold text-blue-900 mb-2">Próximamente disponible</h3>
                <p className="text-sm text-blue-700 mb-4">Estamos diseñando un panel de finanzas completo con:</p>
                <ul className="text-xs text-blue-600 text-left max-w-xs mx-auto space-y-1">
                  <li>✓ Resumen de ingresos por período</li>
                  <li>✓ Detalle de comisiones por clase</li>
                  <li>✓ Historial de pagos</li>
                  <li>✓ Proyecciones mensuales</li>
                </ul>
                <p className="text-xs text-gray-500 mt-4">Estimado: Q4 2026</p>
              </div>
            </div>
          )}

          {tab === 'config' && (
            <div className="space-y-4">
              <h2 className="text-lg font-black text-gray-900 uppercase tracking-widest">Mi Perfil</h2>
              {!editandoPerfil ? (
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs text-gray-500">Nombre</p>
                      <p className="font-bold text-gray-900">{user?.data?.nombre} {user?.data?.apellido || ''}</p>
                    </div>
                    <button onClick={() => setEditandoPerfil(true)} className="text-blue-600 text-xs font-bold">Editar</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <Input
                    label="Teléfono"
                    type="tel"
                    inputMode="numeric"
                    pattern="\d+"
                    value={perfil.telefono || ''}
                    onChange={e => setPerfil({ ...perfil, telefono: e.target.value })}
                    error={validationError}
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      onClick={guardarPerfil}
                      variant="success"
                      disabled={isSaving}
                    >
                      {isSaving ? 'Guardando...' : 'Guardar'}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setEditandoPerfil(false)}
                      variant="outline"
                      disabled={isSaving}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {reservaSeleccionada && (
          <ModalDetalleReserva
            reserva={reservaSeleccionada}
            curso={cursos.find(c => String(c.id) === String(reservaSeleccionada.cursoId))}
            horario={horarios.find(h => String(h.id) === String(reservaSeleccionada.horaId))}
            sede={sedes.find(s => String(s.id) === String(reservaSeleccionada.sedeId))}
            onClose={handleCerrarModal}
            onIniciarClase={handleIniciarClase}
           puedeIniciarClase={
  reservaSeleccionada.estadoPago === 'Aprobado' &&
  reservaSeleccionada.estadoCurso !== 'Aprobado' &&
  esReservaEnCurso(
    reservaSeleccionada,
    horarios.find(h => String(h.id) === String(reservaSeleccionada.horaId))
  )
}
          />
        )}
      </AppShell>
    </ErrorBoundary>
  );
}
