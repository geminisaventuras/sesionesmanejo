// @build: 2026-06-22 | id: FORM-HORARIO | desc: Formulario de horario extraído de AdminConfigHub
import { useState, memo } from 'react';
import { Button, Input } from '../../../components/UI';
import { ChevronLeft } from 'lucide-react';

const FormHorario = memo(({ item, onSave, onCancel }) => {
  const [form, setForm] = useState(item.id ? item : { label: '', isLunch: false });
  return (<div className="space-y-4"><div className="flex gap-2 items-center mb-4"><button type="button" onClick={onCancel} className="p-2 bg-gray-200 rounded-full"><ChevronLeft size={20} /></button><h3 className="font-bold text-lg">{item.id ? 'Editar' : 'Nuevo'} Horario</h3></div><Input label="Rango (Ej: 08:00 AM - 10:00 AM)" value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} /><div className="flex items-center gap-2 p-4 bg-gray-50 border rounded-xl"><input type="checkbox" checked={form.isLunch} onChange={e => setForm({ ...form, isLunch: e.target.checked })} className="w-5 h-5" /><label className="font-bold text-sm text-gray-700">Es bloque de almuerzo (No reservable)</label></div><Button type="button" onClick={() => onSave(form)} variant="dark">Guardar Horario</Button></div>);
});

export default FormHorario;