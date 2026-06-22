// @build: 2026-06-22 | id: FORM-CURSOS | desc: Formulario de curso extraído de AdminConfigHub
import { useState, memo } from 'react';
import { Button, Input } from '../../../components/UI';
import { ChevronLeft, Clock, Plus, Equal, Minus } from 'lucide-react';

const FormCursos = memo(({ item, onSave, onCancel }) => {
  const inicializarModulos = (itemData) => {
    const mods = itemData.modulos || [''];
    if (mods.length > 0 && typeof mods[0] === 'string') return mods.map(nombre => ({ nombre, duracion: 0 }));
    return mods.map(m => typeof m === 'string' ? { nombre: m, duracion: 0 } : { ...m });
  };
  const [form, setForm] = useState({
    nombre: item?.id ? item.nombre : '',
    duracionTotal: item?.id ? (item.duracionTotal || 0) : 0,
    modulos: inicializarModulos(item?.id ? item : { modulos: [''] })
  });
  const tiempoAsignado = form.modulos.reduce((acc, mod) => acc + (Number(mod.duracion) || 0), 0);
  const tiempoRestante = (Number(form.duracionTotal) || 0) - tiempoAsignado;
  const hayExcedente = tiempoRestante < 0;
  const distribucionExacta = tiempoRestante === 0 && form.duracionTotal > 0;
  const handleDuracionTotalChange = (e) => setForm(prev => ({ ...prev, duracionTotal: Number(e.target.value) || 0 }));
  const handleModuloNombreChange = (idx, nombre) => setForm(prev => ({ ...prev, modulos: prev.modulos.map((m, i) => i === idx ? { ...m, nombre } : m) }));
  const handleModuloDuracionChange = (idx, duracion) => setForm(prev => ({ ...prev, modulos: prev.modulos.map((m, i) => i === idx ? { ...m, duracion: Number(duracion) || 0 } : m) }));
  const agregarModulo = () => setForm(prev => ({ ...prev, modulos: [...prev.modulos, { nombre: '', duracion: 0 }] }));
  const eliminarModulo = (idx) => setForm(prev => ({ ...prev, modulos: prev.modulos.filter((_, i) => i !== idx) }));
  const distribuirEquitativamente = () => {
    const total = Number(form.duracionTotal) || 0;
    const cant = form.modulos.length;
    if (total <= 0 || cant <= 0) return;
    const porModulo = Math.floor(total / cant);
    const sobrante = total - porModulo * cant;
    setForm(prev => ({ ...prev, modulos: prev.modulos.map((m, i) => ({ ...m, duracion: porModulo + (i === 0 ? sobrante : 0) })) }));
  };
  const handleSave = () => {
    if (hayExcedente) { alert(`Hay un excedente de ${Math.abs(tiempoRestante)} minutos. Ajuste las duraciones.`); return; }
    if (form.modulos.some(m => !m.nombre.trim())) { alert('Todos los módulos deben tener un nombre.'); return; }
    onSave({ ...form, modulos: form.modulos.filter(m => m.nombre.trim() !== '') });
  };
  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center mb-4"><button type="button" onClick={onCancel} className="p-2 bg-gray-200 rounded-full"><ChevronLeft size={20} /></button><h3 className="font-bold text-lg">{item?.id ? 'Editar' : 'Nuevo'} Curso</h3></div>
      <Input label="Nombre del Curso" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
      <Input label="Duración Total del Curso (minutos)" type="number" value={form.duracionTotal || ''} onChange={handleDuracionTotalChange} icon={Clock} />
      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-bold text-gray-700">Módulos</label>
          <button type="button" onClick={distribuirEquitativamente} disabled={!form.duracionTotal || form.modulos.length === 0} className="text-xs font-bold text-blue-600 flex items-center gap-1 disabled:opacity-40"><Equal size={14} /> Distribuir equitativamente</button>
        </div>
        {form.modulos.map((mod, i) => (
          <div key={i} className="flex gap-2 mb-2 items-start">
            <input className="flex-1 bg-white border-2 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder={`Módulo ${i + 1}`} value={mod.nombre} onChange={e => handleModuloNombreChange(i, e.target.value)} />
            <input type="number" className="w-20 bg-white border-2 rounded-lg px-2 py-2 text-sm outline-none focus:border-blue-500 text-center" placeholder="Min" value={mod.duracion || ''} onChange={e => handleModuloDuracionChange(i, e.target.value)} />
            {form.modulos.length > 1 && <button type="button" onClick={() => eliminarModulo(i)} className="p-2 text-red-400 hover:text-red-600"><Minus size={16} /></button>}
          </div>
        ))}
        <Button type="button" onClick={agregarModulo} variant="outline" className="!py-2 text-sm mt-2 bg-white" icon={Plus}>Añadir Módulo</Button>
        {form.duracionTotal > 0 && (
          <div className={`mt-3 p-3 rounded-xl text-center text-sm font-bold ${hayExcedente ? 'bg-red-50 text-red-700 border border-red-200' : distribucionExacta ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
            {hayExcedente ? `⚠️ Excedente: ${Math.abs(tiempoRestante)} min de más` : distribucionExacta ? '✅ Tiempo perfectamente distribuido' : `⏳ Te quedan ${tiempoRestante} min por asignar`}
          </div>
        )}
      </div>
      <Button type="button" onClick={handleSave} variant="dark">Guardar Curso</Button>
    </div>
  );
});

export default FormCursos;