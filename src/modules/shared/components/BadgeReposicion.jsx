// Componente reusable: muestra info de reposición de D2.
// Uso: <BadgeReposicion reserva={reserva} horarios={horarios} variant="compact|full" />
// Retorna null si la reserva no tiene horaIdReposicion.
import { Repeat } from 'lucide-react';

const formatearFechaCorta = (fechaStr) => {
  if (!fechaStr) return '—';
  const [y, m, d] = fechaStr.split('-');
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return `${parseInt(d)} ${meses[parseInt(m)-1]}`;
};

export default function BadgeReposicion({ reserva, horarios, variant = 'compact' }) {
  if (!reserva?.horaIdReposicion) return null;

  const horario = (horarios || []).find(h => String(h.id) === String(reserva.horaIdReposicion));
  const labelBloque = horario?.label || reserva.horaIdReposicion;
  const fechaRepuesta = formatearFechaCorta(reserva.fecha2);

  if (variant === 'compact') {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-orange-400/90 text-orange-900 text-[9px] font-black uppercase">
        <Repeat size={9} />
        D2 REPUESTO
      </span>
    );
  }

  // variant === 'full'
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 flex items-start gap-2">
      <Repeat size={14} className="text-blue-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1 text-[11px]">
        <p className="font-bold text-blue-900">D2 repuesto</p>
        <p className="text-blue-800">
          Nueva fecha: <strong>{fechaRepuesta}</strong> · Bloque: <strong>{labelBloque}</strong>
        </p>
      </div>
    </div>
  );
}
