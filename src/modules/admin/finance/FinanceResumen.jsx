// @build: 2026-11-19 | id: FINANCE-RESUMEN | desc: Dashboard ejecutivo del módulo financiero
import { useContext, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDownLeft, ArrowUpRight, BarChart3, Clock, Landmark, PlusCircle, Receipt, Users, Wallet
} from 'lucide-react';
import { AppContext } from '../../../context/AppContextValue';
import { formatearMonto } from '../../shared/utils/currency';
import { Button } from '../../../components/UI';
import { FinEmpty, FinKpi, FinSection, FinanceMovementRow } from './components/FinanceUI';
import FinanceMovementModal from './components/FinanceMovementModal';
import { calcularDeudas, calcularResumen, getFinanzasConfig, ordenarMovimientos } from './financeUtils';

const FinanceResumen = () => {
  const { reservas, instructores, proveedores, config, movimientos, saveMovimiento } = useContext(AppContext);
  const navigate = useNavigate();
  const [modal, setModal] = useState(null);
  const moneda = config?.monedaPagoStaff || 'USD';
  const finanzas = getFinanzasConfig(config);

  const resumen = useMemo(() => calcularResumen({ reservas, movimientos, config }), [reservas, movimientos, config]);
  const deudas = useMemo(
    () => calcularDeudas({ reservas, instructores, proveedores, config }),
    [reservas, instructores, proveedores, config]
  );
  const recientes = useMemo(() => ordenarMovimientos(movimientos).slice(0, 6), [movimientos]);
  const pendientes = useMemo(() => (reservas || []).filter((r) => r.estadoPago === 'Pendiente').length, [reservas]);

  const dias = useMemo(() => {
    const lista = [];
    for (let i = 6; i >= 0; i -= 1) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - i);
      const key = fecha.toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });
      const movs = ordenarMovimientos(movimientos).filter((m) => m.fecha === key);
      lista.push({
        label: fecha.toLocaleDateString('es-VE', { weekday: 'short' }).replace('.', ''),
        ingresos: movs.filter((m) => m.tipo === 'ingreso').reduce((a, m) => a + m.monto, 0),
        egresos: movs.filter((m) => m.tipo === 'egreso').reduce((a, m) => a + m.monto, 0)
      });
    }
    return lista;
  }, [movimientos]);

  const maxDia = Math.max(1, ...dias.flatMap((d) => [d.ingresos, d.egresos]));

  return (
    <div className="space-y-4 tab-transition">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <FinKpi label="Ingresos del mes" value={formatearMonto(resumen.ingresosCaja, moneda)} icon={ArrowDownLeft} tone="emerald" hint="Caja registrada" />
        <FinKpi label="Egresos del mes" value={formatearMonto(resumen.egresosCaja, moneda)} icon={ArrowUpRight} tone="rose" hint="Pagos y gastos" />
        <FinKpi label="Utilidad de caja" value={formatearMonto(resumen.utilidadCaja, moneda)} icon={BarChart3} tone="blue" hint={`${Math.round(resumen.margen)}% margen`} />
        <FinKpi label="Por pagar personal" value={formatearMonto(deudas.total, moneda)} icon={Clock} tone="amber" hint={`${deudas.deudasInst.length + deudas.deudasProv.length} personas`} />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <FinSection title="Flujo de los últimos 7 días" icon={BarChart3} className="md:col-span-2">
          <div className="flex items-end gap-3 h-32 pt-2">
            {dias.map((dia, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                <div className="flex items-end gap-0.5 h-24 w-full justify-center">
                  <div className="w-2.5 bg-emerald-500 rounded-t" style={{ height: `${Math.max(3, (dia.ingresos / maxDia) * 92)}px` }} title={`Ingresos: ${formatearMonto(dia.ingresos, moneda)}`} />
                  <div className="w-2.5 bg-rose-400 rounded-t" style={{ height: `${Math.max(3, (dia.egresos / maxDia) * 92)}px` }} title={`Egresos: ${formatearMonto(dia.egresos, moneda)}`} />
                </div>
                <span className="text-[9px] text-slate-400 capitalize">{dia.label}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-3 text-[10px] text-slate-500 mt-2">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Ingresos</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400" /> Egresos</span>
          </div>
        </FinSection>

        <FinSection title="Estado fiscal" icon={Landmark}>
          <div className={`rounded-xl p-3 ${finanzas.iva.cobrarEnCheckout ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'}`}>
            <p className="text-[10px] font-black uppercase tracking-wide text-amber-700">IVA</p>
            <p className="text-lg font-black text-slate-900">{finanzas.iva.cobrarEnCheckout ? `${finanzas.iva.tasa}% activo` : 'Modo preparación'}</p>
            <p className="text-[11px] text-slate-500 mt-1">
              {finanzas.iva.cobrarEnCheckout ? 'Se suma al precio de nuevas ventas.' : 'No se cobra al estudiante. Requiere RIF y activación.'}
            </p>
          </div>
          <button type="button" onClick={() => navigate('/admin/finanzas/configuracion')} className="mt-3 text-xs font-bold text-blue-600 hover:underline">
            Configurar datos fiscales →
          </button>
        </FinSection>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <FinSection title="Accesos rápidos" icon={PlusCircle}>
          <div className="space-y-2">
            <Button variant="success" className="!py-2.5 !text-xs" onClick={() => setModal({ tipo: 'ingreso', categoria: 'ingreso_extra' })}>
              <PlusCircle size={15} /> Ingreso extra
            </Button>
            <Button variant="danger" className="!py-2.5 !text-xs" onClick={() => setModal({ tipo: 'egreso', categoria: 'gasto_operativo' })}>
              <Receipt size={15} /> Registrar gasto
            </Button>
            <Button variant="outline" className="!py-2.5 !text-xs" onClick={() => navigate('/admin/finanzas/comisiones')}>
              <Users size={15} /> Pagar comisiones
            </Button>
          </div>
        </FinSection>

        <FinSection title="Alertas" icon={Clock} className="md:col-span-2">
          <div className="space-y-2">
            {deudas.total > 0 && <p className="text-xs bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-amber-800 font-bold">{formatearMonto(deudas.total, moneda)} pendiente a personal.</p>}
            {pendientes > 0 && <p className="text-xs bg-blue-50 border border-blue-200 rounded-xl p-2.5 text-blue-800 font-bold">{pendientes} reservas pendientes de aprobación.</p>}
            <p className="text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-600">Ingresos devengados: {formatearMonto(resumen.ingresosDevengados, moneda)} · Comisiones: {formatearMonto(resumen.comisionesDevengadas, moneda)}.</p>
            {deudas.total === 0 && pendientes === 0 && <p className="text-xs text-emerald-700 font-bold py-4 text-center">Sin alertas críticas.</p>}
          </div>
        </FinSection>
      </div>

      <FinSection title="Últimos movimientos" icon={Wallet} action={<button type="button" onClick={() => navigate('/admin/finanzas/movimientos')} className="text-xs font-bold text-blue-600">Ver todos →</button>}>
        {recientes.length === 0 ? <FinEmpty title="Sin movimientos" description="Registrá un ingreso o gasto para empezar." /> : recientes.map((mov) => (
          <FinanceMovementRow key={mov.id} mov={mov} moneda={moneda} />
        ))}
      </FinSection>
      <FinanceMovementModal
        open={Boolean(modal)}
        onClose={() => setModal(null)}
        onSave={saveMovimiento}
        initialTipo={modal?.tipo || 'ingreso'}
        initialCategoria={modal?.categoria || 'ingreso_extra'}
        config={config}
      />
    </div>
  );
};

export default FinanceResumen;
