// @build: 2026-10-20 | id: FEATURE-BLOQUEOS-INSTRUCTORES-MODAL | desc: Modal para crear un bloqueo de disponibilidad del instructor.
// Valida contra reservas activas (usando ReservaService.obtenerReservasPorInstructor)
// antes de crear el doc en bloqueosInstructores. Si hay conflicto, aborta.
import { useState, useMemo } from 'react';
import { X, Calendar, Clock, AlertCircle, MapPin } from 'lucide-react';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../../firebase';
import { Button } from '../../../components/UI';
import { ReservaService } from '../../../services/ReservaService';

const APP_ID = 'motoescuela-pro-v1';
const COLL = 'bloqueosInstructores';

export default function ModalBloqueoInstructor({
  user,
  horarios = [],
  sedes = [],
  onConfirmar,
  onCancelar
}) {
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [todoElDia, setTodoElDia] = useState(true);
  const [horariosSel, setHorariosSel] = useState([]);
  const [sedeId, setSedeId] = useState('');
  const [motivo, setMotivo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorLocal, setErrorLocal] = useState('');

  // Sedes del instructor (del campo instructor.sedes si existe, o todas).
  const sedesDisponibles = useMemo(() => {
    const permitidas = Array.isArray(user?.data?.sedes) && user.data.sedes.length > 0
      ? user.data.sedes
      : null;
    if (!permitidas) return sedes || [];
    return (sedes || []).filter(s => permitidas.includes(String(s.id)));
  }, [sedes, user?.data?.sedes]);

  // Horarios del sistema (h1-h6, sin almuerzo).
  const horariosOperativos = useMemo(() => {
    return (horarios || []).filter(h => h.activo !== false && !h.isLunch);
  }, [horarios]);

  const toggleHorario = (id) => {
    setHorariosSel(prev =>
      prev.includes(id) ? prev.filter(h => h !== id) : [...prev, id]
    );
  };

  const fechaFinEfectiva = fechaFin || fechaInicio;
  const puedeConfirmar =
    fechaInicio &&
    fechaFinEfectiva &&
    fechaInicio <= fechaFinEfectiva &&
    (todoElDia || horariosSel.length > 0) &&
    !isSubmitting;

  const handleConfirmar = async () => {
    setErrorLocal('');

    if (!puedeConfirmar) return;

    const instructorId = user?.uid;
    if (!instructorId) {
      setErrorLocal('No hay sesión activa.');
      return;
    }

    // Validar conflictos con reservas activas.
    setIsSubmitting(true);
    try {
      const conflictos = await ReservaService.obtenerReservasPorInstructor(
        instructorId,
        fechaInicio,
        fechaFin
      );

      if (!conflictos.success) {
        setErrorLocal('No se pudo validar conflictos con reservas. Intenta de nuevo.');
        setIsSubmitting(false);
        return;
      }

      if (conflictos.data.length > 0) {
        setErrorLocal(
          `Tienes ${conflictos.data.length} reserva(s) activa(s) en este rango. ` +
          `Contacta a los estudiantes para reprogramar antes de bloquear.`
        );
        setIsSubmitting(false);
        return;
      }

      // Crear el bloqueo.
      const payload = {
        instructorId,
        fechaInicio,
        fechaFin: fechaFin || fechaInicio,
        todoElDia,
        horarios: todoElDia ? [] : horariosSel,
        sedeId: sedeId || null,
        motivo: (motivo || '').trim(),
        estado: 'activo',
        creadoPor: instructorId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const ref = await addDoc(
        collection(db, COLL),
        payload
      );

      if (onConfirmar) onConfirmar(ref.id, payload);
    } catch (err) {
      console.error('[ModalBloqueoInstructor] Error:', err);
      setErrorLocal('Error al crear bloqueo: ' + (err.message || 'desconocido'));
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
            <Calendar size={20} className="text-indigo-600" />
            <h3 className="font-black text-gray-900">Bloquear disponibilidad</h3>
          </div>
          <button
            onClick={onCancelar}
            disabled={isSubmitting}
            className="p-1.5 bg-gray-100 rounded-full disabled:opacity-40"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          {/* Fechas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Fecha inicio *
              </label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                disabled={isSubmitting}
                className="w-full bg-gray-50 border-2 border-gray-200 focus:border-indigo-500 rounded-xl py-2.5 px-3 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Fecha fin
              </label>
              <input
                type="date"
                value={fechaFin}
                min={fechaInicio || undefined}
                onChange={(e) => setFechaFin(e.target.value)}
                disabled={isSubmitting}
                className="w-full bg-gray-50 border-2 border-gray-200 focus:border-indigo-500 rounded-xl py-2.5 px-3 outline-none text-sm"
              />
            </div>
          </div>
          <p className="text-[10px] text-gray-500 -mt-2">
            Si es 1 sola fecha, deja el campo fin vacío.
          </p>

          {/* Modo */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">
              ¿Qué horarios bloquear?
            </label>
            <div className="space-y-2">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="modo"
                  checked={todoElDia}
                  onChange={() => setTodoElDia(true)}
                  disabled={isSubmitting}
                  className="mr-2"
                />
                <span className="text-sm">Todo el día</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="modo"
                  checked={!todoElDia}
                  onChange={() => setTodoElDia(false)}
                  disabled={isSubmitting}
                  className="mr-2"
                />
                <span className="text-sm">Horarios específicos</span>
              </label>
            </div>
          </div>

          {/* Horarios específicos */}
          {!todoElDia && (
            <div className="grid grid-cols-3 gap-2 bg-gray-50 p-3 rounded-lg">
              {horariosOperativos.map(h => (
                <label key={h.id} className="flex items-center cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={horariosSel.includes(h.id)}
                    onChange={() => toggleHorario(h.id)}
                    disabled={isSubmitting}
                    className="mr-1.5"
                  />
                  <span>{h.label || h.id}</span>
                </label>
              ))}
            </div>
          )}

          {/* Sede */}
          {sedesDisponibles.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                <MapPin size={12} className="inline mr-1" />
                Sede (opcional)
              </label>
              <select
                value={sedeId}
                onChange={(e) => setSedeId(e.target.value)}
                disabled={isSubmitting}
                className="w-full bg-gray-50 border-2 border-gray-200 focus:border-indigo-500 rounded-xl py-2.5 px-3 outline-none text-sm"
              >
                <option value="">Todas las sedes</option>
                {sedesDisponibles.map(s => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </div>
          )}

          {/* Motivo */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Motivo (opcional)
            </label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              disabled={isSubmitting}
              placeholder="Ej: vacaciones, cita médica..."
              rows={2}
              className="w-full bg-gray-50 border-2 border-gray-200 focus:border-indigo-500 rounded-xl py-2.5 px-3 outline-none text-sm resize-none"
            />
          </div>

          {/* Error */}
          {errorLocal && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-2 flex items-start gap-2">
              <AlertCircle size={14} className="text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-red-800">{errorLocal}</p>
            </div>
          )}
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
            {isSubmitting ? 'Guardando...' : 'Confirmar bloqueo'}
          </Button>
        </div>
      </div>
    </div>
  );
}
