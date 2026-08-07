// @build: 2026-06-22.REFACTOR | id: PASO2-CONFIG | desc: Componente puro del paso 2 (configuración de clase). Recibe form, updateForm y catálogos.
import React from 'react';
import { Select } from '../../../components/UI';
import { BookOpen, MapPin, Zap, Bike } from 'lucide-react';

export function Paso2Configuracion({ form, updateForm, cursos, sedes, recargoSinBici }) {
  return (
    <div className="space-y-3">
      {cursos && cursos.length > 0 ? (
        <Select label="Curso" options={(cursos||[]).filter(c=>c.activo)} value={form.cursoId} onChange={e => updateForm({ cursoId: e.target.value })} icon={BookOpen} />
      ) : (
        <div className="mb-4 text-left w-full">
          <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">Curso</label>
          <div className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl py-3 px-4 text-gray-400 flex items-center gap-2"><BookOpen size={20} /> <span>Cargando cursos...</span></div>
        </div>
      )}
      <Select label="Sede" options={(sedes||[]).filter(s=>s.activo)} value={form.sedeId} onChange={e => updateForm({ sedeId: e.target.value })} icon={MapPin} />
      <div className="grid grid-cols-2 gap-3">
        <Select label="Tipo de Moto" options={['Automática','Sincrónica']} value={form.tipoMoto} onChange={e => updateForm({ tipoMoto: e.target.value })} icon={Zap} />
        <Select label="¿Trae moto?" options={['No','Sí']} value={form.traeMoto} onChange={e => updateForm({ traeMoto: e.target.value })} icon={Bike} />
      </div>
      <div className="bg-blue-50 p-3 rounded-xl border border-blue-200">
        <Select label="¿Sabe andar en bicicleta?" options={['Sí','No']} value={form.sabeBicicleta} onChange={e => updateForm({ sabeBicicleta: e.target.value })} icon={Bike} />
        {form.sabeBicicleta === 'No' && <p className="text-xs text-blue-700 font-bold mt-0.5">Recargo por instrucción especial: +${recargoSinBici || 0} USD</p>}
      </div>
    </div>
  );
}