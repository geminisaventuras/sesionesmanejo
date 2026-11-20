// @build: 2026-11-19 | id: FINANCE-IMPUESTOS | desc: Control de impuestos y modo preparación de IVA
import { useContext, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Landmark, PlusCircle, ShieldAlert } from 'lucide-react';
import { AppContext } from '../../../context/AppContextValue';
import { Button } from '../../../components/UI';
import { formatearMonto } from '../../shared/utils/currency';
import { FinBadge, FinEmpty, FinKpi, FinSection, FinanceMovementRow } from './components/FinanceUI';
import FinanceMovementModal from './components/FinanceMovementModal';
import { filtrarMovimientos, getFinanzasConfig } from './financeUtils';

const FinanceImpuestos = () => {
  const { movimientos, saveMovimiento, config } = useContext(AppContext);
  const navigate = useNavigate();
  const moneda = config?.monedaPagoStaff || 'USD';
  const finanzas = getFinanzasConfig(config);
  const [modal, setModal] = useState(false);

  const impuestos = useMemo(
    () => filtrarMovimientos(movimientos, { tipo: 'egreso' }).filter((m) => m.categoria === 'impuesto'),
    [movimientos]
  );
  const total = impuestos.reduce((a, m) => a + m.monto, 0);

  return (
    <div className="space-y-4 tab-transition">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <FinKpi label="Impuestos registrados" value={formatearMonto(total, moneda)} icon={Landmark} tone="amber" hint={`${impuestos.length} movimientos`} />
        <FinKpi label="IVA" value={finanzas.iva.cobrarEnCheckout ? `${finanzas.iva.tasa}% activo` : 'No activo'} icon={ShieldAlert} tone={finanzas.iva.cobrarEnCheckout ? 'emerald' : 'slate'} hint="Cobro en checkout" />
        <FinKpi label="RIF" value={finanzas.iva.rif || 'Pendiente'} icon={Landmark} tone="blue" hint="Datos fiscales" />
      </div>

      <div className={`rounded-2xl border p-4 ${finanzas.iva.cobrarEnCheckout ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
        <div className="flex items-start gap-3">
          <ShieldAlert size={20} className={finanzas.iva.cobrarEnCheckout ? 'text-emerald-600' : 'text-amber-600'} />
          <div className="min-w-0">
            <p className="text-sm font-black text-slate-900">{finanzas.iva.cobrarEnCheckout ? 'IVA activo en checkout' : 'IVA en modo preparación'}</p>
            <p className="text-xs text-slate-600 mt-1">
              {finanzas.iva.cobrarEnCheckout
                ? 'Las nuevas ventas suman IVA según la configuración.'
                : 'No se suma nada al precio que paga el estudiante. El módulo queda listo para activarse cuando el RIF esté configurado.'}
            </p>
            <button type="button" onClick={() => navigate('/admin/finanzas/configuracion')} className="text-xs font-bold text-blue-700 mt-2 hover:underline">
              Revisar configuración fiscal →
            </button>
          </div>
        </div>
      </div>

      <FinSection
        title="Impuestos registrados"
        icon={Landmark}
        subtitle="IVA, IGTF, municipales u otros conceptos."
        action={<Button type="button" className="!w-auto !py-2 !px-3 !text-xs" onClick={() => setModal(true)}><PlusCircle size={14} /> Registrar</Button>}
      >
        {impuestos.length === 0 ? <FinEmpty title="Sin impuestos registrados" description="Cuando registres un impuesto aparecerá aquí." /> : (
          <div className="divide-y divide-slate-100">
            {impuestos.map((m) => <FinanceMovementRow key={m.id} mov={m} moneda={m.moneda || moneda} />)}
          </div>
        )}
        <div className="mt-3 flex justify-end"><FinBadge tone="amber">IVA no se cobra al estudiante</FinBadge></div>
      </FinSection>

      <FinanceMovementModal
        open={modal}
        onClose={() => setModal(false)}
        onSave={saveMovimiento}
        initialTipo="egreso"
        initialCategoria="impuesto"
        config={config}
      />
    </div>
  );
};

export default FinanceImpuestos;
