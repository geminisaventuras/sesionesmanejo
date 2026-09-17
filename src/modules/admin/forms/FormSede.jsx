// @build: 2026-09-14 | id: FORM-SEDE-HORARIOS | desc: Formulario de sede con horarios habilitados por bloque
import { useState, memo, useContext, useMemo } from 'react';
import { Button, Input } from '../../../components/UI';
import { ChevronLeft, CheckSquare } from 'lucide-react';
import { AppContext } from '../../../context/AppContextValue';

const FormSede = memo(({ item, onSave, onCancel }) => {
  const ctx = useContext(AppContext);

  const horariosDisponibles = useMemo(() => {
    return (ctx?.horarios || [])
      .filter(h => h.activo)
      .sort((a, b) => String(a.id).localeCompare(String(b.id), undefined, { numeric: true }));
  }, [ctx?.horarios]);

  const [form, setForm] = useState(
    item.id
      ? { ...item, horariosHabilitados: Array.isArray(item.horariosHabilitados) ? item.horariosHabilitados : [] }
      : { nombre: '', direccion: '', horariosHabilitados: [] }
  );

  const toggleHorario = (horaId) => setForm(prev => ({
    ...prev,
    horariosHabilitados: prev.horariosHabilitados.includes(horaId)
      ? prev.horariosHabilitados.filter(id => id !== horaId)
      : [...prev.horariosHabilitados, horaId]
  }));

  const todosSeleccionados = horariosDisponibles.length > 0
    && horariosDisponibles.every(h => form.horariosHabilitados.includes(h.id));

  const toggleTodos = () => {
    if (todosSeleccionados) {
      setForm(prev => ({ ...prev, horariosHabilitados: [] }));
    } else {
      setForm(prev => ({ ...prev, horariosHabilitados: horariosDisponibles.map(h => h.id) }));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center mb-4">
        <button type="button" onClick={onCancel} className="p-2 bg-gray-200 rounded-full"><ChevronLeft size={20} /></button>
        <h3 className="font-bold text-lg">{item.id ? 'Editar' : 'Nueva'} Sede</h3>
      </div>

      <Input label="Nombre de la Sede" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
      <Input label="Direccion / Ubicacion" value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} />

      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-bold text-gray-700">Horarios habilitados</label>
          <button
            type="button"
            onClick={toggleTodos}
            disabled={horariosDisponibles.length === 0}
            className="text-xs font-bold text-blue-600 flex items-center gap-1 disabled:opacity-40"
          >
            <CheckSquare size={14} />
            {todosSeleccionados ? 'Deseleccionar todos' : 'Seleccionar todos'}
          </button>
        </div>

        {horariosDisponibles.length === 0 ? (
          <p className="text-xs text-gray-500">No hay horarios activos.</p>
        ) : (
          <div className="space-y-2">
            {horariosDisponibles.map(h => (
              <label key={h.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.horariosHabilitados.includes(h.id)}
                  onChange={() => toggleHorario(h.id)}
                  className="w-4 h-4"
                />
                <span className="text-sm">
                  <span className="font-mono text-xs text-gray-500">{h.id}</span>
                  <span className="ml-2">{h.label || '?'}</span>
                  {h.isLunch && <span className="ml-2 text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-bold uppercase">Almuerzo</span>}
                </span>
              </label>
            ))}
          </div>
        )}

        {form.horariosHabilitados.length === 0 && horariosDisponibles.length > 0 && (
          <p className="text-[11px] text-yellow-700 mt-2">Sin horarios seleccionados: se asumiran todos por defecto.</p>
        )}
      </div>

      <Button type="button" onClick={() => onSave(form)} variant="dark">Guardar Sede</Button>
    </div>
  );
});

export default FormSede;
