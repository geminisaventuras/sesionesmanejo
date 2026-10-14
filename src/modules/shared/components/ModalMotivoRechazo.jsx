// @build: 2026-10-12 | id: CORREGIR-PAGO-FASE5A | desc: Modal reutilizable para capturar motivo de rechazo de pago
import { useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { Button } from '../../../components/UI';
import { MOTIVOS_RECHAZO, MOTIVO_RECHAZO_DEFAULT } from '../../../constants/servicios';

/**
 * Modal para capturar el motivo de un rechazo de pago.
 *
 * @param {Object} props
 * @param {Function} props.onConfirm - (motivo: string) => void
 * @param {Function} props.onCancel  - () => void
 * @param {string} [props.titulo]    - Título del modal (default "Motivo del rechazo")
 */
export function ModalMotivoRechazo({ onConfirm, onCancel, titulo = 'Motivo del rechazo' }) {
  const [seleccion, setSeleccion] = useState('');
  const [otro, setOtro] = useState('');

  const esOtro = seleccion === 'otro';
  const motivoFinal = esOtro
    ? (otro.trim() || MOTIVO_RECHAZO_DEFAULT)
    : (MOTIVOS_RECHAZO.find(m => m.value === seleccion)?.label || MOTIVO_RECHAZO_DEFAULT);

  const handleConfirm = () => {
    onConfirm(motivoFinal);
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-red-50 border-b border-red-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={20} className="text-red-600" />
            <h2 className="font-black text-red-800 text-base">{titulo}</h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          <p className="text-xs text-gray-600">
            Selecciona el motivo. Se mostrará al estudiante en la página de corrección.
          </p>

          <div className="space-y-2">
            {MOTIVOS_RECHAZO.map(m => (
              <label
                key={m.value}
                className={`flex items-center gap-2 p-3 border-2 rounded-xl cursor-pointer transition-colors ${
                  seleccion === m.value
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="motivo"
                  value={m.value}
                  checked={seleccion === m.value}
                  onChange={(e) => setSeleccion(e.target.value)}
                  className="h-4 w-4 text-red-600 focus:ring-red-500"
                />
                <span className="text-sm font-bold text-gray-800">{m.label}</span>
              </label>
            ))}
          </div>

          {esOtro && (
            <textarea
              value={otro}
              onChange={(e) => setOtro(e.target.value)}
              placeholder="Escribe el motivo personalizado..."
              rows={3}
              className="w-full border-2 border-gray-200 focus:border-red-400 rounded-xl py-2 px-3 text-sm outline-none resize-none"
              maxLength={200}
            />
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t p-4 flex gap-2">
          <Button
            type="button"
            onClick={onCancel}
            variant="outline"
            className="flex-1 !py-2 !text-xs"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            variant="danger"
            className="flex-1 !py-2 !text-xs"
            disabled={!seleccion}
          >
            Confirmar rechazo
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ModalMotivoRechazo;
