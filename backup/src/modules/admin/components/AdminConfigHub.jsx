// @build: 2026-06-22 | id: CONFIG-HUB-SEPARADO | desc: Hub de configuración con navegación interna a componentes separados
import { useContext, useState, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../../context/AppContextValue';
import AppShell from '../../shared/components/AppShell';
import DashboardHeader from '../../shared/components/DashboardHeader';
import DashboardFooter from '../../shared/components/DashboardFooter';
import {
  BookOpen, MapPin, Clock, Bike, Users, Briefcase, Settings, ChevronRight,
  Activity, Wallet, Calendar
} from 'lucide-react';
import AdminCRUDPage from './AdminCRUDPage';

const AdminConfigHub = memo(() => {
  const navigate = useNavigate();
  const { user, logoutUser } = useContext(AppContext);
  const [vista, setVista] = useState('hub');

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
  const header = <DashboardHeader title="Configuración" onBack={() => navigate('/dashboard')} onLogout={handleLogout} notifications={notifications} />;
  const footer = <DashboardFooter
    tabs={footerTabs}
    activeTab="config"
    onTabChange={(id) => {
      const tab = footerTabs.find(t => t.id === id);
      if (tab?.action) tab.action();
    }}
  />;

  return (
    <AppShell header={header} footer={footer} bgColor="bg-gray-50">
      <div className="p-4">
        {vista === 'hub' ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setVista('cursos')} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center gap-2 hover:border-blue-300 transition-colors">
                <BookOpen size={28} className="text-blue-500" /><span className="font-bold text-sm text-gray-800">Cursos</span>
              </button>
              <button type="button" onClick={() => setVista('sedes')} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center gap-2 hover:border-blue-300 transition-colors">
                <MapPin size={28} className="text-blue-500" /><span className="font-bold text-sm text-gray-800">Sedes</span>
              </button>
              <button type="button" onClick={() => setVista('horarios')} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center gap-2 hover:border-blue-300 transition-colors">
                <Clock size={28} className="text-blue-500" /><span className="font-bold text-sm text-gray-800">Horarios</span>
              </button>
              <button type="button" onClick={() => setVista('motos')} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center gap-2 hover:border-blue-300 transition-colors">
                <Bike size={28} className="text-blue-500" /><span className="font-bold text-sm text-gray-800">Motos</span>
              </button>
              <button type="button" onClick={() => setVista('instructores')} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center gap-2 hover:border-blue-300 transition-colors">
                <Users size={28} className="text-blue-500" /><span className="font-bold text-sm text-gray-800">Instructores</span>
              </button>
              <button type="button" onClick={() => setVista('proveedores')} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center gap-2 hover:border-blue-300 transition-colors">
                <Briefcase size={28} className="text-blue-500" /><span className="font-bold text-sm text-gray-800">Proveedores</span>
              </button>
            </div>
            <button type="button" onClick={() => navigate('/admin/config/ajustes')} className="w-full bg-gray-900 text-white p-4 rounded-2xl shadow-lg flex items-center justify-between hover:bg-black transition-colors">
              <div className="flex items-center gap-3"><Settings size={24} className="text-gray-300" /><span className="font-bold text-lg">Ajustes Generales</span></div>
              <ChevronRight size={20} className="text-gray-400" />
            </button>
          </div>
        ) : (
          <AdminCRUDPage vista={vista} onBack={() => setVista('hub')} />
        )}
      </div>
    </AppShell>
  );
});

export default AdminConfigHub;