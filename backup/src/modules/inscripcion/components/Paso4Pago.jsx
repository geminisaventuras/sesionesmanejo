// @build: 2026-06-22.REFACTOR | id: PASO4-PAGO | desc: Componente puro del paso 4 (pago). Usa BotonCopiarDatos.
import React from 'react';
import { CreditCard, Phone, Contact, Hash, Lock, Eye, EyeOff, ChevronUp, ChevronDown } from 'lucide-react';
import { Select, Input } from '../../../components/UI';
import { BotonCopiarDatos } from './BotonCopiarDatos';

const BANCOS = [
  { nombre: 'Banesco', codigo: '0134' },
  { nombre: 'Mercantil', codigo: '0105' },
  { nombre: 'Provincial', codigo: '0108' },
  { nombre: 'Venezuela', codigo: '0102' },
  { nombre: 'Bancamiga', codigo: '0172' },
  { nombre: 'BNC', codigo: '0191' },
  { nombre: 'Tesoro', codigo: '0163' }
];

export function Paso4Pago({
  form, updateForm,
  precioFinalVES, baseUSD, tasaCobro, monedaCobroClientes, config,
  desglosePrecio, lockId, step, lockTimer, mostrarDetallesPago, onToggleDetalles,
  captchaA, captchaB, captchaValue, onCaptchaChange,
  showToast
}) {
  return (
    <div className="space-y-1.5">
      <div className="rounded-xl border border-blue-100 shadow-sm overflow-hidden flex flex-col mt-2">
        <div className="bg-blue-600 text-white p-4 flex gap-4 items-start">
          <div className="flex-1 border-r border-blue-400/50 pr-4">
            <p className="text-[10px] text-blue-100 uppercase tracking-wider mb-1">Total a Cancelar</p>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold">Bs.</span>
              <span className="text-3xl font-bold">{precioFinalVES}</span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-blue-100 mt-2">
              <div>
                <p>Base: USD {baseUSD}</p>
                <p>Tasa {monedaCobroClientes || 'EUR'}: {tasaCobro}</p>
              </div>
              {lockId && step === '4' && lockTimer}
            </div>
          </div>
          <div className="flex-1 text-[10px] text-blue-100 flex flex-col justify-center">
            <p className="text-white font-medium mb-1 uppercase">Desglose</p>
            {desglosePrecio().map((item, i) => (
              <div key={i} className={`flex justify-between ${item.bold ? 'font-bold text-white border-t border-blue-400/50 pt-1 mt-1' : ''}`}>
                <span>{item.label}</span><span className="ml-2">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
        <button onClick={onToggleDetalles} className="bg-blue-50/50 w-full px-4 py-2.5 flex items-center justify-between text-blue-700 text-xs font-medium border-t border-blue-100 transition-colors hover:bg-blue-50">
          <div className="flex items-center gap-2">
            {mostrarDetallesPago ? <EyeOff size={16} /> : <Eye size={16} />}
            {mostrarDetallesPago ? 'Ocultar Datos de Pago Móvil' : 'Ver Datos de Pago Móvil'}
          </div>
          {mostrarDetallesPago ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
        </button>
        {mostrarDetallesPago && (
          <div className="bg-white p-4 border-t border-blue-100 text-xs text-gray-600 space-y-2">
            <p className="font-semibold text-gray-800 mb-1">PAGO MÓVIL ESCUELA</p>
            <div className="flex items-center gap-2"><CreditCard size={14} className="text-gray-500" /><span className="font-semibold text-gray-800">Banco:</span><span>{config?.pagoMovilEscuela?.banco || '—'}</span></div>
            <div className="flex items-center gap-2"><Phone size={14} className="text-gray-500" /><span className="font-semibold text-gray-800">Telf:</span><span>{config?.pagoMovilEscuela?.telefono || '—'}</span></div>
            <div className="flex items-center gap-2"><Contact size={14} className="text-gray-500" /><span className="font-semibold text-gray-800">CI:</span><span>{config?.pagoMovilEscuela?.cedula || '—'}</span></div>
            <BotonCopiarDatos config={config} showToast={showToast} />
          </div>
        )}
      </div>
      <div className="w-full mt-2">
        <Select label="Banco Emisor" options={BANCOS.map(b => b.nombre)} value={form.pagoBanco} onChange={e => updateForm({ pagoBanco: e.target.value })} icon={CreditCard} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input label="Teléfono Origen" type="tel" value={form.pagoTelefono} onChange={e => updateForm({ pagoTelefono: e.target.value.replace(/\D/g,'').slice(0,11) })} icon={Phone} placeholder="04141234567" inputMode="numeric" pattern="\d{11}" maxLength={11} required />
        <Input label="Cédula Titular" type="tel" value={form.pagoCedula} onChange={e => updateForm({ pagoCedula: e.target.value.replace(/\D/g,'').slice(0,10) })} icon={Contact} placeholder="15123456" inputMode="numeric" pattern="\d{7,10}" maxLength={10} required />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input label="Últimos 4 dígitos Ref." type="tel" value={form.pagoRef} onChange={e => updateForm({ pagoRef: e.target.value.replace(/\D/g,'').slice(0,4) })} icon={Hash} placeholder="8452" inputMode="numeric" pattern="\d{4}" maxLength={4} required />
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-0.5 ml-1 flex items-center gap-1"><Lock size={14} className="text-gray-500" /> Captcha</label>
          <div className="bg-gray-50 border-2 border-gray-200 focus-within:border-blue-500 rounded-xl overflow-hidden">
            <input type="tel" value={captchaValue} onChange={onCaptchaChange} placeholder={`${captchaA} + ${captchaB} = ?`} className="w-full bg-transparent py-2.5 px-3 text-sm outline-none" />
            <div className="bg-gray-100 border-t border-gray-200 px-3 py-1 text-[10px] text-gray-500">Resuelve la suma</div>
          </div>
        </div>
      </div>
    </div>
  );
}