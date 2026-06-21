// @build: 2026-06-22 | id: SGTA-FASE1 | desc: CRUD de cursos con gestión de tiempos por módulo + rechazo con dos variantes
import { useContext, useState, useEffect, useCallback, useMemo, memo } from 'react';
import { AppContext } from '../context/AppContextValue';
import { Button, Input, Select } from '../components/UI';
import AppShell from '../modules/shared/components/AppShell';
import {
  ChevronLeft, Users, Briefcase, Plus, Award, Bike, Settings,
  Edit, Power, DollarSign, Activity, Check, CheckCircle, AlertCircle,
  BookOpen, MapPin, Clock, ChevronRight, Wallet, LogOut, ChevronDown,
  ChevronUp, CreditCard, Minus, Equal, X, AlertTriangle
} from 'lucide-react';
import ProveedorPanel from './ProveedorPanel';

// ================================================================
// COMPONENTES INTERNOS DEL DASHBOARD
// ================================================================

const TarjetaResumen = memo(({ titulo, valor, color, onClick }) => (
  <div onClick={onClick} className={`${color} text-white p-6 rounded-[2rem] shadow-[0_10px_40px_rgba(29,78,216,0.4)] cursor-pointer hover:opacity-90 transition-all active:scale-[0.98] relative overflow-hidden`}>
    <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-10 rounded-full blur-3xl transform translate-x-10 -translate-y-10"></div>
    <p className="text-white/80 text-xs font-bold uppercase tracking-widest mb-1">{titulo}</p>
    <h2 className="text-6xl font-black">{valor}</h2>
  </div>
));

const CursoCompletado = memo(({ reserva, instructorNombre }) => (
  <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
    <div><p className="font-bold text-sm text-gray-900">{reserva.nombre} {reserva.apellido}</p><p className="text-xs text-gray-500">Inst: {instructorNombre}</p></div>
    <Award size={24} className="text-green-500" />
  </div>
));

const DeudaItem = memo(({ item, moneda, onPagar }) => (
  <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center mb-2">
    <div><p className="font-bold text-sm">{item.nombre} {item.apellido || ''}</p><p className="text-orange-600 font-black">{moneda} {item.deuda}</p></div>
    <Button type="button" onClick={() => onPagar(item.id, item.tipo, item.deuda, item.nombre)} variant="outline" className="!w-auto !py-2 !text-xs">Pagar</Button>
  </div>
));

const AdminResumen = memo(({ setTab }) => {
  const { reservas, instructores, sedes, cleanExpiredLocks, seedDatabase } = useContext(AppContext);
  const res = reservas || [];
  const instrs = instructores || [];
  useEffect(() => { 
    if (cleanExpiredLocks) cleanExpiredLocks().catch(() => {}); 
  }, [cleanExpiredLocks]);
  const pendientes = useMemo(() => res.filter(r => r.estadoPago === 'Pendiente' || r.estadoPago === 'Rechazado').length, [res]);
  const completados = useMemo(() => res.filter(r => r.estadoCurso === 'Aprobado').slice(-5).reverse(), [res]);
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black text-gray-900 uppercase tracking-widest px-1">Panel Administrativo</h2>
      {sedes?.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 p-5 rounded-2xl mb-2 shadow-sm">
          <p className="text-sm font-bold text-yellow-800 mb-3">¿El sistema está en blanco?</p>
          <Button type="button" onClick={seedDatabase} variant="outline" icon={Settings} className="w-full bg-white">Inicializar Base de Datos (Sembrar)</Button>
        </div>
      )}
      <TarjetaResumen titulo="Reservas Pendientes" valor={pendientes} color="bg-[#1d4ed8]" onClick={() => setTab('reservas')} />
      <div className="pt-2"><h3 className="font-bold text-gray-900 text-xl border-b-2 border-gray-100 pb-3">Últimos Cursos Completados</h3>
        <div className="mt-4 space-y-3">
          {completados.map(r => <CursoCompletado key={r.id} reserva={r} instructorNombre={instrs.find(i => String(i.id) === String(r.instructorId))?.nombre || 'N/A'} />)}
          {completados.length === 0 && <p className="text-sm text-gray-400 text-center py-8 font-medium">No hay cursos completados aún.</p>}
        </div>
      </div>
    </div>
  );
});

const AdminFinanzas = memo(() => {
  const { reservas, instructores, proveedores, motos, config, saveReserva, saveMovimiento, showToast } = useContext(AppContext);
  const res = reservas || [];
  const instrs = instructores || [];
  const provs = proveedores || [];
  const motList = motos || [];
  const { gananciaNeta, deudasPorPagar, deudasInst, deudasProv } = useMemo(() => {
    const aproved = res.filter(r => r.estadoPago === 'Aprobado');
    const ingresos = aproved.reduce((acc, r) => acc + Number(r.pagoTotalMoneda || 0), 0);
    const deudas = aproved.reduce((acc, r) => acc + (!r.pagadoInstructor ? Number(r.pagoInstructor || 0) : 0) + (!r.pagadoProveedor ? Number(r.pagoProveedor || 0) : 0), 0);
    const neta = ingresos - aproved.reduce((acc, r) => acc + Number(r.pagoInstructor || 0) + Number(r.pagoProveedor || 0), 0);
    const dInst = instrs.map(i => ({ ...i, deuda: res.filter(r => r.estadoPago === 'Aprobado' && String(r.instructorId) === String(i.id) && !r.pagadoInstructor).reduce((acc) => acc + Number(config.pagoInstructor || 0), 0), tipo: 'instructor' })).filter(i => i.deuda > 0);
    const dProv = provs.map(p => ({ ...p, deuda: res.filter(r => r.estadoPago === 'Aprobado' && !r.pagadoProveedor && motList.find(m => String(m.id) === String(r.motoAsignadaId))?.proveedorId === String(p.id)).reduce((acc) => acc + Number(config.pagoProveedor || 0), 0), tipo: 'proveedor' })).filter(p => p.deuda > 0);
    return { gananciaNeta: neta, deudasPorPagar: deudas, deudasInst: dInst, deudasProv: dProv };
  }, [res, instrs, provs, motList, config]);
  const pagarStaff = useCallback(async (id, tipo, monto, nombre) => {
    for (let r of res) {
      if (r.estadoPago === 'Aprobado') {
        if (tipo === 'instructor' && String(r.instructorId) === String(id) && !r.pagadoInstructor) await saveReserva({ ...r, pagadoInstructor: true });
        if (tipo === 'proveedor' && motList.find(m => String(m.id) === String(r.motoAsignadaId))?.proveedorId === String(id) && !r.pagadoProveedor) await saveReserva({ ...r, pagadoProveedor: true });
      }
    }
    await saveMovimiento({ id: Date.now().toString(), tipo: 'egreso', monto, desc: `Comisión: ${nombre}`, fecha: new Date().toISOString().split('T')[0] });
    showToast('Pago registrado correctamente');
  }, [res, motList, saveReserva, saveMovimiento, showToast]);
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-black text-gray-900 uppercase tracking-widest px-1">Módulo Finanzas</h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-green-50 p-4 rounded-3xl border-2 border-green-100"><p className="text-green-600 text-[10px] font-black uppercase tracking-wide">Ganancia Neta</p><p className="text-2xl font-black text-green-900 mt-1">USD {gananciaNeta}</p></div>
        <div className="bg-orange-50 p-4 rounded-3xl border-2 border-orange-100 relative">{deudasPorPagar > 0 && <span className="absolute top-3 right-3 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>}<p className="text-orange-600 text-[10px] font-black uppercase tracking-wide">Por Pagar</p><p className="text-2xl font-black text-orange-900 mt-1">{config.monedaPagoStaff} {deudasPorPagar}</p></div>
      </div>
      <h3 className="font-bold text-gray-900 text-lg border-b pb-2 mt-6">Deudas a Personal</h3>
      {deudasInst.length === 0 && deudasProv.length === 0 && <p className="text-sm text-gray-500 text-center py-6">Todo el personal está al día.</p>}
      {deudasInst.map(i => <DeudaItem key={i.id} item={i} moneda={config.monedaPagoStaff} onPagar={(id, tipo, monto, nombre) => pagarStaff(id, tipo, monto, nombre)} />)}
      {deudasProv.map(p => <DeudaItem key={p.id} item={p} moneda={config.monedaPagoStaff} onPagar={(id, tipo, monto, nombre) => pagarStaff(id, tipo, monto, nombre)} />)}
    </div>
  );
});

const AdminReservas = memo(({ setTab }) => {
  const { reservas, saveReserva, saveMovimiento, showToast, instructores, isReservaActiva, user } = useContext(AppContext);
  const [selectedInstructorByRes, setSelectedInstructorByRes] = useState({});
  const res = reservas || [];
  const isAdmin = user?.role === 'admin';
  const aprobarPago = useCallback(async (id) => { if (!isAdmin) return; const r = res.find(x => String(x.id) === String(id)); if (!r) return; await saveReserva({ ...r, estadoPago: 'Aprobado', estadoCurso: 'En Curso' }); await saveMovimiento({ id: Date.now().toString(), tipo: 'ingreso', monto: r.pagoTotalMoneda, desc: `Inscripción C-${id.toString().slice(-4)}`, fecha: new Date().toISOString().split('T')[0], userId: r.userId }); showToast('Pago aprobado y curso activado', 'success'); }, [isAdmin, res, saveReserva, saveMovimiento, showToast]);
  const rechazarPago = useCallback(async (id, tipo = 'rechazar') => { if (!isAdmin) return; const r = res.find(x => String(x.id) === String(id)); if (!r) return; if (tipo === 'cancelar') { await saveReserva({ ...r, estadoPago: 'Cancelado' }); showToast('Reserva cancelada definitivamente', 'info'); } else { await saveReserva({ ...r, estadoPago: 'Rechazado', rechazadoEn: Number(new Date()) }); showToast('Pago rechazado. El estudiante puede corregir la referencia.', 'info'); } }, [isAdmin, res, saveReserva, showToast]);
  const reasignarInstructor = useCallback(async (r) => { if (!isAdmin) return; const instructorId = selectedInstructorByRes[r.id]; if (!instructorId) return showToast('Selecciona un instructor válido', 'error'); if (String(instructorId) === String(r.instructorId)) return showToast('Selecciona un instructor distinto al actual', 'error'); await saveReserva({ ...r, instructorId }); showToast('Instructor reasignado correctamente', 'success'); }, [isAdmin, selectedInstructorByRes, saveReserva, showToast]);
  return (
    <div className="space-y-4">
      <div className="flex gap-2 mb-6 items-center"><button type="button" onClick={() => setTab('inicio')} className="p-2 bg-gray-200 rounded-full"><ChevronLeft size={20} /></button><h2 className="text-xl font-black text-gray-900 uppercase">Gestión Reservas</h2></div>
      {res.length === 0 && <p className="text-center text-gray-500 py-6">No hay reservas</p>}
      {res.slice().reverse().map(r => {
        const busyInstructorIds = (reservas || []).filter(other => String(other.id) !== String(r.id) && isReservaActiva(other) && String(other.horaId) === String(r.horaId) && (other.fecha1 === r.fecha1 || other.fecha1 === r.fecha2 || other.fecha2 === r.fecha1 || other.fecha2 === r.fecha2)).map(other => String(other.instructorId));
        const availableInstructors = (instructores || []).filter(i => i.activo && (i.sedes || []).includes(r.sedeId) && !busyInstructorIds.includes(String(i.id)));
        const currentInstructor = (instructores || []).find(i => String(i.id) === String(r.instructorId));
        const currentIsBusy = currentInstructor && busyInstructorIds.includes(String(currentInstructor.id));
        return (
          <div key={r.id} className={`bg-white p-4 rounded-2xl shadow-sm border-l-4 ${r.estadoPago === 'Pendiente' ? 'border-l-orange-500' : r.estadoPago === 'Rechazado' ? 'border-l-red-500' : r.estadoPago === 'Cancelado' ? 'border-l-gray-500' : 'border-l-green-500'} border-t border-r border-b border-gray-100`}>
            <div className="flex justify-between items-start mb-2"><h4 className="font-bold text-gray-900 text-sm">{r.nombre} {r.apellido} <span className="text-xs text-gray-500 font-normal">({r.cedula})</span></h4><span className={`text-[10px] font-black uppercase px-2 py-1 rounded ${r.estadoPago === 'Pendiente' ? 'bg-orange-100 text-orange-700' : r.estadoPago === 'Rechazado' ? 'bg-red-100 text-red-700' : r.estadoPago === 'Cancelado' ? 'bg-gray-200 text-gray-700' : 'bg-green-100 text-green-700'}`}>{r.estadoPago === 'Cancelado' ? 'CANCELADO' : r.estadoPago}</span></div>
            <p className="text-xs text-gray-600 mb-1 font-bold">D1: {r.fecha1} | D2: {r.fecha2}</p>
            <p className="text-xs text-gray-600 mb-2">Instructor actual: {currentInstructor ? `${currentInstructor.nombre} ${currentInstructor.apellido || ''}` : 'Sin instructor asignado'}</p>
            {currentIsBusy && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm font-bold">El instructor asignado ya tiene otra clase en este horario. Selecciona uno disponible.</div>}
            {isAdmin && (<><Select label="Reasignar Instructor" options={availableInstructors} value={selectedInstructorByRes[r.id] || ''} onChange={e => setSelectedInstructorByRes(prev => ({ ...prev, [r.id]: e.target.value }))} />{availableInstructors.length === 0 && <p className="text-xs text-gray-500 mb-3">No hay instructores disponibles en este horario/sede.</p>}<div className="flex gap-2 flex-wrap mb-3 mt-2"><Button type="button" onClick={() => reasignarInstructor(r)} variant="secondary" className="!py-2 !text-xs" disabled={availableInstructors.length === 0}>Reasignar</Button></div></>)}
            {isAdmin && (r.estadoPago === 'Pendiente' || r.estadoPago === 'Rechazado') && (
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 mt-3">
                <p className="text-xs font-bold text-gray-500 mb-2 uppercase">Validación de Pago</p>
                <p className="text-xs mb-1">Bco: {r.pagoBanco} | Tlf: {r.pagoTelefono} | CI: {r.pagoCedula}</p>
                <p className="text-sm font-black text-blue-900 mb-3">Ref: <span className="text-xl">{r.pagoRef}</span> • Bs. {r.pagoTotalVES}</p>
                <div className="flex gap-2 flex-wrap">
                  <Button type="button" onClick={() => aprobarPago(r.id)} variant="success" className="!py-2 !text-xs flex-1" icon={CheckCircle}>Aprobar</Button>
                  <Button type="button" onClick={() => rechazarPago(r.id, 'rechazar')} variant="danger" className="!py-2 !text-xs flex-1" icon={AlertCircle}>Rechazar (corregir)</Button>
                  <Button type="button" onClick={() => rechazarPago(r.id, 'cancelar')} variant="outline" className="!py-2 !text-xs" icon={X}>Cancelar</Button>
                </div>
              </div>
            )}
            {r.estadoPago === 'Cancelado' && (
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 mt-3">
                <p className="text-xs text-gray-500">Esta reserva fue cancelada definitivamente.</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
});

const AdminConfigHub = memo(({ setTab }) => (
  <div className="space-y-6">
    <h2 className="text-xl font-black text-gray-900 uppercase tracking-widest px-1">Configuración</h2>
    <div className="grid grid-cols-2 gap-3">
      <button type="button" onClick={() => setTab('cursos')} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center gap-2 hover:border-blue-300 transition-colors"><BookOpen size={28} className="text-blue-500" /><span className="font-bold text-sm text-gray-800">Cursos</span></button>
      <button type="button" onClick={() => setTab('sedes')} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center gap-2 hover:border-blue-300 transition-colors"><MapPin size={28} className="text-blue-500" /><span className="font-bold text-sm text-gray-800">Sedes</span></button>
      <button type="button" onClick={() => setTab('horarios')} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center gap-2 hover:border-blue-300 transition-colors"><Clock size={28} className="text-blue-500" /><span className="font-bold text-sm text-gray-800">Horarios</span></button>
      <button type="button" onClick={() => setTab('motos')} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center gap-2 hover:border-blue-300 transition-colors"><Bike size={28} className="text-blue-500" /><span className="font-bold text-sm text-gray-800">Motos</span></button>
      <button type="button" onClick={() => setTab('instructores')} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center gap-2 hover:border-blue-300 transition-colors"><Users size={28} className="text-blue-500" /><span className="font-bold text-sm text-gray-800">Instructores</span></button>
      <button type="button" onClick={() => setTab('proveedores')} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center gap-2 hover:border-blue-300 transition-colors"><Briefcase size={28} className="text-blue-500" /><span className="font-bold text-sm text-gray-800">Proveedores</span></button>
    </div>
    <button type="button" onClick={() => setTab('ajustes')} className="w-full bg-gray-900 text-white p-4 rounded-2xl shadow-lg flex items-center justify-between hover:bg-black transition-colors"><div className="flex items-center gap-3"><Settings size={24} className="text-gray-300" /><span className="font-bold text-lg">Ajustes Generales</span></div><ChevronRight size={20} className="text-gray-400" /></button>
  </div>
));

const AdminAjustes = memo(({ setTab }) => {
  const { config, saveConfig, showToast } = useContext(AppContext);
  const [localCfg, setLocalCfg] = useState(() => ({
  monedaPagoStaff: 'USD',
  monedaCobroClientes: 'EUR',
  tasaUSD: 36.50,
  tasaEUR: 39.10,
  precioBase: 35,
  recargoGuarenas: 5,
  recargoSinBici: 10,
  descuentoMotoPropia: 5,
  descuentoPromo: 0,
  pagoInstructor: 15,
  pagoProveedor: 10,
  autoTasas: true,
  promocionActiva: false,
  pagoMovilEscuela: {
    banco: 'Banesco',
    telefono: '04141234567',
    cedula: '12345678',
    codigo: '0134',
    ...(config?.pagoMovilEscuela || {})
  },
  ...(config || {})
}));
  const [secciones, setSecciones] = useState({ tasas: false, reglas: false, comisiones: false, pagoMovil: false });
  const toggleSeccion = (sec) => setSecciones(prev => ({ ...prev, [sec]: !prev[sec] }));
  const doSave = useCallback(async () => { await saveConfig(localCfg); setTab('config'); showToast('Ajustes guardados'); }, [localCfg, saveConfig, setTab, showToast]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center mb-6"><button type="button" onClick={() => setTab('config')} className="p-2 bg-gray-200 rounded-full"><ChevronLeft size={20} /></button><h2 className="text-xl font-black text-gray-900 uppercase">Ajustes Generales</h2></div>

      {/* TASAS DE CAMBIO */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <button onClick={() => toggleSeccion('tasas')} className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-2"><Activity size={18} className="text-blue-600" /><h3 className="font-bold text-gray-700">Tasas de Cambio</h3></div>
          {secciones.tasas ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
        </button>
        {secciones.tasas && (
          <div className="px-4 pb-4 space-y-3">
            <Input label="Tasa Dólar (USD)" type="number" step="0.01" value={localCfg.tasaUSD || ''} onChange={e => setLocalCfg({ ...localCfg, tasaUSD: e.target.value })} icon={Activity} />
            <Input label="Tasa Euro (EUR BCV)" type="number" step="0.01" value={localCfg.tasaEUR || ''} onChange={e => setLocalCfg({ ...localCfg, tasaEUR: e.target.value })} icon={Activity} />
            <Select label="Moneda de Cobro a Clientes" options={['USD', 'EUR', 'VES', 'USDT']} value={localCfg.monedaCobroClientes || 'EUR'} onChange={e => setLocalCfg({ ...localCfg, monedaCobroClientes: e.target.value })} />
          </div>
        )}
      </div>

      {/* REGLAS DE NEGOCIO */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <button onClick={() => toggleSeccion('reglas')} className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-2"><DollarSign size={18} className="text-blue-600" /><h3 className="font-bold text-gray-700">Reglas de Negocio (Base USD)</h3></div>
          {secciones.reglas ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
        </button>
        {secciones.reglas && (
          <div className="px-4 pb-4 space-y-3">
            <Input label="Precio Base Curso" type="number" value={localCfg.precioBase || ''} onChange={e => setLocalCfg({ ...localCfg, precioBase: e.target.value })} icon={DollarSign} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Recargo Sede Guarenas" type="number" value={localCfg.recargoGuarenas || ''} onChange={e => setLocalCfg({ ...localCfg, recargoGuarenas: e.target.value })} />
              <Input label="Recargo sin Bici" type="number" value={localCfg.recargoSinBici || ''} onChange={e => setLocalCfg({ ...localCfg, recargoSinBici: e.target.value })} />
              <Input label="Desc. Trae Moto" type="number" value={localCfg.descuentoMotoPropia || ''} onChange={e => setLocalCfg({ ...localCfg, descuentoMotoPropia: e.target.value })} />
              <Input label="Desc. Promocional" type="number" value={localCfg.descuentoPromo || ''} onChange={e => setLocalCfg({ ...localCfg, descuentoPromo: e.target.value })} disabled={!localCfg.promocionActiva} />
            </div>
          </div>
        )}
      </div>

      {/* COMISIONES FIJAS */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <button onClick={() => toggleSeccion('comisiones')} className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-2"><Wallet size={18} className="text-blue-600" /><h3 className="font-bold text-gray-700">Comisiones Fijas</h3></div>
          {secciones.comisiones ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
        </button>
        {secciones.comisiones && (
          <div className="px-4 pb-4 space-y-3">
            <Select label="Moneda de Pago a Staff" options={['USD', 'EUR', 'VES', 'USDT']} value={localCfg.monedaPagoStaff || 'USD'} onChange={e => setLocalCfg({ ...localCfg, monedaPagoStaff: e.target.value })} />
            <Input label={`Pago a Instructor (${localCfg.monedaPagoStaff || 'USD'})`} type="number" value={localCfg.pagoInstructor || ''} onChange={e => setLocalCfg({ ...localCfg, pagoInstructor: e.target.value })} />
            <Input label={`Pago a Proveedor (${localCfg.monedaPagoStaff || 'USD'})`} type="number" value={localCfg.pagoProveedor || ''} onChange={e => setLocalCfg({ ...localCfg, pagoProveedor: e.target.value })} />
          </div>
        )}
      </div>

      {/* PAGO MÓVIL ESCUELA */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <button onClick={() => toggleSeccion('pagoMovil')} className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-2"><CreditCard size={18} className="text-blue-600" /><h3 className="font-bold text-gray-700">Pago Móvil Escuela</h3></div>
          {secciones.pagoMovil ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
        </button>
        {secciones.pagoMovil && (
          <div className="px-4 pb-4 space-y-3">
            <Select
  label="Banco"
  options={['Banesco', 'Mercantil', 'Provincial', 'Venezuela', 'Bancamiga', 'BNC', 'Tesoro']}
  value={localCfg.pagoMovilEscuela?.banco || 'Banesco'}
  onChange={(e) => {
    const nombreBanco = e.target.value;
    const codigos = {
      'Banesco': '0134',
      'Mercantil': '0105',
      'Provincial': '0108',
      'Venezuela': '0102',
      'Bancamiga': '0172',
      'BNC': '0191',
      'Tesoro': '0163'
    };
    setLocalCfg(prev => ({
      ...prev,
      pagoMovilEscuela: {
        ...prev.pagoMovilEscuela,
        banco: nombreBanco,
        codigo: codigos[nombreBanco] || ''
      }
    }));
  }}
/>
            <Input label="Teléfono" value={localCfg.pagoMovilEscuela?.telefono || ''} onChange={e => setLocalCfg({ ...localCfg, pagoMovilEscuela: { ...localCfg.pagoMovilEscuela, telefono: e.target.value } })} />
            <Input label="Cédula / RIF" value={localCfg.pagoMovilEscuela?.cedula || ''} onChange={e => setLocalCfg({ ...localCfg, pagoMovilEscuela: { ...localCfg.pagoMovilEscuela, cedula: e.target.value } })} />
          </div>
        )}
      </div>

      <Button type="button" onClick={doSave} variant="success" icon={Check}>Guardar Ajustes</Button>
    </div>
  );
});

// ================================================================
// FORMULARIO DE CURSOS MEJORADO (SGTA FASE 1)
// Soporta: duración total, duración por módulo, distribución equitativa
// ================================================================
const FormCursos = memo(({ item, onSave, onCancel }) => {
  const inicializarModulos = (itemData) => {
    const mods = itemData.modulos || [''];
    if (mods.length > 0 && typeof mods[0] === 'string') {
      return mods.map(nombre => ({ nombre, duracion: 0 }));
    }
    return mods.map(m => typeof m === 'string' ? { nombre: m, duracion: 0 } : { ...m });
  };

  const [form, setForm] = useState({
    nombre: item?.id ? item.nombre : '',
    duracionTotal: item?.id ? (item.duracionTotal || 0) : 0,
    modulos: inicializarModulos(item?.id ? item : { modulos: [''] })
  });

  const tiempoAsignado = form.modulos.reduce((acc, mod) => acc + (Number(mod.duracion) || 0), 0);
  const tiempoRestante = (Number(form.duracionTotal) || 0) - tiempoAsignado;
  const hayExcedente = tiempoRestante < 0;
  const distribucionExacta = tiempoRestante === 0 && form.duracionTotal > 0;

  const handleDuracionTotalChange = (e) => {
    setForm(prev => ({ ...prev, duracionTotal: Number(e.target.value) || 0 }));
  };

  const handleModuloNombreChange = (idx, nombre) => {
    setForm(prev => ({
      ...prev,
      modulos: prev.modulos.map((m, i) => i === idx ? { ...m, nombre } : m)
    }));
  };

  const handleModuloDuracionChange = (idx, duracion) => {
    setForm(prev => ({
      ...prev,
      modulos: prev.modulos.map((m, i) => i === idx ? { ...m, duracion: Number(duracion) || 0 } : m)
    }));
  };

  const agregarModulo = () => {
    setForm(prev => ({ ...prev, modulos: [...prev.modulos, { nombre: '', duracion: 0 }] }));
  };

  const eliminarModulo = (idx) => {
    setForm(prev => ({
      ...prev,
      modulos: prev.modulos.filter((_, i) => i !== idx)
    }));
  };

  const distribuirEquitativamente = () => {
    const total = Number(form.duracionTotal) || 0;
    const cant = form.modulos.length;
    if (total <= 0 || cant <= 0) return;
    const porModulo = Math.floor(total / cant);
    const sobrante = total - porModulo * cant;
    setForm(prev => ({
      ...prev,
      modulos: prev.modulos.map((m, i) => ({
        ...m,
        duracion: porModulo + (i === 0 ? sobrante : 0)
      }))
    }));
  };

  const handleSave = () => {
    if (hayExcedente) {
      alert(`Hay un excedente de ${Math.abs(tiempoRestante)} minutos. Ajuste las duraciones.`);
      return;
    }
    if (form.modulos.some(m => !m.nombre.trim())) {
      alert('Todos los módulos deben tener un nombre.');
      return;
    }
    onSave({
      ...form,
      modulos: form.modulos.filter(m => m.nombre.trim() !== '')
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center mb-4">
        <button type="button" onClick={onCancel} className="p-2 bg-gray-200 rounded-full"><ChevronLeft size={20} /></button>
        <h3 className="font-bold text-lg">{item?.id ? 'Editar' : 'Nuevo'} Curso</h3>
      </div>

      <Input label="Nombre del Curso" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />

      <Input
        label="Duración Total del Curso (minutos)"
        type="number"
        value={form.duracionTotal || ''}
        onChange={handleDuracionTotalChange}
        icon={Clock}
      />

      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-bold text-gray-700">Módulos</label>
          <button
            type="button"
            onClick={distribuirEquitativamente}
            disabled={!form.duracionTotal || form.modulos.length === 0}
            className="text-xs font-bold text-blue-600 flex items-center gap-1 disabled:opacity-40"
          >
            <Equal size={14} /> Distribuir equitativamente
          </button>
        </div>

        {form.modulos.map((mod, i) => (
          <div key={i} className="flex gap-2 mb-2 items-start">
            <input
              className="flex-1 bg-white border-2 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
              placeholder={`Módulo ${i + 1}`}
              value={mod.nombre}
              onChange={e => handleModuloNombreChange(i, e.target.value)}
            />
            <input
              type="number"
              className="w-20 bg-white border-2 rounded-lg px-2 py-2 text-sm outline-none focus:border-blue-500 text-center"
              placeholder="Min"
              value={mod.duracion || ''}
              onChange={e => handleModuloDuracionChange(i, e.target.value)}
            />
            {form.modulos.length > 1 && (
              <button
                type="button"
                onClick={() => eliminarModulo(i)}
                className="p-2 text-red-400 hover:text-red-600"
              >
                <Minus size={16} />
              </button>
            )}
          </div>
        ))}

        <Button type="button" onClick={agregarModulo} variant="outline" className="!py-2 text-sm mt-2 bg-white" icon={Plus}>Añadir Módulo</Button>

        {form.duracionTotal > 0 && (
          <div className={`mt-3 p-3 rounded-xl text-center text-sm font-bold ${
            hayExcedente ? 'bg-red-50 text-red-700 border border-red-200' :
            distribucionExacta ? 'bg-green-50 text-green-700 border border-green-200' :
            'bg-blue-50 text-blue-700 border border-blue-200'
          }`}>
            {hayExcedente
              ? `⚠️ Excedente: ${Math.abs(tiempoRestante)} min de más`
              : distribucionExacta
                ? '✅ Tiempo perfectamente distribuido'
                : `⏳ Te quedan ${tiempoRestante} min por asignar`
            }
          </div>
        )}
      </div>

      <Button type="button" onClick={handleSave} variant="dark">Guardar Curso</Button>
    </div>
  );
});

// ================================================================
// RESTO DE FORMULARIOS (SIN CAMBIOS)
// ================================================================
const FormPersonal = memo(({ item, onSave, onCancel, rol }) => {
  const { sedes } = useContext(AppContext);
  const isInst = rol === 'instructor';
  const [form, setForm] = useState(item.id ? item : { nombre: '', apellido: '', cedula: '', email: '', password: '', telefono: '', pagoBanco: '', pagoTelefono: '', pagoCedula: '', sedes: [], esPrincipal: false, activo: true });
  return (<div className="space-y-4"><div className="flex gap-2 items-center mb-4"><button type="button" onClick={onCancel} className="p-2 bg-gray-200 rounded-full"><ChevronLeft size={20} /></button><h3 className="font-bold text-lg">{item.id ? 'Editar' : 'Nuevo'} {rol}</h3></div><Input label="Nombre" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} />{isInst && <Input label="Apellido" value={form.apellido} onChange={e => setForm({ ...form, apellido: e.target.value })} />}<Input label="Cédula / RIF" value={form.cedula} onChange={e => setForm({ ...form, cedula: e.target.value })} /><Input label="Teléfono" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} /><div className="bg-gray-50 p-4 rounded-xl border border-gray-200"><h4 className="text-sm font-bold text-gray-700 mb-2">Acceso Sistema</h4><Input label="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /><Input label="Contraseña" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div><div className="bg-blue-50 p-4 rounded-xl border border-blue-100"><h4 className="text-sm font-bold text-blue-900 mb-2">Datos para recibir pagos</h4><Select label="Banco" options={['Banesco', 'Mercantil', 'Provincial', 'Venezuela', 'Bancamiga', 'BNC', 'Tesoro']} value={form.pagoBanco} onChange={e => setForm({ ...form, pagoBanco: e.target.value })} /><Input label="Teléfono Pago Móvil" value={form.pagoTelefono} onChange={e => setForm({ ...form, pagoTelefono: e.target.value })} /><Input label="Cédula Pago Móvil" value={form.pagoCedula} onChange={e => setForm({ ...form, pagoCedula: e.target.value })} /></div><div className="bg-white p-4 rounded-xl border border-gray-200"><h4 className="text-sm font-bold text-gray-700 mb-3">Sedes Asignadas</h4><div className="flex flex-col gap-2">{(sedes || []).filter(s => s.activo).map(s => <label key={s.id} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg cursor-pointer"><input type="checkbox" checked={form.sedes?.includes(s.id)} onChange={() => setForm({ ...form, sedes: form.sedes?.includes(s.id) ? form.sedes.filter(id => id !== s.id) : [...(form.sedes || []), s.id] })} className="w-5 h-5 text-blue-600 rounded" /><span className="font-bold text-gray-800">{s.nombre}</span></label>)}</div></div>{isInst && <div className="flex items-center gap-2 p-4 bg-gray-50 border rounded-xl"><input type="checkbox" checked={form.esPrincipal} onChange={e => setForm({ ...form, esPrincipal: e.target.checked })} className="w-5 h-5" /><label className="font-bold text-sm text-gray-700">Definir como Instructor Principal</label></div>}<Button type="button" onClick={() => onSave(form)} variant="dark">Guardar</Button></div>);
});

const FormSede = memo(({ item, onSave, onCancel }) => {
  const [form, setForm] = useState(item.id ? item : { nombre: '', direccion: '' });
  return (<div className="space-y-4"><div className="flex gap-2 items-center mb-4"><button type="button" onClick={onCancel} className="p-2 bg-gray-200 rounded-full"><ChevronLeft size={20} /></button><h3 className="font-bold text-lg">{item.id ? 'Editar' : 'Nueva'} Sede</h3></div><Input label="Nombre de la Sede" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} /><Input label="Dirección / Ubicación" value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} /><Button type="button" onClick={() => onSave(form)} variant="dark">Guardar Sede</Button></div>);
});

const FormHorario = memo(({ item, onSave, onCancel }) => {
  const [form, setForm] = useState(item.id ? item : { label: '', isLunch: false });
  return (<div className="space-y-4"><div className="flex gap-2 items-center mb-4"><button type="button" onClick={onCancel} className="p-2 bg-gray-200 rounded-full"><ChevronLeft size={20} /></button><h3 className="font-bold text-lg">{item.id ? 'Editar' : 'Nuevo'} Horario</h3></div><Input label="Rango (Ej: 08:00 AM - 10:00 AM)" value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} /><div className="flex items-center gap-2 p-4 bg-gray-50 border rounded-xl"><input type="checkbox" checked={form.isLunch} onChange={e => setForm({ ...form, isLunch: e.target.checked })} className="w-5 h-5" /><label className="font-bold text-sm text-gray-700">Es bloque de almuerzo (No reservable)</label></div><Button type="button" onClick={() => onSave(form)} variant="dark">Guardar Horario</Button></div>);
});

const FormMoto = memo(({ item, onSave, onCancel }) => {
  const { proveedores, sedes } = useContext(AppContext);
  const [form, setForm] = useState(item.id ? item : { marca: '', modelo: '', cilindrada: '', tipo: '', proveedorId: '', sedes: [] });
  return (<div className="space-y-4"><div className="flex gap-2 items-center mb-4"><button type="button" onClick={onCancel} className="p-2 bg-gray-200 rounded-full"><ChevronLeft size={20} /></button><h3 className="font-bold text-lg">{item.id ? 'Editar' : 'Nueva'} Moto</h3></div><Select label="Proveedor Dueño" options={proveedores || []} value={form.proveedorId} onChange={e => setForm({ ...form, proveedorId: e.target.value })} /><Input label="Marca" value={form.marca} onChange={e => setForm({ ...form, marca: e.target.value })} /><Input label="Modelo" value={form.modelo} onChange={e => setForm({ ...form, modelo: e.target.value })} /><Input label="Cilindrada (ej. 150cc)" value={form.cilindrada} onChange={e => setForm({ ...form, cilindrada: e.target.value })} /><Select label="Tipo" options={['Automática', 'Sincrónica']} value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} /><div className="bg-white p-4 rounded-xl border border-gray-200"><h4 className="text-sm font-bold text-gray-700 mb-3">Sedes donde estará disponible</h4><div className="flex flex-col gap-2">{(sedes || []).filter(s => s.activo).map(s => <label key={s.id} className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg cursor-pointer"><input type="checkbox" checked={form.sedes?.includes(s.id)} onChange={() => setForm({ ...form, sedes: form.sedes?.includes(s.id) ? form.sedes.filter(id => id !== s.id) : [...(form.sedes || []), s.id] })} className="w-5 h-5 text-blue-600 rounded" /><span className="font-bold text-gray-800">{s.nombre}</span></label>)}</div></div><Button type="button" onClick={() => onSave(form)} variant="dark">Guardar Moto</Button></div>);
});

// ================================================================
// VISTA CRUD GENÉRICA (SIN CAMBIOS)
// ================================================================
const CRUDView = memo(({ titulo, items, saveFn, formComponent: FormComponent, setTab, rol }) => {
  const { showToast, user } = useContext(AppContext);
  const [itemEdit, setItemEdit] = useState(null);
  const isAdmin = user?.role === 'admin';

  const handleSaveGeneral = useCallback(async (datos) => {
    if (!isAdmin) return;
    if (typeof saveFn === 'function') await saveFn(datos);
    setItemEdit(null);
    showToast('Guardado exitoso');
  }, [isAdmin, saveFn, showToast]);

  if (itemEdit !== null) return <FormComponent item={itemEdit} onSave={(d) => handleSaveGeneral(d, itemEdit?.id)} onCancel={() => setItemEdit(null)} />;
  
  return (
    <div className="pb-10">
      <div className="flex justify-between items-center mb-6"><div className="flex gap-2 items-center"><button type="button" onClick={() => setTab('config')} className="p-2 bg-gray-200 rounded-full"><ChevronLeft size={20} /></button><h2 className="text-xl font-black text-gray-900 uppercase tracking-widest">{titulo}</h2></div>{isAdmin && <button type="button" onClick={() => setItemEdit({})} className="bg-[#1d4ed8] text-white p-2 px-3 rounded-xl font-bold flex gap-1 text-sm shadow-md hover:bg-blue-700"><Plus size={16} /> Nuevo</button>}</div>
      {(items || []).map(item => {
        const itemTitle = item.nombre || item.label || (item.marca || item.modelo ? `${item.marca || ''} ${item.modelo || ''}`.trim() : 'Elemento');
        return (
          <div key={item.id} className={`bg-white p-4 rounded-2xl shadow-sm border mb-3 flex items-center justify-between ${item.activo ? 'border-gray-100' : 'border-red-100 opacity-60'}`}>
            <div className="flex-1 pr-2"><h4 className="font-bold text-gray-900 text-sm">{itemTitle} {item.apellido || ''}</h4>{item.direccion && <p className="text-xs text-gray-500 mt-1">{item.direccion}</p>}<div className="flex gap-1 flex-wrap mt-1">{!item.activo && <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-black uppercase">Inactivo</span>}{item.esPrincipal && <span className="text-[9px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-black uppercase">Principal</span>}</div></div>
            {isAdmin && (<div className="flex gap-2"><button type="button" onClick={() => setItemEdit(item)} className="p-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100"><Edit size={16} /></button><button type="button" onClick={async () => { await saveFn({ ...item, activo: !item.activo }); showToast('Estado cambiado'); }} className="p-2 bg-gray-50 rounded-lg hover:bg-gray-100"><Power size={16} /></button></div>)}
          </div>
        );
      })}
    </div>
  );
});

// ================================================================
// COMPONENTE PRINCIPAL DEL DASHBOARD
// ================================================================
export const DashboardView = () => {
  const { user, setUser, setView, logoutUser, motos, cursos, sedes, horarios, instructores, proveedores, saveMoto, saveCurso, saveSede, saveHorario, saveProveedor, handleSaveInstructorSeguro } = useContext(AppContext);
  const [tab, setTab] = useState('inicio');
  if (!user) { setView('login'); return null; }
  if (user.role === 'proveedor') return <ProveedorPanel />;
  const handleLogout = useCallback(() => { if (logoutUser) logoutUser(); else { setUser(null); setView('home'); } }, [logoutUser, setUser, setView]);

  const header = (
    <div className="bg-[#0f172a] text-white px-6 pt-10 pb-6 rounded-b-[40px] flex justify-between items-center">
      <div>
        <h1 className="text-2xl font-black tracking-tight uppercase">Admin Panel</h1>
        <p className="text-slate-400 text-xs mt-0.5">{user?.data?.nombre || 'Administrador'} ({user?.role || 'admin'})</p>
      </div>
      <button onClick={handleLogout} className="w-12 h-12 bg-[#1e293b] rounded-full flex items-center justify-center hover:bg-slate-700 transition-colors shadow-inner">
        <LogOut size={20} className="text-gray-300 ml-1" />
      </button>
    </div>
  );

  const footer = (
    <div className="bg-white border-t border-gray-100 px-6 py-3 flex justify-between items-center">
      {[{ id: 'inicio', icon: Activity, label: 'Inicio' }, { id: 'finanzas', icon: Wallet, label: 'Finanzas' }, { id: 'config', icon: Settings, label: 'Configuración' }].map(t => (
        <button key={t.id} type="button" onClick={() => setTab(t.id)} className={`flex flex-col items-center w-20 transition-all ${tab === t.id ? 'text-gray-900 transform -translate-y-1' : 'text-gray-400'}`}>
          <div className={`p-1.5 rounded-xl ${tab === t.id ? 'bg-gray-100' : ''}`}><t.icon size={22} className={tab === t.id ? 'stroke-[2.5px]' : ''} /></div>
          <span className="text-[10px] font-bold">{t.label}</span>
        </button>
      ))}
    </div>
  );

  return (
    <AppShell header={header} footer={footer}>
      <div className="p-6">
        {tab === 'inicio' && <AdminResumen setTab={setTab} />}
        {tab === 'reservas' && <AdminReservas setTab={setTab} />}
        {tab === 'finanzas' && <AdminFinanzas />}
        {tab === 'config' && <AdminConfigHub setTab={setTab} />}
        {tab === 'ajustes' && <AdminAjustes setTab={setTab} />}
        {tab === 'motos' && <CRUDView titulo="Flota" items={motos} saveFn={saveMoto} formComponent={FormMoto} setTab={setTab} />}
        {tab === 'cursos' && <CRUDView titulo="Cursos" items={cursos} saveFn={saveCurso} formComponent={FormCursos} setTab={setTab} />}
        {tab === 'sedes' && <CRUDView titulo="Sedes" items={sedes} saveFn={saveSede} formComponent={FormSede} setTab={setTab} />}
        {tab === 'horarios' && <CRUDView titulo="Horarios" items={horarios} saveFn={saveHorario} formComponent={FormHorario} setTab={setTab} />}
        {tab === 'instructores' && <CRUDView titulo="Instructores" items={instructores} saveFn={handleSaveInstructorSeguro} formComponent={(p) => <FormPersonal {...p} rol="instructor" />} setTab={setTab} rol="instructor" />}
        {tab === 'proveedores' && <CRUDView titulo="Proveedores" items={proveedores} saveFn={saveProveedor} formComponent={(p) => <FormPersonal {...p} rol="proveedor" />} setTab={setTab} rol="proveedor" />}
      </div>
    </AppShell>
  );
};