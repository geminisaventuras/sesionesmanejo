// @build: 2026-09-30 | id: LEGAL-TERMINOLOGIA-PACK-DETALLE | desc: Página dedicada al detalle del pack del estudiante
import { useContext, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { AppContext } from '../../../context/AppContextValue';
import { Spinner } from '../../../components/UI';
import AppShell from '../../shared/components/AppShell';
import DashboardHeader from '../../shared/components/DashboardHeader';
import DashboardFooter from '../../shared/components/DashboardFooter';
import {
  Package, Check, Lock, Clock, Calendar, MapPin, BookOpen, Award, Info, Bike,
  Activity, Compass, Library, FileText, Settings, User
} from 'lucide-react';

const APP_ID = 'motoescuela-pro-v1';

const formatearFecha = (fechaStr) => {
  if (!fechaStr) return '—';
  const [y, m, d] = fechaStr.split('-');
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return `${parseInt(d)} ${meses[parseInt(m)-1]} ${y}`;
};

export function PackDetalleEstudiante() {
  const { packReservaId } = useParams();
  const navigate = useNavigate();
  const ctx = useContext(AppContext);
  const { cursos = [], horarios = [], instructores = [], sedes = [], user, fbUser, logoutUser, notifications = [] } = ctx;

  const [pack, setPack] = useState(null);
  const [childReserva, setChildReserva] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const uid = fbUser?.uid || user?.uid;

  useEffect(() => {
    if (!packReservaId || !uid) { setCargando(false); return; }
    let activo = true;
    const cargar = async () => {
      try {
        const ref = doc(db, 'artifacts', APP_ID, 'public', 'data', 'reservasPack', packReservaId);
        const snap = await getDoc(ref);
        if (!activo) return;
        if (!snap.exists()) {
          setError('Pack no encontrado.');
          setCargando(false);
          return;
        }
        const data = { id: snap.id, ...snap.data() };
        if (String(data.userId) !== String(uid)) {
          setError('No tienes acceso a este pack.');
          setCargando(false);
          return;
        }
        setPack(data);

             // Cargar la child del curso ACTUAL (por índice cursoActual)
        const subActiva = (data.subReservas || [])[data.cursoActual];
        if (subActiva?.reservaId) {
          const childRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'reservas', subActiva.reservaId);
          const childSnap = await getDoc(childRef);
          if (activo && childSnap.exists()) {
            setChildReserva({ id: childSnap.id, ...childSnap.data() });
          }
        }
        setCargando(false);
      } catch (err) {
        console.error('[PackDetalleEstudiante] Error:', err);
        if (activo) {
          setError('No se pudo cargar el pack.');
          setCargando(false);
        }
      }
    };
    cargar();
    return () => { activo = false; };
  }, [packReservaId, uid]);

  const handleLogout = async () => {
    if (logoutUser) await logoutUser();
    navigate('/');
  };

  const header = <DashboardHeader nombre={pack?.packNombre || 'Mi Pack'} role="estudiante" onBack={() => navigate('/portal-reservas')} onLogout={handleLogout} notifications={notifications} />;
  const footerTabs = [
    { id: 'miCurso', icon: BookOpen, label: 'Mi Sesión', action: () => navigate('/portal-reservas') },
    { id: 'cursos', icon: Compass, label: 'Sesiones', action: () => navigate('/portal-reservas?tab=cursos') },
    { id: 'recursos', icon: Library, label: 'Recursos', action: () => navigate('/portal-reservas') },
    { id: 'perfil', icon: Settings, label: 'Perfil', action: () => navigate('/portal-reservas') }
  ];
  const footer = <DashboardFooter tabs={footerTabs} activeTab="miCurso" onTabChange={(id) => {
    const t = footerTabs.find(x => x.id === id);
    if (t?.action) t.action();
  }} />;

  if (cargando) {
    return (
      <AppShell header={header} footer={footer} bgColor="bg-gray-50">
        <div className="flex items-center justify-center min-h-full">
          <Spinner message="Cargando pack..." />
        </div>
      </AppShell>
    );
  }

  if (error || !pack) {
    return (
      <AppShell header={header} footer={footer} bgColor="bg-gray-50">
        <div className="flex flex-col items-center justify-center p-6 text-center">
          <Package size={48} className="text-gray-300 mb-4" />
          <p className="text-sm text-gray-500 mb-4">{error || 'Pack no encontrado.'}</p>
          <button onClick={() => navigate('/portal-reservas')} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm">
            Volver
          </button>
        </div>
      </AppShell>
    );
  }

  const subReservas = pack.subReservas || [];
  const totalCursos = subReservas.length;
  const completados = subReservas.filter(s => s.estado === 'completado').length;
  const activoIdx = subReservas.findIndex(s => s.estado === 'activo');
  const cursoActivo = activoIdx >= 0 ? subReservas[activoIdx] : null;
  const cursoActivoInfo = cursoActivo ? (cursos || []).find(c => String(c.id) === String(cursoActivo.cursoId)) : null;
  const horario = childReserva ? (horarios || []).find(h => String(h.id) === String(childReserva.horaId)) : null;
  const sede = childReserva ? (sedes || []).find(s => String(s.id) === String(childReserva.sedeId)) : null;
  const instructor = childReserva ? (instructores || []).find(i => String(i.id) === String(childReserva.instructorId)) : null;
const pagoAprobado = pack.estadoPago === 'Aprobado';
  const estadoPago = pack.estadoPago || 'Pendiente';
const estadoBadgeClass = {
  Aprobado: 'bg-green-400/90 text-green-900',
  Pendiente: 'bg-yellow-400/90 text-yellow-900',
  Rechazado: 'bg-red-400/90 text-red-900',
  Cancelado: 'bg-gray-400/90 text-gray-900',
}[estadoPago] || 'bg-gray-400/90 text-gray-900';
  const vencimientoMs = pack.vencimiento?.toMillis?.() || 0;
  const ahora = Date.now();
  const diasRestantes = vencimientoMs > 0 ? Math.max(0, Math.ceil((vencimientoMs - ahora) / (1000 * 60 * 60 * 24))) : null;

  return (
    <AppShell header={header} footer={footer} bgColor="bg-gray-50">
      <div className="p-4 space-y-4">

        {/* Resumen del pack */}
        <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-3xl shadow-xl overflow-hidden text-white">
          <div className="p-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-2 min-w-0">
                <Package size={26} className="flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Mi Pack</p>
                  <h2 className="text-xl font-black truncate">{pack.packNombre || 'Pack'}</h2>
                </div>
              </div>
              <span className={`text-[10px] font-black uppercase px-2 py-1 rounded flex-shrink-0 ${estadoBadgeClass}`}>
  {estadoPago}
</span>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="opacity-90">Progreso</span>
                <span className="font-black">{completados}/{totalCursos}</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2.5 overflow-hidden">
                <div
                  className="h-2.5 rounded-full bg-white transition-all duration-500"
                  style={{ width: totalCursos > 0 ? `${(completados / totalCursos) * 100}%` : '0%' }}
                />
              </div>
            </div>

            {diasRestantes !== null && (
              <div className="flex items-center gap-1.5 text-[11px] opacity-90">
                <Clock size={12} />
                <span>
                  {diasRestantes > 0
                    ? `Vigencia: ${diasRestantes} ${diasRestantes === 1 ? 'día' : 'días'} restantes`
                    : 'Pack vencido'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Cursos del pack */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider mb-3">
            Sesiones incluidas
          </h3>
          <div className="space-y-2">
                     {subReservas.map((sub, idx) => {
              const esActivo = sub.estado === 'activo';
              const esCompletado = sub.estado === 'completado';
              const esBloqueado = sub.estado === 'bloqueado';
              const esAgendado = esActivo && !!sub.reservaId;
              const etiquetaEstado = esCompletado ? 'Completado'
                : esActivo ? (esAgendado ? 'En Progreso' : 'Disponible')
                : 'Bloqueado';
              const cursoInfo = (cursos || []).find(c => String(c.id) === String(sub.cursoId));
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-3 p-3 rounded-xl border ${
                    esCompletado ? 'bg-green-50 border-green-200'
                    : esActivo ? 'bg-purple-50 border-purple-300'
                    : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    esCompletado ? 'bg-green-500 text-white'
                    : esActivo ? 'bg-purple-600 text-white'
                    : 'bg-gray-300 text-gray-500'
                  }`}>
                    {esCompletado ? <Check size={16} strokeWidth={3} />
                     : esActivo ? <BookOpen size={16} />
                     : <Lock size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold truncate ${
                      esBloqueado ? 'text-gray-500' : 'text-gray-900'
                    }`}>
                      {sub.cursoNombre || cursoInfo?.nombre || 'Sesión'}
                    </p>
                                       <p className={`text-[10px] uppercase font-bold ${
                      esCompletado ? 'text-green-600'
                      : esActivo ? 'text-purple-600'
                      : 'text-gray-400'
                    }`}>
                      {etiquetaEstado}
                    </p>
                  </div>
                  {idx < subReservas.length - 1 && (
                    <span className="text-gray-300 text-xs">→</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

                {/* Curso actual o próximo pendiente */}
        {cursoActivo && cursoActivoInfo && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider mb-3">
              {childReserva ? 'Sesión actual' : 'Próxima sesión'}
            </h3>
            <div className="flex items-center gap-2 mb-3">
              <BookOpen size={18} className="text-purple-600" />
              <p className="font-bold text-gray-900">{cursoActivoInfo.nombre}</p>
            </div>

            {childReserva ? (
              <>
                <div className="space-y-2 text-[12px] text-gray-600">
                                   <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-gray-400" />
                    <span>
                      {formatearFecha(childReserva.fecha)}
                      {childReserva.fecha2 ? ` – ${formatearFecha(childReserva.fecha2)}` : ''}
                    </span>
                  </div>
                  {horario?.label && (
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-gray-400" />
                      <span>{horario.label}</span>
                    </div>
                  )}
                  {sede?.nombre && (
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-gray-400" />
                      <span>{sede.nombre}</span>
                    </div>
                  )}
                  {instructor && (
                    <div className="flex items-center gap-2">
                      <User size={14} className="text-gray-400" />
                      <span>Tutor: {instructor.nombre} {instructor.apellido || ''}</span>
                    </div>
                  )}
                  {childReserva.tipoMoto && (
                    <div className="flex items-center gap-2">
                      <Bike size={14} className="text-gray-400" />
                      <span>{childReserva.tipoMoto} · {childReserva.traeMoto === 'Sí' ? 'Moto propia' : 'Moto de Moto App'}</span>
                    </div>
                  )}
                </div>
                {pagoAprobado && (
                  <button
                    onClick={() => navigate(`/aula/${childReserva.id}`)}
                    className="mt-4 w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                  >
                    <Award size={18} />
                    Entrar al Panel de Sesiones
                  </button>
                )}
              </>
                       ) : (
              <div className="space-y-3">
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 flex items-start gap-2">
                  <Clock size={16} className="text-purple-600 flex-shrink-0 mt-0.5" />
                  <div className="text-[12px] text-purple-900">
                    <p className="font-bold">Pendiente de agendar</p>
                    <p className="opacity-90">Elegí fecha y hora para tu próxima sesión.</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/mi-pack/${pack.id}/agendar`)}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                >
                  <Calendar size={18} />
                  Agendar fecha
                </button>
              </div>
            )}
          </div>
        )}
        {/* Cómo funciona */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <div className="flex items-start gap-2">
            <Info size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-[12px] text-blue-900 space-y-1.5">
              <p className="font-bold">¿Cómo funciona tu pack?</p>
              <p>Las sesiones se completan en orden. Al terminar una, se habilita la siguiente para agendar.</p>
              <p>Las sesiones bloqueadas se desbloquearán automáticamente cuando completes la anterior.</p>
            </div>
          </div>
        </div>

      </div>
    </AppShell>
  );
}

export default PackDetalleEstudiante;
