// @build: 2026-09-03 | id: INSTRUCTOR-FILTROS-RESERVAS | backup: FiltrosReservas.backup-20260903-000000 | desc: Filtros avanzados para reservas del instructor (selects nativos)
import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '../../../components/UI';

export default function FiltrosReservas({
  filtros,
  setFiltros,
  cursos,
  sedes,
  onLimpiar
}) {
  const [busquedaLocal, setBusquedaLocal] = useState(filtros.busqueda || '');
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setFiltros(prev => ({ ...prev, busqueda: busquedaLocal }));
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [busquedaLocal, setFiltros]);

  const handleChange = (campo, valor) => {
    setFiltros(prev => ({ ...prev, [campo]: valor }));
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 space-y-3">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={busquedaLocal}
          onChange={e => setBusquedaLocal(e.target.value)}
          placeholder="Buscar por nombre o apellido..."
          className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-bold text-gray-600 block mb-1">Sede</label>
          <select
            value={filtros.sedeId || ''}
            onChange={e => handleChange('sedeId', e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
          >
            <option value="">Todas</option>
            {sedes?.map(s => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-600 block mb-1">Curso</label>
          <select
            value={filtros.cursoId || ''}
            onChange={e => handleChange('cursoId', e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
          >
            <option value="">Todos</option>
            {cursos?.map(c => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-600 block mb-1">Pago</label>
          <select
            value={filtros.estadoPago || 'Todos'}
            onChange={e => handleChange('estadoPago', e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
          >
            <option value="Todos">Todos</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Aprobado">Aprobado</option>
            <option value="Rechazado">Rechazado</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-600 block mb-1">Trae moto</label>
          <select
            value={filtros.traeMoto || 'Todos'}
            onChange={e => handleChange('traeMoto', e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
          >
            <option value="Todos">Todos</option>
            <option value="Sí">Sí</option>
            <option value="No">No</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-bold text-gray-600 block mb-1">Desde</label>
          <input
            type="date"
            value={filtros.fechaDesde || ''}
            onChange={e => handleChange('fechaDesde', e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-600 block mb-1">Hasta</label>
          <input
            type="date"
            value={filtros.fechaHasta || ''}
            onChange={e => handleChange('fechaHasta', e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="button" onClick={onLimpiar} variant="outline" className="!py-1.5 !text-xs">
          <X size={14} className="mr-1" />
          Limpiar filtros
        </Button>
      </div>
    </div>
  );
}
