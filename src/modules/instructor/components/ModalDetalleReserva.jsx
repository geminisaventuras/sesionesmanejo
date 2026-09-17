// @build: 2026-09-03 | id: INSTRUCTOR-MODAL-DETALLE | backup: ModalDetalleReserva.backup-20260903-000000 | desc: Modal de detalle de reserva sin teléfono, con avance académico
import React, { useEffect, useRef } from 'react';
import { X, User, Calendar, Clock, MapPin, Bike, CreditCard, CheckCircle, Circle } from 'lucide-react';
import { Button } from '../../../components/UI';

export default function ModalDetalleReserva({
  reserva,
  curso,
  horario,
  sede,
  onClose,
  onIniciarClase,
  puedeIniciarClase
}) {
  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!reserva) return null;

  const modulos = curso?.modulos || [];
  const modulosEstado = reserva.modulosEstado || {};

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-detalle-titulo"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 id="modal-detalle-titulo" className="font-black text-gray-900 text-lg">
            Detalle de Reserva
          </h3>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="p-1 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Datos del estudiante */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <User size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="font-black text-gray-900">
                {reserva.nombre} {reserva.apellido}
              </p>
              <p className="text-xs text-gray-500">Estudiante</p>
            </div>
          </div>

          {/* Detalles logísticos */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-gray-400" />
              <span className="text-gray-700">
                {reserva.fecha}
                {reserva.fecha2 && ` - ${reserva.fecha2}`}
              </span>
            </div>
            {horario && (
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-gray-400" />
                <span className="text-gray-700">{horario.label}</span>
              </div>
            )}
            {sede && (
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-gray-400" />
                <span className="text-gray-700">{sede.nombre}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Bike size={14} className="text-gray-400" />
              <span className="text-gray-700">
                {reserva.traeMoto === 'Sí' ? 'Moto propia' : 'Moto escuela'} · {reserva.tipoMoto}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CreditCard size={14} className="text-gray-400" />
              <span className="text-gray-700">Estado de pago: {reserva.estadoPago}</span>
            </div>
          </div>

          {/* Avance académico */}
          {modulos.length > 0 && (
            <div>
              <h4 className="text-sm font-black text-gray-900 mb-2 uppercase tracking-wide">
                Avance Académico
              </h4>
              <div className="space-y-1.5">
                {modulos.map((modulo, idx) => {
                  const nombreModulo = typeof modulo === 'string' ? modulo : modulo.nombre;
                  const completado = modulosEstado[nombreModulo]?.fecha;
                  return (
                    <div key={idx} className="flex items-center gap-2">
                      {completado ? (
                        <CheckCircle size={16} className="text-green-600 flex-shrink-0" />
                      ) : (
                        <Circle size={16} className="text-gray-400 flex-shrink-0" />
                      )}
                      <span className={`text-sm ${completado ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
                        {nombreModulo}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-6">
          {puedeIniciarClase && (
            <Button
              type="button"
              onClick={() => onIniciarClase(reserva)}
              variant="primary"
              className="flex-1"
            >
              Iniciar Clase
            </Button>
          )}
          <Button
            type="button"
            onClick={onClose}
            variant="outline"
            className={puedeIniciarClase ? '' : 'flex-1'}
          >
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}
