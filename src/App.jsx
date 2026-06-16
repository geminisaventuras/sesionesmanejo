// @build: 2026-06-18.02-00-00 | id: B15-SISTEMA | desc: Integrado ToastProvider y eliminado toast viejo del AppContext
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
import TestPagoView from './views/TestPagoView';
import { LoginView } from './views/LoginView';
import { DashboardView } from './views/DashboardView';

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
          <ProtectedRoute allowedRoles={['admin', 'instructor', 'proveedor']}>
            <DashboardView />
          </ProtectedRoute>
        } />
        <Route path="/test-pago" element={<TestPagoView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ToastProvider>
  );
}

export default App;
