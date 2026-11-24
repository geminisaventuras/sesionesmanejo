import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Bike,
  Compass,
  Gauge,
  Smartphone,
  RotateCcw,
  Play,
  Pause,
  Square,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Copy,
  Check,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Zap,
  Target,
  Eye,
  Sliders,
  Award,
  RefreshCw,
  Activity,
  Info,
  ChevronRight,
  Flame,
  Clock,
} from 'lucide-react';

/* ============================================================================
 * 1. ERROR BOUNDARY PARA ESTABILIDAD EN PRODUCCIÓN Y PREVIEW
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
    console.error('Error en Simulador SLPR:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F1F5F9] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-md w-full text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-extrabold text-slate-900">
              Inconveniente en el simulador
            </h2>
            <p className="text-sm text-slate-600">
              Puedes reiniciar este módulo sin perder acceso al entrenador SLPR.
            </p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false })}
              className="w-full py-3 px-4 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-sm transition-colors cursor-pointer"
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
 * 2. CONFIGURACIÓN DEL CIRCUITO DE 6 CURVAS (MODO 1)
 * ============================================================================ */
const CIRCUITO_CURVAS = [
  {
    id: 1,
    nombre: 'Curva Abierta Derecha',
    tipo: 'Abierta',
    dir: 1, // 1 = derecha, -1 = izquierda
    curvatura: 0.54,
    velMin: 36,
    velMax: 52,
    longitud: 420,
    indicacion: 'Presiona suavemente el mango derecho y proyecta tu mirada a la salida.',
  },
  {
    id: 2,
    nombre: 'Curva Abierta Izquierda',
    tipo: 'Abierta',
    dir: -1,
    curvatura: 0.58,
    velMin: 35,
    velMax: 50,
    longitud: 420,
    indicacion: 'Empuja el mango izquierdo hacia adelante para inclinar con fluidez.',
  },
  {
    id: 3,
    nombre: 'Zona de Velocidad Controlada',
    tipo: 'Controlada',
    dir: 1,
    curvatura: 0.48,
    velMin: 26,
    velMax: 38,
    longitud: 370,
    indicacion: 'Reduce a ≤ 38 km/h ANTES de entrar (SLOW) y mantén trazada estable.',
  },
  {
    id: 4,
    nombre: 'Curva Cerrada Izquierda',
    tipo: 'Cerrada',
    dir: -1,
    curvatura: 0.86,
    velMin: 28,
    velMax: 42,
    longitud: 460,
    indicacion: 'Frena antes del ingreso; inclina más profundo sin tocar el freno en el ápice.',
  },
  {
    id: 5,
    nombre: 'Curva Cerrada Derecha',
    tipo: 'Cerrada',
    dir: 1,
    curvatura: 0.88,
    velMin: 28,
    velMax: 42,
    longitud: 460,
    indicacion: 'Evita invadir el carril contrario: presiona derecho y acelera suave al salir.',
  },
  {
    id: 6,
    nombre: 'Curva Rápida Final Izquierda',
    tipo: 'Rápida',
    dir: -1,
    curvatura: 0.66,
    velMin: 34,
    velMax: 48,
    longitud: 440,
    indicacion: 'Último tramo: mantén ojos al horizonte y aplica ROLL al superar el ápice.',
  },
];

/* ============================================================================
 * 3. DATOS DEL LABORATORIO SLPR (MODO 2)
 * ============================================================================ */
const PASOS_SLPR = [
  {
    id: 'S',
    sigla: 'S',
    titulo: 'Disminuir (SLOW)',
    subtitulo: 'Ajusta velocidad antes de entrar',
    colorBg: 'bg-red-50',
    colorText: 'text-red-700',
    colorBorder: 'border-red-200',
    colorPill: 'bg-red-600',
    zonaDiagrama: 'Frenos y acelerador (antes de inclinar)',
    descripcion:
      'Reduce la velocidad cerrando el acelerador y accionando ambos frenos ANTES de iniciar la inclinación. Frenar brusco ya inclinado sobrecarga la adherencia del caucho.',
  },
  {
    id: 'L',
    sigla: 'L',
    titulo: 'Observar (LOOK)',
    subtitulo: 'Ojos alineados al horizonte',
    colorBg: 'bg-amber-50',
    colorText: 'text-amber-800',
    colorBorder: 'border-amber-200',
    colorPill: 'bg-amber-500',
    zonaDiagrama: 'Cabeza y línea visual (sin girar hombros)',
    descripcion:
      'Voltea únicamente la cabeza y los ojos hacia la salida de la curva manteniendo la vista paralela al horizonte. La motocicleta siempre sigue hacia donde apuntas tu mirada.',
  },
  {
    id: 'P',
    sigla: 'P',
    titulo: 'Presionar (PRESS)',
    subtitulo: 'Contramanillar deliberado',
    colorBg: 'bg-blue-50',
    colorText: 'text-[#2563EB]',
    colorBorder: 'border-blue-200',
    colorPill: 'bg-[#2563EB]',
    zonaDiagrama: 'Manubrio y rueda delantera',
    descripcion:
      'Presiona hacia adelante el mango del lado hacia donde quieres girar: presiona izquierdo → inclina izquierda → vas a la izquierda. Más velocidad o curva más cerrada exige mayor inclinación.',
  },
  {
    id: 'R',
    sigla: 'R',
    titulo: 'Girar (ROLL)',
    subtitulo: 'Acelerador suave y constante',
    colorBg: 'bg-emerald-50',
    colorText: 'text-emerald-800',
    colorBorder: 'border-emerald-200',
    colorPill: 'bg-[#10B981]',
    zonaDiagrama: 'Puño derecho y suspensión trasera',
    descripcion:
      'Al superar el vértice (ápice), gira suavemente el acelerador para mantener o elevar ligeramente la velocidad. Esto estabiliza la suspensión y ayuda a enderezar la trazada.',
  },
];

/* ============================================================================
 * 4. ESCENARIOS DEL RETO CONTRAMANILLAR Y EVASIÓN (MODO 3)
 * ============================================================================ */
const ESCENARIOS_RETO = [
  {
    id: 'sc-1',
    titulo: 'Curva cerrada a la derecha',
    tipo: 'manubrio',
    badge: 'Contramanillar (PRESS)',
    prompt:
      'Circulas a 45 km/h y se aproxima una curva cerrada hacia la DERECHA. ¿Qué mango del manubrio debes presionar hacia adelante para inclinar la moto hacia la curva?',
    respuestaCorrecta: 'der',
    diagrama: 'curva_der',
    explicacion:
      'Correcto por física de contramanillar (MSF): presionar el mango DERECHO hacia adelante provoca que la moto se incline a la derecha y trace la curva con precisión.',
  },
  {
    id: 'sc-2',
    titulo: 'Curva abierta a la izquierda',
    tipo: 'manubrio',
    badge: 'Contramanillar (PRESS)',
    prompt:
      'Entras a una curva amplia hacia la IZQUIERDA en carretera. Toca el mango que debes empujar hacia adelante para iniciar la inclinación segura.',
    respuestaCorrecta: 'izq',
    diagrama: 'curva_izq',
    explicacion:
      'Presiona el mango IZQUIERDO hacia adelante → inclinas a la izquierda → la moto gira hacia la izquierda. Mantén los brazos ligeramente flexionados para operar sin tensión.',
  },
  {
    id: 'sc-3',
    titulo: 'Obstáculo repentino en el centro (Esquive en S)',
    tipo: 'esquive_doble',
    badge: 'Evasión Rápida (2 pasos)',
    prompt:
      'Un objeto cae justo en tu trayectoria. Debes esquivar por la IZQUIERDA y luego RECUPERAR hacia la DERECHA para volver a tu carril. Ejecuta la secuencia de 2 toques en el manubrio.',
    secuenciaCorrecta: ['izq', 'der'],
    diagrama: 'esquive_s',
    explicacion:
      'En un esquive rápido (MSF), mantén el cuerpo derecho y deja que la moto se mueva debajo de ti: presiona IZQUIERDO para esquivar el obstáculo y de inmediato presiona DERECHO para recuperar tu trayectoria.',
  },
  {
    id: 'sc-4',
    titulo: 'Vuelta en U lenta en estacionamiento',
    tipo: 'opciones',
    badge: 'Técnica de Postura',
    prompt:
      'Debes hacer una vuelta en U muy cerrada a baja velocidad (10 km/h) dentro de un patio reducido. ¿Qué postura corporal ofrece mayor equilibrio y radio de giro?',
    diagrama: 'vuelta_u',
    opciones: [
      {
        id: 'a',
        texto: 'Técnica de contrapeso: inclinar la motocicleta debajo de ti manteniendo tu torso derecho.',
      },
      {
        id: 'b',
        texto: 'Inclinar el cuerpo exageradamente hacia el interior más que la motocicleta.',
      },
      {
        id: 'c',
        texto: 'Mantener la moto completamente vertical y girar solo con el freno delantero.',
      },
    ],
    respuestaCorrecta: 'a',
    explicacion:
      'En vueltas lentas y cerradas (MSF), la técnica del contrapeso mantiene tu torso vertical mientras inclinas solo la moto, evitando que caiga hacia el interior por baja velocidad.',
  },
  {
    id: 'sc-5',
    titulo: 'Entrada demasiado rápida a una curva',
    tipo: 'opciones',
    badge: 'Gestión de Emergencia',
    prompt:
      'Calculaste mal una curva y sientes que vas demasiado rápido ya inclinado. ¿Cuál es la reacción más segura para no salirte ni patinar?',
    diagrama: 'exceso_vel',
    opciones: [
      {
        id: 'a',
        texto: 'Apretar con fuerza el freno delantero a mitad de la inclinación.',
      },
      {
        id: 'b',
        texto:
          'Mantener la vista en la salida, evitar frenar brusco y presionar más el mango del lado de la curva para aumentar la inclinación.',
      },
      {
        id: 'c',
        texto: 'Mirar fijamente el borde exterior para calcular dónde vas a salir.',
      },
    ],
    respuestaCorrecta: 'b',
    explicacion:
      'Frenar bruscamente inclinado provoca pérdida de adherencia y patinamiento. Mirar el borde genera "fijación de objetivo". Proyecta la mirada hacia la salida y confía en el contramanillar para inclinar más.',
  },
  {
    id: 'sc-6',
    titulo: 'Proyección de la mirada (Paso LOOK)',
    tipo: 'opciones',
    badge: 'Mirada y Horizonte',
    prompt:
      'Mientras trazas una curva a velocidad media, ¿cómo debes orientar tu cabeza, hombros y ojos según el Manual del Operador (MSF)?',
    diagrama: 'mirada_look',
    opciones: [
      {
        id: 'a',
        texto: 'Voltear únicamente la cabeza y los ojos hacia la salida, alineados con el horizonte.',
      },
      {
        id: 'b',
        texto: 'Girar cabeza y hombros juntos mirando 2 metros por delante de la rueda delantera.',
      },
      {
        id: 'c',
        texto: 'Inclinar la cabeza exactamente al mismo ángulo que el suelo mirando el velocímetro.',
      },
    ],
    respuestaCorrecta: 'a',
    explicacion:
      'El paso LOOK indica voltear solo la cabeza (sin girar los hombros) y mantener los ojos horizontales hacia donde deseas ir, logrando estabilidad vestibular y lectura temprana de la salida.',
  },
];

/* ============================================================================
 * 5. HOOK COMPARTIDO DE GIROSCOPIO (iOS 13+, ANDROID Y FALLBACK ESCRITORIO)
 * ============================================================================ */
function useGyroscope() {
  const [activo, setActivo] = useState(false);
  const [estado, setEstado] = useState('inactivo'); // 'inactivo' | 'solicitando' | 'activo' | 'no_disponible' | 'denegado'
  const [anguloGyro, setAnguloGyro] = useState(0);
  const [mensaje, setMensaje] = useState('');

  const offsetRef = useRef(0);
  const rawGammaRef = useRef(0);
  const smoothedRef = useRef(0);
  const recibidoRef = useRef(false);
  const timeoutRef = useRef(null);

  const desactivar = useCallback(() => {
    setActivo(false);
    setEstado('inactivo');
    setMensaje('');
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const calibrarCero = useCallback(() => {
    offsetRef.current = rawGammaRef.current;
    smoothedRef.current = 0;
    setAnguloGyro(0);
    setMensaje('Calibrado en 0°');
    setTimeout(() => {
      setMensaje((prev) => (prev === 'Calibrado en 0°' ? '' : prev));
    }, 1800);
  }, []);

  const activar = useCallback(async () => {
    if (typeof window === 'undefined' || typeof window.DeviceOrientationEvent === 'undefined') {
      setEstado('no_disponible');
      setActivo(false);
      setMensaje('Sin sensor de giroscopio: usa botones táctiles, slider o teclado.');
      return;
    }

    setEstado('solicitando');
    setMensaje('');

    try {
      if (typeof window.DeviceOrientationEvent.requestPermission === 'function') {
        const permiso = await window.DeviceOrientationEvent.requestPermission();
        if (permiso !== 'granted') {
          setEstado('denegado');
          setActivo(false);
          setMensaje('Permiso denegado: puedes usar los controles táctiles o teclado.');
          return;
        }
      }

      recibidoRef.current = false;
      setActivo(true);
      setEstado('activo');

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        if (!recibidoRef.current) {
          setActivo(false);
          setEstado('no_disponible');
          setMensaje('Dispositivo sin giroscopio activo: controles táctiles y teclado listos.');
        }
      }, 1300);
    } catch {
      setEstado('no_disponible');
      setActivo(false);
      setMensaje('No se pudo activar el sensor: usa los controles en pantalla o teclado.');
    }
  }, []);

  useEffect(() => {
    if (!activo) return undefined;

    const manejarOrientacion = (event) => {
      if (typeof event.gamma !== 'number' || Number.isNaN(event.gamma)) return;
      if (!recibidoRef.current) {
        recibidoRef.current = true;
        offsetRef.current = event.gamma;
      }
      rawGammaRef.current = event.gamma;
      const relativo = Math.max(-38, Math.min(38, event.gamma - offsetRef.current));
      // Filtro pasa-bajas para lectura fluida sin temblor
      smoothedRef.current = smoothedRef.current * 0.76 + relativo * 0.24;
      setAnguloGyro(Math.round(smoothedRef.current * 10) / 10);
    };

    window.addEventListener('deviceorientation', manejarOrientacion, true);
    return () => {
      window.removeEventListener('deviceorientation', manejarOrientacion, true);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [activo]);

  return {
    activo,
    estado,
    anguloGyro,
    mensaje,
    activar,
    desactivar,
    calibrarCero,
  };
}

/* ============================================================================
 * 6. UTILIDADES DE DIAGNÓSTICO (MODO 1)
 * ============================================================================ */
function obtenerRangoPiloto(puntaje) {
  if (puntaje >= 88) {
    return {
      rango: 'Dominio SLPR',
      colorStroke: '#10B981',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      descripcion:
        'Excelente coordinación entre velocidad previa (SLOW), mirada estable (LOOK), contramanillar progresivo (PRESS) y aceleración de salida (ROLL).',
    };
  }
  if (puntaje >= 72) {
    return {
      rango: 'Trazado Preciso',
      colorStroke: '#2563EB',
      badgeClass: 'bg-blue-50 text-[#2563EB] border-blue-200',
      descripcion:
        'Mantienes buen control del carril y estabilidad. Ajustar pequeños detalles en curvas cerradas te llevará a un trazado impecable.',
    };
  }
  if (puntaje >= 52) {
    return {
      rango: 'Piloto en Progreso',
      colorStroke: '#F59E0B',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
      descripcion:
        'Comprendes la dinámica del contramanillar, pero aún existen momentos de exceso de velocidad o correcciones tardías en curva.',
    };
  }
  return {
    rango: 'Novato en Pista',
    colorStroke: '#EF4444',
    badgeClass: 'bg-red-50 text-red-700 border-red-200',
    descripcion:
      'Necesitas reforzar el frenado previo a la curva y la suavidad en el contramanillar antes de exigir ángulos de inclinación altos.',
  };
}

function obtenerRecomendacionMotoApp(metricas, alertas) {
  if (alertas.frenadoInclinado > 0) {
    return {
      titulo: 'Recomendación Moto App: Sesión práctica de frenado y control en curva',
      detalle:
        'Detectamos frenadas bruscas con inclinación alta. Agenda una sesión práctica enfocada en frenado progresivo previo (SLOW) y modulación de adherencia en pista controlada.',
    };
  }
  if (metricas.precisionCarril < 75 || alertas.carrilContrario > 0) {
    return {
      titulo: 'Recomendación Moto App: Clínica de Equilibrio y Trazado SLPR',
      detalle:
        'Para eliminar la tendencia a abrirte hacia el carril contrario, te recomendamos nuestra Clínica de Equilibrio y una sesión práctica de trazado con ejercicios de mirada (LOOK) y contramanillar.',
    };
  }
  if (metricas.velocidadPreCurva < 75 || metricas.salidaRoll < 75) {
    return {
      titulo: 'Recomendación Moto App: Sesión práctica de ritmo y aceleración progresiva',
      detalle:
        'Tu trazada es sólida; afinar la gestión de velocidad de entrada y la apertura suave del acelerador (ROLL) hará tus curvas mucho más estables.',
    };
  }
  return {
    titulo: 'Recomendación Moto App: Clínica de Perfeccionamiento de Trazado Avanzado',
    detalle:
      'Demostraste gran dominio técnico en las 6 curvas. Estás listo para consolidar tu técnica en una sesión práctica de maniobras evasivas y enlaces de curvas en pista.',
  };
}

/* ============================================================================
 * 7. COMPONENTE MODO 1: SIMULADOR DE CURVAS EN VIVO (HTML5 CANVAS 60FPS)
 * ============================================================================ */
function SimuladorCurvasEnVivo({ gyro }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const rafRef = useRef(null);
  const lastTimeRef = useRef(0);

  // Estado UI sincronizado a ~15-20Hz para no re-renderizar React 60 veces/seg
  const [estadoSim, setEstadoSim] = useState('listo'); // 'listo' | 'corriendo' | 'pausado' | 'finalizado'
  const [hud, setHud] = useState({
    velocidad: 42,
    angulo: 0,
    grip: 100,
    curvaIdx: 0,
    progresoCurva: 0,
    faseSLPR: 'S',
    puntaje: 100,
    alerta: null,
    enZonaVerde: true,
    posicionCarril: 0,
    sliderManual: 0,
  });
  const [diagnosticoFinal, setDiagnosticoFinal] = useState(null);
  const [copiado, setCopiado] = useState(false);

  // Estado mutable de física a 60fps
  const simRef = useRef({
    running: false,
    paused: false,
    curveIdx: 0,
    curveDist: 0,
    totalDist: 0,
    speed: 40, // km/h
    leanAngle: 0, // -38 a +38 grados (negativo = izquierda, positivo = derecha)
    lanePos: 0, // 0 = centro del carril derecho; < -0.56 = carril contrario; > 0.60 = hombrillo
    grip: 100,
    scoreFloat: 100,
    shakeTime: 0,
    alertText: null,
    alertSeverity: 'info', // 'warning' | 'danger' | 'success'
    alertTimer: 0,
    // Entradas del piloto
    pressLeft: false,
    pressRight: false,
    throttle: false,
    brake: false,
    sliderActive: false,
    sliderTarget: 0,
    // Telemetría para diagnóstico final
    samplesSlow: 0,
    goodSlow: 0,
    samplesLane: 0,
    goodLane: 0,
    samplesGrip: 0,
    goodGrip: 0,
    samplesRoll: 0,
    goodRoll: 0,
    brakeInLeanCount: 0,
    brakeInLeanCooldown: 0,
    oncomingViolations: 0,
    oncomingCooldown: 0,
    shoulderExits: 0,
    shoulderCooldown: 0,
    overSpeedEntries: 0,
    curveEntryEvaluated: -1,
    hudSyncAcc: 0,
  });

  // Mantener referencia actualizada del giroscopio dentro del loop 60fps
  const gyroRef = useRef({ activo: false, angulo: 0 });
  useEffect(() => {
    gyroRef.current = { activo: gyro.activo, angulo: gyro.anguloGyro };
  }, [gyro.activo, gyro.anguloGyro]);

  const reiniciarEstadoFisica = useCallback(() => {
    const s = simRef.current;
    s.curveIdx = 0;
    s.curveDist = 0;
    s.totalDist = 0;
    s.speed = 42;
    s.leanAngle = 0;
    s.lanePos = 0;
    s.grip = 100;
    s.scoreFloat = 100;
    s.shakeTime = 0;
    s.alertText = null;
    s.alertTimer = 0;
    s.pressLeft = false;
    s.pressRight = false;
    s.throttle = false;
    s.brake = false;
    s.sliderActive = false;
    s.sliderTarget = 0;
    s.samplesSlow = 0;
    s.goodSlow = 0;
    s.samplesLane = 0;
    s.goodLane = 0;
    s.samplesGrip = 0;
    s.goodGrip = 0;
    s.samplesRoll = 0;
    s.goodRoll = 0;
    s.brakeInLeanCount = 0;
    s.brakeInLeanCooldown = 0;
    s.oncomingViolations = 0;
    s.oncomingCooldown = 0;
    s.shoulderExits = 0;
    s.shoulderCooldown = 0;
    s.overSpeedEntries = 0;
    s.curveEntryEvaluated = -1;
    s.hudSyncAcc = 0;
  }, []);

  const construirDiagnostico = useCallback(() => {
    const s = simRef.current;
    const velocidadPreCurva =
      s.samplesSlow > 0 ? Math.round((s.goodSlow / s.samplesSlow) * 100) : 78;
    const precisionCarril =
      s.samplesLane > 0 ? Math.round((s.goodLane / s.samplesLane) * 100) : 80;
    const estabilidadGrip =
      s.samplesGrip > 0 ? Math.round((s.goodGrip / s.samplesGrip) * 100) : 95;
    const salidaRoll =
      s.samplesRoll > 0 ? Math.round((s.goodRoll / s.samplesRoll) * 100) : 80;

    // Penalización proporcional por eventos críticos
    const penalizacion =
      s.brakeInLeanCount * 8 + s.oncomingViolations * 7 + s.shoulderExits * 4;
    const promedioPonderado = Math.round(
      velocidadPreCurva * 0.25 +
        precisionCarril * 0.35 +
        estabilidadGrip * 0.25 +
        salidaRoll * 0.15
    );
    const puntajeGlobal = Math.max(12, Math.min(100, promedioPonderado - Math.min(penalizacion, 28)));

    const alertas = {
      frenadoInclinado: s.brakeInLeanCount,
      carrilContrario: s.oncomingViolations,
      salidaHombrillo: s.shoulderExits,
      excesoEntrada: s.overSpeedEntries,
    };

    const curvasCompletadas = Math.min(CIRCUITO_CURVAS.length, s.curveIdx + (s.curveDist > 120 ? 1 : 0));

    return {
      puntajeGlobal,
      curvasCompletadas,
      rango: obtenerRangoPiloto(puntajeGlobal),
      metricas: {
        velocidadPreCurva,
        precisionCarril,
        estabilidadGrip,
        salidaRoll,
      },
      alertas,
      recomendacion: obtenerRecomendacionMotoApp(
        { velocidadPreCurva, precisionCarril, estabilidadGrip, salidaRoll },
        alertas
      ),
    };
  }, []);

  const iniciarCircuito = useCallback(() => {
    reiniciarEstadoFisica();
    simRef.current.running = true;
    simRef.current.paused = false;
    setDiagnosticoFinal(null);
    setEstadoSim('corriendo');
    lastTimeRef.current = performance.now();
  }, [reiniciarEstadoFisica]);

  const togglePausa = useCallback(() => {
    if (estadoSim === 'corriendo') {
      simRef.current.paused = true;
      setEstadoSim('pausado');
    } else if (estadoSim === 'pausado') {
      simRef.current.paused = false;
      lastTimeRef.current = performance.now();
      setEstadoSim('corriendo');
    }
  }, [estadoSim]);

  const finalizarCircuito = useCallback(() => {
    simRef.current.running = false;
    simRef.current.paused = false;
    const reporte = construirDiagnostico();
    setDiagnosticoFinal(reporte);
    setEstadoSim('finalizado');
  }, [construirDiagnostico]);

  // Listeners de teclado (A/D, Flechas, W/S) con cleanup estricto
  useEffect(() => {
    const onKeyDown = (e) => {
      if (estadoSim !== 'corriendo') return;
      const k = e.key.toLowerCase();
      if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'a', 'd', 'w', 's'].includes(k)) {
        e.preventDefault();
      }
      if (k === 'a' || k === 'arrowleft') {
        simRef.current.sliderActive = false;
        simRef.current.pressLeft = true;
      }
      if (k === 'd' || k === 'arrowright') {
        simRef.current.sliderActive = false;
        simRef.current.pressRight = true;
      }
      if (k === 'w' || k === 'arrowup') simRef.current.throttle = true;
      if (k === 's' || k === 'arrowdown') simRef.current.brake = true;
    };

    const onKeyUp = (e) => {
      const k = e.key.toLowerCase();
      if (k === 'a' || k === 'arrowleft') simRef.current.pressLeft = false;
      if (k === 'd' || k === 'arrowright') simRef.current.pressRight = false;
      if (k === 'w' || k === 'arrowup') simRef.current.throttle = false;
      if (k === 's' || k === 'arrowdown') simRef.current.brake = false;
    };

    window.addEventListener('keydown', onKeyDown, { passive: false });
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [estadoSim]);

  // Ajuste de resolución Retina (devicePixelRatio) del Canvas
  const ajustarTamanoCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = container.clientWidth;
    const height = Math.max(290, Math.min(390, Math.round(width * 0.56)));
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }, []);

  useEffect(() => {
    ajustarTamanoCanvas();
    window.addEventListener('resize', ajustarTamanoCanvas);
    return () => window.removeEventListener('resize', ajustarTamanoCanvas);
  }, [ajustarTamanoCanvas]);

  // Función de renderizado 60fps en Canvas HTML5
  const dibujarEscena = useCallback((ctx, width, height, s) => {
    const curva = CIRCUITO_CURVAS[Math.min(s.curveIdx, CIRCUITO_CURVAS.length - 1)];
    const t = Math.min(1, s.curveDist / curva.longitud);

    // Curvatura instantánea suave (entra en t=0.25, pico en 0.50, sale en 0.78)
    let curveStrength = 0;
    if (t >= 0.22 && t <= 0.82) {
      const localT = (t - 0.22) / 0.6;
      curveStrength = Math.sin(localT * Math.PI) * curva.curvatura * curva.dir;
    }

    ctx.save();

    // Vibración breve si hay pérdida de adherencia
    if (s.shakeTime > 0) {
      const mag = s.shakeTime * 11;
      ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
    }

    const horizonY = Math.round(height * 0.42);
    const leanRad = (s.leanAngle * Math.PI) / 180;

    // 1. Cielo + Montañas con ligera inclinación contraria para inmersión de inclinación
    ctx.save();
    ctx.translate(width / 2, horizonY);
    ctx.rotate(-leanRad * 0.34);

    // Gradiente de cielo limpio
    const skyGrad = ctx.createLinearGradient(0, -height, 0, 20);
    skyGrad.addColorStop(0, '#0F172A');
    skyGrad.addColorStop(0.55, '#1E3A8A');
    skyGrad.addColorStop(1, '#93C5FD');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(-width, -height, width * 2, height + 30);

    // Silueta de cordillera / montañas
    const mountainShift = -curveStrength * 90 - (s.totalDist * 0.04) % 240;
    ctx.fillStyle = '#1E293B';
    ctx.beginPath();
    ctx.moveTo(-width, 20);
    for (let x = -width; x <= width; x += 60) {
      const ridge =
        Math.sin((x - mountainShift) * 0.011) * 24 +
        Math.cos((x - mountainShift) * 0.023) * 14 +
        30;
      ctx.lineTo(x, -ridge);
    }
    ctx.lineTo(width, 20);
    ctx.closePath();
    ctx.fill();

    // Terreno base debajo del horizonte
    const groundGrad = ctx.createLinearGradient(0, 0, 0, height);
    groundGrad.addColorStop(0, '#334155');
    groundGrad.addColorStop(0.25, '#1E293B');
    groundGrad.addColorStop(1, '#0F172A');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(-width, 0, width * 2, height * 1.4);

    // 2. Renderizado por franjas de perspectiva de la carretera
    const roadSlices = 58;
    const maxRoadY = height * 0.85;
    const roadBaseHalfW = width * 0.52;
    const roadTopHalfW = width * 0.045;

    for (let i = 0; i < roadSlices; i += 1) {
      const p1 = i / roadSlices;
      const p2 = (i + 1) / roadSlices;
      // Perspectiva cuadrática
      const z1 = Math.pow(p1, 1.72);
      const z2 = Math.pow(p2, 1.72);

      const y1 = z1 * maxRoadY;
      const y2 = z2 * maxRoadY + 1;

      const halfW1 = roadTopHalfW + (roadBaseHalfW - roadTopHalfW) * z1;
      const halfW2 = roadTopHalfW + (roadBaseHalfW - roadTopHalfW) * z2;

      // Desplazamiento horizontal por curva + posición del piloto en carril
      // lanePos = 0 -> piloto centrado en el carril derecho (1/2 de la mitad derecha)
      const riderCenterOffset = (0.48 + s.lanePos * 0.88);
      const bend1 = curveStrength * Math.pow(1 - p1, 2.05) * width * 0.62;
      const bend2 = curveStrength * Math.pow(1 - p2, 2.05) * width * 0.62;

      const cx1 = bend1 - riderCenterOffset * halfW1 * 0.55;
      const cx2 = bend2 - riderCenterOffset * halfW2 * 0.55;

      // Alternancia de bandas para sensación real de velocidad
      const stripePhase = Math.floor((1 - p1) * 14 + s.totalDist * 0.095) % 2 === 0;

      // Hombrillo derecho e izquierdo (borde de seguridad)
      const shW1 = halfW1 * 0.24;
      const shW2 = halfW2 * 0.24;
      ctx.fillStyle = stripePhase ? '#475569' : '#3F4E63';
      ctx.beginPath();
      ctx.moveTo(cx1 - halfW1 - shW1, y1);
      ctx.lineTo(cx1 + halfW1 + shW1, y1);
      ctx.lineTo(cx2 + halfW2 + shW2, y2);
      ctx.lineTo(cx2 - halfW2 - shW2, y2);
      ctx.closePath();
      ctx.fill();

      // Asfalto principal (2 carriles: izquierdo contrario, derecho del piloto)
      ctx.fillStyle = stripePhase ? '#1E293B' : '#253349';
      ctx.beginPath();
      ctx.moveTo(cx1 - halfW1, y1);
      ctx.lineTo(cx1 + halfW1, y1);
      ctx.lineTo(cx2 + halfW2, y2);
      ctx.lineTo(cx2 - halfW2, y2);
      ctx.closePath();
      ctx.fill();

      // Bordes blancos externos de la vía
      ctx.fillStyle = '#E2E8F0';
      const edgeW1 = Math.max(1.2, halfW1 * 0.032);
      const edgeW2 = Math.max(1.2, halfW2 * 0.032);
      // Borde izquierdo
      ctx.beginPath();
      ctx.moveTo(cx1 - halfW1, y1);
      ctx.lineTo(cx1 - halfW1 + edgeW1, y1);
      ctx.lineTo(cx2 - halfW2 + edgeW2, y2);
      ctx.lineTo(cx2 - halfW2, y2);
      ctx.closePath();
      ctx.fill();
      // Borde derecho
      ctx.beginPath();
      ctx.moveTo(cx1 + halfW1 - edgeW1, y1);
      ctx.lineTo(cx1 + halfW1, y1);
      ctx.lineTo(cx2 + halfW2, y2);
      ctx.lineTo(cx2 + halfW2 - edgeW2, y2);
      ctx.closePath();
      ctx.fill();

      // Doble línea amarilla central (divide carril contrario del carril del piloto)
      ctx.fillStyle = '#F59E0B';
      const centerW1 = Math.max(1.2, halfW1 * 0.025);
      const centerW2 = Math.max(1.2, halfW2 * 0.025);
      const gap1 = centerW1 * 1.4;
      const gap2 = centerW2 * 1.4;
      // Línea izquierda amarilla
      ctx.beginPath();
      ctx.moveTo(cx1 - gap1 - centerW1, y1);
      ctx.lineTo(cx1 - gap1, y1);
      ctx.lineTo(cx2 - gap2, y2);
      ctx.lineTo(cx2 - gap2 - centerW2, y2);
      ctx.closePath();
      ctx.fill();
      // Línea derecha amarilla
      ctx.beginPath();
      ctx.moveTo(cx1 + gap1, y1);
      ctx.lineTo(cx1 + gap1 + centerW1, y1);
      ctx.lineTo(cx2 + gap2 + centerW2, y2);
      ctx.lineTo(cx2 + gap2, y2);
      ctx.closePath();
      ctx.fill();

      // Guía sutil de trazada ideal en el centro del carril derecho
      if (stripePhase && i > 4) {
        ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
        const idealX1 = cx1 + halfW1 * 0.5;
        const idealX2 = cx2 + halfW2 * 0.5;
        const tw1 = Math.max(1.5, halfW1 * 0.045);
        const tw2 = Math.max(1.5, halfW2 * 0.045);
        ctx.beginPath();
        ctx.moveTo(idealX1 - tw1, y1);
        ctx.lineTo(idealX1 + tw1, y1);
        ctx.lineTo(idealX2 + tw2, y2);
        ctx.lineTo(idealX2 - tw2, y2);
        ctx.closePath();
        ctx.fill();
      }

      // Postes reflectivos laterales cada cierto tramo
      if (i % 9 === 3 && stripePhase) {
        const postH = 6 + z1 * 34;
        const postW = 2 + z1 * 4;
        // Lado derecho
        ctx.fillStyle = curva.dir === 1 && t > 0.12 && t < 0.78 ? '#F59E0B' : '#94A3B8';
        ctx.fillRect(cx1 + halfW1 + shW1 + 4, y1 - postH, postW, postH);
        // Lado izquierdo
        ctx.fillStyle = curva.dir === -1 && t > 0.12 && t < 0.78 ? '#F59E0B' : '#94A3B8';
        ctx.fillRect(cx1 - halfW1 - shW1 - 4 - postW, y1 - postH, postW, postH);
      }
    }

    // 3. Marcador brillante de Vértice / Ápice (LOOK) en la curva
    if (t >= 0.12 && t <= 0.74) {
      const apexDepth = Math.max(0.14, Math.min(0.68, 0.78 - t * 0.85));
      const zApex = Math.pow(apexDepth, 1.72);
      const yApex = zApex * maxRoadY;
      const halfWApex = roadTopHalfW + (roadBaseHalfW - roadTopHalfW) * zApex;
      const bendApex = curveStrength * Math.pow(1 - apexDepth, 2.05) * width * 0.62;
      const riderCenterOffset = 0.48 + s.lanePos * 0.88;
      const cxApex = bendApex - riderCenterOffset * halfWApex * 0.55;
      // Ápice en el borde interior de nuestro carril derecho
      const apexX =
        curva.dir === 1 ? cxApex + halfWApex * 0.82 : cxApex + halfWApex * 0.16;

      const pulse = 1 + Math.sin(performance.now() * 0.009) * 0.18;
      ctx.beginPath();
      ctx.arc(apexX, yApex - 8, 12 * pulse, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(apexX, yApex - 8, 5.5, 0, Math.PI * 2);
      ctx.fillStyle = '#10B981';
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      ctx.fillStyle = '#ECFDF5';
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ÁPICE (LOOK)', apexX, yApex - 22);
    }

    ctx.restore(); // Fin de rotación del mundo

    // 4. Línea guía de HORIZONTE ESTABLE (Ojos alineados con el horizonte — LOOK)
    ctx.save();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(16, horizonY);
    ctx.lineTo(width - 16, horizonY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
    ctx.beginPath();
    ctx.roundRect(width / 2 - 96, horizonY - 24, 192, 18, 9);
    ctx.fill();
    ctx.fillStyle = '#7DD3FC';
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('OJOS ALINEADOS AL HORIZONTE', width / 2, horizonY - 12);
    ctx.restore();

    // 5. Señal direccional de curva entrante (Parte superior del canvas)
    const dirLabel = curva.dir === 1 ? 'DERECHA →' : '← IZQUIERDA';
    const velOk = s.speed >= curva.velMin - 4 && s.speed <= curva.velMax;
    const pillColor =
      s.speed > curva.velMax + 3
        ? 'rgba(239, 68, 68, 0.92)'
        : velOk
        ? 'rgba(16, 185, 129, 0.9)'
        : 'rgba(245, 158, 11, 0.9)';

    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
    ctx.beginPath();
    ctx.roundRect(12, 12, Math.min(238, width - 24), 48, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#94A3B8';
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`CURVA ${curva.id}/6 · ${curva.tipo.toUpperCase()}`, 22, 28);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText(dirLabel, 22, 47);

    // Pill de velocidad recomendada
    ctx.fillStyle = pillColor;
    ctx.beginPath();
    ctx.roundRect(138, 22, 102, 26, 8);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${curva.velMin}-${curva.velMax} km/h`, 189, 39);
    ctx.restore();

    // 6. COCKPIT / MANUBRIO EN PRIMERA PERSONA (Inclina con la moto)
    ctx.save();
    ctx.translate(width / 2, height - 10);
    ctx.rotate(leanRad * 0.42);

    // Sutil contramanillar visual del manubrio al presionar
    const pushLeftVis = s.pressLeft || s.leanAngle < -4 ? 1 : 0;
    const pushRightVis = s.pressRight || s.leanAngle > 4 ? 1 : 0;

    // Parabrisas sutil
    ctx.beginPath();
    ctx.moveTo(-78, -32);
    ctx.quadraticCurveTo(0, -108, 78, -32);
    ctx.fillStyle = 'rgba(148, 163, 184, 0.14)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.35)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Espejos retrovisores
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-64, -38);
    ctx.lineTo(-104, -76);
    ctx.moveTo(64, -38);
    ctx.lineTo(104, -76);
    ctx.stroke();

    ctx.fillStyle = '#1E293B';
    ctx.strokeStyle = '#64748B';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-132, -92, 36, 20, 6);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(96, -92, 36, 20, 6);
    ctx.fill();
    ctx.stroke();

    // Barra del manubrio
    const leftY = -28 - pushLeftVis * 7;
    const rightY = -28 - pushRightVis * 7;
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-132, leftY);
    ctx.lineTo(-42, -36);
    ctx.lineTo(42, -36);
    ctx.lineTo(132, rightY);
    ctx.stroke();

    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(-128, leftY);
    ctx.lineTo(-42, -36);
    ctx.lineTo(42, -36);
    ctx.lineTo(128, rightY);
    ctx.stroke();

    // Puño Izquierdo (resalta en azul cuando se presiona)
    ctx.strokeStyle = pushLeftVis ? '#2563EB' : '#1E293B';
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.moveTo(-142, leftY + 2);
    ctx.lineTo(-92, leftY - 3);
    ctx.stroke();

    // Puño Derecho (resalta en azul cuando se presiona o verde si acelera)
    ctx.strokeStyle = pushRightVis ? '#2563EB' : s.throttle ? '#10B981' : '#1E293B';
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.moveTo(92, rightY - 3);
    ctx.lineTo(142, rightY + 2);
    ctx.stroke();

    // Flecha visual de empuje (Contramanillar PRESS)
    if (pushLeftVis) {
      ctx.fillStyle = '#60A5FA';
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('▲ PRESIONA IZQ', -116, leftY - 18);
    }
    if (pushRightVis) {
      ctx.fillStyle = '#60A5FA';
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('▲ PRESIONA DER', 116, rightY - 18);
    }

    // Tablero central de la moto
    ctx.fillStyle = '#0F172A';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-48, -54, 96, 42, 10);
    ctx.fill();
    ctx.stroke();

    // Indicador digital dentro del cockpit
    ctx.fillStyle = s.brake ? '#EF4444' : s.throttle ? '#10B981' : '#38BDF8';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(s.speed)}`, 0, -32);
    ctx.fillStyle = '#94A3B8';
    ctx.font = 'bold 8px system-ui, sans-serif';
    ctx.fillText('KM/H', 0, -20);

    // Tapa del tanque
    ctx.fillStyle = '#1E293B';
    ctx.beginPath();
    ctx.ellipse(0, 8, 54, 24, 0, Math.PI, Math.PI * 2);
    ctx.fill();

    ctx.restore(); // Fin cockpit

    // Borde rojo de alerta si grip crítico o invasión de carril
    if (s.grip < 55 || s.lanePos < -0.56) {
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
      ctx.lineWidth = 6;
      ctx.strokeRect(3, 3, width - 6, height - 6);
    }

    ctx.restore();
  }, []);

  // Bucle principal 60fps con requestAnimationFrame y cleanup
  useEffect(() => {
    const loop = (now) => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const width = canvas.width / dpr;
        const height = canvas.height / dpr;
        const s = simRef.current;

        if (s.running && !s.paused) {
          const dt = Math.min(0.05, Math.max(0.001, (now - lastTimeRef.current) / 1000));
          lastTimeRef.current = now;

          const curva = CIRCUITO_CURVAS[s.curveIdx];
          const t = Math.min(1, s.curveDist / curva.longitud);

          // 1. Control de velocidad (Acelerar / Frenar / Inercia)
          if (s.throttle && !s.brake) {
            s.speed = Math.min(78, s.speed + 26 * dt);
          } else if (s.brake) {
            s.speed = Math.max(16, s.speed - 44 * dt);
          } else {
            // Desaceleración natural suave por freno motor
            s.speed = Math.max(22, s.speed - 4.5 * dt);
          }

          // 2. Control de inclinación (Giroscopio > Slider > Botones/Teclado)
          if (gyroRef.current.activo) {
            const target = Math.max(-38, Math.min(38, gyroRef.current.angulo * 1.15));
            s.leanAngle += (target - s.leanAngle) * Math.min(1, dt * 8);
          } else if (s.sliderActive) {
            s.leanAngle += (s.sliderTarget - s.leanAngle) * Math.min(1, dt * 10);
          } else {
            if (s.pressLeft && !s.pressRight) {
              s.leanAngle = Math.max(-38, s.leanAngle - 62 * dt);
            } else if (s.pressRight && !s.pressLeft) {
              s.leanAngle = Math.min(38, s.leanAngle + 62 * dt);
            } else {
              // Retorno elástico suave hacia la vertical
              s.leanAngle *= Math.pow(0.08, dt);
              if (Math.abs(s.leanAngle) < 0.25) s.leanAngle = 0;
            }
          }

          // 3. Curvatura instantánea y Física Centrífuga vs Centrípeta
          let curveInstant = 0;
          if (t >= 0.22 && t <= 0.82) {
            const localT = (t - 0.22) / 0.6;
            curveInstant = Math.sin(localT * Math.PI) * curva.curvatura * curva.dir;
          }

          // La fuerza centrífuga empuja hacia el exterior de la curva
          const speedFactor = Math.pow(s.speed / 44, 1.38);
          const centrifugal = -curveInstant * speedFactor * 0.96;
          // La inclinación genera fuerza centrípeta hacia el interior
          const centripetal = (s.leanAngle / 28) * (0.68 + (s.speed / 70) * 0.5) * 1.08;

          s.lanePos += (centrifugal + centripetal) * dt;
          s.lanePos = Math.max(-1.05, Math.min(1.05, s.lanePos));

          // 4. Regla crítica: Frenado brusco en plena inclinación (> 18° y > 38 km/h)
          s.brakeInLeanCooldown = Math.max(0, s.brakeInLeanCooldown - dt);
          s.oncomingCooldown = Math.max(0, s.oncomingCooldown - dt);
          s.shoulderCooldown = Math.max(0, s.shoulderCooldown - dt);
          s.shakeTime = Math.max(0, s.shakeTime - dt);

          const frenandoInclinado = s.brake && Math.abs(s.leanAngle) > 18 && s.speed > 38;
          if (frenandoInclinado) {
            s.grip = Math.max(18, s.grip - 115 * dt);
            s.shakeTime = 0.28;
            s.scoreFloat = Math.max(0, s.scoreFloat - 14 * dt);
            if (s.brakeInLeanCooldown <= 0) {
              s.brakeInLeanCount += 1;
              s.brakeInLeanCooldown = 2.0;
              s.alertText =
                '¡Cuidado! Frenar brusco en plena inclinación provoca patinamiento. Frena ANTES de la curva (SLOW)';
              s.alertSeverity = 'danger';
              s.alertTimer = 3.2;
            }
          } else if (s.lanePos > 0.62) {
            // Hombrillo con menos agarre
            s.grip = Math.max(58, s.grip - 30 * dt);
          } else {
            s.grip = Math.min(100, s.grip + 42 * dt);
          }

          // 5. Detección de invasión de carril contrario o salida al hombrillo
          if (s.lanePos < -0.56) {
            s.scoreFloat = Math.max(0, s.scoreFloat - 12 * dt);
            if (s.oncomingCooldown <= 0) {
              s.oncomingViolations += 1;
              s.oncomingCooldown = 2.2;
              s.alertText =
                s.speed > curva.velMax
                  ? 'Exceso de velocidad en curva: invadiste el carril contrario'
                  : 'Invadiste el carril contrario: ajusta tu contramanillar (PRESS)';
              s.alertSeverity = 'danger';
              s.alertTimer = 2.8;
            }
          } else if (s.lanePos > 0.6) {
            s.scoreFloat = Math.max(0, s.scoreFloat - 8 * dt);
            if (s.shoulderCooldown <= 0) {
              s.shoulderExits += 1;
              s.shoulderCooldown = 2.2;
              s.alertText = 'Te saliste al hombrillo: proyecta tu mirada a la salida (LOOK)';
              s.alertSeverity = 'warning';
              s.alertTimer = 2.4;
            }
          }

          // 6. Recolección de telemetría por fase SLPR
          let faseSLPR = 'S';
          if (t < 0.25) {
            faseSLPR = 'S';
            s.samplesSlow += 1;
            if (s.speed <= curva.velMax + 3) s.goodSlow += 1;
          } else if (t < 0.5) {
            faseSLPR = 'L';
            if (s.curveEntryEvaluated !== s.curveIdx) {
              s.curveEntryEvaluated = s.curveIdx;
              if (s.speed > curva.velMax + 5) {
                s.overSpeedEntries += 1;
                s.alertText = `Entraste rápido (${Math.round(s.speed)} km/h). Aplica SLOW antes de la curva.`;
                s.alertSeverity = 'warning';
                s.alertTimer = 2.2;
              }
            }
          } else if (t < 0.75) {
            faseSLPR = 'P';
          } else {
            faseSLPR = 'R';
            s.samplesRoll += 1;
            if (!s.brake && s.speed >= curva.velMin - 4 && s.speed <= curva.velMax + 10) {
              s.goodRoll += 1;
            }
          }

          // Precisión de carril y grip en cada tick
          s.samplesLane += 1;
          if (s.lanePos >= -0.45 && s.lanePos <= 0.48) {
            s.goodLane += 1;
            s.scoreFloat = Math.min(100, s.scoreFloat + 1.4 * dt);
          }

          s.samplesGrip += 1;
          if (s.grip >= 75) s.goodGrip += 1;

          // Expirar alerta temporal
          if (s.alertTimer > 0) {
            s.alertTimer = Math.max(0, s.alertTimer - dt);
            if (s.alertTimer === 0) s.alertText = null;
          }

          // 7. Avanzar distancia
          const distStep = s.speed * 1.48 * dt;
          s.curveDist += distStep;
          s.totalDist += distStep;

          if (s.curveDist >= curva.longitud) {
            s.curveDist = 0;
            if (s.curveIdx < CIRCUITO_CURVAS.length - 1) {
              s.curveIdx += 1;
            } else {
              // Completó las 6 curvas
              s.running = false;
              const reporte = construirDiagnostico();
              setDiagnosticoFinal(reporte);
              setEstadoSim('finalizado');
            }
          }

          // Sincronización periódica del HUD React (~15Hz)
          s.hudSyncAcc += dt;
          if (s.hudSyncAcc >= 0.065 || !s.running) {
            s.hudSyncAcc = 0;
            const cActual = CIRCUITO_CURVAS[Math.min(s.curveIdx, CIRCUITO_CURVAS.length - 1)];
            setHud({
              velocidad: Math.round(s.speed),
              angulo: Math.round(s.leanAngle),
              grip: Math.round(s.grip),
              curvaIdx: s.curveIdx,
              progresoCurva: Math.round((s.curveDist / cActual.longitud) * 100),
              faseSLPR,
              puntaje: Math.round(s.scoreFloat),
              alerta: s.alertText ? { texto: s.alertText, tipo: s.alertSeverity } : null,
              enZonaVerde: s.speed >= cActual.velMin - 3 && s.speed <= cActual.velMax + 2,
              posicionCarril: s.lanePos,
              sliderManual: Math.round(s.leanAngle),
            });
          }
        }

        // Dibujar escena actual (incluso en listo o pausado para mostrar cockpit vivo)
        ctx.save();
        ctx.scale(dpr, dpr);
        dibujarEscena(ctx, width, height, simRef.current);
        ctx.restore();
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    lastTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [dibujarEscena, construirDiagnostico]);

  const copiarDiagnostico = async () => {
    if (!diagnosticoFinal) return;
    const d = diagnosticoFinal;
    const texto = [
      `🏍️ DIAGNÓSTICO SIMULADOR SLPR — MOTO APP`,
      `Puntaje Global: ${d.puntajeGlobal}/100 (${d.rango.rango})`,
      `Curvas evaluadas: ${d.curvasCompletadas}/6`,
      `• Control de Velocidad Pre-Curva (SLOW): ${d.metricas.velocidadPreCurva}%`,
      `• Precisión en Carril (PRESS): ${d.metricas.precisionCarril}%`,
      `• Estabilidad sin Patinamiento (Grip): ${d.metricas.estabilidadGrip}%`,
      `• Aceleración de Salida (ROLL): ${d.metricas.salidaRoll}%`,
      `Alertas: Frenado inclinado (${d.alertas.frenadoInclinado}), Invasión carril contrario (${d.alertas.carrilContrario}), Hombrillo (${d.alertas.salidaHombrillo})`,
      `🎯 ${d.recomendacion.titulo}`,
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
      setTimeout(() => setCopiado(false), 2400);
    } catch {
      setCopiado(false);
    }
  };

  // Vista de Diagnóstico Final
  if (estadoSim === 'finalizado' && diagnosticoFinal) {
    const { puntajeGlobal, rango, metricas, alertas, recomendacion, curvasCompletadas } =
      diagnosticoFinal;
    const radio = 54;
    const circunf = 2 * Math.PI * radio;
    const offset = circunf - (puntajeGlobal / 100) * circunf;

    const listaAlertas = [];
    if (alertas.frenadoInclinado > 0) {
      listaAlertas.push({
        titulo: `Frenado brusco en plena inclinación (${alertas.frenadoInclinado}x)`,
        detalle:
          'Frenar fuerte con >18° de inclinación reduce la adherencia del neumático. Completa el paso SLOW antes de inclinar.',
        critica: true,
      });
    }
    if (alertas.carrilContrario > 0) {
      listaAlertas.push({
        titulo: `Invasión de carril contrario (${alertas.carrilContrario}x)`,
        detalle:
          'La fuerza centrífuga te abrió demasiado. Reduce velocidad antes del ingreso y aplica mayor contramanillar.',
        critica: true,
      });
    }
    if (alertas.salidaHombrillo > 0) {
      listaAlertas.push({
        titulo: `Salida al hombrillo (${alertas.salidaHombrillo}x)`,
        detalle:
          'Evita la fijación de objetivo mirando la salida de la curva (LOOK) con los ojos paralelos al horizonte.',
        critica: false,
      });
    }
    if (alertas.excesoEntrada > 0) {
      listaAlertas.push({
        titulo: `Entrada por encima de velocidad recomendada (${alertas.excesoEntrada}x)`,
        detalle:
          'Anticipa las curvas cerradas soltando acelerador y modulando frenos en la recta previa.',
        critica: false,
      });
    }

    return (
      <div className="space-y-5 animate-fadeIn">
        {/* Cabecera de Puntaje con Medidor Circular SVG */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-7">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
              <svg className="w-36 h-36 -rotate-90" viewBox="0 0 128 128" aria-hidden="true">
                <circle cx="64" cy="64" r={radio} fill="none" stroke="#E2E8F0" strokeWidth="10" />
                <circle
                  cx="64"
                  cy="64"
                  r={radio}
                  fill="none"
                  stroke={rango.colorStroke}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={circunf}
                  strokeDashoffset={offset}
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-slate-900 tabular-nums">
                  {puntajeGlobal}
                </span>
                <span className="text-[11px] font-bold text-slate-400">de 100 pts</span>
              </div>
            </div>

            <div className="flex-1 text-center md:text-left space-y-2">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border ${rango.badgeClass}`}
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>{rango.rango}</span>
                </span>
                <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                  {curvasCompletadas}/6 curvas recorridas
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                Diagnóstico de Trazado e Inclinación SLPR
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">{rango.descripcion}</p>
            </div>
          </div>
        </section>

        {/* Desglose 4 Métricas + Alertas de Riesgo */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <section className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
              Desglose Técnico SLPR (4 Métricas)
            </h3>
            <div className="space-y-4">
              {[
                {
                  label: 'Control de Velocidad Pre-Curva (SLOW)',
                  valor: metricas.velocidadPreCurva,
                  bar: 'bg-[#2563EB]',
                },
                {
                  label: 'Precisión en Carril (PRESS)',
                  valor: metricas.precisionCarril,
                  bar: 'bg-indigo-600',
                },
                {
                  label: 'Estabilidad sin Patinamiento (Grip)',
                  valor: metricas.estabilidadGrip,
                  bar: 'bg-[#10B981]',
                },
                {
                  label: 'Aceleración de Salida (ROLL)',
                  valor: metricas.salidaRoll,
                  bar: 'bg-sky-600',
                },
              ].map((m) => (
                <div key={m.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <span className="font-bold text-slate-700">{m.label}</span>
                    <span className="font-extrabold text-slate-900 tabular-nums">{m.valor}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${m.bar}`}
                      style={{ width: `${Math.max(4, m.valor)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {listaAlertas.length > 0 ? (
                  <ShieldAlert className="w-5 h-5 text-red-600" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                )}
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                  Alertas de Riesgo Detectadas
                </h3>
              </div>

              {listaAlertas.length > 0 ? (
                <ul className="space-y-2">
                  {listaAlertas.map((a, idx) => (
                    <li
                      key={idx}
                      className={`p-3 rounded-xl border text-xs ${
                        a.critica
                          ? 'bg-red-50 border-red-200 text-red-900'
                          : 'bg-amber-50 border-amber-200 text-amber-900'
                      }`}
                    >
                      <div className="font-extrabold flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>{a.titulo}</span>
                      </div>
                      <p className="mt-1 opacity-90 leading-relaxed">{a.detalle}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
                  <div className="font-extrabold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Corrida limpia sin incidentes críticos</span>
                  </div>
                  <p className="leading-relaxed">
                    Respetaste los límites de adherencia, mantuviste tu carril y aplicaste SLPR con
                    criterio preventivo.
                  </p>
                </div>
              )}
            </div>

            {/* Recomendación Moto App */}
            <div className="p-4 rounded-xl bg-[#0F172A] text-white space-y-1.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                Siguiente paso sugerido
              </div>
              <div className="text-sm font-extrabold">{recomendacion.titulo}</div>
              <p className="text-xs text-slate-300 leading-relaxed">{recomendacion.detalle}</p>
            </div>
          </section>
        </div>

        {/* Botones de acción */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
          <button
            type="button"
            onClick={copiarDiagnostico}
            className={`py-3 px-5 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
              copiado
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
            }`}
          >
            {copiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copiado ? '¡Diagnóstico copiado!' : 'Copiar Diagnóstico'}</span>
          </button>

          <button
            type="button"
            onClick={iniciarCircuito}
            className="py-3 px-6 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-sm font-extrabold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Repetir Circuito</span>
          </button>
        </div>
      </div>
    );
  }

  const curvaActual = CIRCUITO_CURVAS[Math.min(hud.curvaIdx, CIRCUITO_CURVAS.length - 1)];
  const direccionAngulo =
    hud.angulo < -1 ? `${Math.abs(hud.angulo)}° IZQ` : hud.angulo > 1 ? `${hud.angulo}° DER` : '0° RECTO';

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Barra Superior de Giroscopio y Estado de Sesión */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={gyro.activo ? gyro.desactivar : gyro.activar}
            className={`py-2 px-3.5 rounded-xl text-xs font-extrabold flex items-center gap-2 border transition-all cursor-pointer ${
              gyro.activo
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : 'bg-[#0F172A] hover:bg-slate-800 text-white border-slate-800'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>{gyro.activo ? 'Giroscopio Activo' : 'Activar Giroscopio'}</span>
          </button>

          {gyro.activo && (
            <button
              type="button"
              onClick={gyro.calibrarCero}
              className="py-2 px-3 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 text-[#2563EB] border border-blue-200 cursor-pointer"
            >
              Calibrar 0°
            </button>
          )}

          {gyro.mensaje ? (
            <span className="text-[11px] font-medium text-slate-500">{gyro.mensaje}</span>
          ) : (
            !gyro.activo && (
              <span className="text-[11px] text-slate-500 hidden sm:inline">
                Controles táctiles, slider y teclado (<kbd className="font-bold">W A S D</kbd> /{' '}
                <kbd className="font-bold">Flechas</kbd>) activos
              </span>
            )
          )}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {estadoSim === 'corriendo' || estadoSim === 'pausado' ? (
            <>
              <button
                type="button"
                onClick={togglePausa}
                className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                {estadoSim === 'pausado' ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                <span>{estadoSim === 'pausado' ? 'Reanudar' : 'Pausar'}</span>
              </button>
              <button
                type="button"
                onClick={finalizarCircuito}
                className="py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Square className="w-3.5 h-3.5" />
                <span>Finalizar</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={iniciarCircuito}
              className="py-2 px-4 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Iniciar 6 Curvas</span>
            </button>
          )}
        </div>
      </div>

      {/* HUD Compacto de Telemetría (Cockpit Digital) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* Velocímetro */}
        <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
            <span className="flex items-center gap-1">
              <Gauge className="w-3.5 h-3.5 text-[#2563EB]" />
              Velocidad
            </span>
            <span className="text-[10px] text-slate-400">
              Ideal {curvaActual.velMin}-{curvaActual.velMax}
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span
              className={`text-2xl font-black tabular-nums ${
                hud.velocidad > curvaActual.velMax + 3
                  ? 'text-red-600'
                  : hud.enZonaVerde
                  ? 'text-emerald-600'
                  : 'text-amber-600'
              }`}
            >
              {hud.velocidad}
            </span>
            <span className="text-xs font-bold text-slate-400">km/h</span>
          </div>
        </div>

        {/* Inclinómetro Digital con Arco */}
        <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
            <span className="flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-indigo-600" />
              Inclinómetro
            </span>
            <span
              className={`text-[10px] font-extrabold ${
                Math.abs(hud.angulo) > 30 ? 'text-amber-600' : 'text-slate-600'
              }`}
            >
              {direccionAngulo}
            </span>
          </div>
          {/* Mini nivel de burbuja / arco */}
          <div className="mt-2 relative h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
            <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-300 -translate-x-1/2" />
            <div
              className="absolute top-0.5 bottom-0.5 w-3.5 rounded-full bg-[#2563EB] transition-all duration-75"
              style={{
                left: `calc(${50 + (hud.angulo / 38) * 44}% - 7px)`,
              }}
            />
          </div>
        </div>

        {/* Barra de Adherencia (Grip) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
            <span className="flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
              Adherencia (Grip)
            </span>
            <span
              className={`text-xs font-extrabold tabular-nums ${
                hud.grip < 55
                  ? 'text-red-600'
                  : hud.grip < 80
                  ? 'text-amber-600'
                  : 'text-emerald-600'
              }`}
            >
              {hud.grip}%
            </span>
          </div>
          <div className="mt-2 w-full h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-100 ${
                hud.grip < 55
                  ? 'bg-red-500'
                  : hud.grip < 80
                  ? 'bg-amber-500'
                  : 'bg-[#10B981]'
              }`}
              style={{ width: `${hud.grip}%` }}
            />
          </div>
        </div>

        {/* Progreso de Curvas + Puntaje */}
        <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
            <span>Curva {hud.curvaIdx + 1}/6</span>
            <span className="text-[#2563EB] font-extrabold tabular-nums">{hud.puntaje} pts</span>
          </div>
          <div className="mt-2 flex items-center gap-1">
            {CIRCUITO_CURVAS.map((c, idx) => (
              <div
                key={c.id}
                className={`h-2.5 flex-1 rounded-full transition-colors ${
                  idx < hud.curvaIdx
                    ? 'bg-[#10B981]'
                    : idx === hud.curvaIdx
                    ? 'bg-[#2563EB]'
                    : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Indicador de Secuencia SLPR en Vivo */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { k: 'S', label: 'SLOW', desc: 'Disminuir' },
          { k: 'L', label: 'LOOK', desc: 'Observar' },
          { k: 'P', label: 'PRESS', desc: 'Presionar' },
          { k: 'R', label: 'ROLL', desc: 'Girar' },
        ].map((step) => {
          const activo = estadoSim === 'corriendo' && hud.faseSLPR === step.k;
          return (
            <div
              key={step.k}
              className={`rounded-xl px-2.5 py-2 border text-center transition-all ${
                activo
                  ? 'bg-[#2563EB] border-[#2563EB] text-white shadow-sm scale-[1.02]'
                  : 'bg-white border-slate-200 text-slate-500'
              }`}
            >
              <div className="text-xs font-black tracking-wide">
                {step.k} · {step.label}
              </div>
              <div className={`text-[10px] ${activo ? 'text-blue-100' : 'text-slate-400'}`}>
                {step.desc}
              </div>
            </div>
          );
        })}
      </div>

      {/* Contenedor del Canvas 60fps + Overlays */}
      <div className="relative bg-[#0F172A] rounded-2xl overflow-hidden border border-slate-800 shadow-md">
        <div ref={containerRef} className="w-full relative">
          <canvas ref={canvasRef} className="block w-full touch-none select-none" />

          {/* Alerta instantánea flotante */}
          {hud.alerta && estadoSim === 'corriendo' && (
            <div
              role="alert"
              className={`absolute bottom-3 left-3 right-3 px-3.5 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-lg animate-fadeIn ${
                hud.alerta.tipo === 'danger'
                  ? 'bg-red-600/95 text-white border border-red-400'
                  : 'bg-amber-500/95 text-slate-950 border border-amber-300'
              }`}
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{hud.alerta.texto}</span>
            </div>
          )}

          {/* Overlay Inicial antes de arrancar */}
          {estadoSim === 'listo' && (
            <div className="absolute inset-0 bg-slate-950/72 backdrop-blur-[2px] flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-5 text-center space-y-4 shadow-xl">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#2563EB] flex items-center justify-center mx-auto">
                  <Bike className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-extrabold text-slate-900">
                    Circuito Interactivo SLPR (6 Curvas)
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Baja velocidad ANTES de cada curva (<strong>SLOW</strong>), proyecta la mirada al
                    ápice (<strong>LOOK</strong>), presiona el mango del lado de la curva (
                    <strong>PRESS</strong>) y acelera suave al salir (<strong>ROLL</strong>).
                  </p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-xl p-2.5 text-[11px] text-red-800 font-semibold">
                  Regla crítica: No frenes bruscamente con inclinación alta (&gt;18°), perderás
                  adherencia.
                </div>
                <button
                  type="button"
                  onClick={iniciarCircuito}
                  className="w-full py-3.5 px-5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Arrancar Simulador</span>
                </button>
              </div>
            </div>
          )}

          {/* Overlay de Pausa */}
          {estadoSim === 'pausado' && (
            <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-[2px] flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-5 max-w-xs w-full text-center space-y-3 shadow-xl">
                <h3 className="text-base font-extrabold text-slate-900">Simulador en Pausa</h3>
                <p className="text-xs text-slate-500">{curvaActual.indicacion}</p>
                <button
                  type="button"
                  onClick={togglePausa}
                  className="w-full py-3 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-sm cursor-pointer"
                >
                  Continuar Rodada
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Panel de Controles Táctiles Universales (Touch-friendly sin menús contextuales) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-3.5">
        {/* Fila 1: Contramanillar Izquierdo / Slider / Contramanillar Derecho */}
        <div className="grid grid-cols-12 gap-2.5 items-center">
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              simRef.current.sliderActive = false;
              simRef.current.pressLeft = true;
            }}
            onPointerUp={() => {
              simRef.current.pressLeft = false;
            }}
            onPointerLeave={() => {
              simRef.current.pressLeft = false;
            }}
            onPointerCancel={() => {
              simRef.current.pressLeft = false;
            }}
            onContextMenu={(e) => e.preventDefault()}
            className="col-span-6 sm:col-span-4 py-3.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-[#2563EB] text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 touch-none select-none transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Presionar Izq</span>
          </button>

          {/* Slider de inclinación (en móvil va debajo en 12 cols, en sm+ al centro) */}
          <div className="col-span-12 sm:col-span-4 order-last sm:order-none px-1">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-1">
              <span>-38° IZQ</span>
              <span className="text-slate-700">Inclinación manual</span>
              <span>+38° DER</span>
            </div>
            <input
              type="range"
              min={-38}
              max={38}
              value={hud.sliderManual}
              disabled={gyro.activo}
              onChange={(e) => {
                const val = Number(e.target.value);
                simRef.current.sliderActive = true;
                simRef.current.sliderTarget = val;
                setHud((h) => ({ ...h, sliderManual: val }));
              }}
              onPointerUp={() => {
                simRef.current.sliderActive = false;
              }}
              aria-label="Control deslizante de inclinación"
              className="w-full accent-[#2563EB] h-2 bg-slate-200 rounded-lg cursor-pointer disabled:opacity-40"
            />
          </div>

          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              simRef.current.sliderActive = false;
              simRef.current.pressRight = true;
            }}
            onPointerUp={() => {
              simRef.current.pressRight = false;
            }}
            onPointerLeave={() => {
              simRef.current.pressRight = false;
            }}
            onPointerCancel={() => {
              simRef.current.pressRight = false;
            }}
            onContextMenu={(e) => e.preventDefault()}
            className="col-span-6 sm:col-span-4 py-3.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-[#2563EB] text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 touch-none select-none transition-colors cursor-pointer"
          >
            <span>Presionar Der</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Fila 2: Frenar (SLOW) y Acelerar (ROLL) */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              simRef.current.brake = true;
            }}
            onPointerUp={() => {
              simRef.current.brake = false;
            }}
            onPointerLeave={() => {
              simRef.current.brake = false;
            }}
            onPointerCancel={() => {
              simRef.current.brake = false;
            }}
            onContextMenu={(e) => e.preventDefault()}
            className="py-3.5 px-4 rounded-xl bg-amber-50 hover:bg-amber-100 active:bg-red-600 active:text-white text-amber-900 border-2 border-amber-300 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 touch-none select-none transition-colors cursor-pointer"
          >
            <ArrowDown className="w-4 h-4" />
            <span>Frenar (SLOW)</span>
          </button>

          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              simRef.current.throttle = true;
            }}
            onPointerUp={() => {
              simRef.current.throttle = false;
            }}
            onPointerLeave={() => {
              simRef.current.throttle = false;
            }}
            onPointerCancel={() => {
              simRef.current.throttle = false;
            }}
            onContextMenu={(e) => e.preventDefault()}
            className="py-3.5 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 active:bg-[#10B981] active:text-white text-emerald-900 border-2 border-emerald-300 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 touch-none select-none transition-colors cursor-pointer"
          >
            <ArrowUp className="w-4 h-4" />
            <span>Acelerar (ROLL)</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
 * 8. COMPONENTE MODO 2: LABORATORIO SLPR Y POSTURA (BIOMECÁNICA INTERACTIVA)
 * ============================================================================ */
function LaboratorioSLPR({ gyro }) {
  const [anguloManual, setAnguloManual] = useState(22);
  const [tecnica, setTecnica] = useState('normal'); // 'normal' | 'contrapeso'
  const [pasoActivo, setPasoActivo] = useState('P'); // 'S' | 'L' | 'P' | 'R'

  const angulo = gyro.activo ? Math.round(gyro.anguloGyro) : anguloManual;
  const lado = angulo < -2 ? 'izq' : angulo > 2 ? 'der' : 'recto';

  // Cálculos biomecánicos para el SVG frontal
  // Pivote en el contacto del neumático con el asfalto: (160, 212)
  const rotMoto = angulo;
  // En vuelta normal el torso acompaña a la moto (0° extra); en contrapeso contrarrota para mantenerse vertical
  const rotTorsoRelativo = tecnica === 'contrapeso' ? -angulo * 0.82 : 0;
  const shiftTorsoX = tecnica === 'contrapeso' ? -angulo * 0.34 : 0;
  // Cabeza: siempre busca mantener los ojos horizontales con el horizonte
  const rotCabezaRelativo = tecnica === 'contrapeso' ? -angulo * 0.15 : -angulo * 0.88;

  const pasoMeta = PASOS_SLPR.find((p) => p.id === pasoActivo) || PASOS_SLPR[2];

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Selector de Técnica de Postura (2 tarjetas comparativas) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <button
          type="button"
          onClick={() => setTecnica('normal')}
          className={`text-left p-4 rounded-2xl border-2 transition-all cursor-pointer ${
            tecnica === 'normal'
              ? 'bg-white border-[#2563EB] ring-4 ring-blue-500/10 shadow-sm'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-sm font-extrabold text-slate-900">
              1. Vuelta Normal (Velocidad media / alta)
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                tecnica === 'normal'
                  ? 'bg-[#2563EB] text-white'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {tecnica === 'normal' ? 'Activa' : 'Probar'}
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            El cuerpo del piloto y la motocicleta se inclinan juntos en el mismo ángulo; mirada
            horizontal hacia la salida girando solo la cabeza (no los hombros).
          </p>
        </button>

        <button
          type="button"
          onClick={() => setTecnica('contrapeso')}
          className={`text-left p-4 rounded-2xl border-2 transition-all cursor-pointer ${
            tecnica === 'contrapeso'
              ? 'bg-white border-[#10B981] ring-4 ring-emerald-500/10 shadow-sm'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-sm font-extrabold text-slate-900">
              2. Vuelta Lenta y Cerrada (Contrapeso)
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                tecnica === 'contrapeso'
                  ? 'bg-[#10B981] text-white'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {tecnica === 'contrapeso' ? 'Activa' : 'Probar'}
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            La motocicleta se inclina pronunciadamente debajo del piloto mientras el torso permanece
            derecho/vertical haciendo contrapeso, rodillas firmes al tanque.
          </p>
        </button>
      </div>

      {/* Área Visual Principal: SVG Frontal + Diagrama Superior de Contramanillar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Diagrama Frontal Biomecánico */}
        <section className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                Visualizador Frontal de Inclinación y Postura
              </h3>
              <p className="text-xs text-slate-500">
                {tecnica === 'normal'
                  ? 'Piloto + moto alineados en el mismo eje'
                  : 'Moto inclinada · Torso vertical en contrapeso'}
              </p>
            </div>
            <div className="px-3 py-1 rounded-full bg-slate-900 text-white text-xs font-black tabular-nums">
              {lado === 'izq'
                ? `${Math.abs(angulo)}° IZQ`
                : lado === 'der'
                ? `${angulo}° DER`
                : '0° VERTICAL'}
            </div>
          </div>

          {/* SVG Vectorial Frontal de Alta Precisión */}
          <div className="bg-gradient-to-b from-sky-50 via-slate-50 to-slate-200/70 rounded-2xl border border-slate-200 overflow-hidden">
            <svg
              viewBox="0 0 320 245"
              className="w-full h-64 sm:h-72"
              role="img"
              aria-label="Diagrama frontal de inclinación de motocicleta y postura del piloto"
            >
              {/* Línea de horizonte / referencia ojos */}
              <line
                x1="14"
                y1="66"
                x2="306"
                y2="66"
                stroke={pasoActivo === 'L' ? '#F59E0B' : '#94A3B8'}
                strokeWidth={pasoActivo === 'L' ? '2.5' : '1.2'}
                strokeDasharray="6 5"
              />
              <text
                x="24"
                y="59"
                fill={pasoActivo === 'L' ? '#B45309' : '#64748B'}
                fontSize="9"
                fontWeight="bold"
              >
                HORIZONTE (OJOS ALINEADOS)
              </text>

              {/* Eje vertical de referencia */}
              <line
                x1="160"
                y1="30"
                x2="160"
                y2="212"
                stroke="#CBD5E1"
                strokeWidth="1.2"
                strokeDasharray="3 4"
              />

              {/* Arco graduado de inclinación */}
              <path
                d="M 96 212 A 64 64 0 0 1 224 212"
                fill="none"
                stroke="#CBD5E1"
                strokeWidth="2"
              />

              {/* Asfalto */}
              <rect x="0" y="212" width="320" height="33" fill="#334155" />
              <line x1="0" y1="212" x2="320" y2="212" stroke="#94A3B8" strokeWidth="2" />

              {/* GRUPO MOTOCICLETA + PILOTO pivotando desde la huella del caucho (160, 212) */}
              <g transform={`rotate(${rotMoto}, 160, 212)`}>
                {/* Neumático delantero + rin */}
                <rect x="149" y="160" width="22" height="52" rx="10" fill="#0F172A" />
                <rect x="155" y="170" width="10" height="32" rx="4" fill="#475569" />

                {/* Resaltado Paso S (Freno delantero) o R (Tracción) */}
                {(pasoActivo === 'S' || pasoActivo === 'R') && (
                  <circle
                    cx="160"
                    cy="186"
                    r="22"
                    fill="none"
                    stroke={pasoActivo === 'S' ? '#EF4444' : '#10B981'}
                    strokeWidth="2.5"
                    strokeDasharray="4 3"
                  />
                )}

                {/* Horquillas telescópicas */}
                <line x1="145" y1="112" x2="148" y2="184" stroke="#94A3B8" strokeWidth="5" strokeLinecap="round" />
                <line x1="175" y1="112" x2="172" y2="184" stroke="#94A3B8" strokeWidth="5" strokeLinecap="round" />

                {/* Guardafango delantero */}
                <path d="M 144 162 Q 160 151 176 162" fill="none" stroke="#2563EB" strokeWidth="5" strokeLinecap="round" />

                {/* Motor / Chasis inferior y estribos */}
                <rect x="136" y="138" width="48" height="28" rx="8" fill="#1E293B" />
                <line x1="126" y1="162" x2="194" y2="162" stroke="#64748B" strokeWidth="4" strokeLinecap="round" />

                {/* Tanque y carenado frontal */}
                <path
                  d="M 134 114 Q 160 98 186 114 L 180 144 L 140 144 Z"
                  fill="#2563EB"
                  stroke="#1D4ED8"
                  strokeWidth="1.5"
                />

                {/* Faro delantero */}
                <circle cx="160" cy="126" r="11" fill="#FEF08A" stroke="#0F172A" strokeWidth="2.5" />
                <circle cx="160" cy="126" r="5" fill="#FFFFFF" />

                {/* Manubrio frontal + espejos */}
                <line
                  x1="108"
                  y1="107"
                  x2="212"
                  y2="107"
                  stroke={pasoActivo === 'P' ? '#2563EB' : '#0F172A'}
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                {/* Espejos */}
                <line x1="130" y1="106" x2="118" y2="88" stroke="#475569" strokeWidth="2.5" />
                <rect x="106" y="82" width="18" height="9" rx="3" fill="#0F172A" />
                <line x1="190" y1="106" x2="202" y2="88" stroke="#475569" strokeWidth="2.5" />
                <rect x="196" y="82" width="18" height="9" rx="3" fill="#0F172A" />

                {/* Resaltado Paso P (Manubrio) */}
                {pasoActivo === 'P' && (
                  <rect
                    x="100"
                    y="97"
                    width="120"
                    height="20"
                    rx="10"
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth="2.5"
                    strokeDasharray="5 3"
                  />
                )}

                {/* Piernas y rodillas pegadas al tanque */}
                <path d="M 140 128 L 128 158 L 134 176" fill="none" stroke="#1E3A8A" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M 180 128 L 192 158 L 186 176" fill="none" stroke="#1E3A8A" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />

                {/* GRUPO TORSO DEL PILOTO (Acompaña en Normal; Contrarrota en Contrapeso) */}
                <g transform={`translate(${shiftTorsoX}, 0) rotate(${rotTorsoRelativo}, 160, 118)`}>
                  {/* Chaqueta / Torso */}
                  <rect
                    x="138"
                    y="78"
                    width="44"
                    height="46"
                    rx="14"
                    fill="#334155"
                    stroke="#0F172A"
                    strokeWidth="2"
                  />
                  {/* Franja reflectiva en pecho */}
                  <line x1="142" y1="96" x2="178" y2="96" stroke="#38BDF8" strokeWidth="3.5" />

                  {/* Brazos ligeramente doblados hacia el manubrio */}
                  <path
                    d="M 140 88 Q 124 98 118 107"
                    fill="none"
                    stroke="#475569"
                    strokeWidth="8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 180 88 Q 196 98 202 107"
                    fill="none"
                    stroke="#475569"
                    strokeWidth="8"
                    strokeLinecap="round"
                  />
                  {/* Guantes */}
                  <circle cx="116" cy="107" r="6" fill={lado === 'izq' ? '#2563EB' : '#0F172A'} />
                  <circle cx="204" cy="107" r="6" fill={lado === 'der' ? '#2563EB' : pasoActivo === 'R' ? '#10B981' : '#0F172A'} />

                  {/* CASCO (Se mantiene alineado horizontalmente — LOOK) */}
                  <g transform={`rotate(${rotCabezaRelativo}, 160, 62)`}>
                    <circle cx="160" cy="60" r="19" fill="#EF4444" stroke="#991B1B" strokeWidth="2" />
                    {/* Visera orientada ligeramente hacia donde mira */}
                    <rect
                      x={lado === 'izq' ? 143 : lado === 'der' ? 153 : 148}
                      y="54"
                      width="24"
                      height="11"
                      rx="5"
                      fill="#0F172A"
                    />
                    <line
                      x1={lado === 'izq' ? 146 : lado === 'der' ? 156 : 151}
                      y1="57"
                      x2={lado === 'izq' ? 164 : lado === 'der' ? 174 : 169}
                      y2="57"
                      stroke="#7DD3FC"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    {pasoActivo === 'L' && (
                      <circle
                        cx="160"
                        cy="60"
                        r="25"
                        fill="none"
                        stroke="#F59E0B"
                        strokeWidth="2.5"
                        strokeDasharray="4 3"
                      />
                    )}
                  </g>
                </g>

                {/* Eje de la moto */}
                <line
                  x1="160"
                  y1="40"
                  x2="160"
                  y2="212"
                  stroke="rgba(37, 99, 235, 0.35)"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
              </g>

              {/* Eje vertical del torso en modo contrapeso para claridad pedagógica */}
              {tecnica === 'contrapeso' && Math.abs(angulo) > 8 && (
                <g>
                  <rect x="14" y="218" width="292" height="20" rx="6" fill="#065F46" />
                  <text
                    x="160"
                    y="231"
                    textAnchor="middle"
                    fill="#ECFDF5"
                    fontSize="10"
                    fontWeight="bold"
                  >
                    CONTRAPESO: Moto inclinada {Math.abs(angulo)}° · Torso erguido estable
                  </text>
                </g>
              )}
              {tecnica === 'normal' && Math.abs(angulo) > 8 && (
                <g>
                  <rect x="14" y="218" width="292" height="20" rx="6" fill="#1E3A8A" />
                  <text
                    x="160"
                    y="231"
                    textAnchor="middle"
                    fill="#EFF6FF"
                    fontSize="10"
                    fontWeight="bold"
                  >
                    VUELTA NORMAL: Moto y cuerpo inclinados juntos a {Math.abs(angulo)}°
                  </text>
                </g>
              )}
            </svg>
          </div>

          {/* Controles del ángulo (Slider + Presets + Giroscopio) */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[#2563EB]" />
                Ajusta la inclinación (-38° a +38°)
              </span>
              <button
                type="button"
                onClick={gyro.activo ? gyro.desactivar : gyro.activar}
                className={`py-1.5 px-3 rounded-lg text-[11px] font-bold flex items-center gap-1.5 border cursor-pointer ${
                  gyro.activo
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>{gyro.activo ? 'Usando Giroscopio' : 'Usar Giroscopio'}</span>
              </button>
            </div>

            <input
              type="range"
              min={-38}
              max={38}
              value={angulo}
              disabled={gyro.activo}
              onChange={(e) => setAnguloManual(Number(e.target.value))}
              aria-label="Ángulo de inclinación en laboratorio"
              className="w-full accent-[#2563EB] h-2 bg-slate-200 rounded-lg cursor-pointer disabled:opacity-45"
            />

            <div className="grid grid-cols-5 gap-1.5">
              {[-32, -18, 0, 18, 32].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  disabled={gyro.activo}
                  onClick={() => setAnguloManual(preset)}
                  className={`py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer disabled:opacity-40 ${
                    Math.abs(angulo - preset) <= 2
                      ? 'bg-[#2563EB] text-white border-[#2563EB]'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {preset < 0 ? `${Math.abs(preset)}° I` : preset > 0 ? `${preset}° D` : '0°'}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Diagrama Superior de Contramanillar (PRESS) */}
        <section className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">
              Vista Superior: Contramanillar (PRESS)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Empuja hacia adelante el mango del lado hacia donde quieres doblar.
            </p>
          </div>

          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-3">
            <svg
              viewBox="0 0 260 205"
              className="w-full h-52"
              role="img"
              aria-label="Diagrama superior del efecto de contramanillar"
            >
              {/* Dirección real de la curva */}
              {lado !== 'recto' && (
                <g>
                  <path
                    d={
                      lado === 'izq'
                        ? 'M 130 42 Q 112 18 52 16'
                        : 'M 130 42 Q 148 18 208 16'
                    }
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                  <polygon
                    points={lado === 'izq' ? '44,16 58,9 58,23' : '216,16 202,9 202,23'}
                    fill="#10B981"
                  />
                  <text
                    x="130"
                    y="14"
                    textAnchor="middle"
                    fill="#047857"
                    fontSize="9.5"
                    fontWeight="bold"
                  >
                    {lado === 'izq' ? 'VAS A LA IZQUIERDA' : 'VAS A LA DERECHA'}
                  </text>
                </g>
              )}

              {/* Rueda delantera (sutil contragiro inicial de contramanillar) */}
              <g
                transform={`rotate(${lado === 'izq' ? 7 : lado === 'der' ? -7 : 0}, 130, 82)`}
              >
                <rect x="120" y="42" width="20" height="58" rx="9" fill="#0F172A" />
                <line x1="130" y1="48" x2="130" y2="94" stroke="#475569" strokeWidth="2" strokeDasharray="4 4" />
              </g>

              {/* Manubrio vista superior */}
              <g
                transform={`rotate(${lado === 'izq' ? 7 : lado === 'der' ? -7 : 0}, 130, 108)`}
              >
                <path
                  d="M 42 114 Q 88 102 130 104 Q 172 102 218 114"
                  fill="none"
                  stroke="#334155"
                  strokeWidth="10"
                  strokeLinecap="round"
                />
                {/* Mango Izquierdo */}
                <line
                  x1="34"
                  y1="117"
                  x2="74"
                  y2="108"
                  stroke={lado === 'izq' ? '#2563EB' : '#0F172A'}
                  strokeWidth="15"
                  strokeLinecap="round"
                />
                {/* Mango Derecho */}
                <line
                  x1="186"
                  y1="108"
                  x2="226"
                  y2="117"
                  stroke={lado === 'der' ? '#2563EB' : '#0F172A'}
                  strokeWidth="15"
                  strokeLinecap="round"
                />
              </g>

              {/* Tanque vista superior */}
              <ellipse cx="130" cy="158" rx="34" ry="38" fill="#1E293B" />
              <circle cx="130" cy="148" r="9" fill="#475569" />

              {/* Flecha de empuje (Mano Izquierda) */}
              {lado === 'izq' && (
                <g>
                  <line x1="52" y1="162" x2="52" y2="128" stroke="#2563EB" strokeWidth="4.5" strokeLinecap="round" />
                  <polygon points="52,118 44,132 60,132" fill="#2563EB" />
                  <rect x="8" y="166" width="88" height="24" rx="6" fill="#2563EB" />
                  <text x="52" y="181" textAnchor="middle" fill="#FFF" fontSize="9.5" fontWeight="bold">
                    EMPUJA IZQ
                  </text>
                </g>
              )}

              {/* Flecha de empuje (Mano Derecha) */}
              {lado === 'der' && (
                <g>
                  <line x1="208" y1="162" x2="208" y2="128" stroke="#2563EB" strokeWidth="4.5" strokeLinecap="round" />
                  <polygon points="208,118 200,132 216,132" fill="#2563EB" />
                  <rect x="164" y="166" width="88" height="24" rx="6" fill="#2563EB" />
                  <text x="208" y="181" textAnchor="middle" fill="#FFF" fontSize="9.5" fontWeight="bold">
                    EMPUJA DER
                  </text>
                </g>
              )}
            </svg>
          </div>

          {/* Regla nemotécnica dinámica */}
          <div
            className={`p-3.5 rounded-xl border text-xs font-bold leading-relaxed ${
              lado === 'recto'
                ? 'bg-slate-50 border-slate-200 text-slate-600'
                : 'bg-blue-50 border-blue-200 text-blue-950'
            }`}
          >
            {lado === 'izq' && (
              <span>
                Presiona mango <strong>IZQUIERDO</strong> → Inclinas <strong>IZQUIERDA</strong> →
                Vas a la <strong>IZQUIERDA</strong>.
              </span>
            )}
            {lado === 'der' && (
              <span>
                Presiona mango <strong>DERECHO</strong> → Inclinas <strong>DERECHA</strong> → Vas a
                la <strong>DERECHA</strong>.
              </span>
            )}
            {lado === 'recto' && (
              <span>
                Mueve el deslizador o inclina tu teléfono para ver cómo el empuje del manubrio
                genera la inclinación inmediata.
              </span>
            )}
          </div>
        </section>
      </div>

      {/* Tarjetas Interactivas de los 4 Pasos SLPR */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
            Explora los 4 Pasos SLPR (toca cada paso para resaltarlo en el diagrama)
          </h3>
          <span className="text-xs font-semibold text-slate-500">
            Zona resaltada: <strong className="text-slate-800">{pasoMeta.zonaDiagrama}</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {PASOS_SLPR.map((p) => {
            const seleccionado = pasoActivo === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setPasoActivo(p.id)}
                className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                  seleccionado
                    ? `${p.colorBg} ${p.colorBorder} shadow-xs`
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`w-6 h-6 rounded-lg text-white text-xs font-black flex items-center justify-center ${p.colorPill}`}
                  >
                    {p.sigla}
                  </span>
                  <span className="text-xs font-extrabold text-slate-900">{p.titulo}</span>
                </div>
                <div className="text-[11px] text-slate-600">{p.subtitulo}</div>
              </button>
            );
          })}
        </div>

        {/* Detalle del paso seleccionado */}
        <div className={`p-4 rounded-xl border ${pasoMeta.colorBg} ${pasoMeta.colorBorder}`}>
          <div className={`text-xs font-extrabold uppercase tracking-wide mb-1 ${pasoMeta.colorText}`}>
            {pasoMeta.titulo} — Manual del Operador (MSF)
          </div>
          <p className="text-xs sm:text-sm text-slate-800 leading-relaxed">{pasoMeta.descripcion}</p>
        </div>
      </section>
    </div>
  );
}

/* ============================================================================
 * 9. ILUSTRACIONES SVG PARA LOS 6 ESCENARIOS DEL RETO (MODO 3)
 * ============================================================================ */
function EscenarioSVG({ tipo }) {
  switch (tipo) {
    case 'curva_der':
      return (
        <svg viewBox="0 0 280 120" className="w-full max-w-[300px] h-28 mx-auto" role="img" aria-label="Curva cerrada a la derecha">
          <rect width="280" height="120" rx="12" fill="#0F172A" />
          <path d="M 70 116 Q 74 34 226 30" fill="none" stroke="#475569" strokeWidth="44" strokeLinecap="round" />
          <path d="M 70 116 Q 74 34 226 30" fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeDasharray="8 6" />
          <path d="M 82 114 Q 88 46 218 42" fill="none" stroke="#10B981" strokeWidth="3.5" strokeLinecap="round" />
          <polygon points="228,42 214,35 214,49" fill="#10B981" />
          <rect x="75" y="92" width="14" height="22" rx="6" fill="#2563EB" stroke="#FFF" strokeWidth="1.5" />
          <text x="195" y="88" fill="#F8FAFC" fontSize="10" fontWeight="bold">CURVA DERECHA →</text>
        </svg>
      );
    case 'curva_izq':
      return (
        <svg viewBox="0 0 280 120" className="w-full max-w-[300px] h-28 mx-auto" role="img" aria-label="Curva abierta a la izquierda">
          <rect width="280" height="120" rx="12" fill="#0F172A" />
          <path d="M 210 116 Q 204 34 54 30" fill="none" stroke="#475569" strokeWidth="44" strokeLinecap="round" />
          <path d="M 210 116 Q 204 34 54 30" fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeDasharray="8 6" />
          <path d="M 222 114 Q 214 44 62 42" fill="none" stroke="#10B981" strokeWidth="3.5" strokeLinecap="round" />
          <polygon points="52,42 66,35 66,49" fill="#10B981" />
          <rect x="215" y="92" width="14" height="22" rx="6" fill="#2563EB" stroke="#FFF" strokeWidth="1.5" />
          <text x="28" y="88" fill="#F8FAFC" fontSize="10" fontWeight="bold">← CURVA IZQUIERDA</text>
        </svg>
      );
    case 'esquive_s':
      return (
        <svg viewBox="0 0 280 120" className="w-full max-w-[300px] h-28 mx-auto" role="img" aria-label="Esquive de obstáculo en S">
          <rect width="280" height="120" rx="12" fill="#0F172A" />
          <rect x="78" y="0" width="124" height="120" fill="#334155" />
          <line x1="140" y1="0" x2="140" y2="120" stroke="#64748B" strokeWidth="1.5" strokeDasharray="6 6" />
          {/* Obstáculo */}
          <rect x="122" y="50" width="36" height="18" rx="4" fill="#EF4444" stroke="#FCA5A5" strokeWidth="1.5" />
          <text x="140" y="62" textAnchor="middle" fill="#FFF" fontSize="8" fontWeight="bold">OBSTÁC.</text>
          {/* Trayectoria esquive izquierda -> recupera derecha */}
          <path d="M 140 110 C 140 84, 96 84, 96 58 C 96 34, 140 34, 140 16" fill="none" stroke="#10B981" strokeWidth="3.5" strokeLinecap="round" />
          <polygon points="140,8 134,20 146,20" fill="#10B981" />
          <circle cx="96" cy="70" r="8" fill="#2563EB" />
          <text x="96" y="73" textAnchor="middle" fill="#FFF" fontSize="9" fontWeight="bold">1</text>
          <circle cx="116" cy="30" r="8" fill="#F59E0B" />
          <text x="116" y="33" textAnchor="middle" fill="#0F172A" fontSize="9" fontWeight="bold">2</text>
        </svg>
      );
    case 'vuelta_u':
      return (
        <svg viewBox="0 0 280 120" className="w-full max-w-[300px] h-28 mx-auto" role="img" aria-label="Vuelta en U lenta">
          <rect width="280" height="120" rx="12" fill="#0F172A" />
          <rect x="28" y="16" width="224" height="88" rx="10" fill="#1E293B" stroke="#475569" strokeDasharray="5 5" />
          <path d="M 190 92 L 190 46 A 48 34 0 0 0 94 46 L 94 84" fill="none" stroke="#38BDF8" strokeWidth="4" strokeLinecap="round" />
          <polygon points="94,94 87,80 101,80" fill="#38BDF8" />
          <text x="140" y="66" textAnchor="middle" fill="#E2E8F0" fontSize="10" fontWeight="bold">10 km/h · GIRO CERRADO</text>
        </svg>
      );
    case 'exceso_vel':
      return (
        <svg viewBox="0 0 280 120" className="w-full max-w-[300px] h-28 mx-auto" role="img" aria-label="Entrada rápida a curva">
          <rect width="280" height="120" rx="12" fill="#0F172A" />
          <path d="M 54 114 Q 68 24 236 28" fill="none" stroke="#475569" strokeWidth="42" strokeLinecap="round" />
          {/* Peligro de abrirse */}
          <path d="M 68 104 Q 76 48 118 22" fill="none" stroke="#EF4444" strokeWidth="3" strokeDasharray="5 4" />
          {/* Salida segura */}
          <path d="M 68 104 Q 84 40 226 36" fill="none" stroke="#10B981" strokeWidth="3.5" />
          <polygon points="234,36 220,29 220,43" fill="#10B981" />
          <rect x="164" y="74" width="96" height="24" rx="6" fill="#EF4444" />
          <text x="212" y="89" textAnchor="middle" fill="#FFF" fontSize="9.5" fontWeight="bold">VELOCIDAD ALTA</text>
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 280 120" className="w-full max-w-[300px] h-28 mx-auto" role="img" aria-label="Proyección de mirada LOOK">
          <rect width="280" height="120" rx="12" fill="#0F172A" />
          <line x1="20" y1="42" x2="260" y2="42" stroke="#38BDF8" strokeWidth="2" strokeDasharray="6 4" />
          <text x="140" y="32" textAnchor="middle" fill="#7DD3FC" fontSize="10" fontWeight="bold">HORIZONTE NIVELADO</text>
          <circle cx="96" cy="76" r="18" fill="#EF4444" />
          <rect x="98" y="70" width="16" height="8" rx="4" fill="#0F172A" />
          <path d="M 116 74 L 228 48" stroke="#10B981" strokeWidth="3" strokeDasharray="5 3" />
          <circle cx="234" cy="46" r="7" fill="#10B981" />
          <text x="206" y="88" textAnchor="middle" fill="#CBD5E1" fontSize="9.5" fontWeight="bold">SALIDA DE CURVA</text>
        </svg>
      );
  }
}

/* ============================================================================
 * 10. COMPONENTE MODO 3: RETO CONTRAMANILLAR Y EVASIÓN (6 ESCENARIOS)
 * ============================================================================ */
function RetoContramanillar({ onIrASimulador }) {
  const [indice, setIndice] = useState(0);
  const [aciertos, setAciertos] = useState(0);
  const [feedback, setFeedback] = useState(null); // { ok: boolean, texto: string, ms: number }
  const [secuenciaUsuario, setSecuenciaUsuario] = useState([]);
  const [tiemposMs, setTiemposMs] = useState([]);
  const [terminado, setTerminado] = useState(false);

  const inicioEscenarioRef = useRef(performance.now());
  const escenario = ESCENARIOS_RETO[indice];

  const reiniciarReto = () => {
    setIndice(0);
    setAciertos(0);
    setFeedback(null);
    setSecuenciaUsuario([]);
    setTiemposMs([]);
    setTerminado(false);
    inicioEscenarioRef.current = performance.now();
  };

  const evaluarSimple = (eleccion) => {
    if (feedback) return;
    const ms = Math.max(180, Math.round(performance.now() - inicioEscenarioRef.current));
    const ok = eleccion === escenario.respuestaCorrecta;
    if (ok) setAciertos((a) => a + 1);
    setTiemposMs((prev) => [...prev, ms]);
    setFeedback({ ok, texto: escenario.explicacion, ms });
  };

  const evaluarEsquiveDoble = (ladoTocado) => {
    if (feedback) return;
    const siguienteSec = [...secuenciaUsuario, ladoTocado];
    setSecuenciaUsuario(siguienteSec);

    if (siguienteSec.length === 1) {
      // Si el primer toque ya es incorrecto, dar feedback inmediato
      if (ladoTocado !== escenario.secuenciaCorrecta[0]) {
        const ms = Math.max(180, Math.round(performance.now() - inicioEscenarioRef.current));
        setTiemposMs((prev) => [...prev, ms]);
        setFeedback({
          ok: false,
          texto: escenario.explicacion,
          ms,
        });
      }
      return;
    }

    if (siguienteSec.length === 2) {
      const ms = Math.max(180, Math.round(performance.now() - inicioEscenarioRef.current));
      const ok =
        siguienteSec[0] === escenario.secuenciaCorrecta[0] &&
        siguienteSec[1] === escenario.secuenciaCorrecta[1];
      if (ok) setAciertos((a) => a + 1);
      setTiemposMs((prev) => [...prev, ms]);
      setFeedback({ ok, texto: escenario.explicacion, ms });
    }
  };

  const avanzarEscenario = () => {
    if (indice < ESCENARIOS_RETO.length - 1) {
      setIndice((i) => i + 1);
      setFeedback(null);
      setSecuenciaUsuario([]);
      inicioEscenarioRef.current = performance.now();
    } else {
      setTerminado(true);
    }
  };

  if (terminado) {
    const precision = Math.round((aciertos / ESCENARIOS_RETO.length) * 100);
    const promedioMs =
      tiemposMs.length > 0
        ? Math.round(tiemposMs.reduce((a, b) => a + b, 0) / tiemposMs.length)
        : 0;

    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5 animate-fadeIn">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-blue-50 text-[#2563EB] border border-blue-200">
              <Zap className="w-3.5 h-3.5" />
              <span>Reto Contramanillar Completado</span>
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
              Precisión de Reflejos: {precision}% ({aciertos}/{ESCENARIOS_RETO.length})
            </h2>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-center shrink-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Tiempo promedio
            </div>
            <div className="text-xl font-black text-slate-900 tabular-nums">
              {(promedioMs / 1000).toFixed(2)}s
            </div>
          </div>
        </div>

        {/* Barra de precisión final */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <span>Dominio de contramanillar y evasión</span>
            <span className="text-slate-900">{precision}%</span>
          </div>
          <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                precision >= 80
                  ? 'bg-[#10B981]'
                  : precision >= 50
                  ? 'bg-amber-500'
                  : 'bg-red-500'
              }`}
              style={{ width: `${Math.max(5, precision)}%` }}
            />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0F172A] text-white text-xs sm:text-sm leading-relaxed">
          {precision >= 80
            ? '¡Excelente memoria muscular teórica! Ahora lleva estos reflejos al Simulador de Curvas en Vivo o consolídalos en una sesión práctica de trazado con tu instructor.'
            : 'Repasa las explicaciones del Manual MSF y practica en el Laboratorio SLPR antes de tu próxima Clínica de Equilibrio.'}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={reiniciarReto}
            className="flex-1 py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-800 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Repetir Reto</span>
          </button>
          <button
            type="button"
            onClick={onIrASimulador}
            className="flex-1 py-3 px-4 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Probar en Simulador en Vivo</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Barra de progreso del reto */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-blue-50 text-[#2563EB] text-xs font-extrabold border border-blue-200">
            Escenario {indice + 1} / {ESCENARIOS_RETO.length}
          </span>
          <span className="text-xs font-bold text-slate-500 hidden sm:inline">
            {escenario.badge}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1 text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            <Flame className="w-3.5 h-3.5" />
            <span>{aciertos} aciertos</span>
          </span>
        </div>
      </div>

      {/* Tarjeta de Escenario */}
      <article className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-5">
        <div className="space-y-2">
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">{escenario.titulo}</h2>
          <p className="text-sm text-slate-600 leading-relaxed">{escenario.prompt}</p>
        </div>

        {/* Visualización SVG del escenario */}
        <EscenarioSVG tipo={escenario.diagrama} />

        {/* Interacción: Manubrio Táctil (para curvas y esquive doble) */}
        {(escenario.tipo === 'manubrio' || escenario.tipo === 'esquive_doble') && (
          <div className="space-y-3">
            {escenario.tipo === 'esquive_doble' && (
              <div className="flex items-center justify-center gap-2 text-xs font-bold">
                <span
                  className={`px-3 py-1 rounded-full border ${
                    secuenciaUsuario.length >= 1
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-blue-50 text-[#2563EB] border-blue-200'
                  }`}
                >
                  Paso 1: Esquivar ({secuenciaUsuario[0] ? secuenciaUsuario[0].toUpperCase() : 'pendiente'})
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
                <span
                  className={`px-3 py-1 rounded-full border ${
                    secuenciaUsuario.length === 2
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-slate-50 text-slate-500 border-slate-200'
                  }`}
                >
                  Paso 2: Recuperar ({secuenciaUsuario[1] ? secuenciaUsuario[1].toUpperCase() : 'pendiente'})
                </span>
              </div>
            )}

            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4">
              <div className="text-center text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                Toca directamente el mango que debes presionar hacia adelante
              </div>

              <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto">
                <button
                  type="button"
                  disabled={Boolean(feedback)}
                  onClick={() =>
                    escenario.tipo === 'esquive_doble'
                      ? evaluarEsquiveDoble('izq')
                      : evaluarSimple('izq')
                  }
                  className="py-5 px-4 rounded-2xl bg-[#0F172A] hover:bg-[#2563EB] active:scale-[0.98] text-white font-extrabold text-sm flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-60 touch-none select-none shadow-sm"
                >
                  <ArrowUp className="w-5 h-5 text-sky-400" />
                  <span>Mango IZQUIERDO</span>
                  <span className="text-[10px] font-semibold text-slate-300">Empujar adelante</span>
                </button>

                <button
                  type="button"
                  disabled={Boolean(feedback)}
                  onClick={() =>
                    escenario.tipo === 'esquive_doble'
                      ? evaluarEsquiveDoble('der')
                      : evaluarSimple('der')
                  }
                  className="py-5 px-4 rounded-2xl bg-[#0F172A] hover:bg-[#2563EB] active:scale-[0.98] text-white font-extrabold text-sm flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-60 touch-none select-none shadow-sm"
                >
                  <ArrowUp className="w-5 h-5 text-sky-400" />
                  <span>Mango DERECHO</span>
                  <span className="text-[10px] font-semibold text-slate-300">Empujar adelante</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Interacción: Opciones de Técnica */}
        {escenario.tipo === 'opciones' && (
          <div className="space-y-2.5">
            {escenario.opciones.map((op) => {
              const esCorrecta = op.id === escenario.respuestaCorrecta;
              let estilo =
                'bg-white border-slate-200 hover:border-[#2563EB] hover:bg-blue-50/40 text-slate-800';
              if (feedback) {
                if (esCorrecta) estilo = 'bg-emerald-50 border-emerald-500 text-emerald-950';
                else estilo = 'bg-slate-50 border-slate-200 text-slate-400 opacity-75';
              }
              return (
                <button
                  key={op.id}
                  type="button"
                  disabled={Boolean(feedback)}
                  onClick={() => evaluarSimple(op.id)}
                  className={`w-full p-3.5 rounded-xl border-2 text-left text-sm font-semibold transition-all cursor-pointer disabled:cursor-default ${estilo}`}
                >
                  {op.texto}
                </button>
              );
            })}
          </div>
        )}

        {/* Feedback Técnico Inmediato */}
        {feedback && (
          <div
            className={`rounded-2xl border p-4 space-y-3 animate-fadeIn ${
              feedback.ok
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : 'bg-red-50 border-red-200 text-red-950'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-extrabold text-sm">
                {feedback.ok ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                )}
                <span>{feedback.ok ? '¡Ejecución correcta!' : 'Revisa la técnica MSF'}</span>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-white/80 text-slate-700 border border-slate-200">
                <Clock className="w-3.5 h-3.5" />
                {(feedback.ms / 1000).toFixed(2)}s
              </span>
            </div>

            <p className="text-xs sm:text-sm leading-relaxed">{feedback.texto}</p>

            <button
              type="button"
              onClick={avanzarEscenario}
              className="w-full sm:w-auto py-2.5 px-5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs sm:text-sm font-extrabold inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>
                {indice < ESCENARIOS_RETO.length - 1 ? 'Siguiente escenario' : 'Ver precisión final'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </article>
    </div>
  );
}

/* ============================================================================
 * 11. COMPONENTE RAÍZ CON NAVEGACIÓN EN 3 TABS CLAROS
 * ============================================================================ */
function SimuladorSLPRApp() {
  const [tabActiva, setTabActiva] = useState('simulador'); // 'simulador' | 'laboratorio' | 'reto'
  const gyro = useGyroscope();

  const tabs = [
    { id: 'simulador', label: 'Simulador de Curvas (En Vivo)', short: 'Simulador 60fps', icon: Gauge },
    { id: 'laboratorio', label: 'Laboratorio SLPR y Postura', short: 'Lab SLPR', icon: Compass },
    { id: 'reto', label: 'Reto Contramanillar', short: 'Reto Rápido', icon: Target },
  ];

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-900 flex flex-col font-sans antialiased overflow-x-hidden">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.25s ease-out both;
        }
      `}</style>

      {/* Cabecera Oscura Elegante (#0F172A) */}
      <header className="sticky top-0 z-30 bg-[#0F172A] text-white border-b border-slate-800 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 pt-3.5 pb-3 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2563EB] to-indigo-600 flex items-center justify-center shadow-md shrink-0">
                <Bike className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-white truncate">
                  Simulador de Inclinación y Contramanillar (SLPR)
                </h1>
                <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                  Moto App · Entrenador interactivo de trazado seguro
                </p>
              </div>
            </div>

            {gyro.activo && (
              <span className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-400/30 text-[11px] font-bold">
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Giroscopio ON</span>
              </span>
            )}
          </div>

          {/* Navegación en 3 Modos */}
          <nav
            role="tablist"
            aria-label="Modos del simulador SLPR"
            className="grid grid-cols-3 gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800"
          >
            {tabs.map((t) => {
              const Icono = t.icon;
              const activa = tabActiva === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={activa}
                  onClick={() => setTabActiva(t.id)}
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

      {/* Contenido Principal Responsive */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-5">
        {tabActiva === 'simulador' && <SimuladorCurvasEnVivo gyro={gyro} />}
        {tabActiva === 'laboratorio' && <LaboratorioSLPR gyro={gyro} />}
        {tabActiva === 'reto' && (
          <RetoContramanillar onIrASimulador={() => setTabActiva('simulador')} />
        )}
      </main>

      {/* Pie informativo */}
      <footer className="max-w-5xl w-full mx-auto px-4 py-4 text-center text-[11px] text-slate-400 flex flex-wrap items-center justify-center gap-1.5">
        <Info className="w-3.5 h-3.5" />
        <span>
          Módulo de práctica interactiva SLPR (Disminuir, Observar, Presionar, Girar) · Basado en el
          Manual del Operador de la Motocicleta (MSF).
        </span>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SimuladorSLPRApp />
    </ErrorBoundary>
  );
}