// @build: 2026-11-19 | id: FINANCE-REPORTES | desc: Reportes de caja, comisiones e impuestos
import { useContext, useMemo, useState } from 'react';
import { BarChart3, Download, Landmark, Users, Wallet } from 'lucide-react';
import { AppContext } from '../../../context/AppContextValue';
import { formatearMonto } from '../../shared/utils/currency';
import { FinCard, FinEmpty, FinKpi, FinSection } from './components/FinanceUI';
import { calcularDeudas, calcularResumen, descargarCSV, filtrarMovimientos, inicioMesVET, resumenPorCategoria } from './financeUtils';

const FinanceReportes = () => {
  const { movimientos, reservas, instructores, proveedores, config } = useContext(AppContext);
  const moneda = config?.monedaPagoStaff || 'USD';
  const [periodo, setPeriodo] = useState('mes');

  const desde = useMemo(() => {
    if (periodo === 'mes') return inicioMesVET();
    if (periodo === '7d') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return d.toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });
    }
    if (periodo === '30d') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return d.toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });
    }
    return '';
  }, [periodo]);

  const movs = useMemo(() => filtrarMovimientos(movimientos, { desde }), [movimientos, desde]);
  const resumen = useMemo(() => calcularResumen({ reservas, movimientos: movs, config }), [reservas, movs, config]);
  const deudas = useMemo(() => calcularDeudas({ reservas, instructores, proveedores, config }), [reservas, instructores, proveedores, config]);
  const categorias = useMemo(() => resumenPorCategoria(movs), [movs]);
  const ingresos = movs.filter((m) => m.tipo === 'ingreso').reduce((a, m) => a + m.monto, 0);
  const egresos = movs.filter((m) => m.tipo === 'egreso').reduce((a, m) => a + m.monto, 0);

  const exportar = () => descargarCSV('reporte-financiero', categorias.map((c) => ({
    categoria: c.label,
    tipo: c.tipo,
    cantidad: c.cantidad,
    total: c.total,
    moneda
  })));

  return (
    <div className="space-y-4 tab-transition">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Reportes</p>
          <h1 className="text-lg font-black text-slate-900">Resultado del período</h1>
        </div>
        <select value={periodo} onChange={(e) => setPeriodo(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold">
          <option value="mes">Este mes</option>
          <option value="7d">Últimos 7 días</option>
          <option value="30d">Últimos 30 días</option>
          <option value="todo">Todo</option>
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <FinKpi label="Ingresos" value={formatearMonto(ingresos, moneda)} icon={BarChart3} tone="emerald" />
        <FinKpi label="Egresos" value={formatearMonto(egresos, moneda)} icon={Wallet} tone="rose" />
        <FinKpi label="Balance" value={formatearMonto(ingresos - egresos, moneda)} icon={BarChart3} tone="blue" />
        <FinKpi label="Por pagar personal" value={formatearMonto(deudas.total, moneda)} icon={Users} tone="amber" />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <FinSection title="Pérdidas y ganancias" icon={BarChart3} subtitle="Base devengada + caja del período.">
          <div className="space-y-2 text-xs">
            <div className="flex justify-between"><span className="text-slate-500">Ingresos devengados</span><span className="font-black tabular-nums">{formatearMonto(resumen.ingresosDevengados, moneda)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Comisiones devengadas</span><span className="font-black text-rose-600 tabular-nums">{formatearMonto(resumen.comisionesDevengadas, moneda)}</span></div>
            <div className="flex justify-between border-t pt-2"><span className="font-bold text-slate-700">Utilidad devengada</span><span className="font-black text-emerald-600 tabular-nums">{formatearMonto(resumen.utilidadDevengada, moneda)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Utilidad de caja</span><span className="font-black tabular-nums">{formatearMonto(resumen.utilidadCaja, moneda)}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Margen de caja</span><span className="font-black">{Math.round(resumen.margen)}%</span></div>
          </div>
        </FinSection>

        <FinSection title="Comisiones y personal" icon={Users}>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between"><span className="text-slate-500">Instructores pendientes</span><span className="font-black">{deudas.deudasInst.length}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Proveedores pendientes</span><span className="font-black">{deudas.deudasProv.length}</span></div>
            <div className="flex justify-between border-t pt-2"><span className="font-bold text-slate-700">Total por pagar</span><span className="font-black text-amber-700">{formatearMonto(deudas.total, moneda)}</span></div>
          </div>
        </FinSection>
      </div>

      <FinSection
        title="Movimientos por categoría"
        icon={Landmark}
        action={<button type="button" onClick={exportar} disabled={!categorias.length} className="flex items-center gap-1 text-xs font-bold text-blue-600 disabled:opacity-40"><Download size={13} /> CSV</button>}
      >
        {categorias.length === 0 ? <FinEmpty title="Sin datos en el período" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[420px]">
              <thead><tr className="text-left text-[10px] uppercase text-slate-400 border-b"><th className="py-2">Categoría</th><th>Tipo</th><th className="text-right">Cantidad</th><th className="text-right">Total</th></tr></thead>
              <tbody>
                {categorias.map((c) => (
                  <tr key={c.categoria} className="border-b border-slate-50 last:border-0">
                    <td className="py-2 font-bold text-slate-700">{c.label}</td>
                    <td className={c.tipo === 'ingreso' ? 'text-emerald-600' : 'text-rose-600'}>{c.tipo}</td>
                    <td className="text-right">{c.cantidad}</td>
                    <td className="text-right font-black tabular-nums">{formatearMonto(c.total, moneda)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </FinSection>

      <FinCard className="p-3 text-[11px] text-slate-500">
        Nota: el IVA está en modo preparación. Los reportes no suman IVA al precio del estudiante hasta que se active el cobro.
      </FinCard>
    </div>
  );
};

export default FinanceReportes;
