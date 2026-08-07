// @build: 2026-06-21.FASE5 | id: NOTIF-DROPDOWN | desc: Dropdown de notificaciones con agrupación por fecha y marcado como leída
import { useEffect, useRef, useContext } from 'react';
import { Bell, Check, X, Mail, CreditCard, Play, Pause, Award } from 'lucide-react';
import { AppContext } from '../../../context/AppContextValue';

const ICONOS_TIPO = {
  nueva_reserva: Bell,
  pago_aprobado: CreditCard,
  pago_rechazado: CreditCard,
  sesion_iniciada: Play,
  sesion_pausada: Pause,
  sesion_finalizada: Award,
};

const COLORES_TIPO = {
  nueva_reserva: 'bg-blue-100 text-blue-600',
  pago_aprobado: 'bg-green-100 text-green-600',
  pago_rechazado: 'bg-red-100 text-red-600',
  sesion_iniciada: 'bg-purple-100 text-purple-600',
  sesion_pausada: 'bg-orange-100 text-orange-600',
  sesion_finalizada: 'bg-teal-100 text-teal-600',
};

const formatearFecha = (timestamp) => {
  if (!timestamp) return '';
  const fecha = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const hoy = new Date();
  const ayer = new Date(hoy);
  ayer.setDate(ayer.getDate() - 1);

  if (fecha.toDateString() === hoy.toDateString()) return 'Hoy';
  if (fecha.toDateString() === ayer.toDateString()) return 'Ayer';
  return fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
};

export default function NotificationDropdown({ notifications = [], onClose }) {
  const { markNotificationRead } = useContext(AppContext);
  const dropdownRef = useRef(null);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Ordenar: no leídas primero, luego por fecha
  const ordenadas = [...notifications].sort((a, b) => {
    if (a.leida !== b.leida) return a.leida ? 1 : -1;
    const fechaA = a.createdAt?.toMillis?.() || 0;
    const fechaB = b.createdAt?.toMillis?.() || 0;
    return fechaB - fechaA;
  });

  const noLeidas = ordenadas.filter(n => !n.leida).length;

  const handleMarcarLeida = async (id) => {
    if (markNotificationRead) {
      await markNotificationRead(id);
    }
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 left-auto top-12 w-80 max-h-96 overflow-y-auto bg-white rounded-2xl shadow-2xl border border-gray-100 z-50"
    >
      {/* Cabecera */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Bell size={18} className="text-gray-700" />
          <h3 className="font-black text-gray-900 text-sm">Notificaciones</h3>
          {noLeidas > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              {noLeidas} nueva{noLeidas !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <button onClick={onClose} className="p-1.5 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
          <X size={16} className="text-gray-500" />
        </button>
      </div>

      {/* Lista de notificaciones */}
      {ordenadas.length === 0 ? (
        <div className="p-8 text-center">
          <Bell size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No tienes notificaciones</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {ordenadas.map((notif) => {
            const Icono = ICONOS_TIPO[notif.tipo] || Bell;
            const colorIcono = COLORES_TIPO[notif.tipo] || 'bg-gray-100 text-gray-600';
            return (
              <div
                key={notif.id}
                className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer flex items-start gap-3 ${
                  !notif.leida ? 'bg-blue-50/50' : ''
                }`}
                onClick={() => !notif.leida && handleMarcarLeida(notif.id)}
              >
                {/* Icono */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${colorIcono}`}>
                  <Icono size={18} />
                </div>
                {/* Contenido */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-900 leading-relaxed">{notif.mensaje}</p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {formatearFecha(notif.createdAt)}
                  </p>
                </div>
                {/* Indicador de no leída */}
                {!notif.leida && (
                  <div className="w-2.5 h-2.5 bg-blue-500 rounded-full flex-shrink-0 mt-1.5"></div>
                )}
                {/* Botón marcar leída */}
                {!notif.leida && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarcarLeida(notif.id);
                    }}
                    className="p-1.5 bg-gray-100 rounded-full hover:bg-green-100 hover:text-green-600 transition-colors flex-shrink-0"
                    title="Marcar como leída"
                  >
                    <Check size={14} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}