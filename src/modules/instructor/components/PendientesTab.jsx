// @build: 2026-09-03 | id: INSTRUCTOR-PENDIENTES-TAB-SKELETON | backup: PendientesTab.backup-20260903-000000 | desc: Pendientes con skeleton loaders y orden por hora
import React, { useState, useMemo, useCallback } from 'react';
import { Calendar } from 'lucide-react';
import { obtenerFechaVenezuela } from '../../shared/utils/zonahoraria';
import { agruparReservasPorPeriodo, ordenarReservasPorFechaHora, ordenarPorHora } from '../utils/reservasHelpers';
import FiltrosReservas from './FiltrosReservas';
import GrupoReservas from './GrupoReservas';
import ReservaCardSkeleton from './ReservaCardSkeleton';
import EmptyState from '../../shared/components/EmptyState';

export default function PendientesTab({
  reservas,
  cargando,
  cursos,
  horarios,
  sedes,
  onIniciarClase,
  onVerDetalle
}) {
  const [filtros, setFiltros] = useState({
    busqueda: '',
    sedeId: '',
    cursoId: '',
    estadoPago: 'Todos',
    traeMoto: 'Todos',
    fechaDesde: '',
    fechaHasta: ''
  });

  const hoy = obtenerFechaVenezuela();

  const reservasActivas = useMemo(() => {
    return reservas.filter(r => {
      if (r.estadoCurso === 'Aprobado') return false;
      if (r.fecha2) return r.fecha2 >= hoy;
      return r.fecha >= hoy;
    });
  }, [reservas, hoy]);

  const ordenadas = useMemo(() => ordenarReservasPorFechaHora(reservasActivas, horarios), [reservasActivas, horarios]);

  const filtradas = useMemo(() => {
    const busqueda = filtros.busqueda.toLowerCase().trim();
    return ordenadas.filter(r => {
      if (busqueda && !`${r.nombre} ${r.apellido}`.toLowerCase().includes(busqueda)) return false;
      if (filtros.sedeId && String(r.sedeId) !== String(filtros.sedeId)) return false;
      if (filtros.cursoId && String(r.cursoId) !== String(filtros.cursoId)) return false;
      if (filtros.estadoPago !== 'Todos' && r.estadoPago !== filtros.estadoPago) return false;
      if (filtros.traeMoto !== 'Todos' && r.traeMoto !== filtros.traeMoto) return false;
      if (filtros.fechaDesde && r.fecha < filtros.fechaDesde) return false;
      if (filtros.fechaHasta && r.fecha > filtros.fechaHasta) return false;
      return true;
    });
  }, [ordenadas, filtros]);

  const grupos = useMemo(() => agruparReservasPorPeriodo(filtradas, hoy), [filtradas, hoy]);

  const handleLimpiar = useCallback(() => {
    setFiltros({
      busqueda: '',
      sedeId: '',
      cursoId: '',
      estadoPago: 'Todos',
      traeMoto: 'Todos',
      fechaDesde: '',
      fechaHasta: ''
    });
  }, []);

  if (cargando) {
    return (
      <div className="space-y-4" aria-busy="true">
        <div className="h-40 bg-gray-100 rounded-2xl animate-pulse"></div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => <ReservaCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <FiltrosReservas filtros={filtros} setFiltros={setFiltros} cursos={cursos} sedes={sedes} onLimpiar={handleLimpiar} />

      <div aria-live="polite" aria-atomic="true">
        <p className="text-xs font-bold text-gray-500">{filtradas.length} clases encontradas</p>
      </div>

      {filtradas.length === 0 ? (
        <EmptyState icon={Calendar} title="Sin resultados" description="No se encontraron clases con los filtros seleccionados." />
      ) : (
        <div className="space-y-4">
          <GrupoReservas titulo="Hoy" reservas={ordenarPorHora(grupos.hoy, horarios)} cursos={cursos} horarios={horarios} sedes={sedes} onIniciarClase={onIniciarClase} onVerDetalle={onVerDetalle} />
          <GrupoReservas titulo="Mañana" reservas={grupos.manana} cursos={cursos} horarios={horarios} sedes={sedes} onIniciarClase={onIniciarClase} onVerDetalle={onVerDetalle} />
          <GrupoReservas titulo="Próximos 7 días" reservas={grupos.proximos7Dias} cursos={cursos} horarios={horarios} sedes={sedes} onIniciarClase={onIniciarClase} onVerDetalle={onVerDetalle} />
          <GrupoReservas titulo="Después" reservas={grupos.despues} cursos={cursos} horarios={horarios} sedes={sedes} onIniciarClase={onIniciarClase} onVerDetalle={onVerDetalle} />
        </div>
      )}
    </div>
  );
}
