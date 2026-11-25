// @build: 2026-11-21 | id: LOGIN-MARCA-RBAC | desc: Rediseño con identidad visual (logo + navy/azul) y validación de rol por pestaña: Staff solo roles internos, Usuario solo estudiantes con PIN.
import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppContext } from '../../../context/AppContextValue';
import { useToast } from '../../shared/components/ToastProvider';
import AppShell from '../../shared/components/AppShell';
import LegalFooter from '../../shared/components/LegalFooter';
import { Button } from '../../../components/UI';
import {
  ChevronLeft, Lock, Mail, Eye, EyeOff, ShieldCheck, UserRound, KeyRound, ArrowRight, Loader2
} from 'lucide-react';
import { loginEmailSchema, loginEstudianteSchema } from '../../shared/schemas/validations';

const STAFF_ROLES = ['admin', 'instructor', 'proveedor', 'movilidad'];
const ROLE_HOME = {
  admin: '/dashboard',
  instructor: '/instructor',
  proveedor: '/proveedor',
  movilidad: '/movilidad',
  estudiante: '/portal-reservas',
};

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);

const Field = ({ label, icon: Icon, right, helper, ...props }) => (
  <div className="text-left">
    <label className="mb-1 ml-1 block text-[10px] font-black uppercase tracking-wider text-gray-500">
      {label}
    </label>
    <div className="relative">
      {Icon && (
        <Icon size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
      )}
      <input
        className="w-full rounded-2xl border-2 border-gray-200 bg-gray-50 py-3 [@media(max-height:700px)]:py-2.5 [@media(max-height:620px)]:py-2 pl-12 pr-12 text-base font-medium text-gray-900 outline-none transition-all placeholder:font-normal placeholder:text-gray-400 focus:border-[#1d4ed8] focus:bg-white focus:ring-4 focus:ring-blue-600/10"
        {...props}
      />
      {right && <div className="absolute right-2 top-1/2 -translate-y-1/2">{right}</div>}
    </div>
    {helper && <p className="mt-1 ml-1 text-[10px] text-gray-400">{helper}</p>}
  </div>
);

const EyeButton = ({ visible, onToggle, label }) => (
  <button
    type="button"
    onClick={onToggle}
    aria-label={label}
    className="rounded-xl p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
  >
    {visible ? <EyeOff size={18} /> : <Eye size={18} />}
  </button>
);

export const LoginView = () => {
  const { loginWithGoogle, loginWithEmail, loginEstudiante, user, logoutUser } = useContext(AppContext);
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const tabFromUrl = searchParams.get('tab');
  const [modo, setModo] = useState(tabFromUrl === 'estudiante' ? 'estudiante' : 'staff');

  const [correoEstudiante, setCorreoEstudiante] = useState('');
  const [pin, setPin] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verPassword, setVerPassword] = useState(false);
  const [verPin, setVerPin] = useState(false);
  const [loading, setLoading] = useState(null);

  const expectedRoleRef = useRef(null);
  const fallbackRef = useRef(null);

  useEffect(() => {
    if (tabFromUrl === 'estudiante' || tabFromUrl === 'staff') setModo(tabFromUrl);
  }, [tabFromUrl]);

  useEffect(() => () => clearTimeout(fallbackRef.current), []);

  useEffect(() => {
    if (!user) return;
    clearTimeout(fallbackRef.current);

    const esperado = expectedRoleRef.current;
    if (esperado) {
      expectedRoleRef.current = null;
      const esStaff = STAFF_ROLES.includes(user.role);
      const permitido = esperado === 'staff' ? esStaff : user.role === 'estudiante';
      setLoading(null);

      if (!permitido) {
        showToast(
          esperado === 'staff'
            ? 'Esta cuenta no es de personal. Ingresa desde la pestaña Usuario.'
            : 'Esta cuenta es de personal. Ingresa desde la pestaña Staff.',
          'error'
        );
        logoutUser();
        return;
      }
    }

    navigate(ROLE_HOME[user.role] || '/', { replace: true });
  }, [user, navigate, logoutUser, showToast]);

  const esperarVerificacionDeRol = () => {
    clearTimeout(fallbackRef.current);
    fallbackRef.current = setTimeout(() => {
      expectedRoleRef.current = null;
      setLoading(null);
      showToast('No pudimos verificar tu perfil. Intenta de nuevo o contacta al administrador.', 'error');
    }, 12000);
  };

  const handleGoogleLogin = async () => {
    expectedRoleRef.current = modo;
    setLoading('google');
    try {
      const result = await loginWithGoogle();
      if (!result?.success) {
        expectedRoleRef.current = null;
        setLoading(null);
        showToast(result?.error?.message || 'Error al iniciar sesión con Google', 'error');
        return;
      }
      esperarVerificacionDeRol();
    } catch (error) {
      console.error('Error en Google login:', error);
      expectedRoleRef.current = null;
      setLoading(null);
      showToast('Error inesperado al iniciar sesión con Google', 'error');
    }
  };

  const handleStaffLogin = async (e) => {
    e.preventDefault();
    if (loading) return;

    const resultado = loginEmailSchema.safeParse({ email, password });
    if (!resultado.success) {
      showToast(resultado.error.issues.map(i => i.message).join('\n'), 'error');
      return;
    }

    expectedRoleRef.current = 'staff';
    setLoading('staff');
    const result = await loginWithEmail(email.trim(), password);
    if (!result?.success) {
      expectedRoleRef.current = null;
      setLoading(null);
      showToast(result?.error?.message || 'Error al iniciar sesión', 'error');
      return;
    }
    esperarVerificacionDeRol();
  };

  const handleEstudianteLogin = async (e) => {
    e.preventDefault();
    if (loading) return;

    const resultado = loginEstudianteSchema.safeParse({ correo: correoEstudiante, pin });
    if (!resultado.success) {
      showToast(resultado.error.issues.map(i => i.message).join('\n'), 'error');
      return;
    }

    expectedRoleRef.current = 'estudiante';
    setLoading('estudiante');
    const result = await loginEstudiante(correoEstudiante, pin);
    if (!result?.success) {
      expectedRoleRef.current = null;
      setLoading(null);
      showToast(result?.error?.message || 'Error al iniciar sesión', 'error');
      return;
    }
    esperarVerificacionDeRol();
  };

  const header = (
    <div className="flex items-center gap-3 px-5 pt-5">
      <button
        onClick={() => navigate('/')}
        aria-label="Volver al inicio"
        className="rounded-2xl border border-white/10 bg-white/10 p-2.5 text-white transition-colors hover:bg-white/20"
      >
        <ChevronLeft size={22} />
      </button>
      <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
        Acceso privado
      </span>
    </div>
  );

  return (
    <AppShell
      header={header}
      bgColor="bg-[#0f172a]"
      className="sm:max-h-[90vh] sm:rounded-[40px] sm:shadow-2xl"
    >
      <div className="relative flex min-h-full flex-col px-5 pb-5 pt-1 [@media(max-height:700px)]:pb-2 [@media(max-height:620px)]:pb-0">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-24 -top-24 h-64 w-64 rounded-full bg-blue-600/25 blur-3xl" />
          <div className="absolute -right-20 top-44 h-56 w-56 rounded-full bg-indigo-500/20 blur-3xl" />
        </div>

        <div className="relative flex flex-1 items-center">
          <div className="w-full rounded-[28px] bg-white p-4 [@media(max-height:700px)]:p-3 [@media(max-height:620px)]:p-2 shadow-[0_30px_70px_-20px_rgba(0,0,0,0.75)] ring-1 ring-white/10">
          <div className="flex flex-col items-center text-center">
            <div
              role="img"
              aria-label="Logo Motoescuela"
              className="h-14 w-[100px] bg-no-repeat [@media(max-height:700px)]:h-10 [@media(max-height:700px)]:w-[71px] [@media(max-height:620px)]:h-9 [@media(max-height:620px)]:w-[64px]"
              style={{
                backgroundImage: "url('/logo.png')",
                backgroundSize: '313.5% auto',
                backgroundPosition: '50% 42%',
              }}
            />
            <h1 className="text-2xl font-black tracking-tight text-[#0f172a] [@media(max-height:700px)]:text-xl [@media(max-height:620px)]:text-lg">
              MOTO<span className="text-[#1d4ed8]"> APP</span>
            </h1>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 [@media(max-height:700px)]:hidden">
              Plataforma Integral de Gestión y Desarrollo
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-1 rounded-2xl bg-gray-100 p-1 [@media(max-height:700px)]:mt-3">
            <button
              type="button"
              onClick={() => setModo('staff')}
              disabled={!!loading}
              aria-pressed={modo === 'staff'}
              className={`flex items-center justify-center gap-2 rounded-xl py-2 text-sm font-bold transition-all disabled:opacity-60 ${
                modo === 'staff' ? 'bg-[#0f172a] text-white shadow-md' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <ShieldCheck size={15} /> Staff
            </button>
            <button
              type="button"
              onClick={() => setModo('estudiante')}
              disabled={!!loading}
              aria-pressed={modo === 'estudiante'}
              className={`flex items-center justify-center gap-2 rounded-xl py-2 text-sm font-bold transition-all disabled:opacity-60 ${
                modo === 'estudiante' ? 'bg-[#0f172a] text-white shadow-md' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <UserRound size={15} /> Usuario
            </button>
          </div>

          <p className="mt-2 text-center text-[10px] leading-relaxed text-gray-500 [@media(max-height:620px)]:hidden">
            {modo === 'staff'
              ? 'Solo administradores, instructores y proveedores autorizados.'
              : 'Usuarios inscritos: accede con tu correo y PIN de 6 dígitos.'}
          </p>

          <div className="mt-3">
            {modo === 'staff' ? (
              <div className="space-y-3">
                <form onSubmit={handleStaffLogin} className="space-y-3">
                  <Field
                    label="Correo electrónico"
                    type="email"
                    icon={Mail}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="staff@motoapp.com"
                    autoComplete="email"
                  />
                  <Field
                    label="Contraseña"
                    type={verPassword ? 'text' : 'password'}
                    icon={Lock}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    right={
                      <EyeButton
                        visible={verPassword}
                        onToggle={() => setVerPassword(v => !v)}
                        label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      />
                    }
                  />
                  <Button
                    type="submit"
                    disabled={!!loading}
                    className="!mt-1 !rounded-2xl !bg-[#1d4ed8] !py-3 !shadow-none hover:!bg-blue-700 [@media(max-height:700px)]:!py-2.5 [@media(max-height:620px)]:!py-2"
                  >
                    {loading === 'staff' ? (
                      <>
                        <Loader2 size={18} className="animate-spin" /> Verificando...
                      </>
                    ) : (
                      'Ingresar'
                    )}
                  </Button>
                </form>

                <div className="flex items-center gap-3 py-0.5">
                  <div className="h-px flex-1 bg-gray-200" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">o</span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={!!loading}
                  className="flex w-full items-center justify-center gap-2.5 rounded-2xl border-2 border-gray-200 bg-white py-3 [@media(max-height:700px)]:py-2.5 [@media(max-height:620px)]:py-2 text-sm font-bold text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                >
                  {loading === 'google' ? (
                    <Loader2 size={18} className="animate-spin text-gray-500" />
                  ) : (
                    <GoogleIcon />
                  )}
                  {loading === 'google' ? 'Conectando...' : 'Continuar con Google'}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <form onSubmit={handleEstudianteLogin} className="space-y-3">
                  <Field
                    label="Correo electrónico"
                    type="email"
                    icon={Mail}
                    value={correoEstudiante}
                    onChange={e => setCorreoEstudiante(e.target.value.trim().toLowerCase())}
                    placeholder="tucorreo@ejemplo.com"
                    autoComplete="email"
                  />
                  <Field
                    label="PIN de acceso"
                    type={verPin ? 'text' : 'password'}
                    icon={KeyRound}
                    value={pin}
                    onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="••••••"
                    maxLength={6}
                    inputMode="numeric"
                    autoComplete="current-password"
                    helper="PIN de 6 dígitos enviado al inscribirte"
                    right={
                      <EyeButton
                        visible={verPin}
                        onToggle={() => setVerPin(v => !v)}
                        label={verPin ? 'Ocultar PIN' : 'Mostrar PIN'}
                      />
                    }
                  />
                  <Button
                    type="submit"
                    disabled={!!loading}
                    className="!mt-1 !rounded-2xl !bg-[#1d4ed8] !py-3 !shadow-none hover:!bg-blue-700 [@media(max-height:700px)]:!py-2.5 [@media(max-height:620px)]:!py-2"
                  >
                    {loading === 'estudiante' ? (
                      <>
                        <Loader2 size={18} className="animate-spin" /> Ingresando...
                      </>
                    ) : (
                      'Ingresar a mi portal'
                    )}
                  </Button>
                </form>

                <p className="text-center text-xs text-gray-500">
                  ¿Aún no estás inscrito?{' '}
                  <button
                    type="button"
                    onClick={() => navigate('/inscripcion')}
                    className="font-bold text-[#1d4ed8] hover:underline"
                  >
                    Inscríbete aquí
                  </button>
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 pt-3 [@media(max-height:620px)]:pt-2">
            <button
              type="button"
              onClick={() => navigate('/sesiones')}
              className="flex w-full items-center justify-center gap-2 text-xs font-black uppercase tracking-wider text-[#1d4ed8] hover:underline"
            >
              Ver sesiones disponibles <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

        <LegalFooter compact />
      </div>
    </AppShell>
  );
};
