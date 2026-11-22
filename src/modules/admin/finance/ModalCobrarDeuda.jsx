import { useContext, useMemo, useState } from 'react';
import { X, Wallet } from 'lucide-react';
import { AppContext } from '../../../context/AppContextValue';
import { Button } from '../../../components/UI';
import { useToast } from '../../shared/components/ToastProvider';
import { auth } from '../../../firebase';
import { DeudasProveedorService } from '../../shared/services/DeudasProveedorService';

export default function ModalCobrarDeuda({
  deuda,
  proveedorNombre,
  deudorNombre,
  servicio = DeudasProveedorService,
  modo = 'cobro',
  onClose,
  onSuccess
}) {
  const { metodosPago, config } = useContext(AppContext);
  const { showToast } = useToast();
  const esSolicitud = modo === 'solicitud';
  const moneda = deuda?.moneda || config?.monedaPagoStaff || 'USD';
  const saldo = Math.max(0, Number(deuda?.saldo) || 0);

  const metodosActivos = useMemo(() => {
    return (metodosPago || [])
      .filter((m) => m.activo !== false)
      .sort((a, b) => (Number(a.orden) || 99) - (Number(b.orden) || 99));
  }, [metodosPago]);

  const metodoPreferido = config?.metodoPagoStaffDefault || '';
  const metodoPreferidoValido = metodosActivos.some((m) => String(m.id) === String(metodoPreferido));
  const [monto, setMonto] = useState(saldo.toFixed(2));
  const [metodoPagoId, setMetodoPagoId] = useState(
    metodoPreferidoValido ? metodoPreferido : (metodosActivos[0]?.id || '')
  );
  const [referencia, setReferencia] = useState('');
  const [banco, setBanco] = useState(metodoPreferidoValido ? (config?.bancoDefaultStaff || '') : '');
  const [notas, setNotas] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const metodoSeleccionado = metodosActivos.find((m) => String(m.id) === String(metodoPagoId));

  const tasaVES = useMemo(() => {
    if (!metodoSeleccionado?.requiereBanco) return null;
    const moneda = config?.monedaPagoStaff || 'USD';
    if (moneda === 'VES') return 1;
    if (moneda === 'EUR') return Number(config?.tasaEUR) || null;
    if (moneda === 'USDT') return Number(config?.tasaUSDT) || null;
    return Number(config?.tasaUSD) || null;
  }, [metodoSeleccionado, config]);

  const montoVES = tasaVES ? (Number(monto) || 0) * tasaVES : null;

  const handleConfirmar = async () => {
    const valor = Number(monto);
    if (!(valor > 0)) {
      showToast('El monto debe ser mayor a 0', 'error');
      return;
    }
    if (valor > saldo + 1e-9) {
      showToast('El monto supera el saldo pendiente', 'error');
      return;
    }
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
      if (esSolicitud) {
        const resSolicitud = await servicio.crearSolicitudPagoDeuda({
          deudaId: deuda.id,
          monto: valor,
          moneda,
          montoVES,
          tasaAplicada: tasaVES,
          metodoPago: metodoSeleccionado?.id || 'efectivo',
          referencia: referencia.trim(),
          banco: banco.trim(),
          notas: notas.trim(),
          proveedorId: auth.currentUser?.uid || null
        });
        if (!resSolicitud.success) {
          setErrorMsg(resSolicitud.error?.message || 'No se pudo enviar la solicitud');
          showToast('No se pudo enviar: ' + (resSolicitud.error?.message || ''), 'error');
          return;
        }
        showToast('Solicitud enviada. El admin confirmará el pago.', 'success');
        if (onSuccess) onSuccess(resSolicitud.data);
        return;
      }

      const res = await servicio.registrarPagoDeuda({
        deudaId: deuda.id,
        monto: valor,
        moneda,
        metodoPago: metodoSeleccionado?.id || 'efectivo',
        referencia: referencia.trim(),
        banco: banco.trim(),
        notas: notas.trim(),
        montoVES,
        tasaAplicada: tasaVES,
        pagadoPor: auth.currentUser?.uid || null
      });

      if (!res.success) {
        const mensaje = res.error?.message || 'Error desconocido';
        console.error('[ModalCobrarDeuda] error', res.error);
        setErrorMsg(mensaje);
        showToast('No se pudo cobrar: ' + mensaje, 'error');
        return;
      }

      showToast(
        res.data?.saldo > 0
          ? `Abono registrado. Saldo restante: $${Number(res.data.saldo).toFixed(2)}`
          : 'Deuda saldada y registrada en caja',
        'success'
      );
      if (onSuccess) onSuccess(res.data);
    } catch (error) {
      setErrorMsg(error?.message || 'Error desconocido');
      showToast('Error al cobrar deuda: ' + (error?.message || 'error'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Wallet size={20} className={esSolicitud ? 'text-teal-600' : 'text-rose-600'} />
            <h3 className="font-black text-gray-900">{esSolicitud ? 'Pagar deuda' : 'Cobrar deuda'}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 bg-gray-100 rounded-full disabled:opacity-40"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-4 bg-rose-50 border-b border-rose-100">
          <p className="text-xs text-rose-700 font-bold uppercase">Deudor</p>
          <p className="text-sm font-bold text-rose-900">{deudorNombre || proveedorNombre || deuda?.proveedorId || deuda?.instructorId}</p>
          <p className="text-xs text-rose-700 mt-1">
            Saldo pendiente: <span className="font-black">${saldo.toFixed(2)} {moneda}</span>
          </p>
          <p className="text-[11px] text-rose-600 mt-1">Reserva {deuda?.reservaId || '—'}</p>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Monto a abonar *</label>
            <input
              type="number"
              min="0.01"
              max={saldo.toFixed(2)}
              step="0.01"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              disabled={isSubmitting}
              data-testid="cobro-deuda-monto"
              className="w-full bg-gray-50 border-2 border-gray-200 focus:border-blue-500 rounded-xl py-2.5 px-3 outline-none text-sm"
            />
            <p className="text-[10px] text-gray-500 mt-1">
              Puede ser parcial; el saldo restante queda pendiente.
            </p>
            {montoVES !== null && (
              <p className="text-xs font-bold text-blue-800 mt-2">
                Equivalente a transferir: Bs. {montoVES.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Método de pago *</label>
            <select
              value={metodoPagoId}
              onChange={(e) => setMetodoPagoId(e.target.value)}
              disabled={isSubmitting}
              data-testid="cobro-deuda-metodo"
              className="w-full bg-gray-50 border-2 border-gray-200 focus:border-blue-500 rounded-xl py-2.5 px-3 outline-none text-sm"
            >
              <option value="">Selecciona un método</option>
              {metodosActivos.map((m) => (
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
                onChange={(e) => setBanco(e.target.value)}
                disabled={isSubmitting}
                data-testid="cobro-deuda-banco"
                placeholder="Ej: Banesco"
                className="w-full bg-gray-50 border-2 border-gray-200 focus:border-blue-500 rounded-xl py-2.5 px-3 outline-none text-sm"
              />
            </div>
          )}

          {metodoSeleccionado?.requiereReferencia && (
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Número de referencia *</label>
              <input
                type="text"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                disabled={isSubmitting}
                data-testid="cobro-deuda-referencia"
                placeholder="Ej: 00123456"
                className="w-full bg-gray-50 border-2 border-gray-200 focus:border-blue-500 rounded-xl py-2.5 px-3 outline-none text-sm"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Notas (opcional)</label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              disabled={isSubmitting}
              rows={2}
              placeholder="Ej: abono parcial acordado"
              className="w-full bg-gray-50 border-2 border-gray-200 focus:border-blue-500 rounded-xl py-2.5 px-3 outline-none text-sm resize-none"
            />
          </div>
        </div>

        {errorMsg && (
          <p className="mx-4 mb-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
            {errorMsg}
          </p>
        )}

        <div className="p-4 border-t border-gray-100 flex gap-2">
          <Button type="button" onClick={onClose} variant="outline" disabled={isSubmitting} className="flex-1">
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirmar}
            variant="primary"
            disabled={isSubmitting || !metodoPagoId}
            className="flex-1"
          >
            {isSubmitting ? 'Guardando...' : (esSolicitud ? 'Enviar solicitud' : 'Confirmar cobro')}
          </Button>
        </div>
      </div>
    </div>
  );
}
