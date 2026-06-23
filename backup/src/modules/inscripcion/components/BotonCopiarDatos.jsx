// @build: 2026-06-22.REFACTOR | id: BOTON-COPIAR | desc: Componente puro para copiar datos de pago móvil al portapapeles.
import React from 'react';

export function BotonCopiarDatos({ config, showToast }) {
  const handleCopiarDatos = () => {
    const { codigo, telefono, cedula } = config?.pagoMovilEscuela || {};
    const texto = `${codigo || ''} ${telefono || ''} ${cedula || ''}`.trim();

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