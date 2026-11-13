// @build: 2026-11-13 | id: ADMIN-MOTO-DETALLE-V10 | desc: Filtros restaurados
import { useState, useEffect, useContext, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { AppContext } from '../../../context/AppContextValue';
import AppShell from '../../shared/components/AppShell';
import DashboardHeader from '../../shared/components/DashboardHeader';
import DashboardFooter from '../../shared/components/DashboardFooter';
import { Bike, Calendar, ShieldCheck } from 'lucide-react';
import { doc, getDoc, collection, query, getDocs, where } from 'firebase/firestore';
import { db } from '../../../firebase';
import { getEstadoLogico } from '../../shared/utils/estadoHelpers';

const APP_ID = 'motoescuela-pro-v1';

export default function AdminMotoDetalle() {
  const { uid } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { logoutUser, notifications, cursos, proveedores, instructores } = useContext(AppContext);
  const [moto, setMoto] = useState(null);
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('todos');

  useEffect(() => {
    const cargarTodo = async () => {
      try {
        setLoading(true);
        const base = ['artifacts', APP_ID, 'public', 'data'];
        const mSnap = await getDoc(doc(db, ...base, 'motos', uid));
        if (mSnap.exists()) setMoto(mSnap.data());
        
        const q1 = query(collection(db, ...base, 'reservas'), where('motoAsignadaId', '==', uid));
        const q2 = query(collection(db, ...base, 'reservas'), where('motoReposicionId', '==', uid));
        
        const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
        
        const mapa = new Map();
        [...snap1.docs, ...snap2.docs].forEach(d => {
          if (!mapa.has(d.id)) mapa.set(d.id, { id: d.id, ...d.data() });
        });
        
        setReservas(Array.from(mapa.values()).filter(r => 
          r.estadoPago === 'Aprobado' || r.estadoCurso === 'En Curso' || r.estadoCurso === 'Aprobado' || r.estadoCurso === 'Completado' || r.estadoCurso === 'Ausente'
        ));
      } catch (error) { console.error('[AdminMotoDetalle] Error:', error); }
      finally { setLoading(false); }
    };
    if (uid) cargarTodo();
  }, [uid, location.key]);

  
  const metricas = useMemo(() => {
    let horasUso = 0;
    let sesionesCompletadas = 0;
    reservas.forEach(r => {
      if (getEstadoLogico(r) === 'completado') { sesionesCompletadas++; horasUso += 2; }
    });
    return { horasUso, sesionesTotales: reservas.length, sesionesCompletadas };
  }, [reservas]);

  const reservasFiltradas = useMemo(() => {
    const ordenadas = [...reservas].sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')));
    return ordenadas.filter(r => filtro === 'todos' ? true : getEstadoLogico(r) === filtro);
  }, [reservas, filtro]);

  const header = <DashboardHeader title="Ficha de la Moto" onBack={() => navigate('/admin/directorio')} onLogout={logoutUser} notifications={notifications} />;
  const footerTabs = [{ id: 'directorio', icon: Bike, label: 'Volver al Directorio', action: () => navigate('/admin/directorio') }];

  if (loading) return <AppShell header={header}><div className="p-8 text-center text-gray-500">Cargando...</div></AppShell>;
  if (!moto) return <AppShell header={header}><div className="p-8 text-center text-gray-500">Moto no encontrada.</div></AppShell>;

  const proveedor = (proveedores || []).find(p => String(p.id) === String(moto.proveedorId));

  return (
    <AppShell header={header} footer={<DashboardFooter tabs={footerTabs} activeTab="directorio" onTabChange={(id) => footerTabs.find(t => t.id === id)?.action()} />} bgColor="bg-gray-50">
      <div className="p-4 space-y-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center text-xl font-black"><Bike size={28} /></div>
            <div>
              <h1 className="text-xl font-black text-gray-900">{String(moto?.marca || '')} {String(moto?.modelo || '')}</h1>
              <p className="text-xs text-gray-500 font-bold text-slate-600 uppercase tracking-wider">Placa: {String(moto?.placa || '-')} / {String(moto?.tipo || '')}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600"><div className="flex items-center gap-2 col-span-2"><ShieldCheck size={14} className="text-gray-400"/> Proveedor: {String(proveedor?.nombre || 'Sin asignar')}</div></div>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-slate-600 to-slate-800 text-white p-4 rounded-2xl shadow-sm"><p className="text-[10px] font-bold text-slate-200 uppercase tracking-wider mb-1">Horas de Uso</p><h2 className="text-2xl font-black">{metricas.horasUso}h</h2></div>
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white p-4 rounded-2xl shadow-sm"><p className="text-[10px] font-bold text-indigo-100 uppercase tracking-wider mb-1">Sesiones</p><h2 className="text-2xl font-black">{metricas.sesionesCompletadas} <span className="text-sm opacity-60">/ {metricas.sesionesTotales}</span></h2></div>
        </div>
        <p className="text-[10px] text-gray-400 text-center italic px-2">
          Calculado sobre {metricas.sesionesTotales} sesiones. Puede no incluir el historial completo.
        </p>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1">
          {['todos', 'asignada', 'en_curso', 'completado', 'ausente'].map(f => (
            <button key={f} onClick={() => setFiltro(f)} className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap capitalize ${filtro === f ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
              {f === 'en_curso' ? 'En Curso' : f}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
          <h3 className="font-bold text-gray-900 text-sm">Historial de Uso</h3>
          {reservasFiltradas.length === 0 && <p className="text-xs text-gray-500 text-center py-2">No hay servicios en esta categoria.</p>}
          {reservasFiltradas.map(r => {
            const curso = (cursos || []).find(c => String(c.id) === String(r.cursoId));
            const instructor = (instructores || []).find(i => String(i.id) === String(r.instructorId));
            const estado = getEstadoLogico(r);
            
            let badgeColor = 'bg-indigo-100 text-indigo-700';
            let badgeText = 'Asignada';
            let iconColor = 'text-indigo-500';
            
            if (estado === 'completado') { badgeColor = 'bg-green-100 text-green-700'; badgeText = 'Completado'; iconColor = 'text-emerald-500'; }
            else if (estado === 'en_curso') { badgeColor = 'bg-blue-100 text-blue-700'; badgeText = 'En Curso'; iconColor = 'text-blue-500'; }
            else if (estado === 'ausente') { badgeColor = 'bg-slate-200 text-slate-700'; badgeText = 'Ausente'; iconColor = 'text-slate-500'; }

            return (
              <div key={r.id} onClick={() => navigate(`/admin/reserva/${r.id}`, { state: { from: `/admin/moto/${uid}` } })} className="flex justify-between items-center text-xs border-b border-gray-50 pb-2 cursor-pointer hover:bg-gray-50">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className={iconColor}/>
                  <div>
                    <p className="font-medium text-gray-800">{String(r.fecha || '').split('-').reverse().join('/')} - {String(curso?.nombre || 'Sesion')}</p>
                    <p className="text-[10px] text-gray-500">Alumno: {String(r.nombre || '')} {String(r.apellido || '')} / Tutor: {String(instructor?.nombre || '-')}</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${badgeColor}`}>{badgeText}</span>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
