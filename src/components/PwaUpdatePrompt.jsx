import { useEffect, useRef, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

const INTERVALO_ACTUALIZACION_MS = 15 * 60 * 1000;
const ESPERA_RECARGA_MS = 5000;
const POSPONER_MS = 10 * 60 * 1000;

export default function PwaUpdatePrompt() {
  const intervaloRef = useRef(null);
  const actualizandoRef = useRef(false);
  const pospuestoHastaRef = useRef(0);
  const [actualizando, setActualizando] = useState(false);
  const [hayEspera, setHayEspera] = useState(false);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;

      const comprobar = () => {
        if (registration.waiting && Date.now() >= pospuestoHastaRef.current) {
          setHayEspera(true);
        }
      };

      comprobar();
      registration.addEventListener('updatefound', () => {
        const nuevo = registration.installing;
        if (!nuevo) return;
        nuevo.addEventListener('statechange', () => {
          if (nuevo.state === 'installed' && navigator.serviceWorker.controller) {
            comprobar();
          }
        });
      });

      if (intervaloRef.current) clearInterval(intervaloRef.current);
      intervaloRef.current = setInterval(() => {
        registration.update().then(comprobar).catch(() => {});
      }, INTERVALO_ACTUALIZACION_MS);
    }
  });

  useEffect(() => {
    const revisar = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const registration = await navigator.serviceWorker?.getRegistration();
        if (!registration) return;
        if (registration.waiting && Date.now() >= pospuestoHastaRef.current) {
          setHayEspera(true);
        }
        await registration.update();
        if (registration.waiting && Date.now() >= pospuestoHastaRef.current) {
          setHayEspera(true);
        }
      } catch {
        // sin service worker o sin red: se reintenta en el próximo ciclo
      }
    };
    const alVolver = () => {
      revisar();
    };
    document.addEventListener('visibilitychange', alVolver);
    window.addEventListener('focus', alVolver);
    revisar();
    return () => {
      document.removeEventListener('visibilitychange', alVolver);
      window.removeEventListener('focus', alVolver);
      if (intervaloRef.current) clearInterval(intervaloRef.current);
    };
  }, []);

  const mostrar = needRefresh || hayEspera;
  if (!mostrar) return null;

  const actualizarApp = async () => {
    if (actualizandoRef.current) return;
    actualizandoRef.current = true;
    setActualizando(true);

    let recargado = false;
    const recargar = () => {
      if (recargado) return;
      recargado = true;
      window.location.reload();
    };

    navigator.serviceWorker?.addEventListener('controllerchange', recargar, { once: true });

    try {
      const registration = await navigator.serviceWorker?.getRegistration();
      registration?.waiting?.postMessage({ type: 'SKIP_WAITING' });
    } catch {
      // si no hay waiting, la recarga de respaldo carga la versión activa
    }

    updateServiceWorker(false).catch(() => {});
    window.setTimeout(recargar, ESPERA_RECARGA_MS);
    window.setTimeout(() => {
      actualizandoRef.current = false;
      setActualizando(false);
    }, ESPERA_RECARGA_MS + 3000);
  };

  const posponer = () => {
    pospuestoHastaRef.current = Date.now() + POSPONER_MS;
    setNeedRefresh(false);
    setHayEspera(false);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-4 right-4 z-[100] mx-auto max-w-md rounded-2xl border border-blue-200 bg-white p-4 shadow-xl"
    >
      <p className="text-sm font-black text-gray-900">Nueva versión disponible</p>
      <p className="text-xs text-gray-600 mt-1">
        Actualiza para cargar la última versión de Moto App.
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={actualizarApp}
          disabled={actualizando}
          className="flex-1 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {actualizando ? 'Actualizando…' : 'Actualizar ahora'}
        </button>
        <button
          type="button"
          onClick={posponer}
          className="rounded-xl bg-gray-100 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-200"
        >
          Luego
        </button>
      </div>
    </div>
  );
}
