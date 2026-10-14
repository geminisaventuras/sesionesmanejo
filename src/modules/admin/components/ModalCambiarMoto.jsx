// @build: 2026-10-14 | id: FEATURE-CAMBIAR-PROVEEDOR-MOTO | desc: Modal para cambiar la moto asignada (el proveedor se deriva automáticamente).
import { useState, useMemo } from 'react';
import { X, Bike, AlertCircle } from 'lucide-react';
import { Button } from '../../../components/UI';

export default function ModalCambiarMoto({
  reserva,
  motosDisponibles,
  motoActual,
  proveedorActual,
  onConfirmar,
  onCancelar
}) {
  const [destinoId, setDestinoId] = useState('');
  const [motivo, setMotivo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const destinoSeleccionado = useMemo(() => {
    return (motosDisponibles || []).find(m => String(m.id) === String(destinoId));
  }, [motosDisponibles, destinoId]);

  const proveedorDestinoNombre = destinoSeleccionado?.proveedorNombre || 'Proveedor';

  const puedeConfirmar = destinoId && destinoId !== String(motoActual?.id || '') && !isSubmitting;

  const handleConfirmar = async () => {
    if (!puedeConfirmar) return;
    setIsSubmitting(true);
    try {
      await onConfirmar({
        motoDestinoId: destinoId,
        motoDestinoNombre: destinoSeleccionado?.nombre || '',
        proveedorDestinoId: destinoSeleccionado?.proveedorId || null,
        proveedorDestinoNombre: proveedorDestinoNombre,
        motivo: motivo.trim()
      });
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
            <Bike size={20} className="text-indigo-600" />
            <h3 className="font-black text-gray-900">Cambiar proveedor / moto</h3>
          </div>
          <button
            onClick={onCancelar}
            disabled={isSubmitting}
            className="p-1.5 bg-gray-100 rounded-full disabled:opacity-40"
          >
            <X size={16} />
          </button>
        </div>

        {/* Moto + proveedor actual */}
        <div className="p-4 bg-indigo-50 border-b border-indigo-100">
          <p className="text-[10px] text-indigo-700 font-bold uppercase tracking-wide">Asignación actual</p>
          <p className="text-sm font-bold text-indigo-900">
            Moto: {motoActual ? `#${String(motoActual.id).slice(-6)} (${motoActual.tipo || '—'})` : 'Sin asignar'}
          </p>
          <p className="text-sm font-bold text-indigo-900">
            Proveedor: {proveedorActual ? proveedorActual.nombre : 'Sin asignar'}
          </p>
          <p className="text-[11px] text-indigo-600 mt-1">
            Al cambiar la moto, el proveedor se actualiza automáticamente.
          </p>
        </div>

        {/* Formulario */}
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Nueva moto *
            </label>
            <select
              value={destinoId}
              onChange={e => setDestinoId(e.target.value)}
              disabled={isSubmitting}
              className="w-full bg-gray-50 border-2 border-gray-200 focus:border-indigo-500 rounded-xl py-2.5 px-3 outline-none text-sm"
            >
              <option value="">Selecciona una moto</option>
              {(motosDisponibles || []).map(m => (
                <option key={m.id} value={m.id}>
                  {m.proveedorNombre ? `${m.proveedorNombre} — ` : ''}{m.tipo || 'Moto'} (#{String(m.id).slice(-6)})
                </option>
              ))}
            </select>
            {motosDisponibles?.length === 0 && (
              <p className="text-[11px] text-orange-600 mt-1 font-bold flex items-center gap-1">
                <AlertCircle size={12} />
                No hay motos disponibles para esta reserva (sede, tipo u ocupación).
              </p>
            )}
          </div>

          {destinoSeleccionado && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-[11px] text-gray-600">
                Proveedor nuevo: <strong>{proveedorDestinoNombre}</strong>
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Motivo (opcional)
            </label>
            <textarea
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              disabled={isSubmitting}
              placeholder="Ej: moto con falla mecánica"
              rows={2}
              className="w-full bg-gray-50 border-2 border-gray-200 focus:border-indigo-500 rounded-xl py-2.5 px-3 outline-none text-sm resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex gap-2">
          <Button
            type="button"
            onClick={onCancelar}
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
            disabled={!puedeConfirmar}
            className="flex-1"
          >
            {isSubmitting ? 'Cambiando...' : 'Confirmar cambio'}
          </Button>
        </div>
      </div>
    </div>
  );
}
