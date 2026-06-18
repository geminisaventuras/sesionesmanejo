// @build: 2026-06-20.01-30-00 | id: AULA-CIRCULAR-FIX | desc: Eliminado error circular JSON, campos específicos en saveReserva
import { useContext, useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppContext } from '../context/AppContextValue';
import { Button, Spinner } from '../components/UI';
import { useToast } from '../modules/shared/components/ToastProvider';
import AppShell from '../modules/shared/components/AppShell';
import RelojSesion from '../modules/shared/components/RelojSesion';
import FilaTiempo from '../modules/shared/components/FilaTiempo';
import BannerPausa from '../modules/shared/components/BannerPausa';
import ModuloItem from '../modules/shared/components/ModuloItem';
import CarruselModulos from '../modules/shared/components/CarruselModulos';
import { useSessionTimer } from '../modules/sesiones/hooks/useSessionTimer';
import { MOTIVOS_PAUSA } from '../modules/sesiones/constants';
import { formatearRangoCorto, obtenerMesCortoYAnio } from '../modules/shared/utils/fechas';
import {
  ChevronLeft, Calendar, Clock, MapPin, Bike, BookOpen, Award, Pause, User,
  Library, MessageCircle, Siren, X
} from 'lucide-react';

const MATERIAL_APOYO = {
  senales: [
    { nombre: 'Pare', descripcion: 'Detenerse completamente antes de la intersección.' },
    { nombre: 'Ceda el Paso', descripcion: 'Reducir velocidad y ceder el paso.' },
    { nombre: 'Velocidad Máxima', descripcion: 'Límite de velocidad permitido.' }
  ],
  leyes: [
    { titulo: 'Artículo 154', texto: 'Los conductores deben mantener la distancia de seguridad.' },
    { titulo: 'Artículo 169', texto: 'Está prohibido el uso de dispositivos móviles al conducir.' }
  ],
  glosario: [
    { termino: 'ABS', definicion: 'Sistema de frenado antibloqueo.' },
    { termino: 'Clutch', definicion: 'Embrague del vehículo.' }
  ]
};

export default function AulaVirtualView() {
  const { user, reservas, cursos, horarios, instructores, sedes, saveReserva } = useContext(AppContext);
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { reservaId } = useParams();

  const [mostrarSelectorPausa, setMostrarSelectorPausa] = useState(false);
  const [mostrandoInputOtro, setMostrandoInputOtro] = useState(false);
  const [otroMotivoTexto, setOtroMotivoTexto] = useState('');
  const [mostrarMaterial, setMostrarMaterial] = useState(false);
  const [seccionMaterial, setSeccionMaterial] = useState('senales');
  const [conexionPerdida, setConexionPerdida] = useState(false);

  const rol = user?.role;
  const esInstructor = rol === 'instructor' || rol === 'admin';
  const esEstudiante = rol === 'estudiante';

  const reserva = useMemo(() => {
    if (!reservaId) return null;
    return (reservas || []).find(r => String(r.id) === String(reservaId));
  }, [reservas, reservaId]);

  const curso = useMemo(() => {
    if (!reserva) return { nombre: '', modulos: [], duracionTotal: 240 };
    return (cursos || []).find(c => String(c.id) === String(reserva.cursoId)) || { nombre: '', modulos: [], duracionTotal: 240 };
  }, [cursos, reserva]);

  const hor = useMemo(() => reserva ? (horarios || []).find(h => String(h.id) === String(reserva.horaId)) : null, [horarios, reserva]);
  const sede = useMemo(() => reserva ? (sedes || []).find(s => String(s.id) === String(reserva.sedeId)) : null, [sedes, reserva]);
  const inst = useMemo(() => reserva ? (instructores || []).find(i => String(i.id) === String(reserva.instructorId)) : null, [instructores, reserva]);

  const { sgta, toggleModulo, pausarSesion, reanudarSesion } = useSessionTimer(reserva, saveReserva, showToast);

  useEffect(() => {
    if (reserva) { setConexionPerdida(false); return; }
    const timeout = setTimeout(() => { if (!reserva) setConexionPerdida(true); }, 15000);
    return () => clearTimeout(timeout);
  }, [reserva]);

  const cantCompletados = Object.keys(reserva?.modulosEstado || {}).filter(k => (reserva?.modulosEstado || {})[k]?.fecha).length;
  const totalModulos = curso.modulos.length;
  const todosCompletados = totalModulos > 0 && cantCompletados >= totalModulos;
  const horaInicio = hor?.label ? hor.label.split('-')[0]?.trim() : '--:--';
  const horaFin = hor?.label ? hor.label.split('-')[1]?.trim() : '--:--';
  const sello = obtenerMesCortoYAnio(reserva?.fecha);
  const tiempoMaximoCurso = curso.duracionTotal || 240;
  const tiempoConsumido = Object.values(reserva?.modulosEstado || {}).reduce((acc, mod) => acc + (mod.duracion || 0) + (mod.duracionExtra || 0), 0);
  const tiempoRestanteCurso = Math.max(0, tiempoMaximoCurso - tiempoConsumido);

  const modulosCompletados = curso.modulos.filter(mod => {
    const nombre = typeof mod === 'string' ? mod : mod.nombre;
    return (reserva?.modulosEstado || {})[nombre]?.fecha;
  }).map(mod => ({ nombre: typeof mod === 'string' ? mod : mod.nombre, duracion: typeof mod === 'string' ? 60 : (mod.duracion || 60) }));

  const modulosPendientes = curso.modulos.filter(mod => {
    const nombre = typeof mod === 'string' ? mod : mod.nombre;
    return !(reserva?.modulosEstado || {})[nombre]?.fecha;
  });

  const handleVolver = () => {
    if (esInstructor) navigate('/instructor');
    else navigate('/portal-reservas');
  };

  const handleEmergencia = () => {
    showToast('Emergencia reportada. El administrador ha sido notificado.', 'error');
    if (reserva && saveReserva) {
      saveReserva({ emergencia: { timestamp: Date.now(), reportadoPor: rol } });
    }
  };

  if (!reserva) {
    return (
      <AppShell bgColor="bg-gray-50">
        <div className="flex items-center justify-center min-h-full">
          <Spinner message="Cargando aula..." />
        </div>
      </AppShell>
    );
  }

  const header = (
    <div className="bg-gradient-to-r from-gray-900 via-slate-800 to-gray-900 text-white px-4 py-2.5 flex items-center gap-3 relative overflow-hidden shadow-lg rounded-b-2xl">
      <div className="absolute -top-4 -right-4 w-16 h-16 bg-blue-500/20 rounded-full blur-xl"></div>
      <button onClick={handleVolver} className="p-1.5 bg-white/10 rounded-full relative z-10">
        <ChevronLeft size={18} className="text-white" />
      </button>
      <h2 className="text-base font-black uppercase tracking-widest flex-1 relative z-10">Aula Virtual</h2>
      <button onClick={handleEmergencia} className="p-1.5 bg-red-500/60 rounded-full relative z-10" title="Emergencia">
        <Siren size={18} className="text-white" />
      </button>
    </div>
  );

  const footer = (
    <div className="bg-white border-t border-gray-200 px-4 py-3 flex justify-between items-center shadow-md">
      <button onClick={() => setMostrarMaterial(true)} className="flex flex-col items-center gap-1 text-gray-500 hover:text-blue-600 transition-colors">
        <Library size={20} />
        <span className="text-[10px] font-bold">Material</span>
      </button>
      <button onClick={() => showToast('Chat disponible próximamente', 'info')} className="flex flex-col items-center gap-1 text-gray-500 hover:text-blue-600 transition-colors">
        <MessageCircle size={20} />
        <span className="text-[10px] font-bold">Chat</span>
      </button>
      <button onClick={handleEmergencia} className="flex flex-col items-center gap-1 text-red-500 hover:text-red-700 transition-colors">
        <Siren size={20} />
        <span className="text-[10px] font-bold">Emergencia</span>
      </button>
    </div>
  );

  return (
    <AppShell header={header} footer={footer}>
      <div className="p-4 space-y-3">
        {/* Tarjeta Azul */}
        <div className="rounded-xl shadow-xl shadow-blue-600/20 overflow-hidden">
          <div className="bg-blue-600 text-white p-3 relative">
            <div className="flex items-center gap-2 mb-2">
              <Bike size={18} className="text-blue-200" />
              <p className="text-sm font-bold uppercase tracking-widest flex-1">{curso.nombre || 'Curso'}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm mb-2">
              <div className="flex items-center gap-1.5"><MapPin size={14} className="text-blue-300" /><span className="font-bold">Sede: {sede?.nombre || 'N/A'}</span></div>
              <div className="flex items-center gap-1.5"><User size={14} className="text-blue-300" /><span className="font-bold truncate">Alumno: {reserva.nombre || 'N/A'}</span></div>
            </div>
            <div className="absolute top-2 right-2 bg-white/20 rounded-lg px-2 py-1 text-center">
              <p className="text-lg font-black leading-none">{sello.mes}</p>
              <p className="text-[10px] font-bold leading-none">{sello.anio}</p>
            </div>
            <div className="bg-gray-800/50 p-3 rounded-xl text-xs">
              <div className="flex items-start gap-3">
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-2"><Calendar size={12} className="text-blue-300" /><span className="font-bold">Días: {formatearRangoCorto(reserva.fecha, reserva.fecha2)}</span></div>
                  <div className="flex items-center gap-2"><Clock size={12} className="text-blue-300" /><span className="font-bold">Hora: {horaInicio} - {horaFin}</span></div>
                  <div className="flex items-center gap-2"><Bike size={12} className="text-blue-300" /><span className="font-bold">{reserva.traeMoto === 'Sí' ? 'Propia' : 'Escuela'} · {reserva.tipoMoto}</span></div>
                </div>
                <RelojSesion generalSegundos={sgta.generalSegundos} pausaActiva={sgta.pausaActiva} pausaMotivo={sgta.pausaMotivo} tiempoMaximoCurso={tiempoMaximoCurso} tiempoConsumido={tiempoConsumido} conexionPerdida={conexionPerdida} />
              </div>
              <div className="flex items-end justify-between mt-2">
                <FilaTiempo diaActual={sgta.diaActual} generalSegundos={sgta.generalSegundos} pausaTotal={sgta.pausaTotalAcumulada + (sgta.pausaActiva ? sgta.pausaSegundos : 0)} tiempoExtra={sgta.tiempoExtraAcumulado} />
                <span className="text-[10px] font-bold text-white/70">{tiempoRestanteCurso} min rest.</span>
              </div>
            </div>
            <div className="bg-gray-100 -mx-3 -mb-3 px-3 py-2.5 mt-2 border-t border-blue-400/30">
              <div className="flex items-center justify-between mb-1"><span className="text-xs text-gray-700">Avance Académico</span><span className="text-xs font-bold text-blue-600">{cantCompletados}/{totalModulos}</span></div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div className="h-2 rounded-full transition-all duration-500" style={{ width: totalModulos > 0 ? `${(cantCompletados / totalModulos) * 100}%` : '0%', background: 'repeating-linear-gradient(-45deg, #4ade80, #4ade80 6px, #22c55e 6px, #22c55e 12px)', animation: 'progress-stripes 1s linear infinite' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Controles de Instructor */}
        {esInstructor && !todosCompletados && sgta.generalActivo && !sgta.pausaActiva && (
          <Button type="button" onClick={() => setMostrarSelectorPausa(true)} variant="outline" className="!py-2 !text-xs" icon={Pause}>Pausar Sesión</Button>
        )}
        {esInstructor && sgta.pausaActiva && (
          <Button type="button" onClick={reanudarSesion} variant="success" className="!py-2 !text-xs">Reanudar Sesión</Button>
        )}
        {esEstudiante && sgta.pausaActiva && <BannerPausa motivo={sgta.pausaMotivo} tiempo={sgta.pausaSegundos} soloLectura />}

        {/* Carrusel de Completados */}
        {modulosCompletados.length > 0 && (
          <CarruselModulos modulos={modulosCompletados} onToggle={esInstructor ? toggleModulo : null} />
        )}

        {/* Módulos Pendientes */}
        {modulosPendientes.length > 0 && (
          <div className="space-y-1.5">
            {modulosPendientes.map((mod, i) => {
              const nombreModulo = typeof mod === 'string' ? mod : mod.nombre;
              const duracionModulo = typeof mod === 'string' ? 60 : (mod.duracion || 60);
              const esModuloActivo = esInstructor && sgta.moduloEnProgreso === nombreModulo && sgta.moduloActivo;
              const esPrimerPendiente = i === 0;
              const interactuable = esInstructor && esPrimerPendiente && !sgta.pausaActiva;
              let estado = esPrimerPendiente ? (esModuloActivo ? 'activo' : 'pendiente') : 'bloqueado';
              const pctTiempo = esModuloActivo ? Math.min(100, ((sgta.moduloSegundos || 0) / (duracionModulo * 60)) * 100) : 0;
              const esReceso = esModuloActivo && (duracionModulo * 60 - (sgta.moduloSegundos || 0)) <= 300;
              return (
                <ModuloItem key={i} nombre={nombreModulo} duracion={duracionModulo} estado={estado}
                  onClick={() => interactuable && toggleModulo(nombreModulo)} disabled={!interactuable}
                  mostrarBarra={esModuloActivo} progreso={pctTiempo} tiempoActual={sgta.moduloSegundos || 0} esReceso={esReceso} />
              );
            })}
          </div>
        )}

        {todosCompletados && <Button type="button" variant="success" className="mt-3" icon={Award}>Curso Completado</Button>}
      </div>

      {/* Modal de Pausa (con input "Otro") */}
      {mostrarSelectorPausa && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xs w-full p-5">
            {!mostrandoInputOtro ? (
              <>
                <div className="flex items-center justify-between mb-4"><h3 className="font-black text-gray-900">Motivo de pausa</h3><button onClick={() => setMostrarSelectorPausa(false)} className="p-1 bg-gray-100 rounded-full"><X size={16} /></button></div>
                <div className="space-y-2">
                  {MOTIVOS_PAUSA.map(m => (
                    <button key={m.id} onClick={() => {
                      if (m.id === 'otro') { setMostrandoInputOtro(true); }
                      else { pausarSesion(m.label); setMostrarSelectorPausa(false); }
                    }} className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-left">
                      <m.icon size={18} className="text-gray-500" /><span className="font-bold text-sm">{m.label}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4"><h3 className="font-black text-gray-900">Especificar motivo</h3><button onClick={() => setMostrandoInputOtro(false)} className="p-1 bg-gray-100 rounded-full"><X size={16} /></button></div>
                <div className="space-y-3">
                  <input type="text" value={otroMotivoTexto} onChange={e => setOtroMotivoTexto(e.target.value)} placeholder="¿Qué ocurrió?" className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl py-2.5 px-3 text-sm outline-none focus:border-blue-500" />
                  <Button type="button" onClick={() => { if (otroMotivoTexto.trim()) { pausarSesion(otroMotivoTexto.trim()); setMostrarSelectorPausa(false); setMostrandoInputOtro(false); } }} variant="dark" disabled={!otroMotivoTexto.trim()}>Confirmar</Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal de Material de Apoyo */}
      {mostrarMaterial && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4"><h3 className="font-black text-gray-900">Material de Apoyo</h3><button onClick={() => setMostrarMaterial(false)} className="p-1 bg-gray-100 rounded-full"><X size={16} /></button></div>
            <div className="flex gap-2 mb-4">
              <button onClick={() => setSeccionMaterial('senales')} className={`px-3 py-1.5 rounded-full text-xs font-bold ${seccionMaterial === 'senales' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Señales</button>
              <button onClick={() => setSeccionMaterial('leyes')} className={`px-3 py-1.5 rounded-full text-xs font-bold ${seccionMaterial === 'leyes' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Leyes</button>
              <button onClick={() => setSeccionMaterial('glosario')} className={`px-3 py-1.5 rounded-full text-xs font-bold ${seccionMaterial === 'glosario' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Glosario</button>
            </div>
            <div className="space-y-3">
              {seccionMaterial === 'senales' && MATERIAL_APOYO.senales.map((s, i) => (
                <div key={i} className="bg-gray-50 p-3 rounded-xl"><p className="font-bold text-sm text-gray-900">{s.nombre}</p><p className="text-xs text-gray-600">{s.descripcion}</p></div>
              ))}
              {seccionMaterial === 'leyes' && MATERIAL_APOYO.leyes.map((l, i) => (
                <div key={i} className="bg-gray-50 p-3 rounded-xl"><p className="font-bold text-sm text-gray-900">{l.titulo}</p><p className="text-xs text-gray-600">{l.texto}</p></div>
              ))}
              {seccionMaterial === 'glosario' && MATERIAL_APOYO.glosario.map((g, i) => (
                <div key={i} className="bg-gray-50 p-3 rounded-xl"><p className="font-bold text-sm text-gray-900">{g.termino}</p><p className="text-xs text-gray-600">{g.definicion}</p></div>
              ))}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
