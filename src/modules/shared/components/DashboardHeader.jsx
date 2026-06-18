import { ChevronLeft, User, LogOut, Bell } from 'lucide-react';

export default function DashboardHeader({ nombre, children, onBack, onLogout, role = 'instructor' }) {
  return (
    <div className="bg-gradient-to-r from-gray-900 via-slate-800 to-gray-900 text-white px-4 py-2.5 flex items-center gap-3 relative overflow-hidden shadow-lg rounded-b-2xl">
      <div className="absolute -top-4 -right-4 w-16 h-16 bg-blue-500/20 rounded-full blur-xl"></div>
      {children || (
        <>
          <div className="flex items-center gap-2 flex-1 relative z-10">
            <User size={18} className="text-gray-400" />
            <span className="text-sm font-bold text-gray-200">{nombre || (role === 'instructor' ? 'Instructor' : 'Estudiante')}</span>
          </div>
          {role === 'estudiante' && <Bell size={18} className="text-gray-300" />}
          <button onClick={onLogout} className="p-1.5 bg-white/10 rounded-full relative z-10 hover:bg-white/20 transition-colors">
            <LogOut size={18} className="text-gray-300" />
          </button>
        </>
      )}
    </div>
  );
}
