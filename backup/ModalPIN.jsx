import React from 'react';
import { Lock, Check } from 'lucide-react';
import { Button } from './UI';

const ModalPIN = ({ pin, onConfirm }) => {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 transform transition-all">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock size={32} className="text-blue-600" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">¡Inscripción Exitosa!</h2>
          <div className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-4 my-6">
            <p className="text-sm text-gray-600 mb-2">Tu PIN de acceso es:</p>
            <p className="text-4xl font-black text-blue-600 tracking-[0.5rem] font-mono">{pin}</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
            <p className="text-sm font-bold text-yellow-800">⚠️ Guarda este PIN ahora. No se volverá a mostrar.</p>
          </div>
          <Button onClick={onConfirm} variant="success" icon={Check}>
            He guardado mi PIN
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ModalPIN;
