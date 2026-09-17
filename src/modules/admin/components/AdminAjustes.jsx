// @build: 2026-06-22 | id: AJUSTES-SIN-DATOS-PRUEBA | desc: Ajustes generales sin valores hardcodeados. Solo carga desde Firestore. Botón deshabilitado hasta que los datos estén listos.
import { useContext, useState, useEffect, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../../context/AppContextValue';
import { useToast } from '../../shared/components/ToastProvider';
import { Button, Input, Select } from '../../../components/UI';
import AppShell from '../../shared/components/AppShell';
import DashboardHeader from '../../shared/components/DashboardHeader';
import DashboardFooter from '../../shared/components/DashboardFooter';
import {
  Activity, DollarSign, Wallet, CreditCard, Check, ChevronUp, ChevronDown,
  BookOpen, Calendar, Settings, Loader, Landmark
} from 'lucide-react';

const AdminAjustes = memo(() => {
 const { config, saveConfig, user, logoutUser, metodosPago } = useContext(AppContext);
const { showToast } = useToast();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  // Estado local inicializado VACÍO, sin valores de prueba
  const [localCfg, setLocalCfg] = useState(null);

  // Cargar datos desde Firestore cuando estén disponibles
  useEffect(() => {
    if (config && Object.keys(config).length > 0) {
      setLocalCfg({
        monedaPagoStaff: config.monedaPagoStaff || 'USD',
        monedaCobroClientes: config.monedaCobroClientes || 'EUR',
                tasaUSD: config.tasaUSD ?? '',
        tasaEUR: config.tasaEUR ?? '',
        tasaUSDT: config.tasaUSDT ?? '',
        precioBase: config.precioBase ?? '',
        recargoGuarenas: config.recargoGuarenas ?? '',
        recargoSinBici: config.recargoSinBici ?? '',
        descuentoMotoPropia: config.descuentoMotoPropia ?? '',
        descuentoPromo: config.descuentoPromo ?? '',
                pagoInstructor: config.pagoInstructor ?? '',
        pagoProveedor: config.pagoProveedor ?? '',
        autoTasas: config.autoTasas ?? true,
        promocionActiva: config.promocionActiva ?? false,
        metodoPagoStaffDefault: config.metodoPagoStaffDefault ?? '',
        bancoDefaultStaff: config.bancoDefaultStaff ?? '',
        pagoMovilEscuela: {
          banco: config.pagoMovilEscuela?.banco || '',
          telefono: config.pagoMovilEscuela?.telefono || '',
          cedula: config.pagoMovilEscuela?.cedula || '',
          codigo: config.pagoMovilEscuela?.codigo || ''
        }
      });
    }
  }, [config]);

    const [secciones, setSecciones] = useState({ tasas: false, reglas: false, comisiones: false, pagoMovil: false, preferencias: false });
  const toggleSeccion = (sec) => setSecciones(prev => ({ ...prev, [sec]: !prev[sec] }));

  const configListo = localCfg !== null;

   const doSave = useCallback(async () => {
    if (!configListo) return;
    if (localCfg.metodoPagoStaffDefault &&
        localCfg.metodoPagoStaffDefault !== 'efectivo' &&
        !localCfg.bancoDefaultStaff) {
      showToast('Banco requerido para el método de pago seleccionado', 'error');
      return;
    }
    setSaving(true);
    try {
      await saveConfig(localCfg);
      showToast('Ajustes guardados correctamente', 'success');
    } catch (error) {
      showToast('Error al guardar: ' + (error.message || 'fall├│ la conexi├│n'), 'error');
    } finally {
      setSaving(false);
    }
  }, [localCfg, saveConfig, showToast, configListo]);

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
  const header = <DashboardHeader title="Ajustes Generales" onBack={() => navigate('/admin/config')} onLogout={handleLogout} notifications={notifications} />;
  const footer = <DashboardFooter
    tabs={footerTabs}
    activeTab="config"
    onTabChange={(id) => {
      const tab = footerTabs.find(t => t.id === id);
      if (tab?.action) tab.action();
    }}
  />;

  // Mientras se carga la configuración, mostrar spinner
  if (!configListo) {
    return (
      <AppShell header={header} footer={footer} bgColor="bg-gray-50">
        <div className="flex items-center justify-center min-h-full">
          <div className="text-center">
            <Loader size={32} className="text-blue-500 animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500">Cargando configuración...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell header={header} footer={footer} bgColor="bg-gray-50">
      <div className="p-4 space-y-4">
        {/* TASAS DE CAMBIO */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <button onClick={() => toggleSeccion('tasas')} className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-2"><Activity size={18} className="text-blue-600" /><h3 className="font-bold text-gray-700">Tasas de Cambio</h3></div>
            {secciones.tasas ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
          </button>
          {secciones.tasas && (
            <div className="px-4 pb-4 space-y-3">
                            <Input label="Tasa Dólar (USD BCV)" type="number" step="0.01" value={localCfg.tasaUSD} onChange={e => setLocalCfg({ ...localCfg, tasaUSD: e.target.value })} icon={Activity} />
              <Input label="Tasa Euro (EUR BCV)" type="number" step="0.01" value={localCfg.tasaEUR} onChange={e => setLocalCfg({ ...localCfg, tasaEUR: e.target.value })} icon={Activity} />
              <Input label="Tasa USDT (Paralelo)" type="number" step="0.01" value={localCfg.tasaUSDT} onChange={e => setLocalCfg({ ...localCfg, tasaUSDT: e.target.value })} icon={Activity} />
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
              <Input label="Precio Base Curso" type="number" value={localCfg.precioBase} onChange={e => setLocalCfg({ ...localCfg, precioBase: e.target.value })} icon={DollarSign} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Recargo Sede Guarenas" type="number" value={localCfg.recargoGuarenas} onChange={e => setLocalCfg({ ...localCfg, recargoGuarenas: e.target.value })} />
                <Input label="Recargo sin Bici" type="number" value={localCfg.recargoSinBici} onChange={e => setLocalCfg({ ...localCfg, recargoSinBici: e.target.value })} />
                <Input label="Desc. Trae Moto" type="number" value={localCfg.descuentoMotoPropia} onChange={e => setLocalCfg({ ...localCfg, descuentoMotoPropia: e.target.value })} />
                <Input label="Desc. Promocional" type="number" value={localCfg.descuentoPromo} onChange={e => setLocalCfg({ ...localCfg, descuentoPromo: e.target.value })} disabled={!localCfg.promocionActiva} />
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
                           <Input label={`Pago a Proveedor (${localCfg.monedaPagoStaff || 'USD'})`} type="number" value={localCfg.pagoProveedor} onChange={e => setLocalCfg({ ...localCfg, pagoProveedor: e.target.value })} />
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

        {/* PREFERENCIAS DE PAGO A STAFF */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <button onClick={() => toggleSeccion('preferencias')} className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-2"><Landmark size={18} className="text-blue-600" /><h3 className="font-bold text-gray-700">Preferencias de Pago a Staff</h3></div>
            {secciones.preferencias ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
          </button>
          {secciones.preferencias && (
            <div className="px-4 pb-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Método de pago por defecto</label>
                <select
                  value={localCfg.metodoPagoStaffDefault || ''}
                  onChange={e => setLocalCfg({ ...localCfg, metodoPagoStaffDefault: e.target.value, bancoDefaultStaff: '' })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sin preferencia</option>
                  {(metodosPago || [])
                    .filter(m => m.activo !== false)
                    .sort((a, b) => (Number(a.orden) || 99) - (Number(b.orden) || 99))
                    .map(m => (
                      <option key={m.id} value={m.id}>{m.nombre}</option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Banco por defecto (condicional)</label>
                <Input
                  value={localCfg.bancoDefaultStaff || ''}
                  onChange={e => setLocalCfg({ ...localCfg, bancoDefaultStaff: e.target.value })}
                  disabled={!localCfg.metodoPagoStaffDefault || localCfg.metodoPagoStaffDefault === 'efectivo'}
                  placeholder="Ej: Banesco, Mercantil"
                />
                <p className="text-[11px] text-gray-500 mt-1">Solo aplica para métodos ≠ efectivo</p>
              </div>
              {localCfg.metodoPagoStaffDefault && localCfg.metodoPagoStaffDefault !== 'efectivo' && !localCfg.bancoDefaultStaff && (
                <p className="text-xs font-bold text-orange-600">⚠️ Banco requerido para este método</p>
              )}
            </div>
          )}
        </div>

        <Button
          type="button"
          onClick={doSave}
          variant="success"
          icon={saving ? Loader : Check}
          disabled={!configListo || saving}
        >
          {saving ? 'Guardando...' : 'Guardar Ajustes'}
        </Button>
      </div>
    </AppShell>
  );
});

export default AdminAjustes;