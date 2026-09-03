// @build: 2026-08-06 | id: OCUPACION-DIA-AGOTADO | desc: Indicador de día agotado (sin recursos) en la tabla de ocupación
import { useContext, useState, useMemo, memo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../../context/AppContextValue';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../firebase';
import { LockService } from '../../inscripcion/services/LockService';
import { useToast } from '../../shared/components/ToastProvider';
import AppShell from '../../shared/components/AppShell';
import DashboardHeader from '../../shared/components/DashboardHeader';
import DashboardFooter from '../../shared/components/DashboardFooter';
import { ordenarHorarios } from '../../shared/utils/horarios';
import {
  Calendar, MapPin, BookOpen, Activity, Wallet, Settings
} from 'lucide-react';

const AdminOcupacion = memo(() => {
  const { reservas, horarios, sedes, instructores, motos, user, logoutUser } = useContext(AppContext);
  const navigate = useNavigate();
  const [sedeSeleccionada, setSedeSeleccionada] = useState('todas');
  const [fechaInicio, setFechaInicio] = useState(() => new Date().toISOString().split('T')[0]);
  const [bloqueosGlobales, setBloqueosGlobales] = useState([]);
    const [purgandoLocks, setPurgandoLocks] = useState(false);
  const { showToast } = useToast();

  // Cargar bloqueos globales para el rango de fechas visible (7 días)
  useEffect(() => {
    const cargarBloqueos = async () => {
      try {
        const fechaFin = new Date(fechaInicio + 'T12:00:00');
        fechaFin.setDate(fechaFin.getDate() + 6);
        const fechaFinISO = fechaFin.toISOString().split('T')[0];
        const q = query(
          collection(db, 'bloqueosGlobales'),
          where('fecha', '>=', fechaInicio),
          where('fecha', '<=', fechaFinISO)
        );
        const snap = await getDocs(q);
        const bloqueos = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setBloqueosGlobales(bloqueos);
      } catch (error) {
        console.error('Error cargando bloqueos globales:', error);
        setBloqueosGlobales([]);
      }
    };
    cargarBloqueos();
  }, [fechaInicio]);

  const dias = useMemo(() => {
    const diasArr = [];
    const cursor = new Date(fechaInicio + 'T12:00:00');
    for (let i = 0; i < 7; i++) {
      diasArr.push(cursor.toISOString().split('T')[0]);
      cursor.setDate(cursor.getDate() + 1);
    }
    return diasArr;
  }, [fechaInicio]);

  const bloquesActivos = useMemo(() => ordenarHorarios((horarios || []).filter(h => h.activo && !h.isLunch)), [horarios]);

  // Verificar si un día está completamente agotado (sin instructores ni motos disponibles en ningún bloque)
  const isDiaAgotado = useCallback((fecha) => {
    if (!instructores?.length || !motos?.length) return false;

    // Filtrar instructores activos para la sede seleccionada
    const instructoresSede = (sedeSeleccionada === 'todas')
      ? instructores.filter(i => i.activo)
      : instructores.filter(i => i.activo && (i.sedes || []).includes(sedeSeleccionada));

    // Para cada bloque horario activo, verificar si hay al menos un instructor y una moto disponible
    for (const bloque of bloquesActivos) {
      const horaId = bloque.id;

      // Instructores ocupados (reservas)
      const instructoresOcupados = new Set(
        (reservas || [])
          .filter(r => (r.estadoPago === 'Pendiente' || r.estadoPago === 'Aprobado') &&
                       String(r.horaId) === String(horaId) &&
                       (r.fecha === fecha || r.fecha2 === fecha))
          .map(r => r.instructorId)
      );

      // Motos ocupadas (reservas)
      const motosOcupadas = new Set(
        (reservas || [])
          .filter(r => (r.estadoPago === 'Pendiente' || r.estadoPago === 'Aprobado') &&
                       String(r.horaId) === String(horaId) &&
                       (r.fecha === fecha || r.fecha2 === fecha) &&
                       r.traeMoto !== 'Sí')
          .map(r => r.motoAsignadaId)
      );

      // Filtrar instructores disponibles
      const instructoresDisponibles = instructoresSede.filter(i => !instructoresOcupados.has(i.id));

      if (instructoresDisponibles.length === 0) continue;

      // Para cada instructor disponible, buscar al menos una moto disponible (considerando bloqueos)
      for (const instructor of instructoresDisponibles) {
        // Motos del tipo adecuado para la sede y que no estén ocupadas ni bloqueadas
        const motosDisponibles = (motos || []).filter(m => {
          if (!m.activo) return false;
          if (sedeSeleccionada !== 'todas' && !(m.sedes || []).includes(sedeSeleccionada)) return false;
          if (motosOcupadas.has(m.id)) return false;

          // Verificar bloqueos de proveedor para esta moto (o globales)
          const bloqueada = bloqueosGlobales.some(b => {
            if (b.fecha !== fecha) return false;
            if (b.motoId !== m.id && b.motoId !== 'ALL') return false;
            // Verificar solapamiento horario (simplificado: si el bloqueo cubre el bloque actual)
            const [hIni, mIni] = (b.horaInicio || '00:00').split(':').map(Number);
            const [hFin, mFin] = (b.horaFin || '23:59').split(':').map(Number);
            const bloqueInicio = hIni * 60 + mIni;
            const bloqueFin = hFin * 60 + mFin;
            // Obtener minutos del bloque actual
            const labelParts = bloque.label.match(/(\d+):(\d+)\s*(AM|PM)/i);
            if (!labelParts) return false;
            let hBloque = parseInt(labelParts[1], 10);
            const mBloque = parseInt(labelParts[2], 10);
            const mod = labelParts[3].toUpperCase();
            if (mod === 'PM' && hBloque < 12) hBloque += 12;
            if (mod === 'AM' && hBloque === 12) hBloque = 0;
            const bloqueMinutos = hBloque * 60 + mBloque;
            return bloqueMinutos >= bloqueInicio && bloqueMinutos < bloqueFin;
          });
          return !bloqueada;
        });

        if (motosDisponibles.length > 0) {
          return false; // Hay al menos un instructor y una moto disponible → día NO agotado
        }
      }
    }

    // Si ningún bloque tuvo disponibilidad, el día está agotado
    return true;
  }, [instructores, motos, reservas, bloquesActivos, bloqueosGlobales, sedeSeleccionada]);


    const handlePurgarLocks = async () => {
    if (!dias.length) return showToast('No hay fechas para purgar', 'error');
    if (!window.confirm('¿Deseas purgar todos los locks corruptos/expirados en el rango visible (7 días)?')) return;
    
    setPurgandoLocks(true);
    let totalPurgados = 0;
    
    try {
      for (const fecha of dias) {
        const resultado = await LockService.purgarLocksCorruptos(fecha);
        if (resultado.success && resultado.purgados > 0) {
          totalPurgados += resultado.purgados;
        }
      }
      
      if (totalPurgados > 0) {
        showToast(`Se purgaron ${totalPurgados} locks corruptos/expirados`, 'success');
      } else {
        showToast('No se encontraron locks corruptos para purgar', 'info');
      }
    } catch (error) {
      console.error('[AdminOcupacion] Error purgando locks:', error);
      showToast('Error al purgar locks: ' + error.message, 'error');
    } finally {
      setPurgandoLocks(false);
    }
  };
  const getEstadoCelda = (fecha, bloqueId) => {
    // Primero verificar si el día completo está agotado
    if (isDiaAgotado(fecha)) return 'agotado';

    const reserva = reservas.find(r => {
      if (r.estadoPago === 'Cancelado') return false;
      if (String(r.horaId) !== String(bloqueId)) return false;
      if (r.fecha === fecha || r.fecha2 === fecha) return true;
      return false;
    });
    if (!reserva) return 'libre';
    if (reserva.estadoPago === 'Pendiente') return 'pendiente';
    if (reserva.estadoPago === 'Aprobado') return 'ocupado';
    if (reserva.estadoPago === 'Rechazado') return 'rechazado';
    return 'libre';
  };

  const colorCelda = {
    libre: 'bg-green-400',
    ocupado: 'bg-red-400',
    pendiente: 'bg-yellow-400',
    rechazado: 'bg-orange-400',
    agotado: 'bg-black',
  };

  const labelCelda = {
    libre: 'Libre',
    ocupado: 'Ocupado',
    pendiente: 'Pendiente',
    rechazado: 'Rechazado',
    agotado: 'Agotado',
  };

  const handleLogout = useCallback(async () => {
    if (logoutUser) await logoutUser();
    navigate('/');
  }, [logoutUser, navigate]);

  const footerTabs = [
    { id: 'inicio', icon: Activity, label: 'Inicio', action: () => navigate('/dashboard') },
    { id: 'reservas', icon: BookOpen, label: 'Reservas', action: () => navigate('/admin/reservas') },
    { id: 'ocupacion', icon: Calendar, label: 'Ocupac.', action: () => navigate('/admin/ocupacion') },
    { id: 'finanzas', icon: Wallet, label: 'Finanzas', action: () => navigate('/admin/finanzas') },
    { id: 'config', icon: Settings, label: 'Config', action: () => navigate('/admin/config') }
  ];

  const { notifications } = useContext(AppContext);
  const header = <DashboardHeader title="Ocupación Diaria" onBack={() => navigate('/dashboard')} onLogout={handleLogout} notifications={notifications} />;
  const footer = <DashboardFooter
    tabs={footerTabs}
    activeTab="ocupacion"
    onTabChange={(id) => {
      const tab = footerTabs.find(t => t.id === id);
      if (tab?.action) tab.action();
    }}
  />;

  return (
    <AppShell header={header} footer={footer} bgColor="bg-gray-50">
      <div className="p-4 space-y-5 h-full flex flex-col">
        <div className="flex gap-3 items-end shrink-0">
          <div className="flex-1">
            <label className="block text-xs font-bold text-gray-600 mb-1 ml-1">Sede</label>
            <div className="relative">
              <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <select
                value={sedeSeleccionada}
                onChange={e => setSedeSeleccionada(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-blue-500 appearance-none"
              >
                <option value="todas">Todas</option>
                {(sedes || []).filter(s => s.activo).map(s => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-bold text-gray-600 mb-1 ml-1">Fecha inicio</label>
            <div className="relative">
              <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="date"
                value={fechaInicio}
                onChange={e => setFechaInicio(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>
        <div className="flex gap-4 text-[10px] font-bold shrink-0 flex-wrap">
          {Object.entries(colorCelda).map(([estado, color]) => (
            <span key={estado} className="flex items-center gap-1.5">
              <span className={`w-3.5 h-3.5 ${color} rounded-full`}></span>
              {labelCelda[estado]}
            </span>
          ))}
        </div>

                <div className="shrink-0">
          <button
            onClick={handlePurgarLocks}
            disabled={purgandoLocks}
            className="w-full bg-red-600 text-white py-2 px-4 rounded-xl text-sm font-bold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {purgandoLocks ? 'Purgando...' : 'Purgar locks corruptos (7 días)'}
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          <table className="w-full text-[9px] table-fixed border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-1 text-left w-12">Bloque</th>
                {dias.map(d => (
                  <th key={d} className="p-1 text-center">
                    {d.split('-').slice(1).join('/')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bloquesActivos.map(b => (
                <tr key={b.id} className="border-b border-gray-100">
                  <td className="p-1 font-bold truncate" title={b.label}>
                    {b.label.split(' - ')[0]}
                  </td>
                  {dias.map(d => {
                    const estado = getEstadoCelda(d, b.id);
                    return (
                      <td key={d} className="p-1 text-center">
                        <span 
                          className={`inline-block w-4 h-4 ${colorCelda[estado]} rounded-full`}
                          title={labelCelda[estado]}
                        ></span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
});

export default AdminOcupacion;