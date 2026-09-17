// @build: 2026-09-16 | id: STAFF-FINANZAS-VIEW | desc: Vista de finanzas por staff (instructor o proveedor)
import { useContext, useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppContext } from '../../../context/AppContextValue';
import { Spinner } from '../../../components/UI';
import AppShell from '../../shared/components/AppShell';
import DashboardHeader from '../../shared/components/DashboardHeader';
import DashboardFooter from '../../shared/components/DashboardFooter';
import { PagosStaffService } from '../../../services/PagosStaffService';
import TabCuentaPorCobrar from './TabCuentaPorCobrar';
import ModalRegistrarPago from './ModalRegistrarPago';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../../../firebase';
import {
  Activity, BookOpen, Calendar, Wallet, Settings,
  User, Briefcase
} from 'lucide-react';

const TABS = [
  { id: 'cobrar', label: 'Cuenta por Cobrar' },
  { id: 'historial', label: 'Historial de Pagos' },
  { id: 'resumen', label: 'Resumen' }
];

const FILTROS_FECHA = [
  { id: 'todo', label: 'Todo' },
  { id: 'hoy', label: 'Hoy' },
  { id: 'semana', label: 'Semana' },
  { id: 'mes', label: 'Mes' },
  { id: 'rango', label: 'Rango' }
];

const ETIQUETAS_CURSO = {
  equilibrio: 'Equilibrio',
  basico_auto: 'Básico Automática',
  basico_sincro: 'Básico Sincrónica',
  general: 'Práctica en la Vía',
  motero: 'Curso Motero'
};

const hoyVET = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });

const inicioSemanaVET = () => {
  const d = new Date();
  const dia = d.getDay() || 7;
  const lunes = new Date(d);
  lunes.setDate(d.getDate() - (dia - 1));
  return lunes.toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });
};

const inicioMesVET = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1)
    .toLocaleDateString('en-CA', { timeZone: 'America/Caracas' });
};

const StaffFinanzasView = () => {
  const { staffId } = useParams();
  const navigate = useNavigate();
  const { instructores, proveedores, reservas, cursos, notifications } = useContext(AppContext);

  const [tab, setTab] = useState('cobrar');
  const [pagos, setPagos] = useState([]);
  const [cargandoPagos, setCargandoPagos] = useState(true);
  const [modalPago, setModalPago] = useState(null);
  const [pagoExpandido, setPagoExpandido] = useState(null);
    const [colaboraciones, setColaboraciones] = useState([]);
  const [cargandoColaboraciones, setCargandoColaboraciones] = useState(true);
  const [filtroFecha, setFiltroFecha] = useState('todo');
  const [filtroCursoId, setFiltroCursoId] = useState('');
  const [filtroMetodo, setFiltroMetodo] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  // Detectar si es instructor o proveedor
  const instructor = (instructores || []).find(i => String(i.id) === String(staffId));
  const proveedor = (proveedores || []).find(p => String(p.id) === String(staffId));
  const tipoStaff = instructor ? 'instructor' : (proveedor ? 'proveedor' : null);
  const staff = instructor || proveedor;

  // Cargar pagos
  const recargarPagos = async () => {
    if (!staffId || !tipoStaff) return;
    const res = await PagosStaffService.obtenerPagosPorStaff(staffId, tipoStaff);
    setPagos(res.success ? (res.data || []) : []);
  };

   useEffect(() => {
    let activo = true;
    if (!staffId || !tipoStaff) {
      setCargandoPagos(false);
      return;
    }
    const cargar = async () => {
      setCargandoPagos(true);
      const res = await PagosStaffService.obtenerPagosPorStaff(staffId, tipoStaff);
      if (!activo) return;
      setPagos(res.success ? (res.data || []) : []);
      setCargandoPagos(false);
    };
    cargar();
    return () => { activo = false; };
  }, [staffId, tipoStaff]);

  // A2.1: Cargar reservas donde el instructor es COLABORADOR
  useEffect(() => {
    let activo = true;
    if (!staffId || tipoStaff !== 'instructor') {
      setCargandoColaboraciones(false);
      setColaboraciones([]);
      return;
    }
    const cargar = async () => {
      setCargandoColaboraciones(true);
      try {
        const ref = collection(db, 'artifacts', 'motoescuela-pro-v1', 'public', 'data', 'reservas');
        const q = query(ref, where('implicadosIds', 'array-contains', String(staffId)), limit(100));
        const snap = await getDocs(q);
        if (!activo) return;
        const data = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(r => String(r.instructorId) !== String(staffId));
        setColaboraciones(data);
      } catch (err) {
        console.error('[StaffFinanzasView] Error cargando colaboraciones:', err.message);
        if (activo) setColaboraciones([]);
      } finally {
        if (activo) setCargandoColaboraciones(false);
      }
    };
    cargar();
    return () => { activo = false; };
  }, [staffId, tipoStaff]);

   // Reservas pendientes del staff (propias + colaboraciones si es instructor)
  const reservasPendientes = useMemo(() => {
    if (!staffId || !tipoStaff) return [];

    // Merge: reservas propias + colaboraciones (solo aplica a instructores)
    const map = new Map();
    if (tipoStaff === 'instructor') {
      (colaboraciones || []).forEach(r => map.set(String(r.id), r));
    }
    (reservas || []).forEach(r => {
      if (tipoStaff === 'instructor') {
        if (String(r.instructorId) !== String(staffId)) return;
      } else {
        if (String(r.proveedorId) !== String(staffId)) return;
      }
      map.set(String(r.id), r);
    });

    return Array.from(map.values()).filter(r => {
      if (r.estadoPago !== 'Aprobado') return false;
      if (tipoStaff === 'instructor') {
        if (r.esReservaCompartida === true) {
          const inv = (r.instructoresInvolucrados || []).find(x => String(x.id) === String(staffId));
          return inv && inv.pagado !== true;
        }
        return !r.pagadoInstructor;
      }
      return !r.pagadoProveedor;
    }).sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')));
  }, [reservas, colaboraciones, staffId, tipoStaff]);

   const totalPendiente = useMemo(() => {
    return reservasPendientes.reduce((acc, r) => {
      const com = tipoStaff === 'instructor' ? r.comisionInstructor : r.comisionProveedor;
      const base = typeof com === 'number' ? com : 0;
      if (tipoStaff === 'instructor' && r.esReservaCompartida === true) {
        const inv = (r.instructoresInvolucrados || []).find(x => String(x.id) === String(staffId));
        const pct = typeof inv?.porcentaje === 'number' ? inv.porcentaje : 0;
        return acc + (base * pct / 100);
      }
      return acc + base;
    }, 0);
  }, [reservasPendientes, tipoStaff, staffId]);

  const totalPagado = useMemo(() => {
    return (pagos || []).reduce((acc, p) => acc + (Number(p.montoTotal) || 0), 0);
  }, [pagos]);

  // Helper: obtiene los detalles de un pago (usa snapshot o fallback a ctx.reservas)
  const getDetallesPago = (p) => {
    if (p.detalles && p.detalles.length > 0) return p.detalles;
    if (!p.reservaIds?.length) return [];
    return p.reservaIds.map(rid => {
      const r = (reservas || []).find(x => String(x.id) === String(rid));
      if (!r) {
        return {
          reservaId: rid,
          estudiante: '(reserva eliminada)',
          comision: 0,
          fecha: null,
          tipoCurso: null,
          cursoId: null
        };
      }
         const com = tipoStaff === 'instructor' ? r.comisionInstructor : r.comisionProveedor;
      let base = typeof com === 'number' ? com : 0;
      if (tipoStaff === 'instructor' && r.esReservaCompartida === true) {
        const inv = (r.instructoresInvolucrados || []).find(x => String(x.id) === String(staffId));
        const pct = typeof inv?.porcentaje === 'number' ? inv.porcentaje : 0;
        base = base * pct / 100;
      }
      return {
        reservaId: rid,
        fecha: r.fecha,
        tipoCurso: r.tipoCurso,
        cursoId: r.cursoId || null,
        horaId: r.horaId,
        estudiante: `${r.nombre || ''} ${r.apellido || ''}`.trim(),
        comision: base
      };
    });
  };

  // Filtros aplicados
  const pagosFiltrados = useMemo(() => {
    const hoy = hoyVET();
    let desde = null;
    let hasta = null;

    if (filtroFecha === 'hoy') { desde = hoy; hasta = hoy; }
    else if (filtroFecha === 'semana') desde = inicioSemanaVET();
    else if (filtroFecha === 'mes') desde = inicioMesVET();
    else if (filtroFecha === 'rango') {
      desde = fechaDesde || null;
      hasta = fechaHasta || null;
    }

    return (pagos || []).filter(p => {
      if (desde && p.fecha < desde) return false;
      if (hasta && p.fecha > hasta) return false;
      if (filtroMetodo && p.metodoPago !== filtroMetodo) return false;

      if (filtroCursoId) {
        const detalles = getDetallesPago(p);
        const tieneCurso = detalles.some(d => String(d.cursoId) === String(filtroCursoId));
        if (!tieneCurso) return false;
      }

      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagos, reservas, tipoStaff, filtroFecha, fechaDesde, fechaHasta, filtroMetodo, filtroCursoId]);

  // Reset del pago expandido cuando cambian los filtros
  useEffect(() => {
    setPagoExpandido(null);
  }, [filtroFecha, filtroCursoId, filtroMetodo, fechaDesde, fechaHasta]);

  const cursoNombre = (cursoId, tipoCurso) => {
    const porId = (cursos || []).find(c => String(c.id) === String(cursoId));
    if (porId) return porId.nombre;
    return ETIQUETAS_CURSO[tipoCurso] || tipoCurso || cursoId || 'Curso';
  };

  const handleLogout = () => navigate('/');

  const footerTabs = [
    { id: 'inicio', icon: Activity, label: 'Inicio', action: () => navigate('/dashboard') },
    { id: 'reservas', icon: BookOpen, label: 'Reservas', action: () => navigate('/admin/reservas') },
    { id: 'ocupacion', icon: Calendar, label: 'Ocupac.', action: () => navigate('/admin/ocupacion') },
    { id: 'finanzas', icon: Wallet, label: 'Finanzas', action: () => navigate('/admin/finanzas') },
    { id: 'config', icon: Settings, label: 'Config', action: () => navigate('/admin/config') }
  ];

  const header = (
    <DashboardHeader
      title={staff ? `${staff.nombre || ''} ${staff.apellido || ''}`.trim() || 'Finanzas' : 'Finanzas'}
      onBack={() => navigate('/admin/finanzas')}
      onLogout={handleLogout}
      notifications={notifications}
    />
  );

  const footer = (
    <DashboardFooter
      tabs={footerTabs}
      activeTab="finanzas"
      onTabChange={(id) => {
        const t = footerTabs.find(x => x.id === id);
        if (t?.action) t.action();
      }}
    />
  );

  if (!staffId) {
    return (
      <AppShell header={header} footer={footer} bgColor="bg-gray-50">
        <div className="p-6 text-center text-gray-500">ID de staff no proporcionado.</div>
      </AppShell>
    );
  }

  if (!tipoStaff || !staff) {
    return (
      <AppShell header={header} footer={footer} bgColor="bg-gray-50">
        <div className="p-6 text-center text-gray-500">Staff no encontrado.</div>
      </AppShell>
    );
  }

  return (
    <AppShell header={header} footer={footer} bgColor="bg-gray-50">
      <div className="p-4 space-y-4">
        {/* Cabecera financiera */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
            <p className="text-[10px] font-black text-orange-600 uppercase tracking-wide">Por Cobrar</p>
            <p className="text-2xl font-black text-orange-900 mt-1">${totalPendiente}</p>
            <p className="text-xs text-orange-600 mt-1">{reservasPendientes.length} reservas</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
            <p className="text-[10px] font-black text-green-600 uppercase tracking-wide">Histórico Pagado</p>
            <p className="text-2xl font-black text-green-900 mt-1">${totalPagado}</p>
            <p className="text-xs text-green-600 mt-1">{pagos.length} pagos</p>
          </div>
        </div>

        {/* Identificación del staff */}
        <div className="bg-white border border-gray-100 rounded-xl p-3 flex items-center gap-3">
          {tipoStaff === 'instructor'
            ? <User size={20} className="text-blue-500" />
            : <Briefcase size={20} className="text-blue-500" />}
          <div className="flex-1">
            <p className="font-bold text-sm text-gray-900">{staff.nombre} {staff.apellido || ''}</p>
            <p className="text-xs text-gray-500 uppercase">{tipoStaff}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1 border-b border-gray-200">
          {TABS.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-3 py-2 text-xs font-bold rounded-t-lg whitespace-nowrap transition-colors ${
                tab === t.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >{t.label}</button>
          ))}
        </div>

        {/* TAB: Cuenta por Cobrar */}
              {tab === 'cobrar' && (
          <TabCuentaPorCobrar
            reservasPendientes={reservasPendientes}
            cursos={cursos}
            tipoStaff={tipoStaff}
            staffId={staffId}
            onRegistrarPago={(ids, monto) => setModalPago({ reservaIds: ids, monto })}
          />
        )}

        {/* TAB: Historial de Pagos */}
        {tab === 'historial' && (
          <div className="space-y-3">
            {/* Filtros */}
            <div className="bg-white border border-gray-100 rounded-xl p-3 space-y-2">
              <div className="flex gap-1 overflow-x-auto pb-1">
                {FILTROS_FECHA.map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFiltroFecha(f.id)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-colors ${
                      filtroFecha === f.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >{f.label}</button>
                ))}
              </div>

              {filtroFecha === 'rango' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 mb-1">Desde</label>
                    <input
                      type="date"
                      value={fechaDesde}
                      onChange={e => setFechaDesde(e.target.value)}
                      className="w-full bg-gray-50 border rounded-lg py-1.5 px-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 mb-1">Hasta</label>
                    <input
                      type="date"
                      value={fechaHasta}
                      onChange={e => setFechaHasta(e.target.value)}
                      className="w-full bg-gray-50 border rounded-lg py-1.5 px-2 text-xs"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 mb-1">Curso</label>
                  <select
                    value={filtroCursoId}
                    onChange={e => setFiltroCursoId(e.target.value)}
                    className="w-full bg-gray-50 border rounded-lg py-1.5 px-2 text-xs"
                  >
                    <option value="">Todos</option>
                    {(cursos || []).filter(c => c.activo !== false).map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 mb-1">Método</label>
                  <select
                    value={filtroMetodo}
                    onChange={e => setFiltroMetodo(e.target.value)}
                    className="w-full bg-gray-50 border rounded-lg py-1.5 px-2 text-xs"
                  >
                    <option value="">Todos</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="pago_movil">Pago Móvil</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="usdt">USDT</option>
                  </select>
                </div>
              </div>

              <div className="text-[10px] text-gray-500 text-right">
                {pagosFiltrados.length} de {pagos.length} pagos
              </div>
            </div>

            {/* Listado de pagos */}
            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
              {cargandoPagos ? (
                <div className="p-4"><Spinner message="Cargando pagos..." /></div>
              ) : pagos.length === 0 ? (
                <p className="text-sm text-gray-500 p-4">Sin pagos registrados.</p>
              ) : pagosFiltrados.length === 0 ? (
                <p className="text-sm text-gray-500 p-4">No hay pagos que coincidan con los filtros.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {pagosFiltrados.map(p => {
                    const expandido = pagoExpandido === p.id;
                    const detallesCompletos = getDetallesPago(p);
                    // Si hay filtro por curso, mostrar solo las reservas de ese curso en el detalle
                    const detallesMostrar = filtroCursoId
                      ? detallesCompletos.filter(d => String(d.cursoId) === String(filtroCursoId))
                      : detallesCompletos;

                    return (
                      <div key={p.id}>
                        <button
                          type="button"
                          onClick={() => setPagoExpandido(expandido ? null : p.id)}
                          className="w-full text-left p-3 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex justify-between items-center">
                                                    <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-gray-900">${p.montoTotal}</p>
                                                       {p.montoTotalVES != null && (
                              <p className="text-[11px] font-bold text-blue-700">
                                Bs. {Number(p.montoTotalVES).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                {p.tasaAplicada != null && (
                                  <span className="ml-1 text-[10px] font-normal text-blue-500">
                                    (tasa {p.monedaTasa || 'USD'}: {p.tasaAplicada})
                                  </span>
                                )}
                              </p>
                            )}
                            <p className="text-[11px] text-gray-500">
                              {p.fecha} · {p.metodoPago || 'efectivo'}
                              {p.banco ? ` · ${p.banco}` : ''}
                              {p.referencia ? ` · Ref: ${p.referencia}` : ''}
                            </p>
                            {p.notas && <p className="text-[10px] text-gray-400 italic mt-0.5">"{p.notas}"</p>}
                          </div>
                            <span className="text-xs text-gray-500 ml-2 shrink-0">
                              {detallesMostrar.length} reservas {expandido ? '▲' : '▼'}
                            </span>
                          </div>
                        </button>

                        {expandido && (
                          <div className="bg-gray-50 border-t border-gray-100 px-3 py-2 space-y-1.5">
                            {detallesMostrar.length === 0 ? (
                              <p className="text-xs text-gray-400 italic">Sin detalle disponible.</p>
                            ) : (
                              detallesMostrar.map((d, i) => (
                                <div key={i} className="flex justify-between items-start gap-2 text-[11px]">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-bold text-gray-700 truncate">
                                      {d.fecha || '—'} · {cursoNombre(d.cursoId, d.tipoCurso)}
                                    </p>
                                    <p className="text-gray-500 truncate">{d.estudiante || '—'}</p>
                                  </div>
                                  <span className="font-black text-gray-800 shrink-0">${d.comision}</span>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: Resumen */}
        {tab === 'resumen' && (
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <p className="text-sm text-gray-500">Próximamente: resumen histórico.</p>
          </div>
        )}
      </div>

      {modalPago && (
        <ModalRegistrarPago
          reservaIds={modalPago.reservaIds}
          monto={modalPago.monto}
          tipoStaff={tipoStaff}
          staffId={staffId}
          staffNombre={`${staff.nombre || ''} ${staff.apellido || ''}`.trim()}
          onClose={() => setModalPago(null)}
          onSuccess={async () => {
            setModalPago(null);
            await recargarPagos();
          }}
        />
      )}
    </AppShell>
  );
};

export default StaffFinanzasView;