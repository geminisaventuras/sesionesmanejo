import { memo } from 'react';

const CarruselModulos = memo(({ modulos, onToggle }) => {
  return (
    <div className="flex gap-2 overflow-x-auto scroll-smooth px-2 py-1 scrollbar-hide" style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}>
      {modulos.map((mod, i) => {
        const esUltimo = i === modulos.length - 1;
        return (
                  <button
            key={i}
            onClick={() => esUltimo && onToggle(mod.nombre, mod.duracion)}
            disabled={!esUltimo}
            className={`flex-shrink-0 flex flex-col items-start gap-0.5 px-3 py-1.5 rounded-2xl text-xs font-bold transition-all scroll-snap-align-start ${
              esUltimo
                ? 'bg-green-100 text-green-700 border border-green-300 cursor-pointer hover:bg-green-200'
                : 'bg-gray-50 text-gray-600 border border-gray-200 cursor-default'
            }`}
            style={{ scrollSnapAlign: 'start' }}
          >
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-green-500 text-white flex items-center justify-center text-[10px]">{i + 1}</span>
              {mod.nombre}
              {esUltimo && <span className="text-[10px] ml-0.5">↩</span>}
            </span>
            {/* A2.8: rango horario compacto 24h — solo si existe */}
            {mod.horaInicio && mod.horaFin && (
              <span className="text-[9px] leading-none font-normal text-gray-400 pl-5">
                {new Date(mod.horaInicio).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Caracas' })}-{new Date(mod.horaFin).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Caracas' })}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
});

export default CarruselModulos;
