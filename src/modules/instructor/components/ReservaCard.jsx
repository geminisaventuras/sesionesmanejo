// @build: 2026-09-03 | id: INSTRUCTOR-RESERVA-CARD | backup: ReservaCard.backup-20260903-000000 | desc: Tarjeta de reserva para panel del instructor con acciones separadas
import React from 'react';
import { Calendar, Clock, MapPin, Play, Eye } from 'lucide-react';

const ReservaCard = React.memo(function ReservaCard({
  reserva,
  curso,
  horario,
  sede,
  badges,
  puedeIniciarClase,
  onIniciarClase,
  onVerDetalle
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 text-sm truncate">
            {reserva.nombre} {reserva.apellido}
          </h3>
          {curso && (
            <p className="text-xs text-gray-600 mt-0.5 truncate">{curso.nombre}</p>
          )}
        </div>
        {badges && badges.length > 0 && (
          <div className="flex flex-wrap gap-1 ml-2 justify-end">
            {badges.map(badge => (
              <span
                key={badge}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  badge === 'EN CURSO'
                    ? 'bg-green-100 text-green-700'
                    : badge === 'PAGO PENDIENTE'
                    ? 'bg-yellow-100 text-yellow-700'
                    : badge === 'HOY'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {badge}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mb-3">
        {sede && (
          <span className="flex items-center gap-1">
            <MapPin size={12} className="text-gray-400" />
            {sede.nombre}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Calendar size={12} className="text-gray-400" />
          {reserva.fecha}
          {reserva.fecha2 && ` - ${reserva.fecha2}`}
        </span>
        {horario && (
          <span className="flex items-center gap-1">
            <Clock size={12} className="text-gray-400" />
            {horario.label}
          </span>
        )}
      </div>

      <div className="flex gap-2">
        {puedeIniciarClase && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onIniciarClase(reserva);
            }}
            className="flex-1 inline-flex items-center justify-center gap-1 bg-blue-600 text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Play size={14} />
            Iniciar Clase
          </button>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            onVerDetalle(reserva);
          }}
          className="inline-flex items-center justify-center gap-1 bg-gray-100 text-gray-700 text-xs font-bold px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors"
          aria-label={`Ver detalle de ${reserva.nombre} ${reserva.apellido}`}
        >
          <Eye size={14} />
          Ver Detalle
        </button>
      </div>
    </div>
  );
});

export default ReservaCard;
