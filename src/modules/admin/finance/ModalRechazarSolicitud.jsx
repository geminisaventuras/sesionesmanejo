import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '../../../components/UI';

export default function ModalRechazarSolicitud({
  solicitud,
  proveedorNombre,
  isSubmitting = false,
  onClose,
  onConfirm
}) {
  const [motivo, setMotivo] = useState('Pago no verificado');

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <AlertTriangle size={20} className="text-rose-600" />
            <h3 className="font-black text-gray-900">Rechazar solicitud</h3>
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
          <p className="text-xs text-rose-700 font-bold uppercase">Proveedor</p>
          <p className="text-sm font-bold text-rose-900">{proveedorNombre || solicitud?.proveedorId}</p>
          <p className="text-xs text-rose-700 mt-1">
            Monto reportado: ${Number(solicitud?.monto || 0).toFixed(2)} {solicitud?.moneda || 'USD'}
          </p>
        </div>

        <div className="p-4">
          <label className="block text-xs font-bold text-gray-700 mb-1">Motivo del rechazo *</label>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
            disabled={isSubmitting}
            data-testid="motivo-rechazo"
            className="w-full bg-gray-50 border-2 border-gray-200 focus:border-rose-500 rounded-xl py-2.5 px-3 outline-none text-sm resize-none"
          />
        </div>

        <div className="p-4 border-t border-gray-100 flex gap-2">
          <Button type="button" onClick={onClose} variant="outline" disabled={isSubmitting} className="flex-1">
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => onConfirm(motivo.trim())}
            variant="danger"
            disabled={isSubmitting || !motivo.trim()}
            className="flex-1"
          >
            {isSubmitting ? 'Rechazando...' : 'Confirmar rechazo'}
          </Button>
        </div>
      </div>
    </div>
  );
}
