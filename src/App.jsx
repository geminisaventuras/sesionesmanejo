// @build: 2026-09-30 | id: LEGAL-TERMINOLOGIA-APP | backup: App.jsx.backup-AQUI-VA-TU-TIMESTAMP | desc: Ruta /cursos migrada a /sesiones + redirect legacy.
import React, { useContext, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppContext } from './context/AppContextValue';
import { ToastProvider, useToast } from './modules/shared/components/ToastProvider';
import { Spinner } from './components/UI';
import PwaUpdatePrompt from './components/PwaUpdatePrompt';
import InstructorPanel from './modules/instructor/views/InstructorPanel';
import { puedeOperarMovilidad } from './modules/inscripcion/utils/movilidadHelpers';
// Lazy loading de todas las vistas
const HomeView = React.lazy(() => import('./modules/home/views/HomeView'));
const AsistenteFlotante = React.lazy(() => import('./modules/public/components/asistente/AsistenteFlotante'));
const ChatAsistenteView = React.lazy(() => import('./modules/public/components/asistente/ChatAsistenteView'));
const InscripcionView = React.lazy(() => import('./modules/inscripcion/views/InscripcionView').then(m => ({ default: m.InscripcionView })));
const PortalEstudiante = React.lazy(() => import('./modules/auth/views/PortalEstudiante').then(m => ({ default: m.PortalEstudiante })));
const LoginView = React.lazy(() => import('./modules/auth/views/LoginView').then(m => ({ default: m.LoginView })));

const TestBloquesView = React.lazy(() => import('./modules/test/views/TestBloquesView').then(m => ({ default: m.TestBloquesView })));
const TestDatePicker = React.lazy(() => import('./modules/test/views/TestDatePicker'));
const EstudiantePanel = React.lazy(() => import('./modules/estudiante/views/EstudiantePanel').then(m => ({ default: m.EstudiantePanel })));
const PackDetalleEstudiante = React.lazy(() => import('./modules/estudiante/views/PackDetalleEstudiante').then(m => ({ default: m.PackDetalleEstudiante })));
const AgendarPackView = React.lazy(() => import('./modules/estudiante/views/AgendarPackView').then(m => ({ default: m.AgendarPackView })));
//const InstructorPanel = React.lazy(() => import('./modules/instructor/views/InstructorPanel'));

const AulaVirtualView = React.lazy(() => import('./modules/aula/views/AulaVirtualView'));
const AdminResumen = React.lazy(() => import('./modules/admin/components/AdminResumen'));
const AdminAlertas = React.lazy(() => import('./modules/admin/components/AdminAlertas'));
const AdminMetricas = React.lazy(() => import('./modules/admin/components/AdminMetricas'));
const AdminReservasHome = React.lazy(() => import('./modules/admin/components/AdminReservasHome'));
const AdminReservasList = React.lazy(() => import('./modules/admin/components/AdminReservasList'));
const AdminPacksList = React.lazy(() => import('./modules/admin/components/AdminPacksList'));
const AdminReservaDetalle = React.lazy(() => import('./modules/admin/components/AdminReservaDetalle'));
const AdminPackDetalle = React.lazy(() => import('./modules/admin/components/AdminPackDetalle'));
const AdminAccesoTeoricoDetalle = React.lazy(() => import('./modules/admin/components/AdminAccesoTeoricoDetalle'));
const AdminUsuarioDetalle = React.lazy(() => import('./modules/admin/components/AdminUsuarioDetalle'));
const AdminDirectorio = React.lazy(() => import('./modules/admin/components/AdminDirectorio'));
const AdminInstructorDetalle = React.lazy(() => import('./modules/admin/components/AdminInstructorDetalle'));
const AdminProveedorDetalle = React.lazy(() => import('./modules/admin/components/AdminProveedorDetalle'));
const AdminMotoDetalle = React.lazy(() => import('./modules/admin/components/AdminMotoDetalle'));
const ProgresoAcademicoView = React.lazy(() => import('./modules/shared/views/ProgresoAcademicoView'));

const AdminOcupacion = React.lazy(() => import('./modules/admin/components/AdminOcupacion'));
const FinanceLayout = React.lazy(() => import('./modules/admin/finance/FinanceLayout'));
const FinanceResumen = React.lazy(() => import('./modules/admin/finance/FinanceResumen'));
const FinanceIngresos = React.lazy(() => import('./modules/admin/finance/FinanceIngresos'));
const FinanceComisiones = React.lazy(() => import('./modules/admin/finance/FinanceComisiones'));
const FinanceGastos = React.lazy(() => import('./modules/admin/finance/FinanceGastos'));
const FinanceImpuestos = React.lazy(() => import('./modules/admin/finance/FinanceImpuestos'));
const FinanceMovimientos = React.lazy(() => import('./modules/admin/finance/FinanceMovimientos'));
const FinanceReportes = React.lazy(() => import('./modules/admin/finance/FinanceReportes'));
const FinanceConfiguracion = React.lazy(() => import('./modules/admin/finance/FinanceConfiguracion'));
const StaffFinanzasView = React.lazy(() => import('./modules/admin/components/StaffFinanzasView'));
const AdminConfigHub = React.lazy(() => import('./modules/admin/components/AdminConfigHub'));
const AdminGeografia = React.lazy(() => import('./modules/admin/components/AdminGeografia'));
const AdminAjustes = React.lazy(() => import('./modules/admin/components/AdminAjustes'));
const AdminMovilidad = React.lazy(() => import('./modules/admin/components/AdminMovilidad'));
const AdminCRM = React.lazy(() => import('./modules/admin/components/AdminCRM'));
const ProveedorPanel = React.lazy(() => import('./modules/proveedor/views/ProveedorPanel'));
const CursosPublicosView = React.lazy(() => import('./modules/public/views/CursosPublicosView'));
const PacksPublicosView = React.lazy(() => import('./modules/public/views/PacksPublicosView'));
const TeoricoPublicoView = React.lazy(() => import('./modules/public/views/TeoricoPublicoView'));
const TeoricoCursoView = React.lazy(() => import('./modules/public/views/TeoricoCursoView'));
const TeoricoModuloView = React.lazy(() => import('./modules/public/views/TeoricoModuloView'));
const InscripcionTeoricoView = React.lazy(() => import('./modules/inscripcion/views/InscripcionTeoricoView').then(m => ({ default: m.InscripcionTeoricoView })));
const EvaluacionVialView = React.lazy(() => import('./modules/teorico/EvaluacionVialView'));
const EmuladosView = React.lazy(() => import('./modules/teorico/EmuladosView'));
const CorregirPagoView = React.lazy(() => import('./modules/shared/views/CorregirPagoView'));
const NotificacionesView = React.lazy(() => import('./modules/shared/views/NotificacionesView'));
const AlertasAjustesView = React.lazy(() => import('./modules/shared/views/AlertasAjustesView'));
const MovilidadPanel = React.lazy(() => import('./modules/movilidad/views/MovilidadPanel'));
// Fallback de carga
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-100">
    <Spinner message="Cargando..." />
  </div>
);

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useContext(AppContext);
  const { showToast } = useToast();

  React.useEffect(() => {
    if (!user) {
      showToast('Debes iniciar sesión para acceder a esta página.', 'error');
    } else if (!allowedRoles.includes(user.role)) {
      showToast('No tienes permisos para acceder a esta sección.', 'error');
    }
  }, [user, allowedRoles, showToast]);

  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) return <Navigate to="/" replace />;

  return children;
};

// FT-058: acceso por roster (rol `movilidad`), capacidad o admin, no por string fijo.
const MovilidadRoute = ({ children }) => {
  const { user } = useContext(AppContext);
  const { showToast } = useToast();

  React.useEffect(() => {
    if (!user) showToast('Debes iniciar sesión para acceder a esta página.', 'error');
    else if (!puedeOperarMovilidad(user)) showToast('No tienes permisos para acceder al panel de movilidad.', 'error');
  }, [user, showToast]);

  if (!user) return <Navigate to="/login" replace />;
  if (!puedeOperarMovilidad(user)) return <Navigate to="/" replace />;
  return children;
};

function App() {
  const { authReady } = useContext(AppContext);

  if (!authReady) {
    return <PageLoader />;
  }

  return (
    <ToastProvider>
      <PwaUpdatePrompt />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Rutas públicas */}
          <Route path="/" element={<HomeView />} />
          <Route path="/chat" element={<ChatAsistenteView />} />
                    <Route path="/sesiones" element={<CursosPublicosView />} />
          <Route path="/cursos" element={<Navigate to="/sesiones" replace />} />          
          <Route path="/packs" element={<PacksPublicosView />} />
          <Route path="/teorico" element={<TeoricoPublicoView />} />
          <Route path="/teorico/:cursoId" element={<TeoricoCursoView />} />
          <Route path="/teorico/:cursoId/modulo/:moduloId" element={<TeoricoModuloView />} />
          <Route path="/teorico/:cursoId/comprar" element={<InscripcionTeoricoView />} />
          <Route path="/evaluacion" element={<EvaluacionVialView />} />
          <Route path="/reto-vial" element={<Navigate to="/evaluacion" replace />} />
          <Route path="/emulados" element={<EmuladosView />} />
          <Route path="/emulados/:categoriaId" element={<EmuladosView />} />

          <Route path="/inscripcion" element={<InscripcionView />} />
          <Route path="/portal" element={<PortalEstudiante />} />
          <Route path="/login" element={<LoginView />} />
          
          <Route path="/test-bloques" element={<TestBloquesView />} />
          <Route path="/test-datepicker" element={<TestDatePicker />} />

          {/* Panel del estudiante */}
               <Route path="/portal-reservas" element={
            <ProtectedRoute allowedRoles={['estudiante']}>
              <EstudiantePanel />
            </ProtectedRoute>
          } />
                   <Route path="/mi-pack/:packReservaId" element={
            <ProtectedRoute allowedRoles={['estudiante']}>
              <PackDetalleEstudiante />
            </ProtectedRoute>
          } />
          <Route path="/mi-pack/:packReservaId/agendar" element={
            <ProtectedRoute allowedRoles={['estudiante']}>
              <AgendarPackView />
            </ProtectedRoute>
          } />
          <Route path="/corregir-pago/:tipo/:id" element={
            <ProtectedRoute allowedRoles={['estudiante']}>
              <CorregirPagoView />
            </ProtectedRoute>
          } />

        {/* Panel del instructor */}
        <Route path="/instructor" element={
          <ProtectedRoute allowedRoles={['instructor']}>
            <InstructorPanel />
          </ProtectedRoute>
        } />

        {/* FT-058: panel del prestador de movilidad (rol, capacidad o admin) */}
        <Route path="/movilidad" element={
          <MovilidadRoute>
            <MovilidadPanel />
          </MovilidadRoute>
        } />


          {/* Aula virtual (instructor y estudiante) */}
          <Route path="/aula/:reservaId" element={
            <ProtectedRoute allowedRoles={['instructor', 'estudiante']}>
              <AulaVirtualView />
            </ProtectedRoute>
          } />

          {/* Panel de administración – Dashboard principal */}
          <Route path="/dashboard" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminResumen />
            </ProtectedRoute>
          } />

          {/* Centro de alertas y métricas (admin) */}
          <Route path="/admin/alertas" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminAlertas />
            </ProtectedRoute>
          } />
          <Route path="/admin/metricas" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminMetricas />
            </ProtectedRoute>
          } />

          {/* Centro de notificaciones por rol (inbox) y ajustes de alertas */}
          <Route path="/notificaciones" element={
            <ProtectedRoute allowedRoles={['admin', 'instructor', 'proveedor', 'estudiante', 'movilidad']}>
              <NotificacionesView />
            </ProtectedRoute>
          } />
          <Route path="/notificaciones/ajustes" element={
            <ProtectedRoute allowedRoles={['admin', 'instructor', 'proveedor', 'estudiante', 'movilidad']}>
              <AlertasAjustesView />
            </ProtectedRoute>
          } />

                   {/* Gestión de reservas (admin) */}
                  <Route path="/admin/reserva/:reservaId" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminReservaDetalle />
            </ProtectedRoute>
          } />
          
          <Route path="/admin/usuario/:uid" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminUsuarioDetalle />
            </ProtectedRoute>
          } />
          <Route path="/admin/directorio" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDirectorio />
            </ProtectedRoute>
          } />
          <Route path="/admin/tutor/:uid" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminInstructorDetalle />
            </ProtectedRoute>
          } />
          <Route path="/admin/proveedor/:uid" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminProveedorDetalle />
            </ProtectedRoute>
          } />
          <Route path="/admin/moto/:uid" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminMotoDetalle />
            </ProtectedRoute>
          } />
          <Route path="/admin/pack/:packReservaId" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminPackDetalle />
            </ProtectedRoute>
          } />
          <Route path="/admin/acceso-teorico/:accesoId" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminAccesoTeoricoDetalle />
            </ProtectedRoute>
          } />

          {/* A2.8-bis: Progreso académico (admin, instructor, estudiante) */}
          <Route path="/reservas/:reservaId/progreso" element={
            <ProtectedRoute allowedRoles={['admin', 'instructor', 'estudiante']}>
              <ProgresoAcademicoView />
            </ProtectedRoute>
          } />
          <Route path="/admin/reservas/lista" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminReservasList />
            </ProtectedRoute>
          } />
          <Route path="/admin/reservas/packs" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminPacksList />
            </ProtectedRoute>
          } />
          <Route path="/admin/reservas" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminReservasHome />
            </ProtectedRoute>
          } />

          {/* Ocupación diaria (admin) */}
          <Route path="/admin/ocupacion" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminOcupacion />
            </ProtectedRoute>
          } />

          {/* Finanzas (admin) */}
          <Route path="/admin/finanzas" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <FinanceLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="resumen" replace />} />
            <Route path="resumen" element={<FinanceResumen />} />
            <Route path="ingresos" element={<FinanceIngresos />} />
            <Route path="comisiones" element={<FinanceComisiones />} />
            <Route path="gastos" element={<FinanceGastos />} />
            <Route path="impuestos" element={<FinanceImpuestos />} />
            <Route path="movimientos" element={<FinanceMovimientos />} />
            <Route path="reportes" element={<FinanceReportes />} />
            <Route path="configuracion" element={<FinanceConfiguracion />} />
          </Route>
          <Route path="/admin/finanzas/staff/:staffId" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <StaffFinanzasView />
            </ProtectedRoute>
          } />

          {/* Configuración (admin) */}
          <Route path="/admin/config" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminConfigHub />
            </ProtectedRoute>
          } />
          <Route path="/admin/config/ajustes" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminAjustes />
            </ProtectedRoute>
          } />
          <Route path="/admin/config/movilidad" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminMovilidad />
            </ProtectedRoute>
          } />
          <Route path="/admin/crm" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminCRM />
            </ProtectedRoute>
          } />
          <Route path="/admin/geografia" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminGeografia />
            </ProtectedRoute>
          } />

                    {/* Panel del proveedor */}
          <Route path="/proveedor" element={
            <ProtectedRoute allowedRoles={['proveedor']}>
              <ProveedorPanel />
            </ProtectedRoute>
          } />

          {/* Redirección por defecto */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>

      <Suspense fallback={null}>
        <AsistenteFlotante />
      </Suspense>
    </ToastProvider>
  );
}

export default App;