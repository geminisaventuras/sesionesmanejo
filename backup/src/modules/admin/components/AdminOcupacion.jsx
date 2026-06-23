// @build: 2026-06-22 | id: OCUPACION-ICONOS-FIX | desc: Filtros con iconos correctamente alineados, sin solapamiento
import { useContext, useState, useMemo, memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../../context/AppContextValue';
import AppShell from '../../shared/components/AppShell';
import DashboardHeader from '../../shared/components/DashboardHeader';
import DashboardFooter from '../../shared/components/DashboardFooter';
import {
  Calendar, MapPin, BookOpen, Activity, Wallet, Settings
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
    libre: 'bg-green-400',
    ocupado: 'bg-red-400',
    pendiente: 'bg-yellow-400',
    rechazado: 'bg-orange-400',
  };

  const labelCelda = {
    libre: 'Libre',
    ocupado: 'Ocupado',
    pendiente: 'Pendiente',
    rechazado: 'Rechazado',
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
  const header = <DashboardHeader title="Ocupación Diaria" onBack={() => navigate('/dashboard')} onLogout={handleLogout} notifications={notifications} />;
  const footer = <DashboardFooter
    tabs={footerTabs}
    activeTab="ocupacion"
    onTabChange={(id) => {
      const tab = footerTabs.find(t => t.id === id);
      if (tab?.action) tab.action();
    }}
  />;

  return (
    <AppShell header={header} footer={footer} bgColor="bg-gray-50">
      <div className="p-4 space-y-5 h-full flex flex-col">
        {/* Filtros con iconos alineados correctamente */}
        <div className="flex gap-3 items-end shrink-0">
          {/* Selector de sede */}
          <div className="flex-1">
            <label className="block text-xs font-bold text-gray-600 mb-1 ml-1">Sede</label>
            <div className="relative">
              <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <select
                value={sedeSeleccionada}
                onChange={e => setSedeSeleccionada(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-blue-500 appearance-none"
              >
                <option value="todas">Todas</option>
                {(sedes || []).filter(s => s.activo).map(s => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Selector de fecha */}
          <div className="flex-1">
            <label className="block text-xs font-bold text-gray-600 mb-1 ml-1">Fecha inicio</label>
            <div className="relative">
              <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="date"
                value={fechaInicio}
                onChange={e => setFechaInicio(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Leyenda */}
        <div className="flex gap-4 text-[10px] font-bold shrink-0 flex-wrap">
          {Object.entries(colorCelda).map(([estado, color]) => (
            <span key={estado} className="flex items-center gap-1.5">
              <span className={`w-3.5 h-3.5 ${color} rounded-full`}></span>
              {labelCelda[estado]}
            </span>
          ))}
        </div>

        {/* Tabla de ocupación */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <table className="w-full text-[9px] table-fixed border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-1 text-left w-12">Bloque</th>
                {dias.map(d => (
                  <th key={d} className="p-1 text-center">
                    {d.split('-').slice(1).join('/')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bloquesActivos.map(b => (
                <tr key={b.id} className="border-b border-gray-100">
                  <td className="p-1 font-bold truncate" title={b.label}>
                    {b.label.split(' - ')[0]}
                  </td>
                  {dias.map(d => {
                    const estado = getEstadoCelda(d, b.id);
                    return (
                      <td key={d} className="p-1 text-center">
                        <span 
                          className={`inline-block w-4 h-4 ${colorCelda[estado]} rounded-full`}
                          title={labelCelda[estado]}
                        ></span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
});

export default AdminOcupacion;