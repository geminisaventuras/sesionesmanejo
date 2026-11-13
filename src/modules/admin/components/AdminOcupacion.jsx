// @build: 2026-11-06 | id: ADMIN-OCUPACION-PARCIAL | desc: Agrega estado parcial_bloqueado y ajustes visuales.
import { useContext, useState, useMemo, useEffect, useCallback, memo } from 'react';
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
import { useOcupacionPorRango } from '../../../hooks/useOcupacionPorRango';
import { calcularEstadoBloque } from '../utils/ocupacionHelpers';
import {
  Calendar, MapPin, BookOpen, Activity, Wallet, Settings, Lock, Filter
} from 'lucide-react';

const AdminOcupacion = memo(() => {
  const { horarios, sedes, instructores, motos, cursos, user, logoutUser } = useContext(AppContext);
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [fechaInicio, setFechaInicio] = useState(() => new Date().toISOString().split('T')[0]);
  const [filtroSede, setFiltroSede] = useState('');
  const [filtroCurso, setFiltroCurso] = useState('');
  const [filtroInstructor, setFiltroInstructor] = useState('');
  const [filtroMoto, setFiltroMoto] = useState('');
  
  const [bloqueosAdmin, setBloqueosAdmin] = useState([]);
  const [bloqueosInstructores, setBloqueosInstructores] = useState([]);
  const [bloqueosProveedor, setBloqueosProveedor] = useState([]);
  const [celdaSeleccionada, setCeldaSeleccionada] = useState(null);
  const [purgandoLocks, setPurgandoLocks] = useState(false);
  
  const fechaFin = useMemo(() => {
    const d = new Date(fechaInicio + 'T12:00:00');
    d.setDate(d.getDate() + 6);
    return d.toISOString().split('T')[0];
  }, [fechaInicio]);
  
  const dias = useMemo(() => {
    const arr = [];
    const cursor = new Date(fechaInicio + 'T12:00:00');
    for (let i = 0; i < 7; i++) {
      arr.push(cursor.toISOString().split('T')[0]);
      cursor.setDate(cursor.getDate() + 1);
    }
    return arr;
  }, [fechaInicio]);
  
  const { reservas: reservasSemana } = useOcupacionPorRango(fechaInicio, fechaFin);
  
  useEffect(() => {
    const cargar = async () => {
      try {
        const qAdmin = query(
          collection(db, 'bloqueosAdmin'),
          where('fechaInicio', '<=', fechaFin)
        );
        const snapAdmin = await getDocs(qAdmin);
        setBloqueosAdmin(snapAdmin.docs.map(d => ({ id: d.id, ...d.data() })));
        
        const qInst = query(
          collection(db, 'bloqueosInstructores'),
          where('estado', '==', 'activo')
        );
        const snapInst = await getDocs(qInst);
        setBloqueosInstructores(snapInst.docs.map(d => ({ id: d.id, ...d.data() })));
        
        const qProv = query(
          collection(db, 'bloqueosGlobales'),
          where('fecha', '>=', fechaInicio),
          where('fecha', '<=', fechaFin)
        );
        const snapProv = await getDocs(qProv);
        setBloqueosProveedor(snapProv.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error('Error cargando bloqueos:', error);
      }
    };
    cargar();
  }, [fechaInicio, fechaFin]);
  
  const bloquesActivos = useMemo(() => ordenarHorarios((horarios || []).filter(h => h.activo && !h.isLunch)), [horarios]);
  
  const matriz = useMemo(() => {
    const result = {};
    const filtros = {
      sedeId: filtroSede || null,
      cursoId: filtroCurso || null,
      instructorId: filtroInstructor || null,
      motoId: filtroMoto || null,
    };
    
    for (const fecha of dias) {
      result[fecha] = {};
      for (const bloque of bloquesActivos) {
        result[fecha][bloque.id] = calcularEstadoBloque({
          fecha,
          bloque,
          instructores: instructores || [],
          motos: motos || [],
          cursos: cursos || [],
          reservas: reservasSemana,
          bloqueosAdmin,
          bloqueosInstructores,
          bloqueosProveedor,
          filtros,
        });
      }
    }
    return result;
  }, [dias, bloquesActivos, instructores, motos, cursos, reservasSemana, bloqueosAdmin, bloqueosInstructores, bloqueosProveedor, filtroSede, filtroCurso, filtroInstructor, filtroMoto]);
  
  const handlePurgarLocks = useCallback(async () => {
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
  }, [dias, showToast]);
  
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
  
  const configEstado = {
    libre: { color: 'bg-green-100 text-green-700 border-green-300', icon: null },
    parcial: { color: 'bg-yellow-100 text-yellow-700 border-yellow-300', icon: null },
    lleno: { color: 'bg-red-100 text-red-700 border-red-300', icon: null },
    bloqueado: { color: 'bg-gray-200 text-gray-600 border-gray-400', icon: Lock },
    parcial_bloqueado: { color: 'bg-gray-100 text-gray-500 border-gray-300', icon: null }, // Nuevo estado
  };
  
  const leyenda = [
    { label: 'Libre', color: 'bg-green-100 border-green-300' },
    { label: 'Parcial', color: 'bg-yellow-100 border-yellow-300' },
    { label: 'Lleno', color: 'bg-red-100 border-red-300' },
    { label: 'Bloqueado', color: 'bg-gray-200 border-gray-400' },
    { label: 'Parcial Bloq.', color: 'bg-gray-100 border-gray-300' }, // Nueva leyenda
  ];
  
  return (
    <AppShell header={header} footer={footer} bgColor="bg-gray-50">
      <div className="p-4 space-y-4 h-full flex flex-col">
        {/* Filtros */}
        <div className="bg-white p-3 rounded-xl border border-gray-100 space-y-2 shrink-0">
          <div className="flex items-center gap-2 mb-1">
            <Filter size={16} className="text-gray-500" />
            <span className="text-xs font-black text-gray-700 uppercase tracking-wider">Filtros</span>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-gray-600 mb-0.5 ml-1">Fecha inicio</label>
              <input
                type="date"
                value={fechaInicio}
                onChange={e => setFechaInicio(e.target.value)}
                className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-600 mb-0.5 ml-1">Sede</label>
              <select
                value={filtroSede}
                onChange={e => setFiltroSede(e.target.value)}
                className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-blue-500"
              >
                <option value="">Todas</option>
                {(sedes || []).filter(s => s.activo).map(s => (
                  <option key={s.id} value={s.id}>{s.nombre}{s.direccion ? ` - ${s.direccion}` : ''}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-gray-600 mb-0.5 ml-1">Curso</label>
              <select
                value={filtroCurso}
                onChange={e => setFiltroCurso(e.target.value)}
                className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-blue-500"
              >
                <option value="">Todos</option>
                {(cursos || []).map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-600 mb-0.5 ml-1">Instructor</label>
              <select
                value={filtroInstructor}
                onChange={e => setFiltroInstructor(e.target.value)}
                className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-blue-500"
              >
                <option value="">Todos</option>
                {(instructores || []).filter(i => i.activo).map(i => (
                  <option key={i.id} value={i.id}>{i.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-600 mb-0.5 ml-1">Moto</label>
              <select
                value={filtroMoto}
                onChange={e => setFiltroMoto(e.target.value)}
                className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-blue-500"
              >
                <option value="">Todas</option>
                {(motos || []).filter(m => m.activo).map(m => (
                  <option key={m.id} value={m.id}>{m.id}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        {/* Leyenda */}
        <div className="flex gap-4 text-[10px] font-bold shrink-0 flex-wrap">
          {leyenda.map(({ label, color }) => (
            <span key={label} className="flex items-center gap-1.5">
              <span className={`w-3.5 h-3.5 ${color} border rounded`}></span>
              {label}
            </span>
          ))}
        </div>
        
        {/* Purgar Locks */}
        <div className="shrink-0">
          <button
            onClick={handlePurgarLocks}
            disabled={purgandoLocks}
            className="w-full bg-red-600 text-white py-2 px-4 rounded-xl text-sm font-bold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {purgandoLocks ? 'Purgando...' : 'Purgar locks corruptos (7 días)'}
          </button>
        </div>
        
        {/* Tabla */}
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-[9px] table-fixed border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-1 text-left w-12 sticky left-0 bg-gray-100 z-10">Bloque</th>
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
                  <td className="p-1 font-bold truncate sticky left-0 bg-white" title={b.label}>
                    {b.label.split(' - ')[0]}
                  </td>
                  {dias.map(d => {
                    const info = matriz[d]?.[b.id] || { estado: 'libre', total: 0, disponibles: 0 };
                    const cfg = configEstado[info.estado];
                    const Icon = cfg?.icon;
                    const esBloqueado = info.estado === 'bloqueado';
                    
                    return (
                      <td key={d} className="p-0.5 text-center">
                        <button
                          onClick={() => setCeldaSeleccionada({ fecha: d, bloque: b, info })}
                          className={`w-full h-8 ${cfg?.color || 'bg-gray-200'} border rounded text-[10px] font-bold flex items-center justify-center gap-0.5 hover:opacity-80 transition-opacity`}
                          title={`${info.estado}${!esBloqueado ? ` (${info.disponibles}/${info.total})` : ` - ${info.motivo}`}`}
                        >
                          {esBloqueado ? (
                            <Icon size={12} />
                          ) : (
                            <span>{info.disponibles}/{info.total}</span>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Modal de detalle */}
        {celdaSeleccionada && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setCeldaSeleccionada(null)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-black text-gray-900">
                  {celdaSeleccionada.bloque.label} — {celdaSeleccionada.fecha}
                </h3>
                <button onClick={() => setCeldaSeleccionada(null)} className="p-1 bg-gray-100 rounded-full hover:bg-gray-200">
                  ✕
                </button>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Estado:</span>
                  <span className="font-bold">{celdaSeleccionada.info.estado.toUpperCase()}</span>
                </div>
                {celdaSeleccionada.info.estado !== 'bloqueado' && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cupo:</span>
                    <span className="font-bold">{celdaSeleccionada.info.disponibles}/{celdaSeleccionada.info.total}</span>
                  </div>
                )}
                {celdaSeleccionada.info.estado === 'bloqueado' && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Motivo:</span>
                    <span className="font-bold">{celdaSeleccionada.info.motivo}</span>
                  </div>
                )}
                {celdaSeleccionada.info.reservas?.length > 0 && (
                  <div>
                    <div className="text-gray-600 mb-1 mt-2">Reservas:</div>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {celdaSeleccionada.info.reservas.map(r => (
                        <div key={r.id} className="bg-gray-50 p-2 rounded text-xs">
                          <span className="font-bold">{r.nombre}</span> — {r.horaId}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
});

export default AdminOcupacion;
