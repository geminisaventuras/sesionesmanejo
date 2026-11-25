// Centro de notificaciones por rol (inbox). No es el centro de alertas
// operativas del admin: ese sigue siendo /admin/alertas.
import { useCallback, useContext, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, CheckCheck, ChevronRight, CreditCard, Play, Pause, Award, Settings,
  CalendarCheck, GraduationCap, Wallet, Car, ShieldAlert, CheckCircle2, Filter,
} from 'lucide-react';
import { AppContext } from '../../../context/AppContextValue';
import AppShell from '../components/AppShell';
import DashboardHeader from '../components/DashboardHeader';
import {
  CATEGORIAS,
  categoriaDeTipo,
  msDeFecha,
  rutaPermitida,
  tituloDeTipo,
} from '../utils/notificacionesHelpers';

const ICONOS = {
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

const COLORES = {
  reservas: 'bg-blue-100 text-blue-700',
  pagos: 'bg-emerald-100 text-emerald-700',
  aula: 'bg-purple-100 text-purple-700',
  finanzas: 'bg-amber-100 text-amber-700',
  movilidad: 'bg-cyan-100 text-cyan-700',
  sistema: 'bg-slate-100 text-slate-600',
};

const INICIO_POR_ROL = {
  admin: '/dashboard',
  instructor: '/instructor',
  proveedor: '/proveedor',
  estudiante: '/portal-reservas',
  movilidad: '/movilidad',
};

const formatear = (valor) => {
  const ms = msDeFecha(valor);
  if (!ms) return '';
  try {
    return new Date(ms).toLocaleString('es-VE', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return new Date(ms).toLocaleDateString('es-VE');
  }
};

const limpiar = (texto) => String(texto || '')
  .replace(/CI:\s*[A-Za-z0-9-]+/gi, '')
  .replace(/\bundefined\b/gi, '')
  .replace(/\s{2,}/g, ' ')
  .trim();

export default function NotificacionesView() {
  const {
    notifications = [], user, logoutUser, markNotificationRead,
    markAllNotificationsRead, noLeidas = 0, pushEstado,
  } = useContext(AppContext);
  const navigate = useNavigate();
  const [filtro, setFiltro] = useState('todas');
  const [categoria, setCategoria] = useState('todas');
  const [marcando, setMarcando] = useState(false);

  const inicio = INICIO_POR_ROL[user?.role] || '/';

  const ordenadas = useMemo(() => {
    const vistos = new Set();
    return [...notifications]
      .filter((n) => {
        const id = String(n?.id || '');
        if (!id || vistos.has(id)) return false;
        vistos.add(id);
        return true;
      })
      .sort((a, b) => msDeFecha(b.createdAt) - msDeFecha(a.createdAt));
  }, [notifications]);

  const visibles = useMemo(() => ordenadas.filter((n) => {
    if (filtro === 'no-leidas' && n.leida) return false;
    if (categoria !== 'todas' && (n.categoria || categoriaDeTipo(n.tipo)) !== categoria) return false;
    return true;
  }), [ordenadas, filtro, categoria]);

  const handleLogout = useCallback(async () => {
    if (logoutUser) await logoutUser();
    navigate('/');
  }, [logoutUser, navigate]);

  const abrir = async (notif) => {
    if (!notif.leida && markNotificationRead) await markNotificationRead(notif.id);
    const ruta = rutaPermitida(notif.ruta) ? notif.ruta : '/notificaciones';
    if (ruta !== '/notificaciones') navigate(ruta);
  };

  const marcarTodas = async () => {
    setMarcando(true);
    const res = await markAllNotificationsRead?.();
    setMarcando(false);
    if (res?.ok) {
      // El cambio ya se refleja en el estado local.
    }
  };

  const header = (
    <DashboardHeader
      title="Notificaciones"
      onBack={() => navigate(inicio)}
      onLogout={handleLogout}
      notifications={notifications}
      showNotifications={false}
    />
  );

  return (
    <AppShell header={header} bgColor="bg-gray-50" maxWidth="max-w-md lg:max-w-3xl">
      <div className="min-w-0 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Centro de novedades</p>
            <h1 className="mt-0.5 text-xl font-black text-gray-900">
              {noLeidas > 0 ? `${noLeidas} sin leer` : 'Todo al día'}
            </h1>
          </div>
          <div className="flex items-center gap-1.5">
            {noLeidas > 0 && (
              <button
                type="button"
                onClick={marcarTodas}
                disabled={marcando}
                className="inline-flex min-h-9 items-center gap-1 rounded-xl border border-gray-200 bg-white px-2.5 text-[11px] font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                <CheckCheck size={14} />
                {marcando ? 'Marcando…' : 'Todas leídas'}
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate('/notificaciones/ajustes')}
              className="inline-flex min-h-9 items-center gap-1 rounded-xl border border-gray-200 bg-white px-2.5 text-[11px] font-bold text-gray-700 hover:bg-gray-50"
            >
              <Settings size={14} />
              Ajustes
            </button>
          </div>
        </div>

        {pushEstado !== 'activo' && (
          <button
            type="button"
            onClick={() => navigate('/notificaciones/ajustes')}
            className="mt-3 flex w-full items-center gap-2 rounded-2xl border border-indigo-100 bg-indigo-50 p-3 text-left"
          >
            <Bell size={18} className="shrink-0 text-indigo-600" />
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-bold text-indigo-900">Activa las notificaciones en este dispositivo</span>
              <span className="block text-[11px] text-indigo-700">Recibe avisos aunque la app esté cerrada.</span>
            </span>
            <ChevronRight size={16} className="shrink-0 text-indigo-500" />
          </button>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Filtros de notificaciones">
          {[
            { id: 'todas', label: 'Todas' },
            { id: 'no-leidas', label: `No leídas${noLeidas ? ` (${noLeidas})` : ''}` },
          ].map((op) => (
            <button
              key={op.id}
              type="button"
              role="tab"
              aria-selected={filtro === op.id}
              onClick={() => setFiltro(op.id)}
              className={`min-h-8 rounded-full px-3 text-[11px] font-bold ${filtro === op.id ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
            >
              {op.label}
            </button>
          ))}
        </div>

        <div className="mt-2 flex items-start gap-1.5 overflow-x-auto pb-1">
          <Filter size={14} className="mt-1.5 shrink-0 text-gray-400" aria-hidden="true" />
          {[{ id: 'todas', label: 'Todas' }, ...Object.entries(CATEGORIAS).map(([id, label]) => ({ id, label }))].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoria(cat.id)}
              className={`min-h-8 shrink-0 rounded-full px-2.5 text-[10px] font-bold ${categoria === cat.id ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {visibles.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-gray-100 bg-white px-4 py-10 text-center">
            <CheckCircle2 size={36} className="mx-auto text-emerald-500" />
            <p className="mt-2 text-sm font-bold text-gray-900">No hay notificaciones en este filtro</p>
            <p className="mt-1 text-[11px] text-gray-500">Cuando ocurra una novedad aparecerá aquí y en la campana.</p>
          </div>
        ) : (
          <ul className="mt-4 space-y-2" aria-live="polite">
            {visibles.map((notif) => {
              const Icono = ICONOS[notif.tipo] || Bell;
              const categoriaNotif = notif.categoria || categoriaDeTipo(notif.tipo);
              const color = COLORES[categoriaNotif] || COLORES.sistema;
              const titulo = limpiar(notif.titulo) || tituloDeTipo(notif.tipo);
              // El legado puede contener nombres en `mensaje`: no se pinta.
              const cuerpo = limpiar(notif.cuerpo)
                || (notif.mensaje ? 'Notificación histórica del sistema.' : '');
              const tieneRuta = rutaPermitida(notif.ruta) && notif.ruta !== '/notificaciones';
              return (
                <li key={notif.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => abrir(notif)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(notif); } }}
                    className={`flex w-full cursor-pointer items-start gap-3 rounded-2xl border p-3 text-left shadow-sm transition-colors hover:bg-gray-50 ${notif.leida ? 'border-gray-100 bg-white' : 'border-blue-100 bg-blue-50/40'}`}
                  >
                    <span className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full ${color}`}>
                      <Icono size={17} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 break-words text-sm font-bold text-gray-900">{titulo}</span>
                        {!notif.leida && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500" aria-label="No leída" />}
                      </span>
                      {cuerpo && <span className="mt-0.5 block break-words text-xs leading-relaxed text-gray-600">{cuerpo}</span>}
                      <span className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-gray-400">
                        <span>{formatear(notif.createdAt)}</span>
                        <span className="rounded-full bg-gray-100 px-1.5 py-0.5 font-bold uppercase tracking-wide text-gray-500">
                          {CATEGORIAS[categoriaNotif] || 'Sistema'}
                        </span>
                        {notif.rolDestino && <span>· {notif.rolDestino}</span>}
                      </span>
                    </span>
                    {tieneRuta && <ChevronRight size={16} className="mt-2 shrink-0 text-gray-400" aria-hidden="true" />}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
