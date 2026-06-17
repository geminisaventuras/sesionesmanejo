// @build: 2026-06-17.07-00-00 | id: INSTRUCTOR-REDISEÑO | desc: Panel del instructor rediseñado con estilo compacto y tarjetas del dashboard
import { useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContextValue';
import { Spinner } from '../components/UI';
import { LogOut, Calendar, Clock, MapPin, Bike, BookOpen, User, Phone, Award, AlertCircle, Check } from 'lucide-react';

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

const formatearFechaNatural = (fechaStr) => {
  if (!fechaStr) return '';
  const [anio, mes, dia] = fechaStr.split('-');
  const fecha = new Date(anio, parseInt(mes)-1, dia);
  return DIAS_SEMANA[fecha.getDay()] + ' ' + parseInt(dia) + ' de ' + MESES[parseInt(mes)-1];
};

const InstructorPanel = () => {
  const { user, reservas, cursos, horarios, motos, sedes, logoutUser } = useContext(AppContext);
  const navigate = useNavigate();

  const misClases = useMemo(() => {
    if (!user?.uid) return [];
    const uid = String(user.uid);
    return (reservas || []).filter(r => String(r.instructorId) === uid);
  }, [reservas, user?.uid]);

  const { activas, completadas, hoy } = useMemo(() => {
    const hoyStr = new Date().toISOString().split('T')[0];
    return {
      activas: misClases.filter(c => c.estadoCurso !== 'Aprobado' && (c.estadoPago === 'Aprobado' || c.estadoPago === 'Pendiente')),
      completadas: misClases.filter(c => c.estadoCurso === 'Aprobado'),
      hoy: misClases.filter(c => (c.fecha === hoyStr || c.fecha2 === hoyStr) && c.estadoCurso !== 'Aprobado').length
    };
  }, [misClases]);

  const handleLogout = async () => {
    if (logoutUser) await logoutUser();
    navigate('/');
  };

  if (!user) return <Spinner message="Cargando perfil..." />;

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col max-w-md mx-auto shadow-xl relative overflow-hidden">
      {/* HEADER */}
      <div className="bg-[#0f172a] text-white px-6 pt-10 pb-6 rounded-b-[40px] shrink-0 z-20 shadow-lg flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black tracking-tight uppercase">Hola, {user?.data?.nombre || 'Instructor'}</h1>
          <p className="text-slate-400 text-xs mt-0.5">Mi Agenda</p>
        </div>
        <button onClick={handleLogout} className="w-12 h-12 bg-[#1e293b] rounded-full flex items-center justify-center hover:bg-slate-700 transition-colors shadow-inner">
          <LogOut size={20} className="text-gray-300 ml-1" />
        </button>
      </div>

      {/* CONTENIDO */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {/* TARJETA RESUMEN */}
        <div className="bg-blue-600 text-white p-5 rounded-3xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>
          <p className="text-blue-200 text-xs font-bold uppercase tracking-wide">Clases hoy</p>
          <h2 className="text-4xl font-black mt-1">{hoy}</h2>
          <p className="text-blue-200 text-xs mt-2">{activas.length} activas · {completadas.length} completadas</p>
        </div>

        {/* PRÓXIMAS CLASES */}
        <h2 className="text-lg font-black text-gray-900 uppercase tracking-widest">Próximas Clases</h2>
        {activas.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-4">No tienes clases activas.</p>
        )}
        {activas.map(r => {
          const curso = (cursos || []).find(c => String(c.id) === String(r.cursoId));
          const horario = (horarios || []).find(h => String(h.id) === String(r.horaId));
          const moto = (motos || []).find(m => String(m.id) === String(r.motoAsignadaId));
          const sede = (sedes || []).find(s => String(s.id) === String(r.sedeId));
          const horaInicio = horario?.label ? horario.label.split('-')[0]?.trim() : '--:--';
          const horaFin = horario?.label ? horario.label.split('-')[1]?.trim() : '--:--';

          return (
            <div key={r.id} className="bg-white p-4 rounded-2xl shadow-sm border border-blue-200">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-black text-lg text-gray-900">{r.nombre} {r.apellido}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Phone size={12} className="text-gray-400" />
                    <p className="text-xs text-gray-500">{r.telefono || 'Sin teléfono'}</p>
                    <MapPin size={12} className="text-gray-400 ml-1" />
                    <p className="text-xs text-gray-500">{r.zona || 'Sin zona'}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-black px-2 py-1 rounded ${r.estadoPago === 'Pendiente' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-700'}`}>
                  {r.estadoPago === 'Pendiente' ? 'Pago Pendiente' : 'Confirmada'}
                </span>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-gray-500" />
                  <span className="font-bold">{formatearFechaNatural(r.fecha)} y {formatearFechaNatural(r.fecha2)}</span>
                </div>
                {horario && (
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-gray-500" />
                    <span>{horaInicio} - {horaFin}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Bike size={14} className="text-gray-500" />
                  <span>{moto ? `${moto.marca} ${moto.modelo} (${moto.tipo})` : 'Moto propia'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-gray-500" />
                  <span>{sede?.nombre || 'Sede no asignada'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen size={14} className="text-gray-500" />
                  <span>{curso?.nombre || 'Curso no asignado'}</span>
                </div>
              </div>
            </div>
          );
        })}

        {/* HISTORIAL */}
        {completadas.length > 0 && (
          <>
            <h2 className="text-lg font-black text-gray-900 uppercase tracking-widest mt-6">Historial</h2>
            {completadas.map(r => {
              const horario = (horarios || []).find(h => String(h.id) === String(r.horaId));
              const moto = (motos || []).find(m => String(m.id) === String(r.motoAsignadaId));
              return (
                <div key={r.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-sm text-gray-900">{r.nombre} {r.apellido}</p>
                    <p className="text-xs text-gray-500">{formatearFechaNatural(r.fecha)} · {horario?.label || '--:--'} · {moto ? `${moto.marca} ${moto.modelo}` : 'Moto propia'}</p>
                  </div>
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
