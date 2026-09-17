// @build: 2026-09-16 | id: TAB-CUENTA-POR-COBRAR | desc: Tabla de reservas pendientes con filtros y checkboxes
import { useMemo, useState } from 'react';
import { Calendar } from 'lucide-react';

const hoyVET = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });

function inicioSemanaVET() {
  const d = new Date();
  const dia = d.getDay() || 7;
  const lunes = new Date(d);
  lunes.setDate(d.getDate() - (dia - 1));
  return lunes.toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });
}

function inicioMesVET() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1)
    .toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });
}

const FILTROS = [
  { id: 'todo', label: 'Todo' },
  { id: 'hoy', label: 'Hoy' },
  { id: 'semana', label: 'Semana' },
  { id: 'mes', label: 'Mes' },
  { id: 'rango', label: 'Rango' }
];

export default function TabCuentaPorCobrar({
  reservasPendientes,
  cursos,
  tipoStaff,
  staffId,
  onRegistrarPago
}) {
  const [filtro, setFiltro] = useState('todo');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [seleccionados, setSeleccionados] = useState([]);

  const hoy = hoyVET();

  const reservasFiltradas = useMemo(() => {
    let desde = null;
    let hasta = null;

    if (filtro === 'hoy') { desde = hoy; hasta = hoy; }
    else if (filtro === 'semana') desde = inicioSemanaVET();
    else if (filtro === 'mes') desde = inicioMesVET();
    else if (filtro === 'rango') {
      desde = fechaDesde || null;
      hasta = fechaHasta || null;
    }

    return reservasPendientes.filter(r => {
      if (!r.fecha) return false;
      if (desde && r.fecha < desde) return false;
      if (hasta && r.fecha > hasta) return false;
      return true;
    });
  }, [reservasPendientes, filtro, fechaDesde, fechaHasta, hoy]);

  const getComision = (r) => {
    const com = tipoStaff === 'instructor' ? r.comisionInstructor : r.comisionProveedor;
    const base = typeof com === 'number' ? com : 0;
    if (tipoStaff === 'instructor' && r.esReservaCompartida === true) {
      const inv = (r.instructoresInvolucrados || []).find(x => String(x.id) === String(staffId));
      const pct = typeof inv?.porcentaje === 'number' ? inv.porcentaje : 0;
      return base * pct / 100;
    }
    return base;
  };

  const totalSeleccionado = useMemo(() =>
    reservasFiltradas
      .filter(r => seleccionados.includes(r.id))
      .reduce((acc, r) => acc + getComision(r), 0),
    [reservasFiltradas, seleccionados, tipoStaff]
  );

  const todosSeleccionados = reservasFiltradas.length > 0 &&
    reservasFiltradas.every(r => seleccionados.includes(r.id));

  const toggleTodos = () => {
    if (todosSeleccionados) {
      const idsFiltrados = new Set(reservasFiltradas.map(r => r.id));
      setSeleccionados(prev => prev.filter(id => !idsFiltrados.has(id)));
    } else {
      const ids = reservasFiltradas.map(r => r.id);
      setSeleccionados(prev => Array.from(new Set([...prev, ...ids])));
    }
  };

  const toggleUno = (id) => {
    setSeleccionados(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const cursoNombre = (cursoId) =>
    (cursos || []).find(c => String(c.id) === String(cursoId))?.nombre || 'Curso';

  return (
    <div className="space-y-3">
      {/* Filtros */}
      <div className="bg-white border border-gray-100 rounded-xl p-3">
        <div className="flex gap-1 overflow-x-auto pb-1">
          {FILTROS.map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFiltro(f.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-colors ${
                filtro === f.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >{f.label}</button>
          ))}
        </div>

        {filtro === 'rango' && (
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-600 mb-1">Desde</label>
              <input
                type="date"
                value={fechaDesde}
                onChange={e => setFechaDesde(e.target.value)}
                className="w-full bg-gray-50 border rounded-lg py-1.5 px-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-600 mb-1">Hasta</label>
              <input
                type="date"
                value={fechaHasta}
                onChange={e => setFechaHasta(e.target.value)}
                className="w-full bg-gray-50 border rounded-lg py-1.5 px-2 text-xs"
              />
            </div>
          </div>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        {reservasFiltradas.length === 0 ? (
          <div className="p-6 text-center">
            <Calendar size={32} className="text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No hay reservas pendientes en este rango.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={todosSeleccionados} onChange={toggleTodos} className="w-4 h-4" />
                <span className="text-xs font-bold text-gray-700">Seleccionar todo</span>
              </label>
              <span className="text-xs text-gray-500">{reservasFiltradas.length} reservas</span>
            </div>

            <div className="divide-y divide-gray-100">
              {reservasFiltradas.map(r => {
                const selected = seleccionados.includes(r.id);
                return (
                  <label
                    key={r.id}
                    className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-blue-50 transition-colors ${selected ? 'bg-blue-50' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleUno(r.id)}
                      className="w-4 h-4 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-800 truncate">{cursoNombre(r.cursoId)}</p>
                      <p className="text-[11px] text-gray-500 truncate">{r.nombre} {r.apellido || ''}</p>
                      <p className="text-[10px] text-gray-400">{r.fecha}</p>
                    </div>
                    <span className="text-sm font-black text-gray-900 shrink-0">${getComision(r)}</span>
                  </label>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Footer con total y botón */}
      {reservasFiltradas.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl p-3 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-600">{seleccionados.length} seleccionadas</span>
            <span className="font-black text-gray-900 text-lg">${totalSeleccionado}</span>
          </div>
          <button
            type="button"
            onClick={() => onRegistrarPago(seleccionados, totalSeleccionado)}
            disabled={seleccionados.length === 0}
            className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
          >
            Registrar Pago ({seleccionados.length})
          </button>
        </div>
      )}
    </div>
  );
}
