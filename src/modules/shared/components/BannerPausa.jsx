import { Play, CloudRain, Wrench, AlertTriangle, HelpCircle } from 'lucide-react';
import { Button } from '../../shared/components/UI';

const MOTIVOS_ICON_MAP = {
  'Lluvia': CloudRain,
  'Falla mecánica': Wrench,
  'Est. indispuesto': AlertTriangle
};

const formatoTiempo = (segundos) => {
  const s = Number(segundos) || 0;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

export default function BannerPausa({ motivo, tiempo, onReanudar, soloLectura }) {
  const MotivoIcon = MOTIVOS_ICON_MAP[motivo] || HelpCircle;
  return (
    <div className="bg-orange-50 border border-orange-200 p-3 rounded-xl">
      <div className="flex items-center gap-2">
        <MotivoIcon size={14} className="text-orange-600" />
        <div className="flex-1">
          <p className="text-xs font-bold text-orange-800">
            🟠 {motivo} · {formatoTiempo(tiempo)}
          </p>
          <p className="text-[10px] text-orange-600">La sesión se reanudará pronto.</p>
        </div>
        {!soloLectura && (
          <Button type="button" onClick={onReanudar} variant="success" className="!py-2 !text-xs" icon={Play}>
            Reanudar
          </Button>
        )}
      </div>
    </div>
  );
}
