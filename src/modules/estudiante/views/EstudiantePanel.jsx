// @build: 2026-09-30 | id: LEGAL-TERMINOLOGIA-ESTUDIANTE | desc: Terminología legal - sesiones, panel de sesiones, constancia. Se agrega LegalFooter.
import { useContext, useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase';
import { AppContext } from '../../../context/AppContextValue';
import { ReservaService } from '../../inscripcion/services/ReservaService';
import { AuthService } from '../../../services/AuthService';
import { CursoService } from '../../shared/services/CursoService';
import { formatearRangoCorto } from '../../shared/utils/fechas';
import { CURSO_SECUENCIA, cumplePrerequisito } from '../../../constants/cursoSecuencia';
import { Button, Spinner } from '../../../components/UI';
import { useToast } from '../../shared/components/ToastProvider';
import AppShell from '../../shared/components/AppShell';
import DashboardHeader from '../../shared/components/DashboardHeader';
import DashboardFooter from '../../shared/components/DashboardFooter';
import LegalFooter from '../../shared/components/LegalFooter';

import {
  Calendar, Clock, MapPin, Bike, BookOpen, Award, Compass, Library, FileText, Settings,
  User, AlertCircle, Info, ChevronLeft, Share2, Zap, Lock, Check, KeyRound, Package
} from 'lucide-react';

const APP_ID = 'motoescuela-pro-v1';

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MESES_CORTOS = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];



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
  const [searchParams] = useSearchParams();
  useEffect(() => {
  const tabFromUrl = searchParams.get('tab');
  if (tabFromUrl === 'cursos') {
    setTab('cursos');
  }
}, [searchParams]);
  const [tab, setTab] = useState('miCurso');
  const [cursoDirecto, setCursoDirecto] = useState(null);
  const [busquedaCursoFallida, setBusquedaCursoFallida] = useState(false);
  const [cursoDetalle, setCursoDetalle] = useState(null);
  const [enviandoCorreccion, setEnviandoCorreccion] = useState(false);
    const [reservasUsuario, setReservasUsuario] = useState([]);
  const [packsUsuario, setPacksUsuario] = useState([]);
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
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setReservasUsuario(docs);
      setIsSearching(false);
    }, (err) => {
      setIsSearching(false);
    });

     return () => unsub();
  }, [uid]);

    // Fase 3.8e: cargar packs del usuario (getDocs puntual — no listener)
  // 5.1-bis: extraído a useCallback para permitir refresh explícito
  const cargarPacks = useCallback(async () => {
    if (!uid) { setPacksUsuario([]); return; }
    try {
      const ref = collection(db, 'artifacts', APP_ID, 'public', 'data', 'reservasPack');
      const q = query(ref, where('userId', '==', String(uid)));
      const snap = await getDocs(q);
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => (b.fechaCompra?.toMillis?.() || 0) - (a.fechaCompra?.toMillis?.() || 0));
      setPacksUsuario(docs);
    } catch (err) {
      console.error('[EstudiantePanel] Error cargando packs:', err);
      setPacksUsuario([]);
    }
  }, [uid]);

  useEffect(() => {
    cargarPacks();
  }, [cargarPacks]);

        const reservaRealTime = useMemo(() => {
    if (!reservasUsuario.length) return null;

    // A2.5: excluir canceladas de la reserva "actual"
    const noCompletadas = reservasUsuario.filter(r => 
      r.estadoCurso !== 'Aprobado' && r.estadoPago !== 'Cancelado'
    );
    const completadas = reservasUsuario.filter(r => r.estadoCurso === 'Aprobado');
    const ordenarPorFecha = (a, b) => {
      const ta = a.createdAt?.toMillis?.() || 0;
      const tb = b.createdAt?.toMillis?.() || 0;
      return tb - ta;
    };

    if (noCompletadas.length > 0) {
      return [...noCompletadas].sort(ordenarPorFecha)[0];
    }

    if (completadas.length > 0) {
      return [...completadas].sort(ordenarPorFecha)[0];
    }

    return null;
  }, [reservasUsuario]);

  useEffect(() => {
    if (!reservaRealTime) return;
    const estadoActual = reservaRealTime.estadoPago;
    const estadoAnterior = estadoPagoAnteriorRef.current;
    
    if (estadoAnterior && estadoAnterior !== estadoActual) {
      if (estadoActual === 'Rechazado') {
        showToast('Tu pago ha sido rechazado. Corrige la referencia.', 'error');
      } else if (estadoActual === 'Aprobado') {
        showToast('¡Pago aprobado! Ya puedes entrar al Panel de Sesiones.', 'success');
      } else if (estadoActual === 'Pendiente') {
        showToast('Referencia enviada. Espera la validación.', 'info');
      }
    }
    
    estadoPagoAnteriorRef.current = estadoActual;
    }, [reservaRealTime?.estadoPago, showToast]);

  // 5.1-bis: cuando el admin aprueba el pack, reservaRealTime pasa a 'Aprobado'
  // → recargamos packsUsuario para que la card morada aparezca sin F5
  useEffect(() => {
    if (reservaRealTime?.estadoPago === 'Aprobado') {
      cargarPacks();
    }
  }, [reservaRealTime?.estadoPago, cargarPacks]);

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
    const texto = `¡Completé la sesión "${cursoDetalle?.cursoNombre || 'Moto App'}" en Moto App! 🏍️`;
    if (navigator.share) navigator.share({ title: 'Moto App', text: texto, url: window.location.origin }).catch(() => {});
    else { navigator.clipboard.writeText(texto).then(() => showToast('Enlace copiado', 'success')); }
  };
    const misReservas = reservasUsuario.length > 0
    ? reservasUsuario
    : (reservas || []).filter(r => String(r.userId) === String(uid));

    const reservasAprobadas = useMemo(() => misReservas.filter(r => r.estadoPago === 'Aprobado'), [misReservas]);
    const cursosCompletados = misReservas.filter(r => r.estadoCurso === 'Aprobado');
  const reservasActivasEstudiante = useMemo(
    () => misReservas.filter(r =>
      r.estadoCurso !== 'Aprobado' && r.estadoPago !== 'Cancelado'
    ),
    [misReservas]
  );
  // A2.5: reservas canceladas definitivamente (solo por falta de pago)
   const reservasCanceladas = useMemo(
    () => misReservas.filter(r => r.estadoPago === 'Cancelado'),
    [misReservas]
  );

   // 5.1-bis: pack existente con prioridad (Aprobado > Pendiente > Rechazado > Cancelado)
  const packExistente = useMemo(() => {
    const lista = packsUsuario || [];
    if (lista.length === 0) return null;
    const prioridad = { Aprobado: 1, Pendiente: 2, Rechazado: 3, Cancelado: 4 };
    const ordenada = [...lista].sort((a, b) => {
      const pa = prioridad[a.estadoPago] || 99;
      const pb = prioridad[b.estadoPago] || 99;
      if (pa !== pb) return pa - pb;
      return (b.fechaCompra?.toMillis?.() || 0) - (a.fechaCompra?.toMillis?.() || 0);
    });
    return ordenada[0];
  }, [packsUsuario]);

  // Mantengo packActivo para la lógica específica de estado aprobado
  const packActivo = useMemo(
    () => packExistente?.estadoPago === 'Aprobado' ? packExistente : null,
    [packExistente]
  );
   const catalogoConEstado = useMemo(() => {
    return (cursos || [])
      .filter(c => c.activo !== false)
      .map(curso => {
        const config = CURSO_SECUENCIA[curso.tipoCurso];
        const cumple = cumplePrerequisito(curso.tipoCurso, reservasAprobadas, curso, cursos);        // A2.2: prereqs editables (curso.prerequisitos) con fallback al hardcode
        const prereqs = Array.isArray(curso.prerequisitos)
          ? curso.prerequisitos
          : (config?.prerequisito || []);
        let prerequisitoLabel = null;
        if (prereqs.length > 0) {
          const nombres = prereqs.map(tc => {
            const c = (cursos || []).find(x => x.tipoCurso === tc);
            return c?.nombre || tc;
          });
          prerequisitoLabel = `Requiere ${nombres.join(' o ')} aprobado`;
        }
        return {
          ...curso,
          ordenSecuencia: config?.orden || 99,
          tienePrerequisito: cumple,
          prerequisitoLabel
        };
      })
      .sort((a, b) => a.ordenSecuencia - b.ordenSecuencia);
  }, [cursos, reservasAprobadas]);

  if (isSearching) return <AppShell bgColor="bg-gray-50"><div className="flex items-center justify-center min-h-full"><Spinner message="Cargando tus datos..." /></div></AppShell>;

  
  const modoCorreccion = reservaActual?.estadoPago === 'Rechazado' && misReservas.every(r => r.estadoPago !== 'Aprobado' && r.estadoCurso !== 'Aprobado');

    const tieneReservaAprobada = misReservas.some(r => r.estadoPago === 'Aprobado');
  const tieneReservaPendiente = misReservas.some(r => r.estadoPago === 'Pendiente');
  // A2.6: habilitar catálogo si el usuario tuvo cancelaciones previas
  const tieneReservaCancelada = misReservas.some(r => r.estadoPago === 'Cancelado');
  const header = <DashboardHeader nombre={reservaActual?.nombre} role="estudiante" onLogout={handleLogout} notifications={notifications} />;
  const footer = <DashboardFooter
    tabs={modoCorreccion
      ? [{ id: 'miCurso', icon: BookOpen, label: 'Mi Sesión' }, { id: 'perfil', icon: Settings, label: 'Perfil' }]
      : [{ id: 'miCurso', icon: BookOpen, label: 'Mi Sesión' }, { id: 'cursos', icon: Compass, label: 'Sesiones' }, { id: 'recursos', icon: Library, label: 'Recursos' }, { id: 'evaluaciones', icon: FileText, label: 'Eval.' }, { id: 'perfil', icon: Settings, label: 'Perfil' }]
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

            {/* A2.5: aviso de reservas canceladas por falta de pago */}
            {reservasCanceladas.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-left mb-4">
                <p className="text-xs font-bold text-red-700 mb-1">
                  Reserva{reservasCanceladas.length > 1 ? 's' : ''} cancelada{reservasCanceladas.length > 1 ? 's' : ''}
                </p>
                {reservasCanceladas.slice(0, 2).map(r => {
                  const cursoNombre = cursos.find(c => String(c.id) === String(r.cursoId))?.nombre || 'sesión';
                  return (
                    <p key={r.id} className="text-[11px] text-red-600 mb-1">
                      Tu reserva de <strong>{cursoNombre}</strong> fue cancelada porque el pago no coincidía.
                    </p>
                  );
                })}
                {reservasCanceladas.length > 2 && (
                  <p className="text-[10px] text-red-500 italic">
                    Hay {reservasCanceladas.length - 2} más.
                  </p>
                )}
                <p className="text-[10px] text-red-500 mt-2">
                  Si creés que es un error, contactá al administrador.
                </p>
              </div>
            )}

            <Button onClick={() => setTab('cursos')} variant="primary">Ver sesiones disponibles</Button>          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100"><h3 className="font-bold text-gray-900 text-sm mb-3">📅 Próximas Sesiones</h3><p className="text-xs text-gray-500">Próximamente podrás explorar y reservar nuevas sesiones.</p></div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100"><h3 className="font-bold text-gray-900 text-sm mb-3">🔧 Servicios</h3><p className="text-xs text-gray-500">Mecánica, motolavado, delivery y más.</p></div>
        </div>
      );
    }

        return (
      <div className="space-y-4">
                {packExistente && (() => {
          const subReservas = packExistente.subReservas || [];
          const totalCursos = subReservas.length;
          const completados = subReservas.filter(s => s.estado === 'completado').length;
          const activoIdx = subReservas.findIndex(s => s.estado === 'activo');
          const cursoActivo = activoIdx >= 0 ? subReservas[activoIdx] : null;
          const cursoActivoInfo = cursoActivo ? (cursos || []).find(c => String(c.id) === String(cursoActivo.cursoId)) : null;
          const childActiva = misReservas.find(r =>
            String(r.packReservaId) === String(packExistente.id) &&
            r.packCursoIndex === packExistente.cursoActual
          );          
          const estado = packExistente.estadoPago;
          const estadoBadgeClass = {
            Aprobado: 'bg-green-400/90 text-green-900',
            Pendiente: 'bg-yellow-400/90 text-yellow-900',
            Rechazado: 'bg-red-400/90 text-red-900',
            Cancelado: 'bg-gray-400/90 text-gray-900',
          }[estado] || 'bg-gray-400/90 text-gray-900';

          return (
            <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-3xl shadow-xl overflow-hidden text-white">
              <div className="p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Package size={20} className="flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-widest opacity-80">Mi Pack</p>
                      <h3 className="text-base font-black truncate">{packExistente.packNombre || 'Pack'}</h3>
                    </div>
                  </div>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded flex-shrink-0 ${estadoBadgeClass}`}>
                    {estado}
                  </span>
                </div>

                <div className="mb-3">
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <span className="opacity-90">Progreso</span>
                    <span className="font-black">{completados}/{totalCursos}</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-1.5 overflow-hidden">
                    <div className="h-1.5 rounded-full bg-white transition-all duration-500" style={{ width: totalCursos > 0 ? `${(completados / totalCursos) * 100}%` : '0%' }} />
                  </div>
                </div>

                             {cursoActivoInfo && estado === 'Aprobado' && (
                  <div className="text-[11px] mb-3">
                    <span className="opacity-80">{childActiva ? 'Sesión actual: ' : 'Próxima sesión: '}</span>
                    <span className="font-bold">{cursoActivoInfo.nombre}</span>
                    {!childActiva && (
                      <span className="block text-[10px] opacity-75 mt-0.5">Pendiente de agendar</span>
                    )}
                  </div>
                )}

                {estado === 'Pendiente' && (
                  <div className="text-[11px] mb-3 opacity-90">
                    Esperando validación del pago por un administrador.
                  </div>
                )}

                {estado === 'Rechazado' && (
                  <div className="text-[11px] mb-3 bg-red-900/30 border border-red-300/40 rounded-lg p-2">
                    <p className="font-bold mb-1">Pago Rechazado</p>
                    <p className="opacity-90 mb-2">La referencia no coincide. Ingresá los 4 últimos dígitos del pago móvil.</p>
                    <CorreccionReferencia onGuardar={handleGuardarReferencia} enviando={enviandoCorreccion} />
                  </div>
                )}

                {estado === 'Cancelado' && (
                  <div className="text-[11px] mb-3 opacity-90">
                    Contactá al administrador para más información.
                  </div>
                )}

                             <div className="flex gap-2">
                  {estado === 'Aprobado' && childActiva && (
                    <button
                      onClick={() => navigate(`/aula/${childActiva.id}`)}
                      className="flex-1 bg-white text-purple-700 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
                    >
                      <Award size={14} />
                      Panel de Sesiones
                    </button>
                  )}
                  {estado === 'Rechazado' || estado === 'Cancelado' ? (
                    <button
                      disabled
                      className={`${estado === 'Aprobado' && childActiva ? '' : 'flex-1'} bg-white/10 text-white/60 py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 opacity-50 cursor-not-allowed`}
                    >
                      {estado === 'Rechazado' ? 'Corregí tu pago para ver el detalle' : 'Pack Cancelado'}
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate(`/mi-pack/${packExistente.id}`)}
                      className={`${estado === 'Aprobado' && childActiva ? '' : 'flex-1'} bg-white/20 hover:bg-white/30 text-white py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all`}
                    >
                      Ver detalle →
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
                      {!packExistente && (
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
                <span className="text-xl font-black uppercase tracking-widest">Entrar al Panel de Sesiones</span>
                <Zap size={24} className="text-yellow-300 animate-pulse" />
              </button>
            ) : (
              <button disabled className="w-full bg-gray-300 text-gray-500 py-5 rounded-2xl shadow-md cursor-not-allowed flex items-center justify-center gap-3">
                <Lock size={28} className="text-gray-400" />
                <span className="text-xl font-black uppercase tracking-widest">Panel Bloqueado</span>
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
                <User size={12} /><span className="font-bold">Tutor: {inst ? inst.nombre : 'Asignando'}</span>
              </p>
              {pagoAprobado && modulosFaltantes > 0 && <p className="text-[10px] text-blue-600 font-bold mt-2">Te {modulosFaltantes === 1 ? 'falta' : 'faltan'} {modulosFaltantes} {modulosFaltantes === 1 ? 'módulo' : 'módulos'} para tu constancia</p>}
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
        )}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100"><h3 className="font-bold text-gray-900 text-sm mb-3">📅 Próximas Sesiones y Ofertas</h3><p className="text-xs text-gray-500">Próximamente podrás explorar y reservar nuevas sesiones.</p></div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100"><h3 className="font-bold text-gray-900 text-sm mb-3">🔧 Servicios</h3><p className="text-xs text-gray-500">Mecánica, motolavado, delivery y más.</p></div>
      </div>
    );
  };

 
  const VistaCursos = () => {
    if (cursoDetalle) {
      const cur = cursoDetalle.cursoInfo || { nombre: '', modulos: [], duracionTotal: 240 };
// A2.4: si el curso está Aprobado, contar todos los módulos como superados
const cursoAprobado = cursoDetalle.reserva.estadoCurso === 'Aprobado';
const comp = cursoAprobado
  ? (cur.modulos?.length || 0)
  : Object.keys(cursoDetalle.reserva.modulosEstado || {}).filter(k => (cursoDetalle.reserva.modulosEstado || {})[k]?.fecha).length;      const total = cur.modulos.length;
      const tiempoCon = Object.values(cursoDetalle.reserva.modulosEstado || {}).reduce((acc, mod) => acc + (mod.duracion || 0), 0);
      const selloCurso = obtenerMesCortoYAnio(cursoDetalle.reserva.fecha);
      return (
        <div className="space-y-3">
          <div className="rounded-xl shadow-xl shadow-blue-600/20 overflow-hidden">
            <div className="bg-blue-600 text-white p-3 relative">
              <div className="flex items-center gap-2 mb-2"><Bike size={18} className="text-blue-200" /><p className="text-sm font-bold uppercase tracking-widest flex-1">{cur.nombre || 'Sesión'}</p></div>
              <div className="absolute top-2 right-2 bg-white/20 rounded-lg px-2 py-1 text-center"><p className="text-lg font-black leading-none">{selloCurso.mes}</p><p className="text-[10px] font-bold leading-none">{selloCurso.anio}</p></div>
              <div className="bg-gray-100 -mx-3 -mb-3 px-3 py-2.5 mt-2 border-t border-blue-400/30">
                <div className="flex items-center justify-between mb-1"><span className="text-xs text-gray-700">Avance Académico</span><span className="text-xs font-bold text-blue-600">{comp}/{total}</span></div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden"><div className="h-2 rounded-full transition-all duration-500" style={{ width: total > 0 ? `${(comp / total) * 100}%` : '0%', background: 'repeating-linear-gradient(-45deg, #4ade80, #4ade80 6px, #22c55e 6px, #22c55e 12px)', animation: 'progress-stripes 1s linear infinite' }}></div></div>
                {tiempoCon > 0 && <p className="text-[10px] text-gray-500 mt-2 text-center">Tiempo total: {tiempoCon} min</p>}
              </div>
            </div>
          </div>
                    {cur.modulos.map((mod, i) => {
           const nombreModulo = typeof mod === 'string' ? mod : mod.nombre;
const completado = (cursoDetalle.reserva.modulosEstado || {})[nombreModulo];
// A2.4: si el curso está Aprobado, todos los módulos cuentan como superados
const estaCompletado = cursoAprobado || Boolean(completado?.fecha);
            return (
                            <div key={i} className={`bg-white p-3 rounded-xl shadow-sm border flex items-center gap-2 ${estaCompletado ? 'border-green-200 bg-green-50' : 'border-gray-100'}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${estaCompletado ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-300'}`}>
                  {estaCompletado ? <Check size={12} strokeWidth={3} /> : <Clock size={12} />}
                </div>
                                                             <div className="flex-1">
                  <span className={`font-bold text-xs ${estaCompletado ? 'text-green-900' : 'text-gray-800'}`}>{nombreModulo}</span>
                  {completado?.fecha && (
                    <p className="text-[10px] font-bold text-green-700">
                      {completado.fecha} · {completado.duracion || 0} min
                      {/* A2.8: rango horario compacto 24h — solo si existe */}
                      {completado.horaInicio && completado.horaFin && (
                        <span className="text-[9px] leading-none font-normal text-gray-400 ml-1">
                          · {new Date(completado.horaInicio).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Caracas' })}-{new Date(completado.horaFin).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Caracas' })}
                        </span>
                      )}
                    </p>
                  )}
                </div>
                <span className={`text-[10px] font-black uppercase ${estaCompletado ? 'text-green-600' : 'text-gray-400'}`}>{estaCompletado ? 'Superado' : 'Pendiente'}</span>
              </div>
            );
          })}
          <Button variant="primary" className="mt-3" icon={Share2} onClick={compartirCurso}>Compartir</Button>
                    <Button
            variant="outline"
            className="mt-2"
            onClick={() => navigate('/inscripcion', {
              state: {
                cursoId: cursoDetalle.reserva.cursoId,
                origen: 'panel-estudiante',
                modo: 'nueva',
                esRecompra: true
              }
            })}
            disabled={tieneReservaPendiente}
          >
            Volver a inscribirme
          </Button>
        </div>
      );
    }
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-black text-gray-900 uppercase tracking-widest">Mis Sesiones</h2>
           {reservasActivasEstudiante.length > 0 ? (
          reservasActivasEstudiante.map(r => {
            const estaAprobado = r.estadoPago === 'Aprobado';
            const cursoReserva = cursos.find(c => String(c.id) === String(r.cursoId)) || { nombre: 'Sesión', modulos: [] };
            const completadosMod = Object.values(r.modulosEstado || {}).filter(m => m?.fecha).length;

            return (
              <div key={r.id} className="w-full bg-white p-4 rounded-xl shadow-sm border border-blue-200 text-left">
                <div className="flex items-center gap-3">
                  <BookOpen size={20} className={estaAprobado ? 'text-blue-600' : 'text-yellow-500'} />
                  <div className="flex-1">
                    <p className="font-bold text-sm text-gray-900">{cursoReserva.nombre || 'Sesión'} · En Progreso</p>
                    <p className="text-xs text-gray-500">{completadosMod}/{cursoReserva.modulos?.length || 0} módulos</p>
                    <p className={`text-xs mt-1 font-bold ${estaAprobado ? 'text-green-600' : 'text-yellow-600'}`}>
                      {estaAprobado ? '✓ Pago aprobado' : '⏳ Pago pendiente'}
                    </p>
                  </div>
                  <button
                    onClick={() => estaAprobado && navigate(`/aula/${r.id}`)}
                    disabled={!estaAprobado}
                    className={`text-xs font-bold px-3 py-2 rounded-lg ${
                      estaAprobado
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {estaAprobado ? 'Entrar' : 'Pendiente'}
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">No tienes sesiones activas.</p>
        )}
                {cursosCompletados.map(r => {
          const cur = cursos.find(c => String(c.id) === String(r.cursoId)) || { nombre: '', modulos: [], duracionTotal: 240 };
          // A2.4: si el curso está Aprobado, contar todos los módulos como superados
          const comp = r.estadoCurso === 'Aprobado'
            ? (cur.modulos?.length || 0)
            : Object.keys(r.modulosEstado || {}).length;
          const total = cur.modulos.length;
          const tiempo = Object.values(r.modulosEstado || {}).reduce((acc, mod) => acc + (mod.duracion || 0), 0);
          return (
            <button key={r.id} onClick={() => setCursoDetalle({ reserva: r, cursoInfo: cur, esCompletado: true })} className="w-full bg-white p-4 rounded-xl shadow-sm border border-green-200 text-left hover:border-green-300 transition-colors">
              <div className="flex items-center gap-3"><Award size={20} className="text-green-600" /><div className="flex-1"><p className="font-bold text-sm text-gray-900">{cur.nombre || 'Sesión'} · Completado</p><p className="text-xs text-gray-500">✅ {comp}/{total} módulos · {tiempo} min</p></div><ChevronLeft size={16} className="text-gray-400 rotate-180" /></div>
            </button>
          );
        })}
         <div className="mt-6">
        <h3 className="font-bold text-gray-900 text-sm mb-3">📚 Catálogo de Sesiones</h3>
                {!tieneReservaAprobada && !tieneReservaCancelada ? (
          <p className="text-xs text-gray-500">Completa tu primera sesión para desbloquear el catálogo.</p>
        ) : tieneReservaPendiente ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-xs text-yellow-600 font-bold">Tienes un pago pendiente. Complétalo antes de inscribirte en otra sesión.</p>
          </div>
        ) : (
          <div className="space-y-2">
                        {catalogoConEstado.map(cur => {
              // A2.7: básicos nunca se bloquean (prereq suave). La excepción vive en el render,
              // no en el helper cumplePrerequisito (semántica pura).
              const esBasico = cur.tipoCurso === 'basico_auto' || cur.tipoCurso === 'basico_sincro';
              const bloqueado = !cur.tienePrerequisito && !esBasico;
              return (
                <div
                  key={cur.id}
                  className={`bg-white p-3 rounded-xl border ${
                    bloqueado ? 'border-gray-200 opacity-75' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className={`font-bold text-sm ${bloqueado ? 'text-gray-400' : 'text-gray-900'}`}>
                      {cur.nombre}
                    </p>
                    {bloqueado && <Lock size={14} className="text-yellow-600 shrink-0" />}
                  </div>
                  <p className="text-xs text-gray-500">{cur.modulos?.length || 0} módulos</p>

                                  {bloqueado && (
                    <p className="text-[10px] text-yellow-600 font-bold mt-1 flex items-center gap-1">
                      <AlertCircle size={12} />
                      {cur.prerequisitoLabel}
                    </p>
                  )}

                                   {!bloqueado && esBasico && cur.prerequisitoLabel && (
                    <p className="text-[10px] text-blue-600 font-bold mt-1 flex items-center gap-1">
                      <Info size={12} />
                      Puedes inscribirte directamente. Te recomendamos Equilibrio si no sabes andar en bicicleta.
                    </p>
                  )}
                                 <button
                    onClick={() => {
                      // A2.6: distinguir flujo recompra (con aprobadas) vs reintento (solo canceladas)
                      const tieneAprobada = reservasAprobadas.length > 0;
                      const soloCancelada = !tieneAprobada && reservasCanceladas.length > 0;
                      navigate('/inscripcion', {
                        state: {
                          cursoId: cur.id,
                          origen: 'panel-estudiante',
                          modo: 'nueva',
                          esRecompra: tieneAprobada,
                          esReintento: soloCancelada
                        }
                      });
                    }}
                    disabled={bloqueado}
                    className={`mt-2 w-full py-2 rounded-lg text-xs font-bold transition-colors ${
                      bloqueado
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {bloqueado ? 'Bloqueado' : 'Inscribirme'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
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
          <div><p className="text-xs text-gray-500">Sesión Actual</p><p className="font-bold text-gray-900">{cursoAsignado.nombre || 'No asignado'}</p></div>
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
        <LegalFooter />
      </div>
    </AppShell>
  );
}

export default EstudiantePanel;