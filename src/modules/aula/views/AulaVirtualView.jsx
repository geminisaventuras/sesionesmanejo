// @build: 2026-09-01 | id: RELOJES-D1D2-CORRECCION | desc: Se agrega toggle de alerta sonora en header. Se usan nuevos campos de hook.
import { useContext, useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppContext } from '../../../context/AppContextValue';
import { Button, Spinner } from '../../../components/UI';
import { useToast } from '../../shared/components/ToastProvider';
import AppShell from '../../shared/components/AppShell';
import RelojSesion from '../../shared/components/RelojSesion';
import FilaTiempo from '../../shared/components/FilaTiempo';
import BannerPausa from '../../shared/components/BannerPausa';
import ModuloItem from '../../shared/components/ModuloItem';
import CarruselModulos from '../../shared/components/CarruselModulos';
import ModalConfirmacion from '../../shared/components/ModalConfirmacion';
import { useSessionTimer } from '../../sesiones/hooks/useSessionTimer';
import { MOTIVOS_PAUSA } from '../../sesiones/constants';
import { alertas } from '../../shared/utils/alertas';
import { formatearRangoCorto, obtenerMesCortoYAnio } from '../../shared/utils/fechas';
import { ChevronLeft, Calendar, Clock, MapPin, Bike, BookOpen, Award, Pause, User, Library, MessageCircle, Siren, X, CheckCircle, Timer, Volume2, VolumeX } from 'lucide-react';
import ResumenFinal from '../components/ResumenFinal';
import ReservaPanel from '../components/ReservaPanel';
import ReservaActivaPanel from '../components/ReservaActivaPanel';
import { isAlertaSonoraHabilitada, setAlertaSonora as guardarPreferenciaSonora } from '../../shared/utils/audio';

const MATERIAL_APOYO = {
  senales: [{ nombre: 'Pare', descripcion: 'Detenerse completamente antes de la intersección.' }, { nombre: 'Ceda el Paso', descripcion: 'Reducir velocidad y ceder el paso.' }, { nombre: 'Velocidad Máxima', descripcion: 'Límite de velocidad permitido.' }],
  leyes: [{ titulo: 'Artículo 154', texto: 'Los conductores deben mantener la distancia de seguridad.' }, { titulo: 'Artículo 169', texto: 'Está prohibido el uso de dispositivos móviles al conducir.' }],
  glosario: [{ termino: 'ABS', definicion: 'Sistema de frenado antibloqueo.' }, { termino: 'Clutch', definicion: 'Embrague del vehículo.' }]
};

export default function AulaVirtualView() {
  const { user, cursos, horarios, instructores, sedes, saveReserva } = useContext(AppContext);
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { reservaId } = useParams();

  const [mostrarSelectorPausa, setMostrarSelectorPausa] = useState(false);
  const [mostrandoInputOtro, setMostrandoInputOtro] = useState(false);
  const [otroMotivoTexto, setOtroMotivoTexto] = useState('');
  const [mostrarMaterial, setMostrarMaterial] = useState(false);
  const [seccionMaterial, setSeccionMaterial] = useState('senales');
  const [mostrarModalCompletar, setMostrarModalCompletar] = useState(false);
  const [alertaSonora, setAlertaSonoraState] = useState(isAlertaSonoraHabilitada());

  const rol = user?.role; const esInstructor = rol === 'instructor' || rol === 'admin'; const esEstudiante = rol === 'estudiante';

  useEffect(() => { alertas.inicializar(); }, []);

  const toggleAlertaSonora = () => {
    const nuevoEstado = !alertaSonora;
    setAlertaSonoraState(nuevoEstado);
    guardarPreferenciaSonora(nuevoEstado);
  };

  const opcionesRef = useRef({ curso: null, hor: null });

  const { reserva, sgta, modalConfirmacion, conexionPerdida, toggleModulo, pausarSesion, reanudarSesion, activarReserva, pausarReserva, reanudarReserva, detenerReserva, completarCursoManualmente } = useSessionTimer(reservaId, esInstructor, saveReserva, showToast, opcionesRef);

  const curso = useMemo(() => { if (!reserva) return { nombre: '', modulos: [], duracionTotal: 240 }; return (cursos || []).find(c => String(c.id) === String(reserva.cursoId)) || { nombre: '', modulos: [], duracionTotal: 240 }; }, [cursos, reserva]);
  const hor = useMemo(() => reserva ? (horarios || []).find(h => String(h.id) === String(reserva.horaId)) : null, [horarios, reserva]);
  const sede = useMemo(() => reserva ? (sedes || []).find(s => String(s.id) === String(reserva.sedeId)) : null, [sedes, reserva]);
  const inst = useMemo(() => reserva ? (instructores || []).find(i => String(i.id) === String(reserva.instructorId)) : null, [instructores, reserva]);

  useEffect(() => {
    opcionesRef.current = { curso, hor };
  }, [curso, hor]);

  useEffect(() => {
    if (!reserva) return;
    if (reserva.estadoPago !== 'Aprobado') {
      if (esEstudiante) {
        showToast('Tu pago aún no ha sido aprobado. Espera la validación del administrador.', 'error');
        navigate('/portal-reservas', { replace: true });
      } else if (esInstructor) {
        showToast('El pago de esta reserva aún no ha sido aprobado. No puedes iniciar la clase.', 'error');
        navigate('/instructor', { replace: true });
      }
    }
  }, [reserva, esEstudiante, esInstructor, showToast, navigate]);

  const cantCompletados = Object.keys(reserva?.modulosEstado || {}).filter(k => (reserva?.modulosEstado || {})[k]?.fecha).length;
  const totalModulos = curso.modulos.length;
  const todosCompletados = (reserva?.estadoCurso === 'Aprobado') || (totalModulos > 0 && cantCompletados >= totalModulos);
  const tiempoAgotado = sgta.totalCompletado || sgta.diarioCompletado;
  const reservaDisponible = sgta.totalCompletado && sgta.pausaTotalAcumulada > 0;
  const puedeUsarReserva = reservaDisponible && !sgta.reservaActiva && sgta.reservaRestante <= 0;
  const reservaActivaOPausada = sgta.reservaActiva || (!sgta.reservaActiva && sgta.reservaRestante > 0);
  const modulosPendientesCantidad = totalModulos - cantCompletados;
  const mostrarBotonCompletarManual = esInstructor && !todosCompletados && tiempoAgotado && !sgta.pausaActiva;

  const horaInicio = hor?.label ? hor.label.split('-')[0]?.trim() : '--:--';
  const horaFin = hor?.label ? hor.label.split('-')[1]?.trim() : '--:--';
  const sello = obtenerMesCortoYAnio(reserva?.fecha);
  const tiempoMaximoCurso = curso.duracionTotal || 240;
  const tiempoConsumido = Object.values(reserva?.modulosEstado || {}).reduce((acc, mod) => acc + (mod.duracion || 0) + (mod.duracionExtra || 0), 0);
  const tiempoRestanteCurso = Math.floor((sgta?.tiempoRestanteCurso || 0) / 60);
  const modulosCompletados = curso.modulos.filter(mod => (reserva?.modulosEstado || {})[typeof mod === 'string' ? mod : mod.nombre]?.fecha).map(mod => ({ nombre: typeof mod === 'string' ? mod : mod.nombre, duracion: typeof mod === 'string' ? 60 : (mod.duracion || 60) }));
  const modulosPendientes = curso.modulos.filter(mod => !(reserva?.modulosEstado || {})[typeof mod === 'string' ? mod : mod.nombre]?.fecha);

  const handleVolver = () => navigate(esInstructor ? '/instructor' : '/portal-reservas');
  const handleEmergencia = () => { showToast('Emergencia reportada.', 'error'); if (reserva && saveReserva) saveReserva({ ...reserva, emergencia: { timestamp: Date.now(), reportadoPor: rol } }); };
  const handleCompletarManualmente = async () => {
    setMostrarModalCompletar(false);
    showToast('Registrando curso completado...', 'info');
    const resultado = await completarCursoManualmente();
    if (resultado.success && resultado.modulosCompletados > 0) {
      showToast(`✅ Curso completado manualmente. ${resultado.modulosCompletados} módulos registrados.`, 'success');
    } else if (resultado.success && resultado.modulosCompletados === 0) {
      showToast('No había módulos pendientes por completar', 'info');
    } else {
      showToast('Error al completar el curso manualmente', 'error');
    }
  };

  if (!reserva) return (<AppShell bgColor="bg-gray-50"><div className="flex items-center justify-center min-h-full"><Spinner message="Cargando aula..." /></div></AppShell>);

  if (reserva.estadoPago !== 'Aprobado' && esEstudiante) {
    return (
      <AppShell bgColor="bg-gray-50">
        <div className="flex flex-col items-center justify-center min-h-full p-6 text-center">
          <Award size={48} className="text-yellow-500 mb-4" />
          <h2 className="text-xl font-black text-gray-900 mb-2">Acceso Restringido</h2>
          <p className="text-sm text-gray-500 mb-6">Tu pago está pendiente de aprobación. Un administrador validará tu pago pronto.</p>
          <Button onClick={() => navigate('/portal-reservas')} variant="primary">Volver al Panel</Button>
        </div>
      </AppShell>
    );
  }

  const header = (
    <div className="bg-gradient-to-r from-gray-900 via-slate-800 to-gray-900 text-white px-4 py-2.5 flex items-center gap-3 relative overflow-hidden shadow-lg rounded-b-2xl">
      <div className="absolute -top-4 -right-4 w-16 h-16 bg-blue-500/20 rounded-full blur-xl"></div>
      <button onClick={handleVolver} className="p-1.5 bg-white/10 rounded-full relative z-10"><ChevronLeft size={18} className="text-white" /></button>
      <h2 className="text-base font-black uppercase tracking-widest flex-1 relative z-10">Aula Virtual</h2>
      <button onClick={toggleAlertaSonora} className="p-1.5 bg-white/10 rounded-full relative z-10" title={alertaSonora ? 'Desactivar sonido' : 'Activar sonido'}>
        {alertaSonora ? <Volume2 size={18} className="text-white" /> : <VolumeX size={18} className="text-white" />}
      </button>
      <button onClick={handleEmergencia} className="p-1.5 bg-red-500/60 rounded-full relative z-10"><Siren size={18} className="text-white" /></button>
    </div>
  );

  const footer = (
    <div className="bg-white border-t border-gray-200 px-4 py-3 flex justify-between items-center shadow-md">
      {[{ icon: Library, label: 'Material', action: () => setMostrarMaterial(true) }, { icon: MessageCircle, label: 'Chat', action: () => showToast('Chat próximamente', 'info') }, { icon: Siren, label: 'Emergencia', action: handleEmergencia }].map((btn, i) => (
        <button key={i} onClick={btn.action} className="flex flex-col items-center gap-1 text-gray-500 hover:text-blue-600 transition-colors"><btn.icon size={20} /><span className="text-[10px] font-bold">{btn.label}</span></button>
      ))}
    </div>
  );

  return (
    <AppShell header={header} footer={footer}>
      <div className="p-4 space-y-3">
        <div className="rounded-xl shadow-xl shadow-blue-600/20 overflow-hidden">
          <div className="bg-blue-600 text-white p-3 relative">
            <div className="flex items-center gap-2 mb-2"><Bike size={18} className="text-blue-200" /><p className="text-sm font-bold uppercase tracking-widest flex-1">{curso.nombre || 'Curso'}</p></div>
            <div className="grid grid-cols-2 gap-2 text-sm mb-2"><div className="flex items-center gap-1.5"><MapPin size={14} className="text-blue-300" /><span className="font-bold">Sede: {sede?.nombre || 'N/A'}</span></div><div className="flex items-center gap-1.5"><User size={14} className="text-blue-300" /><span className="font-bold truncate">{esEstudiante ? `Inst: ${inst?.nombre || 'N/A'}` : `Alumno: ${reserva.nombre || 'N/A'}`}</span></div></div>
            <div className="absolute top-2 right-2 bg-white/20 rounded-lg px-2 py-1 text-center"><p className="text-lg font-black leading-none">{sello.mes}</p><p className="text-[10px] font-bold leading-none">{sello.anio}</p></div>
            <div className="bg-gray-800/50 p-3 rounded-xl text-xs">
              <div className="flex items-start gap-3">
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-2"><Calendar size={12} className="text-blue-300" /><span className="font-bold">Días: {formatearRangoCorto(reserva.fecha, reserva.fecha2)}</span></div>
                  <div className="flex items-center gap-2"><Clock size={12} className="text-blue-300" /><span className="font-bold">Hora: {horaInicio} - {horaFin}</span></div>
                  <div className="flex items-center gap-2"><Bike size={12} className="text-blue-300" /><span className="font-bold">{reserva.traeMoto === 'Sí' ? 'Propia' : 'Escuela'} · {reserva.tipoMoto}</span></div>
                </div>
                <RelojSesion
                  generalSegundos={sgta.generalSegundos}
                  pausaActiva={sgta.pausaActiva}
                  pausaMotivo={sgta.pausaMotivo}
                  tiempoMaximoCurso={tiempoMaximoCurso}
                  tiempoConsumido={tiempoConsumido}
                  conexionPerdida={conexionPerdida}
                  tiempoRestanteCurso={sgta.tiempoRestanteCurso}
                />
              </div>
              <div className="flex items-end justify-between mt-2">
                <FilaTiempo 
                  diaActual={sgta.diaActual} 
                  generalSegundos={sgta.generalSegundos}
                  pausaTotal={sgta.pausaTotalAcumulada}
                  tiempoExtra={sgta.reservaActiva ? sgta.reservaRestante : 0}
                  tiempoEfectivo={sgta.tiempoEfectivo}
                />
                <span className="text-[10px] font-bold text-white/70">{tiempoRestanteCurso} min rest.</span>
              </div>
            </div>
            <div className="bg-gray-100 -mx-3 -mb-3 px-3 py-2.5 mt-2 border-t border-blue-400/30">
              <div className="flex items-center justify-between mb-1"><span className="text-xs text-gray-700">Avance Académico</span><span className="text-xs font-bold text-blue-600">{cantCompletados}/{totalModulos}</span></div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden"><div className="h-2 rounded-full transition-all duration-500" style={{ width: totalModulos > 0 ? `${(cantCompletados / totalModulos) * 100}%` : '0%', background: 'repeating-linear-gradient(-45deg, #4ade80, #4ade80 6px, #22c55e 6px, #22c55e 12px)', animation: 'progress-stripes 1s linear infinite' }}></div></div>
            </div>
          </div>
        </div>

        {todosCompletados && sgta.pausaTotalAcumulada > 0 && (
          <ReservaPanel tiempoReservaSegundos={sgta.pausaTotalAcumulada} />
        )}

        {todosCompletados && (
          <ResumenFinal
            modulos={curso.modulos}
            modulosEstado={reserva.modulosEstado || {}}
          />
        )}
        {esInstructor && !todosCompletados && sgta.generalActivo && !sgta.pausaActiva && !sgta.reservaActiva && (<Button type="button" onClick={() => setMostrarSelectorPausa(true)} variant="outline" className="!py-2 !text-xs" icon={Pause}>Pausar Sesión</Button>)}
        {esInstructor && sgta.puedeReanudarSesion && (<Button type="button" onClick={reanudarSesion} variant="success" className="!py-2 !text-xs">Reanudar Sesión</Button>)}
        {esInstructor && puedeUsarReserva && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-start gap-3 mb-3">
              <Timer className="w-6 h-6 text-purple-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-bold text-purple-900 mb-1">Reserva disponible</h4>
                <p className="text-sm text-purple-800">
                  El tiempo de sesión se agotó, pero tienes {Math.floor(sgta.pausaTotalAcumulada / 60)} minutos de reserva.
                </p>
              </div>
            </div>
            <button
              onClick={activarReserva}
              className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors"
            >
              Usar Reserva ({Math.floor(sgta.pausaTotalAcumulada / 60)} min)
            </button>
          </div>
        )}
        {esInstructor && reservaActivaOPausada && (
          <ReservaActivaPanel
            reservaRestante={sgta.reservaRestante}
            reservaActiva={sgta.reservaActiva}
            onPausar={pausarReserva}
            onReanudar={reanudarReserva}
            onDetener={detenerReserva}
          />
        )}
        {esEstudiante && sgta.pausaActiva && <BannerPausa motivo={sgta.pausaMotivo} tiempo={sgta.pausaSegundos} soloLectura />}

        {modulosCompletados.length > 0 && (<CarruselModulos modulos={modulosCompletados} onToggle={esInstructor ? toggleModulo : null} />)}
        {modulosPendientes.length > 0 && (<div className="space-y-1.5">{modulosPendientes.map((mod, i) => { const nombreModulo = typeof mod === 'string' ? mod : mod.nombre; const duracionModulo = typeof mod === 'string' ? 60 : (mod.duracion || 60); const esModuloActivo = sgta.moduloEnProgreso === nombreModulo && (sgta.moduloActivo || sgta._moduloExcedido); const esPrimerPendiente = i === 0; const puedeFinalizarEste = esInstructor && esModuloActivo; const puedeIniciarEste = esInstructor && esPrimerPendiente && !sgta.pausaActiva && sgta.puedeIniciarModulo && !tiempoAgotado; const interactuable = puedeFinalizarEste || puedeIniciarEste; let estado = esPrimerPendiente ? (sgta._moduloExcedido && sgta.moduloEnProgreso === nombreModulo ? 'excedido' : (esModuloActivo ? 'activo' : 'pendiente')) : 'bloqueado'; if (sgta._moduloExcedido && sgta.moduloEnProgreso === nombreModulo) estado = 'excedido'; const pctTiempo = esModuloActivo ? Math.min(100, ((sgta.moduloSegundos || 0) / (duracionModulo * 60)) * 100) : 0; const esReceso = esModuloActivo && (duracionModulo * 60 - (sgta.moduloSegundos || 0)) <= 300 && !sgta._moduloExcedido; return (<ModuloItem key={i} nombre={nombreModulo} duracion={duracionModulo} estado={estado} onClick={() => interactuable && toggleModulo(nombreModulo)} disabled={!interactuable} mostrarBarra={esModuloActivo} progreso={esModuloActivo ? pctTiempo : 0} tiempoActual={esModuloActivo ? sgta.moduloSegundos || 0 : 0} esReceso={esReceso} tiempoExcedido={sgta._moduloExcedido && sgta.moduloEnProgreso === nombreModulo} />); })}</div>)}
        {mostrarBotonCompletarManual && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="flex-shrink-0">
                <CheckCircle className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-blue-900 mb-1">Tiempo agotado</h4>
                <p className="text-sm text-blue-800">
                  El tiempo de sesión se agotó, pero puedes registrar manualmente que el estudiante completó el curso.
                </p>
              </div>
            </div>
            <button
              onClick={() => setMostrarModalCompletar(true)}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Registrar curso completado
            </button>
          </div>
        )}
        {todosCompletados && esEstudiante && (
          <Button 
            type="button" 
            onClick={() => navigate('/portal-reservas?tab=cursos')} 
            variant="primary" 
            className="mt-3 w-full"
            icon={BookOpen}
          >
            Ver otros cursos
          </Button>
        )}
      </div>
      {mostrarSelectorPausa && (<div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-2xl shadow-2xl max-w-xs w-full p-5">{!mostrandoInputOtro ? (<><div className="flex items-center justify-between mb-4"><h3 className="font-black text-gray-900">Motivo de pausa</h3><button onClick={() => setMostrarSelectorPausa(false)} className="p-1 bg-gray-100 rounded-full"><X size={16} /></button></div><div className="space-y-2">{MOTIVOS_PAUSA.map(m => (<button key={m.id} onClick={() => { if (m.id === 'otro') setMostrandoInputOtro(true); else { pausarSesion(m.label); setMostrarSelectorPausa(false); } }} className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"><m.icon size={18} className="text-gray-500" /><span className="font-bold text-sm">{m.label}</span></button>))}</div></>) : (<><div className="flex items-center justify-between mb-4"><h3 className="font-black text-gray-900">Especificar motivo</h3><button onClick={() => setMostrandoInputOtro(false)} className="p-1 bg-gray-100 rounded-full"><X size={16} /></button></div><div className="space-y-3"><input type="text" value={otroMotivoTexto} onChange={e => setOtroMotivoTexto(e.target.value)} placeholder="¿Qué ocurrió?" className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl py-2.5 px-3 text-sm outline-none focus:border-blue-500" /><Button type="button" onClick={() => { if (otroMotivoTexto.trim()) { pausarSesion(otroMotivoTexto.trim()); setMostrarSelectorPausa(false); setMostrandoInputOtro(false); } }} variant="dark" disabled={!otroMotivoTexto.trim()}>Confirmar</Button></div></>)}</div></div>)}
      {mostrarModalCompletar && (
        <ModalConfirmacion
          titulo="Registrar curso completado manualmente"
          mensaje={
            <div>
              <p className="mb-3 text-gray-700">
                Esta acción marcará <strong>{modulosPendientesCantidad} módulos pendientes</strong> como completados sin registrar tiempo real.
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-3">
                <p className="text-sm text-yellow-800 font-medium mb-2">⚠️ Advertencia:</p>
                <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
                  <li>No se registrará el tiempo real de cada módulo</li>
                  <li>Esta acción es irreversible</li>
                  <li>Úsela solo si el estudiante realmente completó el curso</li>
                </ul>
              </div>
              <p className="text-sm text-gray-600">¿Confirma que el estudiante completó todos los módulos pendientes?</p>
            </div>
          }
          onConfirm={handleCompletarManualmente}
          onCancel={() => setMostrarModalCompletar(false)}
        />
      )}
      {modalConfirmacion && <ModalConfirmacion titulo={modalConfirmacion.titulo} mensaje={modalConfirmacion.mensaje} onConfirm={modalConfirmacion.onConfirm} onCancel={modalConfirmacion.onCancel} />}
      {mostrarMaterial && (<div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 max-h-[80vh] overflow-y-auto"><div className="flex items-center justify-between mb-4"><h3 className="font-black text-gray-900">Material de Apoyo</h3><button onClick={() => setMostrarMaterial(false)} className="p-1 bg-gray-100 rounded-full"><X size={16} /></button></div><div className="flex gap-2 mb-4">{['senales','leyes','glosario'].map(s => (<button key={s} onClick={() => setSeccionMaterial(s)} className={`px-3 py-1.5 rounded-full text-xs font-bold ${seccionMaterial === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{s.charAt(0).toUpperCase() + s.slice(1)}</button>))}</div><div className="space-y-3">{MATERIAL_APOYO[seccionMaterial]?.map((item, i) => (<div key={i} className="bg-gray-50 p-3 rounded-xl"><p className="font-bold text-sm text-gray-900">{item.nombre || item.titulo || item.termino}</p><p className="text-xs text-gray-600">{item.descripcion || item.texto || item.definicion}</p></div>))}</div></div></div>)}
    </AppShell>
  );
}
