// @build: 2026-09-03 | id: INSTRUCTOR-RESUMEN-TAB-FIX-FECHAS-HISTORIAL | backup: ResumenTab.backup-20260903-000000 | desc: Resumen con filtro de fechas pasadas y botón a historial
import React, { useMemo } from 'react';
import { Calendar, History } from 'lucide-react';
import { obtenerFechaVenezuela } from '../../shared/utils/zonahoraria';
import { agruparReservasPorPeriodo, ordenarReservasPorFechaHora } from '../utils/reservasHelpers';
import GrupoReservas from './GrupoReservas';
import EmptyState from '../../shared/components/EmptyState';
import { Button } from '../../../components/UI';

export default function ResumenTab({
  reservas,
  cursos,
  horarios,
  sedes,
  onIniciarClase,
  onVerDetalle,
  onVerTodasPendientes,
  onVerHistorial
}) {
  const hoy = obtenerFechaVenezuela();

  const activas = useMemo(() => {
    return reservas.filter(r => {
      if (r.estadoCurso === 'Aprobado') return false;
      if (r.fecha2) return r.fecha2 >= hoy;
      return r.fecha >= hoy;
    });
  }, [reservas, hoy]);

  const completadas = useMemo(
    () => reservas.filter(r => r.estadoCurso === 'Aprobado'),
    [reservas]
  );

  const ordenadas = useMemo(
    () => ordenarReservasPorFechaHora(activas, horarios),
    [activas, horarios]
  );

  const grupos = useMemo(
    () => agruparReservasPorPeriodo(ordenadas, hoy),
    [ordenadas, hoy]
  );

  const clasesHoy = grupos.hoy.length;
  const ultimasCompletadas = useMemo(
    () => [...completadas].reverse().slice(0, 3),
    [completadas]
  );

  return (
    <div className="space-y-4">
      <div className="bg-blue-600 text-white p-5 rounded-3xl shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>
        <p className="text-blue-200 text-xs font-bold uppercase tracking-wide">Clases hoy</p>
        <h2 className="text-4xl font-black mt-1">{clasesHoy}</h2>
        <p className="text-blue-200 text-xs mt-2">
          {activas.length} activas · {completadas.length} completadas
        </p>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-gray-900 uppercase tracking-widest">Próximas Clases</h2>
        {activas.length > 0 && (
          <button onClick={onVerTodasPendientes} className="text-xs text-blue-600 font-bold">
            Ver todas ({activas.length})
          </button>
        )}
      </div>

      {activas.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No tienes clases activas"
          description="Cuando tengas clases programadas, aparecerán aquí."
        />
      ) : (
        <>
          <GrupoReservas titulo="Hoy" reservas={grupos.hoy} cursos={cursos} horarios={horarios} sedes={sedes} onIniciarClase={onIniciarClase} onVerDetalle={onVerDetalle} />
          <GrupoReservas titulo="Mañana" reservas={grupos.manana} cursos={cursos} horarios={horarios} sedes={sedes} onIniciarClase={onIniciarClase} onVerDetalle={onVerDetalle} />
          <GrupoReservas titulo="Próximos 7 días" reservas={grupos.proximos7Dias} cursos={cursos} horarios={horarios} sedes={sedes} onIniciarClase={onIniciarClase} onVerDetalle={onVerDetalle} />
          <GrupoReservas titulo="Después" reservas={grupos.despues} cursos={cursos} horarios={horarios} sedes={sedes} onIniciarClase={onIniciarClase} onVerDetalle={onVerDetalle} />
        </>
      )}

      {ultimasCompletadas.length > 0 && (
        <div className="mt-4">
          <h2 className="text-lg font-black text-gray-900 uppercase tracking-widest mb-2">Últimas Completadas</h2>
          <div className="space-y-2">
            {ultimasCompletadas.map(r => (
              <div key={r.id} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                <div>
                  <p className="font-bold text-sm text-gray-900">{r.nombre} {r.apellido}</p>
                  <p className="text-xs text-gray-500">{r.fecha}</p>
                </div>
                <span className="text-[10px] text-green-600 font-bold bg-green-50 px-2 py-1 rounded border border-green-200">Completada</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 text-center">
        <Button type="button" onClick={onVerHistorial} variant="outline" icon={History}>
          Ver historial completo
        </Button>
      </div>
    </div>
  );
}
