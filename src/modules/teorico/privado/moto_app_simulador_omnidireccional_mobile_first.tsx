import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Shield,
  Eye,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Volume2,
  VolumeX,
  RotateCcw,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Award,
  Compass,
  Zap,
  Layers,
  Navigation,
  Sun,
  Moon,
  Info,
  Sparkles,
  Play,
  Pause,
  Gauge,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Wrench,
  Radio,
  X,
  Sliders,
  Target,
  Activity,
  Flame,
  Clock,
} from 'lucide-react';

/* ============================================================================
 * 1. LÍMITE DE ERRORES (ERROR BOUNDARY) Y UTILIDADES BASE
 * ============================================================================ */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Error en Moto App Omnidireccional:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-md mx-auto min-h-[100dvh] bg-slate-950 text-slate-100 flex items-center justify-center p-5">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/15 text-red-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-base font-extrabold text-white">
              Ocurrió un inconveniente en el simulador
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Puedes reiniciar este módulo interactivo para continuar tu entrenamiento vial.
            </p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false })}
              className="w-full min-h-[48px] rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-sm active:scale-95 transition-transform cursor-pointer"
            >
              Reiniciar Simulador
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const NOTA_LEGAL_MOTOAPP =
  'Entrenamiento técnico privado y educación no formal para el desarrollo de destrezas de control vehicular y cultura vial. La expedición de licencias y certificados oficiales es competencia exclusiva del INTT.';

function vibrarSeguro(patron) {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(patron);
    }
  } catch {
    // Silencioso en navegadores sin soporte háptico
  }
}

function sanitizarNombre(valor) {
  return String(valor || '')
    .replace(/[<>"{}[\]\\]/g, '')
    .slice(0, 45);
}

async function copiarTextoSeguro(texto) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
    const ta = document.createElement('textarea');
    ta.value = texto;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return true;
  } catch {
    return false;
  }
}

/* ============================================================================
 * 2. MOTOR DE AUDIO NATIVO (WEB AUDIO API — CERO ARCHIVOS EXTERNOS)
 * ============================================================================ */
function useAudioMotoApp(habilitado) {
  const ctxRef = useRef(null);

  const obtenerCtx = useCallback(() => {
    if (!habilitado) return null;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      if (!ctxRef.current) {
        ctxRef.current = new AudioCtx();
      }
      if (ctxRef.current.state === 'suspended') {
        ctxRef.current.resume().catch(() => {});
      }
      return ctxRef.current;
    } catch {
      return null;
    }
  }, [habilitado]);

  useEffect(() => {
    return () => {
      try {
        if (ctxRef.current && ctxRef.current.state !== 'closed') {
          ctxRef.current.close().catch(() => {});
        }
      } catch {
        // Silencioso al desmontar
      }
    };
  }, []);

  const tocar = useCallback(
    (tipo) => {
      const ctx = obtenerCtx();
      if (!ctx) return;
      try {
        const now = ctx.currentTime;

        if (tipo === 'tic' || tipo === 'tac') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(tipo === 'tic' ? 1320 : 960, now);
          osc.frequency.exponentialRampToValueAtTime(tipo === 'tic' ? 600 : 450, now + 0.025);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.04);
        } else if (tipo === 'switch') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(780, now);
          osc.frequency.exponentialRampToValueAtTime(260, now + 0.03);
          gain.gain.setValueAtTime(0.07, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.04);
        } else if (tipo === 'alerta') {
          [0, 0.12].forEach((offset) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(360, now + offset);
            osc.frequency.linearRampToValueAtTime(230, now + offset + 0.09);
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(980, now + offset);
            gain.gain.setValueAtTime(0.11, now + offset);
            gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.1);
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + offset);
            osc.stop(now + offset + 0.11);
          });
        } else if (tipo === 'muro') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(140, now);
          osc.frequency.exponentialRampToValueAtTime(42, now + 0.22);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.26);
        } else if (tipo === 'radar') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(860, now);
          osc.frequency.exponentialRampToValueAtTime(1180, now + 0.08);
          gain.gain.setValueAtTime(0.06, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.13);
        } else if (tipo === 'ok') {
          [587.33, 880].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const t0 = now + idx * 0.075;
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t0);
            gain.gain.setValueAtTime(0.001, t0);
            gain.gain.linearRampToValueAtTime(0.1, t0 + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.18);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t0);
            osc.stop(t0 + 0.2);
          });
        } else if (tipo === 'error') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(220, now);
          osc.frequency.linearRampToValueAtTime(135, now + 0.2);
          gain.gain.setValueAtTime(0.09, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.24);
        } else if (tipo === 'fanfarria') {
          [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const t0 = now + idx * 0.08;
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, t0);
            gain.gain.setValueAtTime(0.001, t0);
            gain.gain.linearRampToValueAtTime(0.11, t0 + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.24);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t0);
            osc.stop(t0 + 0.26);
          });
        }
      } catch {
        // Silencioso si el navegador restringe audio
      }
    },
    [obtenerCtx]
  );

  return tocar;
}

/* ============================================================================
 * 3. COMPONENTE REUTILIZABLE: CAJÓN COLAPSABLE DE TEORÍA Y LEY VE
 * ============================================================================ */
function CajonTeoria({ titulo, badge = 'Ley VE · Técnica', children }) {
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="w-full min-h-[46px] px-3.5 py-2.5 flex items-center justify-between gap-2 text-left cursor-pointer active:bg-slate-800/70 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Info className="w-4 h-4 text-[#2563EB] shrink-0" />
          <span className="text-xs font-extrabold text-slate-100 truncate">{titulo}</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 shrink-0">
            {badge}
          </span>
        </div>
        {abierto ? (
          <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
        )}
      </button>

      {abierto && (
        <div className="px-3.5 pb-3.5 pt-1 border-t border-slate-800/80 text-xs text-slate-300 space-y-2.5 leading-relaxed animate-fadeIn">
          {children}
        </div>
      )}
    </div>
  );
}

/* ============================================================================
 * 4. MÓDULO 1: RETROVISORES — VISIÓN EN TRIÁNGULO INVERTIDO (▼)
 * ============================================================================ */
function evaluarRetrovisor(horiz, vert) {
  // Óptimo: horiz 18..28°, vert -3..+4°
  const hombroPct = Math.round(Math.max(0, Math.min(60, (32 - horiz) * 1.35)));
  const hombroOk = hombroPct >= 9 && hombroPct <= 16;
  const alcanceMetros = Math.round(
    Math.max(18, 115 - Math.abs(vert - 0.5) * 9.5 - Math.max(0, horiz - 31) * 2.1)
  );
  const cumple70m = alcanceMetros >= 70;
  const canalTraseroOk = horiz <= 31 && vert >= -6 && vert <= 7;
  const canalAdyacenteOk = horiz >= 14 && horiz <= 42 && vert >= -7 && vert <= 8;

  const errH = horiz < 18 ? 18 - horiz : horiz > 28 ? horiz - 28 : 0;
  const errV = vert < -3 ? -3 - vert : vert > 4 ? vert - 4 : 0;
  const scoreH = Math.max(0, 100 - errH * 3.9);
  const scoreV = Math.max(0, 100 - errV * 7.2);
  const precision = Math.round(scoreH * 0.72 + scoreV * 0.28);

  return {
    hombroPct,
    hombroOk,
    alcanceMetros,
    cumple70m,
    canalTraseroOk,
    canalAdyacenteOk,
    precision,
  };
}

function RetrovisorSVGMini({ lado, horiz, vert, evalInfo, fase }) {
  const esIzq = lado === 'izq';
  const clipId = `clip-mob-mirror-${lado}`;
  const horizonY = 46 + vert * 2.1;
  const deltaH = horiz - 23;
  const dirSign = esIzq ? 1 : -1;

  const shoulderX = esIzq ? 156 + deltaH * 2.2 * dirSign : 34 + deltaH * 2.2 * dirSign;
  const rearX = esIzq ? 124 + deltaH * 2.5 : 66 - deltaH * 2.5;
  const sideX = esIzq ? 50 + deltaH * 2.5 : 140 - deltaH * 2.5;
  const rearY = horizonY + 14 + Math.sin(fase * 1.2) * 3;
  const sideY = horizonY + 25 + Math.cos(fase * 0.9 + (esIzq ? 0 : 1.5)) * 5;

  const path = esIzq
    ? 'M 18 12 L 172 8 Q 184 8 184 22 L 180 86 Q 178 98 164 98 L 24 94 Q 8 94 6 80 L 6 24 Q 6 12 18 12 Z'
    : 'M 18 8 L 172 12 Q 184 12 184 24 L 184 80 Q 182 94 166 94 L 26 98 Q 12 98 10 86 L 6 22 Q 6 8 18 8 Z';

  const bordeColor =
    evalInfo.precision >= 90 ? '#10B981' : evalInfo.precision >= 65 ? '#FACC15' : '#EF4444';

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-2 space-y-1.5">
      <div className="flex items-center justify-between px-0.5">
        <span className="text-[10px] font-extrabold text-slate-200">
          {esIzq ? 'Espejo Izq.' : 'Espejo Der.'}
        </span>
        <span
          className={`text-[10px] font-black tabular-nums ${
            evalInfo.precision >= 90
              ? 'text-emerald-400'
              : evalInfo.precision >= 65
              ? 'text-yellow-400'
              : 'text-red-400'
          }`}
        >
          {evalInfo.precision}%
        </span>
      </div>

      <svg
        viewBox="0 0 190 106"
        className="w-full h-auto block select-none"
        role="img"
        aria-label={`Retrovisor ${esIzq ? 'izquierdo' : 'derecho'}`}
      >
        <defs>
          <clipPath id={clipId}>
            <path d={path} />
          </clipPath>
        </defs>

        <path d={path} fill="#020617" stroke={bordeColor} strokeWidth="3" />

        <g clipPath={`url(#${clipId})`}>
          <rect x="0" y="-30" width="190" height={Math.max(8, horizonY + 30)} fill="#1E3A8A" />
          <rect x="0" y={horizonY} width="190" height="140" fill="#1E293B" />
          <line x1="0" y1={horizonY} x2="190" y2={horizonY} stroke="#93C5FD" strokeWidth="1" opacity="0.6" />

          {/* Línea de canal en perspectiva */}
          <line
            x1={esIzq ? 112 + deltaH * 1.1 : 78 - deltaH * 1.1}
            y1={horizonY}
            x2={esIzq ? 92 + deltaH * 2.6 : 98 - deltaH * 2.6}
            y2={horizonY + 75}
            stroke="#F8FAFC"
            strokeWidth="2"
            strokeDasharray="6 4"
          />

          {/* Vehículo en canal trasero */}
          <g transform={`translate(${rearX}, ${rearY})`}>
            <rect x="-14" y="-8" width="28" height="15" rx="4" fill="#E2E8F0" />
            <rect x="-10" y="-6" width="20" height="6" rx="1.5" fill="#0F172A" />
            <circle cx="-9" cy="2" r="2.2" fill="#FACC15" />
            <circle cx="9" cy="2" r="2.2" fill="#FACC15" />
          </g>

          {/* Vehículo en canal lateral adyacente */}
          <g transform={`translate(${sideX}, ${sideY})`}>
            {esIzq ? (
              <>
                <rect x="-16" y="-9" width="32" height="18" rx="4" fill="#38BDF8" />
                <rect x="-11" y="-7" width="22" height="6" rx="1.5" fill="#0F172A" />
                <circle cx="-10" cy="3" r="2.5" fill="#FACC15" />
                <circle cx="10" cy="3" r="2.5" fill="#FACC15" />
              </>
            ) : (
              <>
                <rect x="-6" y="-11" width="12" height="22" rx="4" fill="#F97316" />
                <circle cx="0" cy="-6" r="3.5" fill="#0F172A" />
                <circle cx="0" cy="3" r="2.8" fill="#FACC15" />
              </>
            )}
          </g>

          {/* Hombro del piloto en la esquina inferior interna */}
          <path
            d={
              esIzq
                ? `M ${shoulderX} 106 C ${shoulderX - 4} 76, ${shoulderX + 12} 62, ${shoulderX + 48} 58 L ${shoulderX + 95} 106 Z`
                : `M ${shoulderX} 106 C ${shoulderX + 4} 76, ${shoulderX - 12} 62, ${shoulderX - 48} 58 L ${shoulderX - 95} 106 Z`
            }
            fill="#0F172A"
            stroke="#475569"
            strokeWidth="1.6"
          />
        </g>
      </svg>

      <div className="flex items-center justify-between text-[10px] px-0.5 text-slate-400">
        <span>
          Hombro:{' '}
          <strong className={evalInfo.hombroOk ? 'text-emerald-400' : 'text-yellow-400'}>
            {evalInfo.hombroPct}%
          </strong>
        </span>
        <span>
          Alcance:{' '}
          <strong className={evalInfo.cumple70m ? 'text-emerald-400' : 'text-red-400'}>
            {evalInfo.alcanceMetros}m
          </strong>
        </span>
      </div>
    </div>
  );
}

function ModuloEspejos({ tocarSonido, dominado, onMarcarDominado }) {
  const [leftH, setLeftH] = useState(23);
  const [rightH, setRightH] = useState(23);
  const [vert, setVert] = useState(0);
  const [simetrico, setSimetrico] = useState(true);
  const [modoReto, setModoReto] = useState(false);
  const [retoLogrado, setRetoLogrado] = useState(false);
  const [fase, setFase] = useState(0);

  useEffect(() => {
    let rafId;
    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      setFase((p) => p + dt * 1.4);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const evalIzq = useMemo(() => evaluarRetrovisor(leftH, vert), [leftH, vert]);
  const evalDer = useMemo(() => evaluarRetrovisor(rightH, vert), [rightH, vert]);
  const precisionGlobal = Math.round((evalIzq.precision + evalDer.precision) / 2);

  useEffect(() => {
    if (modoReto && !retoLogrado && precisionGlobal >= 90) {
      setRetoLogrado(true);
      onMarcarDominado('espejos', precisionGlobal);
      tocarSonido('fanfarria');
      vibrarSeguro([40, 50, 80]);
    }
  }, [modoReto, retoLogrado, precisionGlobal, onMarcarDominado, tocarSonido]);

  const cambiarLeftH = (v) => {
    setLeftH(v);
    if (simetrico) setRightH(v);
  };
  const cambiarRightH = (v) => {
    setRightH(v);
    if (simetrico) setLeftH(v);
  };

  const iniciarReto = () => {
    const r = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
    setSimetrico(false);
    setLeftH(Math.random() > 0.5 ? r(-14, 3) : r(36, 44));
    setRightH(Math.random() > 0.5 ? r(-14, 3) : r(36, 44));
    setVert(Math.random() > 0.5 ? r(-13, -7) : r(8, 13));
    setModoReto(true);
    setRetoLogrado(false);
    tocarSonido('radar');
    vibrarSeguro(25);
  };

  const aplicarPreset = (h, v) => {
    setSimetrico(true);
    setLeftH(h);
    setRightH(h);
    setVert(v);
    tocarSonido('switch');
  };

  // Geometría SVG Cenital (3 canales, Triángulo Invertido ▼ con vértice hacia abajo)
  const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
  const deg2rad = (d) => (d * Math.PI) / 180;
  const alcancePx = clamp(128 - Math.abs(vert) * 4.5, 65, 136);

  const lCenter = 90 + 18 + leftH * 0.9;
  const rCenter = 90 - 18 - rightH * 0.9;
  const lOut = {
    x: 162 + Math.cos(deg2rad(lCenter + 22)) * alcancePx,
    y: 44 + Math.sin(deg2rad(lCenter + 22)) * alcancePx,
  };
  const lIn = {
    x: 162 + Math.cos(deg2rad(lCenter - 22)) * alcancePx,
    y: 44 + Math.sin(deg2rad(lCenter - 22)) * alcancePx,
  };
  const rIn = {
    x: 188 + Math.cos(deg2rad(rCenter + 22)) * alcancePx,
    y: 44 + Math.sin(deg2rad(rCenter + 22)) * alcancePx,
  };
  const rOut = {
    x: 188 + Math.cos(deg2rad(rCenter - 22)) * alcancePx,
    y: 44 + Math.sin(deg2rad(rCenter - 22)) * alcancePx,
  };

  const blindL = clamp(46 - leftH * 1.0, 12, 60);
  const blindR = clamp(46 - rightH * 1.0, 12, 60);
  const rearGap = Math.max(0, (leftH + rightH) / 2 - 29);

  // Contorno del Triángulo Invertido ▼ (vértice apuntando hacia abajo/piloto y base abriéndose hacia atrás y los lados)
  const triLeftX = clamp(106 - leftH * 1.85, 34, 154);
  const triRightX = clamp(244 + rightH * 1.85, 196, 316);
  const triBottomY = clamp(176 - rearGap * 2.5, 125, 178);

  return (
    <div className="space-y-3 pb-4 animate-fadeIn">
      {/* Encabezado Compacto + Botón Reto */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-black text-white flex items-center gap-1.5">
            <span>Retrovisores · Triángulo ▼</span>
            {dominado && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          </h2>
          <p className="text-[11px] text-slate-400">
            Abre ambos espejos para cubrir atrás y canales laterales
          </p>
        </div>

        <button
          type="button"
          onClick={modoReto && !retoLogrado ? () => setModoReto(false) : iniciarReto}
          className={`min-h-[40px] px-3 rounded-xl text-[11px] font-extrabold flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer shrink-0 ${
            modoReto && !retoLogrado
              ? 'bg-slate-800 text-slate-200 border border-slate-700'
              : 'bg-[#F97316] hover:bg-orange-600 text-slate-950 shadow-sm'
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          <span>{modoReto && !retoLogrado ? 'Salir Reto' : 'Descalibrar'}</span>
        </button>
      </div>

      {/* Banner de estado del Reto */}
      {modoReto && (
        <div
          className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 animate-fadeIn ${
            retoLogrado
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
              : 'bg-orange-500/15 border-orange-500/40 text-orange-200'
          }`}
        >
          {retoLogrado ? (
            <Award className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <Sliders className="w-4 h-4 text-[#F97316] shrink-0" />
          )}
          <span>
            {retoLogrado
              ? `¡Calibración perfecta (${precisionGlobal}%)! Módulo 1 dominado.`
              : `Modo Reto activo: lleva ambos espejos a ≥ 90% de precisión óptica (Actual: ${precisionGlobal}%).`}
          </span>
        </div>
      )}

      {/* ZONA SUPERIOR VISUAL: 2 Espejos en Primera Persona */}
      <div className="grid grid-cols-2 gap-2.5">
        <RetrovisorSVGMini lado="izq" horiz={leftH} vert={vert} evalInfo={evalIzq} fase={fase} />
        <RetrovisorSVGMini lado="der" horiz={rightH} vert={vert} evalInfo={evalDer} fase={fase} />
      </div>

      {/* ZONA MEDIA VISUAL: Radar Cenital de 3 Canales + Triángulo Invertido ▼ */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2.5 space-y-2">
        <div className="flex items-center justify-between text-[10px] font-bold px-1">
          <span className="text-sky-300">Radar Cenital · 3 Canales</span>
          <div className="flex items-center gap-2">
            <span className="text-emerald-400">
              Atrás: {evalIzq.canalTraseroOk && evalDer.canalTraseroOk ? '✓' : '✕'}
            </span>
            <span className="text-sky-400">
              Lateral: {evalIzq.canalAdyacenteOk && evalDer.canalAdyacenteOk ? '✓' : '✕'}
            </span>
            <span className="text-yellow-400">
              ≥70m: {evalIzq.cumple70m && evalDer.cumple70m ? '✓' : '✕'}
            </span>
          </div>
        </div>

        <svg
          viewBox="0 0 350 192"
          className="w-full h-auto block rounded-xl bg-slate-950 border border-slate-800 select-none"
          role="img"
          aria-label="Radar cenital de retrovisores en triángulo invertido"
        >
          {/* 3 Canales */}
          <rect x="28" y="0" width="294" height="192" fill="#1E293B" />
          <line x1="30" y1="0" x2="30" y2="192" stroke="#CBD5E1" strokeWidth="2" />
          <line x1="320" y1="0" x2="320" y2="192" stroke="#CBD5E1" strokeWidth="2" />
          <line x1="126" y1="0" x2="126" y2="192" stroke="#F8FAFC" strokeWidth="1.6" strokeDasharray="10 10" />
          <line x1="224" y1="0" x2="224" y2="192" stroke="#F8FAFC" strokeWidth="1.6" strokeDasharray="10 10" />

          {/* Línea legal de alcance mínimo 70 metros */}
          <line x1="28" y1="152" x2="322" y2="152" stroke="#FACC15" strokeWidth="1.3" strokeDasharray="5 4" opacity="0.8" />
          <rect x="260" y="137" width="58" height="13" rx="4" fill="#0F172A" opacity="0.9" />
          <text x="289" y="146" textAnchor="middle" fill="#FACC15" fontSize="8" fontWeight="bold">
            70m LEY VE
          </text>

          {/* Conos de cobertura de ambos retrovisores */}
          <polygon
            points={`162,44 ${lOut.x},${lOut.y} ${lIn.x},${lIn.y}`}
            fill="#06B6D4"
            fillOpacity="0.28"
            stroke="#22D3EE"
            strokeWidth="1.2"
          />
          <polygon
            points={`188,44 ${rIn.x},${rIn.y} ${rOut.x},${rOut.y}`}
            fill="#2563EB"
            fillOpacity="0.30"
            stroke="#60A5FA"
            strokeWidth="1.2"
          />

          {/* Geometría del Triángulo Invertido ▼ */}
          {(!modoReto || retoLogrado) && (
            <g>
              <polygon
                points={`${triLeftX},54 ${triRightX},54 175,${triBottomY}`}
                fill="none"
                stroke="#38BDF8"
                strokeWidth="1.8"
                strokeDasharray="5 3"
              />
              <circle cx="175" cy={triBottomY} r="3.5" fill="#38BDF8" />
              <text x="175" y={Math.min(187, triBottomY + 12)} textAnchor="middle" fill="#7DD3FC" fontSize="8" fontWeight="bold">
                ▼ TRIÁNGULO INVERTIDO
              </text>
            </g>
          )}

          {/* Zonas rojas de punto ciego lateral */}
          <polygon
            points={`160,46 ${115 - blindL * 0.55},${54 + blindL * 0.45} ${124 - blindL * 0.3},${76 + blindL * 0.65} 160,72`}
            fill="#EF4444"
            fillOpacity="0.38"
            stroke="#F87171"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
          <polygon
            points={`190,46 ${235 + blindR * 0.55},${54 + blindR * 0.45} ${226 + blindR * 0.3},${76 + blindR * 0.65} 190,72`}
            fill="#EF4444"
            fillOpacity="0.38"
            stroke="#F87171"
            strokeWidth="1"
            strokeDasharray="3 3"
          />

          {/* Vehículos de referencia */}
          <rect x="64" y={92 + Math.cos(fase * 0.9) * 18} width="26" height="38" rx="6" fill="#38BDF8" />
          <rect x="266" y={96 + Math.cos(fase * 0.9 + 1.5) * 18} width="12" height="28" rx="4" fill="#F97316" />
          <rect x="162" y={136 + Math.sin(fase * 1.2) * 10} width="26" height="36" rx="6" fill="#CBD5E1" />

          {/* Moto del piloto en canal central */}
          <g transform="translate(175, 48)">
            <polygon points="-3,-18 -14,-44 14,-44 3,-18" fill="#FACC15" fillOpacity="0.22" />
            <rect x="-5.5" y="-14" width="11" height="28" rx="5" fill="#2563EB" />
            <line x1="-14" y1="-6" x2="14" y2="-6" stroke="#E2E8F0" strokeWidth="2.8" strokeLinecap="round" />
            <circle cx="0" cy="-1" r="5.5" fill="#F8FAFC" stroke="#1D4ED8" strokeWidth="1.5" />
          </g>
        </svg>
      </div>

      {/* ZONA DEL PULGAR (THUMB-ZONE): Sliders grandes + Simetría + Presets */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-white">Calibración</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-black tabular-nums ${
                precisionGlobal >= 90
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : precisionGlobal >= 65
                  ? 'bg-yellow-500/20 text-yellow-300'
                  : 'bg-red-500/20 text-red-300'
              }`}
            >
              {precisionGlobal}% Óptimo
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              const next = !simetrico;
              setSimetrico(next);
              if (next) setRightH(leftH);
              tocarSonido('switch');
            }}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border cursor-pointer active:scale-95 transition-all ${
              simetrico
                ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            Ajuste Simétrico: {simetrico ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Slider Izquierdo */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-bold text-slate-300">
            <span>{simetrico ? 'Apertura Horizontal (Ambos)' : 'Apertura Izquierdo'}</span>
            <span className="text-sky-400 tabular-nums">{leftH > 0 ? `+${leftH}°` : `${leftH}°`}</span>
          </div>
          <input
            type="range"
            min={-15}
            max={45}
            value={leftH}
            onChange={(e) => cambiarLeftH(Number(e.target.value))}
            aria-label="Apertura horizontal retrovisor izquierdo"
            className="w-full h-3 accent-[#2563EB] bg-slate-800 rounded-lg cursor-pointer touch-none"
          />
        </div>

        {/* Slider Derecho (visible cuando simétrico está OFF) */}
        {!simetrico && (
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] font-bold text-slate-300">
              <span>Apertura Derecho</span>
              <span className="text-sky-400 tabular-nums">{rightH > 0 ? `+${rightH}°` : `${rightH}°`}</span>
            </div>
            <input
              type="range"
              min={-15}
              max={45}
              value={rightH}
              onChange={(e) => cambiarRightH(Number(e.target.value))}
              aria-label="Apertura horizontal retrovisor derecho"
              className="w-full h-3 accent-[#2563EB] bg-slate-800 rounded-lg cursor-pointer touch-none"
            />
          </div>
        )}

        {/* Slider Vertical */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-bold text-slate-300">
            <span>Inclinación Vertical (Suelo ↔ Cielo)</span>
            <span className="text-sky-400 tabular-nums">{vert > 0 ? `+${vert}°` : `${vert}°`}</span>
          </div>
          <input
            type="range"
            min={-15}
            max={15}
            value={vert}
            onChange={(e) => setVert(Number(e.target.value))}
            aria-label="Inclinación vertical retrovisores"
            className="w-full h-3 accent-[#2563EB] bg-slate-800 rounded-lg cursor-pointer touch-none"
          />
        </div>

        {/* 3 Presets Comparativos (ocultos durante el reto activo) */}
        {(!modoReto || retoLogrado) && (
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => aplicarPreset(-10, -2)}
              className="min-h-[44px] px-2 rounded-xl bg-red-500/15 border border-red-500/35 text-red-300 text-[10px] font-extrabold active:scale-95 transition-transform cursor-pointer"
            >
              Solo Hombros
            </button>
            <button
              type="button"
              onClick={() => aplicarPreset(4, -5)}
              className="min-h-[44px] px-2 rounded-xl bg-yellow-500/15 border border-yellow-500/35 text-yellow-300 text-[10px] font-extrabold active:scale-95 transition-transform cursor-pointer"
            >
              Muy Cerrados
            </button>
            <button
              type="button"
              onClick={() => aplicarPreset(23, 0)}
              className="min-h-[44px] px-2 rounded-xl bg-emerald-500/20 border border-emerald-500/45 text-emerald-300 text-[10px] font-extrabold active:scale-95 transition-transform cursor-pointer"
            >
              Triángulo ▼ Óptimo
            </button>
          </div>
        )}
      </div>

      {/* Cajón colapsable de Base Legal y Técnica */}
      <CajonTeoria titulo="Base Técnica y Reglamento VE (Retrovisores)" badge="Art. 9.6 · 70m">
        <p>
          <strong className="text-white">Visión en Triángulo Invertido (▼):</strong> Si dejas solo un{' '}
          <strong className="text-emerald-400">10% a 15%</strong> de tu hombro en la esquina inferior
          interna de cada vidrio, ambos espejos se abren hacia afuera en triángulo invertido: cubres
          lo que viene atrás en tu canal y simultáneamente los canales adyacentes.
        </p>
        <p>
          <strong className="text-yellow-300">Marco Legal Venezolano:</strong> El{' '}
          <strong>Decreto N° 8.495 (Art. 9 num. 6)</strong> exige portar obligatoriamente{' '}
          <strong>dos (2) espejos retrovisores</strong> (izquierdo y derecho), y el{' '}
          <strong>Reglamento de la Ley de Tránsito Terrestre</strong> exige una visibilidad clara de
          al menos <strong>70 metros</strong> hacia la retaguardia.
        </p>
        <p className="text-orange-300 font-semibold">
          Recordatorio vital: Ningún retrovisor elimina el 100% del punto ciego lateral; siempre
          complétalo con el Chequeo Físico sobre el hombro (Paso 4).
        </p>
      </CajonTeoria>
    </div>
  );
}

/* ============================================================================
 * 5. MÓDULO 2: REGLAMENTO DE LUCES EN VENEZUELA (POSICIONAMIENTO Y COMUNICACIÓN)
 * ============================================================================ */
const ENTORNOS_LUCES = [
  { id: 'dia', label: 'Día Soleado', cielo: '#0284C7', horizonte: '#7DD3FC', nocturno: false },
  { id: 'noche_urbana', label: 'Noche Iluminada', cielo: '#0F172A', horizonte: '#334155', nocturno: true },
  { id: 'carretera_oscura', label: 'Carretera Oscura', cielo: '#020617', horizonte: '#0F172A', nocturno: true },
  { id: 'orillado', label: 'Orillado Falla/Salud', cielo: '#1E293B', horizonte: '#475569', nocturno: false },
  { id: 'cola_repentina', label: 'Cola Repentina / Derrame', cielo: '#1E293B', horizonte: '#64748B', nocturno: false },
];

const CASOS_RETO_LUCES = [
  {
    id: 'l1',
    entorno: 'dia',
    titulo: 'Caso 1 · Mediodía en la Autopista Francisco Fajardo',
    situacion:
      'Circulas a mediodía con sol fuerte por la autopista. Configura tu iluminación según el Reglamento VE y el protocolo de posicionamiento diurno.',
    evaluar: (s) => s.faroOn && s.luzAlta && !s.estacionarias,
    trampaEstacionarias: true,
    explicacion:
      'El Art. 28 num. 14 y Art. 30 num. 14 del Decreto N° 8.495 obligan a circular SIEMPRE con luces encendidas. De día usamos Luz Alta para posicionarnos en los retrovisores de los carros y combatir la ceguera por inatención (nunca con estacionarias rodando normal).',
  },
  {
    id: 'l2',
    entorno: 'noche_urbana',
    titulo: 'Caso 2 · 9:00 PM en avenida iluminada de Caracas',
    situacion:
      'Conduces de noche por una avenida urbana con buen alumbrado público y carros circulando de frente y adelante.',
    evaluar: (s) => s.faroOn && !s.luzAlta && !s.estacionarias,
    trampaEstacionarias: true,
    explicacion:
      'De noche con buena iluminación urbana o tráfico delante/de frente debes usar Luz Baja (50 m) para no encandilar a otros conductores, manteniendo tu piloto trasero encendido (visible a 100 m).',
  },
  {
    id: 'l3',
    entorno: 'carretera_oscura',
    titulo: 'Caso 3 · Carretera nacional oscura sin tráfico de frente',
    situacion:
      'Viajas de noche por una troncal completamente oscura, sin alumbrado público y sin vehículos aproximándose de frente.',
    evaluar: (s) => s.faroOn && s.luzAlta && !s.estacionarias,
    trampaEstacionarias: true,
    explicacion:
      'En vías oscuras sin vehículos de frente se utiliza la Luz Alta (alcance mínimo reglamentario de 150 m, Art. 9 num. 2 Decreto N° 8.495) para anticipar baches, curvas o animales.',
  },
  {
    id: 'l4',
    entorno: 'dia',
    titulo: 'Caso 4 · Semáforo en rojo adelante',
    situacion:
      'Circulas de día y comienzas a disminuir suavemente la marcha al aproximarte a un semáforo en rojo. ¿Cómo comunicas tu frenada?',
    evaluar: (s) => s.faroOn && s.stopOn && !s.estacionarias,
    trampaEstacionarias: true,
    explicacion:
      'La luz trasera tiene doble función: su intensidad baja posiciona tu moto y la intensidad alta (STOP) comunica a quien viene atrás que estás reduciendo la marcha o deteniéndote (Art. 273 Reglamento).',
  },
  {
    id: 'l5',
    entorno: 'orillado',
    titulo: 'Caso 5 · Desperfecto mecánico / malestar de salud',
    situacion:
      'Sientes una falla mecánica o un malestar físico que te obliga a detenerte. Te orillas en el hombrillo lejos de la calzada. ¿Qué luz activas?',
    evaluar: (s) => s.estacionarias,
    trampaEstacionarias: false,
    explicacion:
      'Uso estrictamente legal de las luces estacionarias: desperfecto mecánico o problema de salud que obligue a detenerse, siempre orillándose fuera de la calzada en un punto visible en ambas direcciones (Art. 32 num. 6 y 8 Decreto N° 8.495).',
  },
  {
    id: 'l6',
    entorno: 'cola_repentina',
    titulo: 'Caso 6 · Cola repentina y derrame de gasoil adelante',
    situacion:
      'Al salir de una curva te encuentras con derramamiento de gasoil, trabajadores en la vía y una cola repentina que te obliga a disminuir bruscamente la marcha.',
    evaluar: (s) => s.faroOn && s.stopOn && s.estacionarias,
    trampaEstacionarias: false,
    explicacion:
      '¡Exacto! Cuando ocurre una incidencia grave adelante (derrame de líquido, accidente, trabajadores o cola repentina que obliga a frenar bruscamente), combinas Freno (STOP) + Estacionarias para advertir el peligro inminente a quienes vienen detrás.',
  },
];

function ModuloLucesVE({ tocarSonido, dominado, onMarcarDominado }) {
  const [subModo, setSubModo] = useState('lab'); // 'lab' | 'reto'
  const [entornoId, setEntornoId] = useState('dia');
  const [faroOn, setFaroOn] = useState(true);
  const [luzAlta, setLuzAlta] = useState(true);
  const [stopOn, setStopOn] = useState(false);
  const [dir, setDir] = useState(null); // null | 'izq' | 'der'
  const [estacionarias, setEstacionarias] = useState(false);
  const [parpadeo, setParpadeo] = useState(true);

  // Estado del Reto de 6 Casos
  const [casoIdx, setCasoIdx] = useState(0);
  const [aciertos, setAciertos] = useState(0);
  const [feedbackCaso, setFeedbackCaso] = useState(null);
  const [retoTerminado, setRetoTerminado] = useState(false);

  // Relé de parpadeo visual y sonoro para direccionales o estacionarias
  useEffect(() => {
    if (!dir && !estacionarias) {
      setParpadeo(false);
      return undefined;
    }
    setParpadeo(true);
    let on = true;
    const id = setInterval(() => {
      on = !on;
      setParpadeo(on);
      tocarSonido(on ? 'tic' : 'tac');
    }, 450);
    return () => clearInterval(id);
  }, [dir, estacionarias, tocarSonido]);

  const entornoActivoId = subModo === 'reto' ? CASOS_RETO_LUCES[casoIdx].entorno : entornoId;
  const entorno = ENTORNOS_LUCES.find((e) => e.id === entornoActivoId) || ENTORNOS_LUCES[0];
  const casoActual = CASOS_RETO_LUCES[casoIdx];

  const toggleFaro = () => {
    setFaroOn((v) => !v);
    tocarSonido('switch');
  };
  const toggleHaz = () => {
    if (!faroOn) setFaroOn(true);
    setLuzAlta((v) => !v);
    tocarSonido('switch');
  };
  const toggleDir = (lado) => {
    setEstacionarias(false);
    setDir((prev) => (prev === lado ? null : lado));
    tocarSonido('switch');
  };
  const toggleEstacionarias = () => {
    setDir(null);
    setEstacionarias((v) => !v);
    tocarSonido('switch');
  };

  const iniciarReto = () => {
    setSubModo('reto');
    setCasoIdx(0);
    setAciertos(0);
    setFeedbackCaso(null);
    setRetoTerminado(false);
    setFaroOn(false);
    setLuzAlta(false);
    setStopOn(false);
    setDir(null);
    setEstacionarias(false);
  };

  const validarCaso = () => {
    if (feedbackCaso) return;
    const estadoLuces = { faroOn, luzAlta, stopOn, dir, estacionarias };
    const ok = casoActual.evaluar(estadoLuces);
    const usoIndebidoEstacionaria = casoActual.trampaEstacionarias && estacionarias;

    if (ok) {
      setAciertos((a) => a + 1);
      tocarSonido('ok');
      vibrarSeguro(35);
    } else {
      tocarSonido('error');
      vibrarSeguro([50, 40, 50]);
    }

    setFeedbackCaso({
      ok,
      trampaEstacionaria: usoIndebidoEstacionaria,
      texto: casoActual.explicacion,
    });
  };

  const siguienteCaso = () => {
    if (casoIdx < CASOS_RETO_LUCES.length - 1) {
      setCasoIdx((i) => i + 1);
      setFeedbackCaso(null);
      setFaroOn(true);
      setLuzAlta(false);
      setStopOn(false);
      setDir(null);
      setEstacionarias(false);
    } else {
      setRetoTerminado(true);
      if (aciertos >= 5) {
        onMarcarDominado('luces', Math.round((aciertos / 6) * 100));
        tocarSonido('fanfarria');
      }
    }
  };

  // Diagnóstico en tiempo real en modo Laboratorio
  const estadoLabTexto = useMemo(() => {
    if (!faroOn && entornoId !== 'orillado') {
      return {
        tipo: 'error',
        msg: 'Infracción Art. 28.14: La luz delantera y trasera deben ir SIEMPRE encendidas al rodar (no daña la batería).',
      };
    }
    if (estacionarias && (entornoId === 'dia' || entornoId === 'noche_urbana' || entornoId === 'carretera_oscura')) {
      return {
        tipo: 'error',
        msg: 'Mal uso de estacionarias: En circulación normal anulan tus luces de cruce. Úsalas solo por falla, salud o incidencia súbita adelante.',
      };
    }
    if (entornoId === 'dia' && faroOn && luzAlta) {
      return {
        tipo: 'ok',
        msg: 'Excelente posicionamiento diurno: Luz Alta visible en retrovisores a distancia (usa baja con LED aftermarket mal regulado o túneles).',
      };
    }
    if (entornoId === 'noche_urbana' && faroOn && luzAlta) {
      return {
        tipo: 'warn',
        msg: 'En vía iluminada de noche con tráfico cambia a Luz Baja (50 m) para no encandilar de frente ni por retrovisor.',
      };
    }
    if (entornoId === 'cola_repentina' && stopOn && estacionarias) {
      return {
        tipo: 'ok',
        msg: 'Comunicación perfecta ante incidencia súbita: STOP intenso + Estacionarias advierten el frenado brusco.',
      };
    }
    if (entornoId === 'orillado' && estacionarias) {
      return {
        tipo: 'ok',
        msg: 'Correcto: Detenido en el hombrillo por falla o salud con estacionarias encendidas y moto visible en ambos sentidos.',
      };
    }
    return {
      tipo: 'info',
      msg: stopOn
        ? 'Luz trasera en intensidad ALTA (STOP): estás comunicando disminución de marcha o detención.'
        : dir
        ? `Luz de cruce ${dir === 'izq' ? 'IZQUIERDA' : 'DERECHA'} activa: comunicando tu próxima maniobra.`
        : 'Posicionamiento activo: faro delantero + luz roja trasera tenue (visible a ≥ 100 m).',
    };
  }, [faroOn, luzAlta, stopOn, dir, estacionarias, entornoId]);

  const izqBlink = parpadeo && (dir === 'izq' || estacionarias);
  const derBlink = parpadeo && (dir === 'der' || estacionarias);

  return (
    <div className="space-y-3 pb-4 animate-fadeIn">
      {/* Selector Laboratorio vs Reto 6 Casos VE */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <h2 className="text-sm font-black text-white truncate">Luces VE · Posición y Comunicación</h2>
          {dominado && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
        </div>

        <div className="inline-flex bg-slate-900 p-0.5 rounded-xl border border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => setSubModo('lab')}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold cursor-pointer transition-colors ${
              subModo === 'lab' ? 'bg-[#2563EB] text-white' : 'text-slate-400'
            }`}
          >
            Laboratorio
          </button>
          <button
            type="button"
            onClick={iniciarReto}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold cursor-pointer transition-colors ${
              subModo === 'reto' ? 'bg-[#F97316] text-slate-950' : 'text-slate-400'
            }`}
          >
            Reto (6)
          </button>
        </div>
      </div>

      {/* Selector de Entorno (solo en Laboratorio) */}
      {subModo === 'lab' && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {ENTORNOS_LUCES.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => {
                setEntornoId(e.id);
                tocarSonido('switch');
              }}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border whitespace-nowrap cursor-pointer transition-all shrink-0 ${
                entornoId === e.id
                  ? 'bg-[#2563EB] border-blue-400 text-white'
                  : 'bg-slate-900 border-slate-800 text-slate-300'
              }`}
            >
              {e.label}
            </button>
          ))}
        </div>
      )}

      {/* Consigna del Reto (si está en modo Reto y no ha terminado) */}
      {subModo === 'reto' && !retoTerminado && (
        <div className="bg-slate-900 border border-orange-500/40 rounded-2xl p-3 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider">
            <span className="text-[#F97316]">{casoActual.titulo}</span>
            <span className="text-slate-400">
              {casoIdx + 1}/6 · {aciertos} ✓
            </span>
          </div>
          <p className="text-xs text-slate-200 leading-snug">{casoActual.situacion}</p>
        </div>
      )}

      {/* Pantalla Final del Reto de 6 Casos */}
      {subModo === 'reto' && retoTerminado ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-center space-y-4 animate-fadeIn">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto ${
              aciertos >= 5 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400'
            }`}
          >
            <Award className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-black text-white">
              Resultado: {aciertos} de 6 Casos Correctos
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              {aciertos >= 5
                ? '¡Módulo 2 Dominado! Comprendes cuándo posicionarte con el faro y cómo comunicar maniobras y emergencias según el Reglamento VE.'
                : 'Necesitas al menos 5/6 para dominar este módulo. Repasa la diferencia entre posicionamiento, STOP y uso estricto de estacionarias.'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSubModo('lab')}
              className="min-h-[48px] rounded-xl bg-slate-800 text-slate-200 text-xs font-extrabold cursor-pointer"
            >
              Volver a Lab
            </button>
            <button
              type="button"
              onClick={iniciarReto}
              className="min-h-[48px] rounded-xl bg-[#2563EB] text-white text-xs font-extrabold cursor-pointer"
            >
              Repetir Reto
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* ZONA SUPERIOR VISUAL: VISTA DUAL FRENTE + COLA DE LA MOTO */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Tarjeta 1: VISTA FRONTAL (POSICIONAMIENTO) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-extrabold px-0.5">
                <span className="text-blue-300">FRENTE · Posición</span>
                <span className={faroOn ? 'text-yellow-300' : 'text-red-400'}>
                  {!faroOn ? 'APAGADO' : luzAlta ? 'ALTA 150m' : 'BAJA 50m'}
                </span>
              </div>

              <svg
                viewBox="0 0 180 148"
                className="w-full h-auto block rounded-xl overflow-hidden select-none"
                role="img"
                aria-label="Vista frontal de la motocicleta y haz del faro"
              >
                <defs>
                  <linearGradient id="cieloF" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={entorno.cielo} />
                    <stop offset="100%" stopColor={entorno.horizonte} />
                  </linearGradient>
                  <radialGradient id="beamGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor={luzAlta ? '#FFFFFF' : '#FEF08A'} stopOpacity={luzAlta ? '0.95' : '0.7'} />
                    <stop offset="100%" stopColor="#FACC15" stopOpacity="0" />
                  </radialGradient>
                </defs>

                {/* Fondo cielo y asfalto */}
                <rect x="0" y="0" width="180" height="62" fill="url(#cieloF)" />
                <rect x="0" y="62" width="180" height="86" fill="#1E293B" />

                {/* Mini espejo retrovisor del carro delantero mostrando cómo nos ve */}
                <g transform="translate(8, 6)">
                  <rect x="0" y="0" width="70" height="24" rx="6" fill="#0F172A" stroke="#64748B" strokeWidth="1.2" />
                  <text x="35" y="9" textAnchor="middle" fill="#94A3B8" fontSize="6" fontWeight="bold">
                    ESPEJO CARRO
                  </text>
                  <circle
                    cx="35"
                    cy="17"
                    r={faroOn ? (luzAlta ? 5 : 3.2) : 2}
                    fill={faroOn ? (luzAlta ? '#FFFFFF' : '#FACC15') : '#334155'}
                  />
                </g>

                {/* Haz de luz proyectado */}
                {faroOn && (
                  <polygon
                    points={luzAlta ? '78,86 102,86 158,148 22,148' : '80,86 100,86 130,148 50,148'}
                    fill={luzAlta ? '#FEF08A' : '#FDE047'}
                    fillOpacity={luzAlta ? 0.36 : 0.22}
                  />
                )}

                {/* Silueta frontal de moto */}
                <rect x="78" y="102" width="24" height="38" rx="10" fill="#020617" />
                <line x1="48" y1="68" x2="132" y2="68" stroke="#94A3B8" strokeWidth="4.5" strokeLinecap="round" />
                <rect x="44" y="46" width="18" height="10" rx="3" fill="#0F172A" stroke="#64748B" />
                <rect x="118" y="46" width="18" height="10" rx="3" fill="#0F172A" stroke="#64748B" />
                <path d="M 68 72 L 112 72 L 106 106 L 74 106 Z" fill="#1D4ED8" />

                {/* Direccionales delanteras */}
                <rect
                  x="52"
                  y="78"
                  width="14"
                  height="8"
                  rx="4"
                  fill={izqBlink ? '#FACC15' : '#451A03'}
                  stroke="#F59E0B"
                  strokeWidth="1"
                />
                <rect
                  x="114"
                  y="78"
                  width="14"
                  height="8"
                  rx="4"
                  fill={derBlink ? '#FACC15' : '#451A03'}
                  stroke="#F59E0B"
                  strokeWidth="1"
                />

                {/* Faro delantero */}
                {faroOn && <circle cx="90" cy="86" r={luzAlta ? 28 : 18} fill="url(#beamGlow)" />}
                <circle
                  cx="90"
                  cy="86"
                  r="12"
                  fill={faroOn ? (luzAlta ? '#FFFFFF' : '#FEF08A') : '#1E293B'}
                  stroke="#CBD5E1"
                  strokeWidth="2"
                />
              </svg>
            </div>

            {/* Tarjeta 2: VISTA TRASERA (POSICIONAMIENTO + COMUNICACIÓN STOP/CRUCE) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-extrabold px-0.5">
                <span className="text-orange-300">COLA · Comunica</span>
                <span className={stopOn ? 'text-red-400 animate-pulse' : faroOn ? 'text-rose-300' : 'text-slate-500'}>
                  {stopOn ? 'STOP ALTO!' : faroOn ? 'POS. 100m' : 'APAGADA'}
                </span>
              </div>

              <svg
                viewBox="0 0 180 148"
                className="w-full h-auto block rounded-xl overflow-hidden select-none"
                role="img"
                aria-label="Vista trasera mostrando luz de posicionamiento, stop e intermitentes"
              >
                <defs>
                  <radialGradient id="stopAura" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#EF4444" stopOpacity="0.95" />
                    <stop offset="100%" stopColor="#EF4444" stopOpacity="0" />
                  </radialGradient>
                </defs>

                <rect x="0" y="0" width="180" height="62" fill="url(#cieloF)" />
                <rect x="0" y="62" width="180" height="86" fill="#1E293B" />

                {/* Aviso de entorno en cola repentina */}
                {entornoActivoId === 'cola_repentina' && (
                  <g>
                    <rect x="24" y="6" width="132" height="16" rx="5" fill="#DC2626" />
                    <text x="90" y="17" textAnchor="middle" fill="#FFF" fontSize="7.5" fontWeight="bold">
                      ⚠ COLA REPENTINA / GASOIL
                    </text>
                  </g>
                )}

                {/* Caucho trasero y colín */}
                <rect x="70" y="96" width="40" height="46" rx="12" fill="#020617" />
                <path d="M 60 66 Q 90 54 120 66 L 114 96 L 66 96 Z" fill="#1D4ED8" />
                <rect x="72" y="94" width="36" height="22" rx="3" fill="#F8FAFC" stroke="#475569" strokeWidth="1.2" />
                <text x="90" y="108" textAnchor="middle" fill="#0F172A" fontSize="7.5" fontWeight="900">
                  AA1B23
                </text>

                {/* Aura intensa si STOP está activado */}
                {stopOn && <circle cx="90" cy="78" r="34" fill="url(#stopAura)" />}

                {/* Luz Trasera Roja (Tenue = Posición / Intensa = STOP) */}
                <rect
                  x="68"
                  y="71"
                  width="44"
                  height="15"
                  rx="6"
                  fill={stopOn ? '#FF1F1F' : faroOn ? '#991B1B' : '#27272A'}
                  stroke={stopOn ? '#FCA5A5' : '#7F1D1D'}
                  strokeWidth="2"
                />
                {stopOn && <rect x="74" y="75" width="32" height="7" rx="3" fill="#FECACA" />}

                {/* Intermitentes Traseros (Doble Rol: Cruce o Estacionarias) */}
                {izqBlink && <circle cx="52" cy="84" r="14" fill="#FACC15" fillOpacity="0.35" />}
                {derBlink && <circle cx="128" cy="84" r="14" fill="#FACC15" fillOpacity="0.35" />}
                <rect
                  x="44"
                  y="79"
                  width="16"
                  height="10"
                  rx="4"
                  fill={izqBlink ? '#FACC15' : '#451A03'}
                  stroke="#F59E0B"
                  strokeWidth="1.2"
                />
                <rect
                  x="120"
                  y="79"
                  width="16"
                  height="10"
                  rx="4"
                  fill={derBlink ? '#FACC15' : '#451A03'}
                  stroke="#F59E0B"
                  strokeWidth="1.2"
                />

                {/* Badge del rol activo */}
                <rect x="34" y="128" width="112" height="15" rx="5" fill="#0F172A" opacity="0.92" />
                <text x="90" y="138.5" textAnchor="middle" fill="#FDE047" fontSize="7.5" fontWeight="bold">
                  {estacionarias
                    ? 'ESTACIONARIAS (EMERG.)'
                    : dir
                    ? `LUZ DE CRUCE (${dir.toUpperCase()})`
                    : stopOn
                    ? 'COMUNICANDO FRENADO'
                    : 'POSICIONAMIENTO'}
                </text>
              </svg>
            </div>
          </div>

          {/* Feedback en vivo (Lab) o Resultado de validación (Reto) */}
          {subModo === 'lab' ? (
            <div
              className={`p-3 rounded-xl border text-xs font-semibold leading-snug ${
                estadoLabTexto.tipo === 'error'
                  ? 'bg-red-500/15 border-red-500/40 text-red-200'
                  : estadoLabTexto.tipo === 'warn'
                  ? 'bg-yellow-500/15 border-yellow-500/40 text-yellow-200'
                  : estadoLabTexto.tipo === 'ok'
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                  : 'bg-slate-900 border-slate-800 text-slate-300'
              }`}
            >
              {estadoLabTexto.msg}
            </div>
          ) : (
            feedbackCaso && (
              <div
                className={`p-3 rounded-xl border space-y-2 animate-fadeIn ${
                  feedbackCaso.ok
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-100'
                    : 'bg-red-500/15 border-red-500/40 text-red-100'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-black">
                  {feedbackCaso.ok ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400" />
                  )}
                  <span>
                    {feedbackCaso.ok
                      ? '¡Configuración reglamentaria exacta!'
                      : feedbackCaso.trampaEstacionaria
                      ? 'Error grave: Estacionarias en circulación normal'
                      : 'Configuración incompleta o incorrecta'}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed opacity-95">{feedbackCaso.texto}</p>
                <button
                  type="button"
                  onClick={siguienteCaso}
                  className="w-full min-h-[44px] rounded-xl bg-white text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-transform cursor-pointer"
                >
                  <span>{casoIdx < 5 ? 'Siguiente Caso VE' : 'Ver Resultado Final'}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )
          )}

          {/* ZONA DEL PULGAR: PIÑA DE MANDOS TÁCTIL 3x2 */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-2.5">
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={toggleFaro}
                className={`min-h-[54px] px-2 rounded-xl border-2 text-[11px] font-extrabold flex flex-col items-center justify-center gap-0.5 touch-none select-none active:scale-95 transition-all cursor-pointer ${
                  faroOn
                    ? 'bg-[#2563EB] border-blue-400 text-white'
                    : 'bg-slate-950 border-slate-700 text-slate-400'
                }`}
              >
                {faroOn ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                <span>Faro: {faroOn ? 'ON' : 'OFF'}</span>
              </button>

              <button
                type="button"
                onClick={toggleHaz}
                className={`min-h-[54px] px-2 rounded-xl border-2 text-[11px] font-extrabold flex flex-col items-center justify-center gap-0.5 touch-none select-none active:scale-95 transition-all cursor-pointer ${
                  faroOn && luzAlta
                    ? 'bg-blue-500/25 border-blue-400 text-blue-200'
                    : 'bg-slate-950 border-slate-700 text-slate-300'
                }`}
              >
                <Zap className="w-4 h-4 text-yellow-400" />
                <span>Haz: {luzAlta ? 'ALTA' : 'BAJA'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStopOn((v) => !v);
                  tocarSonido('switch');
                }}
                className={`min-h-[54px] px-2 rounded-xl border-2 text-[11px] font-extrabold flex flex-col items-center justify-center gap-0.5 touch-none select-none active:scale-95 transition-all cursor-pointer ${
                  stopOn
                    ? 'bg-[#EF4444] border-red-300 text-white shadow-[0_0_12px_rgba(239,68,68,0.5)]'
                    : 'bg-slate-950 border-slate-700 text-slate-300'
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Freno (STOP)</span>
              </button>

              <button
                type="button"
                onClick={() => toggleDir('izq')}
                className={`min-h-[54px] px-2 rounded-xl border-2 text-[11px] font-extrabold flex flex-col items-center justify-center gap-0.5 touch-none select-none active:scale-95 transition-all cursor-pointer ${
                  dir === 'izq'
                    ? 'bg-emerald-600 border-emerald-300 text-white'
                    : 'bg-slate-950 border-slate-700 text-slate-300'
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Dir. Izq</span>
              </button>

              <button
                type="button"
                onClick={() => toggleDir('der')}
                className={`min-h-[54px] px-2 rounded-xl border-2 text-[11px] font-extrabold flex flex-col items-center justify-center gap-0.5 touch-none select-none active:scale-95 transition-all cursor-pointer ${
                  dir === 'der'
                    ? 'bg-emerald-600 border-emerald-300 text-white'
                    : 'bg-slate-950 border-slate-700 text-slate-300'
                }`}
              >
                <ArrowRight className="w-4 h-4" />
                <span>Dir. Der</span>
              </button>

              <button
                type="button"
                onClick={toggleEstacionarias}
                className={`min-h-[54px] px-2 rounded-xl border-2 text-[11px] font-extrabold flex flex-col items-center justify-center gap-0.5 touch-none select-none active:scale-95 transition-all cursor-pointer ${
                  estacionarias
                    ? 'bg-[#F97316] border-yellow-300 text-slate-950'
                    : 'bg-slate-950 border-slate-700 text-orange-300'
                }`}
              >
                <span className="text-sm leading-none">▲</span>
                <span>Estacionaria</span>
              </button>
            </div>

            {subModo === 'reto' && !feedbackCaso && (
              <button
                type="button"
                onClick={validarCaso}
                className="w-full min-h-[48px] rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-black text-xs sm:text-sm active:scale-95 transition-transform cursor-pointer"
              >
                Confirmar Luces del Caso {casoIdx + 1}
              </button>
            )}
          </div>
        </>
      )}

      {/* Cajón colapsable con las reglas completas de luces VE */}
      <CajonTeoria titulo="Reglamento de Luces VE (Posicionamiento vs. Comunicación)" badge="Dec. 8.495">
        <p>
          <strong className="text-blue-300">1. Posicionamiento (Para que nos vean):</strong> Faro
          delantero y luz trasera SIEMPRE encendidos al circular (<strong>Art. 28.14 y 30.14</strong>
          , G.O. 39.772). De día usar <strong>Luz Alta</strong> para destacar en los retrovisores
          ajenos (usar baja si llevas LED aftermarket mal regulado o al entrar a túneles/lluvia
          densa). De noche con alumbrado urbano o tráfico usar <strong>Luz Baja (50 m)</strong> y
          reservar <strong>Luz Alta (150 m, Art. 9.2)</strong> para vías oscuras sin vehículos de
          frente. La luz trasera tenue posiciona a ≥ 100 m (Art. 9.4).
        </p>
        <p>
          <strong className="text-orange-300">2. Comunicación (Para avisar):</strong> La luz trasera
          en intensidad alta (<strong>STOP</strong>) avisa frenado o detención (Art. 273 Reglamento).
          Las <strong>luces de cruce (direccionales)</strong> comunican giros, cambios de canal y
          adelantamientos (Art. 32.4 y 32.7; Art. 271.4 y 271.6).
        </p>
        <p>
          <strong className="text-red-300">3. Uso ESTRICTO de Luz Estacionaria (▲):</strong> Solo si
          existe un <strong>desperfecto mecánico</strong> o <strong>problema de salud</strong> que te
          obligue a detenerte (orillado fuera de la calzada, visible en ambos sentidos — Art. 32.6 y
          32.8), o ante una <strong>incidencia adelante</strong> (derramamiento de líquido/gasoil,
          accidente, trabajadores en la vía o cola repentina que obligue a frenar bruscamente).{' '}
          <strong>NUNCA</strong> para circular normal, filtrar entre canales ni bajo lluvia rutinaria.
        </p>
      </CajonTeoria>
    </div>
  );
}

/* ============================================================================
 * 6. MÓDULO 3: CONDUCCIÓN OMNIDIRECCIONAL + CÍRCULO DE SEGURIDAD (2m) — CANVAS 60FPS
 * ============================================================================ */
const SECTORES_OMNI = [
  { id: 0, label: 'Frente', hora: '12h', angleDeg: -90 },
  { id: 1, label: 'Lat. Der', hora: '3h', angleDeg: -25 },
  { id: 2, label: 'Esp. Der', hora: '5h', angleDeg: 35 },
  { id: 3, label: 'Atrás', hora: '6h', angleDeg: 90 },
  { id: 4, label: 'Esp. Izq', hora: '7h', angleDeg: 145 },
  { id: 5, label: 'Lat. Izq', hora: '9h', angleDeg: 205 },
];

function ModuloCirculoOmnidireccional({ tocarSonido, dominado, onMarcarDominado }) {
  const canvasRef = useRef(null);
  const contRef = useRef(null);
  const rafRef = useRef(null);
  const lastRef = useRef(0);

  const [estado, setEstado] = useState('listo'); // 'listo' | 'corriendo' | 'finalizado'
  const [hud, setHud] = useState({
    tiempo: 45,
    velocidad: 62,
    integridad: 100,
    paralelismosRotos: 0,
    barridos: 0,
    alertasDetectadas: 0,
    invadido: false,
    frenteOcupado: false,
    aviso: null,
  });
  const [reporte, setReporte] = useState(null);

  const simRef = useRef({
    running: false,
    timeLeft: 45,
    scroll: 0,
    speed: 62, // km/h
    accelHeld: false,
    brakeHeld: false,
    // Vehículo lateral intentando ponerse en paralelo
    sideCar: {
      active: true,
      lane: 0, // 0=Izq, 2=Der
      tipo: 'auto', // 'auto' | 'gandola'
      yOffset: -190, // relativo a motoY (0 = exactamente paralelo!)
      state: 'approaching', // 'approaching' | 'matching' | 'escaped'
      wasParallel: false,
      parallelTimer: 0,
    },
    // Vehículo frontal ocasional para probar que NO se debe acelerar si el frente está ocupado
    frontCar: {
      active: false,
      yOffset: -240,
      cooldown: 6,
    },
    // Anillo omnidireccional de 6 sectores
    sectorFresh: [100, 100, 100, 100, 100, 100],
    sweepIdx: 0,
    sweepFlash: 0,
    activeAlertSector: -1,
    alertTimeout: 0,
    nextAlertIn: 3.5,
    // Métricas
    totalTime: 0,
    invadedTime: 0,
    paralelismosRotos: 0,
    barridosCount: 0,
    alertasDetectadas: 0,
    avisoTexto: null,
    avisoTimer: 0,
    alertSoundCd: 0,
    hudAcc: 0,
  });

  const spawnearLateral = (s) => {
    const lado = Math.random() > 0.5 ? 0 : 2;
    const esGandola = Math.random() > 0.65;
    s.sideCar = {
      active: true,
      lane: lado,
      tipo: esGandola ? 'gandola' : 'auto',
      yOffset: Math.random() > 0.5 ? -210 : 185,
      state: 'approaching',
      wasParallel: false,
      parallelTimer: 0,
    };
  };

  const iniciarSesion = useCallback(() => {
    const s = simRef.current;
    s.running = true;
    s.timeLeft = 45;
    s.scroll = 0;
    s.speed = 62;
    s.accelHeld = false;
    s.brakeHeld = false;
    spawnearLateral(s);
    s.frontCar = { active: false, yOffset: -240, cooldown: 5.5 };
    s.sectorFresh = [100, 100, 100, 100, 100, 100];
    s.sweepIdx = 0;
    s.sweepFlash = 0;
    s.activeAlertSector = -1;
    s.alertTimeout = 0;
    s.nextAlertIn = 3.2;
    s.totalTime = 0;
    s.invadedTime = 0;
    s.paralelismosRotos = 0;
    s.barridosCount = 0;
    s.alertasDetectadas = 0;
    s.avisoTexto = '¡Protege tu círculo de 2m! Acelera o desacelera para no rodar en paralelo.';
    s.avisoTimer = 3.0;
    s.alertSoundCd = 0;
    s.hudAcc = 0;
    setReporte(null);
    setEstado('corriendo');
    lastRef.current = performance.now();
    tocarSonido('radar');
  }, [tocarSonido]);

  // Ejecutar barrido circular 360° (botón o toque directo en el canvas)
  const ejecutarBarrido = useCallback(
    (sectorEspecifico = null) => {
      const s = simRef.current;
      if (!s.running) return;
      const target = sectorEspecifico !== null ? sectorEspecifico : (s.sweepIdx + 1) % 6;
      s.sweepIdx = target;
      s.sweepFlash = 0.55;
      // Refresca el sector objetivo y ligeramente los adyacentes (barrido fluido)
      s.sectorFresh[target] = 100;
      s.sectorFresh[(target + 1) % 6] = Math.min(100, s.sectorFresh[(target + 1) % 6] + 45);
      s.sectorFresh[(target + 5) % 6] = Math.min(100, s.sectorFresh[(target + 5) % 6] + 25);
      s.barridosCount += 1;

      if (s.activeAlertSector !== -1 && (sectorEspecifico === null || sectorEspecifico === s.activeAlertSector)) {
        const hora = SECTORES_OMNI[s.activeAlertSector].hora;
        s.activeAlertSector = -1;
        s.alertasDetectadas += 1;
        s.avisoTexto = `✓ Alerta detectada en barrido 360° (${hora})`;
        s.avisoTimer = 1.8;
        tocarSonido('ok');
        vibrarSeguro(25);
      } else {
        tocarSonido('radar');
      }
    },
    [tocarSonido]
  );

  // Toque directo sobre el canvas para tocar alertas perimetrales
  const onTapCanvas = (e) => {
    const s = simRef.current;
    if (!s.running) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height * 0.57;
    const x = e.clientX - rect.left - cx;
    const y = e.clientY - rect.top - cy;
    let deg = (Math.atan2(y, x) * 180) / Math.PI;
    let norm = (deg + 120 + 360) % 360;
    const secId = Math.floor(norm / 60) % 6;
    ejecutarBarrido(secId);
  };

  // Ajuste de resolución Retina del Canvas
  const ajustarCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const cont = contRef.current;
    if (!canvas || !cont || cont.clientWidth === 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = cont.clientWidth;
    const h = Math.max(295, Math.min(350, Math.round(w * 0.85)));
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
  }, []);

  useEffect(() => {
    ajustarCanvas();
    window.addEventListener('resize', ajustarCanvas);
    return () => window.removeEventListener('resize', ajustarCanvas);
  }, [ajustarCanvas]);

  // Motor 60fps del Círculo de 2 metros + Barrido Omnidireccional
  useEffect(() => {
    const loop = (now) => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const W = canvas.width / dpr;
        const H = canvas.height / dpr;
        const s = simRef.current;

        if (s.running) {
          const dt = Math.min(0.05, Math.max(0.001, (now - lastRef.current) / 1000));
          lastRef.current = now;
          s.timeLeft = Math.max(0, s.timeLeft - dt);
          s.totalTime += dt;
          s.sweepFlash = Math.max(0, s.sweepFlash - dt);
          s.alertSoundCd = Math.max(0, s.alertSoundCd - dt);
          if (s.avisoTimer > 0) {
            s.avisoTimer = Math.max(0, s.avisoTimer - dt);
            if (s.avisoTimer === 0) s.avisoTexto = null;
          }

          // Velocidad de la moto (crucero 62 km/h)
          const frontTooClose = s.frontCar.active && s.frontCar.yOffset > -108 && s.frontCar.yOffset < -20;
          if (s.accelHeld && !s.brakeHeld) {
            if (frontTooClose) {
              // No acelerar con frente ocupado: alerta inmediata
              s.speed = Math.max(46, s.speed - 18 * dt);
              s.avisoTexto = '¡Frente ocupado! Desacelera para recuperar tu círculo de 2m';
              s.avisoTimer = 2.0;
              if (s.alertSoundCd <= 0) {
                tocarSonido('alerta');
                vibrarSeguro(40);
                s.alertSoundCd = 1.2;
              }
            } else {
              s.speed = Math.min(92, s.speed + 42 * dt);
            }
          } else if (s.brakeHeld) {
            s.speed = Math.max(30, s.speed - 48 * dt);
          } else {
            // Retorna suavemente a velocidad crucero ~62 km/h
            s.speed += (62 - s.speed) * Math.min(1, dt * 1.8);
          }

          s.scroll += s.speed * 3.8 * dt;

          // Movimiento del vehículo frontal ocasional
          if (!s.frontCar.active) {
            s.frontCar.cooldown -= dt;
            if (s.frontCar.cooldown <= 0 && s.timeLeft > 4) {
              s.frontCar.active = true;
              s.frontCar.yOffset = -230;
            }
          } else {
            // Se mueve a ~52 km/h, acercándose si tú vas más rápido
            const relFront = (s.speed - 52) * 3.1;
            s.frontCar.yOffset += relFront * dt;
            if (s.frontCar.yOffset > -68) {
              s.frontCar.yOffset = -68;
            }
            if (s.frontCar.yOffset < -260 || (s.speed < 44 && s.frontCar.yOffset < -175)) {
              s.frontCar.active = false;
              s.frontCar.cooldown = 6.5;
            }
          }

          // Movimiento del vehículo lateral intentando emparejarse (paralelismo)
          const sc = s.sideCar;
          const relDelta = (s.speed - 62) * 4.4; // si aceleras (>62) el auto baja (+y); si desaceleras (<62) el auto sube (-y)
          if (sc.state === 'approaching') {
            // Busca igualar yOffset = 0 (en paralelo)
            const pull = Math.sign(-sc.yOffset) * 58;
            sc.yOffset += (pull + relDelta) * dt;
            if (Math.abs(sc.yOffset) < 42) {
              sc.state = 'matching';
            }
          } else if (sc.state === 'matching') {
            // Intenta pegarse en paralelo, pero el piloto rompe el paralelismo acelerando (>70) o desacelerando (<54)
            const stickyPull = Math.sign(-sc.yOffset) * 18;
            sc.yOffset += (stickyPull + relDelta * 1.35) * dt;
            if (Math.abs(sc.yOffset) > 102) {
              sc.state = 'escaped';
              if (sc.wasParallel) {
                s.paralelismosRotos += 1;
                s.avisoTexto =
                  sc.yOffset > 0
                    ? '✓ Círculo recuperado: dejaste al vehículo atrás'
                    : '✓ Círculo recuperado: dejaste pasar al vehículo adelante';
                s.avisoTimer = 2.0;
                tocarSonido('ok');
                vibrarSeguro(25);
              }
            }
          } else {
            sc.yOffset += (Math.sign(sc.yOffset || 1) * 140 + relDelta) * dt;
            if (Math.abs(sc.yOffset) > 230) {
              spawnearLateral(s);
            }
          }

          // Detección de invasión del Círculo de 2 metros
          const radioInvasion = sc.tipo === 'gandola' ? 68 : 54;
          const invadido = Math.abs(sc.yOffset) < radioInvasion;
          if (invadido) {
            sc.wasParallel = true;
            s.invadedTime += dt;
            if (s.alertSoundCd <= 0) {
              tocarSonido('alerta');
              vibrarSeguro(35);
              s.alertSoundCd = 1.4;
            }
          }

          // Decaimiento de frescura del anillo omnidireccional + alertas perimetrales
          for (let i = 0; i < 6; i += 1) {
            s.sectorFresh[i] = Math.max(12, s.sectorFresh[i] - 7.5 * dt);
          }

          if (s.activeAlertSector === -1) {
            s.nextAlertIn -= dt;
            if (s.nextAlertIn <= 0 && s.timeLeft > 3) {
              s.activeAlertSector = Math.floor(Math.random() * 6);
              s.alertTimeout = 4.6;
              s.nextAlertIn = 4.8;
            }
          } else {
            s.alertTimeout -= dt;
            if (s.alertTimeout <= 0) {
              s.activeAlertSector = -1;
            }
          }

          // Fin de sesión de 45s
          if (s.timeLeft <= 0) {
            s.running = false;
            const integridadPct = Math.max(
              0,
              Math.min(100, Math.round(((s.totalTime - s.invadedTime) / Math.max(1, s.totalTime)) * 100))
            );
            const puntajeFinal = Math.min(
              100,
              Math.round(
                integridadPct * 0.65 +
                  Math.min(100, s.paralelismosRotos * 22) * 0.2 +
                  Math.min(100, s.barridosCount * 10) * 0.15
              )
            );
            setReporte({
              puntajeFinal,
              integridadPct,
              paralelismosRotos: s.paralelismosRotos,
              barridos: s.barridosCount,
              alertasDetectadas: s.alertasDetectadas,
            });
            if (puntajeFinal >= 75) {
              onMarcarDominado('circulo', puntajeFinal);
              tocarSonido('fanfarria');
            } else {
              tocarSonido('ok');
            }
            setEstado('finalizado');
          }

          // Sincronización HUD React ~12Hz
          s.hudAcc += dt;
          if (s.hudAcc >= 0.08 || !s.running) {
            s.hudAcc = 0;
            const integridadLive = Math.max(
              0,
              Math.min(100, Math.round(((s.totalTime - s.invadedTime) / Math.max(0.5, s.totalTime)) * 100))
            );
            setHud({
              tiempo: Math.ceil(s.timeLeft),
              velocidad: Math.round(s.speed),
              integridad: integridadLive,
              paralelismosRotos: s.paralelismosRotos,
              barridos: s.barridosCount,
              alertasDetectadas: s.alertasDetectadas,
              invadido,
              frenteOcupado: frontTooClose,
              aviso: s.avisoTexto,
            });
          }
        }

        // ============ RENDERIZADO CANVAS 60FPS ============
        ctx.save();
        ctx.scale(dpr, dpr);

        ctx.fillStyle = '#020617';
        ctx.fillRect(0, 0, W, H);

        const roadW = Math.min(W - 20, 320);
        const roadX = (W - roadW) / 2;
        const laneW = roadW / 3;
        const laneCX = (i) => roadX + (i + 0.5) * laneW;
        const motoX = laneCX(1);
        const motoY = H * 0.57;

        // Autopista de 3 canales
        ctx.fillStyle = '#1E293B';
        ctx.fillRect(roadX, 0, roadW, H);

        // Bordes y divisorias animadas
        ctx.strokeStyle = '#CBD5E1';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(roadX, 0);
        ctx.lineTo(roadX, H);
        ctx.moveTo(roadX + roadW, 0);
        ctx.lineTo(roadX + roadW, H);
        ctx.stroke();

        ctx.strokeStyle = '#F8FAFC';
        ctx.lineWidth = 2;
        ctx.setLineDash([18, 18]);
        ctx.lineDashOffset = -(s.scroll % 36);
        ctx.beginPath();
        ctx.moveTo(roadX + laneW, 0);
        ctx.lineTo(roadX + laneW, H);
        ctx.moveTo(roadX + laneW * 2, 0);
        ctx.lineTo(roadX + laneW * 2, H);
        ctx.stroke();
        ctx.setLineDash([]);

        // Vehículo frontal si está activo
        if (s.frontCar.active) {
          const fy = motoY + s.frontCar.yOffset;
          ctx.fillStyle = '#64748B';
          ctx.beginPath();
          ctx.roundRect(motoX - 18, fy - 24, 36, 48, 8);
          ctx.fill();
          ctx.fillStyle = '#EF4444';
          ctx.fillRect(motoX - 14, fy + 20, 9, 4);
          ctx.fillRect(motoX + 5, fy + 20, 9, 4);
          ctx.fillStyle = '#FACC15';
          ctx.font = 'bold 8px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('FRENTE', motoX, fy + 3);
        }

        // Vehículo lateral intentando invadir en paralelo
        const sc = s.sideCar;
        const scX = laneCX(sc.lane);
        const scY = motoY + sc.yOffset;
        const scH = sc.tipo === 'gandola' ? 92 : 52;
        const scW = sc.tipo === 'gandola' ? 42 : 36;
        const radioInv = sc.tipo === 'gandola' ? 68 : 54;
        const invadido = Math.abs(sc.yOffset) < radioInv;
        const acercandose = !invadido && Math.abs(sc.yOffset) < radioInv + 34;

        ctx.fillStyle = sc.tipo === 'gandola' ? '#475569' : '#F97316';
        ctx.beginPath();
        ctx.roundRect(scX - scW / 2, scY - scH / 2, scW, scH, 7);
        ctx.fill();
        ctx.strokeStyle = invadido ? '#EF4444' : '#CBD5E1';
        ctx.lineWidth = invadido ? 2.5 : 1.2;
        ctx.stroke();
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(scX - scW / 2 + 5, scY - scH / 2 + 9, scW - 10, 12);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 8px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(sc.tipo === 'gandola' ? 'GANDOLA' : 'PARALELO', scX, scY + 6);

        // ANILLO OMNIDIRECCIONAL 360° (6 sectores interactivos alrededor del círculo de 2m)
        const ringR = 86;
        SECTORES_OMNI.forEach((sec) => {
          const a1 = ((sec.angleDeg - 26) * Math.PI) / 180;
          const a2 = ((sec.angleDeg + 26) * Math.PI) / 180;
          const fresh = s.sectorFresh[sec.id] / 100;
          const tieneAlerta = s.activeAlertSector === sec.id;

          ctx.beginPath();
          ctx.arc(motoX, motoY, ringR, a1, a2);
          ctx.strokeStyle = tieneAlerta
            ? '#EF4444'
            : fresh > 0.55
            ? 'rgba(16, 185, 129, 0.7)'
            : 'rgba(59, 130, 246, 0.35)';
          ctx.lineWidth = tieneAlerta ? 7 : 4;
          ctx.stroke();

          if (tieneAlerta) {
            const rad = (sec.angleDeg * Math.PI) / 180;
            const px = motoX + Math.cos(rad) * ringR;
            const py = motoY + Math.sin(rad) * ringR;
            ctx.beginPath();
            ctx.arc(px, py, 12, 0, Math.PI * 2);
            ctx.fillStyle = '#DC2626';
            ctx.fill();
            ctx.strokeStyle = '#FACC15';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 11px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('!', px, py + 4);
          }
        });

        // Haz de barrido visual al pulsar BARRIDO 360°
        if (s.sweepFlash > 0) {
          const deg = SECTORES_OMNI[s.sweepIdx].angleDeg;
          const a1 = ((deg - 30) * Math.PI) / 180;
          const a2 = ((deg + 30) * Math.PI) / 180;
          ctx.beginPath();
          ctx.moveTo(motoX, motoY);
          ctx.arc(motoX, motoY, ringR, a1, a2);
          ctx.closePath();
          ctx.fillStyle = `rgba(56, 189, 248, ${s.sweepFlash * 0.45})`;
          ctx.fill();
        }

        // CÍRCULO DE SEGURIDAD DE 2 METROS (Verde / Ámbar / Rojo pulsante)
        const pulse = invadido ? 1 + Math.sin(now * 0.015) * 0.06 : 1;
        const circleR = 54 * pulse;
        ctx.beginPath();
        ctx.arc(motoX, motoY, circleR, 0, Math.PI * 2);
        ctx.fillStyle = invadido
          ? 'rgba(239, 68, 68, 0.24)'
          : acercandose
          ? 'rgba(250, 204, 21, 0.16)'
          : 'rgba(16, 185, 129, 0.14)';
        ctx.fill();
        ctx.strokeStyle = invadido ? '#EF4444' : acercandose ? '#FACC15' : '#10B981';
        ctx.lineWidth = invadido ? 3 : 2;
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = invadido ? '#FCA5A5' : acercandose ? '#FEF08A' : '#6EE7B7';
        ctx.font = 'bold 8.5px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(invadido ? '¡CÍRCULO 2m INVADIDO!' : 'CÍRCULO 2m LIBRE', motoX, motoY + circleR + 13);

        // Motocicleta del piloto
        ctx.save();
        ctx.translate(motoX, motoY);
        ctx.fillStyle = '#020617';
        ctx.beginPath();
        ctx.roundRect(-4, -20, 8, 12, 3);
        ctx.roundRect(-4.5, 9, 9, 12, 3);
        ctx.fill();
        ctx.strokeStyle = '#CBD5E1';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-13, -7);
        ctx.lineTo(13, -7);
        ctx.stroke();
        ctx.fillStyle = '#2563EB';
        ctx.beginPath();
        ctx.roundRect(-6.5, -11, 13, 22, 5);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.fillStyle = '#F8FAFC';
        ctx.fill();
        ctx.strokeStyle = '#1D4ED8';
        ctx.lineWidth = 1.8;
        ctx.stroke();
        ctx.restore();

        ctx.restore();
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    lastRef.current = performance.now();
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [onMarcarDominado, tocarSonido]);

  return (
    <div className="space-y-3 pb-4 animate-fadeIn">
      {/* Encabezado + Mini HUD */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <h2 className="text-sm font-black text-white">Círculo 2m · Omnidireccional</h2>
          {dominado && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
        </div>
        <span className="text-xs font-black text-sky-400 tabular-nums">
          {hud.velocidad} km/h · {hud.tiempo}s
        </span>
      </div>

      {/* 3 Métricas Compactas */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 text-center">
          <div className="text-[10px] font-bold text-slate-400">Integridad 2m</div>
          <div
            className={`text-sm font-black tabular-nums ${
              hud.integridad >= 80 ? 'text-emerald-400' : hud.integridad >= 60 ? 'text-yellow-400' : 'text-red-400'
            }`}
          >
            {hud.integridad}%
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 text-center">
          <div className="text-[10px] font-bold text-slate-400">Paralelos Rotos</div>
          <div className="text-sm font-black text-blue-400 tabular-nums">{hud.paralelismosRotos}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 text-center">
          <div className="text-[10px] font-bold text-slate-400">Barridos 360°</div>
          <div className="text-sm font-black text-orange-400 tabular-nums">
            {hud.barridos} ({hud.alertasDetectadas}!)
          </div>
        </div>
      </div>

      {/* Pantalla de Reporte Final (al terminar 45s) */}
      {estado === 'finalizado' && reporte ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-center space-y-4 animate-fadeIn">
          <div
            className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center ${
              reporte.puntajeFinal >= 75 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400'
            }`}
          >
            <Award className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-black text-white">
              Dominio Omnidireccional: {reporte.puntajeFinal}%
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              {reporte.puntajeFinal >= 75
                ? '¡Módulo 3 Dominado! Mantuviste tu círculo de 2 metros libre y rompiste el paralelismo con barridos activos.'
                : 'Aumenta la rapidez con la que aceleras o desaceleras cuando invaden tu círculo y ejecuta barridos 360° más frecuentes.'}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-[10px] text-slate-400">Círculo 2m</div>
              <div className="font-black text-emerald-400">{reporte.integridadPct}%</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-[10px] text-slate-400">Rompiste</div>
              <div className="font-black text-blue-400">{reporte.paralelismosRotos} paral.</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-[10px] text-slate-400">Alertas 360°</div>
              <div className="font-black text-orange-400">{reporte.alertasDetectadas} ✓</div>
            </div>
          </div>
          <button
            type="button"
            onClick={iniciarSesion}
            className="w-full min-h-[48px] rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-black text-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Repetir Entrenamiento (45s)</span>
          </button>
        </div>
      ) : (
        <>
          {/* ZONA SUPERIOR VISUAL: CANVAS 60FPS */}
          <div
            ref={contRef}
            className="relative bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-lg"
          >
            <canvas
              ref={canvasRef}
              onPointerDown={onTapCanvas}
              className="block w-full touch-none select-none"
            />

            {hud.aviso && estado === 'corriendo' && (
              <div className="absolute top-2 left-2 right-2 px-3 py-2 rounded-xl bg-slate-950/90 border border-blue-500/40 text-[11px] font-extrabold text-white text-center animate-fadeIn">
                {hud.aviso}
              </div>
            )}

            {estado === 'listo' && (
              <div className="absolute inset-0 bg-slate-950/82 backdrop-blur-[2px] flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 w-full text-center space-y-3 shadow-2xl">
                  <div className="w-11 h-11 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center mx-auto">
                    <Radio className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-black text-white">
                      Protege tu Círculo de 2 Metros (45s)
                    </h3>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Si un carro o gandola se pone en paralelo, <strong>Acelera</strong> (si el
                      frente está libre) o <strong>Desacelera</strong> para recuperar tu espacio.
                      Pulsa <strong>Barrido 360°</strong> o toca las alertas rojas en el anillo.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={iniciarSesion}
                    className="w-full min-h-[48px] rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Arrancar Simulador</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ZONA DEL PULGAR: 3 BOTONES ERGONÓMICOS GIGANTES */}
          <div className="grid grid-cols-12 gap-2">
            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                simRef.current.brakeHeld = true;
              }}
              onPointerUp={() => {
                simRef.current.brakeHeld = false;
              }}
              onPointerLeave={() => {
                simRef.current.brakeHeld = false;
              }}
              onPointerCancel={() => {
                simRef.current.brakeHeld = false;
              }}
              onContextMenu={(e) => e.preventDefault()}
              className="col-span-4 min-h-[64px] rounded-2xl bg-[#F97316]/20 active:bg-[#F97316] border-2 border-[#F97316] text-orange-200 active:text-slate-950 font-black text-[11px] flex flex-col items-center justify-center px-1 touch-none select-none active:scale-95 transition-all cursor-pointer"
            >
              <ArrowDown className="w-4 h-4 mb-0.5" />
              <span>− DESACELERAR</span>
              <span className="text-[9px] font-semibold opacity-80">Dejar adelante</span>
            </button>

            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                ejecutarBarrido();
              }}
              onContextMenu={(e) => e.preventDefault()}
              className="col-span-4 min-h-[64px] rounded-2xl bg-[#2563EB] active:bg-blue-500 border-2 border-blue-400 text-white font-black text-[11px] flex flex-col items-center justify-center px-1 touch-none select-none active:scale-95 transition-all cursor-pointer shadow-md"
            >
              <Eye className="w-4 h-4 mb-0.5" />
              <span>BARRIDO 360°</span>
              <span className="text-[9px] font-semibold text-blue-100">Escaneo circular</span>
            </button>

            <button
              type="button"
              onPointerDown={(e) => {
                e.preventDefault();
                simRef.current.accelHeld = true;
              }}
              onPointerUp={() => {
                simRef.current.accelHeld = false;
              }}
              onPointerLeave={() => {
                simRef.current.accelHeld = false;
              }}
              onPointerCancel={() => {
                simRef.current.accelHeld = false;
              }}
              onContextMenu={(e) => e.preventDefault()}
              className={`col-span-4 min-h-[64px] rounded-2xl border-2 font-black text-[11px] flex flex-col items-center justify-center px-1 touch-none select-none active:scale-95 transition-all cursor-pointer ${
                hud.frenteOcupado
                  ? 'bg-red-500/20 border-red-500 text-red-300'
                  : 'bg-emerald-500/20 active:bg-emerald-500 border-emerald-400 text-emerald-200 active:text-slate-950'
              }`}
            >
              <ArrowUp className="w-4 h-4 mb-0.5" />
              <span>+ ACELERAR</span>
              <span className="text-[9px] font-semibold opacity-80">
                {hud.frenteOcupado ? '¡Frente cerca!' : 'Dejar atrás'}
              </span>
            </button>
          </div>
        </>
      )}

      {/* Cajón colapsable de Base Teórica y Legal */}
      <CajonTeoria titulo="Círculo de 2 Metros y Conducción Omnidireccional" badge="Art. 31.2">
        <p>
          <strong className="text-emerald-400">Tu Círculo de 2 Metros:</strong> Nunca permitas que un
          vehículo ruede paralelo a ti porque pierdes tu rango de maniobra y quedas en su punto ciego
          (además, el <strong>Art. 31 num. 2 del Decreto N° 8.495</strong> prohíbe circular
          paralelamente en el mismo canal). Si invaden tu círculo, <strong>acelera</strong> (solo si
          el frente está despejado) o <strong>desacelera</strong> para recuperar tu espacio{' '}
          <strong>todas las veces que sea necesario</strong>.
        </p>
        <p>
          <strong className="text-sky-300">Conducción Omnidireccional (360°):</strong> Consiste en
          realizar barridos visuales circulares continuos durante todo el trayecto (Frente → Espejo
          Der → Atrás → Espejo Izq → Flancos → Frente) en micro-vistazos menores a 1 segundo,
          evitando la visión de túnel.
        </p>
      </CajonTeoria>
    </div>
  );
}

/* ============================================================================
 * 7. MÓDULO 4: ANALOGÍA DEL MURO (LÍNEAS Y CANALES EN VENEZUELA)
 * ============================================================================ */
const TIPOS_DEMARCACION = [
  {
    id: 'blanca_disc',
    corto: 'Blanca Disc.',
    titulo: 'Blanca Discontinua — Muro con Puertas',
    sentido: 'Mismo sentido de circulación',
    veredicto: 'PERMITIDO (Con 6 Pasos)',
    permitido: true,
    explicacion:
      'Separa canales del mismo sentido. Imagínala como un muro con puertas abiertas: puedes cambiar de canal únicamente aplicando el Sistema de 6 Pasos.',
    cita: 'MVDUCT · Decreto N° 8.495 Art. 31 num. 1 y 3 (Prohibido pisar la línea o zigzaguear).',
  },
  {
    id: 'blanca_cont',
    corto: 'Blanca Cont.',
    titulo: 'Blanca Continua — Muro Sólido',
    sentido: 'Mismo sentido de circulación',
    veredicto: 'ES UN MURO (Prohibido cruzar)',
    permitido: false,
    explicacion:
      'Común en incorporaciones de autopista, túneles y aproximación a intersecciones. Actúa como un muro sólido de concreto: no puedes cruzarla ni pisarla.',
    cita: 'MVDUCT · Decreto N° 8.495 Art. 31 num. 14 (Respetar la demarcación vial).',
  },
  {
    id: 'amarilla_doble',
    corto: 'Doble Amarilla',
    titulo: 'Amarilla Continua / Doble Amarilla — Muro Blindado',
    sentido: 'Separa SENTIDOS CONTRARIOS',
    veredicto: 'MURO ABSOLUTO (Riesgo Frontal)',
    permitido: false,
    explicacion:
      'El color amarillo advierte tráfico en sentido contrario. La doble amarilla es un muro blindado infranqueable: cruzarla te expone a un impacto frontal fatal.',
    cita: 'MVDUCT · Reglamento de la Ley de Tránsito Terrestre (Prohibición de adelantar).',
  },
  {
    id: 'amarilla_disc',
    corto: 'Amarilla Disc.',
    titulo: 'Amarilla Discontinua — Paso Controlado',
    sentido: 'Separa SENTIDOS CONTRARIOS',
    veredicto: 'SOLO ADELANTAR CON VISIBILIDAD TOTAL',
    permitido: true,
    explicacion:
      'Separa sentidos opuestos en tramos rectos con buena visibilidad. Solo permite adelantar por la izquierda si no viene tráfico de frente y aplicas los 6 pasos.',
    cita: 'Decreto N° 8.495 Art. 28 num. 12 y Art. 32 num. 3 (Adelantamiento por izquierda).',
  },
  {
    id: 'mixta_favor',
    corto: 'Mixta (Tu Lado)',
    titulo: 'Mixta (Continua + Discontinua) — Muro Unidireccional',
    sentido: 'Sentidos contrarios · Manda TU línea',
    veredicto: 'DEPENDE DE TU LADO',
    permitido: true,
    explicacion:
      'Manda siempre la línea más cercana a tus cauchos: si de tu lado es DISCONTINUA, tienes portal para rebasar con vía libre; si de tu lado es CONTINUA, para ti es un muro sólido.',
    cita: 'MVDUCT (Demarcación longitudinal mixta en carreteras venezolanas).',
  },
];

const TRAMOS_RETO_MURO = [
  {
    id: 't1',
    tipo: 'blanca_cont',
    titulo: 'Tramo 1 · Incorporación a autopista',
    desc: 'Entras a la autopista y te separa una línea BLANCA CONTINUA del canal rápido.',
    esMuro: true,
    explicacion: 'Es un MURO sólido: debes mantener tu canal hasta que la línea cambie a blanca discontinua.',
  },
  {
    id: 't2',
    tipo: 'amarilla_doble',
    titulo: 'Tramo 2 · Curva ciega en carretera',
    desc: 'Una gandola va lenta adelante en curva y hay DOBLE LÍNEA AMARILLA en el centro.',
    esMuro: true,
    explicacion: 'Muro blindado absoluto: separa sentidos contrarios en zona sin visibilidad. Prohibido invadir.',
  },
  {
    id: 't3',
    tipo: 'blanca_disc',
    titulo: 'Tramo 3 · Avenida urbana 3 canales',
    desc: 'Circulas en el canal central con líneas BLANCAS DISCONTINUAS y necesitas pasar a la izquierda.',
    esMuro: false,
    explicacion: '¡Muro con puertas! Puedes cambiar de canal aplicando el Sistema de 6 Pasos.',
  },
  {
    id: 't4',
    tipo: 'mixta_contra',
    titulo: 'Tramo 4 · Mixta con continua de tu lado',
    desc: 'La línea amarilla pegada a tu canal es CONTINUA y la del sentido contrario es discontinua.',
    esMuro: true,
    explicacion: 'En línea mixta manda la más cercana a tu canal: al ser continua de tu lado, para ti es un MURO.',
  },
  {
    id: 't5',
    tipo: 'mixta_favor',
    titulo: 'Tramo 5 · Recta despejada con mixta a favor',
    desc: 'La línea amarilla de tu lado es DISCONTINUA, hay visibilidad total y no viene nadie de frente.',
    esMuro: false,
    explicacion: 'Correcto: al tener la discontinua de tu lado con visibilidad total, el muro tiene portal de paso.',
  },
  {
    id: 't6',
    tipo: 'blanca_cont',
    titulo: 'Tramo 6 · Entrando a un túnel en Caracas',
    desc: 'Al entrar al túnel la línea entre canales del mismo sentido se vuelve BLANCA CONTINUA.',
    esMuro: true,
    explicacion: 'Dentro de túneles la blanca continua es un muro obligatorio: queda prohibido cambiar de canal.',
  },
  {
    id: 't7',
    tipo: 'amarilla_disc',
    titulo: 'Tramo 7 · Recta rural despejada',
    desc: 'Carretera de doble sentido con AMARILLA DISCONTINUA y horizonte completamente libre.',
    esMuro: false,
    explicacion: 'Permitido adelantar por la izquierda con luz de cruce y visibilidad confirmada (Art. 28.12).',
  },
  {
    id: 't8',
    tipo: 'amarilla_doble',
    titulo: 'Tramo 8 · Subida de montaña con doble amarilla',
    desc: 'Un camión frena en pendiente pronunciada y la vía tiene DOBLE AMARILLA continua.',
    esMuro: true,
    explicacion: 'Mantén tu canal y distancia: cruzar doble amarilla en subida es riesgo frontal extremo.',
  },
];

function VisorMuroSVG({ tipo, visionMuro3D, mixtaInvertida = false }) {
  // Determina geometría de líneas izquierda/derecha o central
  const esAmarilla = tipo.startsWith('amarilla') || tipo.startsWith('mixta');
  const esDoble = tipo === 'amarilla_doble' || tipo.startsWith('mixta');
  const tipoReal =
    tipo === 'mixta_favor' && mixtaInvertida ? 'mixta_contra' : tipo;

  const esMuroIzq =
    tipoReal === 'blanca_cont' ||
    tipoReal === 'amarilla_doble' ||
    tipoReal === 'mixta_contra';
  const esPortalIzq =
    tipoReal === 'blanca_disc' ||
    tipoReal === 'amarilla_disc' ||
    tipoReal === 'mixta_favor';

  return (
    <svg
      viewBox="0 0 320 198"
      className="w-full h-auto block rounded-xl bg-slate-950 border border-slate-800 select-none"
      role="img"
      aria-label={`Visor de demarcación vial ${tipoReal}`}
    >
      {/* Cielo y horizonte */}
      <rect x="0" y="0" width="320" height="44" fill="#0F172A" />
      <rect x="0" y="44" width="320" height="154" fill="#1E293B" />

      {/* Calzada en perspectiva */}
      <polygon points="108,44 212,44 304,198 16,198" fill="#334155" />
      {/* Bordes externos */}
      <line x1="108" y1="44" x2="16" y2="198" stroke="#E2E8F0" strokeWidth="2.5" />
      <line x1="212" y1="44" x2="304" y2="198" stroke="#E2E8F0" strokeWidth="2.5" />

      {/* Flechas de sentido en ambos canales */}
      <text x="108" y="182" textAnchor="middle" fill={esAmarilla ? '#FCA5A5' : '#93C5FD'} fontSize="11" fontWeight="900">
        {esAmarilla ? '↓ CONTRA' : '↑ MISMO'}
      </text>
      <text x="216" y="182" textAnchor="middle" fill="#6EE7B7" fontSize="11" fontWeight="900">
        ↑ TU CANAL
      </text>

      {/* LÍNEA DIVISORIA CENTRAL (x=160 arriba hasta x=160 abajo) */}
      {!visionMuro3D ? (
        <g>
          {tipoReal === 'blanca_disc' && (
            <line x1="160" y1="44" x2="160" y2="198" stroke="#FFFFFF" strokeWidth="5" strokeDasharray="16 14" />
          )}
          {tipoReal === 'blanca_cont' && (
            <line x1="160" y1="44" x2="160" y2="198" stroke="#FFFFFF" strokeWidth="6" />
          )}
          {tipoReal === 'amarilla_doble' && (
            <>
              <line x1="154" y1="44" x2="152" y2="198" stroke="#FACC15" strokeWidth="4.5" />
              <line x1="166" y1="44" x2="168" y2="198" stroke="#FACC15" strokeWidth="4.5" />
            </>
          )}
          {tipoReal === 'amarilla_disc' && (
            <line x1="160" y1="44" x2="160" y2="198" stroke="#FACC15" strokeWidth="5.5" strokeDasharray="16 14" />
          )}
          {tipoReal === 'mixta_favor' && (
            <>
              {/* Izquierda continua, derecha (lado moto) discontinua */}
              <line x1="154" y1="44" x2="152" y2="198" stroke="#FACC15" strokeWidth="4.5" />
              <line x1="166" y1="44" x2="168" y2="198" stroke="#FACC15" strokeWidth="4.5" strokeDasharray="15 13" />
            </>
          )}
          {tipoReal === 'mixta_contra' && (
            <>
              {/* Izquierda discontinua, derecha (lado moto) continua */}
              <line x1="154" y1="44" x2="152" y2="198" stroke="#FACC15" strokeWidth="4.5" strokeDasharray="15 13" />
              <line x1="166" y1="44" x2="168" y2="198" stroke="#FACC15" strokeWidth="4.5" />
            </>
          )}
        </g>
      ) : (
        /* MODO VISIÓN MURO 3D EXTRUIDO */
        <g>
          {esMuroIzq ? (
            <g>
              {/* Muro sólido de concreto extruido en 3D */}
              <polygon
                points="154,44 166,44 172,198 148,198"
                fill={esDoble ? '#B45309' : '#64748B'}
                stroke="#0F172A"
                strokeWidth="1.5"
              />
              {/* Cara superior elevada del muro 3D */}
              <polygon
                points="154,28 166,28 172,158 148,158"
                fill={esAmarilla ? '#EF4444' : '#94A3B8'}
                stroke="#FEF08A"
                strokeWidth="1.5"
              />
              {/* Franjas de peligro diagonales */}
              {[50, 78, 108, 138].map((yPos) => (
                <line
                  key={yPos}
                  x1="151"
                  y1={yPos}
                  x2="169"
                  y2={yPos - 8}
                  stroke="#0F172A"
                  strokeWidth="4"
                />
              ))}
              <rect x="92" y="8" width="136" height="18" rx="6" fill="#DC2626" />
              <text x="160" y="20" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="900">
                🧱 MURO SÓLIDO — NO CRUZAR
              </text>
            </g>
          ) : (
            <g>
              {/* Muro con portales verdes abiertos */}
              <line
                x1="160"
                y1="44"
                x2="160"
                y2="198"
                stroke={esAmarilla ? '#FACC15' : '#FFFFFF'}
                strokeWidth="5"
                strokeDasharray="16 18"
              />
              {/* Portales luminosos verdes */}
              {[84, 134].map((py) => (
                <g key={py}>
                  <ellipse cx="160" cy={py} rx="22" ry="9" fill="#10B981" fillOpacity="0.28" stroke="#34D399" strokeWidth="1.8" />
                  <path d={`M 176 ${py} L 144 ${py}`} stroke="#6EE7B7" strokeWidth="2.5" />
                  <polygon points={`138,${py} 147,${py - 4} 147,${py + 4}`} fill="#6EE7B7" />
                </g>
              ))}
              <rect x="86" y="8" width="148" height="18" rx="6" fill="#059669" />
              <text x="160" y="20" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="900">
                ✓ PORTAL ABIERTO (USA 6 PASOS)
              </text>
            </g>
          )}
        </g>
      )}

      {/* Motocicleta posicionada en tu canal (derecho) */}
      <g transform="translate(216, 136)">
        <rect x="-6" y="-18" width="12" height="32" rx="5" fill="#2563EB" stroke="#93C5FD" strokeWidth="1.2" />
        <line x1="-13" y1="-8" x2="13" y2="-8" stroke="#E2E8F0" strokeWidth="3" strokeLinecap="round" />
        <circle cx="0" cy="-2" r="6.5" fill="#F8FAFC" stroke="#1D4ED8" strokeWidth="1.5" />
      </g>

      {/* Auto contrario en vías amarillas */}
      {esAmarilla && (
        <g transform="translate(110, 82)">
          <rect x="-14" y="-18" width="28" height="36" rx="6" fill="#EF4444" stroke="#FCA5A5" strokeWidth="1.2" />
          <circle cx="-8" cy="17" r="2.5" fill="#FEF08A" />
          <circle cx="8" cy="17" r="2.5" fill="#FEF08A" />
        </g>
      )}
    </svg>
  );
}

function ModuloMuros({ tocarSonido, dominado, onMarcarDominado }) {
  const [subModo, setSubModo] = useState('visor'); // 'visor' | 'reto'
  const [tipoId, setTipoId] = useState('blanca_disc');
  const [visionMuro3D, setVisionMuro3D] = useState(true);
  const [mixtaInvertida, setMixtaInvertida] = useState(false);

  // Estado Reto Relámpago (8 Tramos)
  const [tramoIdx, setTramoIdx] = useState(0);
  const [aciertos, setAciertos] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [terminado, setTerminado] = useState(false);

  const infoActual = TIPOS_DEMARCACION.find((t) => t.id === tipoId) || TIPOS_DEMARCACION[0];
  const tramoActual = TRAMOS_RETO_MURO[tramoIdx];

  const iniciarReto = () => {
    setSubModo('reto');
    setTramoIdx(0);
    setAciertos(0);
    setFeedback(null);
    setTerminado(false);
    setVisionMuro3D(false);
  };

  const responderTramo = (eligioMuro) => {
    if (feedback) return;
    const ok = eligioMuro === tramoActual.esMuro;
    setVisionMuro3D(true); // Revela la visión 3D del muro al responder
    if (ok) {
      setAciertos((a) => a + 1);
      tocarSonido('ok');
      vibrarSeguro(30);
    } else {
      tocarSonido(tramoActual.esMuro ? 'muro' : 'error');
      vibrarSeguro([60, 40, 60]);
    }
    setFeedback({ ok, texto: tramoActual.explicacion });
  };

  const siguienteTramo = () => {
    if (tramoIdx < TRAMOS_RETO_MURO.length - 1) {
      setTramoIdx((i) => i + 1);
      setFeedback(null);
      setVisionMuro3D(false);
    } else {
      setTerminado(true);
      if (aciertos >= 7) {
        onMarcarDominado('muros', Math.round((aciertos / 8) * 100));
        tocarSonido('fanfarria');
      }
    }
  };

  return (
    <div className="space-y-3 pb-4 animate-fadeIn">
      {/* Encabezado + Sub-modos */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <h2 className="text-sm font-black text-white truncate">Analogía del Muro · Canales</h2>
          {dominado && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
        </div>

        <div className="inline-flex bg-slate-900 p-0.5 rounded-xl border border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => {
              setSubModo('visor');
              setVisionMuro3D(true);
            }}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold cursor-pointer ${
              subModo === 'visor' ? 'bg-[#2563EB] text-white' : 'text-slate-400'
            }`}
          >
            Visor 3D
          </button>
          <button
            type="button"
            onClick={iniciarReto}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold cursor-pointer ${
              subModo === 'reto' ? 'bg-[#F97316] text-slate-950' : 'text-slate-400'
            }`}
          >
            Reto (8)
          </button>
        </div>
      </div>

      {subModo === 'visor' ? (
        <>
          {/* ZONA SUPERIOR VISUAL */}
          <VisorMuroSVG
            tipo={tipoId}
            visionMuro3D={visionMuro3D}
            mixtaInvertida={mixtaInvertida}
          />

          {/* Interruptor Prominente de Visión Muro 3D */}
          <button
            type="button"
            onClick={() => {
              setVisionMuro3D((v) => !v);
              tocarSonido('switch');
            }}
            className={`w-full min-h-[48px] rounded-xl border-2 text-xs font-black flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer ${
              visionMuro3D
                ? 'bg-[#F97316] border-orange-300 text-slate-950 shadow-sm'
                : 'bg-slate-900 border-slate-700 text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>
              {visionMuro3D ? '🧱 VISIÓN MURO 3D: ACTIVADA' : '🧱 ACTIVAR VISIÓN MURO 3D'}
            </span>
          </button>

          {/* Tarjeta de explicación de la demarcación */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-black text-white">{infoActual.titulo}</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {infoActual.sentido}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full ${
                  tipoId === 'mixta_favor'
                    ? mixtaInvertida
                      ? 'bg-red-500/20 text-red-300'
                      : 'bg-emerald-500/20 text-emerald-300'
                    : infoActual.permitido
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-red-500/20 text-red-300'
                }`}
              >
                {tipoId === 'mixta_favor'
                  ? mixtaInvertida
                    ? 'TU LADO CONTINUA = MURO'
                    : 'TU LADO DISCONTINUA = PORTAL'
                  : infoActual.veredicto}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">{infoActual.explicacion}</p>

            {tipoId === 'mixta_favor' && (
              <button
                type="button"
                onClick={() => {
                  setMixtaInvertida((v) => !v);
                  tocarSonido('switch');
                }}
                className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-yellow-300 text-[11px] font-extrabold cursor-pointer"
              >
                Invertir tu lado ({mixtaInvertida ? 'Ver Discontinua a favor' : 'Ver Continua en contra'})
              </button>
            )}
          </div>

          {/* ZONA DEL PULGAR: 5 Selectores táctiles de líneas */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {TIPOS_DEMARCACION.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTipoId(t.id);
                  setMixtaInvertida(false);
                  tocarSonido('switch');
                }}
                className={`min-h-[46px] px-2.5 rounded-xl border text-[11px] font-extrabold active:scale-95 transition-all cursor-pointer ${
                  tipoId === t.id
                    ? 'bg-[#2563EB] border-blue-400 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-300'
                }`}
              >
                {t.corto}
              </button>
            ))}
          </div>
        </>
      ) : terminado ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-center space-y-4 animate-fadeIn">
          <div
            className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center ${
              aciertos >= 7 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400'
            }`}
          >
            <Award className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-black text-white">
              Reto Relámpago: {aciertos} de 8 Tramos
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              {aciertos >= 7
                ? '¡Módulo 4 Dominado! Lees la demarcación venezolana al instante sin cruzar muros invisibles.'
                : 'Se requiere al menos 7/8 para dominar este módulo. Repasa la línea mixta y la doble amarilla.'}
            </p>
          </div>
          <button
            type="button"
            onClick={iniciarReto}
            className="w-full min-h-[48px] rounded-xl bg-[#2563EB] text-white font-black text-sm cursor-pointer"
          >
            Repetir los 8 Tramos
          </button>
        </div>
      ) : (
        /* RETO RELÁMPAGO (8 TRAMOS VE) */
        <div className="space-y-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-1">
            <div className="flex items-center justify-between text-[10px] font-black uppercase">
              <span className="text-[#F97316]">{tramoActual.titulo}</span>
              <span className="text-slate-400">
                {tramoIdx + 1}/8 · {aciertos} ✓
              </span>
            </div>
            <p className="text-xs text-slate-200 leading-snug">{tramoActual.desc}</p>
          </div>

          <VisorMuroSVG tipo={tramoActual.tipo} visionMuro3D={visionMuro3D} />

          {feedback ? (
            <div
              className={`p-3.5 rounded-2xl border space-y-2.5 animate-fadeIn ${
                feedback.ok
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-100'
                  : 'bg-red-500/15 border-red-500/40 text-red-100'
              }`}
            >
              <div className="text-xs font-black flex items-center gap-1.5">
                {feedback.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400" />
                )}
                <span>{feedback.ok ? '¡Lectura vial exacta!' : '¡Cuidado con el muro!'}</span>
              </div>
              <p className="text-[11px] leading-relaxed">{feedback.texto}</p>
              <button
                type="button"
                onClick={siguienteTramo}
                className="w-full min-h-[46px] rounded-xl bg-white text-slate-950 font-black text-xs cursor-pointer"
              >
                {tramoIdx < 7 ? 'Siguiente Tramo →' : 'Ver Resultado Final'}
              </button>
            </div>
          ) : (
            /* ZONA DEL PULGAR: 2 Botones Grandes de Decisión */
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => responderTramo(false)}
                className="min-h-[60px] px-2 rounded-2xl bg-emerald-500/20 hover:bg-emerald-500/30 border-2 border-emerald-400 text-emerald-200 font-black text-xs flex flex-col items-center justify-center touch-none select-none active:scale-95 transition-all cursor-pointer"
              >
                <span>✅ PERMITIDO</span>
                <span className="text-[9px] font-semibold opacity-80">Con 6 Pasos</span>
              </button>

              <button
                type="button"
                onClick={() => responderTramo(true)}
                className="min-h-[60px] px-2 rounded-2xl bg-red-500/20 hover:bg-red-500/30 border-2 border-red-400 text-red-200 font-black text-xs flex flex-col items-center justify-center touch-none select-none active:scale-95 transition-all cursor-pointer"
              >
                <span>🧱 ES UN MURO</span>
                <span className="text-[9px] font-semibold opacity-80">Mantener Canal</span>
              </button>
            </div>
          )}
        </div>
      )}

      <CajonTeoria titulo="Manual Venezolano (MVDUCT) y Demarcación" badge="Art. 31.1 · 31.3">
        <p>
          El <strong>Manual Venezolano de Dispositivos Uniformes para el Control del Tránsito (MVDUCT)</strong>{' '}
          define el código de colores: <strong>Blanco</strong> separa canales del mismo sentido;{' '}
          <strong>Amarillo</strong> separa sentidos contrarios.
        </p>
        <p>
          Pisar o circular sobre la línea divisoria entre canales está prohibido por el{' '}
          <strong>Art. 31 numeral 1 y 3 del Decreto N° 8.495</strong>. Tratar las líneas continuas
          como muros sólidos salva vidas en autopistas y carreteras.
        </p>
      </CajonTeoria>
    </div>
  );
}

/* ============================================================================
 * 8. MÓDULO 5: SISTEMA DE 6 PASOS INTEGRADO (CAMBIO DE CANAL EN CANVAS 60FPS)
 * ============================================================================ */
const MISIONES_6P_MOBILE = [
  {
    id: 'm1',
    titulo: 'Misión 1 · Autopista 3 Canales',
    consigna: 'Cambia al canal IZQUIERDO cuando la demarcación sea discontinua (portal).',
    inicio: 1,
    destino: 0,
    dir: 'izq',
    puntoCiego: false,
  },
  {
    id: 'm2',
    titulo: 'Misión 2 · Punto Ciego + Muro',
    consigna: 'Cambia al canal DERECHO. Revisa el punto ciego y espera el portal discontinuo.',
    inicio: 1,
    destino: 2,
    dir: 'der',
    puntoCiego: true,
  },
  {
    id: 'm3',
    titulo: 'Misión 3 · Adelantamiento Seguro',
    consigna: 'Pasa al canal IZQUIERDO evitando chocar con la línea continua ni invadir el círculo 2m.',
    inicio: 2,
    destino: 1,
    dir: 'izq',
    puntoCiego: true,
  },
  {
    id: 'm4',
    titulo: 'Misión 4 · Salida a la Derecha',
    consigna: 'Cambia al canal DERECHO ejecutando la secuencia exacta 1→6 sin demorar el Paso 6.',
    inicio: 1,
    destino: 2,
    dir: 'der',
    puntoCiego: false,
  },
  {
    id: 'm5',
    titulo: 'Misión 5 · Tráfico Intenso VE',
    consigna: 'Cambia al canal IZQUIERDO con moto rápida en tu punto ciego y tramos de muro.',
    inicio: 1,
    destino: 0,
    dir: 'izq',
    puntoCiego: true,
  },
];

const PASOS_CONSOLA = [
  { num: 1, corto: '1. Luz Cruce', hint: 'Activa la luz de cruce para comunicar tu intención.' },
  { num: 2, corto: '2. Dist. Frontal', hint: 'Escanea tu distancia con el vehículo de adelante.' },
  { num: 3, corto: '3. Retrovisores', hint: 'Revisa atrás con tu Triángulo Invertido ▼.' },
  { num: 4, corto: '4. Chequeo Físico', hint: 'Gira la cabeza sobre el hombro hacia el canal destino.' },
  { num: 5, corto: '5. Incorporar', hint: 'Muévete progresivo SOLO si la línea es discontinua y vía libre.' },
  { num: 6, corto: '6. Apagar Luz', hint: 'Cancela la luz de cruce al estabilizarte en el nuevo canal.' },
];

function Modulo6PasosIntegrado({ tocarSonido, dominado, onMarcarDominado }) {
  const canvasRef = useRef(null);
  const contRef = useRef(null);
  const rafRef = useRef(null);
  const lastRef = useRef(0);

  const [modo, setModo] = useState('guiado'); // 'guiado' (3 misiones) | 'calle' (5 misiones)
  const [misionIdx, setMisionIdx] = useState(0);
  const [pasos, setPasos] = useState({ 1: false, 2: false, 3: false, 4: false, 5: false, 6: false });
  const [ciegoEstado, setCiegoEstado] = useState('sin_revisar'); // 'sin_revisar' | 'ocupado' | 'despejado'
  const [esMuroAhora, setEsMuroAhora] = useState(false);
  const [alerta, setAlerta] = useState(null); // { tipo: 'ok'|'warn'|'error', texto }
  const [olvidoPaso6, setOlvidoPaso6] = useState(false);
  const [terminado, setTerminado] = useState(false);
  const [errores, setErrores] = useState(0);

  const totalMisiones = modo === 'guiado' ? 3 : 5;
  const mision = MISIONES_6P_MOBILE[misionIdx];

  const paso6TimerRef = useRef(null);
  const nextTimerRef = useRef(null);

  const simRef = useRef({
    scroll: 0,
    laneFloat: 1,
    targetLane: 1,
    signalOn: false,
    signalDir: 'izq',
    blinkPhase: 0,
    laserTimer: 0,
    mirrorTimer: 0,
    shoulderTimer: 0,
    shoulderRes: 'despejado',
    blindActive: false,
    blindCleared: false,
    blindYOffset: 10,
    muroActivo: false,
    hudAcc: 0,
  });

  const limpiarTimers = useCallback(() => {
    if (paso6TimerRef.current) clearTimeout(paso6TimerRef.current);
    if (nextTimerRef.current) clearTimeout(nextTimerRef.current);
  }, []);

  useEffect(() => {
    return () => limpiarTimers();
  }, [limpiarTimers]);

  const cargarMision = useCallback(
    (idx) => {
      limpiarTimers();
      const m = MISIONES_6P_MOBILE[idx];
      setMisionIdx(idx);
      setPasos({ 1: false, 2: false, 3: false, 4: false, 5: false, 6: false });
      setCiegoEstado('sin_revisar');
      setAlerta(null);
      setOlvidoPaso6(false);

      const s = simRef.current;
      s.laneFloat = m.inicio;
      s.targetLane = m.inicio;
      s.signalOn = false;
      s.signalDir = m.dir;
      s.laserTimer = 0;
      s.mirrorTimer = 0;
      s.shoulderTimer = 0;
      s.blindActive = m.puntoCiego;
      s.blindCleared = false;
      s.blindYOffset = 10;
    },
    [limpiarTimers]
  );

  useEffect(() => {
    cargarMision(0);
    setErrores(0);
    setTerminado(false);
  }, [modo, cargarMision]);

  // Sonido tic-tac mientras direccional está encendida
  useEffect(() => {
    if (!pasos[1] || pasos[6] || terminado) return undefined;
    let toggle = true;
    const id = setInterval(() => {
      tocarSonido(toggle ? 'tic' : 'tac');
      toggle = !toggle;
    }, 460);
    return () => clearInterval(id);
  }, [pasos, terminado, tocarSonido]);

  const siguienteSugerido = useMemo(() => {
    if (!pasos[1]) return 1;
    if (!pasos[2]) return 2;
    if (!pasos[3]) return 3;
    if (!pasos[4] || ciegoEstado !== 'despejado') return 4;
    if (!pasos[5]) return 5;
    if (!pasos[6]) return 6;
    return null;
  }, [pasos, ciegoEstado]);

  // Botón rápido para desacelerar y liberar el punto ciego cuando está ocupado
  const liberarPuntoCiego = () => {
    const s = simRef.current;
    s.blindCleared = true;
    setAlerta({
      tipo: 'ok',
      texto: 'Desaceleraste para recuperar tu círculo de 2m. Repite el Paso 4 para confirmar vía libre.',
    });
    tocarSonido('switch');
  };

  const ejecutarPaso = (num) => {
    if (terminado) return;
    const s = simRef.current;

    if (num === 1) {
      if (pasos[1]) return;
      s.signalOn = true;
      s.signalDir = mision.dir;
      setPasos((p) => ({ ...p, 1: true }));
      setAlerta({ tipo: 'ok', texto: `Paso 1: Luz de cruce ${mision.dir.toUpperCase()} activada.` });
      tocarSonido('tic');
      return;
    }

    if (num === 2) {
      if (!pasos[1]) {
        setErrores((e) => e + 1);
        tocarSonido('error');
        vibrarSeguro(45);
        setAlerta({ tipo: 'error', texto: 'Falta Paso 1: Activa primero la Luz de Cruce.' });
        return;
      }
      s.laserTimer = 2.2;
      setPasos((p) => ({ ...p, 2: true }));
      setAlerta({ tipo: 'ok', texto: 'Paso 2: Distancia frontal verificada (24 m libres).' });
      tocarSonido('ok');
      return;
    }

    if (num === 3) {
      if (!pasos[2]) {
        setErrores((e) => e + 1);
        tocarSonido('error');
        vibrarSeguro(45);
        setAlerta({ tipo: 'error', texto: 'Completa primero Paso 1 (Luz) y Paso 2 (Dist. Frontal).' });
        return;
      }
      s.mirrorTimer = 2.4;
      setPasos((p) => ({ ...p, 3: true }));
      setAlerta({ tipo: 'ok', texto: 'Paso 3: Triángulo Invertido ▼ revisado en ambos retrovisores.' });
      tocarSonido('ok');
      return;
    }

    if (num === 4) {
      if (!pasos[3]) {
        setErrores((e) => e + 1);
        tocarSonido('error');
        vibrarSeguro(45);
        setAlerta({ tipo: 'error', texto: 'Revisa primero tus retrovisores (Paso 3) antes del giro de cabeza.' });
        return;
      }
      s.shoulderTimer = 1.9;
      if (s.blindActive && !s.blindCleared) {
        s.shoulderRes = 'ocupado';
        setCiegoEstado('ocupado');
        setPasos((p) => ({ ...p, 4: true }));
        tocarSonido('alerta');
        vibrarSeguro([50, 40, 50]);
        setAlerta({
          tipo: 'warn',
          texto: '¡PUNTO CIEGO OCUPADO! Pulsa "Desacelerar / Esperar" y repite el Paso 4.',
        });
      } else {
        s.shoulderRes = 'despejado';
        setCiegoEstado('despejado');
        setPasos((p) => ({ ...p, 4: true }));
        tocarSonido('ok');
        vibrarSeguro(25);
        setAlerta({
          tipo: 'ok',
          texto: 'Paso 4: Punto ciego DESPEJADO ✓. Espera línea discontinua y ejecuta Paso 5.',
        });
      }
      return;
    }

    if (num === 5) {
      if (pasos[5]) return;
      if (!pasos[1] || !pasos[2] || !pasos[3] || !pasos[4]) {
        setErrores((e) => e + 1);
        tocarSonido('alerta');
        vibrarSeguro([60, 40, 60]);
        setAlerta({
          tipo: 'error',
          texto: '¡Maniobra peligrosa! No puedes incorporarte saltando pasos previos.',
        });
        return;
      }
      if (ciegoEstado !== 'despejado') {
        setErrores((e) => e + 1);
        tocarSonido('alerta');
        vibrarSeguro([80, 40, 80]);
        setAlerta({
          tipo: 'error',
          texto: '¡Colisión en Punto Ciego! Debes liberar el espacio y confirmar con el Paso 4.',
        });
        return;
      }
      if (s.muroActivo) {
        setErrores((e) => e + 1);
        tocarSonido('muro');
        vibrarSeguro([70, 30, 70]);
        setAlerta({
          tipo: 'error',
          texto: '🧱 ¡Choque contra Muro! La línea actual es CONTINUA. Espera el tramo discontinuo.',
        });
        return;
      }

      s.targetLane = mision.destino;
      setPasos((p) => ({ ...p, 5: true }));
      tocarSonido('ok');
      setAlerta({
        tipo: 'ok',
        texto: 'Paso 5: Incorporación progresiva lograda. ¡Apaga la luz de cruce (Paso 6)!',
      });

      if (paso6TimerRef.current) clearTimeout(paso6TimerRef.current);
      paso6TimerRef.current = setTimeout(() => {
        setOlvidoPaso6(true);
        setErrores((e) => e + 1);
        tocarSonido('alerta');
        setAlerta({
          tipo: 'warn',
          texto: '¡Alerta Paso 6! Han pasado > 4s con la luz de cruce encendida. Apágala ya.',
        });
      }, 4000);
      return;
    }

    if (num === 6) {
      if (!pasos[5]) {
        setErrores((e) => e + 1);
        tocarSonido('error');
        setAlerta({ tipo: 'error', texto: 'Apaga la luz de cruce únicamente DESPUÉS de incorporarte (Paso 5).' });
        return;
      }
      if (pasos[6]) return;
      if (paso6TimerRef.current) clearTimeout(paso6TimerRef.current);
      s.signalOn = false;
      setOlvidoPaso6(false);
      setPasos((p) => ({ ...p, 6: true }));
      tocarSonido('fanfarria');
      vibrarSeguro([30, 40, 60]);
      setAlerta({ tipo: 'ok', texto: '¡6 Pasos completados impecablemente!' });

      nextTimerRef.current = setTimeout(() => {
        if (misionIdx < totalMisiones - 1) {
          cargarMision(misionIdx + 1);
        } else {
          setTerminado(true);
          const score = Math.max(40, 100 - errores * 12);
          if (score >= 70) {
            onMarcarDominado('pasos6', score);
          }
        }
      }, 1300);
    }
  };

  // Ajustar Canvas DPR
  const ajustarCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const cont = contRef.current;
    if (!canvas || !cont || cont.clientWidth === 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = cont.clientWidth;
    const h = Math.max(255, Math.min(310, Math.round(w * 0.72)));
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
  }, []);

  useEffect(() => {
    ajustarCanvas();
    window.addEventListener('resize', ajustarCanvas);
    return () => window.removeEventListener('resize', ajustarCanvas);
  }, [ajustarCanvas]);

  // Motor Canvas 60fps: autopista con tramos alternos de Muro (continua) y Portal (discontinua)
  useEffect(() => {
    const loop = (now) => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const W = canvas.width / dpr;
        const H = canvas.height / dpr;
        const s = simRef.current;

        const dt = Math.min(0.05, Math.max(0.001, (now - lastRef.current) / 1000));
        lastRef.current = now;

        if (!terminado) {
          s.scroll += 185 * dt;
          s.blinkPhase += dt;
          s.laneFloat += (s.targetLane - s.laneFloat) * Math.min(1, dt * 4.2);
          s.laserTimer = Math.max(0, s.laserTimer - dt);
          s.mirrorTimer = Math.max(0, s.mirrorTimer - dt);
          s.shoulderTimer = Math.max(0, s.shoulderTimer - dt);
          if (s.blindActive && s.blindCleared) {
            s.blindYOffset -= 155 * dt;
          }

          // Ciclo de demarcación: cada 720 px, 260 px son LÍNEA CONTINUA (Muro) y 460 px son DISCONTINUA (Portal)
          const cyclePos = (s.scroll + H * 0.65) % 720;
          s.muroActivo = cyclePos < 250;

          s.hudAcc += dt;
          if (s.hudAcc >= 0.12) {
            s.hudAcc = 0;
            setEsMuroAhora(s.muroActivo);
          }
        }

        ctx.save();
        ctx.scale(dpr, dpr);

        ctx.fillStyle = '#020617';
        ctx.fillRect(0, 0, W, H);

        const roadW = Math.min(W - 20, 320);
        const roadX = (W - roadW) / 2;
        const laneW = roadW / 3;
        const laneCX = (i) => roadX + (i + 0.5) * laneW;
        const motoX = laneCX(s.laneFloat);
        const motoY = H * 0.65;

        ctx.fillStyle = '#1E293B';
        ctx.fillRect(roadX, 0, roadW, H);

        // Resalte sutil del canal destino
        ctx.fillStyle = 'rgba(37, 99, 235, 0.12)';
        ctx.fillRect(roadX + mision.destino * laneW, 0, laneW, H);

        // Bordes exteriores
        ctx.strokeStyle = '#CBD5E1';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(roadX, 0);
        ctx.lineTo(roadX, H);
        ctx.moveTo(roadX + roadW, 0);
        ctx.lineTo(roadX + roadW, H);
        ctx.stroke();

        // Dibujo de líneas divisorias por segmentos (Muro continuo rojo/blanco vs Portal discontinuo)
        const segStep = 14;
        [roadX + laneW, roadX + laneW * 2].forEach((lx) => {
          for (let y = 0; y < H; y += segStep) {
            const worldY = (s.scroll + (H - y)) % 720;
            const esMuroSeg = worldY < 250;
            if (esMuroSeg) {
              ctx.strokeStyle = '#EF4444';
              ctx.lineWidth = 4.5;
              ctx.beginPath();
              ctx.moveTo(lx, y);
              ctx.lineTo(lx, y + segStep + 1);
              ctx.stroke();
            } else {
              if (Math.floor(worldY / 22) % 2 === 0) {
                ctx.strokeStyle = '#F8FAFC';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.moveTo(lx, y);
                ctx.lineTo(lx, y + segStep);
                ctx.stroke();
              }
            }
          }
        });

        // Indicador superior de demarcación en vivo
        ctx.fillStyle = s.muroActivo ? 'rgba(220, 38, 38, 0.92)' : 'rgba(5, 150, 105, 0.92)';
        ctx.beginPath();
        ctx.roundRect(W / 2 - 86, 8, 172, 20, 8);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 9.5px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(
          s.muroActivo ? '🧱 LÍNEA CONTINUA (ESPERA)' : '✓ DISCONTINUA (PORTAL LIBRE)',
          W / 2,
          21
        );

        // Auto frontal en canal inicial
        const fX = laneCX(mision.inicio);
        const fY = motoY - 96;
        ctx.fillStyle = '#64748B';
        ctx.beginPath();
        ctx.roundRect(fX - 16, fY - 22, 32, 44, 7);
        ctx.fill();
        ctx.fillStyle = '#EF4444';
        ctx.fillRect(fX - 12, fY + 18, 8, 3.5);
        ctx.fillRect(fX + 4, fY + 18, 8, 3.5);

        // Auto en punto ciego (si aplica)
        if (s.blindActive && motoY + s.blindYOffset > -50) {
          const bX = laneCX(mision.destino);
          const bY = motoY + s.blindYOffset;
          const visible = s.shoulderTimer > 0 || s.blindCleared;
          ctx.save();
          ctx.globalAlpha = visible ? 1 : 0.35;
          ctx.fillStyle = '#EF4444';
          ctx.beginPath();
          ctx.roundRect(bX - 15, bY - 22, 30, 44, 7);
          ctx.fill();
          ctx.strokeStyle = '#FCA5A5';
          ctx.lineWidth = 1.8;
          ctx.stroke();
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 7.5px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('CIEGO', bX, bY + 3);
          ctx.restore();
        }

        // Overlay Paso 2: Cota láser frontal
        if (s.laserTimer > 0) {
          ctx.strokeStyle = '#10B981';
          ctx.lineWidth = 2.5;
          ctx.setLineDash([5, 4]);
          ctx.beginPath();
          ctx.moveTo(motoX, motoY - 22);
          ctx.lineTo(fX, fY + 24);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Overlay Paso 3: Triángulo Invertido ▼ trasero
        if (s.mirrorTimer > 0) {
          ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
          ctx.beginPath();
          ctx.moveTo(motoX, motoY);
          ctx.lineTo(motoX - 95, motoY + 95);
          ctx.lineTo(motoX + 95, motoY + 95);
          ctx.closePath();
          ctx.fill();
        }

        // Overlay Paso 4: Arco de chequeo sobre el hombro
        if (s.shoulderTimer > 0) {
          const occ = s.shoulderRes === 'ocupado';
          ctx.fillStyle = occ ? 'rgba(239, 68, 68, 0.35)' : 'rgba(16, 185, 129, 0.32)';
          ctx.beginPath();
          ctx.moveTo(motoX, motoY);
          if (mision.dir === 'izq') {
            ctx.arc(motoX, motoY, 85, Math.PI * 0.65, Math.PI * 1.18);
          } else {
            ctx.arc(motoX, motoY, 85, -Math.PI * 0.18, Math.PI * 0.35);
          }
          ctx.closePath();
          ctx.fill();
        }

        // Moto del piloto
        ctx.save();
        ctx.translate(motoX, motoY);
        ctx.rotate((s.targetLane - s.laneFloat) * 0.22);
        ctx.fillStyle = '#2563EB';
        ctx.beginPath();
        ctx.roundRect(-6.5, -12, 13, 24, 5);
        ctx.fill();
        ctx.strokeStyle = '#CBD5E1';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-13, -7);
        ctx.lineTo(13, -7);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.fillStyle = '#F8FAFC';
        ctx.fill();
        ctx.strokeStyle = '#1D4ED8';
        ctx.lineWidth = 1.6;
        ctx.stroke();

        // Luz de cruce parpadeante
        const blink = s.signalOn && Math.floor(s.blinkPhase * 3.2) % 2 === 0;
        if (blink) {
          const sx = s.signalDir === 'izq' ? -13 : 13;
          ctx.fillStyle = '#FACC15';
          ctx.beginPath();
          ctx.arc(sx, -11, 4.5, 0, Math.PI * 2);
          ctx.arc(sx, 12, 4.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        ctx.restore();
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    lastRef.current = performance.now();
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [mision, terminado]);

  if (terminado) {
    const score = Math.max(40, 100 - errores * 12);
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-center space-y-4 animate-fadeIn">
        <div
          className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center ${
            score >= 70 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400'
          }`}
        >
          <Award className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-black text-white">
            Sistema de 6 Pasos Completado ({score}%)
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            {score >= 70
              ? '¡Módulo 5 Dominado! Integraste luces de cruce, espejos en triángulo invertido, chequeo físico y respeto a los muros viales.'
              : 'Completaste las misiones con varios avisos. Repite en modo Calle Real para automatizar la secuencia sin errores.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setErrores(0);
            setTerminado(false);
            cargarMision(0);
          }}
          className="w-full min-h-[48px] rounded-xl bg-[#2563EB] text-white font-black text-sm flex items-center justify-center gap-2 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Repetir Misiones</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2.5 pb-4 animate-fadeIn">
      {/* Cabecera Modo Guiado vs Calle Real */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <h2 className="text-sm font-black text-white truncate">6 Pasos · Integrado</h2>
          {dominado && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
        </div>

        <div className="inline-flex bg-slate-900 p-0.5 rounded-xl border border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => setModo('guiado')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold cursor-pointer ${
              modo === 'guiado' ? 'bg-[#2563EB] text-white' : 'text-slate-400'
            }`}
          >
            Guiado (3)
          </button>
          <button
            type="button"
            onClick={() => setModo('calle')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold cursor-pointer ${
              modo === 'calle' ? 'bg-[#F97316] text-slate-950' : 'text-slate-400'
            }`}
          >
            Calle Real (5)
          </button>
        </div>
      </div>

      {/* Consigna Misión Actual */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] font-black text-blue-400 uppercase">
            {mision.titulo} ({misionIdx + 1}/{totalMisiones})
          </div>
          <div className="text-[11px] text-slate-200 leading-tight">{mision.consigna}</div>
        </div>
        <span className="px-2 py-1 rounded-lg bg-slate-800 text-yellow-300 text-[10px] font-black shrink-0">
          {mision.dir === 'izq' ? '← IZQ' : 'DER →'}
        </span>
      </div>

      {/* ZONA SUPERIOR VISUAL: CANVAS 60FPS */}
      <div
        ref={contRef}
        className="relative bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-md"
      >
        <canvas ref={canvasRef} className="block w-full select-none" />

        {alerta && (
          <div
            className={`absolute bottom-2 left-2 right-2 px-3 py-2 rounded-xl text-[11px] font-extrabold border animate-fadeIn ${
              alerta.tipo === 'error'
                ? 'bg-red-600/95 border-red-300 text-white'
                : alerta.tipo === 'warn'
                ? 'bg-orange-500/95 border-yellow-300 text-slate-950'
                : 'bg-slate-950/90 border-emerald-400/60 text-emerald-200'
            }`}
          >
            {alerta.texto}
          </div>
        )}
      </div>

      {/* Botón rápido de emergencia cuando el Punto Ciego está ocupado */}
      {ciegoEstado === 'ocupado' && !simRef.current.blindCleared && (
        <button
          type="button"
          onClick={liberarPuntoCiego}
          className="w-full min-h-[46px] rounded-xl bg-[#F97316] text-slate-950 font-black text-xs flex items-center justify-center gap-2 animate-pulse active:scale-95 transition-transform cursor-pointer"
        >
          <ArrowDown className="w-4 h-4" />
          <span>− Desacelerar / Esperar (Liberar Punto Ciego)</span>
        </button>
      )}

      {/* Pista breve en Modo Guiado */}
      {modo === 'guiado' && siguienteSugerido && (
        <div className="px-3 py-2 rounded-xl bg-blue-500/15 border border-blue-500/35 text-[11px] text-blue-200 font-semibold">
          <strong className="text-white">Siguiente:</strong> {PASOS_CONSOLA[siguienteSugerido - 1].hint}
        </div>
      )}

      {/* ZONA DEL PULGAR: CONSOLA TÁCTIL 3x2 DE LOS 6 PASOS */}
      <div className="grid grid-cols-3 gap-2">
        {PASOS_CONSOLA.map((p) => {
          const hecho = pasos[p.num] && (p.num !== 4 || ciegoEstado === 'despejado');
          const sugerido = modo === 'guiado' && siguienteSugerido === p.num;
          const bloquearMuro = p.num === 5 && esMuroAhora && pasos[4] && ciegoEstado === 'despejado';
          const urgente6 = p.num === 6 && olvidoPaso6 && !pasos[6];

          return (
            <button
              key={p.num}
              type="button"
              onClick={() => ejecutarPaso(p.num)}
              className={`min-h-[54px] px-1.5 py-2 rounded-xl border-2 text-[11px] font-black flex flex-col items-center justify-center text-center touch-none select-none active:scale-95 transition-all cursor-pointer ${
                hecho
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                  : urgente6
                  ? 'bg-[#F97316] border-yellow-300 text-slate-950 animate-pulse'
                  : bloquearMuro
                  ? 'bg-red-500/20 border-red-400 text-red-200'
                  : sugerido
                  ? 'bg-[#2563EB] border-blue-300 text-white shadow-sm'
                  : 'bg-slate-900 border-slate-700 text-slate-200'
              }`}
            >
              <span>{hecho ? `✓ ${p.corto}` : p.corto}</span>
              {bloquearMuro && <span className="text-[8.5px] font-bold">🧱 Muro</span>}
            </button>
          );
        })}
      </div>

      <CajonTeoria titulo="Integración Legal del Sistema de 6 Pasos" badge="Dec. 8.495 Art. 32">
        <p>
          El cambio de canal seguro une todo lo entrenado en <strong>Moto App</strong>: anunciar con
          luz de cruce (<strong>Art. 32.4</strong>), evaluar distancia frontal y posterior con
          retrovisores en triángulo invertido, ejecutar chequeo físico sobre el hombro, respetar la
          demarcación discontinua (sin cruzar muros), incorporarse sin brusquedad (
          <strong>Art. 32.9</strong>) y cancelar la direccional al estabilizarte.
        </p>
      </CajonTeoria>
    </div>
  );
}

/* ============================================================================
 * 9. MODAL DE REPORTE GLOBAL DEL PILOTO (COPIABLE PARA WHATSAPP)
 * ============================================================================ */
function ModalReporteGlobal({ visible, onCerrar, dominios, nombrePiloto, setNombrePiloto, tocarSonido }) {
  const [copiado, setCopiado] = useState(false);

  if (!visible) return null;

  const listaModulos = [
    { id: 'espejos', nombre: '1. Retrovisores (Triángulo ▼)' },
    { id: 'luces', nombre: '2. Reglamento de Luces VE' },
    { id: 'circulo', nombre: '3. Omnidireccional + Círculo 2m' },
    { id: 'muros', nombre: '4. Analogía del Muro (Canales)' },
    { id: 'pasos6', nombre: '5. Sistema de 6 Pasos Integrado' },
  ];

  const completados = listaModulos.filter((m) => dominios[m.id]?.dominado).length;
  const insignia =
    completados === 5
      ? 'Piloto Omnidireccional Certificado (Moto App)'
      : completados >= 3
      ? 'Piloto Preventivo Avanzado'
      : completados >= 1
      ? 'Piloto en Entrenamiento Activo'
      : 'Evaluación Inicial en Progreso';

  const copiarWhatsApp = async () => {
    const fecha = new Date().toLocaleDateString('es-VE');
    const detalle = listaModulos
      .map((m) => {
        const st = dominios[m.id];
        return st?.dominado
          ? `✅ ${m.nombre}: Dominado (${st.puntaje}%)`
          : `⏳ ${m.nombre}: Pendiente`;
      })
      .join('\n');

    const texto = [
      `🏍️ *REPORTE GLOBAL — Moto App · MotoEscuelApp*`,
      `📅 Fecha: ${fecha}`,
      nombrePiloto.trim() ? `👤 Piloto: ${nombrePiloto.trim()}` : null,
      `🏆 Nivel: *${insignia}* (${completados}/5 módulos)`,
      `\n📊 *Progreso de Entrenamiento Omnidireccional VE:*\n${detalle}`,
      `\nℹ️ _${NOTA_LEGAL_MOTOAPP}_`,
    ]
      .filter(Boolean)
      .join('\n');

    const ok = await copiarTextoSeguro(texto);
    if (ok) {
      setCopiado(true);
      tocarSonido('ok');
      vibrarSeguro(30);
      setTimeout(() => setCopiado(false), 2500);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-reporte-global"
    >
      <div className="bg-slate-900 border border-slate-700 rounded-t-3xl sm:rounded-2xl max-w-md w-full max-h-[88dvh] flex flex-col overflow-hidden shadow-2xl">
        <div className="px-4 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-[#FACC15]" />
            <h3 id="titulo-reporte-global" className="text-sm font-black text-white">
              Reporte Global del Piloto
            </h3>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar reporte"
            className="p-2 rounded-xl bg-slate-800 text-slate-300 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-4">
          {/* Nombre del piloto sanitizado */}
          <div>
            <label htmlFor="piloto-nombre-mob" className="block text-[11px] font-bold text-slate-400 mb-1">
              Nombre del piloto (para compartir tu avance)
            </label>
            <input
              id="piloto-nombre-mob"
              type="text"
              maxLength={45}
              value={nombrePiloto}
              onChange={(e) => setNombrePiloto(sanitizarNombre(e.target.value))}
              placeholder="Ej: Armando Salas"
              className="w-full min-h-[44px] px-3 rounded-xl bg-slate-950 border border-slate-700 focus:border-[#2563EB] focus:outline-none text-sm text-white placeholder:text-slate-500"
            />
          </div>

          {/* Insignia de nivel */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#1D4ED8]/30 to-slate-950 border border-blue-500/40 flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-blue-300">
                Insignia Actual
              </div>
              <div className="text-sm font-black text-white">{insignia}</div>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-base font-black text-emerald-400 tabular-nums">
              {completados}/5
            </div>
          </div>

          {/* Desglose de los 5 módulos */}
          <div className="space-y-2">
            {listaModulos.map((m) => {
              const st = dominios[m.id];
              const ok = Boolean(st?.dominado);
              return (
                <div
                  key={m.id}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                    ok
                      ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <span className="font-bold">{m.nombre}</span>
                  <span className="font-black shrink-0">
                    {ok ? `✓ ${st.puntaje}%` : 'Pendiente'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Nota Legal Obligatoria */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[10px] text-slate-400 leading-relaxed">
            {NOTA_LEGAL_MOTOAPP}
          </div>
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-950 flex gap-2">
          <button
            type="button"
            onClick={copiarWhatsApp}
            className={`w-full min-h-[48px] rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer ${
              copiado ? 'bg-emerald-600 text-white' : 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white'
            }`}
          >
            {copiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copiado ? '¡Reporte Copiado!' : 'Copiar Reporte para WhatsApp'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
 * 10. APLICACIÓN PRINCIPAL MOBILE-FIRST (BOTTOM NAVIGATION DE 5 MÓDULOS)
 * ============================================================================ */
function MotoAppOmnidireccional() {
  const [moduloActivo, setModuloActivo] = useState('espejos'); // 'espejos' | 'luces' | 'circulo' | 'muros' | 'pasos6'
  const [audioOn, setAudioOn] = useState(true);
  const [mostrarReporte, setMostrarReporte] = useState(false);
  const [nombrePiloto, setNombrePiloto] = useState('');
  const [dominios, setDominios] = useState({
    espejos: { dominado: false, puntaje: 0 },
    luces: { dominado: false, puntaje: 0 },
    circulo: { dominado: false, puntaje: 0 },
    muros: { dominado: false, puntaje: 0 },
    pasos6: { dominado: false, puntaje: 0 },
  });

  const tocarSonido = useAudioMotoApp(audioOn);

  const marcarDominado = useCallback((id, puntaje) => {
    setDominios((prev) => ({
      ...prev,
      [id]: { dominado: true, puntaje: Math.max(prev[id]?.puntaje || 0, puntaje) },
    }));
  }, []);

  const totalDominados = useMemo(
    () => Object.values(dominios).filter((d) => d.dominado).length,
    [dominios]
  );

  const navItems = [
    { id: 'espejos', label: 'Espejos', icon: Compass },
    { id: 'luces', label: 'Luces', icon: Sun },
    { id: 'circulo', label: 'Círculo', icon: Radio },
    { id: 'muros', label: 'Muros', icon: Layers },
    { id: 'pasos6', label: '6 Pasos', icon: Navigation },
  ];

  return (
    <div className="min-h-[100dvh] bg-slate-950 sm:bg-slate-900/95 flex justify-center overflow-x-hidden">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.22s ease-out both;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* Contenedor Mobile-First (App Nativa centrada en escritorio, 100% pantalla en móvil) */}
      <div className="max-w-md w-full mx-auto min-h-[100dvh] flex flex-col bg-slate-950 text-slate-100 sm:border-x sm:border-slate-800 sm:shadow-2xl relative">
        {/* HEADER COMPACTO STICKY */}
        <header className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 px-3 py-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] flex items-center justify-center shrink-0 shadow-sm">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xs font-black tracking-tight text-white truncate">
                Moto App · Omnidireccional VE
              </h1>
              <div className="text-[10px] font-bold text-slate-400 truncate">
                MotoEscuelApp · Dominio{' '}
                <span className="text-emerald-400 font-black">{totalDominados}/5</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setAudioOn((v) => !v)}
              aria-label={audioOn ? 'Silenciar audio' : 'Activar audio'}
              className={`w-9 h-9 rounded-xl border flex items-center justify-center active:scale-95 transition-all cursor-pointer ${
                audioOn
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                  : 'bg-slate-900 border-slate-700 text-slate-500'
              }`}
            >
              {audioOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => {
                setMostrarReporte(true);
                tocarSonido('switch');
              }}
              className="h-9 px-2.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[11px] font-extrabold flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
            >
              <Award className="w-3.5 h-3.5 text-[#FACC15]" />
              <span>Reporte</span>
            </button>
          </div>
        </header>

        {/* CONTENIDO PRINCIPAL SCROLLEABLE (Con espacio inferior para la Bottom Navigation Bar) */}
        <main className="flex-1 px-3 pt-3 pb-20 overflow-x-hidden">
          {moduloActivo === 'espejos' && (
            <ModuloEspejos
              tocarSonido={tocarSonido}
              dominado={dominios.espejos.dominado}
              onMarcarDominado={marcarDominado}
            />
          )}
          {moduloActivo === 'luces' && (
            <ModuloLucesVE
              tocarSonido={tocarSonido}
              dominado={dominios.luces.dominado}
              onMarcarDominado={marcarDominado}
            />
          )}
          {moduloActivo === 'circulo' && (
            <ModuloCirculoOmnidireccional
              tocarSonido={tocarSonido}
              dominado={dominios.circulo.dominado}
              onMarcarDominado={marcarDominado}
            />
          )}
          {moduloActivo === 'muros' && (
            <ModuloMuros
              tocarSonido={tocarSonido}
              dominado={dominios.muros.dominado}
              onMarcarDominado={marcarDominado}
            />
          )}
          {moduloActivo === 'pasos6' && (
            <Modulo6PasosIntegrado
              tocarSonido={tocarSonido}
              dominado={dominios.pasos6.dominado}
              onMarcarDominado={marcarDominado}
            />
          )}
        </main>

        {/* BOTTOM NAVIGATION BAR FIJA (5 MÓDULOS + INDICADOR DE DOMINIO) */}
        <nav
          role="tablist"
          aria-label="Módulos del entrenador omnidireccional"
          className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-30 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 px-1.5 py-1.5 grid grid-cols-5 gap-1"
        >
          {navItems.map((item) => {
            const Icono = item.icon;
            const activo = moduloActivo === item.id;
            const listo = dominios[item.id]?.dominado;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={activo}
                onClick={() => {
                  setModuloActivo(item.id);
                  tocarSonido('switch');
                }}
                className={`relative min-h-[50px] rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 cursor-pointer ${
                  activo
                    ? 'bg-[#2563EB] text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {listo && (
                  <span
                    aria-label="Módulo dominado"
                    className="absolute top-1 right-1.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-slate-950"
                  />
                )}
                <Icono className="w-4 h-4 shrink-0" />
                <span className="text-[10px] font-extrabold leading-none">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* MODAL DE REPORTE GLOBAL DEL PILOTO */}
        <ModalReporteGlobal
          visible={mostrarReporte}
          onCerrar={() => setMostrarReporte(false)}
          dominios={dominios}
          nombrePiloto={nombrePiloto}
          setNombrePiloto={setNombrePiloto}
          tocarSonido={tocarSonido}
        />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MotoAppOmnidireccional />
    </ErrorBoundary>
  );
}