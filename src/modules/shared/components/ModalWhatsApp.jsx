// @build: 2026-11-12 | id: MODAL-WHATSAPP | desc: Modal reutilizable para previsualizar y enviar WhatsApp
import { MessageCircle, X } from 'lucide-react';
import { Button } from '../../../components/UI';

export default function ModalWhatsApp({ url, mensaje, onClose, titulo = 'Notificar por WhatsApp' }) {
  if (!url) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-4 space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-sm text-gray-800">{titulo}</h3>
          <button onClick={onClose} className="p-1 bg-gray-100 rounded-full"><X size={16} /></button>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs whitespace-pre-wrap max-h-60 overflow-y-auto text-gray-700 font-mono">
          {mensaje}
        </div>
        <div className="flex gap-2">
          <Button variant="success" className="flex-1" icon={MessageCircle} onClick={() => window.open(url, '_blank')}>
            Abrir WhatsApp
          </Button>
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
        </div>
      </div>
    </div>
  );
}
