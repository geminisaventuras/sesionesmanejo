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

/**
 * B-LOCK-PERMISSION-DENIED-GENERICO: distingue un lock propio vigente de uno
 * ajeno. Un lock vencido no es conflicto: las reglas permiten tomarlo.
 */
export function clasificarConflictoLock(lock, userId, nowMs = Date.now()) {
  if (!lock) return null;
  const millis = typeof lock.expiresAt?.toMillis === 'function'
    ? lock.expiresAt.toMillis()
    : Number(lock.expiresAt?.seconds ? lock.expiresAt.seconds * 1000 : lock.expiresAt) || 0;
  if (millis <= nowMs) return null;
  return String(lock.userId) === String(userId) ? 'lock-own-active' : 'lock-owner-mismatch';
}