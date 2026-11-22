// @build: 2026-11-19 | id: FINANCE-COMISIONES | desc: Bandeja de comisiones y pagos a personal
import { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, Wallet } from 'lucide-react';
import { AppContext } from '../../../context/AppContextValue';
import { auth } from '../../../firebase';
import { DeudasProveedorService } from '../../shared/services/DeudasProveedorService';
import { DeudasInstructorService } from '../../shared/services/DeudasInstructorService';
import { Button } from '../../../components/UI';
import { useToast } from '../../shared/components/ToastProvider';
import { formatearMonto } from '../../shared/utils/currency';
import { FinBadge, FinEmpty, FinKpi, FinSection } from './components/FinanceUI';
import { calcularDeudas } from './financeUtils';
import ModalRegistrarPago from '../components/ModalRegistrarPago';
import ModalCobrarDeuda from './ModalCobrarDeuda';
import ModalRechazarSolicitud from './ModalRechazarSolicitud';

const FinanceComisiones = () => {
  const { reservas, instructores, proveedores, metodosPago, config } = useContext(AppContext);
  const { showToast } = useToast();
  const navigate = useNavigate();
  const moneda = config?.monedaPagoStaff || 'USD';
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [orden, setOrden] = useState('deuda');
  const [mostrarTodos, setMostrarTodos] = useState(false);
  const [pagoItem, setPagoItem] = useState(null);
  const [deudaCobro, setDeudaCobro] = useState(null);
  const [deudasApp, setDeudasApp] = useState([]);
  const [deudasAppInstructor, setDeudasAppInstructor] = useState([]);
  const [deudaCobroInstructor, setDeudaCobroInstructor] = useState(null);
  const [cargandoDeudas, setCargandoDeudas] = useState(true);
  const [solicitudes, setSolicitudes] = useState([]);
  const [cargandoSolicitudes, setCargandoSolicitudes] = useState(true);
  const [resolviendoSolicitud, setResolviendoSolicitud] = useState('');
  const [solicitudRechazo, setSolicitudRechazo] = useState(null);

  const deudas = useMemo(
    () => calcularDeudas({ reservas, instructores, proveedores, config }),
    [reservas, instructores, proveedores, config]
  );

  const cargarDeudasApp = async () => {
    setCargandoDeudas(true);
    const [resProv, resInst] = await Promise.all([
      DeudasProveedorService.obtenerTodasDeudas({ soloPendientes: true }),
      DeudasInstructorService.obtenerTodasDeudas({ soloPendientes: true })
    ]);
    setDeudasApp(resProv.success ? (resProv.data || []) : []);
    setDeudasAppInstructor(resInst.success ? (resInst.data || []) : []);
    setCargandoDeudas(false);
  };

  const cargarSolicitudes = async () => {
    setCargandoSolicitudes(true);
    const res = await DeudasProveedorService.obtenerSolicitudesPago({ soloPendientes: true });
    setSolicitudes(res.success ? (res.data || []) : []);
    setCargandoSolicitudes(false);
  };

  useEffect(() => {
    cargarDeudasApp();
    const unsubscribe = DeudasProveedorService.suscribirSolicitudesPago((data) => {
      setSolicitudes(data || []);
      setCargandoSolicitudes(false);
    });
    return () => unsubscribe();
  }, []);

  const nombreProveedor = (id) => {
    const proveedor = (proveedores || []).find((p) => String(p.id) === String(id));
    return proveedor ? `${proveedor.nombre || ''} ${proveedor.apellido || ''}`.trim() : id;
  };

  const nombreInstructor = (id) => {
    const instructor = (instructores || []).find((i) => String(i.id) === String(id));
    return instructor ? `${instructor.nombre || ''} ${instructor.apellido || ''}`.trim() : id;
  };

  const nombreMetodo = (id) => {
    const metodo = (metodosPago || []).find((m) => String(m.id) === String(id));
    return metodo?.nombre || id || '—';
  };

  const aprobarSolicitud = async (solicitud) => {
    setResolviendoSolicitud(solicitud.id);
    try {
      const pago = await DeudasProveedorService.registrarPagoDeuda({
        deudaId: solicitud.deudaId,
        monto: solicitud.monto,
        moneda: solicitud.moneda || moneda,
        metodoPago: solicitud.metodoPago,
        referencia: solicitud.referencia,
        banco: solicitud.banco,
        notas: solicitud.notas || `Solicitud ${solicitud.id}`,
        montoVES: solicitud.montoVES,
        tasaAplicada: solicitud.tasaAplicada,
        pagadoPor: auth.currentUser?.uid || null
      });
      if (!pago.success) {
        showToast('No se pudo aprobar: ' + (pago.error?.message || ''), 'error');
        return;
      }
      const cierre = await DeudasProveedorService.resolverSolicitudPago({
        solicitudId: solicitud.id,
        estado: 'aprobada',
        pagadoPor: auth.currentUser?.uid || null,
        movimientoId: pago.data.movimientoId,
        saldoRestante: pago.data.saldo
      });
      if (!cierre.success) {
        showToast('Pago aplicado, pero no se pudo cerrar la solicitud: ' + (cierre.error?.message || ''), 'error');
      } else {
        showToast('Solicitud aprobada y pago registrado', 'success');
      }
      await cargarDeudasApp();
      await cargarSolicitudes();
    } finally {
      setResolviendoSolicitud('');
    }
  };

  const rechazarSolicitud = (solicitud) => setSolicitudRechazo(solicitud);

  const confirmarRechazo = async (motivo) => {
    const solicitud = solicitudRechazo;
    if (!solicitud) return;
    setResolviendoSolicitud(solicitud.id);
    try {
      const res = await DeudasProveedorService.resolverSolicitudPago({
        solicitudId: solicitud.id,
        estado: 'rechazada',
        motivoRechazo: motivo,
        pagadoPor: auth.currentUser?.uid || null
      });
      if (!res.success) {
        showToast('No se pudo rechazar: ' + (res.error?.message || ''), 'error');
        return;
      }
      showToast('Solicitud rechazada', 'success');
      setSolicitudRechazo(null);
      await cargarSolicitudes();
    } finally {
      setResolviendoSolicitud('');
    }
  };

  const lista = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    const todos = [
      ...deudas.deudasInst.map((i) => ({ ...i, rol: 'Instructor' })),
      ...deudas.deudasProv.map((p) => ({ ...p, rol: 'Proveedor' }))
    ].filter((item) => {
      if (filtro === 'instructores' && item.tipo !== 'instructor') return false;
      if (filtro === 'proveedores' && item.tipo !== 'proveedor') return false;
      if (termino && !`${item.nombre || ''} ${item.apellido || ''}`.toLowerCase().includes(termino)) return false;
      return true;
    });
    return todos.sort((a, b) => (
      orden === 'nombre' ? `${a.nombre || ''}`.localeCompare(`${b.nombre || ''}`) : b.deuda - a.deuda
    ));
  }, [deudas, busqueda, filtro, orden]);

  const visibles = mostrarTodos ? lista : lista.slice(0, 8);

  return (
    <div className="space-y-4 tab-transition">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <FinKpi label="Por pagar" value={formatearMonto(deudas.total, moneda)} icon={Wallet} tone="amber" hint="Instructores + proveedores" />
        <FinKpi label="Instructores" value={formatearMonto(deudas.deudasInst.reduce((a, i) => a + i.deuda, 0), moneda)} icon={Users} tone="blue" hint={`${deudas.deudasInst.length} personas`} />
        <FinKpi label="Proveedores" value={formatearMonto(deudas.deudasProv.reduce((a, p) => a + p.deuda, 0), moneda)} icon={Users} tone="indigo" hint={`${deudas.deudasProv.length} personas`} />
        <FinKpi label="Personas" value={deudas.deudasInst.length + deudas.deudasProv.length} icon={Users} tone="slate" hint="Con deuda pendiente" />
      </div>

      <FinSection title="Deudas a personal" icon={Users} subtitle="Buscá, filtrá y pagá sin recorrer una lista interminable.">
        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-3 text-slate-400" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-3 text-xs outline-none focus:border-blue-500"
            />
          </div>
          <select value={filtro} onChange={(e) => setFiltro(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700">
            <option value="todos">Todos</option>
            <option value="instructores">Instructores</option>
            <option value="proveedores">Proveedores</option>
          </select>
          <select value={orden} onChange={(e) => setOrden(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700">
            <option value="deuda">Mayor deuda</option>
            <option value="nombre">Nombre</option>
          </select>
        </div>

        {lista.length === 0 ? <FinEmpty title="Todo al día" description="No hay deudas pendientes con este filtro." /> : (
          <div className="divide-y divide-slate-100">
            {visibles.map((item) => (
              <div key={`${item.tipo}-${item.id}`} className="flex flex-col sm:flex-row sm:items-center gap-2 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <FinBadge tone={item.tipo === 'instructor' ? 'blue' : 'indigo'}>{item.rol}</FinBadge>
                    <p className="text-sm font-bold text-slate-900 truncate">{item.nombre} {item.apellido || ''}</p>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{item.reservaIds.length} reservas pendientes</p>
                </div>
                <p className="text-sm font-black text-amber-700 tabular-nums shrink-0">{formatearMonto(item.deuda, moneda)}</p>
                <div className="flex gap-2 shrink-0">
                  <button type="button" onClick={() => navigate(`/admin/finanzas/staff/${item.id}`)} className="text-xs font-bold text-blue-600 px-2 py-1.5">Ver</button>
                  <Button type="button" variant="success" className="!w-auto !py-1.5 !px-3 !text-xs" onClick={() => setPagoItem(item)}>
                    Pagar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {lista.length > 8 && (
          <button type="button" onClick={() => setMostrarTodos((v) => !v)} className="w-full mt-3 py-2 text-xs font-bold text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100">
            {mostrarTodos ? 'Mostrar menos' : `Ver todas (${lista.length})`}
          </button>
        )}
      </FinSection>

      <FinSection
        title="Deudas de proveedores con la app"
        icon={Wallet}
        subtitle="Sobrepagos por reposición D2: se descuentan del próximo pago o se cobran aquí."
      >
        {cargandoDeudas ? (
          <p className="text-xs text-slate-500 py-3">Cargando deudas...</p>
        ) : deudasApp.length === 0 ? (
          <FinEmpty title="Sin deudas" description="Ningún proveedor debe dinero a la app." />
        ) : (
          <div className="divide-y divide-slate-100">
            {deudasApp.map((deuda) => (
              <div key={deuda.id} data-testid={`deuda-proveedor-${deuda.id}`} className="flex flex-col sm:flex-row sm:items-center gap-2 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <FinBadge tone="indigo">Deudor</FinBadge>
                    <p className="text-sm font-bold text-slate-900 truncate">{nombreProveedor(deuda.proveedorId)}</p>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Reserva {deuda.reservaId || '—'} · {deuda.motivo || 'reposición D2'}
                  </p>
                </div>
                <p className="text-sm font-black text-rose-700 tabular-nums shrink-0">{formatearMonto(deuda.saldo, moneda)}</p>
                <Button
                  type="button"
                  variant="success"
                  className="!w-auto !py-1.5 !px-3 !text-xs"
                  onClick={() => setDeudaCobro(deuda)}
                >
                  Cobrar
                </Button>
              </div>
            ))}
          </div>
        )}
      </FinSection>

      <FinSection
        title="Deudas de tutores con la app"
        icon={Wallet}
        subtitle="Relevos post-pago FT-001: el exceso cobrado se descuenta del próximo pago o se cobra aquí."
      >
        {cargandoDeudas ? (
          <p className="text-xs text-slate-500 py-3">Cargando deudas...</p>
        ) : deudasAppInstructor.length === 0 ? (
          <FinEmpty title="Sin deudas" description="Ningún tutor debe dinero a la app." />
        ) : (
          <div className="divide-y divide-slate-100">
            {deudasAppInstructor.map((deuda) => (
              <div key={deuda.id} data-testid={`deuda-instructor-${deuda.id}`} className="flex flex-col sm:flex-row sm:items-center gap-2 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <FinBadge tone="blue">Deudor</FinBadge>
                    <p className="text-sm font-bold text-slate-900 truncate">{nombreInstructor(deuda.instructorId)}</p>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Reserva {deuda.reservaId || '—'} · {deuda.motivo || 'relevo de tutor'}
                  </p>
                </div>
                <p className="text-sm font-black text-rose-700 tabular-nums shrink-0">{formatearMonto(deuda.saldo, moneda)}</p>
                <Button
                  type="button"
                  variant="success"
                  className="!w-auto !py-1.5 !px-3 !text-xs"
                  onClick={() => setDeudaCobroInstructor(deuda)}
                >
                  Cobrar
                </Button>
              </div>
            ))}
          </div>
        )}
      </FinSection>

      <FinSection
        title="Solicitudes de pago de proveedores"
        icon={Wallet}
        subtitle="El proveedor reporta el pago; el admin lo confirma."
      >
        {cargandoSolicitudes ? (
          <p className="text-xs text-slate-500 py-3">Cargando solicitudes...</p>
        ) : solicitudes.length === 0 ? (
          <FinEmpty title="Sin solicitudes" description="No hay pagos de proveedores pendientes de confirmar." />
        ) : (
          <div className="divide-y divide-slate-100">
            {solicitudes.map((solicitud) => (
              <div
                key={solicitud.id}
                data-testid={`solicitud-pago-${solicitud.id}`}
                className="flex flex-col sm:flex-row sm:items-center gap-2 py-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <FinBadge tone="indigo">Solicitud</FinBadge>
                    <p className="text-sm font-bold text-slate-900 truncate">{nombreProveedor(solicitud.proveedorId)}</p>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {formatearMonto(solicitud.monto, solicitud.moneda || moneda)} · {nombreMetodo(solicitud.metodoPago)}
                    {solicitud.referencia ? ` · Ref ${solicitud.referencia}` : ''}
                    {solicitud.banco ? ` · ${solicitud.banco}` : ''}
                  </p>
                  {Number(solicitud.montoVES) > 0 && (
                    <p className="text-[11px] font-bold text-blue-700">
                      Bs. {Number(solicitud.montoVES).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  )}
                  <p className="text-[11px] text-slate-400">Reserva {solicitud.reservaId || '—'}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    data-testid={`aprobar-solicitud-${solicitud.id}`}
                    disabled={resolviendoSolicitud === solicitud.id}
                    onClick={() => aprobarSolicitud(solicitud)}
                    className="rounded-xl bg-green-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                  >
                    Aprobar
                  </button>
                  <button
                    type="button"
                    data-testid={`rechazar-solicitud-${solicitud.id}`}
                    disabled={resolviendoSolicitud === solicitud.id}
                    onClick={() => rechazarSolicitud(solicitud)}
                    className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50"
                  >
                    Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </FinSection>

      {pagoItem && (
        <ModalRegistrarPago
          reservaIds={pagoItem.reservaIds}
          monto={pagoItem.deuda}
          tipoStaff={pagoItem.tipo}
          staffId={pagoItem.id}
          staffNombre={`${pagoItem.nombre || ''} ${pagoItem.apellido || ''}`.trim()}
          onClose={() => setPagoItem(null)}
          onSuccess={async () => {
            setPagoItem(null);
            await cargarDeudasApp();
            await cargarSolicitudes();
          }}
        />
      )}

      {deudaCobro && (
        <ModalCobrarDeuda
          deuda={deudaCobro}
          proveedorNombre={nombreProveedor(deudaCobro.proveedorId)}
          onClose={() => setDeudaCobro(null)}
          onSuccess={async () => {
            setDeudaCobro(null);
            await cargarDeudasApp();
            await cargarSolicitudes();
          }}
        />
      )}

      {deudaCobroInstructor && (
        <ModalCobrarDeuda
          deuda={deudaCobroInstructor}
          deudorNombre={nombreInstructor(deudaCobroInstructor.instructorId)}
          servicio={DeudasInstructorService}
          onClose={() => setDeudaCobroInstructor(null)}
          onSuccess={async () => {
            setDeudaCobroInstructor(null);
            await cargarDeudasApp();
          }}
        />
      )}

      {solicitudRechazo && (
        <ModalRechazarSolicitud
          solicitud={solicitudRechazo}
          proveedorNombre={nombreProveedor(solicitudRechazo.proveedorId)}
          isSubmitting={resolviendoSolicitud === solicitudRechazo.id}
          onClose={() => setSolicitudRechazo(null)}
          onConfirm={confirmarRechazo}
        />
      )}
    </div>
  );

};

export default FinanceComisiones;
