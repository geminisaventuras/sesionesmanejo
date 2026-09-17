import { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { AppContext } from '../../../context/AppContextValue';
import { Calendar, Clock, Bike, MapPin, User, RefreshCw } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase';

const ProveedorActividad = () => {
  const { user, motos, horarios, sedes, instructores } = useContext(AppContext);
  const [actividad, setActividad] = useState([]);
  const [cargando, setCargando] = useState(false);

  const cargarActividad = useCallback(async () => {
    if (!user?.uid) return;
    setCargando(true);
    try {
      const q = query(
        collection(db, 'ocupacionConfirmada'),
        where('proveedorId', '==', user.uid)
      );
      const snapshot = await getDocs(q);
      const actividades = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setActividad(actividades);
    } catch (error) {
      console.error('[ProveedorActividad] Error:', error);
    } finally {
      setCargando(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    cargarActividad();
  }, [cargarActividad]);

  // Fecha por defecto: la más próxima con actividad
  const fechaPorDefecto = useMemo(() => {
    if (actividad.length === 0) return new Date().toISOString().split('T')[0];
    const fechas = actividad.map(r => r.fecha).filter(Boolean).sort();
    return fechas[0] || new Date().toISOString().split('T')[0];
  }, [actividad]);

  const [fechaSeleccionada, setFechaSeleccionada] = useState(fechaPorDefecto);

  // Clases del día seleccionado
  const clasesDelDia = useMemo(() => {
    return actividad.filter(r => r.fecha === fechaSeleccionada || r.fecha2 === fechaSeleccionada);
  }, [actividad, fechaSeleccionada]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-gray-900 uppercase">Actividad</h2>
        <button
          onClick={cargarActividad}
          disabled={cargando}
          className="p-1.5 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
          aria-label="Actualizar actividad"
        >
          <RefreshCw size={16} className={cargando ? 'animate-spin text-gray-500' : 'text-gray-700'} />
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border">
        <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-1">
          <Calendar size={16} className="text-gray-500" /> Fecha
        </label>
        <input
          type="date"
          value={fechaSeleccionada}
          onChange={e => setFechaSeleccionada(e.target.value)}
          className="w-full bg-gray-50 border rounded-xl py-2 px-3 text-sm"
        />
      </div>

      {clasesDelDia.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm font-bold">Sin clases para esta fecha</p>
        </div>
      ) : (
        <div className="space-y-3">
          {clasesDelDia.map(r => {
            const moto = (motos || []).find(m => String(m.id) === String(r.motoAsignadaId));
            const horario = (horarios || []).find(h => String(h.id) === String(r.horaId));
            const sede = (sedes || []).find(s => String(s.id) === String(r.sedeId));
            const instructor = (instructores || []).find(i => String(i.id) === String(r.instructorId));
            return (
              <div key={r.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-gray-800">
                  <Bike size={16} className="text-blue-500" />
                  {moto ? `${moto.marca} ${moto.modelo} (${moto.tipo})` : 'Moto no disponible'}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Clock size={14} />
                  {horario?.label || r.horaId}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <MapPin size={14} />
                  {sede?.nombre || r.sedeId}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <User size={14} />
                  Instructor: {instructor ? `${instructor.nombre} ${instructor.apellido || ''}` : 'No asignado'}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProveedorActividad;
