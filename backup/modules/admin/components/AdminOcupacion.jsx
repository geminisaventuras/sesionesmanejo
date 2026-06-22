// @build: 2026-06-22 | id: OCUPACION-INDEPENDIENTE | desc: Vista de ocupación diaria como página independiente
import { useContext, useState, useMemo, memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../../context/AppContextValue';
import { Input, Select } from '../../../components/UI';
import AppShell from '../../shared/components/AppShell';
import DashboardHeader from '../../shared/components/DashboardHeader';
import DashboardFooter from '../../shared/components/DashboardFooter';
import {
  Calendar, MapPin as MapPinIcon, BookOpen, Activity, Wallet, Settings
} from 'lucide-react';

const AdminOcupacion = memo(() => {
  const { reservas, horarios, sedes, user, logoutUser } = useContext(AppContext);
  const navigate = useNavigate();
  const [sedeSeleccionada, setSedeSeleccionada] = useState('todas');
  const [fechaInicio, setFechaInicio] = useState(() => new Date().toISOString().split('T')[0]);

  const dias = useMemo(() => {
    const diasArr = [];
    const cursor = new Date(fechaInicio + 'T12:00:00');
    for (let i = 0; i < 7; i++) {
      diasArr.push(cursor.toISOString().split('T')[0]);
      cursor.setDate(cursor.getDate() + 1);
    }
    return diasArr;
  }, [fechaInicio]);

  const bloquesActivos = useMemo(() => (horarios || []).filter(h => h.activo && !h.isLunch).sort((a, b) => a.id.localeCompare(b.id)), [horarios]);

  const getEstadoCelda = (fecha, bloqueId) => {
    const reserva = reservas.find(r => {
      if (r.estadoPago === 'Cancelado') return false;
      if (String(r.horaId) !== String(bloqueId)) return false;
      if (r.fecha === fecha || r.fecha2 === fecha) return true;
      return false;
    });
    if (!reserva) return 'libre';
    if (reserva.estadoPago === 'Pendiente') return 'pendiente';
    if (reserva.estadoPago === 'Aprobado') return 'ocupado';
    if (reserva.estadoPago === 'Rechazado') return 'rechazado';
    return 'libre';
  };

  const colorCelda = {
    libre: 'bg-green-100 text-green-700',
    ocupado: 'bg-red-100 text-red-700',
    pendiente: 'bg-yellow-100 text-yellow-700',
    rechazado: 'bg-orange-100 text-orange-700',
  };

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
const header = <DashboardHeader title="Ocupación Diaria" onBack={() => navigate('/dashboard')} onLogout={handleLogout} notifications={notifications} />;  const footer = <DashboardFooter
    tabs={footerTabs}
    activeTab="ocupacion"
    onTabChange={(id) => {
      const tab = footerTabs.find(t => t.id === id);
      if (tab?.action) tab.action();
    }}
  />;

  return (
    <AppShell header={header} footer={footer} bgColor="bg-gray-50">
      <div className="p-4 space-y-4">
        <div className="flex gap-3 flex-wrap">
          <Select label="Sede" options={[{ id: 'todas', nombre: 'Todas' }, ...(sedes || []).filter(s => s.activo)]} value={sedeSeleccionada} onChange={e => setSedeSeleccionada(e.target.value)} icon={MapPinIcon} />
          <Input label="Fecha inicio" type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} icon={Calendar} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left rounded-l-xl">Bloque</th>
                {dias.map(d => <th key={d} className="p-2 text-center">{d.split('-').slice(1).join('/')}</th>)}
              </tr>
            </thead>
            <tbody>
              {bloquesActivos.map(b => (
                <tr key={b.id} className="border-b border-gray-100">
                  <td className="p-2 font-bold">{b.label}</td>
                  {dias.map(d => {
                    const estado = getEstadoCelda(d, b.id);
                    return <td key={d} className="p-1 text-center"><span className={`px-2 py-1 rounded-full text-[10px] font-bold ${colorCelda[estado]}`}>{estado === 'libre' ? 'Libre' : estado === 'ocupado' ? 'Ocup.' : estado === 'pendiente' ? 'Pend.' : 'Rech.'}</span></td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex gap-4 text-xs">
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-100 rounded-full"></span> Libre</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-100 rounded-full"></span> Ocupado</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-yellow-100 rounded-full"></span> Pendiente</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-orange-100 rounded-full"></span> Rechazado</span>
        </div>
      </div>
    </AppShell>
  );
});

export default AdminOcupacion;