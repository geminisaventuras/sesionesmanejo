// @build: 2026-11-23 | id: T-065 / ERR-033 | desc: Home admin responsive, KPIs verificables, ingresos por compra y actividad reciente.
import { useContext, useMemo, memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../../context/AppContextValue';
import AppShell from '../../shared/components/AppShell';
import DashboardHeader from '../../shared/components/DashboardHeader';
import DashboardFooter from '../../shared/components/DashboardFooter';
import {
  Activity, AlertCircle, AlertTriangle, Bell, Bike, BookOpen, Calendar,
  CheckCircle2, ChevronRight, Clock, DollarSign, GraduationCap,
  Package, Settings, TrendingUp, Users, Wallet,
} from 'lucide-react';
import { useAdminReservas } from '../hooks/useAdminReservas';
import { useIngresosPorCompra } from '../hooks/useIngresosPorCompra';
import { useOcupacionConfirmada } from '../../../hooks/useOcupacionConfirmada';
import { construirAlertas, msDeFecha } from '../utils/alertasAdmin';
import { calcularMetricasNegocio } from '../utils/metricasAdmin';
import {
  calcularIngresosMes,
  contarMotosActivas,
  contarOcupacionHoy,
  MONEDA_INGRESOS,
  obtenerActividadReciente,
} from '../utils/resumenAdmin';
import { obtenerFechaVenezuela } from '../../shared/utils/zonahoraria';

const TarjetaResumen = memo(({ titulo, valor, color, icon: Icon }) => (
  <div className={`${color} relative overflow-hidden rounded-xl p-3 text-white shadow-sm`}>
    <div className="pointer-events-none absolute -right-6 -top-6 h-16 w-16 rounded-full bg-white/10 blur-xl" />
    <div className="relative flex items-center justify-between gap-2">
      <p className="min-w-0 truncate text-[10px] font-bold uppercase tracking-widest text-white/80">{titulo}</p>
      {Icon && <Icon size={14} className="shrink-0 text-white/80" />}
    </div>
    <h2 className="relative mt-1 truncate text-xl font-black leading-tight" title={String(valor)}>{valor}</h2>
  </div>
));

const ADMIN = '/admin';

const formatearFechaActividad = (valor) => {
  const ms = msDeFecha(valor);
  if (ms === null) return 'Sin fecha';
  try {
    return new Date(ms).toLocaleString('es-VE', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return new Date(ms).toLocaleDateString('es-VE');
  }
};

const AdminResumen = () => {
  const { instructores, sedes, motos, cursos, seedDatabase, logoutUser, notifications } = useContext(AppContext);
  const navigate = useNavigate();
  const { reservas, reservasPendientes, packs, accesosTeoricos, cargando, error } = useAdminReservas({ incluirPendientes: true });
  const {
    reservas: reservasIngresos,
    packs: packsIngresos,
    cargando: cargandoIngresos,
    error: errorIngresos,
  } = useIngresosPorCompra();

  // Unión del top general por fecha de curso con el listener de pendientes por
  // estado (ERR-058), para que el conteo del Home no dependa solo del top 100.
  const res = useMemo(() => {
    const mapa = new Map();
    (reservas || []).forEach((reserva) => mapa.set(reserva.id, reserva));
    (reservasPendientes || []).forEach((reserva) => mapa.set(reserva.id, reserva));
    return [...mapa.values()];
  }, [reservas, reservasPendientes]);
  const instrs = instructores || [];
  const motosList = motos || [];
  const cursosList = cursos || [];
  const packsList = packs || [];
  const accesosList = accesosTeoricos || [];

  // Ingresos del mes: consulta propia por fecha de compra VET (createdAt/fechaCompra),
  // no el listener de reservas ordenado por fecha de curso. Ver `useIngresosPorCompra`.
  const ingresosMes = useMemo(
    () => calcularIngresosMes({ reservas: reservasIngresos, packs: packsIngresos }),
    [reservasIngresos, packsIngresos]
  );
  const hoyStr = obtenerFechaVenezuela();
  // Ocupación de hoy desde el espejo `ocupacionConfirmada` (ADR-011), mismo día VET.
  // Sin denominador: el agregado de capacidad entre sedes sigue abierto en ADR-011.
  const { ocupacion: ocupacionHoy, cargando: cargandoOcupacion } = useOcupacionConfirmada({
    fecha: hoyStr,
    limitDocs: 500,
  });
  const bloquesOcupadosHoy = useMemo(
    () => contarOcupacionHoy(ocupacionHoy, hoyStr),
    [ocupacionHoy, hoyStr]
  );
  const instrActivos = instrs.filter(i => i.activo).length;
  const motosActivas = useMemo(() => contarMotosActivas(motosList), [motosList]);

  const alertas = useMemo(
    () => construirAlertas({ reservas: res, motos: motosList }),
    [res, motosList]
  );
  const totalAlertas = alertas.length;

  // Solo lectura: últimos 3 eventos que el sistema ya registra para administración.
  // No agrega consultas ni crea notificaciones.
  const actividadReciente = useMemo(
    () => obtenerActividadReciente(notifications, 3),
    [notifications]
  );

  const accesosRapidos = useMemo(() => [
    {
      id: 'por-aprobar',
      etiqueta: 'Por aprobar',
      valor: res.filter(r => r.estadoPago === 'Pendiente').length,
      ruta: `${ADMIN}/reservas/lista?filtro=Pendiente`,
      icon: Clock,
      tono: 'border-amber-100 bg-amber-50 text-amber-700',
    },
    {
      id: 'packs',
      etiqueta: 'Packs',
      valor: packsList.filter(p => p.estadoPago === 'Pendiente').length,
      ruta: `${ADMIN}/reservas`,
      icon: Package,
      tono: 'border-indigo-100 bg-indigo-50 text-indigo-700',
    },
    {
      id: 'rechazos',
      etiqueta: 'Rechazos',
      valor: res.filter(r => r.estadoPago === 'Rechazado').length,
      ruta: `${ADMIN}/reservas/lista?filtro=Rechazado`,
      icon: AlertCircle,
      tono: 'border-red-100 bg-red-50 text-red-700',
    },
    {
      id: 'teoricos',
      etiqueta: 'Teóricos',
      valor: accesosList.filter(a => a.estadoPago === 'Pendiente').length,
      ruta: `${ADMIN}/reservas`,
      icon: GraduationCap,
      tono: 'border-teal-100 bg-teal-50 text-teal-700',
    },
  ], [res, packsList, accesosList]);

  const { cursoMasVendido, conversionEquilibrio } = useMemo(
    () => calcularMetricasNegocio(reservas, cursosList),
    [reservas, cursosList]
  );

  const handleLogout = useCallback(async () => {
    if (logoutUser) await logoutUser();
    navigate('/');
  }, [logoutUser, navigate]);

  if (cargando) return <div className="p-4 text-center text-sm font-bold text-gray-500 animate-pulse">Cargando panel...</div>;
  if (error) return <div className="p-4 text-red-600 text-sm font-bold">Error: {error.message}</div>;

  const footerTabs = [
    { id: 'inicio', icon: Activity, label: 'Inicio', action: () => navigate('/dashboard') },
    { id: 'reservas', icon: BookOpen, label: 'Reservas', action: () => navigate('/admin/reservas') },
    { id: 'ocupacion', icon: Calendar, label: 'Ocupac.', action: () => navigate('/admin/ocupacion') },
    { id: 'finanzas', icon: Wallet, label: 'Finanzas', action: () => navigate('/admin/finanzas') },
    { id: 'config', icon: Settings, label: 'Config', action: () => navigate('/admin/config') }
  ];

  const header = <DashboardHeader title="Panel Administrativo" onLogout={handleLogout} notifications={notifications} />;
  const footer = <DashboardFooter
    tabs={footerTabs}
    activeTab="inicio"
    onTabChange={(id) => {
      const tab = footerTabs.find(t => t.id === id);
      if (tab?.action) tab.action();
    }}
  />;

  return (
    <AppShell header={header} footer={footer} bgColor="bg-gray-50" maxWidth="max-w-md lg:max-w-6xl">
      <div className="flex h-full min-h-0 flex-col gap-2 p-3 lg:gap-3 lg:p-5">

        {sedes?.length === 0 && (
          <div className="shrink-0 rounded-xl border border-yellow-200 bg-yellow-50 px-3 py-2 text-[11px] font-bold text-yellow-800">
            ¿El sistema está en blanco? <button onClick={seedDatabase} className="underline ml-1">Inicializar Base de Datos</button>
          </div>
        )}

        {/* Alerta compacta: una sola fila, siempre navegable al centro de alertas */}
        <button
          type="button"
          onClick={() => navigate(`${ADMIN}/alertas`)}
          aria-label={totalAlertas === 0
            ? 'Alertas del sistema: todo al día, 0 pendientes'
            : `Alertas del sistema: ${totalAlertas} requieren atención`}
          className={`flex min-h-11 w-full shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors ${totalAlertas === 0 ? 'border-emerald-100 bg-white hover:bg-emerald-50/60' : 'border-red-100 bg-white hover:bg-red-50/60'}`}
        >
          <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${totalAlertas === 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
            {totalAlertas === 0 ? <CheckCircle2 size={16} aria-hidden="true" /> : <AlertTriangle size={16} aria-hidden="true" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-bold text-gray-900">{totalAlertas === 0 ? 'Todo al día' : 'Requiere atención'}</span>
            <span className="block truncate text-[10px] text-gray-500">
              {totalAlertas === 0 ? 'Sin pendientes críticos' : 'Toca para ver y resolver'}
            </span>
          </span>
          <span className={`text-lg font-black tabular-nums ${totalAlertas === 0 ? 'text-emerald-600' : 'text-red-600'}`}>{totalAlertas}</span>
          <ChevronRight size={16} className="shrink-0 text-gray-400" aria-hidden="true" />
        </button>

        {/* KPIs de color (sin cambios de paleta) */}
        <div className="grid shrink-0 grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
          <TarjetaResumen
            titulo="Ingresos Mes"
            valor={cargandoIngresos || errorIngresos ? '—' : `${MONEDA_INGRESOS} ${ingresosMes}`}
            color="bg-gradient-to-br from-emerald-600 to-emerald-800"
            icon={DollarSign}
          />
          <TarjetaResumen
            titulo="Ocupación Hoy"
            valor={cargandoOcupacion ? '—' : bloquesOcupadosHoy}
            color="bg-gradient-to-br from-indigo-600 to-indigo-800"
            icon={Calendar}
          />
          <TarjetaResumen titulo="Instructores" valor={instrActivos} color="bg-gradient-to-br from-purple-600 to-purple-800" icon={Users} />
          <TarjetaResumen titulo="Motos activas" valor={motosActivas} color="bg-gradient-to-br from-slate-700 to-slate-900" icon={Bike} />
        </div>

        {/* Accesos rápidos: no duplican el menú inferior */}
        <section aria-labelledby="accesos-rapidos" className="shrink-0">
          <h3 id="accesos-rapidos" className="px-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">Acceso rápido</h3>
          <div className="mt-1 grid grid-cols-4 gap-2 lg:gap-3">
            {accesosRapidos.map(({ id, etiqueta, valor, ruta, icon: Icon, tono }) => (
              <button
                key={id}
                type="button"
                onClick={() => navigate(ruta)}
                aria-label={`${etiqueta}: ${valor}`}
                className="flex min-h-[64px] min-w-0 flex-col items-start rounded-xl border border-gray-100 bg-white p-2 text-left shadow-sm transition-colors hover:bg-gray-50"
              >
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg border ${tono}`}>
                  <Icon size={13} aria-hidden="true" />
                </span>
                <span className="mt-1 text-base font-black leading-none text-gray-900 tabular-nums">{valor}</span>
                <span className="mt-0.5 block w-full truncate text-[9.5px] font-bold leading-tight text-gray-500">{etiqueta}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Métricas del Negocio: tarjetas de color navegables a la pantalla de métricas */}
        <button
          type="button"
          onClick={() => navigate(`${ADMIN}/metricas`)}
          aria-label="Ver métricas del negocio"
          className="w-full shrink-0 rounded-xl border border-gray-100 bg-white p-2.5 text-left shadow-sm transition-colors hover:bg-gray-50"
        >
          <span className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5 text-[11px] font-bold text-gray-900">
              <TrendingUp size={13} className="shrink-0 text-indigo-600" aria-hidden="true" />
              Métricas del Negocio
            </span>
            <span className="flex shrink-0 items-center gap-0.5 text-[10px] font-bold text-indigo-600">
              Ver más <ChevronRight size={12} aria-hidden="true" />
            </span>
          </span>
          <span className="mt-1.5 grid grid-cols-2 gap-2">
            <span className="min-w-0 rounded-lg border border-purple-100 bg-gradient-to-br from-purple-50 to-indigo-50 p-2">
              <span className="block text-[9px] font-bold uppercase tracking-wider text-purple-600">Top Ventas</span>
              <span className="block truncate text-xs font-black text-gray-900">{cursoMasVendido.nombre}</span>
              <span className="block text-[10px] text-gray-500">{cursoMasVendido.count} ventas</span>
            </span>
            <span className="min-w-0 rounded-lg border border-teal-100 bg-gradient-to-br from-teal-50 to-emerald-50 p-2">
              <span className="block text-[9px] font-bold uppercase tracking-wider text-teal-600">Conversión Eq → Otros</span>
              <span className="block text-xs font-black text-gray-900">{conversionEquilibrio.pct}%</span>
              <span className="block text-[10px] text-gray-500">{conversionEquilibrio.totalConv} de {conversionEquilibrio.totalEq} alumnos</span>
            </span>
          </span>
        </button>

        {/* Actividad reciente: últimos 3 eventos admin ya registrados (solo lectura). */}
        <section aria-labelledby="actividad-reciente" className="shrink-0">
          <h3 id="actividad-reciente" className="px-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">Actividad reciente</h3>
          {actividadReciente.length === 0 ? (
            <p className="mt-1 rounded-xl border border-gray-100 bg-white px-3 py-2 text-[11px] text-gray-500 shadow-sm">
              Sin actividad reciente
            </p>
          ) : (
            <ul className="mt-1 grid gap-1.5 lg:grid-cols-3 lg:gap-3">
              {actividadReciente.map((notif) => {
                const mensaje = notif.mensaje || 'Evento del sistema';
                const contenido = (
                  <>
                    <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gray-100 text-gray-600">
                      <Bell size={13} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 block text-[11px] font-semibold leading-snug text-gray-900">{mensaje}</span>
                      <span className="mt-0.5 block text-[10px] text-gray-400">{formatearFechaActividad(notif.createdAt)}</span>
                    </span>
                    {notif.reservaId && (
                      <ChevronRight size={14} className="mt-1 shrink-0 text-indigo-500" aria-hidden="true" />
                    )}
                  </>
                );

                return (
                  <li key={notif.id} className="min-w-0">
                    {notif.reservaId ? (
                      <button
                        type="button"
                        onClick={() => navigate(`/admin/reserva/${notif.reservaId}`)}
                        aria-label={`${mensaje}. Ir a la reserva`}
                        className="flex min-h-11 w-full items-start gap-2 rounded-xl border border-gray-100 bg-white p-2.5 text-left shadow-sm transition-colors hover:bg-gray-50"
                      >
                        {contenido}
                      </button>
                    ) : (
                      <div className="flex min-h-11 w-full items-start gap-2 rounded-xl border border-gray-100 bg-white p-2.5 shadow-sm">
                        {contenido}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

      </div>
    </AppShell>
  );
};

export default AdminResumen;
