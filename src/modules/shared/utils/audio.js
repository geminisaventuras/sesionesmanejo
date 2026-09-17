// Utilidad de audio para alertas del Aula Virtual

let audioContext = null;

function obtenerAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

export function reproducirBeepModuloCompletado() {
  if (!isAlertaSonoraHabilitada()) return;

  try {
    const ctx = obtenerAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.5);
  } catch (error) {
    console.warn('[Audio] No se pudo reproducir beep:', error);
  }
}

export function isAlertaSonoraHabilitada() {
  try {
    return localStorage.getItem('aula_alertaSonora') !== 'false';
  } catch {
    return true; // por defecto activada
  }
}

export function setAlertaSonora(habilitado) {
  try {
    localStorage.setItem('aula_alertaSonora', habilitado ? 'true' : 'false');
  } catch (e) {
    console.warn('[Audio] No se pudo guardar preferencia de sonido', e);
  }
}