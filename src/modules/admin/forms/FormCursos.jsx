// @build: 2026-09-11 | id: FORM-CURSOS-COMPLETO | backup: FormCursos.jsx.backup | desc: Editor completo de cursos (tabs: básico, contenido, módulos, relaciones+comisión)
import { useState, memo, useContext } from 'react';
import { Button, Input } from '../../../components/UI';
import { ChevronLeft, Clock, Plus, Equal, Minus } from 'lucide-react';
import { TIPOS_CURSO } from '../../../constants/tiposCurso';
import { AppContext } from '../../../context/AppContextValue';

const TABS = [
  { id: 'basico', label: 'Básico' },
  { id: 'contenido', label: 'Contenido' },
  { id: 'modulos', label: 'Módulos' },
  { id: 'relaciones', label: 'Relaciones' },
  { id: 'comisiones', label: 'Comisiones' },
  { id: 'horarios', label: 'Horarios' }
];

const FormCursos = memo(({ item, onSave, onCancel }) => {
  const ctx = useContext(AppContext);
  const sedesDisponibles = (ctx?.sedes || []).filter(s => s.activo);
   const instructoresDisponibles = (ctx?.instructores || []).filter(i => i.activo);
  const cursosDisponibles = (ctx?.cursos || []).filter(c => c.tipoCurso !== item?.tipoCurso);

  const inicializarModulos = (itemData) => {
    const mods = itemData.modulos || [''];
    if (mods.length > 0 && typeof mods[0] === 'string') return mods.map(nombre => ({ nombre, duracion: 0 }));
    return mods.map(m => typeof m === 'string' ? { nombre: m, duracion: 0 } : { ...m });
  };

  const [tab, setTab] = useState('basico');
  const [form, setForm] = useState({
    id: item?.id ? item.id : '',
    nombre: item?.id ? item.nombre : '',
    precioBase: item?.id ? (item.precioBase ?? 0) : 0,
    tipoCurso: item?.id ? (item.tipoCurso || TIPOS_CURSO.GENERAL) : TIPOS_CURSO.GENERAL,
    duracionTotal: item?.id ? (item.duracionTotal || 0) : 0,
    activo: item?.id ? (item.activo !== undefined ? item.activo : true) : true,
    modulos: inicializarModulos(item?.id ? item : { modulos: [''] }),
    // Contenido
    descripcion: item?.descripcion || '',
    queAprenderas: Array.isArray(item?.queAprenderas) ? item.queAprenderas.join('\n') : (item?.queAprenderas || ''),
    dirigidoA: item?.dirigidoA || '',
    formato: item?.formato || '',
    casco: item?.casco || '',
    hidratacion: item?.hidratacion || '',
    vestimenta: item?.vestimenta || '',
      // Relaciones
    prerequisitos: Array.isArray(item?.prerequisitos) ? item.prerequisitos : [],
    sedesPermitidas: Array.isArray(item?.sedesPermitidas) ? item.sedesPermitidas : [],
    instructoresPermitidos: Array.isArray(item?.instructoresPermitidos) ? item.instructoresPermitidos : [],
        comisionInstructor: item?.comisionInstructor ?? 0,
    comisionProveedor: item?.comisionProveedor ?? 0,
    comisionProveedorPorSede: (item?.comisionProveedorPorSede && typeof item.comisionProveedorPorSede === 'object') ? { ...item.comisionProveedorPorSede } : {},
    // Moto
       motoIncluida: item?.motoIncluida ?? true,
    tiposMotoEscuela: Array.isArray(item?.tiposMotoEscuela) ? item.tiposMotoEscuela : [],
    precioAlquilerMoto: item?.precioAlquilerMoto ?? 0,
    // Horarios por sede
    horariosPorSede: (item?.horariosPorSede && typeof item.horariosPorSede === 'object') ? { ...item.horariosPorSede } : {}
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

  const toggleSede = (sedeId) => setForm(prev => ({
    ...prev,
    sedesPermitidas: prev.sedesPermitidas.includes(sedeId)
      ? prev.sedesPermitidas.filter(id => id !== sedeId)
      : [...prev.sedesPermitidas, sedeId]
  }));

    const toggleInstructor = (instId) => setForm(prev => ({
    ...prev,
    instructoresPermitidos: prev.instructoresPermitidos.includes(instId)
      ? prev.instructoresPermitidos.filter(id => id !== instId)
      : [...prev.instructoresPermitidos, instId]
  }));

  const togglePrerequisito = (tipoCursoId) => setForm(prev => ({
    ...prev,
    prerequisitos: prev.prerequisitos.includes(tipoCursoId)
      ? prev.prerequisitos.filter(t => t !== tipoCursoId)
      : [...prev.prerequisitos, tipoCursoId]
  }));

   const toggleTipoMotoEscuela = (tipo) => setForm(prev => ({
    ...prev,
    tiposMotoEscuela: prev.tiposMotoEscuela.includes(tipo)
      ? prev.tiposMotoEscuela.filter(t => t !== tipo)
      : [...prev.tiposMotoEscuela, tipo]
  }));

  const horariosDeSede = (sedeId) => {
    const sede = (ctx?.sedes || []).find(s => s.id === sedeId);
    const habilitados = sede?.horariosHabilitados || [];
    return (ctx?.horarios || [])
      .filter(h => h.activo && habilitados.includes(h.id))
      .sort((a, b) => String(a.id).localeCompare(String(b.id), undefined, { numeric: true }));
  };

  const horariosEfectivosDeSede = (sedeId) => {
    if (form.horariosPorSede[sedeId] !== undefined) return form.horariosPorSede[sedeId];
    return horariosDeSede(sedeId).map(h => h.id);
  };

  const toggleHorarioEnSede = (sedeId, horaId) => setForm(prev => {
    const actual = prev.horariosPorSede[sedeId] !== undefined
      ? prev.horariosPorSede[sedeId]
      : horariosDeSede(sedeId).map(h => h.id);
    const nuevo = actual.includes(horaId)
      ? actual.filter(h => h !== horaId)
      : [...actual, horaId];
    return {
      ...prev,
      horariosPorSede: { ...prev.horariosPorSede, [sedeId]: nuevo }
    };
  });

    const toggleTodosHorariosEnSede = (sedeId) => {
    const disponibles = horariosDeSede(sedeId).map(h => h.id);
    const actuales = horariosEfectivosDeSede(sedeId);
    const todosSeleccionados = disponibles.length > 0 && disponibles.every(h => actuales.includes(h));
    setForm(prev => ({
      ...prev,
      horariosPorSede: {
        ...prev.horariosPorSede,
        [sedeId]: todosSeleccionados ? [] : disponibles
      }
    }));
  };

  const setComisionProveedorEnSede = (sedeId, valor) => {
    setForm(prev => {
      const actual = { ...prev.comisionProveedorPorSede };
      if (valor === '' || valor === null || valor === undefined) {
        delete actual[sedeId];
      } else {
        actual[sedeId] = Number(valor) || 0;
      }
      return { ...prev, comisionProveedorPorSede: actual };
    });
  };

  const handleSave = () => {
    if (hayExcedente) { alert(`Hay un excedente de ${Math.abs(tiempoRestante)} minutos. Ajuste las duraciones.`); return; }
    if (form.modulos.some(m => !m.nombre.trim())) { alert('Todos los módulos deben tener un nombre.'); return; }

    const queAprenderasArr = String(form.queAprenderas || '')
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0);

         const payload = {
      ...form,
      id: form.id,
      activo: form.activo,
      modulos: form.modulos.filter(m => m.nombre.trim() !== ''),
      queAprenderas: queAprenderasArr,
      tiposMotoEscuela: form.motoIncluida ? form.tiposMotoEscuela : [],
      comisionProveedorPorSede: form.comisionProveedorPorSede || {}
    };

    onSave(payload);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center mb-4">
        <button type="button" onClick={onCancel} className="p-2 bg-gray-200 rounded-full"><ChevronLeft size={20} /></button>
        <h3 className="font-bold text-lg">{item?.id ? 'Editar' : 'Nuevo'} Curso</h3>
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
          <Input label="Nombre del Curso" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />
          <Input label="Precio Base (USD)" type="number" value={form.precioBase || ''} onChange={e => setForm({ ...form, precioBase: Number(e.target.value) || 0 })} />
          <div className="mb-4 text-left w-full">
            <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">Tipo de Curso</label>
            <select
              value={form.tipoCurso}
              onChange={e => setForm({ ...form, tipoCurso: e.target.value })}
              className="w-full bg-gray-50 border-2 border-gray-200 focus:border-blue-500 rounded-xl py-3 px-4 outline-none"
            >
              <option value={TIPOS_CURSO.GENERAL}>General</option>
              <option value={TIPOS_CURSO.EQUILIBRIO}>Equilibrio</option>
              <option value={TIPOS_CURSO.BASICO_AUTO}>Básico Automática</option>
              <option value={TIPOS_CURSO.BASICO_SINCRO}>Básico Sincrónica</option>
              <option value={TIPOS_CURSO.MOTERO}>Curso Motero</option>
            </select>
          </div>
          <Input label="Duración Total del Curso (minutos)" type="number" value={form.duracionTotal || ''} onChange={handleDuracionTotalChange} icon={Clock} />
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
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">Descripción</label>
            <textarea
              value={form.descripcion}
              onChange={e => setForm({ ...form, descripcion: e.target.value })}
              className="w-full bg-gray-50 border-2 border-gray-200 focus:border-blue-500 rounded-xl py-3 px-4 outline-none text-sm min-h-[80px]"
              placeholder="Describe brevemente el curso..."
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">¿Qué aprenderás? (una por línea)</label>
            <textarea
              value={form.queAprenderas}
              onChange={e => setForm({ ...form, queAprenderas: e.target.value })}
              className="w-full bg-gray-50 border-2 border-gray-200 focus:border-blue-500 rounded-xl py-3 px-4 outline-none text-sm min-h-[120px] font-mono"
              placeholder={"Arranque y frenado\nEquilibrio y coordinación\nAceleración controlada"}
            />
          </div>
                   <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">Dirigido a</label>
            <textarea
              value={form.dirigidoA}
              onChange={e => setForm({ ...form, dirigidoA: e.target.value })}
              className="w-full bg-gray-50 border-2 border-gray-200 focus:border-blue-500 rounded-xl py-3 px-4 outline-none text-sm min-h-[80px]"
              placeholder="Describe a quién va dirigido..."
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">Formato</label>
            <textarea
              value={form.formato}
              onChange={e => setForm({ ...form, formato: e.target.value })}
              className="w-full bg-gray-50 border-2 border-gray-200 focus:border-blue-500 rounded-xl py-3 px-4 outline-none text-sm min-h-[80px]"
              placeholder="Ej: 4 horas en total: 2 horas diarias..."
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">Casco</label>
            <textarea
              value={form.casco}
              onChange={e => setForm({ ...form, casco: e.target.value })}
              className="w-full bg-gray-50 border-2 border-gray-200 focus:border-blue-500 rounded-xl py-3 px-4 outline-none text-sm min-h-[80px]"
              placeholder="Ej: Nosotros ponemos el casco."
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">Hidratación</label>
            <textarea
              value={form.hidratacion}
              onChange={e => setForm({ ...form, hidratacion: e.target.value })}
              className="w-full bg-gray-50 border-2 border-gray-200 focus:border-blue-500 rounded-xl py-3 px-4 outline-none text-sm min-h-[80px]"
              placeholder="Ej: Debes traer hidratación."
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">Vestimenta</label>
            <textarea
              value={form.vestimenta}
              onChange={e => setForm({ ...form, vestimenta: e.target.value })}
              className="w-full bg-gray-50 border-2 border-gray-200 focus:border-blue-500 rounded-xl py-3 px-4 outline-none text-sm min-h-[80px]"
              placeholder="Ej: Pantalón jean, zapatos cerrados y suéter."
            />
          </div>
        </div>
      )}

      {/* Tab: Módulos */}
      {tab === 'modulos' && (
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-bold text-gray-700">Módulos</label>
            <button type="button" onClick={distribuirEquitativamente} disabled={!form.duracionTotal || form.modulos.length === 0} className="text-xs font-bold text-blue-600 flex items-center gap-1 disabled:opacity-40">
              <Equal size={14} /> Distribuir equitativamente
            </button>
          </div>
          {form.modulos.map((mod, i) => (
            <div key={i} className="flex gap-2 mb-2 items-start">
              <input
                className="flex-1 bg-white border-2 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                placeholder={`Módulo ${i + 1}`}
                value={mod.nombre}
                onChange={e => handleModuloNombreChange(i, e.target.value)}
              />
              <input
                type="number"
                className="w-20 bg-white border-2 rounded-lg px-2 py-2 text-sm outline-none focus:border-blue-500 text-center"
                placeholder="Min"
                value={mod.duracion || ''}
                onChange={e => handleModuloDuracionChange(i, e.target.value)}
              />
              {form.modulos.length > 1 && (
                <button type="button" onClick={() => eliminarModulo(i)} className="p-2 text-red-400 hover:text-red-600">
                  <Minus size={16} />
                </button>
              )}
            </div>
          ))}
          <Button type="button" onClick={agregarModulo} variant="outline" className="!py-2 text-sm mt-2 bg-white" icon={Plus}>Añadir Módulo</Button>
          {form.duracionTotal > 0 && (
            <div className={`mt-3 p-3 rounded-xl text-center text-sm font-bold ${
              hayExcedente ? 'bg-red-50 text-red-700 border border-red-200'
              : distribucionExacta ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-blue-50 text-blue-700 border border-blue-200'
            }`}>
              {hayExcedente ? `⚠️ Excedente: ${Math.abs(tiempoRestante)} min de más`
               : distribucionExacta ? '✅ Tiempo perfectamente distribuido'
               : `⏳ Te quedan ${tiempoRestante} min por asignar`}
            </div>
          )}
        </div>
      )}

      {/* Tab: Relaciones */}
           {tab === 'relaciones' && (
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <label className="block text-sm font-bold text-gray-700 mb-2">Prerequisitos (el estudiante debe haber completado uno)</label>
            {cursosDisponibles.length === 0 ? (
              <p className="text-xs text-gray-500">No hay otros cursos activos.</p>
            ) : (
              <div className="space-y-2">
                {cursosDisponibles.map(c => {
                  const desactivado = c.activo === false;
                  return (
                    <label key={c.id} className={`flex items-center gap-2 cursor-pointer ${desactivado ? 'opacity-50' : ''}`}>
                      <input
                        type="checkbox"
                        checked={form.prerequisitos.includes(c.tipoCurso)}
                        onChange={() => togglePrerequisito(c.tipoCurso)}
                        disabled={desactivado}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">
                        {c.nombre} <span className="text-xs text-gray-400">({c.tipoCurso})</span>
                        {desactivado && <span className="ml-1 text-xs text-orange-600">(Desactivado)</span>}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
            <p className="text-[11px] text-gray-500 mt-2">
              Si no seleccionas ninguno, el curso no tendrá prerequisitos.
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <label className="block text-sm font-bold text-gray-700 mb-2">Sedes permitidas</label>
            {sedesDisponibles.length === 0 ? (
              <p className="text-xs text-gray-500">No hay sedes activas.</p>
            ) : (
              <div className="space-y-2">
                {sedesDisponibles.map(s => (
                  <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.sedesPermitidas.includes(s.id)}
                      onChange={() => toggleSede(s.id)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">{s.nombre} <span className="text-xs text-gray-400">({s.id})</span></span>
                  </label>
                ))}
              </div>
            )}
            {form.sedesPermitidas.length === 0 && (
              <p className="text-[11px] text-yellow-700 mt-2">⚠️ Sin sedes seleccionadas → se ofrecerá en todas las sedes activas.</p>
            )}
          </div>

          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <label className="block text-sm font-bold text-gray-700 mb-2">Instructores permitidos</label>
            {instructoresDisponibles.length === 0 ? (
              <p className="text-xs text-gray-500">No hay instructores activos.</p>
            ) : (
              <div className="space-y-2">
                {instructoresDisponibles.map(i => (
                  <label key={i.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.instructoresPermitidos.includes(i.id)}
                      onChange={() => toggleInstructor(i.id)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">{i.nombre} {i.apellido || ''}</span>
                  </label>
                ))}
              </div>
            )}
            {form.instructoresPermitidos.length === 0 && (
              <p className="text-[11px] text-yellow-700 mt-2">⚠️ Sin instructores seleccionados → cualquier instructor de la sede podrá dar el curso.</p>
            )}
          </div>

                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <label className="flex items-center gap-2 cursor-pointer mb-3">
              <input
                type="checkbox"
                checked={form.motoIncluida}
                onChange={e => setForm({ ...form, motoIncluida: e.target.checked })}
                className="w-5 h-5"
              />
              <span className="text-sm font-bold text-gray-700">La escuela ofrece moto</span>
            </label>

            {form.motoIncluida && (
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-2 ml-1">Tipos de moto de la escuela</label>
                <div className="space-y-2">
                  {['Automática', 'Sincrónica'].map(tipo => (
                    <label key={tipo} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.tiposMotoEscuela.includes(tipo)}
                        onChange={() => toggleTipoMotoEscuela(tipo)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">{tipo}</span>
                    </label>
                  ))}
                </div>
                {form.tiposMotoEscuela.length === 0 && (
                  <p className="text-[11px] text-red-700 mt-2">⚠️ Selecciona al menos un tipo.</p>
                )}
              </div>
            )}

            {!form.motoIncluida && (
              <p className="text-[11px] text-yellow-700">⚠️ Sin moto incluida → el estudiante deberá traer su propia moto.</p>
            )}
          </div>
                </div>
      )}

            {/* Tab: Comisiones */}
      {tab === 'comisiones' && (
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">Comisión del Instructor (USD fijo)</label>
            <input
              type="number"
              min="0"
              value={form.comisionInstructor || ''}
              onChange={e => setForm({ ...form, comisionInstructor: Number(e.target.value) || 0 })}
              className="w-full bg-white border-2 border-gray-200 focus:border-blue-500 rounded-xl py-3 px-4 outline-none"
              placeholder="15"
            />
            <p className="text-xs text-gray-500 mt-1 ml-1">Monto fijo en USD que gana el instructor por cada clase.</p>
          </div>

          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">Comisión del Proveedor (USD fijo)</label>
            <input
              type="number"
              min="0"
              value={form.comisionProveedor || ''}
              onChange={e => setForm({ ...form, comisionProveedor: Number(e.target.value) || 0 })}
              className="w-full bg-white border-2 border-gray-200 focus:border-blue-500 rounded-xl py-3 px-4 outline-none"
              placeholder="10"
            />
            <p className="text-xs text-gray-500 mt-1 ml-1">Monto base. Si una sede tiene tarifa distinta, configúrala abajo.</p>

            {form.sedesPermitidas.length === 0 ? (
              <p className="text-[11px] text-yellow-700 mt-2">Configura primero las sedes permitidas en la pestaña "Relaciones".</p>
            ) : (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-bold text-gray-600">Comisión por sede (opcional)</p>
                {form.sedesPermitidas.map(sedeId => {
                  const sede = (ctx?.sedes || []).find(s => s.id === sedeId);
                  const valorActual = form.comisionProveedorPorSede[sedeId];
                  return (
                    <div key={sedeId} className="flex items-center gap-2">
                      <span className="flex-1 text-xs text-gray-700">{sede?.nombre || sedeId}</span>
                      <input
                        type="number"
                        min="0"
                        value={valorActual === undefined ? '' : valorActual}
                        onChange={e => setComisionProveedorEnSede(sedeId, e.target.value)}
                        placeholder={`${form.comisionProveedor} (base)`}
                        className="w-24 bg-white border-2 border-gray-200 focus:border-blue-500 rounded-lg py-1.5 px-2 outline-none text-sm text-center"
                      />
                    </div>
                  );
                })}
                <p className="text-[10px] text-gray-400 mt-1">Si dejas vacío, se usa el monto base.</p>
              </div>
            )}
          </div>

          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">Precio de alquiler de moto (USD)</label>
            {form.motoIncluida ? (
              <>
                <input
                  type="number"
                  min="0"
                  value={form.precioAlquilerMoto || ''}
                  onChange={e => setForm({ ...form, precioAlquilerMoto: Number(e.target.value) || 0 })}
                  className="w-full bg-white border-2 border-gray-200 focus:border-blue-500 rounded-xl py-2 px-3 outline-none text-sm"
                  placeholder="0"
                />
                <p className="text-[11px] text-gray-500 mt-1 ml-1">Monto fijo por curso. 0 si ya va incluido en el precio.</p>
              </>
            ) : (
              <p className="text-[11px] text-yellow-700">Activa "La escuela ofrece moto" en la pestaña "Relaciones" para configurar este campo.</p>
            )}
          </div>
        </div>
      )}

      {/* Tab: Horarios */}
      {tab === 'horarios' && (
        <div className="space-y-4">
          {form.sedesPermitidas.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl text-sm text-yellow-800">
              Selecciona primero las sedes permitidas en la pestaña "Relaciones".
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-600">
                Configura qué bloques horarios se ofrecen en cada sede para este curso. Si no marcas ninguno, se usan todos los horarios de la sede.
              </p>
              {form.sedesPermitidas.map(sedeId => {
                const sede = (ctx?.sedes || []).find(s => s.id === sedeId);
                const horarios = horariosDeSede(sedeId);
                const efectivos = horariosEfectivosDeSede(sedeId);
                const todosSeleccionados = horarios.length > 0 && horarios.every(h => efectivos.includes(h.id));
                return (
                  <div key={sedeId} className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-bold text-gray-700">{sede?.nombre || sedeId}</label>
                      <button
                        type="button"
                        onClick={() => toggleTodosHorariosEnSede(sedeId)}
                        disabled={horarios.length === 0}
                        className="text-xs font-bold text-blue-600 disabled:opacity-40"
                      >
                        {todosSeleccionados ? 'Deseleccionar todos' : 'Seleccionar todos'}
                      </button>
                    </div>
                    {horarios.length === 0 ? (
                      <p className="text-xs text-gray-500">Esta sede no tiene horarios habilitados.</p>
                    ) : (
                      <div className="space-y-2">
                        {horarios.map(h => (
                          <label key={h.id} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={efectivos.includes(h.id)}
                              onChange={() => toggleHorarioEnSede(sedeId, h.id)}
                              className="w-4 h-4"
                            />
                            <span className="text-sm">
                              <span className="font-mono text-xs text-gray-500">{h.id}</span>
                              <span className="ml-2">{h.label}</span>
                              {h.isLunch && (
                                <span className="ml-2 text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-bold uppercase">Almuerzo</span>
                              )}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      <Button type="button" onClick={handleSave} variant="dark">Guardar Curso</Button>
    </div>
  );
});

export default FormCursos;
