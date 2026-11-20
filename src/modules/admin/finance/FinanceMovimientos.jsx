// @build: 2026-11-19 | id: FINANCE-MOVIMIENTOS | desc: Libro unificado de movimientos financieros
import { useContext, useMemo, useState } from 'react';
import { Download, List, PlusCircle, Search } from 'lucide-react';
import { AppContext } from '../../../context/AppContextValue';
import { Button } from '../../../components/UI';
import { formatearMonto } from '../../shared/utils/currency';
import { FinEmpty, FinKpi, FinSection, FinanceMovementRow } from './components/FinanceUI';
import FinanceMovementModal from './components/FinanceMovementModal';
import {
  categoriasPorTipo,
  etiquetaCategoria
} from './financeConstants';
import { descargarCSV, filtrarMovimientos } from './financeUtils';

const FinanceMovimientos = () => {
  const { movimientos, saveMovimiento, config } = useContext(AppContext);
  const moneda = config?.monedaPagoStaff || 'USD';
  const [modal, setModal] = useState(null);
  const [tipo, setTipo] = useState('todos');
  const [categoria, setCategoria] = useState('todas');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [texto, setTexto] = useState('');
  const [mostrarTodos, setMostrarTodos] = useState(false);

  const lista = useMemo(
    () => filtrarMovimientos(movimientos, { tipo, categoria, desde, hasta, texto }),
    [movimientos, tipo, categoria, desde, hasta, texto]
  );
  const visibles = mostrarTodos ? lista : lista.slice(0, 12);
  const ingresos = lista.filter((m) => m.tipo === 'ingreso').reduce((a, m) => a + m.monto, 0);
  const egresos = lista.filter((m) => m.tipo === 'egreso').reduce((a, m) => a + m.monto, 0);

  const exportar = () => {
    descargarCSV('movimientos-finanzas', lista.map((m) => ({
      id: m.id,
      fecha: m.fecha,
      tipo: m.tipo,
      categoria: etiquetaCategoria(m.categoria),
      descripcion: m.descripcionVisible,
      monto: m.monto,
      moneda: m.moneda,
      metodoPago: m.metodoPago || '',
      referencia: m.referencia || ''
    })));
  };

  return (
    <div className="space-y-4 tab-transition">
      <div className="grid grid-cols-3 gap-3">
        <FinKpi label="Ingresos" value={formatearMonto(ingresos, moneda)} icon={PlusCircle} tone="emerald" />
        <FinKpi label="Egresos" value={formatearMonto(egresos, moneda)} icon={Download} tone="rose" />
        <FinKpi label="Balance" value={formatearMonto(ingresos - egresos, moneda)} icon={List} tone="blue" />
      </div>

      <FinSection
        title="Libro de movimientos"
        icon={List}
        subtitle="Ingresos, gastos, comisiones e impuestos en un solo historial."
        action={<Button type="button" className="!w-auto !py-2 !px-3 !text-xs" onClick={() => setModal({ tipo: 'ingreso', categoria: 'ingreso_extra' })}><PlusCircle size={14} /> Registrar</Button>}
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
          <div className="relative col-span-2">
            <Search size={14} className="absolute left-3 top-3 text-slate-400" />
            <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar movimiento..." className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-3 text-xs outline-none focus:border-blue-500" />
          </div>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold">
            <option value="todos">Todos</option>
            <option value="ingreso">Ingresos</option>
            <option value="egreso">Egresos</option>
          </select>
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold">
            <option value="todas">Todas</option>
            {[...categoriasPorTipo('ingreso'), ...categoriasPorTipo('egreso')].map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs" />
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs" />
          <button type="button" onClick={exportar} disabled={!lista.length} className="flex items-center justify-center gap-1 bg-slate-900 text-white rounded-xl px-3 py-2 text-xs font-bold disabled:opacity-40">
            <Download size={13} /> CSV
          </button>
        </div>

        {lista.length === 0 ? <FinEmpty title="Sin movimientos" description="Probá con otro filtro o registrá uno nuevo." /> : (
          <div>
            {visibles.map((mov) => <FinanceMovementRow key={mov.id} mov={mov} moneda={mov.moneda || moneda} />)}
            {lista.length > 12 && (
              <button type="button" onClick={() => setMostrarTodos((v) => !v)} className="w-full mt-3 py-2 text-xs font-bold text-blue-600 bg-blue-50 rounded-xl">
                {mostrarTodos ? 'Mostrar menos' : `Ver todos (${lista.length})`}
              </button>
            )}
          </div>
        )}
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

export default FinanceMovimientos;
