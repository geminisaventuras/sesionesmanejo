// @build: 2026-08-30.15-00-00 | id: RESERVA-ACTIVA-PANEL | backup: ReservaActivaPanel.jsx.backup-20260830-150000 | desc: Panel con reloj de reserva activa y controles
import { Timer, Pause, Play, Square } from 'lucide-react';

function formatearSegundos(segundos) {
  const mins = Math.floor(segundos / 60);
  const segs = segundos % 60;
  return `${mins}:${String(segs).padStart(2, '0')}`;
}

export default function ReservaActivaPanel({
  reservaRestante,
  reservaActiva,
  onPausar,
  onReanudar,
  onDetener
}) {
  const minutosRestantes = Math.floor(reservaRestante / 60);
  const colorPrincipal = minutosRestantes > 10 ? 'text-green-600' : minutosRestantes > 5 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-300 rounded-xl p-5 shadow-md">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Timer className="w-6 h-6 text-purple-600" />
          <h3 className="font-bold text-purple-900">Reserva de Tiempo</h3>
        </div>
        {reservaActiva && (
          <span className="bg-green-100 text-green-700 text-xs font-medium px-2 py-1 rounded-full">En uso</span>
        )}
        {!reservaActiva && (
          <span className="bg-yellow-100 text-yellow-700 text-xs font-medium px-2 py-1 rounded-full">Pausada</span>
        )}
      </div>

      <div className="text-center mb-4">
        <div className={`text-4xl font-black ${colorPrincipal} font-mono`}>
          {formatearSegundos(reservaRestante)}
        </div>
        <p className="text-sm text-purple-700 mt-1">Tiempo restante de reserva</p>
      </div>

      <div className="flex gap-2">
        {reservaActiva ? (
          <>
            <button onClick={onPausar} className="flex-1 bg-yellow-500 text-white py-2 rounded-lg font-medium hover:bg-yellow-600 flex items-center justify-center gap-2">
              <Pause className="w-4 h-4" /> Pausar
            </button>
            <button onClick={onDetener} className="flex-1 bg-red-500 text-white py-2 rounded-lg font-medium hover:bg-red-600 flex items-center justify-center gap-2">
              <Square className="w-4 h-4" /> Detener
            </button>
          </>
        ) : (
          <>
            <button onClick={onReanudar} className="flex-1 bg-green-500 text-white py-2 rounded-lg font-medium hover:bg-green-600 flex items-center justify-center gap-2">
              <Play className="w-4 h-4" /> Reanudar
            </button>
            <button onClick={onDetener} className="flex-1 bg-red-500 text-white py-2 rounded-lg font-medium hover:bg-red-600 flex items-center justify-center gap-2">
              <Square className="w-4 h-4" /> Detener
            </button>
          </>
        )}
      </div>

      <p className="text-xs text-purple-600 mt-3 text-center">
        Tiempo no trabajado por pausas que puedes usar ahora
      </p>
    </div>
  );
}