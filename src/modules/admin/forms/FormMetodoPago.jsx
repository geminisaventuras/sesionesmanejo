// @build: 2026-09-16 | id: FORM-METODO-PAGO | desc: Formulario CRUD para metodos de pago configurables
import { useState, memo } from 'react';
import { Button, Input } from '../../../components/UI';
import { ChevronLeft } from 'lucide-react';

const FormMetodoPago = memo(({ item, onSave, onCancel }) => {
  const [form, setForm] = useState(
    item?.id
      ? { ...item }
      : {
          id: '',
          nombre: '',
          requiereReferencia: false,
          requiereBanco: false,
          orden: 99,
          activo: true
        }
  );

  const handleSave = () => {
    if (!form.nombre || !form.nombre.trim()) {
      alert('El nombre es obligatorio');
      return;
    }
    onSave({
      ...form,
      nombre: form.nombre.trim(),
      orden: Number(form.orden) || 0
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center mb-4">
        <button type="button" onClick={onCancel} className="p-2 bg-gray-200 rounded-full">
          <ChevronLeft size={20} />
        </button>
        <h3 className="font-bold text-lg">{item?.id ? 'Editar' : 'Nuevo'} Método de Pago</h3>
      </div>

      <Input
        label="Nombre"
        value={form.nombre}
        onChange={e => setForm({ ...form, nombre: e.target.value })}
        placeholder="Ej: Pago Móvil"
      />

      <Input
        label="Orden (para listado)"
        type="number"
        value={form.orden || ''}
        onChange={e => setForm({ ...form, orden: Number(e.target.value) || 0 })}
        placeholder="1"
      />

      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.requiereReferencia}
            onChange={e => setForm({ ...form, requiereReferencia: e.target.checked })}
            className="w-4 h-4"
          />
          <span className="text-sm font-bold text-gray-700">Requiere número de referencia</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.requiereBanco}
            onChange={e => setForm({ ...form, requiereBanco: e.target.checked })}
            className="w-4 h-4"
          />
          <span className="text-sm font-bold text-gray-700">Requiere banco</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.activo}
            onChange={e => setForm({ ...form, activo: e.target.checked })}
            className="w-4 h-4"
          />
          <span className="text-sm font-bold text-gray-700">Método activo</span>
        </label>
      </div>

      <Button type="button" onClick={handleSave} variant="dark">Guardar Método</Button>
    </div>
  );
});

export default FormMetodoPago;
