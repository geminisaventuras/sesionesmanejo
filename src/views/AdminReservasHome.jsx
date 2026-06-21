// @build: 2026-06-22 | id: RESERVAS-HOME | desc: Página principal de reservas con filas compactas y navegación corregida
import { useContext, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContextValue';
import AppShell from '../modules/shared/components/AppShell';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const TarjetaMini = memo(({ reserva, onClick }) => {
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
    <button
      onClick={onClick}
      className="flex-shrink-0 w-20 bg-white rounded-xl shadow-sm border border-gray-100 p-2 text-left hover:border-blue-300 transition-colors active:scale-[0.98]"
    >
      <span className={`text-[8px] font-black uppercase px-1 py-0.5 rounded ${estadoColor[reserva.estadoPago] || 'bg-gray-100'}`}>
        {reserva.estadoPago === 'Cancelado' ? 'CANC' : reserva.estadoPago.substring(0, 4)}
      </span>
      <p className="text-[11px] font-bold text-gray-900 mt-1 truncate">{reserva.nombre} {reserva.apellido?.charAt(0)}.</p>
      <p className="text-[9px] text-gray-500">{fechaStr.split('-').slice(1).join('/')}</p>
      <p className="text-[9px] text-gray-500">{horaCorta}</p>
    </button>
  );
});

const AdminReservasHome = () => {
  const { reservas } = useContext(AppContext);
  const navigate = useNavigate();
  const res = reservas || [];

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

  return (
    <AppShell bgColor="bg-gray-50">
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/dashboard?tab=reservas')} className="p-2 bg-gray-200 rounded-full">
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-lg font-black text-gray-900 uppercase">Reservas</h2>
        </div>

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
                <TarjetaMini key={r.id} reserva={r} onClick={() => navigate(`/admin/reserva/${r.id}`)} />
              ))}
              {pendientes.length > 4 && (
                <button onClick={() => navigate('/admin/reservas/lista?filtro=Pendiente')} className="flex-shrink-0 w-20 bg-gray-50 rounded-xl border border-dashed border-gray-300 flex items-center justify-center text-[10px] font-bold text-gray-500 hover:bg-gray-100">
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
                <TarjetaMini key={r.id} reserva={r} onClick={() => navigate(`/admin/reserva/${r.id}`)} />
              ))}
              {proximas.length > 4 && (
                <button onClick={() => navigate('/admin/reservas/lista?filtro=Aprobado')} className="flex-shrink-0 w-20 bg-gray-50 rounded-xl border border-dashed border-gray-300 flex items-center justify-center text-[10px] font-bold text-gray-500 hover:bg-gray-100">
                  +{proximas.length - 4}
                </button>
              )}
            </div>
          </div>
        )}

        {pendientes.length === 0 && proximas.length === 0 && (
          <p className="text-center text-gray-500 py-6 text-xs">No hay reservas activas.</p>
        )}
      </div>
    </AppShell>
  );
};

export default AdminReservasHome;