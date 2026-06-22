// @build: 2026-06-22 | id: SHELL-NO-SCROLL-X | desc: Layout sin scroll horizontal
import React from 'react';

const AppShell = ({ header, children, footer, bgColor = 'bg-gray-50', maxWidth = 'max-w-md', className = '' }) => {
  return (
    <div className={`${maxWidth} mx-auto shadow-xl h-dvh flex flex-col overflow-x-hidden ${bgColor} ${className}`}>
      {header && (
        <div className="shrink-0 z-20">
          {header}
        </div>
      )}
      <div className="flex-1 overflow-y-auto min-h-0">
        {children}
      </div>
      {footer && (
        <div className="shrink-0 z-30">
          {footer}
        </div>
      )}
    </div>
  );
};

export default AppShell;