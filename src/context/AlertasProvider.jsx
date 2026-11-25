// Alertas: preferencias, sonido y registro de Web Push.
// No crea notificaciones: las crea el dispatcher. Aquí solo se consumen.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import {
  COLECCION_PREFERENCIAS,
  RUTA_DATOS,
} from '../modules/shared/services/NotificacionesEventos';
import {
  activarPush as activarPushServicio,
  desactivarDispositivoActual,
  diagnosticoPush,
  enviarPruebaPush,
  registrarDispositivo,
} from '../modules/shared/services/NotificacionesPush';
import {
  instalarDesbloqueoPorGesto,
  probarSonido as probarSonidoServicio,
  reproducirAlerta,
} from '../modules/shared/services/SonidoAlertas';
import {
  PRIORIDADES,
  debeSonar,
  msDeFecha,
  normalizarPreferencias,
} from '../modules/shared/utils/notificacionesHelpers';

function tituloBase() {
  if (typeof document === 'undefined') return 'Motoapp';
  return document.title.replace(/^\(\d+\)\s*/, '') || 'Motoapp';
}

export function useAlertasProvider({ notifications, user, fbUser, showToast, pushEstadoInicial }) {
  const uid = fbUser?.uid || user?.uid || '';
  const [prefs, setPrefs] = useState(() => normalizarPreferencias());
  const [prefsCargadas, setPrefsCargadas] = useState(false);
  const [pushEstado, setPushEstado] = useState(pushEstadoInicial || 'sin-revisar');
  const [pushDiag, setPushDiag] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const vistosRef = useRef(new Set());
  const bootstrapHastaRef = useRef(Date.now() + 2500);
  const registroIntentadoRef = useRef(false);
  const tituloRef = useRef('');

  // Desbloqueo de audio por gesto (política de autoplay).
  useEffect(() => instalarDesbloqueoPorGesto(), []);

  // Preferencias del usuario, en tiempo real.
  useEffect(() => {
    if (!uid) {
      setPrefs(normalizarPreferencias());
      setPrefsCargadas(false);
      return undefined;
    }
    const ref = doc(db, RUTA_DATOS, COLECCION_PREFERENCIAS, uid);
    const unsub = onSnapshot(ref, (snap) => {
      setPrefs(normalizarPreferencias(snap.exists() ? snap.data() : {}));
      setPrefsCargadas(true);
    }, () => {
      setPrefs(normalizarPreferencias());
      setPrefsCargadas(true);
    });
    return () => unsub();
  }, [uid]);

  const refrescarDiagnostico = useCallback(async () => {
    if (!uid) {
      setPushEstado('sin-sesion');
      return null;
    }
    // Mientras se consulta el service worker no se muestra un estado viejo.
    setPushEstado('sin-revisar');
    const diag = await diagnosticoPush(uid);
    setPushDiag(diag);
    if (!diag.soportado) setPushEstado('no-soportado');
    else if (!diag.vapid) setPushEstado('sin-configurar');
    else if (diag.permiso === 'denied') setPushEstado('denegado');
    else if (!diag.permiso || diag.permiso === 'default') setPushEstado('sin-permiso');
    else if (!diag.suscrito) setPushEstado('sin-suscripcion');
    else if (!diag.registrado) setPushEstado('sin-registrar');
    else setPushEstado('activo');
    return diag;
  }, [uid]);

  useEffect(() => {
    refrescarDiagnostico().catch(() => {});
  }, [refrescarDiagnostico]);

  // El service worker avisa si Chrome rota la suscripción push.
  useEffect(() => {
    if (!uid || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return undefined;
    const alRecibir = (event) => {
      if (event.data?.type === 'motoapp:pushsubscriptionchange') {
        registrarDispositivo(uid).catch(() => {});
      }
    };
    navigator.serviceWorker.addEventListener('message', alRecibir);
    return () => navigator.serviceWorker.removeEventListener('message', alRecibir);
  }, [uid]);

  // Si ya hay permiso, refresca el dispositivo sin volver a pedir permiso.
  useEffect(() => {
    if (!uid || registroIntentadoRef.current) return;
    const diag = pushDiag;
    if (!diag?.soportado || !diag?.vapid || diag.permiso !== 'granted') return;
    registroIntentadoRef.current = true;
    registrarDispositivo(uid).then((res) => {
      if (res.ok) setPushEstado('activo');
    }).catch(() => {});
  }, [uid, pushDiag]);

  const guardarPreferencias = useCallback(async (cambios = {}) => {
    if (!uid) return { ok: false, motivo: 'sin-sesion' };
    const siguiente = normalizarPreferencias({
      ...prefs,
      ...cambios,
      categorias: { ...prefs.categorias, ...(cambios.categorias || {}) },
      silencio: { ...prefs.silencio, ...(cambios.silencio || {}) },
    });
    setPrefs(siguiente);
    setGuardando(true);
    try {
      await setDoc(doc(db, RUTA_DATOS, COLECCION_PREFERENCIAS, uid), {
        ...siguiente,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      return { ok: true };
    } catch (error) {
      showToast?.('No se pudieron guardar tus preferencias de alertas.', 'error');
      return { ok: false, motivo: error?.code || 'error' };
    } finally {
      setGuardando(false);
    }
  }, [uid, prefs, showToast]);

  const activarPush = useCallback(async () => {
    if (!uid) return { ok: false, motivo: 'sin-sesion' };
    const res = await activarPushServicio(uid);
    if (res.ok) {
      setPushEstado('activo');
      await guardarPreferencias({ push: true });
      showToast?.('Notificaciones activadas en este dispositivo.', 'success');
      refrescarDiagnostico().catch(() => {});
    } else {
      const mensajes = {
        'no-soportado': 'Este navegador no soporta notificaciones push.',
        'sin-configurar': 'Falta configurar la clave pública de notificaciones (VAPID).',
        'permiso-denegado': 'El permiso fue denegado. Habilítalo en los ajustes del sitio.',
        'service-worker-timeout': 'La app aún no está lista. Cierra y vuelve a abrir la PWA.',
      };
      showToast?.(mensajes[res.motivo] || 'No se pudieron activar las notificaciones.', 'error');
      refrescarDiagnostico().catch(() => {});
    }
    return res;
  }, [uid, guardarPreferencias, showToast, refrescarDiagnostico]);

  const desactivarPush = useCallback(async () => {
    if (!uid) return { ok: false, motivo: 'sin-sesion' };
    await desactivarDispositivoActual(uid);
    await guardarPreferencias({ push: false });
    setPushEstado('sin-suscripcion');
    showToast?.('Notificaciones desactivadas en este dispositivo.', 'info');
    refrescarDiagnostico().catch(() => {});
    return { ok: true };
  }, [uid, guardarPreferencias, showToast, refrescarDiagnostico]);

  const probarSonido = useCallback(() => {
    const ok = probarSonidoServicio();
    if (!ok) {
      showToast?.('Toca la pantalla una vez para habilitar el audio.', 'info');
    }
    return ok;
  }, [showToast]);

  const probarPush = useCallback(async () => {
    if (!uid) return { ok: false, motivo: 'sin-sesion' };
    const res = await enviarPruebaPush(uid);
    if (!res.ok) {
      showToast?.('No se pudo encolar la notificación de prueba.', 'error');
      return res;
    }
    showToast?.('Prueba encolada. Llega en segundos si el envío está activo.', 'info');
    return res;
  }, [uid, showToast]);

  // Sonido para notificaciones nuevas (nunca en la carga inicial).
  useEffect(() => {
    const lista = Array.isArray(notifications) ? notifications : [];
    const idsActuales = new Set(lista.map((n) => String(n.id)));
    const enBootstrap = Date.now() < bootstrapHastaRef.current;
    const nuevas = lista.filter((n) => !vistosRef.current.has(String(n.id)) && !n.leida);

    for (const id of idsActuales) vistosRef.current.add(id);

    if (enBootstrap || nuevas.length === 0) return;

    const candidatas = nuevas
      .filter((n) => n.sonido !== false)
      .filter((n) => String(n.actorUid || '') !== String(uid))
      .filter((n) => debeSonar(prefs, {
        categoria: n.categoria || 'sistema',
        prioridad: n.prioridad || 'media',
        sonido: n.sonido !== false,
      }))
      .sort((a, b) => (PRIORIDADES[a.prioridad] ?? 2) - (PRIORIDADES[b.prioridad] ?? 2)
        || msDeFecha(b.createdAt) - msDeFecha(a.createdAt));

    if (candidatas.length > 0) {
      reproducirAlerta(candidatas[0].tipo || 'sistema_prueba', {
        forzar: candidatas[0].prioridad === 'critica',
        vibrar: prefs.vibracion,
      });
    }
  }, [notifications, prefs, uid]);

  const noLeidas = useMemo(
    () => (Array.isArray(notifications) ? notifications.filter((n) => !n.leida).length : 0),
    [notifications]
  );

  // Título y badge del sistema.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const base = tituloBase();
    const nuevoTitulo = noLeidas > 0 ? `(${noLeidas}) ${base}` : base;
    if (tituloRef.current !== nuevoTitulo) {
      document.title = nuevoTitulo;
      tituloRef.current = nuevoTitulo;
    }
    try {
      if (noLeidas > 0 && navigator.setAppBadge) navigator.setAppBadge(noLeidas).catch(() => {});
      else if (navigator.clearAppBadge) navigator.clearAppBadge().catch(() => {});
    } catch {
      // Badging API opcional.
    }
  }, [noLeidas]);

  return {
    prefs,
    prefsCargadas,
    guardando,
    noLeidas,
    pushEstado,
    pushDiag,
    guardarPreferencias,
    activarPush,
    desactivarPush,
    probarSonido,
    probarPush,
    refrescarDiagnostico,
  };
}
