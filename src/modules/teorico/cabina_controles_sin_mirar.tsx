import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Bike,
  Volume2,
  VolumeX,
  Compass,
  Zap,
  ShieldCheck,
  ShieldAlert,
  Scale,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  Copy,
  Check,
  Flame,
  Clock,
  Award,
  ZoomIn,
  Maximize2,
  ArrowRight,
  Info,
  Eye,
  Gauge,
  Power,
  Bell,
  Lightbulb,
  Hand,
  Sparkles,
  ListChecks,
  FileText,
  Target,
  Sliders,
  RefreshCw,
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
    console.error('Error en CabinaControlesSinMirar:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-md w-full text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-extrabold text-slate-900">
              Inconveniente en el simulador de cabina
            </h2>
            <p className="text-sm text-slate-600">
              Puedes reiniciar este módulo interactivo para continuar tu entrenamiento.
            </p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false })}
              className="w-full py-3 px-4 rounded-xl bg-[#2563eb] hover:bg-blue-700 text-white font-bold text-sm transition-colors cursor-pointer"
            >
              Reiniciar Cabina
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
function useSoundEngine(audioHabilitado) {
  const ctxRef = useRef(null);

  const getContext = useCallback(() => {
    if (!audioHabilitado) return null;
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
  }, [audioHabilitado]);

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

  const play = useCallback(
    (tipo) => {
      const ctx = getContext();
      if (!ctx) return;
      try {
        const now = ctx.currentTime;

        if (tipo === 'claxon') {
          // Doble tono de corneta de motocicleta
          [415, 520].forEach((freq) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now);
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(1600, now);
            gain.gain.setValueAtTime(0.001, now);
            gain.gain.linearRampToValueAtTime(0.11, now + 0.02);
            gain.gain.setValueAtTime(0.11, now + 0.32);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.44);
          });
        } else if (tipo === 'direccionales') {
          // Tic-tac de relé de luces de cruce
          [0, 0.22].forEach((delay, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(idx === 0 ? 1150 : 880, now + delay);
            gain.gain.setValueAtTime(0.09, now + delay);
            gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.045);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + delay);
            osc.stop(now + delay + 0.05);
          });
        } else if (tipo === 'arranque') {
          // Zumbido de arranque eléctrico + ralentí
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(105, now);
          osc.frequency.linearRampToValueAtTime(215, now + 0.26);
          osc.frequency.exponentialRampToValueAtTime(92, now + 0.55);
          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(620, now);
          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(0.12, now + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
          osc.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.62);
        } else if (tipo === 'acelerador') {
          // Aceleración progresiva de motor
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const filter = ctx.createBiquadFilter();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(88, now);
          osc.frequency.exponentialRampToValueAtTime(260, now + 0.24);
          osc.frequency.exponentialRampToValueAtTime(96, now + 0.62);
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(900, now);
          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(0.13, now + 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.66);
          osc.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.68);
        } else if (tipo === 'paro_motor') {
          // Clic firme + corte descendente de potencia
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(320, now);
          osc.frequency.exponentialRampToValueAtTime(55, now + 0.28);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.32);
        } else if (tipo === 'acierto') {
          // Doble tono ascendente limpio
          [587.33, 880].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.09);
            gain.gain.setValueAtTime(0.001, now + idx * 0.09);
            gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.09 + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.22);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + idx * 0.09);
            osc.stop(now + idx * 0.09 + 0.24);
          });
        } else if (tipo === 'error') {
          // Tono grave descendente
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(220, now);
          osc.frequency.linearRampToValueAtTime(140, now + 0.26);
          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(500, now);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
          osc.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.3);
        } else {
          // Clic mecánico genérico para switches y palancas
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(680, now);
          osc.frequency.exponentialRampToValueAtTime(240, now + 0.06);
          gain.gain.setValueAtTime(0.09, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.08);
        }
      } catch {
        // Silencioso si el navegador bloquea el audio
      }
    },
    [getContext]
  );

  return play;
}

/* ============================================================================
 * 3. CATÁLOGO MAESTRO DE CONTROLES (MANUAL MSF ED. 17 + LEY VENEZOLANA)
 * ============================================================================ */
function obtenerControlesPorTransmision(transmision) {
  const esManual = transmision === 'manual';

  const base = [
    {
      id: 'luces',
      nombre: 'Interruptor de Luces (Altas / Bajas)',
      corto: 'Luces Altas/Bajas',
      zona: 'Mano Izquierda',
      zonaKey: 'izq',
      sonido: 'clic',
      funcion:
        'Alterna entre luz baja (cruce) y luz alta (carretera) usando el pulgar o índice izquierdo sin soltar el puño.',
      sinMirar:
        'Se ubica en la parte superior de la piña izquierda. Un toque hacia arriba o adelante activa el haz alto (testigo azul en el tablero).',
      consejoMSF:
        'Usa luz baja de día para aumentar tu visibilidad y baja inmediatamente a luz de cruce cuando un vehículo se aproxime de frente en la noche.',
      baseLegal:
        'Decreto N° 8.495 · Art. 9 num. 2 (faro delantero con alcance mínimo de 150 m), Art. 28 num. 14 y Art. 30 num. 14 (luces encendidas obligatorias al circular).',
    },
    {
      id: 'direccionales',
      nombre: 'Interruptor de Direccionales (Luces de Cruce)',
      corto: 'Direccionales',
      zona: 'Mano Izquierda',
      zonaKey: 'izq',
      sonido: 'direccionales',
      funcion:
        'Activa las luces intermitentes izquierda o derecha para comunicar tus giros, cambios de canal o desincorporaciones.',
      sinMirar:
        'Desliza el selector central con el pulgar izquierdo hacia el lado del giro y presiona el centro para cancelar al completar la maniobra.',
      consejoMSF:
        'La mayoría de motocicletas NO cancelan las direccionales automáticamente. Acostúmbrate a presionar el botón central tras cada curva para no confundir a otros conductores.',
      baseLegal:
        'Decreto N° 8.495 · Art. 32 num. 4 (usar luces de cruce antes del adelantamiento) y Art. 32 num. 7 (señalizar desincorporación de la vía). Reglamento Art. 271.',
    },
    {
      id: 'claxon',
      nombre: 'Botón del Claxon (Corneta / Bocina)',
      corto: 'Claxon / Corneta',
      zona: 'Mano Izquierda',
      zonaKey: 'izq',
      sonido: 'claxon',
      funcion:
        'Emite una señal acústica inmediata para alertar a peatones distraídos o vehículos que invaden tu trayectoria.',
      sinMirar:
        'Botón inferior en la piña izquierda, diseñado para alcanzarlo con el pulgar en fracciones de segundo sin aflojar el agarre.',
      consejoMSF:
        'La corneta es una herramienta de prevención puntual, nunca sustituye frenar o esquivar. Un toque breve llama la atención sin sobresaltar en exceso.',
      baseLegal:
        'Decreto N° 8.495 · Art. 9 num. 1 (bocina eléctrica obligatoria); Art. 11 num. 7 y Art. 31 num. 10 (prohibido usar la corneta en áreas urbanas/prohibidas salvo emergencia).',
    },
    {
      id: 'ahogador',
      nombre: 'Ahogador (Choke)',
      corto: 'Ahogador',
      zona: 'Mano Izquierda',
      zonaKey: 'izq',
      sonido: 'clic',
      funcion:
        'Enriquece la mezcla aire-combustible para facilitar el encendido en frío en motocicletas carburadas (varía según modelo; motos con inyección electrónica no lo requieren).',
      sinMirar:
        'Palanca pequeña junto a la piña izquierda (o en el costado del carburador). Recuerda regresarlo a su posición normal al calentar el motor.',
      consejoMSF:
        'Antes de rodar en una moto prestada o nueva, ubica si tiene ahogador y confirma su recorrido en parado.',
      baseLegal:
        'Manual MSF Ed. 17 (Familiarización con controles) · Operarlo correctamente evita apagones inesperados al incorporarse a la vía (Art. 26 Decreto N° 8.495).',
    },
    {
      id: 'palanca_izq',
      nombre: esManual
        ? 'Palanca del Clutch (Embrague)'
        : 'Palanca del Freno Trasero (Scooter / Automática)',
      corto: esManual ? 'Clutch / Embrague' : 'Freno Trasero (Mano)',
      zona: 'Mano Izquierda',
      zonaKey: 'izq',
      sonido: 'clic',
      funcion: esManual
        ? 'Conecta y desconecta la potencia del motor hacia la rueda trasera para arrancar suavemente y realizar cambios de marcha.'
        : 'Acciona el freno de la rueda trasera desde el manillar izquierdo, ideal para estabilizar en baja velocidad y complementar el freno delantero.',
      sinMirar: esManual
        ? 'Se acciona con los dedos de la mano izquierda buscando suavemente la zona de fricción sin soltar bruscamente.'
        : 'Se modula progresivamente con los dedos de la mano izquierda en conjunto con la palanca derecha para lograr detenciones cortas y rectas.',
      consejoMSF: esManual
        ? 'Cubre la palanca del clutch junto con los frenos al cruzar intersecciones. En una emergencia de acelerador pegado, apretar el clutch corta de inmediato la tracción.'
        : 'En motos automáticas nunca confundas esta palanca con un embrague: apretarla bruscamente a alta velocidad puede bloquear la rueda trasera.',
      baseLegal: esManual
        ? 'Decreto N° 8.495 · Art. 26 (mantener el control físico constante de la motocicleta).'
        : 'Decreto N° 8.495 · Art. 9 num. 3 (sistema de frenos capaz de detener la moto en 5 m a 30 km/h).',
    },
    {
      id: 'paro_motor',
      nombre: 'Interruptor de Paro del Motor (Kill Switch)',
      corto: 'Paro del Motor',
      zona: 'Mano Derecha',
      zonaKey: 'der',
      sonido: 'paro_motor',
      funcion:
        'Corta instantáneamente el encendido del motor en caso de emergencia (como acelerador pegado o caída) sin tener que soltar el manillar para buscar la llave.',
      sinMirar:
        'Switch rojo en la parte superior de la piña derecha, al alcance inmediato del pulgar derecho.',
      consejoMSF:
        'El Manual MSF recomienda practicar su ubicación con los ojos cerrados. Si el acelerador se traba, presiona el paro del motor y aprieta el clutch/frenos con control.',
      baseLegal:
        'Manual MSF Ed. 17 (Controles críticos de emergencia) · Decreto N° 8.495 Art. 26 (Control del vehículo).',
    },
    {
      id: 'arranque',
      nombre: 'Botón de Arranque Eléctrico',
      corto: 'Arranque Eléctrico',
      zona: 'Mano Derecha',
      zonaKey: 'der',
      sonido: 'arranque',
      funcion:
        'Acciona el motor de arranque para encender la motocicleta una vez que el suiche y el interruptor de paro están en posición activa.',
      sinMirar:
        'Botón inferior en la piña derecha. En motos automáticas exige mantener apretado un freno; en sincrónicas estar en neutro o con el clutch apretado.',
      consejoMSF:
        'Mantén el dedo fuera del acelerador al presionar arranque en motos de inyección y verifica siempre el testigo verde de Neutro (N) antes de soltar el embrague.',
      baseLegal:
        'Reglamento Art. 271 y Decreto N° 8.495 Art. 32 (incorporarse a la circulación sin movimientos bruscos).',
    },
    {
      id: 'acelerador',
      nombre: 'Puño del Acelerador',
      corto: 'Acelerador',
      zona: 'Mano Derecha',
      zonaKey: 'der',
      sonido: 'acelerador',
      funcion:
        'Controla el flujo de potencia del motor girándolo suavemente hacia ti para acelerar y hacia adelante para desacelerar.',
      sinMirar:
        'Agarre firme pero relajado con la muñeca baja/plana. Así, al extender los dedos hacia el freno delantero, el acelerador se cierra naturalmente.',
      consejoMSF:
        'Nunca gires el acelerador con la muñeca arqueada hacia arriba: ante un bache o frenado imprevisto terminarías acelerando por accidente.',
      baseLegal:
        'Decreto N° 8.495 · Art. 25 (respetar límites de velocidad) y Art. 32 num. 9 (no ejecutar cambios bruscos de velocidad o dirección).',
    },
    {
      id: 'freno_delantero',
      nombre: 'Palanca del Freno Delantero',
      corto: 'Freno Delantero',
      zona: 'Mano Derecha',
      zonaKey: 'der',
      sonido: 'clic',
      funcion:
        'Proporciona aproximadamente el 70% de la capacidad total de frenado de la motocicleta mediante compresión hidráulica o mecánica en la rueda delantera.',
      sinMirar:
        'Palanca frontal del puño derecho. Apriétala de forma progresiva ("exprimir", nunca "agarrar de golpe") para transferir peso y maximizar adherencia.',
      consejoMSF:
        'Aplica ambos frenos en cada detención normal para desarrollar memoria muscular, manteniendo el manubrio derecho antes de exigir máxima frenada.',
      baseLegal:
        'Decreto N° 8.495 · Art. 9 num. 3: Obligatorio contar con sistema de frenos capaz de detener la motocicleta en 5 metros circulando a 30 km/h.',
    },
    {
      id: 'encendido',
      nombre: 'Interruptor de Encendido (Suiche / Llave)',
      corto: 'Suiche / Encendido',
      zona: 'Centro y Tablero',
      zonaKey: 'centro',
      sonido: 'clic',
      funcion:
        'Habilita el circuito eléctrico general (ON), apaga el sistema (OFF) y permite bloquear la dirección (LOCK) al estacionar.',
      sinMirar:
        'Ubicado en el centro del cabezal de dirección (su posición exacta varía según el modelo). No intentes manipularlo con la moto en movimiento.',
      consejoMSF:
        'Antes de salir, verifica que la llave esté firme y que el llavero no sea voluminoso para no rayar ni trabar la dirección en giros cerrados.',
      baseLegal:
        'Decreto N° 8.495 · Art. 32 num. 8 (estacionar cuidadosamente asegurando la motocicleta fuera de la calzada).',
    },
    {
      id: 'tablero',
      nombre: 'Tablero: Velocímetro, Odómetro y Tacómetro',
      corto: 'Tablero / Relojes',
      zona: 'Centro y Tablero',
      zonaKey: 'centro',
      sonido: 'clic',
      funcion:
        'Muestra tu velocidad (km/h), kilometraje acumulado, revoluciones por minuto (RPM) y testigos luminosos (Neutro, Luz Alta, Direccionales, Corte de Motor).',
      sinMirar:
        'Usa vistazos ultrarrápidos (menos de 0.5 segundos) para confirmar velocidad o testigos sin perder tu escaneo frontal de 12 segundos (RiderRadar).',
      consejoMSF:
        'Aprende a escuchar el motor y sentir las vibraciones para no depender de mirar el tacómetro en cada cambio de marcha.',
      baseLegal:
        'Decreto N° 8.495 · Art. 25 (obligación de respetar los límites de velocidad establecidos en cada vía).',
    },
    {
      id: 'combustible',
      nombre: 'Válvula de Suministro de Combustible (ON / OFF / RES)',
      corto: 'Llave de Gasolina',
      zona: 'Centro y Tablero',
      zonaKey: 'centro',
      sonido: 'clic',
      funcion:
        'Controla el paso de gasolina hacia el motor en motos equipadas con llave manual: ON (normal), OFF (cerrado) y RES (reserva de emergencia).',
      sinMirar:
        'Situada en el costado inferior izquierdo del tanque. Memoriza la orientación de la palanquita para poder girarla a RES con la mano izquierda si la moto empieza a toser en vía.',
      consejoMSF:
        'Apenas cambies a RES, dirígete a la estación de servicio más cercana y recuerda devolver la válvula a ON al llenar el tanque para no quedarte sin reserva luego.',
      baseLegal:
        'Manual MSF Ed. 17 (Conozca su Motocicleta) · Evita detenciones imprevistas peligrosas en vías rápidas (Reglamento Art. 273).',
    },
    {
      id: 'espejos',
      nombre: 'Espejos Retrovisores (Izquierdo y Derecho)',
      corto: 'Espejos Retrovisores',
      zona: 'Centro y Tablero',
      zonaKey: 'centro',
      sonido: 'clic',
      funcion:
        'Permiten vigilar el tráfico detrás y a los costados para mantener tu espacio de colchón trasero antes de frenar, girar o adelantar.',
      sinMirar:
        'Revísalos con micro-vistazos frecuentes cada pocos segundos y complétalos siempre con un giro rápido de cabeza (chequeo de hombro) para cubrir puntos ciegos.',
      consejoMSF:
        'Ajusta ambos espejos sentado en postura real de manejo para ver el carril detrás y apenas el borde exterior de tus hombros.',
      baseLegal:
        'Decreto N° 8.495 · Art. 9 num. 6: Toda motocicleta debe llevar obligatoriamente dos (2) espejos retrovisores, uno del lado derecho y otro del lado izquierdo.',
    },
  ];

  if (esManual) {
    base.push(
      {
        id: 'cambios',
        nombre: 'Palanca de Cambios (Pie Izquierdo)',
        corto: 'Palanca de Cambios',
        zona: 'Pies (Sincrónica)',
        zonaKey: 'pies',
        sonido: 'clic',
        funcion:
          'Selecciona las marchas del motor en patrón estándar (1 abajo · N medio toque · 2-3-4-5-6 arriba) coordinada con el embrague.',
        sinMirar:
          'Se opera exclusivamente con la punta del pie izquierdo sin bajar nunca la mirada hacia el pedal.',
        consejoMSF:
          'Reduce de marcha ANTES de entrar a una curva para tener freno motor y tracción estable al salir. Usa calzado firme que cubra el tobillo.',
        baseLegal:
          'Decreto N° 8.495 · Art. 26 (control de la motocicleta) y Art. 32 num. 2 (acercarse a curvas e intersecciones con precaución).',
      },
      {
        id: 'freno_trasero_pie',
        nombre: 'Pedal de Freno Trasero (Pie Derecho)',
        corto: 'Pedal Freno Trasero',
        zona: 'Pies (Sincrónica)',
        zonaKey: 'pies',
        sonido: 'clic',
        funcion:
          'Aporta cerca del 30% de la potencia de frenado, ayuda a estabilizar el chasis en maniobras lentas y complementa al freno delantero.',
        sinMirar:
          'Apoya la parte delantera del pie derecho en el estribo y pivotea suavemente la punta sobre el pedal sin pisar bruscamente.',
        consejoMSF:
          'Presiónalo con suavidad y progresividad junto con el freno delantero. Un pisotón fuerte puede bloquear la rueda trasera y hacer derrapar la moto.',
        baseLegal:
          'Decreto N° 8.495 · Art. 9 num. 3 (capacidad reglamentaria de frenado en 5 m a 30 km/h).',
      }
    );
  }

  return base;
}

/* ============================================================================
 * 4. ESCENARIOS DEL RETO CONTRARRELOJ "SIN MIRAR" (10 SITUACIONES REALES)
 * ============================================================================ */
function construirEscenariosReto(transmision) {
  const esManual = transmision === 'manual';

  return [
    {
      id: 'r1',
      targetId: 'paro_motor',
      critico: true,
      icono: 'alert',
      etiqueta: 'EMERGENCIA MECÁNICA',
      situacion:
        '¡El acelerador se quedó pegado al máximo! Corta la potencia de inmediato sin soltar el manillar.',
      explicacion:
        'El Interruptor de Paro del Motor (Kill Switch rojo) corta la chispa al instante con tu pulgar derecho sin retirar las manos del manubrio.',
    },
    {
      id: 'r2',
      targetId: 'direccionales',
      critico: true,
      icono: 'turn',
      etiqueta: 'MANIOBRA EN VÍA · ART. 32',
      situacion:
        'Vas a adelantar a un vehículo por el carril izquierdo: anuncia tu maniobra antes de cambiar de canal.',
      explicacion:
        'El Art. 32 num. 4 del Decreto N° 8.495 exige activar las luces de cruce antes del adelantamiento (pulgar izquierdo).',
    },
    {
      id: 'r3',
      targetId: 'luces',
      critico: false,
      icono: 'light',
      etiqueta: 'VISIBILIDAD NOCTURNA',
      situacion:
        'Un carro viene de frente en carretera con las luces altas encandilándote: cambia o haz cambio de luces.',
      explicacion:
        'El interruptor de luces altas/bajas en la piña izquierda te permite alternar el haz sin soltar el agarre.',
    },
    {
      id: 'r4',
      targetId: 'combustible',
      critico: false,
      icono: 'fuel',
      etiqueta: 'GESTIÓN DE COMBUSTIBLE',
      situacion:
        'La moto empieza a toser y perder fuerza por falta de gasolina en vía: pásala a reserva (RES).',
      explicacion:
        'La válvula de suministro de combustible en el costado izquierdo del tanque permite pasar a RES sin bajar la mirada.',
    },
    {
      id: 'r5',
      targetId: 'claxon',
      critico: false,
      icono: 'horn',
      etiqueta: 'ALERTA PREVENTIVA',
      situacion:
        'Un peatón distraído mirando el teléfono da un paso repentino hacia tu carril sin verte: adviértelo ya.',
      explicacion:
        'Un toque breve del claxon (botón inferior izquierdo) alerta en emergencias urbanas sin quitar las manos de los frenos.',
    },
    {
      id: 'r6',
      targetId: 'espejos',
      critico: false,
      icono: 'eye',
      etiqueta: 'ESTRATEGIA SEE',
      situacion:
        'Antes de frenar o cambiar de posición en el carril, verifica el tráfico que viene detrás de ti.',
      explicacion:
        'Ambos espejos retrovisores (obligatorios por Art. 9 num. 6) te permiten vigilar el espacio de colchón trasero.',
    },
    {
      id: 'r7',
      targetId: 'freno_delantero',
      critico: true,
      icono: 'brake',
      etiqueta: 'PARADA DE EMERGENCIA',
      situacion:
        'Un auto frena de golpe adelante: aplica de inmediato el freno principal (70% de potencia) con firmeza progresiva.',
      explicacion:
        'La palanca del freno delantero en la mano derecha aporta la mayor capacidad de detención (Art. 9 num. 3: 5 m a 30 km/h).',
    },
    {
      id: 'r8',
      targetId: 'ahogador',
      critico: false,
      icono: 'choke',
      etiqueta: 'ENCENDIDO EN FRÍO',
      situacion:
        'Mañana fría en una moto carburada y el motor no mantiene el encendido: enriquece la mezcla.',
      explicacion:
        'El ahogador (Choke) en el lado izquierdo restringe el aire para facilitar el arranque en frío en motos carburadas.',
    },
    {
      id: 'r9',
      targetId: 'arranque',
      critico: false,
      icono: 'start',
      etiqueta: 'REANUDAR MARCHA',
      situacion:
        'La moto se apagó en el semáforo, el suiche está en ON y ya verificaste Neutro: enciende el motor.',
      explicacion:
        'El botón de arranque eléctrico en la parte inferior de la piña derecha reactiva el motor con tu pulgar derecho.',
    },
    esManual
      ? {
          id: 'r10',
          targetId: 'cambios',
          critico: false,
          icono: 'gear',
          etiqueta: 'CONTROL DE CURVA · SINCRÓNICA',
          situacion:
            'Te aproximas a una curva cerrada y debes bajar una marcha para aprovechar el freno motor.',
          explicacion:
            'En moto sincrónica, la palanca de cambios del pie izquierdo permite reducir marcha antes de entrar a la curva sin mirar abajo.',
        }
      : {
          id: 'r10',
          targetId: 'palanca_izq',
          critico: false,
          icono: 'brake',
          etiqueta: 'ESTABILIDAD · AUTOMÁTICA',
          situacion:
            'Avanzas muy lento en tráfico cerrado en scooter y necesitas modular el freno trasero desde el manillar.',
          explicacion:
            'En moto automática (scooter), la palanca izquierda acciona el freno trasero para darte estabilidad y precisión a baja velocidad.',
        },
  ];
}

const NIVELES_RETO = [
  {
    id: 1,
    titulo: 'Nivel 1 · Explorador',
    subtitulo: 'Etiquetas visibles en cabina',
    tiempoMs: 5000,
    tiempoLabel: '5.0 s / situación',
    mostrarEtiquetas: true,
    modoNocturno: false,
    badge: 'Ideal para empezar',
    colorBorder: 'border-emerald-300',
    colorBg: 'bg-emerald-50 text-emerald-800',
  },
  {
    id: 2,
    titulo: 'Nivel 2 · Piloto Urbano',
    subtitulo: 'Sin etiquetas, solo íconos y forma real',
    tiempoMs: 3500,
    tiempoLabel: '3.5 s / situación',
    mostrarEtiquetas: false,
    modoNocturno: false,
    badge: 'Memoria visual',
    colorBorder: 'border-blue-300',
    colorBg: 'bg-blue-50 text-[#2563eb]',
  },
  {
    id: 3,
    titulo: 'Nivel 3 · Modo Sin Mirar PRO',
    subtitulo: 'Cabina nocturna táctica sin etiquetas',
    tiempoMs: 2500,
    tiempoLabel: '2.5 s / situación',
    mostrarEtiquetas: false,
    modoNocturno: true,
    badge: 'Memoria muscular real',
    colorBorder: 'border-amber-300',
    colorBg: 'bg-amber-50 text-amber-800',
  },
];

/* ============================================================================
 * 5. COMPONENTE CABINA INTERACTIVA SVG EN PRIMERA PERSONA (REUTILIZABLE)
 * ============================================================================ */
function CabinaInteractivaSVG({
  transmision,
  zoom,
  setZoom,
  controlActivoId,
  controlCorrectoId = null,
  controlErrorId = null,
  explorados = new Set(),
  mostrarEtiquetas = true,
  modoNocturno = false,
  estadoCabina,
  onAccionarControl,
  ocultarTextoAyuda = false,
}) {
  const esManual = transmision === 'manual';

  // ViewBox dinámico para zoom suave en móvil y escritorio
  const viewBoxActual =
    zoom === 'izq'
      ? '25 105 335 235'
      : zoom === 'der'
      ? '440 105 335 235'
      : '0 0 800 430';

  // Ángulos de las agujas del tablero
  const anguloVelocimetro = -125 + Math.min(1, estadoCabina.velocidad / 140) * 250;
  const anguloTacometro = -125 + Math.min(1, estadoCabina.rpm / 10000) * 250;

  // Helper de estilos visuales de cada control en el SVG
  const getEstiloControl = (id) => {
    const esCorrecto = controlCorrectoId === id;
    const esError = controlErrorId === id;
    const esActivo = controlActivoId === id;
    const yaExplorado = explorados.has(id);

    if (esCorrecto) {
      return {
        stroke: '#10b981',
        strokeWidth: 4,
        glow: 'rgba(16, 185, 129, 0.5)',
        resaltado: true,
      };
    }
    if (esError) {
      return {
        stroke: '#ef4444',
        strokeWidth: 4,
        glow: 'rgba(239, 68, 68, 0.5)',
        resaltado: true,
      };
    }
    if (esActivo) {
      return {
        stroke: '#3b82f6',
        strokeWidth: 3.5,
        glow: 'rgba(59, 130, 246, 0.45)',
        resaltado: true,
      };
    }
    if (yaExplorado && mostrarEtiquetas) {
      return {
        stroke: '#10b981',
        strokeWidth: 2,
        glow: null,
        resaltado: false,
      };
    }
    return {
      stroke: modoNocturno ? '#334155' : '#64748b',
      strokeWidth: 1.5,
      glow: null,
      resaltado: false,
    };
  };

  // Botones táctiles ampliados para cuando el usuario usa Zoom o pantalla móvil estrecha
  const botonesAccesoRapido = useMemo(() => {
    if (zoom === 'izq') {
      return [
        { id: 'luces', label: 'Luces Altas/Bajas' },
        { id: 'direccionales', label: 'Direccionales' },
        { id: 'claxon', label: 'Claxon / Corneta' },
        { id: 'ahogador', label: 'Ahogador (Choke)' },
        {
          id: 'palanca_izq',
          label: esManual ? 'Palanca Clutch' : 'Freno Trasero (Mano)',
        },
        { id: 'espejos', label: 'Espejo Izq.' },
      ];
    }
    if (zoom === 'der') {
      return [
        { id: 'paro_motor', label: 'Paro del Motor (Rojo)' },
        { id: 'arranque', label: 'Arranque Eléctrico' },
        { id: 'acelerador', label: 'Puño Acelerador' },
        { id: 'freno_delantero', label: 'Freno Delantero' },
        { id: 'espejos', label: 'Espejo Der.' },
      ];
    }
    return [];
  }, [zoom, esManual]);

  return (
    <div className="space-y-3">
      {/* Barra superior de Zoom + Estado del Motor */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="inline-flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
          {[
            { id: 'full', label: 'Vista Completa', icon: Maximize2 },
            { id: 'izq', label: 'Zoom Piña Izq', icon: ZoomIn },
            { id: 'der', label: 'Zoom Piña Der', icon: ZoomIn },
          ].map((btn) => {
            const Icono = btn.icon;
            const activo = zoom === btn.id;
            return (
              <button
                key={btn.id}
                type="button"
                onClick={() => setZoom(btn.id)}
                className={`py-1.5 px-2.5 sm:px-3 rounded-lg text-[11px] sm:text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activo
                    ? 'bg-[#2563eb] text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icono className="w-3.5 h-3.5 shrink-0" />
                <span>{btn.label}</span>
              </button>
            );
          })}
        </div>

        {/* Mini indicadores de estado de la cabina en vivo */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
          <span
            className={`px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${
              estadoCabina.motorCortado
                ? 'bg-red-500/15 text-red-400 border-red-500/40 animate-pulse'
                : estadoCabina.motorEncendido
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                estadoCabina.motorCortado
                  ? 'bg-red-500'
                  : estadoCabina.motorEncendido
                  ? 'bg-emerald-400'
                  : 'bg-slate-500'
              }`}
            />
            {estadoCabina.motorCortado
              ? 'CORTE DE MOTOR'
              : estadoCabina.motorEncendido
              ? `Motor ON · ${Math.round(estadoCabina.rpm)} RPM`
              : 'Motor Apagado'}
          </span>

          {esManual && (
            <span className="px-2.5 py-1 rounded-full bg-slate-800 text-amber-300 border border-slate-700">
              Marcha: {estadoCabina.marcha === 0 ? 'N' : `${estadoCabina.marcha}ª`}
            </span>
          )}
        </div>
      </div>

      {/* Contenedor Oscuro Técnico de la Cabina SVG */}
      <div
        className={`relative rounded-2xl border overflow-hidden shadow-lg transition-colors ${
          modoNocturno
            ? 'bg-slate-950 border-slate-800'
            : 'bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 border-slate-800'
        }`}
      >
        <svg
          viewBox={viewBoxActual}
          className="w-full h-auto block select-none transition-all duration-300"
          role="img"
          aria-label="Cabina interactiva de motocicleta en primera persona"
        >
          <defs>
            <radialGradient id="headlightBeam" cx="50%" cy="100%" r="75%">
              <stop
                offset="0%"
                stopColor={estadoCabina.luzAlta ? '#60a5fa' : '#fde047'}
                stopOpacity={estadoCabina.luzAlta ? '0.35' : '0.16'}
              />
              <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="tankGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={modoNocturno ? '#1e293b' : '#2563eb'} />
              <stop offset="100%" stopColor={modoNocturno ? '#0f172a' : '#1e3a8a'} />
            </linearGradient>
            <linearGradient id="barMetal" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="50%" stopColor="#334155" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
          </defs>

          {/* Haz de luz proyectado hacia la vía */}
          <path d="M 270 150 L 140 0 L 660 0 L 530 150 Z" fill="url(#headlightBeam)" />

          {/* Horizonte vial sutil detrás del tablero */}
          <line
            x1="0"
            y1="96"
            x2="800"
            y2="96"
            stroke="#1e293b"
            strokeWidth="1.5"
            strokeDasharray="8 8"
          />

          {/* Parpadeo lateral visual cuando direccionales están activas */}
          {estadoCabina.direccionalActiva && (
            <g className="animate-pulse">
              <circle cx="242" cy="148" r="14" fill="#10b981" fillOpacity="0.28" />
              <circle cx="242" cy="148" r="6" fill="#34d399" />
              <circle cx="558" cy="148" r="14" fill="#10b981" fillOpacity="0.28" />
              <circle cx="558" cy="148" r="6" fill="#34d399" />
            </g>
          )}

          {/* Onda sonora animada cuando pita el claxon */}
          {estadoCabina.claxonActivo && (
            <g className="animate-ping" style={{ transformOrigin: '232px 245px' }}>
              <circle cx="232" cy="245" r="24" fill="none" stroke="#f59e0b" strokeWidth="3" />
              <circle cx="232" cy="245" r="38" fill="none" stroke="#fbbf24" strokeWidth="2" opacity="0.6" />
            </g>
          )}

          {/* ==============================================================
           * TANQUE DE COMBUSTIBLE + VÁLVULA DE GASOLINA (COSTADO IZQUIERDO)
           * ============================================================== */}
          <path
            d="M 280 430 C 282 328, 326 276, 400 276 C 474 276, 518 328, 520 430 Z"
            fill="url(#tankGrad)"
            stroke={modoNocturno ? '#334155' : '#3b82f6'}
            strokeWidth="2"
          />
          {/* Tapa del tanque */}
          <circle cx="400" cy="348" r="24" fill="#0f172a" stroke="#64748b" strokeWidth="3" />
          <circle cx="400" cy="348" r="14" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
          <rect x="396" y="340" width="8" height="16" rx="2" fill="#475569" />

          {/* VÁLVULA DE COMBUSTIBLE (ON / OFF / RES) */}
          {(() => {
            const st = getEstiloControl('combustible');
            return (
              <g
                onClick={() => onAccionarControl('combustible')}
                role="button"
                tabIndex={0}
                aria-label="Válvula de Suministro de Combustible"
                onKeyDown={(e) => e.key === 'Enter' && onAccionarControl('combustible')}
                className="cursor-pointer group"
              >
                {st.glow && <circle cx="272" cy="364" r="32" fill={st.glow} />}
                {/* Tubo y cuerpo de llave */}
                <rect
                  x="244"
                  y="344"
                  width="52"
                  height="40"
                  rx="10"
                  fill="#0f172a"
                  stroke={st.stroke}
                  strokeWidth={st.strokeWidth}
                />
                <circle cx="270" cy="364" r="11" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.5" />
                {/* Palanquita que gira según posición ON/RES/OFF */}
                <g
                  transform={`rotate(${
                    estadoCabina.combustible === 'RES'
                      ? -45
                      : estadoCabina.combustible === 'OFF'
                      ? 90
                      : 0
                  }, 270, 364)`}
                >
                  <line
                    x1="270"
                    y1="364"
                    x2="270"
                    y2="350"
                    stroke={estadoCabina.combustible === 'RES' ? '#f59e0b' : '#38bdf8'}
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                </g>
                <text
                  x="270"
                  y="381"
                  textAnchor="middle"
                  fill={estadoCabina.combustible === 'RES' ? '#fbbf24' : '#cbd5e1'}
                  fontSize="8.5"
                  fontWeight="bold"
                >
                  {estadoCabina.combustible}
                </text>
                {mostrarEtiquetas && (
                  <g>
                    <line x1="244" y1="364" x2="210" y2="386" stroke="#475569" strokeWidth="1.2" />
                    <rect x="86" y="376" width="128" height="22" rx="6" fill="#0f172a" stroke="#334155" />
                    <text x="150" y="390" textAnchor="middle" fill="#e2e8f0" fontSize="9.5" fontWeight="bold">
                      Llave Combustible
                    </text>
                  </g>
                )}
              </g>
            );
          })()}

          {/* ==============================================================
           * ESPEJOS RETROVISORES (IZQUIERDO Y DERECHO — MISMO CONTROL)
           * ============================================================== */}
          {(() => {
            const st = getEstiloControl('espejos');
            return (
              <g
                onClick={() => onAccionarControl('espejos')}
                role="button"
                tabIndex={0}
                aria-label="Espejos Retrovisores"
                onKeyDown={(e) => e.key === 'Enter' && onAccionarControl('espejos')}
                className="cursor-pointer"
              >
                {/* Tallos */}
                <path
                  d="M 248 205 L 194 114 L 154 102"
                  fill="none"
                  stroke="#475569"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M 552 205 L 606 114 L 646 102"
                  fill="none"
                  stroke="#475569"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {st.glow && (
                  <>
                    <rect x="94" y="60" width="124" height="62" rx="20" fill={st.glow} />
                    <rect x="582" y="60" width="124" height="62" rx="20" fill={st.glow} />
                  </>
                )}
                {/* Espejo Izquierdo */}
                <rect
                  x="102"
                  y="68"
                  width="108"
                  height="46"
                  rx="16"
                  fill="#0f172a"
                  stroke={st.stroke}
                  strokeWidth={st.strokeWidth}
                />
                <rect
                  x="110"
                  y="75"
                  width="92"
                  height="32"
                  rx="11"
                  fill={modoNocturno ? '#111827' : '#1e3a5f'}
                />
                {/* Reflejo sutil en espejo izq */}
                {!modoNocturno && (
                  <path d="M 122 103 L 146 79 M 142 103 L 160 85" stroke="#60a5fa" strokeWidth="2" opacity="0.35" />
                )}

                {/* Espejo Derecho */}
                <rect
                  x="590"
                  y="68"
                  width="108"
                  height="46"
                  rx="16"
                  fill="#0f172a"
                  stroke={st.stroke}
                  strokeWidth={st.strokeWidth}
                />
                <rect
                  x="598"
                  y="75"
                  width="92"
                  height="32"
                  rx="11"
                  fill={modoNocturno ? '#111827' : '#1e3a5f'}
                />
                {!modoNocturno && (
                  <path d="M 622 103 L 646 79 M 642 103 L 660 85" stroke="#60a5fa" strokeWidth="2" opacity="0.35" />
                )}

                {mostrarEtiquetas && (
                  <>
                    <rect x="116" y="42" width="80" height="18" rx="6" fill="#0f172a" stroke="#334155" />
                    <text x="156" y="54" textAnchor="middle" fill="#cbd5e1" fontSize="9" fontWeight="bold">
                      Espejo Izq.
                    </text>
                    <rect x="604" y="42" width="80" height="18" rx="6" fill="#0f172a" stroke="#334155" />
                    <text x="644" y="54" textAnchor="middle" fill="#cbd5e1" fontSize="9" fontWeight="bold">
                      Espejo Der.
                    </text>
                  </>
                )}
              </g>
            );
          })()}

          {/* ==============================================================
           * BARRA DEL MANUBRIO PRINCIPAL
           * ============================================================== */}
          <path
            d="M 88 232 Q 198 206 310 212 L 490 212 Q 602 206 712 232"
            fill="none"
            stroke="url(#barMetal)"
            strokeWidth="22"
            strokeLinecap="round"
          />
          {/* Tija central */}
          <rect x="336" y="198" width="128" height="44" rx="12" fill="#1e293b" stroke="#475569" strokeWidth="2" />

          {/* ==============================================================
           * ZONA CENTRAL: TABLERO (VELOCÍMETRO + TACÓMETRO + TESTIGOS)
           * ============================================================== */}
          {(() => {
            const st = getEstiloControl('tablero');
            return (
              <g
                onClick={() => onAccionarControl('tablero')}
                role="button"
                tabIndex={0}
                aria-label="Tablero: Velocímetro, Odómetro y Tacómetro"
                onKeyDown={(e) => e.key === 'Enter' && onAccionarControl('tablero')}
                className="cursor-pointer"
              >
                {st.glow && <rect x="276" y="70" width="248" height="132" rx="34" fill={st.glow} />}
                {/* Carcasa del tablero */}
                <rect
                  x="284"
                  y="78"
                  width="232"
                  height="118"
                  rx="28"
                  fill="#0b1120"
                  stroke={st.stroke}
                  strokeWidth={st.strokeWidth}
                />

                {/* Reloj Izquierdo: Velocímetro + Odómetro */}
                <circle cx="348" cy="136" r="46" fill="#0f172a" stroke="#334155" strokeWidth="2.5" />
                <path
                  d="M 314 156 A 38 38 0 1 1 382 156"
                  fill="none"
                  stroke="#334155"
                  strokeWidth="4"
                  strokeDasharray="4 6"
                />
                {/* Aguja Velocímetro */}
                <g transform={`rotate(${anguloVelocimetro}, 348, 136)`}>
                  <line
                    x1="348"
                    y1="136"
                    x2="348"
                    y2="100"
                    stroke="#38bdf8"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </g>
                <circle cx="348" cy="136" r="5" fill="#cbd5e1" />
                <text x="348" y="156" textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="900">
                  {Math.round(estadoCabina.velocidad)}
                </text>
                <text x="348" y="166" textAnchor="middle" fill="#64748b" fontSize="6.5" fontWeight="bold">
                  KM/H · 04218
                </text>

                {/* Reloj Derecho: Tacómetro (RPM) */}
                <circle cx="452" cy="136" r="46" fill="#0f172a" stroke="#334155" strokeWidth="2.5" />
                <path
                  d="M 418 156 A 38 38 0 1 1 486 156"
                  fill="none"
                  stroke="#334155"
                  strokeWidth="4"
                  strokeDasharray="4 6"
                />
                {/* Zona roja RPM */}
                <path
                  d="M 476 108 A 38 38 0 0 1 486 156"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="4"
                />
                {/* Aguja Tacómetro */}
                <g transform={`rotate(${anguloTacometro}, 452, 136)`}>
                  <line
                    x1="452"
                    y1="136"
                    x2="452"
                    y2="100"
                    stroke={estadoCabina.motorCortado ? '#ef4444' : '#f59e0b'}
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </g>
                <circle cx="452" cy="136" r="5" fill="#cbd5e1" />
                <text x="452" y="156" textAnchor="middle" fill="#f8fafc" fontSize="10" fontWeight="900">
                  {(estadoCabina.rpm / 1000).toFixed(1)}k
                </text>
                <text x="452" y="166" textAnchor="middle" fill="#64748b" fontSize="6.5" fontWeight="bold">
                  RPM
                </text>

                {/* Testigos Luminosos Centrales */}
                {/* Flecha direccional izq */}
                <polygon
                  points="391,92 397,87 397,97"
                  fill={estadoCabina.direccionalActiva ? '#10b981' : '#1e293b'}
                  className={estadoCabina.direccionalActiva ? 'animate-pulse' : ''}
                />
                {/* Flecha direccional der */}
                <polygon
                  points="409,92 403,87 403,97"
                  fill={estadoCabina.direccionalActiva ? '#10b981' : '#1e293b'}
                  className={estadoCabina.direccionalActiva ? 'animate-pulse' : ''}
                />
                {/* Testigo Luz Alta (Azul) */}
                <circle
                  cx="400"
                  cy="112"
                  r="6"
                  fill={estadoCabina.luzAlta ? '#3b82f6' : '#1e293b'}
                  stroke={estadoCabina.luzAlta ? '#93c5FD' : '#334155'}
                  strokeWidth="1.5"
                />
                {/* Testigo Neutro (Verde) */}
                <circle
                  cx="400"
                  cy="132"
                  r="6"
                  fill={
                    estadoCabina.motorEncendido && (!esManual || estadoCabina.marcha === 0)
                      ? '#10b981'
                      : '#1e293b'
                  }
                />
                <text x="400" y="134.5" textAnchor="middle" fill="#0f172a" fontSize="7" fontWeight="900">
                  N
                </text>
                {/* Testigo Freno / Corte Motor (Rojo) */}
                <circle
                  cx="400"
                  cy="152"
                  r="6"
                  fill={
                    estadoCabina.motorCortado || estadoCabina.frenando ? '#ef4444' : '#1e293b'
                  }
                  className={estadoCabina.motorCortado ? 'animate-pulse' : ''}
                />

                {estadoCabina.motorCortado && (
                  <g>
                    <rect x="336" y="176" width="128" height="17" rx="5" fill="#dc2626" />
                    <text x="400" y="187.5" textAnchor="middle" fill="#ffffff" fontSize="8.5" fontWeight="900">
                      CORTE DE MOTOR
                    </text>
                  </g>
                )}

                {mostrarEtiquetas && (
                  <g>
                    <rect x="334" y="48" width="132" height="20" rx="6" fill="#0f172a" stroke="#334155" />
                    <text x="400" y="61" textAnchor="middle" fill="#e2e8f0" fontSize="9.5" fontWeight="bold">
                      Velocímetro / Tacómetro
                    </text>
                  </g>
                )}
              </g>
            );
          })()}

          {/* ==============================================================
           * INTERRUPTOR DE ENCENDIDO (SUICHE / LLAVE CENTRAL)
           * ============================================================== */}
          {(() => {
            const st = getEstiloControl('encendido');
            return (
              <g
                onClick={() => onAccionarControl('encendido')}
                role="button"
                tabIndex={0}
                aria-label="Interruptor de Encendido (Suiche)"
                onKeyDown={(e) => e.key === 'Enter' && onAccionarControl('encendido')}
                className="cursor-pointer"
              >
                {st.glow && <circle cx="400" cy="230" r="28" fill={st.glow} />}
                <circle
                  cx="400"
                  cy="230"
                  r="20"
                  fill="#0f172a"
                  stroke={st.stroke}
                  strokeWidth={st.strokeWidth}
                />
                <circle cx="400" cy="230" r="13" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
                {/* Ranura de llave girada si ON */}
                <g transform={`rotate(${estadoCabina.suicheOn ? 40 : 0}, 400, 230)`}>
                  <rect x="397" y="220" width="6" height="20" rx="2" fill={estadoCabina.suicheOn ? '#38bdf8' : '#94a3b8'} />
                </g>
                {mostrarEtiquetas && (
                  <g>
                    <rect x="352" y="254" width="96" height="18" rx="6" fill="#0f172a" stroke="#334155" />
                    <text x="400" y="266" textAnchor="middle" fill="#cbd5e1" fontSize="9" fontWeight="bold">
                      Suiche ({estadoCabina.suicheOn ? 'ON' : 'OFF'})
                    </text>
                  </g>
                )}
              </g>
            );
          })()}

          {/* ==============================================================
           * MANILLAR IZQUIERDO: PUÑO + PALANCA + PIÑA DE CONTROLES
           * ============================================================== */}
          {/* Puño Izquierdo (estático de agarre) */}
          <rect
            x="64"
            y="214"
            width="126"
            height="36"
            rx="12"
            fill="#0b1120"
            stroke="#334155"
            strokeWidth="2"
            transform="rotate(-8, 127, 232)"
          />
          {/* Estrías del puño izquierdo */}
          {[82, 98, 114, 130, 146, 162].map((gx) => (
            <line
              key={gx}
              x1={gx}
              y1="220"
              x2={gx + 3}
              y2="246"
              stroke="#1e293b"
              strokeWidth="3"
              transform="rotate(-8, 127, 232)"
            />
          ))}

          {/* PALANCA IZQUIERDA (CLUTCH EN MANUAL / FRENO TRASERO EN AUTOMÁTICA) */}
          {(() => {
            const st = getEstiloControl('palanca_izq');
            const apretada = estadoCabina.palancaIzqActiva;
            return (
              <g
                onClick={() => onAccionarControl('palanca_izq')}
                role="button"
                tabIndex={0}
                aria-label={esManual ? 'Palanca del Clutch' : 'Palanca del Freno Trasero'}
                onKeyDown={(e) => e.key === 'Enter' && onAccionarControl('palanca_izq')}
                className="cursor-pointer"
                transform={apretada ? 'rotate(-10, 204, 198)' : 'rotate(0, 204, 198)'}
                style={{ transition: 'transform 160ms ease' }}
              >
                {st.glow && (
                  <path
                    d="M 204 194 Q 145 176 74 196"
                    fill="none"
                    stroke={st.glow}
                    strokeWidth="22"
                    strokeLinecap="round"
                  />
                )}
                {/* Área de toque generosa */}
                <rect x="64" y="168" width="144" height="36" fill="transparent" />
                <path
                  d="M 204 194 Q 146 176 76 196"
                  fill="none"
                  stroke={st.resaltado ? st.stroke : '#cbd5e1'}
                  strokeWidth="10"
                  strokeLinecap="round"
                />
                <circle
                  cx="74"
                  cy="196"
                  r="8"
                  fill={st.resaltado ? st.stroke : '#e2e8f0'}
                />
                {mostrarEtiquetas && (
                  <g>
                    <rect x="40" y="142" width="130" height="20" rx="6" fill="#0f172a" stroke="#334155" />
                    <text x="105" y="155" textAnchor="middle" fill="#e2e8f0" fontSize="9.5" fontWeight="bold">
                      {esManual ? 'Palanca Clutch' : 'Freno Trasero'}
                    </text>
                  </g>
                )}
              </g>
            );
          })()}

          {/* Cuerpo de la Piña Izquierda */}
          <rect
            x="194"
            y="174"
            width="84"
            height="94"
            rx="16"
            fill="#111827"
            stroke="#334155"
            strokeWidth="2"
          />

          {/* 1) LUCES (ALTAS / BAJAS) */}
          {(() => {
            const st = getEstiloControl('luces');
            return (
              <g
                onClick={() => onAccionarControl('luces')}
                role="button"
                tabIndex={0}
                aria-label="Interruptor de Luces Altas y Bajas"
                onKeyDown={(e) => e.key === 'Enter' && onAccionarControl('luces')}
                className="cursor-pointer"
              >
                {st.glow && <rect x="200" y="177" width="72" height="30" rx="8" fill={st.glow} />}
                <rect
                  x="204"
                  y="181"
                  width="64"
                  height="24"
                  rx="7"
                  fill={estadoCabina.luzAlta ? '#1d4ed8' : '#1e293b'}
                  stroke={st.stroke}
                  strokeWidth={st.strokeWidth}
                />
                {/* Ícono de haz de faro */}
                <path
                  d="M 228 193 C 228 188, 236 187, 238 193 C 236 199, 228 198, 228 193 Z"
                  fill="#f8fafc"
                />
                <line x1="242" y1="189" x2="251" y2="189" stroke="#f8fafc" strokeWidth="1.8" />
                <line x1="242" y1="193" x2="252" y2="193" stroke="#f8fafc" strokeWidth="1.8" />
                <line x1="242" y1="197" x2="251" y2="197" stroke="#f8fafc" strokeWidth="1.8" />
                {mostrarEtiquetas && (
                  <g>
                    <line x1="236" y1="181" x2="236" y2="152" stroke="#475569" strokeWidth="1.2" />
                    <rect x="184" y="132" width="94" height="20" rx="6" fill="#0f172a" stroke="#334155" />
                    <text x="231" y="145" textAnchor="middle" fill="#93c5fd" fontSize="9" fontWeight="bold">
                      Luces Altas/Bajas
                    </text>
                  </g>
                )}
              </g>
            );
          })()}

          {/* 2) DIRECCIONALES (LUCES DE CRUCE) */}
          {(() => {
            const st = getEstiloControl('direccionales');
            return (
              <g
                onClick={() => onAccionarControl('direccionales')}
                role="button"
                tabIndex={0}
                aria-label="Interruptor de Direccionales"
                onKeyDown={(e) => e.key === 'Enter' && onAccionarControl('direccionales')}
                className="cursor-pointer"
              >
                {st.glow && <rect x="200" y="207" width="72" height="28" rx="8" fill={st.glow} />}
                <rect
                  x="204"
                  y="210"
                  width="64"
                  height="23"
                  rx="7"
                  fill={estadoCabina.direccionalActiva ? '#065f46' : '#1e293b'}
                  stroke={st.stroke}
                  strokeWidth={st.strokeWidth}
                />
                {/* Flechas ◄ ► */}
                <polygon points="215,221.5 224,216 224,227" fill={estadoCabina.direccionalActiva ? '#34d399' : '#cbd5e1'} />
                <circle cx="236" cy="221.5" r="3" fill="#94a3b8" />
                <polygon points="257,221.5 248,216 248,227" fill={estadoCabina.direccionalActiva ? '#34d399' : '#cbd5e1'} />
                {mostrarEtiquetas && (
                  <g>
                    <line x1="274" y1="221" x2="306" y2="230" stroke="#475569" strokeWidth="1.2" />
                    <rect x="272" y="276" width="84" height="19" rx="6" fill="#0f172a" stroke="#334155" />
                    <text x="314" y="288.5" textAnchor="middle" fill="#6ee7b7" fontSize="9" fontWeight="bold">
                      Direccionales
                    </text>
                  </g>
                )}
              </g>
            );
          })()}

          {/* 3) CLAXON / CORNETA */}
          {(() => {
            const st = getEstiloControl('claxon');
            return (
              <g
                onClick={() => onAccionarControl('claxon')}
                role="button"
                tabIndex={0}
                aria-label="Botón del Claxon"
                onKeyDown={(e) => e.key === 'Enter' && onAccionarControl('claxon')}
                className="cursor-pointer"
              >
                {st.glow && <rect x="200" y="236" width="72" height="28" rx="8" fill={st.glow} />}
                <rect
                  x="204"
                  y="238"
                  width="64"
                  height="24"
                  rx="11"
                  fill={estadoCabina.claxonActivo ? '#d97706' : '#1e293b'}
                  stroke={st.stroke}
                  strokeWidth={st.strokeWidth}
                />
                {/* Ícono bocina */}
                <path d="M 225 248 L 233 248 L 241 243 L 241 257 L 233 252 L 225 252 Z" fill="#f8fafc" />
                <path d="M 245 246 Q 249 250 245 254" fill="none" stroke="#fbbf24" strokeWidth="1.8" />
                {mostrarEtiquetas && (
                  <g>
                    <line x1="230" y1="262" x2="218" y2="296" stroke="#475569" strokeWidth="1.2" />
                    <rect x="166" y="294" width="96" height="20" rx="6" fill="#0f172a" stroke="#334155" />
                    <text x="214" y="307" textAnchor="middle" fill="#fcd34d" fontSize="9" fontWeight="bold">
                      Claxon / Corneta
                    </text>
                  </g>
                )}
              </g>
            );
          })()}

          {/* 4) AHOGADOR (CHOKE) — Palanca lateral en la piña izquierda */}
          {(() => {
            const st = getEstiloControl('ahogador');
            return (
              <g
                onClick={() => onAccionarControl('ahogador')}
                role="button"
                tabIndex={0}
                aria-label="Ahogador (Choke)"
                onKeyDown={(e) => e.key === 'Enter' && onAccionarControl('ahogador')}
                className="cursor-pointer"
              >
                {st.glow && <rect x="164" y="246" width="40" height="44" rx="10" fill={st.glow} />}
                <rect
                  x="170"
                  y="252"
                  width="28"
                  height="32"
                  rx="8"
                  fill={estadoCabina.ahogadorActivo ? '#0369a1' : '#1e293b'}
                  stroke={st.stroke}
                  strokeWidth={st.strokeWidth}
                />
                <line
                  x1="184"
                  y1="260"
                  x2={estadoCabina.ahogadorActivo ? '176' : '184'}
                  y2="276"
                  stroke="#e2e8f0"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                {mostrarEtiquetas && (
                  <g>
                    <line x1="170" y1="274" x2="132" y2="298" stroke="#475569" strokeWidth="1.2" />
                    <rect x="44" y="292" width="110" height="20" rx="6" fill="#0f172a" stroke="#334155" />
                    <text x="99" y="305" textAnchor="middle" fill="#cbd5e1" fontSize="9" fontWeight="bold">
                      Ahogador (Choke)
                    </text>
                  </g>
                )}
              </g>
            );
          })()}

          {/* ==============================================================
           * MANILLAR DERECHO: PIÑA DERECHA + FRENO DELANTERO + ACELERADOR
           * ============================================================== */}
          {/* Cuerpo de la Piña Derecha */}
          <rect
            x="522"
            y="174"
            width="84"
            height="94"
            rx="16"
            fill="#111827"
            stroke="#334155"
            strokeWidth="2"
          />

          {/* 1) INTERRUPTOR DE PARO DEL MOTOR (KILL SWITCH ROJO) */}
          {(() => {
            const st = getEstiloControl('paro_motor');
            return (
              <g
                onClick={() => onAccionarControl('paro_motor')}
                role="button"
                tabIndex={0}
                aria-label="Interruptor de Paro del Motor"
                onKeyDown={(e) => e.key === 'Enter' && onAccionarControl('paro_motor')}
                className="cursor-pointer"
              >
                {st.glow && <rect x="528" y="178" width="72" height="36" rx="9" fill={st.glow} />}
                <rect
                  x="532"
                  y="182"
                  width="64"
                  height="28"
                  rx="8"
                  fill={estadoCabina.motorCortado ? '#dc2626' : '#991b1b'}
                  stroke={st.stroke}
                  strokeWidth={st.strokeWidth}
                />
                {/* Símbolo corte de encendido */}
                <circle cx="564" cy="196" r="7" fill="none" stroke="#ffffff" strokeWidth="2" />
                <line x1="559" y1="191" x2="569" y2="201" stroke="#ffffff" strokeWidth="2" />
                {mostrarEtiquetas && (
                  <g>
                    <line x1="564" y1="182" x2="564" y2="152" stroke="#475569" strokeWidth="1.2" />
                    <rect x="514" y="132" width="108" height="20" rx="6" fill="#0f172a" stroke="#7f1d1d" />
                    <text x="568" y="145" textAnchor="middle" fill="#fca5a5" fontSize="9" fontWeight="bold">
                      Paro del Motor
                    </text>
                  </g>
                )}
              </g>
            );
          })()}

          {/* 2) BOTÓN DE ARRANQUE ELÉCTRICO */}
          {(() => {
            const st = getEstiloControl('arranque');
            return (
              <g
                onClick={() => onAccionarControl('arranque')}
                role="button"
                tabIndex={0}
                aria-label="Botón de Arranque Eléctrico"
                onKeyDown={(e) => e.key === 'Enter' && onAccionarControl('arranque')}
                className="cursor-pointer"
              >
                {st.glow && <rect x="528" y="224" width="72" height="38" rx="10" fill={st.glow} />}
                <rect
                  x="532"
                  y="228"
                  width="64"
                  height="30"
                  rx="12"
                  fill="#1e293b"
                  stroke={st.stroke}
                  strokeWidth={st.strokeWidth}
                />
                {/* Símbolo rayo de arranque */}
                <polygon points="566,235 557,244 563,244 561,252 571,242 565,242" fill="#fbbf24" />
                {mostrarEtiquetas && (
                  <g>
                    <line x1="564" y1="258" x2="564" y2="294" stroke="#475569" strokeWidth="1.2" />
                    <rect x="510" y="294" width="112" height="20" rx="6" fill="#0f172a" stroke="#334155" />
                    <text x="566" y="307" textAnchor="middle" fill="#fde68a" fontSize="9" fontWeight="bold">
                      Arranque Eléctrico
                    </text>
                  </g>
                )}
              </g>
            );
          })()}

          {/* 3) PALANCA DEL FRENO DELANTERO */}
          {(() => {
            const st = getEstiloControl('freno_delantero');
            const apretado = estadoCabina.frenoDelActivo;
            return (
              <g
                onClick={() => onAccionarControl('freno_delantero')}
                role="button"
                tabIndex={0}
                aria-label="Palanca del Freno Delantero"
                onKeyDown={(e) => e.key === 'Enter' && onAccionarControl('freno_delantero')}
                className="cursor-pointer"
                transform={apretado ? 'rotate(10, 596, 198)' : 'rotate(0, 596, 198)'}
                style={{ transition: 'transform 160ms ease' }}
              >
                {st.glow && (
                  <path
                    d="M 596 194 Q 655 176 726 196"
                    fill="none"
                    stroke={st.glow}
                    strokeWidth="22"
                    strokeLinecap="round"
                  />
                )}
                <rect x="592" y="168" width="144" height="36" fill="transparent" />
                <path
                  d="M 596 194 Q 654 176 724 196"
                  fill="none"
                  stroke={st.resaltado ? st.stroke : '#cbd5e1'}
                  strokeWidth="10"
                  strokeLinecap="round"
                />
                <circle cx="726" cy="196" r="8" fill={st.resaltado ? st.stroke : '#e2e8f0'} />
                {mostrarEtiquetas && (
                  <g>
                    <rect x="630" y="142" width="128" height="20" rx="6" fill="#0f172a" stroke="#334155" />
                    <text x="694" y="155" textAnchor="middle" fill="#e2e8f0" fontSize="9.5" fontWeight="bold">
                      Freno Delantero
                    </text>
                  </g>
                )}
              </g>
            );
          })()}

          {/* 4) PUÑO DEL ACELERADOR */}
          {(() => {
            const st = getEstiloControl('acelerador');
            return (
              <g
                onClick={() => onAccionarControl('acelerador')}
                role="button"
                tabIndex={0}
                aria-label="Puño del Acelerador"
                onKeyDown={(e) => e.key === 'Enter' && onAccionarControl('acelerador')}
                className="cursor-pointer"
              >
                {st.glow && (
                  <rect
                    x="604"
                    y="206"
                    width="138"
                    height="52"
                    rx="16"
                    fill={st.glow}
                    transform="rotate(8, 673, 232)"
                  />
                )}
                <rect
                  x="610"
                  y="214"
                  width="126"
                  height="36"
                  rx="12"
                  fill={estadoCabina.acelerando ? '#1e3a8a' : '#0b1120'}
                  stroke={st.stroke}
                  strokeWidth={st.strokeWidth}
                  transform="rotate(8, 673, 232)"
                />
                {[626, 642, 658, 674, 690, 706].map((gx) => (
                  <line
                    key={gx}
                    x1={gx}
                    y1="220"
                    x2={gx - 3}
                    y2="246"
                    stroke={estadoCabina.acelerando ? '#60a5fa' : '#1e293b'}
                    strokeWidth="3"
                    transform="rotate(8, 673, 232)"
                  />
                ))}
                {/* Flecha de giro del acelerador */}
                <path
                  d="M 676 266 Q 664 274 654 266"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                {mostrarEtiquetas && (
                  <g>
                    <rect x="636" y="274" width="114" height="20" rx="6" fill="#0f172a" stroke="#334155" />
                    <text x="693" y="287" textAnchor="middle" fill="#93c5fd" fontSize="9.5" fontWeight="bold">
                      Puño Acelerador
                    </text>
                  </g>
                )}
              </g>
            );
          })()}
        </svg>

        {/* Tira Inferior de Controles de Pies (Solo visible en Moto Sincrónica) */}
        {esManual && (
          <div className="border-t border-slate-800 bg-slate-900/95 px-3 py-2.5 grid grid-cols-2 gap-2.5">
            {(() => {
              const stCambios = getEstiloControl('cambios');
              const stFrenoPie = getEstiloControl('freno_trasero_pie');
              return (
                <>
                  <button
                    type="button"
                    onClick={() => onAccionarControl('cambios')}
                    className={`py-2.5 px-3 rounded-xl border-2 text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                      controlCorrectoId === 'cambios'
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-100'
                        : controlErrorId === 'cambios'
                        ? 'bg-red-500/20 border-red-400 text-red-100'
                        : stCambios.resaltado
                        ? 'bg-[#2563eb]/25 border-[#3b82f6] text-white'
                        : 'bg-slate-950/90 border-slate-700 hover:border-slate-500 text-slate-200'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Pie Izquierdo
                      </div>
                      <div className="text-xs sm:text-sm font-extrabold truncate">
                        {mostrarEtiquetas ? 'Palanca de Cambios (1-N-2-3-4-5)' : 'Pedal Izquierdo'}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-amber-300 text-xs font-black shrink-0">
                      {estadoCabina.marcha === 0 ? 'N' : `${estadoCabina.marcha}ª`}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onAccionarControl('freno_trasero_pie')}
                    className={`py-2.5 px-3 rounded-xl border-2 text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                      controlCorrectoId === 'freno_trasero_pie'
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-100'
                        : controlErrorId === 'freno_trasero_pie'
                        ? 'bg-red-500/20 border-red-400 text-red-100'
                        : stFrenoPie.resaltado
                        ? 'bg-[#2563eb]/25 border-[#3b82f6] text-white'
                        : 'bg-slate-950/90 border-slate-700 hover:border-slate-500 text-slate-200'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Pie Derecho
                      </div>
                      <div className="text-xs sm:text-sm font-extrabold truncate">
                        {mostrarEtiquetas ? 'Pedal de Freno Trasero' : 'Pedal Derecho'}
                      </div>
                    </div>
                    <span
                      className={`w-3 h-3 rounded-full shrink-0 ${
                        estadoCabina.frenoPieActivo ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : 'bg-slate-700'
                      }`}
                    />
                  </button>
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* Panel Táctil Ampliado de Precisión al usar Zoom en Piña Izquierda o Derecha */}
      {botonesAccesoRapido.length > 0 && !ocultarTextoAyuda && (
        <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs space-y-2 animate-fadeIn">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center justify-between">
            <span>
              Panel táctil ampliado · {zoom === 'izq' ? 'Piña Izquierda' : 'Piña Derecha'}
            </span>
            <span className="text-[#2563eb]">Toque directo</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {botonesAccesoRapido.map((b) => {
              const esSel = controlActivoId === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => onAccionarControl(b.id)}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-extrabold transition-all cursor-pointer ${
                    controlCorrectoId === b.id
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : controlErrorId === b.id
                      ? 'bg-red-600 border-red-600 text-white'
                      : esSel
                      ? 'bg-[#2563eb] border-[#2563eb] text-white'
                      : 'bg-slate-50 hover:bg-blue-50 border-slate-200 text-slate-800'
                  }`}
                >
                  {b.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
 * 6. HOOK DE ESTADO VIVO DE LA CABINA (ANIMACIONES DE TABLERO Y CONTROLES)
 * ============================================================================ */
function useCabinaEstado(playSound, transmision) {
  const [estadoCabina, setEstadoCabina] = useState({
    suicheOn: true,
    motorEncendido: true,
    motorCortado: false,
    luzAlta: false,
    direccionalActiva: false,
    claxonActivo: false,
    ahogadorActivo: false,
    palancaIzqActiva: false,
    frenoDelActivo: false,
    frenoPieActivo: false,
    acelerando: false,
    frenando: false,
    velocidad: 0,
    rpm: 1400,
    combustible: 'ON', // 'ON' | 'RES' | 'OFF'
    marcha: 0, // 0=N, 1..5
  });

  const timeoutsRef = useRef([]);

  const registrarTimeout = useCallback((fn, ms) => {
    const id = setTimeout(fn, ms);
    timeoutsRef.current.push(id);
    return id;
  }, []);

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((id) => clearTimeout(id));
      timeoutsRef.current = [];
    };
  }, []);

  // Resetear marcha si cambia a automática
  useEffect(() => {
    if (transmision === 'automatica') {
      setEstadoCabina((prev) => ({ ...prev, marcha: 0 }));
    }
  }, [transmision]);

  const dispararControl = useCallback(
    (id) => {
      if (id === 'luces') {
        playSound('clic');
        setEstadoCabina((p) => ({ ...p, luzAlta: !p.luzAlta }));
      } else if (id === 'direccionales') {
        playSound('direccionales');
        setEstadoCabina((p) => ({ ...p, direccionalActiva: !p.direccionalActiva }));
      } else if (id === 'claxon') {
        playSound('claxon');
        setEstadoCabina((p) => ({ ...p, claxonActivo: true }));
        registrarTimeout(() => setEstadoCabina((p) => ({ ...p, claxonActivo: false })), 500);
      } else if (id === 'ahogador') {
        playSound('clic');
        setEstadoCabina((p) => ({ ...p, ahogadorActivo: !p.ahogadorActivo }));
      } else if (id === 'palanca_izq') {
        playSound('clic');
        setEstadoCabina((p) => ({
          ...p,
          palancaIzqActiva: true,
          frenando: transmision === 'automatica' ? true : p.frenando,
          velocidad: transmision === 'automatica' ? Math.max(0, p.velocidad - 24) : p.velocidad,
        }));
        registrarTimeout(
          () =>
            setEstadoCabina((p) => ({
              ...p,
              palancaIzqActiva: false,
              frenando: false,
            })),
          450
        );
      } else if (id === 'paro_motor') {
        playSound('paro_motor');
        setEstadoCabina((p) => ({
          ...p,
          motorCortado: true,
          motorEncendido: false,
          rpm: 0,
          velocidad: 0,
        }));
      } else if (id === 'arranque') {
        playSound('arranque');
        setEstadoCabina((p) => ({
          ...p,
          suicheOn: true,
          motorCortado: false,
          motorEncendido: true,
          rpm: 1500,
        }));
      } else if (id === 'acelerador') {
        playSound('acelerador');
        setEstadoCabina((p) => ({
          ...p,
          suicheOn: true,
          motorCortado: false,
          motorEncendido: true,
          acelerando: true,
          rpm: 6800,
          velocidad: Math.min(115, Math.max(48, p.velocidad + 35)),
        }));
        registrarTimeout(
          () =>
            setEstadoCabina((p) => ({
              ...p,
              acelerando: false,
              rpm: p.motorEncendido ? 1600 : 0,
              velocidad: p.motorEncendido ? 24 : 0,
            })),
          750
        );
      } else if (id === 'freno_delantero') {
        playSound('clic');
        setEstadoCabina((p) => ({
          ...p,
          frenoDelActivo: true,
          frenando: true,
          velocidad: 0,
          rpm: p.motorEncendido ? 1400 : 0,
        }));
        registrarTimeout(
          () => setEstadoCabina((p) => ({ ...p, frenoDelActivo: false, frenando: false })),
          500
        );
      } else if (id === 'encendido') {
        playSound('clic');
        setEstadoCabina((p) => {
          const nextOn = !p.suicheOn;
          return {
            ...p,
            suicheOn: nextOn,
            motorEncendido: nextOn ? p.motorEncendido : false,
            motorCortado: nextOn ? p.motorCortado : false,
            rpm: nextOn ? 1400 : 0,
            velocidad: nextOn ? p.velocidad : 0,
          };
        });
      } else if (id === 'combustible') {
        playSound('clic');
        setEstadoCabina((p) => ({
          ...p,
          combustible: p.combustible === 'ON' ? 'RES' : p.combustible === 'RES' ? 'OFF' : 'ON',
        }));
      } else if (id === 'cambios') {
        playSound('clic');
        setEstadoCabina((p) => ({
          ...p,
          marcha: (p.marcha + 1) % 6,
        }));
      } else if (id === 'freno_trasero_pie') {
        playSound('clic');
        setEstadoCabina((p) => ({
          ...p,
          frenoPieActivo: true,
          frenando: true,
          velocidad: Math.max(0, p.velocidad - 20),
        }));
        registrarTimeout(
          () => setEstadoCabina((p) => ({ ...p, frenoPieActivo: false, frenando: false })),
          480
        );
      } else {
        playSound('clic');
      }
    },
    [playSound, registrarTimeout, transmision]
  );

  return { estadoCabina, dispararControl };
}

/* ============================================================================
 * 7. PESTAÑA 1 — EXPLORAR CABINA
 * ============================================================================ */
function PestanaExplorarCabina({ transmision, playSound }) {
  const controles = useMemo(() => obtenerControlesPorTransmision(transmision), [transmision]);
  const [zoom, setZoom] = useState('full');
  const [activoId, setActivoId] = useState('paro_motor');
  const [explorados, setExplorados] = useState(() => new Set(['paro_motor']));
  const { estadoCabina, dispararControl } = useCabinaEstado(playSound, transmision);

  // Si cambia a automática mientras tenía seleccionado un pedal, saltar a palanca_izq
  useEffect(() => {
    if (!controles.some((c) => c.id === activoId)) {
      setActivoId('palanca_izq');
    }
  }, [controles, activoId]);

  const controlActual = useMemo(
    () => controles.find((c) => c.id === activoId) || controles[0],
    [controles, activoId]
  );

  const exploradosValidos = useMemo(
    () => controles.filter((c) => explorados.has(c.id)).length,
    [controles, explorados]
  );
  const progresoPct = Math.round((exploradosValidos / controles.length) * 100);

  const manejarToque = useCallback(
    (id) => {
      setActivoId(id);
      setExplorados((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      dispararControl(id);
    },
    [dispararControl]
  );

  const siguienteNoExplorado = () => {
    const idxActual = controles.findIndex((c) => c.id === activoId);
    for (let step = 1; step <= controles.length; step += 1) {
      const cand = controles[(idxActual + step) % controles.length];
      if (!explorados.has(cand.id)) {
        manejarToque(cand.id);
        return;
      }
    }
    const next = controles[(idxActual + 1) % controles.length];
    manejarToque(next.id);
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Barra de Progreso de Exploración */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-[#2563eb] border border-blue-200 text-xs font-extrabold">
              {exploradosValidos} / {controles.length} controles revisados
            </span>
            <span className="text-xs text-slate-500 hidden sm:inline">
              Toca cualquier mando en la cabina para accionarlo y ver su ficha técnico-legal
            </span>
          </div>
          <span className="text-xs font-black text-slate-700 tabular-nums">{progresoPct}%</span>
        </div>
        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#2563eb] to-emerald-500 transition-all duration-300"
            style={{ width: `${Math.max(progresoPct, 4)}%` }}
          />
        </div>
      </section>

      {/* Grid Principal: Cabina Interactiva + Ficha Técnica/Legal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-7">
          <CabinaInteractivaSVG
            transmision={transmision}
            zoom={zoom}
            setZoom={setZoom}
            controlActivoId={activoId}
            explorados={explorados}
            mostrarEtiquetas={true}
            modoNocturno={false}
            estadoCabina={estadoCabina}
            onAccionarControl={manejarToque}
          />
        </div>

        {/* Ficha Técnica y Legal del Control Seleccionado */}
        <aside className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="space-y-2 pb-3 border-b border-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-[#2563eb] border border-blue-200 text-xs font-extrabold">
                <Hand className="w-3.5 h-3.5" />
                <span>{controlActual.zona}</span>
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3 h-3" />
                Explorado
              </span>
            </div>
            <h2 className="text-lg font-extrabold text-slate-900 leading-snug">
              {controlActual.nombre}
            </h2>
          </div>

          <div className="space-y-3 text-xs sm:text-sm">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                Función Principal
              </div>
              <p className="text-slate-700 leading-relaxed">{controlActual.funcion}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/70 space-y-1">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#2563eb] flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" />
                <span>Cómo operarlo sin bajar la vista</span>
              </div>
              <p className="text-slate-800 leading-relaxed font-medium">{controlActual.sinMirar}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 space-y-1">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Consejo Técnico MSF (Ed. 17)</span>
              </div>
              <p className="text-amber-950 leading-relaxed">{controlActual.consejoMSF}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200/80 space-y-1">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5" />
                <span>Base Legal Venezolana</span>
              </div>
              <p className="text-slate-700 leading-relaxed font-medium">{controlActual.baseLegal}</p>
            </div>
          </div>

          <div className="pt-1 flex items-center gap-2">
            <button
              type="button"
              onClick={() => dispararControl(controlActual.id)}
              className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-[#2563eb]" />
              <span>Accionar de nuevo</span>
            </button>
            <button
              type="button"
              onClick={siguienteNoExplorado}
              className="flex-1 py-2.5 px-3 rounded-xl bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Siguiente control</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </aside>
      </div>

      {/* Selector rápido inferior de todos los controles (comodidad en móvil) */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-2.5">
        <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
          Acceso rápido a todos los mandos ({transmision === 'manual' ? 'Sincrónica' : 'Automática'})
        </div>
        <div className="flex flex-wrap gap-1.5">
          {controles.map((c) => {
            const sel = c.id === activoId;
            const rev = explorados.has(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => manejarToque(c.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                  sel
                    ? 'bg-[#2563eb] border-[#2563eb] text-white shadow-xs'
                    : rev
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {rev && !sel && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                <span>{c.corto}</span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

/* ============================================================================
 * 8. PESTAÑA 2 — RETO "SIN MIRAR" (SIMULADOR CONTRARRELOJ 3 NIVELES)
 * ============================================================================ */
function PestanaRetoSinMirar({ transmision, playSound }) {
  const [fase, setFase] = useState('config'); // 'config' | 'jugando' | 'resultados'
  const [nivelId, setNivelId] = useState(1);
  const [escenarios, setEscenarios] = useState([]);
  const [indice, setIndice] = useState(0);
  const [zoom, setZoom] = useState('full');
  const [racha, setRacha] = useState(0);
  const [rachaMax, setRachaMax] = useState(0);
  const [registros, setRegistros] = useState([]); // { escenario, acierto, tiempoMs, respondidoId }
  const [feedback, setFeedback] = useState(null); // { ok, tiempoMs, errorId, correctoId, texto }
  const [tiempoRestanteMs, setTiempoRestanteMs] = useState(5000);
  const [copiado, setCopiado] = useState(false);

  const rafRef = useRef(null);
  const inicioEscenarioRef = useRef(0);
  const feedbackRef = useRef(null);
  const nivelObj = NIVELES_RETO.find((n) => n.id === nivelId) || NIVELES_RETO[0];
  const controlesCatalogo = useMemo(() => obtenerControlesPorTransmision(transmision), [transmision]);
  const { estadoCabina, dispararControl } = useCabinaEstado(playSound, transmision);

  useEffect(() => {
    feedbackRef.current = feedback;
  }, [feedback]);

  // Si cambia la transmisión durante el juego, volver limpiamente a configuración
  useEffect(() => {
    if (fase === 'jugando') {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setFase('config');
      setFeedback(null);
    }
  }, [transmision]);

  const escenarioActual = escenarios[indice] || null;

  const resolverTimeout = useCallback(() => {
    if (feedbackRef.current || !escenarioActual) return;
    playSound('error');
    setRacha(0);
    const fb = {
      ok: false,
      timeout: true,
      tiempoMs: nivelObj.tiempoMs,
      errorId: null,
      correctoId: escenarioActual.targetId,
      texto: escenarioActual.explicacion,
    };
    setFeedback(fb);
    setRegistros((prev) => [
      ...prev,
      {
        escenario: escenarioActual,
        acierto: false,
        tiempoMs: nivelObj.tiempoMs,
        respondidoId: null,
      },
    ]);
  }, [escenarioActual, nivelObj.tiempoMs, playSound]);

  // Cronómetro fluido con requestAnimationFrame + cleanup
  useEffect(() => {
    if (fase !== 'jugando' || feedback || !escenarioActual) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return undefined;
    }

    inicioEscenarioRef.current = performance.now();
    setTiempoRestanteMs(nivelObj.tiempoMs);

    const tick = (now) => {
      const elapsed = now - inicioEscenarioRef.current;
      const restante = Math.max(0, nivelObj.tiempoMs - elapsed);
      setTiempoRestanteMs(restante);
      if (restante <= 0) {
        resolverTimeout();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [fase, indice, feedback, escenarioActual, nivelObj.tiempoMs, resolverTimeout]);

  const iniciarReto = (listaPersonalizada = null) => {
    const base =
      listaPersonalizada && listaPersonalizada.length > 0
        ? listaPersonalizada
        : construirEscenariosReto(transmision);
    setEscenarios(base);
    setIndice(0);
    setZoom('full');
    setRacha(0);
    setRachaMax(0);
    setRegistros([]);
    setFeedback(null);
    setTiempoRestanteMs(nivelObj.tiempoMs);
    setFase('jugando');
  };

  const manejarToqueEnReto = (controlId) => {
    if (fase !== 'jugando' || feedback || !escenarioActual) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const reaccionMs = Math.max(120, Math.round(performance.now() - inicioEscenarioRef.current));
    dispararControl(controlId);

    const acierto = controlId === escenarioActual.targetId;
    if (acierto) {
      playSound('acierto');
      setRacha((r) => {
        const nueva = r + 1;
        setRachaMax((m) => Math.max(m, nueva));
        return nueva;
      });
    } else {
      playSound('error');
      setRacha(0);
    }

    setFeedback({
      ok: acierto,
      timeout: false,
      tiempoMs: reaccionMs,
      errorId: acierto ? null : controlId,
      correctoId: escenarioActual.targetId,
      texto: escenarioActual.explicacion,
    });

    setRegistros((prev) => [
      ...prev,
      {
        escenario: escenarioActual,
        acierto,
        tiempoMs: reaccionMs,
        respondidoId: controlId,
      },
    ]);
  };

  const avanzar = () => {
    if (indice < escenarios.length - 1) {
      setIndice((i) => i + 1);
      setFeedback(null);
      setZoom('full');
    } else {
      setFase('resultados');
    }
  };

  // Estadísticas del Dashboard Final
  const resumenFinal = useMemo(() => {
    if (registros.length === 0) return null;
    const total = registros.length;
    const aciertos = registros.filter((r) => r.acierto).length;
    const precision = Math.round((aciertos / total) * 100);

    const tiemposAciertos = registros.filter((r) => r.acierto).map((r) => r.tiempoMs);
    const tiempoPromMs =
      tiemposAciertos.length > 0
        ? Math.round(tiemposAciertos.reduce((a, b) => a + b, 0) / tiemposAciertos.length)
        : Math.round(registros.reduce((a, b) => a + b.tiempoMs, 0) / total);

    const zonas = {
      izq: { label: 'Mano Izquierda', aciertos: 0, total: 0 },
      der: { label: 'Mano Derecha', aciertos: 0, total: 0 },
      centro: { label: 'Centro / Tablero', aciertos: 0, total: 0 },
      pies: { label: 'Pies (Sincrónica)', aciertos: 0, total: 0 },
    };

    const falladas = [];
    const alertasCriticas = [];

    registros.forEach((reg) => {
      const ctrl = controlesCatalogo.find((c) => c.id === reg.escenario.targetId);
      const zk = ctrl ? ctrl.zonaKey : 'centro';
      zonas[zk].total += 1;
      if (reg.acierto) {
        zonas[zk].aciertos += 1;
      } else {
        falladas.push(reg.escenario);
        if (reg.escenario.critico) {
          alertasCriticas.push({
            control: ctrl ? ctrl.nombre : reg.escenario.targetId,
            explicacion: reg.escenario.explicacion,
          });
        }
      }
    });

    const recomendacion =
      alertasCriticas.length > 0
        ? transmision === 'manual'
          ? 'Clínica de Equilibrio y Control Básico + Sesión Práctica de Conducción Manual (prioridad en mandos críticos de emergencia)'
          : 'Clínica de Equilibrio y Control Básico + Sesión Práctica de Conducción Automática (prioridad en frenado y corte de emergencia)'
        : precision >= 85
        ? 'Sesión Práctica de Tráfico Urbano y Estrategia SEE para llevar tu memoria muscular de la cabina a la calle real'
        : transmision === 'manual'
        ? 'Sesión Práctica de Conducción Manual en pista controlada para afianzar coordinación manos-pies sin mirar'
        : 'Sesión Práctica de Conducción Automática en pista controlada para agilizar respuesta táctil';

    return {
      total,
      aciertos,
      precision,
      tiempoPromMs,
      zonas,
      falladas,
      alertasCriticas,
      recomendacion,
    };
  }, [registros, controlesCatalogo, transmision]);

  const copiarReporteWhatsApp = async () => {
    if (!resumenFinal) return;
    const r = resumenFinal;
    const texto = [
      `🏍️ *REPORTE CABINA: CONTROLES SIN MIRAR — Moto App*`,
      `⚙️ Transmisión: ${transmision === 'manual' ? 'Sincrónica (Manual)' : 'Automática (Scooter)'}`,
      `🎯 Nivel: ${nivelObj.titulo}`,
      `📊 Precisión: *${r.precision}%* (${r.aciertos}/${r.total} aciertos) | Racha máx.: ${rachaMax}`,
      `⚡ Tiempo promedio de reacción: *${r.tiempoPromMs} ms*`,
      r.alertasCriticas.length > 0
        ? `🚨 Alertas críticas (${r.alertasCriticas.length}): ${r.alertasCriticas.map((a) => a.control).join(', ')}`
        : `✅ Sin fallas en controles críticos de emergencia`,
      `🎓 Recomendación Moto App: ${r.recomendacion}`,
    ].join('\n');

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(texto);
      } else {
        const ta = document.createElement('textarea');
        ta.value = texto;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      setCopiado(false);
    }
  };

  /* -------------------- VISTA A: CONFIGURACIÓN DEL RETO -------------------- */
  if (fase === 'config') {
    return (
      <div className="space-y-5 animate-fadeIn">
        <section className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-5">
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-[#2563eb] border border-blue-200 text-xs font-extrabold">
              <Zap className="w-3.5 h-3.5" />
              <span>Entrenamiento Contrarreloj · 10 Escenarios Viales</span>
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
              Reto &ldquo;Controles sin Mirar&rdquo;
            </h2>
            <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
              Mide tu velocidad real de reacción en milisegundos ante emergencias y maniobras
              habituales en{' '}
              <strong>
                {transmision === 'manual' ? 'Moto Sincrónica (Manual)' : 'Moto Automática (Scooter)'}
              </strong>
              .
            </p>
          </div>

          {/* 3 Tarjetas de Nivel */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {NIVELES_RETO.map((n) => {
              const sel = nivelId === n.id;
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => setNivelId(n.id)}
                  className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                    sel
                      ? 'bg-blue-50/50 border-[#2563eb] ring-2 ring-[#2563eb]/20 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${n.colorBg} ${n.colorBorder}`}
                      >
                        {n.badge}
                      </span>
                      <span className="text-xs font-extrabold text-slate-500 tabular-nums">
                        {n.tiempoLabel}
                      </span>
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900">{n.titulo}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{n.subtitulo}</p>
                  </div>
                  <div className="text-[11px] font-bold text-[#2563eb]">
                    {sel ? '✓ Nivel seleccionado' : 'Seleccionar nivel'}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Consejo: En pantallas pequeñas puedes usar <strong>Zoom Piña Izq/Der</strong> en
              cualquier momento.
            </p>
            <button
              type="button"
              onClick={() => iniciarReto()}
              className="py-3.5 px-7 rounded-xl bg-[#2563eb] hover:bg-blue-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99] cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Comenzar Reto ({nivelObj.titulo.split('·')[0].trim()})</span>
            </button>
          </div>
        </section>
      </div>
    );
  }

  /* -------------------- VISTA C: DASHBOARD FINAL DEL RETO -------------------- */
  if (fase === 'resultados' && resumenFinal) {
    const r = resumenFinal;
    const radio = 52;
    const circunf = 2 * Math.PI * radio;
    const offset = circunf - (r.precision / 100) * circunf;
    const strokeColor =
      r.precision >= 85 ? '#10b981' : r.precision >= 65 ? '#2563eb' : '#f59e0b';

    return (
      <div className="space-y-5 animate-fadeIn">
        {/* Tarjeta de Puntaje + Tiempo de Reacción */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
              <svg className="w-36 h-36 -rotate-90" viewBox="0 0 124 124" aria-hidden="true">
                <circle cx="62" cy="62" r={radio} fill="none" stroke="#e2e8f0" strokeWidth="10" />
                <circle
                  cx="62"
                  cy="62"
                  r={radio}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={circunf}
                  strokeDashoffset={offset}
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-slate-900 tabular-nums">
                  {r.precision}%
                </span>
                <span className="text-[11px] font-bold text-slate-500">
                  {r.aciertos}/{r.total} aciertos
                </span>
              </div>
            </div>

            <div className="flex-1 text-center md:text-left space-y-2.5">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <span className="px-3 py-1 rounded-full bg-blue-50 text-[#2563eb] border border-blue-200 text-xs font-extrabold inline-flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5" />
                  <span>{nivelObj.titulo}</span>
                </span>
                <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
                  {transmision === 'manual' ? 'Sincrónica (Manual)' : 'Automática (Scooter)'}
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                {r.precision >= 90
                  ? 'Memoria Muscular Sobresaliente'
                  : r.precision >= 70
                  ? 'Buen Dominio de Cabina'
                  : 'Requiere Práctica de Familiarización'}
              </h2>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs font-bold text-slate-600 pt-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
                  <Clock className="w-4 h-4 text-[#2563eb]" />
                  Reacción media: <strong className="text-slate-900 tabular-nums">{r.tiempoPromMs} ms</strong>
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                  <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
                  Racha máxima: <strong>{rachaMax}</strong>
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Desglose por Zona + Alertas Críticas */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <section className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
              Memoria Muscular por Zona de la Cabina
            </h3>
            <div className="space-y-4">
              {Object.entries(r.zonas)
                .filter(([key]) => transmision === 'manual' || key !== 'pies')
                .map(([key, z]) => {
                  const pct = z.total > 0 ? Math.round((z.aciertos / z.total) * 100) : 0;
                  return (
                    <div key={key} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700">{z.label}</span>
                        <span className="font-extrabold text-slate-900 tabular-nums">
                          {z.total > 0 ? `${z.aciertos}/${z.total} (${pct}%)` : 'Sin escenarios'}
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-[#2563eb]' : 'bg-red-500'
                          }`}
                          style={{ width: z.total > 0 ? `${Math.max(4, pct)}%` : '0%' }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>

          <section className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {r.alertasCriticas.length > 0 ? (
                  <ShieldAlert className="w-5 h-5 text-red-600" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                )}
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                  Alertas en Controles Vitales
                </h3>
              </div>

              {r.alertasCriticas.length > 0 ? (
                <ul className="space-y-2">
                  {r.alertasCriticas.map((a, i) => (
                    <li
                      key={i}
                      className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 space-y-0.5"
                    >
                      <div className="font-extrabold flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>{a.control}</span>
                      </div>
                      <p className="opacity-90 leading-relaxed">{a.explicacion}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
                  <div className="font-extrabold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Controles vitales dominados</span>
                  </div>
                  <p className="leading-relaxed">
                    Respondiste con precisión en Paro del Motor, Freno Delantero y Direccionales.
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 rounded-xl bg-slate-900 text-white space-y-1.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Recomendación Moto App</span>
              </div>
              <p className="text-xs sm:text-sm font-bold leading-relaxed text-slate-100">
                {r.recomendacion}
              </p>
            </div>
          </section>
        </div>

        {/* Botones de Acción */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-col sm:flex-row gap-3 justify-end">
          {r.falladas.length > 0 && (
            <button
              type="button"
              onClick={() => iniciarReto(r.falladas)}
              className="py-3 px-5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reintentar Falladas ({r.falladas.length})</span>
            </button>
          )}
          <button
            type="button"
            onClick={copiarReporteWhatsApp}
            className={`py-3 px-5 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
              copiado
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
            }`}
          >
            {copiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copiado ? '¡Reporte Copiado!' : 'Copiar Reporte para WhatsApp'}</span>
          </button>
          <button
            type="button"
            onClick={() => setFase('config')}
            className="py-3 px-6 rounded-xl bg-[#2563eb] hover:bg-blue-700 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Nuevo Reto</span>
          </button>
        </section>
      </div>
    );
  }

  /* -------------------- VISTA B: JUGANDO EL RETO CONTRARRELOJ -------------------- */
  const pctTiempo = Math.max(0, Math.min(100, (tiempoRestanteMs / nivelObj.tiempoMs) * 100));
  const controlCorrectoMeta =
    feedback && controlesCatalogo.find((c) => c.id === feedback.correctoId);

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Parabrisas / Escenario Vial Urgente + Barra de Tiempo */}
      <section className="bg-slate-950 text-white rounded-2xl border border-slate-800 shadow-md p-4 sm:p-5 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-[#2563eb] text-white text-[11px] font-black">
              Escenario {indice + 1} / {escenarios.length}
            </span>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-400">
              {escenarioActual?.etiqueta}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-extrabold">
              <Flame className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{racha}</span>
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-black tabular-nums ${
                pctTiempo < 30
                  ? 'bg-red-500/20 border-red-500/50 text-red-300'
                  : 'bg-slate-900 border-slate-700 text-sky-300'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{(tiempoRestanteMs / 1000).toFixed(2)} s</span>
            </span>
          </div>
        </div>

        {/* Enunciado de la situación */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-300 flex items-center justify-center shrink-0 mt-0.5">
            {escenarioActual?.critico ? (
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            ) : (
              <Target className="w-5 h-5" />
            )}
          </div>
          <p className="text-sm sm:text-base font-extrabold text-white leading-snug">
            {escenarioActual?.situacion}
          </p>
        </div>

        {/* Barra de tiempo fluida */}
        <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-none ${
              pctTiempo < 30 ? 'bg-red-500' : pctTiempo < 60 ? 'bg-amber-400' : 'bg-emerald-400'
            }`}
            style={{ width: `${pctTiempo}%` }}
          />
        </div>
      </section>

      {/* Feedback Instantáneo tras tocar control o vencer tiempo */}
      {feedback && (
        <section
          className={`rounded-2xl border-2 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn ${
            feedback.ok
              ? 'bg-emerald-50 border-emerald-400 text-emerald-950'
              : 'bg-red-50 border-red-400 text-red-950'
          }`}
        >
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 font-extrabold text-sm">
              {feedback.ok ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600 shrink-0" />
              )}
              <span>
                {feedback.ok
                  ? `¡Correcto en ${feedback.tiempoMs} ms!`
                  : feedback.timeout
                  ? 'Se acabó el tiempo'
                  : `Control incorrecto (${feedback.tiempoMs} ms)`}
              </span>
              {!feedback.ok && controlCorrectoMeta && (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-xs font-extrabold">
                  Correcto: {controlCorrectoMeta.corto}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm leading-relaxed">{feedback.texto}</p>
          </div>

          <button
            type="button"
            onClick={avanzar}
            className="shrink-0 py-2.5 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>
              {indice < escenarios.length - 1 ? 'Siguiente situación' : 'Ver Dashboard Final'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </section>
      )}

      {/* Cabina Interactiva del Reto */}
      <CabinaInteractivaSVG
        transmision={transmision}
        zoom={zoom}
        setZoom={setZoom}
        controlActivoId={null}
        controlCorrectoId={feedback ? feedback.correctoId : null}
        controlErrorId={feedback ? feedback.errorId : null}
        mostrarEtiquetas={nivelObj.mostrarEtiquetas}
        modoNocturno={nivelObj.modoNocturno}
        estadoCabina={estadoCabina}
        onAccionarControl={manejarToqueEnReto}
        ocultarTextoAyuda={!nivelObj.mostrarEtiquetas}
      />
    </div>
  );
}

/* ============================================================================
 * 9. PESTAÑA 3 — POSTURA DE MUÑECA (SVG INTERACTIVO), REGLA 5 MESES Y LEY VE
 * ============================================================================ */
function PestanaPosturaYLeyVE() {
  const [postura, setPostura] = useState('correcta'); // 'correcta' | 'incorrecta'
  const [checklist5Meses, setChecklist5Meses] = useState({
    p1: false,
    p2: false,
    p3: false,
    p4: false,
  });

  const esCorrecta = postura === 'correcta';

  const pasosMotoNueva = [
    {
      id: 'p1',
      titulo: '1. Inspección previa completa (T-CLOCS)',
      detalle:
        'Revisa presión de cauchos, frenos, luces, fluidos, cadena y soportes como si fuera tu propia motocicleta.',
    },
    {
      id: 'p2',
      titulo: '2. Ubicar mandos sin mirarlos (en parado)',
      detalle:
        'Encuentra y acciona direccionales, claxon, luces altas/bajas, llave de combustible y paro del motor antes de rodar.',
    },
    {
      id: 'p3',
      titulo: '3. Probar zona de fricción, acelerador y frenos',
      detalle:
        'Comprueba el tacto del clutch/embrague, el retorno del acelerador y el recorrido de ambos frenos en un espacio seguro.',
    },
    {
      id: 'p4',
      titulo: '4. Margen extra en las primeras salidas',
      detalle:
        'Acelera con suavidad, toma las curvas más despacio y amplía tu colchón de frenado hasta dominar la respuesta real de la moto.',
    },
  ];

  const normativaVE = [
    {
      art: 'Decreto N° 8.495 · Art. 9',
      tema: 'Equipamiento obligatorio en cabina y moto',
      detalle:
        'Exige bocina eléctrica (num. 1), máximo 2 faros delanteros con alcance de 150 m (num. 2), frenos capaces de detener la moto en 5 m a 30 km/h (num. 3) y dos espejos retrovisores — izquierdo y derecho (num. 6).',
    },
    {
      art: 'Decreto N° 8.495 · Art. 28.14 y 30.14',
      tema: 'Luces encendidas en todo momento',
      detalle:
        'Todo conductor debe transitar por vías públicas manteniendo las luces delanteras y traseras encendidas, tanto de día como de noche.',
    },
    {
      art: 'Decreto N° 8.495 · Art. 11.7 y 31.10',
      tema: 'Uso regulado de la corneta / bocina',
      detalle:
        'Queda prohibido accionar la corneta o bocina en áreas urbanas o zonas prohibidas (salvo advertencia puntual ante peligro inminente) y prohibido instalar sirenas o pitos distintos al original.',
    },
    {
      art: 'Decreto N° 8.495 · Art. 32.4, 32.7 y Regl. Art. 271',
      tema: 'Direccionales y suavidad en maniobras',
      detalle:
        'Obligatorio usar las luces de cruce antes del adelantamiento por la izquierda y para anunciar la desincorporación de la vía, evitando siempre cambios bruscos de velocidad o dirección.',
    },
  ];

  const completados5 = Object.values(checklist5Meses).filter(Boolean).length;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 1. MINI-LABORATORIO SVG DE POSTURA DE MUÑECA (MSF) */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-[#2563eb] border border-blue-200 text-xs font-extrabold">
              <Hand className="w-3.5 h-3.5" />
              <span>Laboratorio Biomecánico MSF</span>
            </span>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
              Postura de Muñeca en el Acelerador y Freno Delantero
            </h2>
          </div>

          {/* Toggle Correcta vs Incorrecta */}
          <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setPostura('correcta')}
              className={`py-2 px-3.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                esCorrecta
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              POSTURA CORRECTA
            </button>
            <button
              type="button"
              onClick={() => setPostura('incorrecta')}
              className={`py-2 px-3.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                !esCorrecta
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              POSTURA INCORRECTA
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
          {/* Diagrama SVG lateral de puño + palanca + muñeca */}
          <div className="lg:col-span-6 bg-slate-950 rounded-2xl border border-slate-800 p-4">
            <svg
              viewBox="0 0 360 210"
              className="w-full h-auto block"
              role="img"
              aria-label={
                esCorrecta
                  ? 'Postura correcta con muñeca plana en el acelerador'
                  : 'Postura incorrecta con muñeca doblada hacia arriba en el acelerador'
              }
            >
              {/* Fondo técnico */}
              <line x1="18" y1="150" x2="342" y2="150" stroke="#1e293b" strokeWidth="1.5" strokeDasharray="5 5" />

              {/* Palanca de freno delantero */}
              <path
                d="M 118 92 Q 76 82 54 116"
                fill="none"
                stroke="#cbd5e1"
                strokeWidth="8"
                strokeLinecap="round"
              />
              <circle cx="53" cy="117" r="6" fill="#e2e8f0" />
              <text x="58" y="68" fill="#94a3b8" fontSize="9.5" fontWeight="bold">
                PALANCA FRENO
              </text>

              {/* Puño del acelerador (sección lateral) */}
              <circle cx="130" cy="112" r="24" fill="#1e293b" stroke="#64748b" strokeWidth="3" />
              <circle cx="130" cy="112" r="10" fill="#0f172a" />

              {/* Antebrazo, muñeca y mano según postura */}
              {esCorrecta ? (
                <g>
                  {/* Línea guía recta de alineación antebrazo-mano */}
                  <line
                    x1="120"
                    y1="108"
                    x2="328"
                    y2="136"
                    stroke="#10b981"
                    strokeWidth="2"
                    strokeDasharray="6 4"
                  />
                  {/* Antebrazo alineado bajo */}
                  <path
                    d="M 332 152 L 210 134 Q 178 128 156 116"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="28"
                    strokeLinecap="round"
                  />
                  {/* Guante / Mano abrazando el puño con muñeca plana */}
                  <path
                    d="M 164 114 C 154 90, 118 86, 108 104 C 102 118, 122 136, 148 132 Z"
                    fill="#1e40af"
                    stroke="#60a5fa"
                    strokeWidth="2"
                  />
                  {/* Dedos alcanzando el freno sin girar acelerador */}
                  <path
                    d="M 114 96 L 78 96"
                    fill="none"
                    stroke="#60a5fa"
                    strokeWidth="8"
                    strokeLinecap="round"
                  />
                  {/* Flecha verde: al extender dedos cierra acelerador */}
                  <path
                    d="M 118 76 A 40 40 0 0 1 154 84"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3"
                  />
                  <polygon points="112,78 124,71 122,84" fill="#10b981" />
                  <rect x="172" y="20" width="170" height="36" rx="8" fill="#064e3b" stroke="#10b981" />
                  <text x="257" y="36" textAnchor="middle" fill="#a7f3d0" fontSize="9.5" fontWeight="bold">
                    MUÑECA PLANA / BAJA
                  </text>
                  <text x="257" y="49" textAnchor="middle" fill="#ecfdf5" fontSize="8.5">
                    Al frenar, el acelerador se cierra solo
                  </text>
                </g>
              ) : (
                <g>
                  {/* Ángulo peligroso en muñeca */}
                  <path
                    d="M 332 162 L 214 146 L 176 92"
                    fill="none"
                    stroke="#dc2626"
                    strokeWidth="28"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Mano arqueada hacia arriba */}
                  <path
                    d="M 176 90 C 158 76, 122 78, 112 98 C 104 116, 124 134, 150 124 Z"
                    fill="#991b1b"
                    stroke="#fca5a5"
                    strokeWidth="2"
                  />
                  {/* Flecha roja: rotación involuntaria hacia atrás (acelera) */}
                  <path
                    d="M 146 76 A 40 40 0 0 1 174 112"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="3.5"
                  />
                  <polygon points="175,118 167,106 180,106" fill="#ef4444" />
                  <rect x="166" y="18" width="178" height="38" rx="8" fill="#7f1d1d" stroke="#ef4444" />
                  <text x="255" y="34" textAnchor="middle" fill="#fecaca" fontSize="9.5" fontWeight="bold">
                    MUÑECA ALTA / DOBLADA
                  </text>
                  <text x="255" y="48" textAnchor="middle" fill="#fef2f2" fontSize="8.5">
                    ¡Riesgo de acelerar al frenar!
                  </text>
                </g>
              )}
            </svg>
          </div>

          {/* Explicación biomecánica */}
          <div className="lg:col-span-6 space-y-3.5">
            <div
              className={`p-4 rounded-2xl border-2 space-y-2 ${
                esCorrecta
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  : 'bg-red-50 border-red-200 text-red-950'
              }`}
            >
              <div className="font-extrabold text-sm flex items-center gap-2">
                {esCorrecta ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600 shrink-0" />
                )}
                <span>
                  {esCorrecta
                    ? 'Postura Correcta: Muñeca plana/baja (Alineada)'
                    : 'Postura Incorrecta: Muñeca alta/arqueada'}
                </span>
              </div>
              <p className="text-xs sm:text-sm leading-relaxed">
                {esCorrecta
                  ? 'Al mantener los nudillos y la muñeca alineados con el antebrazo, el movimiento natural de extender los dedos hacia la palanca del freno delantero gira el puño hacia adelante, cerrando automáticamente el acelerador.'
                  : 'Con la muñeca doblada hacia arriba, si pasas un bache o necesitas alcanzar el freno en una emergencia, el peso de tu cuerpo y el estiramiento de los dedos arrastran el puño hacia atrás, acelerando involuntariamente justo cuando quieres detenerte.'}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
              <strong className="text-slate-900 block mb-1">
                Complemento postural (Manual MSF Ed. 17):
              </strong>
              Mantén los brazos ligeramente doblados, hombros relajados y rodillas suavemente
              pegadas al tanque para dirigir la motocicleta sin colgarte del manubrio.
            </div>
          </div>
        </div>
      </section>

      {/* 2. LA REGLA DE LOS 5 MESES (MSF) CON CHECKLIST INTERACTIVO */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-extrabold">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Dato Crítico MSF · Autoevaluación 2</span>
            </span>
            <h2 className="text-lg font-extrabold text-slate-900">
              La Regla de los 5 Meses: Domina tu Cabina Antes de Salir
            </h2>
          </div>
          <span className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-extrabold self-start sm:self-auto">
            {completados5}/4 pasos confirmados
          </span>
        </div>

        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          Según el Manual del Operador de la Motocicleta (MSF Ed. 17),{' '}
          <strong className="text-slate-900">
            más de la mitad de todos los choques involucran a conductores que han manejado esa
            motocicleta por menos de cinco (5) meses
          </strong>
          . Incluso pilotos experimentados deben aplicar este protocolo de 4 pasos ante una moto
          nueva o prestada:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {pasosMotoNueva.map((paso) => {
            const marcado = checklist5Meses[paso.id];
            return (
              <button
                key={paso.id}
                type="button"
                onClick={() =>
                  setChecklist5Meses((prev) => ({ ...prev, [paso.id]: !prev[paso.id] }))
                }
                className={`p-4 rounded-xl border-2 text-left flex items-start gap-3 transition-all cursor-pointer ${
                  marcado
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-950'
                    : 'bg-slate-50/70 border-slate-200 hover:border-slate-300 text-slate-800'
                }`}
              >
                <span
                  className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                    marcado
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'bg-white border-slate-300'
                  }`}
                >
                  {marcado && <Check className="w-3.5 h-3.5" />}
                </span>
                <div className="space-y-0.5">
                  <div className="text-xs sm:text-sm font-extrabold">{paso.titulo}</div>
                  <p className="text-xs text-slate-600 leading-relaxed">{paso.detalle}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. NORMATIVA VENEZOLANA DE CONTROLES Y EQUIPAMIENTO */}
      <section className="space-y-3">
        <div className="px-1">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#2563eb] mb-1">
            <Scale className="w-3.5 h-3.5" />
            <span>Marco Jurídico Vigente en Venezuela</span>
          </div>
          <h2 className="text-lg font-extrabold text-slate-900">
            Normativa de Controles y Equipamiento (Decreto N° 8.495 y Reglamento Art. 271)
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {normativaVE.map((item) => (
            <div
              key={item.art}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-extrabold">
                  {item.art}
                </span>
                <FileText className="w-4 h-4 text-slate-400 shrink-0" />
              </div>
              <h3 className="text-sm font-extrabold text-slate-900">{item.tema}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{item.detalle}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ============================================================================
 * 10. COMPONENTE RAÍZ — CabinaControlesSinMirar (EXPORT DEFAULT APP)
 * ============================================================================ */
function CabinaControlesSinMirar() {
  const [tab, setTab] = useState('explorar'); // 'explorar' | 'reto' | 'postura'
  const [transmision, setTransmision] = useState('manual'); // 'manual' | 'automatica'
  const [audioHabilitado, setAudioHabilitado] = useState(true);

  const playSound = useSoundEngine(audioHabilitado);

  const tabs = [
    { id: 'explorar', label: 'Explorar Cabina', short: 'Explorar', icon: Compass },
    { id: 'reto', label: 'Reto Sin Mirar', short: 'Reto', icon: Zap },
    { id: 'postura', label: 'Postura y Ley VE', short: 'Postura/Ley', icon: Scale },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased overflow-x-hidden">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.25s ease-out both;
        }
      `}</style>

      {/* Cabecera Técnica Oscura Moto App */}
      <header className="sticky top-0 z-30 bg-slate-950 text-white border-b border-slate-800 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 pt-3.5 pb-3 space-y-3">
          {/* Fila 1: Marca + Título + Toggle Audio */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2563eb] to-[#3b82f6] flex items-center justify-center shadow-md shrink-0">
                <Bike className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-blue-400">
                  <span>Moto App</span>
                </div>
                <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-white truncate">
                  Cabina: Controles sin Mirar
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Toggle Audio Web Audio API */}
              <button
                type="button"
                onClick={() => setAudioHabilitado((v) => !v)}
                aria-label={audioHabilitado ? 'Silenciar efectos de sonido' : 'Activar efectos de sonido'}
                className={`py-2 px-3 rounded-xl border text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                  audioHabilitado
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                {audioHabilitado ? (
                  <Volume2 className="w-4 h-4 shrink-0" />
                ) : (
                  <VolumeX className="w-4 h-4 shrink-0" />
                )}
                <span className="hidden sm:inline">
                  {audioHabilitado ? 'Audio ON' : 'Audio OFF'}
                </span>
              </button>
            </div>
          </div>

          {/* Fila 2: Selector de Transmisión + 3 Pestañas */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
            {/* Selector Sincrónica vs Automática */}
            <div
              role="radiogroup"
              aria-label="Tipo de transmisión"
              className="grid grid-cols-2 gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800"
            >
              <button
                type="button"
                role="radio"
                aria-checked={transmision === 'manual'}
                onClick={() => setTransmision('manual')}
                className={`py-1.5 px-3 rounded-lg text-[11px] sm:text-xs font-extrabold transition-all cursor-pointer ${
                  transmision === 'manual'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Moto Sincrónica (Manual)
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={transmision === 'automatica'}
                onClick={() => setTransmision('automatica')}
                className={`py-1.5 px-3 rounded-lg text-[11px] sm:text-xs font-extrabold transition-all cursor-pointer ${
                  transmision === 'automatica'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Moto Automática (Scooter)
              </button>
            </div>

            {/* 3 Pestañas de Navegación */}
            <nav
              role="tablist"
              aria-label="Secciones de Cabina Controles sin Mirar"
              className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 flex-1 md:max-w-md"
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
                    className={`py-2 px-2 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      activa
                        ? 'bg-[#2563eb] text-white shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Icono className="w-3.5 h-3.5 shrink-0" />
                    <span className="hidden sm:inline truncate">{t.label}</span>
                    <span className="sm:hidden truncate">{t.short}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Contenido Principal Responsive */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-5">
        {tab === 'explorar' && (
          <PestanaExplorarCabina transmision={transmision} playSound={playSound} />
        )}
        {tab === 'reto' && (
          <PestanaRetoSinMirar transmision={transmision} playSound={playSound} />
        )}
        {tab === 'postura' && <PestanaPosturaYLeyVE />}
      </main>

      {/* Pie informativo */}
      <footer className="max-w-5xl w-full mx-auto px-4 py-4 text-center text-[11px] text-slate-400 flex flex-wrap items-center justify-center gap-1.5">
        <Info className="w-3.5 h-3.5" />
        <span>
          Moto App · Entrenamiento interactivo basado en el Manual del Operador de
          la Motocicleta (MSF Ed. 17), Decreto N° 8.495 y Reglamento de Tránsito Terrestre (Art.
          271).
        </span>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <CabinaControlesSinMirar />
    </ErrorBoundary>
  );
}