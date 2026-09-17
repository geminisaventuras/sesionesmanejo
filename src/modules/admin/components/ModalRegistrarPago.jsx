// @build: 2026-09-16 | id: MODAL-REGISTRAR-PAGO | desc: Modal para registrar pagos a staff con método, referencia y banco
import { useContext, useState, useMemo } from 'react';
import { X, DollarSign } from 'lucide-react';
import { AppContext } from '../../../context/AppContextValue';
import { Button, Spinner } from '../../../components/UI';
import { PagosStaffService } from '../../../services/PagosStaffService';
import { auth } from '../../../firebase';

export default function ModalRegistrarPago({
  reservaIds,
  monto,
  tipoStaff,
  staffId,
  staffNombre,
  onClose,
  onSuccess
}) {
  const { metodosPago, config, showToast } = useContext(AppContext);

  const metodosActivos = useMemo(() => {
    return (metodosPago || [])
      .filter(m => m.activo !== false)
      .sort((a, b) => (Number(a.orden) || 99) - (Number(b.orden) || 99));
  }, [metodosPago]);

  // A1: hidratar método y banco desde config con fallback si el método no está activo
  const metodoPreferido = config?.metodoPagoStaffDefault || '';
  const metodoPreferidoValido = metodosActivos.some(m => String(m.id) === String(metodoPreferido));

  const [metodoPagoId, setMetodoPagoId] = useState(metodoPreferidoValido ? metodoPreferido : '');
  const [referencia, setReferencia] = useState('');
  const [banco, setBanco] = useState(metodoPreferidoValido ? (config?.bancoDefaultStaff || '') : '');
  const [notas, setNotas] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const metodoSeleccionado = metodosActivos.find(m => String(m.id) === String(metodoPagoId));

  const montoVES = useMemo(() => {
    if (!metodoSeleccionado?.requiereBanco) return null;
    const moneda = config?.monedaPagoStaff || 'USD';
    if (moneda === 'VES') return monto;
    let tasa = null;
    if (moneda === 'EUR') tasa = config?.tasaEUR;
    else if (moneda === 'USDT') tasa = config?.tasaUSDT;
    else tasa = config?.tasaUSD;
    if (!tasa || Number(tasa) <= 0) return null;
    return monto * Number(tasa);
  }, [metodoSeleccionado, monto, config]);

  const handleConfirmar = async () => {
    if (!metodoPagoId) {
      showToast('Selecciona un método de pago', 'error');
      return;
    }
    if (metodoSeleccionado?.requiereReferencia && !referencia.trim()) {
      showToast('El número de referencia es obligatorio para este método', 'error');
      return;
    }

        setIsSubmitting(true);
    try {
      const monedaTasa = config?.monedaPagoStaff || 'USD';
      let tasaAplicada = null;
      if (metodoSeleccionado?.requiereBanco) {
        if (monedaTasa === 'EUR') tasaAplicada = Number(config?.tasaEUR) || null;
        else if (monedaTasa === 'USDT') tasaAplicada = Number(config?.tasaUSDT) || null;
        else if (monedaTasa === 'USD') tasaAplicada = Number(config?.tasaUSD) || null;
      }

      const result = await PagosStaffService.crearPago({
        tipoStaff,
        staffId,
        staffNombre,
        reservaIds,
        montoTotal: monto,
        moneda: monedaTasa,
        metodoPago: metodoSeleccionado?.id || 'efectivo',
        referencia: referencia.trim(),
        banco: banco.trim(),
        notas: notas.trim(),
        pagadoPor: auth.currentUser?.uid || null,
        montoTotalVES: montoVES,
        tasaAplicada,
        monedaTasa
      });

      if (!result.success) {
        showToast('Error al registrar pago: ' + (result.error?.message || ''), 'error');
        return;
      }

      showToast('Pago registrado correctamente', 'success');
      if (onSuccess) onSuccess(result.data);
    } catch (error) {
      showToast('Error: ' + error.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <DollarSign size={20} className="text-blue-600" />
            <h3 className="font-black text-gray-900">Registrar Pago</h3>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 bg-gray-100 rounded-full disabled:opacity-40"
          >
            <X size={16} />
          </button>
        </div>

               {/* Resumen */}
        <div className="p-4 bg-blue-50 border-b border-blue-100">
          <p className="text-xs text-blue-700 font-bold uppercase">Pagando a</p>
          <p className="text-sm font-bold text-blue-900">{staffNombre}</p>
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-blue-700">{reservaIds.length} reservas</span>
            <span className="text-2xl font-black text-blue-900">${monto}</span>
          </div>

          {montoVES !== null && (
            <div className="mt-3 pt-3 border-t border-blue-200">
              <p className="text-xs text-blue-700 font-bold uppercase">Equivalente a transferir</p>
              <p className="text-xl font-black text-blue-900">
                Bs. {montoVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-blue-600 mt-1">
                {(() => {
                  const moneda = config?.monedaPagoStaff || 'USD';
                  if (moneda === 'EUR') return `Tasa EUR: ${config?.tasaEUR}`;
                  if (moneda === 'USDT') return `Tasa USDT: ${config?.tasaUSDT}`;
                  return `Tasa USD: ${config?.tasaUSD}`;
                })()}
              </p>
            </div>
          )}
        </div>

        {/* Formulario */}
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Método de pago *
            </label>
            <select
              value={metodoPagoId}
              onChange={e => setMetodoPagoId(e.target.value)}
              disabled={isSubmitting}
              className="w-full bg-gray-50 border-2 border-gray-200 focus:border-blue-500 rounded-xl py-2.5 px-3 outline-none text-sm"
            >
              <option value="">Selecciona un método</option>
              {metodosActivos.map(m => (
                <option key={m.id} value={m.id}>{m.nombre}</option>
              ))}
            </select>
          </div>

          {metodoSeleccionado?.requiereBanco && (
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Banco {metodoSeleccionado.requiereReferencia ? '*' : '(opcional)'}
              </label>
              <input
                type="text"
                value={banco}
                onChange={e => setBanco(e.target.value)}
                disabled={isSubmitting}
                placeholder="Ej: Banesco"
                className="w-full bg-gray-50 border-2 border-gray-200 focus:border-blue-500 rounded-xl py-2.5 px-3 outline-none text-sm"
              />
            </div>
          )}

          {metodoSeleccionado?.requiereReferencia && (
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Número de referencia *
              </label>
              <input
                type="text"
                value={referencia}
                onChange={e => setReferencia(e.target.value)}
                disabled={isSubmitting}
                placeholder="Ej: 00123456"
                className="w-full bg-gray-50 border-2 border-gray-200 focus:border-blue-500 rounded-xl py-2.5 px-3 outline-none text-sm"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Notas (opcional)
            </label>
            <textarea
              value={notas}
              onChange={e => setNotas(e.target.value)}
              disabled={isSubmitting}
              placeholder="Ej: Pago semanal 10-16 sept"
              rows={2}
              className="w-full bg-gray-50 border-2 border-gray-200 focus:border-blue-500 rounded-xl py-2.5 px-3 outline-none text-sm resize-none"
            />
          </div>
        </div>

        {/* Footer con acciones */}
        <div className="p-4 border-t border-gray-100 flex gap-2">
          <Button
            type="button"
            onClick={onClose}
            variant="outline"
            disabled={isSubmitting}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirmar}
            variant="primary"
            disabled={isSubmitting || !metodoPagoId}
            className="flex-1"
          >
            {isSubmitting ? 'Guardando...' : 'Confirmar Pago'}
          </Button>
        </div>
      </div>
    </div>
  );
}
