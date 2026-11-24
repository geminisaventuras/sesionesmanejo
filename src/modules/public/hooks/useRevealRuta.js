// @build: 2026-11-22 | id: FT-034-USE-REVEAL-RUTA | desc: Reveals de la ruta con IntersectionObserver, sin librerías.
//
// Mejora progresiva:
// - Sin JS o con prefers-reduced-motion: reduce, el contenido queda visible y
//   no se agrega la clase .ruta-motion.
// - Con movimiento permitido, solo se animan transform/opacity.
// - La línea de calzada avanza por hitos observados, sin listener de scroll.

import { useCallback, useEffect, useState } from 'react';

const MEDIA_REDUCED = '(prefers-reduced-motion: no-preference)';

function puedeAnimar() {
  if (typeof window === 'undefined') return false;
  if (typeof window.matchMedia !== 'function') return false;
  if (typeof window.IntersectionObserver !== 'function') return false;
  return window.matchMedia(MEDIA_REDUCED).matches;
}

export default function useRevealRuta({ enabled = true, revision = 0 } = {}) {
  const [root, setRoot] = useState(null);
  const rootRef = useCallback((nodo) => setRoot(nodo), []);
  const [motionActivo, setMotionActivo] = useState(() => enabled && puedeAnimar());

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;

    const media = window.matchMedia(MEDIA_REDUCED);
    const actualizar = () => {
      setMotionActivo(Boolean(enabled) && media.matches && typeof window.IntersectionObserver === 'function');
    };

    actualizar();

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', actualizar);
      return () => media.removeEventListener('change', actualizar);
    }

    media.addListener(actualizar);
    return () => media.removeListener(actualizar);
  }, [enabled]);

  useEffect(() => {
    if (!motionActivo || typeof window.IntersectionObserver !== 'function') return undefined;
    if (!root) return undefined;

    const pendientes = Array.from(root.querySelectorAll('[data-ruta-reveal]'));
    const observador = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((entrada) => {
          if (!entrada.isIntersecting) return;
          entrada.target.classList.add('ruta-visible');
          observador.unobserve(entrada.target);
        });
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0 }
    );

    pendientes.forEach((nodo) => observador.observe(nodo));

    const hitos = Array.from(root.querySelectorAll('[data-ruta-hito]'));
    const linea = root.querySelector('[data-ruta-linea]');
    let observadorLinea = null;

    if (linea && hitos.length > 0) {
      linea.style.setProperty('--ruta-progreso', '0.12');
      observadorLinea = new IntersectionObserver(
        (entradas) => {
          entradas.forEach((entrada) => {
            if (!entrada.isIntersecting) return;
            const indice = hitos.indexOf(entrada.target);
            if (indice < 0) return;
            const progreso = Math.min(1, Math.max(0.12, (indice + 1) / hitos.length));
            linea.style.setProperty('--ruta-progreso', String(progreso));
          });
        },
        { rootMargin: '-28% 0px -50% 0px', threshold: 0 }
      );

      hitos.forEach((hito) => observadorLinea.observe(hito));
    }

    return () => {
      observador.disconnect();
      observadorLinea?.disconnect();
    };
  }, [motionActivo, root, revision]);

  return { rootRef, motionActivo };
}
