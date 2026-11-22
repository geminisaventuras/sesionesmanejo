// @build: 2026-11-21 | id: CORRECCION-PAGO-LIMITE | desc: Validación única del tope de correcciones de referencia.

export function validarCorreccionPago(reserva, intentosMax = 3) {
  if (!reserva) return 'not-found';
  if (reserva.estadoPago !== 'Rechazado') return 'invalid-state';
  if ((Number(reserva.intentosCorreccion) || 0) >= intentosMax) return 'attempts-exhausted';
  return null;
}
