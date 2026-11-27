// T-159 / FT-085: widget Cloudflare Turnstile en modo invisible (interaction-only).
// No agrega altura al paso 4 salvo que Cloudflare pida una interaccion.
// El token se verifica en un Worker; este componente nunca ve el secret.
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ShieldCheck, Loader2 } from 'lucide-react';

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const ESPERA_TOKEN_MS = 60000;

let scriptPromesa = null;

function cargarTurnstile() {
  if (typeof window === 'undefined') return Promise.reject(new Error('sin-ventana'));
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (scriptPromesa) return scriptPromesa;

  scriptPromesa = new Promise((resolve, reject) => {
    const existente = document.querySelector('script[src^="https://challenges.cloudflare.com/turnstile/v0/api.js"]');
    if (existente) {
      existente.addEventListener('load', () => resolve(window.turnstile), { once: true });
      existente.addEventListener('error', () => reject(new Error('turnstile-script')), { once: true });
      if (window.turnstile) resolve(window.turnstile);
      return;
    }
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.turnstile);
    script.onerror = () => reject(new Error('turnstile-script'));
    document.head.appendChild(script);
  }).catch((error) => {
    scriptPromesa = null;
    throw error;
  });

  return scriptPromesa;
}

export const CaptchaTurnstile = forwardRef(function CaptchaTurnstile(
  { siteKey, accion = 'inscripcion' },
  ref
) {
  const contenedorRef = useRef(null);
  const widgetIdRef = useRef(null);
  const pendienteRef = useRef(null);
  const temporizadorRef = useRef(null);
  const [estado, setEstado] = useState('cargando');

  const limpiarPendiente = useCallback((resultado, valor) => {
    if (temporizadorRef.current) {
      clearTimeout(temporizadorRef.current);
      temporizadorRef.current = null;
    }
    const pendiente = pendienteRef.current;
    pendienteRef.current = null;
    if (!pendiente) return;
    if (resultado === 'ok') pendiente.resolve(valor);
    else pendiente.reject(valor instanceof Error ? valor : new Error(String(valor)));
  }, []);

  useEffect(() => {
    let cancelado = false;

    cargarTurnstile()
      .then((turnstile) => {
        if (cancelado || !contenedorRef.current || widgetIdRef.current !== null) return;
        widgetIdRef.current = turnstile.render(contenedorRef.current, {
          sitekey: siteKey,
          action: accion,
          appearance: 'interaction-only',
          execution: 'execute',
          size: 'flexible',
          language: 'es',
          theme: 'light',
          callback: (token) => {
            setEstado('listo');
            limpiarPendiente('ok', token);
          },
          'error-callback': () => {
            setEstado('error');
            limpiarPendiente('error', new Error('turnstile-error'));
          },
          'expired-callback': () => {
            setEstado('listo');
            limpiarPendiente('error', new Error('turnstile-expired'));
          },
          'timeout-callback': () => {
            setEstado('listo');
            limpiarPendiente('error', new Error('turnstile-timeout'));
          },
        });
        setEstado('listo');
      })
      .catch(() => {
        if (!cancelado) setEstado('error');
      });

    return () => {
      cancelado = true;
      limpiarPendiente('error', new Error('turnstile-unmount'));
      try {
        if (widgetIdRef.current !== null && window.turnstile) {
          window.turnstile.remove(widgetIdRef.current);
        }
      } catch {
        // el widget ya no existe; no hay nada que limpiar
      }
      widgetIdRef.current = null;
    };
  }, [siteKey, accion, limpiarPendiente]);

  useImperativeHandle(ref, () => ({
    solicitarToken() {
      if (!window.turnstile || widgetIdRef.current === null) {
        return Promise.reject(new Error('turnstile-no-listo'));
      }
      if (pendienteRef.current) {
        return Promise.reject(new Error('turnstile-en-curso'));
      }
      setEstado('verificando');
      return new Promise((resolve, reject) => {
        pendienteRef.current = { resolve, reject };
        temporizadorRef.current = setTimeout(() => {
          limpiarPendiente('error', new Error('turnstile-timeout'));
          setEstado('listo');
        }, ESPERA_TOKEN_MS);
        try {
          window.turnstile.execute(widgetIdRef.current);
        } catch (error) {
          limpiarPendiente('error', error);
          setEstado('listo');
        }
      });
    },
    reiniciar() {
      limpiarPendiente('error', new Error('turnstile-reinicio'));
      try {
        if (widgetIdRef.current !== null && window.turnstile) {
          window.turnstile.reset(widgetIdRef.current);
        }
      } catch {
        // sin widget activo
      }
      setEstado('listo');
    },
  }), [limpiarPendiente]);

  return (
    <div className="flex min-h-[18px] items-center gap-1.5 text-[10px] text-gray-500" aria-live="polite">
      {estado === 'verificando' ? (
        <><Loader2 size={12} className="animate-spin" /><span>Verificando seguridad…</span></>
      ) : (
        <><ShieldCheck size={12} className="text-green-600" /><span>Protegido por Cloudflare</span></>
      )}
      <div ref={contenedorRef} className="min-w-0 flex-1" />
    </div>
  );
});

export default CaptchaTurnstile;
