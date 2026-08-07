import React, { useRef } from 'react';
import { Button } from '../../../components/UI';
import { AlertTriangle, X } from 'lucide-react';
import { useFocusTrap } from '../../shared/hooks/useFocusTrap';

export default function ModalConfirmacion({ titulo, mensaje, onConfirm, onCancel }) {
  const containerRef = useRef(null);
  useFocusTrap(containerRef, onCancel);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div ref={containerRef} className="bg-white rounded-2xl shadow-2xl max-w-xs w-full p-5 text-center">
        <div className="flex justify-end mb-2">
          <button onClick={onCancel} className="p-1 bg-gray-100 rounded-full"><X size={16} /></button>
        </div>
        <AlertTriangle size={32} className="text-yellow-500 mx-auto mb-3" />
        <h3 className="font-black text-gray-900 mb-2">{titulo}</h3>
        <p className="text-sm text-gray-600 mb-4">{mensaje}</p>
        <div className="flex gap-2 justify-center">
          <Button type="button" onClick={onCancel} variant="outline" className="!w-auto !py-2 !text-xs">Cancelar</Button>
          <Button type="button" onClick={onConfirm} variant="dark" className="!w-auto !py-2 !text-xs">Confirmar</Button>
        </div>
      </div>
    </div>
  );
}