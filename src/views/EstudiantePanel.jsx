// @build: 2026-06-20.03-00-00 | id: ESTUDIANTE-RESTAURADO | desc: Tick local, redirección al Aula, lista de cursos, detalle completado, barras de progreso, banner de pausa
import { useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContextValue';
import { Button, Spinner } from '../components/UI';
import { useToast } from '../modules/shared/components/ToastProvider';
import AppShell from '../modules/shared/components/AppShell';
import DashboardHeader from '../modules/shared/components/DashboardHeader';
import DashboardFooter from '../modules/shared/components/DashboardFooter';
import RelojSesion from '../modules/shared/components/RelojSesion';
import FilaTiempo from '../modules/shared/components/FilaTiempo';
import BannerPausa from '../modules/shared/components/BannerPausa';
import ModuloItem from '../modules/shared/components/ModuloItem';
import CarruselModulos from '../modules/shared/components/CarruselModulos';
import {
  Calendar, Clock, MapPin, Bike, BookOpen, Award, Compass, Library, FileText, Settings,
  User, Lock, Check, AlertCircle, RefreshCw, ChevronLeft, Share2
} from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const MESES_CORTOS = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];

const formatearRangoCorto = (f1, f2) => {
  if (!f1 || !f2) return '';
  const [a1, m1, d1] = f1.split('-');
  const [a2, m2, d2] = f2.split('-');
  const fecha1 = new Date(a1, parseInt(m1)-1, d1);
  const fecha2 = new Date(a2, parseInt(m2)-1, d2);
  const dia1 = DIAS_SEMANA[fecha1.getDay()].substring(0, 3) + ' ' + parseInt(d1);
  const dia2 = DIAS_SEMANA[fecha2.getDay()].substring(0, 3) + ' ' + parseInt(d2);
  return dia1 + ' - ' + dia2;
};

const obtenerMesCortoYAnio = (fechaStr) => {
  if (!fechaStr) return { mes: '', anio: '' };
  const partes = fechaStr.split('-');
  if (partes.length !== 3) return { mes: '', anio: '' };
  return { mes: MESES_CORTOS[parseInt(partes[1])-1] || '', anio: partes[0] || '' };
};

const formatoTiempo = (segundos) => {
  const s = Number(segundos) || 0;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

export function EstudiantePanel() {
  const { reservas, cursos, horarios, instructores, sedes, user, fbUser, saveReserva, logoutUser } = useContext(AppContext);
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [tab, setTab] = useState('miCurso');
  const [isSearching, setIsSearching] = useState(true);
  const [localReserva, setLocalReserva] = useState(null);
  const [cursoDirecto, setCursoDirecto] = useState(null);
  const [busquedaCursoFallida, setBusquedaCursoFallida] = useState(false);
  const [conexionPerdida, setConexionPerdida] = useState(false);
  const [cursoDetalle, setCursoDetalle] = useState(null);

  // Tick local para animar el reloj (igual que antes)
  const [tick, setTick] = useState(0);
  useEffect(() => { const interval = setInterval(() => setTick(t => t + 1), 1000); return () => clearInterval(interval); }, []);

  if (!user || user.role !== 'estudiante') { navigate('/portal', { replace: true }); return null; }
  const uid = fbUser?.uid || user?.uid;

  const reservaContext = reservas.find(r => {
    if (String(r.userId) !== String(uid)) return false;
    if (r.estadoPago === 'Aprobado' || r.estadoPago === 'Pendiente') return true;
    if (r.estadoPago === 'Rechazado') { if (r.expiraEn) return Date.now() < Number(r.expiraEn); if (r.rechazadoEn) return (Date.now() - r.rechazadoEn) / 60000 < 20; }
    return false;
  });

  useEffect(() => {
    if (!uid) { setIsSearching(false); return; }
    if (reservaContext) { setIsSearching(false); return; }
    const obtenerReserva = async () => {
      try {
        const reservasRef = collection(db, 'artifacts', 'motoescuela-pro-v1', 'public', 'data', 'reservas');
        const q = query(reservasRef, where('userId', '==', String(uid)));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) { const docData = snapshot.docs[0].data(); setLocalReserva({ id: snapshot.docs[0].id, ...docData }); }
      } catch (e) { console.error('Error buscando reserva:', e); } finally { setIsSearching(false); }
    };
    obtenerReserva();
  }, [uid, reservaContext]);

  const buscarCurso = useCallback(async () => {
    const reserva = reservaContext || localReserva;
    if (!reserva || !reserva.cursoId) { setBusquedaCursoFallida(true); return; }
    setBusquedaCursoFallida(false);
    try {
      const cursoRef = doc(db, 'artifacts', 'motoescuela-pro-v1', 'public', 'data', 'cursos', String(reserva.cursoId));
      const cursoSnap = await getDoc(cursoRef);
      if (cursoSnap.exists()) { setCursoDirecto({ id: cursoSnap.id, ...cursoSnap.data() }); } else { setCursoDirecto(null); setBusquedaCursoFallida(true); }
    } catch (e) { setCursoDirecto(null); setBusquedaCursoFallida(true); }
  }, [reservaContext, localReserva]);

  useEffect(() => { buscarCurso(); }, [buscarCurso]);

  const handleLogout = useCallback(async () => { if (logoutUser) await logoutUser(); navigate('/'); }, [logoutUser, navigate]);

  const compartirCurso = () => {
    const texto = `¡Completé el curso "${cursoDetalle?.cursoNombre || 'MotoEscuela'}" en MotoEscuela App! 🏍️`;
    if (navigator.share) navigator.share({ title: 'MotoEscuela App', text: texto, url: window.location.origin }).catch(() => {});
    else { navigator.clipboard.writeText(texto).then(() => showToast('Enlace copiado', 'success')); }
  };

  if (isSearching) return <AppShell bgColor="bg-gray-50"><div className="flex items-center justify-center min-h-full"><Spinner message="Cargando tus datos..." /></div></AppShell>;

  const reservaActual = reservaContext || localReserva;
  const header = <DashboardHeader nombre={reservaActual?.nombre} role="estudiante" onLogout={handleLogout} />;
  const footer = <DashboardFooter
    tabs={[{ id: 'miCurso', icon: BookOpen, label: 'Mi Curso' }, { id: 'cursos', icon: Compass, label: 'Cursos' }, { id: 'recursos', icon: Library, label: 'Recursos' }, { id: 'evaluaciones', icon: FileText, label: 'Eval.' }, { id: 'perfil', icon: Settings, label: 'Perfil' }]}
    activeTab={tab} onTabChange={(t) => { setTab(t); setCursoDetalle(null); }}
  />;

  if (!reservaActual && tab === 'miCurso') {
    return <AppShell header={header} footer={footer} bgColor="bg-gray-50"><div className="flex flex-col items-center justify-center min-h-full p-6"><Award size={48} className="text-gray-400 mb-4" /><h2 className="text-xl font-black text-gray-900 mb-2">Sin reservas activas</h2><Button onClick={handleLogout} variant="outline">Volver al inicio</Button></div></AppShell>;
  }

  const cursoAsignado = cursoDirecto || cursos.find(c => String(c.id) === String(reservaActual?.cursoId)) || { nombre: '', modulos: [], duracionTotal: 240 };
  const hor = horarios.find(h => String(h.id) === String(reservaActual?.horaId));
  const inst = instructores.find(i => String(i.id) === String(reservaActual?.instructorId));
  const sedeActual = sedes.find(s => String(s.id) === String(reservaActual?.sedeId));
  const cantCompletados = Object.keys(reservaActual?.modulosEstado || {}).filter(k => (reservaActual?.modulosEstado || {})[k]?.fecha).length;
  const totalModulos = cursoAsignado.modulos.length;
  const modulosFaltantes = totalModulos - cantCompletados;
  const horaInicio = hor?.label ? hor.label.split('-')[0]?.trim() : '--:--';
  const horaFin = hor?.label ? hor.label.split('-')[1]?.trim() : '--:--';
  const sello = obtenerMesCortoYAnio(reservaActual?.fecha);
  const pagoAprobado = reservaActual?.estadoPago === 'Aprobado';
  const pausaActiva = reservaActual?.pausaActiva;
  const pausaEsHoy = pausaActiva?.inicio && new Date(pausaActiva.inicio).toISOString().split('T')[0] === new Date().toISOString().split('T')[0];
  const tiempoMaximoCurso = cursoAsignado.duracionTotal || 240;
  const tiempoConsumido = Object.values(reservaActual?.modulosEstado || {}).reduce((acc, mod) => acc + (mod.duracion || 0) + (mod.duracionExtra || 0), 0);
  const moduloEnProgreso = reservaActual?.moduloEnProgreso;
  const pausas = reservaActual?.pausas || [];

  // Cálculos de tiempo (actualizados con el tick)
  const generalSegundos = (moduloEnProgreso?.inicio && pausaEsHoy) 
    ? Math.max(0, Math.floor((Date.now() - moduloEnProgreso.inicio) / 1000) - (pausaActiva ? Math.floor((Date.now() - pausaActiva.inicio) / 1000) : 0))
    : 0;
  const pausaTotal = pausas.reduce((acc, p) => acc + (p.duracion || 0) * 60, 0) + (pausaActiva && pausaEsHoy ? Math.floor((Date.now() - pausaActiva.inicio) / 1000) : 0);

  // Ir al Aula Virtual
  const irAlAula = () => {
    if (reservaActual?.id) navigate(`/aula/${reservaActual.id}`);
  };

  // Vista Mi Curso
  const VistaMiCurso = () => (
    <div className="space-y-3">
      <div className="rounded-xl shadow-xl shadow-blue-600/20 overflow-hidden">
        <div className="bg-blue-600 text-white p-3 relative">
          <div className="flex items-center gap-2 mb-2"><Bike size={18} className="text-blue-200" /><p className="text-sm font-bold uppercase tracking-widest flex-1">{cursoAsignado.nombre || 'Curso'}</p></div>
          <div className="grid grid-cols-2 gap-2 text-sm mb-2"><div className="flex items-center gap-1.5"><MapPin size={14} className="text-blue-300" /><span className="font-bold">Sede: {sedeActual?.nombre || 'N/A'}</span></div><div className="flex items-center gap-1.5"><User size={14} className="text-blue-300" /><span className="font-bold truncate">Inst: {inst ? inst.nombre : 'Asignando'}</span></div></div>
          <div className="absolute top-2 right-2 bg-white/20 rounded-lg px-2 py-1 text-center"><p className="text-lg font-black leading-none">{sello.mes}</p><p className="text-[10px] font-bold leading-none">{sello.anio}</p></div>
          <div className="bg-gray-800/50 p-3 rounded-xl text-xs">
            <div className="flex items-start gap-3">
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2"><Calendar size={12} className="text-blue-300" /><span className="font-bold">Días: {formatearRangoCorto(reservaActual.fecha, reservaActual.fecha2)}</span></div>
                <div className="flex items-center gap-2"><Clock size={12} className="text-blue-300" /><span className="font-bold">Hora: {horaInicio} - {horaFin}</span></div>
                <div className="flex items-center gap-2"><Bike size={12} className="text-blue-300" /><span className="font-bold">{reservaActual.traeMoto === 'Sí' ? 'Propia' : 'Escuela'} · {reservaActual.tipoMoto}</span></div>
                <FilaTiempo diaActual={1} generalSegundos={generalSegundos} pausaTotal={pausaTotal} tiempoExtra={0} />
              </div>
              <RelojSesion generalSegundos={generalSegundos} pausaActiva={pausaActiva && pausaEsHoy ? pausaActiva : null} pausaMotivo={pausaActiva?.motivo} tiempoMaximoCurso={tiempoMaximoCurso} tiempoConsumido={tiempoConsumido} conexionPerdida={conexionPerdida} />
            </div>
          </div>
          {pausaActiva && pausaEsHoy && <BannerPausa motivo={pausaActiva.motivo} tiempo={Math.floor((Date.now() - pausaActiva.inicio) / 1000)} soloLectura />}
          {!pausaActiva && pagoAprobado && (
            <div className="bg-gray-100 -mx-3 -mb-3 px-3 py-2.5 mt-2 border-t border-blue-400/30">
              <div className="flex items-center justify-between mb-1"><span className="text-xs text-gray-700">Avance Académico</span><span className="text-xs font-bold text-gray-700">{cantCompletados}/{totalModulos}</span></div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden"><div className="h-2 rounded-full transition-all duration-500" style={{ width: totalModulos > 0 ? `${(cantCompletados / totalModulos) * 100}%` : '0%', background: 'repeating-linear-gradient(-45deg, #4ade80, #4ade80 6px, #22c55e 6px, #22c55e 12px)', animation: 'progress-stripes 1s linear infinite' }}></div></div>
              {modulosFaltantes > 0 && <p className="text-[10px] text-gray-500 mt-2 text-center">Te {modulosFaltantes === 1 ? 'falta' : 'faltan'} {modulosFaltantes} {modulosFaltantes === 1 ? 'módulo' : 'módulos'} para tu certificado</p>}
            </div>
          )}
          {!pausaActiva && !pagoAprobado && (
            <div className={`-mx-3 -mb-3 px-3 py-2.5 mt-2 border-t border-blue-400/30 ${reservaActual.estadoPago === 'Rechazado' ? 'bg-red-50' : 'bg-orange-50'}`}>
              <div className="flex items-center gap-2">{reservaActual.estadoPago === 'Rechazado' ? (<AlertCircle size={14} className="text-red-600" />) : (<Clock size={14} className="text-orange-600" />)}<div className="flex-1"><p className={`text-xs font-bold ${reservaActual.estadoPago === 'Rechazado' ? 'text-red-700' : 'text-orange-700'}`}>{reservaActual.estadoPago === 'Rechazado' ? 'Pago Rechazado' : 'Pago Pendiente'}</p><p className="text-[10px] text-gray-600">{reservaActual.estadoPago === 'Rechazado' ? 'La referencia no coincide. Corrígela para continuar.' : 'Ref: ' + reservaActual.pagoRef + ' · Estamos validando tu pago'}</p></div>{reservaActual.estadoPago === 'Rechazado' && (<div className="flex gap-1"><input type="number" placeholder="Ref" className="w-14 p-1 rounded-lg border border-red-200 text-xs outline-none bg-white font-bold text-center" id="nuevaRef" maxLength="4" /><Button type="button" variant="dark" className="!py-1 !px-2 !text-[10px]" onClick={async () => { const ref = document.getElementById('nuevaRef')?.value; if (!ref || ref.length !== 4) return showToast('Debe tener 4 dígitos', 'error'); await saveReserva({ ...reservaActual, pagoRef: ref, estadoPago: 'Pendiente' }); showToast('Referencia enviada', 'success'); }}>OK</Button></div>)}</div>
            </div>
          )}
        </div>
      </div>
      {/* Botón para ir al Aula Virtual */}
      <Button type="button" onClick={irAlAula} variant="primary" className="mt-2" icon={BookOpen}>Ir al Aula Virtual</Button>
      {/* Carrusel de completados y zona activa */}
      <CarruselModulos modulos={cursoAsignado.modulos.filter(m => (reservaActual?.modulosEstado||{})[m]?.fecha).map(m => ({ nombre: m }))} />
      <div className="space-y-1.5">
        {cursoAsignado.modulos.filter(m => !(reservaActual?.modulosEstado||{})[m]?.fecha).map((mod, i) => {
          const esModuloActivo = moduloEnProgreso?.modulo === mod;
          return <ModuloItem key={i} nombre={mod} estado={esModuloActivo ? 'activo' : 'pendiente'} disabled mostrarBarra={esModuloActivo} progreso={esModuloActivo ? Math.min(100, (generalSegundos / 3600) * 100) : 0} tiempoActual={esModuloActivo ? generalSegundos : 0} />;
        })}
      </div>
    </div>
  );

  // Vista Cursos (lista + detalle)
  const misReservas = (reservas || []).filter(r => String(r.userId) === String(uid));
  const cursosCompletados = misReservas.filter(r => r.estadoCurso === 'Aprobado');
  const cursoActivo = reservaActual && reservaActual.estadoCurso !== 'Aprobado' ? reservaActual : null;

  const VistaCursos = () => {
    if (cursoDetalle) {
      const cur = cursoDetalle.cursoInfo || { nombre: '', modulos: [], duracionTotal: 240 };
      const comp = Object.keys(cursoDetalle.reserva.modulosEstado || {}).filter(k => (cursoDetalle.reserva.modulosEstado || {})[k]?.fecha).length;
      const total = cur.modulos.length;
      const tiempoCon = Object.values(cursoDetalle.reserva.modulosEstado || {}).reduce((acc, mod) => acc + (mod.duracion || 0), 0);
      const selloCurso = obtenerMesCortoYAnio(cursoDetalle.reserva.fecha);
      return (
        <div className="space-y-3">
          <div className="rounded-xl shadow-xl shadow-blue-600/20 overflow-hidden">
            <div className="bg-blue-600 text-white p-3 relative">
              <div className="flex items-center gap-2 mb-2"><Bike size={18} className="text-blue-200" /><p className="text-sm font-bold uppercase tracking-widest flex-1">{cur.nombre || 'Curso'}</p></div>
              <div className="absolute top-2 right-2 bg-white/20 rounded-lg px-2 py-1 text-center"><p className="text-lg font-black leading-none">{selloCurso.mes}</p><p className="text-[10px] font-bold leading-none">{selloCurso.anio}</p></div>
              <div className="bg-gray-100 -mx-3 -mb-3 px-3 py-2.5 mt-2 border-t border-blue-400/30">
                <div className="flex items-center justify-between mb-1"><span className="text-xs text-gray-700">Avance Académico</span><span className="text-xs font-bold text-blue-600">{comp}/{total}</span></div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden"><div className="h-2 rounded-full transition-all duration-500" style={{ width: total > 0 ? `${(comp / total) * 100}%` : '0%', background: 'repeating-linear-gradient(-45deg, #4ade80, #4ade80 6px, #22c55e 6px, #22c55e 12px)', animation: 'progress-stripes 1s linear infinite' }}></div></div>
                {tiempoCon > 0 && <p className="text-[10px] text-gray-500 mt-2 text-center">Tiempo total: {tiempoCon} min</p>}
              </div>
            </div>
          </div>
          {cur.modulos.map((mod, i) => {
            const nombreMod = typeof mod === 'string' ? mod : mod.nombre;
            const completado = (cursoDetalle.reserva.modulosEstado || {})[nombreMod];
            return (
              <div key={i} className={`bg-white p-3 rounded-xl shadow-sm border flex items-center gap-2 ${completado?.fecha ? 'border-green-200 bg-green-50' : 'border-gray-100'}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${completado?.fecha ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-300'}`}>{completado?.fecha ? <Check size={12} strokeWidth={3} /> : <Clock size={12} />}</div>
                <div className="flex-1"><span className={`font-bold text-xs ${completado?.fecha ? 'text-green-900' : 'text-gray-800'}`}>{nombreMod}</span>{completado?.fecha && <p className="text-[10px] font-bold text-green-700">{completado.fecha} · {completado.duracion || 0} min</p>}</div>
                <span className={`text-[10px] font-black uppercase ${completado?.fecha ? 'text-green-600' : 'text-gray-400'}`}>{completado?.fecha ? 'Superado' : 'Pendiente'}</span>
              </div>
            );
          })}
          <Button variant="primary" className="mt-3" icon={Share2} onClick={compartirCurso}>Compartir</Button>
        </div>
      );
    }
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-black text-gray-900 uppercase tracking-widest">Mis Cursos</h2>
        {cursoActivo && (
          <button onClick={irAlAula} className="w-full bg-white p-4 rounded-xl shadow-sm border border-blue-200 text-left hover:border-blue-300 transition-colors">
            <div className="flex items-center gap-3"><BookOpen size={20} className="text-blue-600" /><div className="flex-1"><p className="font-bold text-sm text-gray-900">{cursoAsignado.nombre || 'Curso'} · En Progreso</p><p className="text-xs text-gray-500">{cantCompletados}/{totalModulos} módulos</p></div><ChevronLeft size={16} className="text-gray-400 rotate-180" /></div>
          </button>
        )}
        {cursosCompletados.length === 0 && !cursoActivo && <p className="text-sm text-gray-500 text-center py-4">No tienes cursos aún.</p>}
        {cursosCompletados.map(r => {
          const cur = cursos.find(c => String(c.id) === String(r.cursoId)) || { nombre: '', modulos: [], duracionTotal: 240 };
          const comp = Object.keys(r.modulosEstado || {}).length;
          const total = cur.modulos.length;
          const tiempo = Object.values(r.modulosEstado || {}).reduce((acc, mod) => acc + (mod.duracion || 0), 0);
          return (
            <button key={r.id} onClick={() => setCursoDetalle({ reserva: r, cursoInfo: cur, esCompletado: true })} className="w-full bg-white p-4 rounded-xl shadow-sm border border-green-200 text-left hover:border-green-300 transition-colors">
              <div className="flex items-center gap-3"><Award size={20} className="text-green-600" /><div className="flex-1"><p className="font-bold text-sm text-gray-900">{cur.nombre || 'Curso'} · Completado</p><p className="text-xs text-gray-500">✅ {comp}/{total} módulos · {tiempo} min</p></div><ChevronLeft size={16} className="text-gray-400 rotate-180" /></div>
            </button>
          );
        })}
      </div>
    );
  };

  const Placeholder = ({ icon: Icon, titulo, descripcion }) => (<div className="flex flex-col items-center justify-center min-h-full p-6 text-center"><div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4"><Icon size={32} className="text-gray-400" /></div><h2 className="text-lg font-black text-gray-900 mb-2">{titulo}</h2><p className="text-sm text-gray-500">{descripcion}</p></div>);

  const VistaPerfil = () => (<div className="space-y-4"><h2 className="text-lg font-black text-gray-900 uppercase tracking-widest">Mi Perfil</h2><div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-3"><div><p className="text-xs text-gray-500">Nombre</p><p className="font-bold text-gray-900">{reservaActual?.nombre} {reservaActual?.apellido}</p></div><div><p className="text-xs text-gray-500">Cédula</p><p className="font-bold text-gray-900">{reservaActual?.cedula}</p></div><div><p className="text-xs text-gray-500">Teléfono</p><p className="font-bold text-gray-900">{reservaActual?.telefono || 'No registrado'}</p></div><div><p className="text-xs text-gray-500">Curso Actual</p><p className="font-bold text-gray-900">{cursoAsignado.nombre || 'No asignado'}</p></div><div><p className="text-xs text-gray-500">Sede</p><p className="font-bold text-gray-900">{sedeActual?.nombre || 'No asignada'}</p></div></div></div>);

  return (
    <AppShell header={header} footer={footer}>
      <div className="p-4 space-y-4">
        {tab === 'miCurso' && <VistaMiCurso />}
        {tab === 'cursos' && <VistaCursos />}
        {tab === 'recursos' && <Placeholder icon={Library} titulo="Recursos" descripcion="Leyes de tránsito, señales, documentales y más." />}
        {tab === 'evaluaciones' && <Placeholder icon={FileText} titulo="Evaluaciones" descripcion="Pruebas teóricas para medir tu conocimiento." />}
        {tab === 'perfil' && <VistaPerfil />}
      </div>
    </AppShell>
  );
}

export default EstudiantePanel;
