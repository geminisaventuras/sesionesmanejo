// @build: 2026-06-18.02-00-00 | id: B15-SISTEMA | desc: AppShell definitivo con footer fijo, sin conflictos CSS
import React from 'react';

const AppShell = ({ header, children, footer, bgColor = 'bg-gray-50', maxWidth = 'max-w-md', className = '' }) => {
  return (
    <div className={`relative ${maxWidth} mx-auto shadow-xl ${className}`}>
      <div className={`flex flex-col min-h-dvh ${bgColor}`}>
        {header && (
          <div className="shrink-0 z-20">
            {header}
          </div>
        )}
        <div className="flex-1 overflow-y-auto pb-20">
          {children}
        </div>
      </div>
      {footer && (
        <div className="fixed bottom-0 left-0 right-0 mx-auto max-w-md z-30">
          {footer}
        </div>
      )}
    </div>
  );
};

export default AppShell;
