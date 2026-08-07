// @build: 2026-06-22.REFACTOR | id: CAL-NACIMIENTO-FIX | desc: Selector de fecha con scroll funcional restaurado
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

const ITEM_HEIGHT = 48;

const SelectorColumna = ({ items, selected, onSelect }) => {
  const containerRef = useRef(null);
  const itemRefs = useRef([]);
  const debounceRef = useRef(null);
  const isProgrammaticScroll = useRef(false);
  const isUserScrolling = useRef(false);
  const [padding, setPadding] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(entries => {
      const height = entries[0].contentRect.height;
      const p = Math.max(0, (height / 2) - (ITEM_HEIGHT / 2));
      setPadding(p);
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  const centerItem = useCallback((idx) => {
    const el = itemRefs.current[idx];
    const container = containerRef.current;
    if (el && container) {
      isProgrammaticScroll.current = true;
      const containerRect = container.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const containerCenter = containerRect.top + containerRect.height / 2;
      const elCenter = elRect.top + elRect.height / 2;
      const scrollDiff = elCenter - containerCenter;
      const targetScroll = container.scrollTop + scrollDiff;
      container.scrollTo({ top: targetScroll, behavior: 'smooth' });
      setTimeout(() => { isProgrammaticScroll.current = false; }, 400);
    }
  }, []);

  useEffect(() => {
    if (isProgrammaticScroll.current || isUserScrolling.current) return;
    const idx = items.indexOf(selected);
    if (idx >= 0) setTimeout(() => centerItem(idx), 50);
  }, [selected, items, centerItem]);

  const updateSelected = useCallback(() => {
    if (isProgrammaticScroll.current) return;
    const container = containerRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const centerY = containerRect.top + containerRect.height / 2;
    let closestIndex = 0;
    let minDistance = Infinity;
    itemRefs.current.forEach((el, idx) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const elCenter = rect.top + rect.height / 2;
      const distance = Math.abs(elCenter - centerY);
      if (distance < minDistance) { minDistance = distance; closestIndex = idx; }
    });
    const selectedItem = items[closestIndex];
    if (selectedItem !== selected) {
      isUserScrolling.current = true;
      onSelect(selectedItem);
      setTimeout(() => { isUserScrolling.current = false; }, 100);
    }
  }, [items, selected, onSelect]);

  const handleScroll = useCallback(() => {
    if (isProgrammaticScroll.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(updateSelected, 100);
  }, [updateSelected]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleScrollEnd = () => { if (isProgrammaticScroll.current) return; updateSelected(); };
    el.addEventListener('scrollend', handleScrollEnd);
    return () => {
      el.removeEventListener('scrollend', handleScrollEnd);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [updateSelected]);

  const handleItemClick = (idx) => {
    if (items[idx] !== selected) {
      onSelect(items[idx]);
      centerItem(idx);
    }
  };

  return (
    <div className="flex-1 relative h-full">
      <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-white via-white/80 to-transparent z-10 pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white via-white/80 to-transparent z-10 pointer-events-none" />
      <div className="absolute top-1/2 left-0 right-0 h-12 -translate-y-1/2 bg-blue-100/60 backdrop-blur-sm border-t border-b border-blue-300/50 shadow-[inset_0_0_12px_rgba(59,130,246,0.15)] z-0" />
      <div
        ref={containerRef}
        className="h-full overflow-y-auto snap-y snap-mandatory scrollbar-hide"
        onScroll={handleScroll}
        onTouchEnd={() => setTimeout(updateSelected, 200)}
      >
        <div style={{ paddingTop: `${padding}px`, paddingBottom: `${padding}px` }}>
          {items.map((item, idx) => {
            const isCenter = item === selected;
            return (
              <div
                key={idx}
                ref={(el) => (itemRefs.current[idx] = el)}
                className={`h-12 flex items-center justify-center snap-center cursor-pointer transition-all duration-200 ${
                  isCenter ? 'scale-110' : 'text-gray-400 text-lg font-medium hover:text-gray-600'
                }`}
                onClick={() => handleItemClick(idx)}
              >
                {isCenter ? (
                  <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-white/80 backdrop-blur-sm shadow-[0_0_18px_rgba(59,130,246,0.5)] border border-blue-200/60">
                    <ChevronLeft size={14} className="text-blue-400" />
                    <span className="text-blue-600 font-bold text-2xl">{item}</span>
                    <ChevronRight size={14} className="text-blue-400" />
                  </div>
                ) : (
                  <span>{item}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export function CalendarioNacimiento({ tempFechaNacimiento, setTempFechaNacimiento, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
        <h3 className="font-bold text-gray-900 text-lg">Fecha de Nacimiento</h3>
        <button onClick={onClose} className="p-2 bg-gray-100 rounded-full"><X size={20} className="text-gray-600" /></button>
      </div>
      <div className="flex gap-0 px-4 pt-4 pb-2 shrink-0">
        <div className="flex-1 flex flex-col items-center"><span className="text-sm font-bold text-gray-700 uppercase tracking-wider">Día</span><div className="w-8 h-0.5 bg-blue-400 mt-1 rounded-full"></div></div>
        <div className="w-px bg-gray-300 mx-1 self-stretch" />
        <div className="flex-1 flex flex-col items-center"><span className="text-sm font-bold text-gray-700 uppercase tracking-wider">Mes</span><div className="w-8 h-0.5 bg-blue-400 mt-1 rounded-full"></div></div>
        <div className="w-px bg-gray-300 mx-1 self-stretch" />
        <div className="flex-1 flex flex-col items-center"><span className="text-sm font-bold text-gray-700 uppercase tracking-wider">Año</span><div className="w-8 h-0.5 bg-blue-400 mt-1 rounded-full"></div></div>
      </div>
      <div className="flex-1 flex gap-0 px-4 min-h-0">
        <div className="flex-1 relative"><SelectorColumna items={Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'))} selected={tempFechaNacimiento.dia || '01'} onSelect={(val) => setTempFechaNacimiento(prev => ({ ...prev, dia: val }))} /></div>
        <div className="w-0.5 bg-gray-300/80 mx-1 my-4 rounded-full" />
        <div className="flex-1 relative"><SelectorColumna items={['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']} selected={tempFechaNacimiento.mes ? ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][parseInt(tempFechaNacimiento.mes)-1] : 'Ene'} onSelect={(val) => { const idx = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'].indexOf(val); setTempFechaNacimiento(prev => ({ ...prev, mes: String(idx + 1).padStart(2, '0') })); }} /></div>
        <div className="w-0.5 bg-gray-300/80 mx-1 my-4 rounded-full" />
        <div className="flex-1 relative"><SelectorColumna items={Array.from({ length: new Date().getFullYear() - 1919 }, (_, i) => String(new Date().getFullYear() - i))} selected={tempFechaNacimiento.ano || String(new Date().getFullYear())} onSelect={(val) => setTempFechaNacimiento(prev => ({ ...prev, ano: val }))} /></div>
      </div>
      <div className="px-4 py-3 border-t border-gray-100 shrink-0">
        <button onClick={onConfirm} className="w-full py-3 bg-blue-600 text-white rounded-xl text-base font-bold shadow-lg shadow-blue-200">Confirmar</button>
      </div>
    </div>
  );
}