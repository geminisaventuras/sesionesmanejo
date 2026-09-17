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