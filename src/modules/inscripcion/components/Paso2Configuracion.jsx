// @build: 2026-08-16 | id: PASO2-LOGICA-AUTOMATICA | desc: Selección automática de curso según bicicleta y tipo de moto
import React, { useRef, useEffect } from 'react';
import { MapPin, Bike, Zap, BookOpen, Info } from 'lucide-react';
import { useCursoAutomatico } from '../../../hooks/useCursoAutomatico';

export function Paso2Configuracion({ form, updateForm, cursos, sedes, recargoSinBici }) {
    const esOrigenPublico = form.origenPublico || form.cursoSugeridoActivo;

  const { cursoAsignado, esAutomatico } = useCursoAutomatico(
    form,
    updateForm,
    cursos,
    {
      bloquearCurso:
        form.esRecompra ||
        form.cursoSugeridoActivo ||
        form.cursoSeleccionadoManual
    }
  );

  const precargaInicialRef = useRef(false);

  const getConfiguracionDesdeCurso = (curso) => {
    switch (curso.tipoCurso) {
      case 'equilibrio':
        return { sabeBicicleta: 'No', tipoMoto: 'Automática' };
      case 'basico_auto':
        return { sabeBicicleta: 'Sí', tipoMoto: 'Automática' };
      case 'basico_sincro':
        return { sabeBicicleta: 'Sí', tipoMoto: 'Sincrónica' };
      case 'general':
      case 'motero':
        return { sabeBicicleta: 'Sí', tipoMoto: '' };
      default:
        return { sabeBicicleta: '', tipoMoto: '' };
    }
  };

  const handleCursoChange = (nuevoCursoId) => {
    const curso = cursos.find(c => String(c.id) === String(nuevoCursoId));
    if (!curso) return;

    const config = getConfiguracionDesdeCurso(curso);

    updateForm({
      cursoId: nuevoCursoId,
      cursoSeleccionadoManual: true,
      ...config
    });
  };

  useEffect(() => {
    if (precargaInicialRef.current) return;

    if (
      form.origenPublico &&
      form.cursoSugeridoActivo &&
      !form.cursoSeleccionadoManual
    ) {
      const curso = cursos.find(c => String(c.id) === String(form.cursoId));
      if (curso) {
        const config = getConfiguracionDesdeCurso(curso);
        updateForm(config);
        precargaInicialRef.current = true;
      }
    }
  }, [
    cursos,
    form.origenPublico,
    form.cursoSugeridoActivo,
    form.cursoSeleccionadoManual,
    form.cursoId,
    updateForm
  ]);
const cursoSeleccionado = cursos.find(c => String(c.id) === String(form.cursoId));
  return (
    <div className="space-y-4">
      {form.esRecompra ? (
        <>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">¿Sabes andar en bicicleta?</label>
            <div className="w-full bg-gray-100 border border-gray-200 rounded-xl py-3 px-4 text-gray-700 flex items-center gap-2">
              <Bike size={18} className="text-gray-400" />
              <span>Sí</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">Tipo de Moto</label>
            <div className="w-full bg-gray-100 border border-gray-200 rounded-xl py-3 px-4 text-gray-700 flex items-center gap-2">
              <Zap size={18} className="text-gray-400" />
              <span>{form.tipoMoto || 'Automática'}</span>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* 1. ¿Sabe andar en bicicleta? */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">¿Sabes andar en bicicleta?</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => updateForm({ sabeBicicleta: 'Sí' })}
                className={`p-4 border-2 rounded-xl transition-colors ${
                  form.sabeBicicleta === 'Sí' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <Bike size={24} className="mx-auto mb-1 text-blue-600" />
                <p className="font-bold text-sm">Sí sé</p>
              </button>
              <button
                type="button"
                onClick={() => updateForm({ sabeBicicleta: 'No' })}
                className={`p-4 border-2 rounded-xl transition-colors ${
                  form.sabeBicicleta === 'No' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <Bike size={24} className="mx-auto mb-1 text-gray-400" />
                <p className="font-bold text-sm">No sé</p>
              </button>
            </div>
            {form.sabeBicicleta === 'No' && (
              <p className="text-xs text-blue-700 font-bold mt-1 ml-1">
                Recargo por instrucción especial: +${recargoSinBici || 0} USD
              </p>
            )}
          </div>

          {/* 2. Tipo de moto (solo si sabe) */}
          {form.sabeBicicleta === 'Sí' ? (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">Tipo de Moto</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => updateForm({ tipoMoto: 'Automática' })}
                  className={`p-4 border-2 rounded-xl transition-colors ${
                    form.tipoMoto === 'Automática' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <Zap size={24} className="mx-auto mb-1 text-blue-600" />
                  <p className="font-bold text-sm">Automática</p>
                </button>
                <button
                  type="button"
                  onClick={() => updateForm({ tipoMoto: 'Sincrónica' })}
                  className={`p-4 border-2 rounded-xl transition-colors ${
                    form.tipoMoto === 'Sincrónica' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <Zap size={24} className="mx-auto mb-1 text-gray-400" />
                  <p className="font-bold text-sm">Sincrónica</p>
                </button>
              </div>
            </div>
          ) : (
            form.sabeBicicleta === 'No' && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1 flex items-center gap-1">
                  Tipo de Moto <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold">Automático</span>
                </label>
                <div className="w-full bg-gray-100 border border-gray-200 rounded-xl py-3 px-4 text-gray-600 flex items-center gap-2">
                  <Zap size={18} className="text-gray-400" />
                  <span>Automática</span>
                </div>
              </div>
            )
          )}
        </>
          )}

      {esOrigenPublico && (
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">
            Curso Seleccionado
          </label>
          <select
            value={form.cursoId || ''}
            onChange={e => handleCursoChange(e.target.value)}
            className="w-full bg-gray-50 border-2 border-gray-200 focus:border-blue-500 rounded-xl py-3 px-4 outline-none"
          >
            <option value="">Selecciona curso</option>
            {(cursos || []).filter(c => c.activo !== false).map(c => (
              <option key={c.id} value={c.id}>
                {c.nombre} — ${c.precioBase || 0}
              </option>
            ))}
          </select>
          {cursoSeleccionado && (
            <p className="text-xs text-gray-500 mt-1 ml-1">
              {cursoSeleccionado.descripcion}
            </p>
          )}
        </div>
      )}

      {form.esRecompra ? (
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1 flex items-center gap-1">
            Curso Seleccionado <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold">Fijado</span>
          </label>
          <div className="w-full bg-blue-50 border border-blue-200 rounded-xl py-3 px-4 text-gray-700 flex items-center gap-2">
            <BookOpen size={18} className="text-blue-500" />
            <span>{cursoSeleccionado?.nombre || 'Curso no encontrado'}</span>
          </div>
        </div>
            ) : esOrigenPublico ? null : esAutomatico && cursoAsignado ? (
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1 flex items-center gap-1">
            Curso Asignado <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold">Automático</span>
          </label>
          <div className="w-full bg-gray-100 border border-gray-200 rounded-xl py-3 px-4 text-gray-700 flex items-center gap-2">
            <BookOpen size={18} className="text-gray-400" />
            <span>{cursoAsignado.nombre}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1 ml-1 flex items-center gap-1">
            <Info size={12} />
            {form.sabeBicicleta === 'No'
              ? 'Asignado porque indicaste que no sabes andar en bicicleta'
              : `Asignado para moto ${form.tipoMoto?.toLowerCase()}`}
          </p>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-xl text-xs text-yellow-700">
          Selecciona si sabes bicicleta y tipo de moto para asignar curso.
        </div>
      )}

      {/* 4. Sede */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1 flex items-center gap-1">
          <MapPin size={16} className="text-gray-500" /> Sede
        </label>
        <select
          value={form.sedeId || ''}
          onChange={e => updateForm({ sedeId: e.target.value })}
          className="w-full bg-gray-50 border-2 border-gray-200 focus:border-blue-500 rounded-xl py-3 px-4 outline-none"
        >
          <option value="">Selecciona sede</option>
          {(sedes || []).filter(s => s.activo).map(s => (
            <option key={s.id} value={s.id}>{s.nombre}</option>
          ))}
        </select>
      </div>

      {/* 5. ¿Trae moto? */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">¿Traes tu propia moto?</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => updateForm({ traeMoto: 'No' })}
            className={`p-4 border-2 rounded-xl transition-colors ${
              form.traeMoto === 'No' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <span className="text-2xl">🏍️</span>
            <p className="font-bold text-sm">No</p>
          </button>
          <button
            type="button"
            onClick={() => updateForm({ traeMoto: 'Sí' })}
            className={`p-4 border-2 rounded-xl transition-colors ${
              form.traeMoto === 'Sí' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <span className="text-2xl">✅</span>
            <p className="font-bold text-sm">Sí</p>
          </button>
        </div>
      </div>
    </div>
  );
}