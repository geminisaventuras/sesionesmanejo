import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight, Check, AlertCircle } from 'lucide-react';

// Función auxiliar para formatear fecha amigable (Ej: "Martes, 15 de junio")
const formatDateFriendly = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T12:00:00'); // Evitar problemas de zona horaria
  const options = { weekday: 'long', day: 'numeric', month: 'long' };
  return new Intl.DateTimeFormat('es-VE', options).format(date);
};

export const CalendarioDisponible = ({ 
  value, 
  onChange, 
  minDate, 
  maxDate, 
  onFindNextAvailable, 
  checkingAvailability 
}) => {
  // Generar días del mes actual
  const currentMonth = useMemo(() => {
    const d = value ? new Date(value + 'T12:00:00') : new Date();
    return {
      year: d.getFullYear(),
      month: d.getMonth(),
      firstDay: new Date(d.getFullYear(), d.getMonth(), 1),
      daysInMonth: new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
    };
  }, [value]);

  const handlePrevMonth = () => {
    const d = new Date(currentMonth.year, currentMonth.month - 1, 1);
    onChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`);
  };

  const handleNextMonth = () => {
    const d = new Date(currentMonth.year, currentMonth.month + 1, 1);
    onChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`);
  };

  // Generar array de días para renderizar
  const days = [];
  const startDayOfWeek = currentMonth.firstDay.getDay(); // 0 = Domingo
  
  // Días vacíos antes del primer día del mes
  for (let i = 0; i < startDayOfWeek; i++) {
    days.push(<div key={`empty-${i}`} className="h-10" />);
  }

  // Días del mes
  for (let d = 1; d <= currentMonth.daysInMonth; d++) {
    const dateStr = `${currentMonth.year}-${String(currentMonth.month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    
    // Validaciones básicas
    const isPast = dateStr < minDate;
    const isFuture = dateStr > maxDate;
    const isSelected = value === dateStr;
    
    // Estado visual (se podría pasar una prop 'availableDates' para marcar en verde/rojo si se precarga)
    // Por ahora, asumimos que el usuario selecciona y el sistema valida, 
    // pero podemos añadir un indicador de "Cargando..." si checkingAvailability es true
    
    let bgClass = "bg-white hover:bg-blue-50 text-gray-900";
    let borderClass = "border-gray-200";
    let disabled = false;

    if (isPast || isFuture) {
      bgClass = "bg-gray-50 text-gray-300 cursor-not-allowed";
      disabled = true;
    } else if (isSelected) {
      bgClass = "bg-blue-600 text-white font-bold shadow-md transform scale-105";
      borderClass = "border-blue-600";
    } else {
      // Aquí podríamos integrar lógica real de disponibilidad si pasamos un set de fechas ocupadas
      // Ejemplo: if (occupiedDates.has(dateStr)) { bgClass = "...red..." }
    }

    days.push(
      <button
        key={d}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && onChange(dateStr)}
        className={`h-10 w-10 rounded-full flex items-center justify-center text-sm transition-all duration-200 border ${bgClass} ${borderClass}`}
      >
        {d}
      </button>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-4">
      {/* Header del Mes */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-100 rounded-full text-gray-600">
          <ChevronLeft size={20} />
        </button>
        <h3 className="font-bold text-gray-800 capitalize">
          {new Intl.DateTimeFormat('es-VE', { month: 'long', year: 'numeric' }).format(currentMonth.firstDay)}
        </h3>
        <button onClick={handleNextMonth} className="p-2 hover:bg-gray-100 rounded-full text-gray-600">
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Grilla de días */}
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map(day => (
          <div key={day} className="text-xs font-bold text-gray-400">{day}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 place-items-center">
        {days}
      </div>

      {/* Botón de ayuda si no hay disponibilidad en la fecha actual */}
      {checkingAvailability && (
        <div className="mt-4 text-center text-xs text-blue-600 animate-pulse">
          Verificando disponibilidad en tiempo real...
        </div>
      )}
      
      {!checkingAvailability && value && (
         <div className="mt-3 text-center text-xs text-gray-500">
           Seleccionado: <span className="font-bold text-blue-600 capitalize">{formatDateFriendly(value)}</span>
         </div>
      )}
    </div>
  );
};