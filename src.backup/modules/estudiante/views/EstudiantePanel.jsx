import { useContext, useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebase';
import { AppContext } from '../../../context/AppContextValue';
import { ReservaService } from '../../inscripcion/services/ReservaService';
import { AuthService } from '../../../services/AuthService';
import { CursoService } from '../../shared/services/CursoService';
import { Button, Spinner } from '../../../components/UI';
import { useToast } from '../../shared/components/ToastProvider';
import AppShell from '../../shared/components/AppShell';
import DashboardHeader from '../../shared/components/DashboardHeader';
import DashboardFooter from '../../shared/components/DashboardFooter';
import {
  Calendar, Clock, MapPin, Bike, BookOpen, Award, Compass, Library, FileText, Settings,
  User, AlertCircle, ChevronLeft, Share2, Zap, Lock, Check, KeyRound
} from 'lucide-react';

const APP_ID = 'motoescuela-pro-v1';

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
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

const CorreccionReferencia = memo(({ onGuardar, enviando }) => {
  const [valor, setValor] = useState('');
  
  const handleChange = (e) => {
    setValor(e.target.value.replace(/\D/g, '').slice(0, 4));
  };
  
  const handleGuardar = () => {
    const refLimpia = valor.replace(/\D/g, '').slice(0, 4);
    onGuardar(refLimpia);
    setValor('');
  };
  
  const valido = valor.replace(/\D/g, '').length === 4;
  
  return (
    <div className="flex gap-2">
      <input
        type="tel"
        value={valor}
        onChange={handleChange}
        placeholder="Ej: 8452"
        inputMode="numeric"
        pattern="\d{4}"
        maxLength={4}
        className="flex-1 bg-white border-2 border-red-200 focus:border-blue-500 rounded-xl py-2 px-3 text-sm outline-none"
      />
      <Button
        type="button"
        onClick={handleGuardar}
        variant="primary"
        className="!w-auto !py-2 !px-4 !text-xs"
        icon={Check}
        disabled={!valido || enviando}
      >
        {enviando ? 'Enviando...' : 'Enviar'}
      </Button>
    </div>
  );
});

export function EstudiantePanel() {
  const ctx = useContext(AppContext);
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [tab, setTab] = useState('miCurso');
  const [cursoDirecto, setCursoDirecto] = useState(null);
  const [busquedaCursoFallida, setBusquedaCursoFallida] = useState(false);
  const [cursoDetalle, setCursoDetalle] = useState(null);
  const [enviandoCorreccion, setEnviandoCorreccion] = useState(false);
  
  const [reservaRealTime, setReservaRealTime] = useState(null);
  const [isSearching, setIsSearching] = useState(true);
  
  const estadoPagoAnteriorRef = useRef(null);

  const {
    reservas = [], cursos = [], horarios = [], instructores = [], sedes = [],
    user, fbUser, logoutUser, notifications = []
  } = ctx;

  const uid = fbUser?.uid || user?.uid;

  useEffect(() => {
    if (!uid) {
      setIsSearching(false);
      return;
    }
    
    const reservasRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'reservas');
    const q = query(reservasRef, where('userId', '==', String(uid)));
    
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const orden = { 'Aprobado': 0, 'Pendiente': 1, 'Rechazado': 2, 'Cancelado': 3 };
        docs.sort((a, b) => (orden[a.estadoPago] || 99) - (orden[b.estadoPago] || 99));
        const mejorReserva = docs[0] || null;
        setReservaRealTime(mejorReserva);
      } else {
        setReservaRealTime(null);
      }
      setIsSearching(false);
    }, (err) => {
      setIsSearching(false);
    });
    
    return () => unsub();
  }, [uid]);

  useEffect(() => {
    if (!reservaRealTime) return;
    const estadoActual = reservaRealTime.estadoPago;
    const estadoAnterior = estadoPagoAnteriorRef.current;
    
    if (estadoAnterior && estadoAnterior !== estadoActual) {
      if (estadoActual === 'Rechazado') {
        showToast('Tu pago ha sido rechazado. Corrige la referencia.', 'error');
      } else if (estadoActual === 'Aprobado') {
        showToast('¡Pago aprobado! Ya puedes entrar al Aula Virtual.', 'success');
      } else if (estadoActual === 'Pendiente') {
        showToast('Referencia enviada. Espera la validación.', 'info');
      }
    }
    
    estadoPagoAnteriorRef.current = estadoActual;
  }, [reservaRealTime?.estadoPago, showToast]);

  const reservaContext = useMemo(() => reservas.find(r => {
    if (String(r.userId) !== String(uid)) return false;
    if (r.estadoPago === 'Aprobado' || r.estadoPago === 'Pendiente') return true;
    if (r.estadoPago === 'Rechazado') {
      if (r.rechazadoEn) return (Date.now() - r.rechazadoEn) / 60000 < 20;
      return true;
    }
    return false;
  }), [reservas, uid]);

  const buscarCurso = useCallback(async () => {
    const r = reservaRealTime || reservaContext;
    if (!r || !r.cursoId) { setBusquedaCursoFallida(true); return; }
    setBusquedaCursoFallida(false);
    try {
      const result = await CursoService.obtenerCurso(r.cursoId);
      if (result.success && result.data) {
        setCursoDirecto(result.data);
      } else {
        setCursoDirecto(null);
        setBusquedaCursoFallida(true);
      }
    } catch (e) {
      setCursoDirecto(null);
      setBusquedaCursoFallida(true);
    }
  }, [reservaRealTime, reservaContext]);

  useEffect(() => { buscarCurso(); }, [buscarCurso]);

  const reservaActual = reservaRealTime || reservaContext;

  const handleLogout = useCallback(async () => { if (logoutUser) await logoutUser(); navigate('/'); }, [logoutUser, navigate]);

  const handleGuardarReferencia = useCallback(async (refLimpia) => {
    if (!reservaActual?.id) return;
    setEnviandoCorreccion(true);
    try {
      const result = await ReservaService.corregirReferenciaPago(reservaActual.id, refLimpia);
      if (!result.success) {
        showToast('Error al enviar: ' + (result.error?.message || 'Intente de nuevo.'), 'error');
      }
    } catch (e) {
      showToast('Error de conexión. Intente de nuevo.', 'error');
    } finally {
      setEnviandoCorreccion(false);
    }
  }, [reservaActual, showToast]);

  const compartirCurso = () => {
    const texto = `¡Completé el curso "${cursoDetalle?.cursoNombre || 'MotoEscuela'}" en MotoEscuela App! 🏍️`;
    if (navigator.share) navigator.share({ title: 'MotoEscuela App', text: texto, url: window.location.origin }).catch(() => {});
    else { navigator.clipboard.writeText(texto).then(() => showToast('Enlace copiado', 'success')); }
  };

  if (isSearching) return <AppShell bgColor="bg-gray-50"><div className="flex items-center justify-center min-h-full"><Spinner message="Cargando tus datos..." /></div></AppShell>;

  const misReservas = (reservas || []).filter(r => String(r.userId) === String(uid));
  const modoCorreccion = reservaActual?.estadoPago === 'Rechazado' && misReservas.every(r => r.estadoPago !== 'Aprobado' && r.estadoCurso !== 'Aprobado');

  const header = <DashboardHeader nombre={reservaActual?.nombre} role="estudiante" onLogout={handleLogout} notifications={notifications} />;
  const footer = <DashboardFooter
    tabs={modoCorreccion
      ? [{ id: 'miCurso', icon: BookOpen, label: 'Mi Curso' }, { id: 'perfil', icon: Settings, label: 'Perfil' }]
      : [{ id: 'miCurso', icon: BookOpen, label: 'Mi Curso' }, { id: 'cursos', icon: Compass, label: 'Cursos' }, { id: 'recursos', icon: Library, label: 'Recursos' }, { id: 'evaluaciones', icon: FileText, label: 'Eval.' }, { id: 'perfil', icon: Settings, label: 'Perfil' }]
    }
    activeTab={tab} onTabChange={(t) => { if (modoCorreccion && t !== 'miCurso' && t !== 'perfil') return; setTab(t); setCursoDetalle(null); }}
  />;

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
  const intentosAgotados = (reservaActual?.intentosCorreccion || 0) >= 3;

  const irAlAula = () => { if (reservaActual?.id) navigate(`/aula/${reservaActual.id}`); };

  const VistaMiCurso = () => {
    if (!reservaActual) {
      return (
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 text-center">
            <Award size={48} className="text-gray-400 mb-4 mx-auto" />
            <h2 className="text-xl font-black text-gray-900 mb-2">Sin reservas activas</h2>
            <p className="text-sm text-gray-500 mb-4">No tienes ninguna reserva activa en este momento.</p>
            <Button onClick={() => navigate('/inscripcion')} variant="primary">Inscribirse</Button>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100"><h3 className="font-bold text-gray-900 text-sm mb-3">📢 Próximos Cursos</h3><p className="text-xs text-gray-500">Próximamente podrás explorar y reservar nuevos cursos.</p></div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100"><h3 className="font-bold text-gray-900 text-sm mb-3">🔧 Servicios</h3><p className="text-xs text-gray-500">Mecánica, motolavado, delivery y más.</p></div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="bg-white rounded-3xl shadow-xl border border-blue-100 overflow-hidden">
          <div className="p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className={`w-2 h-2 rounded-full animate-pulse ${pagoAprobado ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
              <span className={`text-xs font-bold uppercase tracking-widest ${pagoAprobado ? 'text-green-600' : 'text-yellow-600'}`}>
                {pagoAprobado ? 'Sesión Activa' : 'Pago Pendiente'}
              </span>
            </div>
            {pagoAprobado ? (
              <button onClick={irAlAula} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl shadow-xl shadow-blue-600/30 transition-all active:scale-[0.98] flex items-center justify-center gap-3">
                <Bike size={28} className="text-blue-200" />
                <span className="text-xl font-black uppercase tracking-widest">Entrar al Aula Virtual</span>
                <Zap size={24} className="text-yellow-300 animate-pulse" />
              </button>
            ) : (
              <button disabled className="w-full bg-gray-300 text-gray-500 py-5 rounded-2xl shadow-md cursor-not-allowed flex items-center justify-center gap-3">
                <Lock size={28} className="text-gray-400" />
                <span className="text-xl font-black uppercase tracking-widest">Aula Bloqueada</span>
              </button>
            )}
            <div className="mt-4 space-y-1 text-xs text-gray-500">
              <p className="flex items-center justify-center gap-1.5">
                <Calendar size={12} /><span className="font-bold">{formatearRangoCorto(reservaActual.fecha, reservaActual.fecha2)}</span>
                <span className="mx-1">·</span>
                <Clock size={12} /><span className="font-bold">{horaInicio} - {horaFin}</span>
              </p>
              <p className="flex items-center justify-center gap-1.5">
                <MapPin size={12} /><span className="font-bold">{sedeActual?.nombre || 'N/A'}</span>
                <span className="mx-1">·</span>
                <User size={12} /><span className="font-bold">Inst: {inst ? inst.nombre : 'Asignando'}</span>
              </p>
              {pagoAprobado && modulosFaltantes > 0 && <p className="text-[10px] text-blue-600 font-bold mt-2">Te {modulosFaltantes === 1 ? 'falta' : 'faltan'} {modulosFaltantes} {modulosFaltantes === 1 ? 'módulo' : 'módulos'} para tu certificado</p>}
              {!pagoAprobado && reservaActual.estadoPago === 'Pendiente' && <p className="text-[10px] text-yellow-600 font-bold mt-2">Esperando la validación del pago por un administrador</p>}
            </div>
          </div>
          {reservaActual.estadoPago === 'Rechazado' && (
            <div className="px-4 py-3 border-t bg-red-50">
              <div className="flex items-start gap-2">
                <AlertCircle size={14} className="text-red-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-bold text-red-700">Pago Rechazado</p>
                  {intentosAgotados ? (
                    <p className="text-[10px] text-gray-600">Has alcanzado el límite de intentos. Contacta al administrador.</p>
                  ) : (
                    <>
                      <p className="text-[10px] text-gray-600 mb-2">La referencia no coincide. Ingresa los 4 últimos dígitos de la referencia del pago móvil.</p>
                      <CorreccionReferencia onGuardar={handleGuardarReferencia} enviando={enviandoCorreccion} />
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
          {reservaActual.estadoPago === 'Pendiente' && (
            <div className="px-4 py-3 border-t bg-orange-50">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-orange-600" />
                <p className="text-xs font-bold text-orange-700">Pago Pendiente</p>
                <p className="text-[10px] text-gray-600">Ref: {reservaActual.pagoRef}</p>
              </div>
            </div>
          )}
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100"><h3 className="font-bold text-gray-900 text-sm mb-3">📢 Próximos Cursos y Ofertas</h3><p className="text-xs text-gray-500">Próximamente podrás explorar y reservar nuevos cursos.</p></div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100"><h3 className="font-bold text-gray-900 text-sm mb-3">🔧 Servicios</h3><p className="text-xs text-gray-500">Mecánica, motolavado, delivery y más.</p></div>
      </div>
    );
  };

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
            const completado = (cursoDetalle.reserva.modulosEstado || {})[mod];
            return (
              <div key={i} className={`bg-white p-3 rounded-xl shadow-sm border flex items-center gap-2 ${completado?.fecha ? 'border-green-200 bg-green-50' : 'border-gray-100'}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${completado?.fecha ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-300'}`}>
                  {completado?.fecha ? <Check size={12} strokeWidth={3} /> : <Clock size={12} />}
                </div>
                <div className="flex-1"><span className={`font-bold text-xs ${completado?.fecha ? 'text-green-900' : 'text-gray-800'}`}>{mod}</span>{completado?.fecha && <p className="text-[10px] font-bold text-green-700">{completado.fecha} · {completado.duracion || 0} min</p>}</div>
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

  const VistaPerfil = () => {
    const [mostrarCambioPin, setMostrarCambioPin] = useState(false);
    const [pinNuevo, setPinNuevo] = useState('');

    const handleCambiarPin = async () => {
      if (!pinNuevo || pinNuevo.length < 6) {
        showToast('El nuevo PIN debe tener 6 dígitos', 'error');
        return;
      }
      try {
        const result = await AuthService.updatePassword(ctx.fbUser, pinNuevo);
        if (result.success) {
          showToast('PIN actualizado correctamente', 'success');
          setMostrarCambioPin(false);
          setPinNuevo('');
        } else if (result.error.code === 'recent-login') {
          showToast('Por seguridad, cierra sesión y vuelve a entrar para cambiar tu PIN', 'error');
        } else {
          showToast(result.error.message || 'Error al cambiar el PIN', 'error');
        }
      } catch (e) {
        showToast('Error de conexión', 'error');
      }
    };

    return (
      <div className="space-y-4">
        <h2 className="text-lg font-black text-gray-900 uppercase tracking-widest">Mi Perfil</h2>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-3">
          <div><p className="text-xs text-gray-500">Nombre</p><p className="font-bold text-gray-900">{reservaActual?.nombre} {reservaActual?.apellido}</p></div>
          <div><p className="text-xs text-gray-500">Cédula</p><p className="font-bold text-gray-900">{reservaActual?.cedula}</p></div>
          <div><p className="text-xs text-gray-500">Teléfono</p><p className="font-bold text-gray-900">{reservaActual?.telefono || 'No registrado'}</p></div>
          <div><p className="text-xs text-gray-500">Curso Actual</p><p className="font-bold text-gray-900">{cursoAsignado.nombre || 'No asignado'}</p></div>
          <div><p className="text-xs text-gray-500">Sede</p><p className="font-bold text-gray-900">{sedeActual?.nombre || 'No asignada'}</p></div>
          
          <div className="border-t border-gray-100 pt-3">
            {!mostrarCambioPin ? (
              <button onClick={() => setMostrarCambioPin(true)} className="flex items-center gap-2 text-blue-600 font-bold text-sm">
                <KeyRound size={14} />
                Cambiar PIN
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-gray-500">Ingresa tu nuevo PIN de 6 dígitos</p>
                <input type="password" value={pinNuevo} onChange={e => setPinNuevo(e.target.value.replace(/\D/g, ''))} placeholder="Nuevo PIN (6 dígitos)" className="w-full bg-gray-50 border rounded-xl py-2 px-3 text-sm" inputMode="numeric" pattern="\d{6}" maxLength={6} />
                <div className="flex gap-2">
                  <Button onClick={handleCambiarPin} variant="primary" className="!py-1.5 !text-xs" disabled={pinNuevo.length < 6}>Guardar</Button>
                  <Button onClick={() => { setMostrarCambioPin(false); setPinNuevo(''); }} variant="outline" className="!py-1.5 !text-xs">Cancelar</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <AppShell header={header} footer={footer}>
      <div className="p-4 space-y-4">
        {tab === 'miCurso' && <VistaMiCurso />}
        {tab === 'cursos' && !modoCorreccion && <VistaCursos />}
        {tab === 'recursos' && !modoCorreccion && <Placeholder icon={Library} titulo="Recursos" descripcion="Leyes de tránsito, señales, documentales y más." />}
        {tab === 'evaluaciones' && !modoCorreccion && <Placeholder icon={FileText} titulo="Evaluaciones" descripcion="Pruebas teóricas para medir tu conocimiento." />}
        {tab === 'perfil' && <VistaPerfil />}
      </div>
    </AppShell>
  );
}

export default EstudiantePanel;