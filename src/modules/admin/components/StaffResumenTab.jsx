// @build: 2026-11-19 | id: STAFF-RESUMEN-FINANZAS | desc: Resumen histórico y pendiente por staff
import { useMemo } from 'react';
import { BookOpen, CheckCircle, Clock, DollarSign } from 'lucide-react';
import { comisionInstructorReserva, comisionProveedorReserva } from '../../shared/utils/finanzasHelpers';
import { formatearMonto } from '../../shared/utils/currency';

const StaffResumenTab = ({
  staff,
  tipoStaff,
  staffId,
  reservasPendientes = [],
  pagos = [],
  cursos = [],
  config = {},
  getDetallesPago
}) => {
  const moneda = config?.monedaPagoStaff || 'USD';

  const resumen = useMemo(() => {
    const cursoNombre = (cursoId, tipoCurso) => {
      const porId = (cursos || []).find((c) => String(c.id) === String(cursoId));
      return porId?.nombre || tipoCurso || 'Curso';
    };

    const comisionPendiente = (r) => (
      tipoStaff === 'instructor'
        ? comisionInstructorReserva(r, staffId, { permitirColaboracion: true })
        : comisionProveedorReserva(r, config)
    );

    const pendientePorCurso = new Map();
    reservasPendientes.forEach((r) => {
      const key = r.cursoId || r.tipoCurso || 'sin-curso';
      const actual = pendientePorCurso.get(key) || {
        curso: cursoNombre(r.cursoId, r.tipoCurso),
        cantidad: 0,
        monto: 0
      };
      actual.cantidad += 1;
      actual.monto += comisionPendiente(r);
      pendientePorCurso.set(key, actual);
    });

    const pagadoPorCurso = new Map();
    (pagos || []).forEach((p) => {
      const detalles = getDetallesPago ? getDetallesPago(p) : (p.detalles || []);
      detalles.forEach((d) => {
        const key = d.cursoId || d.tipoCurso || 'sin-curso';
        const actual = pagadoPorCurso.get(key) || {
          curso: cursoNombre(d.cursoId, d.tipoCurso),
          cantidad: 0,
          monto: 0
        };
        actual.cantidad += 1;
        actual.monto += Number(d.comision) || 0;
        pagadoPorCurso.set(key, actual);
      });
    });

    const totalPendiente = reservasPendientes.reduce((acc, r) => acc + comisionPendiente(r), 0);
    const totalPagado = (pagos || []).reduce((acc, p) => acc + (Number(p.montoTotal) || 0), 0);

    return {
      totalPendiente,
      totalPagado,
      pendientes: reservasPendientes.length,
      pagos: (pagos || []).length,
      pendientePorCurso: Array.from(pendientePorCurso.values()).sort((a, b) => b.monto - a.monto),
      pagadoPorCurso: Array.from(pagadoPorCurso.values()).sort((a, b) => b.monto - a.monto),
      ultimosPagos: (pagos || []).slice(0, 5)
    };
  }, [reservasPendientes, pagos, cursos, config, staffId, tipoStaff, getDetallesPago]);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <p className="text-[10px] font-black uppercase tracking-wide text-gray-500">Resumen de</p>
        <p className="text-lg font-black text-gray-900">{staff?.nombre} {staff?.apellido || ''}</p>
        <p className="text-xs font-bold uppercase text-blue-600">{tipoStaff}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
          <Clock size={18} className="text-orange-500 mb-1" />
          <p className="text-[10px] font-black uppercase text-orange-600">Por Cobrar</p>
          <p className="text-2xl font-black text-orange-900">{formatearMonto(resumen.totalPendiente, moneda)}</p>
          <p className="text-xs text-orange-600">{resumen.pendientes} reservas</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
          <CheckCircle size={18} className="text-green-500 mb-1" />
          <p className="text-[10px] font-black uppercase text-green-600">Pagado</p>
          <p className="text-2xl font-black text-green-900">{formatearMonto(resumen.totalPagado, moneda)}</p>
          <p className="text-xs text-green-600">{resumen.pagos} pagos</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-gray-100 rounded-xl p-3">
          <DollarSign size={16} className="text-blue-500 mb-1" />
          <p className="text-[10px] font-bold uppercase text-gray-500">Reservas pendientes</p>
          <p className="text-lg font-black text-gray-900">{resumen.pendientes}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-3">
          <BookOpen size={16} className="text-indigo-500 mb-1" />
          <p className="text-[10px] font-bold uppercase text-gray-500">Pagos registrados</p>
          <p className="text-lg font-black text-gray-900">{resumen.pagos}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <h3 className="text-sm font-black text-gray-900 mb-3">Pendiente por curso</h3>
        {resumen.pendientePorCurso.length === 0 ? (
          <p className="text-xs text-gray-500">Sin reservas pendientes.</p>
        ) : (
          <div className="space-y-2">
            {resumen.pendientePorCurso.map((item, idx) => (
              <div key={`${item.curso}-${idx}`} className="flex justify-between items-center text-xs border-b border-gray-50 last:border-0 pb-2 last:pb-0">
                <div>
                  <p className="font-bold text-gray-800">{item.curso}</p>
                  <p className="text-gray-500">{item.cantidad} reservas</p>
                </div>
                <p className="font-black text-orange-700">{formatearMonto(item.monto, moneda)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <h3 className="text-sm font-black text-gray-900 mb-3">Pagado por curso</h3>
        {resumen.pagadoPorCurso.length === 0 ? (
          <p className="text-xs text-gray-500">Sin pagos registrados.</p>
        ) : (
          <div className="space-y-2">
            {resumen.pagadoPorCurso.map((item, idx) => (
              <div key={`${item.curso}-${idx}`} className="flex justify-between items-center text-xs border-b border-gray-50 last:border-0 pb-2 last:pb-0">
                <div>
                  <p className="font-bold text-gray-800">{item.curso}</p>
                  <p className="text-gray-500">{item.cantidad} reservas</p>
                </div>
                <p className="font-black text-green-700">{formatearMonto(item.monto, moneda)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <h3 className="text-sm font-black text-gray-900 mb-3">Últimos pagos</h3>
        {resumen.ultimosPagos.length === 0 ? (
          <p className="text-xs text-gray-500">Sin pagos registrados.</p>
        ) : (
          <div className="space-y-2">
            {resumen.ultimosPagos.map((p) => {
              const detalles = getDetallesPago ? getDetallesPago(p) : (p.detalles || []);
              return (
                <div key={p.id} className="flex justify-between items-center text-xs border-b border-gray-50 last:border-0 pb-2 last:pb-0">
                  <div>
                    <p className="font-bold text-gray-800">{p.fecha || '—'}</p>
                    <p className="text-gray-500">{detalles.length || (p.reservaIds || []).length} reservas · {p.metodoPago || 'efectivo'}</p>
                  </div>
                  <p className="font-black text-gray-900">{formatearMonto(p.montoTotal, moneda)}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffResumenTab;
