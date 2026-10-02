// @build: 2026-09-30 | id: FORM-CURSO-TEORICO | desc: Editor de cursos teóricos con tabs (básico + contenido + disclaimer)
import { useState, memo } from 'react';
import { Button, Input } from '../../../components/UI';
import { ChevronLeft } from 'lucide-react';

const TABS = [
  { id: 'basico', label: 'Básico' },
  { id: 'contenido', label: 'Contenido' },
  { id: 'disclaimer', label: 'Aviso Legal' }
];

const FormCursoTeorico = memo(({ item, onSave, onCancel }) => {
  const [tab, setTab] = useState('basico');
  const [form, setForm] = useState({
    id: item?.id || '',
    nombre: item?.nombre || '',
    descripcion: item?.descripcion || '',
    precio: item?.precio ?? 0,
    moneda: item?.moneda || 'USD',
    duracionAcceso: item?.duracionAcceso || 'vida',
    activo: item?.activo !== undefined ? item.activo : true,
    color: item?.color || '#3b82f6',
    icono: item?.icono || 'BookOpen',
    orden: item?.orden ?? 1,
    totalModulos: item?.totalModulos ?? 0,
    totalQuizzes: item?.totalQuizzes ?? 0,
    disclaimerInicio: item?.disclaimerInicio || 'El contenido de esta sección tiene fines informativos, recreativos y de educación no formal. No constituye un programa académico oficial ni reemplaza la capacitación del INTT.',
    disclaimerFooter: item?.disclaimerFooter || 'Esta plataforma ofrece servicios privados de educación no formal. Las constancias emitidas son de carácter privado y no poseen validez legal para la obtención de licencias de conducir.'
  });

  const handleSave = () => {
    if (!form.nombre.trim()) {
      alert('El nombre del curso es obligatorio');
      return;
    }
    onSave(form);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center mb-4">
        <button type="button" onClick={onCancel} className="p-2 bg-gray-200 rounded-full">
          <ChevronLeft size={20} />
        </button>
        <h3 className="font-bold text-lg">{item?.id ? 'Editar' : 'Nuevo'} Curso Teórico</h3>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 border-b border-gray-200">
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-xs font-bold rounded-t-lg whitespace-nowrap transition-colors ${
              tab === t.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >{t.label}</button>
        ))}
      </div>

      {/* Tab: Básico */}
      {tab === 'basico' && (
        <div className="space-y-4">
          <Input
            label="Nombre del curso"
            value={form.nombre}
            onChange={e => setForm({ ...form, nombre: e.target.value })}
            placeholder="Ej: Leyes de Tránsito"
          />

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">Descripción</label>
            <textarea
              value={form.descripcion}
              onChange={e => setForm({ ...form, descripcion: e.target.value })}
              className="w-full bg-gray-50 border-2 border-gray-200 focus:border-blue-500 rounded-xl py-3 px-4 outline-none text-sm min-h-[80px]"
              placeholder="Describe brevemente el curso..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Precio"
              type="number"
              value={form.precio || ''}
              onChange={e => setForm({ ...form, precio: Number(e.target.value) || 0 })}
            />
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">Moneda</label>
              <select
                value={form.moneda}
                onChange={e => setForm({ ...form, moneda: e.target.value })}
                className="w-full bg-gray-50 border-2 border-gray-200 focus:border-blue-500 rounded-xl py-3 px-4 outline-none"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="VES">VES</option>
                <option value="USDT">USDT</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">Duración del acceso</label>
            <select
              value={form.duracionAcceso}
              onChange={e => setForm({ ...form, duracionAcceso: e.target.value })}
              className="w-full bg-gray-50 border-2 border-gray-200 focus:border-blue-500 rounded-xl py-3 px-4 outline-none"
            >
              <option value="vida">De por vida</option>
              <option value="30">30 días</option>
              <option value="90">90 días</option>
              <option value="180">180 días</option>
              <option value="365">1 año</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">Color</label>
              <input
                type="color"
                value={form.color}
                onChange={e => setForm({ ...form, color: e.target.value })}
                className="w-full h-12 bg-gray-50 border-2 border-gray-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">Orden</label>
              <input
                type="number"
                value={form.orden}
                onChange={e => setForm({ ...form, orden: Number(e.target.value) || 1 })}
                className="w-full bg-gray-50 border-2 border-gray-200 focus:border-blue-500 rounded-xl py-3 px-4 outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <label className="text-sm font-bold text-gray-700 flex-1">Curso activo</label>
            <input
              type="checkbox"
              checked={form.activo}
              onChange={e => setForm({ ...form, activo: e.target.checked })}
              className="w-5 h-5"
            />
          </div>
        </div>
      )}

      {/* Tab: Contenido */}
      {tab === 'contenido' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-xs text-blue-800">
            Los módulos se cargarán en una próxima versión. Por ahora este curso puede guardarse con metadata básica.
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Total de módulos"
              type="number"
              value={form.totalModulos || 0}
              onChange={e => setForm({ ...form, totalModulos: Number(e.target.value) || 0 })}
            />
            <Input
              label="Total de quizzes"
              type="number"
              value={form.totalQuizzes || 0}
              onChange={e => setForm({ ...form, totalQuizzes: Number(e.target.value) || 0 })}
            />
          </div>
        </div>
      )}

      {/* Tab: Disclaimer */}
      {tab === 'disclaimer' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">Disclaimer al inicio del curso</label>
            <textarea
              value={form.disclaimerInicio}
              onChange={e => setForm({ ...form, disclaimerInicio: e.target.value })}
              className="w-full bg-gray-50 border-2 border-gray-200 focus:border-blue-500 rounded-xl py-3 px-4 outline-none text-sm min-h-[100px]"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">Disclaimer al pie del curso</label>
            <textarea
              value={form.disclaimerFooter}
              onChange={e => setForm({ ...form, disclaimerFooter: e.target.value })}
              className="w-full bg-gray-50 border-2 border-gray-200 focus:border-blue-500 rounded-xl py-3 px-4 outline-none text-sm min-h-[100px]"
            />
          </div>
        </div>
      )}

      <Button type="button" onClick={handleSave} variant="dark">Guardar Curso Teórico</Button>
    </div>
  );
});

export default FormCursoTeorico;