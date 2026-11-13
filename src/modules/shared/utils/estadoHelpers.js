// @build: 2026-11-13 | id: ESTADO-HELPERS | desc: Logica centralizada de estados (SSOT) dictaminada por FIRE
// Precedencia estricta: cancelado > pendiente_pago > ausente > tiempo_pendiente > completado > en_curso > asignada

export const getEstadoLogico = (reserva) => {
  if (!reserva) return 'desconocido';
  
  // 1. Terminal negativo
  if (reserva.estadoPago === 'Cancelado' || reserva.estadoPago === 'Rechazado') {
    return 'cancelado';
  }
  
  // 2. Bloquea todo
  if (reserva.estadoPago === 'Pendiente') {
    return 'pendiente_pago';
  }
  
  // 3. Requiere accion inmediata
  if (reserva.estadoCurso === 'Ausente') {
    return 'ausente';
  }
  
  // 4. Deuda activa
  if (Number(reserva.horasPendientes) > 0) {
    return 'tiempo_pendiente';
  }
  
  // 5. Terminal positivo
  const completado = reserva.estadoCurso === 'Aprobado' || 
                     reserva.estadoCurso === 'Completado' || 
                     (reserva.estadoPago === 'Aprobado' && !reserva.estadoCurso);
  if (completado) {
    return 'completado';
  }
  
  // 6. Activo (consumiendo tiempo o modulos)
  const tieneActividad = (Number(reserva.tiempoEfectivo) || 0) > 0 || 
                         reserva.moduloEnProgreso || 
                         (reserva.modulosEstado && Object.keys(reserva.modulosEstado).length > 0);
  if (tieneActividad) {
    return 'en_curso';
  }
  
  // 7. Pasivo (solo asignado)
  if (reserva.estadoPago === 'Aprobado') {
    return 'asignada';
  }
  
  return 'desconocido';
};
