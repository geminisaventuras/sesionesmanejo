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
 * ERR-048 / D-01: clasifica las lecturas de `ocupacionTemporal` para decidir
 * si se puede renovar/completar el set de locks sin consultar `locks` (cuya
 * lectura de IDs inexistentes responde permission-denied).
 *
 * Entrada normalizada: [{ id, status:'fulfilled'|'rejected', exists, data }].
 * Fail-closed: una lectura rechazada se reporta como error, NUNCA como ajeno.
 */
export function clasificarRenovacion(resultados = [], userId, lockId, { declaraSegundoDia = false } = {}) {
  const propios = [];
  const faltantes = [];
  const ajenos = [];
  const errores = [];

  for (const resultado of resultados) {
    const id = resultado?.id;
    if (!resultado || resultado.status === 'rejected' || resultado.error) {
      errores.push(id ?? null);
      continue;
    }
    if (resultado.exists === false) {
      faltantes.push(id);
      continue;
    }
    if (!resultado.data) {
      errores.push(id ?? null);
      continue;
    }
    if (String(resultado.data.userId) === String(userId)) propios.push({ id, data: resultado.data });
    else ajenos.push(id);
  }

  const base = { propios, faltantes, ajenos, errores };

  if (errores.length > 0) {
    return {
      ...base,
      estado: 'error',
      code: 'lock-write-denied',
      message: 'No pudimos renovar el bloqueo. Revisa tu sesión o intenta de nuevo.'
    };
  }
  if (ajenos.length > 0) {
    return {
      ...base,
      estado: 'ajeno',
      code: 'lock-owner-mismatch',
      message: 'Este horario acaba de ser separado por otro usuario.'
    };
  }
  if (propios.length === 0) {
    return { ...base, estado: 'sin-propios', code: null, message: null };
  }

  const principal = propios.find(item => String(item.id) === String(lockId));
  if (!principal) {
    return {
      ...base,
      estado: 'sin-principal',
      code: 'lock-own-active',
      message: 'Ya tienes este horario separado. Continúa con el pago o espera a que expire.'
    };
  }

  // D-01/D-03: las reglas solo permiten actualizar `expiresAt`. No se puede
  // convertir un lock vivo D1-only en D1+D2; se espera a que expire (≤10 min).
  if (declaraSegundoDia && !principal.data?.fecha2) {
    return {
      ...base,
      estado: 'legacy-sin-d2',
      code: 'lock-own-active',
      message: 'Ya tienes este horario separado; espera a que expire o reselecciona.'
    };
  }

  return { ...base, estado: 'ok', code: null, message: null };
}

/**
 * D13: el mismo usuario puede reutilizar/renovar su lock vigente en vez de
 * recibirlo como conflicto. Solo aplica si el lock existente corresponde
 * exactamente al mismo slot (fecha, bloque, instructor y moto), para no
 * ampliar el alcance del lock ni debilitar la exclusión entre usuarios.
 *
 * ERR-048: una sesión de 2 días declara `fecha2`/`horaId2`. Se reconoce como
 * mismo slot si ambos declaran el mismo D2. Un lock legacy D1-only también
 * coincide en D1 para que `renovarLocksPropios` responda `lock-own-active`
 * (no se puede ampliar un doc vivo: las reglas solo permiten `expiresAt`).
 * Un doc que solo responde a D2 (fecha = fecha2) NO es el mismo slot.
 */
export function esMismoSlotLock(lock, {
  fecha,
  horaId,
  instructorId,
  motoAsignadaId,
  fecha2 = null,
  horaId2 = null
} = {}) {
  if (!lock) return false;
  const mismo = (a, b) => String(a ?? '') === String(b ?? '');
  const coincideD1 = mismo(lock.fecha, fecha)
    && mismo(lock.horaId, horaId)
    && mismo(lock.instructorId, instructorId)
    && mismo(normalizarMoto(lock.motoAsignadaId), normalizarMoto(motoAsignadaId));
  if (!coincideD1) return false;

  const declaraD2 = Boolean(fecha2) && !mismo(fecha2, fecha);
  const lockFecha2 = lock.fecha2 || null;

  if (!declaraD2) {
    // Sesión de un día: un lock de 2 días no se reutiliza para una de 1 día.
    return !lockFecha2;
  }

  if (!lockFecha2) {
    // Lock legacy de una sola jornada: mismo D1, para que la renovación
    // responda lock-own-active en vez de intentar ampliar el documento.
    return true;
  }

  if (!mismo(lockFecha2, fecha2)) return false;

  // Mismo segundo día: también debe coincidir el bloque efectivo de D2.
  const lockHora2 = lock.horaId2 || lock.horaId;
  const metaHora2 = horaId2 || horaId;
  return mismo(lockHora2, metaHora2);
}
