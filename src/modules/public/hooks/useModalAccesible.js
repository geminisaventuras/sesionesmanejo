// @build: 2026-11-22 | id: FT-034-MODAL-ACCESIBLE | desc: Foco inicial, trap, Escape y restauración para modales públicos.
//
// Uso:
//   const cerrarRef = useRef(null);
//   const dialogRef = useModalAccesible({ open, onClose, initialFocusRef: cerrarRef });
//   <div ref={dialogRef} role="dialog" aria-modal="true" tabIndex={-1}>...
//
// No bloquea el scroll ni cambia el contenido del modal. El foco inicial usa
// preventScroll para no mover la página al abrir.

import { useCallback, useEffect, useRef, useState } from 'react';

const SELECTOR_FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

export default function useModalAccesible({ open = true, onClose, initialFocusRef } = {}) {
  const [dialog, setDialog] = useState(null);
  const dialogRef = useCallback((nodo) => setDialog(nodo), []);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;
    if (!dialog) return undefined;

    const anterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusables = () =>
      Array.from(dialog.querySelectorAll(SELECTOR_FOCUSABLE)).filter(
        (el) => !el.hasAttribute('disabled') && el.getClientRects().length > 0
      );

    const inicial =
      initialFocusRef?.current ||
      dialog.querySelector('[data-modal-inicial]') ||
      focusables()[0] ||
      dialog;

    // preventScroll evita que abrir el modal arrastre la página.
    const temporizador = window.setTimeout(() => {
      inicial?.focus?.({ preventScroll: true });
    }, 0);

    const alPresionarTecla = (evento) => {
      if (evento.key === 'Escape') {
        evento.preventDefault();
        onCloseRef.current?.();
        return;
      }

      if (evento.key !== 'Tab') return;

      const elementos = focusables();
      if (elementos.length === 0) {
        evento.preventDefault();
        dialog.focus({ preventScroll: true });
        return;
      }

      const primero = elementos[0];
      const ultimo = elementos[elementos.length - 1];
      const activo = document.activeElement;

      if (!dialog.contains(activo)) {
        evento.preventDefault();
        (evento.shiftKey ? ultimo : primero).focus({ preventScroll: true });
        return;
      }

      if (evento.shiftKey && activo === primero) {
        evento.preventDefault();
        ultimo.focus({ preventScroll: true });
        return;
      }

      if (!evento.shiftKey && activo === ultimo) {
        evento.preventDefault();
        primero.focus({ preventScroll: true });
      }
    };

    document.addEventListener('keydown', alPresionarTecla);

    return () => {
      window.clearTimeout(temporizador);
      document.removeEventListener('keydown', alPresionarTecla);

      if (anterior?.isConnected) {
        anterior.focus({ preventScroll: true });
      }
    };
  }, [open, dialog, initialFocusRef]);

  return dialogRef;
}
