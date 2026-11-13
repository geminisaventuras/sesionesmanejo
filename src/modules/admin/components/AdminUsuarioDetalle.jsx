// @build: 2026-11-13 | id: ADMIN-USUARIO-DETALLE-V4 | desc: Agregados filtros de estado a la ficha del cliente
import { useState, useEffect, useContext, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { AppContext } from '../../../context/AppContextValue';
import AppShell from '../../shared/components/AppShell';
import DashboardHeader from '../../shared/components/DashboardHeader';
import DashboardFooter from '../../shared/components/DashboardFooter';
import { User, Mail, Phone, BookOpen, Package, GraduationCap, ShieldCheck, MessageCircle } from 'lucide-react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase';

const APP_ID = 'motoescuela-pro-v1';

export default function AdminUsuarioDetalle() {
  const { uid } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { logoutUser, notifications } = useContext(AppContext);

  const [perfil, setPerfil] = useState(null);
  const [reservas, setReservas] = useState([]);
  const [accesos, setAccesos] = useState([]);
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('todos'); // <-- ESTADO DEL FILTRO

  useEffect(() => {
    const cargarTodo = async () => {
      try {
        setLoading(true);
        const base = ['artifacts', APP_ID, 'public', 'data'];
        
        const userRef = doc(db, ...base, 'usuarios', uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) setPerfil(userSnap.data());

        const rSnap = await getDocs(query(collection(db, ...base, 'reservas'), where('userId', '==', uid)));
        setReservas(rSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        const aSnap = await getDocs(query(collection(db, ...base, 'accesosTeoricos'), where('userId', '==', uid)));
        setAccesos(aSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        const pSnap = await getDocs(query(collection(db, ...base, 'reservasPack'), where('userId', '==', uid)));
        setPacks(pSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      } catch (error) {
        console.error('[AdminUsuarioDetalle] Error:', error);
      } finally {
        setLoading(false);
      }
    };
    if (uid) cargarTodo();
  }, [uid, location.key]);

  const getEstadoLogico = (r) => {
    if (r.estadoCurso === 'Ausente') return 'ausente';
    if (r.estadoCurso === 'Aprobado' || r.estadoCurso === 'Completado') return 'completado';
    const tieneTiempo = Number(r.tiempoEfectivo) > 0;
    const tieneModulos = r.modulosEstado && Object.keys(r.modulosEstado).length > 0;
    if (tieneTiempo || tieneModulos || r.moduloEnProgreso) return 'en_curso';
    return 'asignada';
  };

  const metricas = useMemo(() => {
    let totalGastado = 0;
    let cursosComprados = 0;

    reservas.forEach(r => {
      if (r.estadoPago === 'Aprobado') {
        totalGastado += Number(r.pagoTotalMoneda) || 0;
        cursosComprados++;
      }
    });

    packs.forEach(p => {
      if (p.estadoPago === 'Aprobado') {
        const base = Number(p.precioBaseCongelado) || 0;
        const desc = Number(p.descuentoCongelado?.monto) || 0;
        totalGastado += (base > 0 && desc > 0) ? (base - desc) : (Number(p.precioTotalCongelado) || 0);
        cursosComprados += (p.subReservas || []).length;
      }
    });

    accesos.forEach(a => {
      if (a.estadoPago === 'Aprobado') {
        totalGastado += Number(a.precio || 0);
        cursosComprados++;
      }
    });

    return { totalGastado, cursosComprados, esRecurrente: cursosComprados > 1 };
  }, [reservas, packs, accesos]);

  // FILTRADO DE HISTORIAL
  const historialFiltrado = useMemo(() => {
    const items = [];
    
    // Agregamos reservas
    reservas.filter(r => r.tipoReserva !== 'pack_sub').forEach(r => {
      items.push({ tipo: 'reserva', data: r, estadoLogico: getEstadoLogico(r), fecha: r.fecha || '' });
    });
    
    // Agregamos packs
    packs.forEach(p => {
      items.push({ tipo: 'pack', data: p, estadoLogico: 'completado', fecha: p.fechaCompra?.toDate?.()?.toISOString() || '' });
    });
    
    // Agregamos teoricos
    accesos.filter(a => !String(a.id).startsWith('pack_')).forEach(a => {
      items.push({ tipo: 'teorico', data: a, estadoLogico: 'completado', fecha: a.fechaCompra?.toDate?.()?.toISOString() || '' });
    });

    // Ordenamos por fecha descendente
    items.sort((a, b) => b.fecha.localeCompare(a.fecha));

    // Filtramos
    return items.filter(item => filtro === 'todos' ? true : item.estadoLogico === filtro);
  }, [reservas, packs, accesos, filtro]);

  const header = <DashboardHeader title="Ficha del Cliente" onBack={() => navigate('/admin/directorio')} onLogout={logoutUser} notifications={notifications} />;
  const footerTabs = [
    { id: 'directorio', icon: BookOpen, label: 'Volver al Directorio', action: () => navigate('/admin/directorio', { replace: true }) }
  ];

  if (loading) return <AppShell header={header}><div className="p-8 text-center text-gray-500">Cargando datos del cliente...</div></AppShell>;
  if (!perfil && reservas.length === 0) return <AppShell header={header}><div className="p-8 text-center text-gray-500">No se encontro informacion de este cliente.</div></AppShell>;

  return (
    <AppShell header={header} footer={<DashboardFooter tabs={footerTabs} activeTab="directorio" onTabChange={(id) => footerTabs.find(t => t.id === id)?.action()} />} bgColor="bg-gray-50">
      <div className="p-4 space-y-4">
        
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 relative overflow-hidden">
          {metricas.esRecurrente && (
            <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-lg flex items-center gap-1">
              <ShieldCheck size={12} /> Cliente Recurrente
            </div>
          )}
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xl font-black">
              {String(perfil?.nombre || 'U').charAt(0)}{String(perfil?.apellido || '').charAt(0)}
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900">{String(perfil?.nombre || 'Sin nombre')} {String(perfil?.apellido || '')}</h1>
              <p className="text-xs text-gray-500">Registrado en la app</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
            <div className="flex items-center gap-2"><User size={14} className="text-gray-400"/> CI: {String(perfil?.cedula || '-')}</div>
            <div className="flex items-center gap-2">
              <Phone size={14} className="text-gray-400"/> {String(perfil?.telefono || '-')}
              {perfil?.telefono && (
                <a href={`https://wa.me/${String(perfil.telefono).replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="ml-1 bg-green-100 text-green-700 p-1 rounded hover:bg-green-200" title="Enviar WhatsApp">
                  <MessageCircle size={12} />
                </a>
              )}
            </div>
            <div className="flex items-center gap-2 col-span-2"><Mail size={14} className="text-gray-400"/> {String(perfil?.correo || '-')}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white p-4 rounded-2xl shadow-sm">
            <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-wider mb-1">Total Invertido</p>
            <h2 className="text-2xl font-black">${metricas.totalGastado.toFixed(2)}</h2>
          </div>
          <div className="bg-gradient-to-br from-purple-600 to-purple-800 text-white p-4 rounded-2xl shadow-sm">
            <p className="text-[10px] font-bold text-purple-100 uppercase tracking-wider mb-1">Servicios Comprados</p>
            <h2 className="text-2xl font-black">{metricas.cursosComprados}</h2>
          </div>
        </div>

        {/* BARRA DE FILTROS (Faltaba en el cliente) */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1">
          {['todos', 'asignada', 'en_curso', 'completado', 'ausente'].map(f => (
            <button key={f} onClick={() => setFiltro(f)} className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap capitalize ${filtro === f ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
              {f === 'en_curso' ? 'En Curso' : f}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
          <h3 className="font-bold text-gray-900 text-sm">Historial de Servicios</h3>
          
          {historialFiltrado.length === 0 && (
            <p className="text-xs text-gray-500 text-center py-2">No hay compras registradas en esta categoria.</p>
          )}

          {historialFiltrado.map(item => {
            if (item.tipo === 'pack') {
              const p = item.data;
              return (
                <div key={p.id} onClick={() => navigate(`/admin/pack/${p.id}`, { state: { from: `/admin/usuario/${uid}` } })} className="flex justify-between items-center text-xs border-b border-gray-50 pb-2 cursor-pointer hover:bg-gray-50">
                  <div className="flex items-center gap-2"><Package size={14} className="text-purple-500"/><span className="font-medium text-gray-800">{String(p.packNombre || 'Pack')}</span></div>
                  <span className="font-bold text-gray-900">${Number(p.precioTotalCongelado || 0).toFixed(2)}</span>
                </div>
              );
            }
            if (item.tipo === 'teorico') {
              const a = item.data;
              return (
                <div key={a.id} onClick={() => navigate(`/admin/acceso-teorico/${a.id}`, { state: { from: `/admin/usuario/${uid}` } })} className="flex justify-between items-center text-xs border-b border-gray-50 pb-2 cursor-pointer hover:bg-gray-50">
                  <div className="flex items-center gap-2"><GraduationCap size={14} className="text-teal-500"/><span className="font-medium text-gray-800">Modulo Teorico</span></div>
                  <span className="font-bold text-gray-900">${Number(a.precio || 0).toFixed(2)}</span>
                </div>
              );
            }
            
            const r = item.data;
            return (
              <div key={r.id} onClick={() => navigate(`/admin/reserva/${r.id}`, { state: { from: `/admin/usuario/${uid}` } })} className="flex justify-between items-center text-xs border-b border-gray-50 pb-2 cursor-pointer hover:bg-gray-50">
                <div className="flex items-center gap-2">
                  <BookOpen size={14} className="text-indigo-500"/>
                  <div>
                    <p className="font-medium text-gray-800">Sesion Practica</p>
                    <p className="text-[9px] text-gray-400 capitalize">{item.estadoLogico.replace('_', ' ')}</p>
                  </div>
                </div>
                <span className="font-bold text-gray-900">${Number(r.pagoTotalMoneda || 0).toFixed(2)}</span>
              </div>
            );
          })}
        </div>

      </div>
    </AppShell>
  );
}
