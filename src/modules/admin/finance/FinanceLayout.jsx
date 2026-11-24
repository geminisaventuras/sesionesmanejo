// @build: 2026-11-19 | id: FINANCE-LAYOUT | desc: Shell responsive con menú propio del módulo financiero
import { useCallback, useContext, useMemo } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AppContext } from '../../../context/AppContextValue';
import AppShell from '../../shared/components/AppShell';
import DashboardHeader from '../../shared/components/DashboardHeader';
import DashboardFooter from '../../shared/components/DashboardFooter';
import {
  Activity, ArrowDownLeft, BarChart3, BookOpen, Calendar, Landmark,
  LayoutDashboard, List, Receipt, Settings, Users, Wallet
} from 'lucide-react';

const NAV = [
  { path: '/admin/finanzas/resumen', label: 'Resumen', icon: LayoutDashboard },
  { path: '/admin/finanzas/ingresos', label: 'Ingresos', icon: ArrowDownLeft },
  { path: '/admin/finanzas/comisiones', label: 'Comisiones', icon: Users },
  { path: '/admin/finanzas/gastos', label: 'Gastos', icon: Receipt },
  { path: '/admin/finanzas/impuestos', label: 'Impuestos', icon: Landmark },
  { path: '/admin/finanzas/movimientos', label: 'Movimientos', icon: List },
  { path: '/admin/finanzas/reportes', label: 'Reportes', icon: BarChart3 },
  { path: '/admin/finanzas/configuracion', label: 'Configuración', icon: Settings }
];

const FinanceLayout = () => {
  const { logoutUser, notifications } = useContext(AppContext);
  const navigate = useNavigate();
  const location = useLocation();

  const footerTabs = useMemo(() => [
    { id: 'inicio', icon: Activity, label: 'Inicio', action: () => navigate('/dashboard') },
    { id: 'reservas', icon: BookOpen, label: 'Reservas', action: () => navigate('/admin/reservas') },
    { id: 'ocupacion', icon: Calendar, label: 'Ocupac.', action: () => navigate('/admin/ocupacion') },
    { id: 'finanzas', icon: Wallet, label: 'Finanzas', action: () => navigate('/admin/finanzas/resumen') },
    { id: 'config', icon: Settings, label: 'Config', action: () => navigate('/admin/config') }
  ], [navigate]);

  const handleLogout = useCallback(async () => {
    if (logoutUser) await logoutUser();
    navigate('/');
  }, [logoutUser, navigate]);

  const header = (
    <DashboardHeader
      title="Finanzas"
      onBack={() => navigate('/dashboard')}
      onLogout={handleLogout}
      notifications={notifications}
    />
  );

  const footer = (
    <DashboardFooter
      tabs={footerTabs}
      activeTab="finanzas"
      onTabChange={(id) => footerTabs.find((t) => t.id === id)?.action?.()}
    />
  );

  const itemClass = (activo) => (
    `flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold whitespace-nowrap transition-colors ${
      activo ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'text-slate-600 hover:bg-slate-100'
    }`
  );

  return (
    <AppShell header={header} footer={footer} bgColor="bg-slate-50" maxWidth="max-w-6xl">
      <div className="p-3 md:p-5">
        <div className="flex gap-2 overflow-x-auto pb-1 md:hidden">
          {NAV.map((item) => (
            <NavLink key={item.path} to={item.path} className={({ isActive }) => itemClass(isActive || location.pathname === item.path)}>
              <item.icon size={14} />
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="flex gap-5">
          <aside className="hidden md:block w-52 shrink-0">
            <div className="sticky top-3 space-y-1 rounded-2xl border border-slate-100 bg-white p-2 shadow-sm">
              {NAV.map((item) => (
                <NavLink key={item.path} to={item.path} className={({ isActive }) => itemClass(isActive)}>
                  <item.icon size={15} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          </aside>
          <main className="min-w-0 flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </AppShell>
  );
};

export default FinanceLayout;
