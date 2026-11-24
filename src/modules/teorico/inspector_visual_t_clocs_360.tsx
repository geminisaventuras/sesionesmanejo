import React, { useState, useRef, useMemo, useCallback } from 'react';
import {
  Bike,
  RotateCcw,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  Scale,
  Wrench,
  BookOpen,
  FileText,
  Copy,
  Check,
  Sparkles,
  Award,
  Flame,
  Eye,
  Search,
  ChevronDown,
  ChevronUp,
  X,
  Info,
  Compass,
  Zap,
  ArrowRight,
  Ban,
  ListChecks,
  User,
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
    console.error('Error en Inspector Visual T-CLOCS 360°:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-md w-full text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-extrabold text-slate-900">
              Inconveniente en el módulo de inspección
            </h2>
            <p className="text-sm text-slate-600">
              Puedes reiniciar el Inspector Visual T-CLOCS 360° para continuar tu práctica.
            </p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false })}
              className="w-full py-3 px-4 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-sm transition-colors cursor-pointer"
            >
              Reiniciar Inspector
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ============================================================================
 * 2. CONSTANTES: VISTAS 360°, CATEGORÍAS T-CLOCS Y 18 PUNTOS DE INSPECCIÓN
 * ============================================================================ */
const VISTAS_360 = [
  { id: 'izq', index: 0, angulo: '0°', titulo: 'Lateral Izquierda', corto: 'Izquierda (0°)' },
  { id: 'frontal', index: 1, angulo: '90°', titulo: 'Frontal / Cabina', corto: 'Frontal (90°)' },
  { id: 'der', index: 2, angulo: '180°', titulo: 'Lateral Derecha', corto: 'Derecha (180°)' },
  { id: 'trasera', index: 3, angulo: '270°', titulo: 'Vista Trasera', corto: 'Trasera (270°)' },
];

const CATEGORIAS_TCLOCS = [
  {
    id: 'T',
    letra: 'T',
    nombre: 'Cauchos y Ruedas',
    ingles: 'Tires & Wheels',
    colorBg: 'bg-blue-50',
    colorText: 'text-[#2563EB]',
    colorBorder: 'border-blue-200',
    colorPill: 'bg-[#2563EB]',
    resumen: 'Presión, banda de rodamiento, rines, rodamientos y respuesta real de frenos.',
  },
  {
    id: 'C1',
    letra: 'C',
    nombre: 'Controles',
    ingles: 'Controls',
    colorBg: 'bg-indigo-50',
    colorText: 'text-indigo-700',
    colorBorder: 'border-indigo-200',
    colorPill: 'bg-indigo-600',
    resumen: 'Manubrio, palancas, retorno de acelerador, cables, pedales y ambos espejos.',
  },
  {
    id: 'L',
    letra: 'L',
    nombre: 'Luces y Eléctrico',
    ingles: 'Lights & Electrics',
    colorBg: 'bg-amber-50',
    colorText: 'text-amber-800',
    colorBorder: 'border-amber-200',
    colorPill: 'bg-amber-500',
    resumen: 'Faro delantero, luz roja y stop, direccionales, bocina, interruptor de paro y batería.',
  },
  {
    id: 'O',
    letra: 'O',
    nombre: 'Aceites y Fluidos',
    ingles: 'Oil & Fluids',
    colorBg: 'bg-emerald-50',
    colorText: 'text-emerald-800',
    colorBorder: 'border-emerald-200',
    colorPill: 'bg-emerald-600',
    resumen: 'Nivel y color de aceite, líquido de frenos, combustible y ausencia de fugas.',
  },
  {
    id: 'C2',
    letra: 'C',
    nombre: 'Chasis y Cadena',
    ingles: 'Chassis',
    colorBg: 'bg-sky-50',
    colorText: 'text-sky-800',
    colorBorder: 'border-sky-200',
    colorPill: 'bg-sky-600',
    resumen: 'Armazón, dirección, suspensión delantera/trasera, cadena de arrastre y tornillería.',
  },
  {
    id: 'S',
    letra: 'S',
    nombre: 'Soportes y Normativa',
    ingles: 'Stands & Compliance',
    colorBg: 'bg-slate-100',
    colorText: 'text-slate-800',
    colorBorder: 'border-slate-300',
    colorPill: 'bg-slate-800',
    resumen: 'Pata lateral, caballete y resortes, placa visible, reflectivos y silenciador reglamentario.',
  },
];

// 18 puntos de inspección distribuidos en las 4 vistas (Izq: 5, Frontal: 5, Der: 5, Trasera: 3)
const PUNTOS_INSPECCION = [
  // ===================== T: TIRES & WHEELS (3 puntos) =====================
  {
    id: 't1',
    categoria: 'T',
    vista: 'izq',
    x: 132,
    y: 238,
    titulo: 'Caucho, dibujo y presión delantera',
    checklist: [
      'Verifica la presión en frío con manómetro según el manual del fabricante.',
      'Revisa profundidad del dibujo, grietas laterales, bultos u objetos incrustados.',
      'Comprueba que el rin no tenga abolladuras, radios flojos ni rodamientos con juego.',
    ],
    baseLegal: 'Decreto N° 8.495 Art. 7 (Condiciones técnicas de seguridad y mantenimiento).',
  },
  {
    id: 't2',
    categoria: 'T',
    vista: 'trasera',
    x: 300,
    y: 256,
    titulo: 'Caucho, rin y alineación trasera',
    checklist: [
      'Inspecciona desgaste parejo en la banda central y hombros del caucho trasero.',
      'Verifica alineación vertical de la rueda respecto al guardafango y basculante.',
      'Comprueba ausencia de cortes, clavos y que el vástago de la válvula tenga su tapa.',
    ],
    baseLegal: 'Decreto N° 8.495 Art. 7 (Características técnicas y mantenimiento seguro).',
  },
  {
    id: 't3',
    categoria: 'T',
    vista: 'der',
    x: 454,
    y: 238,
    titulo: 'Sistema de frenos (delantero y trasero)',
    checklist: [
      'Aprieta maneta delantera y pisa el pedal trasero: deben sentirse firmes, sin tacto esponjoso.',
      'Revisa espesor de pastillas, superficie de discos/tambor y que la rueda gire libre al soltar.',
      'Prueba ambos frenos rodando lento antes de incorporarte al tráfico.',
    ],
    baseLegal:
      'Decreto N° 8.495 Art. 9 num. 3: Frenos capaces de detener la moto en 5 m circulando a 30 km/h.',
  },

  // ===================== C1: CONTROLS (3 puntos) =====================
  {
    id: 'c1',
    categoria: 'C1',
    vista: 'frontal',
    x: 196,
    y: 108,
    titulo: 'Manubrio, palancas y acelerador',
    checklist: [
      'Gira el manubrio de tope a tope: movimiento suave sin atascos ni tirones de cables.',
      'Palancas de clutch y freno delantero sin roturas, dobladas ni holgura excesiva.',
      'Gira el puño del acelerador y suéltalo: debe regresar de inmediato a su posición de reposo.',
    ],
    baseLegal: 'Decreto N° 8.495 Art. 26 (Obligación de mantener el control total durante la circulación).',
  },
  {
    id: 'c2',
    categoria: 'C1',
    vista: 'der',
    x: 296,
    y: 230,
    titulo: 'Cables, mangueras y pedales',
    checklist: [
      'Revisa mangueras de freno sin grietas, abultamientos ni humedad por fuga.',
      'Comprueba funda de guayas (acelerador/clutch) sin deshilachados ni dobleces.',
      'Verifica firmeza del pedal de freno trasero y palanca de cambios sin rozar el chasis.',
    ],
    baseLegal: 'Manual MSF T-CLOCS (Controles) · Decreto N° 8.495 Art. 7.',
  },
  {
    id: 'c3',
    categoria: 'C1',
    vista: 'frontal',
    x: 406,
    y: 66,
    titulo: 'Dos espejos retrovisores (izq. y der.)',
    checklist: [
      'Confirma la presencia de ambos espejos limpios, sin cristales rotos ni vibración suelta.',
      'Ajústalos sentado en postura real para ver el carril detrás y minimizar puntos ciegos.',
      'Asegura que las tuercas de fijación mantengan su posición a velocidad de crucero.',
    ],
    baseLegal:
      'Decreto N° 8.495 Art. 9 num. 6: Obligatorio portar dos (2) espejos retrovisores (derecho e izquierdo).',
  },

  // ===================== L: LIGHTS & ELECTRICS (3 puntos) =====================
  {
    id: 'l1',
    categoria: 'L',
    vista: 'frontal',
    x: 300,
    y: 132,
    titulo: 'Faro delantero y reflectivo blanco',
    checklist: [
      'Enciende luz baja y luz alta; verifica correcta alineación del haz sin encandilar.',
      'Asegura que el cristal esté limpio y sin luces rojas ni pilotos antirreglamentarios adelante.',
      'Confirma que las luces permanezcan operativas para circular siempre encendidas.',
    ],
    baseLegal:
      'Decreto N° 8.495 Art. 9 num. 2 (máx. 2 faros, alcance 150 m), Art. 9 num. 8 (reflectivo blanco adelante) y Art. 11 num. 4 (prohibida luz roja delantera).',
  },
  {
    id: 'l2',
    categoria: 'L',
    vista: 'trasera',
    x: 300,
    y: 120,
    titulo: 'Luz trasera roja, stop y direccionales',
    checklist: [
      'Comprueba que la luz roja de posición encienda constante al pasar el contacto.',
      'Acciona la maneta delantera y el pedal trasero por separado: ambos deben activar la luz de stop.',
      'Verifica intermitencia clara de ambas direccionales traseras.',
    ],
    baseLegal:
      'Decreto N° 8.495 Art. 9 num. 4 (luz roja trasera visible de noche a 100 m) y Art. 28 num. 14.',
  },
  {
    id: 'l3',
    categoria: 'L',
    vista: 'frontal',
    x: 402,
    y: 112,
    titulo: 'Direccionales, bocina, paro motor y batería',
    checklist: [
      'Prueba direccionales delanteras izquierda/derecha y su indicador en el tablero.',
      'Acciona la bocina eléctrica original (evita usarla innecesariamente en zonas urbanas).',
      'Verifica el interruptor de paro del motor (engine cut-off) y bornes firmes de la batería.',
    ],
    baseLegal:
      'Decreto N° 8.495 Art. 9 num. 1 (bocina eléctrica), Art. 11 num. 6 (prohibidas sirenas/pitos) y Art. 11 num. 7.',
  },

  // ===================== O: OIL & FLUIDS (3 puntos) =====================
  {
    id: 'o1',
    categoria: 'O',
    vista: 'der',
    x: 332,
    y: 204,
    titulo: 'Nivel y estado del aceite de motor',
    checklist: [
      'Con la moto nivelada verticalmente, verifica el nivel en la mirilla o varilla entre MIN y MAX.',
      'Observa el aspecto del aceite: no debe verse lechoso (agua) ni excesivamente negro/quemado.',
      'Comprueba que el tapón de llenado esté bien cerrado.',
    ],
    baseLegal: 'Manual MSF T-CLOCS (Aceites y Fluidos) · Prevención de traba mecánica en ruta.',
  },
  {
    id: 'o2',
    categoria: 'O',
    vista: 'izq',
    x: 274,
    y: 132,
    titulo: 'Líquido de frenos, combustible y batería',
    checklist: [
      'Revisa la mirilla del depósito de líquido de frenos (nivel correcto y fluido claro).',
      'Verifica combustible suficiente para tu recorrido, llave de paso sin fugas y mangueras secas.',
      'Comprueba que la batería (bajo el asiento) esté fija y sin sulfatación en bornes.',
    ],
    baseLegal: 'Manual MSF T-CLOCS (Fluidos) · Decreto N° 8.495 Art. 7.',
  },
  {
    id: 'o3',
    categoria: 'O',
    vista: 'der',
    x: 318,
    y: 266,
    titulo: 'Inspección de fugas bajo motor y horquillas',
    checklist: [
      'Observa el suelo debajo de la moto buscando gotas frescas de aceite, gasolina o refrigerante.',
      'Pasa la vista por juntas del cárter y bomba de freno para descartar humedad activa.',
      'Asegura que ningún fluido pueda caer sobre la banda de rodamiento del caucho trasero.',
    ],
    baseLegal:
      'Decreto N° 8.495 Art. 27 (Evitar derrames/objetos que afecten la seguridad o contaminen la vía).',
  },

  // ===================== C2: CHASSIS (3 puntos) =====================
  {
    id: 'ch1',
    categoria: 'C2',
    vista: 'izq',
    x: 280,
    y: 184,
    titulo: 'Armazón, cojinetes y montaje de accesorios',
    checklist: [
      'Inspecciona soldaduras y tubos del armazón buscando grietas o pintura pelada por fatiga.',
      'Comprueba que el cabezal de dirección y el basculante no presenten holgura al moverlos.',
      'Verifica que parrillas, maletas o accesorios estén firmes sin alterar la maniobrabilidad.',
    ],
    baseLegal:
      'Decreto N° 8.495 Art. 8: Prohibido modificar estructura o características originales sin autorización expresa del INTT.',
  },
  {
    id: 'ch2',
    categoria: 'C2',
    vista: 'frontal',
    x: 264,
    y: 214,
    titulo: 'Suspensión (horquillas y amortiguador)',
    checklist: [
      'Presiona el frente con el freno aplicado: las horquillas deben bajar y subir parejo sin clavarse.',
      'Verifica que los retenes de las barras delanteras estén secos, sin aceite escurriendo.',
      'Revisa el amortiguador trasero buscando rebote controlado y ausencia de fugas.',
    ],
    baseLegal: 'Manual MSF T-CLOCS (C-Chasis: Suspensión delantera y trasera).',
  },
  {
    id: 'ch3',
    categoria: 'C2',
    vista: 'izq',
    x: 386,
    y: 238,
    titulo: 'Cadena, kit de arrastre y tornillería',
    checklist: [
      'Mide la tensión de la cadena en su punto más ajustado (holgura típica de 2 a 3 cm).',
      'Verifica lubricación adecuada y que los dientes de corona/piñón no estén afilados ni rotos.',
      'Revisa visualmente tuercas de ejes, abrazaderas y pasadores críticos.',
    ],
    baseLegal: 'Manual MSF T-CLOCS (C-Chasis: Cadena/Banda y tornillos de sujeción).',
  },

  // ===================== S: STANDS & COMPLIANCE (3 puntos) =====================
  {
    id: 's1',
    categoria: 'S',
    vista: 'izq',
    x: 312,
    y: 262,
    titulo: 'Soporte lateral (pata) y resortes',
    checklist: [
      'Comprueba que el soporte lateral y/o caballete central no tengan grietas ni dobleces.',
      'Verifica que los resortes estén en su lugar con tensión firme para mantenerlo arriba al rodar.',
      'Si posee sensor de pata lateral, valida que corte el encendido si pones marcha con la pata abajo.',
    ],
    baseLegal:
      'Manual MSF T-CLOCS (S-Soportes de Paro) · Decreto N° 8.495 Art. 32 num. 8 (Estacionar con implementos de la moto).',
  },
  {
    id: 's2',
    categoria: 'S',
    vista: 'trasera',
    x: 300,
    y: 170,
    titulo: 'Placa identificadora y reflectivo rojo',
    checklist: [
      'Verifica que la placa esté firmemente sujeta, limpia, legible y sin calcomanías encima.',
      'Confirma presencia de material reflectivo rojo en la parte trasera en buen estado.',
      'Asegura que ninguna maleta, bolso o accesorio oculte los caracteres de la placa.',
    ],
    baseLegal:
      'Decreto N° 8.495 Art. 5 num. 2, Art. 9 num. 8 (reflectivo rojo atrás), Art. 11 num. 1 (prohibido tapar placas) y Art. 12.',
  },
  {
    id: 's3',
    categoria: 'S',
    vista: 'der',
    x: 178,
    y: 222,
    titulo: 'Silenciador y tubo de escape reglamentario',
    checklist: [
      'Verifica que el escape tenga su dispositivo silenciador intacto, bien fijado y sin perforaciones.',
      'Confirma que la salida de gases NO apunte hacia la superficie de la calzada ni la acera.',
      'Revisa que el protector térmico esté firme para evitar quemaduras al pasajero.',
    ],
    baseLegal:
      'Decreto N° 8.495 Art. 9 num. 7 (silenciador obligatorio), Art. 11 num. 2 (gases no hacia la calzada) y Art. 11 num. 8 (prohibido escape libre).',
  },
];

/* ============================================================================
 * 3. DATOS DEL RETO GAMIFICADO "DETECTA LA FALLA" (6 CASOS REALES)
 * ============================================================================ */
const CASOS_RETO = [
  {
    id: 'caso-1',
    titulo: 'Salida matutina en Caracas',
    contexto:
      'Vas a salir temprano por la autopista Francisco Fajardo. Antes de encender la moto, da una vuelta 360° y detecta la anomalía visual.',
    vistaInicial: 'izq',
    vistaFalla: 'der',
    puntoFallaId: 'o3',
    anomaliaVisual: 'fuga_aceite',
    veredictoCorrecto: 'critico',
    tituloFalla: 'Fuga activa de aceite debajo del motor',
    explicacion:
      'Se observan gotas activas cayendo bajo el cárter. Rodar así puede impregnar de aceite el caucho trasero causando una caída inmediata, además de fundir el motor por falta de lubricación.',
    cita: 'Manual MSF T-CLOCS (O — Aceites y Fluidos) · Decreto N° 8.495 Art. 27 (No derramar sustancias en la vía).',
  },
  {
    id: 'caso-2',
    titulo: 'Revisión tras lluvia nocturna',
    contexto:
      'Ayer rodaste bajo lluvia fuerte. Inspecciona la motocicleta alrededor antes de salir a tu rutina diaria para evaluar si necesita atención.',
    vistaInicial: 'der',
    vistaFalla: 'izq',
    puntoFallaId: 'ch3',
    anomaliaVisual: 'cadena_seca',
    veredictoCorrecto: 'preventivo',
    tituloFalla: 'Cadena seca con leve óxido superficial y holgura al límite',
    explicacion:
      'La cadena perdió lubricación tras la lluvia y presenta leve holgura. No impide un traslado corto a baja velocidad hacia el taller, pero exige limpieza, lubricación y ajuste en el punto más tenso de inmediato.',
    cita: 'Manual MSF T-CLOCS (C — Chasis: Tensión y lubricación de cadena).',
  },
  {
    id: 'caso-3',
    titulo: 'Moto recién modificada por un amigo',
    contexto:
      'Un compañero le cambió el bombillo a su moto para darle un toque llamativo antes de una rodada nocturna. Revisa las 4 vistas y audita el hallazgo.',
    vistaInicial: 'izq',
    vistaFalla: 'frontal',
    puntoFallaId: 'l1',
    anomaliaVisual: 'faro_rojo',
    veredictoCorrecto: 'critico',
    tituloFalla: 'Faro delantero emitiendo luz roja antirreglamentaria',
    explicacion:
      'Una luz roja frontal confunde gravemente a los vehículos de frente haciéndoles creer que te alejas cuando en realidad te aproximas, además de ser una infracción directa.',
    cita: 'Decreto N° 8.495 Art. 11 num. 4 (Prohibido usar faros o reflectores de luz roja adelante) y Art. 9 num. 2 (alcance 150 m).',
  },
  {
    id: 'caso-4',
    titulo: 'Preparación para subida de montaña',
    contexto:
      'Estás por iniciar una ruta con curvas cerradas hacia la montaña. Revisa cuidadosamente todos los ángulos antes de subirte.',
    vistaInicial: 'trasera',
    vistaFalla: 'izq',
    puntoFallaId: 's1',
    anomaliaVisual: 'resorte_suelto',
    veredictoCorrecto: 'critico',
    tituloFalla: 'Resorte del soporte lateral (pata) suelto y colgando',
    explicacion:
      'Sin tensión en el resorte, la pata lateral puede desplegarse sola con los baches y clavarse contra el asfalto al inclinar hacia la izquierda, provocando una caída grave.',
    cita: 'Manual MSF T-CLOCS (S — Soportes de Paro: resortes en su lugar y tensión firme).',
  },
  {
    id: 'caso-5',
    titulo: 'Inspección rápida antes de ir al trabajo',
    contexto:
      'Ayer la moto rozó una columna en el estacionamiento. Realiza la inspección 360° para verificar si cumple condiciones legales y técnicas.',
    vistaInicial: 'izq',
    vistaFalla: 'frontal',
    puntoFallaId: 'c3',
    anomaliaVisual: 'sin_espejo_der',
    veredictoCorrecto: 'critico',
    tituloFalla: 'Espejo retrovisor derecho faltante',
    explicacion:
      'Circular sin el espejo derecho te deja ciego ante vehículos que se aproximan por tu flanco derecho y viola el equipamiento mínimo obligatorio exigido en Venezuela.',
    cita: 'Decreto N° 8.495 Art. 9 num. 6: Toda motocicleta debe estar equipada con dos (2) espejos retrovisores (derecho e izquierdo).',
  },
  {
    id: 'caso-6',
    titulo: 'Auditoría previa a un punto de control',
    contexto:
      'Antes de salir a carretera nacional donde hay puntos de control viales, inspecciona la motocicleta completa y localiza la irregularidad.',
    vistaInicial: 'frontal',
    vistaFalla: 'trasera',
    puntoFallaId: 's2',
    anomaliaVisual: 'placa_tapada',
    veredictoCorrecto: 'critico',
    tituloFalla: 'Placa identificadora obstruida con distintivo adhesivo',
    explicacion:
      'Colocar calcomanías, distintivos o accesorios que impidan leer claramente las placas identificadoras está prohibido y acarrea retención o sanción en puntos de control.',
    cita: 'Decreto N° 8.495 Art. 11 num. 1 (Prohibido usar distintivos que impidan leer placas) y Art. 5 num. 2.',
  },
];

/* ============================================================================
 * 4. UTILIDADES PURAS
 * ============================================================================ */
function sanitizarTexto(valor, maxLen = 50) {
  return String(valor || '')
    .replace(/[<>"{}[\]\\]/g, '')
    .slice(0, maxLen);
}

/* ============================================================================
 * 5. COMPONENTE VISUAL SVG 360° DE ALTA PRECISIÓN (4 VISTAS + ANOMALÍAS)
 * ============================================================================ */
function MotocicletaSVG360({
  vista,
  puntosVista,
  estados,
  puntoSeleccionadoId,
  onSeleccionarPunto,
  filtroCategoria,
  anomaliaActiva = null,
  modoReto = false,
  puntoEncontradoId = null,
  puntoIncorrectoId = null,
}) {
  return (
    <svg
      viewBox="0 0 600 330"
      className="w-full h-auto select-none block"
      role="img"
      aria-label={`Ilustración técnica de motocicleta — Vista ${vista}`}
    >
      <defs>
        <radialGradient id="floorShadow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#0F172A" stopOpacity="0.24" />
          <stop offset="100%" stopColor="#0F172A" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="tankBlue" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
        <linearGradient id="metalGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#CBD5E1" />
          <stop offset="50%" stopColor="#94A3B8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
        <linearGradient id="exhaustGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#64748B" />
          <stop offset="50%" stopColor="#CBD5E1" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>
      </defs>

      {/* Fondo de plataforma giratoria técnica */}
      <ellipse cx="300" cy="292" rx="235" ry="22" fill="url(#floorShadow)" />
      <ellipse
        cx="300"
        cy="292"
        rx="215"
        ry="18"
        fill="none"
        stroke="#CBD5E1"
        strokeWidth="1.5"
        strokeDasharray="6 6"
      />

      {/* =================================================================
       * VISTA 0°: LATERAL IZQUIERDA (frente hacia la izquierda)
       * ================================================================= */}
      {vista === 'izq' && (
        <g>
          {/* Rueda Delantera (x: 132, y: 238) */}
          <g>
            <circle cx="132" cy="238" r="54" fill="#0F172A" />
            <circle cx="132" cy="238" r="37" fill="#1E293B" stroke="#94A3B8" strokeWidth="3" />
            <circle cx="132" cy="238" r="22" fill="none" stroke="#CBD5E1" strokeWidth="2.5" strokeDasharray="5 3" />
            <circle cx="132" cy="238" r="8" fill="#64748B" />
            {/* Radios estilizados */}
            {[0, 60, 120, 180, 240, 300].map((deg) => (
              <line
                key={deg}
                x1="132"
                y1="238"
                x2={132 + Math.cos((deg * Math.PI) / 180) * 35}
                y2={238 + Math.sin((deg * Math.PI) / 180) * 35}
                stroke="#64748B"
                strokeWidth="2.5"
              />
            ))}
          </g>

          {/* Rueda Trasera (x: 454, y: 238) */}
          <g>
            <circle cx="454" cy="238" r="56" fill="#0F172A" />
            <circle cx="454" cy="238" r="37" fill="#1E293B" stroke="#94A3B8" strokeWidth="3" />
            {/* Corona / Sprocket trasero */}
            <circle cx="454" cy="238" r="20" fill="#475569" stroke="#CBD5E1" strokeWidth="2" strokeDasharray="4 3" />
            <circle cx="454" cy="238" r="8" fill="#94A3B8" />
          </g>

          {/* Horquillas delanteras + Guardafango */}
          <line x1="196" y1="92" x2="132" y2="238" stroke="url(#metalGrad)" strokeWidth="11" strokeLinecap="round" />
          <line x1="188" y1="112" x2="152" y2="194" stroke="#0F172A" strokeWidth="13" strokeLinecap="round" />
          <path d="M 90 184 Q 134 166 176 184" fill="none" stroke="url(#tankBlue)" strokeWidth="8" strokeLinecap="round" />

          {/* Armazón / Chasis tubular */}
          <path
            d="M 196 106 L 312 146 L 444 134 M 198 118 L 236 226 L 330 228 L 312 146"
            fill="none"
            stroke="#334155"
            strokeWidth="9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Motor y bloque izquierdo + palanca de cambios */}
          <rect x="234" y="168" width="96" height="62" rx="14" fill="#1E293B" stroke="#475569" strokeWidth="2.5" />
          <circle cx="294" cy="204" r="18" fill="#334155" stroke="#64748B" strokeWidth="2" />
          <line x1="252" y1="184" x2="314" y2="184" stroke="#475569" strokeWidth="2" />
          <line x1="252" y1="192" x2="314" y2="192" stroke="#475569" strokeWidth="2" />
          {/* Palanca de cambios */}
          <line x1="286" y1="224" x2="256" y2="232" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round" />
          <circle cx="254" cy="232" r="4" fill="#0F172A" />

          {/* Amortiguador trasero */}
          <line x1="354" y1="158" x2="394" y2="222" stroke="#EF4444" strokeWidth="8" strokeDasharray="5 4" strokeLinecap="round" />

          {/* Basculante trasero */}
          <path d="M 326 224 L 454 238" stroke="#64748B" strokeWidth="11" strokeLinecap="round" />

          {/* Cadena y Kit de Arrastre (Normal vs Anomalía cadena_seca) */}
          {anomaliaActiva === 'cadena_seca' ? (
            <g>
              {/* Cadena superior tensa, inferior colgada en ámbar/óxido pulsante */}
              <line x1="334" y1="224" x2="454" y2="218" stroke="#D97706" strokeWidth="4" strokeDasharray="5 3" />
              <path
                d="M 334 242 Q 394 282 454 256"
                fill="none"
                stroke="#F59E0B"
                strokeWidth="5"
                strokeDasharray="6 3"
                className="animate-pulse"
              />
              {/* Indicador visual de holgura */}
              <path d="M 394 250 L 394 268" stroke="#EF4444" strokeWidth="2" strokeDasharray="2 2" />
              <text x="394" y="286" textAnchor="middle" fill="#B45309" fontSize="9.5" fontWeight="bold">
                SECA / FLOJA
              </text>
            </g>
          ) : (
            <g>
              <line x1="334" y1="224" x2="454" y2="218" stroke="#475569" strokeWidth="4" strokeDasharray="5 3" />
              <path d="M 334 242 Q 394 252 454 256" fill="none" stroke="#475569" strokeWidth="4" strokeDasharray="5 3" />
            </g>
          )}

          {/* Soporte Lateral (Pata) + Resorte (Normal vs Anomalía resorte_suelto) */}
          <g>
            <line x1="316" y1="230" x2="294" y2="286" stroke="#334155" strokeWidth="6" strokeLinecap="round" />
            <line x1="286" y1="286" x2="304" y2="286" stroke="#0F172A" strokeWidth="5" strokeLinecap="round" />
            {anomaliaActiva === 'resorte_suelto' ? (
              <g>
                {/* Resorte suelto colgando en rojo animado */}
                <path
                  d="M 314 236 L 322 250 L 314 256 L 324 266 L 316 276 L 325 288"
                  fill="none"
                  stroke="#EF4444"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  className="animate-pulse"
                />
                <circle cx="325" cy="290" r="4" fill="#EF4444" />
                <text x="348" y="284" fill="#DC2626" fontSize="9.5" fontWeight="bold">
                  RESORTE SUELTO
                </text>
              </g>
            ) : (
              <line x1="315" y1="236" x2="304" y2="264" stroke="#94A3B8" strokeWidth="2.5" strokeDasharray="3 2" />
            )}
          </g>

          {/* Tanque de gasolina esculpido */}
          <path
            d="M 206 112 Q 262 84 320 120 L 308 158 L 218 152 Z"
            fill="url(#tankBlue)"
            stroke="#1E40AF"
            strokeWidth="2"
          />
          {/* Logo rayo sutil en tanque */}
          <path d="M 248 124 L 288 128 L 274 138" fill="none" stroke="#93C5FD" strokeWidth="3" strokeLinecap="round" />

          {/* Asiento y Colín */}
          <path
            d="M 316 124 Q 362 142 404 128 L 466 118 L 474 136 L 320 156 Z"
            fill="#0F172A"
          />
          <path d="M 380 144 L 468 130 L 456 154 L 364 162 Z" fill="url(#tankBlue)" />

          {/* Faro delantero, tablero, manubrio y espejo izquierdo */}
          <path d="M 164 106 L 194 98 L 196 130 L 164 126 Z" fill="#1E293B" />
          <ellipse cx="163" cy="116" rx="5" ry="10" fill="#FEF08A" />
          <line x1="196" y1="92" x2="216" y2="76" stroke="#334155" strokeWidth="6" strokeLinecap="round" />
          <line x1="214" y1="76" x2="206" y2="54" stroke="#475569" strokeWidth="3" />
          <rect x="192" y="46" width="24" height="10" rx="4" fill="#0F172A" />

          {/* Luz trasera y porta-placa */}
          <rect x="468" y="120" width="10" height="14" rx="3" fill="#EF4444" />
          <line x1="466" y1="138" x2="486" y2="168" stroke="#1E293B" strokeWidth="4" />
          <rect x="480" y="160" width="12" height="18" rx="2" fill="#F8FAFC" stroke="#475569" strokeWidth="1.5" />
        </g>
      )}

      {/* =================================================================
       * VISTA 90°: FRONTAL / CABINA
       * ================================================================= */}
      {vista === 'frontal' && (
        <g>
          {/* Caucho delantero frontal */}
          <rect x="276" y="196" width="48" height="96" rx="20" fill="#0F172A" />
          <line x1="292" y1="208" x2="292" y2="282" stroke="#334155" strokeWidth="2.5" strokeDasharray="8 6" />
          <line x1="308" y1="208" x2="308" y2="282" stroke="#334155" strokeWidth="2.5" strokeDasharray="8 6" />

          {/* Horquillas telescópicas izquierda y derecha */}
          <rect x="258" y="108" width="13" height="142" rx="5" fill="url(#metalGrad)" />
          <rect x="329" y="108" width="13" height="142" rx="5" fill="url(#metalGrad)" />
          <rect x="256" y="112" width="17" height="58" rx="4" fill="#1E293B" />
          <rect x="327" y="112" width="17" height="58" rx="4" fill="#1E293B" />

          {/* Guardafango delantero alto */}
          <path d="M 264 188 Q 300 174 336 188 L 330 202 Q 300 192 270 202 Z" fill="url(#tankBlue)" />

          {/* Carenado / Tanque ancho detrás */}
          <path d="M 232 132 Q 300 100 368 132 L 354 198 L 246 198 Z" fill="#1E293B" opacity="0.9" />
          <path d="M 236 140 Q 254 128 272 146 L 266 184 L 242 178 Z" fill="url(#tankBlue)" />
          <path d="M 364 140 Q 346 128 328 146 L 334 184 L 358 178 Z" fill="url(#tankBlue)" />

          {/* Motor y estribos laterales */}
          <rect x="256" y="198" width="88" height="44" rx="10" fill="#334155" />
          <line x1="214" y1="234" x2="256" y2="234" stroke="#64748B" strokeWidth="6" strokeLinecap="round" />
          <line x1="344" y1="234" x2="386" y2="234" stroke="#64748B" strokeWidth="6" strokeLinecap="round" />

          {/* Manubrio, puños, palancas y mandos */}
          <path d="M 164 106 Q 230 92 300 94 Q 370 92 436 106" fill="none" stroke="#334155" strokeWidth="10" strokeLinecap="round" />
          {/* Puños */}
          <line x1="154" y1="108" x2="206" y2="100" stroke="#0F172A" strokeWidth="14" strokeLinecap="round" />
          <line x1="394" y1="100" x2="446" y2="108" stroke="#0F172A" strokeWidth="14" strokeLinecap="round" />
          {/* Palancas clutch (izq) y freno (der) */}
          <path d="M 168 118 Q 198 116 218 106" fill="none" stroke="#CBD5E1" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M 432 118 Q 402 116 382 106" fill="none" stroke="#CBD5E1" strokeWidth="3.5" strokeLinecap="round" />
          {/* Botón rojo paro motor / claxon */}
          <circle cx="390" cy="100" r="4" fill="#EF4444" />
          <circle cx="212" cy="100" r="3.5" fill="#F59E0B" />

          {/* Espejo Izquierdo (siempre presente) */}
          <line x1="234" y1="96" x2="206" y2="66" stroke="#475569" strokeWidth="4" strokeLinecap="round" />
          <rect x="166" y="50" width="48" height="24" rx="8" fill="#0F172A" stroke="#64748B" strokeWidth="2" />
          <rect x="172" y="55" width="36" height="14" rx="4" fill="#93C5FD" opacity="0.45" />

          {/* Espejo Derecho (Normal vs Anomalía sin_espejo_der) */}
          {anomaliaActiva === 'sin_espejo_der' ? (
            <g>
              {/* Soporte partido y silueta faltante parpadeante */}
              <line x1="366" y1="96" x2="376" y2="82" stroke="#EF4444" strokeWidth="4" strokeLinecap="round" />
              <rect
                x="386"
                y="50"
                width="48"
                height="24"
                rx="8"
                fill="#FEE2E2"
                fillOpacity="0.4"
                stroke="#EF4444"
                strokeWidth="2.5"
                strokeDasharray="5 3"
                className="animate-pulse"
              />
              <text x="410" y="66" textAnchor="middle" fill="#DC2626" fontSize="12" fontWeight="bold">
                ✕
              </text>
              <text x="410" y="42" textAnchor="middle" fill="#DC2626" fontSize="9.5" fontWeight="bold">
                ESPEJO FALTANTE
              </text>
            </g>
          ) : (
            <g>
              <line x1="366" y1="96" x2="394" y2="66" stroke="#475569" strokeWidth="4" strokeLinecap="round" />
              <rect x="386" y="50" width="48" height="24" rx="8" fill="#0F172A" stroke="#64748B" strokeWidth="2" />
              <rect x="392" y="55" width="36" height="14" rx="4" fill="#93C5FD" opacity="0.45" />
            </g>
          )}

          {/* Direccionales delanteras */}
          <rect x="228" y="122" width="22" height="11" rx="5" fill="#F59E0B" stroke="#B45309" strokeWidth="1.5" />
          <rect x="350" y="122" width="22" height="11" rx="5" fill="#F59E0B" stroke="#B45309" strokeWidth="1.5" />

          {/* Faro delantero central + reflectivo blanco (Normal vs Anomalía faro_rojo) */}
          <path d="M 272 102 L 328 102 L 336 156 L 264 156 Z" fill="#0F172A" stroke="#334155" strokeWidth="2" />
          {anomaliaActiva === 'faro_rojo' ? (
            <g>
              <circle cx="300" cy="130" r="24" fill="#EF4444" opacity="0.32" className="animate-pulse" />
              <circle cx="300" cy="130" r="18" fill="#EF4444" stroke="#FCA5A5" strokeWidth="3" />
              <circle cx="300" cy="130" r="7" fill="#FEE2E2" />
              <text x="300" y="92" textAnchor="middle" fill="#DC2626" fontSize="10" fontWeight="bold">
                LUZ ROJA ILEGAL
              </text>
            </g>
          ) : (
            <g>
              <circle cx="300" cy="130" r="19" fill="#FEF08A" stroke="#CBD5E1" strokeWidth="3" />
              <circle cx="300" cy="130" r="9" fill="#FFFFFF" />
            </g>
          )}
          {/* Franja reflectiva blanca delantera (Art. 9.8) */}
          <rect x="282" y="160" width="36" height="6" rx="3" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="1" />
        </g>
      )}

      {/* =================================================================
       * VISTA 180°: LATERAL DERECHA (frente hacia la derecha)
       * ================================================================= */}
      {vista === 'der' && (
        <g>
          {/* Rueda Trasera (x: 146, y: 238) */}
          <g>
            <circle cx="146" cy="238" r="56" fill="#0F172A" />
            <circle cx="146" cy="238" r="37" fill="#1E293B" stroke="#94A3B8" strokeWidth="3" />
            <circle cx="146" cy="238" r="19" fill="none" stroke="#CBD5E1" strokeWidth="2.5" strokeDasharray="5 3" />
            <circle cx="146" cy="238" r="8" fill="#64748B" />
          </g>

          {/* Rueda Delantera (x: 468, y: 238) + Disco de freno */}
          <g>
            <circle cx="468" cy="238" r="54" fill="#0F172A" />
            <circle cx="468" cy="238" r="37" fill="#1E293B" stroke="#94A3B8" strokeWidth="3" />
            <circle cx="468" cy="238" r="24" fill="none" stroke="#E2E8F0" strokeWidth="4" strokeDasharray="6 3" />
            {/* Pinza de freno */}
            <rect x="444" y="218" width="14" height="22" rx="4" fill="#F59E0B" />
            <circle cx="468" cy="238" r="8" fill="#64748B" />
          </g>

          {/* Horquilla delantera derecha */}
          <line x1="404" y1="92" x2="468" y2="238" stroke="url(#metalGrad)" strokeWidth="11" strokeLinecap="round" />
          <line x1="412" y1="112" x2="448" y2="194" stroke="#0F172A" strokeWidth="13" strokeLinecap="round" />
          <path d="M 424 184 Q 466 166 510 184" fill="none" stroke="url(#tankBlue)" strokeWidth="8" strokeLinecap="round" />

          {/* Chasis y basculante derecho */}
          <path
            d="M 404 106 L 288 146 L 156 134 M 402 118 L 364 226 L 270 228 L 288 146"
            fill="none"
            stroke="#334155"
            strokeWidth="9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M 274 224 L 146 238" stroke="#64748B" strokeWidth="11" strokeLinecap="round" />

          {/* Motor lado derecho con MIRILLA DE ACEITE */}
          <rect x="270" y="168" width="96" height="62" rx="14" fill="#1E293B" stroke="#475569" strokeWidth="2.5" />
          <circle cx="332" cy="204" r="14" fill="#334155" stroke="#94A3B8" strokeWidth="2" />
          {/* Mirilla de aceite nivel ámbar */}
          <circle cx="332" cy="204" r="8" fill="#0F172A" />
          <path d="M 325 205 A 7 7 0 0 0 339 205 Z" fill="#F59E0B" />

          {/* Pedal de freno trasero + bomba/manguera */}
          <line x1="296" y1="224" x2="328" y2="232" stroke="#CBD5E1" strokeWidth="4.5" strokeLinecap="round" />
          <rect x="284" y="206" width="12" height="16" rx="3" fill="#94A3B8" />
          <path d="M 290 206 Q 272 190 250 228" fill="none" stroke="#0F172A" strokeWidth="2.5" />

          {/* Tubo y Silenciador de Escape (Reglamentario) */}
          <path d="M 358 212 Q 348 250 282 246 L 210 232" fill="none" stroke="#94A3B8" strokeWidth="9" strokeLinecap="round" />
          <path
            d="M 224 222 L 138 202 L 132 224 L 220 242 Z"
            fill="url(#exhaustGrad)"
            stroke="#334155"
            strokeWidth="2"
          />
          {/* Protector térmico */}
          <line x1="156" y1="216" x2="210" y2="228" stroke="#0F172A" strokeWidth="4" strokeLinecap="round" />

          {/* ANOMALÍA: Fuga activa de aceite bajo el motor */}
          {anomaliaActiva === 'fuga_aceite' && (
            <g>
              <circle cx="318" cy="240" r="4.5" fill="#1E293B" className="drop-fall-1" />
              <circle cx="326" cy="256" r="4" fill="#0F172A" className="drop-fall-2" />
              <ellipse cx="322" cy="292" rx="34" ry="8" fill="#0F172A" opacity="0.85" />
              <ellipse
                cx="322"
                cy="292"
                rx="38"
                ry="10"
                fill="none"
                stroke="#EF4444"
                strokeWidth="2"
                strokeDasharray="5 3"
                className="animate-pulse"
              />
              <text x="322" y="314" textAnchor="middle" fill="#DC2626" fontSize="10" fontWeight="bold">
                FUGA DE ACEITE ACTIVA
              </text>
            </g>
          )}

          {/* Tanque, asiento, faro y espejo derecho */}
          <path
            d="M 394 112 Q 338 84 280 120 L 292 158 L 382 152 Z"
            fill="url(#tankBlue)"
            stroke="#1E40AF"
            strokeWidth="2"
          />
          <path d="M 284 124 Q 238 142 196 128 L 134 118 L 126 136 L 280 156 Z" fill="#0F172A" />
          <path d="M 220 144 L 132 130 L 144 154 L 236 162 Z" fill="url(#tankBlue)" />
          <path d="M 436 106 L 406 98 L 404 130 L 436 126 Z" fill="#1E293B" />
          <ellipse cx="437" cy="116" rx="5" ry="10" fill="#FEF08A" />
          <line x1="404" y1="92" x2="384" y2="76" stroke="#334155" strokeWidth="6" strokeLinecap="round" />
          <line x1="386" y1="76" x2="394" y2="54" stroke="#475569" strokeWidth="3" />
          <rect x="384" y="46" width="24" height="10" rx="4" fill="#0F172A" />
          <rect x="122" y="120" width="10" height="14" rx="3" fill="#EF4444" />
        </g>
      )}

      {/* =================================================================
       * VISTA 270°: VISTA TRASERA
       * ================================================================= */}
      {vista === 'trasera' && (
        <g>
          {/* Caucho trasero ancho centrado */}
          <rect x="266" y="180" width="68" height="114" rx="22" fill="#0F172A" />
          {/* Surcos de banda de rodamiento */}
          <path
            d="M 282 194 L 294 206 M 318 194 L 306 206 M 282 224 L 294 236 M 318 224 L 306 236 M 282 254 L 294 266 M 318 254 L 306 266"
            stroke="#334155"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Basculante y suspensión trasera */}
          <rect x="248" y="198" width="16" height="54" rx="5" fill="#64748B" />
          <rect x="336" y="198" width="16" height="54" rx="5" fill="#64748B" />

          {/* Escape visto desde atrás (lado derecho) */}
          <ellipse cx="364" cy="212" rx="16" ry="19" fill="#475569" stroke="#94A3B8" strokeWidth="2.5" />
          <ellipse cx="364" cy="212" rx="7" ry="9" fill="#0F172A" />

          {/* Silueta del manubrio y espejos al fondo */}
          <line x1="176" y1="88" x2="424" y2="88" stroke="#475569" strokeWidth="7" strokeLinecap="round" />
          <rect x="170" y="54" width="38" height="18" rx="6" fill="#1E293B" />
          <rect x="392" y="54" width="38" height="18" rx="6" fill="#1E293B" />
          <line x1="210" y1="88" x2="194" y2="72" stroke="#475569" strokeWidth="3" />
          <line x1="390" y1="88" x2="406" y2="72" stroke="#475569" strokeWidth="3" />

          {/* Asiento y colín trasero */}
          <path d="M 244 102 Q 300 84 356 102 L 348 148 L 252 148 Z" fill="url(#tankBlue)" stroke="#1E40AF" strokeWidth="2" />
          <path d="M 262 98 Q 300 88 338 98 L 332 114 L 268 114 Z" fill="#0F172A" />

          {/* Luz Roja Trasera y Stop (visible a 100 m) */}
          <rect x="266" y="114" width="68" height="24" rx="8" fill="#EF4444" stroke="#991B1B" strokeWidth="2.5" />
          <rect x="276" y="120" width="48" height="12" rx="4" fill="#FCA5A5" opacity="0.6" />

          {/* Direccionales traseras */}
          <rect x="226" y="138" width="26" height="12" rx="5" fill="#F59E0B" stroke="#B45309" strokeWidth="1.5" />
          <rect x="348" y="138" width="26" height="12" rx="5" fill="#F59E0B" stroke="#B45309" strokeWidth="1.5" />

          {/* Porta-placa, Placa Identificadora y Reflectivo Rojo */}
          <path d="M 272 146 L 328 146 L 322 204 L 278 204 Z" fill="#1E293B" />
          <rect x="268" y="152" width="64" height="38" rx="4" fill="#F8FAFC" stroke="#475569" strokeWidth="2" />
          <rect x="270" y="154" width="60" height="7" fill="#2563EB" />
          <text x="300" y="177" textAnchor="middle" fill="#0F172A" fontSize="12" fontWeight="900" letterSpacing="0.8">
            AA1B23
          </text>
          <text x="300" y="186" textAnchor="middle" fill="#64748B" fontSize="6" fontWeight="bold">
            VENEZUELA
          </text>

          {/* ANOMALÍA: Placa tapada con calcomanía/distintivo ilegal */}
          {anomaliaActiva === 'placa_tapada' && (
            <g>
              <rect
                x="264"
                y="161"
                width="72"
                height="22"
                rx="3"
                fill="#EF4444"
                stroke="#FEE2E2"
                strokeWidth="2"
                transform="rotate(-8, 300, 172)"
                className="animate-pulse"
              />
              <text
                x="300"
                y="175"
                textAnchor="middle"
                fill="#FFFFFF"
                fontSize="8.5"
                fontWeight="bold"
                transform="rotate(-8, 300, 172)"
              >
                TAPADA / ILEGAL
              </text>
            </g>
          )}

          {/* Reflector rojo reglamentario debajo de la placa (Art. 9.8) */}
          <rect x="282" y="196" width="36" height="7" rx="3" fill="#DC2626" stroke="#FCA5A5" strokeWidth="1" />
        </g>
      )}

      {/* =================================================================
       * CAPA DE HOTSPOTS INTERACTIVOS SOBRE LA VISTA ACTIVA
       * ================================================================= */}
      {puntosVista.map((punto) => {
        const estado = estados[punto.id] || 'pendiente';
        const seleccionado = puntoSeleccionadoId === punto.id;
        const atenuado = !modoReto && filtroCategoria && filtroCategoria !== punto.categoria;
        const catMeta = CATEGORIAS_TCLOCS.find((c) => c.id === punto.categoria);
        const letra = catMeta ? catMeta.letra : '•';

        // Colores dinámicos según modo (Inspector vs Reto)
        let fill = '#2563EB';
        let ring = '#93C5FD';
        if (modoReto) {
          if (puntoEncontradoId === punto.id) {
            fill = '#10B981';
            ring = '#A7F3D0';
          } else if (puntoIncorrectoId === punto.id) {
            fill = '#94A3B8';
            ring = '#CBD5E1';
          } else {
            fill = '#2563EB';
            ring = '#93C5FD';
          }
        } else {
          if (estado === 'ok') {
            fill = '#10B981';
            ring = '#A7F3D0';
          } else if (estado === 'atencion') {
            fill = '#F59E0B';
            ring = '#FDE68A';
          } else if (estado === 'critico') {
            fill = '#EF4444';
            ring = '#FECACA';
          }
        }

        const esPendiente = !modoReto && estado === 'pendiente';

        return (
          <g
            key={punto.id}
            transform={`translate(${punto.x}, ${punto.y})`}
            onClick={(e) => {
              e.stopPropagation();
              onSeleccionarPunto(punto.id);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            role="button"
            tabIndex={0}
            aria-label={`Punto de inspección: ${punto.titulo}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSeleccionarPunto(punto.id);
              }
            }}
            className="cursor-pointer focus:outline-none"
            style={{ opacity: atenuado ? 0.25 : 1, transition: 'opacity 0.2s ease' }}
          >
            {/* Halo pulsante para puntos pendientes o seleccionados */}
            {(esPendiente || seleccionado || (modoReto && puntoEncontradoId !== punto.id)) && (
              <circle
                r={seleccionado ? 22 : 18}
                fill={fill}
                fillOpacity={seleccionado ? 0.28 : 0.18}
                className={esPendiente || seleccionado ? 'hotspot-pulse' : ''}
              />
            )}

            {/* Círculo principal del hotspot */}
            <circle
              r={seleccionado ? 15 : 13}
              fill={fill}
              stroke={seleccionado ? '#0F172A' : '#FFFFFF'}
              strokeWidth={seleccionado ? 3 : 2.5}
            />

            {/* Símbolo interior según estado */}
            {!modoReto && estado === 'ok' ? (
              <path
                d="M -5 0 L -1.5 3.8 L 5.5 -4"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : !modoReto && estado === 'critico' ? (
              <text
                y="4.5"
                textAnchor="middle"
                fill="#FFFFFF"
                fontSize="13"
                fontWeight="900"
              >
                !
              </text>
            ) : (
              <text
                y="4"
                textAnchor="middle"
                fill={estado === 'atencion' && !modoReto ? '#0F172A' : '#FFFFFF'}
                fontSize="11"
                fontWeight="900"
              >
                {modoReto && puntoEncontradoId === punto.id ? '✓' : letra}
              </text>
            )}

            {/* Anillo exterior suave al estar seleccionado */}
            {seleccionado && (
              <circle
                r="20"
                fill="none"
                stroke={ring}
                strokeWidth="2"
                strokeDasharray="4 3"
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ============================================================================
 * 6. MODAL DE REPORTE PRE-RODADA (PESTAÑA 1)
 * ============================================================================ */
function ModalReportePreRodada({
  visible,
  onCerrar,
  estados,
  notas,
  semaforo,
  nombrePiloto,
  setNombrePiloto,
  modeloMoto,
  setModeloMoto,
}) {
  const [copiado, setCopiado] = useState(false);

  if (!visible) return null;

  const conteos = {
    ok: PUNTOS_INSPECCION.filter((p) => estados[p.id] === 'ok').length,
    atencion: PUNTOS_INSPECCION.filter((p) => estados[p.id] === 'atencion').length,
    critico: PUNTOS_INSPECCION.filter((p) => estados[p.id] === 'critico').length,
    pendiente: PUNTOS_INSPECCION.filter((p) => !estados[p.id] || estados[p.id] === 'pendiente')
      .length,
  };

  const listaCriticos = PUNTOS_INSPECCION.filter((p) => estados[p.id] === 'critico');
  const listaAtencion = PUNTOS_INSPECCION.filter((p) => estados[p.id] === 'atencion');
  const fechaActual = new Date().toLocaleDateString('es-VE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const recomendacionMotoApp =
    listaCriticos.length > 0
      ? 'Detén la salida y corrige las fallas críticas antes de circular. Agenda una clínica de mantenimiento preventivo e inspección T-CLOCS con un instructor en Moto App.'
      : listaAtencion.length > 0
      ? 'Puedes rodar con precaución moderada, pero programa revisión de los puntos en Atención. Refuerza tu rutina previa en una sesión práctica de Moto App.'
      : '¡Excelente hábito de seguridad! Tu motocicleta cumple el checklist T-CLOCS y el equipamiento del Decreto N° 8.495. Consolida tu técnica en pista en una sesión o clínica de Moto App.';

  const copiarWhatsApp = async () => {
    const lineas = [
      `🏍️ *REPORTE PRE-RODADA T-CLOCS 360° — Moto App*`,
      `📅 Fecha: ${fechaActual}`,
      nombrePiloto.trim() ? `👤 Piloto: ${nombrePiloto.trim()}` : null,
      modeloMoto.trim() ? `🔧 Moto: ${modeloMoto.trim()}` : null,
      `🚦 Estado: *${semaforo.etiqueta}*`,
      `📊 Resumen (18 puntos): ✅ ${conteos.ok} OK | ⚠️ ${conteos.atencion} Atención | 🚨 ${conteos.critico} Críticos | ⏳ ${conteos.pendiente} Pend.`,
      listaCriticos.length > 0
        ? `\n🚨 *FALLAS CRÍTICAS (NO RODAR):*\n` +
          listaCriticos
            .map(
              (p) =>
                `• ${p.titulo}${notas[p.id] ? ` — Nota: ${notas[p.id]}` : ''}\n  _${p.baseLegal}_`
            )
            .join('\n')
        : null,
      listaAtencion.length > 0
        ? `\n⚠️ *PUNTOS EN ATENCIÓN (PREVENTIVO):*\n` +
          listaAtencion
            .map((p) => `• ${p.titulo}${notas[p.id] ? ` — Nota: ${notas[p.id]}` : ''}`)
            .join('\n')
        : null,
      `\n🎯 *Recomendación Moto App:* ${recomendacionMotoApp}`,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(lineas);
      } else {
        const ta = document.createElement('textarea');
        ta.value = lineas;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2600);
    } catch {
      setCopiado(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-reporte-titulo"
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header del Modal */}
        <div className="bg-[#0F172A] text-white px-5 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-blue-400" />
            <div>
              <h3 id="modal-reporte-titulo" className="text-base font-extrabold">
                Reporte Pre-Rodada T-CLOCS
              </h3>
              <p className="text-[11px] text-slate-400">
                Moto App · Inspección del {fechaActual}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar reporte"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Cuerpo scrolleable */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Campos editables sanitizados */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="rep-piloto"
                className="block text-xs font-bold text-slate-700 mb-1"
              >
                Nombre del piloto (opcional)
              </label>
              <input
                id="rep-piloto"
                type="text"
                maxLength={50}
                value={nombrePiloto}
                onChange={(e) => setNombrePiloto(sanitizarTexto(e.target.value, 50))}
                placeholder="Ej: Armando Salas"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 text-sm"
              />
            </div>
            <div>
              <label htmlFor="rep-moto" className="block text-xs font-bold text-slate-700 mb-1">
                Modelo de moto (opcional)
              </label>
              <input
                id="rep-moto"
                type="text"
                maxLength={45}
                value={modeloMoto}
                onChange={(e) => setModeloMoto(sanitizarTexto(e.target.value, 45))}
                placeholder="Ej: KLR 650 / Bera SBR"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 text-sm"
              />
            </div>
          </div>

          {/* Semáforo de aptitud */}
          <div className={`p-4 rounded-xl border-2 flex items-center justify-between gap-3 ${semaforo.boxClass}`}>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                Veredicto Pre-Rodada
              </div>
              <div className="text-base font-black">{semaforo.etiqueta}</div>
            </div>
            <div className="text-right text-xs font-extrabold">
              <div>{conteos.ok}/18 OK</div>
              {conteos.pendiente > 0 && (
                <div className="opacity-75">{conteos.pendiente} sin revisar</div>
              )}
            </div>
          </div>

          {/* Mini resumen de las 6 letras T-CLOCS */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {CATEGORIAS_TCLOCS.map((cat) => {
              const pts = PUNTOS_INSPECCION.filter((p) => p.categoria === cat.id);
              const tieneCritico = pts.some((p) => estados[p.id] === 'critico');
              const tieneAtencion = pts.some((p) => estados[p.id] === 'atencion');
              const todosOk = pts.every((p) => estados[p.id] === 'ok');
              const estilo = tieneCritico
                ? 'bg-red-50 border-red-300 text-red-700'
                : tieneAtencion
                ? 'bg-amber-50 border-amber-300 text-amber-800'
                : todosOk
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                : 'bg-slate-50 border-slate-200 text-slate-500';
              return (
                <div key={cat.id} className={`p-2 rounded-xl border text-center ${estilo}`}>
                  <div className="text-sm font-black">{cat.letra}</div>
                  <div className="text-[9px] font-bold truncate">{cat.nombre.split(' ')[0]}</div>
                </div>
              );
            })}
          </div>

          {/* Alertas Críticas */}
          {listaCriticos.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-extrabold text-red-700 uppercase tracking-wide flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4" />
                <span>Fallas Críticas ({listaCriticos.length})</span>
              </div>
              <ul className="space-y-1.5">
                {listaCriticos.map((p) => (
                  <li
                    key={p.id}
                    className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900"
                  >
                    <div className="font-bold">{p.titulo}</div>
                    {notas[p.id] && <div className="text-[11px] mt-0.5 italic">Nota: {notas[p.id]}</div>}
                    <div className="text-[10px] text-red-700 mt-0.5">{p.baseLegal}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Puntos en Atención */}
          {listaAtencion.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-extrabold text-amber-800 uppercase tracking-wide flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span>Atención Preventiva ({listaAtencion.length})</span>
              </div>
              <ul className="space-y-1.5">
                {listaAtencion.map((p) => (
                  <li
                    key={p.id}
                    className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950"
                  >
                    <div className="font-bold">{p.titulo}</div>
                    {notas[p.id] && <div className="text-[11px] mt-0.5 italic">Nota: {notas[p.id]}</div>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recomendación Moto App */}
          <div className="p-3.5 rounded-xl bg-[#0F172A] text-white text-xs space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Recomendación Moto App</span>
            </div>
            <p className="text-slate-200 leading-relaxed">{recomendacionMotoApp}</p>
          </div>
        </div>

        {/* Footer del modal */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row gap-2.5 justify-end">
          <button
            type="button"
            onClick={onCerrar}
            className="py-2.5 px-4 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs sm:text-sm font-bold cursor-pointer"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={copiarWhatsApp}
            className={`py-2.5 px-5 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
              copiado
                ? 'bg-emerald-600 text-white'
                : 'bg-[#2563EB] hover:bg-blue-700 text-white'
            }`}
          >
            {copiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copiado ? '¡Copiado para WhatsApp!' : 'Copiar Reporte (WhatsApp)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
 * 7. PESTAÑA 1: INSPECTOR 360° (INSPECCIÓN PRE-RODADA INTERACTIVA)
 * ============================================================================ */
function PestanaInspector360() {
  const [vistaIdx, setVistaIdx] = useState(0); // 0..3
  const [filtroCat, setFiltroCat] = useState(null); // null o 'T' | 'C1' | 'L' | 'O' | 'C2' | 'S'
  const [puntoId, setPuntoId] = useState(PUNTOS_INSPECCION[0].id);
  const [estados, setEstados] = useState({});
  const [notas, setNotas] = useState({});
  const [mostrarModal, setMostrarModal] = useState(false);
  const [nombrePiloto, setNombrePiloto] = useState('');
  const [modeloMoto, setModeloMoto] = useState('');

  // Control de arrastre/swipe horizontal en el visor 360°
  const dragStartX = useRef(null);

  const vistaActual = VISTAS_360[vistaIdx];
  const puntoSeleccionado = useMemo(
    () => PUNTOS_INSPECCION.find((p) => p.id === puntoId) || PUNTOS_INSPECCION[0],
    [puntoId]
  );

  const puntosEnVista = useMemo(
    () => PUNTOS_INSPECCION.filter((p) => p.vista === vistaActual.id),
    [vistaActual.id]
  );

  // Cálculo de progreso y semáforo dinámico
  const { revisados, porcentaje, semaforo } = useMemo(() => {
    const total = PUNTOS_INSPECCION.length;
    let rev = 0;
    let criticos = 0;
    let atencion = 0;
    PUNTOS_INSPECCION.forEach((p) => {
      const st = estados[p.id];
      if (st && st !== 'pendiente') rev += 1;
      if (st === 'critico') criticos += 1;
      if (st === 'atencion') atencion += 1;
    });

    const pct = Math.round((rev / total) * 100);
    let sem;
    if (criticos > 0) {
      sem = {
        etiqueta: 'NO APTO — DETENER SALIDA',
        boxClass: 'bg-red-50 border-red-300 text-red-900',
        pillClass: 'bg-red-600 text-white',
        icon: XCircle,
      };
    } else if (rev < total) {
      sem = {
        etiqueta: 'Pendiente de inspección',
        boxClass: 'bg-slate-50 border-slate-200 text-slate-700',
        pillClass: 'bg-slate-700 text-white',
        icon: Compass,
      };
    } else if (atencion > 0) {
      sem = {
        etiqueta: 'RODAR CON PRECAUCIÓN',
        boxClass: 'bg-amber-50 border-amber-300 text-amber-950',
        pillClass: 'bg-amber-500 text-slate-950',
        icon: AlertTriangle,
      };
    } else {
      sem = {
        etiqueta: 'APTA PARA RODAR',
        boxClass: 'bg-emerald-50 border-emerald-300 text-emerald-950',
        pillClass: 'bg-emerald-600 text-white',
        icon: CheckCircle2,
      };
    }

    return { revisados: rev, porcentaje: pct, semaforo: sem };
  }, [estados]);

  const rotarIzq = useCallback(() => {
    setVistaIdx((prev) => (prev + 3) % 4);
  }, []);

  const rotarDer = useCallback(() => {
    setVistaIdx((prev) => (prev + 1) % 4);
  }, []);

  const seleccionarPuntoYRotar = useCallback((id) => {
    const target = PUNTOS_INSPECCION.find((p) => p.id === id);
    if (!target) return;
    setPuntoId(id);
    const vistaObj = VISTAS_360.find((v) => v.id === target.vista);
    if (vistaObj) setVistaIdx(vistaObj.index);
  }, []);

  const manejarFiltroCategoria = (catId) => {
    if (filtroCat === catId) {
      setFiltroCat(null);
      return;
    }
    setFiltroCat(catId);
    const primerPunto = PUNTOS_INSPECCION.find((p) => p.categoria === catId);
    if (primerPunto) seleccionarPuntoYRotar(primerPunto.id);
  };

  const marcarEstado = (nuevoEstado) => {
    setEstados((prev) => ({ ...prev, [puntoSeleccionado.id]: nuevoEstado }));
  };

  const irSiguientePendiente = () => {
    const actualIdx = PUNTOS_INSPECCION.findIndex((p) => p.id === puntoSeleccionado.id);
    for (let offset = 1; offset <= PUNTOS_INSPECCION.length; offset += 1) {
      const candidato = PUNTOS_INSPECCION[(actualIdx + offset) % PUNTOS_INSPECCION.length];
      if (!estados[candidato.id] || estados[candidato.id] === 'pendiente') {
        seleccionarPuntoYRotar(candidato.id);
        return;
      }
    }
    // Si todos están revisados, avanza simplemente al siguiente
    const next = PUNTOS_INSPECCION[(actualIdx + 1) % PUNTOS_INSPECCION.length];
    seleccionarPuntoYRotar(next.id);
  };

  const marcarTodosOk = () => {
    const todos = {};
    PUNTOS_INSPECCION.forEach((p) => {
      todos[p.id] = 'ok';
    });
    setEstados(todos);
  };

  const reiniciarInspeccion = () => {
    setEstados({});
    setNotas({});
    setFiltroCat(null);
    seleccionarPuntoYRotar(PUNTOS_INSPECCION[0].id);
  };

  // Drag/Swipe sobre el visor 360°
  const onPointerDownVisor = (e) => {
    dragStartX.current = e.clientX;
  };
  const onPointerUpVisor = (e) => {
    if (dragStartX.current === null) return;
    const diff = e.clientX - dragStartX.current;
    if (Math.abs(diff) >= 45) {
      if (diff < 0) rotarDer();
      else rotarIzq();
    }
    dragStartX.current = null;
  };

  const SemIcon = semaforo.icon;
  const estadoActualPunto = estados[puntoSeleccionado.id] || 'pendiente';
  const catPuntoActual = CATEGORIAS_TCLOCS.find((c) => c.id === puntoSeleccionado.categoria);

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Barra de Progreso + Semáforo de Aptitud Dinámico */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black ${semaforo.pillClass}`}
            >
              <SemIcon className="w-4 h-4 shrink-0" />
              <span>{semaforo.etiqueta}</span>
            </span>
            <span className="text-xs font-bold text-slate-500 tabular-nums">
              {revisados}/18 revisados ({porcentaje}%)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={marcarTodosOk}
              className="py-1.5 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition-colors cursor-pointer"
            >
              Marcar todos OK (Demo rápida)
            </button>
            <button
              type="button"
              onClick={reiniciarInspeccion}
              className="py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reiniciar</span>
            </button>
            <button
              type="button"
              onClick={() => setMostrarModal(true)}
              className="py-1.5 px-3.5 rounded-lg bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Generar Reporte Pre-Rodada</span>
            </button>
          </div>
        </div>

        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              semaforo.etiqueta.includes('NO APTO')
                ? 'bg-red-500'
                : semaforo.etiqueta.includes('PRECAUCIÓN')
                ? 'bg-amber-500'
                : 'bg-gradient-to-r from-[#2563EB] to-[#10B981]'
            }`}
            style={{ width: `${Math.max(porcentaje, 3)}%` }}
          />
        </div>
      </section>

      {/* Píldoras de Filtro / Salto Rápido T-CLOCS */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-xs p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFiltroCat(null)}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
              filtroCat === null
                ? 'bg-[#0F172A] text-white border-[#0F172A]'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Todos (18)
          </button>

          {CATEGORIAS_TCLOCS.map((cat) => {
            const pts = PUNTOS_INSPECCION.filter((p) => p.categoria === cat.id);
            const okCount = pts.filter((p) => estados[p.id] && estados[p.id] !== 'pendiente').length;
            const activo = filtroCat === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => manejarFiltroCategoria(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border flex items-center gap-1.5 transition-all cursor-pointer ${
                  activo
                    ? `${cat.colorPill} text-white border-transparent shadow-xs`
                    : `${cat.colorBg} ${cat.colorText} ${cat.colorBorder} hover:brightness-95`
                }`}
              >
                <span className="font-black">{cat.letra}</span>
                <span className="hidden sm:inline">· {cat.nombre}</span>
                <span className="text-[10px] opacity-80">({okCount}/3)</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Grid Principal: Visor 360° (Izquierda) + Panel de Detalle (Derecha) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* VISOR 360° INTERACTIVO */}
        <section className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Cabecera del visor con indicador de ángulo */}
          <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 bg-slate-50/70">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-[#0F172A] text-white text-xs font-black tabular-nums">
                {vistaActual.angulo}
              </span>
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">
                  Vista {vistaActual.titulo}
                </h2>
                <p className="text-[11px] text-slate-500">
                  Arrastra horizontalmente o usa los botones para girar 360°
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={rotarIzq}
                aria-label="Rotar a la izquierda"
                className="py-1.5 px-3 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Rotar</span>
              </button>
              <button
                type="button"
                onClick={rotarDer}
                aria-label="Rotar a la derecha"
                className="py-1.5 px-3 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>Rotar</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Lienzo SVG interactivo con swipe horizontal */}
          <div
            onPointerDown={onPointerDownVisor}
            onPointerUp={onPointerUpVisor}
            onPointerCancel={() => {
              dragStartX.current = null;
            }}
            className="p-3 sm:p-4 bg-gradient-to-b from-slate-50 to-slate-100/60 cursor-grab active:cursor-grabbing touch-pan-y"
          >
            <MotocicletaSVG360
              vista={vistaActual.id}
              puntosVista={puntosEnVista}
              estados={estados}
              puntoSeleccionadoId={puntoSeleccionado.id}
              onSeleccionarPunto={seleccionarPuntoYRotar}
              filtroCategoria={filtroCat}
            />
          </div>

          {/* Selector rápido de las 4 vistas + leyenda */}
          <div className="p-3 border-t border-slate-100 space-y-2.5 bg-white">
            <div className="grid grid-cols-4 gap-1.5">
              {VISTAS_360.map((v) => {
                const activa = v.index === vistaIdx;
                const ptsV = PUNTOS_INSPECCION.filter((p) => p.vista === v.id);
                const revV = ptsV.filter((p) => estados[p.id] && estados[p.id] !== 'pendiente').length;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVistaIdx(v.index)}
                    className={`py-2 px-1.5 rounded-xl border text-center transition-all cursor-pointer ${
                      activa
                        ? 'bg-[#2563EB] border-[#2563EB] text-white shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="text-[11px] font-extrabold truncate">{v.corto}</div>
                    <div className={`text-[10px] font-semibold ${activa ? 'text-blue-100' : 'text-slate-400'}`}>
                      {revV}/{ptsV.length} pts
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] font-semibold text-slate-500 pt-0.5">
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" /> Pendiente
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> OK (Apto)
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Atención
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Falla Crítica
              </span>
            </div>
          </div>
        </section>

        {/* PANEL LATERAL DE DETALLE DEL PUNTO SELECCIONADO */}
        <section className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          {/* Cabecera del punto */}
          <div className="space-y-2 pb-3 border-b border-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-2">
              {catPuntoActual && (
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold border ${catPuntoActual.colorBg} ${catPuntoActual.colorText} ${catPuntoActual.colorBorder}`}
                >
                  <span>{catPuntoActual.letra}</span>
                  <span>· {catPuntoActual.nombre}</span>
                </span>
              )}
              <span className="text-[11px] font-bold text-slate-400">
                Vista: {VISTAS_360.find((v) => v.id === puntoSeleccionado.vista)?.titulo}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug">
              {puntoSeleccionado.titulo}
            </h3>
          </div>

          {/* Checklist paso a paso MSF */}
          <div className="space-y-2">
            <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <ListChecks className="w-4 h-4 text-[#2563EB]" />
              <span>Qué revisar (Estándar MSF T-CLOCS)</span>
            </div>
            <ul className="space-y-2">
              {puntoSeleccionado.checklist.map((item, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100"
                >
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-[#2563EB] text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Base Legal Venezolana */}
          <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200/80 space-y-1">
            <div className="text-[11px] font-extrabold text-indigo-700 uppercase tracking-wide flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5" />
              <span>Respaldo Técnico / Legal (VE)</span>
            </div>
            <p className="text-xs text-slate-700 font-medium leading-relaxed">
              {puntoSeleccionado.baseLegal}
            </p>
          </div>

          {/* Botones de Veredicto Rápido */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-700">Marcar resultado de este punto:</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => marcarEstado('ok')}
                className={`py-2.5 px-2.5 rounded-xl border-2 text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  estadoActualPunto === 'ok'
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50/60 hover:bg-emerald-100 border-emerald-200 text-emerald-800'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>OK (Apto)</span>
              </button>

              <button
                type="button"
                onClick={() => marcarEstado('atencion')}
                className={`py-2.5 px-2.5 rounded-xl border-2 text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  estadoActualPunto === 'atencion'
                    ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-xs'
                    : 'bg-amber-50/70 hover:bg-amber-100 border-amber-200 text-amber-900'
                }`}
              >
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Atención</span>
              </button>

              <button
                type="button"
                onClick={() => marcarEstado('critico')}
                className={`py-2.5 px-2.5 rounded-xl border-2 text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  estadoActualPunto === 'critico'
                    ? 'bg-red-600 border-red-600 text-white shadow-xs'
                    : 'bg-red-50/70 hover:bg-red-100 border-red-200 text-red-800'
                }`}
              >
                <XCircle className="w-4 h-4 shrink-0" />
                <span>Crítico</span>
              </button>
            </div>
          </div>

          {/* Nota breve opcional */}
          <div>
            <label htmlFor="nota-punto" className="block text-xs font-bold text-slate-600 mb-1">
              Nota breve del hallazgo (opcional)
            </label>
            <input
              id="nota-punto"
              type="text"
              maxLength={90}
              value={notas[puntoSeleccionado.id] || ''}
              onChange={(e) =>
                setNotas((prev) => ({
                  ...prev,
                  [puntoSeleccionado.id]: sanitizarTexto(e.target.value, 90),
                }))
              }
              placeholder="Ej: Calibrar a 30 PSI / cambiar bombillo..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 text-xs sm:text-sm"
            />
          </div>

          {/* Botón saltar al siguiente punto pendiente */}
          <button
            type="button"
            onClick={irSiguientePendiente}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <span>Siguiente punto pendiente</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </section>
      </div>

      {/* Lista rápida inferior de puntos de la categoría filtrada (facilita salto en móvil) */}
      {filtroCat && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-2.5">
          <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
            Puntos en {CATEGORIAS_TCLOCS.find((c) => c.id === filtroCat)?.nombre}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {PUNTOS_INSPECCION.filter((p) => p.categoria === filtroCat).map((p) => {
              const st = estados[p.id] || 'pendiente';
              const activo = p.id === puntoSeleccionado.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => seleccionarPuntoYRotar(p.id)}
                  className={`p-3 rounded-xl border-2 text-left text-xs transition-all cursor-pointer ${
                    activo
                      ? 'bg-blue-50 border-[#2563EB]'
                      : 'bg-slate-50 border-slate-200 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 font-extrabold text-slate-900">
                    <span className="truncate">{p.titulo}</span>
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        st === 'ok'
                          ? 'bg-emerald-500'
                          : st === 'atencion'
                          ? 'bg-amber-500'
                          : st === 'critico'
                          ? 'bg-red-500'
                          : 'bg-[#2563EB]'
                      }`}
                    />
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    Vista {VISTAS_360.find((v) => v.id === p.vista)?.titulo}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Modal de Reporte Pre-Rodada */}
      <ModalReportePreRodada
        visible={mostrarModal}
        onCerrar={() => setMostrarModal(false)}
        estados={estados}
        notas={notas}
        semaforo={semaforo}
        nombrePiloto={nombrePiloto}
        setNombrePiloto={setNombrePiloto}
        modeloMoto={modeloMoto}
        setModeloMoto={setModeloMoto}
      />
    </div>
  );
}

/* ============================================================================
 * 8. PESTAÑA 2: RETO "DETECTA LA FALLA" (AUDITORÍA VISUAL GAMIFICADA)
 * ============================================================================ */
function PestanaRetoFalla() {
  const [listaCasos, setListaCasos] = useState(CASOS_RETO);
  const [indice, setIndice] = useState(0);
  const [vistaIdx, setVistaIdx] = useState(
    VISTAS_360.find((v) => v.id === CASOS_RETO[0].vistaInicial)?.index || 0
  );
  const [fallaEncontrada, setFallaEncontrada] = useState(false);
  const [puntoIncorrectoId, setPuntoIncorrectoId] = useState(null);
  const [mensajePista, setMensajePista] = useState('');
  const [veredictoElegido, setVeredictoElegido] = useState(null);
  const [puntaje, setPuntaje] = useState(0);
  const [racha, setRacha] = useState(0);
  const [rachaMax, setRachaMax] = useState(0);
  const [historial, setHistorial] = useState([]);
  const [terminado, setTerminado] = useState(false);
  const [erroresEnCaso, setErroresEnCaso] = useState(0);

  const dragStartX = useRef(null);

  const caso = listaCasos[indice];
  const vistaActual = VISTAS_360[vistaIdx];
  const puntosEnVista = useMemo(
    () => PUNTOS_INSPECCION.filter((p) => p.vista === vistaActual.id),
    [vistaActual.id]
  );

  const rotarIzq = () => setVistaIdx((p) => (p + 3) % 4);
  const rotarDer = () => setVistaIdx((p) => (p + 1) % 4);

  const onClickHotspotReto = (idTocado) => {
    if (fallaEncontrada) return;
    if (idTocado === caso.puntoFallaId) {
      setFallaEncontrada(true);
      setPuntoIncorrectoId(null);
      setMensajePista('');
    } else {
      setPuntoIncorrectoId(idTocado);
      setErroresEnCaso((e) => e + 1);
      const pistaVista =
        vistaActual.id !== caso.vistaFalla
          ? 'Esta zona se ve en buen estado. Rota la moto a otros ángulos para encontrar la anomalía visual.'
          : 'Estás en el ángulo correcto, pero esa zona está bien. Observa con atención el dibujo de la moto.';
      setMensajePista(pistaVista);
    }
  };

  const elegirVeredicto = (opcionId) => {
    if (veredictoElegido) return;
    setVeredictoElegido(opcionId);
    const aciertoVeredicto = opcionId === caso.veredictoCorrecto;
    const puntosGanados = aciertoVeredicto ? (erroresEnCaso === 0 ? 100 : 75) : 0;

    if (aciertoVeredicto) {
      setPuntaje((p) => p + puntosGanados);
      setRacha((r) => {
        const nueva = r + 1;
        setRachaMax((m) => Math.max(m, nueva));
        return nueva;
      });
    } else {
      setRacha(0);
    }

    setHistorial((prev) => [
      ...prev,
      {
        caso,
        acierto: aciertoVeredicto,
        erroresBusqueda: erroresEnCaso,
      },
    ]);
  };

  const siguienteCaso = () => {
    if (indice < listaCasos.length - 1) {
      const nextIdx = indice + 1;
      setIndice(nextIdx);
      const nextVista = VISTAS_360.find((v) => v.id === listaCasos[nextIdx].vistaInicial)?.index || 0;
      setVistaIdx(nextVista);
      setFallaEncontrada(false);
      setPuntoIncorrectoId(null);
      setMensajePista('');
      setVeredictoElegido(null);
      setErroresEnCaso(0);
    } else {
      setTerminado(true);
    }
  };

  const reiniciarReto = (soloFallos = false) => {
    const fallados = historial.filter((h) => !h.acierto).map((h) => h.caso);
    const nuevoSet = soloFallos && fallados.length > 0 ? fallados : CASOS_RETO;
    setListaCasos(nuevoSet);
    setIndice(0);
    setVistaIdx(VISTAS_360.find((v) => v.id === nuevoSet[0].vistaInicial)?.index || 0);
    setFallaEncontrada(false);
    setPuntoIncorrectoId(null);
    setMensajePista('');
    setVeredictoElegido(null);
    setPuntaje(0);
    setRacha(0);
    setRachaMax(0);
    setHistorial([]);
    setErroresEnCaso(0);
    setTerminado(false);
  };

  // Pantalla de Resultados Finales del Reto
  if (terminado) {
    const aciertos = historial.filter((h) => h.acierto).length;
    const pct = Math.round((aciertos / historial.length) * 100);
    const fallosCount = historial.length - aciertos;

    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-7 space-y-5 animate-fadeIn">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-start gap-4">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                pct >= 80
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-blue-100 text-[#2563EB]'
              }`}
            >
              <Award className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border ${
                  pct >= 80
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>
                  {pct >= 80 ? 'Inspector Visual Certificado T-CLOCS' : 'Inspector en Entrenamiento'}
                </span>
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                Auditoría Completada: {aciertos}/{historial.length} aciertos ({pct}%)
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                Puntaje total: <strong>{puntaje} pts</strong> · Mejor racha:{' '}
                <strong>{rachaMax}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Desglose por caso */}
        <div className="space-y-2.5">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
            Desglose de Casos Auditados
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {historial.map((h) => (
              <div
                key={h.caso.id}
                className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                  h.acierto
                    ? 'bg-emerald-50/50 border-emerald-200'
                    : 'bg-red-50/50 border-red-200'
                }`}
              >
                <div className="flex items-center justify-between gap-2 font-extrabold text-slate-900">
                  <span>{h.caso.tituloFalla}</span>
                  {h.acierto ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                </div>
                <div className="text-[11px] text-slate-600">{h.caso.cita}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          {fallosCount > 0 && (
            <button
              type="button"
              onClick={() => reiniciarReto(true)}
              className="flex-1 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reintentar fallos ({fallosCount})</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => reiniciarReto(false)}
            className="flex-1 py-3 px-4 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCw className="w-4 h-4" />
            <span>Jugar los 6 casos de nuevo</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Barra superior del Reto */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-blue-50 text-[#2563EB] text-xs font-black border border-blue-200">
            Caso {indice + 1} / {listaCasos.length}
          </span>
          <span className="text-xs sm:text-sm font-extrabold text-slate-900">{caso.titulo}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-extrabold">
            <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>Racha {racha}</span>
          </span>
          <span className="px-2.5 py-1 rounded-full bg-slate-900 text-white text-xs font-extrabold tabular-nums">
            {puntaje} pts
          </span>
        </div>
      </section>

      {/* Contexto del escenario */}
      <div className="bg-gradient-to-r from-[#0F172A] to-slate-900 text-white rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 shadow-xs">
        <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-300 flex items-center justify-center shrink-0">
          <Search className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-blue-300">
            {fallaEncontrada
              ? 'Paso 2 de 2 · Emite tu veredicto técnico-legal'
              : 'Paso 1 de 2 · Rota la moto 360° y toca el hotspot donde ves la anomalía'}
          </div>
          <p className="text-xs sm:text-sm text-slate-100 leading-relaxed">{caso.contexto}</p>
        </div>
      </div>

      {/* Grid: Visor SVG con Anomalía + Panel de Veredicto */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <section className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2 bg-slate-50/70">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-[#0F172A] text-white text-xs font-black">
                {vistaActual.angulo}
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-slate-800">
                {vistaActual.titulo}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={rotarIzq}
                className="py-1.5 px-3 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Rotar</span>
              </button>
              <button
                type="button"
                onClick={rotarDer}
                className="py-1.5 px-3 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>Rotar</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div
            onPointerDown={(e) => {
              dragStartX.current = e.clientX;
            }}
            onPointerUp={(e) => {
              if (dragStartX.current === null) return;
              const diff = e.clientX - dragStartX.current;
              if (Math.abs(diff) >= 45) {
                if (diff < 0) rotarDer();
                else rotarIzq();
              }
              dragStartX.current = null;
            }}
            className="p-3 sm:p-4 bg-gradient-to-b from-slate-50 to-slate-100/70 cursor-grab active:cursor-grabbing"
          >
            <MotocicletaSVG360
              vista={vistaActual.id}
              puntosVista={puntosEnVista}
              estados={{}}
              puntoSeleccionadoId={fallaEncontrada ? caso.puntoFallaId : null}
              onSeleccionarPunto={onClickHotspotReto}
              filtroCategoria={null}
              anomaliaActiva={caso.anomaliaVisual}
              modoReto={true}
              puntoEncontradoId={fallaEncontrada ? caso.puntoFallaId : null}
              puntoIncorrectoId={puntoIncorrectoId}
            />
          </div>

          <div className="p-3 border-t border-slate-100 grid grid-cols-4 gap-1.5 bg-white">
            {VISTAS_360.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setVistaIdx(v.index)}
                className={`py-2 px-1.5 rounded-xl border text-[11px] font-extrabold transition-colors cursor-pointer ${
                  v.index === vistaIdx
                    ? 'bg-[#2563EB] border-[#2563EB] text-white'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                {v.corto}
              </button>
            ))}
          </div>
        </section>

        {/* Panel derecho de interacción del reto */}
        <section className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          {!fallaEncontrada ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 text-slate-900">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold">Inspecciona los 4 ángulos</h3>
                  <p className="text-xs text-slate-500">
                    Haz clic sobre el punto azul exacto donde detectes el daño o infracción.
                  </p>
                </div>
              </div>

              {mensajePista && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 font-medium flex items-start gap-2 animate-fadeIn">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>{mensajePista}</span>
                </div>
              )}

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5">
                <div className="font-extrabold text-slate-800">Consejo de auditoría T-CLOCS:</div>
                <p className="leading-relaxed">
                  Revisa con orden: Cauchos, Controles/Espejos, Luces, Fluidos debajo del motor,
                  Cadena y Soportes/Placa. La falla está dibujada directamente en la moto.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-1">
                <div className="text-xs font-black text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>¡Anomalía localizada!</span>
                </div>
                <div className="text-sm font-extrabold">{caso.tituloFalla}</div>
              </div>

              <div className="space-y-2.5">
                <div className="text-xs font-extrabold text-slate-700">
                  ¿Cuál es el veredicto técnico-legal correcto?
                </div>

                {[
                  { id: 'apto', label: 'Apto para rodar sin cambios' },
                  { id: 'preventivo', label: 'Mantenimiento preventivo pronto' },
                  { id: 'critico', label: 'No rodar / Riesgo crítico o infracción' },
                ].map((op) => {
                  const elegida = veredictoElegido === op.id;
                  const correcta = op.id === caso.veredictoCorrecto;
                  let estilo =
                    'bg-white border-slate-200 hover:border-[#2563EB] hover:bg-blue-50/40 text-slate-800';
                  if (veredictoElegido) {
                    if (correcta) estilo = 'bg-emerald-50 border-emerald-500 text-emerald-950';
                    else if (elegida) estilo = 'bg-red-50 border-red-500 text-red-950';
                    else estilo = 'bg-slate-50 border-slate-200 text-slate-400 opacity-70';
                  }
                  return (
                    <button
                      key={op.id}
                      type="button"
                      disabled={Boolean(veredictoElegido)}
                      onClick={() => elegirVeredicto(op.id)}
                      className={`w-full p-3.5 rounded-xl border-2 text-left text-xs sm:text-sm font-bold transition-all ${
                        veredictoElegido ? 'cursor-default' : 'cursor-pointer'
                      } ${estilo}`}
                    >
                      {op.label}
                    </button>
                  );
                })}
              </div>

              {veredictoElegido && (
                <div
                  className={`p-4 rounded-xl border space-y-2.5 animate-fadeIn ${
                    veredictoElegido === caso.veredictoCorrecto
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                      : 'bg-red-50 border-red-200 text-red-950'
                  }`}
                >
                  <div className="text-sm font-extrabold flex items-center gap-1.5">
                    {veredictoElegido === caso.veredictoCorrecto ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    <span>
                      {veredictoElegido === caso.veredictoCorrecto
                        ? '¡Veredicto exacto!'
                        : 'Veredicto incorrecto'}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed">{caso.explicacion}</p>
                  <div className="text-[11px] font-bold bg-white/85 border border-slate-200 rounded-lg p-2 text-slate-700">
                    {caso.cita}
                  </div>
                  <button
                    type="button"
                    onClick={siguienteCaso}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>
                      {indice < listaCasos.length - 1 ? 'Siguiente caso' : 'Ver resultados e insignia'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/* ============================================================================
 * 9. PESTAÑA 3: GUÍA T-CLOCS + LEY VE (REFERENCIA DE BOLSILLO)
 * ============================================================================ */
function PestanaGuiaTCLOCS({ onIrAInspector }) {
  const [abierta, setAbierta] = useState('T');

  const equipamientoArt9 = [
    {
      art: 'Art. 9 num. 1',
      titulo: 'Bocina o corneta eléctrica',
      detalle: 'Funcional y original de fábrica para advertir situaciones de peligro.',
    },
    {
      art: 'Art. 9 num. 2',
      titulo: 'Faros delanteros (alcance 150 m)',
      detalle: 'En número no mayor a dos (2), permitiendo distinguir objetos a 150 metros.',
    },
    {
      art: 'Art. 9 num. 3',
      titulo: 'Sistema de frenos (5 m a 30 km/h)',
      detalle: 'Capaz de detener completamente la motocicleta en 5 metros circulando a 30 km/h.',
    },
    {
      art: 'Art. 9 num. 4',
      titulo: 'Luz trasera roja (visible a 100 m)',
      detalle: 'Claramente visible en horario nocturno a una distancia mínima de 100 metros.',
    },
    {
      art: 'Art. 9 num. 6',
      titulo: 'Dos (2) espejos retrovisores',
      detalle: 'Colocados obligatoriamente uno del lado derecho y otro del lado izquierdo.',
    },
    {
      art: 'Art. 9 num. 7 y 8',
      titulo: 'Silenciador y reflectivos blanco/rojo',
      detalle: 'Silenciador que amortigüe explosiones + material reflectivo blanco adelante y rojo atrás.',
    },
  ];

  const prohibicionesArt11 = [
    {
      art: 'Art. 8',
      titulo: 'Modificaciones sin autorización INTT',
      detalle:
        'Prohibido alterar estructura, función o características originales sin permiso expreso del INTT.',
    },
    {
      art: 'Art. 11 num. 1',
      titulo: 'Obstruir las placas identificadoras',
      detalle: 'Usar distintivos, calcomanías o piezas que impidan leer claramente las placas.',
    },
    {
      art: 'Art. 11 num. 2 y 8',
      titulo: 'Escape libre o gases hacia la calzada',
      detalle: 'Circular con el escape libre o dirigir los gases de combustión hacia el asfalto o acera.',
    },
    {
      art: 'Art. 11 num. 3',
      titulo: 'Objetos que impidan visibilidad',
      detalle: 'Portar objetos, escritos o instalaciones que obstruyan el campo visual del conductor.',
    },
    {
      art: 'Art. 11 num. 4 y 5',
      titulo: 'Luz roja delantera o faros pilotos',
      detalle: 'Usar faros o reflectores de luz roja al frente, así como faros pilotos prohibidos.',
    },
    {
      art: 'Art. 11 num. 6 y 7',
      titulo: 'Sirenas o uso indebido de bocina',
      detalle: 'Usar sirenas/pitos distintos a la bocina original o accionar la corneta en áreas urbanas.',
    },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Acordeón / Cuadrícula de las 6 Letras T-CLOCS */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
              Estándar T-CLOCS — Checklist Rápido de 2 Minutos (Manual MSF)
            </h2>
            <p className="text-xs text-slate-500">
              Toca cada letra para desplegar los puntos exactos de verificación previa a rodar.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {CATEGORIAS_TCLOCS.map((cat) => {
            const pts = PUNTOS_INSPECCION.filter((p) => p.categoria === cat.id);
            const expandida = abierta === cat.id;
            return (
              <div
                key={cat.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setAbierta(expandida ? null : cat.id)}
                  className="w-full p-4 flex items-center justify-between gap-3 text-left hover:bg-slate-50/70 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-10 h-10 rounded-xl text-white font-black text-base flex items-center justify-center shrink-0 ${cat.colorPill}`}
                    >
                      {cat.letra}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-extrabold text-slate-900 truncate">
                        {cat.nombre}{' '}
                        <span className="text-xs font-medium text-slate-400">({cat.ingles})</span>
                      </div>
                      <p className="text-xs text-slate-500 truncate">{cat.resumen}</p>
                    </div>
                  </div>
                  {expandida ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>

                {expandida && (
                  <div className="px-4 pb-4 pt-1 border-t border-slate-100 space-y-2.5 animate-fadeIn">
                    {pts.map((p) => (
                      <div key={p.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                        <div className="text-xs font-extrabold text-slate-900">{p.titulo}</div>
                        <ul className="space-y-1 text-xs text-slate-600">
                          {p.checklist.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="text-[#2563EB] font-bold">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Bloque Comparativo Visual: Art. 9 vs Art. 11 (y Art. 8) Decreto N° 8.495 */}
      <section className="space-y-3">
        <div className="px-1">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#2563EB] mb-1">
            <Scale className="w-3.5 h-3.5" />
            <span>Reglamento Parcial de Motocicletas — Decreto N° 8.495 (Venezuela)</span>
          </div>
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
            Equipamiento Obligatorio (Art. 9) vs. Prohibiciones en la Moto (Art. 11 y Art. 8)
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Columna Verde: Obligatorio Art. 9 */}
          <div className="bg-white rounded-2xl border-2 border-emerald-200 shadow-xs overflow-hidden">
            <div className="bg-emerald-50 px-5 py-3.5 border-b border-emerald-200 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-emerald-950">
                  Equipamiento Obligatorio (Art. 9)
                </h3>
                <p className="text-[11px] text-emerald-700">
                  Indispensable para circular legalmente en la red vial nacional
                </p>
              </div>
            </div>
            <div className="p-4 space-y-2.5">
              {equipamientoArt9.map((item) => (
                <div
                  key={item.art}
                  className="p-3 rounded-xl bg-emerald-50/40 border border-emerald-100 flex items-start gap-2.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <div className="font-extrabold text-slate-900">
                      {item.titulo}{' '}
                      <span className="text-[10px] font-bold text-emerald-700">({item.art})</span>
                    </div>
                    <p className="text-slate-600 mt-0.5 leading-relaxed">{item.detalle}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Columna Roja: Prohibiciones Art. 11 y Art. 8 */}
          <div className="bg-white rounded-2xl border-2 border-red-200 shadow-xs overflow-hidden">
            <div className="bg-red-50 px-5 py-3.5 border-b border-red-200 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center shrink-0">
                <Ban className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-red-950">
                  Prohibiciones en la Moto (Art. 11 y Art. 8)
                </h3>
                <p className="text-[11px] text-red-700">
                  Causa de riesgo vial, multas o retención en puntos de control
                </p>
              </div>
            </div>
            <div className="p-4 space-y-2.5">
              {prohibicionesArt11.map((item) => (
                <div
                  key={item.art}
                  className="p-3 rounded-xl bg-red-50/40 border border-red-100 flex items-start gap-2.5"
                >
                  <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <div className="font-extrabold text-slate-900">
                      {item.titulo}{' '}
                      <span className="text-[10px] font-bold text-red-700">({item.art})</span>
                    </div>
                    <p className="text-slate-600 mt-0.5 leading-relaxed">{item.detalle}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Llamado a la acción sutil alineado con Moto App */}
      <section className="bg-gradient-to-r from-[#0F172A] via-slate-900 to-blue-950 rounded-2xl p-5 sm:p-6 text-white border border-slate-800 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-blue-300">
              <Wrench className="w-3.5 h-3.5" />
              <span>Entrenamiento Práctico Moto App</span>
            </div>
            <h3 className="text-base sm:text-lg font-extrabold">
              Lleva tu inspección T-CLOCS de la pantalla a tu motocicleta real
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Practica la revisión de tensión de cadena, tacto de frenos y chequeo pre-rodada junto
              a un instructor certificado en tu próxima sesión o clínica práctica de Moto App.
            </p>
          </div>
          <button
            type="button"
            onClick={onIrAInspector}
            className="shrink-0 py-3 px-5 rounded-xl bg-[#2563EB] hover:bg-blue-600 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <span>Volver al Inspector 360°</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>
    </div>
  );
}

/* ============================================================================
 * 10. COMPONENTE RAÍZ CON 3 PESTAÑAS PRINCIPALES
 * ============================================================================ */
function InspectorTCLOCSApp() {
  const [tab, setTab] = useState('inspector'); // 'inspector' | 'reto' | 'guia'

  const tabs = [
    { id: 'inspector', label: 'Inspector 360°', short: 'Inspector 360°', icon: Compass },
    { id: 'reto', label: 'Reto: Detecta la Falla', short: 'Detecta Falla', icon: Zap },
    { id: 'guia', label: 'Guía T-CLOCS + Ley VE', short: 'Guía + Ley VE', icon: BookOpen },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans antialiased overflow-x-hidden">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes hotspotPulse {
          0%, 100% { transform: scale(1); opacity: 0.32; }
          50% { transform: scale(1.32); opacity: 0.1; }
        }
        @keyframes dropFall {
          0% { transform: translateY(0); opacity: 1; }
          85% { transform: translateY(42px); opacity: 0.9; }
          100% { transform: translateY(50px); opacity: 0; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.25s ease-out both;
        }
        .hotspot-pulse {
          animation: hotspotPulse 1.8s ease-in-out infinite;
          transform-origin: center;
          transform-box: fill-box;
        }
        .drop-fall-1 {
          animation: dropFall 1.15s ease-in infinite;
        }
        .drop-fall-2 {
          animation: dropFall 1.15s ease-in 0.55s infinite;
        }
      `}</style>

      {/* Header Oscuro Elegante (#0F172A) */}
      <header className="sticky top-0 z-30 bg-[#0F172A] text-white border-b border-slate-800 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 pt-3.5 pb-3 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2563EB] to-indigo-600 flex items-center justify-center shadow-md shrink-0">
                <Bike className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-white truncate">
                  Inspector Visual T-CLOCS 360°
                </h1>
                <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                  Moto App · Inspección Pre-Rodada MSF &amp; Decreto N° 8.495
                </p>
              </div>
            </div>
          </div>

          {/* Navegación 3 Pestañas */}
          <nav
            role="tablist"
            aria-label="Secciones del Inspector Visual T-CLOCS 360"
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
        {tab === 'inspector' && <PestanaInspector360 />}
        {tab === 'reto' && <PestanaRetoFalla />}
        {tab === 'guia' && <PestanaGuiaTCLOCS onIrAInspector={() => setTab('inspector')} />}
      </main>

      {/* Pie informativo */}
      <footer className="max-w-5xl w-full mx-auto px-4 py-4 text-center text-[11px] text-slate-400 flex flex-wrap items-center justify-center gap-1.5">
        <Info className="w-3.5 h-3.5" />
        <span>
          Moto App · Inspección Pre-Rodada T-CLOCS (MSF Ed. 17) y Reglamento Parcial
          de Motocicletas (Decreto N° 8.495, Art. 7, 8, 9, 11 y 32).
        </span>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <InspectorTCLOCSApp />
    </ErrorBoundary>
  );
}