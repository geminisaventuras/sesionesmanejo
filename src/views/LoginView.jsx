// @build: 2026-06-18.06-30-00 | id: SISTEMA | desc: Botones primary y sin título duplicado
import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContextValue';
import { useToast } from '../modules/shared/components/ToastProvider';
import AppShell from '../modules/shared/components/AppShell';
import { Button, Input } from '../components/UI';
import { ChevronLeft, Lock, Mail } from 'lucide-react';

export const LoginView = () => {
  const { loginWithGoogle, loginWithEmail, setUser, instructores, proveedores } = useContext(AppContext);
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const assignRole = (userEmail, displayName) => {
    if (userEmail === 'armandoaventurasve@gmail.com') {
      setUser({ role: 'admin', data: { nombre: displayName, email: userEmail } });
      navigate('/dashboard');
      showToast(`¡Bienvenido al panel, ${displayName}!`, 'success');
      return;
    }
    const inst = (instructores || []).find(i => i.email?.toLowerCase() === userEmail);
    if (inst) {
      if (!inst.activo) { showToast('Tu cuenta de instructor está inactiva', 'error'); return; }
      setUser({ role: 'instructor', data: inst });
      navigate('/dashboard');
      showToast(`Bienvenido, Instructor ${inst.nombre}`, 'success');
      return;
    }
    const prov = (proveedores || []).find(p => p.email?.toLowerCase() === userEmail);
    if (prov) {
      if (!prov.activo) { showToast('Tu cuenta de proveedor está inactiva', 'error'); return; }
      setUser({ role: 'proveedor', data: prov });
      navigate('/dashboard');
      showToast(`Bienvenido, ${prov.nombre}`, 'success');
      return;
    }
    showToast('Este correo no tiene permisos en el sistema', 'error');
  };

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await loginWithGoogle();
      if (result.success) {
        const userEmail = result.data.user.email.toLowerCase();
        assignRole(userEmail, result.data.user.displayName);
      } else {
        showToast(result.error.message, 'error');
      }
    } catch (error) {
      showToast('Error al iniciar sesión con Google', 'error');
    } finally { setIsLoggingIn(false); }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return showToast('Completa todos los campos', 'error');
    setIsLoggingIn(true);
    try {
      const result = await loginWithEmail(email, password);
      if (result.success) {
        assignRole(email.toLowerCase(), email);
      } else {
        showToast(result.error.message, 'error');
      }
    } catch (error) {
      showToast('Error al iniciar sesión', 'error');
    } finally { setIsLoggingIn(false); }
  };

  const header = (
    <div className="bg-white border-b px-5 py-3 flex items-center gap-3">
      <button onClick={() => navigate('/')} className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 transition-colors">
        <ChevronLeft size={24} />
      </button>
      <h2 className="text-xl font-black uppercase flex-1">Acceso Privado</h2>
    </div>
  );

  return (
    <AppShell header={header} bgColor="bg-white">
      <div className="p-6 flex flex-col items-center justify-center min-h-full">
        <div className="w-20 h-20 bg-gray-900 rounded-3xl flex items-center justify-center mb-6 shadow-xl mx-auto transform -rotate-6">
          <Lock size={36} className="text-white transform rotate-6" />
        </div>
        <p className="text-center text-gray-500 text-sm mb-8">
          {showEmailForm ? 'Ingresa tus credenciales' : 'Inicia sesión con tu cuenta de Google o con correo y clave.'}
        </p>
        {!showEmailForm ? (
          <>
            <Button onClick={handleGoogleLogin} variant="primary" className="mt-4" disabled={isLoggingIn}>
              {isLoggingIn ? 'Conectando con Google...' : 'Iniciar sesión con Google'}
            </Button>
            <p className="text-center text-sm text-gray-500 mt-4">
              <button type="button" onClick={() => setShowEmailForm(true)} className="text-blue-600 font-bold underline">
                Iniciar sesión con correo y clave
              </button>
            </p>
          </>
        ) : (
          <form onSubmit={handleEmailLogin} className="space-y-4 w-full">
            <Input label="Correo electrónico" type="email" icon={Mail} value={email} onChange={e => setEmail(e.target.value)} required />
            <Input label="Contraseña" type="password" icon={Lock} value={password} onChange={e => setPassword(e.target.value)} required />
            <Button type="submit" variant="primary" disabled={isLoggingIn}>{isLoggingIn ? 'Verificando...' : 'Entrar'}</Button>
            <p className="text-center text-sm text-gray-500 mt-2">
              <button type="button" onClick={() => setShowEmailForm(false)} className="text-blue-600 underline">
                Volver a inicio de sesión con Google
              </button>
            </p>
          </form>
        )}
      </div>
    </AppShell>
  );
};
