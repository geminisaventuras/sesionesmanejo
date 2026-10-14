// @build: 2026-10-03 | id: FORM-RECURSO | desc: Formulario CRUD para recursos gratuitos (PDFs, videos, documentales)
import { useState, memo } from 'react';
import { Button, Input } from '../../../components/UI';
import { ChevronLeft } from 'lucide-react';

const TIPOS = [
  { id: 'pdf', label: 'PDF' },
  { id: 'video', label: 'Video' },
  { id: 'link', label: 'Enlace' },
  { id: 'infografia', label: 'Infografía' }
];

const FormRecurso = memo(({ item, onSave, onCancel }) => {
  const [form, setForm] = useState(
    item?.id
      ? { ...item }
      : {
          id: '',
          nombre: '',
          descripcion: '',
          tipo: 'pdf',
          url: '',
          icono: '',
          orden: 99,
          activo: true
        }
  );

  const handleSave = () => {
    if (!form.nombre || !form.nombre.trim()) {
      alert('El nombre es obligatorio');
      return;
    }
    if (!form.url || !form.url.trim()) {
      alert('La URL es obligatoria');
      return;
    }
    onSave({
      ...form,
      nombre: form.nombre.trim(),
      descripcion: (form.descripcion || '').trim(),
      url: form.url.trim(),
      orden: Number(form.orden) || 0
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center mb-4">
        <button type="button" onClick={onCancel} className="p-2 bg-gray-200 rounded-full">
          <ChevronLeft size={20} />
        </button>
        <h3 className="font-bold text-lg">{item?.id ? 'Editar' : 'Nuevo'} Recurso</h3>
      </div>

      <Input
        label="Nombre"
        value={form.nombre}
        onChange={e => setForm({ ...form, nombre: e.target.value })}
        placeholder="Ej: Guía de señales de tránsito"
      />

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">Descripción</label>
        <textarea
          value={form.descripcion}
          onChange={e => setForm({ ...form, descripcion: e.target.value })}
          className="w-full bg-gray-50 border-2 border-gray-200 focus:border-blue-500 rounded-xl py-3 px-4 outline-none text-sm min-h-[80px]"
          placeholder="Breve descripción del recurso..."
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">Tipo</label>
          <select
            value={form.tipo}
            onChange={e => setForm({ ...form, tipo: e.target.value })}
            className="w-full bg-gray-50 border-2 border-gray-200 focus:border-blue-500 rounded-xl py-3 px-4 outline-none"
          >
            {TIPOS.map(t => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>
        <Input
          label="Orden"
          type="number"
          value={form.orden || ''}
          onChange={e => setForm({ ...form, orden: Number(e.target.value) || 0 })}
          placeholder="1"
        />
      </div>

      <Input
        label="URL del recurso"
        value={form.url}
        onChange={e => setForm({ ...form, url: e.target.value })}
        placeholder="https://... (o /ruta/local.pdf)"
      />

      <Input
        label="Ícono (opcional)"
        value={form.icono}
        onChange={e => setForm({ ...form, icono: e.target.value })}
        placeholder="Ej: FileText"
      />

      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.activo}
            onChange={e => setForm({ ...form, activo: e.target.checked })}
            className="w-4 h-4"
          />
          <span className="text-sm font-bold text-gray-700">Recurso activo</span>
        </label>
      </div>

      <Button type="button" onClick={handleSave} variant="dark">Guardar Recurso</Button>
    </div>
  );
});

export default FormRecurso;
