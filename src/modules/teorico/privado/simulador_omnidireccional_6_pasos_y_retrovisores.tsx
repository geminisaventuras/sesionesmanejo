import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Bike,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  Compass,
  Radar,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Play,
  Pause,
  RotateCcw,
  Copy,
  Check,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Award,
  Flame,
  Clock,
  Sliders,
  Sparkles,
  Scale,
  Target,
  Info,
  Link2,
  Unlink2,
  RefreshCw,
  Navigation,
  ScanEye,
  Activity,
  ChevronRight,
  Zap,
} from 'lucide-react';

/* ============================================================================
 * 1. LÍMITE DE ERRORES (ERROR BOUNDARY)
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
    console.error('Error en Simulador Omnidireccional:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-md w-full text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#EF4444] flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-extrabold text-slate-900">
              Ocurrió un inconveniente inesperado
            </h2>
            <p className="text-sm text-slate-600">
              Puedes reiniciar este módulo interactivo para continuar tu entrenamiento sin pérdida de acceso.
            </p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false })}
              className="w-full py-3 px-4 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-sm transition-colors cursor-pointer"
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

/* ============================================================================
 * 2. MOTOR DE AUDIO NATIVO (WEB AUDIO API SIN ARCHIVOS EXTERNOS)
 * ============================================================================ */
function useAudioVial(sonidoActivo) {
  const ctxRef = useRef(null);

  const obtenerCtx = useCallback(() => {
    if (!sonidoActivo) return null;
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
  }, [sonidoActivo]);

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
          // Sonido real de relé de direccional ("tic-tac")
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(tipo === 'tic' ? 1280 : 940, now);
          osc.frequency.exponentialRampToValueAtTime(tipo === 'tic' ? 620 : 480, now + 0.025);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.032);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.036);
        } else if (tipo === 'radar_ping') {
          // Ping suave de barrido radar
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, now);
          osc.frequency.exponentialRampToValueAtTime(1180, now + 0.09);
          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(0.06, now + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.15);
        } else if (tipo === 'alerta_ciego') {
          // Alerta urgente de punto ciego / colisión
          [0, 0.13].forEach((offset) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(340, now + offset);
            osc.frequency.linearRampToValueAtTime(220, now + offset + 0.1);
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(950, now + offset);
            gain.gain.setValueAtTime(0.11, now + offset);
            gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.11);
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + offset);
            osc.stop(now + offset + 0.12);
          });
        } else if (tipo === 'paso_ok') {
          // Tono claro de paso completado
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(587.33, now);
          osc.frequency.setValueAtTime(783.99, now + 0.07);
          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(0.09, now + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.24);
        } else if (tipo === 'fanfarria') {
          // Fanfarria breve de maniobra o calibración perfecta
          const notas = [523.25, 659.25, 783.99, 1046.5];
          notas.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            const t0 = now + i * 0.085;
            osc.frequency.setValueAtTime(freq, t0);
            gain.gain.setValueAtTime(0.001, t0);
            gain.gain.linearRampToValueAtTime(0.11, t0 + 0.018);
            gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.28);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t0);
            osc.stop(t0 + 0.3);
          });
        }
      } catch {
        // Silencioso ante políticas de autoplay
      }
    },
    [obtenerCtx]
  );

  return tocar;
}

/* ============================================================================
 * 3. UTILIDAD PARA COPIAR REPORTES CON FALLBACK SEGURO
 * ============================================================================ */
async function copiarTextoSeguro(texto) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
    const area = document.createElement('textarea');
    area.value = texto;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    document.body.removeChild(area);
    return true;
  } catch {
    return false;
  }
}

/* ============================================================================
 * 4. PESTAÑA 1: EMULADOR DE RETROVISORES — VISIÓN EN TRIÁNGULO INVERTIDO
 * ============================================================================ */

/**
 * Calcula las métricas ópticas de un espejo retrovisor individual:
 * - horiz: -15° (cerrado hacia el hombro) hasta +45° (demasiado abierto); óptimo 18°..28°
 * - vert: -15° (suelo) hasta +15° (cielo); óptimo -3°..+4°
 */
function evaluarEspejo(horiz, vert) {
  // Porcentaje de hombro visible en la esquina inferior interna (ideal 10%-15%)
  const hombroPct = Math.round(Math.max(0, Math.min(62, (32 - horiz) * 1.35)));
  const hombroOptimo = hombroPct >= 8 && hombroPct <= 18;

  // Cobertura del carril trasero central (se pierde si abres demasiado > 31° o inclinas mucho hacia cielo/suelo)
  const alcanceVerticalOk = vert >= -6 && vert <= 7;
  const carrilTraseroVisible = horiz <= 31 && alcanceVerticalOk;

  // Cobertura del carril lateral adyacente (se pierde si está muy cerrado < 13°)
  const carrilLateralVisible = horiz >= 13 && horiz <= 42 && vert >= -8 && vert <= 8;

  // Alcance reglamentario ≥ 70 m (Reglamento de la Ley de Tránsito Terrestre VE)
  const alcanceMetros = Math.round(
    Math.max(15, 115 - Math.abs(vert - 0.5) * 9.5 - Math.max(0, horiz - 32) * 2.1)
  );
  const cumple70m = alcanceMetros >= 70;

  // Eficiencia individual (0 - 100%)
  const errH =
    horiz < 18 ? 18 - horiz : horiz > 28 ? horiz - 28 : 0;
  const errV =
    vert < -3 ? -3 - vert : vert > 4 ? vert - 4 : 0;
  const scoreH = Math.max(0, 100 - errH * 3.8);
  const scoreV = Math.max(0, 100 - errV * 7.2);
  const eficiencia = Math.round(scoreH * 0.72 + scoreV * 0.28);

  return {
    hombroPct,
    hombroOptimo,
    carrilTraseroVisible,
    carrilLateralVisible,
    alcanceMetros,
    cumple70m,
    eficiencia,
  };
}

/**
 * Espejo Retrovisor en Primera Persona (SVG detallado y dinámico)
 */
function EspejoPrimeraPersonaSVG({ lado, horiz, vert, evalData, faseTrafico }) {
  const esIzq = lado === 'izq';
  const clipId = `clip-espejo-${lado}`;

  // Desplazamiento vertical del horizonte: vert > 0 apunta al cielo (horizonte baja en el espejo)
  const horizonY = 58 + vert * 2.5;

  // Desplazamiento horizontal del contenido según apertura (horiz óptimo = 23°)
  // Para el espejo izq: abrir más (horiz+) mueve el mundo a la derecha dentro del espejo, sacando el hombro hacia el borde derecho.
  const deltaH = horiz - 23;
  const dirSign = esIzq ? 1 : -1;

  // Posición X del borde del hombro (esquina inferior interna)
  // En espejo izq, borde interno es derecha (x ~ 225); en espejo der, borde interno es izquierda (x ~ 15)
  const shoulderShift = deltaH * 2.75 * dirSign;
  const shoulderBaseX = esIzq ? 196 + shoulderShift : 44 + shoulderShift;

  // Posición de los vehículos reflejados dentro del espejo
  // Auto trasero (carril central): en óptimo se ve cerca del borde interno
  const rearCarBaseX = esIzq ? 156 + deltaH * 3.1 : 84 - deltaH * 3.1;
  const rearCarPulse = Math.sin(faseTrafico * 1.1) * 4;
  const rearCarY = horizonY + 14 + rearCarPulse * 0.4;
  const rearCarScale = 0.85 + Math.sin(faseTrafico * 1.1) * 0.08;

  // Auto/moto lateral (carril adyacente): en óptimo se ve claramente en la mitad exterior
  const sideCarBaseX = esIzq ? 68 + deltaH * 3.1 : 172 - deltaH * 3.1;
  const sideCarWave = Math.cos(faseTrafico * 0.9 + (esIzq ? 0 : 1.4)) * 7;
  const sideCarY = horizonY + 28 + sideCarWave * 0.6;

  // Forma hexagonal/trapezoidal realista de espejo de motocicleta
  const pathEspejo = esIzq
    ? 'M 22 18 L 214 14 Q 230 14 230 30 L 224 106 Q 222 122 206 122 L 32 118 Q 12 118 10 100 L 10 34 Q 10 18 22 18 Z'
    : 'M 26 14 L 218 18 Q 230 18 230 34 L 230 100 Q 228 118 208 118 L 34 122 Q 18 122 16 106 L 10 30 Q 10 14 26 14 Z';

  return (
    <div className="bg-[#0F172A] rounded-2xl border border-slate-700/80 p-3.5 space-y-3 shadow-md">
      {/* Encabezado espejo */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              evalData.eficiencia >= 88
                ? 'bg-[#10B981]'
                : evalData.eficiencia >= 60
                ? 'bg-[#F59E0B]'
                : 'bg-[#EF4444]'
            }`}
          />
          <span className="text-xs font-extrabold text-white">
            Retrovisor {esIzq ? 'Izquierdo' : 'Derecho'}
          </span>
        </div>
        <span className="text-[11px] font-bold text-slate-300 tabular-nums">
          {horiz > 0 ? `+${horiz}°` : `${horiz}°`} H · {vert > 0 ? `+${vert}°` : `${vert}°`} V
        </span>
      </div>

      {/* Lienzo del Espejo SVG */}
      <svg
        viewBox="0 0 240 136"
        className="w-full h-auto block select-none"
        role="img"
        aria-label={`Vista en primera persona del espejo retrovisor ${esIzq ? 'izquierdo' : 'derecho'}`}
      >
        <defs>
          <clipPath id={clipId}>
            <path d={pathEspejo} />
          </clipPath>
          <linearGradient id={`sky-${lado}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1E3A8A" />
            <stop offset="100%" stopColor="#7DD3FC" />
          </linearGradient>
        </defs>

        {/* Carcasa exterior del retrovisor */}
        <path
          d={pathEspejo}
          fill="#020617"
          stroke={
            evalData.eficiencia >= 88
              ? '#10B981'
              : evalData.eficiencia >= 60
              ? '#F59E0B'
              : '#EF4444'
          }
          strokeWidth="3.5"
        />

        {/* Contenido reflejado con recorte exacto al vidrio */}
        <g clipPath={`url(#${clipId})`}>
          {/* Cielo */}
          <rect x="0" y="-40" width="240" height={Math.max(10, horizonY + 40)} fill={`url(#sky-${lado})`} />

          {/* Asfalto */}
          <rect x="0" y={horizonY} width="240" height="180" fill="#1E293B" />

          {/* Línea de horizonte */}
          <line x1="0" y1={horizonY} x2="240" y2={horizonY} stroke="#93C5FD" strokeWidth="1.2" opacity="0.65" />

          {/* Líneas de perspectiva de carriles */}
          <line
            x1={esIzq ? 142 + deltaH * 1.4 : 98 - deltaH * 1.4}
            y1={horizonY}
            x2={esIzq ? 116 + deltaH * 3.2 : 124 - deltaH * 3.2}
            y2={horizonY + 95}
            stroke="#E2E8F0"
            strokeWidth="2.2"
            strokeDasharray="7 5"
          />
          <line
            x1={esIzq ? 186 + deltaH * 1.4 : 54 - deltaH * 1.4}
            y1={horizonY}
            x2={esIzq ? 220 + deltaH * 3.2 : 20 - deltaH * 3.2}
            y2={horizonY + 95}
            stroke="#F59E0B"
            strokeWidth="2"
            opacity="0.7"
          />

          {/* Vehículo en CARRIL TRASERO (detrás de ti) */}
          <g transform={`translate(${rearCarBaseX}, ${rearCarY}) scale(${rearCarScale})`}>
            <rect x="-18" y="-11" width="36" height="20" rx="5" fill="#E2E8F0" stroke="#475569" strokeWidth="1.2" />
            <rect x="-13" y="-9" width="26" height="8" rx="2" fill="#0F172A" />
            {/* Faros del auto trasero */}
            <circle cx="-12" cy="3" r="3" fill="#FEF08A" />
            <circle cx="12" cy="3" r="3" fill="#FEF08A" />
            <text y="-14" textAnchor="middle" fill="#E0F2FE" fontSize="7.5" fontWeight="bold">
              ATRÁS
            </text>
          </g>

          {/* Vehículo en CARRIL LATERAL ADYACENTE */}
          <g transform={`translate(${sideCarBaseX}, ${sideCarY})`}>
            {esIzq ? (
              <>
                <rect x="-21" y="-13" width="42" height="23" rx="6" fill="#38BDF8" stroke="#0369A1" strokeWidth="1.4" />
                <rect x="-15" y="-10" width="30" height="9" rx="2" fill="#0F172A" />
                <circle cx="-14" cy="4" r="3.2" fill="#FEF08A" />
                <circle cx="14" cy="4" r="3.2" fill="#FEF08A" />
              </>
            ) : (
              <>
                {/* Moto en el carril derecho */}
                <rect x="-8" y="-15" width="16" height="28" rx="6" fill="#F59E0B" stroke="#78350F" strokeWidth="1.2" />
                <circle cx="0" cy="-9" r="5" fill="#0F172A" />
                <circle cx="0" cy="4" r="3.8" fill="#FEF08A" />
              </>
            )}
            <text y="-17" textAnchor="middle" fill="#FDE68A" fontSize="7.5" fontWeight="bold">
              LATERAL
            </text>
          </g>

          {/* Borde del Hombro / Chaqueta del Piloto (Esquina inferior interna) */}
          <path
            d={
              esIzq
                ? `M ${shoulderBaseX} 134 C ${shoulderBaseX - 4} 96, ${shoulderBaseX + 16} 76, ${shoulderBaseX + 64} 72 L ${shoulderBaseX + 120} 134 Z`
                : `M ${shoulderBaseX} 134 C ${shoulderBaseX + 4} 96, ${shoulderBaseX - 16} 76, ${shoulderBaseX - 64} 72 L ${shoulderBaseX - 120} 134 Z`
            }
            fill="#0F172A"
            stroke="#334155"
            strokeWidth="2"
          />
          {/* Franja reflectiva del brazo/hombro */}
          <path
            d={
              esIzq
                ? `M ${shoulderBaseX + 10} 128 C ${shoulderBaseX + 12} 102, ${shoulderBaseX + 26} 88, ${shoulderBaseX + 46} 84`
                : `M ${shoulderBaseX - 10} 128 C ${shoulderBaseX - 12} 102, ${shoulderBaseX - 26} 88, ${shoulderBaseX - 46} 84`
            }
            fill="none"
            stroke="#38BDF8"
            strokeWidth="2.5"
            opacity="0.7"
          />

          {/* Brillo sutil del vidrio */}
          <path d="M 20 20 L 75 20 L 38 118 L 12 118 Z" fill="#FFFFFF" opacity="0.06" />
        </g>
      </svg>

      {/* Indicadores en vivo debajo del espejo */}
      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
        <div
          className={`px-2 py-1.5 rounded-lg border flex items-center justify-between ${
            evalData.hombroOptimo
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-slate-800/80 border-slate-700 text-slate-300'
          }`}
        >
          <span>Hombro</span>
          <strong className="tabular-nums">{evalData.hombroPct}%</strong>
        </div>

        <div
          className={`px-2 py-1.5 rounded-lg border flex items-center justify-between ${
            evalData.cumple70m
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/15 border-red-500/40 text-red-300'
          }`}
        >
          <span>Alcance</span>
          <strong className="tabular-nums">{evalData.alcanceMetros} m</strong>
        </div>

        <div
          className={`px-2 py-1.5 rounded-lg border flex items-center justify-between ${
            evalData.carrilTraseroVisible
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/15 border-red-500/40 text-red-300'
          }`}
        >
          <span>Atrás</span>
          <strong>{evalData.carrilTraseroVisible ? 'Visible' : 'Oculto'}</strong>
        </div>

        <div
          className={`px-2 py-1.5 rounded-lg border flex items-center justify-between ${
            evalData.carrilLateralVisible
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/15 border-red-500/40 text-red-300'
          }`}
        >
          <span>Lateral</span>
          <strong>{evalData.carrilLateralVisible ? 'Visible' : 'Oculto'}</strong>
        </div>
      </div>
    </div>
  );
}

/**
 * Vista Cenital Geométrica: Triángulo Invertido (vértice hacia abajo) y Puntos Ciegos
 */
function VistaCenitalTrianguloSVG({ leftH, rightH, leftV, rightV, faseTrafico, ocultarGuia }) {
  // Coordenadas base de la motocicleta en carril central (x=200, y=136)
  const bikeX = 200;
  const bikeY = 136;

  // Conversión de ángulos de apertura a proyección geométrica en vista cenital
  // Apertura óptima ~23°: cada abanico cubre retaguardia central y se abre ampliamente hacia los carriles laterales
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const rangeL = clamp(165 - Math.abs(leftV) * 6, 85, 175);
  const rangeR = clamp(165 - Math.abs(rightV) * 6, 85, 175);

  // Espejo Izquierdo (origen x=186, y=126)
  // Ángulo central del haz: cuando leftH=-15° apunta hacia el centro (+6°), cuando leftH=23° apunta a -26° (hacia atrás-izquierda), cuando leftH=45° apunta a -50° (muy abierto)
  const degToRad = (d) => (d * Math.PI) / 180;
  const leftCenterDeg = 90 + 18 + leftH * 0.92; // 90° es directamente hacia abajo (+Y). Mayor ángulo abre a la izquierda (-X).
  const leftHalfSpread = 23;
  const lInnerRad = degToRad(leftCenterDeg - leftHalfSpread);
  const lOuterRad = degToRad(leftCenterDeg + leftHalfSpread);

  const lStart = { x: 186, y: 126 };
  const lInnerEnd = {
    x: lStart.x + Math.cos(lInnerRad) * rangeL,
    y: lStart.y + Math.sin(lInnerRad) * rangeL,
  };
  const lOuterEnd = {
    x: lStart.x + Math.cos(lOuterRad) * rangeL,
    y: lStart.y + Math.sin(lOuterRad) * rangeL,
  };

  // Espejo Derecho (origen x=214, y=126)
  // Menor que 90° abre hacia la derecha (+X)
  const rightCenterDeg = 90 - 18 - rightH * 0.92;
  const rightHalfSpread = 23;
  const rInnerRad = degToRad(rightCenterDeg + rightHalfSpread);
  const rOuterRad = degToRad(rightCenterDeg - rightHalfSpread);

  const rStart = { x: 214, y: 126 };
  const rInnerEnd = {
    x: rStart.x + Math.cos(rInnerRad) * rangeR,
    y: rStart.y + Math.sin(rInnerRad) * rangeR,
  };
  const rOuterEnd = {
    x: rStart.x + Math.cos(rOuterRad) * rangeR,
    y: rStart.y + Math.sin(rOuterRad) * rangeR,
  };

  // Zonas rojas de Punto Ciego residual (se encogen cuando leftH / rightH están entre 18° y 28°)
  const blindSizeL = clamp(56 - leftH * 1.15, 16, 74);
  const blindSizeR = clamp(56 - rightH * 1.15, 16, 74);
  // Punto ciego trasero central si ambos espejos están excesivamente abiertos (> 30°)
  const rearGapOpen = Math.max(0, (leftH + rightH) / 2 - 29);

  // Posiciones animadas de vehículos de prueba
  const rearY = 262 + Math.sin(faseTrafico * 1.1) * 18;
  const leftCarY = 198 + Math.cos(faseTrafico * 0.9) * 34;
  const rightMotoY = 205 + Math.cos(faseTrafico * 0.9 + 1.4) * 34;

  // Geometría explícita del Triángulo Invertido (vértice apuntando hacia abajo en el eje posterior, base ancha abriéndose hacia ambos carriles laterales)
  const triLeftX = clamp(128 - leftH * 2.1, 46, 175);
  const triRightX = clamp(272 + rightH * 2.1, 225, 354);
  const triTopY = 148;
  const triBottomY = clamp(292 - rearGapOpen * 3.5, 225, 296);

  return (
    <div className="bg-[#0F172A] rounded-2xl border border-slate-800 p-3.5 shadow-md space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-extrabold text-white">
            Vista Cenital — Geometría en Triángulo Invertido (▼)
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold">
          <span className="inline-flex items-center gap-1 text-cyan-300">
            <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400/50 border border-cyan-300" />
            Espejo Izq
          </span>
          <span className="inline-flex items-center gap-1 text-blue-300">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-500/50 border border-blue-400" />
            Espejo Der
          </span>
          <span className="inline-flex items-center gap-1 text-red-300">
            <span className="w-2.5 h-2.5 rounded-sm bg-red-500/45 border border-red-400" />
            Punto Ciego
          </span>
        </div>
      </div>

      <svg
        viewBox="0 0 400 326"
        className="w-full h-auto block rounded-xl bg-slate-950 border border-slate-800 select-none"
        role="img"
        aria-label="Diagrama cenital de autopista de 3 carriles mostrando cobertura de retrovisores en triángulo invertido y puntos ciegos"
      >
        {/* Autopista de 3 carriles */}
        <rect x="34" y="0" width="332" height="326" fill="#1E293B" />
        {/* Bordes blancos */}
        <line x1="36" y1="0" x2="36" y2="326" stroke="#CBD5E1" strokeWidth="2.5" />
        <line x1="364" y1="0" x2="364" y2="326" stroke="#CBD5E1" strokeWidth="2.5" />
        {/* Divisorias de los 3 carriles (x=145 y x=255) */}
        <line x1="145" y1="0" x2="145" y2="326" stroke="#E2E8F0" strokeWidth="2" strokeDasharray="14 12" />
        <line x1="255" y1="0" x2="255" y2="326" stroke="#E2E8F0" strokeWidth="2" strokeDasharray="14 12" />

        {/* Etiquetas de carriles */}
        <text x="90" y="18" textAnchor="middle" fill="#64748B" fontSize="9" fontWeight="bold">
          CARRIL IZQUIERDO
        </text>
        <text x="200" y="18" textAnchor="middle" fill="#94A3B8" fontSize="9" fontWeight="bold">
          TU CARRIL (CENTRAL)
        </text>
        <text x="310" y="18" textAnchor="middle" fill="#64748B" fontSize="9" fontWeight="bold">
          CARRIL DERECHO
        </text>

        {/* Flecha de avance */}
        <path d="M 200 76 L 200 44" stroke="#38BDF8" strokeWidth="2" strokeDasharray="4 3" opacity="0.6" />
        <polygon points="200,36 195,46 205,46" fill="#38BDF8" opacity="0.6" />

        {/* Cono de cobertura ESPEJO IZQUIERDO (Cian) */}
        <polygon
          points={`${lStart.x},${lStart.y} ${lOuterEnd.x},${lOuterEnd.y} ${lInnerEnd.x},${lInnerEnd.y}`}
          fill="#06B6D4"
          fillOpacity="0.26"
          stroke="#22D3EE"
          strokeWidth="1.5"
        />

        {/* Cono de cobertura ESPEJO DERECHO (Azul) */}
        <polygon
          points={`${rStart.x},${rStart.y} ${rInnerEnd.x},${rInnerEnd.y} ${rOuterEnd.x},${rOuterEnd.y}`}
          fill="#2563EB"
          fillOpacity="0.28"
          stroke="#60A5FA"
          strokeWidth="1.5"
        />

        {/* Contorno explícito del TRIÁNGULO INVERTIDO (vértice abajo, apertura amplia hacia ambos carriles laterales) */}
        {!ocultarGuia && (
          <g>
            <polygon
              points={`${triLeftX},${triTopY} ${triRightX},${triTopY} 200,${triBottomY}`}
              fill="none"
              stroke="#38BDF8"
              strokeWidth="2"
              strokeDasharray="6 4"
            />
            {/* Vértice inferior resaltado */}
            <circle cx="200" cy={triBottomY} r="4.5" fill="#38BDF8" />
            <rect x="135" y={Math.min(303, triBottomY + 6)} width="130" height="16" rx="5" fill="#0F172A" opacity="0.88" />
            <text
              x="200"
              y={Math.min(314, triBottomY + 17)}
              textAnchor="middle"
              fill="#7DD3FC"
              fontSize="8.5"
              fontWeight="bold"
            >
              ▼ VÉRTICE TRIÁNGULO INVERTIDO
            </text>
          </g>
        )}

        {/* ZONAS ROJAS DE PUNTO CIEGO LATERAL RESIDUAL */}
        <polygon
          points={`184,126 ${130 - blindSizeL * 0.65},${132 + blindSizeL * 0.45} ${138 - blindSizeL * 0.35},${156 + blindSizeL * 0.72} 184,158`}
          fill="#EF4444"
          fillOpacity="0.34"
          stroke="#F87171"
          strokeWidth="1.3"
          strokeDasharray="4 3"
        />
        <polygon
          points={`216,126 ${270 + blindSizeR * 0.65},${132 + blindSizeR * 0.45} ${262 + blindSizeR * 0.35},${156 + blindSizeR * 0.72} 216,158`}
          fill="#EF4444"
          fillOpacity="0.34"
          stroke="#F87171"
          strokeWidth="1.3"
          strokeDasharray="4 3"
        />

        {/* Punto ciego trasero si están demasiado abiertos */}
        {rearGapOpen > 2 && (
          <polygon
            points={`200,164 ${200 - rearGapOpen * 3.1},318 ${200 + rearGapOpen * 3.1},318`}
            fill="#EF4444"
            fillOpacity="0.36"
            stroke="#EF4444"
            strokeWidth="1.5"
            strokeDasharray="5 4"
          />
        )}

        {/* Etiquetas Punto Ciego */}
        <text x="112" y="138" textAnchor="middle" fill="#FCA5A5" fontSize="8" fontWeight="bold">
          P. CIEGO
        </text>
        <text x="288" y="138" textAnchor="middle" fill="#FCA5A5" fontSize="8" fontWeight="bold">
          P. CIEGO
        </text>

        {/* Auto en CARRIL LATERAL IZQUIERDO */}
        <g transform={`translate(90, ${leftCarY})`}>
          <rect x="-18" y="-26" width="36" height="52" rx="8" fill="#38BDF8" stroke="#E0F2FE" strokeWidth="1.4" />
          <rect x="-13" y="-15" width="26" height="11" rx="2" fill="#0F172A" />
          <rect x="-13" y="10" width="26" height="9" rx="2" fill="#0F172A" />
        </g>

        {/* Moto en CARRIL LATERAL DERECHO */}
        <g transform={`translate(310, ${rightMotoY})`}>
          <rect x="-6" y="-18" width="12" height="36" rx="5" fill="#F59E0B" stroke="#FEF3C7" strokeWidth="1.3" />
          <circle cx="0" cy="-2" r="5" fill="#0F172A" />
        </g>

        {/* Vehículo DETRÁS en tu carril */}
        <g transform={`translate(200, ${rearY})`}>
          <rect x="-19" y="-25" width="38" height="50" rx="8" fill="#CBD5E1" stroke="#475569" strokeWidth="1.4" />
          <rect x="-14" y="-14" width="28" height="11" rx="2" fill="#0F172A" />
          <circle cx="-11" cy="-24" r="2.5" fill="#FEF08A" />
          <circle cx="11" cy="-24" r="2.5" fill="#FEF08A" />
        </g>

        {/* MOTOCICLETA DEL PILOTO EN CARRIL CENTRAL */}
        <g transform={`translate(${bikeX}, ${bikeY})`}>
          {/* Haz frontal encendido 24h */}
          <polygon points="-4,-22 -20,-64 20,-64 4,-22" fill="#FEF08A" fillOpacity="0.22" />
          {/* Cauchos */}
          <rect x="-4.5" y="-22" width="9" height="14" rx="3" fill="#020617" />
          <rect x="-5" y="10" width="10" height="14" rx="3" fill="#020617" />
          {/* Manubrio + espejos */}
          <line x1="-16" y1="-9" x2="16" y2="-9" stroke="#CBD5E1" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="-14" cy="-10" r="3" fill="#22D3EE" />
          <circle cx="14" cy="-10" r="3" fill="#60A5FA" />
          {/* Chasis y casco */}
          <rect x="-7" y="-12" width="14" height="24" rx="6" fill="#2563EB" />
          <circle cx="0" cy="0" r="7.5" fill="#F8FAFC" stroke="#1D4ED8" strokeWidth="2" />
        </g>
      </svg>

      {/* Nota obligatoria sobre punto ciego residual y Paso 4 */}
      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
        <span>
          Incluso con el <strong>Triángulo Invertido óptimo</strong>, persiste un pequeño ángulo
          ciego lateral (zonas rojas) que solo se elimina ejecutando el{' '}
          <strong>Chequeo Físico sobre el hombro (Paso 4)</strong>.
        </span>
      </div>
    </div>
  );
}

function PestanaRetrovisores({ tocarSonido }) {
  const [leftH, setLeftH] = useState(23);
  const [leftV, setLeftV] = useState(0);
  const [rightH, setRightH] = useState(23);
  const [rightV, setRightV] = useState(0);
  const [vincularSimetria, setVincularSimetria] = useState(true);
  const [moverTrafico, setMoverTrafico] = useState(true);
  const [faseTrafico, setFaseTrafico] = useState(0);

  // Modo Reto: Descalibrar y Calibrar
  const [modoReto, setModoReto] = useState(false);
  const [insigniaGanada, setInsigniaGanada] = useState(false);

  // Animación fluida del tráfico en los espejos y vista cenital
  useEffect(() => {
    if (!moverTrafico) return undefined;
    let rafId;
    let last = performance.now();
    const animar = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      setFaseTrafico((prev) => prev + dt * 1.4);
      rafId = requestAnimationFrame(animar);
    };
    rafId = requestAnimationFrame(animar);
    return () => cancelAnimationFrame(rafId);
  }, [moverTrafico]);

  const evalIzq = useMemo(() => evaluarEspejo(leftH, leftV), [leftH, leftV]);
  const evalDer = useMemo(() => evaluarEspejo(rightH, rightV), [rightH, rightV]);
  const eficienciaTotal = Math.round((evalIzq.eficiencia + evalDer.eficiencia) / 2);

  // Detectar aprobación automática del Modo Reto al llegar a ≥ 90%
  useEffect(() => {
    if (modoReto && !insigniaGanada && eficienciaTotal >= 90) {
      setInsigniaGanada(true);
      tocarSonido('fanfarria');
    }
  }, [modoReto, insigniaGanada, eficienciaTotal, tocarSonido]);

  const cambiarLeftH = (val) => {
    setLeftH(val);
    if (vincularSimetria) setRightH(val);
  };
  const cambiarLeftV = (val) => {
    setLeftV(val);
    if (vincularSimetria) setRightV(val);
  };
  const cambiarRightH = (val) => {
    setRightH(val);
    if (vincularSimetria) setLeftH(val);
  };
  const cambiarRightV = (val) => {
    setRightV(val);
    if (vincularSimetria) setLeftV(val);
  };

  const aplicarPreset = (h, v) => {
    setModoReto(false);
    setLeftH(h);
    setRightH(h);
    setLeftV(v);
    setRightV(v);
    tocarSonido('paso_ok');
  };

  const activarModoReto = () => {
    const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    // Valores claramente descalibrados fuera de la ventana óptima
    const hL = Math.random() > 0.5 ? rand(-14, 4) : rand(36, 44);
    const hR = Math.random() > 0.5 ? rand(-14, 4) : rand(36, 44);
    const vL = Math.random() > 0.5 ? rand(-13, -7) : rand(8, 13);
    const vR = Math.random() > 0.5 ? rand(-13, -7) : rand(8, 13);
    setVincularSimetria(false);
    setLeftH(hL);
    setRightH(hR);
    setLeftV(vL);
    setRightV(vR);
    setModoReto(true);
    setInsigniaGanada(false);
    tocarSonido('radar_ping');
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Barra superior de eficiencia + Modo Reto + Tráfico */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm border ${
                eficienciaTotal >= 90
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : eficienciaTotal >= 65
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-red-50 text-red-700 border-red-200'
              }`}
            >
              {eficienciaTotal}%
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Eficiencia de Cobertura
              </div>
              <div className="text-xs sm:text-sm font-extrabold text-slate-900">
                {eficienciaTotal >= 90
                  ? 'Triángulo Invertido Óptimo'
                  : eficienciaTotal >= 65
                  ? 'Calibración Parcial — Ajusta apertura'
                  : 'Puntos Ciegos Elevados'}
              </div>
            </div>
          </div>

          {insigniaGanada && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-600 text-white text-xs font-extrabold shadow-xs animate-fadeIn">
              <Award className="w-4 h-4" />
              <span>Insignia: Espejos Calibrados</span>
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setMoverTrafico((m) => !m)}
            className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            {moverTrafico ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{moverTrafico ? 'Pausar tráfico' : 'Mover tráfico'}</span>
          </button>

          <button
            type="button"
            onClick={activarModoReto}
            className="py-2 px-3.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Target className="w-3.5 h-3.5" />
            <span>Modo Reto: Descalibrar y Calibrar</span>
          </button>
        </div>
      </section>

      {/* Banner de Modo Reto */}
      {modoReto && (
        <div
          className={`rounded-2xl border-2 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn ${
            insigniaGanada
              ? 'bg-emerald-50 border-emerald-400 text-emerald-950'
              : 'bg-blue-50 border-[#2563EB] text-slate-900'
          }`}
        >
          <div className="flex items-start gap-2.5 text-xs sm:text-sm">
            {insigniaGanada ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <Sparkles className="w-5 h-5 text-[#2563EB] shrink-0 mt-0.5" />
            )}
            <div>
              <strong className="block">
                {insigniaGanada
                  ? '¡Calibración aprobada! Desbloqueaste la insignia "Espejos Calibrados"'
                  : 'Reto Activo: Guía oculta — Calibra ambos espejos hasta lograr ≥ 90% de Eficiencia'}
              </strong>
              <span className="text-xs opacity-85">
                {insigniaGanada
                  ? 'Tus dos retrovisores muestran 10%-15% de hombro, carril trasero, carriles laterales y alcance ≥ 70 m.'
                  : 'Usa los deslizadores izquierdo y derecho observando lo que refleja cada espejo en primera persona.'}
              </span>
            </div>
          </div>
          {insigniaGanada && (
            <button
              type="button"
              onClick={() => setModoReto(false)}
              className="shrink-0 py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold cursor-pointer"
            >
              Mostrar guía nuevamente
            </button>
          )}
        </div>
      )}

      {/* Dos Espejos en Primera Persona */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <EspejoPrimeraPersonaSVG
          lado="izq"
          horiz={leftH}
          vert={leftV}
          evalData={evalIzq}
          faseTrafico={faseTrafico}
        />
        <EspejoPrimeraPersonaSVG
          lado="der"
          horiz={rightH}
          vert={rightV}
          evalData={evalDer}
          faseTrafico={faseTrafico}
        />
      </div>

      {/* Vista Cenital + Panel de Calibración */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-6">
          <VistaCenitalTrianguloSVG
            leftH={leftH}
            rightH={rightH}
            leftV={leftV}
            rightV={rightV}
            faseTrafico={faseTrafico}
            ocultarGuia={modoReto && !insigniaGanada}
          />
        </div>

        {/* Controles de Calibración + Presets */}
        <section className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#2563EB]" />
              <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                Controles de Calibración
              </h2>
            </div>

            <button
              type="button"
              onClick={() => {
                const next = !vincularSimetria;
                setVincularSimetria(next);
                if (next) {
                  setRightH(leftH);
                  setRightV(leftV);
                }
              }}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold border flex items-center gap-1.5 cursor-pointer transition-colors ${
                vincularSimetria
                  ? 'bg-blue-50 border-blue-200 text-[#2563EB]'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              {vincularSimetria ? <Link2 className="w-3.5 h-3.5" /> : <Unlink2 className="w-3.5 h-3.5" />}
              <span>Vincular simetría: {vincularSimetria ? 'ON' : 'OFF'}</span>
            </button>
          </div>

          {/* Sliders Izquierdo */}
          <div className="space-y-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="text-xs font-extrabold text-slate-800 flex items-center justify-between">
              <span>Retrovisor Izquierdo</span>
              {!modoReto && (
                <span className="text-[10px] font-bold text-[#2563EB]">
                  Óptimo: +18° a +28° H · -3° a +4° V
                </span>
              )}
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                <span>Apertura Horizontal (Cerrado ↔ Abierto)</span>
                <span className="text-slate-900 tabular-nums">{leftH}°</span>
              </div>
              <input
                type="range"
                min={-15}
                max={45}
                value={leftH}
                onChange={(e) => cambiarLeftH(Number(e.target.value))}
                aria-label="Apertura horizontal espejo izquierdo"
                className="w-full accent-[#2563EB] h-2 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                <span>Inclinación Vertical (Suelo ↔ Cielo)</span>
                <span className="text-slate-900 tabular-nums">{leftV}°</span>
              </div>
              <input
                type="range"
                min={-15}
                max={15}
                value={leftV}
                onChange={(e) => cambiarLeftV(Number(e.target.value))}
                aria-label="Inclinación vertical espejo izquierdo"
                className="w-full accent-[#2563EB] h-2 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* Sliders Derecho */}
          <div className="space-y-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="text-xs font-extrabold text-slate-800 flex items-center justify-between">
              <span>Retrovisor Derecho</span>
              {vincularSimetria && (
                <span className="text-[10px] font-bold text-slate-400">Sincronizado con Izq.</span>
              )}
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                <span>Apertura Horizontal (Cerrado ↔ Abierto)</span>
                <span className="text-slate-900 tabular-nums">{rightH}°</span>
              </div>
              <input
                type="range"
                min={-15}
                max={45}
                value={rightH}
                onChange={(e) => cambiarRightH(Number(e.target.value))}
                aria-label="Apertura horizontal espejo derecho"
                className="w-full accent-[#2563EB] h-2 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                <span>Inclinación Vertical (Suelo ↔ Cielo)</span>
                <span className="text-slate-900 tabular-nums">{rightV}°</span>
              </div>
              <input
                type="range"
                min={-15}
                max={15}
                value={rightV}
                onChange={(e) => cambiarRightV(Number(e.target.value))}
                aria-label="Inclinación vertical espejo derecho"
                className="w-full accent-[#2563EB] h-2 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* 3 Presets Comparativos */}
          <div className="space-y-2">
            <div className="text-xs font-extrabold text-slate-700">
              Presets comparativos instantáneos:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => aplicarPreset(-8, -2)}
                className="p-2.5 rounded-xl border border-red-200 bg-red-50/70 hover:bg-red-100 text-red-900 text-[11px] font-extrabold text-left cursor-pointer transition-colors"
              >
                Error común: Cerrados (Ves tus hombros)
              </button>
              <button
                type="button"
                onClick={() => aplicarPreset(23, 0)}
                className="p-2.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 text-[11px] font-extrabold text-left cursor-pointer transition-colors"
              >
                Óptimo: Triángulo Invertido (Atrás + Lateral)
              </button>
              <button
                type="button"
                onClick={() => aplicarPreset(42, 2)}
                className="p-2.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-950 text-[11px] font-extrabold text-left cursor-pointer transition-colors"
              >
                Error: Muy abiertos (Pierdes retaguardia)
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Tarjeta Educativa: Física del Triángulo Invertido + Marco Legal VE */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        <div className="md:col-span-7 space-y-1.5">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#2563EB]">
            <Info className="w-3.5 h-3.5" />
            <span>Física del Triángulo Invertido (▼)</span>
          </div>
          <h3 className="text-base font-extrabold text-slate-900">
            ¿Por qué el vértice apunta hacia abajo y los espejos se abren hacia afuera?
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Cuando tus retrovisores están cerrados, desperdicias hasta la mitad del vidrio viendo tus
            propios hombros y duplicando la misma imagen trasera. Al abrir ambos espejos dejando solo
            un <strong>10%–15% de tu hombro en la esquina inferior interna</strong>, el campo visual
            converge en el vértice posterior (cubriendo tu carril detrás) y se abre ampliamente en
            forma de <strong>triángulo invertido</strong> hacia ambos carriles laterales.
          </p>
        </div>

        <div className="md:col-span-5 p-4 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-1.5">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5" />
            <span>Marco Legal Venezolano</span>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed font-medium">
            El <strong>Reglamento de la Ley de Tránsito Terrestre</strong> exige retrovisores
            sólidamente fijados y libres de vibración con un campo visual claro de al menos{' '}
            <strong>70 metros hacia la retaguardia</strong>. Además, el{' '}
            <strong>Decreto N° 8.495 (Art. 9 num. 6)</strong> obliga a portar ambos espejos
            retrovisores (izquierdo y derecho).
          </p>
        </div>
      </section>
    </div>
  );
}

/* ============================================================================
 * 5. PESTAÑA 2: SIMULADOR DEL SISTEMA DE 6 PASOS PARA CAMBIAR DE CARRIL
 * ============================================================================ */
const PASOS_6_INFO = [
  {
    num: 1,
    titulo: 'Activar Direccional',
    corto: 'Direccional',
    explicacion: 'Anuncia tu intención hacia el carril destino antes de iniciar cualquier desplazamiento (Art. 32 num. 4).',
  },
  {
    num: 2,
    titulo: 'Distancia Frontal',
    corto: 'Dist. Frontal',
    explicacion: 'Calcula espacio y velocidad con el vehículo de adelante para no acercarte mientras chequeas atrás.',
  },
  {
    num: 3,
    titulo: 'Distancia Posterior',
    corto: 'Dist. Posterior',
    explicacion: 'Evalúa con tus retrovisores en triángulo invertido el tráfico en tu carril actual y en el carril destino.',
  },
  {
    num: 4,
    titulo: 'Chequeo Físico',
    corto: 'Chequeo Hombro',
    explicacion: 'Giro rápido de cabeza sobre el hombro hacia el lado destino para verificar el punto ciego residual.',
  },
  {
    num: 5,
    titulo: 'Incorporar Progresivo',
    corto: 'Incorporar',
    explicacion: 'Desplazamiento suave, fluido y progresivo al nuevo carril sin cambios bruscos (Art. 32 num. 9).',
  },
  {
    num: 6,
    titulo: 'Apagar Direccional',
    corto: 'Apagar Luz',
    explicacion: 'Cancela la luz de cruce inmediatamente al estabilizarte para no confundir a los conductores detrás.',
  },
];

const MISIONES_6_PASOS = [
  {
    id: 'm1',
    titulo: 'Misión 1: Vehículo lento adelante',
    objetivo: 'Cambia al carril IZQUIERDO para adelantar con seguridad.',
    carrilInicio: 1, // 0=Izq, 1=Centro, 2=Der
    carrilDestino: 0,
    direccion: 'izq',
    tienePuntoCiego: false,
    distFrontalInicial: 28,
  },
  {
    id: 'm2',
    titulo: 'Misión 2: Obstáculo en tu vía',
    objetivo: 'Cambia al carril DERECHO. Verifica el punto ciego: hay tráfico lateral cerca.',
    carrilInicio: 1,
    carrilDestino: 2,
    direccion: 'der',
    tienePuntoCiego: true,
    distFrontalInicial: 24,
  },
  {
    id: 'm3',
    titulo: 'Misión 3: Transporte reduciendo velocidad',
    objetivo: 'Cambia al carril IZQUIERDO. Si el punto ciego está ocupado, espera y repite Paso 4.',
    carrilInicio: 2,
    carrilDestino: 1,
    direccion: 'izq',
    tienePuntoCiego: true,
    distFrontalInicial: 22,
  },
  {
    id: 'm4',
    titulo: 'Misión 4: Salida próxima a la derecha',
    objetivo: 'Cambia al carril DERECHO manteniendo tu distancia frontal y posterior.',
    carrilInicio: 1,
    carrilDestino: 2,
    direccion: 'der',
    tienePuntoCiego: false,
    distFrontalInicial: 32,
  },
  {
    id: 'm5',
    titulo: 'Misión 5: Auto frenando en tu carril',
    objetivo: 'Cambia al carril IZQUIERDO. Una moto rápida circula en tu punto ciego.',
    carrilInicio: 1,
    carrilDestino: 0,
    direccion: 'izq',
    tienePuntoCiego: true,
    distFrontalInicial: 20,
  },
];

function PestanaCambioCarril6Pasos({ tocarSonido }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const rafRef = useRef(null);
  const lastTimeRef = useRef(0);

  const [modo, setModo] = useState('guiado'); // 'guiado' | 'calle'
  const [misionIdx, setMisionIdx] = useState(0);
  const [pasosHechos, setPasosHechos] = useState({
    1: false,
    2: false,
    3: false,
    4: false,
    5: false,
    6: false,
  });
  const [puntoCiegoEstado, setPuntoCiegoEstado] = useState('sin_revisar'); // 'sin_revisar' | 'ocupado' | 'despejado'
  const [esperandoDespeje, setEsperandoDespeje] = useState(false);
  const [alertaCanvas, setAlertaCanvas] = useState(null); // { tipo: 'error'|'warn'|'ok', titulo, texto }
  const [avisoPaso6, setAvisoPaso6] = useState(false);
  const [congelado, setCongelado] = useState(false);
  const [practicaTerminada, setPracticaTerminada] = useState(false);
  const [copiado, setCopiado] = useState(false);

  // Estadísticas acumuladas para reporte final
  const [stats, setStats] = useState({
    misionesPerfectas: 0,
    erroresSecuencia: 0,
    puntosCiegosDetectados: 0,
    colisionesPuntoCiego: 0,
    olvidosDireccional: 0,
    logErrores: [],
  });

  const mision = MISIONES_6_PASOS[misionIdx];
  const misionConErrorRef = useRef(false);
  const paso6TimerRef = useRef(null);
  const despejeTimerRef = useRef(null);
  const freezeTimerRef = useRef(null);
  const nextMissionTimerRef = useRef(null);

  // Estado mutable para el Canvas 60fps
  const simRef = useRef({
    scroll: 0,
    motoLaneFloat: 1,
    targetLane: 1,
    signalOn: false,
    signalDir: 'izq',
    blinkPhase: 0,
    frontDist: 28,
    rearCurrentDist: 34,
    rearDestDist: 26,
    // Overlays temporales
    laserFrontTimer: 0,
    mirrorsTimer: 0,
    shoulderTimer: 0,
    shoulderResult: 'despejado',
    // Vehículo en punto ciego
    blindCarActive: false,
    blindCarPassed: false,
    blindCarYOffset: 16, // 0 = exactamente junto a la moto (punto ciego)
    frozen: false,
  });

  // Limpiar todos los timers al desmontar
  const limpiarTimers = useCallback(() => {
    if (paso6TimerRef.current) clearTimeout(paso6TimerRef.current);
    if (despejeTimerRef.current) clearTimeout(despejeTimerRef.current);
    if (freezeTimerRef.current) clearTimeout(freezeTimerRef.current);
    if (nextMissionTimerRef.current) clearTimeout(nextMissionTimerRef.current);
  }, []);

  useEffect(() => {
    return () => limpiarTimers();
  }, [limpiarTimers]);

  // Inicializar una misión específica
  const cargarMision = useCallback(
    (idx) => {
      limpiarTimers();
      const m = MISIONES_6_PASOS[idx];
      misionConErrorRef.current = false;
      setMisionIdx(idx);
      setPasosHechos({ 1: false, 2: false, 3: false, 4: false, 5: false, 6: false });
      setPuntoCiegoEstado('sin_revisar');
      setEsperandoDespeje(false);
      setAlertaCanvas(null);
      setAvisoPaso6(false);
      setCongelado(false);

      const s = simRef.current;
      s.motoLaneFloat = m.carrilInicio;
      s.targetLane = m.carrilInicio;
      s.signalOn = false;
      s.signalDir = m.direccion;
      s.frontDist = m.distFrontalInicial;
      s.rearCurrentDist = 28 + (idx % 3) * 6;
      s.rearDestDist = m.tienePuntoCiego ? 14 : 36;
      s.laserFrontTimer = 0;
      s.mirrorsTimer = 0;
      s.shoulderTimer = 0;
      s.blindCarActive = m.tienePuntoCiego;
      s.blindCarPassed = false;
      s.blindCarYOffset = 14;
      s.frozen = false;
    },
    [limpiarTimers]
  );

  // Cargar misión 0 al montar
  useEffect(() => {
    cargarMision(0);
  }, [cargarMision]);

  // Relé de direccional ("tic-tac") mientras Paso 1 está activo y Paso 6 no se ha apagado
  useEffect(() => {
    if (!pasosHechos[1] || pasosHechos[6] || practicaTerminada || congelado) return undefined;
    let tickToggle = true;
    const id = setInterval(() => {
      tocarSonido(tickToggle ? 'tic' : 'tac');
      tickToggle = !tickToggle;
    }, 460);
    return () => clearInterval(id);
  }, [pasosHechos, practicaTerminada, congelado, tocarSonido]);

  const reiniciarPractica = useCallback(() => {
    setPracticaTerminada(false);
    setStats({
      misionesPerfectas: 0,
      erroresSecuencia: 0,
      puntosCiegosDetectados: 0,
      colisionesPuntoCiego: 0,
      olvidosDireccional: 0,
      logErrores: [],
    });
    cargarMision(0);
  }, [cargarMision]);

  // Determinar siguiente paso esperado (para Modo Guiado)
  const siguientePasoGuiado = useMemo(() => {
    if (!pasosHechos[1]) return 1;
    if (!pasosHechos[2]) return 2;
    if (!pasosHechos[3]) return 3;
    if (!pasosHechos[4] || puntoCiegoEstado !== 'despejado') return 4;
    if (!pasosHechos[5]) return 5;
    if (!pasosHechos[6]) return 6;
    return null;
  }, [pasosHechos, puntoCiegoEstado]);

  const dispararCongelamientoError = useCallback(
    (titulo, texto, tipoError) => {
      tocarSonido('alerta_ciego');
      misionConErrorRef.current = true;
      simRef.current.frozen = true;
      setCongelado(true);
      setAlertaCanvas({ tipo: 'error', titulo, texto });

      setStats((prev) => ({
        ...prev,
        erroresSecuencia:
          tipoError === 'secuencia' ? prev.erroresSecuencia + 1 : prev.erroresSecuencia,
        colisionesPuntoCiego:
          tipoError === 'colision' ? prev.colisionesPuntoCiego + 1 : prev.colisionesPuntoCiego,
        logErrores: [...prev.logErrores, `${mision.titulo}: ${titulo}`].slice(-8),
      }));

      if (freezeTimerRef.current) clearTimeout(freezeTimerRef.current);
      freezeTimerRef.current = setTimeout(() => {
        simRef.current.frozen = false;
        setCongelado(false);
      }, 2100);
    },
    [mision.titulo, tocarSonido]
  );

  // Ejecución de cada uno de los 6 pasos
  const ejecutarPaso = useCallback(
    (num) => {
      if (congelado || practicaTerminada) return;
      const s = simRef.current;

      if (num === 1) {
        if (pasosHechos[1]) return;
        s.signalOn = true;
        s.signalDir = mision.direccion;
        setPasosHechos((p) => ({ ...p, 1: true }));
        setAlertaCanvas({
          tipo: 'ok',
          titulo: `Paso 1 completado: Luz direccional ${mision.direccion === 'izq' ? 'IZQUIERDA' : 'DERECHA'} activada`,
          texto: 'Ya comunicaste tu intención al resto de los conductores.',
        });
        tocarSonido('tic');
        return;
      }

      if (num === 2) {
        if (!pasosHechos[1]) {
          dispararCongelamientoError(
            'Orden alterado: Falta el Paso 1',
            'Antes de preparar el cambio, activa primero la luz direccional (Paso 1) para anunciar tu intención.',
            'secuencia'
          );
          return;
        }
        s.laserFrontTimer = 2.4;
        setPasosHechos((p) => ({ ...p, 2: true }));
        setAlertaCanvas({
          tipo: 'ok',
          titulo: `Paso 2 completado: Distancia frontal calculada (${Math.round(s.frontDist)} m)`,
          texto: 'Margen delantero verificado. Ahora evalúa la distancia posterior con tus retrovisores.',
        });
        tocarSonido('paso_ok');
        return;
      }

      if (num === 3) {
        if (!pasosHechos[1] || !pasosHechos[2]) {
          dispararCongelamientoError(
            'Secuencia incompleta antes del Paso 3',
            'Completa el Paso 1 (Direccional) y el Paso 2 (Distancia Frontal) antes de llevar tu vista a los espejos.',
            'secuencia'
          );
          return;
        }
        s.mirrorsTimer = 2.6;
        setPasosHechos((p) => ({ ...p, 3: true }));
        setAlertaCanvas({
          tipo: 'ok',
          titulo: 'Paso 3 completado: Retrovisores en Triángulo Invertido verificados',
          texto: `Carril actual atrás: ${s.rearCurrentDist} m · Carril destino: ${s.rearDestDist} m. Falta el chequeo físico del punto ciego.`,
        });
        tocarSonido('paso_ok');
        return;
      }

      if (num === 4) {
        if (!pasosHechos[1] || !pasosHechos[2] || !pasosHechos[3]) {
          dispararCongelamientoError(
            'Aún faltan pasos previos al Chequeo Físico',
            'Ejecuta primero Direccional (1), Distancia Frontal (2) y Distancia Posterior en espejos (3).',
            'secuencia'
          );
          return;
        }

        s.shoulderTimer = 1.9;
        // ¿Hay un vehículo actualmente en el punto ciego?
        if (s.blindCarActive && !s.blindCarPassed) {
          s.shoulderResult = 'ocupado';
          setPuntoCiegoEstado('ocupado');
          setPasosHechos((p) => ({ ...p, 4: true }));
          setEsperandoDespeje(true);
          tocarSonido('alerta_ciego');
          setStats((prev) => ({
            ...prev,
            puntosCiegosDetectados: prev.puntosCiegosDetectados + 1,
          }));
          setAlertaCanvas({
            tipo: 'warn',
            titulo: '¡PUNTO CIEGO OCUPADO! Vehículo detectado a tu costado',
            texto:
              '¡Excelente chequeo físico! Espera 2 segundos a que pase el vehículo y vuelve a pulsar Paso 4 para confirmar despeje.',
          });

          if (despejeTimerRef.current) clearTimeout(despejeTimerRef.current);
          despejeTimerRef.current = setTimeout(() => {
            simRef.current.blindCarPassed = true;
            setEsperandoDespeje(false);
            setAlertaCanvas({
              tipo: 'ok',
              titulo: 'El vehículo lateral ya pasó',
              texto: 'Repite el Paso 4 (Chequeo Físico) para confirmar visualmente que el punto ciego está despejado.',
            });
          }, 2100);
        } else {
          s.shoulderResult = 'despejado';
          setPuntoCiegoEstado('despejado');
          setPasosHechos((p) => ({ ...p, 4: true }));
          tocarSonido('paso_ok');
          setAlertaCanvas({
            tipo: 'ok',
            titulo: 'Paso 4 completado: Punto ciego DESPEJADO ✓',
            texto: 'Vía libre confirmada sobre el hombro. Procede con la incorporación progresiva (Paso 5).',
          });
        }
        return;
      }

      if (num === 5) {
        if (pasosHechos[5]) return;
        // Validación estricta de pasos previos y punto ciego
        if (!pasosHechos[1]) {
          dispararCongelamientoError(
            'Infracción: Cambio brusco sin luz de cruce',
            'Decreto N° 8.495 Art. 32 num. 4 y 9: debes activar la direccional (Paso 1) y completar los chequeos previos.',
            'secuencia'
          );
          return;
        }
        if (!pasosHechos[2] || !pasosHechos[3]) {
          dispararCongelamientoError(
            'Omitiste el cálculo de distancias (Pasos 2 y 3)',
            'No te incorpores sin calcular primero la distancia frontal y posterior en tus retrovisores.',
            'secuencia'
          );
          return;
        }
        if (!pasosHechos[4]) {
          dispararCongelamientoError(
            s.blindCarActive && !s.blindCarPassed
              ? '¡Colisión en punto ciego! Omitiste el Paso 4'
              : 'Omitiste el Chequeo Físico de Punto Ciego (Paso 4)',
            'Nunca cambies de carril confiando solo en los espejos. Ejecuta siempre el giro de cabeza sobre el hombro.',
            s.blindCarActive && !s.blindCarPassed ? 'colision' : 'secuencia'
          );
          return;
        }
        if (s.blindCarActive && !s.blindCarPassed) {
          dispararCongelamientoError(
            '¡Colisión en punto ciego! El carril seguía ocupado',
            'Detectaste un vehículo lateral: debías esperar a que pasara y confirmar nuevamente con el Paso 4.',
            'colision'
          );
          return;
        }
        if (puntoCiegoEstado !== 'despejado') {
          dispararCongelamientoError(
            'Confirma el despeje repitiendo el Paso 4',
            'El vehículo ya pasó, pero debes realizar un segundo chequeo físico rápido antes de mover la moto.',
            'secuencia'
          );
          return;
        }

        // Ejecutar incorporación progresiva al carril destino
        s.targetLane = mision.carrilDestino;
        setPasosHechos((p) => ({ ...p, 5: true }));
        tocarSonido('paso_ok');
        setAlertaCanvas({
          tipo: 'ok',
          titulo: 'Paso 5 ejecutado: Incorporación progresiva al carril destino',
          texto: 'Estabiliza tu trayectoria y ejecuta de inmediato el Paso 6 (Apagar Direccional).',
        });

        // Temporizador de 4 segundos para recordar Paso 6 si se olvida
        if (paso6TimerRef.current) clearTimeout(paso6TimerRef.current);
        paso6TimerRef.current = setTimeout(() => {
          setAvisoPaso6(true);
          tocarSonido('alerta_ciego');
          misionConErrorRef.current = true;
          setStats((prev) => ({
            ...prev,
            olvidosDireccional: prev.olvidosDireccional + 1,
            logErrores: [
              ...prev.logErrores,
              `${mision.titulo}: Demora al cancelar la direccional (Paso 6)`,
            ].slice(-8),
          }));
        }, 4000);
        return;
      }

      if (num === 6) {
        if (!pasosHechos[5]) {
          dispararCongelamientoError(
            'Aún no te has incorporado al nuevo carril',
            'La luz direccional se apaga (Paso 6) únicamente después de estabilizarte en el carril destino (Paso 5).',
            'secuencia'
          );
          return;
        }
        if (pasosHechos[6]) return;

        if (paso6TimerRef.current) clearTimeout(paso6TimerRef.current);
        s.signalOn = false;
        setAvisoPaso6(false);
        setPasosHechos((p) => ({ ...p, 6: true }));
        tocarSonido('fanfarria');

        if (!misionConErrorRef.current) {
          setStats((prev) => ({ ...prev, misionesPerfectas: prev.misionesPerfectas + 1 }));
        }

        setAlertaCanvas({
          tipo: 'ok',
          titulo: '¡Maniobra de 6 Pasos completada con éxito!',
          texto:
            misionIdx < MISIONES_6_PASOS.length - 1
              ? 'Preparando la siguiente misión en autopista...'
              : 'Generando tu reporte final de práctica...',
        });

        nextMissionTimerRef.current = setTimeout(() => {
          if (misionIdx < MISIONES_6_PASOS.length - 1) {
            cargarMision(misionIdx + 1);
          } else {
            setPracticaTerminada(true);
          }
        }, 1600);
      }
    },
    [
      congelado,
      practicaTerminada,
      pasosHechos,
      mision,
      misionIdx,
      puntoCiegoEstado,
      tocarSonido,
      dispararCongelamientoError,
      cargarMision,
    ]
  );

  // Atajos de teclado: teclas 1, 2, 3, 4, 5, 6
  useEffect(() => {
    const onKeyDown = (e) => {
      if (practicaTerminada) return;
      if (['1', '2', '3', '4', '5', '6'].includes(e.key)) {
        e.preventDefault();
        ejecutarPaso(Number(e.key));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [ejecutarPaso, practicaTerminada]);

  // Ajustar resolución Retina del Canvas
  const ajustarCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const cont = containerRef.current;
    if (!canvas || !cont) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = cont.clientWidth;
    const h = Math.max(330, Math.min(410, Math.round(w * 0.62)));
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

  // Renderizado Canvas 60fps de la autopista de 3 carriles
  useEffect(() => {
    const loop = (now) => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const W = canvas.width / dpr;
        const H = canvas.height / dpr;
        const s = simRef.current;

        const dt = Math.min(0.05, Math.max(0.001, (now - lastTimeRef.current) / 1000));
        lastTimeRef.current = now;

        if (!s.frozen && !practicaTerminada) {
          s.scroll += 205 * dt;
          s.blinkPhase += dt;
          // Incorporación suave progresiva hacia targetLane
          s.motoLaneFloat += (s.targetLane - s.motoLaneFloat) * Math.min(1, dt * 3.8);
          s.laserFrontTimer = Math.max(0, s.laserFrontTimer - dt);
          s.mirrorsTimer = Math.max(0, s.mirrorsTimer - dt);
          s.shoulderTimer = Math.max(0, s.shoulderTimer - dt);

          // Animación del vehículo del punto ciego pasando hacia adelante cuando el piloto espera
          if (s.blindCarActive && s.blindCarPassed) {
            s.blindCarYOffset -= 155 * dt;
          }
        }

        ctx.save();
        ctx.scale(dpr, dpr);

        // Fondo exterior
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(0, 0, W, H);

        // Autopista de 3 carriles centrada
        const roadW = Math.min(W - 28, 390);
        const roadX = (W - roadW) / 2;
        const laneW = roadW / 3;
        const laneCenter = (laneIdx) => roadX + (laneIdx + 0.5) * laneW;
        const motoX = laneCenter(s.motoLaneFloat);
        const motoY = H * 0.64;

        // Hombrillos
        ctx.fillStyle = '#172033';
        ctx.fillRect(roadX - 14, 0, roadW + 28, H);

        // Asfalto
        ctx.fillStyle = '#1E293B';
        ctx.fillRect(roadX, 0, roadW, H);

        // Resalte sutil del carril destino
        const destX = roadX + mision.carrilDestino * laneW;
        ctx.fillStyle = 'rgba(37, 99, 235, 0.11)';
        ctx.fillRect(destX, 0, laneW, H);

        // Bordes exteriores
        ctx.strokeStyle = '#E2E8F0';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(roadX, 0);
        ctx.lineTo(roadX, H);
        ctx.moveTo(roadX + roadW, 0);
        ctx.lineTo(roadX + roadW, H);
        ctx.stroke();

        // Líneas blancas discontinuas en movimiento
        ctx.strokeStyle = '#F8FAFC';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([22, 22]);
        ctx.lineDashOffset = -(s.scroll % 44);
        ctx.beginPath();
        ctx.moveTo(roadX + laneW, 0);
        ctx.lineTo(roadX + laneW, H);
        ctx.moveTo(roadX + laneW * 2, 0);
        ctx.lineTo(roadX + laneW * 2, H);
        ctx.stroke();
        ctx.setLineDash([]);

        // Etiqueta en carril destino
        ctx.fillStyle = 'rgba(147, 197, 253, 0.85)';
        ctx.font = 'bold 10px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('DESTINO', laneCenter(mision.carrilDestino), 22);

        // 1. VEHÍCULO FRONTAL en el carril inicial
        const frontCarX = laneCenter(mision.carrilInicio);
        const frontCarY = motoY - 122;
        ctx.fillStyle = '#64748B';
        ctx.beginPath();
        ctx.roundRect(frontCarX - 20, frontCarY - 30, 40, 60, 9);
        ctx.fill();
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(frontCarX - 14, frontCarY - 16, 28, 13);
        ctx.fillRect(frontCarX - 14, frontCarY + 12, 28, 10);
        // Luces traseras rojas
        ctx.fillStyle = '#EF4444';
        ctx.fillRect(frontCarX - 16, frontCarY + 26, 10, 4);
        ctx.fillRect(frontCarX + 6, frontCarY + 26, 10, 4);

        // 2. VEHÍCULOS POSTERIORES (carril actual y destino)
        const rear1X = laneCenter(mision.carrilInicio);
        const rear1Y = motoY + 106;
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.roundRect(rear1X - 18, rear1Y - 24, 36, 48, 8);
        ctx.fill();
        ctx.fillStyle = '#FEF08A';
        ctx.fillRect(rear1X - 13, rear1Y - 25, 8, 3);
        ctx.fillRect(rear1X + 5, rear1Y - 25, 8, 3);

        const rearDestX = laneCenter(mision.carrilDestino);
        const rearDestY = motoY + 122;
        ctx.fillStyle = '#3B82F6';
        ctx.beginPath();
        ctx.roundRect(rearDestX - 18, rearDestY - 24, 36, 48, 8);
        ctx.fill();
        ctx.fillStyle = '#FEF08A';
        ctx.fillRect(rearDestX - 13, rearDestY - 25, 8, 3);
        ctx.fillRect(rearDestX + 5, rearDestY - 25, 8, 3);

        // 3. VEHÍCULO EN PUNTO CIEGO (si la misión lo tiene)
        if (s.blindCarActive && motoY + s.blindCarYOffset > -70) {
          const bX = laneCenter(mision.carrilDestino);
          const bY = motoY + s.blindCarYOffset;
          // En misiones con punto ciego, se dibuja atenuado hasta que haces chequeo físico o pasa
          const revelado = s.shoulderTimer > 0 || s.blindCarPassed || s.frozen;
          ctx.save();
          ctx.globalAlpha = revelado ? 1 : 0.42;
          ctx.fillStyle = '#EF4444';
          ctx.beginPath();
          ctx.roundRect(bX - 18, bY - 26, 36, 52, 8);
          ctx.fill();
          ctx.strokeStyle = '#FCA5A5';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = '#0F172A';
          ctx.fillRect(bX - 12, bY - 14, 24, 11);
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 8px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('P. CIEGO', bX, bY + 14);
          ctx.restore();
        }

        // OVERLAY PASO 2: Láser / cota de distancia frontal
        if (s.laserFrontTimer > 0) {
          ctx.save();
          ctx.strokeStyle = '#10B981';
          ctx.lineWidth = 2.5;
          ctx.setLineDash([6, 4]);
          ctx.beginPath();
          ctx.moveTo(motoX, motoY - 24);
          ctx.lineTo(frontCarX, frontCarY + 32);
          ctx.stroke();
          ctx.setLineDash([]);

          const midY = (motoY - 24 + frontCarY + 32) / 2;
          ctx.fillStyle = '#065F46';
          ctx.beginPath();
          ctx.roundRect(motoX - 48, midY - 12, 96, 22, 8);
          ctx.fill();
          ctx.strokeStyle = '#34D399';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.fillStyle = '#ECFDF5';
          ctx.font = 'bold 10px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`FRENTE: ${Math.round(s.frontDist)} m ✓`, motoX, midY + 3);
          ctx.restore();
        }

        // OVERLAY PASO 3: Abanicos en Triángulo Invertido + Mini-espejos HUD
        if (s.mirrorsTimer > 0) {
          ctx.save();
          // Abanicos triangulares hacia atrás
          ctx.fillStyle = 'rgba(6, 182, 212, 0.24)';
          ctx.beginPath();
          ctx.moveTo(motoX - 10, motoY - 6);
          ctx.lineTo(motoX - 115, motoY + 130);
          ctx.lineTo(motoX + 8, motoY + 138);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = 'rgba(37, 99, 235, 0.24)';
          ctx.beginPath();
          ctx.moveTo(motoX + 10, motoY - 6);
          ctx.lineTo(motoX - 8, motoY + 138);
          ctx.lineTo(motoX + 115, motoY + 130);
          ctx.closePath();
          ctx.fill();

          // Dos mini-espejos HUD arriba izquierda/derecha
          const drawMiniMirror = (mx, title, distVal) => {
            ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
            ctx.beginPath();
            ctx.roundRect(mx, 32, 108, 42, 10);
            ctx.fill();
            ctx.strokeStyle = '#38BDF8';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.fillStyle = '#7DD3FC';
            ctx.font = 'bold 8.5px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(title, mx + 54, 46);
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 11px system-ui, sans-serif';
            ctx.fillText(`${distVal} m atrás`, mx + 54, 64);
          };
          drawMiniMirror(14, 'ESPEJO IZQ', mision.direccion === 'izq' ? s.rearDestDist : s.rearCurrentDist);
          drawMiniMirror(W - 122, 'ESPEJO DER', mision.direccion === 'der' ? s.rearDestDist : s.rearCurrentDist);
          ctx.restore();
        }

        // OVERLAY PASO 4: Visor dinámico lateral ("Vista sobre el hombro")
        if (s.shoulderTimer > 0) {
          const isOccupied = s.shoulderResult === 'ocupado';
          const dirX = mision.direccion === 'izq' ? -1 : 1;
          ctx.save();
          // Arco lateral de visión sobre el hombro
          ctx.fillStyle = isOccupied ? 'rgba(239, 68, 68, 0.30)' : 'rgba(16, 185, 129, 0.28)';
          ctx.beginPath();
          ctx.moveTo(motoX, motoY);
          if (dirX < 0) {
            ctx.arc(motoX, motoY, 115, Math.PI * 0.65, Math.PI * 1.18);
          } else {
            ctx.arc(motoX, motoY, 115, -Math.PI * 0.18, Math.PI * 0.35);
          }
          ctx.closePath();
          ctx.fill();

          // Visor flotante claro
          const boxW = Math.min(240, W - 28);
          const boxX = (W - boxW) / 2;
          ctx.fillStyle = isOccupied ? 'rgba(153, 27, 27, 0.95)' : 'rgba(6, 95, 70, 0.95)';
          ctx.beginPath();
          ctx.roundRect(boxX, 34, boxW, 48, 12);
          ctx.fill();
          ctx.strokeStyle = isOccupied ? '#FCA5A5' : '#6EE7B7';
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 10px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(
            `VISTA SOBRE HOMBRO (${mision.direccion === 'izq' ? 'IZQUIERDO' : 'DERECHO'})`,
            W / 2,
            51
          );
          ctx.font = 'bold 12px system-ui, sans-serif';
          ctx.fillText(
            isOccupied ? '⚠ OCUPADO — ¡PELIGRO: ESPERA!' : '✓ PUNTO CIEGO DESPEJADO',
            W / 2,
            70
          );
          ctx.restore();
        }

        // 4. MOTOCICLETA DEL PILOTO
        ctx.save();
        ctx.translate(motoX, motoY);
        const leanTilt = (s.targetLane - s.motoLaneFloat) * 0.22;
        ctx.rotate(leanTilt);

        // Haz delantero 24h (Art. 28 num. 14)
        const beamGrad = ctx.createLinearGradient(0, -20, 0, -90);
        beamGrad.addColorStop(0, 'rgba(254, 240, 138, 0.44)');
        beamGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.moveTo(-4, -20);
        ctx.lineTo(-22, -88);
        ctx.lineTo(22, -88);
        ctx.lineTo(4, -20);
        ctx.closePath();
        ctx.fill();

        // Cauchos
        ctx.fillStyle = '#020617';
        ctx.beginPath();
        ctx.roundRect(-4.5, -22, 9, 14, 3);
        ctx.roundRect(-5, 10, 10, 14, 3);
        ctx.fill();

        // Manubrio
        ctx.strokeStyle = '#CBD5E1';
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-14, -8);
        ctx.lineTo(14, -8);
        ctx.stroke();

        // Chasis Moto App
        ctx.fillStyle = '#2563EB';
        ctx.beginPath();
        ctx.roundRect(-7, -12, 14, 24, 6);
        ctx.fill();

        // Casco del piloto (gira ligeramente en Paso 4)
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#F8FAFC';
        ctx.fill();
        ctx.strokeStyle = '#1D4ED8';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Direccionales ámbar parpadeantes reales
        const blinkOn = s.signalOn && Math.floor(s.blinkPhase * 3.2) % 2 === 0;
        if (blinkOn) {
          const sx = s.signalDir === 'izq' ? -13 : 13;
          ctx.fillStyle = '#F59E0B';
          ctx.beginPath();
          ctx.arc(sx, -13, 5, 0, Math.PI * 2);
          ctx.arc(sx, 14, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(245, 158, 11, 0.35)';
          ctx.beginPath();
          ctx.arc(sx, -13, 11, 0, Math.PI * 2);
          ctx.arc(sx, 14, 11, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();

        // Marco rojo si está congelado por error
        if (s.frozen) {
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.9)';
          ctx.lineWidth = 6;
          ctx.strokeRect(3, 3, W - 6, H - 6);
        }

        ctx.restore();
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    lastTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [mision, practicaTerminada]);

  // Reporte final al completar las 5 misiones
  if (practicaTerminada) {
    const cumplimientoSecuencia = Math.max(
      0,
      Math.round(((5 - Math.min(5, stats.erroresSecuencia)) / 5) * 100)
    );
    const penalizacion =
      stats.erroresSecuencia * 10 +
      stats.colisionesPuntoCiego * 18 +
      stats.olvidosDireccional * 8;
    const puntajeFinal = Math.max(15, Math.min(100, 100 - penalizacion));
    const radio = 52;
    const circ = 2 * Math.PI * radio;
    const dashOffset = circ - (puntajeFinal / 100) * circ;

    const copiarResumen = async () => {
      const txt = [
        `🏍️ REPORTE SISTEMA DE 6 PASOS — Moto App · MotoEscuelApp`,
        `Modalidad: ${modo === 'guiado' ? 'Modo Guiado' : 'Modo Calle Real'}`,
        `Puntaje Global: ${puntajeFinal}/100`,
        `Misiones perfectas: ${stats.misionesPerfectas}/5`,
        `Cumplimiento de secuencia: ${cumplimientoSecuencia}%`,
        `Puntos ciegos detectados a tiempo: ${stats.puntosCiegosDetectados}`,
        `Olvidos de cancelación de direccional (Paso 6): ${stats.olvidosDireccional}`,
        `🎯 Siguiente paso: Agenda una sesión práctica o clínica de cambio de carril en Moto App.`,
      ].join('\n');
      const ok = await copiarTextoSeguro(txt);
      if (ok) {
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2400);
      }
    };

    return (
      <div className="space-y-5 animate-fadeIn">
        <section className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-7">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
              <svg className="w-36 h-36 -rotate-90" viewBox="0 0 124 124" aria-hidden="true">
                <circle cx="62" cy="62" r={radio} fill="none" stroke="#E2E8F0" strokeWidth="10" />
                <circle
                  cx="62"
                  cy="62"
                  r={radio}
                  fill="none"
                  stroke={puntajeFinal >= 85 ? '#10B981' : puntajeFinal >= 60 ? '#2563EB' : '#EF4444'}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={circ}
                  strokeDashoffset={dashOffset}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-slate-900 tabular-nums">
                  {puntajeFinal}%
                </span>
                <span className="text-[11px] font-bold text-slate-400">5/5 misiones</span>
              </div>
            </div>

            <div className="flex-1 text-center md:text-left space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#2563EB] border border-blue-200 text-xs font-extrabold">
                <Award className="w-3.5 h-3.5" />
                <span>Reporte Final — Sistema de 6 Pasos</span>
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                {puntajeFinal >= 90
                  ? 'Dominio Ejemplar de Cambio de Carril'
                  : puntajeFinal >= 70
                  ? 'Buen Control de la Secuencia 1→6'
                  : 'Refuerza la Disciplina de los 6 Pasos'}
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Completaste las 5 misiones en autopista. Recuerda que automatizar la secuencia
                1→2→3→4→5→6 convierte el cambio de carril en un reflejo seguro bajo tráfico real.
              </p>
            </div>
          </div>
        </section>

        {/* Métricas detalladas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="text-[11px] font-bold text-slate-500">Cumplimiento 1→6</div>
            <div className="text-2xl font-black text-[#2563EB] mt-1">{cumplimientoSecuencia}%</div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="text-[11px] font-bold text-slate-500">Puntos ciegos detectados</div>
            <div className="text-2xl font-black text-[#10B981] mt-1">
              {stats.puntosCiegosDetectados}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="text-[11px] font-bold text-slate-500">Errores / Colisiones</div>
            <div className="text-2xl font-black text-[#EF4444] mt-1">
              {stats.erroresSecuencia + stats.colisionesPuntoCiego}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="text-[11px] font-bold text-slate-500">Olvidos Paso 6</div>
            <div className="text-2xl font-black text-[#F59E0B] mt-1">
              {stats.olvidosDireccional}
            </div>
          </div>
        </div>

        {/* Log de errores críticos + Recomendación Moto App */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <section className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
              Resumen de Errores Críticos
            </h3>
            {stats.logErrores.length === 0 ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>¡Cero errores críticos! Ejecutaste la secuencia completa y cancelaste a tiempo.</span>
              </div>
            ) : (
              <ul className="space-y-2">
                {stats.logErrores.map((err, i) => (
                  <li
                    key={i}
                    className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 font-semibold flex items-center gap-2"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                    <span>{err}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="lg:col-span-5 bg-[#0F172A] text-white rounded-2xl p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Recomendación Moto App · MotoEscuelApp</span>
              </div>
              <h3 className="text-base font-extrabold">
                Lleva los 6 Pasos al asfalto real
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Agenda una <strong>sesión práctica</strong> o una{' '}
                <strong>clínica de conducción urbana defensiva</strong> en Moto App para afianzar tu
                chequeo físico sobre el hombro y la incorporación progresiva con instructor
                certificado.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={copiarResumen}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copiado ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiado ? '¡Copiado!' : 'Copiar resumen'}</span>
              </button>
              <button
                type="button"
                onClick={reiniciarPractica}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reiniciar práctica</span>
              </button>
            </div>
          </section>
        </div>
      </div>
    );
  }

  const pasosCompletadosCount = Object.values(pasosHechos).filter(Boolean).length;

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Selector de Modo + Misión Actual */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setModo('guiado')}
              className={`py-1.5 px-3 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                modo === 'guiado'
                  ? 'bg-[#2563EB] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Modo Guiado (Entrenamiento)
            </button>
            <button
              type="button"
              onClick={() => setModo('calle')}
              className={`py-1.5 px-3 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                modo === 'calle'
                  ? 'bg-[#0F172A] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Modo Calle Real (Evaluación)
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-blue-50 text-[#2563EB] border border-blue-200 text-xs font-extrabold">
              Misión {misionIdx + 1} / {MISIONES_6_PASOS.length}
            </span>
            <button
              type="button"
              onClick={reiniciarPractica}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              title="Reiniciar misiones"
              aria-label="Reiniciar misiones"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Consigna de la Misión */}
        <div className="p-3.5 rounded-xl bg-[#0F172A] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
              {mision.titulo}
            </div>
            <div className="text-sm font-extrabold">{mision.objetivo}</div>
          </div>
          <span
            className={`shrink-0 px-3 py-1 rounded-lg text-xs font-black uppercase ${
              mision.direccion === 'izq'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
            }`}
          >
            Cambio hacia {mision.direccion === 'izq' ? '← IZQUIERDA' : 'DERECHA →'}
          </span>
        </div>

        {/* Barra de Progreso 1 → 6 */}
        <div className="grid grid-cols-6 gap-1.5">
          {PASOS_6_INFO.map((p) => {
            const hecho = pasosHechos[p.num] && (p.num !== 4 || puntoCiegoEstado === 'despejado');
            const actual = modo === 'guiado' && siguientePasoGuiado === p.num;
            return (
              <div
                key={p.num}
                className={`h-2 rounded-full transition-all ${
                  hecho ? 'bg-[#10B981]' : actual ? 'bg-[#2563EB] animate-pulse' : 'bg-slate-200'
                }`}
              />
            );
          })}
        </div>
      </section>

      {/* Grid Principal: Escenario Canvas 60fps + Consola de 6 Pasos */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Escenario de Autopista en Vivo */}
        <div className="lg:col-span-7 space-y-3">
          <div className="relative bg-[#0F172A] rounded-2xl overflow-hidden border border-slate-800 shadow-md">
            <div ref={containerRef} className="w-full relative">
              <canvas ref={canvasRef} className="block w-full select-none" />

              {/* Alerta amarilla si olvidó apagar la direccional (Paso 6) */}
              {avisoPaso6 && !pasosHechos[6] && (
                <div
                  role="alert"
                  className="absolute top-3 left-3 right-3 p-3 rounded-xl bg-amber-500/95 text-slate-950 border border-amber-300 text-xs font-extrabold flex items-center gap-2 shadow-lg animate-fadeIn"
                >
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    Recuerda el Paso 6: dejar la direccional encendida confunde a los conductores que
                    vienen detrás.
                  </span>
                </div>
              )}

              {/* Banner de Feedback en la base del Canvas */}
              {alertaCanvas && (
                <div
                  role="status"
                  className={`absolute bottom-3 left-3 right-3 p-3 rounded-xl text-xs shadow-lg border animate-fadeIn ${
                    alertaCanvas.tipo === 'error'
                      ? 'bg-red-600/95 border-red-400 text-white'
                      : alertaCanvas.tipo === 'warn'
                      ? 'bg-amber-500/95 border-amber-300 text-slate-950'
                      : 'bg-slate-900/92 border-emerald-400/60 text-white'
                  }`}
                >
                  <div className="font-extrabold">{alertaCanvas.titulo}</div>
                  <div className="opacity-90 mt-0.5 leading-snug">{alertaCanvas.texto}</div>
                </div>
              )}
            </div>
          </div>

          <div className="text-[11px] text-slate-500 text-center">
            Atajos en PC: pulsa las teclas <kbd className="font-bold text-slate-800">1</kbd> a{' '}
            <kbd className="font-bold text-slate-800">6</kbd> en orden para ejecutar la secuencia.
          </div>
        </div>

        {/* Consola de 6 Botones Táctiles */}
        <section className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
              Consola de 6 Pasos
            </h3>
            <span className="text-xs font-bold text-slate-500">{pasosCompletadosCount}/6</span>
          </div>

          {/* Micro-explicación en Modo Guiado */}
          {modo === 'guiado' && siguientePasoGuiado && (
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-950 space-y-1">
              <div className="font-extrabold text-[#2563EB]">
                Siguiente paso sugerido: Paso {siguientePasoGuiado}
              </div>
              <p className="leading-relaxed">
                {PASOS_6_INFO[siguientePasoGuiado - 1].explicacion}
              </p>
            </div>
          )}

          {/* Lista de los 6 Botones */}
          <div className="space-y-2">
            {PASOS_6_INFO.map((paso) => {
              const completado =
                pasosHechos[paso.num] && (paso.num !== 4 || puntoCiegoEstado === 'despejado');
              const esSugerido = modo === 'guiado' && siguientePasoGuiado === paso.num;
              const esPaso4Ocupado = paso.num === 4 && puntoCiegoEstado === 'ocupado';
              const esPaso6Urgente = paso.num === 6 && avisoPaso6 && !pasosHechos[6];

              let labelDinamico = paso.titulo;
              if (paso.num === 1) {
                labelDinamico = `Direccional (${mision.direccion === 'izq' ? 'Izquierda' : 'Derecha'})`;
              } else if (paso.num === 4 && esPaso4Ocupado) {
                labelDinamico = esperandoDespeje
                  ? 'Chequeo Físico (Esperando...)'
                  : 'Repetir Chequeo Físico (Confirmar)';
              }

              return (
                <button
                  key={paso.num}
                  type="button"
                  disabled={congelado || (paso.num === 4 && esperandoDespeje)}
                  onClick={() => ejecutarPaso(paso.num)}
                  className={`w-full p-3 rounded-xl border-2 text-left flex items-center gap-3 transition-all cursor-pointer disabled:opacity-60 active:scale-[0.99] ${
                    completado
                      ? 'bg-emerald-50 border-[#10B981] text-emerald-950'
                      : esPaso6Urgente
                      ? 'bg-amber-50 border-[#F59E0B] text-amber-950 animate-pulse'
                      : esPaso4Ocupado
                      ? 'bg-amber-50 border-[#F59E0B] text-amber-950'
                      : esSugerido
                      ? 'bg-[#2563EB] border-[#1D4ED8] text-white shadow-sm'
                      : 'bg-slate-50 hover:bg-blue-50/60 border-slate-200 hover:border-[#2563EB] text-slate-800'
                  }`}
                >
                  <span
                    className={`w-8 h-8 rounded-lg font-black text-xs flex items-center justify-center shrink-0 ${
                      completado
                        ? 'bg-[#10B981] text-white'
                        : esSugerido
                        ? 'bg-white text-[#2563EB]'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {completado ? <Check className="w-4 h-4" /> : paso.num}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="text-xs sm:text-sm font-extrabold truncate">{labelDinamico}</div>
                    {modo === 'guiado' && (
                      <div
                        className={`text-[10px] truncate ${
                          esSugerido ? 'text-blue-100' : 'text-slate-500'
                        }`}
                      >
                        {paso.corto}
                      </div>
                    )}
                  </div>

                  {esSugerido && !completado && <ChevronRight className="w-4 h-4 shrink-0" />}
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

/* ============================================================================
 * 6. PESTAÑA 3: CONDUCCIÓN OMNIDIRECCIONAL — BARRIDOS VISUALES CIRCULARES 360°
 * ============================================================================ */
const SECTORES_360 = [
  { id: 0, hora: '12h', titulo: 'Frente Lejano (12s)', corto: 'Frente 12h', anguloDeg: -90 },
  { id: 1, hora: '3h', titulo: 'Flanco Derecho', corto: 'Lateral Der.', anguloDeg: -30 },
  { id: 2, hora: '5h', titulo: 'Retrovisor Derecho', corto: 'Espejo Der.', anguloDeg: 30 },
  { id: 3, hora: '6h', titulo: 'Retaguardia', corto: 'Atrás 6h', anguloDeg: 90 },
  { id: 4, hora: '7h', titulo: 'Retrovisor Izquierdo', corto: 'Espejo Izq.', anguloDeg: 150 },
  { id: 5, hora: '9h', titulo: 'Flanco Izquierdo', corto: 'Lateral Izq.', anguloDeg: 210 },
];

const AMENAZAS_OMNI = [
  { sectorId: 0, texto: 'Auto frena brusco al frente' },
  { sectorId: 4, texto: 'Moto adelantando por espejo izq.' },
  { sectorId: 1, texto: 'Camioneta invade desde flanco der.' },
  { sectorId: 3, texto: 'Carro demasiado pegado atrás' },
  { sectorId: 2, texto: 'Vehículo rápido por espejo der.' },
  { sectorId: 5, texto: 'Peatón/vehículo asomándose en flanco izq.' },
];

function polarToCartesian(cx, cy, r, deg) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describirArcoSector(cx, cy, rInner, rOuter, startDeg, endDeg) {
  const p1 = polarToCartesian(cx, cy, rOuter, startDeg);
  const p2 = polarToCartesian(cx, cy, rOuter, endDeg);
  const p3 = polarToCartesian(cx, cy, rInner, endDeg);
  const p4 = polarToCartesian(cx, cy, rInner, startDeg);
  return `M ${p1.x} ${p1.y} A ${rOuter} ${rOuter} 0 0 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${rInner} ${rInner} 0 0 0 ${p4.x} ${p4.y} Z`;
}

/**
 * Sub-vista 1: Comparador Animado Unidireccional vs. Omnidireccional
 */
function ComparadorOmnidireccional() {
  const [modoVision, setModoVision] = useState('omni'); // 'uni' | 'omni'
  const [anguloHaz, setAnguloHaz] = useState(-90);

  useEffect(() => {
    if (modoVision !== 'omni') return undefined;
    let rafId;
    let last = performance.now();
    const animar = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      setAnguloHaz((prev) => (prev + dt * 105) % 360);
      rafId = requestAnimationFrame(animar);
    };
    rafId = requestAnimationFrame(animar);
    return () => cancelAnimationFrame(rafId);
  }, [modoVision]);

  const esOmni = modoVision === 'omni';

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Toggle Comparador */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-extrabold text-slate-900">
            Comparador Visual: Túnel vs. Barrido Circular 360°
          </h2>
          <p className="text-xs text-slate-500">
            Alterna ambos modos para observar cómo cambia tu capacidad de pronosticar riesgos.
          </p>
        </div>

        <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setModoVision('uni')}
            className={`py-2 px-3 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              !esOmni ? 'bg-[#EF4444] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Unidireccional (Túnel)
          </button>
          <button
            type="button"
            onClick={() => setModoVision('omni')}
            className={`py-2 px-3 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              esOmni ? 'bg-[#10B981] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Omnidireccional (360°)
          </button>
        </div>
      </div>

      {/* Lienzo Comparador SVG + Tarjetas Explicativas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        <div className="lg:col-span-6 bg-[#0F172A] rounded-2xl border border-slate-800 p-4 shadow-md">
          <svg
            viewBox="0 0 340 320"
            className="w-full max-w-[360px] h-auto mx-auto block select-none"
            role="img"
            aria-label={
              esOmni
                ? 'Diagrama animado de conducción omnidireccional con barrido circular 360 grados'
                : 'Diagrama de visión unidireccional de túnel con peligros ocultos'
            }
          >
            {/* Anillos de referencia radar */}
            <circle cx="170" cy="160" r="134" fill="#020617" stroke="#1E293B" strokeWidth="1.5" />
            <circle cx="170" cy="160" r="95" fill="none" stroke="#1E293B" strokeWidth="1.2" strokeDasharray="4 4" />
            <circle cx="170" cy="160" r="54" fill="none" stroke="#1E293B" strokeWidth="1" />

            {esOmni ? (
              <g>
                {/* Haz giratorio circular horario de conciencia 360° */}
                <path
                  d={describirArcoSector(170, 160, 22, 132, anguloHaz - 40, anguloHaz + 15)}
                  fill="#10B981"
                  fillOpacity="0.24"
                  stroke="#34D399"
                  strokeWidth="1.5"
                />
                {/* Flecha circular horaria */}
                <circle
                  cx="170"
                  cy="160"
                  r="116"
                  fill="none"
                  stroke="#38BDF8"
                  strokeWidth="1.5"
                  strokeDasharray="6 6"
                  opacity="0.65"
                />
              </g>
            ) : (
              <g>
                {/* Visión de túnel estrecha mirando solo adelante */}
                <polygon
                  points="170,152 138,24 202,24"
                  fill="#F59E0B"
                  fillOpacity="0.28"
                  stroke="#FBBF24"
                  strokeWidth="1.5"
                />
                {/* Oscurecimiento de zonas ignoradas */}
                <path
                  d={describirArcoSector(170, 160, 26, 132, -62, 242)}
                  fill="#EF4444"
                  fillOpacity="0.18"
                />
                <text x="170" y="274" textAnchor="middle" fill="#FCA5A5" fontSize="10" fontWeight="bold">
                  ENTORNO LATERAL Y TRASERO IGNORADO
                </text>
              </g>
            )}

            {/* 6 Nodos del barrido circular */}
            {SECTORES_360.map((sec) => {
              const p = polarToCartesian(170, 160, 114, sec.anguloDeg);
              const iluminado = esOmni || sec.id === 0;
              return (
                <g key={sec.id}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="18"
                    fill={iluminado ? '#1E293B' : '#090D16'}
                    stroke={iluminado ? (esOmni ? '#34D399' : '#F59E0B') : '#7F1D1D'}
                    strokeWidth="2"
                  />
                  <text
                    x={p.x}
                    y={p.y - 1}
                    textAnchor="middle"
                    fill={iluminado ? '#FFFFFF' : '#991B1B'}
                    fontSize="9"
                    fontWeight="bold"
                  >
                    {sec.hora}
                  </text>
                  <text
                    x={p.x}
                    y={p.y + 9}
                    textAnchor="middle"
                    fill={iluminado ? '#94A3B8' : '#7F1D1D'}
                    fontSize="6.5"
                    fontWeight="bold"
                  >
                    {sec.corto.split(' ')[0]}
                  </text>
                </g>
              );
            })}

            {/* Moto en el centro */}
            <g transform="translate(170, 160)">
              <rect x="-6" y="-14" width="12" height="28" rx="5" fill="#2563EB" />
              <circle cx="0" cy="-1" r="6" fill="#F8FAFC" stroke="#1D4ED8" strokeWidth="1.5" />
            </g>
          </svg>
        </div>

        {/* Tarjetas Teóricas */}
        <div className="lg:col-span-6 space-y-3">
          <div
            className={`p-4 rounded-2xl border-2 space-y-1.5 ${
              esOmni
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : 'bg-red-50 border-red-300 text-red-950'
            }`}
          >
            <div className="font-extrabold text-sm flex items-center gap-2">
              {esOmni ? (
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-red-600" />
              )}
              <span>
                {esOmni
                  ? 'Conducción Omnidireccional: Anticipación 360°'
                  : 'Conducción Unidireccional: Visión de Túnel (Peligro)'}
              </span>
            </div>
            <p className="text-xs sm:text-sm leading-relaxed">
              {esOmni
                ? 'Tus ojos ejecutan un barrido circular continuo (12h → 3h → 5h → 6h → 7h → 9h → 12h), permitiéndote pronosticar el movimiento de cada actor vial varios segundos antes de que se cruce contigo.'
                : 'Fijar la vista únicamente en el vehículo de adelante apaga tu lectura del entorno. Cuando un auto invade tu carril lateral o frena detrás, ya no tienes tiempo ni ruta de escape.'}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5 text-xs text-slate-700">
            <div className="flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900">Ritmo seguro del barrido:</strong> nunca fijes la
                mirada más de <strong>1 segundo</strong> fuera del frente. Son micro-vistazos rápidos
                que siempre regresan a las 12h (horizonte de 12 segundos).
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Eye className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900">Visión periférica + Reflejo Vestíbulo-Ocular (VOR):</strong>{' '}
                equilibrar la visión central con la periférica y mantener estable el reflejo VOR
                permite girar la cabeza con fluidez sin perder el equilibrio ni desestabilizar la
                trayectoria.
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <Navigation className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-900">Pronóstico activo:</strong> no solo miras dónde
                están los vehículos ahora, sino hacia dónde se dirigen (ruedas delanteras girando,
                luces de freno encendidas, peatones asomándose).
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Sub-vista 2: Entrenador Interactivo de Barrido Visual Circular (Práctica de 45s)
 */
function EntrenadorBarridoCircular({ tocarSonido }) {
  const [estado, setEstado] = useState('listo'); // 'listo' | 'corriendo' | 'finalizado'
  const [tiempoRestante, setTiempoRestante] = useState(45);
  const [frescura, setFrescura] = useState([100, 100, 100, 100, 100, 100]);
  const [amenaza, setAmenaza] = useState(null); // { id, sectorId, texto, restante, total }
  const [vueltas, setVueltas] = useState(0);
  const [anticipadas, setAnticipadas] = useState(0);
  const [perdidas, setPerdidas] = useState(0);
  const [antiTunelPromedio, setAntiTunelPromedio] = useState(100);
  const [ultimoSector, setUltimoSector] = useState(0);
  const [eventoMsg, setEventoMsg] = useState(null);
  const [copiado, setCopiado] = useState(false);

  const svgRef = useRef(null);
  const arrastrandoRef = useRef(false);
  const visitadosVueltaRef = useRef(new Set([0]));
  const muestrasTunelRef = useRef([]);
  const amenazaRef = useRef(null);
  const ultimoSpawnRef = useRef(0);

  useEffect(() => {
    amenazaRef.current = amenaza;
  }, [amenaza]);

  const iniciarEntrenamiento = useCallback(() => {
    setEstado('corriendo');
    setTiempoRestante(45);
    setFrescura([100, 100, 100, 100, 100, 100]);
    setAmenaza(null);
    amenazaRef.current = null;
    setVueltas(0);
    setAnticipadas(0);
    setPerdidas(0);
    setAntiTunelPromedio(100);
    setUltimoSector(0);
    setEventoMsg('¡Barrido iniciado! Recorre en círculo los 6 sectores (12h → 3h → 5h → 6h → 7h → 9h).');
    visitadosVueltaRef.current = new Set([0]);
    muestrasTunelRef.current = [];
    ultimoSpawnRef.current = performance.now();
    tocarSonido('radar_ping');
  }, [tocarSonido]);

  const barrerSector = useCallback(
    (sectorId) => {
      if (estado !== 'corriendo') return;

      setUltimoSector(sectorId);
      setFrescura((prev) => {
        const copia = [...prev];
        copia[sectorId] = 100;
        return copia;
      });

      // Conteo de vueltas completas 360°
      visitadosVueltaRef.current.add(sectorId);
      if (visitadosVueltaRef.current.size === 6) {
        visitadosVueltaRef.current = new Set([sectorId]);
        setVueltas((v) => v + 1);
        tocarSonido('paso_ok');
      } else {
        tocarSonido('radar_ping');
      }

      // Verificar si anticipó la amenaza activa en ese sector
      const am = amenazaRef.current;
      if (am && am.sectorId === sectorId) {
        amenazaRef.current = null;
        setAmenaza(null);
        setAnticipadas((a) => a + 1);
        setEventoMsg(`✓ Amenaza anticipada en ${SECTORES_360[sectorId].hora}: "${am.texto}"`);
        tocarSonido('fanfarria');
      }
    },
    [estado, tocarSonido]
  );

  // Soporte de arrastre circular continuo (pointer move sobre el SVG)
  const detectarSectorDesdePuntero = useCallback(
    (clientX, clientY) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * 340 - 170;
      const y = ((clientY - rect.top) / rect.height) * 340 - 170;
      const dist = Math.hypot(x, y);
      if (dist < 28 || dist > 158) return;
      let deg = (Math.atan2(y, x) * 180) / Math.PI; // -180..180, -90 es arriba (12h)
      // Convertir a 0..360 donde 0 es -120° (inicio del sector 0)
      let norm = (deg + 120 + 360) % 360;
      const secId = Math.floor(norm / 60) % 6;
      if (secId !== ultimoSector) {
        barrerSector(secId);
      }
    },
    [barrerSector, ultimoSector]
  );

  // Atajos de teclado (1-6 o Flechas izq/der para girar el barrido)
  useEffect(() => {
    if (estado !== 'corriendo') return undefined;
    const onKey = (e) => {
      if (['1', '2', '3', '4', '5', '6'].includes(e.key)) {
        e.preventDefault();
        barrerSector(Number(e.key) - 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        barrerSector((ultimoSector + 1) % 6);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        barrerSector((ultimoSector + 5) % 6);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [estado, barrerSector, ultimoSector]);

  // Motor principal de 45 segundos (decaimiento de frescura + amenazas dinámicas)
  useEffect(() => {
    if (estado !== 'corriendo') return undefined;

    const tickMs = 100;
    const id = setInterval(() => {
      // 1. Temporizador principal
      setTiempoRestante((prev) => {
        const next = Math.max(0, Math.round((prev - 0.1) * 10) / 10);
        if (next <= 0) {
          setEstado('finalizado');
          tocarSonido('fanfarria');
        }
        return next;
      });

      // 2. Decaimiento de conciencia por sector (simula visión de túnel si dejas sectores sin barrer)
      setFrescura((prev) => {
        const next = prev.map((val) => Math.max(0, val - 1.35));
        const promedio = next.reduce((a, b) => a + b, 0) / 6;
        muestrasTunelRef.current.push(promedio);
        setAntiTunelPromedio(
          Math.round(
            muestrasTunelRef.current.reduce((a, b) => a + b, 0) /
              muestrasTunelRef.current.length
          )
        );
        return next;
      });

      // 3. Gestión de amenaza activa o generación de nueva amenaza
      const now = performance.now();
      if (amenazaRef.current) {
        const nuevaRestante = amenazaRef.current.restante - 0.1;
        if (nuevaRestante <= 0) {
          const vencida = amenazaRef.current;
          amenazaRef.current = null;
          setAmenaza(null);
          setPerdidas((p) => p + 1);
          setEventoMsg(`⚠ Amenaza sin detectar a tiempo en ${SECTORES_360[vencida.sectorId].hora}`);
          tocarSonido('alerta_ciego');
          ultimoSpawnRef.current = now;
        } else {
          const updated = { ...amenazaRef.current, restante: nuevaRestante };
          amenazaRef.current = updated;
          setAmenaza(updated);
        }
      } else if (now - ultimoSpawnRef.current > 2300) {
        ultimoSpawnRef.current = now;
        const pick = AMENAZAS_OMNI[Math.floor(Math.random() * AMENAZAS_OMNI.length)];
        const nuevaAm = {
          id: `${now}`,
          sectorId: pick.sectorId,
          texto: pick.texto,
          restante: 4.2,
          total: 4.2,
        };
        amenazaRef.current = nuevaAm;
        setAmenaza(nuevaAm);
      }
    }, tickMs);

    return () => clearInterval(id);
  }, [estado, tocarSonido]);

  // Diagnóstico final de la práctica de 45s
  if (estado === 'finalizado') {
    const totalAmenazas = anticipadas + perdidas;
    const tasaDeteccion = totalAmenazas > 0 ? Math.round((anticipadas / totalAmenazas) * 100) : 100;
    const puntajeFinal = Math.min(
      100,
      Math.round(antiTunelPromedio * 0.45 + tasaDeteccion * 0.4 + Math.min(100, vueltas * 14) * 0.15)
    );

    const copiarDiagnostico = async () => {
      const txt = [
        `🏍️ DIAGNÓSTICO CONDUCCIÓN OMNIDIRECCIONAL 360° — Moto App · MotoEscuelApp`,
        `Puntaje Global: ${puntajeFinal}%`,
        `• Vueltas completas de barrido circular: ${vueltas}`,
        `• Amenazas anticipadas: ${anticipadas}/${totalAmenazas} (${tasaDeteccion}%)`,
        `• Medidor Anti-Visión de Túnel: ${antiTunelPromedio}%`,
      ].join('\n');
      const ok = await copiarTextoSeguro(txt);
      if (ok) {
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2400);
      }
    };

    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-7 space-y-5 animate-fadeIn">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-extrabold">
              <Radar className="w-3.5 h-3.5" />
              <span>Entrenamiento 360° Completado (45 s)</span>
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
              Conciencia Omnidireccional: {puntajeFinal}%
            </h2>
          </div>
          <div className="px-4 py-3 rounded-xl bg-[#0F172A] text-white text-center shrink-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-sky-400">
              Vueltas 360°
            </div>
            <div className="text-2xl font-black tabular-nums">{vueltas}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-xs font-bold text-slate-500">Anti-Visión de Túnel</div>
            <div className="text-2xl font-black text-[#2563EB] mt-1">{antiTunelPromedio}%</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-xs font-bold text-slate-500">Amenazas Anticipadas</div>
            <div className="text-2xl font-black text-[#10B981] mt-1">
              {anticipadas} / {totalAmenazas}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-xs font-bold text-slate-500">Amenazas sin detectar</div>
            <div className="text-2xl font-black text-[#EF4444] mt-1">{perdidas}</div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0F172A] text-white text-xs sm:text-sm leading-relaxed">
          <strong className="text-amber-400 block mb-1">Diagnóstico Moto App · MotoEscuelApp:</strong>
          {puntajeFinal >= 80
            ? 'Excelente barrido circular sostenido. Mantienes activo tu anillo de conciencia 360° sin caer en visión de túnel. Consolida este hábito en una sesión práctica de tráfico real.'
            : 'Algunos sectores se oscurecieron por pasar demasiado tiempo sin escaneo. Practica girar tu atención en círculo constante (12h → 3h → 5h → 6h → 7h → 9h) y programa una clínica de percepción de riesgo en Moto App.'}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <button
            type="button"
            onClick={copiarDiagnostico}
            className="py-3 px-5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-800 text-sm font-bold flex items-center justify-center gap-2 cursor-pointer"
          >
            {copiado ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copiado ? '¡Copiado!' : 'Copiar diagnóstico'}</span>
          </button>
          <button
            type="button"
            onClick={iniciarEntrenamiento}
            className="py-3 px-6 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-extrabold flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Repetir práctica 45 s</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* HUD En Vivo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>Tiempo</span>
          </div>
          <div className="text-xl font-black text-slate-900 tabular-nums mt-0.5">
            {Math.ceil(tiempoRestante)} s
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
            <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
            <span>Vueltas 360°</span>
          </div>
          <div className="text-xl font-black text-emerald-600 tabular-nums mt-0.5">{vueltas}</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
            <Target className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span>Amenazas</span>
          </div>
          <div className="text-xl font-black text-slate-900 tabular-nums mt-0.5">
            {anticipadas}{' '}
            <span className="text-xs font-bold text-slate-400">
              ({perdidas} perdidas)
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
            <Activity className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>Anti-Túnel</span>
          </div>
          <div
            className={`text-xl font-black tabular-nums mt-0.5 ${
              antiTunelPromedio >= 75
                ? 'text-emerald-600'
                : antiTunelPromedio >= 50
                ? 'text-amber-600'
                : 'text-red-600'
            }`}
          >
            {antiTunelPromedio}%
          </div>
        </div>
      </div>

      {/* Área del Radar Interactivo 360° */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        <div className="lg:col-span-7 bg-[#0F172A] rounded-2xl border border-slate-800 p-4 shadow-md relative">
          <svg
            ref={svgRef}
            viewBox="0 0 340 340"
            className="w-full max-w-[380px] h-auto mx-auto block touch-none select-none cursor-pointer"
            onPointerDown={(e) => {
              arrastrandoRef.current = true;
              detectarSectorDesdePuntero(e.clientX, e.clientY);
            }}
            onPointerMove={(e) => {
              if (arrastrandoRef.current && estado === 'corriendo') {
                detectarSectorDesdePuntero(e.clientX, e.clientY);
              }
            }}
            onPointerUp={() => {
              arrastrandoRef.current = false;
            }}
            onPointerLeave={() => {
              arrastrandoRef.current = false;
            }}
            role="img"
            aria-label="Radar interactivo omnidireccional de 6 sectores"
          >
            {/* 6 Sectores Interactivos en Círculo */}
            {SECTORES_360.map((sec) => {
              const startDeg = sec.anguloDeg - 30;
              const endDeg = sec.anguloDeg + 30;
              const fresh = frescura[sec.id] / 100; // 0..1
              const tieneAmenaza = amenaza && amenaza.sectorId === sec.id;
              const esUltimo = ultimoSector === sec.id && estado === 'corriendo';
              const labelPos = polarToCartesian(170, 170, 108, sec.anguloDeg);

              const fillSector = tieneAmenaza
                ? '#EF4444'
                : fresh > 0.55
                ? '#10B981'
                : fresh > 0.25
                ? '#2563EB'
                : '#1E293B';

              const opacitySector = tieneAmenaza ? 0.42 : Math.max(0.12, fresh * 0.44);

              return (
                <g
                  key={sec.id}
                  onClick={() => barrerSector(sec.id)}
                  onMouseEnter={() => {
                    if (estado === 'corriendo') barrerSector(sec.id);
                  }}
                >
                  <path
                    d={describirArcoSector(170, 170, 38, 152, startDeg, endDeg)}
                    fill={fillSector}
                    fillOpacity={opacitySector}
                    stroke={tieneAmenaza ? '#FCA5A5' : esUltimo ? '#38BDF8' : '#334155'}
                    strokeWidth={tieneAmenaza || esUltimo ? 2.5 : 1.3}
                  />

                  {/* Etiqueta del sector */}
                  <text
                    x={labelPos.x}
                    y={labelPos.y - 4}
                    textAnchor="middle"
                    fill="#FFFFFF"
                    fontSize="11"
                    fontWeight="900"
                  >
                    {sec.hora}
                  </text>
                  <text
                    x={labelPos.x}
                    y={labelPos.y + 9}
                    textAnchor="middle"
                    fill={tieneAmenaza ? '#FEF08A' : '#CBD5E1'}
                    fontSize="8.5"
                    fontWeight="bold"
                  >
                    {sec.corto}
                  </text>

                  {/* Indicador de amenaza con anillo radial decreciente */}
                  {tieneAmenaza && (
                    <g transform={`translate(${labelPos.x}, ${labelPos.y - 24})`}>
                      <circle r="11" fill="#DC2626" stroke="#FEF08A" strokeWidth="2" className="animate-pulse" />
                      <text y="4" textAnchor="middle" fill="#FFFFFF" fontSize="12" fontWeight="900">
                        !
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Moto en el centro del radar */}
            <circle cx="170" cy="170" r="34" fill="#0F172A" stroke="#38BDF8" strokeWidth="2" />
            <g transform="translate(170, 170)">
              <rect x="-6" y="-15" width="12" height="30" rx="5" fill="#2563EB" />
              <circle cx="0" cy="-1" r="6" fill="#F8FAFC" stroke="#1D4ED8" strokeWidth="1.5" />
            </g>
          </svg>

          {/* Overlay inicial */}
          {estado === 'listo' && (
            <div className="absolute inset-0 bg-slate-950/78 backdrop-blur-[2px] rounded-2xl flex items-center justify-center p-5">
              <div className="bg-white rounded-2xl max-w-sm w-full p-5 text-center space-y-4 shadow-xl">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#2563EB] flex items-center justify-center mx-auto">
                  <ScanEye className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-extrabold text-slate-900">
                    Entrenador de Barrido Visual 360° (45 s)
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Desliza en círculo o toca los 6 sectores del radar continuamente para mantener tu{' '}
                    <strong>Anillo de Conciencia</strong> iluminado y detectar las amenazas antes de
                    que expiren.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={iniciarEntrenamiento}
                  className="w-full py-3 px-4 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-extrabold text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Iniciar Entrenamiento 360°</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Panel derecho de alerta de amenaza activa + controles táctiles */}
        <div className="lg:col-span-5 space-y-4">
          {amenaza ? (
            <div className="p-4 rounded-2xl bg-red-50 border-2 border-[#EF4444] space-y-2.5 animate-fadeIn">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-black uppercase text-red-700 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Amenaza en {SECTORES_360[amenaza.sectorId].hora}</span>
                </span>
                <span className="text-xs font-black text-red-700 tabular-nums">
                  {amenaza.restante.toFixed(1)} s
                </span>
              </div>
              <div className="text-sm font-extrabold text-red-950">{amenaza.texto}</div>
              <div className="w-full h-2 bg-red-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#EF4444] rounded-full transition-all duration-100"
                  style={{ width: `${(amenaza.restante / amenaza.total) * 100}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-1.5">
              <div className="text-xs font-extrabold text-[#2563EB] uppercase tracking-wide">
                Estado del Barrido Circular
              </div>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                {eventoMsg ||
                  'Mantén tu barrido circular activo tocando o deslizando sobre los 6 sectores del radar.'}
              </p>
            </div>
          )}

          {/* Botonera táctil rápida de los 6 sectores (para pulgares en celular o teclado 1-6) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5">
            <div className="text-xs font-extrabold text-slate-700 flex items-center justify-between">
              <span>Sectores de escaneo rápido</span>
              <span className="text-[10px] text-slate-400">Teclas 1–6 o ← →</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {SECTORES_360.map((sec) => {
                const tieneAm = amenaza && amenaza.sectorId === sec.id;
                return (
                  <button
                    key={sec.id}
                    type="button"
                    disabled={estado !== 'corriendo'}
                    onClick={() => barrerSector(sec.id)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-extrabold flex items-center justify-between transition-all cursor-pointer disabled:opacity-50 ${
                      tieneAm
                        ? 'bg-red-600 border-red-700 text-white animate-pulse'
                        : 'bg-slate-50 hover:bg-blue-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <span>
                      {sec.hora} · {sec.corto}
                    </span>
                    <span className="text-[10px] opacity-75 tabular-nums">
                      {Math.round(frescura[sec.id])}%
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PestanaOmnidireccional({ tocarSonido }) {
  const [subVista, setSubVista] = useState('comparador'); // 'comparador' | 'entrenador'

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Selector de Sub-vista */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-2xl border border-slate-200 p-3 shadow-xs">
        <div className="grid grid-cols-2 gap-1.5 w-full sm:w-auto bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setSubVista('comparador')}
            className={`py-2 px-4 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              subVista === 'comparador'
                ? 'bg-[#2563EB] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Teoría Visual (Unidireccional vs. 360°)</span>
          </button>
          <button
            type="button"
            onClick={() => setSubVista('entrenador')}
            className={`py-2 px-4 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              subVista === 'entrenador'
                ? 'bg-[#2563EB] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Radar className="w-3.5 h-3.5" />
            <span>Entrenador de Barrido 360° (45 s)</span>
          </button>
        </div>
      </div>

      {subVista === 'comparador' ? (
        <ComparadorOmnidireccional />
      ) : (
        <EntrenadorBarridoCircular tocarSonido={tocarSonido} />
      )}
    </div>
  );
}

/* ============================================================================
 * 7. COMPONENTE RAÍZ CON HEADER, AUDIO Y 3 PESTAÑAS PRINCIPALES
 * ============================================================================ */
function SimuladorOmnidireccionalApp() {
  const [tab, setTab] = useState('retrovisores'); // 'retrovisores' | 'pasos' | 'omni'
  const [sonidoActivo, setSonidoActivo] = useState(true);

  const tocarSonido = useAudioVial(sonidoActivo);

  const tabs = [
    {
      id: 'retrovisores',
      label: '1. Retrovisores (Triángulo Invertido)',
      short: '1. Retrovisores',
      icon: Compass,
    },
    {
      id: 'pasos',
      label: '2. Cambio de Carril (6 Pasos)',
      short: '2. 6 Pasos',
      icon: Navigation,
    },
    {
      id: 'omni',
      label: '3. Conducción Omnidireccional',
      short: '3. Visión 360°',
      icon: Radar,
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans antialiased overflow-x-hidden">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.25s ease-out both;
        }
      `}</style>

      {/* Header Limpio y Técnico */}
      <header className="sticky top-0 z-30 bg-[#0F172A] text-white border-b border-slate-800 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 pt-3.5 pb-3 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] flex items-center justify-center shadow-md shrink-0">
                <Bike className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-blue-400">
                  Moto App · MotoEscuelApp
                </div>
                <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-white truncate">
                  Simulador Omnidireccional: 6 Pasos y Retrovisores
                </h1>
                <p className="text-[11px] text-slate-400 truncate hidden sm:block">
                  Sistema de Cambio de Carril, Triángulo Invertido y Visión 360°
                </p>
              </div>
            </div>

            {/* Botón Silenciar / Activar sonido Web Audio API */}
            <button
              type="button"
              onClick={() => setSonidoActivo((v) => !v)}
              aria-label={sonidoActivo ? 'Silenciar sonido' : 'Activar sonido'}
              className={`shrink-0 py-2 px-3 rounded-xl border text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                sonidoActivo
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              {sonidoActivo ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span className="hidden sm:inline">
                {sonidoActivo ? 'Sonido ON' : 'Silenciado'}
              </span>
            </button>
          </div>

          {/* 3 Pestañas Principales */}
          <nav
            role="tablist"
            aria-label="Módulos del Simulador Omnidireccional"
            className="grid grid-cols-3 gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800"
          >
            {tabs.map((t) => {
              const Icono = t.icon;
              const activa = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={activa}
                  onClick={() => setTab(t.id)}
                  className={`py-2.5 px-2 sm:px-3 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activa
                      ? 'bg-[#2563EB] text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                  }`}
                >
                  <Icono className="w-4 h-4 shrink-0" />
                  <span className="hidden md:inline truncate">{t.label}</span>
                  <span className="md:hidden truncate">{t.short}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-5">
        {tab === 'retrovisores' && <PestanaRetrovisores tocarSonido={tocarSonido} />}
        {tab === 'pasos' && <PestanaCambioCarril6Pasos tocarSonido={tocarSonido} />}
        {tab === 'omni' && <PestanaOmnidireccional tocarSonido={tocarSonido} />}
      </main>

      {/* Footer limpio */}
      <footer className="max-w-5xl w-full mx-auto px-4 py-4 text-center text-[11px] text-slate-400 flex flex-wrap items-center justify-center gap-1.5">
        <Info className="w-3.5 h-3.5" />
        <span>
          Moto App · MotoEscuelApp · Entrenamiento interactivo de retrovisores en triángulo
          invertido, cambio de carril en 6 pasos y conducción omnidireccional 360°.
        </span>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SimuladorOmnidireccionalApp />
    </ErrorBoundary>
  );
}