// Paso previo del chat IA (T-148): nombre y WhatsApp con consentimiento antes de conversar.
// Captura el interesado de una vez y personaliza el saludo. Sin correo ni notas aqui.
import { MessageCircle, ShieldCheck } from 'lucide-react';

export default function PasoIdentidad({
  nombre = '',
  telefono = '',
  consentimiento = false,
  enviando = false,
  errores = [],
  onNombre,
  onTelefono,
  onConsentimiento,
  onSubmit,
}) {
  const hayError = (campo) => errores.includes(campo);

  return (
    <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col justify-center overflow-y-auto bg-slate-50 px-5 py-6">
      <div className="mx-auto w-full max-w-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white">
            <MessageCircle size={22} />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900">Antes de empezar</h3>
            <p className="text-xs text-slate-500">Asi podemos ayudarte y contactarte si lo necesitas.</p>
          </div>
        </div>

        <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3">
          <label className="block text-[11px] font-bold text-slate-600" htmlFor="chat-nombre">Nombre</label>
          <input
            id="chat-nombre"
            value={nombre}
            onChange={(evento) => onNombre(evento.target.value)}
            placeholder="Tu nombre"
            autoComplete="given-name"
            maxLength={80}
            aria-invalid={hayError('nombre')}
            className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-slate-900 ${hayError('nombre') ? 'border-red-400' : 'border-slate-300'}`}
          />

          <label className="block pt-1 text-[11px] font-bold text-slate-600" htmlFor="chat-telefono">WhatsApp</label>
          <input
            id="chat-telefono"
            value={telefono}
            onChange={(evento) => onTelefono(evento.target.value)}
            placeholder="0416 1234567"
            autoComplete="tel"
            inputMode="tel"
            maxLength={20}
            aria-invalid={hayError('telefono')}
            className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-slate-900 ${hayError('telefono') ? 'border-red-400' : 'border-slate-300'}`}
          />
        </div>

        <label className="flex items-start gap-2 rounded-2xl border border-slate-200 bg-white p-3 text-[11px] leading-snug text-slate-600">
          <input
            type="checkbox"
            checked={consentimiento}
            onChange={(evento) => onConsentimiento(evento.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0"
          />
          <span>
            Autorizo que Motoapp me contacte por WhatsApp y <strong>guarde esta conversacion</strong> para
            revisar la calidad de las respuestas. Solo el equipo la lee. Se conserva 12 meses y puedo
            pedir la eliminacion de mis datos cuando quiera.
          </span>
        </label>

        {errores.length > 0 && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-700">
            {errores.includes('nombre') && 'Escribe tu nombre. '}
            {errores.includes('telefono') && 'Escribe un WhatsApp valido. '}
            {errores.includes('consentimiento') && 'Marca el consentimiento. '}
            {errores.includes('guardado') && 'No pudimos guardar tus datos. Intenta de nuevo.'}
          </p>
        )}

        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-black text-white transition active:scale-[0.99] disabled:opacity-50"
        >
          {enviando ? 'Guardando...' : 'Empezar a chatear'}
        </button>

        <p className="flex items-center justify-center gap-1.5 px-3 text-center text-[10px] text-slate-400">
          <ShieldCheck size={13} className="shrink-0" /> La conversacion se guarda solo para auditoria interna; no se comparte con terceros.
        </p>
      </div>
    </form>
  );
}
