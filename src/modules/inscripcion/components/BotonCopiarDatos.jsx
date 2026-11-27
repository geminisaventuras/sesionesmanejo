// @build: 2026-11-27 | id: BOTON-COPIAR-COMPACTO | desc: Variante compacta para la fila de Pago Movil del paso 4.
import React from 'react';
import { Copy } from 'lucide-react';

export function BotonCopiarDatos({ config, showToast, montoVES, compacto = false }) {
  // Formato Venezuela (bancos): 33.860,40
  const formatearMontoVES = (valor) => {
    const num = Number(valor);
    if (!isFinite(num) || num <= 0) return '';
    const [entero, decimal] = num.toFixed(2).split('.');
    const enteroConPuntos = entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${enteroConPuntos},${decimal}`;
  };

  const handleCopiarDatos = () => {
    const { codigo, telefono, cedula } = config?.pagoMovilEscuela || {};
    const montoStr = formatearMontoVES(montoVES);
    const texto = `${codigo || ''} ${telefono || ''} ${cedula || ''}${montoStr ? ` Bs. ${montoStr}` : ''}`.trim();
    const copiar = (text) => {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text);
      }
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        return Promise.resolve();
      } catch (e) {
        return Promise.reject(e);
      } finally {
        document.body.removeChild(textarea);
      }
    };

    copiar(texto).then(() => {
      if (showToast) showToast('Datos Copiado', 'success');
    }).catch(() => {
      if (showToast) showToast('Error al copiar', 'error');
    });
  };

  if (compacto) {
    return (
      <button
        type="button"
        onClick={handleCopiarDatos}
        aria-label="Copiar datos de Pago Móvil"
        title="Copiar datos de Pago Móvil"
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition-colors hover:bg-blue-100"
      >
        <Copy size={15} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleCopiarDatos}
      className="w-full mt-2 py-2 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
    >
      📋 Copiar datos
    </button>
  );
}