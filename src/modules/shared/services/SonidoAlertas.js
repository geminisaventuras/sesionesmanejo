// Alarmas sonoras sin assets: Web Audio API.
// El navegador exige un gesto del usuario para habilitar audio; se desbloquea
// con el primer clic/tap y se reanuda si el contexto quedó suspendido.
let contexto = null;
let desbloqueado = false;
let ultimoSonidoMs = 0;
const COALESENCIA_MS = 3000;

function obtenerContexto() {
  if (typeof window === 'undefined') return null;
  if (!contexto) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    try {
      contexto = new Ctor();
    } catch {
      return null;
    }
  }
  return contexto;
}

export function desbloquearAudio() {
  const ctx = obtenerContexto();
  if (!ctx) return false;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  desbloqueado = true;
  return true;
}

export function audioDesbloqueado() {
  return desbloqueado || contexto?.state === 'running';
}

export function instalarDesbloqueoPorGesto() {
  if (typeof document === 'undefined') return () => {};
  const handler = () => {
    desbloquearAudio();
    document.removeEventListener('pointerdown', handler);
    document.removeEventListener('touchstart', handler);
    document.removeEventListener('keydown', handler);
  };
  document.addEventListener('pointerdown', handler, { once: true });
  document.addEventListener('touchstart', handler, { once: true });
  document.addEventListener('keydown', handler, { once: true });
  return () => {
    document.removeEventListener('pointerdown', handler);
    document.removeEventListener('touchstart', handler);
    document.removeEventListener('keydown', handler);
  };
}

function tono({ frecuencia, duracion = 160, tipo = 'sine', volumen = 0.22, retraso = 0 }) {
  const ctx = obtenerContexto();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  try {
    const inicio = ctx.currentTime + retraso / 1000;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = tipo;
    osc.frequency.setValueAtTime(frecuencia, inicio);
    gain.gain.setValueAtTime(volumen, inicio);
    gain.gain.exponentialRampToValueAtTime(0.001, inicio + duracion / 1000);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(inicio);
    osc.stop(inicio + duracion / 1000);
  } catch {
    // Silencio: nunca se rompe la acción por audio.
  }
}

function melodia(notas, volumen = 0.22) {
  notas.forEach(([frecuencia, duracion, retraso, tipo = 'sine']) => {
    tono({ frecuencia, duracion, retraso, tipo, volumen });
  });
}

function vibrar(patron) {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(patron);
  } catch {
    // Sin vibración disponible.
  }
}

const TONOS = {
  reserva_creada: () => melodia([[523, 120, 0], [659, 160, 140]]),
  pago_aprobado: () => melodia([[523, 120, 0], [659, 120, 130], [784, 220, 260]]),
  pago_rechazado: () => melodia([[440, 220, 0, 'triangle'], [330, 260, 240, 'triangle']], 0.2),
  sesion_iniciada: () => melodia([[660, 160, 0]]),
  sesion_pausada: () => melodia([[440, 180, 0, 'triangle'], [392, 180, 200, 'triangle']]),
  sesion_finalizada: () => melodia([[523, 120, 0], [659, 120, 130], [784, 160, 260], [1047, 300, 430]]),
  instructor_asignado: () => melodia([[587, 130, 0], [784, 180, 150]]),
  reserva_reprogramada: () => melodia([[587, 140, 0], [698, 140, 150], [587, 140, 300]]),
  reserva_cancelada: () => melodia([[392, 220, 0, 'triangle'], [330, 280, 240, 'triangle']], 0.2),
  emergencia_aula: () => {
    melodia([[660, 200, 0, 'sawtooth'], [880, 200, 260, 'sawtooth'], [660, 300, 520, 'sawtooth']], 0.18);
    vibrar([200, 120, 200, 120, 300]);
  },
  pago_staff: () => melodia([[659, 130, 0], [784, 180, 150]]),
  deuda_proveedor: () => melodia([[440, 180, 0, 'triangle'], [523, 220, 200]]),
  movilidad_solicitud: () => melodia([[587, 130, 0], [784, 180, 150], [587, 130, 300]]),
  movilidad_asignada: () => melodia([[659, 130, 0], [880, 200, 150]]),
  sistema_prueba: () => melodia([[523, 140, 0], [659, 140, 160], [784, 240, 320]]),
};

export function puedeSonarAhora(ahora = Date.now(), forzar = false) {
  if (forzar) return true;
  return ahora - ultimoSonidoMs >= COALESENCIA_MS;
}

export function reproducirAlerta(tipo, { forzar = false, vibrar: vibrarSi = true } = {}) {
  if (!puedeSonarAhora(Date.now(), forzar)) return false;
  const ctx = obtenerContexto();
  if (!ctx) return false;
  desbloquearAudio();
  const ejecutar = TONOS[tipo] || TONOS.sistema_prueba;
  try {
    ejecutar();
    if (vibrarSi) vibrar([120, 60, 120]);
    ultimoSonidoMs = Date.now();
    return true;
  } catch {
    return false;
  }
}

export function probarSonido() {
  return reproducirAlerta('sistema_prueba', { forzar: true });
}

export const TIPOS_CON_SONIDO = Object.keys(TONOS);
