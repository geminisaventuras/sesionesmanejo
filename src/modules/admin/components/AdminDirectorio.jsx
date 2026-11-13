// @build: 2026-11-13 | id: ADMIN-DIRECTORIO-V2 | desc: Filtros cruzados de servicios y estados
import { useState, useEffect, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../../context/AppContextValue';
import AppShell from '../../shared/components/AppShell';
import DashboardHeader from '../../shared/components/DashboardHeader';
import DashboardFooter from '../../shared/components/DashboardFooter';
import { Search, User, Users, Bike, Building2, ChevronRight, BookOpen, Activity, Calendar, Wallet, Settings, Filter } from 'lucide-react';
import { collection, query, limit, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase';
import { getEstadoLogico } from '../../shared/utils/estadoHelpers';

const APP_ID = 'motoescuela-pro-v1';

export default function AdminDirectorio() {
  const navigate = useNavigate();
  const ctx = useContext(AppContext);
  const { logoutUser, notifications } = ctx;

  const [tab, setTab] = useState('clientes'); // 'clientes' | 'tutores' | 'proveedores' | 'motos'
  const [clientes, setClientes] = useState([]);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  
  // Estados para filtros de clientes
  const [filtroServicio, setFiltroServicio] = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState('todos');

  // Datos relacionales para filtrar clientes
  const [reservasData, setReservasData] = useState([]);
  const [packsData, setPacksData] = useState([]);
  const [accesosData, setAccesosData] = useState([]);

  useEffect(() => {
    if (tab === 'clientes' && clientes.length === 0) {
      const cargarClientes = async () => {
        setLoadingClientes(true);
        try {
          const base = ['artifacts', APP_ID, 'public', 'data'];
          
          const [uSnap, rSnap, pSnap, aSnap] = await Promise.all([
            getDocs(query(collection(db, ...base, 'usuarios'), limit(200))),
            getDocs(query(collection(db, ...base, 'reservas'), limit(500))),
            getDocs(query(collection(db, ...base, 'reservasPack'), limit(200))),
            getDocs(query(collection(db, ...base, 'accesosTeoricos'), limit(200)))
          ]);

          setClientes(uSnap.docs.map(d => ({ id: d.id, ...d.data() })));
          setReservasData(rSnap.docs.map(d => ({ id: d.id, ...d.data() })));
          setPacksData(pSnap.docs.map(d => ({ id: d.id, ...d.data() })));
          setAccesosData(aSnap.docs.map(d => ({ id: d.id, ...d.data() })));
          
        } catch (err) {
          console.error('[AdminDirectorio] Error cargando:', err);
        } finally {
          setLoadingClientes(false);
        }
      };
      cargarClientes();
    }
  }, [tab, clientes.length]);

  const tutores = ctx.instructores || [];
  const proveedores = ctx.proveedores || [];
  const motos = ctx.motos || [];

  // Filtrado en memoria
  const resultados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    
    // Función helper para obtener todos los registros de un cliente
    const getRegistrosCliente = (uid) => {
      return {
        res: reservasData.filter(r => String(r.userId) === String(uid)),
        packs: packsData.filter(p => String(p.userId) === String(uid)),
        acc: accesosData.filter(a => String(a.userId) === String(uid))
      };
    };

    if (tab === 'clientes') {
      return clientes.filter(c => {
        // 1. Filtro de búsqueda por texto
        const matchTexto = !q || 
          (c.nombre || '').toLowerCase().includes(q) || 
          (c.apellido || '').toLowerCase().includes(q) ||
          (c.cedula || '').includes(q) ||
          (c.correo || '').toLowerCase().includes(q);
        
        if (!matchTexto) return false;

        // 2. Filtros cruzados
        const regs = getRegistrosCliente(c.id);

        if (filtroServicio !== 'todos') {
          if (filtroServicio === 'pack' && regs.packs.length === 0) return false;
          if (filtroServicio === 'individual' && regs.res.filter(r => r.tipoReserva !== 'pack_sub').length === 0) return false;
          if (filtroServicio === 'teorico' && regs.acc.length === 0) return false;
        }

        if (filtroEstado !== 'todos') {
          const todasRes = regs.res;
          if (filtroEstado === 'completado' && !todasRes.some(r => r.estadoCurso === 'Aprobado' || r.estadoCurso === 'Completado')) return false;
          if (filtroEstado === 'pendiente' && !todasRes.some(r => r.estadoPago === 'Pendiente')) return false;
          if (filtroEstado === 'cancelado' && !todasRes.some(r => r.estadoPago === 'Cancelado' || r.estadoPago === 'Rechazado')) return false;
          if (filtroEstado === 'en_curso' && !todasRes.some(r => r.estadoCurso === 'En Curso' && (r.sesionTotalInicio || r.moduloEnProgreso))) return false;
          if (filtroEstado === 'ausente' && !todasRes.some(r => r.estadoCurso === 'Ausente')) return false;
          if (filtroEstado === 'tiempo_pendiente' && !todasRes.some(r => r.horasPendientes > 0)) return false;
        }

        return true;
      });
    }

    // Si es tutores, proveedores o motos (búsqueda básica por ahora)
    if (!q) {
      if (tab === 'tutores') return tutores;
      if (tab === 'proveedores') return proveedores;
      if (tab === 'motos') return motos;
    }

    if (tab === 'tutores') return tutores.filter(t => (t.nombre || '').toLowerCase().includes(q) || (t.correo || '').toLowerCase().includes(q));
    if (tab === 'proveedores') return proveedores.filter(p => (p.nombre || '').toLowerCase().includes(q) || (p.correo || '').toLowerCase().includes(q));
    if (tab === 'motos') return motos.filter(m => (m.marca || '').toLowerCase().includes(q) || (m.modelo || '').toLowerCase().includes(q) || (m.placa || '').toLowerCase().includes(q));
    
    return [];
  }, [tab, busqueda, clientes, tutores, proveedores, motos, filtroServicio, filtroEstado, reservasData, packsData, accesosData]);

  const handleLogout = async () => {
    if (logoutUser) await logoutUser();
    navigate('/');
  };

  const footerTabs = [
    { id: 'inicio', icon: Activity, label: 'Inicio', action: () => navigate('/dashboard') },
    { id: 'reservas', icon: BookOpen, label: 'Reservas', action: () => navigate('/admin/reservas') },
    { id: 'ocupacion', icon: Calendar, label: 'Ocupac.', action: () => navigate('/admin/ocupacion') },
    { id: 'finanzas', icon: Wallet, label: 'Finanzas', action: () => navigate('/admin/finanzas') },
    { id: 'config', icon: Settings, label: 'Config', action: () => navigate('/admin/config') }
  ];

  return (
    <AppShell 
      header={<DashboardHeader title="Directorio de Actores" onBack={() => navigate('/admin/config')} onLogout={handleLogout} notifications={notifications} />}
      footer={<DashboardFooter tabs={footerTabs} activeTab="" onTabChange={(id) => footerTabs.find(t => t.id === id)?.action()} />}
      bgColor="bg-gray-50"
    >
      <div className="p-4 space-y-4">
        
        {/* Buscador */}
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder={`Buscar en ${tab}...`}
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          />
        </div>

        {/* Pestañas */}
        <div className="flex bg-gray-200 p-1 rounded-xl overflow-x-auto scrollbar-hide">
          {[
            { id: 'clientes', label: 'Clientes', icon: User },
            { id: 'tutores', label: 'Tutores', icon: Users },
            { id: 'proveedores', label: 'Proveedores', icon: Building2 },
            { id: 'motos', label: 'Motos', icon: Bike }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setBusqueda(''); setFiltroServicio('todos'); setFiltroEstado('todos'); }}
              className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap ${tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>

        {/* Filtros Avanzados (Solo para Clientes) */}
        {tab === 'clientes' && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            <select 
              value={filtroServicio} 
              onChange={e => setFiltroServicio(e.target.value)}
              className="bg-white border border-gray-200 text-xs font-bold text-gray-700 rounded-lg px-2 py-1.5 focus:outline-none"
            >
              <option value="todos">Todos los servicios</option>
              <option value="pack">Con Pack</option>
              <option value="individual">Con Serv. Individual</option>
              <option value="teorico">Con Material Teórico</option>
            </select>

            <select 
              value={filtroEstado} 
              onChange={e => setFiltroEstado(e.target.value)}
              className="bg-white border border-gray-200 text-xs font-bold text-gray-700 rounded-lg px-2 py-1.5 focus:outline-none"
            >
              <option value="todos">Todos los estados</option>
              <option value="completado">Cursos Completados</option>
              <option value="pendiente">Reservas Pendientes</option>
              <option value="cancelado">Reservas Canceladas</option>
              <option value="en_curso">Sesión en Curso</option>
              <option value="ausente">Ausente</option>
              <option value="tiempo_pendiente">Tiempo Pendiente</option>
            </select>
          </div>
        )}

        {/* Lista de Resultados */}
        <div className="flex justify-between items-center px-1">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            Mostrando {resultados.length} {resultados.length === 1 ? 'resultado' : 'resultados'}
          </p>
        </div>
        
        <div className="space-y-2">
          {loadingClientes && <p className="text-center text-xs text-gray-500 py-4">Cargando...</p>}
          
          {!loadingClientes && resultados.length === 0 && (
            <div className="bg-white rounded-xl p-8 text-center border border-gray-100">
              <p className="text-sm text-gray-500">No se encontraron resultados.</p>
            </div>
          )}

          {!loadingClientes && resultados.map((item) => (
            <div 
              key={item.id} 
              onClick={() => {
                if (tab === 'clientes') navigate(`/admin/usuario/${item.id}`);
                else if (tab === 'tutores') navigate(`/admin/tutor/${item.id}`);
                else if (tab === 'proveedores') navigate(`/admin/proveedor/${item.id}`);
                else if (tab === 'motos') navigate(`/admin/moto/${item.id}`);
              }}
              className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  tab === 'clientes' ? 'bg-indigo-50 text-indigo-600' :
                  tab === 'tutores' ? 'bg-purple-50 text-purple-600' :
                  tab === 'proveedores' ? 'bg-teal-50 text-teal-600' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  {tab === 'clientes' && <User size={18} />}
                  {tab === 'tutores' && <Users size={18} />}
                  {tab === 'proveedores' && <Building2 size={18} />}
                  {tab === 'motos' && <Bike size={18} />}
                </div>
                <div>
                  <p className="font-bold text-sm text-gray-900">
                    {tab === 'clientes' ? `${String(item.nombre || '')} ${String(item.apellido || '')}` :
                     tab === 'tutores' ? `${String(item.nombre || '')} ${String(item.apellido || '')}` :
                     tab === 'proveedores' ? String(item.nombre || '') :
                     `${String(item.marca || '')} ${String(item.modelo || '')}`}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    {tab === 'clientes' ? `CI: ${String(item.cedula || '—')} · ${String(item.correo || 'Sin correo')}` :
                     tab === 'tutores' ? `${String(item.correo || 'Sin correo')} · ${item.activo ? 'Activo' : 'Inactivo'}` :
                     tab === 'proveedores' ? `${String(item.correo || 'Sin correo')} · ${item.activo ? 'Activo' : 'Inactivo'}` :
                     `Placa: ${String(item.placa || '—')} · ${item.activo ? 'Activa' : 'Inactiva'}`}
                  </p>
                </div>
              </div>
              <ChevronRight size={16} className="text-gray-300" />
            </div>
          ))}
        </div>

      </div>
    </AppShell>
  );
}
