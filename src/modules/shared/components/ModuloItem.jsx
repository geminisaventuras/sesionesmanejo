import { Check, Clock, Lock } from 'lucide-react';
import BarraProgresoModulo from './BarraProgresoModulo';

const ESTADO_ICONO = {
  completado: { Icon: Check, fondo: 'bg-green-500 text-white', borde: 'border-green-300', texto: 'text-green-800 line-through', opacidad: '' },
  activo: { Icon: Clock, fondo: 'bg-blue-500 text-white', borde: 'border-blue-300', texto: 'text-gray-800', opacidad: '' },
  excedido: { Icon: Clock, fondo: 'bg-red-500 text-white', borde: 'border-red-400', texto: 'text-red-800', opacidad: '' },
  pendiente: { Icon: Clock, fondo: 'bg-blue-100 text-blue-600', borde: 'border-gray-200 hover:border-blue-300', texto: 'text-gray-800', opacidad: '' },
  bloqueado: { Icon: Lock, fondo: 'bg-gray-100 text-gray-400', borde: 'border-gray-100', texto: 'text-gray-400', opacidad: 'opacity-60' },
};

export default function ModuloItem({ 
  nombre, duracion, estado, onClick, disabled, 
  mostrarBarra, progreso, tiempoActual, esReceso, tiempoExcedido
}) {
  const estadoEfectivo = tiempoExcedido ? 'excedido' : estado;
  const estilo = ESTADO_ICONO[estadoEfectivo] || ESTADO_ICONO.bloqueado;
  const Icono = estilo.Icon;
  const pct = tiempoExcedido ? 100 : Math.min(100, progreso || 0);
  
  const colorBarra = tiempoExcedido ? 'bg-red-500' : 
    (esReceso ? 'bg-blue-400' : 
    (pct >= 90 ? 'bg-red-500' : pct >= 75 ? 'bg-yellow-500' : 'bg-green-500'));

  return (
    <div className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all duration-300 ease-in-out ${estilo.borde} ${estilo.opacidad} ${estadoEfectivo === 'activo' ? 'bg-blue-50 ring-2 ring-blue-300 shadow-md' : ''} ${estadoEfectivo === 'excedido' ? 'bg-red-50 ring-2 ring-red-400 shadow-md' : ''} ${estadoEfectivo === 'completado' ? 'bg-green-50' : ''}`}>
      <button onClick={onClick} disabled={disabled}
        className={`w-full flex items-center gap-3 p-2.5 text-left ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${estilo.fondo}`}>
          <Icono size={12} strokeWidth={3} className={estadoEfectivo === 'activo' ? 'animate-pulse' : ''} />
        </div>
        <span className={`text-sm font-bold flex-1 ${estilo.texto}`}>{nombre}</span>
        {tiempoExcedido && <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full">Tiempo excedido</span>}
        {esReceso && !tiempoExcedido && <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full">Receso</span>}
      </button>
      {mostrarBarra && (
        <BarraProgresoModulo pct={pct} color={colorBarra} tiempo={`${Math.floor(tiempoActual/60)}:${String(tiempoActual%60).padStart(2,'0')} / ${duracion} min`} />
      )}
    </div>
  );
}
