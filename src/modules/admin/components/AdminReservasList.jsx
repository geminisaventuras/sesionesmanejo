// @build: 2026-08-28.14-35-00 | id: BXX-BYY | backup: AdminReservasList.jsx.backup-20260828-143500 | desc: Mejora de vista de reservas con sección Hoy, badges y filtros combinados
import { useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppContext } from '../../../context/AppContextValue';
import { Button, Select } from '../../../components/UI';
import AppShell from '../../shared/components/AppShell';
import DashboardHeader from '../../shared/components/DashboardHeader';
import DashboardFooter from '../../shared/components/DashboardFooter';
import {
  Search, Calendar, Clock, ArrowLeft, ArrowRight,
  BookOpen, Activity, Wallet, Settings, MapPin, Bike, Filter
} from 'lucide-react';
import {
  obtenerHoyVenezuela,
  obtenerMinutosActualesVenezuela,
  esReservaEnCurso,
  obtenerFechaMasCercana
} from '../utils/reservasHelpers';

const AdminReservasList = () => {
  const { reservas, instructores, cursos, horarios, sedes, user, logoutUser } = useContext(AppContext);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const filtroInicial = searchParams.get('filtro') || 'Todas';
  const [filtroEstado, setFiltroEstado] = useState(filtroInicial);
  const [orden, setOrden] = useState('curso_cercano'); // Nuevo por defecto
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  const POR_PAGINA = 5;

  // Nuevos filtros combinados
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [filtroSede, setFiltroSede] = useState('todas');
  const [filtroCurso, setFiltroCurso] = useState('todos');
  const [filtroInstructor, setFiltroInstructor] = useState('todos');

  // Tick para actualizar "EN CURSO" cada minuto
  const [tick, setTick] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setTick(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const res = reservas || [];

  // Zona horaria Venezuela
  const hoyStr = useMemo(() => obtenerHoyVenezuela(), [tick]);
  const minutosActuales = useMemo(() => obtenerMinutosActualesVenezuela(), [tick]);

  const formatearFechaCorta = (fechaStr) => {
    if (!fechaStr) return '—';
    const [y, m, d] = fechaStr.split('-');
    return `${d}/${m}/${y?.slice(2)}`;
  };

  const reservasFiltradas = useMemo(() => {
    let filtradas = res;
    if (filtroEstado !== 'Todas') {
      filtradas = filtradas.filter(r => r.estadoPago === filtroEstado);
    }
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase();
      filtradas = filtradas.filter(r => {
        const instr = (instructores || []).find(i => String(i.id) === String(r.instructorId));
        const curso = (cursos || []).find(c => String(c.id) === String(r.cursoId));
        const sede = (sedes || []).find(s => String(s.id) === String(r.sedeId));
        const campos = [
          r.nombre, r.apellido, r.cedula, r.telefono, r.correo, r.contactoEmergencia,
          r.cursoId, r.sedeId, r.tipoMoto, r.pagoBanco, r.pagoRef, r.estado, r.zona,
          r.fecha, r.fecha2, r.horaId,
          instr?.nombre, instr?.apellido, curso?.nombre, sede?.nombre
        ].filter(Boolean).join(' ').toLowerCase();
        return campos.includes(q);
      });
    }
    // Filtro por rango de fechas
    if (fechaDesde) {
      filtradas = filtradas.filter(r => {
        const fecha1 = r.fecha || '';
        const fecha2 = r.fecha2 || '';
        return (fecha1 && fecha1 >= fechaDesde) || (fecha2 && fecha2 >= fechaDesde);
      });
    }
    if (fechaHasta) {
      filtradas = filtradas.filter(r => {
        const fecha1 = r.fecha || '';
        const fecha2 = r.fecha2 || '';
        return (fecha1 && fecha1 <= fechaHasta) || (fecha2 && fecha2 <= fechaHasta);
      });
    }
    // Filtro por sede
    if (filtroSede !== 'todas') {
      filtradas = filtradas.filter(r => String(r.sedeId) === filtroSede);
    }
    // Filtro por curso
    if (filtroCurso !== 'todos') {
      filtradas = filtradas.filter(r => String(r.cursoId) === filtroCurso);
    }
    // Filtro por instructor
    if (filtroInstructor !== 'todos') {
      filtradas = filtradas.filter(r => String(r.instructorId) === filtroInstructor);
    }
    return filtradas;
  }, [res, filtroEstado, busqueda, fechaDesde, fechaHasta, filtroSede, filtroCurso, filtroInstructor, instructores, cursos, sedes]);

  // Separar reservas de hoy
  const reservasHoy = useMemo(() => {
    return reservasFiltradas.filter(r => r.fecha === hoyStr || r.fecha2 === hoyStr);
  }, [reservasFiltradas, hoyStr]);

  const reservasRestantes = useMemo(() => {
    return reservasFiltradas.filter(r => r.fecha !== hoyStr && r.fecha2 !== hoyStr);
  }, [reservasFiltradas, hoyStr]);

  // Identificar próxima reserva
  const proximaReservaId = useMemo(() => {
    const futuras = reservasFiltradas
      .filter(r => {
        const fechaCercana = obtenerFechaMasCercana(r, hoyStr);
        return fechaCercana && !esReservaEnCurso(r, horarios, hoyStr, minutosActuales);
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

  // Ordenamiento de lista general
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

  useEffect(() => { setPagina(1); }, [filtroEstado, busqueda, orden, fechaDesde, fechaHasta, filtroSede, filtroCurso, filtroInstructor]);

  const estadoBadge = {
    Pendiente: 'bg-orange-100 text-orange-700',
    Aprobado: 'bg-green-100 text-green-700',
    Rechazado: 'bg-red-100 text-red-700',
    Cancelado: 'bg-gray-200 text-gray-700',
  };

  const handleLogout = useCallback(async () => {
    if (logoutUser) await logoutUser();
    navigate('/');
  }, [logoutUser, navigate]);

  const footerTabs = [
    { id: 'inicio', icon: Activity, label: 'Inicio', action: () => navigate('/dashboard') },
    { id: 'reservas', icon: BookOpen, label: 'Reservas', action: () => navigate('/admin/reservas') },
    { id: 'ocupacion', icon: Calendar, label: 'Ocupac.', action: () => navigate('/admin/ocupacion') },
    { id: 'finanzas', icon: Wallet, label: 'Finanzas', action: () => navigate('/admin/finanzas') },
    { id: 'config', icon: Settings, label: 'Config', action: () => navigate('/admin/config') }
  ];

  const { notifications } = useContext(AppContext);
  const header = <DashboardHeader title="Gestión Reservas" onBack={() => navigate('/admin/reservas')} onLogout={handleLogout} notifications={notifications} />;

  const footer = <DashboardFooter
    tabs={footerTabs}
    activeTab="reservas"
    onTabChange={(id) => {
      const tab = footerTabs.find(t => t.id === id);
      if (tab?.action) tab.action();
    }}
  />;

  return (
    <AppShell header={header} footer={footer} bgColor="bg-gray-50">
      <div className="p-4 space-y-4">
        {/* Filtros */}
        <div className="bg-white p-3 rounded-xl border border-gray-100 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Filter size={16} className="text-gray-500" />
            <span className="text-xs font-black text-gray-700 uppercase tracking-wider">Filtros</span>
          </div>
          <div className="flex gap-2">
            <Select label="" options={['Todas', 'Pendiente', 'Aprobado', 'Rechazado', 'Cancelado']} value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="!mb-0 flex-1" />
            <Select label="" options={[
              { id: 'curso_cercano', nombre: 'Próximas primero' },
              { id: 'recientes_desc', nombre: 'Más recientes' },
              { id: 'recientes_asc', nombre: 'Más antiguos' },
              { id: 'curso_lejano', nombre: 'Curso + lejano' }
            ]} value={orden} onChange={e => setOrden(e.target.value)} className="!mb-0 flex-1" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] text-gray-500 font-bold">Desde</label>
              <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-[9px] text-gray-500 font-bold">Hasta</label>
              <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-blue-500" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Select label="" options={[{ id: 'todas', nombre: 'Sedes' }, ...(sedes || []).map(s => ({ id: String(s.id), nombre: s.nombre }))]} value={filtroSede} onChange={e => setFiltroSede(e.target.value)} className="!mb-0" />
            <Select label="" options={[{ id: 'todos', nombre: 'Cursos' }, ...(cursos || []).map(c => ({ id: String(c.id), nombre: c.nombre }))]} value={filtroCurso} onChange={e => setFiltroCurso(e.target.value)} className="!mb-0" />
            <Select label="" options={[{ id: 'todos', nombre: 'Instruct.' }, ...(instructores || []).filter(i => i.activo).map(i => ({ id: String(i.id), nombre: `${i.nombre} ${i.apellido || ''}` }))]} value={filtroInstructor} onChange={e => setFiltroInstructor(e.target.value)} className="!mb-0" />
          </div>

          <div className="relative">
            <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
            <input type="text" placeholder="Buscar: nombre, CI, tel, sede, instructor, fecha..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:border-blue-500" />
          </div>
        </div>

        {/* Sección Reservas de Hoy */}
        {reservasHoy.length > 0 && (
          <div className="bg-yellow-50 border-2 border-yellow-200 p-3 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={16} className="text-yellow-700" />
              <h3 className="text-sm font-black text-yellow-900 uppercase">Reservas de Hoy ({reservasHoy.length})</h3>
            </div>
            <div className="space-y-2">
              {reservasHoy.map(r => {
                const enCurso = esReservaEnCurso(r, horarios, hoyStr, minutosActuales);
                return (
                  <button key={r.id} onClick={() => navigate(`/admin/reserva/${r.id}`)} className="w-full bg-white p-3 rounded-xl shadow-sm border border-yellow-100 text-left hover:border-blue-300 transition-colors active:scale-[0.99]">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-yellow-200 text-yellow-900">HOY</span>
                        {enCurso && <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-green-500 text-white motion-safe:animate-pulse">EN CURSO</span>}
                        {r.id === proximaReservaId && !enCurso && <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-blue-500 text-white">PRÓXIMA</span>}
                        <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${estadoBadge[r.estadoPago] || 'bg-gray-100'}`}>{r.estadoPago === 'Cancelado' ? 'CANCELADO' : r.estadoPago}</span>
                      </div>
                      <span className="font-bold text-sm text-gray-900">{r.nombre} {r.apellido}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-gray-500">
                      <span className="flex items-center gap-1"><Calendar size={11} />{formatearFechaCorta(r.fecha || r.fecha1)} – {formatearFechaCorta(r.fecha2)}</span>
                      <span className="flex items-center gap-1"><Clock size={11} />{horarios?.find(h => String(h.id) === String(r.horaId))?.label || r.horaId}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Lista general */}
        <div className="flex items-center justify-between text-[10px] text-gray-500">
          <span>Página {paginaActual} de {totalPaginas} ({reservasOrdenadas.length} resultados)</span>
        </div>

        {reservasPagina.length === 0 ? (
          <p className="text-center text-gray-500 py-6 text-xs">No hay reservas</p>
        ) : (
          <div className="space-y-2">
            {reservasPagina.map(r => {
              const instr = (instructores || []).find(i => String(i.id) === String(r.instructorId));
              const sede = (sedes || []).find(s => String(s.id) === String(r.sedeId));
              const curso = (cursos || []).find(c => String(c.id) === String(r.cursoId));
              const horario = (horarios || []).find(h => String(h.id) === String(r.horaId));
              const enCurso = esReservaEnCurso(r, horarios, hoyStr, minutosActuales);
              return (
                <button key={r.id} onClick={() => navigate(`/admin/reserva/${r.id}`)} className="w-full bg-white p-3 rounded-xl shadow-sm border border-gray-100 text-left hover:border-blue-300 transition-colors active:scale-[0.99]">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {r.id === proximaReservaId && !enCurso && <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-blue-500 text-white">PRÓXIMA</span>}
                      {enCurso && <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-green-500 text-white motion-safe:animate-pulse">EN CURSO</span>}
                      <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${estadoBadge[r.estadoPago] || 'bg-gray-100'}`}>{r.estadoPago === 'Cancelado' ? 'CANCELADO' : r.estadoPago}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-gray-900">{r.nombre} {r.apellido}</span>
                      <span className="text-[10px] text-gray-400">CI: {r.cedula}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-gray-500">
                    <span className="flex items-center gap-1"><Calendar size={11} />{formatearFechaCorta(r.fecha || r.fecha1)} – {formatearFechaCorta(r.fecha2)}</span>
                    <span className="flex items-center gap-1"><Clock size={11} />{horario?.label || r.horaId}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-0.5">
                    <span>👤 {instr ? `${instr.nombre} ${instr.apellido || ''}` : 'Sin instructor'}</span>
                    <span className="flex items-center gap-1"><MapPin size={11} />{sede?.nombre || r.sedeId || '—'}</span>
                    <span className="flex items-center gap-1"><BookOpen size={11} />{curso?.nombre || r.cursoId || '—'}</span>
                    <span className="flex items-center gap-1"><Bike size={11} />{r.tipoMoto}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {totalPaginas > 1 && (
          <div className="flex items-center justify-between pt-2">
            <Button type="button" onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={paginaActual <= 1} variant="outline" className="!py-1.5 !px-3 !text-[10px] !w-auto" icon={ArrowLeft}>Anterior</Button>
            <span className="text-[10px] text-gray-500">{paginaActual} / {totalPaginas}</span>
            <Button type="button" onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={paginaActual >= totalPaginas} variant="outline" className="!py-1.5 !px-3 !text-[10px] !w-auto" icon={ArrowRight}>Siguiente</Button>
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default AdminReservasList;