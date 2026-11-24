import React, { useState, useEffect, useMemo, useCallback, useRef, useContext, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../context/AppContextValue';
import { useToast } from '../shared/components/ToastProvider';
import LegalFooter from '../shared/components/LegalFooter';
import { cargarEvaluacionVial, cargarHistorialEvaluacionVial, etiquetaModo, guardarEvaluacionVial } from './evaluacionVialService';

// Clave local del reto. La clave legacy se lee una vez para no perder el último resultado.
const CLAVE_EVALUACION = 'motoapp_eval_ultimo';
const CLAVE_EVALUACION_LEGACY = 'motoescuela_eval_ultimo';
// Historial local para anónimos (los estudiantes con sesión usan Firestore).
const CLAVE_HISTORIAL = 'motoapp_eval_historial';
const MAX_HISTORIAL_LOCAL = 5;
import {
  Scale,
  Compass,
  BookOpen,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Flame,
  Clock,
  Award,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Copy,
  Check,
  Layers,
  Sparkles,
  Target,
  ArrowRight,
  ArrowLeft,
  X,
  Play,
  GraduationCap,
  ChevronDown,
  ChevronUp,
  User,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Home,
  FileText,
  Zap,
  Info,
} from 'lucide-react';

// Emulados (simuladores interactivos) cargados bajo demanda: no pesan en la carga inicial.
const EmuladoCarril = React.lazy(() => import('./entrenador_t_ctico_de_carril_1_2_3_y_puntos_ciegos.tsx'));
const EmuladoTclocs = React.lazy(() => import('./inspector_visual_t_clocs_360.tsx'));
const EmuladoSlpr = React.lazy(() => import('./simulador_de_inclinaci_n_y_contramanillar_slpr.tsx'));
const EmuladoCabina = React.lazy(() => import('./cabina_controles_sin_mirar.tsx'));

const EMULADOS = [
  {
    id: 'carril',
    titulo: 'Carril 1-2-3 y puntos ciegos',
    resumen: 'Simulador en vivo, laboratorio de posiciones y desafío táctico de 8 casos.',
    detalle: 'SEE · 3 sub-tabs',
    icono: Target,
    accent: 'bg-blue-50 text-[#2563EB] border-blue-200',
    Componente: EmuladoCarril,
  },
  {
    id: 'tclocs',
    titulo: 'Inspector visual T-CLOCS 360',
    resumen: 'Recorrido guiado por las 7 áreas de inspección antes de rodar.',
    detalle: '7 áreas · checklist',
    icono: ShieldCheck,
    accent: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Componente: EmuladoTclocs,
  },
  {
    id: 'slpr',
    titulo: 'Inclinación y contramanillar',
    resumen: 'Curvas en vivo con inclinación, postura y reto de contramanillar.',
    detalle: 'SLPR · giroscopio',
    icono: Zap,
    accent: 'bg-indigo-50 text-[#4F46E5] border-indigo-200',
    Componente: EmuladoSlpr,
  },
  {
    id: 'cabina',
    titulo: 'Cabina: controles sin mirar',
    resumen: 'Explora los mandos, reto de memoria y postura sin mirar el manubrio.',
    detalle: 'Explorar · reto · postura',
    icono: Compass,
    accent: 'bg-amber-50 text-amber-700 border-amber-200',
    Componente: EmuladoCabina,
  },
];

/* ============================================================================
 * 1. COMPONENTE DE LÍMITE DE ERRORES (ERROR BOUNDARY)
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
    console.error('Error en Evaluación Vial:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F1F5F9] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6 max-w-md w-full text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">
              Ocurrió un inconveniente inesperado
            </h2>
            <p className="text-sm text-slate-600 mb-5">
              Puedes reiniciar el módulo o volver al contenido formativo sin perder tu acceso.
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => this.setState({ hasError: false })}
                className="w-full py-3 px-4 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-semibold transition-colors"
              >
                Reintentar módulo
              </button>
              <button
                type="button"
                onClick={() => {
                  if (typeof this.props.onSalir === 'function') this.props.onSalir();
                  else window.location.assign('/teorico');
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition-colors"
              >
                Volver
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ============================================================================
 * 2. CONSTANTES, METADATOS DE EJES Y BANCO DE 16 PREGUNTAS VERIFICADO
 * ============================================================================ */
const EJES_CONFIG = {
  marco_legal: {
    id: 'marco_legal',
    label: 'Marco Legal y Documentación (VE)',
    shortLabel: 'Marco Legal VE',
    pilar: 'ley_ve',
    colorBar: 'bg-[#4F46E5]',
    colorBg: 'bg-indigo-50',
    colorText: 'text-[#4F46E5]',
    colorBorder: 'border-indigo-200',
  },
  circulacion_ve: {
    id: 'circulacion_ve',
    label: 'Normas de Circulación y Prohibiciones (VE)',
    shortLabel: 'Circulación VE',
    pilar: 'ley_ve',
    colorBar: 'bg-violet-600',
    colorBg: 'bg-violet-50',
    colorText: 'text-violet-700',
    colorBorder: 'border-violet-200',
  },
  control_tecnico: {
    id: 'control_tecnico',
    label: 'Control Técnico y Maniobras (MSF)',
    shortLabel: 'Control Técnico',
    pilar: 'tecnica_msf',
    colorBar: 'bg-[#2563EB]',
    colorBg: 'bg-blue-50',
    colorText: 'text-[#2563EB]',
    colorBorder: 'border-blue-200',
  },
  manejo_defensivo: {
    id: 'manejo_defensivo',
    label: 'Manejo Defensivo y Gestión de Riesgos (SEE)',
    shortLabel: 'Manejo Defensivo',
    pilar: 'tecnica_msf',
    colorBar: 'bg-sky-600',
    colorBg: 'bg-sky-50',
    colorText: 'text-sky-700',
    colorBorder: 'border-sky-200',
  },
};

const BANCO_PREGUNTAS = [
  // ================= LEY VENEZOLANA — EJE: marco_legal =================
  {
    id: 'Q1',
    pilar: 'ley_ve',
    eje: 'marco_legal',
    temaCorto: 'Documentación obligatoria y licencia',
    pregunta:
      '¿Qué grado de licencia de conducir y documentos básicos debe portar obligatoriamente un conductor de motocicleta en Venezuela?',
    opciones: [
      { id: 'a', texto: 'Solo licencia de 3er grado y cédula de identidad.' },
      {
        id: 'b',
        texto:
          'Licencia de 2do grado vigente, certificado médico de salud integral, cédula, certificado de circulación, póliza de responsabilidad civil y carnet único de motociclista.',
      },
      { id: 'c', texto: 'Licencia de 1er grado y factura de compra de la moto.' },
      { id: 'd', texto: 'Solo la póliza de responsabilidad civil y el certificado de registro.' },
    ],
    correctaId: 'b',
    fuente: 'Decreto N° 8.495 (Art. 30) y Ordenanza Caroní (Art. 21)',
    explicacion:
      'El Art. 30 del Reglamento Parcial de Motocicletas (Decreto 8.495) exige portar licencia vigente (2do grado), certificado médico integral, certificado psicológico si aplica, cédula, certificado de circulación, RCV vigente y Carnet único de motociclistas.',
    riesgoCritico: false,
    diagrama: 'escudo_ve',
  },
  {
    id: 'Q2',
    pilar: 'ley_ve',
    eje: 'marco_legal',
    temaCorto: 'Jerarquía normativa (Pirámide de Kelsen)',
    pregunta:
      'Según la Pirámide de Kelsen Vial en Venezuela, si una Ordenanza Municipal contradice lo dispuesto en la Ley de Transporte Terrestre (LTT de 2008), ¿qué norma prevalece?',
    opciones: [
      { id: 'a', texto: 'Prevalece siempre la Ordenanza Municipal por ser norma local.' },
      {
        id: 'b',
        texto:
          'Prevalece la Ley de Transporte Terrestre (rango legal nacional), ya que ninguna norma inferior puede contradecir a una superior.',
      },
      { id: 'c', texto: 'Ambas se anulan hasta nueva reforma del INTT.' },
      {
        id: 'd',
        texto: 'Prevalece la que haya sido publicada más recientemente sin importar su jerarquía.',
      },
    ],
    correctaId: 'b',
    fuente: 'Jerarquía Normativa Vial (CRBV y LTT G.O. N° 38.985)',
    explicacion:
      'En la jerarquía normativa venezolana, la CRBV ocupa el Nivel 1, las Leyes Nacionales (LTT 2008) el Nivel 2, los Reglamentos (Decreto 8.495 y Decreto 2.542) el Nivel 3 y las Ordenanzas Municipales el Nivel 6. Ninguna norma inferior puede contradecir una superior.',
    riesgoCritico: false,
    diagrama: 'kelsen_ve',
  },
  {
    id: 'Q3',
    pilar: 'ley_ve',
    eje: 'marco_legal',
    temaCorto: 'Derechos en puntos de control / alcabalas',
    pregunta:
      'De acuerdo con la Resolución Conjunta sobre Puntos de Control / Alcabalas (G.O. N° 42.458 de 2022), ¿qué derecho tiene el ciudadano durante un procedimiento policial o militar?',
    opciones: [
      { id: 'a', texto: 'Negarse a mostrar su documentación vehicular.' },
      {
        id: 'b',
        texto:
          'Derecho a grabar procedimientos policiales o militares (Art. 20), en resguardo del debido proceso.',
      },
      { id: 'c', texto: 'Retirarse del punto de control sin autorización si lleva prisa.' },
      { id: 'd', texto: 'Circular sin placas si está en trámite administrativo.' },
    ],
    correctaId: 'b',
    fuente: 'Resolución Conjunta MPPRIJP N° 109 / MPPD N° 041391 (Art. 20) y CRBV Art. 49',
    explicacion:
      'La Resolución Conjunta de 2022 regula la supervisión en alcabalas y reconoce expresamente en su Art. 20 el derecho ciudadano a grabar procedimientos policiales o militares, en concordancia con el debido proceso (Art. 49 CRBV).',
    riesgoCritico: false,
    diagrama: 'escudo_ve',
  },
  {
    id: 'Q4',
    pilar: 'ley_ve',
    eje: 'marco_legal',
    temaCorto: 'Colores reglamentarios del chaleco reflectivo',
    pregunta:
      '¿Qué colores de chaleco reflectivo establece el Art. 28 del Decreto N° 8.495 para motos de uso privado/comercial y para moto taxis?',
    opciones: [
      { id: 'a', texto: 'Rojo para uso privado y negro para moto taxis.' },
      {
        id: 'b',
        texto:
          'Verde oliva con franjas retroflectivas grises (uso privado, comercial o deportivo) y anaranjado con franjas grises (moto taxis).',
      },
      { id: 'c', texto: 'Amarillo para uso privado y verde para uso oficial.' },
      { id: 'd', texto: 'Cualquier color oscuro mientras tenga cintas blancas.' },
    ],
    correctaId: 'b',
    fuente: 'Reglamento Parcial de Motocicletas, Decreto N° 8.495 (Art. 28 num. 6)',
    explicacion:
      'El Art. 28.6 define: verde oliva para privadas/comerciales/deportivas, anaranjado para moto taxis, azul para oficial/gubernamental y amarillo para militar/policial, todos con franjas retroflectivas grises.',
    riesgoCritico: false,
    diagrama: 'escudo_ve',
  },

  // ================= LEY VENEZOLANA — EJE: circulacion_ve =================
  {
    id: 'Q5',
    pilar: 'ley_ve',
    eje: 'circulacion_ve',
    temaCorto: 'Pasajeros vulnerables y límite de equipaje',
    pregunta:
      'Según el Art. 31 (Prohibición Especial) del Decreto N° 8.495, ¿quiénes tienen expresamente prohibido viajar como pasajeros en motocicleta y cuál es el límite máximo de equipaje?',
    opciones: [
      { id: 'a', texto: 'Menores de 5 años y equipaje mayor a 30 kg.' },
      {
        id: 'b',
        texto:
          'Niños menores de 10 años, mujeres embarazadas y adultos mayores de 60 años; equipaje máximo de 15 kg (y nunca delante del conductor).',
      },
      { id: 'c', texto: 'Solo mujeres embarazadas; no existe límite de peso de equipaje.' },
      { id: 'd', texto: 'Menores de 12 años y máximo 25 kg de equipaje.' },
    ],
    correctaId: 'b',
    fuente: 'Decreto N° 8.495, Art. 10 y Art. 31 (numerales 6, 7, 8 y 9)',
    explicacion:
      'La capacidad máxima es de 2 personas (incluyendo al conductor). Está prohibido transportar menores de 10 años, mujeres embarazadas, adultos mayores de 60 años y equipaje que supere 15 kg o se ubique delante del conductor.',
    riesgoCritico: true,
    diagrama: 'escudo_ve',
  },
  {
    id: 'Q6',
    pilar: 'ley_ve',
    eje: 'circulacion_ve',
    temaCorto: 'Prohibición de circular entre canales / zigzag',
    pregunta:
      '¿Cuál de las siguientes maniobras está expresamente PROHIBIDA para motociclistas según el Art. 31 del Decreto N° 8.495?',
    opciones: [
      {
        id: 'a',
        texto:
          'Circular entre canales, circular paralelo a otro vehículo en el mismo canal o cambiar frecuentemente de canal.',
      },
      { id: 'b', texto: 'Adelantar por el carril izquierdo usando las luces de cruce.' },
      { id: 'c', texto: 'Mantener las luces delanteras y traseras encendidas durante el día.' },
      { id: 'd', texto: 'Ceder el paso al peatón en un cruce peatonal.' },
    ],
    correctaId: 'a',
    fuente: 'Decreto N° 8.495, Art. 28, Art. 31 (numerales 1, 2 y 3) y Art. 32',
    explicacion:
      'La normativa prohíbe circular entre canales, ir en paralelo con otro vehículo en el mismo canal y zigzaguear cambiando continuamente de carril. El adelantamiento debe hacerse por la izquierda con direccionales.',
    riesgoCritico: true,
    diagrama: 'riderradar',
  },
  {
    id: 'Q7',
    pilar: 'ley_ve',
    eje: 'circulacion_ve',
    temaCorto: 'Impacto del casco homologado y abrochado',
    pregunta:
      'Según los criterios de la OMS citados en el estudio de mortalidad vial en Venezuela, ¿en qué porcentaje reduce el riesgo de muerte y de lesiones graves usar un casco integral/homologado y debidamente abrochado?',
    opciones: [
      { id: 'a', texto: 'Reduce la muerte en 10% y lesiones graves en 20%.' },
      {
        id: 'b',
        texto:
          'Reduce el riesgo de muerte en más de un 40% y el riesgo de lesiones graves en casi un 70%.',
      },
      { id: 'c', texto: 'Solo evita multas, no tiene impacto medible en lesiones graves.' },
      { id: 'd', texto: 'Reduce la muerte en 25% y solo aplica en autopistas.' },
    ],
    correctaId: 'b',
    fuente: 'Estudio Mortalidad en Motos Venezuela (Rísquez et al., 2023 / OMS) y COVENIN 1707:2014',
    explicacion:
      'Un casco homologado y correctamente abrochado reduce el riesgo de muerte en más de 40% y el de lesiones graves en casi 70%. Además, en Venezuela el grupo etario con mayor tasa de mortalidad en moto es de 20 a 24 años (97,9 por 100.000).',
    riesgoCritico: true,
    diagrama: 'casco_oms',
  },
  {
    id: 'Q8',
    pilar: 'ley_ve',
    eje: 'circulacion_ve',
    temaCorto: 'Capacidad de frenado y espejos obligatorios',
    pregunta:
      'Según el Art. 9 del Decreto N° 8.495 sobre equipamiento obligatorio, ¿qué capacidad mínima debe tener el sistema de frenos de una motocicleta y cuántos espejos retrovisores exige?',
    opciones: [
      { id: 'a', texto: 'Detenerse en 15 metros a 50 km/h y 1 espejo izquierdo.' },
      {
        id: 'b',
        texto:
          'Detenerse en 5 metros circulando a 30 km/h y contar con dos (2) espejos retrovisores (derecho e izquierdo).',
      },
      { id: 'c', texto: 'Detenerse en 10 metros a 30 km/h; los espejos son opcionales en ciudad.' },
      { id: 'd', texto: 'Solo freno trasero funcional y 1 espejo panorámico.' },
    ],
    correctaId: 'b',
    fuente: 'Decreto N° 8.495, Art. 9 (numerales 3 y 6)',
    explicacion:
      'El Art. 9 exige un sistema de frenos capaz de detener la moto en 5 metros a 30 km/h, dos espejos retrovisores (uno a cada lado), faro delantero con alcance de 150 m, luz roja trasera visible a 100 m y silenciador de escape.',
    riesgoCritico: false,
    diagrama: 'escudo_ve',
  },

  // ================= TÉCNICAS DE MANEJO MSF — EJE: control_tecnico =================
  {
    id: 'Q9',
    pilar: 'tecnica_msf',
    eje: 'control_tecnico',
    temaCorto: 'Secuencia SLPR para tomar curvas',
    pregunta:
      '¿Cuál es la secuencia correcta de los 4 pasos (SLPR) del Manual MSF para tomar una curva de manera segura y controlada?',
    opciones: [
      {
        id: 'a',
        texto: 'Acelerar → Frenar dentro de la curva → Inclinar hombros → Soltar manubrio.',
      },
      {
        id: 'b',
        texto:
          'Disminuir velocidad (Slow) antes de la curva → Observar (Look) hacia la salida → Presionar (Press) el manubrio hacia el lado de la curva → Girar (Roll) suavemente el acelerador.',
      },
      {
        id: 'c',
        texto: 'Presionar el freno delantero a mitad de curva → Mirar la rueda delantera → Acelerar fuerte.',
      },
      {
        id: 'd',
        texto: 'Girar el cuerpo contrario a la curva a alta velocidad y cortar el acelerador al salir.',
      },
    ],
    correctaId: 'b',
    fuente: 'Manual del Operador de la Motocicleta MSF Ed. 17 — Vueltas (SLPR)',
    explicacion:
      'SLPR: (1) Disminuye velocidad ANTES de entrar, (2) Observa la salida girando solo cabeza y ojos alineados al horizonte, (3) Presiona el mango del lado hacia donde giras (contramanillar), (4) Gira suavemente el acelerador para estabilizar la suspensión.',
    riesgoCritico: true,
    diagrama: 'slpr',
  },
  {
    id: 'Q10',
    pilar: 'tecnica_msf',
    eje: 'control_tecnico',
    temaCorto: 'Postura corporal y mirada en curvas',
    pregunta:
      'Al tomar una curva, ¿cómo debe posicionar la cabeza, hombros y cuerpo un motociclista según el Manual MSF?',
    opciones: [
      {
        id: 'a',
        texto: 'Voltear la cabeza y los hombros juntos manteniendo los brazos completamente rígidos.',
      },
      {
        id: 'b',
        texto:
          'Voltear solo la cabeza y los ojos hacia donde se dirige (alineados al horizonte), brazos ligeramente doblados y rodillas pegadas al tanque.',
      },
      {
        id: 'c',
        texto: 'Mantener la vista fija 2 metros delante de la rueda delantera y separar las rodillas del tanque.',
      },
      { id: 'd', texto: 'Inclinar el cuerpo hacia afuera en todas las curvas de alta velocidad.' },
    ],
    correctaId: 'b',
    fuente: 'Manual MSF Ed. 17 — Autoevaluación 3 y Control Básico del Vehículo',
    explicacion:
      'Debe voltear solo la cabeza y los ojos hacia la dirección deseada (no los hombros), con brazos ligeramente flexionados. En vueltas normales el cuerpo y la moto se inclinan juntos; en vueltas lentas y cerradas se usa contrapeso (cuerpo derecho, solo se inclina la moto).',
    riesgoCritico: false,
    diagrama: 'slpr',
  },
  {
    id: 'Q11',
    pilar: 'tecnica_msf',
    eje: 'control_tecnico',
    temaCorto: 'Aproximación a 90° sobre obstáculos inevitables',
    pregunta:
      'Si un obstáculo en la vía es inevitable y debe pasar por encima de él, ¿cuál es la técnica correcta según el Manual MSF?',
    opciones: [
      { id: 'a', texto: 'Frenar bruscamente justo encima del obstáculo e inclinar la moto a 45 grados.' },
      {
        id: 'b',
        texto:
          'Bajar velocidad antes del contacto, acercarse a 90° con la moto derecha, levantarse ligeramente sobre los estribos y dar un ligero toque de acelerador justo antes del impacto.',
      },
      { id: 'c', texto: 'Acelerar al máximo sentado firmemente en el asiento para pasar rápido.' },
      { id: 'd', texto: 'Soltar el acelerador y bloquear la rueda trasera al subir al obstáculo.' },
    ],
    correctaId: 'b',
    fuente: 'Manual MSF Ed. 17 — Pasar sobre obstáculos',
    explicacion:
      'Baje la velocidad al máximo antes, alinee la moto derecha a 90°, levántese levemente para que rodillas y codos absorban el golpe y gire suavemente el acelerador justo antes del contacto para aligerar la rueda delantera.',
    riesgoCritico: true,
    diagrama: 'obstaculo',
  },
  {
    id: 'Q12',
    pilar: 'tecnica_msf',
    eje: 'control_tecnico',
    temaCorto: 'Inspección previa a rodar T-CLOCS',
    pregunta: '¿Qué significa la sigla T-CLOCS en el Manual MSF y cuál es su propósito?',
    opciones: [
      { id: 'a', texto: 'Un código de multas internacionales para motos de alto cilindraje.' },
      {
        id: 'b',
        texto:
          'Una lista de inspección previa a manejar (Llantas/Ruedas, Controles, Luces, Fluidos, Chasis/Suspensión/Cadena y Soportes) para evitar fallas mecánicas en ruta.',
      },
      { id: 'c', texto: 'Un estilo de conducción deportiva en pistas cerradas.' },
      { id: 'd', texto: 'Un tipo de freno combinado obligatorio en motocicletas de tres ruedas.' },
    ],
    correctaId: 'b',
    fuente: 'Manual MSF Ed. 17 — T-CLOCS: Lista de Inspección Previa a Manejar',
    explicacion:
      'T-CLOCS permite revisar sistemáticamente la moto antes de salir: Tires (llantas), Controls (controles), Lights (luces), Oil/Fluids (fluidos), Chassis (armazón, suspensión, cadena, tornillos) y Stands (soportes de paro).',
    riesgoCritico: false,
    diagrama: 'tclocs',
  },

  // ================= TÉCNICAS DE MANEJO MSF — EJE: manejo_defensivo =================
  {
    id: 'Q13',
    pilar: 'tecnica_msf',
    eje: 'manejo_defensivo',
    temaCorto: 'Estrategia SEE y RiderRadar (12 segundos)',
    pregunta:
      '¿Qué representa la estrategia SEE de la MSF y con cuántos segundos de anticipación debe analizar el camino por delante?',
    opciones: [
      { id: 'a', texto: 'Seguir, Esquivar y Estacionar; mirando 3 segundos por delante.' },
      {
        id: 'b',
        texto:
          'Buscar (Search), Evaluar (Evaluate) y Ejecutar (Execute); analizando el camino de los próximos 12 segundos con el RiderRadar.',
      },
      { id: 'c', texto: 'Señalizar, Encender luces y Empujar; mirando solo el espejo retrovisor.' },
      { id: 'd', texto: 'Subir marcha, Estabilizar y Evitar frenos; mirando 5 segundos por delante.' },
    ],
    correctaId: 'b',
    fuente: 'Manual MSF Ed. 17 — Estrategia SEE y RiderRadar (pág. 22-23)',
    explicacion:
      'SEE (Buscar, Evaluar, Ejecutar) entrena el análisis proactivo del tráfico con 12 segundos de anticipación para detectar rutas de escape, separar peligros ("un paso a la vez") y cubrir clutch y ambos frenos en intersecciones, escuelas o zonas de obra.',
    riesgoCritico: true,
    diagrama: 'riderradar',
  },
  {
    id: 'Q14',
    pilar: 'tecnica_msf',
    eje: 'manejo_defensivo',
    temaCorto: 'Visera resistente al impacto y visibilidad',
    pregunta:
      'Según las Autoevaluaciones 1 y 7 del Manual MSF sobre equipo de protección y visibilidad, ¿qué afirmación es correcta?',
    opciones: [
      {
        id: 'a',
        texto:
          'Una visera plástica resistente al impacto solo protege los ojos y la ropa reflejante solo sirve de noche.',
      },
      {
        id: 'b',
        texto:
          'Una visera de plástico resistente al impacto ayuda a proteger toda la cara, y la ropa reflejante debe usarse tanto de día como de noche.',
      },
      { id: 'c', texto: 'Si la moto tiene parabrisas no se necesita visera ni protección ocular.' },
      { id: 'd', texto: 'La ropa reflejante está desaconsejada durante el día porque distrae.' },
    ],
    correctaId: 'b',
    fuente: 'Manual MSF Ed. 17 — Autoevaluaciones 1 y 7',
    explicacion:
      'El parabrisas no sustituye la visera; una visera resistente al impacto protege toda la cara (mejor que goggles) y la ropa de alta visibilidad/reflejante aumenta la detección del motociclista tanto de día como de noche.',
    riesgoCritico: false,
    diagrama: 'casco_oms',
  },
  {
    id: 'Q15',
    pilar: 'tecnica_msf',
    eje: 'manejo_defensivo',
    temaCorto: 'Familiarización con una moto nueva',
    pregunta:
      'Según la Autoevaluación 2 del Manual MSF, ¿qué característica comparten más de la mitad de todos los choques de motocicleta?',
    opciones: [
      { id: 'a', texto: 'Ocurren únicamente de noche a más de 100 km/h.' },
      { id: 'b', texto: 'Son causados principalmente por llantas desgastadas en autopista.' },
      {
        id: 'c',
        texto: 'Involucran a conductores que han manejado sus motocicletas por menos de cinco (5) meses.',
      },
      { id: 'd', texto: 'Suceden exclusivamente cuando llevan pasajero.' },
    ],
    correctaId: 'c',
    fuente: 'Manual MSF Ed. 17 — Autoevaluación 2',
    explicacion:
      'Más de la mitad de los choques involucran a conductores con menos de 5 meses usando esa motocicleta, lo que demuestra por qué el entrenamiento formal y familiarizarse con los controles salvan vidas.',
    riesgoCritico: false,
    diagrama: 'tclocs',
  },
  {
    id: 'Q16',
    pilar: 'tecnica_msf',
    eje: 'manejo_defensivo',
    temaCorto: 'Reacción segura ante animales en la vía',
    pregunta:
      'Si mientras conduces una motocicleta un perro comienza a perseguirte, ¿cuál es la acción recomendada por el Manual MSF?',
    opciones: [
      { id: 'a', texto: 'Darle una patada para alejarlo rápidamente.' },
      { id: 'b', texto: 'Detenerse por completo hasta que el animal pierda interés.' },
      {
        id: 'c',
        texto:
          'Aproximarse lentamente al animal (cambiando el ritmo) y después acelerar para dejarlo atrás.',
      },
      { id: 'd', texto: 'Esquivar bruscamente hacia el carril contrario sin mirar atrás.' },
    ],
    correctaId: 'c',
    fuente: 'Manual MSF Ed. 17 — Autoevaluación 11',
    explicacion:
      'Reducir la velocidad al acercarte rompe el punto de intercepción que calcula el perro; al acelerar justo al pasar, te alejas con control sin perder estabilidad ni invadir otros carriles.',
    riesgoCritico: false,
    diagrama: 'riderradar',
  },
];

/* ============================================================================
 * 3. CÁPSULAS DE REPASO (6 FLASHCARDS INTERACTIVAS)
 * ============================================================================ */
const FLASHCARDS = [
  {
    id: 'fc-1',
    categoria: 'Legislación Vial VE',
    pilar: 'ley_ve',
    titulo: 'Pirámide de Kelsen Vial en Venezuela',
    subtitulo: 'Orden estricto de prelación jurídica',
    frentePregunta: '¿Qué norma prevalece cuando dos instrumentos viales se contradicen?',
    puntosClave: [
      'Nivel 1 (Supremacía): Constitución (CRBV 1999 — Art. 49 Debido Proceso, Art. 50 Libre Tránsito).',
      'Nivel 2 (Rango Legal): Ley de Transporte Terrestre (LTT 2008, G.O. 38.985), Código Penal y Código Civil.',
      'Nivel 3 (Sublegal): Reglamento Parcial de Motocicletas (Dec. 8.495 / 2011) y Reglamento 1998 (en lo vigente).',
      'Nivel 4–6: Resoluciones Alcabalas (G.O. 42.458 / Art. 20 grabar procedimientos), MVDUCT / COVENIN y Ordenanzas Municipales.',
    ],
    nota: 'Regla de oro: Ninguna ordenanza municipal o resolución puede contradecir a la LTT o a la CRBV.',
    diagrama: 'kelsen_ve',
  },
  {
    id: 'fc-2',
    categoria: 'Legislación Vial VE',
    pilar: 'ley_ve',
    titulo: 'Documentos Obligatorios (Art. 30)',
    subtitulo: 'Decreto N° 8.495 — Requisitos al conducir',
    frentePregunta: '¿Qué documentos y equipamiento debes portar siempre al circular en moto?',
    puntosClave: [
      'Licencia de conducir de 2do grado vigente y Cédula de identidad vigente.',
      'Certificado médico de salud integral vigente (y psicológico si aplica).',
      'Certificado de circulación vigente y Póliza de Responsabilidad Civil (RCV) vigente.',
      'Carnet único de motociclista + Casco integral/homologado (COVENIN 1707) + Chaleco reflectivo (verde oliva privado / naranja moto taxi).',
    ],
    nota: 'Además, Art. 9 exige 2 espejos retrovisores, luces encendidas siempre y frenos capaces de parar en 5 m a 30 km/h.',
    diagrama: 'escudo_ve',
  },
  {
    id: 'fc-3',
    categoria: 'Legislación Vial VE',
    pilar: 'ley_ve',
    titulo: 'Prohibiciones Clave (Art. 31)',
    subtitulo: 'Seguridad de ocupantes y conducta en vía',
    frentePregunta: '¿Cuáles son las prohibiciones críticas que protegen tu vida y evitan sanciones?',
    puntosClave: [
      'Máximo 2 personas (incluyendo conductor). Prohibido llevar menores de 10 años, embarazadas o mayores de 60 años.',
      'Equipaje máximo de 15 kg y NUNCA delante del conductor ni impidiendo visibilidad.',
      'Prohibido circular entre canales, ir en paralelo en el mismo canal o zigzaguear continuamente.',
      'Prohibido usar celular o auriculares, escape libre o conducir bajo efectos de alcohol/sustancias.',
    ],
    nota: 'Un casco homologado y abrochado reduce el riesgo de muerte en >40% y lesiones graves en casi 70% (OMS).',
    diagrama: 'casco_oms',
  },
  {
    id: 'fc-4',
    categoria: 'Técnica MSF Ed. 17',
    pilar: 'tecnica_msf',
    titulo: 'Técnica de Curvas SLPR',
    subtitulo: 'Control preciso en curvas normales y cerradas',
    frentePregunta: '¿Cuáles son los 4 pasos obligatorios para negociar cualquier curva?',
    puntosClave: [
      'S — Slow (Disminuir): Reduce la velocidad ANTES de entrar en la curva con ambos frenos si hace falta.',
      'L — Look (Observar): Voltea solo cabeza y ojos hacia la salida, alineados al horizonte (sin girar hombros).',
      'P — Press (Presionar): Empuja el mango del lado hacia donde giras (contramanillar) para inclinar la moto.',
      'R — Roll (Girar): Aplica acelerador suave y constante para estabilizar la suspensión al trazar la curva.',
    ],
    nota: 'Curva normal: cuerpo y moto se inclinan juntos. Vuelta lenta y cerrada: usa contrapeso (cuerpo derecho, inclina solo la moto).',
    diagrama: 'slpr',
  },
  {
    id: 'fc-5',
    categoria: 'Técnica MSF Ed. 17',
    pilar: 'tecnica_msf',
    titulo: 'Estrategia SEE y RiderRadar 12s',
    subtitulo: 'Gestión proactiva del riesgo en el tráfico',
    frentePregunta: '¿Cómo anticipar peligros antes de que se conviertan en un choque?',
    puntosClave: [
      'S — Search (Buscar): Escanea el camino de los próximos 12 segundos (intersecciones, superficie, espejos).',
      'E — Evaluate (Evaluar): Identifica peligros y sepáralos para enfrentarlos "uno a la vez".',
      'E — Execute (Ejecutar): Ajusta velocidad, elige la mejor posición de carril (1, 2 o 3) y comunica intenciones.',
      'Espacio de Colchón: Cubre freno y clutch en zonas críticas y evita permanecer en puntos ciegos.',
    ],
    nota: 'Más del 50% de choques ocurren a conductores con menos de 5 meses usando esa motocicleta.',
    diagrama: 'riderradar',
  },
  {
    id: 'fc-6',
    categoria: 'Técnica MSF Ed. 17',
    pilar: 'tecnica_msf',
    titulo: 'Inspección Previa T-CLOCS',
    subtitulo: 'Checklist de 2 minutos antes de rodar',
    frentePregunta: '¿Qué 6 sistemas mecánicos debes verificar antes de encender y salir?',
    puntosClave: [
      'T — Tires (Llantas/Ruedas): Presión, dibujo, grietas, rines y rodamientos.',
      'C — Controls (Controles): Manetas, pedales, cables de acelerador/clutch sin atascos y mangueras.',
      'L — Lights (Luces/Eléctrico): Faro delantero, luz trasera, luz de freno, direccionales, claxon y espejos.',
      'O-C-S — Oil (Fluidos), Chassis (Suspensión, cadena, tornillos) y Stands (Soportes de paro y resortes).',
    ],
    nota: 'Complementa T-CLOCS con obstáculos: si no puedes esquivar, reduce velocidad, entra a 90° de pie en estribos y da un toque suave de acelerador.',
    diagrama: 'tclocs',
  },
];

/* ============================================================================
 * 4. MICRO-ILUSTRACIONES SVG CONTEXTUALES (SIN DEPENDENCIAS EXTERNAS)
 * ============================================================================ */
function MicroIlustracion({ tipo }) {
  switch (tipo) {
    case 'slpr':
      return (
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex flex-col sm:flex-row items-center gap-3">
          <svg
            viewBox="0 0 220 96"
            className="w-full max-w-[220px] h-24 shrink-0"
            role="img"
            aria-label="Diagrama técnico de curva SLPR"
          >
            {/* Calzada en curva */}
            <path
              d="M 18 84 Q 30 22 128 18 L 204 18"
              fill="none"
              stroke="#CBD5E1"
              strokeWidth="28"
              strokeLinecap="round"
            />
            <path
              d="M 18 84 Q 30 22 128 18 L 204 18"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2"
              strokeDasharray="6 5"
            />
            {/* Trayectoria ideal */}
            <path
              d="M 24 84 Q 36 28 128 22 L 198 22"
              fill="none"
              stroke="#2563EB"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {/* Flecha salida */}
            <polygon points="203,22 193,17 193,27" fill="#10B981" />
            {/* Puntos S-L-P-R */}
            <circle cx="24" cy="76" r="9" fill="#EF4444" />
            <text x="24" y="79.5" textAnchor="middle" fill="#FFF" fontSize="9" fontWeight="bold">
              S
            </text>
            <circle cx="48" cy="40" r="9" fill="#F59E0B" />
            <text x="48" y="43.5" textAnchor="middle" fill="#FFF" fontSize="9" fontWeight="bold">
              L
            </text>
            <circle cx="96" cy="24" r="9" fill="#2563EB" />
            <text x="96" y="27.5" textAnchor="middle" fill="#FFF" fontSize="9" fontWeight="bold">
              P
            </text>
            <circle cx="158" cy="22" r="9" fill="#10B981" />
            <text x="158" y="25.5" textAnchor="middle" fill="#FFF" fontSize="9" fontWeight="bold">
              R
            </text>
          </svg>
          <div className="text-xs text-slate-600 space-y-1 text-center sm:text-left">
            <div className="font-bold text-slate-800 uppercase tracking-wide text-[11px]">
              Referencia Visual — Secuencia SLPR
            </div>
            <p className="leading-relaxed">
              <span className="font-semibold text-red-600">S</span> Disminuir antes ·{' '}
              <span className="font-semibold text-amber-600">L</span> Observar salida ·{' '}
              <span className="font-semibold text-blue-600">P</span> Presionar manubrio ·{' '}
              <span className="font-semibold text-emerald-600">R</span> Girar acelerador suave
            </p>
          </div>
        </div>
      );

    case 'obstaculo':
      return (
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex flex-col sm:flex-row items-center gap-3">
          <svg
            viewBox="0 0 220 90"
            className="w-full max-w-[220px] h-[88px] shrink-0"
            role="img"
            aria-label="Diagrama de aproximación a 90 grados sobre obstáculo"
          >
            {/* Vía */}
            <rect x="8" y="10" width="204" height="70" rx="8" fill="#E2E8F0" />
            {/* Obstáculo */}
            <rect x="115" y="16" width="16" height="58" rx="3" fill="#F59E0B" stroke="#B45309" strokeWidth="1.5" />
            {/* Línea de aproximación 90 grados */}
            <line x1="28" y1="45" x2="188" y2="45" stroke="#2563EB" strokeWidth="3" strokeDasharray="5 4" />
            <polygon points="196,45 184,39 184,51" fill="#2563EB" />
            {/* Símbolo ángulo 90 */}
            <polyline points="103,45 103,33 115,33" fill="none" stroke="#10B981" strokeWidth="2" />
            <text x="95" y="29" fill="#047857" fontSize="10" fontWeight="bold">
              90°
            </text>
            {/* Silueta moto top-down */}
            <rect x="44" y="39" width="28" height="12" rx="6" fill="#0F172A" />
            <line x1="65" y1="33" x2="65" y2="57" stroke="#0F172A" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <div className="text-xs text-slate-600 space-y-1 text-center sm:text-left">
            <div className="font-bold text-slate-800 uppercase tracking-wide text-[11px]">
              Referencia Visual — Obstáculo Inevitable
            </div>
            <p className="leading-relaxed">
              Aproxímate perpendicularmente a <span className="font-semibold text-emerald-700">90°</span>,
              moto erguida, peso en los estribos y leve aceleración previa al contacto.
            </p>
          </div>
        </div>
      );

    case 'riderradar':
      return (
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex flex-col sm:flex-row items-center gap-3">
          <svg
            viewBox="0 0 220 96"
            className="w-full max-w-[220px] h-24 shrink-0"
            role="img"
            aria-label="Diagrama RiderRadar 12 segundos y 3 posiciones de carril"
          >
            {/* Carril */}
            <rect x="20" y="8" width="180" height="80" rx="8" fill="#E2E8F0" />
            {/* 3 subcarriles */}
            <line x1="20" y1="34" x2="200" y2="34" stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="5 5" />
            <line x1="20" y1="62" x2="200" y2="62" stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="5 5" />
            {/* Cono de visión 12 segundos */}
            <path d="M 55 48 L 195 14 L 195 82 Z" fill="#2563EB" fillOpacity="0.16" />
            {/* Moto */}
            <rect x="30" y="42" width="26" height="12" rx="6" fill="#0F172A" />
            {/* Etiquetas 1, 2, 3 */}
            <circle cx="176" cy="21" r="8" fill="#2563EB" />
            <text x="176" y="24.5" textAnchor="middle" fill="#FFF" fontSize="9" fontWeight="bold">1</text>
            <circle cx="176" cy="48" r="8" fill="#2563EB" />
            <text x="176" y="51.5" textAnchor="middle" fill="#FFF" fontSize="9" fontWeight="bold">2</text>
            <circle cx="176" cy="75" r="8" fill="#2563EB" />
            <text x="176" y="78.5" textAnchor="middle" fill="#FFF" fontSize="9" fontWeight="bold">3</text>
            {/* Texto 12s */}
            <rect x="92" y="38" width="48" height="20" rx="10" fill="#10B981" />
            <text x="116" y="51.5" textAnchor="middle" fill="#FFF" fontSize="10" fontWeight="bold">
              12 seg
            </text>
          </svg>
          <div className="text-xs text-slate-600 space-y-1 text-center sm:text-left">
            <div className="font-bold text-slate-800 uppercase tracking-wide text-[11px]">
              RiderRadar &amp; Posiciones de Carril (1 · 2 · 3)
            </div>
            <p className="leading-relaxed">
              Mantén tu <span className="font-semibold text-blue-700">espacio de colchón</span>, analiza el
              tráfico a 12 s y evita puntos ciegos y circulación entre canales.
            </p>
          </div>
        </div>
      );

    case 'kelsen_ve':
      return (
        <div className="bg-indigo-50/60 border border-indigo-200/70 rounded-xl p-3 flex flex-col sm:flex-row items-center gap-3">
          <svg
            viewBox="0 0 180 92"
            className="w-full max-w-[180px] h-[88px] shrink-0"
            role="img"
            aria-label="Pirámide de Kelsen Vial en Venezuela"
          >
            <polygon points="90,6 64,28 116,28" fill="#4F46E5" />
            <text x="90" y="24" textAnchor="middle" fill="#FFF" fontSize="8" fontWeight="bold">CRBV</text>
            <polygon points="62,31 118,31 134,51 46,51" fill="#6366F1" />
            <text x="90" y="44" textAnchor="middle" fill="#FFF" fontSize="8" fontWeight="bold">LTT 2008 / Leyes</text>
            <polygon points="44,54 136,54 152,72 28,72" fill="#818CF8" />
            <text x="90" y="66" textAnchor="middle" fill="#FFF" fontSize="7.5" fontWeight="bold">Dec. 8.495 / Regl. 98</text>
            <polygon points="26,75 154,75 168,89 12,89" fill="#A5B4FC" />
            <text x="90" y="85" textAnchor="middle" fill="#1E1B4B" fontSize="7.5" fontWeight="bold">Resol. / MVDUCT / Ordenanzas</text>
          </svg>
          <div className="text-xs text-slate-700 space-y-1 text-center sm:text-left">
            <div className="font-bold text-[#4F46E5] uppercase tracking-wide text-[11px]">
              Pirámide de Kelsen Vial (VE)
            </div>
            <p className="leading-relaxed">
              Prevalece siempre la norma de mayor jerarquía: Constitución → Leyes Nacionales →
              Reglamentos → Resoluciones → Ordenanzas.
            </p>
          </div>
        </div>
      );

    case 'casco_oms':
      return (
        <div className="bg-emerald-50/60 border border-emerald-200/70 rounded-xl p-3 flex flex-col sm:flex-row items-center gap-3">
          <svg
            viewBox="0 0 180 86"
            className="w-full max-w-[180px] h-20 shrink-0"
            role="img"
            aria-label="Protección de casco integral homologado"
          >
            {/* Casco estilizado */}
            <path
              d="M 48 64 C 44 30, 74 14, 108 18 C 134 22, 144 40, 140 60 L 116 64 L 112 52 L 88 52 L 84 64 Z"
              fill="#0F172A"
            />
            {/* Visera */}
            <path d="M 102 28 L 138 34 C 140 42, 138 48, 134 50 L 98 46 Z" fill="#38BDF8" />
            {/* Badge porcentaje */}
            <rect x="8" y="12" width="52" height="22" rx="6" fill="#10B981" />
            <text x="34" y="26.5" textAnchor="middle" fill="#FFF" fontSize="9.5" fontWeight="bold">
              -40% muerte
            </text>
            <rect x="8" y="42" width="52" height="22" rx="6" fill="#2563EB" />
            <text x="34" y="56.5" textAnchor="middle" fill="#FFF" fontSize="9" fontWeight="bold">
              -70% graves
            </text>
          </svg>
          <div className="text-xs text-slate-700 space-y-1 text-center sm:text-left">
            <div className="font-bold text-emerald-800 uppercase tracking-wide text-[11px]">
              Protección Craneofacial — OMS / COVENIN 1707
            </div>
            <p className="leading-relaxed">
              Casco integral homologado, debidamente abrochado y visera resistente al impacto protegen
              toda la cara y salvan vidas.
            </p>
          </div>
        </div>
      );

    case 'tclocs':
      return (
        <div className="bg-blue-50/60 border border-blue-200/70 rounded-xl p-3 flex flex-col sm:flex-row items-center gap-3">
          <div className="grid grid-cols-6 gap-1.5 shrink-0">
            {[
              { l: 'T', t: 'Llantas' },
              { l: 'C', t: 'Control' },
              { l: 'L', t: 'Luces' },
              { l: 'O', t: 'Fluidos' },
              { l: 'C', t: 'Chasis' },
              { l: 'S', t: 'Soportes' },
            ].map((item, idx) => (
              <div
                key={idx}
                className="w-10 h-11 rounded-lg bg-white border border-blue-200 flex flex-col items-center justify-center shadow-sm"
              >
                <span className="text-sm font-extrabold text-[#2563EB] leading-none">{item.l}</span>
                <span className="text-[8px] font-medium text-slate-500 mt-1">{item.t}</span>
              </div>
            ))}
          </div>
          <div className="text-xs text-slate-700 space-y-1 text-center sm:text-left">
            <div className="font-bold text-[#2563EB] uppercase tracking-wide text-[11px]">
              Protocolo Preventivo MSF
            </div>
            <p className="leading-relaxed">
              Inspecciona tu motocicleta antes de cada salida y tómate el tiempo de conocer cada
              control sin mirarlo.
            </p>
          </div>
        </div>
      );

    case 'escudo_ve':
    default:
      return (
        <div className="bg-indigo-50/50 border border-indigo-200/60 rounded-xl p-3 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#4F46E5] text-white flex items-center justify-center shrink-0 shadow-sm">
            <Scale className="w-5 h-5" />
          </div>
          <div className="text-xs text-slate-700">
            <div className="font-bold text-[#4F46E5] uppercase tracking-wide text-[11px]">
              Marco Jurídico Venezolano Vigente
            </div>
            <p className="text-slate-600 leading-relaxed">
              Basado en la LTT (G.O. 38.985), Reglamento Parcial de Motocicletas (Decreto N° 8.495) y
              normativa nacional aplicable.
            </p>
          </div>
        </div>
      );
  }
}

/* ============================================================================
 * 5. UTILIDADES PURAS (SANITIZACIÓN, MEZCLA, SELECCIÓN Y FORMATO)
 * ============================================================================ */
function sanitizarNombre(valor) {
  return String(valor || '')
    .replace(/[<>"{}[\]\\]/g, '')
    .slice(0, 50);
}

function mezclarArray(lista) {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

function construirSetPreguntas(modo, preguntasPersonalizadas = null) {
  let base = [];
  if (preguntasPersonalizadas && preguntasPersonalizadas.length > 0) {
    base = preguntasPersonalizadas;
  } else if (modo === 'ley_ve') {
    base = mezclarArray(BANCO_PREGUNTAS.filter((q) => q.pilar === 'ley_ve'));
  } else if (modo === 'tecnica_msf') {
    base = mezclarArray(BANCO_PREGUNTAS.filter((q) => q.pilar === 'tecnica_msf'));
  } else {
    // Diagnóstico Integral: 14 preguntas (7 Ley VE + 7 Técnicas MSF), garantizando todas las de riesgo crítico y los 4 ejes
    const leyCriticas = BANCO_PREGUNTAS.filter((q) => q.pilar === 'ley_ve' && q.riesgoCritico);
    const leyNormales = mezclarArray(
      BANCO_PREGUNTAS.filter((q) => q.pilar === 'ley_ve' && !q.riesgoCritico)
    );
    const seleccionLey = [...leyCriticas, ...leyNormales].slice(0, 7);

    const msfCriticas = BANCO_PREGUNTAS.filter((q) => q.pilar === 'tecnica_msf' && q.riesgoCritico);
    const msfNormales = mezclarArray(
      BANCO_PREGUNTAS.filter((q) => q.pilar === 'tecnica_msf' && !q.riesgoCritico)
    );
    const seleccionMsf = [...msfCriticas, ...msfNormales].slice(0, 7);

    // Intercalamos ligeramente tras mezclar cada pilar para dinamismo e-learning
    base = mezclarArray([...seleccionLey, ...seleccionMsf]);
  }

  // Mezclamos las opciones dentro de cada pregunta para evitar sesgo posicional
  return base.map((q) => ({
    ...q,
    opcionesMezcladas: mezclarArray(q.opciones),
  }));
}

function formatearTiempo(segundos) {
  const mins = Math.floor(segundos / 60);
  const secs = segundos % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// Fecha de un intento guardado en Firestore (Timestamp) o local (Date).
function formatearFechaIntento(fecha) {
  let valor = fecha;
  if (valor && typeof valor.toDate === 'function') valor = valor.toDate();
  if (!valor) return 'Recién guardado';
  const d = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(d.getTime())) return '—';
  try {
    return d.toLocaleString('es-VE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return d.toISOString().slice(0, 16).replace('T', ' ');
  }
}

function obtenerNivelDiagnostico(porcentaje) {
  if (porcentaje >= 90) {
    return {
      titulo: 'Piloto Certificado Vial — Dominio Sobresaliente',
      badge: 'Nivel Sobresaliente',
      colorStroke: '#10B981',
      bgBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      descripcion:
        'Demuestras un excelente dominio tanto del marco legal venezolano como de las técnicas preventivas del Manual MSF.',
    };
  }
  if (porcentaje >= 75) {
    return {
      titulo: 'Piloto Preventivo — Buen Dominio Vial',
      badge: 'Buen Dominio',
      colorStroke: '#2563EB',
      bgBadge: 'bg-blue-50 text-blue-700 border-blue-200',
      descripcion:
        'Tienes bases sólidas para circular con seguridad. Refuerza los detalles específicos fallados para alcanzar la excelencia.',
    };
  }
  if (porcentaje >= 50) {
    return {
      titulo: 'Piloto en Formación — Conocimiento Intermedio',
      badge: 'Nivel Intermedio',
      colorStroke: '#F59E0B',
      bgBadge: 'bg-amber-50 text-amber-800 border-amber-200',
      descripcion:
        'Conoces principios importantes, pero aún existen brechas legales o técnicas que elevan tu exposición al riesgo en la vía.',
    };
  }
  return {
    titulo: 'Piloto en Riesgo — Requiere Formación Base',
    badge: 'Formación Prioritaria',
    colorStroke: '#EF4444',
    bgBadge: 'bg-red-50 text-red-700 border-red-200',
    descripcion:
      'Es fundamental reforzar la normativa venezolana y los fundamentos de control antes de exponerte al tráfico denso.',
  };
}

function generarRecomendacionPersonalizada(estadisticasEjes, porcentajeGlobal, alertasCriticas) {
  const legalTotal =
    estadisticasEjes.marco_legal.total + estadisticasEjes.circulacion_ve.total;
  const legalAciertos =
    estadisticasEjes.marco_legal.aciertos + estadisticasEjes.circulacion_ve.aciertos;
  const pctLegal = legalTotal > 0 ? Math.round((legalAciertos / legalTotal) * 100) : null;

  const techTotal =
    estadisticasEjes.control_tecnico.total + estadisticasEjes.manejo_defensivo.total;
  const techAciertos =
    estadisticasEjes.control_tecnico.aciertos + estadisticasEjes.manejo_defensivo.aciertos;
  const pctTech = techTotal > 0 ? Math.round((techAciertos / techTotal) * 100) : null;

  if (porcentajeGlobal >= 90 && alertasCriticas.length === 0) {
    return {
      titulo: 'Ruta Sugerida: Perfeccionamiento Avanzado & Manejo en Grupo',
      detalle:
        'Tu base teórica y preventiva es sobresaliente. Te recomendamos nuestro taller práctico de maniobras evasivas de alta precisión y conducción defensiva en carretera.',
    };
  }

  if (pctLegal !== null && pctTech !== null && pctLegal < 75 && pctTech < 75) {
    return {
      titulo: 'Ruta Sugerida: Pack Completo (Teórico Vial VE + Práctica Base MSF)',
      detalle:
        'Inicia por el Módulo Teórico Vial (LTT, Decreto 8.495 y derechos en alcabala) acompañado de sesiones prácticas de control de curvas SLPR, frenado progresivo y estrategia SEE.',
    };
  }

  if (pctLegal !== null && (pctTech === null || pctLegal < pctTech) && pctLegal < 85) {
    return {
      titulo: 'Ruta Sugerida: Módulo Teórico Vial & Normativa Venezolana',
      detalle:
        'Tu prioridad es dominar el Reglamento Parcial de Motocicletas (Art. 28–32), documentación obligatoria y normativa de circulación para rodar sin multas ni riesgos legales.',
    };
  }

  return {
    titulo: 'Ruta Sugerida: Práctica de Curvas SLPR, Obstáculos y Estrategia SEE',
    detalle:
        'Te recomendamos enfocarte en el módulo práctico MSF: postura y contramanillar, aproximación a 90° sobre obstáculos, inspección T-CLOCS y RiderRadar de 12 segundos.',
  };
}

/* ============================================================================
 * 6. COMPONENTE: PANTALLA DE INICIO (HUB E-LEARNING)
 * ============================================================================ */
function PantallaInicio({
  nombrePiloto,
  setNombrePiloto,
  modoEvaluacion,
  setModoEvaluacion,
  ultimoHistorial,
  historial = [],
  historialLocal = false,
  onIniciarQuiz,
  onAbrirFlashcards,
  onAbrirEmulado,
}) {
  const tarjetasModo = [
    {
      id: 'integral',
      titulo: 'Diagnóstico Integral',
      badge: 'Recomendado',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      preguntasLabel: '14 preguntas · 4 ejes',
      descripcion:
        'Evalúa integralmente tus competencias: 7 preguntas de Ley Venezolana + 7 de Técnicas MSF Ed. 17.',
      icon: Target,
      accentBg: 'bg-blue-50 text-[#2563EB]',
      borderHover: 'hover:border-[#2563EB] focus:ring-[#2563EB]',
      ctaText: 'Comenzar diagnóstico',
      ctaClass: 'bg-[#2563EB] hover:bg-blue-700 text-white',
    },
    {
      id: 'ley_ve',
      titulo: 'Legislación Vial Venezolana',
      badge: 'LTT & Dec. 8.495',
      badgeClass: 'bg-indigo-50 text-[#4F46E5] border-indigo-200',
      preguntasLabel: '8 preguntas oficiales',
      descripcion:
        'Pirámide de Kelsen vial, documentos Art. 30, prohibiciones Art. 31, alcabalas y equipamiento obligatorio.',
      icon: Scale,
      accentBg: 'bg-indigo-50 text-[#4F46E5]',
      borderHover: 'hover:border-[#4F46E5] focus:ring-[#4F46E5]',
      ctaText: 'Practicar Ley VE',
      ctaClass: 'bg-[#4F46E5] hover:bg-indigo-700 text-white',
    },
    {
      id: 'tecnica_msf',
      titulo: 'Técnicas de Manejo (MSF)',
      badge: 'Manual Ed. 17',
      badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
      preguntasLabel: '8 preguntas técnicas',
      descripcion:
        'Curvas SLPR, postura y contrapeso, obstáculos a 90°, inspección T-CLOCS, estrategia SEE y visibilidad.',
      icon: Compass,
      accentBg: 'bg-sky-50 text-sky-600',
      borderHover: 'hover:border-sky-500 focus:ring-sky-500',
      ctaText: 'Practicar Técnicas',
      ctaClass: 'bg-slate-900 hover:bg-slate-800 text-white',
    },
  ];

  const mejorDiagnostico = historial.reduce(
    (maximo, intento) =>
      intento.tipoIntento === 'diagnostico'
        ? Math.max(maximo, Number(intento.porcentaje) || 0)
        : maximo,
    0
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Tarjeta de Bienvenida + Personalización */}
      <section className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-[#2563EB] text-xs font-semibold border border-blue-100">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Aula Virtual Interactiva</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Mide tu nivel real como motociclista
            </h2>
            <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
              Combina el marco jurídico vigente en Venezuela con las técnicas de seguridad preventiva
              del Manual del Operador de la Motocicleta (MSF Ed. 17).
            </p>
          </div>

          {ultimoHistorial && (
            <div className="shrink-0 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-extrabold text-sm">
                {ultimoHistorial.porcentaje}%
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                  Último puntaje
                </div>
                <div className="text-xs font-bold text-slate-800">{ultimoHistorial.modoLabel}</div>
              </div>
            </div>
          )}
        </div>

        {/* Controles: Nombre opcional + Toggle de Modalidad */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-5">
          {/* Input nombre del piloto */}
          <div className="lg:col-span-5">
            <label
              htmlFor="nombre-piloto"
              className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5"
            >
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>Nombre del piloto (opcional para tu reporte)</span>
            </label>
            <input
              id="nombre-piloto"
              type="text"
              maxLength={50}
              value={nombrePiloto}
              onChange={(e) => setNombrePiloto(sanitizarNombre(e.target.value))}
              placeholder="Ej: Armando Salas"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] text-sm text-slate-900 placeholder:text-slate-400 transition-all"
            />
          </div>

          {/* Selector de modalidad Guiado vs Examen */}
          <div className="lg:col-span-7">
            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Modalidad del reto</span>
            </span>
            <div
              role="radiogroup"
              aria-label="Modalidad del reto"
              className="grid grid-cols-1 sm:grid-cols-2 gap-2.5"
            >
              <button
                type="button"
                role="radio"
                aria-checked={modoEvaluacion === 'guiado'}
                onClick={() => setModoEvaluacion('guiado')}
                className={`text-left p-2.5 rounded-xl border transition-all flex items-start gap-2.5 ${
                  modoEvaluacion === 'guiado'
                    ? 'bg-blue-50/70 border-[#2563EB] ring-1 ring-[#2563EB]/20'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div
                  className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    modoEvaluacion === 'guiado' ? 'border-[#2563EB]' : 'border-slate-300'
                  }`}
                >
                  {modoEvaluacion === 'guiado' && (
                    <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                    Modo Guiado <span className="text-amber-500">🔥</span>
                  </div>
                  <div className="text-[11px] text-slate-500 leading-snug">
                    Feedback legal/técnico inmediato tras cada pregunta.
                  </div>
                </div>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={modoEvaluacion === 'examen'}
                onClick={() => setModoEvaluacion('examen')}
                className={`text-left p-2.5 rounded-xl border transition-all flex items-start gap-2.5 ${
                  modoEvaluacion === 'examen'
                    ? 'bg-indigo-50/70 border-[#4F46E5] ring-1 ring-[#4F46E5]/20'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div
                  className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    modoEvaluacion === 'examen' ? 'border-[#4F46E5]' : 'border-slate-300'
                  }`}
                >
                  {modoEvaluacion === 'examen' && (
                    <span className="w-2 h-2 rounded-full bg-[#4F46E5]" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                    Examen Simulado <Clock className="w-3 h-3 text-[#4F46E5]" />
                  </div>
                  <div className="text-[11px] text-slate-500 leading-snug">
                    Cronómetro activo y corrección consolidada al finalizar.
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Selector de Rutas del Reto */}
      <section aria-label="Rutas del reto">
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Elige tu ruta de práctica
          </h3>
          <span className="text-xs text-slate-500">16 reactivos auditados</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tarjetasModo.map((modo) => {
            const Icono = modo.icon;
            return (
              <div
                key={modo.id}
                className={`bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-5 flex flex-col justify-between transition-all ${modo.borderHover} hover:shadow-md`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center ${modo.accentBg}`}
                    >
                      <Icono className="w-5 h-5" />
                    </div>
                    <span
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${modo.badgeClass}`}
                    >
                      {modo.badge}
                    </span>
                  </div>
                  <h4 className="text-base font-extrabold text-slate-900 mb-1">{modo.titulo}</h4>
                  <div className="text-xs font-semibold text-slate-500 mb-2.5">
                    {modo.preguntasLabel}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed mb-5">{modo.descripcion}</p>
                </div>

                <button
                  type="button"
                  onClick={() => onIniciarQuiz(modo.id)}
                  className={`w-full py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer ${modo.ctaClass}`}
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>{modo.ctaText}</span>
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Menú Emulado: simuladores interactivos (FT-054) */}
      <section className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-extrabold text-slate-900">Emulado</h3>
              <p className="text-[11px] text-slate-500 leading-snug">
                Simuladores interactivos · sin registro
              </p>
            </div>
          </div>
          <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
            {EMULADOS.length} módulos
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
          {EMULADOS.map((modulo) => {
            const Icono = modulo.icono;
            return (
              <button
                key={modulo.id}
                type="button"
                onClick={() => onAbrirEmulado?.(modulo.id)}
                className="w-full text-left flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm active:scale-[0.99] transition-all"
              >
                <span
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl border flex items-center justify-center shrink-0 ${modulo.accent}`}
                >
                  <Icono className="w-4 h-4 sm:w-5 sm:h-5" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[13px] font-extrabold text-slate-900 leading-snug">
                    {modulo.titulo}
                  </span>
                  <span className="block text-[11px] text-slate-500 leading-snug mt-0.5">
                    {modulo.resumen}
                  </span>
                  <span className="inline-block mt-1.5 text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                    {modulo.detalle}
                  </span>
                </span>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              </button>
            );
          })}
        </div>
      </section>

      {/* Historial de intentos guardados en la cuenta (FT-052) */}
      {historial.length > 0 && (
        <section className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Historial de retos</h3>
                <p className="text-[11px] text-slate-500">
                  {historial.length} intento(s) {historialLocal ? 'en este dispositivo' : 'en tu cuenta'}
                </p>
              </div>
            </div>
            <div className="text-right ml-auto min-w-[92px]">
              <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
                Mejor diagnóstico
              </div>
              <div className="text-lg font-extrabold text-emerald-600">
                {mejorDiagnostico > 0 ? `${mejorDiagnostico}%` : '—'}
              </div>
            </div>
          </div>

          <ul className="divide-y divide-slate-100">
            {historial.slice(0, 5).map((intento) => {
              const pct = Number(intento.porcentaje) || 0;
              const esDiagnostico = intento.tipoIntento === 'diagnostico';
              const tono =
                pct >= 80
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : pct >= 60
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-red-50 text-red-700 border-red-200';
              return (
                <li
                  key={intento.id || `${intento.intento}-${pct}-${intento.fecha || ''}`}
                  className="py-2.5 flex items-center gap-3"
                >
                  <span
                    className={`w-12 shrink-0 text-center text-xs font-extrabold rounded-lg border px-1.5 py-1 ${tono}`}
                  >
                    {pct}%
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">
                      {etiquetaModo(intento.modo) || intento.modoLabel || 'Reto Vial'}
                    </p>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      <span
                        className={
                          esDiagnostico ? 'font-bold text-[#2563EB]' : 'font-semibold text-slate-500'
                        }
                      >
                        {esDiagnostico ? 'Diagnóstico' : 'Práctica'}
                      </span>
                      {` · ${formatearFechaIntento(intento.fecha)}`}
                      {Number.isFinite(Number(intento.aciertos)) &&
                      Number(intento.total) > 0
                        ? ` · ${Number(intento.aciertos)}/${Number(intento.total)}`
                        : ''}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>

          <p className="mt-3 text-[11px] text-slate-500">
            El mejor diagnóstico solo cuenta exámenes integrales sin ayudas. El puntaje es
            orientativo y no constituye certificación oficial.
          </p>
        </section>
      )}

      {/* Banner de Cápsulas de Repaso (Flashcards) */}
      <section className="bg-gradient-to-r from-[#0F172A] via-slate-900 to-indigo-950 rounded-2xl p-5 sm:p-6 text-white shadow-sm border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 flex items-center justify-center shrink-0">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-300 mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Estudia antes de presentar</span>
              </div>
              <h3 className="text-lg font-extrabold text-white">
                Cápsulas de Repaso (6 Flashcards Interactivas)
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl leading-relaxed">
                Domina en minutos la Pirámide de Kelsen VE, Art. 30 y 31 del Decreto 8.495, curvas
                SLPR, estrategia SEE 12s y checklist T-CLOCS.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onAbrirFlashcards}
            className="shrink-0 py-3 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
          >
            <BookOpen className="w-4 h-4" />
            <span>Abrir Cápsulas</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </section>
    </div>
  );
}

/* ============================================================================
 * 7. COMPONENTE: CÁPSULAS DE REPASO (FLASHCARDS VOLTEABLES)
 * ============================================================================ */
function ModuloFlashcards({ onVolverInicio, onIniciarDiagnostico }) {
  const [indice, setIndice] = useState(0);
  const [volteada, setVolteada] = useState(false);
  const [dominadas, setDominadas] = useState(() => new Set());
  const touchStartX = useRef(null);

  const tarjeta = FLASHCARDS[indice];
  const esDominada = dominadas.has(tarjeta.id);

  const irAnterior = useCallback(() => {
    setVolteada(false);
    setIndice((prev) => (prev > 0 ? prev - 1 : FLASHCARDS.length - 1));
  }, []);

  const irSiguiente = useCallback(() => {
    setVolteada(false);
    setIndice((prev) => (prev < FLASHCARDS.length - 1 ? prev + 1 : 0));
  }, []);

  const toggleDominada = () => {
    setDominadas((prev) => {
      const next = new Set(prev);
      if (next.has(tarjeta.id)) next.delete(tarjeta.id);
      else next.add(tarjeta.id);
      return next;
    });
  };

  // Soporte de teclado (Flechas y Espacio)
  useEffect(() => {
    const manejarTecla = (e) => {
      if (e.key === 'ArrowRight') irSiguiente();
      else if (e.key === 'ArrowLeft') irAnterior();
      else if (e.key === ' ' || e.key === 'Enter') {
        if (document.activeElement?.tagName !== 'BUTTON') {
          e.preventDefault();
          setVolteada((v) => !v);
        }
      }
    };
    window.addEventListener('keydown', manejarTecla);
    return () => window.removeEventListener('keydown', manejarTecla);
  }, [irSiguiente, irAnterior]);

  // Soporte táctil swipe horizontal
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 50) {
      if (diff < 0) irSiguiente();
      else irAnterior();
    }
    touchStartX.current = null;
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Barra superior de flashcards */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onVolverInicio}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            aria-label="Volver al inicio"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              Cápsulas de Repaso Rápido
            </h2>
            <p className="text-xs text-slate-500">
              Toca la tarjeta para voltearla o desliza para cambiar · {dominadas.size}/
              {FLASHCARDS.length} dominadas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {FLASHCARDS.map((fc, i) => (
            <button
              key={fc.id}
              type="button"
              onClick={() => {
                setVolteada(false);
                setIndice(i);
              }}
              aria-label={`Ir a cápsula ${i + 1}`}
              className={`h-2.5 rounded-full transition-all cursor-pointer ${
                i === indice
                  ? 'w-7 bg-[#2563EB]'
                  : dominadas.has(fc.id)
                  ? 'w-2.5 bg-emerald-500'
                  : 'w-2.5 bg-slate-200 hover:bg-slate-300'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Contenedor 3D Flip Card */}
      <div
        className="flashcard-scene w-full"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          onClick={() => setVolteada((v) => !v)}
          role="button"
          tabIndex={0}
          aria-pressed={volteada}
          aria-label="Voltear tarjeta de estudio"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setVolteada((v) => !v);
            }
          }}
          className={`bg-white rounded-2xl border-2 transition-all duration-300 shadow-sm cursor-pointer select-none min-h-[370px] sm:min-h-[390px] p-5 sm:p-7 flex flex-col justify-between ${
            volteada
              ? 'border-[#2563EB] ring-4 ring-blue-500/10'
              : 'border-[#E2E8F0] hover:border-slate-300'
          }`}
        >
          {/* Cabecera de tarjeta */}
          <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-100">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                tarjeta.pilar === 'ley_ve'
                  ? 'bg-indigo-50 text-[#4F46E5] border-indigo-200'
                  : 'bg-blue-50 text-[#2563EB] border-blue-200'
              }`}
            >
              {tarjeta.pilar === 'ley_ve' ? (
                <Scale className="w-3.5 h-3.5" />
              ) : (
                <Compass className="w-3.5 h-3.5" />
              )}
              <span>{tarjeta.categoria}</span>
            </span>

            <span className="text-xs font-bold text-slate-400">
              Cápsula {indice + 1} de {FLASHCARDS.length}
            </span>
          </div>

          {/* Cuerpo: Anverso vs Reverso */}
          {!volteada ? (
            <div className="my-auto py-5 space-y-5 text-center">
              <div className="space-y-1.5">
                <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                  {tarjeta.titulo}
                </h3>
                <p className="text-xs sm:text-sm font-medium text-slate-500">
                  {tarjeta.subtitulo}
                </p>
              </div>

              <div className="max-w-lg mx-auto">
                <MicroIlustracion tipo={tarjeta.diagrama} />
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-w-lg mx-auto">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Pregunta clave de repaso
                </div>
                <p className="text-sm sm:text-base font-bold text-slate-800">
                  {tarjeta.frentePregunta}
                </p>
              </div>
            </div>
          ) : (
            <div className="my-auto py-4 space-y-4 animate-fadeIn">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#2563EB]">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Síntesis Oficial — {tarjeta.titulo}</span>
              </div>

              <ul className="space-y-2.5">
                {tarjeta.puntosClave.map((punto, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 text-sm text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100"
                  >
                    <span className="w-5 h-5 rounded-full bg-[#2563EB] text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed">{punto}</span>
                  </li>
                ))}
              </ul>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-900">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{tarjeta.nota}</span>
              </div>
            </div>
          )}

          {/* Pie interactivo */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5 font-semibold text-[#2563EB]">
              <RefreshCw className="w-3.5 h-3.5" />
              {volteada ? 'Toca para ver la pregunta' : 'Toca la tarjeta para revelar la síntesis'}
            </span>
            <span className="hidden sm:inline text-slate-400">
              Atajos: ← / → cambiar · Espacio voltear
            </span>
          </div>
        </div>
      </div>

      {/* Controles inferiores */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={irAnterior}
            className="flex-1 sm:flex-none py-3 px-4 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Anterior</span>
          </button>

          <button
            type="button"
            onClick={toggleDominada}
            className={`flex-1 sm:flex-none py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
              esDominada
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
            }`}
          >
            <CheckCircle2 className={`w-4 h-4 ${esDominada ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span>{esDominada ? 'Dominada' : 'Marcar dominada'}</span>
          </button>

          <button
            type="button"
            onClick={irSiguiente}
            className="flex-1 sm:flex-none py-3 px-4 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Siguiente</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={onIniciarDiagnostico}
          className="py-3 px-5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
        >
          <span>Ir al Diagnóstico Integral</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/* ============================================================================
 * 8. COMPONENTE: INTERFAZ DEL QUIZ INTERACTIVO
 * ============================================================================ */
function ModuloQuiz({
  preguntas,
  modoEvaluacion,
  tituloModo,
  onFinalizar,
  onSolicitarSalida,
}) {
  const [indiceActual, setIndiceActual] = useState(0);
  const [respuestas, setRespuestas] = useState({});
  const [rachaActual, setRachaActual] = useState(0);
  const [rachaMaxima, setRachaMaxima] = useState(0);
  const [segundos, setSegundos] = useState(0);
  const [bloqueoTransicion, setBloqueoTransicion] = useState(false);

  const pregunta = preguntas[indiceActual];
  const respuestaUsuarioId = respuestas[pregunta.id] || null;
  const yaRespondida = Boolean(respuestaUsuarioId);
  const esUltima = indiceActual === preguntas.length - 1;
  const esGuiado = modoEvaluacion === 'guiado';
  const letras = ['A', 'B', 'C', 'D'];

  // Cronómetro activo durante la evaluación
  useEffect(() => {
    const intervalo = setInterval(() => {
      setSegundos((s) => s + 1);
    }, 1000);
    return () => clearInterval(intervalo);
  }, []);

  const seleccionarOpcion = useCallback(
    (opcionId) => {
      if (bloqueoTransicion) return;
      // En modo guiado bloqueamos el cambio una vez respondida para evitar doble clic / trampa
      if (esGuiado && yaRespondida) return;

      setRespuestas((prev) => ({
        ...prev,
        [pregunta.id]: opcionId,
      }));

      if (esGuiado) {
        const acierto = opcionId === pregunta.correctaId;
        if (acierto) {
          setRachaActual((prev) => {
            const nueva = prev + 1;
            setRachaMaxima((max) => Math.max(max, nueva));
            return nueva;
          });
        } else {
          setRachaActual(0);
        }
      }
    },
    [bloqueoTransicion, esGuiado, yaRespondida, pregunta]
  );

  const avanzarPregunta = useCallback(() => {
    if (!yaRespondida || bloqueoTransicion) return;

    setBloqueoTransicion(true);
    setTimeout(() => {
      if (esUltima) {
        // Calcular racha máxima si estaba en modo examen
        let rachaCalc = rachaMaxima;
        if (!esGuiado) {
          let curr = 0;
          let max = 0;
          preguntas.forEach((q) => {
            if (respuestas[q.id] === q.correctaId) {
              curr += 1;
              if (curr > max) max = curr;
            } else {
              curr = 0;
            }
          });
          rachaCalc = max;
        }
        onFinalizar({
          respuestas,
          tiempoSegundos: segundos,
          rachaMaxima: rachaCalc,
        });
      } else {
        setIndiceActual((prev) => prev + 1);
        setBloqueoTransicion(false);
      }
    }, 120);
  }, [
    yaRespondida,
    bloqueoTransicion,
    esUltima,
    esGuiado,
    rachaMaxima,
    preguntas,
    respuestas,
    segundos,
    onFinalizar,
  ]);

  // Accesibilidad por teclado: A-D o 1-4 para elegir, Enter para avanzar
  useEffect(() => {
    const manejarTeclado = (e) => {
      const key = e.key.toLowerCase();
      const idxMapa = { a: 0, b: 1, c: 2, d: 3, '1': 0, '2': 1, '3': 2, '4': 3 };
      if (key in idxMapa) {
        const opcionTarget = pregunta.opcionesMezcladas[idxMapa[key]];
        if (opcionTarget) seleccionarOpcion(opcionTarget.id);
      } else if (e.key === 'Enter' && yaRespondida) {
        e.preventDefault();
        avanzarPregunta();
      }
    };
    window.addEventListener('keydown', manejarTeclado);
    return () => window.removeEventListener('keydown', manejarTeclado);
  }, [pregunta, seleccionarOpcion, yaRespondida, avanzarPregunta]);

  const progresoPct = Math.round(((indiceActual + (yaRespondida ? 1 : 0)) / preguntas.length) * 100);
  const esCorrecta = yaRespondida && respuestaUsuarioId === pregunta.correctaId;
  const ejeMeta = EJES_CONFIG[pregunta.eje];

  return (
    <div className="space-y-3 sm:space-y-4 animate-fadeIn">
      {/* Barra de Estado y Progreso */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-2.5 sm:p-4 space-y-2 sm:space-y-3">
        <div className="flex flex-nowrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <button
              type="button"
              onClick={onSolicitarSalida}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors cursor-pointer shrink-0"
              aria-label="Salir del reto"
              title="Volver al inicio"
            >
              <Home className="w-4 h-4" />
            </button>
            <span className="hidden sm:inline text-xs font-bold text-slate-700 truncate">{tituloModo}</span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {esGuiado && (
              <div
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold border transition-all ${
                  rachaActual > 0
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-slate-50 text-slate-400 border-slate-200'
                }`}
                title="Racha de aciertos consecutivos"
              >
                <Flame
                  className={`w-3.5 h-3.5 ${
                    rachaActual > 0 ? 'text-amber-500 fill-amber-500' : 'text-slate-400'
                  }`}
                />
                <span>{rachaActual}</span>
              </div>
            )}

            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                !esGuiado
                  ? 'bg-indigo-50 text-[#4F46E5] border-indigo-200'
                  : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span className="tabular-nums">{formatearTiempo(segundos)}</span>
            </div>

            <div className="text-xs font-extrabold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-full tabular-nums">
              {indiceActual + 1} / {preguntas.length}
            </div>
          </div>
        </div>

        {/* Barra visual de progreso */}
        <div className="w-full h-1.5 sm:h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#2563EB] to-[#10B981] rounded-full transition-all duration-300 ease-out"
            style={{ width: `${Math.max(progresoPct, 6)}%` }}
          />
        </div>
      </div>

      {/* Tarjeta Principal de Pregunta */}
      <article className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-3 sm:p-6 space-y-2.5 sm:space-y-5">
        {/* Badges de Dominio, Eje y Riesgo Crítico */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 [@media(max-height:700px)]:hidden">
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold border ${
              pregunta.pilar === 'ley_ve'
                ? 'bg-indigo-50 text-[#4F46E5] border-indigo-200'
                : 'bg-blue-50 text-[#2563EB] border-blue-200'
            }`}
          >
            {pregunta.pilar === 'ley_ve' ? (
              <Scale className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            ) : (
              <Compass className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            )}
            <span>{pregunta.pilar === 'ley_ve' ? 'Ley Venezolana' : 'Técnica MSF'}</span>
          </span>

          <span className="text-[10px] sm:text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full">
            {ejeMeta.shortLabel}
          </span>

          {pregunta.riesgoCritico && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold bg-red-50 text-red-700 border border-red-200">
              <ShieldAlert className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>Crítica de Seguridad</span>
            </span>
          )}
        </div>

        {/* Enunciado de la pregunta */}
        <h2 className="text-[13px] leading-[1.35] sm:text-lg font-extrabold text-slate-900 sm:leading-snug">
          {pregunta.pregunta}
        </h2>

        {/* Micro-ilustración SVG contextual: colapsable en móvil para evitar scroll */}
        <details className="sm:hidden [@media(max-height:700px)]:hidden rounded-xl border border-slate-200 bg-slate-50">
          <summary className="cursor-pointer list-none px-3 py-1.5 text-[11px] font-bold text-slate-600 flex items-center justify-between">
            <span>Ver ilustración</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </summary>
          <div className="px-2 pb-2">
            <MicroIlustracion tipo={pregunta.diagrama} />
          </div>
        </details>
        <div className="hidden sm:block">
          <MicroIlustracion tipo={pregunta.diagrama} />
        </div>

        {/* Opciones A / B / C / D */}
        <div className="space-y-2 sm:space-y-2.5" role="radiogroup" aria-label="Opciones de respuesta">
          {pregunta.opcionesMezcladas.map((opcion, idx) => {
            const letra = letras[idx];
            const estaSeleccionada = respuestaUsuarioId === opcion.id;
            const esLaCorrecta = opcion.id === pregunta.correctaId;

            let estilosContenedor =
              'bg-white border-slate-200 hover:border-[#2563EB] hover:bg-blue-50/40 text-slate-800';
            let estilosLetra = 'bg-slate-100 text-slate-600 border-slate-200';
            let iconoEstado = null;

            if (esGuiado && yaRespondida) {
              if (esLaCorrecta) {
                estilosContenedor =
                  'bg-emerald-50 border-emerald-500 text-emerald-950 ring-1 ring-emerald-500/20';
                estilosLetra = 'bg-emerald-600 text-white border-emerald-600';
                iconoEstado = <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />;
              } else if (estaSeleccionada && !esLaCorrecta) {
                estilosContenedor =
                  'bg-red-50 border-red-500 text-red-950 ring-1 ring-red-500/20';
                estilosLetra = 'bg-red-600 text-white border-red-600';
                iconoEstado = <XCircle className="w-5 h-5 text-red-600 shrink-0" />;
              } else {
                estilosContenedor = 'bg-slate-50/70 border-slate-200 text-slate-400 opacity-70';
                estilosLetra = 'bg-slate-100 text-slate-400 border-slate-200';
              }
            } else if (!esGuiado && estaSeleccionada) {
              estilosContenedor =
                'bg-blue-50 border-[#2563EB] text-slate-900 ring-2 ring-[#2563EB]/20';
              estilosLetra = 'bg-[#2563EB] text-white border-[#2563EB]';
            }

            return (
              <button
                key={opcion.id}
                type="button"
                role="radio"
                aria-checked={estaSeleccionada}
                disabled={esGuiado && yaRespondida}
                onClick={() => seleccionarOpcion(opcion.id)}
                className={`w-full min-h-[48px] sm:min-h-[56px] p-2 sm:p-3.5 rounded-xl border-2 text-left flex items-center gap-2 sm:gap-3.5 transition-all ${
                  esGuiado && yaRespondida ? 'cursor-default' : 'cursor-pointer active:scale-[0.995]'
                } ${estilosContenedor}`}
              >
                <span
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg border font-extrabold text-[11px] sm:text-xs flex items-center justify-center shrink-0 transition-colors ${estilosLetra}`}
                >
                  {letra}
                </span>
                <span className="flex-1 text-[12.5px] leading-snug sm:text-sm font-medium">{opcion.texto}</span>
                {iconoEstado}
              </button>
            );
          })}
        </div>

        {/* Tarjeta Animada de Fundamento Legal / Técnico (Solo Modo Guiado) */}
        {esGuiado && yaRespondida && (
          <div
            className={`rounded-2xl border p-3 sm:p-5 space-y-2 sm:space-y-3 animate-slideUp ${
              esCorrecta
                ? 'bg-emerald-50/80 border-emerald-200'
                : 'bg-red-50/80 border-red-200'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                {esCorrecta ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600 shrink-0" />
                )}
                <h3
                  className={`text-sm font-extrabold ${
                    esCorrecta ? 'text-emerald-900' : 'text-red-900'
                  }`}
                >
                  {esCorrecta ? '¡Respuesta correcta!' : 'Respuesta incorrecta'} ·{' '}
                  {pregunta.pilar === 'ley_ve' ? 'Fundamento Legal' : 'Fundamento Técnico MSF'}
                </h3>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-800 leading-relaxed">
              {pregunta.explicacion}
            </p>

            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white/90 border border-slate-200/80 text-slate-700">
              <FileText className="w-3.5 h-3.5 text-[#4F46E5] shrink-0" />
              <span>Fuente: {pregunta.fuente}</span>
            </div>
          </div>
        )}

        {/* Acción Siguiente / Finalizar: barra fija en móvil para no tener que bajar */}
        <div className="sticky bottom-0 z-10 -mx-3 -mb-3 mt-1 border-t border-slate-100 bg-white/95 px-3 py-1.5 backdrop-blur sm:static sm:mx-0 sm:mb-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:pt-2 sm:backdrop-blur-none">
          <div className="flex items-center justify-between gap-3">
            {!esGuiado && indiceActual > 0 ? (
              <button
                type="button"
                onClick={() => setIndiceActual((p) => Math.max(0, p - 1))}
                className="py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Anterior</span>
              </button>
            ) : (
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                Usa teclas A–D para elegir · Enter para continuar
              </span>
            )}

            <button
              type="button"
              disabled={!yaRespondida || bloqueoTransicion}
              onClick={avanzarPregunta}
              className={`ml-auto py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl text-[13px] sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all ${
                yaRespondida
                  ? 'bg-[#2563EB] hover:bg-blue-700 text-white shadow-sm cursor-pointer active:scale-[0.99]'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <span>{esUltima ? 'Ver Resultados' : 'Siguiente'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </article>
    </div>
  );
}

/* ============================================================================
 * 9. COMPONENTE: DASHBOARD DE RESULTADOS (SCORECARD E-LEARNING)
 * ============================================================================ */
function DashboardResultados({
  nombrePiloto,
  tituloModo,
  preguntas,
  respuestas,
  tiempoSegundos,
  rachaMaxima,
  onReintentarFalladas,
  onVolverInicio,
  onAbrirFlashcards,
}) {
  const [mostrarRevision, setMostrarRevision] = useState(false);
  const [filtroRevision, setFiltroRevision] = useState('todas');
  const [abiertos, setAbiertos] = useState({});
  const [copiado, setCopiado] = useState(false);
  const revisionRef = useRef(null);

  // Cálculo integral de métricas
  const analisis = useMemo(() => {
    const total = preguntas.length;
    let aciertos = 0;
    const falladas = [];
    const alertasCriticas = [];

    const ejes = {
      marco_legal: { aciertos: 0, total: 0 },
      circulacion_ve: { aciertos: 0, total: 0 },
      control_tecnico: { aciertos: 0, total: 0 },
      manejo_defensivo: { aciertos: 0, total: 0 },
    };

    preguntas.forEach((q) => {
      const resp = respuestas[q.id];
      const ok = resp === q.correctaId;
      ejes[q.eje].total += 1;
      if (ok) {
        aciertos += 1;
        ejes[q.eje].aciertos += 1;
      } else {
        falladas.push(q);
        if (q.riesgoCritico) {
          alertasCriticas.push(q);
        }
      }
    });

    const porcentaje = total > 0 ? Math.round((aciertos / total) * 100) : 0;
    const criticasEvaluadas = preguntas.filter((q) => q.riesgoCritico).length;
    const nivel = obtenerNivelDiagnostico(porcentaje);
    const rutaSugerida = generarRecomendacionPersonalizada(ejes, porcentaje, alertasCriticas);

    return {
      total,
      aciertos,
      porcentaje,
      falladas,
      alertasCriticas,
      criticasEvaluadas,
      ejes,
      nivel,
      rutaSugerida,
    };
  }, [preguntas, respuestas]);

  // Parámetros del medidor circular SVG
  const radio = 54;
  const circunferencia = 2 * Math.PI * radio;
  const dashOffset = circunferencia - (analisis.porcentaje / 100) * circunferencia;

  // Preguntas filtradas para la revisión detallada
  const preguntasFiltradas = useMemo(() => {
    return preguntas.filter((q) => {
      const ok = respuestas[q.id] === q.correctaId;
      if (filtroRevision === 'incorrectas') return !ok;
      if (filtroRevision === 'ley_ve') return q.pilar === 'ley_ve';
      if (filtroRevision === 'tecnica_msf') return q.pilar === 'tecnica_msf';
      return true;
    });
  }, [preguntas, respuestas, filtroRevision]);

  const toggleAcordeon = (id) => {
    setAbiertos((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const abrirRevision = () => {
    setMostrarRevision(true);
    setTimeout(() => {
      revisionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  const copiarResumen = async () => {
    const fecha = new Date().toLocaleDateString('es-VE');
    const lineasEjes = Object.keys(EJES_CONFIG)
      .map((key) => {
        const stat = analisis.ejes[key];
        if (stat.total === 0) return null;
        const pct = Math.round((stat.aciertos / stat.total) * 100);
        return `• ${EJES_CONFIG[key].label}: ${stat.aciertos}/${stat.total} (${pct}%)`;
      })
      .filter(Boolean)
      .join('\n');

    const textoCriticas =
      analisis.alertasCriticas.length > 0
        ? `\n⚠️ Brechas Críticas de Seguridad (${analisis.alertasCriticas.length}):\n` +
          analisis.alertasCriticas.map((q) => `- ${q.temaCorto} (${q.fuente})`).join('\n')
        : '\n✅ Sin brechas críticas de seguridad detectadas.';

    const reporte = [
      `🏍️ DIAGNÓSTICO VIAL (VENEZUELA)`,
      nombrePiloto.trim() ? `Piloto: ${nombrePiloto.trim()}` : null,
      `Fecha: ${fecha} | Módulo: ${tituloModo}`,
      `Puntaje Global: ${analisis.porcentaje}% (${analisis.aciertos}/${analisis.total} aciertos)`,
      `Nivel: ${analisis.nivel.titulo}`,
      `Tiempo: ${formatearTiempo(tiempoSegundos)} | Racha máx.: ${rachaMaxima}`,
      `\n📊 Desglose por Competencias:\n${lineasEjes}`,
      textoCriticas,
      `\n🎯 ${analisis.rutaSugerida.titulo}`,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(reporte);
      } else {
        const area = document.createElement('textarea');
        area.value = reporte;
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        document.body.removeChild(area);
      }
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2600);
    } catch {
      setCopiado(false);
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Tarjeta Principal de Puntaje y Nivel */}
      <section className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-5 sm:p-7">
        <div className="flex flex-col md:flex-row items-center gap-6">
          {/* Medidor Circular SVG */}
          <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
            <svg className="w-36 h-36 -rotate-90" viewBox="0 0 128 128" aria-hidden="true">
              <circle
                cx="64"
                cy="64"
                r={radio}
                fill="none"
                stroke="#E2E8F0"
                strokeWidth="10"
              />
              <circle
                cx="64"
                cy="64"
                r={radio}
                fill="none"
                stroke={analisis.nivel.colorStroke}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circunferencia}
                strokeDashoffset={dashOffset}
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-black text-slate-900 tabular-nums">
                {analisis.porcentaje}%
              </span>
              <span className="text-[11px] font-bold text-slate-500">
                {analisis.aciertos} de {analisis.total}
              </span>
            </div>
          </div>

          {/* Resumen textual del nivel */}
          <div className="flex-1 text-center md:text-left space-y-2.5">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${analisis.nivel.bgBadge}`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>{analisis.nivel.badge}</span>
              </span>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                {tituloModo}
              </span>
            </div>

            {nombrePiloto.trim() && (
              <div className="text-xs font-bold uppercase tracking-wider text-[#2563EB]">
                Reporte personalizado para {nombrePiloto.trim()}
              </div>
            )}

            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight">
              {analisis.nivel.titulo}
            </h2>

            <p className="text-sm text-slate-600 leading-relaxed">{analisis.nivel.descripcion}</p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-1 text-xs font-semibold text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-400" />
                Tiempo: <strong className="text-slate-800">{formatearTiempo(tiempoSegundos)}</strong>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-500" />
                Racha máxima: <strong className="text-slate-800">{rachaMaxima}</strong>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Grid de 2 Columnas: Desglose 4 Ejes + Alertas Críticas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Desglose por los 4 Ejes */}
        <section className="lg:col-span-7 bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
              Desglose por Competencias (4 Ejes)
            </h3>
            <span className="text-xs text-slate-400 font-medium">Ley VE + MSF</span>
          </div>

          <div className="space-y-4">
            {Object.values(EJES_CONFIG).map((eje) => {
              const stat = analisis.ejes[eje.id];
              const evaluado = stat.total > 0;
              const pct = evaluado ? Math.round((stat.aciertos / stat.total) * 100) : 0;

              return (
                <div key={eje.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <span className="font-bold text-slate-700">{eje.label}</span>
                    {evaluado ? (
                      <span className="font-extrabold text-slate-900 tabular-nums shrink-0">
                        {stat.aciertos}/{stat.total} ({pct}%)
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-slate-400 shrink-0">
                        No evaluado en este modo
                      </span>
                    )}
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        evaluado ? eje.colorBar : 'bg-slate-200'
                      }`}
                      style={{ width: evaluado ? `${Math.max(pct, 4)}%` : '0%' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Alertas de Riesgo Crítico */}
        <section className="lg:col-span-5 bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {analisis.alertasCriticas.length > 0 ? (
                <ShieldAlert className="w-5 h-5 text-red-600" />
              ) : (
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
              )}
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                Alertas de Riesgo Crítico
              </h3>
            </div>

            {analisis.alertasCriticas.length > 0 ? (
              <div className="space-y-2.5">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Detectamos <strong>{analisis.alertasCriticas.length}</strong> brecha(s) en temas
                  asociados a siniestros graves. Prioriza su repaso inmediato:
                </p>
                <ul className="space-y-2">
                  {analisis.alertasCriticas.map((item) => (
                    <li
                      key={item.id}
                      className="p-2.5 rounded-xl bg-red-50 border border-red-200/80 text-xs"
                    >
                      <div className="font-bold text-red-800 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>{item.temaCorto}</span>
                      </div>
                      <div className="text-[11px] text-red-700/90 mt-0.5">{item.fuente}</div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1.5">
                <div className="font-extrabold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Sin brechas críticas detectadas</span>
                </div>
                <p className="leading-relaxed text-emerald-800">
                  Acertaste las {analisis.criticasEvaluadas} preguntas críticas de seguridad
                  evaluadas en este módulo (casco, curvas, circulación y gestión de riesgos).
                </p>
              </div>
            )}
          </div>

          {/* Ruta personalizada */}
          <div className="p-4 rounded-xl bg-slate-900 text-white space-y-1.5">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Recomendación personalizada</span>
            </div>
            <div className="text-sm font-extrabold leading-snug">
              {analisis.rutaSugerida.titulo}
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {analisis.rutaSugerida.detalle}
            </p>
          </div>
        </section>
      </div>

      {/* Barra de Botones Interactivos de Acción */}
      <section className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-4 sm:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {analisis.falladas.length > 0 && (
            <button
              type="button"
              onClick={() => onReintentarFalladas(analisis.falladas)}
              className="py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reintentar falladas ({analisis.falladas.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={abrirRevision}
            className="py-3 px-4 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>Ver revisión detallada</span>
          </button>

          <button
            type="button"
            onClick={copiarResumen}
            className={`py-3 px-4 rounded-xl border font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              copiado
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
            }`}
          >
            {copiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copiado ? '¡Resumen copiado!' : 'Copiar resumen'}</span>
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onAbrirFlashcards}
              className="flex-1 py-3 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-[#4F46E5] font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="Estudiar Flashcards"
            >
              <Layers className="w-4 h-4" />
              <span>Flashcards</span>
            </button>
            <button
              type="button"
              onClick={onVolverInicio}
              className="flex-1 py-3 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="Volver al inicio"
            >
              <Home className="w-4 h-4" />
              <span>Inicio</span>
            </button>
          </div>
        </div>
      </section>

      {/* Acordeón Filtrable de Revisión Detallada */}
      {mostrarRevision && (
        <section
          ref={revisionRef}
          className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-5 space-y-4 animate-fadeIn"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Revisión Detallada de Respuestas
              </h3>
              <p className="text-xs text-slate-500">
                Consulta tu respuesta, la opción correcta y la cita legal o técnica oficial.
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'todas', label: `Todas (${preguntas.length})` },
                { id: 'incorrectas', label: `Incorrectas (${analisis.falladas.length})` },
                { id: 'ley_ve', label: 'Ley VE' },
                { id: 'tecnica_msf', label: 'Técnica MSF' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFiltroRevision(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    filtroRevision === f.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {preguntasFiltradas.length === 0 ? (
            <div className="text-center py-8 text-sm text-slate-500">
              No hay preguntas en este filtro.
            </div>
          ) : (
            <div className="space-y-2.5">
              {preguntasFiltradas.map((q, idx) => {
                const respId = respuestas[q.id];
                const ok = respId === q.correctaId;
                const opcionUsuario = q.opciones.find((o) => o.id === respId);
                const opcionCorrecta = q.opciones.find((o) => o.id === q.correctaId);
                const estaAbierto = Boolean(abiertos[q.id]) || !ok;

                return (
                  <div
                    key={q.id}
                    className={`rounded-xl border transition-colors ${
                      ok ? 'border-slate-200 bg-white' : 'border-red-200 bg-red-50/30'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleAcordeon(q.id)}
                      className="w-full p-4 text-left flex items-start justify-between gap-3 cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        {ok ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                        )}
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                q.pilar === 'ley_ve'
                                  ? 'bg-indigo-100 text-[#4F46E5]'
                                  : 'bg-blue-100 text-[#2563EB]'
                              }`}
                            >
                              {q.pilar === 'ley_ve' ? 'Ley VE' : 'Técnica MSF'}
                            </span>
                            {q.riesgoCritico && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                                Riesgo Crítico
                              </span>
                            )}
                          </div>
                          <div className="text-sm font-bold text-slate-900">
                            {idx + 1}. {q.pregunta}
                          </div>
                        </div>
                      </div>
                      {estaAbierto ? (
                        <ChevronUp className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
                      )}
                    </button>

                    {estaAbierto && (
                      <div className="px-4 pb-4 pt-1 space-y-2.5 border-t border-slate-100 text-xs">
                        {!ok && opcionUsuario && (
                          <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-900">
                            <strong className="block mb-0.5">Tu respuesta:</strong>
                            {opcionUsuario.texto}
                          </div>
                        )}
                        {opcionCorrecta && (
                          <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-950">
                            <strong className="block mb-0.5">Respuesta correcta:</strong>
                            {opcionCorrecta.texto}
                          </div>
                        )}
                        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-slate-700 leading-relaxed space-y-1.5">
                          <p>{q.explicacion}</p>
                          <div className="text-[11px] font-bold text-[#4F46E5]">
                            Fuente oficial: {q.fuente}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

/* ============================================================================
 * 10. MODAL DE CONFIRMACIÓN PERSONALIZADO (SIN window.confirm)
 * ============================================================================ */
function ModalConfirmarSalida({ visible, onCancelar, onConfirmar }) {
  if (!visible) return null;
  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-salir-titulo"
    >
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl max-w-sm w-full p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 id="modal-salir-titulo" className="text-base font-extrabold text-slate-900">
              ¿Salir del reto actual?
            </h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Si vuelves al inicio ahora, perderás el progreso de las preguntas respondidas en esta
              sesión.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCancelar}
            className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer"
          >
            Seguir evaluando
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            className="py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer"
          >
            Sí, salir al inicio
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
 * 11. APLICACIÓN PRINCIPAL (EXPORT DEFAULT APP)
 * ============================================================================ */
function EvaluacionVialApp({ uid, nombreInicial = '', onVolverApp, mostrarToast }) {
  const [vista, setVista] = useState('inicio'); // 'inicio' | 'flashcards' | 'quiz' | 'resultados'
  const [nombrePiloto, setNombrePiloto] = useState(() => sanitizarNombre(nombreInicial));
  const nombrePilotoTocadoRef = useRef(false);
  const [modoEvaluacion, setModoEvaluacion] = useState('guiado'); // 'guiado' | 'examen'
  const [tituloModoActual, setTituloModoActual] = useState('Diagnóstico Integral');
  const [modoActualId, setModoActualId] = useState('integral');
  const [preguntasActivas, setPreguntasActivas] = useState([]);
  const [resultadoSesion, setResultadoSesion] = useState(null);
  const [ultimoHistorial, setUltimoHistorial] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [mostrarModalSalida, setMostrarModalSalida] = useState(false);
  const [emuladoActivo, setEmuladoActivo] = useState(null);
  const emuladoSeleccionado = useMemo(
    () => EMULADOS.find((modulo) => modulo.id === emuladoActivo) || null,
    [emuladoActivo]
  );
  const abrirEmulado = useCallback((id) => setEmuladoActivo(id), []);
  const cerrarEmulado = useCallback(() => setEmuladoActivo(null), []);

  // Con un emulado abierto: bloquea el scroll de fondo y permite cerrar con Escape.
  useEffect(() => {
    if (!emuladoActivo) return undefined;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const alPresionarTecla = (e) => {
      if (e.key === 'Escape') setEmuladoActivo(null);
    };
    window.addEventListener('keydown', alPresionarTecla);
    return () => {
      document.body.style.overflow = anterior;
      window.removeEventListener('keydown', alPresionarTecla);
    };
  }, [emuladoActivo]);

  // El nombre del perfil llega de forma asíncrona (authReady); solo rellena si el usuario no ha escrito nada.
  useEffect(() => {
    if (nombrePilotoTocadoRef.current) return;
    const sugerido = sanitizarNombre(nombreInicial);
    if (sugerido) setNombrePiloto(sugerido);
  }, [nombreInicial]);

  const cambiarNombrePiloto = useCallback((valor) => {
    nombrePilotoTocadoRef.current = true;
    setNombrePiloto(sanitizarNombre(valor));
  }, []);


  // Cargar historial previo de forma segura si el entorno permite localStorage
  useEffect(() => {
    try {
      const guardado =
        window.localStorage.getItem(CLAVE_EVALUACION) ||
        window.localStorage.getItem(CLAVE_EVALUACION_LEGACY);
      if (guardado) {
        const parsed = JSON.parse(guardado);
        if (parsed && typeof parsed.porcentaje === 'number') {
          setUltimoHistorial(parsed);
        }
      }
    } catch {
      // Silencioso en entornos sin acceso a storage
    }
  }, []);

  // Si hay sesión, el último resultado guardado en Firestore manda sobre el local.
  useEffect(() => {
    if (!uid) return undefined;
    let activo = true;
    cargarEvaluacionVial(uid)
      .then((remoto) => {
        if (!activo || !remoto || typeof remoto.porcentaje !== 'number') return;
        setUltimoHistorial({
          porcentaje: remoto.porcentaje,
          modo: remoto.modo,
          modoLabel: etiquetaModo(remoto.modo),
          intentos: Number(remoto.intentos) || 1,
          mejorDiagnostico: Number(remoto.mejorDiagnostico) || 0,
        });
      })
      .catch((err) => {
        console.warn('[EvaluacionVial] No se pudo cargar el resultado remoto:', err?.code || err);
      });
    return () => {
      activo = false;
    };
  }, [uid]);

  // Historial append-only de intentos (solo estudiantes con sesión).
  const recargarHistorial = useCallback(async () => {
    if (!uid) {
      try {
        const local = JSON.parse(window.localStorage.getItem(CLAVE_HISTORIAL) || '[]');
        setHistorial(Array.isArray(local) ? local.slice(0, MAX_HISTORIAL_LOCAL) : []);
      } catch {
        setHistorial([]);
      }
      return;
    }
    try {
      const intentos = await cargarHistorialEvaluacionVial(uid, 10);
      setHistorial(intentos);
    } catch (err) {
      console.warn('[EvaluacionVial] No se pudo cargar el historial:', err?.code || err);
    }
  }, [uid]);

  useEffect(() => {
    recargarHistorial();
  }, [recargarHistorial]);

  const iniciarQuiz = useCallback((modoId, preguntasCustom = null) => {
    const modosValidos = ['integral', 'ley_ve', 'tecnica_msf', 'reintento'];
    const modoNormalizado = modosValidos.includes(modoId) ? modoId : 'integral';
    const setConstruido = construirSetPreguntas(modoNormalizado, preguntasCustom);
    setTituloModoActual(etiquetaModo(modoNormalizado));
    setModoActualId(modoNormalizado);
    setPreguntasActivas(setConstruido);
    setResultadoSesion(null);
    setVista('quiz');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const manejarFinalizacion = useCallback(
    ({ respuestas, tiempoSegundos, rachaMaxima }) => {
      const total = preguntasActivas.length;
      const aciertos = preguntasActivas.filter((q) => respuestas[q.id] === q.correctaId).length;
      const porcentaje = total > 0 ? Math.round((aciertos / total) * 100) : 0;
      // Solo el examen integral sin ayudas cuenta como diagnóstico; el resto es práctica.
      const tipoIntento =
        modoEvaluacion === 'examen' && modoActualId === 'integral' ? 'diagnostico' : 'practica';

      const resumenHistorial = {
        porcentaje,
        modo: modoActualId,
        modoLabel: etiquetaModo(modoActualId),
      };
      setUltimoHistorial(resumenHistorial);
      try {
        window.localStorage.setItem(CLAVE_EVALUACION, JSON.stringify(resumenHistorial));
      } catch {
        // Silencioso si el almacenamiento está restringido
      }

      if (uid) {
        guardarEvaluacionVial(uid, {
          porcentaje,
          modo: modoActualId,
          rachaMaxima,
          tiempoSegundos,
          aciertos,
          total,
          tipoIntento,
        })
          .then(() => recargarHistorial())
          .catch((err) => {
            console.warn('[EvaluacionVial] No se pudo guardar en Firestore:', err?.code || err);
            if (typeof mostrarToast === 'function') {
              mostrarToast('Tu resultado se guardó solo en este dispositivo.', 'error');
            }
          });
      } else {
        // Anónimos: historial local de los últimos intentos.
        try {
          const previos = JSON.parse(window.localStorage.getItem(CLAVE_HISTORIAL) || '[]');
          const lista = Array.isArray(previos) ? previos : [];
          const nuevo = {
            porcentaje,
            modo: modoActualId,
            tipoIntento,
            aciertos,
            total,
            fecha: new Date().toISOString(),
          };
          const recortado = [nuevo, ...lista].slice(0, MAX_HISTORIAL_LOCAL);
          window.localStorage.setItem(CLAVE_HISTORIAL, JSON.stringify(recortado));
          setHistorial(recortado);
        } catch {
          // Silencioso si el almacenamiento está restringido
        }
      }

      setResultadoSesion({ respuestas, tiempoSegundos, rachaMaxima });
      setVista('resultados');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [preguntasActivas, modoActualId, modoEvaluacion, uid, mostrarToast, recargarHistorial]
  );

  const confirmarSalidaQuiz = () => {
    setMostrarModalSalida(false);
    setVista('inicio');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const EmuladoActivo = emuladoSeleccionado?.Componente || null;

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-900 flex flex-col font-sans antialiased overflow-x-hidden">
      {/* Animaciones suaves integradas */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.28s ease-out both;
        }
        .animate-slideUp {
          animation: slideUp 0.25s ease-out both;
        }
      `}</style>

      {/* Header Oscuro Elegante (#0F172A) */}
      <header className="sticky top-0 z-30 bg-[#0F172A] text-white border-b border-slate-800 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-2.5 sm:py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              role="img"
              aria-label="Motoapp"
              className="h-10 w-[72px] shrink-0 bg-no-repeat"
              style={{
                backgroundImage: "url('/logo.png')",
                backgroundSize: '313.5% auto',
                backgroundPosition: '50% 42%',
              }}
            />
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-white truncate">
                Reto Vial
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                Diagnóstico de Ley Venezolana &amp; Técnica de Manejo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {typeof onVolverApp === 'function' && (
              <button
                type="button"
                onClick={onVolverApp}
                aria-label={uid ? 'Volver al panel del estudiante' : 'Volver a formación'}
                className="px-3 py-1.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Volver</span>
              </button>
            )}
            {vista !== 'inicio' && (
              <button
                type="button"
                onClick={() => {
                  if (vista === 'quiz') setMostrarModalSalida(true);
                  else setVista('inicio');
                }}
                className="shrink-0 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Inicio</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Contenido Principal Responsive */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-7">
        {vista === 'inicio' && (
          <PantallaInicio
            nombrePiloto={nombrePiloto}
            setNombrePiloto={cambiarNombrePiloto}
            modoEvaluacion={modoEvaluacion}
            setModoEvaluacion={setModoEvaluacion}
            ultimoHistorial={ultimoHistorial}
            historial={historial}
            historialLocal={!uid}
            onIniciarQuiz={(modoId) => iniciarQuiz(modoId)}
            onAbrirFlashcards={() => {
              setVista('flashcards');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onAbrirEmulado={abrirEmulado}
          />
        )}

        {vista === 'flashcards' && (
          <ModuloFlashcards
            onVolverInicio={() => setVista('inicio')}
            onIniciarDiagnostico={() => iniciarQuiz('integral')}
          />
        )}

        {vista === 'quiz' && preguntasActivas.length > 0 && (
          <ModuloQuiz
            preguntas={preguntasActivas}
            modoEvaluacion={modoEvaluacion}
            tituloModo={tituloModoActual}
            onFinalizar={manejarFinalizacion}
            onSolicitarSalida={() => setMostrarModalSalida(true)}
          />
        )}

        {vista === 'resultados' && resultadoSesion && (
          <DashboardResultados
            nombrePiloto={nombrePiloto}
            tituloModo={tituloModoActual}
            preguntas={preguntasActivas}
            respuestas={resultadoSesion.respuestas}
            tiempoSegundos={resultadoSesion.tiempoSegundos}
            rachaMaxima={resultadoSesion.rachaMaxima}
            onReintentarFalladas={(falladas) => iniciarQuiz('reintento', falladas)}
            onVolverInicio={() => setVista('inicio')}
            onAbrirFlashcards={() => {
              setVista('flashcards');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}
      </main>

      {/* Footer informativo (oculto en móvil para no generar scroll en el reto) */}
      <footer className="hidden sm:block max-w-4xl w-full mx-auto px-4 pt-5 text-center text-[11px] text-slate-400">
        Referencias: LTT (G.O. 38.985), Decreto N° 8.495, Res. Conjunta Alcabalas (G.O. 42.458),
        COVENIN 1707 y Manual MSF Ed. 17. Resultado orientativo: no constituye certificación ni
        trámite oficial.
      </footer>
      {/* Aviso legal colapsable, igual que el Home, para no generar scroll extra */}
      <div className="max-w-4xl w-full mx-auto px-4 pb-4">
        <LegalFooter compact />
      </div>

      {/* Emulado: simuladores a pantalla completa (FT-054) */}
      {emuladoSeleccionado && EmuladoActivo && (
        <div
          className="fixed inset-0 z-[60] flex flex-col bg-[#F1F5F9]"
          role="dialog"
          aria-modal="true"
          aria-label={`Emulado: ${emuladoSeleccionado.titulo}`}
        >
          <div className="shrink-0 bg-[#0F172A] text-white px-2.5 py-1.5 sm:px-4 sm:py-2 flex items-center gap-2 border-b border-slate-800">
            <button
              type="button"
              onClick={cerrarEmulado}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-200 hover:text-white px-2 py-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Volver al menú Emulado"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Emulado</span>
            </button>
            <span className="text-[11px] sm:text-xs font-semibold text-slate-400 truncate">
              {emuladoSeleccionado.titulo}
            </span>
            <button
              type="button"
              onClick={cerrarEmulado}
              className="ml-auto p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer shrink-0"
              aria-label="Cerrar simulador"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="emulado-host flex-1 min-h-0 overflow-y-auto overscroll-contain">
            <style>{'.emulado-host .min-h-screen{min-height:100%;}'}</style>
            <Suspense
              fallback={
                <div className="p-10 text-center text-sm text-slate-500">Cargando simulador…</div>
              }
            >
              <EmuladoActivo />
            </Suspense>
          </div>
        </div>
      )}

      {/* Modal de confirmación de salida */}
      <ModalConfirmarSalida
        visible={mostrarModalSalida}
        onCancelar={() => setMostrarModalSalida(false)}
        onConfirmar={confirmarSalidaQuiz}
      />
    </div>
  );
}

export default function EvaluacionVialView() {
  const navigate = useNavigate();
  const { fbUser, user } = useContext(AppContext);
  const { showToast } = useToast();
  const uid = fbUser?.uid || null;
  // FT-051: el nombre del reporte se precarga desde el perfil del estudiante (SSOT usuarios/{uid}).
  const nombrePerfil =
    user?.role === 'estudiante'
      ? [user?.data?.nombre, user?.data?.apellido].filter(Boolean).join(' ').trim() ||
        fbUser?.displayName ||
        ''
      : '';

  return (
    <ErrorBoundary>
      <EvaluacionVialApp
        uid={uid}
        nombreInicial={nombrePerfil}
        mostrarToast={showToast}
        onVolverApp={() => navigate(uid ? '/portal-reservas' : '/teorico')}
      />
    </ErrorBoundary>
  );
}
