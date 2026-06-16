// @build: 2026-06-16.08-30-00 | id: B5-DIAG | desc: Ruta de prueba /test-bloques agregada
import React, { useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppContext } from './context/AppContextValue';
import { Spinner } from './components/UI';
import { AlertCircle, Check } from 'lucide-react';
import HomeView from './views/HomeView';
import { InscripcionView } from './views/InscripcionView';
import { PortalEstudiante } from './views/PortalEstudiante';
import { EstudiantePanel } from './views/EstudiantePanel';
import { TestBloquesView } from './views/TestBloquesView';
import { LoginView } from './views/LoginView';
import { DashboardView } from './admin/DashboardView';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useContext(AppContext);
  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

function App() {
  const { authReady, toast } = useContext(AppContext);

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Spinner message="Conectando con Firebase..." />
      </div>
    );
  }

  return (
    <>
      {toast && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-[90%] max-w-md">
          <div className={`px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-sm font-bold text-white ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
            {toast.type === 'error' ? <AlertCircle size={16} /> : <Check size={16} />}
            {toast.msg}
          </div>
        </div>
      )}

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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
