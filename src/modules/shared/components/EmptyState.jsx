// @build: 2026-09-03 | id: EMPTY-STATE-REUTILIZABLE | backup: EmptyState.backup-20260903-000000 | desc: Estado vacío reutilizable con icono, título y acción opcional
import React from 'react';
import { Inbox } from 'lucide-react';
import { Button } from '../../../components/UI';

export default function EmptyState({ 
  icon: Icon = Inbox,
  title = 'No hay datos',
  description,
  action
}) {
  return (
    <div className="text-center py-12 px-4">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Icon className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-gray-600 mb-4 max-w-sm mx-auto">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick} variant="primary">
          {action.label}
        </Button>
      )}
    </div>
  );
}
