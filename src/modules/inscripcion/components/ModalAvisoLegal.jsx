// T-159: el aviso legal sale del cuerpo del paso 4 y se muestra como modal,
// con el mismo patron visual de ModalTerminos.
import React from 'react';
import { X } from 'lucide-react';

const AVISO_LEGAL_TEXTO = `AVISO LEGAL

Esta plataforma ofrece servicios privados de educación no formal, consultoría deportiva y tutorías de acompañamiento para el desarrollo de habilidades motoras.

No somos una "Escuela del Transporte" ni prestamos servicios conexos regulados por el Instituto Nacional de Transporte Terrestre (INTT).

Las constancias emitidas por esta plataforma son de carácter privado y recreativo. No poseen validez legal para la obtención de licencias de conducir, certificados de saberes ni para cualquier otro trámite ante las autoridades de tránsito del Estado venezolano.`;

export function ModalAvisoLegal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[85vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-black text-gray-900">Aviso Legal</h2>
          <button onClick={onClose} aria-label="Cerrar aviso legal" className="p-1.5 bg-gray-100 rounded-full hover:bg-gray-200">
            <X size={20} className="text-gray-600" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
            {AVISO_LEGAL_TEXTO}
          </pre>
        </div>
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-base"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

export default ModalAvisoLegal;
