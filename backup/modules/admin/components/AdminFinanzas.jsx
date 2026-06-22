// @build: 2026-06-22 | id: FINANZAS-INDEPENDIENTE | desc: Módulo de finanzas como página independiente
import { useContext, useCallback, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../../context/AppContextValue';
import { Button } from '../../../components/UI';
import AppShell from '../../shared/components/AppShell';
import DashboardHeader from '../../shared/components/DashboardHeader';
import DashboardFooter from '../../shared/components/DashboardFooter';
import {
  BookOpen, Calendar, Activity, Wallet, Settings
} from 'lucide-react';

const DeudaItem = memo(({ item, moneda, onPagar }) => (
  <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center mb-2">
    <div><p className="font-bold text-sm">{item.nombre} {item.apellido || ''}</p><p className="text-orange-600 font-black">{moneda} {item.deuda}</p></div>
    <Button type="button" onClick={() => onPagar(item.id, item.tipo, item.deuda, item.nombre)} variant="outline" className="!w-auto !py-1.5 !text-xs">Pagar</Button>
  </div>
));

const AdminFinanzas = memo(() => {
  const { reservas, instructores, proveedores, motos, config, saveReserva, saveMovimiento, showToast, movimientos, user, logoutUser } = useContext(AppContext);
  const navigate = useNavigate();
  const res = reservas || [];
  const instrs = instructores || [];
  const provs = proveedores || [];
  const motList = motos || [];
  const movs = movimientos || [];

  const { gananciaNeta, deudasPorPagar, deudasInst, deudasProv } = useMemo(() => {
    const aproved = res.filter(r => r.estadoPago === 'Aprobado');
    const ingresos = aproved.reduce((acc, r) => acc + Number(r.pagoTotalMoneda || 0), 0);
    const deudas = aproved.reduce((acc, r) => acc + (!r.pagadoInstructor ? Number(r.pagoInstructor || 0) : 0) + (!r.pagadoProveedor ? Number(r.pagoProveedor || 0) : 0), 0);
    const neta = ingresos - aproved.reduce((acc, r) => acc + Number(r.pagoInstructor || 0) + Number(r.pagoProveedor || 0), 0);
    const dInst = instrs.map(i => ({ ...i, deuda: res.filter(r => r.estadoPago === 'Aprobado' && String(r.instructorId) === String(i.id) && !r.pagadoInstructor).reduce((acc) => acc + Number(config.pagoInstructor || 0), 0), tipo: 'instructor' })).filter(i => i.deuda > 0);
    const dProv = provs.map(p => ({ ...p, deuda: res.filter(r => r.estadoPago === 'Aprobado' && !r.pagadoProveedor && motList.find(m => String(m.id) === String(r.motoAsignadaId))?.proveedorId === String(p.id)).reduce((acc) => acc + Number(config.pagoProveedor || 0), 0), tipo: 'proveedor' })).filter(p => p.deuda > 0);
    return { gananciaNeta: neta, deudasPorPagar: deudas, deudasInst: dInst, deudasProv: dProv };
  }, [res, instrs, provs, motList, config]);

  const pagarStaff = useCallback(async (id, tipo, monto, nombre) => {
    for (let r of res) {
      if (r.estadoPago === 'Aprobado') {
        if (tipo === 'instructor' && String(r.instructorId) === String(id) && !r.pagadoInstructor) await saveReserva({ ...r, pagadoInstructor: true });
        if (tipo === 'proveedor' && motList.find(m => String(m.id) === String(r.motoAsignadaId))?.proveedorId === String(id) && !r.pagadoProveedor) await saveReserva({ ...r, pagadoProveedor: true });
      }
    }
    await saveMovimiento({ id: Date.now().toString(), tipo: 'egreso', monto, desc: `Comisión: ${nombre}`, fecha: new Date().toISOString().split('T')[0] });
    showToast('Pago registrado correctamente');
  }, [res, motList, saveReserva, saveMovimiento, showToast]);

  const pctDeudas = gananciaNeta > 0 ? Math.min(100, (deudasPorPagar / gananciaNeta) * 100) : 0;
  const ultimosMovimientos = useMemo(() => movs.slice().reverse().slice(0, 10), [movs]);

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
const header = <DashboardHeader title="Módulo Finanzas" onBack={() => navigate('/dashboard')} onLogout={handleLogout} notifications={notifications} />;  const footer = <DashboardFooter
    tabs={footerTabs}
    activeTab="finanzas"
    onTabChange={(id) => {
      const tab = footerTabs.find(t => t.id === id);
      if (tab?.action) tab.action();
    }}
  />;

  return (
    <AppShell header={header} footer={footer} bgColor="bg-gray-50">
      <div className="p-4 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 p-4 rounded-3xl border-2 border-green-100"><p className="text-green-600 text-[10px] font-black uppercase tracking-wide">Ganancia Neta</p><p className="text-2xl font-black text-green-900 mt-1">{config.monedaPagoStaff} {gananciaNeta}</p></div>
          <div className="bg-orange-50 p-4 rounded-3xl border-2 border-orange-100 relative">{deudasPorPagar > 0 && <span className="absolute top-3 right-3 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>}<p className="text-orange-600 text-[10px] font-black uppercase tracking-wide">Por Pagar</p><p className="text-2xl font-black text-orange-900 mt-1">{config.monedaPagoStaff} {deudasPorPagar}</p></div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100">
          <div className="flex justify-between text-xs font-bold mb-2"><span>Deudas vs Ganancia</span><span>{Math.round(pctDeudas)}%</span></div>
          <div className="w-full bg-gray-200 rounded-full h-2.5"><div className="bg-red-500 h-2.5 rounded-full transition-all" style={{ width: `${pctDeudas}%` }}></div></div>
        </div>

        <h3 className="font-bold text-gray-900 text-lg border-b pb-2 mt-6">Deudas a Personal</h3>
        {deudasInst.length === 0 && deudasProv.length === 0 && <p className="text-sm text-gray-500 text-center py-6">Todo el personal está al día.</p>}
        {deudasInst.map(i => <DeudaItem key={i.id} item={i} moneda={config.monedaPagoStaff} onPagar={(id, tipo, monto, nombre) => pagarStaff(id, tipo, monto, nombre)} />)}
        {deudasProv.map(p => <DeudaItem key={p.id} item={p} moneda={config.monedaPagoStaff} onPagar={(id, tipo, monto, nombre) => pagarStaff(id, tipo, monto, nombre)} />)}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h3 className="font-bold text-gray-900 text-sm mb-3">Últimos Movimientos</h3>
          {ultimosMovimientos.length === 0 ? <p className="text-xs text-gray-500 text-center py-4">Sin movimientos registrados.</p> :
            ultimosMovimientos.map(mov => (
              <div key={mov.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold ${mov.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'}`}>{mov.tipo === 'ingreso' ? '+' : '-'}{config.monedaPagoStaff} {mov.monto}</span>
                  <span className="text-xs text-gray-500">{mov.desc}</span>
                </div>
                <span className="text-[10px] text-gray-400">{mov.fecha}</span>
              </div>
            ))
          }
        </div>
      </div>
    </AppShell>
  );
});

export default AdminFinanzas;