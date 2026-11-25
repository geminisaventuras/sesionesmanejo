// Campana de notificaciones: últimas novedades, lectura y acceso al centro.
import { useContext, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, Check, CheckCheck, X, CreditCard, Play, Pause, Award, Settings,
  CalendarCheck, GraduationCap, Wallet, Car, ShieldAlert, ChevronRight,
} from 'lucide-react';
import { AppContext } from '../../../context/AppContextValue';
import { categoriaDeTipo, tituloDeTipo } from '../utils/notificacionesHelpers';

const ICONOS_TIPO = {
  reserva_creada: CalendarCheck,
  pago_aprobado: CreditCard,
  pago_rechazado: CreditCard,
  sesion_iniciada: Play,
  sesion_pausada: Pause,
  sesion_finalizada: Award,
  instructor_asignado: GraduationCap,
  reserva_reprogramada: CalendarCheck,
  reserva_cancelada: CalendarCheck,
  emergencia_aula: ShieldAlert,
  pago_staff: Wallet,
  deuda_proveedor: Wallet,
  movilidad_solicitud: Car,
  movilidad_asignada: Car,
  sistema_prueba: Bell,
};

const COLORES_TIPO = {
  reservas: 'bg-blue-100 text-blue-700',
  pagos: 'bg-emerald-100 text-emerald-700',
  aula: 'bg-purple-100 text-purple-700',
  finanzas: 'bg-amber-100 text-amber-700',
  movilidad: 'bg-cyan-100 text-cyan-700',
  sistema: 'bg-slate-100 text-slate-600',
};

const formatearFecha = (timestamp) => {
  if (!timestamp) return '';
  const fecha = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  if (Number.isNaN(fecha.getTime())) return '';
  const hoy = new Date();
  const ayer = new Date(hoy);
  ayer.setDate(ayer.getDate() - 1);
  if (fecha.toDateString() === hoy.toDateString()) {
    return fecha.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
  }
  if (fecha.toDateString() === ayer.toDateString()) return 'Ayer';
  return fecha.toLocaleDateString('es-VE', { day: 'numeric', month: 'short' });
};

const limpiarTexto = (texto) => String(texto || '')
  .replace(/CI:\s*[A-Za-z0-9-]+/gi, '')
  .replace(/\bundefined\b/gi, '')
  .replace(/\s{2,}/g, ' ')
  .trim();

export default function NotificationDropdown({ notifications = [], onClose }) {
  const { markNotificationRead, markAllNotificationsRead, refreshNotificaciones } = useContext(AppContext);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) onClose();
    };
    const handleEscape = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  useEffect(() => {
    if (refreshNotificaciones) refreshNotificaciones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ordenadas = useMemo(() => {
    const vistos = new Set();
    return [...notifications]
      .filter((n) => {
        const id = String(n?.id || '');
        if (!id || vistos.has(id)) return false;
        vistos.add(id);
        return true;
      })
      .sort((a, b) => {
        if (a.leida !== b.leida) return a.leida ? 1 : -1;
        const fa = a.createdAt?.toMillis?.() || new Date(a.createdAt || 0).getTime() || 0;
        const fb = b.createdAt?.toMillis?.() || new Date(b.createdAt || 0).getTime() || 0;
        return fb - fa;
      });
  }, [notifications]);

  const noLeidas = ordenadas.filter((n) => !n.leida).length;
  const visibles = ordenadas.slice(0, 8);

  const abrir = async (notif) => {
    if (!notif.leida && markNotificationRead) await markNotificationRead(notif.id);
    onClose?.();
    navigate(notif.ruta || '/notificaciones');
  };

  const verTodas = () => {
    onClose?.();
    navigate('/notificaciones');
  };

  const ajustes = () => {
    onClose?.();
    navigate('/notificaciones/ajustes');
  };

  const marcarTodas = async () => {
    if (markAllNotificationsRead) await markAllNotificationsRead();
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 left-auto top-12 w-[min(92vw,22rem)] max-h-[min(75vh,30rem)] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-gray-100 z-50"
      role="dialog"
      aria-label="Notificaciones"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-gray-100 bg-white/95 p-3 backdrop-blur">
        <div className="flex min-w-0 items-center gap-2">
          <Bell size={17} className="text-gray-700" />
          <h3 className="truncate text-sm font-black text-gray-900">Notificaciones</h3>
          {noLeidas > 0 && (
            <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
              {noLeidas}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {noLeidas > 0 && (
            <button
              type="button"
              onClick={marcarTodas}
              className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100"
              title="Marcar todas como leídas"
              aria-label="Marcar todas como leídas"
            >
              <CheckCheck size={16} />
            </button>
          )}
          <button
            type="button"
            onClick={ajustes}
            className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100"
            title="Ajustes de alertas"
            aria-label="Ajustes de alertas"
          >
            <Settings size={16} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-gray-100 p-1.5 text-gray-500 hover:bg-gray-200"
            aria-label="Cerrar notificaciones"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {visibles.length === 0 ? (
        <div className="p-8 text-center">
          <Bell size={38} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-bold text-gray-700">Sin notificaciones</p>
          <p className="mt-1 text-[11px] text-gray-500">Aquí verás reservas, pagos, aula y finanzas.</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-50">
          {visibles.map((notif) => {
            const Icono = ICONOS_TIPO[notif.tipo] || Bell;
            const color = COLORES_TIPO[notif.categoria || categoriaDeTipo(notif.tipo)] || COLORES_TIPO.sistema;
            const titulo = limpiarTexto(notif.titulo) || tituloDeTipo(notif.tipo);
            // El historial legacy puede traer nombres en `mensaje`; el inbox
            // nuevo solo muestra el cuerpo genérico generado por el dispatcher.
            const cuerpo = limpiarTexto(notif.cuerpo)
              || (notif.mensaje ? 'Notificación histórica del sistema.' : '');
            return (
              <li key={notif.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => abrir(notif)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(notif); } }}
                  className={`flex w-full cursor-pointer items-start gap-2.5 p-3 text-left transition-colors hover:bg-gray-50 ${!notif.leida ? 'bg-blue-50/40' : ''}`}
                >
                  <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full ${color}`}>
                    <Icono size={16} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="min-w-0 flex-1 truncate text-xs font-bold text-gray-900">{titulo}</span>
                      {!notif.leida && <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" aria-label="No leída" />}
                    </span>
                    {cuerpo && <span className="mt-0.5 line-clamp-2 block text-[11px] leading-snug text-gray-600">{cuerpo}</span>}
                    <span className="mt-1 block text-[10px] text-gray-400">{formatearFecha(notif.createdAt)}</span>
                  </span>
                  {!notif.leida && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); markNotificationRead?.(notif.id); }}
                      className="mt-0.5 rounded-full p-1.5 text-gray-400 hover:bg-emerald-50 hover:text-emerald-600"
                      title="Marcar como leída"
                      aria-label="Marcar como leída"
                    >
                      <Check size={14} />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="sticky bottom-0 border-t border-gray-100 bg-white p-2">
        <button
          type="button"
          onClick={verTodas}
          className="flex w-full items-center justify-center gap-1 rounded-xl px-3 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50"
        >
          Ver todas {ordenadas.length > visibles.length ? `(${ordenadas.length})` : ''}
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
