// @build: 2026-09-03 | id: INSTRUCTOR-HISTORIAL-TAB | backup: HistorialTab.backup-20260903-000000 | desc: Vista de historial de reservas pasadas o completadas en modo solo lectura
import React, { useMemo } from 'react';
import { History, ArrowLeft } from 'lucide-react';
import { obtenerFechaVenezuela } from '../../shared/utils/zonahoraria';
import ReservaCard from './ReservaCard';
import EmptyState from '../../shared/components/EmptyState';

export default function HistorialTab({
  reservas,
  cursos,
  horarios,
  sedes,
  onVerDetalle,
  onVolver
}) {
  const hoyStr = obtenerFechaVenezuela();

  const reservasHistoricas = useMemo(() => {
    return reservas
      .filter(r => {
        const fechaFin = r.fecha2 || r.fecha;
        const esPasada = fechaFin < hoyStr;
        const esCompletada = r.estadoCurso === 'Aprobado';
        return esPasada || esCompletada;
      })
      .sort((a, b) => {
        const fechaA = a.fecha2 || a.fecha;
        const fechaB = b.fecha2 || b.fecha;
        return fechaB.localeCompare(fechaA);
      });
  }, [reservas, hoyStr]);

  const reservasVisibles = useMemo(() => reservasHistoricas.slice(0, 100), [reservasHistoricas]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onVolver}
          className="p-1.5 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
          aria-label="Volver al resumen"
        >
          <ArrowLeft size={18} className="text-gray-700" />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-black text-gray-900 uppercase tracking-widest">Historial de Clases</h2>
          <p className="text-xs text-gray-500">Vista de solo lectura · {reservasVisibles.length} reservas</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <History size={16} className="text-blue-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-900">Historial completo de clases</p>
            <p className="text-xs text-blue-700">Incluye clases completadas, canceladas y vencidas sin completar.</p>
          </div>
        </div>
      </div>

      {reservasHistoricas.length > 100 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-xs text-yellow-800">
            Mostrando las últimas 100 reservas de un total de {reservasHistoricas.length}.
            Para ver el historial completo, contacta a administración.
          </p>
        </div>
      )}

      {reservasVisibles.length === 0 ? (
        <EmptyState
          icon={History}
          title="No hay historial todavía"
          description="Cuando completes o venzan clases, aparecerán aquí"
        />
      ) : (
        <div className="space-y-2">
          {reservasVisibles.map(r => {
            const curso = cursos?.find(c => String(c.id) === String(r.cursoId));
            const horario = horarios?.find(h => String(h.id) === String(r.horaId));
            const sede = sedes?.find(s => String(s.id) === String(r.sedeId));
            const badges = [];
            if (r.estadoCurso === 'Aprobado') badges.push('COMPLETADA');
            if (r.estadoCurso === 'Rechazado') badges.push('RECHAZADA');
            if (r.estadoCurso === 'Cancelado') badges.push('CANCELADA');
            if (r.estadoPago === 'Pendiente') badges.push('PAGO PENDIENTE');
            if (r.estadoPago === 'Rechazado') badges.push('PAGO RECHAZADO');

            return (
              <ReservaCard
                key={r.id}
                reserva={r}
                curso={curso}
                horario={horario}
                sede={sede}
                badges={badges}
                puedeIniciarClase={false}
                onVerDetalle={onVerDetalle}
                onIniciarClase={() => {}}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
