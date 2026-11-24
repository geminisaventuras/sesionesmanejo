// @build: 2026-11-23 | id: T-064-V4 | desc: Home de reservas con paleta corporativa, KPIs en gradiente, cola tintada y secciones por estado.
import { useContext, useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../../context/AppContextValue';
import AppShell from '../../shared/components/AppShell';
import DashboardHeader from '../../shared/components/DashboardHeader';
import DashboardFooter from '../../shared/components/DashboardFooter';
import {
  Activity,
  AlertTriangle,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Package,
  RefreshCw,
  Settings,
  Wallet,
} from 'lucide-react';
import {
  obtenerHoyVenezuela,
  obtenerMinutosActualesVenezuela,
} from '../utils/reservasHelpers';
import { useAdminReservas } from '../hooks/useAdminReservas';
import ReservasHomeKpi from './ReservasHomeKpi';
import ReservasHomeRow from './ReservasHomeRow';
import ReservasHomeSeccion from './ReservasHomeSeccion';
import {
  itemDesdeAcceso,
  itemDesdePack,
  itemDesdeReserva,
  ordenarCola,
} from './reservasHomeDatos';
import { contarItemsBandeja } from '../utils/conteosBandeja';

const FILTROS_TIPO = [
  { id: 'todo', etiqueta: 'Todo' },
  { id: 'reserva', etiqueta: 'Reservas' },
  { id: 'pack', etiqueta: 'Packs' },
  { id: 'teorico', etiqueta: 'Teóricos' },
];

const SECCIONES_ABIERTAS_INICIALES = {
  hoy: false,
  pendientes: false,
  rechazos: false,
  proximas: false,
  packs: false,
};

const AdminReservasHome = () => {
  const { horarios, cursosTeoricos, logoutUser, notifications } = useContext(AppContext);
  const { reservas, packs, accesosTeoricos, cargando, error } = useAdminReservas();
  const navigate = useNavigate();
  const res = reservas || [];

  const [tick, setTick] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setTick(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const hoyStr = useMemo(() => obtenerHoyVenezuela(), [tick]);
  const minutosActuales = useMemo(() => obtenerMinutosActualesVenezuela(), [tick]);

  const pendientes = useMemo(() => res.filter(r => r.estadoPago === 'Pendiente').sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)), [res]);
  const hoy = new Date();
  const dentroDe7Dias = new Date(hoy);
  dentroDe7Dias.setDate(hoy.getDate() + 7);
  const proximas = useMemo(() => res.filter(r => {
    if (r.estadoPago !== 'Aprobado') return false;
    const fechaCurso = r.fecha || r.fecha1;
    if (!fechaCurso) return false;
    const f = new Date(fechaCurso + 'T12:00:00');
    return f >= hoy && f <= dentroDe7Dias;
  }).sort((a, b) => new Date(a.fecha || a.fecha1) - new Date(b.fecha || b.fecha1)), [res, hoy, dentroDe7Dias]);

  const reservasHoy = useMemo(() => {
    return res.filter(r => {
      if (r.estadoPago !== 'Aprobado' && r.estadoPago !== 'Pendiente') return false;
      return r.fecha === hoyStr || r.fecha2 === hoyStr;
    });
  }, [res, hoyStr]);

  const packsPendientes = useMemo(() => {
    return (packs || [])
      .filter(p => p.estadoPago === 'Pendiente')
      .sort((a, b) => (b.fechaCompra?.toMillis?.() || 0) - (a.fechaCompra?.toMillis?.() || 0));
  }, [packs]);

  const packsRechazados = useMemo(() => {
    return (packs || [])
      .filter(p => p.estadoPago === 'Rechazado')
      .sort((a, b) => (b.fechaCompra?.toMillis?.() || 0) - (a.fechaCompra?.toMillis?.() || 0));
  }, [packs]);

  const packsAprobados = useMemo(() => {
    return (packs || [])
      .filter(p => p.estadoPago === 'Aprobado' && p.estado !== 'cancelado' && p.estado !== 'completado')
      .sort((a, b) => (b.aprobadoEn?.toMillis?.() || 0) - (a.aprobadoEn?.toMillis?.() || 0));
  }, [packs]);

  const reservasRechazadas = useMemo(() => {
    return res
      .filter(r => r.estadoPago === 'Rechazado' && r.tipoReserva !== 'pack_sub')
      .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
  }, [res]);

  // FIX-ADMIN-ACCESOS-RECHAZADOS: incluye 'Rechazado' para que el admin pueda entrar a cancelar.
  const accesosPendientes = useMemo(() => {
    return (accesosTeoricos || [])
      .filter(a => a.estadoPago === 'Pendiente' || a.estadoPago === 'Rechazado')
      .sort((a, b) => (b.fechaCompra?.toMillis?.() || 0) - (a.fechaCompra?.toMillis?.() || 0));
  }, [accesosTeoricos]);

  const accesosPendientesPago = useMemo(
    () => accesosPendientes.filter(a => a.estadoPago === 'Pendiente'),
    [accesosPendientes]
  );
  const accesosRechazados = useMemo(
    () => accesosPendientes.filter(a => a.estadoPago === 'Rechazado'),
    [accesosPendientes]
  );

  const sinReservas = pendientes.length === 0 && proximas.length === 0 && reservasHoy.length === 0 && packsPendientes.length === 0 && packsRechazados.length === 0 && packsAprobados.length === 0 && reservasRechazadas.length === 0 && accesosPendientes.length === 0;

  const [filtroTipo, setFiltroTipo] = useState('todo');
  const [abiertas, setAbiertas] = useState(SECCIONES_ABIERTAS_INICIALES);
  const botonesSeccion = useRef({});

  const fechaHoyTexto = useMemo(() => {
    try {
      return new Date(`${hoyStr}T12:00:00`).toLocaleDateString('es-VE', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      }).replace(',', '');
    } catch {
      return hoyStr;
    }
  }, [hoyStr]);

  const opcionesReserva = useMemo(
    () => ({ horarios: horarios || [], hoyStr, minutosActuales }),
    [horarios, hoyStr, minutosActuales]
  );

  const itemsReservasHoy = useMemo(
    () => reservasHoy.map(r => itemDesdeReserva(r, opcionesReserva)),
    [reservasHoy, opcionesReserva]
  );
  const itemsPendientes = useMemo(
    () => pendientes.map(r => itemDesdeReserva(r, opcionesReserva)),
    [pendientes, opcionesReserva]
  );
  const itemsProximas = useMemo(
    () => proximas.map(r => itemDesdeReserva(r, opcionesReserva)),
    [proximas, opcionesReserva]
  );
  const itemsReservasRechazadas = useMemo(
    () => reservasRechazadas.map(r => itemDesdeReserva(r, opcionesReserva)),
    [reservasRechazadas, opcionesReserva]
  );

  const itemsPacksPendientes = useMemo(() => packsPendientes.map(itemDesdePack), [packsPendientes]);
  const itemsPacksRechazados = useMemo(() => packsRechazados.map(itemDesdePack), [packsRechazados]);
  const itemsPacksAprobados = useMemo(() => packsAprobados.map(itemDesdePack), [packsAprobados]);

  const cursosTeoricosLista = useMemo(() => cursosTeoricos || [], [cursosTeoricos]);
  const itemsAccesosPendientes = useMemo(
    () => accesosPendientesPago.map(a => itemDesdeAcceso(a, cursosTeoricosLista)),
    [accesosPendientesPago, cursosTeoricosLista]
  );
  const itemsAccesosRechazados = useMemo(
    () => accesosRechazados.map(a => itemDesdeAcceso(a, cursosTeoricosLista)),
    [accesosRechazados, cursosTeoricosLista]
  );

  const itemsPendientesTodos = useMemo(
    () => [...itemsPendientes, ...itemsPacksPendientes, ...itemsAccesosPendientes],
    [itemsPendientes, itemsPacksPendientes, itemsAccesosPendientes]
  );
  const itemsRechazosTodos = useMemo(
    () => [...itemsReservasRechazadas, ...itemsPacksRechazados, ...itemsAccesosRechazados],
    [itemsReservasRechazadas, itemsPacksRechazados, itemsAccesosRechazados]
  );

  const colaItems = useMemo(
    () => ordenarCola([...itemsRechazosTodos, ...itemsPendientesTodos]).slice(0, 3),
    [itemsRechazosTodos, itemsPendientesTodos]
  );
  const colaTotal = itemsRechazosTodos.length + itemsPendientesTodos.length;

  const seccionesBase = useMemo(() => ([
    {
      id: 'hoy',
      titulo: 'Hoy',
      subtitulo: fechaHoyTexto,
      Icono: Calendar,
      items: itemsReservasHoy,
      tono: 'indigo',
      verTodasRuta: '/admin/reservas/lista',
    },
    {
      id: 'pendientes',
      titulo: 'Pendientes de aprobación',
      subtitulo: 'pago por validar',
      Icono: Clock,
      items: itemsPendientesTodos,
      tono: 'amber',
      verTodasRuta: '/admin/reservas/lista?filtro=Pendiente',
    },
    {
      id: 'rechazos',
      titulo: 'Rechazos por corregir',
      subtitulo: 'requieren contacto',
      Icono: AlertTriangle,
      items: itemsRechazosTodos,
      tono: 'rose',
      verTodasRuta: '/admin/reservas/lista?filtro=Rechazado',
    },
    {
      id: 'proximas',
      titulo: 'Próximas aprobadas',
      subtitulo: 'próximos 7 días',
      Icono: Calendar,
      items: itemsProximas,
      tono: 'emerald',
      verTodasRuta: '/admin/reservas/lista?filtro=Aprobado',
    },
    {
      id: 'packs',
      titulo: 'Packs aprobados',
      subtitulo: 'listos para agendar',
      Icono: Package,
      items: itemsPacksAprobados,
      tono: 'purple',
      verTodasRuta: '/admin/reservas/packs',
      textoVerTodas: 'Ver todas',
      textoVerMas: 'Ver todas',
    },
  ]), [
    fechaHoyTexto,
    itemsReservasHoy,
    itemsPendientesTodos,
    itemsRechazosTodos,
    itemsProximas,
    itemsPacksAprobados,
  ]);

  // ERR-059: el badge cuenta sesiones; packs y teóricos tienen su propia sección.
  const totalRegistros = useMemo(
    () => contarItemsBandeja(seccionesBase, 'reserva'),
    [seccionesBase]
  );

  // FT-046: cada pestaña cuenta su propio tipo; "Todo" suma los tres sin duplicar.
  const conteosTipo = useMemo(() => ({
    todo: contarItemsBandeja(seccionesBase, 'todo'),
    reserva: contarItemsBandeja(seccionesBase, 'reserva'),
    pack: contarItemsBandeja(seccionesBase, 'pack'),
    teorico: contarItemsBandeja(seccionesBase, 'teorico'),
  }), [seccionesBase]);

  const seccionesVisibles = useMemo(
    () => seccionesBase
      .map(seccion => ({
        ...seccion,
        items: filtroTipo === 'todo'
          ? seccion.items
          : seccion.items.filter(item => item.tipo === filtroTipo),
      }))
      .filter(seccion => seccion.items.length > 0),
    [seccionesBase, filtroTipo]
  );

  const totalVisible = useMemo(
    () => contarItemsBandeja(seccionesVisibles, filtroTipo),
    [seccionesVisibles, filtroTipo]
  );
  const etiquetaConteo = { todo: 'registros', reserva: 'sesiones', pack: 'packs', teorico: 'teóricos' }[filtroTipo];

  const handleLogout = useCallback(async () => {
    if (logoutUser) await logoutUser();
    navigate('/');
  }, [logoutUser, navigate]);

  const recargar = useCallback(() => {
    window.location.reload();
  }, []);

  const abrirItem = useCallback((item) => {
    navigate(item.ruta, item.state ? { state: item.state } : undefined);
  }, [navigate]);

  const abrirSeccion = useCallback((id, tipo = 'todo') => {
    setAbiertas(previo => ({ ...previo, [id]: true }));
    setFiltroTipo(tipo);
    window.requestAnimationFrame(() => {
      const boton = botonesSeccion.current[id];
      if (!boton || !boton.isConnected) return;
      const reducido = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
      boton.scrollIntoView({ behavior: reducido ? 'auto' : 'smooth', block: 'start' });
      boton.focus({ preventScroll: true });
    });
  }, []);

  const footerTabs = [
    { id: 'inicio', icon: Activity, label: 'Inicio', action: () => navigate('/dashboard') },
    { id: 'reservas', icon: BookOpen, label: 'Reservas', action: () => navigate('/admin/reservas') },
    { id: 'ocupacion', icon: Calendar, label: 'Ocupac.', action: () => navigate('/admin/ocupacion') },
    { id: 'finanzas', icon: Wallet, label: 'Finanzas', action: () => navigate('/admin/finanzas') },
    { id: 'config', icon: Settings, label: 'Config', action: () => navigate('/admin/config') },
  ];

  const header = (
    <DashboardHeader
      title="Reservas"
      onBack={() => navigate('/dashboard')}
      onLogout={handleLogout}
      notifications={notifications}
    />
  );
  const footer = (
    <DashboardFooter
      tabs={footerTabs}
      activeTab="reservas"
      onTabChange={(id) => {
        const tab = footerTabs.find(t => t.id === id);
        if (tab?.action) tab.action();
      }}
    />
  );

  const conteoPagina = cargando || error ? '—' : totalRegistros;

  const pageHead = (
    <div className="mb-4 flex min-w-0 flex-wrap items-end justify-between gap-2">
      <div className="min-w-0">
        <p className="m-0 text-[10px] font-extrabold uppercase leading-tight tracking-[0.12em] text-indigo-700">
          Bandeja de trabajo
        </p>
        <h2 className="m-0 flex items-center gap-2 text-[22px] font-extrabold leading-tight tracking-tight text-gray-900 lg:text-[26px]">
          Reservas
          <span className="inline-flex h-[22px] min-w-[26px] items-center justify-center rounded-full border border-indigo-200 bg-indigo-50 px-2 text-[11.5px] font-extrabold tabular-nums text-indigo-700">
            {conteoPagina}
          </span>
        </h2>
        <p className="m-0 mt-1 text-[12px] text-gray-500">
          {cargando ? (
            'Cargando agenda…'
          ) : error ? (
            'No se pudo actualizar'
          ) : (
            <>
              Hoy · <span className="font-semibold text-gray-600">{fechaHoyTexto}</span>
              {` · ${reservasHoy.length} ${reservasHoy.length === 1 ? 'sesión' : 'sesiones'} en agenda`}
            </>
          )}
        </p>
      </div>
    </div>
  );

  const estadoCargando = (
    <div aria-busy="true" className="min-w-0">
      <span role="status" className="sr-only">Cargando reservas</span>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
        {[0, 1, 2, 3].map((indice) => (
          <span key={indice} className="block h-[92px] rounded-2xl bg-gray-100 motion-safe:animate-pulse lg:h-[104px]" />
        ))}
      </div>
      <div className="mt-4 flex min-w-0 flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start lg:gap-5">
        <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-3">
          <span className="mb-3 block h-3 w-32 rounded bg-gray-200 motion-safe:animate-pulse" />
          {[0, 1, 2].map((indice) => (
            <span key={indice} className="mb-2 block h-[64px] rounded-xl bg-gray-100 motion-safe:animate-pulse last:mb-0" />
          ))}
        </div>
        <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-3">
          <span className="mb-3 block h-8 w-40 rounded bg-gray-200 motion-safe:animate-pulse" />
          {[0, 1].map((indice) => (
            <span key={indice} className="mb-2 block h-[64px] rounded-xl bg-gray-100 motion-safe:animate-pulse last:mb-0" />
          ))}
        </div>
      </div>
    </div>
  );

  const estadoError = (
    <div role="alert" className="flex min-w-0 flex-col items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-8 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-red-50 text-red-600">
        <AlertTriangle size={26} aria-hidden="true" />
      </span>
      <h3 className="m-0 text-[16px] font-extrabold leading-snug tracking-tight text-gray-900">
        No pudimos cargar las reservas
      </h3>
      <p className="m-0 max-w-[330px] text-[12px] leading-relaxed text-gray-600">
        Revisa tu conexión e inténtalo de nuevo. Tus datos no se modificaron.
      </p>
      <div className="mt-2 flex w-full flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={recargar}
          className="inline-flex min-h-11 flex-1 basis-[130px] items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-[12.5px] font-bold text-white hover:bg-indigo-700"
        >
          <RefreshCw size={15} aria-hidden="true" />
          Reintentar
        </button>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="inline-flex min-h-11 flex-1 basis-[130px] items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-[12.5px] font-bold text-gray-800 hover:bg-gray-50"
        >
          Volver al panel
        </button>
      </div>
    </div>
  );

  const estadoVacio = (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-8 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-indigo-50 text-indigo-700">
          <CheckCircle2 size={26} aria-hidden="true" />
        </span>
        <h3 className="m-0 text-[16px] font-extrabold leading-snug tracking-tight text-gray-900">
          Todo al día
        </h3>
        <p className="m-0 max-w-[330px] text-[12px] leading-relaxed text-gray-600">
          No hay pagos pendientes ni rechazos por corregir. Las próximas sesiones aparecerán aquí cuando se aprueben.
        </p>
        <div className="mt-2 flex w-full flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/admin/reservas/lista')}
            className="inline-flex min-h-11 flex-1 basis-[150px] items-center justify-center rounded-xl bg-indigo-600 px-4 text-[12.5px] font-bold text-white hover:bg-indigo-700"
          >
            Ver todas las reservas
          </button>
          <button
            type="button"
            onClick={recargar}
            className="inline-flex min-h-11 flex-1 basis-[130px] items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 text-[12.5px] font-bold text-gray-800 hover:bg-gray-50"
          >
            <RefreshCw size={15} aria-hidden="true" />
            Actualizar
          </button>
        </div>
      </div>
      <p className="m-0 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-[11.5px] leading-relaxed text-gray-500">
        Si esperabas movimientos, revisa que el pago se haya cargado en la lista completa. El Home solo resume lo accionable.
      </p>
    </div>
  );

  return (
    <AppShell header={header} footer={footer} bgColor="bg-gray-50" maxWidth="max-w-md lg:max-w-6xl">
      <div className="min-w-0 p-4 lg:px-6 lg:py-5">
        {pageHead}

        {cargando ? estadoCargando : error ? estadoError : sinReservas ? estadoVacio : (
          <div className="min-w-0">
            {colaTotal > 0 && (
              <section
                aria-labelledby="home-cola-titulo"
                className="mb-3 min-w-0 overflow-hidden rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 via-white to-indigo-50 shadow-sm"
              >
                <div className="border-b border-rose-100/80 bg-white/60 px-3 py-2.5">
                  <h3 id="home-cola-titulo" className="m-0 flex min-w-0 items-center gap-1.5 text-[12.5px] font-extrabold tracking-tight text-gray-900">
                    <AlertTriangle size={15} aria-hidden="true" className="shrink-0 text-rose-600" />
                    <span className="min-w-0">Requiere acción</span>
                    <span className="inline-flex min-w-[20px] shrink-0 items-center justify-center rounded-full border border-rose-200 bg-rose-100 px-1.5 py-0.5 text-[10px] font-extrabold tabular-nums text-rose-700">
                      {colaTotal}
                    </span>
                  </h3>
                  <p className="m-0 mt-0.5 text-[10.5px] text-rose-900/60">
                    Primero rechazos, después pendientes
                  </p>
                </div>

                <div>
                  {colaItems.map(item => (
                    <ReservasHomeRow
                      key={item.key}
                      item={item}
                      mostrarMotivo
                      tonoFila={item.estadoPago === 'Rechazado' ? 'rose' : 'amber'}
                      onClick={() => abrirItem(item)}
                    />
                  ))}
                </div>

                <div className="border-t border-rose-100/80 bg-white/60 px-2 py-1">
                  <button
                    type="button"
                    onClick={() => navigate('/admin/reservas/lista?filtro=Pendiente')}
                    className="flex min-h-11 w-full items-center justify-between gap-1 rounded-lg px-2 text-left text-[11px] font-extrabold text-indigo-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  >
                    <span>Ver todo lo pendiente ({colaTotal})</span>
                    <ChevronRight size={12} aria-hidden="true" className="shrink-0" />
                  </button>
                </div>
              </section>
            )}

            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
              <ReservasHomeKpi
                etiqueta="Pendientes"
                valor={pendientes.length}
                ayuda="Reservas por aprobar"
                tono="warn"
                ariaLabel={`Pendientes de aprobación: ${pendientes.length}. Ver lista filtrada`}
                onClick={() => navigate('/admin/reservas/lista?filtro=Pendiente')}
              />
              <ReservasHomeKpi
                etiqueta="Packs pend."
                valor={packsPendientes.length}
                ayuda="Esperando pago"
                tono="pack"
                textoAccion="Ver sección"
                ariaLabel={`Packs pendientes: ${packsPendientes.length}. Ver sección de pendientes`}
                onClick={() => abrirSeccion('pendientes', 'pack')}
              />
              <ReservasHomeKpi
                etiqueta="Rechazos"
                valor={itemsRechazosTodos.length}
                ayuda="Requieren corrección"
                tono="bad"
                textoAccion="Ver sección"
                ariaLabel={`Rechazos por corregir: ${itemsRechazosTodos.length}. Ver sección de rechazos`}
                onClick={() => abrirSeccion('rechazos')}
              />
              <ReservasHomeKpi
                etiqueta="Aprobados"
                valor={proximas.length}
                ayuda="Hoy y próximos 7 días"
                tono="ok"
                ariaLabel={`Aprobados hoy y próximos 7 días: ${proximas.length}. Ver lista filtrada`}
                onClick={() => navigate('/admin/reservas/lista?filtro=Aprobado')}
              />
            </div>

            <div className="mt-4 flex min-w-0 flex-col gap-3">
              <div className="flex min-w-0 flex-col gap-3">
                <div className="flex min-w-0 flex-col gap-1.5">
                  <div
                    role="group"
                    aria-label="Filtrar por tipo"
                    className="mx-auto grid w-full max-w-[560px] min-w-0 grid-cols-4 gap-[3px] rounded-xl bg-gray-100 p-0.5 shadow-inner"
                  >
                    {FILTROS_TIPO.map((filtro) => {
                      const activo = filtroTipo === filtro.id;
                      return (
                        <button
                          key={filtro.id}
                          type="button"
                          aria-pressed={activo}
                          aria-label={`${filtro.etiqueta}: ${conteosTipo[filtro.id]}`}
                          onClick={() => setFiltroTipo(filtro.id)}
                          className={`flex min-h-11 min-w-0 items-center justify-center gap-0.5 rounded-lg px-0.5 text-center text-[11px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 focus-visible:ring-offset-gray-100 motion-reduce:transition-none ${
                            activo
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'text-gray-600 hover:bg-white/70'
                          }`}
                        >
                          <span className="truncate">{filtro.etiqueta}</span>
                          <span
                            className={`inline-flex min-w-[15px] shrink-0 items-center justify-center rounded-full px-1 text-[9.5px] font-extrabold tabular-nums ${
                              activo ? 'bg-white/25 text-white' : 'bg-gray-200 text-gray-600'
                            }`}
                          >
                            {conteosTipo[filtro.id]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="m-0 text-[10.5px] text-gray-500">
                    <span className="font-bold text-gray-600">{totalVisible} {etiquetaConteo}</span>
                    {' '}· secciones plegables por estado
                  </p>
                </div>

                {seccionesVisibles.map((seccion) => (
                  <ReservasHomeSeccion
                    key={seccion.id}
                    id={`home-${seccion.id}`}
                    titulo={seccion.titulo}
                    subtitulo={seccion.subtitulo}
                    Icono={seccion.Icono}
                    items={seccion.items}
                    tono={seccion.tono}
                    abierta={Boolean(abiertas[seccion.id])}
                    onToggle={() => setAbiertas(previo => ({ ...previo, [seccion.id]: !previo[seccion.id] }))}
                    onVerTodas={seccion.verTodasRuta ? () => navigate(seccion.verTodasRuta) : undefined}
                    textoVerTodas={seccion.textoVerTodas}
                    textoVerMas={seccion.textoVerMas}
                    onAbrirItem={abrirItem}
                    botonRef={(nodo) => {
                      if (nodo) botonesSeccion.current[seccion.id] = nodo;
                      else delete botonesSeccion.current[seccion.id];
                    }}
                  />
                ))}

                {seccionesVisibles.length === 0 && (
                  <p className="m-0 rounded-2xl border border-gray-200 bg-white px-3 py-4 text-[11.5px] text-gray-500">
                    No hay registros de este tipo en la bandeja.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default AdminReservasHome;
