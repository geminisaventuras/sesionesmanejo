// @build: 2026-09-22.A2.12-b | id: FORM-PACK-SEDES | desc: FormPack con sedesPermitidas (como cursos)
import { useState, useContext, memo } from 'react';
import { AppContext } from '../../../context/AppContextValue';
import { Button, Input } from '../../../components/UI';
import { ChevronLeft, ArrowUp, ArrowDown, GripVertical, Plus, X, MapPin, GraduationCap } from 'lucide-react';

const FormPack = memo(({ item, onSave, onCancel }) => {
  const { cursos, cursosTeoricos, sedes, refreshCatalogos } = useContext(AppContext);
    const [form, setForm] = useState(
    item?.id
      ? { ...item, cursoIds: item.cursoIds || [], sedesPermitidas: item.sedesPermitidas || [], cursosTeoricosIncluidos: item.cursosTeoricosIncluidos || [], sumarTeoricosAlPrecio: item.sumarTeoricosAlPrecio === true }
      : {
          id: '',
          nombre: '',
          descripcion: '',
          cursoIds: [],
          sedesPermitidas: [],
          cursosTeoricosIncluidos: [],
          sumarTeoricosAlPrecio: false,
          descuentoTipo: 'porcentaje',
          descuentoValor: 10,
          vencimientoDias: 60,
          activo: true
        }
  );
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [mostrarTeoricos, setMostrarTeoricos] = useState(
    Array.isArray(item?.cursosTeoricosIncluidos) && item.cursosTeoricosIncluidos.length > 0
  );

  const cursosActivos = (cursos || []).filter(c => c.activo !== false);
  const sedesActivas = (sedes || []).filter(s => s.activo !== false);

  const cursosSeleccionados = form.cursoIds
    .map(id => cursosActivos.find(c => String(c.id) === String(id)))
    .filter(Boolean);
  const cursosDisponibles = cursosActivos.filter(
    c => !form.cursoIds.includes(String(c.id))
  );

  const precioBaseCursos = cursosSeleccionados.reduce(
    (acc, c) => acc + (Number(c.precioBase) || 0), 0
  );
  const precioTeoricos = form.sumarTeoricosAlPrecio
    ? (form.cursosTeoricosIncluidos || []).reduce((acc, ctId) => {
        const ct = (cursosTeoricos || []).find(x => String(x.id) === String(ctId));
        return acc + (Number(ct?.precio) || 0);
      }, 0)
    : 0;
  const precioBase = precioBaseCursos + precioTeoricos;
  const descuentoMonto = form.descuentoTipo === 'porcentaje'
    ? (precioBase * (Number(form.descuentoValor) || 0)) / 100
    : (Number(form.descuentoValor) || 0);
  const precioFinal = Math.max(0, precioBase - descuentoMonto);

  const agregarCurso = (cursoId) => {
    setForm(f => ({ ...f, cursoIds: [...f.cursoIds, String(cursoId)] }));
  };

  const quitarCurso = (idx) => {
    setForm(f => ({ ...f, cursoIds: f.cursoIds.filter((_, i) => i !== idx) }));
  };

  const moverArriba = (idx) => {
    if (idx <= 0) return;
    setForm(f => {
      const arr = [...f.cursoIds];
      [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
      return { ...f, cursoIds: arr };
    });
  };

  const moverAbajo = (idx) => {
    setForm(f => {
      if (idx >= f.cursoIds.length - 1) return f;
      const arr = [...f.cursoIds];
      [arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]];
      return { ...f, cursoIds: arr };
    });
  };

  const handleDragStart = (idx) => setDraggedIndex(idx);
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (targetIdx) => {
    if (draggedIndex === null || draggedIndex === targetIdx) return;
    setForm(f => {
      const arr = [...f.cursoIds];
      const [moved] = arr.splice(draggedIndex, 1);
      arr.splice(targetIdx, 0, moved);
      return { ...f, cursoIds: arr };
    });
    setDraggedIndex(null);
  };

  const toggleSede = (sedeId) => {
    setForm(f => {
      const arr = f.sedesPermitidas || [];
      const id = String(sedeId);
      return {
        ...f,
        sedesPermitidas: arr.includes(id)
          ? arr.filter(s => s !== id)
          : [...arr, id]
      };
    });
  };

  const toggleTeorico = (cursoTeoricoId) => {
    setForm(f => {
      const arr = f.cursosTeoricosIncluidos || [];
      const id = String(cursoTeoricoId);
      return {
        ...f,
        cursosTeoricosIncluidos: arr.includes(id)
          ? arr.filter(s => s !== id)
          : [...arr, id]
      };
    });
  };

  const handleSave = () => {
    if (!form.nombre || !form.nombre.trim()) {
      alert('El nombre del pack es obligatorio');
      return;
    }
    if (form.cursoIds.length === 0) {
      alert('Debes agregar al menos un curso al pack');
      return;
    }
    if (!form.sedesPermitidas || form.sedesPermitidas.length === 0) {
      alert('Debes habilitar al menos una sede para el pack');
      return;
    }
    // FIX-PACK-SEDE-POR-SESION: validar que cada curso comparta al menos 1 sede
    // con el pack. Si no hay intersección, el estudiante quedaría bloqueado.
    const cursosConConflicto = form.cursoIds.filter(cid => {
      const curso = (cursos || []).find(c => String(c.id) === String(cid));
      if (!curso) return false;
      const sedesCurso = Array.isArray(curso.sedesPermitidas) && curso.sedesPermitidas.length > 0
        ? curso.sedesPermitidas
        : form.sedesPermitidas; // sin restricción = todas las del pack
      return !sedesCurso.some(s => form.sedesPermitidas.includes(s));
    });
    if (cursosConConflicto.length > 0) {
      const nombres = cursosConConflicto
        .map(cid => (cursos || []).find(c => String(c.id) === String(cid))?.nombre || cid)
        .join(', ');
      alert(`Estos cursos no se ofrecen en ninguna sede del pack: ${nombres}. Ajusta las sedes del pack o las sedes de los cursos.`);
      return;
    }
    if (form.descuentoTipo === 'porcentaje' && Number(form.descuentoValor) >= 100) {
      alert('El descuento porcentual no puede ser 100% o más');
      return;
    }
      onSave({
      ...form,
      nombre: form.nombre.trim(),
      descripcion: (form.descripcion || '').trim(),
      descuentoValor: Number(form.descuentoValor) || 0,
      vencimientoDias: Number(form.vencimientoDias) || 0
    });
    if (typeof refreshCatalogos === 'function') {
      refreshCatalogos().catch(() => {});
    }
   
  };

  return (
    <div className="space-y-4 pb-10">
      <div className="flex gap-2 items-center mb-4">
        <button type="button" onClick={onCancel} className="p-2 bg-gray-200 rounded-full">
          <ChevronLeft size={20} />
        </button>
        <h3 className="font-bold text-lg">{item?.id ? 'Editar' : 'Nuevo'} Pack</h3>
      </div>

      <Input
        label="ID del pack (opcional, ej: pack_auto)"
        value={form.id || ''}
        onChange={e => setForm({ ...form, id: e.target.value })}
        placeholder="pack_auto"
        disabled={!!item?.id}
      />

      <Input
        label="Nombre del pack"
        value={form.nombre}
        onChange={e => setForm({ ...form, nombre: e.target.value })}
        placeholder="Ej: Pack Automática Completo"
      />

      <div>
        <label className="text-xs font-bold text-gray-600 block mb-1">Descripción</label>
        <textarea
          value={form.descripcion || ''}
          onChange={e => setForm({ ...form, descripcion: e.target.value })}
          placeholder="Ej: Equilibrio + Básico Automática + Refuerzo + Práctica en Vía"
          rows={2}
          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500"
        />
      </div>

      {/* Sedes permitidas */}
      <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
        <h4 className="text-xs font-black text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1">
          <MapPin size={14} className="text-blue-500" />
          Sedes permitidas ({(form.sedesPermitidas || []).length})
        </h4>
        {sedesActivas.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-3">No hay sedes activas.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {sedesActivas.map(s => {
              const activa = (form.sedesPermitidas || []).includes(String(s.id));
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleSede(s.id)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-bold border transition-colors ${
                    activa
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                  }`}
                >
                  {s.nombre}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
        <h4 className="text-xs font-black text-gray-700 uppercase tracking-wider mb-2">
          Cursos incluidos ({cursosSeleccionados.length})
        </h4>

        {cursosSeleccionados.length === 0 ? (
          <p className="text-xs text-gray-500 text-center py-3">Sin cursos. Agrega al menos uno.</p>
        ) : (
          <div className="space-y-2 mb-3">
            {cursosSeleccionados.map((curso, idx) => (
              <div
                key={curso.id}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(idx)}
                className="flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-200 cursor-grab active:cursor-grabbing"
              >
                <GripVertical size={16} className="text-gray-400 flex-shrink-0" />
                <span className="text-xs font-bold text-gray-500 w-4">{idx + 1}.</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{curso.nombre}</p>
                  <p className="text-[10px] text-gray-500">${curso.precioBase} · {curso.duracionTotal || 0} min</p>
                </div>
                <div className="flex gap-0.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => moverArriba(idx)}
                    disabled={idx === 0}
                    className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moverAbajo(idx)}
                    disabled={idx === cursosSeleccionados.length - 1}
                    className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
                  >
                    <ArrowDown size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => quitarCurso(idx)}
                    className="p-1 rounded hover:bg-red-50 text-red-500"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {cursosDisponibles.length > 0 && (
          <div>
            <label className="text-[10px] font-bold text-gray-500 block mb-1">Agregar curso:</label>
            <div className="flex gap-1 flex-wrap">
              {cursosDisponibles.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => agregarCurso(c.id)}
                  className="text-[10px] bg-blue-50 text-blue-700 px-2 py-1 rounded-lg font-bold hover:bg-blue-100 flex items-center gap-1"
                >
                  <Plus size={10} /> {c.nombre}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Módulos formativos incluidos (colapsable) */}
      <div className="bg-teal-50 rounded-xl border border-teal-200 overflow-hidden">
        <button
          type="button"
          onClick={() => setMostrarTeoricos(v => !v)}
          className="w-full flex items-center justify-between p-3 hover:bg-teal-100 transition-colors"
        >
          <h4 className="text-xs font-black text-teal-800 uppercase tracking-wider flex items-center gap-1">
            <GraduationCap size={14} className="text-teal-600" />
            Módulos formativos incluidos ({(form.cursosTeoricosIncluidos || []).length})
          </h4>
          <span className="text-teal-700 text-lg leading-none">{mostrarTeoricos ? '−' : '+'}</span>
        </button>

        {mostrarTeoricos && (
          <div className="px-3 pb-3">
            {(cursosTeoricos || []).filter(c => c.activo !== false).length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-2">No hay módulos formativos activos.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(cursosTeoricos || []).filter(c => c.activo !== false).map(ct => {
                  const activo = (form.cursosTeoricosIncluidos || []).includes(String(ct.id));
                  return (
                    <button
                      key={ct.id}
                      type="button"
                      onClick={() => toggleTeorico(ct.id)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-bold border transition-colors ${
                        activo
                          ? 'bg-teal-600 text-white border-teal-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-teal-400'
                      }`}
                    >
                      {ct.nombre}
                    </button>
                  );
                })}
              </div>
            )}
            <p className="text-[10px] text-teal-700 mt-2 italic">
              Los módulos seleccionados se activan automáticamente al aprobar el pack.
            </p>

            {(form.cursosTeoricosIncluidos || []).length > 0 && (
              <div className="mt-3 pt-3 border-t border-teal-200 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sumarTeoricosAlPrecio"
                  checked={form.sumarTeoricosAlPrecio === true}
                  onChange={e => setForm(f => ({ ...f, sumarTeoricosAlPrecio: e.target.checked }))}
                  className="w-4 h-4 accent-teal-600"
                />
                <label htmlFor="sumarTeoricosAlPrecio" className="text-xs font-bold text-teal-800 cursor-pointer">
                  Sumar precio de módulos formativos al pack
                </label>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-bold text-gray-600 block mb-1">Tipo descuento</label>
          <select
            value={form.descuentoTipo}
            onChange={e => setForm({ ...form, descuentoTipo: e.target.value })}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500"
          >
            <option value="porcentaje">Porcentaje (%)</option>
            <option value="fijo">Monto fijo ($)</option>
          </select>
        </div>
        <Input
          label={form.descuentoTipo === 'porcentaje' ? 'Descuento (%)' : 'Descuento ($)'}
          type="number"
          value={form.descuentoValor || ''}
          onChange={e => setForm({ ...form, descuentoValor: Number(e.target.value) || 0 })}
          placeholder={form.descuentoTipo === 'porcentaje' ? '10' : '13'}
        />
      </div>

      <Input
        label="Vencimiento (días desde la compra)"
        type="number"
        value={form.vencimientoDias || ''}
        onChange={e => setForm({ ...form, vencimientoDias: Number(e.target.value) || 0 })}
        placeholder="60"
      />

      <div className="bg-blue-50 p-3 rounded-xl border border-blue-200 space-y-1 text-sm">
        <div className="flex justify-between"><span className="text-gray-600">Suma base:</span><span className="font-bold">${precioBase.toFixed(2)}</span></div>
        <div className="flex justify-between text-red-600"><span>Descuento:</span><span className="font-bold">-${descuentoMonto.toFixed(2)}</span></div>
        <div className="flex justify-between border-t border-blue-300 pt-1 mt-1 text-base">
          <span className="font-bold text-gray-800">Precio final:</span>
          <span className="font-black text-blue-700">${precioFinal.toFixed(2)}</span>
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer bg-gray-50 p-3 rounded-xl border border-gray-200">
        <input
          type="checkbox"
          checked={form.activo}
          onChange={e => setForm({ ...form, activo: e.target.checked })}
          className="w-4 h-4"
        />
        <span className="text-sm font-bold text-gray-700">Pack activo</span>
      </label>

      <Button type="button" onClick={handleSave} variant="dark">Guardar Pack</Button>
    </div>
  );
});

export default FormPack;
