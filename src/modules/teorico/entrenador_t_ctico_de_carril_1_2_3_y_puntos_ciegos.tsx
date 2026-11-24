import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Bike,
  Eye,
  EyeOff,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Play,
  Pause,
  Square,
  RotateCcw,
  Copy,
  Check,
  Target,
  Scale,
  Compass,
  Gauge,
  Clock,
  Flame,
  Award,
  Zap,
  ArrowRight,
  ChevronRight,
  Info,
  Radar,
  Ban,
  Hand,
  FileText,
  Sparkles,
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
    console.error('Error en Entrenador Táctico de Carril:', error, info);
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
              Ocurrió un inconveniente en el entrenador
            </h2>
            <p className="text-sm text-slate-600">
              Puedes reiniciar este módulo interactivo sin perder tu acceso.
            </p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false })}
              className="w-full py-3 px-4 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-sm transition-colors cursor-pointer"
            >
              Reiniciar Entrenador
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ============================================================================
 * 2. DATOS DEL LABORATORIO 1-2-3 (PESTAÑA 2 — 5 ESCENARIOS TÁCTICOS)
 * ============================================================================ */
const ESCENARIOS_LAB = [
  {
    id: 'aceite',
    titulo: 'Aceite y escombros en el centro',
    etiqueta: 'Superficie',
    resumen: 'Los vehículos depositan aceite, grasa y agua justo en la franja central del carril.',
    posiciones: {
      1: {
        estado: 'optima',
        titulo: 'Posición 1 (Izquierda) — ÓPTIMA',
        explicacion:
          'Ruedas sobre la huella limpia izquierda de los autos, con excelente tracción y máxima visibilidad en el espejo lateral izquierdo del tráfico delantero.',
        cita: 'MSF Ed. 17 (Posiciones de Carril) · Decreto N° 8.495 Art. 26 (Control de la motocicleta).',
      },
      2: {
        estado: 'peligrosa',
        titulo: 'Posición 2 (Centro) — PELIGROSA',
        explicacion:
          'Es la franja grasosa donde se acumulan fugas de aceite, refrigerante y grava suelta. Al frenar o iniciar un giro aquí, el neumático pierde adherencia fácilmente (especialmente con lluvia).',
        cita: 'MSF Ed. 17 (Peligros en la superficie) · Evitar frenadas sobre la franja central.',
      },
      3: {
        estado: 'aceptable',
        titulo: 'Posición 3 (Derecha) — ACEPTABLE CON PRECAUCIÓN',
        explicacion:
          'Evita la mancha de aceite central con buena tracción en la huella derecha, pero vigila el borde de la calzada, alcantarillas y posibles accesos laterales.',
        cita: 'MSF Ed. 17 (Espacio de colchón) · Decreto N° 8.495 Art. 28 num. 5.',
      },
    },
  },
  {
    id: 'siguiendo',
    titulo: 'Siguiendo a un vehículo (Ver y ser visto)',
    etiqueta: 'Visibilidad',
    resumen: 'Elegir la trazada correcta detrás de un automóvil maximiza tu visibilidad y ruta de escape.',
    posiciones: {
      1: {
        estado: 'optima',
        titulo: 'Posición 1 (Izquierda) — ÓPTIMA',
        explicacion:
          'El conductor del auto te ve directamente por su espejo retrovisor lateral izquierdo y tú puedes anticipar el tráfico más adelante (RiderRadar 12 s) con visión hacia el carril izquierdo.',
        cita: 'MSF Ed. 17 (Estrategia SEE — Buscar a 12 segundos) · Decreto N° 8.495 Art. 28 num. 14 (Luces encendidas).',
      },
      2: {
        estado: 'aceptable',
        titulo: 'Posición 2 (Centro) — ACEPTABLE CON PRECAUCIÓN',
        explicacion:
          'Eres visible en el retrovisor central interior del auto siempre que mantengas distancia suficiente, pero pierdes línea de visión hacia adelante y pisas la franja central del asfalto.',
        cita: 'MSF Ed. 17 (Espacio de colchón trasero y delantero) · Decreto N° 8.495 Art. 32 num. 1.',
      },
      3: {
        estado: 'peligrosa',
        titulo: 'Posición 3 (Derecha) — PELIGROSA',
        explicacion:
          'Quedas oculto en el ángulo menos vigilado del vehículo delantero, sin visión anticipada del tráfico ni espacio cómodo para adelantar por la izquierda; además, invitas a que otro vehículo comparta tu carril.',
        cita: 'Decreto N° 8.495 Art. 28 num. 11 (Prohibido adelantar por la derecha) y Art. 31 num. 2.',
      },
    },
  },
  {
    id: 'estacionados',
    titulo: 'Autos estacionados a la derecha',
    etiqueta: 'Zona de Puertas',
    resumen: 'Puertas abriéndose sin aviso, peatones saliendo entre carros o autos incorporándose.',
    posiciones: {
      1: {
        estado: 'optima',
        titulo: 'Posición 1 (Izquierda) — ÓPTIMA',
        explicacion:
          'Maximiza el colchón lateral fuera del radio de apertura de puertas (1,2 m+) y te da tiempo para reaccionar si un peatón o vehículo sale de repente desde el borde derecho.',
        cita: 'MSF Ed. 17 (Colchón de espacio lateral) · Decreto N° 8.495 Art. 28 num. 4 (Resguardo de peatones).',
      },
      2: {
        estado: 'aceptable',
        titulo: 'Posición 2 (Centro) — ACEPTABLE CON PRECAUCIÓN',
        explicacion:
          'Te separa parcialmente de una puerta abierta, pero deja poco margen si un vehículo gira bruscamente para incorporarse. Cubre frenos y observa las ruedas delanteras de los autos estacionados.',
        cita: 'MSF Ed. 17 (SEE — Evaluar y Ejecutar) · Cubrir clutch y ambos frenos.',
      },
      3: {
        estado: 'peligrosa',
        titulo: 'Posición 3 (Derecha) — PELIGROSA',
        explicacion:
          'Circulas directamente dentro de la zona de impacto de puertas y vehículos desincorporándose sin mirar. Un golpe aquí puede lanzarte contra el tráfico del carril vecino.',
        cita: 'MSF Ed. 17 (Protección del carril y ruta de escape) · Decreto N° 8.495 Art. 32 num. 1.',
      },
    },
  },
  {
    id: 'camion',
    titulo: 'Camión en carril adyacente (Punto ciego masivo)',
    etiqueta: 'Puntos Ciegos',
    resumen: 'Los vehículos pesados proyectan enormes zonas ciegas laterales y turbulencia de viento.',
    posiciones: {
      1: {
        estado: 'peligrosa',
        titulo: 'Posición 1 (Izquierda) — PELIGROSA',
        explicacion:
          'Te colocas pegado al costado derecho del camión, completamente invisible dentro de su zona ciega masiva y expuesto a ráfagas laterales o un cambio de carril del vehículo pesado.',
        cita: 'MSF Ed. 17 (Evitar puntos ciegos y ráfagas de viento) · Decreto N° 8.495 Art. 31 num. 1.',
      },
      2: {
        estado: 'aceptable',
        titulo: 'Posición 2 (Centro) — ACEPTABLE CON PRECAUCIÓN',
        explicacion:
          'Ofrece cierta separación lateral, pero sigues demasiado cerca de la zona ciega del camión. Si no ves los espejos del chofer, él no te ve: reduce velocidad o pásalo rápido sin quedarte al lado.',
        cita: 'MSF Ed. 17 (No permanecer al costado de otro vehículo) · Regl. 1998 Art. 273.',
      },
      3: {
        estado: 'optima',
        titulo: 'Posición 3 (Derecha) — ÓPTIMA',
        explicacion:
          'Crea el mayor colchón lateral respecto al camión, reduce el impacto de las ráfagas de viento y te da margen de escape hacia la derecha mientras ajustas tu velocidad para salir de su punto ciego.',
        cita: 'MSF Ed. 17 (Evitar ráfagas de viento y puntos ciegos) · Decreto N° 8.495 Art. 32 num. 1.',
      },
    },
  },
  {
    id: 'interseccion',
    titulo: 'Intersección con giro a la izquierda (Riesgo #1)',
    etiqueta: 'Intersecciones',
    resumen: 'El choque más frecuente: un auto de frente gira a su izquierda cruzando tu trayectoria.',
    posiciones: {
      1: {
        estado: 'peligrosa',
        titulo: 'Posición 1 (Izquierda) — PELIGROSA',
        explicacion:
          'Quedas demasiado cerca de la línea central y del punto de impacto temprano del carro amarillo que gira. Además, si hay un auto delante de ti, puede ocultarte de la vista del conductor que gira.',
        cita: 'MSF Ed. 17 (Intersecciones — Riesgo principal) · Decreto N° 8.495 Art. 32 num. 2.',
      },
      2: {
        estado: 'optima',
        titulo: 'Posición 2 (Centro) — ÓPTIMA (con frenos cubiertos)',
        explicacion:
          'Con las luces encendidas (Art. 28 num. 14) maximizas visibilidad frontal sin pegarte al borde derecho ni a la línea central, manteniendo rutas de escape a ambos lados y cubriendo frenos y clutch.',
        cita: 'MSF Ed. 17 (SEE en intersecciones) · Decreto N° 8.495 Art. 28 num. 14 y Art. 32 num. 2.',
      },
      3: {
        estado: 'aceptable',
        titulo: 'Posición 3 (Derecha) — ACEPTABLE CON PRECAUCIÓN',
        explicacion:
          'Te aleja inicialmente del vehículo que gira de frente, pero te expone a vehículos que salgan de la calle transversal derecha. Reduce velocidad y vigila las ruedas delanteras del auto amarillo.',
        cita: 'MSF Ed. 17 (Separar peligros en intersecciones) · Decreto N° 8.495 Art. 28 num. 2.',
      },
    },
  },
];

/* ============================================================================
 * 3. DATOS DEL DESAFÍO TÁCTICO (PESTAÑA 3 — 8 ESCENARIOS DECISIVOS)
 * ============================================================================ */
const DESAFIO_PREGUNTAS = [
  {
    id: 'D1',
    categoria: 'Técnica MSF · Espacio de Colchón',
    diagrama: 'estacionados',
    resaltadoCorrecto: 1,
    pregunta:
      'Circulas por una avenida urbana con una fila de carros estacionados a tu derecha y un vehículo con las luces de freno encendidas. ¿Qué posición de tu carril es la más segura?',
    opciones: [
      { id: 'a', texto: 'Posición 1 (Izquierda) para alejarme del radio de puertas y tener visión anticipada.' },
      { id: 'b', texto: 'Posición 3 (Derecha) pegado a los carros estacionados para dejar espacio al tráfico.' },
      { id: 'c', texto: 'Sobre la línea divisoria entre canales para pasar más rápido.' },
    ],
    correctaId: 'a',
    explicacion:
      'La Posición 1 maximiza tu colchón lateral frente a puertas abiertas repentinas o vehículos incorporándose desde la acera, sin invadir el carril vecino.',
    cita: 'MSF Ed. 17 (Posiciones en el Carril) · Decreto N° 8.495 Art. 32 num. 1.',
  },
  {
    id: 'D2',
    categoria: 'Técnica MSF · Superficie',
    diagrama: 'aceite',
    resaltadoCorrecto: 1,
    pregunta:
      'Al aproximarte a un semáforo notas una franja oscura brillante de aceite en el centro del carril (Posición 2). ¿Qué debes hacer?',
    opciones: [
      { id: 'a', texto: 'Mantenerme en Posición 2 y frenar fuerte solo con el freno delantero.' },
      { id: 'b', texto: 'Desplazarme suavemente a Posición 1 o 3 sobre las huellas limpias de los neumáticos.' },
      { id: 'c', texto: 'Subirme a la acera derecha para evitar el aceite.' },
    ],
    correctaId: 'b',
    explicacion:
      'Las huellas izquierda (Pos. 1) y derecha (Pos. 3) están limpiadas por los cauchos de los automóviles y ofrecen mejor tracción; la franja central acumula aceite y escombros.',
    cita: 'MSF Ed. 17 (Peligros en la superficie) · Decreto N° 8.495 Art. 28 num. 9 (Prohibido circular en aceras).',
  },
  {
    id: 'D3',
    categoria: 'Técnica MSF · Puntos Ciegos Propios',
    diagrama: 'hombro',
    resaltadoCorrecto: 1,
    pregunta:
      'Vas a cambiar al carril izquierdo para adelantar un vehículo. Además de mirar tus espejos retrovisores y activar la luz de cruce, ¿qué paso es indispensable?',
    opciones: [
      { id: 'a', texto: 'Realizar un giro rápido de cabeza (chequeo de hombro) para verificar tu propio punto ciego.' },
      { id: 'b', texto: 'Confiar únicamente en los dos espejos retrovisores sin mover la cabeza.' },
      { id: 'c', texto: 'Tocar la corneta continuamente en zona urbana y cambiar de canal de golpe.' },
    ],
    correctaId: 'a',
    explicacion:
      'Los espejos de una moto tienen puntos ciegos laterales. Un giro breve de cabeza sobre el hombro confirma que no hay otro vehículo a tu lado antes de cambiar de trayectoria.',
    cita: 'MSF Ed. 17 (Chequeo de hombro) · Reglamento 1998 Art. 272/273 (Luces de cruce y sin cambios bruscos).',
  },
  {
    id: 'D4',
    categoria: 'Ley Venezolana · Prohibiciones',
    diagrama: 'paralelo',
    resaltadoCorrecto: 2,
    pregunta:
      'Un vehículo en tu mismo canal deja un espacio libre al costado y tienes la tentación de rodar a su par dentro del mismo canal. ¿Qué establece el Decreto N° 8.495?',
    opciones: [
      { id: 'a', texto: 'Está permitido siempre que ambos circulen por debajo de 40 km/h.' },
      { id: 'b', texto: 'Está expresamente prohibido circular paralelamente a otro vehículo en movimiento en el mismo canal.' },
      { id: 'c', texto: 'Solo está prohibido si el otro vehículo es un camión.' },
    ],
    correctaId: 'b',
    explicacion:
      'Compartir el mismo canal en paralelo elimina tu ruta de escape y te coloca directamente en el punto ciego lateral del conductor. La normativa venezolana lo prohíbe expresamente.',
    cita: 'Decreto N° 8.495 Art. 31 numeral 2 (Prohibición Especial).',
  },
  {
    id: 'D5',
    categoria: 'Ley Venezolana · Filtrar entre Canales',
    diagrama: 'filtrar',
    resaltadoCorrecto: 2,
    pregunta:
      'Hay cola lenta en la avenida y se forma un pasillo estrecho entre dos filas de automóviles en movimiento. ¿Es legal circular entre los dos canales para avanzar?',
    opciones: [
      { id: 'a', texto: 'Sí, las motos siempre tienen permiso para circular entre canales si tocan corneta.' },
      { id: 'b', texto: 'No; está prohibido circular entre canales y adelantar entre vehículos que transitan por sus canales.' },
      { id: 'c', texto: 'Sí, siempre que se haga por el lado derecho del canal.' },
    ],
    correctaId: 'b',
    explicacion:
      'Circular entre canales (filtrar) y zigzaguear te expone a cambios bruscos de carril sin visibilidad y está sancionado por el Reglamento Parcial de Motocicletas.',
    cita: 'Decreto N° 8.495 Art. 31 num. 1 y 3 · Art. 28 num. 11.',
  },
  {
    id: 'D6',
    categoria: 'Ley Venezolana · Peatones e Intersección',
    diagrama: 'peaton',
    resaltadoCorrecto: 2,
    pregunta:
      'Un automóvil en el carril izquierdo se detiene frente a un rayado peatonal para ceder el paso a un peatón. Tú vienes en el carril derecho. ¿Qué debes hacer?',
    opciones: [
      { id: 'a', texto: 'Acelerar en Posición 3 para cruzar antes que el peatón llegue a mi carril.' },
      { id: 'b', texto: 'Reducir velocidad, cubrir frenos y detenerme; está prohibido adelantar a un vehículo detenido por ceder el paso a un peatón.' },
      { id: 'c', texto: 'Cambiar de carril detrás del auto y pasarle por la izquierda.' },
    ],
    correctaId: 'b',
    explicacion:
      'El auto detenido bloquea tu vista del peatón cruzando (efecto pantalla). Tanto la técnica SEE como la ley exigen detenerse y ceder el paso sin adelantar al vehículo detenido.',
    cita: 'Decreto N° 8.495 Art. 28 numerales 2, 3 y 4.',
  },
  {
    id: 'D7',
    categoria: 'Ley Venezolana · Adelantamiento Seguro',
    diagrama: 'adelantar',
    resaltadoCorrecto: 1,
    pregunta:
      'Necesitas sobrepasar a un vehículo más lento en una vía de dos canales en el mismo sentido. ¿Cuál es la maniobra reglamentaria y segura?',
    opciones: [
      { id: 'a', texto: 'Adelantar por el lado derecho usando el hombrillo.' },
      { id: 'b', texto: 'Verificar espejos y hombro, encender luz de cruce, utilizar el carril libre a la izquierda y volver señalizando suavemente.' },
      { id: 'c', texto: 'Acercarme a menos de un metro del parachoques y cambiar de golpe sin direccional.' },
    ],
    correctaId: 'b',
    explicacion:
      'Todo adelantamiento debe ejecutarse por el carril libre a la izquierda, señalizando antes y después con las luces de cruce y evitando cambios bruscos de dirección o velocidad.',
    cita: 'Decreto N° 8.495 Art. 28 num. 11 y 12 · Art. 32 num. 3 y 4 · Reglamento 1998 Art. 272.',
  },
  {
    id: 'D8',
    categoria: 'Técnica MSF · Visibilidad en Retrovisor',
    diagrama: 'siguiendo',
    resaltadoCorrecto: 1,
    pregunta:
      'Sigues a un automóvil en tráfico fluido. ¿Por qué conviene ubicarte en Posición 1 (o Posición 2 con amplio colchón) manteniendo las luces encendidas?',
    opciones: [
      { id: 'a', texto: 'Para que el conductor del auto te vea en su retrovisor, tengas línea de visión de 12 s y conserves una ruta de escape.' },
      { id: 'b', texto: 'Para ahorrar combustible aprovechando el rebufo pegado al parachoques.' },
      { id: 'c', texto: 'Para apagar el faro delantero durante el día y evitar reflejos.' },
    ],
    correctaId: 'a',
    explicacion:
      'El principio clave de MSF es ver y ser visto manteniendo un espacio de colchón. Además, en Venezuela las motos deben transitar siempre con luces delanteras y traseras encendidas.',
    cita: 'MSF Ed. 17 (Manteniendo su Distancia y SEE) · Decreto N° 8.495 Art. 28 num. 14.',
  },
];

/* ============================================================================
 * 4. UTILIDADES DE PUNTUACIÓN Y DIAGNÓSTICO (PESTAÑA 1)
 * ============================================================================ */
function obtenerNivelTactico(puntaje) {
  if (puntaje >= 88) {
    return {
      titulo: 'Piloto Táctico SEE — Dominio Sobresaliente',
      badge: 'Colchón Maestro',
      colorStroke: '#10B981',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      descripcion:
        'Mantienes tu espacio de colchón, evitas puntos ciegos, aplicas chequeos de hombro y respetas el Decreto N° 8.495 con precisión.',
    };
  }
  if (puntaje >= 72) {
    return {
      titulo: 'Piloto Preventivo — Buen Control de Carril',
      badge: 'Buen Dominio',
      colorStroke: '#2563EB',
      badgeClass: 'bg-blue-50 text-[#2563EB] border-blue-200',
      descripcion:
        'Lees bien el tráfico urbano. Reforzar los chequeos de hombro y la anticipación en intersecciones elevará aún más tu margen de seguridad.',
    };
  }
  if (puntaje >= 52) {
    return {
      titulo: 'Piloto en Formación — Atención a Puntos Ciegos',
      badge: 'Nivel Intermedio',
      colorStroke: '#F59E0B',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
      descripcion:
        'Respondes a los peligros cercanos, pero permaneces demasiado tiempo en zonas ciegas o tardas en ajustar tu velocidad antes de intersecciones.',
    };
  }
  return {
    titulo: 'Piloto Expuesto — Priorizar Estrategia SEE',
    badge: 'Riesgo Alto',
    colorStroke: '#EF4444',
    badgeClass: 'bg-red-50 text-red-700 border-red-200',
    descripcion:
      'Es indispensable entrenar la lectura anticipada a 12 segundos y eliminar hábitos riesgosos antes de exponerte a avenidas congestionadas.',
  };
}

function generarRecomendacionMotoApp(metricas, alertas) {
  if (metricas.cumplimientoLegal < 85) {
    return {
      titulo: 'Recomendación Moto App: Módulo Normativo VE + Sesión Práctica Defensiva',
      detalle:
        'Se registraron maniobras contrarias al Decreto N° 8.495 (filtrar entre canales o adelantar por derecha). Agenda una sesión práctica defensiva para consolidar adelantamientos seguros por la izquierda.',
    };
  }
  if (metricas.fueraPuntosCiegos < 80) {
    return {
      titulo: 'Recomendación Moto App: Clínica de Equilibrio y Gestión de Puntos Ciegos',
      detalle:
        'Pasaste tiempo valioso dentro de conos ciegos adyacentes. Una clínica práctica en pista y calle controlada te entrenará a usar Posición 1-2-3 y modulación de velocidad para ser siempre visible.',
    };
  }
  if (metricas.peligrosAnticipados < 75 || alertas.intersecciones > 0) {
    return {
      titulo: 'Recomendación Moto App: Sesión Práctica de Frenado y Estrategia SEE',
      detalle:
        'Practica cubrir frenos y reducir velocidad antes de intersecciones y pasos peatonales para aumentar tu colchón de reacción.',
    };
  }
  return {
    titulo: 'Recomendación Moto App: Clínica Avanzada de Estrategia Urbana SEE',
    detalle:
      'Excelente desempeño táctico y legal. Estás preparado para una sesión práctica avanzada de maniobras evasivas y lectura de tráfico complejo.',
  };
}

/* ============================================================================
 * 5. PESTAÑA 1: SIMULADOR EN VIVO (CANVAS HTML5 60FPS — CARRILES 1-2-3)
 * ============================================================================ */
function SimuladorEnVivoCarril() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const rafRef = useRef(null);
  const lastTimeRef = useRef(0);

  const [estadoSim, setEstadoSim] = useState('listo'); // 'listo' | 'corriendo' | 'pausado' | 'infraccion' | 'finalizado'
  const [radarSEE, setRadarSEE] = useState(true);
  const [modalInfraccion, setModalInfraccion] = useState(null);
  const [diagnosticoFinal, setDiagnosticoFinal] = useState(null);
  const [copiado, setCopiado] = useState(false);

  const [hud, setHud] = useState({
    tiempoRestante: 60,
    velocidad: 48,
    posicion: 1,
    puntaje: 100,
    estadoBarra: 'seguro', // 'seguro' | 'punto_ciego' | 'peligro'
    textoEstado: 'Colchón Seguro',
    alertaFlotante: null,
    puedeFiltrar: false,
    chequeosHombro: 0,
    cubriendoFrenos: false,
  });

  const radarSEERef = useRef(true);
  useEffect(() => {
    radarSEERef.current = radarSEE;
  }, [radarSEE]);

  // Estado mutable del motor 60fps
  const simRef = useRef({
    running: false,
    paused: false,
    timeLeft: 60,
    scrollDist: 0,
    speed: 48, // km/h
    targetPos: 1, // 1 | 2 | 3
    motoPosFloat: 1, // interpolación suave 1.0 -> 3.0
    braking: false,
    shoulderTimer: 0, // >0 cuando hace barrido visual de hombro
    shoulderCooldown: 0,
    shoulderCount: 0,
    shoulderRecentBonus: 0, // ventana de 2.5s tras chequear hombro
    score: 100,
    // Entidades activas en la vía
    hazards: [],
    spawnTimer: 1.2,
    waveIndex: 0,
    // Telemetría exacta
    totalFramesTime: 0,
    blindSpotTime: 0,
    blindSpotCooldown: 0,
    hazardsPassed: 0,
    hazardsAvoided: 0,
    oilHits: 0,
    doorHits: 0,
    intersectionFails: 0,
    legalInfractions: 0,
    inBlindSpotNow: false,
    inDangerNow: false,
    slowCarAhead: false,
    flashTimer: 0,
    alertText: null,
    alertType: 'info',
    alertTimer: 0,
    hudSyncAcc: 0,
  });

  const reiniciarSim = useCallback(() => {
    const s = simRef.current;
    s.timeLeft = 60;
    s.scrollDist = 0;
    s.speed = 48;
    s.targetPos = 1;
    s.motoPosFloat = 1;
    s.braking = false;
    s.shoulderTimer = 0;
    s.shoulderCooldown = 0;
    s.shoulderCount = 0;
    s.shoulderRecentBonus = 0;
    s.score = 100;
    s.hazards = [];
    s.spawnTimer = 1.0;
    s.waveIndex = 0;
    s.totalFramesTime = 0;
    s.blindSpotTime = 0;
    s.blindSpotCooldown = 0;
    s.hazardsPassed = 0;
    s.hazardsAvoided = 0;
    s.oilHits = 0;
    s.doorHits = 0;
    s.intersectionFails = 0;
    s.legalInfractions = 0;
    s.inBlindSpotNow = false;
    s.inDangerNow = false;
    s.slowCarAhead = false;
    s.flashTimer = 0;
    s.alertText = null;
    s.alertTimer = 0;
    s.hudSyncAcc = 0;
  }, []);

  const construirReporte = useCallback(() => {
    const s = simRef.current;
    const tiempoTotal = Math.max(0.5, s.totalFramesTime);
    const fueraPuntosCiegos = Math.max(
      0,
      Math.min(100, Math.round(((tiempoTotal - s.blindSpotTime) / tiempoTotal) * 100))
    );
    const peligrosAnticipados =
      s.hazardsPassed > 0 ? Math.round((s.hazardsAvoided / s.hazardsPassed) * 100) : 100;
    const cumplimientoLegal = Math.max(0, 100 - s.legalInfractions * 25);
    const bonoHombro = Math.min(100, s.shoulderCount * 20);

    const puntajeGlobal = Math.max(
      10,
      Math.min(
        100,
        Math.round(
          fueraPuntosCiegos * 0.34 +
            peligrosAnticipados * 0.34 +
            cumplimientoLegal * 0.22 +
            bonoHombro * 0.1
        )
      )
    );

    const alertas = {
      segundosPuntoCiego: Math.round(s.blindSpotTime * 10) / 10,
      aceite: s.oilHits,
      puertas: s.doorHits,
      intersecciones: s.intersectionFails,
      infracciones: s.legalInfractions,
    };

    const metricas = {
      fueraPuntosCiegos,
      peligrosAnticipados,
      chequeosHombro: s.shoulderCount,
      cumplimientoLegal,
    };

    return {
      puntajeGlobal,
      nivel: obtenerNivelTactico(puntajeGlobal),
      metricas,
      alertas,
      recomendacion: generarRecomendacionMotoApp(metricas, alertas),
    };
  }, []);

  const iniciarCorrida = useCallback(() => {
    reiniciarSim();
    simRef.current.running = true;
    simRef.current.paused = false;
    setModalInfraccion(null);
    setDiagnosticoFinal(null);
    setEstadoSim('corriendo');
    lastTimeRef.current = performance.now();
  }, [reiniciarSim]);

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

  const finalizarCorrida = useCallback(() => {
    simRef.current.running = false;
    simRef.current.paused = false;
    setModalInfraccion(null);
    setDiagnosticoFinal(construirReporte());
    setEstadoSim('finalizado');
  }, [construirReporte]);

  // Acción: cambiar posición 1 / 2 / 3
  const cambiarPosicion = useCallback((nuevaPos) => {
    const s = simRef.current;
    const clamped = Math.max(1, Math.min(3, nuevaPos));
    if (clamped !== s.targetPos && s.running && !s.paused) {
      if (s.shoulderRecentBonus > 0) {
        s.score = Math.min(100, s.score + 2);
        s.alertText = '¡Excelente! Cambio de trazada respaldado con chequeo de hombro (+SEE)';
        s.alertType = 'success';
        s.alertTimer = 1.8;
        s.shoulderRecentBonus = 0;
      }
    }
    s.targetPos = clamped;
    setHud((prev) => ({ ...prev, posicion: clamped }));
  }, []);

  // Acción: Chequeo de Hombro (Tecla H)
  const ejecutarChequeoHombro = useCallback(() => {
    const s = simRef.current;
    if (!s.running || s.paused || s.shoulderCooldown > 0) return;
    s.shoulderTimer = 1.1;
    s.shoulderCooldown = 1.4;
    s.shoulderCount += 1;
    s.shoulderRecentBonus = 3.0;
    s.score = Math.min(100, s.score + 1.5);
    s.alertText = 'Chequeo de hombro ejecutado: puntos ciegos propios verificados';
    s.alertType = 'success';
    s.alertTimer = 1.7;
  }, []);

  // Acción: Tentación legal "Intentar filtrar"
  const intentarFiltrar = useCallback(() => {
    const s = simRef.current;
    if (!s.running || s.paused || !s.slowCarAhead) return;
    s.paused = true;
    s.legalInfractions += 1;
    s.score = Math.max(0, s.score - 14);
    // Retiramos el auto lento actual tras reanudar para evitar bucle
    s.hazards.forEach((h) => {
      if (h.type === 'slow_car') h.resolved = true;
    });
    setModalInfraccion({
      titulo: 'Infracción Detectada: Filtrar entre canales / Adelantar por derecha',
      articulo: 'Decreto N° 8.495 · Art. 31 num. 1 y Art. 28 num. 11',
      detalle:
        'Intentaste meterte en un espacio estrecho entre vehículos o por el costado derecho. La normativa venezolana prohíbe expresamente circular entre canales y adelantar por la derecha. En la vida real, el conductor del auto no te ve en ese ángulo y puede cerrar el paso sin aviso.',
      solucion:
        'Solución segura: mantén tu colchón de espacio, reduce velocidad con frenos cubiertos y adelanta únicamente cuando el carril izquierdo esté completamente libre (Art. 28 num. 12).',
    });
    setEstadoSim('infraccion');
  }, []);

  const reanudarTrasInfraccion = useCallback(() => {
    setModalInfraccion(null);
    simRef.current.paused = false;
    lastTimeRef.current = performance.now();
    setEstadoSim('corriendo');
  }, []);

  // Listeners de teclado (1, 2, 3, Flechas, Espacio, H, F) con cleanup estricto
  useEffect(() => {
    const onKeyDown = (e) => {
      if (estadoSim !== 'corriendo') return;
      const k = e.key.toLowerCase();
      if (['arrowleft', 'arrowright', 'arrowdown', ' ', '1', '2', '3', 'h', 'f'].includes(k)) {
        e.preventDefault();
      }
      if (k === '1') cambiarPosicion(1);
      else if (k === '2') cambiarPosicion(2);
      else if (k === '3') cambiarPosicion(3);
      else if (k === 'arrowleft') cambiarPosicion(simRef.current.targetPos - 1);
      else if (k === 'arrowright') cambiarPosicion(simRef.current.targetPos + 1);
      else if (k === ' ' || k === 'arrowdown') {
        simRef.current.braking = true;
      } else if (k === 'h') {
        ejecutarChequeoHombro();
      } else if (k === 'f') {
        intentarFiltrar();
      }
    };

    const onKeyUp = (e) => {
      const k = e.key.toLowerCase();
      if (k === ' ' || k === 'arrowdown') {
        simRef.current.braking = false;
      }
    };

    window.addEventListener('keydown', onKeyDown, { passive: false });
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [estadoSim, cambiarPosicion, ejecutarChequeoHombro, intentarFiltrar]);

  // Escala Retina responsive del Canvas
  const ajustarCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = container.clientWidth;
    const height = Math.max(360, Math.min(440, Math.round(width * 0.68)));
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }, []);

  useEffect(() => {
    ajustarCanvas();
    window.addEventListener('resize', ajustarCanvas);
    return () => window.removeEventListener('resize', ajustarCanvas);
  }, [ajustarCanvas]);

  // Geometría compartida de carriles para dibujo y colisiones
  const obtenerGeometria = (width, height) => {
    const roadW = Math.min(width - 24, 420);
    const roadX = (width - roadW) / 2;
    const leftLaneW = roadW * 0.36;
    const rightLaneW = roadW * 0.44;
    const parkingW = roadW * 0.2;

    const leftLaneX = roadX;
    const rightLaneX = roadX + leftLaneW;
    const parkingX = rightLaneX + rightLaneW;

    const posX = (posNum) => rightLaneX + ((posNum - 0.5) / 3) * rightLaneW;
    const motoY = height * 0.74;

    return {
      roadW,
      roadX,
      leftLaneX,
      leftLaneW,
      rightLaneX,
      rightLaneW,
      parkingX,
      parkingW,
      posX,
      motoY,
    };
  };

  // Generador de oleadas variadas de peligros
  const generarOleada = (s, height) => {
    const secuencia = ['oil', 'blindspot_car', 'parked_door', 'intersection', 'slow_car', 'blindspot_truck'];
    const tipo = secuencia[s.waveIndex % secuencia.length];
    s.waveIndex += 1;
    const id = `${tipo}-${s.waveIndex}-${Date.now()}`;

    if (tipo === 'oil') {
      s.hazards.push({
        id,
        type: 'oil',
        y: -90,
        height: 66,
        relSpeed: 1.0,
        evaluated: false,
        hit: false,
      });
    } else if (tipo === 'parked_door') {
      s.hazards.push({
        id,
        type: 'parked_door',
        y: -110,
        height: 82,
        relSpeed: 1.0,
        doorOpen: 0,
        evaluated: false,
        hit: false,
      });
    } else if (tipo === 'blindspot_car' || tipo === 'blindspot_truck') {
      const esCamion = tipo === 'blindspot_truck';
      s.hazards.push({
        id,
        type: tipo,
        y: -160,
        height: esCamion ? 132 : 84,
        // Se mueve un poco más lento que la moto a velocidad crucero para que el piloto deba gestionar el punto ciego
        relSpeed: esCamion ? 0.42 : 0.48,
        evaluated: false,
        hit: false,
      });
    } else if (tipo === 'intersection') {
      s.hazards.push({
        id,
        type: 'intersection',
        y: -140,
        height: 118,
        relSpeed: 1.0,
        pedX: 0, // animación del peatón cruzando
        evaluated: false,
        hit: false,
      });
    } else if (tipo === 'slow_car') {
      s.hazards.push({
        id,
        type: 'slow_car',
        y: -110,
        height: 82,
        relSpeed: 0.56,
        evaluated: false,
        hit: false,
        resolved: false,
      });
    }
  };

  // Dibujo del Canvas 60fps
  const dibujarCanvas = useCallback((ctx, width, height, s) => {
    const g = obtenerGeometria(width, height);
    const showRadar = radarSEERef.current;

    // 1. Fondo lateral urbano
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, width, height);

    // Aceras izquierda y derecha
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(Math.max(0, g.roadX - 24), 0, 24, height);
    ctx.fillRect(g.roadX + g.roadW, 0, 24, height);

    // 2. Asfalto principal (Carril izquierdo + Carril derecho + Borde estacionamiento)
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(g.leftLaneX, 0, g.leftLaneW + g.rightLaneW, height);

    // Zona de estacionamiento derecha
    ctx.fillStyle = '#172033';
    ctx.fillRect(g.parkingX, 0, g.parkingW, height);

    // Franja central sutil del carril del piloto (simula zona aceitosa habitual)
    const centerStripW = g.rightLaneW * 0.24;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
    ctx.fillRect(g.posX(2) - centerStripW / 2, 0, centerStripW, height);

    // 3. Líneas viales animadas
    const dashOffset = -(s.scrollDist % 44);

    // Borde izquierdo blanco
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(g.leftLaneX + 2, 0);
    ctx.lineTo(g.leftLaneX + 2, height);
    ctx.stroke();

    // Línea divisoria entre carril izquierdo y carril del piloto (blanca discontinua)
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 3;
    ctx.setLineDash([22, 22]);
    ctx.lineDashOffset = dashOffset;
    ctx.beginPath();
    ctx.moveTo(g.rightLaneX, 0);
    ctx.lineTo(g.rightLaneX, height);
    ctx.stroke();

    // Línea divisoria entre carril del piloto y zona de estacionamiento
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(g.parkingX, 0);
    ctx.lineTo(g.parkingX, height);
    ctx.stroke();

    // Sub-carriles 1, 2, 3 punteados dentro del carril derecho
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.24)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([8, 12]);
    ctx.lineDashOffset = dashOffset;
    for (let k = 1; k <= 2; k += 1) {
      const sx = g.rightLaneX + (g.rightLaneW / 3) * k;
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, height);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Etiquetas discretas 1 · 2 · 3 al fondo del carril del piloto
    [1, 2, 3].forEach((num) => {
      const cx = g.posX(num);
      const activa = s.targetPos === num;
      ctx.beginPath();
      ctx.arc(cx, height - 22, 11, 0, Math.PI * 2);
      ctx.fillStyle = activa ? '#2563EB' : 'rgba(30, 41, 59, 0.85)';
      ctx.fill();
      ctx.strokeStyle = activa ? '#93C5FD' : 'rgba(148, 163, 184, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = activa ? '#FFFFFF' : '#94A3B8';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(num), cx, height - 18);
    });

    // 4. Cono frontal RiderRadar 12 segundos (si Radar SEE está ON)
    const motoX = g.posX(s.motoPosFloat);
    if (showRadar) {
      const radarGrad = ctx.createLinearGradient(motoX, g.motoY - 22, motoX, g.motoY - 230);
      radarGrad.addColorStop(0, 'rgba(56, 189, 248, 0.22)');
      radarGrad.addColorStop(1, 'rgba(56, 189, 248, 0.02)');
      ctx.fillStyle = radarGrad;
      ctx.beginPath();
      ctx.moveTo(motoX - 10, g.motoY - 18);
      ctx.lineTo(motoX - 78, g.motoY - 230);
      ctx.lineTo(motoX + 78, g.motoY - 230);
      ctx.lineTo(motoX + 10, g.motoY - 18);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(125, 211, 252, 0.72)';
      ctx.font = 'bold 9px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('RADAR SEE · 12s', motoX, g.motoY - 196);
    }

    // 5. Renderizado de Peligros y Vehículos
    s.hazards.forEach((h) => {
      if (h.type === 'intersection') {
        // Calle transversal + paso peatonal
        ctx.fillStyle = '#273549';
        ctx.fillRect(0, h.y, width, h.height);

        // Rayado peatonal (cebra)
        ctx.fillStyle = 'rgba(248, 250, 252, 0.78)';
        for (let sx = g.leftLaneX + 8; sx < g.parkingX - 8; sx += 16) {
          ctx.fillRect(sx, h.y + h.height - 22, 9, 16);
        }

        // Vehículo amarillo amagando girar/invadir desde la izquierda
        const yellowX = g.leftLaneX + 12 + Math.sin(s.scrollDist * 0.04) * 5;
        const yellowY = h.y + 18;
        ctx.save();
        ctx.translate(yellowX + 26, yellowY + 18);
        ctx.rotate(0.28);
        ctx.fillStyle = '#F59E0B';
        ctx.beginPath();
        ctx.roundRect(-24, -14, 48, 28, 7);
        ctx.fill();
        ctx.fillStyle = '#1E293B';
        ctx.fillRect(6, -10, 10, 20);
        // Direccional parpadeante
        if (Math.floor(performance.now() / 220) % 2 === 0) {
          ctx.fillStyle = '#FEF08A';
          ctx.beginPath();
          ctx.arc(22, 10, 4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        // Peatón cruzando sobre la cebra
        const pedPx = g.rightLaneX + 12 + Math.min(g.rightLaneW - 24, h.pedX);
        const pedPy = h.y + h.height - 14;
        ctx.beginPath();
        ctx.arc(pedPx, pedPy, 6.5, 0, Math.PI * 2);
        ctx.fillStyle = '#38BDF8';
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Halo de advertencia en intersección
        if (showRadar) {
          ctx.strokeStyle = 'rgba(245, 158, 11, 0.85)';
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 4]);
          ctx.strokeRect(g.rightLaneX + 3, h.y + 4, g.rightLaneW - 6, h.height - 8);
          ctx.setLineDash([]);
          ctx.fillStyle = '#FDE68A';
          ctx.font = 'bold 10px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('INTERSECCIÓN + PEATÓN · REDUCE VELOCIDAD', g.posX(2), h.y - 6);
        }
      } else if (h.type === 'oil') {
        const ox = g.posX(2);
        const oy = h.y + h.height / 2;
        ctx.fillStyle = 'rgba(2, 6, 23, 0.88)';
        ctx.beginPath();
        ctx.ellipse(ox, oy, 20, 30, 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(139, 92, 246, 0.55)';
        ctx.lineWidth = 2;
        ctx.stroke();

        if (showRadar) {
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(ox, oy, 26, 35, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = '#FCA5A5';
          ctx.font = 'bold 9.5px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('ACEITE (POS. 2)', ox, h.y - 6);
        }
      } else if (h.type === 'parked_door') {
        const px = g.parkingX + 8;
        const pw = Math.max(36, g.parkingW - 14);
        // Auto estacionado
        ctx.fillStyle = '#64748B';
        ctx.beginPath();
        ctx.roundRect(px, h.y, pw, h.height, 8);
        ctx.fill();
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(px + 5, h.y + 14, pw - 10, 14);
        ctx.fillRect(px + 5, h.y + h.height - 22, pw - 10, 12);

        // Puerta izquierda abriéndose hacia Posición 3
        const openAngle = h.doorOpen * 0.95;
        ctx.save();
        ctx.translate(px, h.y + 26);
        ctx.rotate(-openAngle);
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, 30);
        ctx.stroke();
        ctx.restore();

        // Halo de zona de puerta sobre Posición 3
        if (showRadar) {
          ctx.fillStyle = 'rgba(239, 68, 68, 0.24)';
          ctx.beginPath();
          ctx.roundRect(g.posX(3) - 24, h.y + 8, 48, 56, 10);
          ctx.fill();
          ctx.strokeStyle = '#EF4444';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.fillStyle = '#FCA5A5';
          ctx.font = 'bold 9.5px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('PUERTA (USA POS. 1)', g.posX(3) - 10, h.y - 6);
        }
      } else if (h.type === 'blindspot_car' || h.type === 'blindspot_truck') {
        const esCamion = h.type === 'blindspot_truck';
        const vx = g.leftLaneX + g.leftLaneW * 0.16;
        const vw = g.leftLaneW * 0.68;

        // Cono ROJO de Punto Ciego proyectado hacia el carril derecho (Pos. 1 y parte de Pos. 2)
        if (showRadar) {
          const coneGrad = ctx.createLinearGradient(
            vx + vw,
            h.y + h.height * 0.5,
            g.posX(2) + 18,
            h.y + h.height + 70
          );
          coneGrad.addColorStop(0, 'rgba(239, 68, 68, 0.42)');
          coneGrad.addColorStop(1, 'rgba(239, 68, 68, 0.10)');
          ctx.fillStyle = coneGrad;
          ctx.beginPath();
          ctx.moveTo(vx + vw, h.y + h.height * 0.38);
          ctx.lineTo(g.posX(esCamion ? 2.55 : 2.15), h.y + h.height * 0.58);
          ctx.lineTo(g.posX(esCamion ? 2.55 : 2.15), h.y + h.height + (esCamion ? 74 : 52));
          ctx.lineTo(vx + vw, h.y + h.height + 16);
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = 'rgba(239, 68, 68, 0.72)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = '#FCA5A5';
          ctx.font = 'bold 9px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('PUNTO CIEGO', g.posX(1.45), h.y + h.height + 28);
        }

        // Vehículo (Camión o Auto)
        ctx.fillStyle = esCamion ? '#475569' : '#3B82F6';
        ctx.beginPath();
        ctx.roundRect(vx, h.y, vw, h.height, esCamion ? 6 : 10);
        ctx.fill();
        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Parabrisas / cabina
        ctx.fillStyle = '#0F172A';
        if (esCamion) {
          ctx.fillRect(vx + 5, h.y + 8, vw - 10, 18);
          ctx.strokeStyle = '#334155';
          ctx.strokeRect(vx + 4, h.y + 34, vw - 8, h.height - 40);
        } else {
          ctx.fillRect(vx + 6, h.y + 16, vw - 12, 16);
          ctx.fillRect(vx + 6, h.y + h.height - 24, vw - 12, 12);
        }
      } else if (h.type === 'slow_car') {
        const vx = g.rightLaneX + g.rightLaneW * 0.14;
        const vw = g.rightLaneW * 0.72;
        ctx.fillStyle = '#CBD5E1';
        ctx.beginPath();
        ctx.roundRect(vx, h.y, vw, h.height, 10);
        ctx.fill();
        ctx.fillStyle = '#1E293B';
        ctx.fillRect(vx + 8, h.y + 14, vw - 16, 15);
        ctx.fillRect(vx + 8, h.y + h.height - 24, vw - 16, 12);
        // Luces traseras rojas
        ctx.fillStyle = '#EF4444';
        ctx.fillRect(vx + 6, h.y + h.height - 5, 12, 4);
        ctx.fillRect(vx + vw - 18, h.y + h.height - 5, 12, 4);

        if (showRadar && !h.resolved) {
          ctx.fillStyle = '#E2E8F0';
          ctx.font = 'bold 9.5px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('AUTO LENTO · MANTÉN COLCHÓN', vx + vw / 2, h.y - 6);
        }
      }
    });

    // 6. Dibujo de la Motocicleta del Piloto
    // Barrido visual del Chequeo de Hombro (si está activo)
    if (s.shoulderTimer > 0) {
      const alpha = Math.min(0.65, s.shoulderTimer * 0.65);
      ctx.fillStyle = `rgba(16, 185, 129, ${alpha * 0.35})`;
      ctx.strokeStyle = `rgba(16, 185, 129, ${alpha})`;
      ctx.lineWidth = 2;
      // Arco izquierdo trasero
      ctx.beginPath();
      ctx.moveTo(motoX, g.motoY);
      ctx.arc(motoX, g.motoY, 54, Math.PI * 0.62, Math.PI * 1.12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Arco derecho trasero
      ctx.beginPath();
      ctx.moveTo(motoX, g.motoY);
      ctx.arc(motoX, g.motoY, 54, -Math.PI * 0.12, Math.PI * 0.38);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Haz de luz delantera siempre encendido (Art. 28 num. 14)
    const beamGrad = ctx.createLinearGradient(motoX, g.motoY - 22, motoX, g.motoY - 96);
    beamGrad.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
    beamGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(motoX - 4, g.motoY - 20);
    ctx.lineTo(motoX - 24, g.motoY - 94);
    ctx.lineTo(motoX + 24, g.motoY - 94);
    ctx.lineTo(motoX + 4, g.motoY - 20);
    ctx.closePath();
    ctx.fill();

    // Halo verde/rojo de colchón alrededor de la moto
    ctx.beginPath();
    ctx.arc(motoX, g.motoY, 26, 0, Math.PI * 2);
    ctx.fillStyle = s.inBlindSpotNow
      ? 'rgba(239, 68, 68, 0.25)'
      : s.inDangerNow
      ? 'rgba(245, 158, 11, 0.25)'
      : 'rgba(16, 185, 129, 0.16)';
    ctx.fill();

    // Cuerpo de la moto (cenital)
    ctx.save();
    ctx.translate(motoX, g.motoY);
    const tilt = (s.targetPos - s.motoPosFloat) * 0.16;
    ctx.rotate(tilt);

    // Cauchos
    ctx.fillStyle = '#020617';
    ctx.beginPath();
    ctx.roundRect(-4.5, -22, 9, 14, 3);
    ctx.roundRect(-5, 10, 10, 14, 3);
    ctx.fill();

    // Manubrio y espejos
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-14, -8);
    ctx.lineTo(14, -8);
    ctx.stroke();

    // Chasis / tanque azul Moto App
    ctx.fillStyle = '#2563EB';
    ctx.beginPath();
    ctx.roundRect(-7, -12, 14, 24, 6);
    ctx.fill();

    // Casco del piloto
    ctx.beginPath();
    ctx.arc(0, 1, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#F8FAFC';
    ctx.fill();
    ctx.strokeStyle = '#1D4ED8';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Faro delantero brillante
    ctx.beginPath();
    ctx.arc(0, -19, 3.2, 0, Math.PI * 2);
    ctx.fillStyle = '#FEF08A';
    ctx.fill();

    // Luz de freno roja trasera (intensa al cubrir frenos)
    ctx.beginPath();
    ctx.arc(0, 22, s.braking ? 5.5 : 3, 0, Math.PI * 2);
    ctx.fillStyle = s.braking ? '#EF4444' : 'rgba(239, 68, 68, 0.65)';
    ctx.fill();
    if (s.braking) {
      ctx.beginPath();
      ctx.arc(0, 22, 11, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
      ctx.fill();
    }

    ctx.restore();

    // Borde parpadeante rojo si está en punto ciego o acaba de cometer error
    if (s.inBlindSpotNow || s.flashTimer > 0) {
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
      ctx.lineWidth = 6;
      ctx.strokeRect(3, 3, width - 6, height - 6);
    }
  }, []);

  // Bucle 60fps requestAnimationFrame
  useEffect(() => {
    const step = (now) => {
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

          s.timeLeft = Math.max(0, s.timeLeft - dt);
          s.totalFramesTime += dt;

          // Velocidad: crucero 50 km/h, frena hasta 22 km/h si cubre frenos
          if (s.braking) {
            s.speed = Math.max(22, s.speed - 52 * dt);
          } else {
            s.speed = Math.min(52, s.speed + 24 * dt);
          }

          // Movimiento suave hacia la posición 1, 2 o 3
          s.motoPosFloat += (s.targetPos - s.motoPosFloat) * Math.min(1, dt * 11);

          // Temporizadores
          s.shoulderTimer = Math.max(0, s.shoulderTimer - dt);
          s.shoulderCooldown = Math.max(0, s.shoulderCooldown - dt);
          s.shoulderRecentBonus = Math.max(0, s.shoulderRecentBonus - dt);
          s.blindSpotCooldown = Math.max(0, s.blindSpotCooldown - dt);
          s.flashTimer = Math.max(0, s.flashTimer - dt);
          if (s.alertTimer > 0) {
            s.alertTimer = Math.max(0, s.alertTimer - dt);
            if (s.alertTimer === 0) s.alertText = null;
          }

          const basePxPerSec = s.speed * 4.2;
          s.scrollDist += basePxPerSec * dt;

          // Generar nuevas oleadas
          s.spawnTimer -= dt;
          if (s.spawnTimer <= 0 && s.timeLeft > 3) {
            generarOleada(s, height);
            s.spawnTimer = 3.2;
          }

          const g = obtenerGeometria(width, height);
          let inBlindSpot = false;
          let inDanger = false;
          let slowCarDetectado = false;

          // Actualizar y evaluar peligros
          s.hazards.forEach((h) => {
            if (h.type === 'slow_car') {
              // Mantiene cierta velocidad propia para que si el piloto frena se separe o si sigue cerca ofrezca tentación
              const deltaVel = Math.max(12, s.speed - 28);
              h.y += deltaVel * 4.2 * dt;
              if (!h.resolved && h.y > g.motoY - 210 && h.y < g.motoY - 40) {
                slowCarDetectado = true;
              }
              // Si choca por detrás sin frenar
              if (!h.evaluated && h.y + h.height >= g.motoY - 22 && h.y <= g.motoY + 14) {
                h.evaluated = true;
                s.hazardsPassed += 1;
                if (s.braking || s.speed <= 32) {
                  s.hazardsAvoided += 1;
                  s.score = Math.min(100, s.score + 2);
                } else {
                  inDanger = true;
                  s.flashTimer = 0.4;
                  s.score = Math.max(0, s.score - 8);
                  s.alertText = 'Muy cerca del auto delantero: cubre frenos y conserva tu colchón';
                  s.alertType = 'warning';
                  s.alertTimer = 2.2;
                }
              }
            } else {
              h.y += basePxPerSec * h.relSpeed * dt;
            }

            // Animaciones específicas
            if (h.type === 'parked_door' && h.y > g.motoY - 260) {
              h.doorOpen = Math.min(1, h.doorOpen + dt * 2.4);
            }
            if (h.type === 'intersection' && h.y > g.motoY - 280) {
              h.pedX += dt * 36;
            }

            // Evaluación de Punto Ciego en autos/camiones del carril vecino
            if (h.type === 'blindspot_car' || h.type === 'blindspot_truck') {
              const esCamion = h.type === 'blindspot_truck';
              const coneTop = h.y + h.height * 0.4;
              const coneBottom = h.y + h.height + (esCamion ? 74 : 52);
              const posLimite = esCamion ? 2.45 : 2.05;

              if (g.motoY >= coneTop && g.motoY <= coneBottom && s.motoPosFloat <= posLimite) {
                inBlindSpot = true;
              }

              if (!h.evaluated && h.y > g.motoY + 40) {
                h.evaluated = true;
                s.hazardsPassed += 1;
                if (!h.hit) s.hazardsAvoided += 1;
              }
            }

            // Evaluación Mancha de aceite (Posición 2)
            if (h.type === 'oil' && !h.evaluated) {
              if (Math.abs(h.y + h.height / 2 - g.motoY) < 28) {
                h.evaluated = true;
                s.hazardsPassed += 1;
                if (Math.abs(s.motoPosFloat - 2) < 0.42) {
                  h.hit = true;
                  s.oilHits += 1;
                  s.flashTimer = 0.45;
                  s.score = Math.max(0, s.score - 9);
                  s.alertText = 'Pisaste la mancha de aceite en Posición 2 · Usa Posición 1 o 3';
                  s.alertType = 'danger';
                  s.alertTimer = 2.4;
                } else {
                  s.hazardsAvoided += 1;
                  s.score = Math.min(100, s.score + 2);
                }
              }
            }

            // Evaluación Puerta abriéndose (Posición 3 peligrosa)
            if (h.type === 'parked_door' && !h.evaluated) {
              if (Math.abs(h.y + h.height / 2 - g.motoY) < 30) {
                h.evaluated = true;
                s.hazardsPassed += 1;
                if (s.motoPosFloat > 2.35) {
                  h.hit = true;
                  s.doorHits += 1;
                  s.flashTimer = 0.5;
                  s.score = Math.max(0, s.score - 11);
                  s.alertText = '¡Zona de puertas en Posición 3! Desplázate a Posición 1 ante autos estacionados';
                  s.alertType = 'danger';
                  s.alertTimer = 2.6;
                } else {
                  s.hazardsAvoided += 1;
                  s.score = Math.min(100, s.score + 2);
                }
              }
            }

            // Evaluación Intersección + Peatón
            if (h.type === 'intersection' && !h.evaluated) {
              if (h.y + h.height >= g.motoY && h.y <= g.motoY) {
                h.evaluated = true;
                s.hazardsPassed += 1;
                const redujoBien = s.braking || s.speed <= 35;
                if (redujoBien) {
                  s.hazardsAvoided += 1;
                  s.score = Math.min(100, s.score + 3);
                  s.alertText = '¡Intersección controlada! Redujiste velocidad y cediste espacio (SEE)';
                  s.alertType = 'success';
                  s.alertTimer = 2.0;
                } else {
                  h.hit = true;
                  s.intersectionFails += 1;
                  s.flashTimer = 0.5;
                  s.score = Math.max(0, s.score - 10);
                  s.alertText =
                    'Cruce riesgoso en intersección: cubre frenos y respeta el paso peatonal (Art. 28 num. 2)';
                  s.alertType = 'danger';
                  s.alertTimer = 2.6;
                }
              }
            }
          });

          // Procesar estado de punto ciego
          if (inBlindSpot) {
            s.blindSpotTime += dt;
            s.score = Math.max(0, s.score - 7.5 * dt);
            s.hazards.forEach((h) => {
              if (
                (h.type === 'blindspot_car' || h.type === 'blindspot_truck') &&
                h.y < g.motoY &&
                h.y + h.height + 75 > g.motoY
              ) {
                h.hit = true;
              }
            });
            if (s.blindSpotCooldown <= 0) {
              s.blindSpotCooldown = 1.6;
              s.alertText = '¡EN PUNTO CIEGO! Cambia a Posición 3 o cubre frenos para salir del cono rojo';
              s.alertType = 'danger';
              s.alertTimer = 1.8;
            }
          }

          s.inBlindSpotNow = inBlindSpot;
          s.inDangerNow = inDanger;
          s.slowCarAhead = slowCarDetectado;

          // Limpiar peligros que ya salieron de pantalla
          s.hazards = s.hazards.filter((h) => h.y < height + 160);

          // Fin de corrida de 60 segundos
          if (s.timeLeft <= 0) {
            s.running = false;
            setDiagnosticoFinal(construirReporte());
            setEstadoSim('finalizado');
          }

          // Sincronización periódica del HUD React
          s.hudSyncAcc += dt;
          if (s.hudSyncAcc >= 0.08 || !s.running) {
            s.hudSyncAcc = 0;
            const estadoBarra = s.inBlindSpotNow
              ? 'punto_ciego'
              : s.inDangerNow || s.flashTimer > 0
              ? 'peligro'
              : 'seguro';
            const textoEstado =
              estadoBarra === 'punto_ciego'
                ? '¡EN PUNTO CIEGO!'
                : estadoBarra === 'peligro'
                ? 'Peligro Activo'
                : 'Colchón Seguro';

            setHud({
              tiempoRestante: Math.ceil(s.timeLeft),
              velocidad: Math.round(s.speed),
              posicion: s.targetPos,
              puntaje: Math.round(s.score),
              estadoBarra,
              textoEstado,
              alertaFlotante: s.alertText ? { texto: s.alertText, tipo: s.alertType } : null,
              puedeFiltrar: s.slowCarAhead,
              chequeosHombro: s.shoulderCount,
              cubriendoFrenos: s.braking,
            });
          }
        }

        ctx.save();
        ctx.scale(dpr, dpr);
        dibujarCanvas(ctx, width, height, simRef.current);
        ctx.restore();
      }
      rafRef.current = requestAnimationFrame(step);
    };

    lastTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [dibujarCanvas, construirReporte]);

  const copiarReporte = async () => {
    if (!diagnosticoFinal) return;
    const d = diagnosticoFinal;
    const texto = [
      `🏍️ REPORTE ENTRENADOR TÁCTICO 1-2-3 — MOTO APP`,
      `Puntaje Global: ${d.puntajeGlobal}% (${d.nivel.titulo})`,
      `• Tiempo fuera de Puntos Ciegos: ${d.metricas.fueraPuntosCiegos}%`,
      `• Peligros Anticipados (SEE): ${d.metricas.peligrosAnticipados}%`,
      `• Chequeos de Hombro realizados: ${d.metricas.chequeosHombro}`,
      `• Cumplimiento Legal VE (Decreto 8.495): ${d.metricas.cumplimientoLegal}%`,
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

  // Vista de Resultados y Telemetría Táctica
  if (estadoSim === 'finalizado' && diagnosticoFinal) {
    const { puntajeGlobal, nivel, metricas, alertas, recomendacion } = diagnosticoFinal;
    const radio = 54;
    const circunf = 2 * Math.PI * radio;
    const offset = circunf - (puntajeGlobal / 100) * circunf;

    const incidentes = [];
    if (alertas.segundosPuntoCiego > 1.2) {
      incidentes.push({
        critico: true,
        titulo: `Exposición en puntos ciegos (${alertas.segundosPuntoCiego}s)`,
        detalle: 'Evita permanecer al costado trasero de autos y camiones. Ajusta velocidad o usa Posición 3.',
      });
    }
    if (alertas.infracciones > 0) {
      incidentes.push({
        critico: true,
        titulo: `Intento de filtrar / adelantar indebido (${alertas.infracciones}x)`,
        detalle: 'Decreto N° 8.495 Art. 31 num. 1 y Art. 28 num. 11 prohíben circular entre canales o por la derecha.',
      });
    }
    if (alertas.puertas > 0) {
      incidentes.push({
        critico: true,
        titulo: `Riesgo en zona de puertas (${alertas.puertas}x)`,
        detalle: 'Ante autos estacionados a la derecha, ubícate en Posición 1 para conservar colchón lateral.',
      });
    }
    if (alertas.intersecciones > 0) {
      incidentes.push({
        critico: true,
        titulo: `Cruce rápido en intersección / paso peatonal (${alertas.intersecciones}x)`,
        detalle: 'Cubre frenos antes de cada intersección y cede siempre el paso al peatón (Art. 28 num. 2 y 3).',
      });
    }
    if (alertas.aceite > 0) {
      incidentes.push({
        critico: false,
        titulo: `Paso sobre mancha de aceite en Posición 2 (${alertas.aceite}x)`,
        detalle: 'Evita la franja central del carril; las huellas 1 y 3 brindan mayor adherencia.',
      });
    }

    return (
      <div className="space-y-5 animate-fadeIn">
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
                  stroke={nivel.colorStroke}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={circunf}
                  strokeDashoffset={offset}
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-slate-900 tabular-nums">
                  {puntajeGlobal}%
                </span>
                <span className="text-[11px] font-bold text-slate-400">Supervivencia</span>
              </div>
            </div>

            <div className="flex-1 text-center md:text-left space-y-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border ${nivel.badgeClass}`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>{nivel.badge}</span>
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">{nivel.titulo}</h2>
              <p className="text-sm text-slate-600 leading-relaxed">{nivel.descripcion}</p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* 4 Métricas Clave */}
          <section className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
              Telemetría Táctica de la Corrida
            </h3>
            <div className="space-y-4">
              {[
                {
                  label: 'Tiempo fuera de Puntos Ciegos',
                  valor: `${metricas.fueraPuntosCiegos}%`,
                  pct: metricas.fueraPuntosCiegos,
                  bar: 'bg-[#10B981]',
                },
                {
                  label: 'Peligros Anticipados (SEE)',
                  valor: `${metricas.peligrosAnticipados}%`,
                  pct: metricas.peligrosAnticipados,
                  bar: 'bg-[#2563EB]',
                },
                {
                  label: 'Cumplimiento Legal VE (Decreto N° 8.495)',
                  valor: `${metricas.cumplimientoLegal}%`,
                  pct: metricas.cumplimientoLegal,
                  bar: 'bg-indigo-600',
                },
                {
                  label: 'Chequeos de Hombro realizados (Tecla H)',
                  valor: `${metricas.chequeosHombro} chequeos`,
                  pct: Math.min(100, metricas.chequeosHombro * 20),
                  bar: 'bg-sky-500',
                },
              ].map((m) => (
                <div key={m.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <span className="font-bold text-slate-700">{m.label}</span>
                    <span className="font-extrabold text-slate-900 tabular-nums">{m.valor}</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${m.bar}`}
                      style={{ width: `${Math.max(4, m.pct)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Alertas + Recomendación Moto App */}
          <section className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {incidentes.length > 0 ? (
                  <ShieldAlert className="w-5 h-5 text-red-600" />
                ) : (
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                )}
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                  Observaciones de Seguridad
                </h3>
              </div>

              {incidentes.length > 0 ? (
                <ul className="space-y-2">
                  {incidentes.map((inc, idx) => (
                    <li
                      key={idx}
                      className={`p-3 rounded-xl border text-xs ${
                        inc.critico
                          ? 'bg-red-50 border-red-200 text-red-900'
                          : 'bg-amber-50 border-amber-200 text-amber-900'
                      }`}
                    >
                      <div className="font-extrabold flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>{inc.titulo}</span>
                      </div>
                      <p className="mt-1 opacity-90 leading-relaxed">{inc.detalle}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
                  <div className="font-extrabold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Corrida ejemplar sin incidencias críticas</span>
                  </div>
                  <p className="leading-relaxed">
                    Evitaste puntos ciegos, respetaste peatones e intersecciones y cumpliste la
                    normativa venezolana en todo momento.
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 rounded-xl bg-[#0F172A] text-white space-y-1.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Siguiente paso sugerido</span>
              </div>
              <div className="text-sm font-extrabold">{recomendacion.titulo}</div>
              <p className="text-xs text-slate-300 leading-relaxed">{recomendacion.detalle}</p>
            </div>
          </section>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-col sm:flex-row justify-end gap-3">
          <button
            type="button"
            onClick={copiarReporte}
            className={`py-3 px-5 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
              copiado
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
            }`}
          >
            {copiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copiado ? '¡Reporte copiado!' : 'Copiar Reporte'}</span>
          </button>

          <button
            type="button"
            onClick={iniciarCorrida}
            className="py-3 px-6 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-extrabold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Repetir Corrida</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Barra superior: Toggle Modo Radar SEE + Controles de Sesión */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setRadarSEE((v) => !v)}
            className={`py-2 px-3.5 rounded-xl text-xs font-extrabold flex items-center gap-2 border transition-all cursor-pointer ${
              radarSEE
                ? 'bg-blue-50 text-[#2563EB] border-blue-200'
                : 'bg-slate-900 text-slate-200 border-slate-800'
            }`}
          >
            {radarSEE ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            <span>Modo Radar SEE: {radarSEE ? 'ON' : 'OFF'}</span>
          </button>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            Teclas: <kbd className="font-bold">1 · 2 · 3</kbd> o <kbd className="font-bold">← →</kbd>{' '}
            carril · <kbd className="font-bold">Espacio</kbd> frenos ·{' '}
            <kbd className="font-bold">H</kbd> hombro
          </span>
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
                onClick={finalizarCorrida}
                className="py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Square className="w-3.5 h-3.5" />
                <span>Finalizar</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={iniciarCorrida}
              className="py-2 px-4 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Iniciar Corrida (60s)</span>
            </button>
          )}
        </div>
      </div>

      {/* HUD Superior Compacto */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5">
        <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-[#2563EB]" />
            <span>Cronómetro</span>
          </div>
          <div className="text-xl font-black text-slate-900 tabular-nums mt-0.5">
            {hud.tiempoRestante}s
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
            <Gauge className="w-3.5 h-3.5 text-sky-600" />
            <span>Velocidad</span>
          </div>
          <div className="text-xl font-black text-slate-900 tabular-nums mt-0.5">
            {hud.velocidad} <span className="text-xs font-bold text-slate-400">km/h</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500">Posición Carril</div>
          <div className="text-xl font-black text-[#2563EB] mt-0.5">
            Pos. {hud.posicion}{' '}
            <span className="text-xs font-bold text-slate-400">
              ({hud.posicion === 1 ? 'Izq' : hud.posicion === 2 ? 'Centro' : 'Der'})
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500">Supervivencia</div>
          <div className="text-xl font-black text-slate-900 tabular-nums mt-0.5">
            {hud.puntaje} <span className="text-xs font-bold text-slate-400">pts</span>
          </div>
        </div>

        <div
          className={`col-span-2 lg:col-span-1 rounded-2xl border p-3 shadow-xs flex flex-col justify-center transition-colors ${
            hud.estadoBarra === 'punto_ciego'
              ? 'bg-red-600 border-red-500 text-white animate-pulse'
              : hud.estadoBarra === 'peligro'
              ? 'bg-amber-500 border-amber-400 text-slate-950'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">Estado SEE</div>
          <div className="text-xs sm:text-sm font-black mt-0.5 truncate">{hud.textoEstado}</div>
        </div>
      </div>

      {/* Área Táctica Canvas 60fps */}
      <div className="relative bg-[#0F172A] rounded-2xl overflow-hidden border border-slate-800 shadow-md">
        <div ref={containerRef} className="w-full relative">
          <canvas ref={canvasRef} className="block w-full touch-none select-none" />

          {/* Alerta instantánea en la parte superior del canvas */}
          {hud.alertaFlotante && estadoSim === 'corriendo' && (
            <div
              role="alert"
              className={`absolute top-3 left-3 right-3 px-3.5 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-lg animate-fadeIn ${
                hud.alertaFlotante.tipo === 'danger'
                  ? 'bg-red-600/95 text-white border border-red-400'
                  : hud.alertaFlotante.tipo === 'success'
                  ? 'bg-emerald-600/95 text-white border border-emerald-400'
                  : 'bg-amber-500/95 text-slate-950 border border-amber-300'
              }`}
            >
              {hud.alertaFlotante.tipo === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span>{hud.alertaFlotante.texto}</span>
            </div>
          )}

          {/* Overlay Inicial */}
          {estadoSim === 'listo' && (
            <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-[2px] flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-5 text-center space-y-4 shadow-xl">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#2563EB] flex items-center justify-center mx-auto">
                  <Radar className="w-6 h-6" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-lg font-extrabold text-slate-900">
                    Simulador Urbano: Carril 1-2-3 &amp; Puntos Ciegos
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Durante <strong>60 segundos</strong> gestiona tu espacio de colchón: esquiva
                    manchas de aceite en Pos. 2, puertas en Pos. 3, sal de los{' '}
                    <strong className="text-red-600">conos rojos de punto ciego</strong> y cubre
                    frenos en intersecciones con peatones.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={iniciarCorrida}
                  className="w-full py-3.5 px-5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Comenzar Simulación</span>
                </button>
              </div>
            </div>
          )}

          {/* Overlay Pausa */}
          {estadoSim === 'pausado' && (
            <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-[2px] flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-5 max-w-xs w-full text-center space-y-3 shadow-xl">
                <h3 className="text-base font-extrabold text-slate-900">Simulador en Pausa</h3>
                <p className="text-xs text-slate-500">
                  Recuerda usar el Chequeo de Hombro (H) antes de cambiar de trazada.
                </p>
                <button
                  type="button"
                  onClick={togglePausa}
                  className="w-full py-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-sm cursor-pointer"
                >
                  Reanudar Corrida
                </button>
              </div>
            </div>
          )}

          {/* Overlay de Infracción Legal Detectada (Decreto 8.495) */}
          {estadoSim === 'infraccion' && modalInfraccion && (
            <div
              role="dialog"
              aria-modal="true"
              className="absolute inset-0 bg-slate-950/82 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
            >
              <div className="bg-white rounded-2xl border-2 border-red-500 max-w-md w-full p-5 space-y-3.5 shadow-2xl">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                    <Ban className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-red-600">
                      {modalInfraccion.articulo}
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                      {modalInfraccion.titulo}
                    </h3>
                  </div>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">{modalInfraccion.detalle}</p>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-medium leading-relaxed">
                  {modalInfraccion.solucion}
                </div>
                <button
                  type="button"
                  onClick={reanudarTrasInfraccion}
                  className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs sm:text-sm cursor-pointer"
                >
                  Entendido · Continuar cumpliendo la norma
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controles Ergonométricos Inferiores (Mobile-First + Escritorio) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-3">
        {/* 3 Botones grandes de Posición de Carril 1 · 2 · 3 */}
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { num: 1, label: '1 · Izq', sub: 'Visión / Puertas' },
            { num: 2, label: '2 · Centro', sub: 'Ojo con aceite' },
            { num: 3, label: '3 · Der', sub: 'Colchón camión' },
          ].map((btn) => {
            const activo = hud.posicion === btn.num;
            return (
              <button
                key={btn.num}
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault();
                  cambiarPosicion(btn.num);
                }}
                onContextMenu={(e) => e.preventDefault()}
                className={`py-3.5 px-2 rounded-xl border-2 text-center touch-none select-none transition-all cursor-pointer ${
                  activo
                    ? 'bg-[#2563EB] border-[#1D4ED8] text-white shadow-sm scale-[1.01]'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                }`}
              >
                <div className="text-sm font-black">{btn.label}</div>
                <div className={`text-[10px] font-semibold ${activo ? 'text-blue-100' : 'text-slate-400'}`}>
                  {btn.sub}
                </div>
              </button>
            );
          })}
        </div>

        {/* Fila de Acciones Defensivas y Prueba Legal */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              simRef.current.braking = true;
            }}
            onPointerUp={() => {
              simRef.current.braking = false;
            }}
            onPointerLeave={() => {
              simRef.current.braking = false;
            }}
            onPointerCancel={() => {
              simRef.current.braking = false;
            }}
            onContextMenu={(e) => e.preventDefault()}
            className={`py-3.5 px-4 rounded-xl border-2 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 touch-none select-none transition-colors cursor-pointer ${
              hud.cubriendoFrenos
                ? 'bg-red-600 border-red-700 text-white'
                : 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-900'
            }`}
          >
            <Hand className="w-4 h-4" />
            <span>Cubrir Frenos / Reducir</span>
          </button>

          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              ejecutarChequeoHombro();
            }}
            onContextMenu={(e) => e.preventDefault()}
            className="py-3.5 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 active:bg-[#10B981] active:text-white border-2 border-emerald-300 text-emerald-900 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 touch-none select-none transition-colors cursor-pointer"
          >
            <Eye className="w-4 h-4" />
            <span>Chequeo de Hombro ({hud.chequeosHombro})</span>
          </button>

          <button
            type="button"
            disabled={!hud.puedeFiltrar || estadoSim !== 'corriendo'}
            onClick={intentarFiltrar}
            className={`py-3.5 px-4 rounded-xl border-2 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
              hud.puedeFiltrar && estadoSim === 'corriendo'
                ? 'bg-red-50 hover:bg-red-600 hover:text-white border-red-400 text-red-700 cursor-pointer animate-pulse'
                : 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Ban className="w-4 h-4" />
            <span>
              {hud.puedeFiltrar ? 'Intentar filtrar (Trampa)' : 'Sin cola para filtrar'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
 * 6. COMPONENTE SVG CENITAL INTERACTIVO (REUTILIZABLE EN LAB Y DESAFÍO)
 * ============================================================================ */
function DiagramaTacticoSVG({
  escenarioId,
  posicionMoto = 2,
  interactivo = false,
  onSeleccionarPosicion = null,
  resaltarPosicion = null,
}) {
  // Coordenadas horizontales para las posiciones 1, 2, 3 en el carril derecho (x: 150..270)
  const posCoords = { 1: 170, 2: 210, 3: 250 };
  const motoX = posCoords[posicionMoto] || 210;
  const motoY = 205;

  return (
    <svg
      viewBox="0 0 340 260"
      className="w-full max-w-[440px] h-auto mx-auto rounded-2xl border border-slate-700 bg-[#0F172A] shadow-inner select-none"
      role="img"
      aria-label={`Diagrama táctico cenital de carril 1-2-3 para escenario ${escenarioId}`}
    >
      {/* Aceras laterales */}
      <rect x="0" y="0" width="38" height="260" fill="#1E293B" />
      <rect x="302" y="0" width="38" height="260" fill="#1E293B" />

      {/* Calzada principal: Carril izquierdo (38..148) + Carril derecho piloto (148..272) + Estacionamiento (272..302) */}
      <rect x="38" y="0" width="234" height="260" fill="#1E293B" />
      <rect x="272" y="0" width="30" height="260" fill="#172033" />

      {/* Intersección transversal si aplica */}
      {(escenarioId === 'interseccion' || escenarioId === 'peaton') && (
        <g>
          <rect x="0" y="28" width="340" height="86" fill="#273549" />
          {/* Paso peatonal */}
          {[154, 174, 194, 214, 234, 254].map((rx) => (
            <rect key={rx} x={rx} y="96" width="11" height="16" fill="#F8FAFC" opacity="0.82" />
          ))}
        </g>
      )}

      {/* Líneas de carril */}
      <line x1="148" y1="0" x2="148" y2="260" stroke="#E2E8F0" strokeWidth="2.5" strokeDasharray="14 12" />
      <line x1="272" y1="0" x2="272" y2="260" stroke="#F59E0B" strokeWidth="2" />

      {/* Sub-divisiones 1, 2, 3 */}
      <line x1="190" y1="0" x2="190" y2="260" stroke="#94A3B8" strokeWidth="1" strokeDasharray="5 7" opacity="0.35" />
      <line x1="230" y1="0" x2="230" y2="260" stroke="#94A3B8" strokeWidth="1" strokeDasharray="5 7" opacity="0.35" />

      {/* ====== ELEMENTOS ESPECÍFICOS POR ESCENARIO ====== */}
      {escenarioId === 'aceite' && (
        <g>
          <ellipse cx="210" cy="110" rx="18" ry="44" fill="#020617" stroke="#A855F7" strokeWidth="2" />
          <ellipse cx="210" cy="110" rx="24" ry="50" fill="none" stroke="#EF4444" strokeWidth="1.5" strokeDasharray="5 4" />
          <text x="210" y="52" textAnchor="middle" fill="#FCA5A5" fontSize="9.5" fontWeight="bold">
            FRANJA DE ACEITE (POS. 2)
          </text>
        </g>
      )}

      {escenarioId === 'siguiendo' && (
        <g>
          {/* Auto delantero en carril derecho */}
          <rect x="176" y="42" width="68" height="72" rx="10" fill="#64748B" stroke="#CBD5E1" strokeWidth="1.5" />
          <rect x="184" y="54" width="52" height="14" rx="3" fill="#0F172A" />
          <rect x="184" y="92" width="52" height="12" rx="3" fill="#0F172A" />
          {/* Cono de visibilidad del espejo lateral izquierdo (Pos. 1) */}
          <polygon points="176,68 152,215 190,215" fill="#10B981" fillOpacity="0.24" stroke="#10B981" strokeDasharray="4 4" />
          {/* Cono de retrovisor central (Pos. 2) */}
          <polygon points="210,114 192,215 228,215" fill="#F59E0B" fillOpacity="0.16" />
          {/* Zona menos vigilada derecha (Pos. 3) */}
          <polygon points="244,82 232,215 270,215" fill="#EF4444" fillOpacity="0.22" />
          <text x="210" y="32" textAnchor="middle" fill="#E2E8F0" fontSize="9.5" fontWeight="bold">
            VER Y SER VISTO EN RETROVISOR
          </text>
        </g>
      )}

      {escenarioId === 'estacionados' && (
        <g>
          {/* Dos carros estacionados a la derecha */}
          <rect x="275" y="42" width="26" height="68" rx="6" fill="#64748B" />
          <rect x="275" y="132" width="26" height="68" rx="6" fill="#475569" stroke="#F8FAFC" strokeWidth="1" />
          {/* Puerta abriéndose */}
          <line x1="275" y1="150" x2="246" y2="168" stroke="#EF4444" strokeWidth="4.5" strokeLinecap="round" />
          {/* Arco de impacto de puerta sobre Pos. 3 */}
          <path d="M 275 150 L 236 150 A 38 38 0 0 0 275 188 Z" fill="#EF4444" fillOpacity="0.30" stroke="#EF4444" strokeDasharray="4 3" />
          <text x="210" y="28" textAnchor="middle" fill="#FCA5A5" fontSize="9.5" fontWeight="bold">
            RADIO DE PUERTAS EN POSICIÓN 3
          </text>
        </g>
      )}

      {escenarioId === 'camion' && (
        <g>
          {/* Camión grande en carril izquierdo */}
          <rect x="58" y="44" width="76" height="134" rx="7" fill="#475569" stroke="#CBD5E1" strokeWidth="1.5" />
          <rect x="66" y="52" width="60" height="20" rx="3" fill="#0F172A" />
          <text x="96" y="122" textAnchor="middle" fill="#CBD5E1" fontSize="10" fontWeight="bold">
            CAMIÓN
          </text>
          {/* Cono masivo de punto ciego cubriendo Pos 1 y Pos 2 */}
          <polygon
            points="134,82 228,120 228,238 134,194"
            fill="#EF4444"
            fillOpacity="0.34"
            stroke="#EF4444"
            strokeWidth="1.5"
            strokeDasharray="5 4"
          />
          <text x="184" y="158" textAnchor="middle" fill="#FECACA" fontSize="9" fontWeight="bold">
            PUNTO CIEGO
          </text>
          <text x="184" y="170" textAnchor="middle" fill="#FECACA" fontSize="8.5" fontWeight="bold">
            + RÁFAGAS
          </text>
        </g>
      )}

      {escenarioId === 'interseccion' && (
        <g>
          {/* Vehículo amarillo girando a la izquierda frente a la moto */}
          <g transform="translate(94, 62) rotate(32)">
            <rect x="-24" y="-15" width="48" height="30" rx="7" fill="#F59E0B" stroke="#FEF08A" strokeWidth="1.5" />
            <rect x="6" y="-10" width="10" height="20" fill="#0F172A" />
          </g>
          {/* Trayectoria peligrosa de giro */}
          <path
            d="M 118 74 Q 186 84 265 66"
            fill="none"
            stroke="#EF4444"
            strokeWidth="3.5"
            strokeDasharray="6 5"
          />
          <polygon points="274,64 260,59 262,73" fill="#EF4444" />
          <text x="170" y="20" textAnchor="middle" fill="#FDE68A" fontSize="9.5" fontWeight="bold">
            AUTO AMARILLO GIRA CRUZANDO TU VÍA
          </text>
        </g>
      )}

      {escenarioId === 'peaton' && (
        <g>
          {/* Auto detenido en carril izquierdo cediendo paso */}
          <rect x="62" y="118" width="66" height="68" rx="9" fill="#3B82F6" stroke="#93C5FD" strokeWidth="1.5" />
          <rect x="68" y="180" width="16" height="5" fill="#EF4444" />
          <rect x="106" y="180" width="16" height="5" fill="#EF4444" />
          <text x="95" y="156" textAnchor="middle" fill="#FFF" fontSize="8.5" fontWeight="bold">
            DETENIDO
          </text>
          {/* Peatón cruzando frente al auto */}
          <circle cx="176" cy="104" r="8" fill="#38BDF8" stroke="#FFFFFF" strokeWidth="2" />
          <path d="M 134 104 L 222 104" stroke="#38BDF8" strokeWidth="2" strokeDasharray="4 4" />
          <text x="170" y="20" textAnchor="middle" fill="#7DD3FC" fontSize="9.5" fontWeight="bold">
            PEATÓN CRUZANDO (ART. 28 NUM. 2 Y 3)
          </text>
        </g>
      )}

      {escenarioId === 'hombro' && (
        <g>
          {/* Auto oculto en punto ciego izquierdo de la moto */}
          <rect x="64" y="176" width="64" height="66" rx="9" fill="#EF4444" stroke="#FCA5A5" strokeWidth="1.5" />
          <text x="96" y="213" textAnchor="middle" fill="#FFF" fontSize="8.5" fontWeight="bold">
            EN TU PUNTO
          </text>
          <text x="96" y="224" textAnchor="middle" fill="#FFF" fontSize="8.5" fontWeight="bold">
            CIEGO
          </text>
          {/* Flecha de chequeo de hombro */}
          <path d="M 166 202 Q 140 206 130 212" fill="none" stroke="#10B981" strokeWidth="3" strokeDasharray="4 3" />
          <text x="170" y="28" textAnchor="middle" fill="#6EE7B7" fontSize="9.5" fontWeight="bold">
            CHEQUEO DE HOMBRO ANTES DE CAMBIAR
          </text>
        </g>
      )}

      {escenarioId === 'paralelo' && (
        <g>
          {/* Carro ocupando el mismo carril derecho */}
          <rect x="158" y="150" width="62" height="74" rx="9" fill="#64748B" stroke="#CBD5E1" strokeWidth="1.5" />
          <rect x="228" y="168" width="34" height="46" rx="8" fill="#EF4444" fillOpacity="0.28" stroke="#EF4444" strokeDasharray="4 3" />
          <text x="245" y="194" textAnchor="middle" fill="#FCA5A5" fontSize="14" fontWeight="bold">
            ✕
          </text>
          <text x="170" y="28" textAnchor="middle" fill="#FCA5A5" fontSize="9.5" fontWeight="bold">
            PROHIBIDO IR EN PARALELO (ART. 31 NUM. 2)
          </text>
        </g>
      )}

      {escenarioId === 'filtrar' && (
        <g>
          <rect x="64" y="106" width="64" height="72" rx="9" fill="#64748B" />
          <rect x="174" y="106" width="68" height="72" rx="9" fill="#64748B" />
          <rect x="134" y="96" width="32" height="92" rx="6" fill="#EF4444" fillOpacity="0.32" stroke="#EF4444" strokeDasharray="4 3" />
          <text x="150" y="146" textAnchor="middle" fill="#FECACA" fontSize="16" fontWeight="bold">
            ✕
          </text>
          <text x="170" y="28" textAnchor="middle" fill="#FCA5A5" fontSize="9.5" fontWeight="bold">
            PROHIBIDO FILTRAR ENTRE CANALES (ART. 31 NUM. 1)
          </text>
        </g>
      )}

      {escenarioId === 'adelantar' && (
        <g>
          <rect x="176" y="108" width="66" height="72" rx="9" fill="#64748B" />
          {/* Ruta reglamentaria por la izquierda */}
          <path d="M 176 218 Q 100 184 96 130 Q 98 72 178 48" fill="none" stroke="#10B981" strokeWidth="4" strokeLinecap="round" />
          <polygon points="186,46 172,42 175,55" fill="#10B981" />
          <text x="170" y="24" textAnchor="middle" fill="#6EE7B7" fontSize="9.5" fontWeight="bold">
            ADELANTAR POR CARRIL LIBRE IZQUIERDO (ART. 28 NUM. 12)
          </text>
        </g>
      )}

      {/* Círculos numerados 1, 2, 3 clicables sobre el asfalto */}
      {[1, 2, 3].map((num) => {
        const cx = posCoords[num];
        const cy = 236;
        const esActiva = posicionMoto === num;
        const esResaltada = resaltarPosicion === num;
        return (
          <g
            key={num}
            onClick={() => interactivo && onSeleccionarPosicion && onSeleccionarPosicion(num)}
            className={interactivo ? 'cursor-pointer' : ''}
          >
            <circle
              cx={cx}
              cy={cy}
              r={esActiva || esResaltada ? 15 : 13}
              fill={esResaltada ? '#10B981' : esActiva ? '#2563EB' : '#0F172A'}
              stroke={esResaltada ? '#A7F3D0' : esActiva ? '#93C5FD' : '#64748B'}
              strokeWidth="2"
            />
            <text
              x={cx}
              y={cy + 4}
              textAnchor="middle"
              fill="#FFFFFF"
              fontSize="11"
              fontWeight="bold"
            >
              {num}
            </text>
          </g>
        );
      })}

      {/* Motocicleta posicionada en 1, 2 o 3 */}
      {escenarioId !== 'paralelo' && (
        <g transform={`translate(${motoX}, ${motoY})`}>
          {/* Haz de luz delantera */}
          <polygon points="-4,-18 -18,-56 18,-56 4,-18" fill="#FEF08A" fillOpacity="0.28" />
          {/* Moto */}
          <rect x="-4" y="-18" width="8" height="12" rx="3" fill="#020617" />
          <rect x="-4.5" y="8" width="9" height="12" rx="3" fill="#020617" />
          <line x1="-12" y1="-7" x2="12" y2="-7" stroke="#CBD5E1" strokeWidth="3" strokeLinecap="round" />
          <rect x="-6" y="-10" width="12" height="20" rx="5" fill="#2563EB" />
          <circle cx="0" cy="0" r="6.5" fill="#F8FAFC" stroke="#1D4ED8" strokeWidth="1.8" />
        </g>
      )}
    </svg>
  );
}

/* ============================================================================
 * 7. PESTAÑA 2: LABORATORIO 1-2-3 (DIAGRAMA SVG INTERACTIVO)
 * ============================================================================ */
function LaboratorioCarril123() {
  const [escenarioIdx, setEscenarioIdx] = useState(0);
  const [posicion, setPosicion] = useState(1);

  const escenario = ESCENARIOS_LAB[escenarioIdx];
  const evaluacion = escenario.posiciones[posicion];

  const badgeEstilo =
    evaluacion.estado === 'optima'
      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
      : evaluacion.estado === 'aceptable'
      ? 'bg-amber-50 border-amber-300 text-amber-950'
      : 'bg-red-50 border-red-300 text-red-950';

  const pillColor =
    evaluacion.estado === 'optima'
      ? 'bg-[#10B981] text-white'
      : evaluacion.estado === 'aceptable'
      ? 'bg-[#F59E0B] text-slate-950'
      : 'bg-[#EF4444] text-white';

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Selector de los 5 escenarios tácticos */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
            Selecciona un escenario urbano (5 casos reales)
          </h2>
          <span className="text-xs font-semibold text-slate-400">
            Toca 1, 2 o 3 en el asfalto
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          {ESCENARIOS_LAB.map((esc, idx) => {
            const activo = idx === escenarioIdx;
            return (
              <button
                key={esc.id}
                type="button"
                onClick={() => {
                  setEscenarioIdx(idx);
                  setPosicion(2); // Colocamos en centro para invitar al usuario a explorar
                }}
                className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                  activo
                    ? 'bg-blue-50 border-[#2563EB] shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#2563EB]">
                  {idx + 1}. {esc.etiqueta}
                </div>
                <div className="text-xs font-bold text-slate-900 mt-0.5 leading-snug">
                  {esc.titulo}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Zona Interactiva: SVG + Panel de Evaluación Técnica/Legal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <section className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="space-y-1">
            <h3 className="text-base font-extrabold text-slate-900">{escenario.titulo}</h3>
            <p className="text-xs text-slate-500">{escenario.resumen}</p>
          </div>

          <DiagramaTacticoSVG
            escenarioId={escenario.id}
            posicionMoto={posicion}
            interactivo={true}
            onSeleccionarPosicion={setPosicion}
          />

          {/* Botones táctiles equivalentes a los círculos 1-2-3 */}
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((num) => {
              const info = escenario.posiciones[num];
              const activa = posicion === num;
              const dot =
                info.estado === 'optima'
                  ? 'bg-[#10B981]'
                  : info.estado === 'aceptable'
                  ? 'bg-[#F59E0B]'
                  : 'bg-[#EF4444]';
              return (
                <button
                  key={num}
                  type="button"
                  onClick={() => setPosicion(num)}
                  className={`py-3 px-2 rounded-xl border-2 text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    activa
                      ? 'bg-[#0F172A] border-[#2563EB] text-white'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${dot}`} />
                  <span>
                    Pos. {num} ({num === 1 ? 'Izq' : num === 2 ? 'Cen' : 'Der'})
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Tarjeta de Diagnóstico Inmediato */}
        <section className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className={`p-4 rounded-2xl border-2 space-y-2.5 transition-all ${badgeEstilo}`}>
              <div className="flex items-center justify-between gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-black ${pillColor}`}>
                  {evaluacion.estado === 'optima'
                    ? 'POSICIÓN ÓPTIMA'
                    : evaluacion.estado === 'aceptable'
                    ? 'CON PRECAUCIÓN'
                    : 'POSICIÓN PELIGROSA'}
                </span>
                {evaluacion.estado === 'optima' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : evaluacion.estado === 'aceptable' ? (
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
              </div>

              <h4 className="text-base font-extrabold">{evaluacion.titulo}</h4>
              <p className="text-xs sm:text-sm leading-relaxed">{evaluacion.explicacion}</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#2563EB] flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5" />
                <span>Base Técnica MSF &amp; Marco Legal Venezolano</span>
              </div>
              <p className="text-xs text-slate-700 font-semibold leading-relaxed">
                {evaluacion.cita}
              </p>
            </div>
          </div>

          {/* Resumen comparativo rápido de las 3 posiciones */}
          <div className="p-4 rounded-xl bg-[#0F172A] text-white space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-sky-400">
              Principio del Colchón de Espacio (SEE)
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              No existe una única posición fija para todo el recorrido. El piloto evalúa cada 12
              segundos y cambia suavemente entre <strong>1, 2 y 3</strong> para ver, ser visto y
              mantener siempre una ruta de escape.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

/* ============================================================================
 * 8. PESTAÑA 3: DESAFÍO TÁCTICO (8 ESCENARIOS DECISIVOS CON DIAGRAMA)
 * ============================================================================ */
function DesafioTactico({ onIrASimulador }) {
  const [preguntasActivas, setPreguntasActivas] = useState(DESAFIO_PREGUNTAS);
  const [indice, setIndice] = useState(0);
  const [respuestaId, setRespuestaId] = useState(null);
  const [aciertos, setAciertos] = useState(0);
  const [racha, setRacha] = useState(0);
  const [rachaMax, setRachaMax] = useState(0);
  const [falladas, setFalladas] = useState([]);
  const [terminado, setTerminado] = useState(false);

  const pregunta = preguntasActivas[indice];
  const respondida = Boolean(respuestaId);
  const esCorrecta = respondida && respuestaId === pregunta.correctaId;

  const elegir = (opcionId) => {
    if (respondida) return;
    setRespuestaId(opcionId);
    if (opcionId === pregunta.correctaId) {
      setAciertos((a) => a + 1);
      setRacha((r) => {
        const nueva = r + 1;
        setRachaMax((m) => Math.max(m, nueva));
        return nueva;
      });
    } else {
      setRacha(0);
      setFalladas((prev) => [...prev, pregunta]);
    }
  };

  const siguiente = () => {
    if (indice < preguntasActivas.length - 1) {
      setIndice((i) => i + 1);
      setRespuestaId(null);
    } else {
      setTerminado(true);
    }
  };

  const reiniciar = (soloFalladas = false) => {
    const nuevoSet = soloFalladas && falladas.length > 0 ? falladas : DESAFIO_PREGUNTAS;
    setPreguntasActivas(nuevoSet);
    setIndice(0);
    setRespuestaId(null);
    setAciertos(0);
    setRacha(0);
    setRachaMax(0);
    setFalladas([]);
    setTerminado(false);
  };

  if (terminado) {
    const pct = Math.round((aciertos / preguntasActivas.length) * 100);
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5 animate-fadeIn">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-blue-50 text-[#2563EB] border border-blue-200">
              <Award className="w-3.5 h-3.5" />
              <span>Desafío Táctico Finalizado</span>
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
              Resultado: {pct}% ({aciertos} de {preguntasActivas.length} aciertos)
            </h2>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-center shrink-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
              Mejor Racha
            </div>
            <div className="text-xl font-black text-amber-900 flex items-center justify-center gap-1">
              <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>{rachaMax}</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <span>Dominio táctico (MSF + Decreto N° 8.495)</span>
            <span className="text-slate-900">{pct}%</span>
          </div>
          <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                pct >= 80 ? 'bg-[#10B981]' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.max(5, pct)}%` }}
            />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#0F172A] text-white text-xs sm:text-sm leading-relaxed">
          {pct >= 85
            ? 'Excelente criterio táctico y legal. Pon a prueba estos reflejos en tiempo real en el Simulador en Vivo o agenda tu próxima sesión práctica en Moto App.'
            : 'Refuerza los escenarios fallados antes de tu próxima clínica práctica para consolidar el posicionamiento 1-2-3 y la normativa venezolana.'}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {falladas.length > 0 && (
            <button
              type="button"
              onClick={() => reiniciar(true)}
              className="flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reintentar solo falladas ({falladas.length})</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => reiniciar(false)}
            className="flex-1 py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-800 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Repetir los 8 escenarios</span>
          </button>
          <button
            type="button"
            onClick={onIrASimulador}
            className="flex-1 py-3 px-4 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-extrabold text-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Ir al Simulador en Vivo</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Barra superior de progreso y racha */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-blue-50 text-[#2563EB] text-xs font-extrabold border border-blue-200">
            Escenario {indice + 1} / {preguntasActivas.length}
          </span>
          <span className="text-xs font-bold text-slate-500 hidden sm:inline">
            {pregunta.categoria}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-50 text-amber-800 border border-amber-200">
            <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>Racha {racha}</span>
          </span>
          <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-slate-100 text-slate-800">
            {aciertos} pts
          </span>
        </div>
      </div>

      {/* Tarjeta de Escenario Visual */}
      <article className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
          {/* Diagrama SVG */}
          <div className="lg:col-span-5">
            <DiagramaTacticoSVG
              escenarioId={pregunta.diagrama}
              posicionMoto={respondida ? pregunta.resaltadoCorrecto : 2}
              resaltarPosicion={respondida ? pregunta.resaltadoCorrecto : null}
            />
          </div>

          {/* Enunciado y opciones */}
          <div className="lg:col-span-7 space-y-4">
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug">
              {pregunta.pregunta}
            </h2>

            <div className="space-y-2.5">
              {pregunta.opciones.map((op, i) => {
                const letra = ['A', 'B', 'C'][i];
                const elegida = respuestaId === op.id;
                const correcta = op.id === pregunta.correctaId;

                let estilos =
                  'bg-white border-slate-200 hover:border-[#2563EB] hover:bg-blue-50/40 text-slate-800';
                let letraStyle = 'bg-slate-100 text-slate-600 border-slate-200';

                if (respondida) {
                  if (correcta) {
                    estilos = 'bg-emerald-50 border-emerald-500 text-emerald-950';
                    letraStyle = 'bg-[#10B981] text-white border-[#10B981]';
                  } else if (elegida && !correcta) {
                    estilos = 'bg-red-50 border-red-500 text-red-950';
                    letraStyle = 'bg-[#EF4444] text-white border-[#EF4444]';
                  } else {
                    estilos = 'bg-slate-50 border-slate-200 text-slate-400 opacity-70';
                  }
                }

                return (
                  <button
                    key={op.id}
                    type="button"
                    disabled={respondida}
                    onClick={() => elegir(op.id)}
                    className={`w-full p-3.5 rounded-xl border-2 text-left flex items-center gap-3 transition-all ${
                      respondida ? 'cursor-default' : 'cursor-pointer active:scale-[0.995]'
                    } ${estilos}`}
                  >
                    <span
                      className={`w-7 h-7 rounded-lg border text-xs font-extrabold flex items-center justify-center shrink-0 ${letraStyle}`}
                    >
                      {letra}
                    </span>
                    <span className="text-xs sm:text-sm font-semibold leading-snug flex-1">
                      {op.texto}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Feedback inmediato con cita exacta */}
        {respondida && (
          <div
            className={`rounded-2xl border p-4 space-y-3 animate-fadeIn ${
              esCorrecta
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : 'bg-red-50 border-red-200 text-red-950'
            }`}
          >
            <div className="flex items-center gap-2 font-extrabold text-sm">
              {esCorrecta ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              <span>
                {esCorrecta ? '¡Decisión táctica correcta!' : 'Atención: revisa la maniobra segura'}
              </span>
            </div>

            <p className="text-xs sm:text-sm leading-relaxed">{pregunta.explicacion}</p>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-white/90 border border-slate-200 text-slate-700">
                <FileText className="w-3.5 h-3.5 text-[#2563EB] shrink-0" />
                <span>{pregunta.cita}</span>
              </div>

              <button
                type="button"
                onClick={siguiente}
                className="py-2.5 px-5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs sm:text-sm font-extrabold inline-flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                <span>
                  {indice < preguntasActivas.length - 1 ? 'Siguiente escenario' : 'Ver resumen final'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </article>
    </div>
  );
}

/* ============================================================================
 * 9. COMPONENTE RAÍZ CON NAVEGACIÓN EN 3 PESTAÑAS
 * ============================================================================ */
function EntrenadorTacticoApp() {
  const [tab, setTab] = useState('simulador'); // 'simulador' | 'laboratorio' | 'desafio'

  const tabs = [
    { id: 'simulador', label: 'Simulador en Vivo', short: 'Simulador', icon: Radar },
    { id: 'laboratorio', label: 'Laboratorio 1-2-3', short: 'Lab 1-2-3', icon: Compass },
    { id: 'desafio', label: 'Desafío Táctico', short: 'Desafío (8)', icon: Target },
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

      {/* Header compacto Moto App */}
      <header className="sticky top-0 z-30 bg-[#0F172A] text-white border-b border-slate-800 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 pt-3.5 pb-3 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] flex items-center justify-center shadow-md shrink-0">
                <Bike className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-white truncate">
                  Entrenador Táctico de Carril (1-2-3) y Puntos Ciegos
                </h1>
                <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                  Moto App · Estrategia SEE (MSF) &amp; Decreto N° 8.495
                </p>
              </div>
            </div>
          </div>

          {/* Navegación en 3 pestañas */}
          <nav
            role="tablist"
            aria-label="Secciones del Entrenador Táctico de Carril"
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

      {/* Contenido principal */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-5">
        {tab === 'simulador' && <SimuladorEnVivoCarril />}
        {tab === 'laboratorio' && <LaboratorioCarril123 />}
        {tab === 'desafio' && <DesafioTactico onIrASimulador={() => setTab('simulador')} />}
      </main>

      {/* Pie informativo */}
      <footer className="max-w-5xl w-full mx-auto px-4 py-4 text-center text-[11px] text-slate-400 flex flex-wrap items-center justify-center gap-1.5">
        <Info className="w-3.5 h-3.5" />
        <span>
          Módulo interactivo Moto App · Manual del Operador de la Motocicleta (MSF Ed. 17) y
          Reglamento Parcial de Motocicletas (Decreto N° 8.495).
        </span>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <EntrenadorTacticoApp />
    </ErrorBoundary>
  );
}