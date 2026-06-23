import React, { useRef } from 'react';
import { Button } from '../../../components/UI';
import { AlertTriangle, Clock, LogOut } from 'lucide-react';
import { useFocusTrap } from '../../shared/hooks/useFocusTrap';


export function ModalExpiracion({ reintentosExpiracion, maxReintentos, onSeleccionarBloque, onSalirSistema }) {
  const containerRef = useRef(null);
  useFocusTrap(containerRef, onSalirSistema);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div ref={containerRef} className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
        <AlertTriangle size={40} className="text-red-500 mx-auto mb-4" />
        <h3 className="font-black text-gray-900 text-lg mb-2">Tiempo Expirado</h3>
        <p className="text-sm text-gray-600 mb-6">
          El tiempo de 10 minutos expiró. El bloque de horario ha sido liberado. Debe seleccionar uno nuevo.
        </p>
        <div className="space-y-3">
          <Button
            type="button"
            onClick={onSeleccionarBloque}
            variant="primary"
            icon={Clock}
            disabled={reintentosExpiracion >= maxReintentos}
          >
            Seleccionar Bloque {reintentosExpiracion > 0 ? `(${maxReintentos - reintentosExpiracion} intentos)` : ''}
          </Button>
          <Button
            type="button"
            onClick={onSalirSistema}
            variant="outline"
            icon={LogOut}
          >
            Salir del sistema
          </Button>
        </div>
      </div>
    </div>
  );
}