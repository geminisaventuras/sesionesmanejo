// @build: 2026-06-16.17-30-00 | id: B5-DIAG | desc: Filtro para mostrar solo bloques ocupados
import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContextValue';
import { LockService } from '../services/LockService';
import { ChevronLeft, Calendar, Clock, Search, Filter } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export const TestBloquesView = () => {
  const { activeLocks, suscribirLocks, getTodayStr, fbUser } = useContext(AppContext);
  const navigate = useNavigate();
  const [fecha, setFecha] = useState(getTodayStr());
  const [bloques, setBloques] = useState([]);
  const [isSelectingHorario, setIsSelectingHorario] = useState(false);
  const [selectingBlockId, setSelectingBlockId] = useState(null);
  const [lockId, setLockId] = useState(null);
  const [reservasLocales, setReservasLocales] = useState([]);
  const [instructoresLocales, setInstructoresLocales] = useState([]);
  const [motosLocales, setMotosLocales] = useState([]);
  const [horariosLocales, setHorariosLocales] = useState([]);
  const [error, setError] = useState(null);
  const [searchType, setSearchType] = useState('nombre');
  const [searchValue, setSearchValue] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [allNames, setAllNames] = useState([]);
  const [loadingAll, setLoadingAll] = useState(false);

  // Filtro de ocupados
  const [mostrarSoloOcupados, setMostrarSoloOcupados] = useState(false);

  // Carga inicial de instructores, motos Y HORARIOS
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setError(null);
        const basePath = 'artifacts/motoescuela-pro-v1/public/data';
        const instSnap = await getDocs(collection(db, basePath, 'instructores'));
        setInstructoresLocales(instSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        const motosSnap = await getDocs(collection(db, basePath, 'motos'));
        setMotosLocales(motosSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        const horSnap = await getDocs(collection(db, basePath, 'horarios'));
        setHorariosLocales(horSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) { setError(e.message); }
    };
    cargarDatos();
  }, []);

  // Cargar reservas para los bloques (filtradas por fecha desde la fecha seleccionada)
  useEffect(() => {
    const cargarReservas = async () => {
      try {
        const basePath = 'artifacts/motoescuela-pro-v1/public/data';
        const resRef = collection(db, basePath, 'reservas');
        const q = query(resRef, where('fecha', '>=', fecha));
        const resSnap = await getDocs(q);
        setReservasLocales(resSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) { setError(e.message); }
    };
    if (fecha) cargarReservas();
  }, [fecha]);

  useEffect(() => {
    if (!fecha) return;
    const unsub = suscribirLocks(fecha);
    return () => { if (unsub) unsub(); };
  }, [fecha, suscribirLocks]);

  // Cálculo de bloques
  useEffect(() => {
    if (!fecha || !horariosLocales.length) { setBloques([]); return; }
    const todayStr = getTodayStr();
    const hor = horariosLocales.filter(h => h.activo).sort((a, b) => a.id.localeCompare(b.id));
    const fecha2Calc = (() => { const d = new Date(fecha + 'T12:00:00'); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; })();
    const blocks = hor.map(b => {
      if (fecha < todayStr) return { ...b, disponible: false, reason: 'CERRADO' };
      const conflictoReserva = reservasLocales.some(r => {
        if (r.estadoPago !== 'Pendiente' && r.estadoPago !== 'Aprobado') return false;
        if (String(r.horaId) !== String(b.id)) return false;
        return r.fecha === fecha || r.fecha === fecha2Calc || r.fecha2 === fecha || r.fecha2 === fecha2Calc;
      });
      const estaOcupadoPorLock = (activeLocks || []).some(l => l.id && l.id.startsWith(`${fecha}_${b.id}`));
      const estaOcupado = estaOcupadoPorLock || conflictoReserva;
      const disponible = !estaOcupado && !b.isLunch;
      return { ...b, disponible, ocupado: estaOcupado };
    });
    setBloques(blocks);
  }, [fecha, horariosLocales, reservasLocales, activeLocks, getTodayStr]);

  const handleSelectHorario = async (bloque) => {
    if (isSelectingHorario || !fbUser || !bloque.disponible) return;
    setIsSelectingHorario(true);
    setSelectingBlockId(bloque.id);
    if (lockId) { await LockService.liberarLock(lockId).catch(() => {}); }
    const nuevoLockId = `${fecha}_${bloque.id}_sininst_sinmoto`;
    const result = await LockService.crearLock(nuevoLockId, fbUser.uid, { fecha, horaId: bloque.id });
    if (result.success) { setLockId(nuevoLockId); }
    else { alert('Error: ' + result.error.message); }
    setIsSelectingHorario(false);
    setSelectingBlockId(null);
  };

  const ejecutarBusqueda = async () => {
    if (!searchValue.trim()) return;
    setSearchLoading(true);
    setSearchResults(null);
    try {
      const basePath = 'artifacts/motoescuela-pro-v1/public/data';
      const ref = collection(db, basePath, 'reservas');
      const q = query(ref, where(searchType, '==', searchValue.trim()));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setSearchResults(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } else {
        setSearchResults([]);
      }
    } catch (e) {
      setSearchResults('error');
    }
    setSearchLoading(false);
  };

  const cargarTodosNombres = async () => {
    setLoadingAll(true);
    try {
      const basePath = 'artifacts/motoescuela-pro-v1/public/data';
      const ref = collection(db, basePath, 'reservas');
      const snap = await getDocs(ref);
      if (!snap.empty) {
        const nombres = snap.docs.map(d => d.data().nombre || '(sin nombre)');
        setAllNames(nombres);
      } else {
        setAllNames(['No hay reservas.']);
      }
    } catch (e) {
      setAllNames([`Error: ${e.message}`]);
    }
    setLoadingAll(false);
  };

  // Filtrar bloques según el toggle
  const bloquesFiltrados = mostrarSoloOcupados 
    ? bloques.filter(b => b.ocupado) 
    : bloques;

  const disponibles = bloques.filter(b => b.disponible).length;
  const ocupados = bloques.filter(b => b.ocupado).length;

  return (
    <div className="bg-white min-h-screen flex flex-col max-w-md mx-auto shadow-xl">
      <div className="flex items-center gap-3 p-5 border-b bg-white z-10">
        <button onClick={() => navigate('/')} className="p-2 bg-gray-50 rounded-full"><ChevronLeft size={24} /></button>
        <h2 className="text-xl font-black uppercase flex-1">Test Bloques</h2>
      </div>
      <div className="p-5 flex-1 overflow-y-auto pb-20">
        <div className="mb-4">
          <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">Fecha (Día 1)</label>
          <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} min={getTodayStr()}
            className="w-full bg-gray-50 border-2 border-gray-200 focus:border-blue-500 rounded-xl py-3 px-4 outline-none" />
        </div>

        {/* Botón de filtro de ocupados */}
        <div className="mb-4">
          <button 
            onClick={() => setMostrarSoloOcupados(!mostrarSoloOcupados)}
            className={`w-full py-2 rounded-xl font-bold text-sm transition-colors duration-200 flex items-center justify-center gap-2 ${
              mostrarSoloOcupados 
                ? 'bg-red-600 text-white' 
                : 'bg-white border-2 border-red-300 text-red-600'
            }`}
          >
            <Filter size={16} />
            {mostrarSoloOcupados ? 'Mostrando solo ocupados' : 'Mostrar solo ocupados'}
          </button>
        </div>

        <div className="bg-gray-900 text-green-400 p-3 rounded-xl mb-4 text-xs font-mono">
          <p className="font-bold text-white mb-1">DIAGNÓSTICO</p>
          <p>instructores: {instructoresLocales.length}</p>
          <p>motos: {motosLocales.length}</p>
          <p>horarios: {horariosLocales.length}</p>
          <p>reservas: {reservasLocales.length}</p>
          <p>locks: {activeLocks?.length || 0}</p>
          <p>bloques: {bloques.length}</p>
          {error && <p className="text-red-400 mt-1">Error: {error}</p>}
        </div>
        
        <div className="mb-4">
          <button onClick={cargarTodosNombres} disabled={loadingAll}
            className="w-full bg-green-600 text-white py-3 rounded-xl font-bold text-sm">
            {loadingAll ? 'Cargando...' : 'Cargar todos los nombres'}
          </button>
          {allNames.length > 0 && (
            <div className="mt-3 bg-white border border-green-200 p-3 rounded-xl">
              <p className="text-sm font-bold text-green-900 mb-2">Todos los nombres ({allNames.length}):</p>
              <ul className="space-y-1">
                {allNames.map((n, i) => (
                  <li key={i} className="text-sm text-gray-700">• {n}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 mb-4">
          <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2"><Search size={18} /> Buscar reserva exacta</h3>
          <div className="space-y-2">
            <select value={searchType} onChange={e => setSearchType(e.target.value)}
              className="w-full bg-white border-2 border-blue-200 rounded-xl py-2 px-3 text-sm outline-none">
              <option value="nombre">Nombre</option>
              <option value="apellido">Apellido</option>
              <option value="cedula">Cédula</option>
              <option value="fecha">Fecha</option>
            </select>
            <input type="text" value={searchValue} onChange={e => setSearchValue(e.target.value)}
              placeholder={searchType === 'fecha' ? 'YYYY-MM-DD' : 'Valor exacto'}
              className="w-full bg-white border-2 border-blue-200 rounded-xl py-2 px-3 text-sm outline-none" />
            <button onClick={ejecutarBusqueda} disabled={searchLoading}
              className="w-full bg-blue-600 text-white py-2 rounded-xl font-bold text-sm">
              {searchLoading ? 'Buscando...' : 'Buscar'}
            </button>
          </div>
          {searchResults === 'error' && <p className="text-red-500 text-sm mt-2">Error en la búsqueda.</p>}
          {Array.isArray(searchResults) && searchResults.length === 0 && <p className="text-gray-500 text-sm mt-2">Sin resultados.</p>}
          {Array.isArray(searchResults) && searchResults.length > 0 && (
            <div className="mt-3 space-y-2">
              {searchResults.map((r, i) => (
                <div key={i} className="bg-white p-3 rounded-lg text-xs space-y-1">
                  <p><strong>Nombre:</strong> {r.nombre || '-'} {r.apellido || ''}</p>
                  <p><strong>Cédula:</strong> {r.cedula || '-'}</p>
                  <p><strong>Teléfono:</strong> {r.telefono || '-'}</p>
                  <p><strong>Fecha:</strong> {r.fecha || '-'}</p>
                  <p><strong>Hora ID:</strong> {r.horaId || '-'}</p>
                  <p><strong>Pago Estado:</strong> {r.estadoPago || '-'}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <h3 className="font-bold text-gray-900 text-lg mb-3 flex items-center gap-2">
          <Clock size={20} /> Bloques del día {fecha.split('-').reverse().join('/')} — {disponibles} disponibles / {ocupados} ocupados
        </h3>
        <div className="grid gap-2">
          {bloquesFiltrados.map(b => (
            <button key={b.id}
              disabled={!b.disponible || b.isLunch || isSelectingHorario}
              onClick={() => handleSelectHorario(b)}
              className={`w-full p-3 rounded-xl border-2 text-left transition-colors duration-200 ${
                b.isLunch ? 'bg-gray-100 border-gray-200 opacity-60' :
                b.ocupado ? 'bg-red-50 border-red-400 text-red-700' :
                !b.disponible ? 'bg-gray-50 border-gray-200 opacity-60' :
                'bg-white border-gray-200 hover:border-blue-300 cursor-pointer'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-bold text-sm">{b.label}</span>
                {selectingBlockId === b.id ? (
                  <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-1 rounded font-black">Procesando...</span>
                ) : (
                  <>
                    {b.isLunch && <span className="text-[10px] bg-orange-100 text-orange-600 px-2 py-1 rounded font-black">ALMUERZO</span>}
                    {b.reason === 'CERRADO' && <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded font-black">CERRADO</span>}
                    {b.ocupado && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-1 rounded font-black">OCUPADO</span>}
                    {!b.disponible && !b.ocupado && !b.isLunch && b.reason !== 'CERRADO' && <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded font-black">NO DISPONIBLE</span>}
                    {b.disponible && !b.ocupado && <span className="text-[10px] bg-green-100 text-green-600 px-2 py-1 rounded font-black">DISPONIBLE</span>}
                  </>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TestBloquesView;
