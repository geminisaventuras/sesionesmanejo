// @build: 2026-06-22 | id: FORM-SEDE | desc: Formulario de sede extraído de AdminConfigHub
import { useState, memo } from 'react';
import { Button, Input } from '../../../components/UI';
import { ChevronLeft } from 'lucide-react';

const FormSede = memo(({ item, onSave, onCancel }) => {
  const [form, setForm] = useState(item.id ? item : { nombre: '', direccion: '' });
  return (<div className="space-y-4"><div className="flex gap-2 items-center mb-4"><button type="button" onClick={onCancel} className="p-2 bg-gray-200 rounded-full"><ChevronLeft size={20} /></button><h3 className="font-bold text-lg">{item.id ? 'Editar' : 'Nueva'} Sede</h3></div><Input label="Nombre de la Sede" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} /><Input label="Dirección / Ubicación" value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} /><Button type="button" onClick={() => onSave(form)} variant="dark">Guardar Sede</Button></div>);
});

export default FormSede;