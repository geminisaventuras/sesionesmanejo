// @build: 2026-09-30 | id: LEGAL-TERMINOLOGIA-PASO2-PACK | desc: Paso 2 pack: deriva cursos por tipoCurso (no por índice)
import React from 'react';
import { MapPin, Bike, Zap, BookOpen, Package } from 'lucide-react';

export function Paso2Pack({ form, updateForm, pack, cursos, sedes }) {
  const cursosPack = (pack?.cursoIds || [])
    .map(id => (cursos || []).find(c => String(c.id) === String(id)))
    .filter(Boolean);

  // Curso Básico: necesario para derivar el tipo de moto del pack
  const cursoBasico = cursosPack.find(c =>
    typeof c.tipoCurso === 'string' && c.tipoCurso.startsWith('basico_')
  );

  const tipoMotoDerivado = (cursoBasico?.tiposMotoEscuela || [])[0] || 'Automática';

  const sedesPermitidas = (sedes || []).filter(s =>
    s.activo && (
      !pack?.sedesPermitidas?.length ||
      pack.sedesPermitidas.includes(String(s.id))
    )
  );

  // Determinar comportamiento de cada curso
  const cursosConComportamiento = cursosPack.map(curso => {
    const esEquilibrio = curso.tipoCurso === 'equilibrio';
    const motoIncluida = curso.motoIncluida !== false;

    if (esEquilibrio) {
      return { curso, modo: 'fijo-escuela' };
    }
    if (!motoIncluida) {
      return { curso, modo: 'fijo-propia' };
    }
    return { curso, modo: 'preguntar' };
  });

  const precioBase = cursosPack.reduce((acc, c) => acc + (Number(c.precioBase) || 0), 0);
  const descuentoMonto = pack?.descuentoTipo === 'porcentaje'
    ? (precioBase * (Number(pack.descuentoValor) || 0)) / 100
    : (Number(pack.descuentoValor) || 0);
  const precioFinal = Math.max(0, precioBase - descuentoMonto);

  const traeMotoPorCurso = form.traeMotoPorCurso || {};

  const setTraeMoto = (cursoId, valor) => {
    updateForm({
      traeMotoPorCurso: {
        ...traeMotoPorCurso,
        [String(cursoId)]: valor
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Resumen del pack */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
        <div className="flex items-start gap-2">
          <Package size={20} className="text-indigo-600 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <h3 className="font-black text-sm text-indigo-900">{pack?.nombre || 'Pack'}</h3>
            <p className="text-xs text-indigo-700 mt-0.5">
              Incluye {cursosPack.length} sesiones: {cursosPack.map(c => c.nombre).join(' → ')}
            </p>
          </div>
        </div>
      </div>

      {/* Sede */}
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
        {sedesPermitidas.length === 0 && (
          <p className="text-xs text-red-700 mt-1 ml-1">
            Este pack no está disponible en ninguna sede activa.
          </p>
        )}
      </div>

      {/* Tipo moto (del pack) */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1 flex items-center gap-1">
          Tipo de Moto
          <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold">Del pack</span>
        </label>
        <div className="w-full bg-gray-100 border border-gray-200 rounded-xl py-3 px-4 text-gray-700 flex items-center gap-2">
          <Zap size={18} className="text-gray-400" />
          <span>{tipoMotoDerivado}</span>
        </div>
      </div>

      {/* Moto por curso */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
        <h4 className="text-xs font-black text-gray-700 uppercase tracking-wider">
          ¿Cómo harás cada sesión?
        </h4>

        {cursosConComportamiento.map(({ curso, modo }) => {
          const cursoId = String(curso.id);
          const trae = traeMotoPorCurso[cursoId];

          if (modo === 'fijo-escuela') {
            return (
              <div key={cursoId} className="flex items-center gap-2 bg-white p-3 rounded-lg border border-gray-200">
                <BookOpen size={16} className="text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900">{curso.nombre}</p>
                  <p className="text-[10px] text-gray-500">Moto de Moto App</p>
                </div>
                <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-bold flex-shrink-0">
                  Fijo
                </span>
              </div>
            );
          }

          if (modo === 'fijo-propia') {
            return (
              <div key={cursoId} className="flex items-center gap-2 bg-white p-3 rounded-lg border border-gray-200">
                <BookOpen size={16} className="text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900">{curso.nombre}</p>
                  <p className="text-[10px] text-gray-500">Debes traer tu propia moto</p>
                </div>
                <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-bold flex-shrink-0">
                  Fijo
                </span>
              </div>
            );
          }

          // modo === 'preguntar'
          return (
            <div key={cursoId} className="bg-white p-3 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Bike size={16} className="text-blue-500 flex-shrink-0" />
                <p className="text-sm font-bold text-gray-900">{curso.nombre}</p>
              </div>
              <p className="text-xs text-gray-600 mb-2">¿Traes tu propia moto?</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTraeMoto(cursoId, 'No')}
                  className={`py-2 px-3 border-2 rounded-lg text-xs font-bold transition-colors ${
                    trae === 'No'
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                  }`}
                >
                  Uso Moto App
                </button>
                <button
                  type="button"
                  onClick={() => setTraeMoto(cursoId, 'Sí')}
                  className={`py-2 px-3 border-2 rounded-lg text-xs font-bold transition-colors ${
                    trae === 'Sí'
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                  }`}
                >
                  Traigo la mía
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Preview de precio */}
      <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-200 space-y-1 text-sm">
        <div className="flex justify-between"><span className="text-gray-600">Suma base:</span><span className="font-bold">${precioBase.toFixed(2)}</span></div>
        <div className="flex justify-between text-red-600"><span>Descuento:</span><span className="font-bold">-${descuentoMonto.toFixed(2)}</span></div>
        <div className="flex justify-between border-t border-indigo-300 pt-1 mt-1 text-base">
          <span className="font-bold text-gray-800">Total del pack:</span>
          <span className="font-black text-indigo-700">${precioFinal.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

export default Paso2Pack;