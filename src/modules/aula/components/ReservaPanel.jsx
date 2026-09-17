import { Clock } from 'lucide-react';

const formatoTiempo = (segundos) => {
  const s = Number(segundos) || 0;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

export default function ReservaPanel({ tiempoReservaSegundos }) {
  if (!tiempoReservaSegundos || tiempoReservaSegundos <= 0) return null;

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Clock size={16} className="text-yellow-600" />
        <span className="text-sm font-bold text-yellow-900">Reserva disponible</span>
      </div>
      <span className="text-base font-black text-yellow-700">{formatoTiempo(tiempoReservaSegundos)}</span>
    </div>
  );
}