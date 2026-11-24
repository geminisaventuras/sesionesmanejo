// @build: 2026-11-23 | id: T-073-MENU-ACCIONES | desc: Menú de acciones accesible: popover en escritorio y bottom sheet en móvil (Escape, foco, 44px).
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';

const TRIGGER_POR_TONO = {
  neutral: 'border-gray-200 bg-white text-gray-900 hover:bg-gray-50',
  primary: 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700',
  success: 'border-green-500 bg-green-500 text-white hover:bg-green-600',
  whatsapp: 'border-green-500 bg-green-500 text-white hover:bg-green-600',
  warning: 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100',
};

const ICONO_POR_TONO = {
  neutral: 'bg-gray-100 text-gray-700',
  primary: 'bg-blue-50 text-blue-700',
  success: 'bg-green-50 text-green-700',
  danger: 'bg-red-50 text-red-600',
  warning: 'bg-amber-50 text-amber-700',
  whatsapp: 'bg-green-50 text-green-700',
};

const ItemsMenu = ({ acciones, onSeleccionar }) => (
  <>
    {acciones.map((accion) => {
      const Icono = accion.icon;
      const deshabilitado = Boolean(accion.deshabilitado);
      return (
        <button
          key={accion.id}
          type="button"
          role="menuitem"
          aria-disabled={deshabilitado || undefined}
          onClick={() => onSeleccionar(accion)}
          className={`flex min-h-12 w-full items-start gap-2.5 px-3 py-2 text-left transition-colors ${
            deshabilitado ? 'cursor-not-allowed opacity-50' : 'hover:bg-gray-50 focus-visible:bg-gray-50'
          }`}
        >
          {Icono ? (
            <span
              aria-hidden="true"
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${ICONO_POR_TONO[accion.tono] || ICONO_POR_TONO.neutral}`}
            >
              <Icono size={15} />
            </span>
          ) : null}
          <span className="min-w-0 flex-1">
            <span className="block text-[12.5px] font-bold leading-tight text-gray-900">{accion.etiqueta}</span>
            {accion.descripcion ? (
              <span className="mt-0.5 block text-[10.5px] font-medium leading-snug text-gray-500">
                {accion.descripcion}
              </span>
            ) : null}
          </span>
        </button>
      );
    })}
  </>
);

// Sheet móvil: se monta solo al abrir, por eso el focus trap vive aquí y no en el
// contenedor principal (que existe desde el primer render con la hoja cerrada).
const HojaMovil = ({ idPanel, idTitulo, titulo, acciones, onSeleccionar, onCerrar, alTeclearPanel, panelRef }) => {
  const hojaRef = useRef(null);
  useFocusTrap(hojaRef, onCerrar);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center lg:hidden">
      <button
        type="button"
        tabIndex={-1}
        aria-label="Cerrar menú"
        onClick={onCerrar}
        className="absolute inset-0 h-full w-full cursor-default bg-slate-900/50"
      />
      <section
        ref={hojaRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        className="relative flex max-h-[85dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl"
      >
        <span aria-hidden="true" className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-gray-200" />
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-100 px-4 pb-2 pt-1.5">
          <h2 id={idTitulo} className="m-0 truncate text-[15px] font-extrabold text-gray-900">
            {titulo}
          </h2>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar menú"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div
          id={idPanel}
          ref={panelRef}
          role="menu"
          aria-labelledby={idTitulo}
          onKeyDown={alTeclearPanel}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[calc(8px_+_env(safe-area-inset-bottom))] pt-1"
        >
          <ItemsMenu acciones={acciones} onSeleccionar={onSeleccionar} />
        </div>
      </section>
    </div>
  );
};

/**
 * Menú de acciones reutilizable.
 * - Escritorio (lg+): popover anclado al botón, role="menu", flechas/Home/End y Escape.
 * - Móvil: bottom sheet con focus trap, Escape y targets de 48px.
 *
 * acciones: [{ id, etiqueta, descripcion?, icon?, tono?, deshabilitado?, onSelect }]
 */
export default function MenuAcciones({
  id,
  etiqueta,
  icon: Icon,
  titulo,
  acciones = [],
  disabled = false,
  tono = 'neutral',
  className = '',
}) {
  const idReact = useId();
  const idBase = id || `menu-acciones-${String(idReact).replace(/[^a-zA-Z0-9-]/g, '')}`;
  const idPanel = `${idBase}-panel`;
  const idTituloMovil = `${idBase}-titulo-movil`;

  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  const [abierto, setAbierto] = useState(false);
  const [esEscritorio, setEsEscritorio] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const media = window.matchMedia('(min-width: 1024px)');
    setEsEscritorio(media.matches);
    const alCambiarAncho = (event) => {
      setEsEscritorio(event.matches);
      setAbierto(false);
    };
    media.addEventListener?.('change', alCambiarAncho);
    return () => media.removeEventListener?.('change', alCambiarAncho);
  }, []);

  const cerrar = useCallback((devolverFoco) => {
    setAbierto(false);
    if (devolverFoco === false) return;
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  // El sheet móvil usa el hook compartido (focus trap + Escape) dentro de HojaMovil.

  // En escritorio el foco entra al primer ítem del popover.
  useEffect(() => {
    if (!abierto || !esEscritorio) return undefined;
    const raf = window.requestAnimationFrame(() => {
      panelRef.current?.querySelector('[role="menuitem"]')?.focus();
    });
    return () => window.cancelAnimationFrame(raf);
  }, [abierto, esEscritorio]);

  useEffect(() => {
    if (!abierto || !esEscritorio) return undefined;
    const alPresionarEscapeGlobal = (event) => {
      if (event.key === 'Escape') cerrar();
    };
    document.addEventListener('keydown', alPresionarEscapeGlobal);
    return () => document.removeEventListener('keydown', alPresionarEscapeGlobal);
  }, [abierto, esEscritorio, cerrar]);

  const alTeclearPanel = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      cerrar();
      return;
    }
    const items = Array.from(panelRef.current?.querySelectorAll('[role="menuitem"]') || []);
    if (items.length === 0) return;
    const actual = items.indexOf(document.activeElement);
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      items[(actual + 1) % items.length]?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      items[(actual - 1 + items.length) % items.length]?.focus();
    } else if (event.key === 'Home') {
      event.preventDefault();
      items[0]?.focus();
    } else if (event.key === 'End') {
      event.preventDefault();
      items[items.length - 1]?.focus();
    }
  };

  const seleccionar = (accion) => {
    if (accion.deshabilitado) return;
    // Sin devolver el foco: la acción puede abrir un modal o navegar.
    cerrar(false);
    accion.onSelect?.();
  };

  const alTeclearTrigger = (event) => {
    if (event.key === 'ArrowDown' && !abierto) {
      event.preventDefault();
      setAbierto(true);
    }
  };

  const deshabilitadoTotal = disabled || acciones.length === 0;

  return (
    <div className={`relative min-w-0 ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setAbierto((previo) => !previo)}
        onKeyDown={alTeclearTrigger}
        disabled={deshabilitadoTotal}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-controls={abierto ? idPanel : undefined}
        className={`flex min-h-12 w-full min-w-0 items-center justify-between gap-2 rounded-xl border px-3 py-2 text-[12.5px] font-extrabold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
          TRIGGER_POR_TONO[tono] || TRIGGER_POR_TONO.neutral
        }`}
      >
        <span className="flex min-w-0 items-center gap-2">
          {Icon ? <Icon size={16} aria-hidden="true" className="shrink-0" /> : null}
          <span className="truncate">{etiqueta}</span>
        </span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={`shrink-0 transition-transform ${abierto ? 'rotate-180' : ''}`}
        />
      </button>

      {abierto && esEscritorio ? (
        <>
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            onClick={cerrar}
            className="fixed inset-0 z-40 cursor-default bg-transparent"
          />
          <div
            id={idPanel}
            ref={panelRef}
            role="menu"
            aria-label={titulo || etiqueta}
            onKeyDown={alTeclearPanel}
            className="absolute right-0 top-full z-50 mt-2 max-h-[min(70vh,30rem)] w-72 max-w-[calc(100vw-1.5rem)] overflow-y-auto overscroll-contain rounded-2xl border border-gray-200 bg-white py-1 shadow-2xl"
          >
            <ItemsMenu acciones={acciones} onSeleccionar={seleccionar} />
          </div>
        </>
      ) : null}

      {abierto && !esEscritorio ? (
        <HojaMovil
          idPanel={idPanel}
          idTitulo={idTituloMovil}
          titulo={titulo || etiqueta}
          acciones={acciones}
          onSeleccionar={seleccionar}
          onCerrar={cerrar}
          alTeclearPanel={alTeclearPanel}
          panelRef={panelRef}
        />
      ) : null}
    </div>
  );
}
