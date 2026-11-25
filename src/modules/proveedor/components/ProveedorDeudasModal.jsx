import { useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useFocusTrap } from '../../shared/hooks/useFocusTrap';
import { formatearMonto } from '../../shared/utils/currency';

export default function ProveedorDeudasModal({
  deudas = [],
  solicitudes = [],
  moneda = 'USD',
  onPagar,
  onCerrar
}) {
  const contenedorRef = useRef(null);
  useFocusTrap(contenedorRef, onCerrar);
  const total = (deudas || []).reduce((acc, deuda) => acc + (Number(deuda.saldo) || 0), 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCerrar(); }}
    >
      <div
        ref={contenedorRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="deudas-proveedor-titulo"
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 id="deudas-proveedor-titulo" className="text-sm font-black uppercase text-gray-900">Deudas con la app</h3>
          <button
            type="button"
            onClick={onCerrar}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600"
            aria-label="Cerrar deudas"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-red-50 p-3">
          <AlertTriangle size={20} className="shrink-0 text-red-500" />
          <div>
            <p className="text-[10px] font-bold uppercase text-red-700">Total pendiente</p>
            <p className="text-lg font-black tabular-nums text-red-600">{formatearMonto(total, moneda)}</p>
          </div>
        </div>

        <div className="mt-3 space-y-2">
          {deudas.length === 0 && (
            <p className="rounded-xl border border-gray-100 p-4 text-center text-xs text-gray-500">
              No tienes deudas pendientes.
            </p>
          )}
          {deudas.map((deuda) => {
            const solicitudPendiente = solicitudes.some((s) => s.deudaId === deuda.id);
            return (
              <div key={deuda.id} className="flex items-center gap-2 rounded-xl border border-gray-100 p-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-gray-800">Reserva {deuda.reservaId || '—'}</p>
                  <p className="text-[10px] text-gray-500">{formatearMonto(deuda.saldo, moneda)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onPagar(deuda)}
                  disabled={solicitudPendiente}
                  className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[10px] font-bold ${
                    solicitudPendiente
                      ? 'bg-amber-100 text-amber-700'
                      : 'border border-red-200 bg-white text-red-700'
                  }`}
                >
                  {solicitudPendiente ? 'En revisión' : 'Pagar'}
                </button>
              </div>
            );
          })}
        </div>

        <p className="mt-3 text-[10px] text-gray-500">
          Se descuenta automáticamente de tus próximos pagos.
        </p>
      </div>
    </div>
  );
}
