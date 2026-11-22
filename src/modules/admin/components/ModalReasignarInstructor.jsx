// @build: 2026-09-16 | id: MODAL-REASIGNAR-INSTRUCTOR | desc: Modal para reasignar instructor con split de comisión (MVP A→B)
import { useState, useMemo } from 'react';
import { X, Users } from 'lucide-react';
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
  const [motivo, setMotivo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const destinoSeleccionado = useMemo(() => {
    return (instructoresDisponibles || []).find(i => String(i.id) === String(destinoId));
  }, [instructoresDisponibles, destinoId]);

  // FT-001: regla fija. D1/D2 50/50 si el curso inició; 100% al nuevo si no.
  const porcentajeDestino = instructorInicioCurso ? 50 : 100;
  const porcentajeOrigen = 100 - porcentajeDestino;

  const puedeConfirmar = Boolean(destinoId) && !isSubmitting;

  const handleConfirmar = async () => {
    if (!puedeConfirmar) return;
    setIsSubmitting(true);
    try {
      await onConfirmar({
        instructorDestinoId: destinoId,
        instructorDestinoNombre: `${destinoSeleccionado?.nombre || ''} ${destinoSeleccionado?.apellido || ''}`.trim(),
        porcentajeDestino,
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
              ? 'El tutor actual conserva su 50% de D1. El nuevo tutor recibe el 50% de D2.'
              : 'Este instructor no inició el curso. El nuevo tutor recibe el 100% de la comisión.'}
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
          {/* Split fijo aprobado (FT-001): no editable */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
              <p className="text-[10px] font-bold text-gray-500 uppercase">D1 · {instructorActual?.nombre || 'Tutor A'}</p>
              <p className="text-lg font-black text-gray-900">{porcentajeOrigen}%</p>
              <p className="text-[10px] text-gray-500">Parte ya servida</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <p className="text-[10px] font-bold text-blue-600 uppercase">D2 · {destinoSeleccionado?.nombre || 'Tutor B'}</p>
              <p className="text-lg font-black text-blue-900">{porcentajeDestino}%</p>
              <p className="text-[10px] text-blue-600">Parte de relevo</p>
            </div>
          </div>
          <p className="text-[10px] text-gray-500">
            Regla fija 50/50. Si el tutor anterior cobró 100%, el exceso queda como deuda descontable de su próximo pago.
          </p>
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
