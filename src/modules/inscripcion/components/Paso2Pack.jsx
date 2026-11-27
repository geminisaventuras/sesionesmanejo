// @build: 2026-09-30 | id: LEGAL-TERMINOLOGIA-PASO2-PACK | desc: Paso 2 pack: deriva cursos por tipoCurso (no por índice)
import React, { useContext } from 'react';
import { MapPin, Bike, Zap, BookOpen, Package, GraduationCap } from 'lucide-react';
import { AppContext } from '../../../context/AppContextValue';
import { nombreSedeCanonico } from '../../shared/utils/sedesHelpers';
import { calcularRecargoSedePack } from '../utils/packPricing';
import { MovilidadSolicitud } from './MovilidadSolicitud';

export function Paso2Pack({ form, updateForm, pack, cursos, sedes, esCursoDosDias = false, fecha2Calc = null }) {
  const ctx = useContext(AppContext);
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
  // FIX-PERMITE-TRAER-MOTO-PACK: usar el campo permiteTraerMotoPropia como SSOT.
  // Reemplaza el hardcode por tipoCurso === 'equilibrio'. Jerarquía:
  //   1. Sin moto app (motoIncluida: false) → obligado traer propia.
  //   2. Con moto app pero NO permite propia (ej: Equilibrio) → obligado usar moto escuela.
  //   3. Con moto app y permite propia → el estudiante elige.
  // Isomórfico con Paso2Configuracion.jsx y ReservaService.crearReserva.
  const cursosConComportamiento = cursosPack.map(curso => {
    const motoIncluida = curso.motoIncluida !== false;
    const permiteTraerMotoPropia = curso.permiteTraerMotoPropia !== false;

    if (!motoIncluida) {
      return { curso, modo: 'fijo-propia' };
    }
    if (!permiteTraerMotoPropia) {
      return { curso, modo: 'fijo-escuela' };
    }
    return { curso, modo: 'preguntar' };
  });

  const precioBaseCursos = cursosPack.reduce((acc, c) => acc + (Number(c.precioBase) || 0), 0);
  const precioBaseTeoricos = pack?.sumarTeoricosAlPrecio
    ? (pack.cursosTeoricosIncluidos || []).reduce((acc, ctId) => {
        const ct = (ctx.cursosTeoricos || []).find(x => String(x.id) === String(ctId));
        return acc + (Number(ct?.precio) || 0);
      }, 0)
    : 0;
  const preciosPack = pack?.precios;
  const precioBase = preciosPack?.precioBaseTotal ?? (precioBaseCursos + precioBaseTeoricos);
  const descuentoMonto = preciosPack?.descuentoMonto ?? (pack?.descuentoTipo === 'porcentaje'
    ? (precioBase * (Number(pack.descuentoValor) || 0)) / 100
    : (Number(pack.descuentoValor) || 0));
  const precioFinal = preciosPack?.precioTotal ?? Math.max(0, precioBase - descuentoMonto);
  // ERR-053 / ADR-017: recargo de la sede elegida por cada sesión práctica.
  const sedeSeleccionada = (sedes || []).find(s => String(s.id) === String(form.sedeId));
  const sesionesPracticas = cursosPack.length;
  const recargoPack = calcularRecargoSedePack({
    sesiones: sesionesPracticas,
    recargoSede: sedeSeleccionada?.recargo,
  });
  const recargoSedeUnitario = recargoPack.recargoSedeUnitario;
  const recargoSedeTotal = recargoPack.recargoSedeTotal;
  const precioFinalConRecargo = Number((precioFinal + recargoSedeTotal).toFixed(2));

  const traeMotoPorCurso = form.traeMotoPorCurso || {};

  // FT-090: la movilidad de la primera sesión del pack solo aplica si esa
  // sesión usa moto propia (el prestador conduce la moto del estudiante).
  const primeraSesionPack = cursosConComportamiento[0] || null;
  const traeMotoPrimeraSesion = primeraSesionPack
    ? (primeraSesionPack.modo === 'fijo-propia' ||
       (primeraSesionPack.modo === 'preguntar' &&
        traeMotoPorCurso[String(primeraSesionPack.curso.id)] === 'Sí'))
    : false;

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

      {(pack?.cursosTeoricosIncluidos || []).length > 0 && (
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-3">
          <h4 className="text-[10px] font-black text-teal-900 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <GraduationCap size={12} /> Módulos formativos incluidos
          </h4>
          <div className="space-y-1">
            {(pack.cursosTeoricosIncluidos || []).map(ctId => {
              const ct = (ctx.cursosTeoricos || []).find(x => String(x.id) === String(ctId));
              return (
                <div key={ctId} className="flex items-center gap-2 text-xs text-teal-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 flex-shrink-0" />
                  <span className="truncate">{ct?.nombre || ctId}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
            <option key={s.id} value={s.id}>{nombreSedeCanonico(s)}</option>
          ))}
        </select>
        {sedesPermitidas.length === 0 && (
          <p className="text-xs text-red-700 mt-1 ml-1">
            Este pack no está disponible en ninguna sede activa.
          </p>
        )}
        {sedesPermitidas.length > 1 && (
          <p className="text-[11px] text-gray-500 mt-1 ml-1">
            El total del pack varía según la sede: cada sesión suma el recargo de la sede elegida.
          </p>
        )}
        {sedeSeleccionada && (
          <p className={`text-xs mt-1 ml-1 font-semibold ${recargoSedeUnitario > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
            {recargoSedeUnitario > 0
              ? `${nombreSedeCanonico(sedeSeleccionada)} suma $${recargoSedeUnitario.toFixed(2)} por sesión: +$${recargoSedeTotal.toFixed(2)} por ${sesionesPracticas} ${sesionesPracticas === 1 ? 'sesión' : 'sesiones'}.`
              : `${nombreSedeCanonico(sedeSeleccionada)} no tiene recargo por sesión.`}
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

      {/* FT-090: movilidad de la primera sesión del pack con captura de ubicación. */}
      <MovilidadSolicitud
        form={form}
        updateForm={updateForm}
        sedes={sedes}
        config={ctx.config}
        esCursoDosDias={esCursoDosDias}
        fecha2Calc={fecha2Calc}
        permitirSinTraeMoto={traeMotoPrimeraSesion}
        titulo="Solicitar movilidad para la primera sesión del pack"
        ayuda="Marca tu ubicación de recogida y autoriza el traslado. El costo se paga directo al prestador y no se suma al pack."
        etiquetaD2="Solicitar movilidad también para el segundo día de la primera sesión"
      />

      {/* Preview de precio */}
      <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-200 space-y-1 text-sm">
        <div className="flex justify-between"><span className="text-gray-600">Suma base:</span><span className="font-bold">${precioBase.toFixed(2)}</span></div>
        <div className="flex justify-between text-red-600"><span>Descuento:</span><span className="font-bold">-${descuentoMonto.toFixed(2)}</span></div>
        {recargoSedeTotal > 0 && (
          <div className="flex justify-between text-amber-700">
            <span>Recargo sede ({sesionesPracticas} × ${recargoSedeUnitario.toFixed(2)}):</span>
            <span className="font-bold">+${recargoSedeTotal.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-indigo-300 pt-1 mt-1 text-base">
          <span className="font-bold text-gray-800">Total del pack:</span>
          <span className="font-black text-indigo-700">${precioFinalConRecargo.toFixed(2)}</span>
        </div>
        {recargoSedeTotal > 0 && (
          <p className="text-[10px] text-indigo-600">El recargo se cobra por sesión y no forma parte del descuento del pack.</p>
        )}
      </div>
    </div>
  );
}

export default Paso2Pack;