// @build: 2026-11-13 | id: ADMIN-INSTRUCTOR-DETALLE-V10 | desc: Filtros restaurados
import { useState, useEffect, useContext, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { AppContext } from '../../../context/AppContextValue';
import AppShell from '../../shared/components/AppShell';
import DashboardHeader from '../../shared/components/DashboardHeader';
import DashboardFooter from '../../shared/components/DashboardFooter';
import { Mail, Phone, BookOpen, Award, MapPin, MessageCircle } from 'lucide-react';
import { doc, getDoc, collection, query, getDocs, limit } from 'firebase/firestore';
import { db } from '../../../firebase';

const APP_ID = 'motoescuela-pro-v1';

export default function AdminInstructorDetalle() {
  const { uid } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { logoutUser, notifications, cursos, sedes } = useContext(AppContext);
  const [perfil, setPerfil] = useState(null);
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('todos');

  useEffect(() => {
    const cargarTodo = async () => {
      try {
        setLoading(true);
        const base = ['artifacts', APP_ID, 'public', 'data'];
        const userSnap = await getDoc(doc(db, ...base, 'instructores', uid));
        let datosPerfil = null;
        if (userSnap.exists()) { datosPerfil = userSnap.data(); setPerfil(datosPerfil); }
        
        const rSnap = await getDocs(query(collection(db, ...base, 'reservas'), limit(500)));
        const todas = rSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const idInterno = datosPerfil?.id || uid;
        const idsValidos = [String(uid), String(idInterno)];
        
        const filtradas = todas.filter(r => {
          const idsReserva = [String(r.instructorId), String(r.instructorOriginalId), ...(r.implicadosIds || []).map(String), ...(r.instructoresInvolucrados || []).map(i => String(i.id))].filter(Boolean);
          const perteneceAlTutor = idsReserva.some(id => idsValidos.includes(id));
          const esReservaReal = r.estadoPago === 'Aprobado' || r.estadoCurso === 'En Curso' || r.estadoCurso === 'Aprobado' || r.estadoCurso === 'Completado' || r.estadoCurso === 'Ausente';
          return perteneceAlTutor && esReservaReal;
        });
        setReservas(filtradas);
      } catch (error) { console.error('[AdminInstructorDetalle] Error:', error); }
      finally { setLoading(false); }
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
    let totalGanado = 0;
    let sesionesCompletadas = 0;
    const idInterno = perfil?.id || uid;
    const idsValidos = [String(uid), String(idInterno)];
    
    reservas.forEach(r => {
      if (getEstadoLogico(r) === 'completado') {
        sesionesCompletadas++;
        let comisionBase = Number(r.comisionInstructor) || 0;
        let porcentaje = 100;
        if (r.esReservaCompartida && r.instructoresInvolucrados) {
          const involucrado = r.instructoresInvolucrados.find(i => idsValidos.includes(String(i.id)));
          if (involucrado) porcentaje = involucrado.porcentaje;
          else porcentaje = 0;
        }
        totalGanado += comisionBase * (porcentaje / 100);
      }
    });
    return { totalGanado, sesionesTotales: reservas.length, sesionesCompletadas };
  }, [reservas, uid, perfil]);

  const reservasFiltradas = useMemo(() => {
    const ordenadas = [...reservas].sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')));
    return ordenadas.filter(r => filtro === 'todos' ? true : getEstadoLogico(r) === filtro);
  }, [reservas, filtro]);

  const header = <DashboardHeader title="Ficha del Tutor" onBack={() => navigate('/admin/directorio')} onLogout={logoutUser} notifications={notifications} />;
  const footerTabs = [{ id: 'directorio', icon: BookOpen, label: 'Volver al Directorio', action: () => navigate('/admin/directorio') }];

  if (loading) return <AppShell header={header}><div className="p-8 text-center text-gray-500">Cargando...</div></AppShell>;
  if (!perfil) return <AppShell header={header}><div className="p-8 text-center text-gray-500">Tutor no encontrado.</div></AppShell>;

  const listaSedes = perfil?.sedes?.length > 0 
    ? perfil.sedes.map(s => {
        const sedeObj = (sedes || []).find(x => String(x.id) === String(s));
        return sedeObj ? String(sedeObj.nombre) : String(s);
      }).join(', ')
    : 'Todas';

  return (
    <AppShell header={header} footer={<DashboardFooter tabs={footerTabs} activeTab="directorio" onTabChange={(id) => footerTabs.find(t => t.id === id)?.action()} />} bgColor="bg-gray-50">
      <div className="p-4 space-y-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xl font-black">{String(perfil?.nombre || 'T').charAt(0)}{String(perfil?.apellido || '').charAt(0)}</div>
            <div><h1 className="text-xl font-black text-gray-900">{String(perfil?.nombre || '')} {String(perfil?.apellido || '')}</h1><p className="text-xs text-gray-500 font-bold text-purple-600 uppercase tracking-wider">Tutor de Practicas</p></div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
            <div className="flex items-center gap-2"><Mail size={14} className="text-gray-400"/> {String(perfil?.correo || '-')}</div>
            <div className="flex items-center gap-2">
              <Phone size={14} className="text-gray-400"/> {String(perfil?.telefono || '-')}
              {perfil?.telefono && (
                <a href={`https://wa.me/${String(perfil.telefono).replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="ml-1 bg-green-100 text-green-700 p-1 rounded hover:bg-green-200" title="Enviar WhatsApp">
                  <MessageCircle size={12} />
                </a>
              )}
            </div>
            <div className="flex items-center gap-2 col-span-2"><MapPin size={14} className="text-gray-400"/> Sedes: {listaSedes}</div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white p-4 rounded-2xl shadow-sm"><p className="text-[10px] font-bold text-emerald-100 uppercase tracking-wider mb-1">Total Ganado</p><h2 className="text-2xl font-black">${metricas.totalGanado.toFixed(2)}</h2></div>
          <div className="bg-gradient-to-br from-purple-600 to-purple-800 text-white p-4 rounded-2xl shadow-sm"><p className="text-[10px] font-bold text-purple-100 uppercase tracking-wider mb-1">Sesiones</p><h2 className="text-2xl font-black">{metricas.sesionesCompletadas} <span className="text-sm opacity-60">/ {metricas.sesionesTotales}</span></h2></div>
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1">
          {['todos', 'asignada', 'en_curso', 'completado', 'ausente'].map(f => (
            <button key={f} onClick={() => setFiltro(f)} className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap capitalize ${filtro === f ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
              {f === 'en_curso' ? 'En Curso' : f}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
          <h3 className="font-bold text-gray-900 text-sm">Historial de Servicios</h3>
          {reservasFiltradas.length === 0 && <p className="text-xs text-gray-500 text-center py-2">No hay servicios en esta categoria.</p>}
          {reservasFiltradas.map(r => {
            const curso = (cursos || []).find(c => String(c.id) === String(r.cursoId));
            const estado = getEstadoLogico(r);
            
            let badgeColor = 'bg-indigo-100 text-indigo-700';
            let badgeText = 'Asignada';
            let iconColor = 'text-indigo-500';
            
            if (estado === 'completado') { badgeColor = 'bg-green-100 text-green-700'; badgeText = 'Completado'; iconColor = 'text-emerald-500'; }
            else if (estado === 'en_curso') { badgeColor = 'bg-blue-100 text-blue-700'; badgeText = 'En Curso'; iconColor = 'text-blue-500'; }
            else if (estado === 'ausente') { badgeColor = 'bg-slate-200 text-slate-700'; badgeText = 'Ausente'; iconColor = 'text-slate-500'; }

            return (
              <div key={r.id} onClick={() => navigate(`/admin/reserva/${r.id}`, { state: { from: `/admin/tutor/${uid}` } })} className="flex justify-between items-center text-xs border-b border-gray-50 pb-2 cursor-pointer hover:bg-gray-50">
                <div className="flex items-center gap-2">
                  <Award size={14} className={iconColor}/>
                  <div>
                    <p className="font-medium text-gray-800">{String(curso?.nombre || 'Sesion')}</p>
                    <p className="text-[10px] text-gray-500">{String(r.fecha || '').split('-').reverse().join('/')} / {String(r.nombre || '')} {String(r.apellido || '')}</p>
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
