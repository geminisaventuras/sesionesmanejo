// @build: 2026-10-02 | id: HOME-REDESIGN-TEORICO | backup: HomeView.jsx.backup-20261002-110334 | desc: Grid 2 cols para Ver Sesiones + Aprende Online, Chat/Panel más pequeños.
import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../../context/AppContextValue';
import { Calendar, ArrowRight, User, Lock, MessageCircle, LogOut, BookOpen, Package, GraduationCap } from 'lucide-react';
import AppShell from '../../shared/components/AppShell';
import LegalFooter from '../../shared/components/LegalFooter';

const HomeView = () => {
  const navigate = useNavigate();
  const { user, logoutUser } = useContext(AppContext);

  const handleLogout = async () => {
    if (logoutUser) await logoutUser();
    navigate('/');
  };

  return (
    <AppShell bgColor="bg-gray-100" maxWidth="max-w-md" className="sm:rounded-[40px] sm:shadow-2xl sm:max-h-[90vh]">
      <div className="flex flex-col h-full">
        <div className="bg-[#0f172a] text-white flex-[0.55] flex flex-col items-center justify-center px-6 rounded-b-[40px] relative z-0 pt-10 pb-16">
          <div className="relative w-20 h-20 mb-6">
            <img
              src="/logo.png"
              alt="Motoescuela Logo"
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 max-w-[90vw] md:w-80 h-auto object-contain"
            />
          </div>
          <h1 className="text-4xl font-black mb-2 tracking-tight">MOTO<span className="text-blue-500"> APP</span></h1>
          <p className="text-slate-400 text-sm font-medium text-center px-4">Plataforma Integral de Gestión y Desarrollo.</p>
        </div>

        <div className="px-6 pb-8 space-y-3 relative z-10 -mt-8 shrink-0">
          {/* Inscribirse - ancho completo */}
          <button onClick={() => navigate('/inscripcion')} className="w-full bg-[#1d4ed8] text-white p-6 rounded-3xl flex items-center justify-between shadow-[0_10px_40px_rgba(29,78,216,0.4)] hover:bg-blue-700 transition-all active:scale-[0.98]">
            <div className="flex items-center gap-4">
              <Calendar size={28} className="text-white" />
              <div className="text-left">
                <h3 className="font-bold text-xl leading-none">Inscribirse</h3>
                <p className="text-blue-200 text-xs mt-1.5 font-medium leading-none">Reserva sesión y fecha.</p>
              </div>
            </div>
            <ArrowRight size={24} className="text-white" />
          </button>

          {/* Ver Sesiones + Aprende Online - tarjetas compactas */}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => navigate('/sesiones')} className="bg-white text-gray-800 p-4 rounded-3xl flex flex-col justify-between shadow-sm border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all active:scale-[0.98] min-h-[110px]">
              <div className="flex items-start justify-between w-full">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
                  <BookOpen size={20} className="text-blue-600" />
                </div>
                <ArrowRight size={18} className="text-gray-400 mt-0.5" />
              </div>
              <div className="text-left">
                <span className="font-black text-sm block leading-tight">Ver Sesiones</span>
                <span className="text-gray-500 text-[10px] font-medium leading-tight block mt-0.5">Sesiones con tutor</span>
              </div>
            </button>

            <button onClick={() => navigate('/teorico')} className="bg-white text-gray-800 p-4 rounded-3xl flex flex-col justify-between shadow-sm border border-gray-100 hover:border-sky-200 hover:shadow-md transition-all active:scale-[0.98] min-h-[110px]">
              <div className="flex items-start justify-between w-full">
                <div className="w-10 h-10 rounded-2xl bg-sky-50 flex items-center justify-center">
                  <GraduationCap size={20} className="text-sky-600" />
                </div>
                <ArrowRight size={18} className="text-gray-400 mt-0.5" />
              </div>
              <div className="text-left">
                <span className="font-black text-sm block leading-tight">Aprende Online</span>
                <span className="text-gray-500 text-[10px] font-medium leading-tight block mt-0.5">Formación educativa</span>
              </div>
            </button>
          </div>

          {/* Packs Completos - ancho completo */}
          <button onClick={() => navigate('/packs')} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 rounded-3xl flex items-center justify-between shadow-[0_8px_30px_rgba(99,102,241,0.35)] hover:from-indigo-700 hover:to-purple-700 transition-all active:scale-[0.98]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center">
                <Package size={20} className="text-white" />
              </div>
              <div className="text-left">
                <span className="font-bold text-sm block leading-none">Packs Completos</span>
                <span className="text-indigo-100 text-[11px] font-medium leading-none mt-0.5 block">Ahorra hasta 10%</span>
              </div>
            </div>
            <ArrowRight size={20} className="text-white" />
          </button>

          {/* Chat + Mi Panel/Acceso - grid 2 cols compacto */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button disabled className="bg-white py-3 px-3 rounded-2xl flex flex-row items-center justify-center gap-2 shadow-sm border border-gray-100 opacity-60 cursor-not-allowed">
              <MessageCircle size={18} className="text-gray-400" />
              <span className="font-bold text-xs text-gray-500">Chat</span>
            </button>

            {user ? (
              <button onClick={() => {
                switch(user.role) {
                  case 'admin': navigate('/dashboard'); break;
                  case 'instructor': navigate('/instructor'); break;
                  case 'proveedor': navigate('/proveedor'); break;
                  case 'estudiante': navigate('/portal-reservas'); break;
                  default: navigate('/login');
                }
              }} className="bg-white py-3 px-3 rounded-2xl flex flex-row items-center justify-center gap-2 shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all active:scale-[0.98]">
                <User size={18} className="text-blue-600" />
                <span className="font-bold text-xs text-gray-900">Mi Panel</span>
              </button>
            ) : (
              <button onClick={() => navigate('/login')} className="bg-white py-3 px-3 rounded-2xl flex flex-row items-center justify-center gap-2 shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all active:scale-[0.98]">
                <Lock size={18} className="text-blue-600" />
                <span className="font-bold text-xs text-gray-900">Acceso Privado</span>
              </button>
            )}
          </div>

          {/* Cerrar sesión */}
          {user && (
            <button onClick={handleLogout} className="w-full bg-red-50 hover:bg-red-100 text-red-600 py-3 rounded-2xl flex items-center justify-center gap-2 border border-red-200 transition-all active:scale-[0.98]">
              <LogOut size={16} />
              <span className="text-xs font-bold">Cerrar Sesión</span>
            </button>
          )}
        </div>

        <LegalFooter />
      </div>
    </AppShell>
  );
};

export default HomeView;