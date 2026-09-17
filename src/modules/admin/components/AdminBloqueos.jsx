// @build: 2026-09-14 | id: ADMIN-BLOQUEOS | desc: Bloqueos de horarios por admin (dia completo o parcial, con o sin sede)
import { useState, useEffect, useContext, useMemo } from 'react';
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../../firebase';
import { AppContext } from '../../../context/AppContextValue';
import { useToast } from '../../shared/components/ToastProvider';
import { Button, Input } from '../../../components/UI';
import { Trash2, Calendar, MapPin, Clock, Plus, AlertCircle } from 'lucide-react';
import { ordenarHorarios } from '../../shared/utils/horarios';

function formatearRangoFecha(fechaInicio, fechaFin) {
  if (!fechaInicio) return '-';
  if (!fechaFin || fechaFin === fechaInicio) return fechaInicio;
  return `${fechaInicio} → ${fechaFin}`;
}

function hoyVenezuela() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });
}

const AdminBloqueos = () => {
  const { user, horarios, sedes } = useContext(AppContext);
  const { showToast } = useToast();

  const [bloqueos, setBloqueos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [fechaInicio, setFechaInicio] = useState(hoyVenezuela());
  const [fechaFin, setFechaFin] = useState('');
  const [todoElDia, setTodoElDia] = useState(true);
  const [horariosSeleccionados, setHorariosSeleccionados] = useState([]);
  const [sedeId, setSedeId] = useState('');
  const [motivo, setMotivo] = useState('');

  const horariosDisponibles = useMemo(() => {
    return ordenarHorarios((horarios || []).filter(h => h.activo));
  }, [horarios]);

  const sedesDisponibles = useMemo(() => {
    return (sedes || []).filter(s => s.activo);
  }, [sedes]);

  useEffect(() => {
    const q = query(collection(db, 'bloqueosAdmin'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setBloqueos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setCargando(false);
    }, (err) => {
      console.error('[AdminBloqueos] Error listener:', err);
      setCargando(false);
    });
    return () => unsub();
  }, []);

  const todosSeleccionados = horariosDisponibles.length > 0
    && horariosDisponibles.every(h => horariosSeleccionados.includes(h.id));

  const toggleHorario = (horaId) => setHorariosSeleccionados(prev =>
    prev.includes(horaId) ? prev.filter(id => id !== horaId) : [...prev, horaId]
  );

  const toggleTodos = () => {
    if (todosSeleccionados) setHorariosSeleccionados([]);
    else setHorariosSeleccionados(horariosDisponibles.map(h => h.id));
  };

  const limpiarFormulario = () => {
    setFechaInicio(hoyVenezuela());
    setFechaFin('');
    setTodoElDia(true);
    setHorariosSeleccionados([]);
    setSedeId('');
    setMotivo('');
  };

  const handleCrear = async () => {
    if (!fechaInicio) { showToast('Selecciona una fecha de inicio', 'error'); return; }
    if (fechaFin && fechaFin < fechaInicio) { showToast('La fecha fin no puede ser menor a la fecha inicio', 'error'); return; }
    if (!todoElDia && horariosSeleccionados.length === 0) { showToast('Selecciona al menos un horario', 'error'); return; }
    if (!user?.uid) { showToast('Sesion no encontrada', 'error'); return; }

    setGuardando(true);
    try {
      await addDoc(collection(db, 'bloqueosAdmin'), {
        fechaInicio,
        fechaFin: fechaFin || fechaInicio,
        todoElDia,
        horarios: todoElDia ? [] : horariosSeleccionados,
        sedeId: sedeId || null,
        motivo: (motivo || '').trim(),
        creadoPor: user.uid,
        createdAt: Date.now()
      });
      showToast('Bloqueo creado', 'success');
      limpiarFormulario();
    } catch (error) {
      console.error('[AdminBloqueos] Error al crear:', error);
      showToast('Error al crear bloqueo: ' + error.message, 'error');
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (id) => {
    if (!window.confirm('¿Eliminar este bloqueo?')) return;
    try {
      await deleteDoc(doc(db, 'bloqueosAdmin', id));
      showToast('Bloqueo eliminado', 'success');
    } catch (error) {
      console.error('[AdminBloqueos] Error al eliminar:', error);
      showToast('Error al eliminar', 'error');
    }
  };

  const nombreSede = (id) => {
    if (!id) return 'Todas las sedes';
    const s = (sedes || []).find(x => x.id === id);
    return s?.nombre || id;
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl text-xs text-blue-800">
        Los bloqueos afectan la disponibilidad del paso 3 de inscripción. Si no seleccionas sede, aplica a todas.
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <h3 className="font-bold text-sm text-gray-800 flex items-center gap-2">
          <Plus size={16} className="text-blue-600" /> Nuevo Bloqueo
        </h3>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Fecha inicio</label>
            <input
              type="date"
              value={fechaInicio}
              onChange={e => setFechaInicio(e.target.value)}
              className="w-full bg-gray-50 border rounded-lg py-2 px-3 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Fecha fin (opcional)</label>
            <input
              type="date"
              value={fechaFin}
              onChange={e => setFechaFin(e.target.value)}
              className="w-full bg-gray-50 border rounded-lg py-2 px-3 text-sm"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
          <input
            type="checkbox"
            checked={todoElDia}
            onChange={e => setTodoElDia(e.target.checked)}
            className="w-4 h-4"
          />
          <label className="text-sm font-bold text-gray-700">Bloquear todo el dia</label>
        </div>

        {!todoElDia && (
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-gray-600">Horarios a bloquear</label>
              <button
                type="button"
                onClick={toggleTodos}
                disabled={horariosDisponibles.length === 0}
                className="text-[11px] font-bold text-blue-600 disabled:opacity-40"
              >
                {todosSeleccionados ? 'Deseleccionar todos' : 'Seleccionar todos'}
              </button>
            </div>
            {horariosDisponibles.length === 0 ? (
              <p className="text-xs text-gray-500">No hay horarios activos.</p>
            ) : (
              <div className="space-y-1.5">
                {horariosDisponibles.map(h => (
                  <label key={h.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={horariosSeleccionados.includes(h.id)}
                      onChange={() => toggleHorario(h.id)}
                      className="w-4 h-4"
                    />
                    <span className="text-xs">
                      <span className="font-mono text-[10px] text-gray-500">{h.id}</span>
                      <span className="ml-2">{h.label}</span>
                      {h.isLunch && (
                        <span className="ml-2 text-[9px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-bold uppercase">Almuerzo</span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">Sede (opcional)</label>
          <select
            value={sedeId}
            onChange={e => setSedeId(e.target.value)}
            className="w-full bg-gray-50 border rounded-lg py-2 px-3 text-sm"
          >
            <option value="">Todas las sedes</option>
            {sedesDisponibles.map(s => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">Motivo (opcional)</label>
          <input
            type="text"
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            placeholder="Ej: Feriado, mantenimiento, evento"
            className="w-full bg-gray-50 border rounded-lg py-2 px-3 text-sm"
          />
        </div>

        <Button onClick={handleCrear} disabled={guardando} variant="dark">
          {guardando ? 'Guardando...' : 'Crear Bloqueo'}
        </Button>
      </div>

      <div>
        <h3 className="font-bold text-sm text-gray-800 mb-2 flex items-center gap-2">
          <Calendar size={16} className="text-gray-600" /> Bloqueos activos ({bloqueos.length})
        </h3>

        {cargando ? (
          <p className="text-xs text-gray-500 text-center py-4">Cargando...</p>
        ) : bloqueos.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl text-center">
            <AlertCircle size={20} className="text-gray-400 mx-auto mb-2" />
            <p className="text-xs text-gray-500">No hay bloqueos creados</p>
          </div>
        ) : (
          <div className="space-y-2">
            {bloqueos.map(b => (
              <div key={b.id} className="bg-white border border-gray-200 rounded-xl p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                      <Calendar size={12} className="text-blue-600 shrink-0" />
                      <span className="truncate">{formatearRangoFecha(b.fechaInicio, b.fechaFin)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-600 mt-1">
                      <Clock size={11} className="shrink-0" />
                      <span>
                        {b.todoElDia
                          ? 'Todo el dia'
                          : (b.horarios || []).length > 0
                            ? b.horarios.join(', ')
                            : 'Sin horarios'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-600 mt-0.5">
                      <MapPin size={11} className="shrink-0" />
                      <span>{nombreSede(b.sedeId)}</span>
                    </div>
                    {b.motivo && (
                      <p className="text-[11px] text-gray-500 italic mt-1 truncate">"{b.motivo}"</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleEliminar(b.id)}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminBloqueos;
