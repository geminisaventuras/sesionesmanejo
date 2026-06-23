// @build: 2026-06-22.REFACTOR | id: PASO3-HORARIO | desc: Componente puro del paso 3 (selección de horario). Recibe datos calculados por el hook y callbacks.
import React, { useMemo } from 'react';
import { Calendar, Eye, ArrowRight } from 'lucide-react';
import { Spinner } from '../../../components/UI';

export function Paso3Horario({
  form, updateForm,
  diasDisponibles, bloques,
  onSelectHorario, onMostrarCalendario,
  isSelectingHorario, selectingBlockId,
  fbUser, lockId, recursosListos,
  showToast, cargando
}) {
  const fechasMostradas = useMemo(() => {
    const reference = form.fecha1 || new Date().toISOString().split('T')[0];
    const list = [];
    const cursor = new Date(reference + 'T12:00:00');
    cursor.setDate(cursor.getDate() - 3);
    for (let i = 0; i < 7; i++) {
      const fechaStr = cursor.toISOString().split('T')[0];
      const info = diasDisponibles.find(d => d.fecha === fechaStr);
      list.push({
        fecha: fechaStr,
        disponible: info ? info.disponible : false,
        label: cursor.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    return list;
  }, [form.fecha1, diasDisponibles]);

  return (
    <div className="flex flex-col h-full space-y-2">
      <div className="bg-blue-600 text-white rounded-xl shadow-lg shadow-[0_0_25px_rgba(59,130,246,0.5)] overflow-hidden">
        <div className="p-4">
          <div className="flex items-center justify-center gap-2 mt-3 pt-2 border-t border-blue-400/40">
            <Calendar size={16} className="text-blue-200" />
            <span className="text-xs font-bold text-center">Fechas con Horas disponibles</span>
          </div>
        </div>
        <div className="grid grid-cols-7 bg-blue-700/50 border-t border-blue-400/30">
          {fechasMostradas.map(({ fecha, label, disponible }) => {
            const isSelected = form.fecha1 === fecha;
            return (
              <button
                key={fecha}
                onClick={() => {
                  if (!disponible) {
                    if (showToast) showToast('Sin horarios disponibles para esta fecha', 'info');
                    return;
                  }
                  updateForm({ fecha1: fecha });
                }}
                className={`py-2 text-xs font-semibold transition-colors border-r border-blue-400/30 last:border-r-0 ${
                  isSelected
                    ? 'bg-white text-blue-600'
                    : disponible
                    ? 'bg-blue-500/30 text-white hover:bg-blue-400/40'
                    : 'bg-blue-800/30 text-blue-200/50 cursor-not-allowed'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <button
          onClick={onMostrarCalendario}
          className="w-full py-3 text-sm font-bold text-white bg-gray-700 hover:bg-gray-800 transition-colors border-t border-blue-400/30 flex items-center justify-center gap-2"
        >
          <Eye size={16} />
          Ver calendario completo
          <ArrowRight size={16} />
        </button>
      </div>

      {/* ✅ Mensajes según estado */}
      {!fbUser ? (
        <div className="flex-1 flex items-center justify-center">
          <Spinner message="Cargando horarios..." />
        </div>
      ) : cargando ? (
        <div className="flex-1 flex items-center justify-center">
          <Spinner message="Cargando instructores y motos..." />
        </div>
      ) : bloques.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
          No hay bloques disponibles para esta fecha. Seleccione otra.
        </div>
      ) : (
        <div className="flex-1 mt-2">
          <div className="grid gap-1.5">
            {bloques.map(b => {
              const isSelectingThis = selectingBlockId === b.id;
              return (
                <button
                  key={b.id}
                  disabled={!b.disponible || b.isLunch || isSelectingHorario || !fbUser}
                  onClick={() => onSelectHorario(b)}
                  className={`w-full py-3 px-2 rounded-lg border-2 text-left transition-colors duration-200 ${
                    isSelectingThis
                      ? 'bg-blue-50 border-blue-500 text-blue-800'
                      : b.isLunch
                      ? 'bg-gray-100 border-gray-200 opacity-60'
                      : !b.disponible
                      ? 'bg-gray-50 border-gray-200 opacity-60'
                      : form.horaId === b.id
                      ? 'bg-blue-100 border-blue-500 text-blue-800 ring-2 ring-blue-300'
                      : 'bg-white border-gray-200 hover:border-blue-300 cursor-pointer'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs">{b.label}</span>
                    {isSelectingThis ? (
                      <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-black">Procesando...</span>
                    ) : (
                      <>
                        {b.isLunch && <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-black">ALMUERZO</span>}
                        {b.reason === 'CERRADO' && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-black">CERRADO</span>}
                        {b.reason === 'OCUPADO' && <span className="text-[10px] bg-gray-100 text-slate-400 px-1.5 py-0.5 rounded font-black">OCUPADO</span>}
                        {b.reason === 'SIN_MOTO' && <span className="text-[10px] bg-yellow-100 text-yellow-600 px-1.5 py-0.5 rounded font-black">SIN MOTO</span>}
                        {!b.disponible && !b.reason && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-black">NO DISP.</span>}
                        {b.disponible && form.horaId === b.id && <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-black">SELECCIONADO</span>}
                        {b.disponible && form.horaId !== b.id && <span className="text-[10px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded font-black">DISPONIBLE</span>}
                      </>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}