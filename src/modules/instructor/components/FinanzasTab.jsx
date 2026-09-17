// @build: 2026-09-16 | id: FINANZAS-TAB-V2 | desc: Finanzas del instructor con cuenta por cobrar + historial de pagos
import React, { useState, useEffect, useMemo } from 'react';
import { DollarSign, Clock, TrendingUp, Calendar } from 'lucide-react';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../../../firebase';
import { formatearMonto } from '../../shared/utils/currency';
import { formatearFechaSinAnio } from '../../shared/utils/fechas';
import EmptyState from '../../shared/components/EmptyState';
import { Spinner } from '../../../components/UI';
import { PagosStaffService } from '../../../services/PagosStaffService';

const TABS = [
  { id: 'cobrar', label: 'Por Cobrar' },
  { id: 'historial', label: 'Historial' },
  { id: 'resumen', label: 'Resumen' }
];

const FILTROS = [
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

function calcularComision(reserva, curso) {
  if (typeof reserva?.comisionInstructor === 'number') return reserva.comisionInstructor;
  if (curso && typeof curso.comisionInstructor === 'number') return curso.comisionInstructor;
  return 0;
}

// A2.1: comisión fraccionada cuando la reserva es compartida.
// Si la reserva no es compartida, delega en calcularComision (mismo comportamiento).
function calcularComisionInstructor(reserva, curso, userId) {
  const total = calcularComision(reserva, curso);
  if (!reserva?.esReservaCompartida) return total;
  const inv = (reserva.instructoresInvolucrados || []).find(
    i => String(i.id) === String(userId)
  );
  if (!inv || typeof inv.porcentaje !== 'number') return 0;
  return total * (inv.porcentaje / 100);
}

// A2.1: chequea si la parte del instructor ya fue pagada
function estaPagadoMiParte(reserva, userId) {
  if (!reserva?.esReservaCompartida) return reserva?.pagadoInstructor === true;
  const inv = (reserva.instructoresInvolucrados || []).find(
    i => String(i.id) === String(userId)
  );
  return inv?.pagado === true;
}

export default function FinanzasTab({ reservas, cursos, user }) {
  const [tab, setTab] = useState('cobrar');
  const [pagos, setPagos] = useState([]);
  const [cargandoPagos, setCargandoPagos] = useState(true);
   const [pagoExpandido, setPagoExpandido] = useState(null);
  const [colaboraciones, setColaboraciones] = useState([]);
  const [cargandoColaboraciones, setCargandoColaboraciones] = useState(true);
    const [filtroFecha, setFiltroFecha] = useState('todo');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
   const [filtroCursoId, setFiltroCursoId] = useState('');
  const [filtroMetodo, setFiltroMetodo] = useState('');
  const [filtroResumen, setFiltroResumen] = useState('mes');
  const [resumenDesde, setResumenDesde] = useState('');
  const [resumenHasta, setResumenHasta] = useState('');

  const uid = user?.uid;

  // Cargar pagos del instructor
  useEffect(() => {
    let activo = true;
    if (!uid) {
      setCargandoPagos(false);
      return;
    }
    const cargar = async () => {
      setCargandoPagos(true);
      const res = await PagosStaffService.obtenerPagosPorStaff(uid, 'instructor');
      if (!activo) return;
      setPagos(res.success ? (res.data || []) : []);
      setCargandoPagos(false);
    };
     cargar();
    return () => { activo = false; };
  }, [uid]);

  // A2.1: Cargar reservas donde el instructor actual es COLABORADOR
  useEffect(() => {
    let activo = true;
    if (!uid) {
      setCargandoColaboraciones(false);
      setColaboraciones([]);
      return;
    }
    const cargar = async () => {
      setCargandoColaboraciones(true);
      try {
        const ref = collection(db, 'artifacts', 'motoescuela-pro-v1', 'public', 'data', 'reservas');
        const q = query(ref, where('implicadosIds', 'array-contains', String(uid)), limit(100));
        const snap = await getDocs(q);
        if (!activo) return;
        const data = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(r => String(r.instructorId) !== String(uid));
        setColaboraciones(data);
      } catch (err) {
        console.error('[FinanzasTab] Error cargando colaboraciones:', err.message);
        if (activo) setColaboraciones([]);
      } finally {
        if (activo) setCargandoColaboraciones(false);
      }
    };
    cargar();
    return () => { activo = false; };
  }, [uid]);

   // A2.1: Merge de reservas propias (instructorId) + colaboraciones
  // Dedupe por id. Reservas propias tienen prioridad.
  const todasMisReservas = useMemo(() => {
    const map = new Map();
    (colaboraciones || []).forEach(r => map.set(String(r.id), r));
    (reservas || []).forEach(r => map.set(String(r.id), r));
    return Array.from(map.values());
  }, [reservas, colaboraciones]);

  // Reservas aprobadas pendientes de pago al instructor
  const reservasPorCobrar = useMemo(() => {
    return todasMisReservas.filter(r =>
      r.estadoPago === 'Aprobado' && !estaPagadoMiParte(r, uid)
    );
  }, [todasMisReservas, uid]);

  // Reservas aprobadas YA pagadas al instructor
  const reservasPagadas = useMemo(() => {
    return todasMisReservas.filter(r =>
      r.estadoPago === 'Aprobado' && estaPagadoMiParte(r, uid)
    );
  }, [todasMisReservas, uid]);

   const totalPorCobrar = useMemo(() => {
    return reservasPorCobrar.reduce((acc, r) => {
      const curso = cursos?.find(c => String(c.id) === String(r.cursoId));
      return acc + calcularComisionInstructor(r, curso, uid);
    }, 0);
  }, [reservasPorCobrar, cursos, uid]);

  const totalHistoricoPagado = useMemo(() => {
    return (pagos || []).reduce((acc, p) => acc + (Number(p.montoTotal) || 0), 0);
  }, [pagos]);

  // Aplicar filtro de fecha
  const reservasPorCobrarFiltradas = useMemo(() => {
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

    return reservasPorCobrar
      .filter(r => {
        if (desde && r.fecha < desde) return false;
        if (hasta && r.fecha > hasta) return false;
        return true;
      })
      .sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')));
  }, [reservasPorCobrar, filtroFecha, fechaDesde, fechaHasta]);

  // Detalles de un pago (snapshot o fallback a reservas cargadas)
  const getDetallesPago = (p) => {
    if (p.detalles && p.detalles.length > 0) return p.detalles;
    if (!p.reservaIds?.length) return [];
    return p.reservaIds.map(rid => {
      const r = (reservas || []).find(x => String(x.id) === String(rid));
      if (!r) return { reservaId: rid, estudiante: '(reserva eliminada)', comision: 0, fecha: null, tipoCurso: null, cursoId: null };
      const curso = cursos?.find(c => String(c.id) === String(r.cursoId));
      return {
        reservaId: rid,
        fecha: r.fecha,
        tipoCurso: r.tipoCurso,
        cursoId: r.cursoId || null,
        estudiante: `${r.nombre || ''} ${r.apellido || ''}`.trim(),
               comision: calcularComisionInstructor(r, curso, uid)
      };
    });
  };

   const cursoNombre = (cursoId, tipoCurso) => {
    const porId = (cursos || []).find(c => String(c.id) === String(cursoId));
    if (porId) return porId.nombre;
    return ETIQUETAS_CURSO[tipoCurso] || tipoCurso || cursoId || 'Curso';
  };

  // Filtros aplicados al historial
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
  }, [pagos, reservas, cursos, filtroFecha, fechaDesde, fechaHasta, filtroMetodo, filtroCursoId]);

   // Reset expansión al cambiar filtros
  useEffect(() => {
    setPagoExpandido(null);
  }, [filtroFecha, filtroCursoId, filtroMetodo, fechaDesde, fechaHasta]);

  // ─── Cálculos del Resumen ─────────────────────────────
  const rangoResumen = useMemo(() => {
    const hoy = hoyVET();
    let desde = null;
    let hasta = null;
    if (filtroResumen === 'todo') {
      desde = null;
      hasta = null;
    } else if (filtroResumen === 'hoy') {
      desde = hoy; hasta = hoy;
    } else if (filtroResumen === 'semana') {
      desde = inicioSemanaVET(); hasta = hoy;
    } else if (filtroResumen === 'mes') {
      desde = inicioMesVET(); hasta = hoy;
    } else if (filtroResumen === 'rango') {
      desde = resumenDesde || null;
      hasta = resumenHasta || null;
    }
    return { desde, hasta };
  }, [filtroResumen, resumenDesde, resumenHasta]);

   const resumenTotales = useMemo(() => {
    const { desde, hasta } = rangoResumen;

    // GENERADO: reservas aprobadas (propias + colaboraciones) con fecha en rango
    const generado = todasMisReservas
      .filter(r => {
        if (r.estadoPago !== 'Aprobado') return false;
        if (desde && r.fecha < desde) return false;
        if (hasta && r.fecha > hasta) return false;
        return true;
      })
      .reduce((acc, r) => {
        const curso = cursos?.find(c => String(c.id) === String(r.cursoId));
        return acc + calcularComisionInstructor(r, curso, uid);
      }, 0);

    // COBRADO: pagos con fecha en rango
    const cobrado = (pagos || [])
      .filter(p => {
        if (desde && p.fecha < desde) return false;
        if (hasta && p.fecha > hasta) return false;
        return true;
      })
      .reduce((acc, p) => acc + (Number(p.montoTotal) || 0), 0);

    // PENDIENTE: generado no pagado de mi parte
    const pendiente = todasMisReservas
      .filter(r => {
        if (r.estadoPago !== 'Aprobado') return false;
        if (estaPagadoMiParte(r, uid)) return false;
        return true;
      })
      .reduce((acc, r) => {
        const curso = cursos?.find(c => String(c.id) === String(r.cursoId));
        return acc + calcularComisionInstructor(r, curso, uid);
      }, 0);

    return { generado, cobrado, pendiente };
  }, [todasMisReservas, cursos, pagos, rangoResumen, uid]);

  // Desglose por semana: Generado + estado de liquidación
  const resumenPorSemana = useMemo(() => {
    const { desde, hasta } = rangoResumen;

    // Helper: lunes de la semana de una fecha YYYY-MM-DD
    const lunesDeFecha = (fechaStr) => {
      const d = new Date(fechaStr + 'T12:00:00');
      const dia = d.getDay() || 7;
      d.setDate(d.getDate() - (dia - 1));
      return d.toISOString().split('T')[0];
    };

     const grupos = {};

    todasMisReservas.forEach(r => {
      if (r.estadoPago !== 'Aprobado' || !r.fecha) return;
      if (desde && r.fecha < desde) return;
      if (hasta && r.fecha > hasta) return;

      const lunes = lunesDeFecha(r.fecha);
      if (!grupos[lunes]) {
        grupos[lunes] = {
          lunes,
          generado: 0,
          cubierto: 0,
          pendiente: 0,
          fechasPago: []
        };
      }

            const curso = cursos?.find(c => String(c.id) === String(r.cursoId));
      const com = calcularComisionInstructor(r, curso, uid);
      grupos[lunes].generado += com;

      if (r.pagadoInstructor) {
        grupos[lunes].cubierto += com;
        // Guardar timestamp del pago para mostrar la fecha
        if (r.pagadoInstructorEn) {
          const ts = r.pagadoInstructorEn;
          const ms = typeof ts === 'number' ? ts : (ts?.toMillis?.() || 0);
          if (ms) grupos[lunes].fechasPago.push(ms);
        }
      } else {
        grupos[lunes].pendiente += com;
      }
    });

    return Object.values(grupos)
      .map(g => {
        let estado;
        if (g.pendiente === 0 && g.cubierto > 0) {
          const fechaPagoMs = g.fechasPago.length > 0 ? Math.max(...g.fechasPago) : null;
          let textoFecha = '';
          if (fechaPagoMs) {
            const d = new Date(fechaPagoMs);
            textoFecha = d.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' });
          }
          estado = {
            tipo: 'cubierto',
            texto: textoFecha ? `Cubierto el ${textoFecha}` : 'Cubierto',
            icono: '✓',
            color: 'text-green-600'
          };
        } else if (g.cubierto > 0 && g.pendiente > 0) {
          estado = {
            tipo: 'parcial',
            texto: `Parcial: ${formatearMonto(g.cubierto)} de ${formatearMonto(g.generado)}`,
            icono: '◐',
            color: 'text-orange-600'
          };
        } else {
          estado = {
            tipo: 'pendiente',
            texto: `Pendiente ${formatearMonto(g.generado)}`,
            icono: '⚠',
            color: 'text-red-600'
          };
        }
        return { ...g, estado };
      })
      .sort((a, b) => b.lunes.localeCompare(a.lunes))
      .slice(0, 12);
   }, [todasMisReservas, cursos, rangoResumen, uid]);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-black text-gray-900 uppercase tracking-widest">Mis Finanzas</h2>

      {/* Cabecera financiera */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={18} className="text-orange-600" />
            <span className="text-[10px] font-black text-orange-700 uppercase tracking-wide">Por Cobrar</span>
          </div>
          <p className="text-2xl font-black text-orange-900">{formatearMonto(totalPorCobrar)}</p>
          <p className="text-xs text-orange-600 mt-1">{reservasPorCobrar.length} reservas</p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={18} className="text-green-600" />
            <span className="text-[10px] font-black text-green-700 uppercase tracking-wide">Histórico Pagado</span>
          </div>
          <p className="text-2xl font-black text-green-900">{formatearMonto(totalHistoricoPagado)}</p>
          <p className="text-xs text-green-600 mt-1">{pagos.length} pagos</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs text-blue-700">
          <strong>Nota:</strong> Los montos corresponden a tu comisión fija por clase al momento de crear la reserva.
        </p>
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

      {/* TAB: Por Cobrar */}
      {tab === 'cobrar' && (
        <div className="space-y-3">
          {/* Filtros de fecha */}
          <div className="bg-white border border-gray-100 rounded-xl p-3 space-y-2">
            <div className="flex gap-1 overflow-x-auto pb-1">
              {FILTROS.map(f => (
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

            <div className="text-[10px] text-gray-500 text-right">
              {reservasPorCobrarFiltradas.length} de {reservasPorCobrar.length} reservas
            </div>
          </div>

          {/* Tabla */}
          {reservasPorCobrar.length === 0 ? (
            <EmptyState
              icon={DollarSign}
              title="Sin comisiones por cobrar"
              description="Cuando tengas clases aprobadas pendientes de pago, aparecerán aquí."
            />
          ) : reservasPorCobrarFiltradas.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-xl p-6 text-center">
              <Calendar size={32} className="text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No hay reservas en este rango.</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-100">
              {reservasPorCobrarFiltradas.map(r => {
                const curso = cursos?.find(c => String(c.id) === String(r.cursoId));
                return (
                  <div key={r.id} className="p-3">
                    <div className="flex justify-between items-start gap-2">
                                         <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <p className="text-sm font-bold text-gray-800 truncate">{curso?.nombre || 'Curso'}</p>
                          {r.esReservaCompartida && (() => {
                            const inv = (r.instructoresInvolucrados || []).find(i => String(i.id) === String(uid));
                            return inv ? (
                              <span className="text-[9px] font-black text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded shrink-0">
                                COLAB {inv.porcentaje}%
                              </span>
                            ) : null;
                          })()}
                        </div>
                        <p className="text-[11px] text-gray-500 truncate">{r.nombre} {r.apellido}</p>
                        <p className="text-[10px] text-gray-400">{formatearFechaSinAnio(r.fecha)}</p>
                      </div>
                      <span className="text-sm font-black text-gray-900 shrink-0">
                        {formatearMonto(calcularComisionInstructor(r, curso, uid))}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

           {/* TAB: Historial */}
      {tab === 'historial' && (
        <div className="space-y-3">
          {/* Filtros */}
          <div className="bg-white border border-gray-100 rounded-xl p-3 space-y-2">
            <div className="flex gap-1 overflow-x-auto pb-1">
              {FILTROS.map(f => (
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

          {cargandoPagos ? (
            <div className="bg-white border border-gray-100 rounded-xl p-4">
              <Spinner message="Cargando pagos..." />
            </div>
          ) : pagos.length === 0 ? (
            <EmptyState
              icon={DollarSign}
              title="Sin pagos recibidos"
              description="Cuando la escuela te registre un pago, aparecerá aquí."
            />
          ) : pagosFiltrados.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-xl p-6 text-center">
              <p className="text-sm text-gray-500">No hay pagos que coincidan con los filtros.</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-100">
              {pagosFiltrados.map(p => {
                const expandido = pagoExpandido === p.id;
                const detalles = getDetallesPago(p);

                return (
                  <div key={p.id}>
                    <button
                      type="button"
                      onClick={() => setPagoExpandido(expandido ? null : p.id)}
                      className="w-full text-left p-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-center">
                                               <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-gray-900">{formatearMonto(p.montoTotal)}</p>
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
                            {p.fecha} · {(p.metodoPago || 'efectivo').replace('_', ' ')}
                            {p.banco ? ` · ${p.banco}` : ''}
                            {p.referencia ? ` · Ref: ${p.referencia}` : ''}
                          </p>
                          {p.notas && <p className="text-[10px] text-gray-400 italic mt-0.5">"{p.notas}"</p>}
                        </div>
                        <span className="text-xs text-gray-500 ml-2 shrink-0">
                          {detalles.length} reservas {expandido ? '▲' : '▼'}
                        </span>
                      </div>
                    </button>

                                       {expandido && (
                      <div className="bg-gray-50 border-t border-gray-100 px-3 py-2 space-y-1.5">
                        {(filtroCursoId
                          ? detalles.filter(d => String(d.cursoId) === String(filtroCursoId))
                          : detalles
                        ).length === 0 ? (
                          <p className="text-xs text-gray-400 italic">Sin detalle disponible.</p>
                                               ) : (
                          (filtroCursoId
                            ? detalles.filter(d => String(d.cursoId) === String(filtroCursoId))
                            : detalles
                          ).map((d, i) => (
                            <div key={i} className="flex justify-between items-start gap-2 text-[11px]">
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-gray-700 truncate">
                                  {d.fecha || '—'} · {cursoNombre(d.cursoId, d.tipoCurso)}
                                </p>
                                <p className="text-gray-500 truncate">{d.estudiante || '—'}</p>
                              </div>
                              <span className="font-black text-gray-800 shrink-0">
                                {formatearMonto(d.comision)}
                              </span>
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
      )}

      {/* TAB: Resumen */}
      {tab === 'resumen' && (
        <div className="space-y-3">
          {/* Filtros */}
          <div className="bg-white border border-gray-100 rounded-xl p-3 space-y-2">
            <div className="flex gap-1 overflow-x-auto pb-1">
              {[
                { id: 'todo', label: 'Todo' },
                { id: 'hoy', label: 'Hoy' },
                { id: 'semana', label: 'Semana' },
                { id: 'mes', label: 'Mes' },
                { id: 'rango', label: 'Rango' }
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFiltroResumen(f.id)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-colors ${
                    filtroResumen === f.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >{f.label}</button>
              ))}
            </div>

            {filtroResumen === 'rango' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 mb-1">Desde</label>
                  <input
                    type="date"
                    value={resumenDesde}
                    onChange={e => setResumenDesde(e.target.value)}
                    className="w-full bg-gray-50 border rounded-lg py-1.5 px-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 mb-1">Hasta</label>
                  <input
                    type="date"
                    value={resumenHasta}
                    onChange={e => setResumenHasta(e.target.value)}
                    className="w-full bg-gray-50 border rounded-lg py-1.5 px-2 text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Tres totales */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <p className="text-[10px] font-black text-blue-600 uppercase">Generado</p>
              <p className="text-lg font-black text-blue-900 mt-1">{formatearMonto(resumenTotales.generado)}</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-3">
              <p className="text-[10px] font-black text-green-600 uppercase">Cobrado</p>
              <p className="text-lg font-black text-green-900 mt-1">{formatearMonto(resumenTotales.cobrado)}</p>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
              <p className="text-[10px] font-black text-orange-600 uppercase">Pendiente</p>
              <p className="text-lg font-black text-orange-900 mt-1">{formatearMonto(resumenTotales.pendiente)}</p>
            </div>
          </div>

          {/* Desglose por semana */}
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
              <p className="text-xs font-bold text-gray-700">Desglose por semana</p>
            </div>
            {resumenPorSemana.length === 0 ? (
              <p className="text-sm text-gray-500 p-4 text-center">Sin datos en este rango.</p>
            ) : (
                           <div className="divide-y divide-gray-100">
                {resumenPorSemana.map(({ lunes, generado, estado }) => (
                  <div key={lunes} className="p-3 flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-700">Semana del {lunes}</p>
                      <p className="text-[10px] text-gray-500">
                        Gen: {formatearMonto(generado)}
                      </p>
                    </div>
                    <span className={`text-xs font-black shrink-0 ${estado.color}`}>
                      {estado.icono} {estado.texto}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}