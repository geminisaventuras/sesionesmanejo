// @build: 2026-11-24 | id: LEGAL-MODAL | desc: El aviso legal del footer abre un modal accesible con el texto completo.
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Info, ShieldCheck, X } from 'lucide-react';

const AVISO_LEGAL = "Esta plataforma ofrece servicios privados de educación no formal, consultoría deportiva y tutorías de acompañamiento para el desarrollo de habilidades motoras. No somos una 'Escuela del Transporte' ni prestamos servicios conexos regulados por el Instituto Nacional de Transporte Terrestre (INTT). Las constancias emitidas por esta plataforma son de carácter privado, recreativo, y no poseen validez legal para la obtención de licencias de conducir, certificados de saberes o cualquier otro trámite ante las autoridades de tránsito del Estado venezolano.";

/**
 * Footer con el aviso legal obligatorio (desvinculación de INTT).
 * El texto no se despliega en la página: se abre en un modal accesible.
 *
 * @param {Object} props
 * @param {boolean} [props.compact] - Variante discreta para el pie de páginas con fondo oscuro.
 */
export default function LegalFooter({ compact = false }) {
  const version = typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : '';
  const [abierto, setAbierto] = useState(false);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const closeRef = useRef(null);
  const tituloId = useId();

  useEffect(() => {
    if (!abierto) return undefined;

    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const foco = window.setTimeout(() => closeRef.current?.focus(), 0);

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setAbierto(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = panel.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const primero = focusables[0];
      const ultimo = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === primero) {
        event.preventDefault();
        ultimo.focus();
      } else if (!event.shiftKey && document.activeElement === ultimo) {
        event.preventDefault();
        primero.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(foco);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflowPrevio;
      triggerRef.current?.focus();
    };
  }, [abierto]);

  const abrir = () => setAbierto(true);
  const cerrar = () => setAbierto(false);

  const disparador = compact ? (
    <button
      ref={triggerRef}
      type="button"
      onClick={abrir}
      aria-haspopup="dialog"
      className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400/90 underline decoration-slate-500/40 decoration-dotted underline-offset-4 transition-colors hover:text-slate-200 hover:decoration-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70"
    >
      <Info size={11} aria-hidden="true" />
      Aviso legal
    </button>
  ) : (
    <button
      ref={triggerRef}
      type="button"
      onClick={abrir}
      aria-haspopup="dialog"
      className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 underline decoration-gray-300 decoration-dotted underline-offset-4 transition-colors hover:text-gray-800 hover:decoration-gray-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2"
    >
      <Info size={12} aria-hidden="true" />
      Aviso legal
    </button>
  );

  const modal = abierto
    ? createPortal(
        <div
          className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm sm:items-center sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) cerrar();
          }}
        >
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={tituloId}
            className="relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-[0_24px_80px_-12px_rgba(15,23,42,0.55)] ring-1 ring-slate-900/10 sm:rounded-3xl"
          >
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-5 pb-5 pt-5 text-white sm:px-6">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-amber-400/20 blur-2xl"
              />
              <div className="relative flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15">
                    <ShieldCheck size={22} className="text-amber-300" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 id={tituloId} className="text-lg font-black leading-tight tracking-tight">
                      Aviso legal
                    </h2>
                    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-300">
                      Educación no formal · Venezuela
                    </p>
                  </div>
                </div>
                <button
                  ref={closeRef}
                  type="button"
                  onClick={cerrar}
                  aria-label="Cerrar aviso legal"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-slate-200 ring-1 ring-white/10 transition hover:bg-white/20 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto px-5 py-5 sm:px-6">
              <div className="rounded-2xl border border-amber-200/70 bg-amber-50/70 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-900/80">
                  Importante
                </p>
                <p className="mt-1 text-sm font-medium leading-relaxed text-slate-700">
                  Somos una plataforma privada de educación no formal. No emitimos licencias de
                  conducir ni gestionamos trámites ante el INTT.
                </p>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-slate-600">{AVISO_LEGAL}</p>
            </div>

            <div className="border-t border-slate-200/80 bg-slate-50/80 px-5 py-3.5 sm:px-6">
              <button
                type="button"
                onClick={cerrar}
                className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
              >
                Entendido
              </button>
              <p className="mt-2 text-center text-[10px] text-slate-400">
                También puedes cerrar con Escape
              </p>
            </div>
          </div>
        </div>,
        document.body
      )
    : null;

  if (compact) {
    return (
      <div className="mt-2 px-1 text-center">
        {disparador}
        {version && <p className="mt-1 text-[9px] text-slate-500/80">Versión {version}</p>}
        {modal}
      </div>
    );
  }

  return (
    <footer className="px-6 py-6 text-center border-t border-gray-200 mt-4">
      {disparador}
      {version && <p className="mt-1 text-[9px] text-gray-400">Versión {version}</p>}
      {modal}
    </footer>
  );
}
