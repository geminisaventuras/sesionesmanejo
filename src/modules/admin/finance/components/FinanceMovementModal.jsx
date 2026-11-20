// @build: 2026-11-19 | id: FINANCE-MOVEMENT-MODAL | desc: Registro manual de ingresos, gastos, impuestos y pagos extra
import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { Button, Input } from '../../../shared/components/UI';
import { useToast } from '../../../shared/components/ToastProvider';
import { categoriasPorTipo, etiquetaCategoria, METODOS_PAGO_FINANZAS } from '../financeConstants';
import { hoyVET } from '../financeUtils';

const nuevoId = () => (
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `mov_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
);

export default function FinanceMovementModal({
  open,
  onClose,
  onSave,
  initialTipo = 'ingreso',
  initialCategoria = 'ingreso_extra',
  config = {}
}) {
  const { showToast } = useToast();
  const [tipo, setTipo] = useState(initialTipo);
  const [categoria, setCategoria] = useState(initialCategoria);
  const [monto, setMonto] = useState('');
  const [moneda, setMoneda] = useState(config?.monedaPagoStaff || 'USD');
  const [fecha, setFecha] = useState(hoyVET());
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [referencia, setReferencia] = useState('');
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);

  const opciones = useMemo(() => categoriasPorTipo(tipo), [tipo]);

  useEffect(() => {
    if (!open) return;
    const primeras = categoriasPorTipo(initialTipo);
    setTipo(initialTipo);
    setCategoria(primeras.some((c) => c.id === initialCategoria) ? initialCategoria : primeras[0]?.id || '');
    setMonto('');
    setMoneda(config?.monedaPagoStaff || 'USD');
    setFecha(hoyVET());
    setMetodoPago('efectivo');
    setReferencia('');
    setNotas('');
  }, [open, initialTipo, initialCategoria, config?.monedaPagoStaff]);

  const cambiarTipo = (nuevoTipo) => {
    setTipo(nuevoTipo);
    setCategoria(categoriasPorTipo(nuevoTipo)[0]?.id || '');
  };

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    const valor = Number(monto);
    if (!categoria || !Number.isFinite(valor) || valor <= 0) {
      showToast('Ingresá un monto mayor a 0 y una categoría', 'error');
      return;
    }
    setGuardando(true);
    try {
      await onSave({
        id: nuevoId(),
        tipo,
        categoria,
        monto: valor,
        moneda,
        fecha,
        metodoPago,
        referencia: referencia.trim(),
        notas: notas.trim(),
        desc: notas.trim() || etiquetaCategoria(categoria),
        origen: 'manual',
        estado: 'confirmado'
      });
      showToast('Movimiento registrado', 'success');
      onClose();
    } catch (error) {
      showToast('No se pudo registrar: ' + (error?.message || 'error'), 'error');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div>
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Libro financiero</p>
            <h2 className="text-lg font-black text-slate-900">Nuevo movimiento</h2>
          </div>
          <button type="button" onClick={onClose} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={submit} className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => cambiarTipo('ingreso')}
              className={`py-2 rounded-xl text-xs font-black border ${tipo === 'ingreso' ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
            >
              Ingreso
            </button>
            <button
              type="button"
              onClick={() => cambiarTipo('egreso')}
              className={`py-2 rounded-xl text-xs font-black border ${tipo === 'egreso' ? 'bg-rose-50 border-rose-300 text-rose-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
            >
              Egreso
            </button>
          </div>

          <label className="block">
            <span className="block text-xs font-bold text-slate-700 mb-1">Categoría</span>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm outline-none focus:border-blue-500"
            >
              {opciones.map((opcion) => (
                <option key={opcion.id} value={opcion.id}>{opcion.label}</option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-2">
            <Input
              label={`Monto (${moneda})`}
              type="number"
              min="0"
              step="0.01"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="0.00"
            />
            <label className="block mb-4">
              <span className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Moneda</span>
              <select
                value={moneda}
                onChange={(e) => setMoneda(e.target.value)}
                className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl py-3 px-3 text-sm outline-none focus:border-blue-500"
              >
                {['USD', 'EUR', 'VES', 'USDT'].map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input label="Fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            <label className="block mb-4">
              <span className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Método</span>
              <select
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value)}
                className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl py-3 px-3 text-sm outline-none focus:border-blue-500"
              >
                {METODOS_PAGO_FINANZAS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </label>
          </div>

          <Input label="Referencia" value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="Opcional" />
          <Input label="Notas / descripción" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Ej: compra de aceite, adelanto, IVA del mes" />

          <Button type="submit" disabled={guardando} className="!py-2.5">
            {guardando ? 'Guardando...' : 'Guardar movimiento'}
          </Button>
        </form>
      </div>
    </div>
  );
}
