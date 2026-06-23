// @build: 2026-06-22.REFACTOR | id: CALENDARIO-FLOTANTE | desc: Componente puro de calendario flotante, recibe props y emite selección.
import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';

export const CalendarioFlotante = React.forwardRef(({
  form, updateForm, diasDisponibles, maxDate,
  mesCalendario, setMesCalendario, onClose,
  buscarProximaFechaDisponible, showToast
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
      dias.push({ dia: d, fecha: fechaStr, disponible: info ? info.disponible : false });
    }
    return dias;
  }, [mesCalendario, diasDisponibles]);

  const cambiarMes = (delta) => setMesCalendario(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  const hoy = new Date().toISOString().split('T')[0];
  const handleSeleccionarFecha = (fecha) => { updateForm({ fecha1: fecha }); onClose(); };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div ref={ref} className="bg-white rounded-xl border border-gray-200 shadow-2xl p-3 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3">
          <button onClick={() => cambiarMes(-1)} className="p-1 hover:bg-gray-100 rounded-full"><ChevronLeft size={18} /></button>
          <button onClick={() => { const infoHoy = diasDisponibles.find(d => d.fecha === hoy); if (!infoHoy?.disponible && showToast) showToast('Sin horarios disponibles para esta fecha', 'info'); updateForm({ fecha1: hoy }); setMesCalendario(new Date()); onClose(); }} className="text-[10px] font-bold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg">Hoy</button>
          <span className="font-bold text-gray-700 text-sm capitalize">{mesCalendario.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</span>
          <button onClick={() => cambiarMes(1)} className="p-1 hover:bg-gray-100 rounded-full"><ChevronRight size={18} /></button>
        </div>
        <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-medium text-gray-500 mb-1">
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => <div key={d} className="py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {diasEnMes.map((diaInfo, idx) => {
            if (!diaInfo) return <div key={`empty-${idx}`} />;
            const { dia, fecha, disponible } = diaInfo;
            const esPasado = fecha < hoy;
            const esSeleccionado = form.fecha1 === fecha;
            const fueraDeRango = fecha < hoy || fecha > maxDate;
            const sePuedeSeleccionar = !esPasado && !fueraDeRango && disponible;
            return (
              <button
                key={fecha}
                onClick={() => { if (!sePuedeSeleccionar) { if (showToast) showToast('Sin horarios disponibles para esta fecha', 'info'); return; } handleSeleccionarFecha(fecha); }}
                className={`rounded-lg py-1.5 text-xs font-semibold transition-colors ${esSeleccionado ? 'bg-blue-600 text-white' : sePuedeSeleccionar ? 'bg-green-50 text-green-700 border border-green-300 hover:bg-green-100' : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'}`}
              >
                {dia}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex justify-between items-center">
          <button onClick={async () => { const proxima = await buscarProximaFechaDisponible(); if (proxima) { updateForm({ fecha1: proxima }); const nuevaFecha = new Date(proxima + 'T12:00:00'); setMesCalendario(new Date(nuevaFecha.getFullYear(), nuevaFecha.getMonth(), 1)); onClose(); } else if (showToast) showToast('No hay fechas disponibles en el rango.', 'error'); }} className="text-[10px] bg-blue-50 text-blue-700 px-2 py-1 rounded-lg font-bold flex items-center gap-1 hover:bg-blue-100"><ArrowRight size={12} /> Próxima disponible</button>
          <div className="flex gap-2 text-[10px]"><span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-green-100 border border-green-300 rounded"></span> Libre</span><span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-gray-100 border border-gray-200 rounded"></span> Ocupado</span></div>
        </div>
      </div>
    </div>
  );
});