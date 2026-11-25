import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, MessageCircle } from 'lucide-react';
import { ASISTENTE_ACTIVO } from '../../utils/asistente';
import AsistenteWidget from './AsistenteWidget';

// Ruta /chat: el asistente ocupa la pantalla completa y mantiene el hilo de la sesion.
export default function ChatAsistenteView() {
  if (!ASISTENTE_ACTIVO) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white">
          <MessageCircle size={26} />
        </div>
        <h1 className="text-lg font-black text-slate-900">El asistente no esta disponible</h1>
        <p className="max-w-sm text-sm text-slate-600">
          Puedes escribirnos por WhatsApp o revisar packs y sesiones mientras reactivamos el chat.
        </p>
        <Link to="/" className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white">
          <ChevronLeft size={16} /> Volver al inicio
        </Link>
      </div>
    );
  }

  return <AsistenteWidget pantallaCompleta />;
}
