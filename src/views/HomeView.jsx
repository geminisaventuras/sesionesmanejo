// @build: 2026-06-18.06-15-00 | id: SISTEMA-HOME | desc: Iconos de botones secundarios en gris oscuro
import { useNavigate } from 'react-router-dom';
import { Zap, Calendar, ArrowRight, User, Lock } from 'lucide-react';
import AppShell from '../modules/shared/components/AppShell';

const HomeView = () => {
  const navigate = useNavigate();

  return (
    <AppShell bgColor="bg-gray-100" maxWidth="max-w-md" className="sm:rounded-[40px] sm:shadow-2xl sm:max-h-[90vh]">
      <div className="flex flex-col h-full">
        <div className="bg-[#0f172a] text-white flex-[0.55] flex flex-col items-center justify-center px-6 rounded-b-[40px] relative z-0 pt-10 pb-16">
          <div className="w-20 h-20 bg-[#1e293b] rounded-3xl flex items-center justify-center mb-6 shadow-lg transform -rotate-6">
            <Zap size={40} className="text-orange-500 transform rotate-6" />
          </div>
          <h1 className="text-4xl font-black mb-2 tracking-tight">MOTO<span className="text-blue-500">ESCUELA</span></h1>
          <p className="text-slate-400 text-sm font-medium text-center px-4">Plataforma Integral de Gestión y Aprendizaje.</p>
        </div>
        <div className="px-6 pb-8 space-y-4 relative z-10 -mt-8 shrink-0">
          <button onClick={() => navigate('/inscripcion')} className="w-full bg-[#1d4ed8] text-white p-6 rounded-3xl flex items-center justify-between shadow-[0_10px_40px_rgba(29,78,216,0.4)] hover:bg-blue-700 transition-all active:scale-[0.98]">
            <div className="flex items-center gap-4"><Calendar size={28} className="text-white" /><div className="text-left"><h3 className="font-bold text-xl leading-none">Inscribirse</h3><p className="text-blue-200 text-xs mt-1.5 font-medium leading-none">Reserva curso y bloque.</p></div></div>
            <ArrowRight size={24} className="text-white" />
          </button>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <button onClick={() => navigate('/portal')} className="bg-white py-6 px-4 rounded-3xl flex flex-col items-center justify-center gap-3 shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all active:scale-[0.98]">
              <div className="w-12 h-12 rounded-full border-2 border-blue-200 flex items-center justify-center text-gray-800 shadow-sm shadow-blue-100/50">
                <User size={20} />
              </div>
              <div className="text-center"><h3 className="font-bold text-sm text-gray-900 leading-tight">Portal de<br/>Estudiantes</h3></div>
            </button>
            <button onClick={() => navigate('/login')} className="bg-white py-6 px-4 rounded-3xl flex flex-col items-center justify-center gap-3 shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all active:scale-[0.98]">
              <div className="w-12 h-12 rounded-full border-2 border-blue-200 flex items-center justify-center text-gray-800 shadow-sm shadow-blue-100/50">
                <Lock size={20} />
              </div>
              <div className="text-center"><h3 className="font-bold text-sm text-gray-900 leading-tight">Acceso<br/>Privado</h3></div>
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default HomeView;
