// @build: 2026-11-19 | id: FINANCE-UI | desc: Componentes visuales compartidos del módulo financiero
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { formatearMonto } from '../../../shared/utils/currency';

const TONES = {
  emerald: 'from-emerald-600 to-emerald-800',
  blue: 'from-blue-600 to-blue-800',
  indigo: 'from-indigo-600 to-indigo-800',
  amber: 'from-amber-500 to-orange-600',
  rose: 'from-rose-600 to-rose-800',
  slate: 'from-slate-700 to-slate-900',
  violet: 'from-violet-600 to-violet-800'
};

export const FinCard = ({ children, className = '' }) => (
  <div className={`bg-white border border-slate-100 rounded-2xl shadow-sm ${className}`}>
    {children}
  </div>
);

export const FinSection = ({ title, subtitle, icon: Icon, action, children, className = '' }) => (
  <FinCard className={`p-4 ${className}`}>
    <div className="flex items-start justify-between gap-3 mb-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {Icon && <Icon size={17} className="text-blue-600 shrink-0" />}
          <h2 className="text-sm font-black text-slate-900 truncate">{title}</h2>
        </div>
        {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
    {children}
  </FinCard>
);

export const FinKpi = ({ label, value, icon: Icon, tone = 'blue', hint, className = '' }) => (
  <div className={`min-w-0 overflow-hidden rounded-2xl bg-gradient-to-br ${TONES[tone] || TONES.blue} text-white p-4 shadow-md relative ${className}`}>
    <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full blur-2xl" />
    <div className="relative">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-white/75 truncate">{label}</p>
        {Icon && <Icon size={17} className="text-white/70 shrink-0" />}
      </div>
      <p className="mt-2 text-lg sm:text-2xl font-black tabular-nums leading-tight break-words">{value}</p>
      {hint && <p className="mt-1 text-[10px] text-white/70 truncate">{hint}</p>}
    </div>
  </div>
);

export const FinBadge = ({ children, tone = 'slate' }) => {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    blue: 'bg-blue-100 text-blue-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    rose: 'bg-rose-100 text-rose-700',
    amber: 'bg-amber-100 text-amber-800',
    indigo: 'bg-indigo-100 text-indigo-700'
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide ${tones[tone] || tones.slate}`}>
      {children}
    </span>
  );
};

export const FinEmpty = ({ title = 'Sin datos', description = '' }) => (
  <div className="text-center py-8 px-4">
    <p className="text-sm font-bold text-slate-600">{title}</p>
    {description && <p className="text-xs text-slate-400 mt-1">{description}</p>}
  </div>
);

export const FinanceMovementRow = ({ mov, moneda, showSign = true }) => {
  const ingreso = mov.tipo === 'ingreso';
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${ingreso ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
          {ingreso ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-800 truncate">{mov.descripcionVisible || mov.categoriaLabel}</p>
          <p className="text-[10px] text-slate-400 truncate">{mov.fecha} · {mov.categoriaLabel}</p>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className={`text-xs font-black tabular-nums ${ingreso ? 'text-emerald-600' : 'text-rose-600'}`}>
          {showSign && (ingreso ? '+' : '−')} {formatearMonto(mov.monto, moneda || mov.moneda)}
        </p>
        {mov.metodoPago && <p className="text-[9px] text-slate-400">{mov.metodoPago}</p>}
      </div>
    </div>
  );
};

export const tonePorTipo = (tipo) => (tipo === 'ingreso' ? 'emerald' : 'rose');
