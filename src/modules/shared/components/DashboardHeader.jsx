// @build: 2026-06-22 | id: HEADER-FINAL-FIX | desc: Header con campana y logout 100% funcionales, obtiene rol del contexto
import { useState, useCallback, useContext } from 'react';
import { ChevronLeft, User, LogOut, Bell } from 'lucide-react';
import NotificationDropdown from './NotificationDropdown';
import { AppContext } from '../../../context/AppContextValue';

const ROLE_LABELS = {
  admin: 'Administrador',
  instructor: 'Instructor',
  proveedor: 'Proveedor',
  estudiante: 'Estudiante',
};

export default function DashboardHeader({ nombre, children, onBack, title, onLogout, notifications = [] }) {
  const { user } = useContext(AppContext);
  const [mostrarNotificaciones, setMostrarNotificaciones] = useState(false);

  const noLeidas = notifications.filter(n => !n.leida).length;
  const rol = user?.role || 'estudiante';
  const nombreMostrar = nombre || user?.data?.nombre || ROLE_LABELS[rol] || 'Usuario';

  const handleNotificationClick = useCallback(() => {
    setMostrarNotificaciones(prev => !prev);
  }, []);

  const handleLogoutClick = useCallback(() => {
    console.log('Logout clickeado'); // Depuración
    if (onLogout) onLogout();
  }, [onLogout]);

  return (
    <div className="bg-gradient-to-r from-gray-900 via-slate-800 to-gray-900 text-white px-4 py-2.5 flex items-center gap-3 relative shadow-lg rounded-b-2xl">
      <div className="absolute -top-4 -right-4 w-16 h-16 bg-blue-500/20 rounded-full blur-xl"></div>

      {children ? (
        children
      ) : (
        <>
          {/* Bloque izquierdo */}
          {onBack && title ? (
            <div className="flex items-center gap-3 flex-1 relative z-10">
              <button onClick={onBack} className="p-2 bg-white/10 rounded-full">
                <ChevronLeft size={20} className="text-white" />
              </button>
              <span className="text-sm font-bold text-white truncate">{title}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-1 relative z-10">
              {title ? (
                <span className="text-sm font-bold text-white truncate">{title}</span>
              ) : (
                <>
                  <User size={18} className="text-gray-400" />
                  <span className="text-sm font-bold text-gray-200">{nombreMostrar}</span>
                </>
              )}
            </div>
          )}

          {/* Bloque derecho (campana + logout) */}
          <div className="flex items-center gap-2 relative z-10">
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
            {onLogout && (
              <button onClick={handleLogoutClick} className="p-1.5 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                <LogOut size={18} className="text-gray-300" />
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}