// @build: 2026-06-22.REFACTOR | id: STEPPER | desc: Componente puro del indicador de pasos.
import React from 'react';
import { Bike } from 'lucide-react';

export function Stepper({ currentStep, onStepClick }) {
  const totalSteps = 4;
  const progressWidth = ((currentStep - 1) / (totalSteps - 1)) * 100 + '%';

  return (
    <div className="relative flex items-center justify-between w-full max-w-xs mx-auto py-1">
      <div className="absolute top-1/2 left-0 right-0 h-1.5 bg-gray-200 transform -translate-y-1/2 z-0" />
      <div className="absolute top-1/2 left-0 h-1.5 bg-blue-600 transform -translate-y-1/2 z-10 transition-all duration-500" style={{ width: progressWidth }} />
      {[1,2,3,4].map(i => {
        const isCurrent = i === currentStep;
        const isCompleted = i < currentStep;
        const isClickable = isCompleted;
        let circleClass = "relative z-20 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-md transition-all";
        if (isCurrent) circleClass += " w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-700 border-2 border-blue-300 shadow-xl pointer-events-none";
        else if (isCompleted) circleClass += " bg-blue-600 text-white cursor-pointer hover:bg-blue-700";
        else circleClass += " border-2 border-gray-300 bg-white text-gray-500 pointer-events-none";

        return (
          <div
            key={i}
            className={circleClass}
            onClick={() => isClickable && onStepClick(i)}
            role={isClickable ? 'button' : undefined}
            tabIndex={isClickable ? 0 : undefined}
          >
            {isCurrent ? (<Bike size={22} className="text-white" />) : i}
          </div>
        );
      })}
    </div>
  );
}