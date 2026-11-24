// @build: 2026-08-30.17-00-00 | id: LOCKS-HELPERS | backup: locksHelpers.js.backup-20260830-170000 | desc: Helpers para filtrar y eliminar locks propios
export function filtrarLocksDeOtros(activeLocks, currentUserId) {
  return (activeLocks || []).filter(lock => {
    if (!lock || !lock.userId) return false;
    return lock.userId !== currentUserId;
  });
}

export function eliminarLockLocal(activeLocks, lockId) {
  return (activeLocks || []).filter(lock => lock.id !== lockId);
}

// Expiración tolerante a Timestamp de Firestore, { seconds } y milisegundos.
// Un lock sin expiración legible se considera vencido (no retiene cupo).
function milisegundosExpira(lock) {
  const valor = lock?.expiresAt;
  if (!valor) return 0;
  if (typeof valor.toMillis === 'function') {
    try { return valor.toMillis(); } catch (e) { return 0; }
  }
  if (typeof valor.seconds === 'number') {
    return valor.seconds * 1000 + Math.floor((Number(valor.nanoseconds) || 0) / 1e6);
  }
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : 0;
}

/**
 * ¿El lock sigue vigente? Se usa para mostrar "Retenido" en la matriz admin
 * y para descartar locks vencidos en los listeners de rango.
 */
export function lockVigente(lock, nowMs = Date.now()) {
  if (!lock) return false;
  return milisegundosExpira(lock) > nowMs;
}

/**
 * B-LOCK-PERMISSION-DENIED-GENERICO: distingue un lock propio vigente de uno
 * ajeno. Un lock vencido no es conflicto: las reglas permiten tomarlo.
 */
export function clasificarConflictoLock(lock, userId, nowMs = Date.now()) {
  if (!lock) return null;
  if (!lockVigente(lock, nowMs)) return null;
  return String(lock.userId) === String(userId) ? 'lock-own-active' : 'lock-owner-mismatch';
}

function normalizarMoto(valor) {
  if (valor === null || valor === undefined) return '';
  const texto = String(valor).trim();
  if (!texto || texto.toLowerCase() === 'sinmoto') return '';
  return texto;
}

/**
 * D13: el mismo usuario puede reutilizar/renovar su lock vigente en vez de
 * recibirlo como conflicto. Solo aplica si el lock existente corresponde
 * exactamente al mismo slot (fecha, bloque, instructor y moto), para no
 * ampliar el alcance del lock ni debilitar la exclusión entre usuarios.
 */
export function esMismoSlotLock(lock, { fecha, horaId, instructorId, motoAsignadaId } = {}) {
  if (!lock) return false;
  const mismo = (a, b) => String(a ?? '') === String(b ?? '');
  return mismo(lock.fecha, fecha)
    && mismo(lock.horaId, horaId)
    && mismo(lock.instructorId, instructorId)
    && mismo(normalizarMoto(lock.motoAsignadaId), normalizarMoto(motoAsignadaId));
}
