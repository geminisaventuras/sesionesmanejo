// @build: 2026-11-22 | id: T-063-V2 | desc: Lista de reservas admin compacta en móvil (sheet de filtros) y ancha en escritorio.
import { useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppContext } from '../../../context/AppContextValue';
import AppShell from '../../shared/components/AppShell';
import DashboardHeader from '../../shared/components/DashboardHeader';
import DashboardFooter from '../../shared/components/DashboardFooter';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calendar,
  ChevronDown,
  Filter,
  RefreshCw,
  Search,
  SearchX,
  Settings,
  Wallet,
} from 'lucide-react';
import {
  obtenerHoyVenezuela,
  obtenerMinutosActualesVenezuela,
  esReservaEnCurso,
  obtenerFechaMasCercana,
} from '../utils/reservasHelpers';
import { useAdminReservas } from '../hooks/useAdminReservas';
import { getHoraIdOcupacion } from '../../shared/utils/reservaHelpers';
import { formatearSede } from '../../shared/utils/sedesHelpers';
import ReservaCard, { obtenerNombreInstructor } from './ReservaCard';
import FiltrosReservasPanel from './FiltrosReservasPanel';
import FiltrosReservasSheet from './FiltrosReservasSheet';
import {
  ESTADOS_PAGO,
  FILTROS_AVANZADOS_INICIALES,
  OPCIONES_ORDEN,
  contarFiltrosAvanzados,
} from './FiltrosReservasCampos';

const FILTROS_KEY = 'admin_reservas_filtros_v1';

const cargarFiltrosGuardados = () => {
  try {
    const raw = sessionStorage.getItem(FILTROS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const getEstadoAcademico = (r) => {
  if (!r) return 'NoIniciado';
  if (r.estadoPago === 'Cancelado') return null;
  if (r.estadoCurso === 'Aprobado') return 'Completado';
  if (r.estadoCurso === 'Ausente') return 'Ausente';
  if (r.sesionTotalInicio) return 'Iniciado';
  return 'NoIniciado';
};

const PUNTO_ESTADO_PAGO = {
  Pendiente: 'bg-orange-500',
  Aprobado: 'bg-green-500',
  Rechazado: 'bg-red-600',
  Cancelado: 'bg-gray-400',
};

const formatearDiaHoy = (iso) => {
  if (!iso) return 'hoy';
  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day) return 'hoy';
  try {
    return new Date(year, month - 1, day, 12).toLocaleDateString('es-VE', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return 'hoy';
  }
};

// Misma selección de siempre, extraída para calcular el conteo del sheet sin
// tocar consultas ni servicios.
const filtrarReservas = (lista, criterios, auxiliares) => {
  const {
    filtroEstado = 'Todas',
    busqueda = '',
    fechaDesde = '',
    fechaHasta = '',
    filtroSede = 'todas',
    filtroCurso = 'todos',
    filtroInstructor = 'todos',
    filtroAcademico = 'Todos',
    filtroHorasPendientes = false,
  } = criterios;
  const { instructores = [], cursos = [], sedes = [] } = auxiliares || {};

  let filtradas = lista;
  if (filtroEstado !== 'Todas') {
    filtradas = filtradas.filter((r) => r.estadoPago === filtroEstado);
  }
  if (busqueda.trim()) {
    const q = busqueda.toLowerCase();
    filtradas = filtradas.filter((r) => {
      const instr = instructores.find((i) => String(i.id) === String(r.instructorId));
      const curso = cursos.find((c) => String(c.id) === String(r.cursoId));
      const sede = sedes.find((s) => String(s.id) === String(r.sedeId));
      const campos = [
        r.nombre, r.apellido, r.cedula, r.telefono, r.correo, r.contactoEmergencia,
        r.cursoId, r.sedeId, r.tipoMoto, r.pagoBanco, r.pagoRef, r.estado, r.zona,
        r.fecha, r.fecha2, r.horaId,
        instr?.nombre, instr?.apellido, curso?.nombre, formatearSede(sede),
      ].filter(Boolean).join(' ').toLowerCase();
      return campos.includes(q);
    });
  }
  if (fechaDesde) {
    filtradas = filtradas.filter((r) => {
      const fecha1 = r.fecha || '';
      const fecha2 = r.fecha2 || '';
      return (fecha1 && fecha1 >= fechaDesde) || (fecha2 && fecha2 >= fechaDesde);
    });
  }
  if (fechaHasta) {
    filtradas = filtradas.filter((r) => {
      const fecha1 = r.fecha || '';
      const fecha2 = r.fecha2 || '';
      return (fecha1 && fecha1 <= fechaHasta) || (fecha2 && fecha2 <= fechaHasta);
    });
  }
  if (filtroSede !== 'todas') {
    filtradas = filtradas.filter((r) => String(r.sedeId) === filtroSede);
  }
  if (filtroCurso !== 'todos') {
    filtradas = filtradas.filter((r) => String(r.cursoId) === filtroCurso);
  }
  if (filtroInstructor !== 'todos') {
    filtradas = filtradas.filter((r) => String(r.instructorId) === filtroInstructor);
  }
  if (filtroAcademico !== 'Todos') {
    filtradas = filtradas.filter((r) => {
      const est = getEstadoAcademico(r);
      if (filtroAcademico === 'No iniciado') return est === 'NoIniciado';
      if (filtroAcademico === 'Iniciado') return est === 'Iniciado';
      if (filtroAcademico === 'Completado') return est === 'Completado';
      if (filtroAcademico === 'Ausente') return est === 'Ausente';
      return true;
    });
  }
  if (filtroHorasPendientes) {
    filtradas = filtradas.filter((r) => (r.horasPendientes || 0) > 0);
  }
  return filtradas;
};

const AdminReservasList = () => {
  const { instructores, cursos, horarios, sedes, notifications, logoutUser, estados, municipios, ciudades } = useContext(AppContext);
  const catalogosSede = useMemo(
    () => ({ estados: estados || [], municipios: municipios || [], ciudades: ciudades || [] }),
    [estados, municipios, ciudades]
  );
  const { reservas, cargando, error } = useAdminReservas();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const filtrosGuardados = useMemo(() => cargarFiltrosGuardados(), []);
  const filtroInicial = searchParams.get('filtro') || filtrosGuardados.filtroEstado || 'Todas';
  const [filtroEstado, setFiltroEstado] = useState(filtroInicial);
  const [orden, setOrden] = useState(filtrosGuardados.orden || 'curso_cercano');
  const [busqueda, setBusqueda] = useState(filtrosGuardados.busqueda || '');
  const [pagina, setPagina] = useState(1);
  const POR_PAGINA = 5;

  const [fechaDesde, setFechaDesde] = useState(filtrosGuardados.fechaDesde || '');
  const [fechaHasta, setFechaHasta] = useState(filtrosGuardados.fechaHasta || '');
  const [filtroSede, setFiltroSede] = useState(filtrosGuardados.filtroSede || 'todas');
  const [filtroCurso, setFiltroCurso] = useState(filtrosGuardados.filtroCurso || 'todos');
  const [filtroInstructor, setFiltroInstructor] = useState(filtrosGuardados.filtroInstructor || 'todos');
  const [filtroAcademico, setFiltroAcademico] = useState(filtrosGuardados.filtroAcademico || 'Todos');
  const [filtroHorasPendientes, setFiltroHorasPendientes] = useState(filtrosGuardados.filtroHorasPendientes || false);

  const [sheetAbierto, setSheetAbierto] = useState(false);
  const [borrador, setBorrador] = useState({ ...FILTROS_AVANZADOS_INICIALES });
  const botonFiltrosRef = useRef(null);

  const [tick, setTick] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setTick(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const res = useMemo(() => reservas || [], [reservas]);

  const hoyStr = useMemo(() => obtenerHoyVenezuela(), [tick]);
  const minutosActuales = useMemo(() => obtenerMinutosActualesVenezuela(), [tick]);
  const diaHoy = useMemo(() => formatearDiaHoy(hoyStr), [hoyStr]);

  const auxiliares = useMemo(
    () => ({ instructores: instructores || [], cursos: cursos || [], sedes: sedes || [] }),
    [instructores, cursos, sedes]
  );

  const reservasFiltradas = useMemo(
    () => filtrarReservas(res, {
      filtroEstado,
      busqueda,
      fechaDesde,
      fechaHasta,
      filtroSede,
      filtroCurso,
      filtroInstructor,
      filtroAcademico,
      filtroHorasPendientes,
    }, auxiliares),
    [res, filtroEstado, busqueda, fechaDesde, fechaHasta, filtroSede, filtroCurso, filtroInstructor, filtroAcademico, filtroHorasPendientes, auxiliares]
  );

  const criteriosBorrador = useMemo(
    () => ({ ...borrador, filtroEstado, busqueda }),
    [borrador, filtroEstado, busqueda]
  );

  const resultadosBorrador = useMemo(
    () => filtrarReservas(res, criteriosBorrador, auxiliares),
    [res, criteriosBorrador, auxiliares]
  );

  const reservasHoy = useMemo(
    () => reservasFiltradas.filter((r) => r.fecha === hoyStr || r.fecha2 === hoyStr),
    [reservasFiltradas, hoyStr]
  );

  const reservasRestantes = useMemo(
    () => reservasFiltradas.filter((r) => r.fecha !== hoyStr && r.fecha2 !== hoyStr),
    [reservasFiltradas, hoyStr]
  );

  // Misma selección que la versión previa (sin pila de badges): la reserva futura
  // más cercana que no está en curso se marca con un indicador sutil.
  const proximaReservaId = useMemo(() => {
    const futuras = reservasFiltradas
      .filter((r) => {
        const fechaCercana = obtenerFechaMasCercana(r, hoyStr);
        return fechaCercana && !esReservaEnCurso(r, horarios || [], hoyStr, minutosActuales);
      })
      .sort((a, b) => {
        const fechaA = obtenerFechaMasCercana(a, hoyStr) || '9999-12-31';
        const fechaB = obtenerFechaMasCercana(b, hoyStr) || '9999-12-31';
        if (fechaA !== fechaB) return fechaA.localeCompare(fechaB);
        if ((a.horaId || '') !== (b.horaId || '')) return (a.horaId || '').localeCompare(b.horaId || '');
        return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
      });
    return futuras.length > 0 ? futuras[0].id : null;
  }, [reservasFiltradas, horarios, hoyStr, minutosActuales]);

  const reservasOrdenadas = useMemo(() => {
    const lista = [...reservasRestantes];
    switch (orden) {
      case 'curso_cercano':
        return lista.sort((a, b) => {
          const fechaA = obtenerFechaMasCercana(a, hoyStr) || '9999-12-31';
          const fechaB = obtenerFechaMasCercana(b, hoyStr) || '9999-12-31';
          return fechaA.localeCompare(fechaB);
        });
      case 'recientes_desc':
        return lista.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      case 'recientes_asc':
        return lista.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
      case 'curso_lejano':
        return lista.sort((a, b) => {
          const fechaA = obtenerFechaMasCercana(a, hoyStr) || '0000-00-00';
          const fechaB = obtenerFechaMasCercana(b, hoyStr) || '0000-00-00';
          return fechaB.localeCompare(fechaA);
        });
      default:
        return lista;
    }
  }, [reservasRestantes, orden, hoyStr]);

  const totalPaginas = Math.max(1, Math.ceil(reservasOrdenadas.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const inicio = (paginaActual - 1) * POR_PAGINA;
  const fin = inicio + POR_PAGINA;
  const reservasPagina = reservasOrdenadas.slice(inicio, fin);

  useEffect(() => {
    try {
      sessionStorage.setItem(FILTROS_KEY, JSON.stringify({
        filtroEstado, orden, busqueda, fechaDesde, fechaHasta,
        filtroSede, filtroCurso, filtroInstructor, filtroAcademico,
        filtroHorasPendientes,
      }));
    } catch { /* sessionStorage no disponible */ }
  }, [filtroEstado, orden, busqueda, fechaDesde, fechaHasta, filtroSede, filtroCurso, filtroInstructor, filtroAcademico, filtroHorasPendientes]);

  useEffect(() => { setPagina(1); }, [filtroEstado, busqueda, orden, fechaDesde, fechaHasta, filtroSede, filtroCurso, filtroInstructor, filtroAcademico, filtroHorasPendientes]);

  useEffect(() => {
    if (!sheetAbierto) return undefined;
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const media = window.matchMedia?.('(min-width: 1024px)');
    const alCambiarAncho = (event) => {
      if (event.matches) setSheetAbierto(false);
    };
    media?.addEventListener?.('change', alCambiarAncho);
    return () => {
      document.body.style.overflow = overflowPrevio;
      media?.removeEventListener?.('change', alCambiarAncho);
    };
  }, [sheetAbierto]);

  const handleLogout = useCallback(async () => {
    if (logoutUser) await logoutUser();
    navigate('/');
  }, [logoutUser, navigate]);

  const footerTabs = [
    { id: 'inicio', icon: Activity, label: 'Inicio', action: () => navigate('/dashboard') },
    { id: 'reservas', icon: BookOpen, label: 'Reservas', action: () => navigate('/admin/reservas') },
    { id: 'ocupacion', icon: Calendar, label: 'Ocupac.', action: () => navigate('/admin/ocupacion') },
    { id: 'finanzas', icon: Wallet, label: 'Finanzas', action: () => navigate('/admin/finanzas') },
    { id: 'config', icon: Settings, label: 'Config', action: () => navigate('/admin/config') },
  ];

  const header = (
    <DashboardHeader
      title="Gestión Reservas"
      onBack={() => navigate('/admin/reservas')}
      onLogout={handleLogout}
      notifications={notifications}
    />
  );
  const footer = (
    <DashboardFooter
      tabs={footerTabs}
      activeTab="reservas"
      onTabChange={(id) => {
        const tab = footerTabs.find((t) => t.id === id);
        if (tab?.action) tab.action();
      }}
    />
  );

  const cerrarSheet = useCallback(() => {
    setSheetAbierto(false);
    window.requestAnimationFrame(() => botonFiltrosRef.current?.focus());
  }, []);

  const abrirSheet = useCallback(() => {
    setBorrador({
      fechaDesde,
      fechaHasta,
      orden,
      filtroSede,
      filtroCurso,
      filtroInstructor,
      filtroAcademico,
      filtroHorasPendientes,
    });
    setSheetAbierto(true);
  }, [fechaDesde, fechaHasta, orden, filtroSede, filtroCurso, filtroInstructor, filtroAcademico, filtroHorasPendientes]);

  const cambiarBorrador = useCallback((campo, valor) => {
    setBorrador((previo) => ({ ...previo, [campo]: valor }));
  }, []);

  const aplicarBorrador = useCallback(() => {
    setFechaDesde(borrador.fechaDesde);
    setFechaHasta(borrador.fechaHasta);
    setOrden(borrador.orden);
    setFiltroSede(borrador.filtroSede);
    setFiltroCurso(borrador.filtroCurso);
    setFiltroInstructor(borrador.filtroInstructor);
    setFiltroAcademico(borrador.filtroAcademico);
    setFiltroHorasPendientes(borrador.filtroHorasPendientes);
    cerrarSheet();
  }, [borrador, cerrarSheet]);

  const limpiarBorrador = useCallback(() => {
    setBorrador({ ...FILTROS_AVANZADOS_INICIALES });
  }, []);

  const limpiarPanel = useCallback(() => {
    setFechaDesde('');
    setFechaHasta('');
    setFiltroSede('todas');
    setFiltroCurso('todos');
    setFiltroInstructor('todos');
    setFiltroAcademico('Todos');
    setFiltroHorasPendientes(false);
    setBorrador({ ...FILTROS_AVANZADOS_INICIALES });
  }, []);

  const limpiarTodo = useCallback(() => {
    setFiltroEstado('Todas');
    setBusqueda('');
    setOrden('curso_cercano');
    limpiarPanel();
    setSheetAbierto(false);
  }, [limpiarPanel]);

  const recargar = useCallback(() => {
    window.location.reload();
  }, []);

  const opcionesSede = useMemo(() => [
    { id: 'todas', nombre: 'Todas las sedes' },
    ...(sedes || []).map((s) => ({ id: String(s.id), nombre: formatearSede(s, { catalogos: catalogosSede }) })),
  ], [sedes, catalogosSede]);

  const opcionesCurso = useMemo(() => [
    { id: 'todos', nombre: 'Todos los cursos' },
    ...(cursos || []).map((c) => ({ id: String(c.id), nombre: c.nombre })),
  ], [cursos]);

  const opcionesInstructor = useMemo(() => [
    { id: 'todos', nombre: 'Todos los instructores' },
    ...(instructores || [])
      .filter((i) => i.activo)
      .map((i) => ({ id: String(i.id), nombre: `${i.nombre} ${i.apellido || ''}`.trim() })),
  ], [instructores]);

  const filtrosAvanzados = useMemo(() => ({
    fechaDesde,
    fechaHasta,
    orden,
    filtroSede,
    filtroCurso,
    filtroInstructor,
    filtroAcademico,
    filtroHorasPendientes,
  }), [fechaDesde, fechaHasta, orden, filtroSede, filtroCurso, filtroInstructor, filtroAcademico, filtroHorasPendientes]);

  const filtrosActivos = useMemo(() => contarFiltrosAvanzados(filtrosAvanzados), [filtrosAvanzados]);

  const reservasConHoras = useMemo(
    () => reservasFiltradas.filter((r) => (r.horasPendientes || 0) > 0).length,
    [reservasFiltradas]
  );

  const abrirReserva = (reserva) => {
    navigate(`/admin/reserva/${reserva.id}`, { state: { from: '/admin/reservas/lista' } });
  };

  const propsTarjeta = (reserva) => {
    const instr = (instructores || []).find((i) => String(i.id) === String(reserva.instructorId));
    const sede = (sedes || []).find((s) => String(s.id) === String(reserva.sedeId));
    const curso = (cursos || []).find((c) => String(c.id) === String(reserva.cursoId));
    const bloqueEfectivo = getHoraIdOcupacion(reserva, reserva.fecha2 || reserva.fecha);
    const horario = (horarios || []).find((h) => String(h.id) === String(bloqueEfectivo || reserva.horaId));
    const enCurso = esReservaEnCurso(reserva, horarios || [], hoyStr, minutosActuales);
    return {
      reserva,
      instructor: obtenerNombreInstructor(instr),
      sede: sede ? formatearSede(sede, { catalogos: catalogosSede }) : '—',
      curso: curso?.nombre || reserva.cursoId || '—',
      horario,
      enCurso,
      esProxima: reserva.id === proximaReservaId && !enCurso,
      estadoAcademico: getEstadoAcademico(reserva),
      onAbrir: () => abrirReserva(reserva),
    };
  };

  const conteoPagina = cargando || error ? '—' : reservasFiltradas.length;
  const tituloRestantes = orden === 'curso_cercano' ? 'Próximas' : 'Reservas';

  const pageHead = (
    <div className="mb-3 flex min-w-0 flex-wrap items-end justify-between gap-2">
      <div className="min-w-0">
        <p className="m-0 text-[10px] font-extrabold uppercase leading-tight tracking-[0.12em] text-blue-700">
          Operación
        </p>
        <h2 className="m-0 flex items-center gap-2 text-[22px] font-extrabold leading-tight tracking-tight text-gray-900 lg:text-[26px]">
          Reservas
          <span className="inline-flex h-6 min-w-[28px] items-center justify-center rounded-full bg-blue-50 px-2 text-[12px] font-extrabold tabular-nums text-blue-700">
            {conteoPagina}
          </span>
        </h2>
      </div>
    </div>
  );

  return (
    <AppShell header={header} footer={footer} bgColor="bg-gray-50" maxWidth="max-w-md lg:max-w-6xl">
      <div className="min-w-0 p-4 lg:px-6 lg:py-5">
        {pageHead}

        {cargando ? (
          <div aria-busy="true" className="min-w-0">
            <p className="sr-only" role="status">Cargando reservas</p>

            {/* Reserva la fila de chips + orden que la vista cargada renderiza en lg
                (AdminReservasList ~550-584) para que no haya salto al llegar datos. */}
            <div className="mb-3 hidden min-w-0 flex-wrap items-center justify-between gap-3 lg:flex">
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                {ESTADOS_PAGO.map((estado) => (
                  <span
                    key={estado}
                    className="h-11 w-20 rounded-full bg-gray-200 motion-safe:animate-pulse"
                  />
                ))}
              </div>
              <span className="h-11 w-[190px] rounded-xl bg-gray-200 motion-safe:animate-pulse" />
            </div>

            <div className="min-w-0 lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start lg:gap-5">
              <div className="hidden min-w-0 rounded-2xl border border-gray-100 bg-white p-4 lg:block">
                <span className="mb-4 block h-3 w-20 rounded bg-gray-200 motion-safe:animate-pulse" />
                {[0, 1, 2, 3, 4].map((indice) => (
                  <div key={indice} className="mb-3 last:mb-0">
                    <span className="mb-1.5 block h-2.5 w-16 rounded bg-gray-200 motion-safe:animate-pulse" />
                    <span className="block h-11 rounded-xl bg-gray-100 motion-safe:animate-pulse" />
                  </div>
                ))}
              </div>

              <div className="min-w-0">
                <div className="mb-2 flex min-h-12 min-w-0 items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3">
                  <Search size={18} aria-hidden="true" className="shrink-0 text-gray-400" />
                  <span className="h-2.5 w-3/5 rounded bg-gray-200 motion-safe:animate-pulse" />
                </div>
                <div className="mb-2 grid min-w-0 grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-2 lg:hidden">
                  <span className="h-11 rounded-xl bg-gray-200 motion-safe:animate-pulse" />
                  <span className="h-11 rounded-xl bg-gray-200 motion-safe:animate-pulse" />
                </div>
                <div className="mb-3 flex min-w-0 items-center justify-between text-[11.5px] text-gray-500">
                  <span className="h-2.5 w-2/5 rounded bg-gray-200 motion-safe:animate-pulse" />
                  <span className="h-2.5 w-16 rounded bg-gray-200 motion-safe:animate-pulse" />
                </div>
                <div className="grid min-w-0 grid-cols-1 gap-2.5 lg:grid-cols-2">
                  {[0, 1, 2, 3].map((indice) => (
                    <div key={indice} className="flex min-w-0 flex-col gap-2 rounded-2xl border border-gray-100 bg-white p-3 pl-4">
                      <span className="h-5 w-20 rounded-full bg-gray-200 motion-safe:animate-pulse" />
                      <span className="h-4 w-2/3 rounded bg-gray-200 motion-safe:animate-pulse" />
                      <span className="h-2.5 w-2/5 rounded bg-gray-200 motion-safe:animate-pulse" />
                      <div className="mt-1 grid grid-cols-2 gap-2 border-t border-gray-100 pt-2">
                        <span className="h-2.5 rounded bg-gray-200 motion-safe:animate-pulse" />
                        <span className="h-2.5 rounded bg-gray-200 motion-safe:animate-pulse" />
                        <span className="h-2.5 rounded bg-gray-200 motion-safe:animate-pulse" />
                        <span className="h-2.5 rounded bg-gray-200 motion-safe:animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : error ? (
          <div role="alert" className="flex min-w-0 flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-white px-4 py-8 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-red-50 text-red-600">
              <AlertTriangle size={26} aria-hidden="true" />
            </span>
            <h3 className="m-0 text-[16px] font-extrabold leading-snug tracking-tight text-gray-900">
              No pudimos cargar las reservas
            </h3>
            <p className="m-0 max-w-[330px] text-[12px] leading-relaxed text-gray-600">
              Revisa tu conexión e intenta de nuevo. No se modificó ningún dato.
            </p>
            <div className="mt-2 flex w-full flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={recargar}
                className="inline-flex min-h-11 flex-1 basis-[130px] items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 text-[12.5px] font-bold text-white hover:bg-blue-700"
              >
                <RefreshCw size={15} aria-hidden="true" />
                Reintentar
              </button>
              <button
                type="button"
                onClick={() => navigate('/admin/reservas')}
                className="inline-flex min-h-11 flex-1 basis-[130px] items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-[12.5px] font-bold text-gray-800 hover:bg-gray-50"
              >
                Volver
              </button>
            </div>
            <details className="mt-1 w-full text-left text-[10.5px] text-gray-500">
              <summary className="flex min-h-11 cursor-pointer items-center justify-center rounded-lg font-bold text-gray-700">
                Ver detalle técnico
              </summary>
              <p className="m-0 rounded-lg border border-gray-100 bg-white px-2.5 py-2">
                La consulta no se completó. Este mensaje no expone datos personales ni detalles de la cuenta.
              </p>
            </details>
          </div>
        ) : (
          <>
            <div className="mb-3 hidden min-w-0 flex-wrap items-center justify-between gap-3 lg:flex">
              <div role="group" aria-label="Filtrar por estado de pago" className="flex min-w-0 flex-wrap items-center gap-1.5">
                {ESTADOS_PAGO.map((estado) => {
                  const activo = filtroEstado === estado;
                  return (
                    <button
                      key={estado}
                      type="button"
                      aria-pressed={activo}
                      onClick={() => setFiltroEstado(estado)}
                      className={`min-h-11 rounded-full border px-3 text-[12px] font-semibold transition-colors ${
                        activo
                          ? 'border-gray-900 bg-gray-900 text-white'
                          : 'border-gray-200 bg-white text-gray-800 hover:bg-gray-50'
                      }`}
                    >
                      {estado}
                    </button>
                  );
                })}
              </div>
              <div className="min-w-0 sm:w-[190px]">
                <label htmlFor="orden-reservas" className="sr-only">Ordenar reservas</label>
                <select
                  id="orden-reservas"
                  value={orden}
                  onChange={(event) => setOrden(event.target.value)}
                  className="h-11 w-full min-w-0 rounded-xl border border-gray-200 bg-white px-2.5 text-[12px] font-semibold text-gray-900 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15"
                >
                  {OPCIONES_ORDEN.map((opcion) => (
                    <option key={opcion.id} value={opcion.id}>{opcion.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="min-w-0 lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start lg:gap-5">
              <FiltrosReservasPanel
                filtros={filtrosAvanzados}
                onCambio={(campo, valor) => {
                  const setters = {
                    fechaDesde: setFechaDesde,
                    fechaHasta: setFechaHasta,
                    filtroSede: setFiltroSede,
                    filtroCurso: setFiltroCurso,
                    filtroInstructor: setFiltroInstructor,
                    filtroAcademico: setFiltroAcademico,
                    filtroHorasPendientes: setFiltroHorasPendientes,
                  };
                  setters[campo]?.(valor);
                }}
                onLimpiar={limpiarPanel}
                opcionesSede={opcionesSede}
                opcionesCurso={opcionesCurso}
                opcionesInstructor={opcionesInstructor}
                reservasConHoras={reservasConHoras}
              />

              <section aria-label="Resultados de reservas" className="min-w-0">
                <div className="mb-2 flex min-h-12 min-w-0 items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-600/15">
                  <Search size={18} aria-hidden="true" className="shrink-0 text-gray-500" />
                  <label htmlFor="buscar-reservas" className="sr-only">Buscar nombre, CI o teléfono</label>
                  <input
                    id="buscar-reservas"
                    type="search"
                    value={busqueda}
                    onChange={(event) => setBusqueda(event.target.value)}
                    placeholder="Buscar nombre, CI o teléfono"
                    className="h-11 w-full min-w-0 bg-transparent text-[13px] text-gray-900 outline-none placeholder:text-gray-500"
                  />
                </div>

                <div className="mb-2 grid min-w-0 grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-2 lg:hidden">
                  <div className="relative flex min-w-0 items-center rounded-xl border border-gray-200 bg-white focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-600/15">
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none absolute left-3 h-1.5 w-1.5 rounded-full ${PUNTO_ESTADO_PAGO[filtroEstado] || 'bg-blue-600'}`}
                    />
                    <select
                      aria-label="Estado de pago"
                      value={filtroEstado}
                      onChange={(event) => setFiltroEstado(event.target.value)}
                      className="h-11 w-full min-w-0 appearance-none rounded-xl bg-transparent pl-7 pr-8 text-[12.5px] font-semibold text-gray-800 outline-none"
                    >
                      {ESTADOS_PAGO.map((estado) => (
                        <option key={estado} value={estado}>{estado}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} aria-hidden="true" className="pointer-events-none absolute right-2.5 text-gray-500" />
                  </div>
                  <button
                    ref={botonFiltrosRef}
                    type="button"
                    onClick={abrirSheet}
                    aria-expanded={sheetAbierto}
                    aria-controls="reservas-filtros-sheet"
                    className="flex h-11 min-w-0 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-2.5 text-[12px] font-bold text-gray-800 hover:bg-gray-50"
                  >
                    <Filter size={14} aria-hidden="true" className="shrink-0" />
                    <span className="whitespace-nowrap">Filtros</span>
                    <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-50 px-1.5 text-[10px] font-extrabold tabular-nums text-blue-700">
                      {filtrosActivos}
                    </span>
                  </button>
                </div>

                <div role="status" aria-live="polite" className="mb-2 flex min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-0.5 px-0.5 text-[11.5px] text-gray-500">
                  <span className="min-w-0">
                    <strong className="font-bold text-gray-800">{reservasFiltradas.length} resultados</strong>
                    {' · '}
                    {reservasPagina.length} en esta página
                  </span>
                  <span className="whitespace-nowrap">Página {paginaActual} de {totalPaginas}</span>
                </div>

                {reservasHoy.length > 0 && (
                  <section aria-labelledby="reservas-hoy-titulo" className="mb-4 min-w-0">
                    <div className="mb-2 flex min-w-0 flex-wrap items-center gap-2">
                      <Calendar size={14} aria-hidden="true" className="shrink-0 text-blue-600" />
                      <h3 id="reservas-hoy-titulo" className="m-0 text-[13px] font-extrabold leading-tight text-gray-900">
                        Hoy · {diaHoy}
                      </h3>
                      <span className="ml-auto inline-flex h-6 min-w-[28px] items-center justify-center rounded-full bg-blue-50 px-2 text-[11px] font-extrabold tabular-nums text-blue-700">
                        {reservasHoy.length}
                      </span>
                    </div>
                    <div className="grid min-w-0 grid-cols-1 gap-2.5 lg:grid-cols-2">
                      {reservasHoy.map((reserva) => (
                        <ReservaCard key={reserva.id} {...propsTarjeta(reserva)} />
                      ))}
                    </div>
                  </section>
                )}

                {reservasPagina.length > 0 && (
                  <section aria-labelledby="reservas-restantes-titulo" className="min-w-0">
                    <div className="mb-2 flex min-w-0 items-center gap-2">
                      <h3 id="reservas-restantes-titulo" className="m-0 text-[13px] font-extrabold leading-tight text-gray-900">
                        {tituloRestantes}
                      </h3>
                      <span className="ml-auto text-[11px] font-semibold text-gray-500">
                        {reservasPagina.length} visibles
                      </span>
                    </div>
                    <div className="grid min-w-0 grid-cols-1 gap-2.5 lg:grid-cols-2 xl:grid-cols-3">
                      {reservasPagina.map((reserva) => (
                        <ReservaCard key={reserva.id} {...propsTarjeta(reserva)} />
                      ))}
                    </div>
                  </section>
                )}

                {reservasPagina.length === 0 && reservasFiltradas.length === 0 && (
                  <div className="mt-2 flex min-w-0 flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-white px-4 py-8 text-center">
                    <span className="grid h-14 w-14 place-items-center rounded-full bg-blue-50 text-blue-700">
                      <SearchX size={26} aria-hidden="true" />
                    </span>
                    <h3 className="m-0 text-[16px] font-extrabold leading-snug tracking-tight text-gray-900">
                      No hay reservas con estos filtros
                    </h3>
                    <p className="m-0 max-w-[330px] text-[12px] leading-relaxed text-gray-600">
                      Prueba con otro rango de fechas o quita algún filtro. Si esperabas ver datos, actualiza la lista.
                    </p>
                    <div className="mt-2 flex w-full flex-wrap justify-center gap-2">
                      <button
                        type="button"
                        onClick={limpiarTodo}
                        className="min-h-11 flex-1 basis-[130px] rounded-xl bg-blue-600 px-4 text-[12.5px] font-bold text-white hover:bg-blue-700"
                      >
                        Limpiar filtros
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
                )}

                {totalPaginas > 1 && (
                  <nav aria-label="Paginación de reservas" className="mt-3 flex min-w-0 items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setPagina((p) => Math.max(1, p - 1))}
                      disabled={paginaActual <= 1}
                      className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-gray-200 bg-white px-2.5 text-[11.5px] font-bold text-gray-800 hover:bg-gray-50 disabled:opacity-45"
                    >
                      <ArrowLeft size={14} aria-hidden="true" />
                      Anterior
                    </button>
                    <span className="whitespace-nowrap text-[11px] font-bold tabular-nums text-gray-500">
                      {paginaActual} / {totalPaginas}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                      disabled={paginaActual >= totalPaginas}
                      className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-gray-200 bg-white px-2.5 text-[11.5px] font-bold text-gray-800 hover:bg-gray-50 disabled:opacity-45"
                    >
                      Siguiente
                      <ArrowRight size={14} aria-hidden="true" />
                    </button>
                  </nav>
                )}
              </section>
            </div>
          </>
        )}
      </div>

      {sheetAbierto && (
        <FiltrosReservasSheet
          filtros={borrador}
          onCambio={cambiarBorrador}
          onLimpiar={limpiarBorrador}
          onAplicar={aplicarBorrador}
          onCerrar={cerrarSheet}
          resultados={resultadosBorrador.length}
          opcionesSede={opcionesSede}
          opcionesCurso={opcionesCurso}
          opcionesInstructor={opcionesInstructor}
        />
      )}
    </AppShell>
  );
};

export default AdminReservasList;
