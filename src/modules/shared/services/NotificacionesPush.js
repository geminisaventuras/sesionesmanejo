// Registro de dispositivos para Web Push (VAPID) en PWA.
// El token/suscripción no es un secreto de negocio, pero solo lo lee su dueño
// y el dispatcher con Admin SDK.
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import {
  COLECCION_DISPOSITIVOS,
  COLECCION_EVENTOS,
  RUTA_DATOS,
} from './NotificacionesEventos';
import { construirClaveEvento } from '../utils/notificacionesHelpers';

const VAPID_PUBLIC_KEY = String(import.meta.env.VITE_VAPID_PUBLIC_KEY || '').trim();

export function pushSoportado() {
  return typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window;
}

export function vapidConfigurado() {
  return VAPID_PUBLIC_KEY.length > 60;
}

export function estadoPermiso() {
  if (!pushSoportado()) return 'no-soportado';
  if (!vapidConfigurado()) return 'sin-configurar';
  return Notification.permission; // default | granted | denied
}

function base64UrlToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

async function hashEndpoint(endpoint) {
  try {
    const bytes = new TextEncoder().encode(endpoint);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    let hash = 0x811c9dc5;
    for (let i = 0; i < endpoint.length; i += 1) {
      hash ^= endpoint.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return `local-${(hash >>> 0).toString(16)}`;
  }
}

function esperarServiceWorker(timeoutMs = 10000) {
  if (!('serviceWorker' in navigator)) return Promise.reject(new Error('service-worker-no-soportado'));
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise((_, reject) => setTimeout(() => reject(new Error('service-worker-timeout')), timeoutMs)),
  ]);
}

function plataforma() {
  const ua = navigator.userAgent || '';
  if (/Android/i.test(ua)) return 'android';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Windows/i.test(ua)) return 'windows';
  if (/Macintosh/i.test(ua)) return 'macos';
  return 'otro';
}

export async function obtenerSuscripcion() {
  if (!pushSoportado()) return null;
  try {
    const registration = await esperarServiceWorker();
    return await registration.pushManager.getSubscription();
  } catch {
    return null;
  }
}

export async function registrarDispositivo(uid) {
  if (!uid) return { ok: false, motivo: 'sin-uid' };
  if (!pushSoportado()) return { ok: false, motivo: 'no-soportado' };
  if (!vapidConfigurado()) return { ok: false, motivo: 'sin-configurar' };
  if (Notification.permission !== 'granted') return { ok: false, motivo: 'sin-permiso' };

  try {
    const registration = await esperarServiceWorker();
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToUint8Array(VAPID_PUBLIC_KEY),
      });
    }
    const json = subscription.toJSON();
    const endpoint = json.endpoint || subscription.endpoint;
    if (!endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      return { ok: false, motivo: 'suscripcion-incompleta' };
    }
    const id = await hashEndpoint(endpoint);
    const ref = doc(db, RUTA_DATOS, COLECCION_DISPOSITIVOS, id);
    const previo = await getDoc(ref).catch(() => null);
    await setDoc(ref, {
      id,
      uid: String(uid),
      endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      userAgent: String(navigator.userAgent || '').slice(0, 240),
      plataforma: plataforma(),
      activo: true,
      ...(previo?.exists() ? {} : { createdAt: serverTimestamp() }),
      lastSeenAt: serverTimestamp(),
    }, { merge: true });
    return { ok: true, id, endpoint };
  } catch (error) {
    console.warn('[NotificacionesPush] No se pudo registrar el dispositivo:', error?.name || error?.message);
    return { ok: false, motivo: error?.name || 'error' };
  }
}

export async function activarPush(uid) {
  if (!uid) return { ok: false, motivo: 'sin-uid' };
  if (!pushSoportado()) return { ok: false, motivo: 'no-soportado' };
  if (!vapidConfigurado()) return { ok: false, motivo: 'sin-configurar' };
  try {
    let permiso = Notification.permission;
    if (permiso === 'default') {
      permiso = await Notification.requestPermission();
    }
    if (permiso !== 'granted') return { ok: false, motivo: 'permiso-denegado', permiso };
    return await registrarDispositivo(uid);
  } catch (error) {
    return { ok: false, motivo: error?.name || 'error' };
  }
}

export async function desactivarDispositivoActual(uid) {
  try {
    const subscription = await obtenerSuscripcion();
    if (subscription) {
      const endpoint = subscription.endpoint;
      if (uid) {
        const id = await hashEndpoint(endpoint);
        await deleteDoc(doc(db, RUTA_DATOS, COLECCION_DISPOSITIVOS, id)).catch(() => {});
      }
      await subscription.unsubscribe().catch(() => {});
    }
    return { ok: true };
  } catch {
    return { ok: false, motivo: 'error' };
  }
}

export async function enviarPruebaPush(uid) {
  if (!uid) return { ok: false, motivo: 'sin-uid' };
  const clave = construirClaveEvento('sistema_prueba', uid, String(Date.now()));
  try {
    await setDoc(doc(db, RUTA_DATOS, COLECCION_EVENTOS, clave), {
      clave,
      tipo: 'sistema_prueba',
      entidadTipo: 'usuario',
      entidadId: String(uid),
      actorUid: String(uid),
      token: String(Date.now()),
      datos: {},
      estado: 'pendiente',
      intentos: 0,
      ocurridoEn: serverTimestamp(),
    });
    return { ok: true, clave };
  } catch (error) {
    return { ok: false, motivo: error?.code || 'error' };
  }
}

export async function diagnosticoPush(uid) {
  const permiso = estadoPermiso();
  const subscription = await obtenerSuscripcion();
  let registrado = false;
  if (subscription && uid) {
    try {
      const id = await hashEndpoint(subscription.endpoint);
      const snap = await getDoc(doc(db, RUTA_DATOS, COLECCION_DISPOSITIVOS, id));
      registrado = snap.exists() && snap.data()?.activo !== false;
    } catch {
      registrado = false;
    }
  }
  return {
    soportado: pushSoportado(),
    vapid: vapidConfigurado(),
    permiso,
    suscrito: Boolean(subscription),
    registrado,
    plataforma: typeof navigator !== 'undefined' ? plataforma() : 'otro',
  };
}
