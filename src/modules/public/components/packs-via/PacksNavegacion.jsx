// @build: 2026-11-24 | id: F-02-PACKS-NAV | desc: Cabecera fija "Moto App · Packs de La Vía" con retorno y acceso a sesiones sueltas.
import { ChevronLeft, Package } from 'lucide-react';

export default function PacksNavegacion({ onVolver, onSesiones }) {
  return (
    <nav
      aria-label="Navegación de packs"
      className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-[#0F172A]/95 text-white backdrop-blur-md"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between gap-2 px-3 sm:px-5">
        <button
          type="button"
          onClick={onVolver}
          aria-label="Volver al inicio"
          className="inline-flex h-11 w-11 shrink-0 cursor-pointer touch-manipulation items-center justify-center rounded-full bg-white/10 text-white transition-all hover:bg-white/20 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
        >
          <ChevronLeft size={20} aria-hidden="true" />
        </button>

        <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-black tracking-tight text-white">
          <Package size={12} className="shrink-0 text-[#FF6B00]" aria-hidden="true" />
          <span className="truncate">Moto App · Packs de La Vía</span>
        </span>

        <button
          type="button"
          onClick={onSesiones}
          className="inline-flex min-h-[44px] shrink-0 cursor-pointer touch-manipulation items-center rounded-full border border-white/15 bg-white/10 px-3 text-[11px] font-extrabold text-blue-200 transition-all hover:bg-white/20 active:scale-95"
        >
          <span>Sesiones</span>
        </button>
      </div>
    </nav>
  );
}
