// @build: 2026-06-22 | id: NOTIFICACIONES | desc: Dropdown de notificaciones para el header
import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X } from 'lucide-react';

const NotificationDropdown = memo(({ notifications = [], onClose }) => {
  const navigate = useNavigate();

  const noLeidas = notifications.filter(n => !n.leida);
  const ultimas = notifications.slice(0, 10);

  return (
    <div className="absolute top-12 right-4 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 max-h-96 overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h3 className="font-black text-gray-900 text-sm">Notificaciones</h3>
        <button onClick={onClose} className="p-1 bg-gray-100 rounded-full">
          <X size={16} className="text-gray-500" />
        </button>
      </div>
      {ultimas.length === 0 ? (
        <p className="text-xs text-gray-500 text-center py-8">No hay notificaciones.</p>
      ) : (
        ultimas.map(n => (
          <button
            key={n.id}
            onClick={() => {
              if (n.reservaId) {
                navigate(`/admin/reserva/${n.reservaId}`);
              }
              onClose();
            }}
            className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${!n.leida ? 'bg-blue-50/50' : ''}`}
          >
            <div className="flex items-start gap-2">
              <Bell size={14} className={`mt-0.5 flex-shrink-0 ${!n.leida ? 'text-blue-600' : 'text-gray-400'}`} />
              <div>
                <p className={`text-xs font-medium ${!n.leida ? 'text-gray-900' : 'text-gray-500'}`}>{n.mensaje}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {n.fecha?.toDate ? new Date(n.fecha.toDate()).toLocaleString('es-VE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                </p>
              </div>
            </div>
          </button>
        ))
      )}
    </div>
  );
});

export default NotificationDropdown;