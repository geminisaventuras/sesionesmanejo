// Utilidades de alertas con sonidos y vibración para el Aula Virtual
// AudioManager: singleton que se activa en la primera interacción del usuario

let audioContext = null;
let audioInicializado = false;

const inicializarAudio = () => {
  if (audioInicializado) return;
  try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    audioInicializado = true;
    
    // Listener único para reanudar el audio en la primera interacción
    const reanudarAudio = () => {
      if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
      }
      document.removeEventListener('click', reanudarAudio);
      document.removeEventListener('touchstart', reanudarAudio);
    };
    
    document.addEventListener('click', reanudarAudio, { once: true });
    document.addEventListener('touchstart', reanudarAudio, { once: true });
  } catch (e) {
    console.log('Audio no soportado en este dispositivo');
  }
};

const playTone = (frecuencia, duracion, tipo = 'sine', volumen = 0.3) => {
  if (!audioContext) return;
  try {
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    const oscilador = audioContext.createOscillator();
    const ganancia = audioContext.createGain();
    oscilador.type = tipo;
    oscilador.frequency.setValueAtTime(frecuencia, audioContext.currentTime);
    ganancia.gain.setValueAtTime(volumen, audioContext.currentTime);
    ganancia.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duracion / 1000);
    oscilador.connect(ganancia);
    ganancia.connect(audioContext.destination);
    oscilador.start(audioContext.currentTime);
    oscilador.stop(audioContext.currentTime + duracion / 1000);
  } catch (e) {
    console.log('Error reproduciendo sonido:', e);
  }
};

const playMelodia = (notas, volumen = 0.3) => {
  notas.forEach(([frecuencia, duracion, retraso]) => {
    setTimeout(() => playTone(frecuencia, duracion, 'sine', volumen), retraso);
  });
};

const vibrar = (patron) => {
  if (navigator.vibrate) navigator.vibrate(patron);
};

export const alertas = {
  inicializar: inicializarAudio,
  
  inicioModulo: () => playTone(523, 150, 'sine', 0.2),
  recesoAutomatico: () => playTone(440, 200, 'triangle', 0.2),
  
  limiteModulo: () => {
    playMelodia([[880, 200, 0], [880, 200, 250], [880, 200, 500]], 0.3);
    vibrar([200, 200, 200]);
  },
  
  moduloCompletado: () => playMelodia([[523, 150, 0], [659, 150, 200], [784, 300, 400]], 0.3),
  
  sesionPausada: () => {
    playTone(440, 200, 'triangle', 0.2);
    setTimeout(() => playTone(330, 200, 'triangle', 0.2), 250);
  },
  
  sesionReanudada: () => {
    playTone(330, 200, 'triangle', 0.2);
    setTimeout(() => playTone(440, 200, 'triangle', 0.2), 250);
  },
  
  pausaExcedida: () => {
    playMelodia([[660, 300, 0], [660, 300, 350], [660, 600, 700]], 0.4);
    vibrar(500);
  },
  
  emergencia: () => {
    playTone(660, 200, 'sawtooth', 0.5);
    vibrar(500);
  },
  
  cursoCompletado: () => {
    playMelodia([[523, 150, 0], [659, 150, 200], [784, 150, 400], [1047, 400, 600]], 0.3);
    vibrar([100, 100, 100]);
  },
  
  reconexion: () => playTone(880, 100, 'sine', 0.15),
  diaCompletado: () => playMelodia([[523, 200, 0], [659, 200, 250], [784, 300, 500]], 0.25),
  
  tiempoAgotado: () => {
    playMelodia([[440, 300, 0], [440, 300, 350], [440, 600, 700]], 0.4);
    vibrar([200, 100, 200]);
  },
  
  extensionSolicitada: () => playTone(523, 200, 'triangle', 0.2),
  extensionConcedida: () => playTone(659, 300, 'sine', 0.25),
  extensionDenegada: () => playTone(330, 300, 'triangle', 0.25)
};
