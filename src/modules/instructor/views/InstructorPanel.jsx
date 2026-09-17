// @build: 2026-09-03 | id: INSTRUCTOR-PANEL-FASE2C | backup: InstructorPanel.backup-20260903-000000 | desc: Panel con skeletons, transiciones y separación de componentes
import { useState, useCallback, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../../context/AppContextValue';
import AppShell from '../../shared/components/AppShell';
import DashboardHeader from '../../shared/components/DashboardHeader';
import DashboardFooter from '../../shared/components/DashboardFooter';
import ErrorBoundary from '../../shared/components/ErrorBoundary';
import { useReservasInstructor } from '../hooks/useReservasInstructor';
import { Activity, Wallet, Settings, AlertCircle, RefreshCw } from 'lucide-react';
import ResumenTab from '../components/ResumenTab';
import PendientesTab from '../components/PendientesTab';
import ModalDetalleReserva from '../components/ModalDetalleReserva';
import HistorialTab from '../components/HistorialTab';
import { obtenerFechaVenezuela } from '../../shared/utils/zonahoraria';
import FinanzasTab from '../components/FinanzasTab';
import PerfilTab from '../components/PerfilTab';

export default function InstructorPanel() {
  const { user, saveInstructor, showToast, logoutUser, cursos: cursosGlobal, horarios: horariosGlobal, sedes: sedesGlobal } = useContext(AppContext);
  const navigate = useNavigate();
  const cursos = cursosGlobal || [];
  const horarios = horariosGlobal || [];
  const sedes = sedesGlobal || [];

  const [tab, setTab] = useState('inicio');
  const [vistaInicio, setVistaInicio] = useState('resumen');
  const [reservaSeleccionada, setReservaSeleccionada] = useState(null);

  const uid = user?.uid;
   const {
    reservas: misReservas,
    reservasActivas,
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

  if (!user) return <div className="p-4 text-center">Cargando perfil...</div>;

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
        <div className="p-4 space-y-4 tab-transition">
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
                  reservas={reservasActivas}
                  cargando={cargandoReservas}
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
                  reservas={reservasActivas}
                  cargando={cargandoReservas}
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
                       <FinanzasTab reservas={misReservas} cursos={cursos} user={user} />
          )}

          {tab === 'config' && (
            <PerfilTab user={user} saveInstructor={saveInstructor} />
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
  (reservaSeleccionada.fecha === obtenerFechaVenezuela() || reservaSeleccionada.fecha2 === obtenerFechaVenezuela())
}
          />
        )}
      </AppShell>
    </ErrorBoundary>
  );
}
