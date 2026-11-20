// @build: 2026-11-19 | id: FINANCE-GASTOS | desc: Registro y control de gastos operativos y pagos extra
import { useContext, useMemo, useState } from 'react';
import { PlusCircle, Receipt } from 'lucide-react';
import { AppContext } from '../../../context/AppContextValue';
import { Button } from '../../../components/UI';
import { formatearMonto } from '../../shared/utils/currency';
import { FinEmpty, FinKpi, FinSection, FinanceMovementRow } from './components/FinanceUI';
import FinanceMovementModal from './components/FinanceMovementModal';
import { categoriasPorTipo } from './financeConstants';
import { filtrarMovimientos } from './financeUtils';

const CATS_GASTO = ['gasto_operativo', 'pago_extra_personal', 'ajuste', 'devolucion'];

const FinanceGastos = () => {
  const { movimientos, saveMovimiento, config } = useContext(AppContext);
  const moneda = config?.monedaPagoStaff || 'USD';
  const [categoria, setCategoria] = useState('todas');
  const [modal, setModal] = useState(false);

  const lista = useMemo(() => {
    const egresos = filtrarMovimientos(movimientos, { tipo: 'egreso' });
    return egresos.filter((m) => CATS_GASTO.includes(m.categoria) && (categoria === 'todas' || m.categoria === categoria));
  }, [movimientos, categoria]);

  const total = lista.reduce((a, m) => a + m.monto, 0);

  return (
    <div className="space-y-4 tab-transition">
      <div className="grid grid-cols-2 gap-3">
        <FinKpi label="Gastos del período" value={formatearMonto(total, moneda)} icon={Receipt} tone="rose" hint={`${lista.length} movimientos`} />
        <FinKpi label="Promedio" value={formatearMonto(lista.length ? total / lista.length : 0, moneda)} icon={Receipt} tone="slate" hint="Por movimiento" />
      </div>

      <FinSection
        title="Gastos y pagos extra"
        icon={Receipt}
        subtitle="Compras, servicios, adelantos y devoluciones."
        action={<Button type="button" variant="danger" className="!w-auto !py-2 !px-3 !text-xs" onClick={() => setModal(true)}><PlusCircle size={14} /> Registrar</Button>}
      >
        <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold mb-3">
          <option value="todas">Todas las categorías</option>
          {categoriasPorTipo('egreso').filter((c) => CATS_GASTO.includes(c.id)).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>

        {lista.length === 0 ? <FinEmpty title="Sin gastos" description="Registrá el primer gasto del período." /> : lista.map((mov) => (
          <FinanceMovementRow key={mov.id} mov={mov} moneda={moneda} />
        ))}
      </FinSection>

      <FinanceMovementModal
        open={modal}
        onClose={() => setModal(false)}
        onSave={saveMovimiento}
        initialTipo="egreso"
        initialCategoria="gasto_operativo"
        config={config}
      />
    </div>
  );
};

export default FinanceGastos;
