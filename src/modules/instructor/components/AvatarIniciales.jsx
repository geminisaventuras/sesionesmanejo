// @build: 2026-09-03 | id: INSTRUCTOR-AVATAR-INICIALES | backup: AvatarIniciales.backup-20260903-000000 | desc: Avatar con iniciales para el perfil del instructor
import React from 'react';

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-12 h-12 text-sm',
  lg: 'w-16 h-16 text-lg',
  xl: 'w-24 h-24 text-xl'
};

export default function AvatarIniciales({ nombre, apellido, fotoUrl, size = 'md' }) {
  const iniciales = `${(nombre || '').charAt(0)}${(apellido || '').charAt(0)}`.toUpperCase();

  if (fotoUrl) {
    return (
      <img
        src={fotoUrl}
        alt={`Avatar de ${nombre} ${apellido}`}
        className={`${sizeClasses[size]} rounded-full object-cover`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} bg-blue-600 text-white rounded-full flex items-center justify-center font-bold`}
      aria-label={`Avatar de ${nombre} ${apellido}`}
    >
      {iniciales || '?'}
    </div>
  );
}
