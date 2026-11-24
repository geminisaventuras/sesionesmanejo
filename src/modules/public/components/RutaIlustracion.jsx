// @build: 2026-11-23 | id: T-087-RUTA-ILUSTRACION-IA | desc: Ilustraciones IA con motion para la Ruta de sesiones.
//
// Presentacional y decorativo: no contiene texto ni datos de negocio.
// Usa WebP locales (Vite) y capas CSS/SVG; el movimiento se activa solo en
// viewport y se desactiva con prefers-reduced-motion.

import { useEffect, useRef, useState } from 'react';
import equilibrioImg from '../../../assets/ruta/equilibrio.webp';
import basicasImg from '../../../assets/ruta/basicas.webp';
import practicasImg from '../../../assets/ruta/practicas.webp';
import './rutaIlustracion.css';

const ARTE = {
  equilibrio: { src: equilibrioImg },
  basicas: { src: basicasImg },
  practica: { src: practicasImg },
};

export default function RutaIlustracion({ tipo = 'equilibrio', className = '' }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  const arte = ARTE[tipo] || ARTE.equilibrio;

  useEffect(() => {
    const nodo = ref.current;
    if (!nodo || typeof IntersectionObserver === 'undefined') return undefined;

    const observador = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((entrada) => setVisible(entrada.isIntersecting));
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.15 },
    );

    observador.observe(nodo);
    return () => observador.disconnect();
  }, []);

  return (
    <figure
      ref={ref}
      aria-hidden="true"
      className={`ruta-arte ruta-arte--${tipo} ${visible ? 'ruta-arte--visto' : ''} ${className}`}
    >
      <div className="ruta-arte__lienzo">
        <div className="ruta-arte__marco">
          <img
            className="ruta-arte__img"
            src={arte.src}
            width="1600"
            height="893"
            alt=""
            loading={tipo === 'equilibrio' ? 'eager' : 'lazy'}
            decoding="async"
          />
          <svg
            className="ruta-arte__capa"
            viewBox="0 0 1600 893"
            fill="none"
            aria-hidden="true"
            focusable="false"
          >
            <g strokeLinecap="round" strokeLinejoin="round">
              {tipo === 'equilibrio' && (
                <>
                  <ellipse
                    className="ruta-arte__anillo ruta-arte__bucle"
                    cx="1042"
                    cy="716"
                    rx="104"
                    ry="42"
                    stroke="#2563EB"
                    strokeWidth="6"
                    strokeDasharray="7 16"
                    opacity="0.5"
                  />
                  <path d="M1062 460V726" stroke="#FFFFFF" strokeWidth="12" strokeDasharray="9 22" opacity="0.7" />
                  <path d="M1062 460V726" stroke="#2563EB" strokeWidth="8" strokeDasharray="9 22" opacity="0.85" />
                  <circle cx="1062" cy="734" r="10" fill="#059669" />
                  <circle
                    className="ruta-arte__punto ruta-arte__bucle"
                    cx="1062"
                    cy="396"
                    r="57"
                    stroke="#2563EB"
                    strokeWidth="6"
                    opacity="0.45"
                  />
                  <circle cx="1062" cy="396" r="34" fill="#FFFFFF" />
                  <circle cx="1062" cy="396" r="16" fill="#2563EB" />
                </>
              )}

              {tipo === 'basicas' && (
                <g className="ruta-arte__rachas" strokeWidth="9">
                  <g className="ruta-arte__racha ruta-arte__bucle">
                    <path d="M120 690h150" stroke="#2563EB" />
                  </g>
                  <g className="ruta-arte__racha ruta-arte__bucle">
                    <path d="M96 730h130" stroke="#64748B" />
                  </g>
                  <g className="ruta-arte__racha ruta-arte__bucle">
                    <path d="M126 770h142" stroke="#2563EB" />
                  </g>
                </g>
              )}

              {tipo === 'practica' && (
                <>
                  <g className="ruta-arte__laterales" strokeWidth="9" opacity="0.65">
                    <g className="ruta-arte__racha-lateral ruta-arte__bucle">
                      <path d="M34 588h122" stroke="#2563EB" />
                    </g>
                    <g className="ruta-arte__racha-lateral ruta-arte__bucle">
                      <path d="M14 638h96" stroke="#64748B" />
                    </g>
                    <g className="ruta-arte__racha-lateral ruta-arte__bucle">
                      <path d="M40 688h116" stroke="#64748B" />
                    </g>
                  </g>
                  <g className="ruta-arte__checkpoints">
                    <g className="ruta-arte__checkpoint">
                      <circle cx="949" cy="668" r="26" fill="#FFFFFF" stroke="#059669" strokeWidth="8" />
                      <circle cx="949" cy="668" r="9" fill="#059669" />
                    </g>
                    <g className="ruta-arte__checkpoint">
                      <circle cx="1148" cy="659" r="26" fill="#FFFFFF" stroke="#059669" strokeWidth="8" />
                      <circle cx="1148" cy="659" r="9" fill="#059669" />
                    </g>
                    <g className="ruta-arte__checkpoint">
                      <circle cx="1255" cy="667" r="26" fill="#FFFFFF" stroke="#059669" strokeWidth="8" />
                      <circle cx="1255" cy="667" r="9" fill="#059669" />
                    </g>
                  </g>
                </>
              )}
            </g>
          </svg>
        </div>
      </div>
    </figure>
  );
}
