// @build: 2026-06-20 | id: FINAL | desc: Login unificado con redirección por rol usando useEffect + Google para estudiantes
import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppContext } from '../../../context/AppContextValue';
import { useToast } from '../../shared/components/ToastProvider';
import AppShell from '../../shared/components/AppShell';
import { Button, Input } from '../../../components/UI';
import { ChevronLeft, Lock, Mail } from 'lucide-react';
import { loginEmailSchema, loginEstudianteSchema } from '../../shared/schemas/validations';

export const LoginView = () => {
  const { loginWithGoogle, loginWithEmail, loginEstudiante, user } = useContext(AppContext);
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const tabFromUrl = searchParams.get('tab');
  const [modo, setModo] = useState(tabFromUrl === 'estudiante' ? 'estudiante' : 'staff');

  const [correoEstudiante, setCorreoEstudiante] = useState('');
  const [pin, setPin] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    switch (user.role) {
      case 'admin':
        navigate('/dashboard', { replace: true });
        break;
      case 'instructor':
        navigate('/instructor', { replace: true });
        break;
      case 'proveedor':
        navigate('/proveedor', { replace: true });
        break;
      case 'estudiante':
        navigate('/portal-reservas', { replace: true });
        break;
      default:
        break;
    }
  }, [user, navigate]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const result = await loginWithGoogle();
      if (!result?.success) {
        showToast(result?.error?.message || 'Error al iniciar sesión con Google', 'error');
      }
    } catch (error) {
      console.error('Error en Google login:', error);
      showToast('Error inesperado al iniciar sesión con Google', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStaffLogin = async (e) => {
    e.preventDefault();
    const resultado = loginEmailSchema.safeParse({ email, password });
    if (!resultado.success) {
      const mensajes = resultado.error.issues.map(i => i.message).join('\n');
      showToast(mensajes, 'error');
      return;
    }
    setLoading(true);
    const result = await loginWithEmail(email, password);
    setLoading(false);
    if (!result?.success) {
      showToast(result?.error?.message || 'Error al iniciar sesión', 'error');
    }
  };

  const handleEstudianteLogin = async (e) => {
    e.preventDefault();
    const resultado = loginEstudianteSchema.safeParse({ correo: correoEstudiante, pin });
    if (!resultado.success) {
      const mensajes = resultado.error.issues.map(i => i.message).join('\n');
      showToast(mensajes, 'error');
      return;
    }
    setLoading(true);
    const result = await loginEstudiante(correoEstudiante, pin);
    setLoading(false);
    if (!result?.success) {
      showToast(result?.error?.message || 'Error al iniciar sesión', 'error');
    }
  };

  const header = (
    <div className="bg-white border-b px-5 py-3 flex items-center gap-3">
      <button onClick={() => navigate('/')} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 transition-colors">
        <ChevronLeft size={24} />
      </button>
      <h2 className="text-xl font-black uppercase flex-1">Acceso</h2>
    </div>
  );

  return (
    <AppShell header={header} bgColor="bg-white">
      <div className="p-6 flex flex-col items-center justify-center min-h-full">
        <div className="flex gap-2 mb-6 w-full max-w-xs">
          <button
            type="button"
            onClick={() => setModo('staff')}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
              modo === 'staff' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            🛡️ Staff
          </button>
          <button
            type="button"
            onClick={() => setModo('estudiante')}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
              modo === 'estudiante' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            🎓 Estudiante
          </button>
        </div>

        {modo === 'staff' ? (
          <div className="w-full max-w-xs space-y-4">
            <form onSubmit={handleStaffLogin} className="space-y-4">
              <Input label="Correo electrónico" type="email" icon={Mail} value={email} onChange={e => setEmail(e.target.value)} placeholder="staff@motoescuela.com" />
              <Input label="Contraseña" type="password" icon={Lock} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
              <Button type="submit" disabled={loading} className="!w-full !py-3">
                {loading ? 'Verificando...' : 'Ingresar'}
              </Button>
            </form>
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">o</span>
              </div>
            </div>
            <Button onClick={handleGoogleLogin} variant="outline" className="!w-full !py-3" disabled={loading}>
              {loading ? 'Conectando...' : 'Iniciar sesión con Google'}
            </Button>
          </div>
        ) : (
          <div className="w-full max-w-xs space-y-4">
            <form onSubmit={handleEstudianteLogin} className="space-y-4">
              <Input label="Correo electrónico" type="email" icon={Mail} value={correoEstudiante} onChange={e => setCorreoEstudiante(e.target.value.trim().toLowerCase())} placeholder="tucorreo@ejemplo.com" />
              <Input label="PIN de acceso" type="password" icon={Lock} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="••••••" maxLength={6} />
              <Button type="submit" disabled={loading} className="!w-full !py-3">
                {loading ? 'Ingresando...' : 'Ingresar'}
              </Button>
            </form>
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">o</span>
              </div>
            </div>
            <Button onClick={handleGoogleLogin} variant="outline" className="!w-full !py-3" disabled={loading}>
              {loading ? 'Conectando...' : 'Iniciar sesión con Google'}
            </Button>
          </div>
        )}
      </div>
    </AppShell>
  );
};