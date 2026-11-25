// @build: 2026-11-25 | id: ADMIN-MOVILIDAD-CONFIG | desc: Movilidad en Configuración con pestañas Configuración/Panel y guardado único (T-140/FT-071).
import { useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppContext } from '../../../context/AppContextValue';
import { useToast } from '../../shared/components/ToastProvider';
import { Input } from '../../../components/UI';
import AppShell from '../../shared/components/AppShell';
import DashboardHeader from '../../shared/components/DashboardHeader';
import DashboardFooter from '../../shared/components/DashboardFooter';
import MovilidadPanel from '../../movilidad/views/MovilidadPanel';
import {
  Activity, Bike, BookOpen, Calendar, DollarSign, Settings, Wallet
} from 'lucide-react';

const MOVILIDAD_DEFAULT = {
  activo: false,
  modalidad: 'plana',
  tarifaPlanaUSD: '',
  precioPorKmUSD: '',
  kmEstandar: 20,
  factorProgresivo: 1.25,
  kmTope: 40,
  minimoUSD: '',
  kmIncluidosMinimo: '',
  redondeoUSD: 'centavos',
  penalizacionPct: 20,
  ventanaCancelacionHoras: 2,
  modoPago: 'directo'
};

const desdeConfig = (movilidad) => ({
  ...MOVILIDAD_DEFAULT,
  ...(movilidad && typeof movilidad === 'object' ? movilidad : {}),
  activo: movilidad?.activo === true,
  modalidad: movilidad?.modalidad === 'porKm' ? 'porKm' : 'plana',
  redondeoUSD: movilidad?.redondeoUSD === '0.50' ? '0.50' : 'centavos',
  modoPago: 'directo'
});

export default function AdminMovilidad() {
  const { config, saveConfig, logoutUser, notifications } = useContext(AppContext);
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'panel' ? 'panel' : 'configuracion';
  const [local, setLocal] = useState(() => desdeConfig(config?.movilidad));
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // La configuración llega por snapshot: mantener el formulario alineado sin
  // perder lo que el admin está editando cuando la lectura aún no ha llegado.
  useEffect(() => {
    setLocal(desdeConfig(config?.movilidad));
    setDirty(false);
  }, [config?.movilidad]);

  const setMovilidad = useCallback((cambio) => {
    setLocal((prev) => ({ ...prev, ...cambio }));
    setDirty(true);
  }, []);

  const guardar = useCallback(async () => {
    setSaving(true);
    try {
      // Merge intencional: solo se escribe `movilidad`; tasas, comisiones y
      // demás secciones de configuración quedan intactas.
      await saveConfig({ movilidad: { ...local, modoPago: 'directo' } });
      setDirty(false);
      showToast('Movilidad guardada correctamente', 'success');
    } catch (error) {
      showToast('Error al guardar: ' + (error.message || 'falló la conexión'), 'error');
    } finally {
      setSaving(false);
    }
  }, [local, saveConfig, showToast]);

  const cambiarTab = (next) => {
    const siguiente = new URLSearchParams(params);
    if (next === 'panel') siguiente.set('tab', 'panel');
    else siguiente.delete('tab');
    setParams(siguiente, { replace: true });
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

  const header = (
    <DashboardHeader
      title="Movilidad"
      onBack={() => navigate('/admin/config')}
      onLogout={handleLogout}
      notifications={notifications}
    />
  );
  const footer = (
    <DashboardFooter
      tabs={footerTabs}
      activeTab="config"
      onTabChange={(id) => {
        const target = footerTabs.find((t) => t.id === id);
        if (target?.action) target.action();
      }}
    />
  );

  return (
    <AppShell header={header} footer={footer} bgColor="bg-gray-50" maxWidth="max-w-md min-[540px]:max-w-3xl lg:max-w-5xl">
      <div className="p-3 md:p-5 space-y-3 md:space-y-4">
        <div className="flex gap-2" role="tablist" aria-label="Movilidad">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'configuracion'}
            onClick={() => cambiarTab('configuracion')}
            className={`px-4 py-2 rounded-xl text-sm font-bold border-2 ${tab === 'configuracion' ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-gray-200 bg-white text-gray-600'}`}
          >
            Configuración
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'panel'}
            onClick={() => cambiarTab('panel')}
            className={`px-4 py-2 rounded-xl text-sm font-bold border-2 ${tab === 'panel' ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-gray-200 bg-white text-gray-600'}`}
          >
            Panel
          </button>
        </div>

        {tab === 'configuracion' ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Bike size={18} className="text-blue-600" />
              <h2 className="font-bold text-gray-700">Tarifa y reglas del servicio</h2>
            </div>

            <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
              <input
                type="checkbox"
                checked={local.activo === true}
                onChange={(e) => setMovilidad({ activo: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Servicio activo en el paso 2
            </label>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Modalidad</label>
              <select
                value={local.modalidad}
                onChange={(e) => setMovilidad({ modalidad: e.target.value })}
                className="w-full bg-gray-50 border-2 border-gray-200 focus:border-blue-500 rounded-xl py-2.5 px-3 text-sm outline-none"
              >
                <option value="plana">Tarifa plana por viaje</option>
                <option value="porKm">Por kilómetro</option>
              </select>
            </div>

            {local.modalidad === 'plana' ? (
              <Input
                label="Tarifa plana (USD por viaje ida y vuelta)"
                type="number"
                step="0.01"
                value={local.tarifaPlanaUSD}
                onChange={(e) => setMovilidad({ tarifaPlanaUSD: e.target.value })}
                icon={DollarSign}
              />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Input label="Precio por km (USD)" type="number" step="0.01" value={local.precioPorKmUSD} onChange={(e) => setMovilidad({ precioPorKmUSD: e.target.value })} />
                <Input label="Km con tarifa estándar" type="number" value={local.kmEstandar} onChange={(e) => setMovilidad({ kmEstandar: e.target.value })} />
                <Input label="Factor sobre el excedente" type="number" step="0.05" value={local.factorProgresivo} onChange={(e) => setMovilidad({ factorProgresivo: e.target.value })} />
                <Input label="Tope de cobertura (km)" type="number" value={local.kmTope} onChange={(e) => setMovilidad({ kmTope: e.target.value })} />
                <Input label="Mínimo por viaje (USD)" type="number" step="0.01" value={local.minimoUSD} onChange={(e) => setMovilidad({ minimoUSD: e.target.value })} />
                <Input label="Km incluidos en el mínimo" type="number" step="0.1" value={local.kmIncluidosMinimo} onChange={(e) => setMovilidad({ kmIncluidosMinimo: e.target.value })} helperText="Vacío = automático (mínimo ÷ precio por km)" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Redondeo USD</label>
                <select
                  value={local.redondeoUSD}
                  onChange={(e) => setMovilidad({ redondeoUSD: e.target.value })}
                  className="w-full bg-gray-50 border-2 border-gray-200 focus:border-blue-500 rounded-xl py-2.5 px-3 text-sm outline-none"
                >
                  <option value="centavos">2 decimales</option>
                  <option value="0.50">Pasos de 0,50</option>
                </select>
              </div>
              <Input label="Penalización cancelación (%)" type="number" value={local.penalizacionPct} onChange={(e) => setMovilidad({ penalizacionPct: e.target.value })} />
              <Input label="Ventana de cancelación (horas)" type="number" value={local.ventanaCancelacionHoras} onChange={(e) => setMovilidad({ ventanaCancelacionHoras: e.target.value })} />
            </div>

            <p className="text-[11px] text-gray-500">
              Pago directo al prestador: la app registra el monto y no lo suma al pago del curso. El redondeo final es a 2 decimales en USD y Bs.
            </p>

            {dirty && (
              <p className="text-xs font-bold text-orange-600" role="status">Hay cambios sin guardar.</p>
            )}

            <button
              type="button"
              onClick={guardar}
              disabled={saving}
              className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-black disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Guardar movilidad'}
            </button>
          </div>
        ) : (
          <MovilidadPanel embebido />
        )}
      </div>
    </AppShell>
  );
}
