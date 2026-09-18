// @build: 2026-09-14 | id: PASO2-VALIDACIONES-CURSO | desc: Validacion de compatibilidad curso-caracteristicas + auto-ajuste segun campos del curso
import React, { useRef, useEffect, useMemo } from 'react';
import { MapPin, Bike, Zap, BookOpen, Info } from 'lucide-react';
import { useCursoAutomatico } from '../../../hooks/useCursoAutomatico';

function evaluarCompatibilidad(curso, form) {
    if (!curso) return { ok: false, razon: '' };
  const tipoCurso = curso.tipoCurso;

    // A2.2-bis: bloquear cursos con prerequisitos duros (excepto básicos, que son soft)
  if (Array.isArray(curso.prerequisitos) && curso.prerequisitos.length > 0) {
    const esBasico = tipoCurso === 'basico_auto' || tipoCurso === 'basico_sincro';
    if (!esBasico) {
      return { ok: false, razon: 'Requiere curso previo' };
    }
  }

  // Regla 1: sabeBicicleta
  if (form.sabeBicicleta === 'No' && tipoCurso !== 'equilibrio') {
    return { ok: false, razon: 'Requiere saber andar en bicicleta' };
  }
  if (form.sabeBicicleta === 'Sí' && tipoCurso === 'equilibrio') {
    return { ok: false, razon: 'Solo para quienes no saben bicicleta' };
  }

  // Regla 2: tipoMoto vs tiposMotoEscuela del curso
  const motoIncluida = curso.motoIncluida !== false;
  const tiposMoto = curso.tiposMotoEscuela || [];
  if (motoIncluida && tiposMoto.length > 0 && form.tipoMoto && !tiposMoto.includes(form.tipoMoto)) {
    return { ok: false, razon: `Solo moto ${tiposMoto.join('/')}` };
  }

  return { ok: true };
}

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

  const cursoSeleccionado = useMemo(
    () => cursos?.find(c => String(c.id) === String(form.cursoId)),
    [cursos, form.cursoId]
  );

  // Deriva configuracion inicial desde campos del curso (reemplaza hardcode por tipoCurso)
  const getConfiguracionDesdeCurso = (curso) => {
    if (!curso) return {};
    const tipoCurso = curso.tipoCurso;
    const tiposMoto = curso.tiposMotoEscuela || [];
    const motoIncluida = curso.motoIncluida !== false;

    let sabeBicicleta = 'Sí';
    if (tipoCurso === 'equilibrio') sabeBicicleta = 'No';

    let tipoMoto = '';
    if (sabeBicicleta === 'No') {
      tipoMoto = 'Automática';
    } else if (tiposMoto.length >= 1) {
      tipoMoto = tiposMoto[0];
    }

    const traeMoto = motoIncluida ? 'No' : 'Sí';

    return { sabeBicicleta, tipoMoto, traeMoto };
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
  }, [cursos, form.origenPublico, form.cursoSugeridoActivo, form.cursoSeleccionadoManual, form.cursoId, updateForm]);

  // Reglas activas para UI
  const motoIncluida = cursoSeleccionado?.motoIncluida !== false;
  const tiposMotoEscuela = cursoSeleccionado?.tiposMotoEscuela || [];
  const bloqueaTraeMoto = !!cursoSeleccionado && !motoIncluida;

    const bloqueaTipoMoto = (tipo) => {
    if (form.sabeBicicleta === 'No' && tipo !== 'Automática') return true;
    // A2.2-ter: en básicos, permitir cambio de tipo moto (cambia el curso automáticamente)
    const esBasicoActual = cursoSeleccionado?.tipoCurso === 'basico_auto' || cursoSeleccionado?.tipoCurso === 'basico_sincro';
    if (esBasicoActual) return false;
    if (motoIncluida && tiposMotoEscuela.length > 0 && !tiposMotoEscuela.includes(tipo)) return true;
    return false;
  };

  // A2.2-ter: cambiar tipo moto en básico → cambia el curso al básico correspondiente
  const handleTipoMotoChange = (tipo) => {
    if (bloqueaTipoMoto(tipo)) return;
    const esBasicoActual = cursoSeleccionado?.tipoCurso === 'basico_auto' || cursoSeleccionado?.tipoCurso === 'basico_sincro';
    if (form.sabeBicicleta === 'Sí' && (esBasicoActual || !cursoSeleccionado)) {
      const nuevoTipoCurso = tipo === 'Automática' ? 'basico_auto' : 'basico_sincro';
      const nuevoCurso = (cursos || []).find(c => c.tipoCurso === nuevoTipoCurso);
      if (nuevoCurso) {
        updateForm({ tipoMoto: tipo, cursoId: nuevoCurso.id, cursoSeleccionadoManual: false });
        return;
      }
    }
    updateForm({ tipoMoto: tipo });
  };

  // Sedes filtradas por curso
  const sedesPermitidas = useMemo(() => {
    const permitidas = cursoSeleccionado?.sedesPermitidas;
    const activas = (sedes || []).filter(s => s.activo);
    if (!permitidas || permitidas.length === 0) return activas;
    return activas.filter(s => permitidas.includes(s.id));
  }, [sedes, cursoSeleccionado]);

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
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">¿Sabes andar en bicicleta?</label>
            <div className="grid grid-cols-2 gap-3">
                            <button
                type="button"
                onClick={() => {
                  const cursoActual = cursoSeleccionado;
                  const esEquilibrio = cursoActual?.tipoCurso === 'equilibrio';
                  updateForm({
                    sabeBicicleta: 'Sí',
                    ...(esEquilibrio ? { cursoId: '', cursoSeleccionadoManual: false } : {})
                  });
                }}
                className={`p-4 border-2 rounded-xl transition-colors ${
                  form.sabeBicicleta === 'Sí' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <Bike size={24} className="mx-auto mb-1 text-blue-600" />
                <p className="font-bold text-sm">Sí sé</p>
              </button>
                           <button
                type="button"
                onClick={() => {
                  const cursoEquilibrio = (cursos || []).find(c => c.tipoCurso === 'equilibrio');
                  updateForm({
                    sabeBicicleta: 'No',
                    tipoMoto: 'Automática',
                    ...(cursoEquilibrio ? { cursoId: cursoEquilibrio.id, cursoSeleccionadoManual: false } : {})
                  });
                }}
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
                Recargo por instruccion especial: +${recargoSinBici || 0} USD
              </p>
            )}
          </div>

          {form.sabeBicicleta === 'Sí' ? (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">Tipo de Moto</label>
              <div className="grid grid-cols-2 gap-3">
                               <button
                  type="button"
                  onClick={() => handleTipoMotoChange('Automática')}
                  disabled={bloqueaTipoMoto('Automática')}
                  className={`p-4 border-2 rounded-xl transition-colors ${
                    form.tipoMoto === 'Automática' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-white'
                  } ${bloqueaTipoMoto('Automática') ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  <Zap size={24} className="mx-auto mb-1 text-blue-600" />
                  <p className="font-bold text-sm">Automática</p>
                </button>
                                <button
                  type="button"
                  onClick={() => handleTipoMotoChange('Sincrónica')}
                  disabled={bloqueaTipoMoto('Sincrónica')}
                  className={`p-4 border-2 rounded-xl transition-colors ${
                    form.tipoMoto === 'Sincrónica' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-white'
                  } ${bloqueaTipoMoto('Sincrónica') ? 'opacity-40 cursor-not-allowed' : ''}`}
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
          <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">Curso Seleccionado</label>
          <select
            value={form.cursoId || ''}
            onChange={e => handleCursoChange(e.target.value)}
            className="w-full bg-gray-50 border-2 border-gray-200 focus:border-blue-500 rounded-xl py-3 px-4 outline-none"
          >
            <option value="">Selecciona curso</option>
            {(cursos || []).filter(c => c.activo !== false).map(c => {
              const compat = evaluarCompatibilidad(c, form);
              return (
                <option key={c.id} value={c.id} disabled={!compat.ok}>
                  {c.nombre} — ${c.precioBase || 0}{compat.ok ? '' : ` (${compat.razon})`}
                </option>
              );
            })}
          </select>
          {cursoSeleccionado && (
            <p className="text-xs text-gray-500 mt-1 ml-1">{cursoSeleccionado.descripcion}</p>
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
          {sedesPermitidas.map(s => (
            <option key={s.id} value={s.id}>{s.nombre}</option>
          ))}
        </select>
        {cursoSeleccionado?.sedesPermitidas?.length > 0 && sedesPermitidas.length === 0 && (
          <p className="text-xs text-red-700 mt-1 ml-1">
            Este curso no esta disponible en ninguna sede activa.
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">¿Traes tu propia moto?</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => !bloqueaTraeMoto && updateForm({ traeMoto: 'No' })}
            disabled={bloqueaTraeMoto}
            className={`p-4 border-2 rounded-xl transition-colors ${
              form.traeMoto === 'No' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-white'
            } ${bloqueaTraeMoto ? 'opacity-40 cursor-not-allowed' : ''}`}
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
        {bloqueaTraeMoto && (
          <p className="text-[11px] text-yellow-700 mt-2 ml-1">
            Este curso requiere que traigas tu propia moto.
          </p>
        )}
      </div>
    </div>
  );
}
