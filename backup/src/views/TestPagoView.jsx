// @build: 2026-06-18.17-00-00 | id: TEST-PAGO | desc: Página de prueba con 3 variantes de diseño del paso 4
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, CreditCard, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';

// Datos simulados para la prueba
const datosSimulados = {
  total: '1,250.00',
  baseUSD: 35,
  tasaEUR: 36.50,
  desglose: [
    'Base: $35',
    'Sede Guarenas: +$5',
    'Recargo sin Bici: +$10',
  ],
  escuela: {
    banco: 'Banesco',
    telefono: '04141234567',
    cedula: '12345678',
  },
  captchaA: 3,
  captchaB: 5,
};

const TestPagoView = () => {
  const navigate = useNavigate();
  const [mostrarDetalle1, setMostrarDetalle1] = useState(true);
  const [mostrarDetalle2, setMostrarDetalle2] = useState(false);
  const [mostrarDetalle3, setMostrarDetalle3] = useState(false);

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col max-w-md mx-auto shadow-xl">
      {/* Header */}
      <div className="flex items-center gap-3 p-5 border-b bg-white">
        <button onClick={() => navigate('/')} className="p-2 bg-gray-50 rounded-full">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-xl font-black uppercase flex-1">Prueba de Diseño - Paso 4</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-8">
        
        {/* ================================================================ */}
        {/* VARIANTE 1: COMPACTA 2 COLUMNAS */}
        {/* ================================================================ */}
        <div>
          <h3 className="font-black text-sm text-gray-900 bg-yellow-100 p-2 rounded-lg mb-3 text-center">
            VARIANTE 1: Compacta 2 columnas
          </h3>
          
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 space-y-3">
            {/* Total compacto horizontal */}
            <div className="bg-blue-600 text-white p-3 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-[10px] opacity-80 uppercase font-bold">Total a Cancelar</p>
                <p className="text-2xl font-black">Bs. {datosSimulados.total}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] opacity-80">Base: USD {datosSimulados.baseUSD}</p>
                <p className="text-[10px] opacity-80">Tasa: {datosSimulados.tasaEUR}</p>
              </div>
            </div>

            {/* Desglose + Datos Escuela en 2 columnas */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
                <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Desglose</p>
                {datosSimulados.desglose.map((linea, i) => (
                  <p key={i} className="text-[11px] text-gray-700 leading-tight">{linea}</p>
                ))}
              </div>
              <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
                <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Pago Móvil Escuela</p>
                <p className="text-[11px] text-gray-700 leading-tight"><span className="font-bold">Banco:</span> {datosSimulados.escuela.banco}</p>
                <p className="text-[11px] text-gray-700 leading-tight"><span className="font-bold">Telf:</span> {datosSimulados.escuela.telefono}</p>
                <p className="text-[11px] text-gray-700 leading-tight"><span className="font-bold">CI:</span> {datosSimulados.escuela.cedula}</p>
              </div>
            </div>

            {/* Captcha en línea */}
            <div className="flex items-center gap-2 bg-blue-50 p-2 rounded-lg border border-blue-200">
              <p className="text-xs font-bold text-blue-700 whitespace-nowrap">
                ¿{datosSimulados.captchaA} + {datosSimulados.captchaB}?
              </p>
              <input
                type="tel"
                placeholder="= ?"
                className="flex-1 bg-white border border-blue-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>

            {/* Campos de reporte compactos */}
            <div className="grid grid-cols-2 gap-2">
              <input type="text" placeholder="Teléfono Origen" className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none" />
              <input type="text" placeholder="Cédula Titular" className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none" />
            </div>
            <input type="text" placeholder="Últimos 4 dígitos Ref." className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none" />

            <button className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-sm">
              Confirmar y Enviar Pago
            </button>
          </div>
        </div>

        {/* ================================================================ */}
        {/* VARIANTE 2: ACORDEÓN */}
        {/* ================================================================ */}
        <div>
          <h3 className="font-black text-sm text-gray-900 bg-yellow-100 p-2 rounded-lg mb-3 text-center">
            VARIANTE 2: Acordeón elegante
          </h3>
          
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 space-y-3">
            {/* Total */}
            <div className="bg-blue-600 text-white p-3 rounded-xl text-center">
              <p className="text-[10px] opacity-80 uppercase font-bold">Total a Cancelar</p>
              <p className="text-2xl font-black">Bs. {datosSimulados.total}</p>
              <p className="text-[10px] opacity-80">Base: USD {datosSimulados.baseUSD} | Tasa: {datosSimulados.tasaEUR}</p>
            </div>

            {/* Acordeón: Desglose + Datos Escuela */}
            <button
              onClick={() => setMostrarDetalle2(!mostrarDetalle2)}
              className="w-full flex items-center justify-between bg-gray-50 p-2 rounded-lg border border-gray-200"
            >
              <span className="text-xs font-bold text-gray-700">Ver desglose y datos de la escuela</span>
              {mostrarDetalle2 ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
            </button>
            
            {mostrarDetalle2 && (
              <div className="space-y-2">
                <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
                  <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Desglose</p>
                  {datosSimulados.desglose.map((linea, i) => (
                    <p key={i} className="text-[11px] text-gray-700 leading-tight">{linea}</p>
                  ))}
                </div>
                <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
                  <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Pago Móvil Escuela</p>
                  <p className="text-[11px] text-gray-700 leading-tight"><span className="font-bold">Banco:</span> {datosSimulados.escuela.banco}</p>
                  <p className="text-[11px] text-gray-700 leading-tight"><span className="font-bold">Telf:</span> {datosSimulados.escuela.telefono}</p>
                  <p className="text-[11px] text-gray-700 leading-tight"><span className="font-bold">CI:</span> {datosSimulados.escuela.cedula}</p>
                </div>
              </div>
            )}

            {/* Captcha compacto */}
            <div className="flex items-center gap-2 bg-blue-50 p-2 rounded-lg border border-blue-200">
              <p className="text-xs font-bold text-blue-700 whitespace-nowrap">
                ¿{datosSimulados.captchaA} + {datosSimulados.captchaB}?
              </p>
              <input
                type="tel"
                placeholder="= ?"
                className="flex-1 bg-white border border-blue-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>

            {/* Campos de reporte */}
            <div className="grid grid-cols-2 gap-2">
              <input type="text" placeholder="Teléfono Origen" className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none" />
              <input type="text" placeholder="Cédula Titular" className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none" />
            </div>
            <input type="text" placeholder="Últimos 4 dígitos Ref." className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none" />

            <button className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-sm">
              Confirmar y Enviar Pago
            </button>
          </div>
        </div>

        {/* ================================================================ */}
        {/* VARIANTE 3: MINIMALISTA */}
        {/* ================================================================ */}
        <div>
          <h3 className="font-black text-sm text-gray-900 bg-yellow-100 p-2 rounded-lg mb-3 text-center">
            VARIANTE 3: Minimalista
          </h3>
          
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 space-y-3">
            {/* Total grande */}
            <div className="bg-blue-600 text-white p-4 rounded-xl text-center">
              <p className="text-sm opacity-80 uppercase font-bold">Total a Cancelar</p>
              <p className="text-4xl font-black">Bs. {datosSimulados.total}</p>
              <p className="text-xs opacity-80 mt-1">Pago Móvil</p>
            </div>

            {/* Botón expandir detalles */}
            <button
              onClick={() => setMostrarDetalle3(!mostrarDetalle3)}
              className="w-full flex items-center justify-center gap-2 bg-gray-50 p-2 rounded-lg border border-dashed border-gray-300 text-xs text-gray-600 font-bold"
            >
              {mostrarDetalle3 ? <EyeOff size={16} /> : <Eye size={16} />}
              {mostrarDetalle3 ? 'Ocultar desglose' : 'Ver desglose y datos'}
            </button>

            {mostrarDetalle3 && (
              <div className="space-y-2">
                <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
                  <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Desglose</p>
                  {datosSimulados.desglose.map((linea, i) => (
                    <p key={i} className="text-[11px] text-gray-700 leading-tight">{linea}</p>
                  ))}
                </div>
                <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
                  <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Pago Móvil Escuela</p>
                  <p className="text-[11px] text-gray-700 leading-tight"><span className="font-bold">Banco:</span> {datosSimulados.escuela.banco}</p>
                  <p className="text-[11px] text-gray-700 leading-tight"><span className="font-bold">Telf:</span> {datosSimulados.escuela.telefono}</p>
                  <p className="text-[11px] text-gray-700 leading-tight"><span className="font-bold">CI:</span> {datosSimulados.escuela.cedula}</p>
                </div>
                <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
                  <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Tasa de cambio</p>
                  <p className="text-[11px] text-gray-700 leading-tight">Base: USD {datosSimulados.baseUSD}</p>
                  <p className="text-[11px] text-gray-700 leading-tight">Tasa EUR BCV: {datosSimulados.tasaEUR}</p>
                </div>
              </div>
            )}

            {/* Captcha compacto */}
            <div className="flex items-center gap-2 bg-blue-50 p-2 rounded-lg border border-blue-200">
              <p className="text-xs font-bold text-blue-700 whitespace-nowrap">
                ¿{datosSimulados.captchaA} + {datosSimulados.captchaB}?
              </p>
              <input
                type="tel"
                placeholder="= ?"
                className="flex-1 bg-white border border-blue-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>

            {/* Campos de reporte */}
            <div className="grid grid-cols-2 gap-2">
              <input type="text" placeholder="Teléfono Origen" className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none" />
              <input type="text" placeholder="Cédula Titular" className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none" />
            </div>
            <input type="text" placeholder="Últimos 4 dígitos Ref." className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none" />

            <button className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-sm">
              Confirmar y Enviar Pago
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default TestPagoView;
