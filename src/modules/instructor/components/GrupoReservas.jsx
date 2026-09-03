// @build: 2026-09-03 | id: INSTRUCTOR-GRUPO-RESERVAS-HORA | backup: GrupoReservas.backup-20260903-000000 | desc: Sección de grupo con validación de hora para iniciar clase
import React from 'react';
import ReservaCard from './ReservaCard';
import { esReservaEnCurso } from '../utils/reservasHelpers';

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
          const badges = [];
          const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });
          if (r.fecha === hoy || r.fecha2 === hoy) badges.push('HOY');
          if (r.estadoPago === 'Pendiente') badges.push('PAGO PENDIENTE');
          if (r.estadoCurso === 'Aprobado') badges.push('COMPLETADA');

          const puedeIniciarClase =
            r.estadoPago === 'Aprobado' &&
            r.estadoCurso !== 'Aprobado' &&
            esReservaEnCurso(r, horario);

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
