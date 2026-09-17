import { useMemo } from 'react';
import { Calendar, Lock, Bike } from 'lucide-react';

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function ProveedorMiniCalendario({ bloqueos = [], reservas = [], mesActual, onFechaClick }) {
  const diasDelMes = useMemo(() => {
    const año = mesActual.getFullYear();
    const mes = mesActual.getMonth();
    const primerDia = new Date(año, mes, 1);
    const ultimoDia = new Date(año, mes + 1, 0);
    const dias = [];
    for (let d = new Date(primerDia); d <= ultimoDia; d.setDate(d.getDate() + 1)) {
      dias.push(new Date(d));
    }
    // Calcular cuántas celdas vacías se necesitan al inicio
    const primerDiaSemana = primerDia.getDay(); // 0 = Domingo, 1 = Lunes, ...
    const diasConOffset = [];
    for (let i = 0; i < primerDiaSemana; i++) {
      diasConOffset.push(null); // celdas vacías
    }
    return [...diasConOffset, ...dias];
  }, [mesActual]);

  const tieneBloqueo = (fecha) => {
    const fechaISO = fecha.toISOString().split('T')[0];
    return bloqueos.some(b => b.fecha === fechaISO);
  };

  const tieneReserva = (fecha) => {
    const fechaISO = fecha.toISOString().split('T')[0];
    return reservas.some(r => r.fecha === fechaISO || r.fecha2 === fechaISO);
  };

  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
      <h3 className="text-lg font-black text-gray-900 uppercase flex items-center gap-2 mb-3">
        <Calendar size={18} className="text-blue-500" />
        Ocupación del Mes
      </h3>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {DIAS_SEMANA.map(dia => (
          <div key={dia} className="text-center text-xs font-bold text-gray-500 py-1">{dia}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {diasDelMes.map((dia, i) => {
          if (!dia) {
            return <div key={`empty-${i}`} className="p-2 rounded-lg" />;
          }
          const bloqueado = tieneBloqueo(dia);
          const reservado = tieneReserva(dia);
          const esHoy = dia.toDateString() === new Date().toDateString();
          return (
            <button
              key={i}
              onClick={() => onFechaClick && onFechaClick(dia)}
              className={`relative p-2 rounded-lg text-sm font-medium transition-colors ${
                esHoy ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100 text-gray-700'
              } ${bloqueado ? 'bg-red-50 border border-red-200' : ''} ${reservado && !bloqueado ? 'bg-blue-50 border border-blue-200' : ''}`}
            >
              {dia.getDate()}
              {bloqueado && <Lock size={10} className="absolute top-0.5 right-0.5 text-red-500" />}
              {reservado && !bloqueado && <Bike size={10} className="absolute top-0.5 right-0.5 text-blue-500" />}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex gap-4 text-xs text-gray-600 flex-wrap">
        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-50 border border-red-200 rounded" /> Día con bloqueos</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-50 border border-blue-200 rounded" /> Día con reservas</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-100 rounded" /> Hoy</div>
      </div>
    </div>
  );
}