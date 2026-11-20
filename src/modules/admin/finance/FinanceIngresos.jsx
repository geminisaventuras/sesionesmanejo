// @build: 2026-11-19 | id: FINANCE-INGRESOS | desc: Control de ingresos por reservas e ingresos extra
import { useContext, useMemo, useState } from 'react';
import { ArrowDownLeft, BookOpen, PlusCircle } from 'lucide-react';
import { AppContext } from '../../../context/AppContextValue';
import { Button } from '../../../components/UI';
import { formatearMonto } from '../../shared/utils/currency';
import { FinBadge, FinEmpty, FinKpi, FinSection, FinanceMovementRow } from './components/FinanceUI';
import FinanceMovementModal from './components/FinanceMovementModal';
import { filtrarMovimientos, ordenarMovimientos } from './financeUtils';

const FinanceIngresos = () => {
  const { reservas, movimientos, saveMovimiento, config } = useContext(AppContext);
  const moneda = config?.monedaPagoStaff || 'USD';
  const [tab, setTab] = useState('reservas');
  const [modal, setModal] = useState(false);

  const aprobadas = useMemo(() => (reservas || [])
    .filter((r) => r.estadoPago === 'Aprobado')
    .sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || ''))), [reservas]);
  const totalReservas = aprobadas.reduce((a, r) => a + (Number(r.pagoTotalMoneda) || 0), 0);

  const extras = useMemo(() => filtrarMovimientos(movimientos, { tipo: 'ingreso' })
    .filter((m) => m.categoria !== 'ingreso_reserva'), [movimientos]);
  const totalExtras = extras.reduce((a, m) => a + m.monto, 0);

  return (
    <div className="space-y-4 tab-transition">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <FinKpi label="Ingresos por reservas" value={formatearMonto(totalReservas, moneda)} icon={BookOpen} tone="emerald" hint={`${aprobadas.length} reservas aprobadas`} />
        <FinKpi label="Ingresos extra" value={formatearMonto(totalExtras, moneda)} icon={PlusCircle} tone="indigo" hint={`${extras.length} movimientos`} />
        <FinKpi label="Total visible" value={formatearMonto(totalReservas + totalExtras, moneda)} icon={ArrowDownLeft} tone="blue" hint="Base + extras" />
      </div>

      <FinSection
        title="Ingresos"
        icon={ArrowDownLeft}
        subtitle="Reservas aprobadas y conceptos adicionales."
        action={<Button type="button" variant="success" className="!w-auto !py-2 !px-3 !text-xs" onClick={() => setModal(true)}><PlusCircle size={14} /> Ingreso extra</Button>}
      >
        <div className="flex gap-2 mb-3">
          <button type="button" onClick={() => setTab('reservas')} className={`px-3 py-1.5 rounded-full text-xs font-bold ${tab === 'reservas' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Reservas</button>
          <button type="button" onClick={() => setTab('extras')} className={`px-3 py-1.5 rounded-full text-xs font-bold ${tab === 'extras' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Extra ({extras.length})</button>
        </div>

        {tab === 'reservas' ? (
          aprobadas.length === 0 ? <FinEmpty title="Sin reservas aprobadas" /> : (
            <div className="divide-y divide-slate-100">
              {aprobadas.slice(0, 12).map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{r.nombre} {r.apellido || ''}</p>
                    <p className="text-[10px] text-slate-400">{r.fecha} · Reserva {String(r.id).slice(-4)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-black text-emerald-600 tabular-nums">{formatearMonto(r.pagoTotalMoneda, moneda)}</p>
                    <FinBadge tone="emerald">Aprobado</FinBadge>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          extras.length === 0 ? <FinEmpty title="Sin ingresos extra" /> : extras.map((m) => <FinanceMovementRow key={m.id} mov={m} moneda={m.moneda || moneda} />)
        )}
      </FinSection>

      <FinanceMovementModal
        open={modal}
        onClose={() => setModal(false)}
        onSave={saveMovimiento}
        initialTipo="ingreso"
        initialCategoria="ingreso_extra"
        config={config}
      />
    </div>
  );
};

export default FinanceIngresos;
