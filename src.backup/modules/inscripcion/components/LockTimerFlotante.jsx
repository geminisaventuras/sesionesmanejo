// @build: 2026-06-22.REFACTOR | id: LOCK-TIMER | desc: Temporizador visual del lock de horario.
import React from 'react';

export function LockTimerFlotante({ tiempoRestante, renovacionUsada, onRenovarLock }) {
  if (tiempoRestante === null) return null;
  const total = 10 * 60 * 1000;
  const restante = Math.max(tiempoRestante, 0);
  const pct = (restante / total) * 100;
  const circumference = 2 * Math.PI * 20;
  const offset = circumference - (pct / 100) * circumference;
  const minutes = Math.floor(restante / 60000);
  const seconds = Math.floor((restante % 60000) / 1000);
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  let strokeColor;
  if (restante > 300000) strokeColor = '#16a34a';
  else if (restante > 60000) strokeColor = '#f59e0b';
  else strokeColor = '#dc2626';

  return (
    <div className="relative inline-flex items-center gap-1 bg-white/80 backdrop-blur-sm rounded-full px-1 py-1 shadow-sm border border-gray-200">
      <div className="relative w-10 h-10">
        <svg className="w-10 h-10 transform -rotate-90" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r="20" fill="none" stroke="#e5e7eb" strokeWidth="5" />
          <circle cx="24" cy="24" r="20" fill="none" stroke={strokeColor} strokeWidth="5" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000 ease-linear" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] font-bold text-gray-800">{timeStr}</span>
        </div>
      </div>
      {restante <= 0 && !renovacionUsada && (
        <button onClick={onRenovarLock} className="text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded-full font-bold hover:bg-red-700">Renovar</button>
      )}
      {restante <= 0 && renovacionUsada && (
        <span className="text-[10px] text-red-600 font-bold">Agotado</span>
      )}
    </div>
  );
}