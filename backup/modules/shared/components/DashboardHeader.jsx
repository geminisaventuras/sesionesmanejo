// @build: 2026-06-22 | id: HEADER-MEJORADO | desc: Header unificado con soporte para notificaciones
import { useState, useCallback } from 'react';
import { ChevronLeft, User, LogOut, Bell } from 'lucide-react';
import NotificationDropdown from './NotificationDropdown';

export default function DashboardHeader({ nombre, children, onBack, title, onLogout, role = 'instructor', notifications = [] }) {
  const [mostrarNotificaciones, setMostrarNotificaciones] = useState(false);

  const noLeidas = notifications.filter(n => !n.leida).length;

  const handleNotificationClick = useCallback(() => {
    setMostrarNotificaciones(prev => !prev);
  }, []);

  return (
    <div className="bg-gradient-to-r from-gray-900 via-slate-800 to-gray-900 text-white px-4 py-2.5 flex items-center gap-3 relative overflow-hidden shadow-lg rounded-b-2xl">
      <div className="absolute -top-4 -right-4 w-16 h-16 bg-blue-500/20 rounded-full blur-xl"></div>
      {children || (
        <>
          {onBack && title ? (
            <div className="flex items-center gap-3 w-full relative z-10">
              <button onClick={onBack} className="p-2 bg-white/10 rounded-full">
                <ChevronLeft size={20} className="text-white" />
              </button>
              <span className="text-sm font-bold text-white truncate">{title}</span>
              <div className="flex-1" />
              {/* Campana de notificaciones */}
              <div className="relative">
                <button onClick={handleNotificationClick} className="p-1.5 bg-white/10 rounded-full hover:bg-white/20 transition-colors relative">
                  <Bell size={18} className="text-gray-300" />
                  {noLeidas > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {noLeidas > 9 ? '9+' : noLeidas}
                    </span>
                  )}
                </button>
                {mostrarNotificaciones && (
                  <NotificationDropdown
                    notifications={notifications}
                    onClose={() => setMostrarNotificaciones(false)}
                  />
                )}
              </div>
              {onLogout && (
                <button onClick={onLogout} className="p-1.5 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                  <LogOut size={18} className="text-gray-300" />
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-1 relative z-10">
              <User size={18} className="text-gray-400" />
              <span className="text-sm font-bold text-gray-200">{nombre || (role === 'instructor' ? 'Instructor' : 'Estudiante')}</span>
            </div>
          )}
          {role === 'estudiante' && !title && <Bell size={18} className="text-gray-300" />}
          {(!title || !onBack) && onLogout && (
            <button onClick={onLogout} className="p-1.5 bg-white/10 rounded-full relative z-10 hover:bg-white/20 transition-colors">
              <LogOut size={18} className="text-gray-300" />
            </button>
          )}
        </>
      )}
    </div>
  );
}