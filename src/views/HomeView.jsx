import { useNavigate } from 'react-router-dom';
import { Zap, Calendar, ArrowRight, User, Lock } from 'lucide-react';

const HomeView = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="w-full max-w-md bg-gray-50 h-[100dvh] sm:h-[850px] sm:max-h-[90vh] sm:rounded-[40px] sm:shadow-2xl relative flex flex-col overflow-hidden">
        <div className="bg-[#0f172a] text-white flex-1 flex flex-col items-center justify-center px-6 rounded-b-[40px] relative z-0 pb-10">
          <div className="w-20 h-20 bg-[#1e293b] rounded-3xl flex items-center justify-center mb-6 shadow-lg transform -rotate-6">
            <Zap size={40} className="text-orange-500 transform rotate-6" />
          </div>
          <h1 className="text-4xl font-black mb-2 tracking-tight">MOTO<span className="text-blue-500">ESCUELA</span></h1>
          <p className="text-slate-400 text-sm font-medium text-center px-4">Plataforma Integral de Gestión y Aprendizaje.</p>
        </div>
        <div className="px-6 pb-8 space-y-4 relative z-10 -mt-10 shrink-0">
          <button onClick={() => navigate('/inscripcion')} className="w-full bg-[#1d4ed8] text-white p-6 rounded-3xl flex items-center justify-between shadow-[0_10px_40px_rgba(29,78,216,0.4)] hover:bg-blue-700 transition-all active:scale-[0.98]">
            <div className="flex items-center gap-4"><Calendar size={28} className="text-white" /><div className="text-left"><h3 className="font-bold text-xl leading-none">Inscribirse</h3><p className="text-blue-200 text-xs mt-1.5 font-medium leading-none">Reserva curso y bloque.</p></div></div>
            <ArrowRight size={24} className="text-white" />
          </button>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => navigate('/portal')} className="bg-white py-6 px-4 rounded-3xl flex flex-col items-center justify-center gap-3 shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all active:scale-[0.98]">
              <div className="w-12 h-12 rounded-full border-2 border-gray-100 flex items-center justify-center text-gray-800"><User size={20} /></div>
              <div className="text-center"><h3 className="font-bold text-sm text-gray-900 leading-tight">Portal de<br/>Estudiantes</h3></div>
            </button>
            <button onClick={() => navigate('/login')} className="bg-white py-6 px-4 rounded-3xl flex flex-col items-center justify-center gap-3 shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all active:scale-[0.98]">
              <div className="w-12 h-12 rounded-full border-2 border-gray-100 flex items-center justify-center text-gray-800"><Lock size={20} /></div>
              <div className="text-center"><h3 className="font-bold text-sm text-gray-900 leading-tight">Acceso<br/>Privado</h3></div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeView;
