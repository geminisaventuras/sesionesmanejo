import { useState, useEffect, memo } from 'react';
import { HelpCircle } from 'lucide-react';
import { CloudRain, Wrench, AlertTriangle } from 'lucide-react';

const MOTIVOS_ICON_MAP = {
  'Lluvia': CloudRain,
  'Falla mecánica': Wrench,
  'Est. indispuesto': AlertTriangle
};

const formatoTiempo = (segundos) => {
  const s = Number(segundos) || 0;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

const RelojSesion = memo(({ generalSegundos, pausaActiva, pausaMotivo, tiempoMaximoCurso, tiempoConsumido, conexionPerdida }) => {
  const [tick, setTick] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const pct = tiempoMaximoCurso > 0 ? Math.min(100, ((tiempoConsumido * 60 + generalSegundos) / (tiempoMaximoCurso * 60)) * 100) : 0;
  const circumference = 2 * Math.PI * 34;
  const offset = circumference - (pct / 100) * circumference;
  
  const esPausa = !!pausaActiva;
  const colorAnillo = esPausa ? '#f97316' : 'white';
  const colorFondo = esPausa ? 'rgba(249,115,22,0.2)' : 'rgba(255,255,255,0.2)';
  
  const MotivoIcon = esPausa ? (MOTIVOS_ICON_MAP[pausaMotivo] || HelpCircle) : null;
  const tiempoFormateado = formatoTiempo(esPausa ? 0 : generalSegundos);

  if (conexionPerdida) {
    return (
      <div className="flex items-center justify-center w-20 h-20">
        <span className="text-[10px] font-bold text-gray-400 text-center">Reconectando...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 76 76">
          <circle cx="38" cy="38" r="34" fill="none" stroke={colorFondo} strokeWidth="5" />
          <circle cx="38" cy="38" r="34" fill="none" stroke={colorAnillo} strokeWidth="5"
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
            className="transition-all duration-1000 ease-linear" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {esPausa && MotivoIcon ? (
            <>
              <MotivoIcon size={24} className="text-orange-300 mb-0.5" />
              <span className="text-[10px] font-bold text-orange-200">{pausaMotivo}</span>
            </>
          ) : (
            <>
              <span className="text-lg font-black leading-none text-white">{tiempoFormateado.split(':')[0]}</span>
              <span className="text-[10px] font-bold leading-none text-white">{tiempoFormateado.split(':')[1]}s</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

export default RelojSesion;
