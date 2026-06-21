import React, { useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppContext } from './context/AppContextValue';
import { ToastProvider } from './modules/shared/components/ToastProvider';
import { Spinner } from './components/UI';
import HomeView from './views/HomeView';
import { InscripcionView } from './views/InscripcionView';
import { PortalEstudiante } from './views/PortalEstudiante';
import { EstudiantePanel } from './views/EstudiantePanel';
import { TestBloquesView } from './views/TestBloquesView';
import { LoginView } from './views/LoginView';
import { DashboardView } from './views/DashboardView';
import InstructorPanel from './views/InstructorPanel';
import AulaVirtualView from './views/AulaVirtualView';
import TestDatePicker from './views/TestDatePicker';
import AdminReservaDetalle from './views/AdminReservaDetalle';
import AdminReservasList from './views/AdminReservasList';
import AdminReservasHome from './views/AdminReservasHome';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useContext(AppContext);
  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

function App() {
  const { authReady } = useContext(AppContext);

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Spinner message="Conectando con Firebase..." />
      </div>
    );
  }

  return (
    <ToastProvider>
      <Routes>
        <Route path="/" element={<HomeView />} />
        <Route path="/inscripcion" element={<InscripcionView />} />
        <Route path="/portal" element={<PortalEstudiante />} />
        <Route path="/portal-reservas" element={
          <ProtectedRoute allowedRoles={['estudiante']}>
            <EstudiantePanel />
          </ProtectedRoute>
        } />
        <Route path="/test-bloques" element={<TestBloquesView />} />
        <Route path="/login" element={<LoginView />} />
        <Route path="/dashboard/*" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <DashboardView />
          </ProtectedRoute>
        } />
        <Route path="/admin/reserva/:reservaId" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminReservaDetalle />
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
        <Route path="/instructor" element={
          <ProtectedRoute allowedRoles={['instructor']}>
            <InstructorPanel />
          </ProtectedRoute>
        } />
        <Route path="/aula/:reservaId" element={
          <ProtectedRoute allowedRoles={['instructor', 'estudiante']}>
            <AulaVirtualView />
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
        <Route path="/test-datepicker" element={<TestDatePicker />} />
      </Routes>
    </ToastProvider>
  );
}

export default App;