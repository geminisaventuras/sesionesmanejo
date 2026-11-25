import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  ChevronDown,
  Clock,
  DollarSign,
  History,
  Receipt,
  RefreshCw,
  TrendingUp,
  Wallet
} from 'lucide-react';
import { Spinner } from '../../../components/UI';
import EmptyState from '../../shared/components/EmptyState';
import { formatearMonto } from '../../shared/utils/currency';
import { formatearFechaSinAnio } from '../../shared/utils/fechas';
import { PagosStaffService } from '../../../services/PagosStaffService';
import { DeudasProveedorService } from '../../shared/services/DeudasProveedorService';
import {
  calcularResumenProveedor,
  construirHistorial,
  etiquetaMetodo,
  filtrarHistorial,
  reservasPorCobrar,
  resumenMensual
} from '../utils/finanzasProveedor';

const TABS = [
  { id: 'cobrar', label: 'Por Cobrar' },
  { id: 'historial', label: 'Historial' },
  { id: 'resumen', label: 'Resumen' }
];

const FILTROS_TIPO = [
  { id: 'todo', label: 'Todo' },
  { id: 'pago', label: 'Pagos' },
  { id: 'abono', label: 'Abonos' },
  { id: 'deuda', label: 'Deudas' }
];

const etiquetaMes = (clave) => {
  const [anio, mes] = String(clave || '').split('-');
  if (!anio || !mes) return clave || '—';
  const fecha = new Date(Number(anio), Number(mes) - 1, 1);
  if (Number.isNaN(fecha.getTime())) return clave;
  return fecha.toLocaleDateString('es-VE', { month: 'short', year: 'numeric' });
};

const cortoId = (valor) => {
  const texto = String(valor || '');
  return texto.length > 10 ? texto.slice(-6) : texto;
};

export default function ProveedorFinanzasTab({ reservas = [], user, config = {} }) {
  const uid = user?.uid;
  const moneda = config?.monedaPagoStaff || 'USD';
  const [tab, setTab] = useState('cobrar');
  const [pagos, setPagos] = useState([]);
  const [deudas, setDeudas] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [recarga, setRecarga] = useState(0);
  const [filtroTipo, setFiltroTipo] = useState('todo');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [expandido, setExpandido] = useState(null);

  useEffect(() => {
    if (!uid) {
      setPagos([]);
      setDeudas([]);
      setSolicitudes([]);
      setCargando(false);
      return () => {};
    }

    let activo = true;
    setCargando(true);
    setError('');

    Promise.allSettled([
      PagosStaffService.obtenerPagosPorStaff(uid, 'proveedor', { limitDocs: 200 }),
      DeudasProveedorService.obtenerDeudasProveedor(uid, { soloPendientes: false }),
      DeudasProveedorService.obtenerSolicitudesProveedor(uid, { soloPendientes: false })
    ]).then(([resPagos, resDeudas, resSolicitudes]) => {
      if (!activo) return;
      const fallos = [];

      if (resPagos.status === 'fulfilled' && resPagos.value?.success) {
        setPagos(resPagos.value.data || []);
      } else {
        setPagos([]);
        fallos.push('pagos');
      }

      if (resDeudas.status === 'fulfilled' && resDeudas.value?.success) {
        setDeudas(resDeudas.value.data || []);
      } else {
        setDeudas([]);
        fallos.push('deudas');
      }

      if (resSolicitudes.status === 'fulfilled' && resSolicitudes.value?.success) {
        setSolicitudes(resSolicitudes.value.data || []);
      } else {
        setSolicitudes([]);
        fallos.push('solicitudes');
      }

      setError(fallos.length ? `No se pudieron cargar: ${fallos.join(', ')}.` : '');
      setCargando(false);
    });

    return () => {
      activo = false;
    };
  }, [uid, recarga]);

  const resumen = useMemo(
    () => calcularResumenProveedor({ reservas, pagos, deudas, uid, config }),
    [reservas, pagos, deudas, uid, config]
  );

  const porCobrar = useMemo(
    () => reservasPorCobrar(reservas, uid, config),
    [reservas, uid, config]
  );

  const historial = useMemo(
    () => construirHistorial({ pagos, deudas, solicitudes }),
    [pagos, deudas, solicitudes]
  );

  const historialFiltrado = useMemo(
    () => filtrarHistorial(historial, { tipo: filtroTipo, desde: fechaDesde, hasta: fechaHasta }),
    [historial, filtroTipo, fechaDesde, fechaHasta]
  );

  const mensual = useMemo(() => resumenMensual(historial, 6), [historial]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-black text-gray-900 uppercase tracking-widest">Mis Finanzas</h2>
          <p className="text-[11px] text-gray-500 mt-0.5">Comisiones, pagos y deuda con la app.</p>
        </div>
        <button
          type="button"
          onClick={() => setRecarga((valor) => valor + 1)}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-gray-600 hover:bg-gray-50"
          aria-label="Actualizar finanzas"
        >
          <RefreshCw size={14} /> Actualizar
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={18} className="text-green-600" />
            <span className="text-[10px] font-black text-green-700 uppercase tracking-wide">Cobrado</span>
          </div>
          <p className="text-2xl font-black text-green-900 break-words tabular-nums">
            {formatearMonto(resumen.cobrado, moneda)}
          </p>
          <p className="text-[10px] text-green-600 mt-1">Comisión ya pagada</p>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={18} className="text-orange-600" />
            <span className="text-[10px] font-black text-orange-700 uppercase tracking-wide">Por Cobrar</span>
          </div>
          <p className="text-2xl font-black text-orange-900 break-words tabular-nums">
            {formatearMonto(resumen.porCobrar, moneda)}
          </p>
          <p className="text-[10px] text-orange-600 mt-1">{porCobrar.length} reservas</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={18} className="text-red-600" />
            <span className="text-[10px] font-black text-red-700 uppercase tracking-wide">Deuda pendiente</span>
          </div>
          <p className="text-xl font-black text-red-900 break-words tabular-nums">
            {formatearMonto(resumen.deudaPendiente, moneda)}
          </p>
          <p className="text-[10px] text-red-600 mt-1">Con la app</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wallet size={18} className="text-blue-600" />
            <span className="text-[10px] font-black text-blue-700 uppercase tracking-wide">Pagos recibidos</span>
          </div>
          <p className="text-xl font-black text-blue-900 break-words tabular-nums">
            {formatearMonto(resumen.pagosNeto, moneda)}
          </p>
          <p className="text-[10px] text-blue-600 mt-1">{pagos.length} pagos (neto)</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-[11px] text-blue-700">
          <strong>Nota:</strong> los montos son tu comisión por sesión, no el precio del curso.
          Los pagos recibidos descuentan automáticamente la deuda pendiente (FIFO).
        </p>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
          <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-800">{error} El resto de la información sigue disponible.</p>
        </div>
      )}

      <div className="flex gap-1 overflow-x-auto pb-1 border-b border-gray-200">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            aria-pressed={tab === item.id}
            className={`px-3 py-2 text-xs font-bold rounded-t-lg whitespace-nowrap transition-colors ${
              tab === item.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'cobrar' && (
        <div className="space-y-3">
          <div className="bg-white border border-gray-100 rounded-xl p-3 flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wide text-gray-500">Total por cobrar</p>
              <p className="text-lg font-black text-orange-700 tabular-nums">{formatearMonto(resumen.porCobrar, moneda)}</p>
            </div>
            <span className="text-[10px] font-bold text-gray-500">{porCobrar.length} reservas</span>
          </div>

          {cargando ? (
            <Spinner message="Cargando comisiones..." />
          ) : porCobrar.length === 0 ? (
            <EmptyState
              icon={DollarSign}
              title="Sin comisiones por cobrar"
              description="Cuando tengas sesiones aprobadas pendientes de pago, aparecerán aquí."
            />
          ) : (
            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-100">
              {porCobrar.map((item) => (
                <div key={item.id} className="p-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-bold text-gray-800 truncate">
                          {item.tipoCurso || 'Sesión'}
                        </p>
                        {item.dias.map((dia) => (
                          <span
                            key={dia}
                            className="text-[9px] font-black uppercase text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded"
                          >
                            {dia === 'unico' ? 'Sesión' : dia}
                          </span>
                        ))}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {item.fecha ? formatearFechaSinAnio(item.fecha) : 'Fecha por confirmar'}
                        {item.reserva?.horaId ? ` · ${item.reserva.horaId}` : ''}
                      </p>
                      <p className="text-[10px] text-gray-400">Reserva {cortoId(item.id)}</p>
                    </div>
                    <span className="text-sm font-black text-gray-900 shrink-0 tabular-nums">
                      {formatearMonto(item.monto, moneda)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'historial' && (
        <div className="space-y-3">
          <div className="bg-white border border-gray-100 rounded-xl p-3 space-y-2">
            <div className="flex gap-1 overflow-x-auto pb-1">
              {FILTROS_TIPO.map((filtro) => (
                <button
                  key={filtro.id}
                  type="button"
                  onClick={() => setFiltroTipo(filtro.id)}
                  aria-pressed={filtroTipo === filtro.id}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-colors ${
                    filtroTipo === filtro.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {filtro.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-gray-600 mb-1" htmlFor="prov-fin-desde">Desde</label>
                <input
                  id="prov-fin-desde"
                  type="date"
                  value={fechaDesde}
                  onChange={(evento) => setFechaDesde(evento.target.value)}
                  className="w-full bg-gray-50 border rounded-lg py-1.5 px-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-600 mb-1" htmlFor="prov-fin-hasta">Hasta</label>
                <input
                  id="prov-fin-hasta"
                  type="date"
                  value={fechaHasta}
                  onChange={(evento) => setFechaHasta(evento.target.value)}
                  className="w-full bg-gray-50 border rounded-lg py-1.5 px-2 text-xs"
                />
              </div>
            </div>

            <p className="text-[10px] text-gray-500 text-right">
              {historialFiltrado.length} de {historial.length} movimientos
            </p>
          </div>

          {cargando ? (
            <Spinner message="Cargando historial..." />
          ) : historial.length === 0 ? (
            <EmptyState
              icon={History}
              title="Sin movimientos"
              description="Cuando recibas un pago o abones una deuda, aparecerá aquí."
            />
          ) : historialFiltrado.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-xl p-6 text-center">
              <Calendar size={32} className="text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No hay movimientos en este filtro.</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden divide-y divide-gray-100">
              {historialFiltrado.map((item) => {
                const abierto = expandido === item.id;
                const esPago = item.tipo === 'pago';
                const esSolicitud = item.tipo === 'solicitud';
                const esDeuda = item.tipo === 'deuda_saldada';
                const tono = esPago
                  ? 'bg-green-100 text-green-700'
                  : esSolicitud
                    ? 'bg-amber-100 text-amber-700'
                    : esDeuda
                      ? 'bg-slate-100 text-slate-600'
                      : 'bg-blue-100 text-blue-700';
                const Icono = esPago ? Receipt : esSolicitud ? Clock : esDeuda ? History : Wallet;

                return (
                  <div key={item.id}>
                    <button
                      type="button"
                      onClick={() => setExpandido(abierto ? null : item.id)}
                      aria-expanded={abierto}
                      className="w-full text-left p-3 hover:bg-gray-50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          <span className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tono}`}>
                            <Icono size={16} />
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-gray-800 truncate">{item.detalle}</p>
                            <p className="text-[10px] text-gray-500">
                              {item.fecha ? formatearFechaSinAnio(item.fecha) : 'Sin fecha'}
                              {item.metodoPago ? ` · ${etiquetaMetodo(item.metodoPago)}` : ''}
                            </p>
                            {item.referencia && (
                              <p className="text-[10px] text-gray-400 truncate">Ref. {item.referencia}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-sm font-black tabular-nums ${
                            esSolicitud ? 'text-amber-700' : esPago || item.tipo === 'abono' ? 'text-green-700' : 'text-slate-700'
                          }`}>
                            {formatearMonto(item.monto, item.moneda || moneda)}
                          </p>
                          {esSolicitud && (
                            <span className="text-[9px] font-black uppercase text-amber-700">
                              {item.estadoSolicitud === 'rechazada' ? 'Rechazada' : 'En revisión'}
                            </span>
                          )}
                          {!esSolicitud && item.tipo === 'descuento' && (
                            <span className="text-[9px] font-black uppercase text-blue-700">Descuento</span>
                          )}
                          <ChevronDown size={14} className={`ml-auto mt-1 text-gray-400 transition-transform ${abierto ? 'rotate-180' : ''}`} />
                        </div>
                      </div>
                    </button>

                    {abierto && (
                      <div className="px-3 pb-3 pl-14 text-[11px] text-gray-600 space-y-1">
                        {esPago && (
                          <>
                            <p>Bruto: <strong>{formatearMonto(item.montoBruto, item.moneda || moneda)}</strong></p>
                            {item.descuentoDeuda > 0 && (
                              <p>Descuento de deuda: <strong>{formatearMonto(item.descuentoDeuda, item.moneda || moneda)}</strong></p>
                            )}
                            <p>Neto recibido: <strong>{formatearMonto(item.monto, item.moneda || moneda)}</strong></p>
                            {item.reservaIds.length > 0 && (
                              <p className="truncate">Reservas: {item.reservaIds.map(cortoId).join(', ')}</p>
                            )}
                          </>
                        )}
                        {!esPago && item.banco && <p>Banco: <strong>{item.banco}</strong></p>}
                        {!esPago && item.reservaId && <p>Reserva: {cortoId(item.reservaId)}</p>}
                        {esSolicitud && (
                          <p>La solicitud no mueve dinero hasta que el admin la confirme.</p>
                        )}
                        {esDeuda && <p>Deuda histórica sin detalle de abonos.</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'resumen' && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <p className="text-[10px] font-black text-blue-600 uppercase">Generado</p>
              <p className="text-base font-black text-blue-900 mt-1 tabular-nums break-words">
                {formatearMonto(resumen.comisionTotal, moneda)}
              </p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-3">
              <p className="text-[10px] font-black text-green-600 uppercase">Cobrado</p>
              <p className="text-base font-black text-green-900 mt-1 tabular-nums break-words">
                {formatearMonto(resumen.cobrado, moneda)}
              </p>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
              <p className="text-[10px] font-black text-orange-600 uppercase">Pendiente</p>
              <p className="text-base font-black text-orange-900 mt-1 tabular-nums break-words">
                {formatearMonto(resumen.porCobrar, moneda)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white border border-gray-100 rounded-xl p-3">
              <p className="text-[10px] font-black text-gray-500 uppercase">Deuda pendiente</p>
              <p className="text-lg font-black text-red-700 mt-1 tabular-nums">
                {formatearMonto(resumen.deudaPendiente, moneda)}
              </p>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-3">
              <p className="text-[10px] font-black text-gray-500 uppercase">Deuda pagada</p>
              <p className="text-lg font-black text-slate-700 mt-1 tabular-nums">
                {formatearMonto(resumen.deudaPagada, moneda)}
              </p>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <p className="text-xs font-bold text-gray-700">Últimos 6 meses</p>
              <span className="text-[10px] text-gray-500">Movimientos</span>
            </div>
            {mensual.length === 0 ? (
              <p className="text-sm text-gray-500 p-4 text-center">Sin movimientos registrados.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {mensual.map((fila) => (
                  <div key={fila.mes} className="p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-gray-700 capitalize">{etiquetaMes(fila.mes)}</p>
                      <p className="text-xs font-black text-gray-900 tabular-nums">
                        {formatearMonto(fila.total, moneda)}
                      </p>
                    </div>
                    <div className="mt-1 grid grid-cols-3 gap-1 text-[10px] text-gray-500">
                      <span>Pagos: {formatearMonto(fila.pagos, moneda)}</span>
                      <span>Abonos: {formatearMonto(fila.abonos, moneda)}</span>
                      <span>Desc.: {formatearMonto(fila.descuentos, moneda)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="text-[10px] text-gray-500">
            “Generado” = comisión cobrada + comisión pendiente. “Pagos recibidos” es el neto
            después del descuento FIFO de deudas.
          </p>
        </div>
      )}
    </div>
  );
}
