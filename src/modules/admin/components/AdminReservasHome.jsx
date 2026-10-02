// @build: 2026-08-28.14-40-00 | id: BXX-BYY | backup: AdminReservasHome.jsx.backup-20260828-144000 | desc: Añade sección Hoy y En curso a la home de reservas + hook local
import { useContext, useMemo, memo, useCallback, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../../context/AppContextValue';
import AppShell from '../../shared/components/AppShell';
import DashboardHeader from '../../shared/components/DashboardHeader';
import DashboardFooter from '../../shared/components/DashboardFooter';
import {
  ChevronRight, BookOpen, Calendar, Activity, Wallet, Settings, Inbox, Clock, Package
} from 'lucide-react';
import {
  obtenerHoyVenezuela,
  obtenerMinutosActualesVenezuela,
  esReservaEnCurso
} from '../utils/reservasHelpers';
import { useAdminReservas } from '../hooks/useAdminReservas';

const TarjetaMini = memo(({ reserva, onClick, enCurso = false }) => {
  const estadoColor = {
    Pendiente: 'bg-orange-100 text-orange-700',
    Aprobado: 'bg-green-100 text-green-700',
    Rechazado: 'bg-red-100 text-red-700',
    Cancelado: 'bg-gray-200 text-gray-700',
  };
  const fechaStr = reserva.fecha || reserva.fecha1 || '';
  const horaStr = reserva.horaId || '';
  const horaCorta = horaStr.split(' - ')[0] || horaStr;
  return (
    <button onClick={onClick} className="flex-shrink-0 w-24 bg-white rounded-xl shadow-sm border border-gray-100 p-2 text-left hover:border-blue-300 transition-colors active:scale-[0.98]">
      <div className="flex items-center gap-1 flex-wrap mb-1">
        <span className={`text-[8px] font-black uppercase px-1 py-0.5 rounded ${estadoColor[reserva.estadoPago] || 'bg-gray-100'}`}>
          {reserva.estadoPago === 'Cancelado' ? 'CANC' : reserva.estadoPago.substring(0, 4)}
        </span>
        {enCurso && <span className="text-[8px] font-black uppercase px-1 py-0.5 rounded bg-green-500 text-white motion-safe:animate-pulse">EN PROGRESO</span>}
      </div>
      <p className="text-[11px] font-bold text-gray-900 mt-1 truncate">{reserva.nombre} {reserva.apellido?.charAt(0)}.</p>
      <p className="text-[9px] text-gray-500">{fechaStr.split('-').slice(1).join('/')}</p>
      <p className="text-[9px] text-gray-500">{horaCorta}</p>
    </button>
  );
});

const AdminReservasHome = () => {
  const { horarios, user, logoutUser } = useContext(AppContext);
    const { reservas, packs, cargando, error } = useAdminReservas();
  const navigate = useNavigate();
  const res = reservas || [];

  const [tick, setTick] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setTick(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const hoyStr = useMemo(() => obtenerHoyVenezuela(), [tick]);
  const minutosActuales = useMemo(() => obtenerMinutosActualesVenezuela(), [tick]);

  const pendientes = useMemo(() => res.filter(r => r.estadoPago === 'Pendiente').sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)), [res]);
  const hoy = new Date();
  const dentroDe7Dias = new Date(hoy);
  dentroDe7Dias.setDate(hoy.getDate() + 7);
  const proximas = useMemo(() => res.filter(r => {
    if (r.estadoPago !== 'Aprobado') return false;
    const fechaCurso = r.fecha || r.fecha1;
    if (!fechaCurso) return false;
    const f = new Date(fechaCurso + 'T12:00:00');
    return f >= hoy && f <= dentroDe7Dias;
  }).sort((a, b) => new Date(a.fecha || a.fecha1) - new Date(b.fecha || b.fecha1)), [res, hoy, dentroDe7Dias]);

  const reservasHoy = useMemo(() => {
    return res.filter(r => {
      if (r.estadoPago !== 'Aprobado' && r.estadoPago !== 'Pendiente') return false;
      return r.fecha === hoyStr || r.fecha2 === hoyStr;
    });
  }, [res, hoyStr]);

   const packsPendientes = useMemo(() => {
    return (packs || [])
      .filter(p => p.estadoPago === 'Pendiente')
      .sort((a, b) => (b.fechaCompra?.toMillis?.() || 0) - (a.fechaCompra?.toMillis?.() || 0));
  }, [packs]);

  const packsRechazados = useMemo(() => {
    return (packs || [])
      .filter(p => p.estadoPago === 'Rechazado')
      .sort((a, b) => (b.fechaCompra?.toMillis?.() || 0) - (a.fechaCompra?.toMillis?.() || 0));
  }, [packs]);

  const reservasRechazadas = useMemo(() => {
    return res
      .filter(r => r.estadoPago === 'Rechazado' && r.tipoReserva !== 'pack_sub')
      .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
  }, [res]);

  const sinReservas = pendientes.length === 0 && proximas.length === 0 && reservasHoy.length === 0 && packsPendientes.length === 0 && packsRechazados.length === 0 && reservasRechazadas.length === 0;
  const handleLogout = useCallback(async () => {
    if (logoutUser) await logoutUser();
    navigate('/');
  }, [logoutUser, navigate]);

  const footerTabs = [
    { id: 'inicio', icon: Activity, label: 'Inicio', action: () => navigate('/dashboard') },
    { id: 'reservas', icon: BookOpen, label: 'Reservas', action: () => navigate('/admin/reservas') },
    { id: 'ocupacion', icon: Calendar, label: 'Ocupac.', action: () => navigate('/admin/ocupacion') },
    { id: 'finanzas', icon: Wallet, label: 'Finanzas', action: () => navigate('/admin/finanzas') },
    { id: 'config', icon: Settings, label: 'Config', action: () => navigate('/admin/config') }
  ];

  const { notifications } = useContext(AppContext);
  const header = <DashboardHeader title="Reservas" onBack={() => navigate('/dashboard')} onLogout={handleLogout} notifications={notifications} />;
  const footer = <DashboardFooter
    tabs={footerTabs}
    activeTab="reservas"
    onTabChange={(id) => {
      const tab = footerTabs.find(t => t.id === id);
      if (tab?.action) tab.action();
    }}
  />;

  if (cargando) return <div className="p-4 text-center">Cargando reservas...</div>;
  if (error) return <div className="p-4 text-red-600">Error al cargar reservas: {error.message}</div>;

  return (
    <AppShell header={header} footer={footer} bgColor="bg-gray-50">
      <div className="p-4 space-y-4">
        {sinReservas ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Inbox size={36} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-black text-gray-900 mb-2">Sin reservas activas</h3>
            <p className="text-sm text-gray-500 mb-6">No hay reservas pendientes ni próximas para mostrar.</p>
            <button
              onClick={() => navigate('/admin/reservas/lista')}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors"
            >
              Ver todas las reservas
            </button>
          </div>
        ) : (
          <>
            {reservasHoy.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-1">
                    <Calendar size={14} className="text-yellow-600" /> Hoy ({reservasHoy.length})
                  </h3>
                  <button onClick={() => navigate('/admin/reservas/lista')} className="text-[10px] font-bold text-blue-600 flex items-center gap-1">
                    Ver todas <ChevronRight size={12} />
                  </button>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {reservasHoy.slice(0, 6).map(r => {
                    const enCurso = esReservaEnCurso(r, horarios, hoyStr, minutosActuales);
                    return <TarjetaMini key={r.id} reserva={r} enCurso={enCurso} onClick={() => navigate(`/admin/reserva/${r.id}`, { state: { from: '/admin/reservas' } })} />;
                  })}                </div>
              </div>
            )}

                     {packsPendientes.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-black text-purple-700 uppercase tracking-wider flex items-center gap-1">
                    <Package size={14} className="text-purple-600" /> Packs Pendientes ({packsPendientes.length})
                  </h3>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {packsPendientes.slice(0, 4).map(p => (
                    <button key={p.id} onClick={() => navigate(`/admin/pack/${p.id}`)} className="flex-shrink-0 w-32 bg-white rounded-xl shadow-sm border-2 border-purple-200 p-2 text-left hover:border-purple-400 active:scale-[0.98] transition-colors">                      <div className="flex items-center gap-1 flex-wrap mb-1">
                        <span className="text-[8px] font-black uppercase px-1 py-0.5 rounded bg-orange-100 text-orange-700">PEND</span>
                        <span className="text-[8px] font-black uppercase px-1 py-0.5 rounded bg-purple-100 text-purple-700">PACK</span>
                      </div>
                      <p className="text-[11px] font-bold text-gray-900 mt-1 truncate">{p.packNombre || 'Pack'}</p>
                      <p className="text-[9px] text-gray-600 truncate">{p.precioTotalCongelado ? `$${p.precioTotalCongelado}` : ''}</p>
                                          <p className="text-[9px] text-purple-600 font-bold mt-0.5">Toca para ver →</p>
                    </button>
                                  ))}
                </div>
              </div>
            )}

            {packsRechazados.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-black text-red-700 uppercase tracking-wider flex items-center gap-1">
                    <Package size={14} className="text-red-600" /> Packs Rechazados ({packsRechazados.length})
                  </h3>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {packsRechazados.slice(0, 4).map(p => (
                    <button key={p.id} onClick={() => navigate(`/admin/pack/${p.id}`)} className="flex-shrink-0 w-32 bg-white rounded-xl shadow-sm border-2 border-red-200 p-2 text-left hover:border-red-400 active:scale-[0.98] transition-colors">
                      <div className="flex items-center gap-1 flex-wrap mb-1">
                        <span className="text-[8px] font-black uppercase px-1 py-0.5 rounded bg-red-100 text-red-700">RECH</span>
                        <span className="text-[8px] font-black uppercase px-1 py-0.5 rounded bg-purple-100 text-purple-700">PACK</span>
                      </div>
                      <p className="text-[11px] font-bold text-gray-900 mt-1 truncate">{p.packNombre || 'Pack'}</p>
                      <p className="text-[9px] text-gray-600 truncate">{p.precioTotalCongelado ? `$${p.precioTotalCongelado}` : ''}</p>
                      <p className="text-[9px] text-red-600 font-bold mt-0.5">Esperando corrección</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {reservasRechazadas.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-black text-red-700 uppercase tracking-wider flex items-center gap-1">
                    <Inbox size={14} className="text-red-600" /> Reservas Rechazadas ({reservasRechazadas.length})
                  </h3>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {reservasRechazadas.slice(0, 4).map(r => (
                    <TarjetaMini key={r.id} reserva={r} onClick={() => navigate(`/admin/reserva/${r.id}`, { state: { from: '/admin/reservas' } })} />
                  ))}
                </div>
              </div>
            )}

            {pendientes.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider">Pendientes de Aprobación</h3>
                  <button onClick={() => navigate('/admin/reservas/lista?filtro=Pendiente')} className="text-[10px] font-bold text-blue-600 flex items-center gap-1">
                    Ver todas ({pendientes.length}) <ChevronRight size={12} />
                  </button>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {pendientes.slice(0, 4).map(r => (
<TarjetaMini key={r.id} reserva={r} onClick={() => navigate(`/admin/reserva/${r.id}`, { state: { from: '/admin/reservas' } })} />                  ))}
                  {pendientes.length > 4 && (
                    <button onClick={() => navigate('/admin/reservas/lista?filtro=Pendiente')} className="flex-shrink-0 w-24 bg-gray-50 rounded-xl border border-dashed border-gray-300 flex items-center justify-center text-[10px] font-bold text-gray-500 hover:bg-gray-100">
                      +{pendientes.length - 4}
                    </button>
                  )}
                </div>
              </div>
            )}

            {proximas.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider">Próximas (Aprobadas)</h3>
                  <button onClick={() => navigate('/admin/reservas/lista?filtro=Aprobado')} className="text-[10px] font-bold text-blue-600 flex items-center gap-1">
                    Ver todas ({proximas.length}) <ChevronRight size={12} />
                  </button>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                 {proximas.slice(0, 4).map(r => (
                    <TarjetaMini key={r.id} reserva={r} onClick={() => navigate(`/admin/reserva/${r.id}`, { state: { from: '/admin/reservas' } })} />
                  ))}
                  {proximas.length > 4 && (
                    <button onClick={() => navigate('/admin/reservas/lista?filtro=Aprobado')} className="flex-shrink-0 w-24 bg-gray-50 rounded-xl border border-dashed border-gray-300 flex items-center justify-center text-[10px] font-bold text-gray-500 hover:bg-gray-100">
                      +{proximas.length - 4}
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
};

export default AdminReservasHome;
