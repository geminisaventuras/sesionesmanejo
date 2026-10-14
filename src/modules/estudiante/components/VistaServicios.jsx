// @build: 2026-10-10 | id: VISTA-SERVICIOS | desc: Grid de servicios contratados + explorar nuevos
import { useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../../context/AppContextValue';
import { BookOpen, GraduationCap, Package, Wrench, Droplets, ShoppingBag, Compass } from 'lucide-react';

const CATALOGO = [
  { id: 'sesionesPracticas', icon: BookOpen,      label: 'Sesiones Prácticas', desc: 'Clases con tutor y moto',    ruta: 'cursos' },
  { id: 'modulosTeoricos',   icon: GraduationCap, label: 'Módulos Formativos',  desc: 'Contenido educativo digital', ruta: 'formacion' },
  { id: 'packs',             icon: Package,       label: 'Packs',               desc: 'Combos con descuento',        ruta: 'packs' },
  { id: 'mecanica',          icon: Wrench,        label: 'Mecánica',            desc: 'Servicio técnico',            pronto: true },
  { id: 'motolavado',        icon: Droplets,      label: 'Motolavado',          desc: 'Lavado profesional',          pronto: true },
  { id: 'productos',         icon: ShoppingBag,   label: 'Productos',           desc: 'Tienda de accesorios',        pronto: true }
];

export function VistaServicios({ onNavigate, packActivo, metricas: metricasProp, reservasUsuario = [] }) {
  const ctx = useContext(AppContext);
  const navigate = useNavigate();
  const { user } = ctx;

  const capacidades = user?.data?.capacidades || {};
  // FASE 2: metricas viene por prop del hook useMetricasUsuario, con fallback al SSOT
  const metricas = metricasProp || user?.data?.metricas;

  // FIX-VISTA-SERVICIOS-RECHAZADOS: detectar reserva rechazada del usuario.
  const reservaRechazada = useMemo(() => {
    const rechazadas = (reservasUsuario || []).filter(r => r.estadoPago === 'Rechazado');
    if (rechazadas.length === 0) return null;
    return [...rechazadas].sort((a, b) => {
      const ta = a.rechazadoEn || a.createdAt?.toMillis?.() || 0;
      const tb = b.rechazadoEn || b.createdAt?.toMillis?.() || 0;
      return tb - ta;
    })[0];
  }, [reservasUsuario]);

  const activos = useMemo(() => {
    return CATALOGO.filter(s => {
      const stats = metricas?.porServicio?.[s.id] || {};
      return (Number(stats.activos) || 0) > 0
        || (Number(stats.pendientes) || 0) > 0
        || (Number(stats.rechazados) || 0) > 0;
    });
  }, [metricas]);

  const disponibles = useMemo(() => {
    return CATALOGO.filter(s => {
      const stats = metricas?.porServicio?.[s.id] || {};
      const tiene = (Number(stats.activos) || 0) > 0
        || (Number(stats.pendientes) || 0) > 0
        || (Number(stats.rechazados) || 0) > 0;
      return !tiene;
    });
  }, [metricas]);

  const handleClick = (servicio) => {
    if (servicio.pronto) return;
    // Pack activo → detalle del pack. Sin pack → vista de compra.
    if (servicio.id === 'packs' && packActivo?.id) {
      navigate(`/mi-pack/${packActivo.id}`, { state: { from: 'servicios' } });
      return;
    }
    if (onNavigate) onNavigate(servicio.ruta);
  };

  return (
    <div className="space-y-4">
      {/* FIX-VISTA-SERVICIOS-RECHAZADOS: banner rojo si hay reserva rechazada */}
      {reservaRechazada && (
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-600 flex items-center justify-center">
              <span className="text-white font-black text-sm">!</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-red-800">Tienes un pago rechazado</p>
              <p className="text-xs text-red-700 mt-0.5">
                Tu pago no pudo ser validado. Corrige la referencia para continuar.
              </p>
              <button
                onClick={() => {
                  const esPack = reservaRechazada.tipoReserva === 'pack_sub' && reservaRechazada.packReservaId;
                  navigate(esPack
                    ? `/corregir-pago/pack/${reservaRechazada.packReservaId}`
                    : `/corregir-pago/reserva/${reservaRechazada.id}`);
                }}
                className="mt-3 w-full bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-xl font-bold text-xs"
              >
                Corregir pago
              </button>
            </div>
          </div>
        </div>
      )}

      {activos.length > 0 && (
        <div>
          <h2 className="text-sm font-black text-gray-700 uppercase tracking-wider px-1 mb-2">
            Mis servicios ({activos.length})
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {activos.map(s => {
              const stats = metricas?.porServicio?.[s.id] || {};
              const activosN = Number(stats.activos) || 0;
              const pendientesN = Number(stats.pendientes) || 0;
              const rechazadosN = Number(stats.rechazados) || 0;
              const Icono = s.icon;
              // FIX-VISTA-SERVICIOS-COLORES: prioridad rechazado > pendiente > activo
              const borderClass = rechazadosN > 0
                ? 'border-red-300 hover:border-red-500'
                : pendientesN > 0
                ? 'border-orange-200 hover:border-orange-400'
                : 'border-green-200 hover:border-green-400';
              const bgIconClass = rechazadosN > 0 ? 'bg-red-100' : pendientesN > 0 ? 'bg-orange-100' : 'bg-green-100';
              const iconClass = rechazadosN > 0 ? 'text-red-700' : pendientesN > 0 ? 'text-orange-700' : 'text-green-700';
              return (
                <button
                  key={s.id}
                  onClick={() => handleClick(s)}
                  className={`bg-white rounded-2xl border-2 p-3 text-left active:scale-[0.98] transition-all ${borderClass}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${bgIconClass}`}>
                      <Icono size={20} className={iconClass} />
                    </div>
                    {rechazadosN > 0 ? (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                        {rechazadosN} rechaz.
                      </span>
                    ) : pendientesN > 0 ? (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">
                        {pendientesN} pend.
                      </span>
                    ) : null}
                  </div>
                  <p className="font-bold text-sm text-gray-900 leading-tight">{s.label}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {rechazadosN > 0
                      ? `${rechazadosN} rechazado${rechazadosN > 1 ? 's' : ''}`
                      : pendientesN > 0 && activosN === 0
                      ? `${pendientesN} pendiente${pendientesN > 1 ? 's' : ''}`
                      : `${activosN} activo${activosN > 1 ? 's' : ''}`}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {disponibles.length > 0 && (
        <div>
          <h2 className="text-sm font-black text-gray-700 uppercase tracking-wider px-1 mb-2 flex items-center gap-1">
            <Compass size={14} className="text-blue-600" /> Explorar más
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {disponibles.map(s => {
              const Icono = s.icon;
              return (
                <button
                  key={s.id}
                  onClick={() => handleClick(s)}
                  disabled={s.pronto}
                  className={`bg-white rounded-2xl border border-gray-100 p-3 text-left transition-all ${
                    s.pronto ? 'opacity-60 cursor-not-allowed' : 'hover:border-blue-300 active:scale-[0.98]'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                    <Icono size={20} className="text-gray-500" />
                  </div>
                  <p className="font-bold text-sm text-gray-900 leading-tight">{s.label}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {s.pronto ? 'Próximamente' : s.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default VistaServicios;
