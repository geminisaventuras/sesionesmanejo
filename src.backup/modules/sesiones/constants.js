import { CloudRain, Wrench, AlertTriangle, HelpCircle } from 'lucide-react';

export const SGTA_DEFAULTS = {
  generalSegundos: 0, generalActivo: false, moduloEnProgreso: null,
  moduloSegundos: 0, moduloActivo: false, pausaActiva: false,
  pausaInicio: null, pausaMotivo: '', pausaSegundos: 0,
  pausaTotalAcumulada: 0, diaActual: 1, tiempoExtraAcumulado: 0
};

export const MOTIVOS_PAUSA = [
  { id: 'lluvia', label: 'Lluvia', icon: CloudRain },
  { id: 'falla', label: 'Falla mecánica', icon: Wrench },
  { id: 'estudiante', label: 'Est. indispuesto', icon: AlertTriangle },
  { id: 'otro', label: 'Otro', icon: HelpCircle }
];
