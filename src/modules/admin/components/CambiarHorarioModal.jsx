// @build: 2026-09-28.20-45-00 | id: REPOSICION-D2 | backup: CambiarHorarioModal.jsx.backup-20260928-202258 | desc: Modal con modo "Cambiar todo" y modo "Reponer D2" (post-inicio)
import { useState, useMemo, useCallback } from 'react';
import { Calendar, Clock, AlertTriangle, X, Repeat } from 'lucide-react';
import { obtenerLocksActivos, verificarDisponibilidadInstructor, verificarDisponibilidadMoto } from '../utils/reservaHorarioHelpers';
import { isPastBlock, getHoraIdOcupacion } from '../../shared/utils/reservaHelpers';
export default function CambiarHorarioModal({
  reserva,
  ctx,
  onConfirmar,
  onCancelar
}) {
  const { horarios, ocupacionConfirmada, cursos, instructores, motos } = ctx;

  // ── Detectar si se puede activar el modo "Reponer D2" ────────
  const curso = cursos.find(c => String(c.id) === String(reserva.cursoId));
  const esCursoDosDias = (curso?.duracionTotal || 240) > 120;

  const modulosEstadoArr = reserva.modulosEstado ? Object.values(reserva.modulosEstado) : [];
  const hayModulosCompletados = modulosEstadoArr.some(m => m?.fecha);
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });
  const d1YaPaso = reserva.fecha && reserva.fecha < hoy;
  const puedeReponerD2 = esCursoDosDias && (d1YaPaso || hayModulosCompletados);

  // ── Estado del modal ─────────────────────────────────────────
  const [modo, setModo] = useState(puedeReponerD2 ? 'reponer_d2' : 'cambio_total');

  // Modo cambio_total (comportamiento actual)
  const [nuevaFecha, setNuevaFecha] = useState(reserva.fecha || '');
  const [nuevoHoraId, setNuevoHoraId] = useState('');

  // Modo reponer_d2 (nuevo)
  const [nuevaFecha2, setNuevaFecha2] = useState('');
  const [horaIdReposicion, setHoraIdReposicion] = useState('h3');
  const [motoReposicionId, setMotoReposicionId] = useState(reserva.motoAsignadaId || '');

  // Comunes
  const [motivo, setMotivo] = useState('');
  const [categoriaMotivo, setCategoriaMotivo] = useState('personal');
  const [notasAdmin, setNotasAdmin] = useState('');
  const [advertencias, setAdvertencias] = useState([]);
  const [validando, setValidando] = useState(false);

  // ── Fecha2 automática para modo cambio_total ────────────────
  const nuevaFecha2Calculada = useMemo(() => {
    if (modo !== 'cambio_total' || !nuevaFecha || !esCursoDosDias) return null;
    const fechaObj = new Date(nuevaFecha + 'T12:00:00');
    fechaObj.setDate(fechaObj.getDate() + 1);
    return fechaObj.toISOString().split('T')[0];
  }, [nuevaFecha, esCursoDosDias, modo]);

  // ── Horarios disponibles para la fecha según el modo ────────
  const horariosDisponibles = useMemo(() => {
    const fechaParaFiltrar = modo === 'reponer_d2' ? nuevaFecha2 : nuevaFecha;
    if (!fechaParaFiltrar) return [];

      const otraOcupaSlot = (r, horaId) => {
      if (r.estadoPago !== 'Aprobado' && r.estadoPago !== 'Pendiente') return false;

      // La propia reserva también cuenta como ocupante.
      // Si el bloque actual ya es de esta reserva, no debe ofrecerse en el dropdown.
      const horaOcupada = getHoraIdOcupacion(r, fechaParaFiltrar);
      return horaOcupada !== null && String(horaOcupada) === String(horaId);
    };

       const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });

    return horarios.filter(h => {
      if (!h.activo) return false;
      if (modo === 'cambio_total' && h.isLunch) return false;
      // En modo reponer_d2 SÍ permitimos h3 (almuerzo)

      // Filtrar bloques cuyo horario de inicio ya pasó (solo aplica si la fecha es hoy)
      if (isPastBlock(fechaParaFiltrar, h.label, hoy)) return false;

      return !(ocupacionConfirmada || []).some(r => otraOcupaSlot(r, h.id));
    });
  }, [nuevaFecha, nuevaFecha2, modo, horarios, ocupacionConfirmada, reserva.id]);

  // ── Validaciones al seleccionar ─────────────────────────────
  const validarSeleccion = useCallback(async () => {
    const fechaValidar = modo === 'reponer_d2' ? nuevaFecha2 : nuevaFecha;
    const horaValidar = modo === 'reponer_d2' ? horaIdReposicion : nuevoHoraId;
    if (!fechaValidar || !horaValidar) return;

    setValidando(true);
    const advertenciasTemp = [];

    const locks = await obtenerLocksActivos(fechaValidar, horaValidar);
    if (locks.length > 0) {
      advertenciasTemp.push({
        tipo: 'lock',
        mensaje: `Hay ${locks.length} usuario(s) seleccionando este horario actualmente.`
      });
    }

    const fechaOriginal = modo === 'reponer_d2' ? reserva.fecha : nuevaFecha;
    const fecha2Final = modo === 'reponer_d2' ? nuevaFecha2 : nuevaFecha2Calculada;
    const motoValidar = modo === 'reponer_d2'
      ? (motoReposicionId || reserva.motoAsignadaId)
      : reserva.motoAsignadaId;

    const instructorDisponible = verificarDisponibilidadInstructor(
      reserva.instructorId,
      fechaOriginal,
      fecha2Final,
      horaValidar,
      ocupacionConfirmada,
      reserva.id
    );

    if (!instructorDisponible) {
      advertenciasTemp.push({
        tipo: 'instructor',
        mensaje: 'El instructor asignado puede tener conflictos en el nuevo horario.'
      });
    }

    if (motoValidar) {
      const motoDisponible = verificarDisponibilidadMoto(
        motoValidar,
        fechaOriginal,
        fecha2Final,
        horaValidar,
        ocupacionConfirmada,
        reserva.id
      );

      if (!motoDisponible) {
        advertenciasTemp.push({
          tipo: 'moto',
          mensaje: 'La moto puede tener conflictos en el nuevo horario.'
        });
      }
    }

    setAdvertencias(advertenciasTemp);
    setValidando(false);
  }, [nuevaFecha, nuevaFecha2, nuevaFecha2Calculada, modo, horaIdReposicion, nuevoHoraId, motoReposicionId, reserva, ocupacionConfirmada]);

  // ── Confirmar ────────────────────────────────────────────────
  const handleConfirmar = () => {
    if (modo === 'reponer_d2') {
      onConfirmar({
        modo: 'reponer_d2',
        nuevaFecha2,
        horaIdReposicion,
        motoReposicionId: motoReposicionId || reserva.motoAsignadaId || null,
        motivo,
        categoriaMotivo,
        notasAdmin
      });
    } else {
      onConfirmar({
        modo: 'cambio_total',
        nuevaFecha,
        nuevaFecha2: nuevaFecha2Calculada,
        nuevoHoraId,
        motivo,
        categoriaMotivo,
        notasAdmin
      });
    }
  };

  const puedeConfirmar = modo === 'reponer_d2'
    ? (!!nuevaFecha2 && !!horaIdReposicion && !!motivo && !validando)
    : (!!nuevaFecha && !!nuevoHoraId && !!motivo && !validando);

  const motosDisponibles = (motos || []).filter(m => m.activo !== false);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <Calendar size={20} className="text-blue-600" />
            {modo === 'reponer_d2' ? 'Reponer D2' : 'Cambiar Horario de Reserva'}
          </h2>
          <button onClick={onCancelar} className="p-1.5 bg-gray-100 rounded-full">
            <X size={18} className="text-gray-600" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Selector de modo (solo si aplica) */}
          {puedeReponerD2 && (
            <div className="bg-blue-50 border border-blue-200 p-2 rounded-xl">
              <p className="text-[11px] text-blue-900 mb-2 font-bold">Modo de reprogramación</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => { setModo('reponer_d2'); setAdvertencias([]); }}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-colors ${
                    modo === 'reponer_d2'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-200'
                  }`}
                >
                  Reponer D2 (post-inicio)
                </button>
                <button
                  type="button"
                  onClick={() => { setModo('cambio_total'); setAdvertencias([]); }}
                  className={`py-2 px-3 rounded-lg text-xs font-bold transition-colors ${
                    modo === 'cambio_total'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-200'
                  }`}
                >
                  Cambiar todo
                </button>
              </div>
            </div>
          )}

          {/* Horario actual */}
          <div className="bg-gray-50 p-3 rounded-xl">
            <h3 className="font-bold text-gray-700 text-xs mb-2">
              {modo === 'reponer_d2' ? 'Horario Original (D1 - inmutable)' : 'Horario Actual'}
            </h3>
            <p className="text-xs text-gray-600">
              📅 {reserva.fecha} {reserva.fecha2 && `- ${reserva.fecha2}`}
            </p>
            <p className="text-xs text-gray-600">🕐 {reserva.horaId}</p>
            {modo === 'reponer_d2' && (
              <p className="text-[10px] text-gray-500 mt-1 italic">
                La fecha del D1 y el bloque original quedan como registro histórico.
              </p>
            )}
          </div>

          {/* ── MODO REPONER D2 ──────────────────────────────── */}
          {modo === 'reponer_d2' && (
            <>
              {/* D1 en gris (referencia inmutable) */}
              <div className="bg-gray-100 p-3 rounded-xl border border-gray-200">
                <label className="block font-bold text-gray-500 text-xs mb-1">Fecha D1 (inmutable)</label>
                <input
                  type="date"
                  value={reserva.fecha || ''}
                  disabled
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-100 text-gray-500 cursor-not-allowed"
                />
              </div>

              {/* Nueva fecha D2 */}
              <div>
                <label className="block font-bold text-gray-700 text-xs mb-1">Nueva Fecha D2 *</label>
                <input
                  type="date"
                  value={nuevaFecha2}
                  onChange={(e) => {
                    setNuevaFecha2(e.target.value);
                    setHoraIdReposicion('');
                    setAdvertencias([]);
                  }}
                  min={hoy}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500"
                />
              </div>

              {/* Bloque de reposición */}
              <div>
                <label className="block font-bold text-gray-700 text-xs mb-1">
                  Bloque de Reposición * <span className="text-gray-400 font-normal">(h3 = almuerzo por defecto)</span>
                </label>
                <select
                  value={horaIdReposicion}
                  onChange={(e) => {
                    setHoraIdReposicion(e.target.value);
                    validarSeleccion();
                  }}
                  disabled={!nuevaFecha2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500 disabled:opacity-50"
                >
                  <option value="">Seleccionar bloque</option>
                  {horariosDisponibles.map(h => (
                    <option key={h.id} value={h.id}>
                      {h.label || `${h.horaInicio} - ${h.horaFin}`}{h.isLunch ? ' (Almuerzo)' : ''}
                    </option>
                  ))}
                </select>
                {horariosDisponibles.length === 0 && nuevaFecha2 && (
                  <p className="text-xs font-bold text-orange-600 mt-1">
                    No hay bloques disponibles para esta fecha.
                  </p>
                )}
              </div>

              {/* Moto de reposición (opcional) */}
              {reserva.motoAsignadaId && (
                <div>
                  <label className="block font-bold text-gray-700 text-xs mb-1">
                    Moto de Reposición <span className="text-gray-400 font-normal">(opcional)</span>
                  </label>
                  <select
                    value={motoReposicionId}
                    onChange={(e) => {
                      setMotoReposicionId(e.target.value);
                      setAdvertencias([]);
                    }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500"
                  >
                    <option value="">Misma moto original ({reserva.motoAsignadaId.slice(0,8)})</option>
                    {motosDisponibles
                      .filter(m => String(m.id) !== String(reserva.motoAsignadaId))
                      .map(m => (
                        <option key={m.id} value={m.id}>
                          {m.nombre || m.marca || m.id.slice(0,8)} ({m.tipo || 'moto'})
                        </option>
                      ))}
                  </select>
                  <p className="text-[10px] text-gray-500 mt-1">
                    Si la moto original está ocupada en el bloque de reposición, seleccioná otra.
                  </p>
                </div>
              )}
            </>
          )}

          {/* ── MODO CAMBIO TOTAL ────────────────────────────── */}
          {modo === 'cambio_total' && (
            <>
              <div>
                <label className="block font-bold text-gray-700 text-xs mb-1">Nueva Fecha *</label>
                <input
                  type="date"
                  value={nuevaFecha}
                  onChange={(e) => {
                    setNuevaFecha(e.target.value);
                    setNuevoHoraId('');
                    setAdvertencias([]);
                  }}
                  min={hoy}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500"
                />
                {esCursoDosDias && nuevaFecha2Calculada && (
                  <p className="text-[11px] text-gray-500 mt-1">
                    Segunda fecha (automática): {nuevaFecha2Calculada}
                  </p>
                )}
              </div>

              <div>
                <label className="block font-bold text-gray-700 text-xs mb-1">Nuevo Horario *</label>
                <select
                  value={nuevoHoraId}
                  onChange={(e) => {
                    setNuevoHoraId(e.target.value);
                    validarSeleccion();
                  }}
                  disabled={!nuevaFecha}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500 disabled:opacity-50"
                >
                  <option value="">Seleccionar horario</option>
                  {horariosDisponibles.map(h => (
                    <option key={h.id} value={h.id}>
                      {h.label || `${h.horaInicio} - ${h.horaFin}`}
                    </option>
                  ))}
                </select>
                {horariosDisponibles.length === 0 && nuevaFecha && (
                  <p className="text-xs font-bold text-orange-600 mt-1">
                    No hay horarios disponibles para esta fecha.
                  </p>
                )}
              </div>
            </>
          )}

          {/* ── CAMPOS COMUNES ───────────────────────────────── */}
          <div>
            <label className="block font-bold text-gray-700 text-xs mb-1">
              Motivo * <span className="text-gray-400 font-normal">(visible en la reserva)</span>
            </label>
            <select
              value={categoriaMotivo}
              onChange={(e) => setCategoriaMotivo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500 mb-2"
            >
              <option value="personal">Personal</option>
              <option value="salud">Salud</option>
              <option value="clima">Clima</option>
              <option value="admin">Decisión administrativa</option>
              <option value="otro">Otro</option>
            </select>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Descripción breve del motivo..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="block font-bold text-gray-700 text-xs mb-1">
              Notas Adicionales <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              value={notasAdmin}
              onChange={(e) => setNotasAdmin(e.target.value)}
              placeholder="Notas internas..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500"
            />
          </div>

          {/* ── Advertencias ─────────────────────────────────── */}
          {advertencias.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-xl">
              <h4 className="font-bold text-yellow-900 text-xs mb-1 flex items-center gap-1">
                <AlertTriangle size={14} />
                Advertencias
              </h4>
              <ul className="space-y-1">
                {advertencias.map((adv, i) => (
                  <li key={i} className="text-[11px] text-yellow-800">
                    • {adv.mensaje}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="p-4 border-t flex gap-2 justify-end">
          <button
            onClick={onCancelar}
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </button>

          <button
            onClick={handleConfirmar}
            disabled={!puedeConfirmar}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {validando
              ? 'Validando...'
              : (modo === 'reponer_d2' ? 'Confirmar Reposición' : 'Confirmar Cambio')}
          </button>
        </div>
      </div>
    </div>
  );
}
