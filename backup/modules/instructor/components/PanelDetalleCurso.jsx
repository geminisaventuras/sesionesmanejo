import { memo, useState } from 'react';
import { Button } from '../../shared/components/UI';
import RelojSesion from '../../shared/components/RelojSesion';
import FilaTiempo from '../../shared/components/FilaTiempo';
import BannerPausa from '../../shared/components/BannerPausa';
import ModuloItem from '../../shared/components/ModuloItem';
import CarruselModulos from '../../shared/components/CarruselModulos';
import { useSessionTimer } from '../../sesiones/hooks/useSessionTimer';
import { formatearRangoCorto, obtenerMesCortoYAnio } from '../../shared/utils/fechas';
import { Calendar, Clock, MapPin, Bike, BookOpen, Award, Pause, User } from 'lucide-react';
import { MOTIVOS_PAUSA } from '../../sesiones/constants';

/**
 * Panel de detalle del curso. Contiene la tarjeta azul, reloj, módulos y lógica de pausa.
 * Utiliza el hook useSessionTimer para toda la lógica de negocio y temporización.
 */
const PanelDetalleCurso = memo(({ reserva, curso, horario, sede, instructor, saveReserva, showToast }) => {
  const { sgta, toggleModulo, pausarSesion, reanudarSesion } = useSessionTimer(reserva, saveReserva, showToast);
  const [mostrarSelectorPausa, setMostrarSelectorPausa] = useState(false);

  const cantCompletados = Object.keys(reserva.modulosEstado || {}).filter(k => (reserva.modulosEstado || {})[k]?.fecha).length;
  const totalModulos = curso.modulos.length;
  const todosCompletados = totalModulos > 0 && cantCompletados >= totalModulos;
  const horaInicio = horario?.label ? horario.label.split('-')[0]?.trim() : '--:--';
  const horaFin = horario?.label ? horario.label.split('-')[1]?.trim() : '--:--';
  const sello = obtenerMesCortoYAnio(reserva.fecha);
  const tiempoMaximoCurso = curso.duracionTotal || 240;
  const tiempoConsumido = Object.values(reserva.modulosEstado || {}).reduce((acc, mod) => acc + (mod.duracion || 0) + (mod.duracionExtra || 0), 0);
  const tiempoRestanteCurso = Math.max(0, tiempoMaximoCurso - tiempoConsumido);

  const modulosCompletados = curso.modulos.filter(mod => {
    const nombre = typeof mod === 'string' ? mod : mod.nombre;
    return (reserva.modulosEstado || {})[nombre]?.fecha;
  }).map(mod => ({ nombre: typeof mod === 'string' ? mod : mod.nombre, duracion: typeof mod === 'string' ? 60 : (mod.duracion || 60) }));
  
  const modulosPendientes = curso.modulos.filter(mod => {
    const nombre = typeof mod === 'string' ? mod : mod.nombre;
    return !(reserva.modulosEstado || {})[nombre]?.fecha;
  });

  return (
    <div className="space-y-3">
      <div className="rounded-xl shadow-xl shadow-blue-600/20 overflow-hidden">
        <div className="bg-blue-600 text-white p-3 relative">
          <div className="flex items-center gap-2 mb-2"><Bike size={18} className="text-blue-200" /><p className="text-sm font-bold uppercase tracking-widest flex-1">{curso.nombre || 'Curso'}</p></div>
          <div className="grid grid-cols-2 gap-2 text-sm mb-2"><div className="flex items-center gap-1.5"><MapPin size={14} className="text-blue-300" /><span className="font-bold">Sede: {sede?.nombre || 'N/A'}</span></div><div className="flex items-center gap-1.5"><User size={14} className="text-blue-300" /><span className="font-bold truncate">Alumno: {reserva.nombre || 'N/A'}</span></div></div>
          <div className="absolute top-2 right-2 bg-white/20 rounded-lg px-2 py-1 text-center"><p className="text-lg font-black leading-none">{sello.mes}</p><p className="text-[10px] font-bold leading-none">{sello.anio}</p></div>
          <div className="bg-gray-800/50 p-3 rounded-xl text-xs">
            <div className="flex items-start gap-3">
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center gap-2"><Calendar size={12} className="text-blue-300" /><span className="font-bold">Días: {formatearRangoCorto(reserva.fecha, reserva.fecha2)}</span></div>
                <div className="flex items-center gap-2"><Clock size={12} className="text-blue-300" /><span className="font-bold">Hora: {horaInicio} - {horaFin}</span></div>
                <div className="flex items-center gap-2"><Bike size={12} className="text-blue-300" /><span className="font-bold">{reserva.traeMoto === 'Sí' ? 'Propia' : 'Escuela'} · {reserva.tipoMoto}</span></div>
                <FilaTiempo diaActual={sgta.diaActual} generalSegundos={sgta.generalSegundos} pausaTotal={sgta.pausaTotalAcumulada + (sgta.pausaActiva ? sgta.pausaSegundos : 0)} tiempoExtra={sgta.tiempoExtraAcumulado} />
              </div>
              <RelojSesion generalSegundos={sgta.generalSegundos} pausaActiva={sgta.pausaActiva} pausaMotivo={sgta.pausaMotivo} tiempoMaximoCurso={tiempoMaximoCurso} tiempoConsumido={tiempoConsumido} />
            </div>
            <div className="flex items-end justify-between mt-2"><span className="text-[10px] font-bold text-white/70">{tiempoRestanteCurso} min rest.</span></div>
          </div>
          <div className="bg-gray-100 -mx-3 -mb-3 px-3 py-2.5 mt-2 border-t border-blue-400/30">
            <div className="flex items-center justify-between mb-1"><span className="text-xs text-gray-700">Avance Académico</span><span className="text-xs font-bold text-blue-600">{cantCompletados}/{totalModulos}</span></div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden"><div className="h-2 rounded-full transition-all duration-500" style={{ width: totalModulos > 0 ? `${(cantCompletados / totalModulos) * 100}%` : '0%', background: 'repeating-linear-gradient(-45deg, #4ade80, #4ade80 6px, #22c55e 6px, #22c55e 12px)', animation: 'progress-stripes 1s linear infinite' }}></div></div>
          </div>
        </div>
      </div>
      {!todosCompletados && sgta.generalActivo && !sgta.pausaActiva && (
        <Button type="button" onClick={() => setMostrarSelectorPausa(true)} variant="outline" className="!py-2 !text-xs" icon={Pause}>Pausar Sesión</Button>
      )}
      {sgta.pausaActiva && <BannerPausa motivo={sgta.pausaMotivo} tiempo={sgta.pausaSegundos} onReanudar={reanudarSesion} />}
      {modulosCompletados.length > 0 && <CarruselModulos modulos={modulosCompletados} onToggle={toggleModulo} />}
      {modulosPendientes.length > 0 && (
        <div className="space-y-1.5">
          {modulosPendientes.map((mod, i) => {
            const nombreModulo = typeof mod === 'string' ? mod : mod.nombre;
            const duracionModulo = typeof mod === 'string' ? 60 : (mod.duracion || 60);
            const esModuloActivo = sgta.moduloEnProgreso === nombreModulo && sgta.moduloActivo;
            const esPrimerPendiente = i === 0;
            const interactuable = esPrimerPendiente && !sgta.pausaActiva;
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
      {todosCompletados && <Button type="button" onClick={() => { /* completarCurso */ }} variant="success" className="mt-3" icon={Award}>Completar Curso</Button>}

      {/* Modal de pausa */}
      {mostrarSelectorPausa && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xs w-full p-5">
            <div className="flex items-center justify-between mb-4"><h3 className="font-black text-gray-900">Motivo de pausa</h3><button onClick={() => setMostrarSelectorPausa(false)} className="p-1 bg-gray-100 rounded-full">✕</button></div>
            <div className="space-y-2">
              {MOTIVOS_PAUSA.map(m => (
                <button key={m.id} onClick={() => { pausarSesion(m.label); setMostrarSelectorPausa(false); }} className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-left">
                  <m.icon size={18} className="text-gray-500" /><span className="font-bold text-sm">{m.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default PanelDetalleCurso;
