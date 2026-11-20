// @build: 2026-11-19 | id: FINANCE-CONFIGURACION | desc: Configuración financiera y datos fiscales del IVA
import { useContext, useEffect, useState } from 'react';
import { Landmark, Save, ShieldAlert } from 'lucide-react';
import { AppContext } from '../../../context/AppContextValue';
import { Button, Input } from '../../../components/UI';
import { useToast } from '../../shared/components/ToastProvider';
import { FinBadge, FinSection } from './components/FinanceUI';
import { getFinanzasConfig } from './financeUtils';

const FinanceConfiguracion = () => {
  const { config, saveConfig } = useContext(AppContext);
  const { showToast } = useToast();
  const finanzas = getFinanzasConfig(config);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({
    monedaPagoStaff: config?.monedaPagoStaff || 'USD',
    monedaCobroClientes: config?.monedaCobroClientes || 'USD',
    tasaUSD: config?.tasaUSD ?? '',
    tasaEUR: config?.tasaEUR ?? '',
    tasaUSDT: config?.tasaUSDT ?? '',
    pagoProveedor: config?.pagoProveedor ?? '',
    iva: { ...finanzas.iva }
  });

  useEffect(() => {
    const actual = getFinanzasConfig(config);
    setForm({
      monedaPagoStaff: config?.monedaPagoStaff || 'USD',
      monedaCobroClientes: config?.monedaCobroClientes || 'USD',
      tasaUSD: config?.tasaUSD ?? '',
      tasaEUR: config?.tasaEUR ?? '',
      tasaUSDT: config?.tasaUSDT ?? '',
      pagoProveedor: config?.pagoProveedor ?? '',
      iva: { ...actual.iva }
    });
  }, [config]);

  const setIva = (campo, valor) => setForm((prev) => ({ ...prev, iva: { ...prev.iva, [campo]: valor } }));

  const guardar = async () => {
    setGuardando(true);
    try {
      await saveConfig({
        ...config,
        monedaPagoStaff: form.monedaPagoStaff,
        monedaCobroClientes: form.monedaCobroClientes,
        tasaUSD: form.tasaUSD,
        tasaEUR: form.tasaEUR,
        tasaUSDT: form.tasaUSDT,
        pagoProveedor: form.pagoProveedor,
        finanzas: {
          ...(config?.finanzas || {}),
          iva: {
            ...form.iva,
            activo: Boolean(form.iva.rif && form.iva.razonSocial),
            cobrarEnCheckout: false
          }
        }
      });
      showToast('Configuración financiera guardada', 'success');
    } catch (error) {
      showToast('No se pudo guardar: ' + (error?.message || 'error'), 'error');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-4 tab-transition">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
        <ShieldAlert size={20} className="text-amber-600 shrink-0" />
        <div>
          <p className="text-sm font-black text-amber-900">IVA no disponible para cobro</p>
          <p className="text-xs text-amber-800 mt-1">Completá el RIF y los datos fiscales. El cobro en checkout se habilitará cuando el negocio lo autorice; por ahora ningún precio cambia.</p>
        </div>
      </div>

      <FinSection title="Datos fiscales" icon={Landmark} subtitle="Preparación para cuando esté disponible el RIF.">
        <div className="grid sm:grid-cols-2 gap-x-3">
          <Input label="RIF" value={form.iva.rif} onChange={(e) => setIva('rif', e.target.value)} placeholder="J-XXXXXXXX-X" />
          <Input label="Razón social" value={form.iva.razonSocial} onChange={(e) => setIva('razonSocial', e.target.value)} />
          <Input label="Dirección fiscal" value={form.iva.direccionFiscal} onChange={(e) => setIva('direccionFiscal', e.target.value)} />
          <Input label="Teléfono" value={form.iva.telefono} onChange={(e) => setIva('telefono', e.target.value)} />
          <Input label="Correo fiscal" type="email" value={form.iva.correo} onChange={(e) => setIva('correo', e.target.value)} />
          <Input label="Numeración / serie" value={form.iva.numeracion} onChange={(e) => setIva('numeracion', e.target.value)} />
        </div>
        <div className="grid sm:grid-cols-2 gap-x-3">
          <Input label="Tasa IVA (%)" type="number" value={form.iva.tasa} onChange={(e) => setIva('tasa', e.target.value)} />
          <div className="pt-1">
            <p className="text-sm font-bold text-slate-700 mb-2">Estado</p>
            <FinBadge tone={form.iva.rif ? 'amber' : 'slate'}>{form.iva.rif ? 'RIF cargado · IVA en preparación' : 'RIF pendiente'}</FinBadge>
            <p className="text-[11px] text-slate-500 mt-2">Cobro en checkout: <strong>desactivado</strong>.</p>
          </div>
        </div>
      </FinSection>

      <FinSection title="Moneda y tasas" icon={Landmark} subtitle="Valores usados por caja y pagos a personal.">
        <div className="grid sm:grid-cols-2 gap-x-3">
          <label className="block mb-4">
            <span className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Moneda de pago a staff</span>
            <select value={form.monedaPagoStaff} onChange={(e) => setForm((p) => ({ ...p, monedaPagoStaff: e.target.value }))} className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl py-3 px-4 text-sm">
              {['USD', 'EUR', 'VES', 'USDT'].map((m) => <option key={m}>{m}</option>)}
            </select>
          </label>
          <label className="block mb-4">
            <span className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Moneda de cobro</span>
            <select value={form.monedaCobroClientes} onChange={(e) => setForm((p) => ({ ...p, monedaCobroClientes: e.target.value }))} className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl py-3 px-4 text-sm">
              {['USD', 'EUR', 'VES', 'USDT'].map((m) => <option key={m}>{m}</option>)}
            </select>
          </label>
          <Input label="Tasa USD" type="number" value={form.tasaUSD} onChange={(e) => setForm((p) => ({ ...p, tasaUSD: e.target.value }))} />
          <Input label="Tasa EUR" type="number" value={form.tasaEUR} onChange={(e) => setForm((p) => ({ ...p, tasaEUR: e.target.value }))} />
          <Input label="Tasa USDT" type="number" value={form.tasaUSDT} onChange={(e) => setForm((p) => ({ ...p, tasaUSDT: e.target.value }))} />
          <Input label="Pago base proveedor" type="number" value={form.pagoProveedor} onChange={(e) => setForm((p) => ({ ...p, pagoProveedor: e.target.value }))} helperText="Solo fallback legacy; la reserva congelada manda." />
        </div>
      </FinSection>

      <Button type="button" onClick={guardar} disabled={guardando} className="!py-3">
        <Save size={16} /> {guardando ? 'Guardando...' : 'Guardar configuración'}
      </Button>
    </div>
  );
};

export default FinanceConfiguracion;
