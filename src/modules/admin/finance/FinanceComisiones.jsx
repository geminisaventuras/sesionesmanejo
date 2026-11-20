// @build: 2026-11-19 | id: FINANCE-COMISIONES | desc: Bandeja de comisiones y pagos a personal
import { useContext, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, Wallet } from 'lucide-react';
import { AppContext } from '../../../context/AppContextValue';
import { auth } from '../../../firebase';
import { PagosStaffService } from '../../../services/PagosStaffService';
import { Button } from '../../../components/UI';
import { useToast } from '../../shared/components/ToastProvider';
import { formatearMonto } from '../../shared/utils/currency';
import { FinBadge, FinEmpty, FinKpi, FinSection } from './components/FinanceUI';
import { calcularDeudas, hoyVET } from './financeUtils';

const FinanceComisiones = () => {
  const { reservas, instructores, proveedores, config, saveMovimiento } = useContext(AppContext);
  const { showToast } = useToast();
  const navigate = useNavigate();
  const moneda = config?.monedaPagoStaff || 'USD';
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [orden, setOrden] = useState('deuda');
  const [mostrarTodos, setMostrarTodos] = useState(false);
  const [pagando, setPagando] = useState('');

  const deudas = useMemo(
    () => calcularDeudas({ reservas, instructores, proveedores, config }),
    [reservas, instructores, proveedores, config]
  );

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

  const pagar = async (item) => {
    setPagando(item.id);
    try {
      const resultado = await PagosStaffService.crearPago({
        tipoStaff: item.tipo,
        staffId: item.id,
        staffNombre: `${item.nombre || ''} ${item.apellido || ''}`.trim(),
        reservaIds: item.reservaIds,
        montoTotal: item.deuda,
        moneda,
        metodoPago: 'efectivo',
        notas: '',
        pagadoPor: auth.currentUser?.uid || null
      });
      if (!resultado.success) {
        showToast('No se pudo pagar: ' + (resultado.error?.message || ''), 'error');
        return;
      }
      await saveMovimiento({
        id: `mov_pago_${resultado.data.id}`,
        tipo: 'egreso',
        categoria: item.tipo === 'instructor' ? 'comision_instructor' : 'comision_proveedor',
        monto: item.deuda,
        desc: `Pago comisión: ${item.nombre || ''} ${item.apellido || ''}`.trim(),
        fecha: hoyVET(),
        origen: 'pago_staff',
        origenId: resultado.data.id,
        metodoPago: 'efectivo',
        estado: 'confirmado'
      });
      showToast('Pago registrado correctamente', 'success');
    } catch (error) {
      showToast('Error al pagar: ' + (error?.message || 'error'), 'error');
    } finally {
      setPagando('');
    }
  };

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
                  <Button type="button" variant="success" className="!w-auto !py-1.5 !px-3 !text-xs" disabled={pagando === item.id} onClick={() => pagar(item)}>
                    {pagando === item.id ? 'Pagando...' : 'Pagar'}
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
    </div>
  );

};

export default FinanceComisiones;
