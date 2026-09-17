// @build: 2026-09-03 | id: SKELETON-CARD | backup: SkeletonCard.backup-20260903-000000 | desc: Tarjeta skeleton reutilizable para estados de carga
import React from 'react';

export default function SkeletonCard({ lines = 3, showButton = false }) {
  return (
    <div
      className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse"
      aria-hidden="true"
    >
      <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-gray-200 rounded mb-2"
          style={{ width: `${80 - i * 10}%` }}
        ></div>
      ))}
      {showButton && (
        <div className="flex gap-2 mt-3">
          <div className="h-8 bg-gray-200 rounded flex-1"></div>
          <div className="h-8 bg-gray-200 rounded w-10"></div>
        </div>
      )}
      <span className="sr-only">Cargando...</span>
    </div>
  );
}
