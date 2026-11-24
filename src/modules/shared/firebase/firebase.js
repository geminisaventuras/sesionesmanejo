// @build: 2026-11-22 | id: T-040-EMULADOR | desc: conexión opt-in a emuladores Firebase para QA/E2E sin alterar el flujo DEV normal
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import {
  initializeFirestore,
  connectFirestoreEmulator,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// T-040: opt-in explícito. Sin `VITE_USE_FIREBASE_EMULATOR=true` (dev y builds
// normales) no se ejecuta ninguna conexión al emulador y todo queda como antes.
export const usarEmuladorFirebase = import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true';

const HOST_EMULADOR = import.meta.env.VITE_FIREBASE_EMULATOR_HOST || '127.0.0.1';

const puertoEmulador = (valor, porDefecto) => {
  const puerto = Number(valor);
  return Number.isInteger(puerto) && puerto > 0 ? puerto : porDefecto;
};

const PUERTO_FIRESTORE_EMULADOR = puertoEmulador(
  import.meta.env.VITE_FIREBASE_FIRESTORE_EMULATOR_PORT,
  8080
);
const PUERTO_AUTH_EMULADOR = puertoEmulador(
  import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_PORT,
  9099
);

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// FIX-MULTITAB: reemplaza enableIndexedDbPersistence (deprecada).
// Soporta multi-tab nativamente vía persistentMultipleTabManager.
// Evita el failed-precondition y la corrupción de sesión que causaba.
// En emulador se usa caché en memoria: la persistencia de IndexedDB puede
// mezclar documentos de DEV con los del emulador entre corridas de E2E.
export const db = initializeFirestore(
  app,
  usarEmuladorFirebase
    ? {}
    : {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        })
      }
);

if (usarEmuladorFirebase) {
  connectAuthEmulator(auth, `http://${HOST_EMULADOR}:${PUERTO_AUTH_EMULADOR}`, {
    disableWarnings: true
  });
  connectFirestoreEmulator(db, HOST_EMULADOR, PUERTO_FIRESTORE_EMULADOR);
  if (import.meta.env.DEV) {
    console.info(
      `[firebase] Emulador activo → firestore ${HOST_EMULADOR}:${PUERTO_FIRESTORE_EMULADOR}, auth ${HOST_EMULADOR}:${PUERTO_AUTH_EMULADOR}`
    );
  }
}
