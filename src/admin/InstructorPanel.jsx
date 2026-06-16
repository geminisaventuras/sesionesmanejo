import { useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContextValue';
import { Spinner } from '../components/UI';
import { LogOut, Calendar, Clock, MapPin, Bike, BookOpen } from 'lucide-react';

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const InstructorPanel = () => {
  const { user, reservas, cursos, horarios, motos, sedes, logoutUser } = useContext(AppContext);
  const navigate = useNavigate();

  const misClases = useMemo(() => {
    if (!user?.uid) return [];
    const uid = String(user.uid);
    return (reservas || []).filter(r => String(r.instructorId) === uid);
  }, [reservas, user?.uid]);

  const { activas, completadas } = useMemo(() => ({
    activas: misClases.filter(c => c.estadoCurso !== 'Aprobado' && (c.estadoPago === 'Aprobado' || c.estadoPago === 'Pendiente')),
    completadas: misClases.filter(c => c.estadoCurso === 'Aprobado')
  }), [misClases]);

  const handleLogout = async () => {
    if (logoutUser) await logoutUser();
    navigate('/');
  };

  if (!user) return <Spinner message="Cargando perfil..." />;

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col max-w-md mx-auto shadow-xl relative overflow-hidden">
      <div className="bg-[#0f172a] text-white px-6 pt-10 pb-6 rounded-b-[40px] shrink-0 z-20 shadow-lg flex justify-between items-center">
        <div><h1 className="text-2xl font-black tracking-tight uppercase">Mi Agenda</h1><p className="text-slate-400 text-xs mt-0.5">{user?.data?.nombre || 'Instructor'} {user?.data?.apellido || ''}</p></div>
        <button onClick={handleLogout} className="w-12 h-12 bg-[#1e293b] rounded-full flex items-center justify-center hover:bg-slate-700 transition-colors shadow-inner"><LogOut size={20} className="text-gray-300 ml-1" /></button>
      </div>
      <div className="flex-1 p-6 overflow-y-auto pb-6 space-y-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <h2 className="text-xl font-black text-gray-900 uppercase tracking-widest">Próximas Clases</h2>
        {activas.length === 0 && <p className="text-gray-500 text-sm text-center py-4">No tienes clases activas.</p>}
        {activas.map(r => {
          const curso = (cursos || []).find(c => String(c.id) === String(r.cursoId));
          const horario = (horarios || []).find(h => String(h.id) === String(r.horaId));
          const moto = (motos || []).find(m => String(m.id) === String(r.motoAsignadaId));
          const sede = (sedes || []).find(s => String(s.id) === String(r.sedeId));
          const diaSemana = r.fecha1 ? DIAS_SEMANA[new Date(r.fecha1 + 'T12:00:00').getDay()] : '';
          return (
            <div key={r.id} className="bg-white p-5 rounded-2xl shadow-sm border border-blue-200">
              <div className="flex justify-between items-start mb-3"><div><h3 className="font-black text-lg text-gray-900">{r.nombre} {r.apellido}</h3><p className="text-xs text-gray-500">{r.telefono} | {r.zona}</p></div><span className={`text-[10px] font-black px-2 py-1 rounded ${r.estadoPago === 'Pendiente' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-700'}`}>{r.estadoPago === 'Pendiente' ? 'Pago Pendiente' : 'Confirmada'}</span></div>
              <div className="bg-gray-50 p-3 rounded-xl space-y-2 text-sm">
                <div className="flex items-center gap-2"><Calendar size={16} className="text-gray-500" /><span className="font-bold">{r.fecha1} y {r.fecha2} ({diaSemana})</span></div>
                {horario && <div className="flex items-center gap-2"><Clock size={16} className="text-gray-500" /><span>{horario.label}</span></div>}
                {moto && <div className="flex items-center gap-2"><Bike size={16} className="text-gray-500" /><span>{moto.marca} {moto.modelo} ({moto.tipo})</span></div>}
                {sede && <div className="flex items-center gap-2"><MapPin size={16} className="text-gray-500" /><span>{sede.nombre}</span></div>}
                {curso && <div className="flex items-center gap-2"><BookOpen size={16} className="text-gray-500" /><span>{curso.nombre}</span></div>}
              </div>
            </div>
          );
        })}
        {completadas.length > 0 && (
          <>
            <h2 className="text-xl font-black text-gray-900 uppercase tracking-widest mt-6">Historial</h2>
            {completadas.map(r => {
              const horario = (horarios || []).find(h => String(h.id) === String(r.horaId));
              const moto = (motos || []).find(m => String(m.id) === String(r.motoAsignadaId));
              const diaSemana = r.fecha1 ? DIAS_SEMANA[new Date(r.fecha1 + 'T12:00:00').getDay()] : '';
              return (
                <div key={r.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
                  <div><p className="font-bold text-sm text-gray-900">{r.nombre} {r.apellido}</p><p className="text-xs text-gray-500">{r.fecha1} ({diaSemana}) · {horario?.label} · {moto?.marca} {moto?.modelo}</p></div>
                  <span className="text-[10px] text-green-600 font-bold bg-green-50 px-2 py-1 rounded border border-green-200">Completada</span>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
};

export default InstructorPanel;
