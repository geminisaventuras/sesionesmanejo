// @build: 2026-09-16 | id: MODAL-REASIGNAR-INSTRUCTOR | desc: Modal para reasignar instructor con split de comisión (MVP A→B)
import { useState, useMemo } from 'react';
import { X, Users, AlertCircle } from 'lucide-react';
import { Button } from '../../../components/UI';

export default function ModalReasignarInstructor({
  reserva,
  instructoresDisponibles,
  instructorActual,
  instructorInicioCurso = true,
  onConfirmar,
  onCancelar
}) {
  const [destinoId, setDestinoId] = useState('');
  const [porcentajeDestino, setPorcentajeDestino] = useState(50);
  const [motivo, setMotivo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const destinoSeleccionado = useMemo(() => {
    return (instructoresDisponibles || []).find(i => String(i.id) === String(destinoId));
  }, [instructoresDisponibles, destinoId]);

  const porcentajeOrigen = 100 - Number(porcentajeDestino || 0);
  const porcentajeValido =
    Number(porcentajeDestino) >= 0 &&
    Number(porcentajeDestino) <= 100 &&
    Number.isFinite(porcentajeOrigen);

  const puedeConfirmar = destinoId && porcentajeValido && !isSubmitting;

  const handleConfirmar = async () => {
    if (!puedeConfirmar) return;
    setIsSubmitting(true);
    try {
      await onConfirmar({
        instructorDestinoId: destinoId,
        instructorDestinoNombre: `${destinoSeleccionado?.nombre || ''} ${destinoSeleccionado?.apellido || ''}`.trim(),
        porcentajeDestino: Number(porcentajeDestino),
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
            <Users size={20} className="text-blue-600" />
            <h3 className="font-black text-gray-900">Reasignar / Relevo</h3>
          </div>
          <button
            onClick={onCancelar}
            disabled={isSubmitting}
            className="p-1.5 bg-gray-100 rounded-full disabled:opacity-40"
          >
            <X size={16} />
          </button>
        </div>

        {/* Instructor actual */}
        <div className="p-4 bg-blue-50 border-b border-blue-100">
          <p className="text-[10px] text-blue-700 font-bold uppercase tracking-wide">Instructor actual (A)</p>
          <p className="text-sm font-bold text-blue-900">
            {instructorActual ? `${instructorActual.nombre || ''} ${instructorActual.apellido || ''}`.trim() : 'Sin asignar'}
          </p>
                    <p className="text-[11px] text-blue-600 mt-1">
            {instructorInicioCurso
              ? 'Este instructor mantendrá su comisión según el porcentaje que definas.'
              : 'Este instructor no completó su parte. No se le asignará comisión.'}
          </p>
        </div>

        {/* Formulario */}
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Instructor de relevo (B) *
            </label>
            <select
              value={destinoId}
              onChange={e => setDestinoId(e.target.value)}
              disabled={isSubmitting}
              className="w-full bg-gray-50 border-2 border-gray-200 focus:border-blue-500 rounded-xl py-2.5 px-3 outline-none text-sm"
            >
              <option value="">Selecciona un instructor</option>
              {(instructoresDisponibles || []).map(i => (
                <option key={i.id} value={i.id}>
                  {i.nombre} {i.apellido || ''}
                </option>
              ))}
            </select>
            {instructoresDisponibles?.length === 0 && (
              <p className="text-[11px] text-orange-600 mt-1 font-bold">
                No hay instructores disponibles en esta sede.
              </p>
            )}
          </div>

                    {!instructorInicioCurso && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-[11px] text-gray-600">
                El instructor anterior <strong>no inició el curso</strong>. La comisión irá completa al nuevo instructor.
              </p>
            </div>
          )}

          {instructorInicioCurso && (
          <>
          {/* Porcentajes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                % {instructorActual?.nombre || 'A'}
              </label>
              <input
                type="number"
                value={porcentajeOrigen}
                readOnly
                className="w-full bg-gray-100 border-2 border-gray-200 rounded-xl py-2.5 px-3 outline-none text-sm text-gray-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                % {destinoSeleccionado?.nombre || 'B'}
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={porcentajeDestino}
                onChange={e => setPorcentajeDestino(e.target.value)}
                disabled={isSubmitting}
                className="w-full bg-gray-50 border-2 border-gray-200 focus:border-blue-500 rounded-xl py-2.5 px-3 outline-none text-sm"
              />
            </div>
          </div>

          {!porcentajeValido && (
            <div className="flex items-center gap-1 text-[11px] text-orange-600 font-bold">
              <AlertCircle size={12} />
              El porcentaje debe estar entre 0 y 100.
            </div>
          )}
                    </>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Motivo (opcional)
            </label>
            <textarea
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              disabled={isSubmitting}
              placeholder="Ej: A no puede asistir el día 2"
              rows={2}
              className="w-full bg-gray-50 border-2 border-gray-200 focus:border-blue-500 rounded-xl py-2.5 px-3 outline-none text-sm resize-none"
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
            {isSubmitting ? 'Reasignando...' : 'Confirmar relevo'}
          </Button>
        </div>
      </div>
    </div>
  );
}
