import { useEffect, useRef, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

const INTERVALO_ACTUALIZACION_MS = 60 * 60 * 1000;
const ESPERA_RECARGA_MS = 5000;

export default function PwaUpdatePrompt() {
  const intervaloRef = useRef(null);
  const actualizandoRef = useRef(false);
  const [actualizando, setActualizando] = useState(false);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      if (intervaloRef.current) clearInterval(intervaloRef.current);
      intervaloRef.current = setInterval(() => {
        registration.update().catch(() => {});
      }, INTERVALO_ACTUALIZACION_MS);
    }
  });

  useEffect(() => {
    const alVolver = () => {
      if (document.visibilityState !== 'visible') return;
      navigator.serviceWorker?.getRegistration()
        .then((registration) => registration?.update())
        .catch(() => {});
    };
    document.addEventListener('visibilitychange', alVolver);
    return () => {
      document.removeEventListener('visibilitychange', alVolver);
      if (intervaloRef.current) clearInterval(intervaloRef.current);
    };
  }, []);

  if (!needRefresh) return null;

  const actualizarApp = () => {
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
    updateServiceWorker(false).catch(() => {});
    window.setTimeout(recargar, ESPERA_RECARGA_MS);
    window.setTimeout(() => {
      actualizandoRef.current = false;
      setActualizando(false);
    }, ESPERA_RECARGA_MS + 3000);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-4 right-4 z-[100] mx-auto max-w-md rounded-2xl border border-blue-200 bg-white p-4 shadow-xl"
    >
      <p className="text-sm font-black text-gray-900">Nueva versión disponible</p>
      <p className="text-xs text-gray-600 mt-1">
        Actualiza para cargar la última versión de Motoescuela.
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
          onClick={() => setNeedRefresh(false)}
          className="rounded-xl bg-gray-100 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-200"
        >
          Luego
        </button>
      </div>
    </div>
  );
}
