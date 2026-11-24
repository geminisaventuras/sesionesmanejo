// T-058: mensaje visible para el admin cuando el bloqueo D9 se aplica pero la
// auditoría append-only no pudo persistirse. NO altera el bloqueo: solo añade
// evidencia textual al aviso de conflicto ya mostrado.
export const MENSAJE_AUDITORIA_NO_PERSISTIDA =
  'No se pudo registrar la auditoría del intento; el bloqueo se mantiene.';

// Función pura: `success` ausente/true = auditoría ok. Cualquier otro valor
// (incluido `undefined`) no debe ocultar el mensaje de bloqueo original.
export const mensajeBloqueoConAuditoria = (mensajeBloqueo, resultadoAuditoria) => {
  const mensaje = typeof mensajeBloqueo === 'string' ? mensajeBloqueo.trim() : '';
  if (resultadoAuditoria?.success !== false) return mensaje;
  const codigo = resultadoAuditoria?.error?.code;
  const sufijo = typeof codigo === 'string' && codigo.trim() !== ''
    ? `${MENSAJE_AUDITORIA_NO_PERSISTIDA} (${codigo.trim()})`
    : MENSAJE_AUDITORIA_NO_PERSISTIDA;
  return mensaje ? `${mensaje} ${sufijo}` : sufijo;
};
