// @build: 2026-06-22 | id: FORM-MOTO | desc: Formulario de moto extraído de AdminConfigHub
import { useState, memo, useContext } from 'react';
import { AppContext } from '../../../context/AppContextValue';
import { Button, Input, Select } from '../../../components/UI';
import { ChevronLeft } from 'lucide-react';

const FormMoto = memo(({ item, onSave, onCancel }) => {
  const { proveedores, sedes } = useContext(AppContext);
  const [form, setForm] = useState(item.id ? item : { marca: '', modelo: '', cilindrada: '', tipo: '', proveedorId: '', sedes: [] });
  return (<div className="space-y-4"><div className="flex gap-2 items-center mb-4"><button type="button" onClick={onCancel} className="p-2 bg-gray-200 rounded-full"><ChevronLeft size={20} /></button><h3 className="font-bold text-lg">{item.id ? 'Editar' : 'Nueva'} Moto</h3></div><Select label="Proveedor Dueño" options={proveedores || []} value={form.proveedorId} onChange={e => setForm({ ...form, proveedorId: e.target.value })} /><Input label="Marca" value={form.marca} onChange={e => setForm({ ...form, marca: e.target.value })} /><Input label="Modelo" value={form.modelo} onChange={e => setForm({ ...form, modelo: e.target.value })} /><Input label="Cilindrada (ej. 150cc)" value={form.cilindrada} onChange={e => setForm({ ...form, cilindrada: e.target.value })} /><Select label="Tipo" options={['Automática', 'Sincrónica']} value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} /><div className="bg-white p-4 rounded-xl border border-gray-200"><h4 className="text-sm font-bold text-gray-700 mb-3">Sedes donde estará disponible</h4><div className="flex flex-col gap-2">{(sedes || []).filter(s => s.activo).map(s => <label key={s.id} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg cursor-pointer"><input type="checkbox" checked={form.sedes?.includes(s.id)} onChange={() => setForm({ ...form, sedes: form.sedes?.includes(s.id) ? form.sedes.filter(id => id !== s.id) : [...(form.sedes || []), s.id] })} className="w-5 h-5 text-blue-600 rounded" /><span className="font-bold text-gray-800">{s.nombre}</span></label>)}</div></div><Button type="button" onClick={() => onSave(form)} variant="dark">Guardar Moto</Button></div>);
});

export default FormMoto;