// @build: 2026-09-30 | id: LEGAL-TERMINOLOGIA-APP | backup: App.jsx.backup-AQUI-VA-TU-TIMESTAMP | desc: Ruta /cursos migrada a /sesiones + redirect legacy.
import React, { useContext, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppContext } from './context/AppContextValue';
import { ToastProvider, useToast } from './modules/shared/components/ToastProvider';
import { Spinner } from './components/UI';
import InstructorPanel from './modules/instructor/views/InstructorPanel';
// Lazy loading de todas las vistas
const HomeView = React.lazy(() => import('./modules/home/views/HomeView'));
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
const AdminReservasHome = React.lazy(() => import('./modules/admin/components/AdminReservasHome'));
const AdminReservasList = React.lazy(() => import('./modules/admin/components/AdminReservasList'));
const AdminReservaDetalle = React.lazy(() => import('./modules/admin/components/AdminReservaDetalle'));
const AdminPackDetalle = React.lazy(() => import('./modules/admin/components/AdminPackDetalle'));
const ProgresoAcademicoView = React.lazy(() => import('./modules/shared/views/ProgresoAcademicoView'));

const AdminOcupacion = React.lazy(() => import('./modules/admin/components/AdminOcupacion'));
const AdminFinanzas = React.lazy(() => import('./modules/admin/components/AdminFinanzas'));
const StaffFinanzasView = React.lazy(() => import('./modules/admin/components/StaffFinanzasView'));
const AdminConfigHub = React.lazy(() => import('./modules/admin/components/AdminConfigHub'));
const AdminAjustes = React.lazy(() => import('./modules/admin/components/AdminAjustes'));
const ProveedorPanel = React.lazy(() => import('./modules/proveedor/views/ProveedorPanel'));
const CursosPublicosView = React.lazy(() => import('./modules/public/views/CursosPublicosView'));
const PacksPublicosView = React.lazy(() => import('./modules/public/views/PacksPublicosView'));
const TeoricoPublicoView = React.lazy(() => import('./modules/public/views/TeoricoPublicoView'));
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

function App() {
  const { authReady } = useContext(AppContext);

  if (!authReady) {
    return <PageLoader />;
  }

  return (
    <ToastProvider>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Rutas públicas */}
          <Route path="/" element={<HomeView />} />
                    <Route path="/sesiones" element={<CursosPublicosView />} />
          <Route path="/cursos" element={<Navigate to="/sesiones" replace />} />          
          <Route path="/packs" element={<PacksPublicosView />} />
          <Route path="/teorico" element={<TeoricoPublicoView />} />

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

          {/* Panel del instructor */}
          <Route path="/instructor" element={
            <ProtectedRoute allowedRoles={['instructor']}>
              <InstructorPanel />
            </ProtectedRoute>
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

                   {/* Gestión de reservas (admin) */}
                  <Route path="/admin/reserva/:reservaId" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminReservaDetalle />
            </ProtectedRoute>
          } />
          <Route path="/admin/pack/:packReservaId" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminPackDetalle />
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
              <AdminFinanzas />
            </ProtectedRoute>
          } />
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
    </ToastProvider>
  );
}

export default App;