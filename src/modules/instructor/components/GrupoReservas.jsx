// @build: 2026-09-03 | id: INSTRUCTOR-GRUPO-RESERVAS-DIA | backup: GrupoReservas.backup-20260903-000000 | desc: Botón iniciar clase disponible todo el día de la reserva
import React from 'react';
import ReservaCard from './ReservaCard';
import { obtenerDiaReserva } from '../utils/reservasHelpers';

export default function GrupoReservas({
  titulo,
  reservas,
  cursos,
  horarios,
  sedes,
  onIniciarClase,
  onVerDetalle
}) {
  if (!reservas || reservas.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-black text-gray-700 uppercase tracking-widest">{titulo}</h3>
        <span className="text-xs font-bold text-gray-500">{reservas.length}</span>
      </div>
      <div className="space-y-2">
        {reservas.map(r => {
          const curso = cursos?.find(c => String(c.id) === String(r.cursoId));
          const horario = horarios?.find(h => String(h.id) === String(r.horaId));
          const sede = sedes?.find(s => String(s.id) === String(r.sedeId));
          const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });
          const badges = [];

          if (r.fecha === hoy || r.fecha2 === hoy) badges.push('HOY');
          if (obtenerDiaReserva(r, hoy) === 2) badges.push('D2');
          if (r.estadoPago === 'Pendiente') badges.push('PAGO PENDIENTE');
          if (r.estadoCurso === 'Aprobado') badges.push('COMPLETADA');

          // Disponible todo el día de la clase (fecha o fecha2 igual a hoy)
          const puedeIniciarClase =
            r.estadoPago === 'Aprobado' &&
            r.estadoCurso !== 'Aprobado' &&
            (r.fecha === hoy || r.fecha2 === hoy);

          return (
            <ReservaCard
              key={r.id}
              reserva={r}
              curso={curso}
              horario={horario}
              sede={sede}
              badges={badges}
              puedeIniciarClase={puedeIniciarClase}
              onIniciarClase={onIniciarClase}
              onVerDetalle={onVerDetalle}
            />
          );
        })}
      </div>
    </div>
  );
}
