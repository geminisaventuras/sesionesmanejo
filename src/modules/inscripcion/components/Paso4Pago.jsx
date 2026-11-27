// @build: 2026-09-30 | id: LEGAL-TERMINOLOGIA-PASO4 | desc: Terminología legal - Moto App. Se agrega disclaimer legal cerca del checkbox de términos.
import React, { useState, useEffect } from 'react';
import { CreditCard, Phone, Contact, Hash, Lock, Eye, EyeOff, ChevronUp, ChevronDown } from 'lucide-react';
import { Select, Input } from '../../../components/UI';
import { BotonCopiarDatos } from './BotonCopiarDatos';
import { validarPaso4 } from '../../shared/schemas/validations';
import { ModalTerminos } from './ModalTerminos';
import { ModalAvisoLegal } from './ModalAvisoLegal';
import { CaptchaTurnstile } from './CaptchaTurnstile';
import { BANCOS } from '../../../constants/bancos';

export function Paso4Pago({
  form, updateForm,
  precioFinalVES, baseUSD, precioCurso, tasaCobro, monedaCobroClientes, config,
  desglosePrecio, lockId, step, lockTimer,
  captchaA, captchaB, captchaValue, onCaptchaChange,
  captchaRef, usarCaptchaReal, onCaptchaFallar, captchaSiteKey,
  showToast,
  terminosAceptados, onToggleTerminos, onVerTerminos, mostrarTerminos, onCerrarTerminos
}) {
    const [errores, setErrores] = useState({});
  const [tocados, setTocados] = useState({});
  const [mostrarAvisoLegal, setMostrarAvisoLegal] = useState(false);
  const pagoMovil = config?.pagoMovilEscuela || {};

  // Formato Venezuela (bancos): 33.860,40
  const formatearMontoVES = (valor) => {
    const num = Number(valor);
    if (!isFinite(num) || num <= 0) return '0,00';
    const [entero, decimal] = num.toFixed(2).split('.');
    const enteroConPuntos = entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${enteroConPuntos},${decimal}`;
  };

  useEffect(() => {
    if (Object.keys(tocados).length > 0) {
      const result = validarPaso4(form);
      if (!result.success) {
        const erroresFiltrados = {};
        Object.keys(result.errores).forEach(campo => {
          if (tocados[campo]) {
            erroresFiltrados[campo] = result.errores[campo];
          }
        });
        setErrores(erroresFiltrados);
      } else {
        setErrores({});
      }
    }
  }, [form, tocados]);

  const marcarTocado = (campo) => {
    setTocados(prev => ({ ...prev, [campo]: true }));
  };

  const handleChange = (campo, valor) => {
    updateForm({ [campo]: valor });
    marcarTocado(campo);
  };

  return (
    <div className="space-y-1.5">
      <div className="rounded-xl border border-blue-100 shadow-sm overflow-hidden flex flex-col mt-2">
        <div className="bg-blue-600 text-white p-4 flex gap-4 items-start">
          <div className="flex-1 border-r border-blue-400/50 pr-4">
            <p className="text-[10px] text-blue-100 uppercase tracking-wider mb-1">Total a Cancelar</p>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold">Bs.</span>
              <span className="text-3xl font-bold">{formatearMontoVES(precioFinalVES)}</span>            </div>
            <div className="flex items-center justify-between text-[10px] text-blue-100 mt-2">
              <div>
                <p>Base: USD {precioCurso ?? baseUSD}</p>
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
        <div className="border-t border-blue-100 bg-white px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="grid min-w-0 flex-1 grid-cols-3 gap-2">
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-wide text-gray-400">Banco</p>
                <p className="truncate text-[11px] font-semibold text-gray-800" title={pagoMovil.banco || ''}>{pagoMovil.banco || '—'}</p>
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-wide text-gray-400">Telf</p>
                <p className="truncate text-[11px] font-semibold text-gray-800" title={pagoMovil.telefono || ''}>{pagoMovil.telefono || '—'}</p>
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-wide text-gray-400">CI</p>
                <p className="truncate text-[11px] font-semibold text-gray-800" title={pagoMovil.cedula || ''}>{pagoMovil.cedula || '—'}</p>
              </div>
            </div>
            <BotonCopiarDatos compacto config={config} showToast={showToast} montoVES={precioFinalVES} />
          </div>
        </div>
      </div>
      <div className="w-full mt-2">
        <Select label="Banco Emisor" options={BANCOS.map(b => b.nombre)} value={form.pagoBanco} onChange={e => handleChange('pagoBanco', e.target.value)} icon={CreditCard} />
        {errores.pagoBanco && <p className="text-xs text-red-600 mt-0.5 ml-1">{errores.pagoBanco}</p>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Input label="Teléfono Origen" type="tel" value={form.pagoTelefono} onChange={e => handleChange('pagoTelefono', e.target.value.replace(/\D/g,'').slice(0,11))} icon={Phone} placeholder="04141234567" inputMode="numeric" pattern="\d{11}" maxLength={11} required />
          {errores.pagoTelefono && <p className="text-xs text-red-600 mt-0.5 ml-1">{errores.pagoTelefono}</p>}
        </div>
        <div>
          <Input label="Cédula Titular" type="tel" value={form.pagoCedula} onChange={e => handleChange('pagoCedula', e.target.value.replace(/\D/g,'').slice(0,10))} icon={Contact} placeholder="15123456" inputMode="numeric" pattern="\d{7,10}" maxLength={10} required />
          {errores.pagoCedula && <p className="text-xs text-red-600 mt-0.5 ml-1">{errores.pagoCedula}</p>}
        </div>
      </div>
      <div className={`grid gap-2 ${usarCaptchaReal ? 'grid-cols-1' : 'grid-cols-2'}`}>
        <div>
          <Input label="Últimos 4 dígitos Ref." type="tel" value={form.pagoRef} onChange={e => handleChange('pagoRef', e.target.value.replace(/\D/g,'').slice(0,4))} icon={Hash} placeholder="8452" inputMode="numeric" pattern="\d{4}" maxLength={4} required />
          {errores.pagoRef && <p className="text-xs text-red-600 mt-0.5 ml-1">{errores.pagoRef}</p>}
        </div>
        {!usarCaptchaReal && (
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-0.5 ml-1 flex items-center gap-1"><Lock size={14} className="text-gray-500" /> Captcha</label>
            <div className="bg-gray-50 border-2 border-gray-200 focus-within:border-blue-500 rounded-xl overflow-hidden">
              <input type="tel" value={captchaValue} onChange={onCaptchaChange} placeholder={`${captchaA} + ${captchaB} = ?`} className="w-full bg-transparent py-2.5 px-3 text-sm outline-none" />
              <div className="bg-gray-100 border-t border-gray-200 px-3 py-1 text-[10px] text-gray-500">Resuelve la suma</div>
            </div>
          </div>
        )}
      </div>
      {usarCaptchaReal && <CaptchaTurnstile ref={captchaRef} siteKey={captchaSiteKey} onFallar={onCaptchaFallar} />}
            {/* Checkbox de Términos y Condiciones */}
      <div className="mt-3">
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={terminosAceptados}
            onChange={onToggleTerminos}
            className="mt-0.5 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="text-xs text-gray-700">
            He leído y acepto los{' '}
            <button type="button" onClick={onVerTerminos} className="text-blue-600 underline font-medium">
              Términos y Condiciones del Servicio
            </button>{' '}
            y el{' '}
            <button type="button" onClick={() => setMostrarAvisoLegal(true)} className="text-blue-600 underline font-medium">
              Aviso Legal
            </button>
          </span>
        </label>
      </div>

      {mostrarAvisoLegal && <ModalAvisoLegal onClose={() => setMostrarAvisoLegal(false)} />}
      {mostrarTerminos && <ModalTerminos onClose={onCerrarTerminos} />}
    </div>
  );
}