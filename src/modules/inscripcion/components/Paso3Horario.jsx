// src/modules/inscripcion/components/Paso3Horario.jsx
//@build: 2026-09-30 | id: LEGAL-TERMINOLOGIA-PASO3 | desc: Exportación corregida, alineación mejorada, cinta de fechas azul oscuro
import React, { useMemo } from 'react';
import { Calendar, Eye, ArrowRight, BookOpen, MapPin, Bike, Zap } from 'lucide-react';
import { Spinner } from '../../../components/UI';

const formatearFechaCorta = (fecha) => {
  if (!fecha) return '';
  return new Date(fecha + 'T12:00:00').toLocaleDateString('es-VE', {
    day: '2-digit',
    month: 'short'
  });
};

export function Paso3Horario({
  form, updateForm,
  diasDisponibles, bloques,
  onSelectHorario, onMostrarCalendario,
  isSelectingHorario, selectingBlockId,
  fbUser, lockId, recursosListos,
  showToast, cargando,
  cursoNombre, sedeNombre, tipoMoto, traeMoto,
  esCursoDosDias = false, fecha2Calc = null
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
        segundoDia: Boolean(esCursoDosDias && info?.segundoDia),
        esParteDelRango: Boolean(esCursoDosDias && fecha2Calc && fechaStr === fecha2Calc),
        label: cursor.toLocaleDateString('es-VE', { day: '2-digit', month: 'short' })
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    return list;
  }, [form.fecha1, diasDisponibles, esCursoDosDias, fecha2Calc]);

  const horaSeleccionada = useMemo(
    () => (bloques || []).find(b => String(b.id) === String(form.horaId))?.label || '',
    [bloques, form.horaId]
  );

  return (
    <div className="flex flex-col h-full space-y-2">
      <div className="bg-blue-600 text-white rounded-xl shadow-lg shadow-[0_0_25px_rgba(59,130,246,0.5)] overflow-hidden">
        <div className="p-4">
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            <div className="flex items-center gap-2">
              <BookOpen size={18} className="text-blue-200 shrink-0" />
              <span className="font-bold truncate">{cursoNombre || 'Sesión'}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={18} className="text-blue-200 shrink-0" />
              <span className="font-bold truncate">{sedeNombre || 'Sede'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap size={18} className="text-blue-200 shrink-0" />
              <span className="font-bold">{tipoMoto}</span>
            </div>
            <div className="flex items-center gap-2">
              <Bike size={18} className="text-blue-200 shrink-0" />
              <span className="font-bold">{traeMoto === 'Sí' ? 'Moto propia' : 'Moto App'}</span>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 mt-3 pt-2 border-t border-blue-400/40">
            <Calendar size={16} className="text-blue-200" />
            <span className="text-xs font-bold text-center">
              {esCursoDosDias ? 'Elige el día de inicio (D1)' : 'Fechas con horas disponibles'}
            </span>
          </div>
          {esCursoDosDias && (
            <p className="mt-1 text-[10px] font-semibold text-center text-blue-100">
              Esta sesión ocupa 2 días consecutivos: D1 y D2
            </p>
          )}
        </div>
        <div className="grid grid-cols-7 bg-blue-800 border-t border-blue-400/30">
          {fechasMostradas.map(({ fecha, label, disponible, segundoDia, esParteDelRango }) => {
            const esInicio = Boolean(disponible);
            // Solo se marca D2 el día que pertenece al rango seleccionado o
            // una fecha que NO puede iniciar. Si también puede iniciar, manda D1.
            const esSegundoDiaSolo = Boolean(segundoDia && !esInicio);
            const esD2 = Boolean(esParteDelRango || esSegundoDiaSolo);
            const esInicioYRango = esInicio && esParteDelRango;
            const isSelected = form.fecha1 === fecha;
            const esD1Seleccionado = esCursoDosDias && isSelected;
            const esD2Seleccionado = esCursoDosDias && esParteDelRango;
            const rol = esD1Seleccionado ? 'D1' : (esD2Seleccionado ? 'D2' : null);
            const bloqueada = !esInicio && !esD2;
            const title = esInicio
              ? (esInicioYRango ? `${label}: también puede iniciar una sesión` : label)
              : esD2
                ? `${label}: disponible solo como Día 2 de la sesión`
                : `${label}: sin horarios disponibles`;

            return (
              <button
                key={fecha}
                data-testid={`fecha-${fecha}`}
                data-disponible={esInicio ? 'true' : 'false'}
                data-rol={rol || 'SIN_ROL'}
                data-segundo-dia={esD2 ? 'true' : 'false'}
                data-inicio={esInicio ? 'true' : 'false'}
                aria-pressed={isSelected}
                aria-label={
                  esInicio
                    ? `${label}: día de inicio disponible${esInicioYRango ? ', también es el Día 2 del rango actual' : ''}`
                    : esD2
                      ? `${label}: disponible solo como Día 2, no como inicio`
                      : `${label}: sin horarios disponibles`
                }
                title={title}
                onClick={() => {
                  // Si la fecha también es un inicio válido, el clic debe
                  // permitir cambiarla a D1. El calendario ya lo hacía así.
                  if (esInicio) {
                    updateForm({ fecha1: fecha });
                    return;
                  }
                  if (esParteDelRango) {
                    if (showToast) {
                      showToast(`Este es el Día 2 de tu sesión. El día de inicio es el ${formatearFechaCorta(form.fecha1)}.`, 'info');
                    }
                    return;
                  }
                  if (esD2) {
                    if (showToast) {
                      showToast('No puede ser el primer día de la sesión porque el día siguiente no tiene disponibilidad.', 'info');
                    }
                    return;
                  }
                  if (showToast) showToast('No hay cupos disponibles para esta fecha.', 'info');
                }}
                className={`relative py-2 text-xs font-semibold transition-colors border-r border-blue-400/30 last:border-r-0 ${
                  esParteDelRango
                    ? `bg-amber-300 text-amber-950 ring-inset ring-2 ring-amber-200 ${esInicio ? 'cursor-pointer' : 'cursor-help'}`
                    : esInicio
                      ? isSelected
                        ? 'bg-white text-blue-600'
                        : 'bg-blue-600/40 text-white hover:bg-blue-500/50'
                      : esD2
                        ? 'bg-blue-600/40 text-white cursor-help'
                        : 'bg-slate-900 text-slate-400 opacity-70 line-through cursor-not-allowed'
                }`}
              >
                {rol && (
                  <span
                    className={`absolute right-0.5 top-0.5 rounded px-0.5 text-[7px] font-black leading-tight ${
                      esD2 ? 'bg-amber-950 text-amber-100' : 'bg-blue-700 text-white'
                    }`}
                  >
                    {rol}
                  </span>
                )}
                <span className="block">{label}</span>
              </button>
            );
          })}
        </div>
        {esCursoDosDias && form.fecha1 && fecha2Calc && (
          <div data-testid="rango-d1-d2" className="mx-3 mt-2 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1.5">
            <div className="mb-1 flex items-center justify-between text-[9px] font-black uppercase tracking-wide text-blue-800">
              <span>Sesión de 2 días</span>
              <span>2 días consecutivos</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px]">
              <span className="flex flex-1 items-center gap-1 rounded border border-blue-100 bg-white px-1.5 py-1 font-bold text-slate-900">
                <span className="flex shrink-0 items-center gap-1 whitespace-nowrap">
                  <span className="rounded bg-blue-700 px-1 py-0.5 text-[8px] text-white">D1</span>
                  {formatearFechaCorta(form.fecha1)}
                </span>
                {horaSeleccionada && (
                  <span data-testid="rango-d1-d2-hora-d1" title={horaSeleccionada} className="ml-auto min-w-0 truncate text-right text-[8px] font-semibold leading-tight text-slate-600">
                    {horaSeleccionada}
                  </span>
                )}
              </span>
              <span className="font-black text-blue-400">→</span>
              <span className="flex flex-1 items-center gap-1 rounded border border-amber-200 bg-amber-50 px-1.5 py-1 font-bold text-slate-900">
                <span className="flex shrink-0 items-center gap-1 whitespace-nowrap">
                  <span className="rounded bg-amber-700 px-1 py-0.5 text-[8px] text-white">D2</span>
                  {formatearFechaCorta(fecha2Calc)}
                </span>
                {horaSeleccionada && (
                  <span data-testid="rango-d1-d2-hora-d2" title={horaSeleccionada} className="ml-auto min-w-0 truncate text-right text-[8px] font-semibold leading-tight text-slate-600">
                    {horaSeleccionada}
                  </span>
                )}
              </span>
            </div>
          </div>
        )}
        <button
          onClick={onMostrarCalendario}
          className="w-full py-3 text-sm font-bold text-white bg-gray-700 hover:bg-gray-800 transition-colors border-t border-blue-400/30 flex items-center justify-center gap-2"
        >
          <Eye size={16} />
          Ver calendario completo
          <ArrowRight size={16} />
        </button>
      </div>

      {!fbUser ? (
        <div className="flex-1 flex items-center justify-center">
          <Spinner message="Cargando horarios..." />
        </div>
      ) : cargando ? (
        <div className="flex-1 flex items-center justify-center">
          <Spinner message="Cargando tutores y motos..." />
        </div>
      ) : bloques.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-6">
            <Calendar size={48} className="text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-gray-500">No hay bloques disponibles</p>
            <p className="text-xs text-gray-400 mt-1">Selecciona otra fecha en el calendario</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 mt-2">
          <div className="grid gap-1.5">
            {bloques.map(b => {
              const isSelectingThis = selectingBlockId === b.id;
              return (
                <button
                  key={b.id}
                  data-testid={`bloque-${b.id}`}
                  data-disponible={b.disponible ? 'true' : 'false'}
                  data-reason={b.reason || ''}
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
                        {b.reason === 'RESERVADO' && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-black">Reservado</span>}
                        {b.reason === 'NO_DISPONIBLE' && <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-black">No disponible</span>}
                        {b.reason === 'BLOQUEO_PROVEEDOR' && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-black">No disponible</span>}
                         {b.reason === 'BLOQUEO_ADMIN' && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-black">No disponible</span>}
                        {b.reason === 'EN_ESPERA_PAGO' && <span className="text-[10px] bg-yellow-100 text-yellow-600 px-1.5 py-0.5 rounded font-black">En espera de pago</span>}
                        {b.reason === 'OCUPADO' && <span className="text-[10px] bg-gray-100 text-slate-400 px-1.5 py-0.5 rounded font-black">OCUPADO</span>}
                                               {b.reason === 'SIN_MOTO' && <span className="text-[10px] bg-yellow-100 text-yellow-600 px-1.5 py-0.5 rounded font-black">SIN MOTO</span>}
                        {b.reason === 'NO_OFRECIDO' && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-black">No Aplica</span>}
                        
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
