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
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold transition-all scroll-snap-align-start ${
              esUltimo
                ? 'bg-green-100 text-green-700 border border-green-300 cursor-pointer hover:bg-green-200'
                : 'bg-gray-50 text-gray-400 border border-gray-200 cursor-default'
            }`}
            style={{ scrollSnapAlign: 'start' }}
          >
            <span className="w-4 h-4 rounded-full bg-green-500 text-white flex items-center justify-center text-[10px]">{i + 1}</span>
            {mod.nombre}
            {esUltimo && <span className="text-[10px] ml-0.5">↩</span>}
          </button>
        );
      })}
    </div>
  );
});

export default CarruselModulos;
