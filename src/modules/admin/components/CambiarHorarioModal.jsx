// @build: 2026-08-28.16-05-00 | id: BXX-BYY | backup: CambiarHorarioModal.jsx.backup-20260828-160500 | desc: Modal para cambio de horario de reserva
import { useState, useMemo, useCallback } from 'react';
import { Calendar, Clock, AlertTriangle, X } from 'lucide-react';
import { obtenerLocksActivos, verificarDisponibilidadInstructor, verificarDisponibilidadMoto } from '../utils/reservaHorarioHelpers';

export default function CambiarHorarioModal({ 
  reserva, 
  ctx, 
  onConfirmar, 
  onCancelar 
}) {
  const { horarios, ocupacionConfirmada, cursos, instructores, motos } = ctx;
  
  const [nuevaFecha, setNuevaFecha] = useState(reserva.fecha || '');
  const [nuevoHoraId, setNuevoHoraId] = useState('');
  const [advertencias, setAdvertencias] = useState([]);
  const [validando, setValidando] = useState(false);
  
  // Determinar si el curso es de uno o dos días
  const curso = cursos.find(c => String(c.id) === String(reserva.cursoId));
  const esCursoDosDias = (curso?.duracionTotal || 240) > 120;
  
  // Calcular fecha2 si aplica
  const nuevaFecha2 = useMemo(() => {
    if (!nuevaFecha || !esCursoDosDias) return null;
    
    const fechaObj = new Date(nuevaFecha + 'T12:00:00');
    fechaObj.setDate(fechaObj.getDate() + 1);
    return fechaObj.toISOString().split('T')[0];
  }, [nuevaFecha, esCursoDosDias]);
  
  // Filtrar horarios disponibles para la nueva fecha
  const horariosDisponibles = useMemo(() => {
    if (!nuevaFecha) return [];
    
    return horarios.filter(h => {
      if (!h.activo || h.isLunch) return false;
      
      const ocupado = (ocupacionConfirmada || []).some(r => {
        if (String(r.id) === String(reserva.id)) return false;
        if (r.estadoPago !== 'Aprobado' && r.estadoPago !== 'Pendiente') return false;
        
        const mismaFecha = r.fecha === nuevaFecha || r.fecha2 === nuevaFecha;
        const mismoHorario = String(r.horaId) === String(h.id);
        
        return mismaFecha && mismoHorario;
      });
      
      return !ocupado;
    });
  }, [nuevaFecha, horarios, ocupacionConfirmada, reserva.id]);
  
  // Validar al seleccionar horario
  const validarSeleccion = useCallback(async () => {
    if (!nuevaFecha || !nuevoHoraId) return;
    
    setValidando(true);
    const advertenciasTemp = [];
    
    // Verificar locks activos
    const locks = await obtenerLocksActivos(nuevaFecha, nuevoHoraId);
    if (locks.length > 0) {
      advertenciasTemp.push({
        tipo: 'lock',
        mensaje: `Hay ${locks.length} usuario(s) seleccionando este horario actualmente.`
      });
    }
    
    // Verificar disponibilidad del instructor
    const instructorDisponible = verificarDisponibilidadInstructor(
      reserva.instructorId, 
      nuevaFecha, 
      nuevaFecha2, 
      nuevoHoraId, 
      ocupacionConfirmada,
      reserva.id
    );
    
    if (!instructorDisponible) {
      advertenciasTemp.push({
        tipo: 'instructor',
        mensaje: 'El instructor asignado puede tener conflictos en el nuevo horario.'
      });
    }
    
    // Verificar disponibilidad de la moto
    if (reserva.motoAsignadaId) {
      const motoDisponible = verificarDisponibilidadMoto(
        reserva.motoAsignadaId, 
        nuevaFecha, 
        nuevaFecha2, 
        nuevoHoraId, 
        ocupacionConfirmada,
        reserva.id
      );
      
      if (!motoDisponible) {
        advertenciasTemp.push({
          tipo: 'moto',
          mensaje: 'La moto asignada puede tener conflictos en el nuevo horario.'
        });
      }
    }
    
    setAdvertencias(advertenciasTemp);
    setValidando(false);
  }, [nuevaFecha, nuevaFecha2, nuevoHoraId, reserva, ocupacionConfirmada]);
  
  const handleConfirmar = () => {
    onConfirmar({
      nuevaFecha,
      nuevaFecha2,
      nuevoHoraId
    });
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <Calendar size={20} className="text-blue-600" />
            Cambiar Horario de Reserva
          </h2>
          <button onClick={onCancelar} className="p-1.5 bg-gray-100 rounded-full">
            <X size={18} className="text-gray-600" />
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          {/* Horario actual */}
          <div className="bg-gray-50 p-3 rounded-xl">
            <h3 className="font-bold text-gray-700 text-xs mb-2">Horario Actual</h3>
            <p className="text-xs text-gray-600">📅 {reserva.fecha} {reserva.fecha2 && `- ${reserva.fecha2}`}</p>
            <p className="text-xs text-gray-600">⏰ {reserva.horaId}</p>
          </div>
          
          {/* Nueva fecha */}
          <div>
            <label className="block font-bold text-gray-700 text-xs mb-1">Nueva Fecha</label>
            <input
              type="date"
              value={nuevaFecha}
              onChange={(e) => {
                setNuevaFecha(e.target.value);
                setNuevoHoraId('');
                setAdvertencias([]);
              }}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500"
            />
            {esCursoDosDias && nuevaFecha2 && (
              <p className="text-[11px] text-gray-500 mt-1">
                Segunda fecha (automática): {nuevaFecha2}
              </p>
            )}
          </div>
          
          {/* Nuevo horario */}
          <div>
            <label className="block font-bold text-gray-700 text-xs mb-1">Nuevo Horario</label>
            <select
              value={nuevoHoraId}
              onChange={(e) => {
                setNuevoHoraId(e.target.value);
                validarSeleccion();
              }}
              disabled={!nuevaFecha}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500 disabled:opacity-50"
            >
              <option value="">Seleccionar horario</option>
              {horariosDisponibles.map(h => (
                <option key={h.id} value={h.id}>
                  {h.label || `${h.horaInicio} - ${h.horaFin}`}
                </option>
              ))}
            </select>
            
            {horariosDisponibles.length === 0 && nuevaFecha && (
              <p className="text-xs font-bold text-orange-600 mt-1">
                No hay horarios disponibles para esta fecha.
              </p>
            )}
          </div>
          
          {/* Advertencias */}
          {advertencias.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-xl">
              <h4 className="font-bold text-yellow-900 text-xs mb-1 flex items-center gap-1">
                <AlertTriangle size={14} />
                Advertencias
              </h4>
              <ul className="space-y-1">
                {advertencias.map((adv, i) => (
                  <li key={i} className="text-[11px] text-yellow-800">
                    • {adv.mensaje}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        <div className="p-4 border-t flex gap-2 justify-end">
          <button
            onClick={onCancelar}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </button>
          
          <button
            onClick={handleConfirmar}
            disabled={!nuevaFecha || !nuevoHoraId || validando}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {validando ? 'Validando...' : 'Confirmar Cambio'}
          </button>
        </div>
      </div>
    </div>
  );
}