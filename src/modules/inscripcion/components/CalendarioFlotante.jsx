// @build: 2026-06-22.REFACTOR | id: CALENDARIO-FLOTANTE | desc: Componente puro de calendario flotante, recibe props y emite selección.
import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { obtenerProximaFechaDisponible } from '../utils/disponibilidadRoles';

export const CalendarioFlotante = React.forwardRef(({
  form, updateForm, diasDisponibles, maxDate,
  mesCalendario, setMesCalendario, onClose,
  showToast,
  esCursoDosDias = false, fecha2Calc = null
}, ref) => {
  const diasEnMes = useMemo(() => {
    const year = mesCalendario.getFullYear();
    const month = mesCalendario.getMonth();
    const primerDia = new Date(year, month, 1);
    const ultimoDia = new Date(year, month + 1, 0);
    const dias = [];
    const primerDiaSemana = primerDia.getDay();
    const inicioSemana = primerDiaSemana === 0 ? 6 : primerDiaSemana - 1;
    for (let i = 0; i < inicioSemana; i++) dias.push(null);
    for (let d = 1; d <= ultimoDia.getDate(); d++) {
      const fecha = new Date(year, month, d);
      const fechaStr = fecha.toISOString().split('T')[0];
      const info = diasDisponibles.find(dd => dd.fecha === fechaStr);
      dias.push({
        dia: d,
        fecha: fechaStr,
        disponible: info ? info.disponible : false,
        segundoDia: Boolean(esCursoDosDias && info?.segundoDia),
        esParteDelRango: Boolean(esCursoDosDias && fecha2Calc && fechaStr === fecha2Calc)
      });
    }
    return dias;
  }, [mesCalendario, diasDisponibles, esCursoDosDias, fecha2Calc]);

  const cambiarMes = (delta) => setMesCalendario(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  const hoy = new Date().toISOString().split('T')[0];
  const tituloMes = (() => {
    const texto = mesCalendario.toLocaleDateString('es-VE', { month: 'long', year: 'numeric' });
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  })();
  const handleSeleccionarFecha = (fecha) => { updateForm({ fecha1: fecha }); onClose(); };
  const irAProximaFecha = () => {
    const proxima = obtenerProximaFechaDisponible(diasDisponibles, form.fecha1);
    if (!proxima) {
      if (showToast) {
        showToast(
          form.fecha1
            ? 'No hay otra fecha disponible después de la fecha seleccionada.'
            : 'No hay fechas disponibles en el rango.',
          'info'
        );
      }
      return;
    }
    updateForm({ fecha1: proxima });
    const nuevaFecha = new Date(proxima + 'T12:00:00');
    setMesCalendario(new Date(nuevaFecha.getFullYear(), nuevaFecha.getMonth(), 1));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div ref={ref} className="bg-white rounded-xl border border-gray-200 shadow-2xl p-3 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3">
          <button onClick={() => cambiarMes(-1)} className="p-1 hover:bg-gray-100 rounded-full"><ChevronLeft size={18} /></button>
          <button onClick={() => { const infoHoy = diasDisponibles.find(d => d.fecha === hoy); if (!infoHoy?.disponible && showToast) showToast('Sin horarios disponibles para esta fecha', 'info'); updateForm({ fecha1: hoy }); setMesCalendario(new Date()); onClose(); }} className="text-[10px] font-bold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg">Hoy</button>
          <span className="font-bold text-gray-700 text-sm">{tituloMes}</span>
          <button onClick={() => cambiarMes(1)} className="p-1 hover:bg-gray-100 rounded-full"><ChevronRight size={18} /></button>
        </div>
        <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-medium text-gray-500 mb-1">
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => <div key={d} className="py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {diasEnMes.map((diaInfo, idx) => {
            if (!diaInfo) return <div key={`empty-${idx}`} />;
            const { dia, fecha, disponible, segundoDia, esParteDelRango } = diaInfo;
            const esInicio = Boolean(disponible);
            // D2 solo para el rango activo o fechas que no pueden iniciar.
            const esSegundoDiaSolo = Boolean(segundoDia && !esInicio);
            const esD2 = Boolean(esCursoDosDias && (esParteDelRango || esSegundoDiaSolo));
            const esPasado = fecha < hoy;
            const esSeleccionado = form.fecha1 === fecha;
            const rol = esCursoDosDias && esSeleccionado
              ? 'D1'
              : (esCursoDosDias && esParteDelRango ? 'D2' : null);
            const fueraDeRango = fecha < hoy || fecha > maxDate;
            const sePuedeSeleccionar = !esPasado && !fueraDeRango && esInicio;
            return (
              <button
                key={fecha}
                data-testid={`calendario-fecha-${fecha}`}
                data-rol={rol || 'SIN_ROL'}
                data-segundo-dia={esD2 ? 'true' : 'false'}
                data-inicio={esInicio ? 'true' : 'false'}
                aria-label={
                  esInicio
                    ? `${dia}: día de inicio disponible`
                    : esD2
                      ? `${dia}: disponible solo como Día 2, no como inicio`
                      : `${dia}: sin horarios disponibles`
                }
                title={
                  esInicio
                    ? 'Día de inicio disponible'
                    : esD2
                      ? 'Disponible solo como Día 2 de la sesión'
                      : 'Sin horarios disponibles'
                }
                onClick={() => {
                  if (!sePuedeSeleccionar) {
                    if (esParteDelRango) {
                      if (showToast) showToast(`Este es el Día 2 de tu sesión. El día de inicio es el ${form.fecha1}.`, 'info');
                    } else if (esSegundoDiaSolo) {
                      if (showToast) showToast('No puede ser el primer día de la sesión porque el día siguiente no tiene disponibilidad.', 'info');
                    } else if (showToast) {
                      showToast('No hay cupos disponibles para esta fecha.', 'info');
                    }
                    return;
                  }
                  handleSeleccionarFecha(fecha);
                }}
                className={`relative flex flex-col items-center rounded-lg py-1.5 text-xs font-semibold transition-colors ${esSeleccionado ? 'bg-blue-600 text-white' : esParteDelRango ? 'bg-amber-100 text-amber-900 border border-amber-300' : sePuedeSeleccionar ? 'bg-green-50 text-green-700 border border-green-300 hover:bg-green-100' : esSegundoDiaSolo ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-help' : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'}`}
              >
                {rol && <span className="text-[8px] font-black leading-none">{rol}</span>}
                <span>{dia}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex justify-between items-center">
          <button type="button" onClick={irAProximaFecha} className="text-[10px] bg-blue-50 text-blue-700 px-2 py-1 rounded-lg font-bold flex items-center gap-1 hover:bg-blue-100"><ArrowRight size={12} /> Siguiente fecha disponible</button>
          <div className="flex flex-wrap gap-2 text-[10px]">
            {esCursoDosDias ? (
              <>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-blue-600"></span> D1 Inicio</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded border border-amber-300 bg-amber-100"></span> D2 Segundo día</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-gray-100 border border-gray-200"></span> No disponible</span>
              </>
            ) : (
              <>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-green-100 border border-green-300"></span> Libre</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-gray-100 border border-gray-200"></span> Ocupado</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});