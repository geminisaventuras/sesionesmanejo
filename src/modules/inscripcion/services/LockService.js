import { doc, setDoc, query, collection, where, orderBy, limit, Timestamp, deleteDoc, getDoc, getDocs, onSnapshot, writeBatch } from 'firebase/firestore';
import { db } from '../../shared/firebase/firebase';
import { construirLockIds, construirLocksPorSlot } from '../utils/solapamientoHelpers';
import { clasificarConflictoLock, clasificarRenovacion, esMismoSlotLock } from '../utils/locksHelpers';

const MAX_LIMPIEZA = 10;
const LOCK_DURATION_MS = 10 * 60 * 1000;
const CLOCK_SKEW_MARGIN_MS = 10 * 1000;

/**
 * Clasifica la ocupación temporal (legible para cualquier autenticado) para un
 * conjunto de IDs de lock. Solo considera locks vigentes. Se usa cuando las
 * reglas rechazan la escritura para distinguir un ocupante real de un error de
 * sesión/reglas (B-LOCK-PERMISSION-DENIED-GENERICO).
 */
async function clasificarOcupacionTemporal(lockIds, userId) {
  const lecturas = await Promise.allSettled(
    (lockIds || []).map(id => getDoc(doc(db, 'ocupacionTemporal', id)))
  );
  for (let index = 0; index < lecturas.length; index += 1) {
    const lectura = lecturas[index];
    if (lectura.status !== 'fulfilled' || !lectura.value.exists()) continue;
    const lock = lectura.value.data();
    const conflicto = clasificarConflictoLock(lock, userId);
    if (conflicto) return { conflicto, lock: { ...lock, id: (lockIds || [])[index] } };
  }
  return null;
}

export const LockService = {
  async crearLock(lockId, userId, metadata = {}) {
    if (!lockId || !userId)
      return { success: false, error: { code: 'missing-fields', message: 'Faltan datos del lock' } };

    if (!metadata.fecha || !metadata.horaId) {
      return { success: false, error: { code: 'missing-fields', message: 'Faltan datos del recurso a bloquear' } };
    }

    const docsPorSlot = construirLocksPorSlot({ lockId, ...metadata });
    const lockIds = docsPorSlot.map(item => item.id);
    const fecha2 = metadata.fecha2 && String(metadata.fecha2) !== String(metadata.fecha)
      ? metadata.fecha2
      : null;

    // Fail-closed: si se declara una sesión de 2 días, el lock debe retener D2.
    if (fecha2 && !docsPorSlot.some(item => String(item.fecha) === String(fecha2))) {
      return { success: false, error: { code: 'missing-fields', message: 'El bloqueo no cubre el segundo día de la sesión' } };
    }

    const batch = writeBatch(db);
    const expiresAt = Timestamp.fromMillis(Date.now() + LOCK_DURATION_MS - CLOCK_SKEW_MARGIN_MS);
    const datosBase = {
      esquema: 'recursos-v1',
      expiresAt,
      userId,
      instructorId: metadata.instructorId || null,
      motoAsignadaId: metadata.motoAsignadaId || null
    };
    const payloadPorSlot = (slot) => {
      const datos = { ...datosBase, fecha: slot.fecha, horaId: slot.horaId };
      // Solo el documento principal de D1 declara la segunda jornada. Los
      // documentos de D2 llevan su propia fecha/hora para que los lectores
      // que filtran por `fecha` (ocupacionTemporal, espejo, admin) los vean.
      if (slot.esPrincipal && fecha2 && String(slot.fecha) === String(metadata.fecha)) {
        datos.fecha2 = fecha2;
        datos.horaId2 = metadata.horaId2 || metadata.horaId;
      }
      return datos;
    };

    // D13/ERR-048: un doc propio del MISMO set (principal de D2 o ID por
    // recurso) también es reutilizable. Se compara contra SU fecha/hora para
    // no confundirlo con otra sesión o con otro día.
    const esDocDeLaSesion = (lockExistente, idExistente) => {
      if (esMismoSlotLock(lockExistente, metadata)) return true;
      const esperado = docsPorSlot.find(item => item.id === idExistente);
      if (!esperado || esperado.id === lockId) return false;
      return esMismoSlotLock(lockExistente, {
        fecha: esperado.fecha,
        horaId: esperado.horaId,
        instructorId: metadata.instructorId,
        motoAsignadaId: metadata.motoAsignadaId
      });
    };

    // B-LOCK-PERMISSION-DENIED-GENERICO: leer solo los locks que el usuario
    // puede ver (propios/admin). Si el conflicto es suyo, mensaje específico;
    // si es ajeno, las reglas no dejan leerlo y el batch devolverá el genérico.
    const lecturas = await Promise.allSettled(lockIds.map(id => getDoc(doc(db, 'locks', id))));
    let propioMismoSlot = false;
    for (const lectura of lecturas) {
      if (lectura.status !== 'fulfilled' || !lectura.value.exists()) continue;
      const lockExistente = lectura.value.data();
      const conflicto = clasificarConflictoLock(lockExistente, userId);
      if (!conflicto) continue;
      if (conflicto === 'lock-own-active') {
        // D13: mismo usuario + mismo slot = reintento/doble submit o lock
        // vigente aún válido. Se renueva en vez de bloquearlo como ajeno.
        if (esDocDeLaSesion(lockExistente, lectura.value.id)) {
          propioMismoSlot = true;
          continue;
        }
        return { success: false, error: { code: 'lock-own-active', message: 'Ya tienes este horario separado. Continúa con el pago o espera a que expire.' } };
      }
      return { success: false, error: { code: 'lock-owner-mismatch', message: 'Este horario acaba de ser separado por otro usuario.' } };
    }

    if (propioMismoSlot) {
      const reutilizado = await this.renovarLocksPropios(lockIds, userId, lockId, metadata);
      if (reutilizado) return reutilizado;
    }

    // Batch atómico: si cualquiera de los IDs por recurso ya existe (mismo
    // instructor o misma moto en el mismo bloque), Firestore rechaza el lote
    // completo y no queda un lock parcial. Cada slot (D1/D2) lleva su payload.
    for (const slot of docsPorSlot) {
      const datosSlot = payloadPorSlot(slot);
      batch.set(doc(db, 'locks', slot.id), datosSlot);
      batch.set(doc(db, 'ocupacionTemporal', slot.id), datosSlot);
    }

    try {
      await batch.commit();
      return { success: true, data: { lockId, lockIds } };
    } catch (error) {
      if (error.code === 'permission-denied') {
        // Las reglas solo permiten leer `locks` al dueño/admin: un lock ajeno
        // vivo no se puede distinguir por `locks.getDoc`. `ocupacionTemporal`
        // sí es legible por cualquier autenticado, así que se usa como fuente
        // para no mostrar "ocupado por otro usuario" cuando ya se liberó
        // (B-LOCK-PERMISSION-DENIED-GENERICO / ERR-010).
        const clasificacion = await clasificarOcupacionTemporal(lockIds, userId);
        if (clasificacion?.conflicto === 'lock-owner-mismatch') {
          return { success: false, error: { code: 'lock-owner-mismatch', message: 'Este horario acaba de ser separado por otro usuario.' } };
        }
        if (clasificacion?.conflicto === 'lock-own-active') {
          // D13: si el lock vigente es del mismo usuario y el mismo slot
          // (p. ej. doble submit en paralelo), se renueva y se reporta éxito.
          if (esDocDeLaSesion(clasificacion.lock, clasificacion.lock.id)) {
            const reutilizado = await this.renovarLocksPropios(lockIds, userId, lockId, metadata);
            if (reutilizado) return reutilizado;
          }
          return { success: false, error: { code: 'lock-own-active', message: 'Ya tienes este horario separado. Continúa con el pago o espera a que expire.' } };
        }
        return {
          success: false,
          error: { code: 'lock-write-denied', message: 'No pudimos separar el horario. Revisa tu sesión o intenta de nuevo.' }
        };
      }
      return { success: false, error: { code: error.code, message: error.message } };
    }
  },

  /**
   * D13: renueva el lock vigente del propio usuario. Devuelve null si ya no
   * hay locks propios que renovar (el flujo puede intentar la creación normal).
   *
   * ERR-048 / D-01/D-02/D-03:
   *  - Clasifica con `ocupacionTemporal` (legible por autenticados), no con
   *    `locks` (leer IDs inexistentes allí responde permission-denied).
   *  - Renueva SOLO `expiresAt` en los documentos existentes.
   *  - Crea los IDs faltantes con payload completo.
   *  - No convierte un lock vivo D1-only en D1+D2: las reglas solo permiten
   *    actualizar `expiresAt`. En ese caso devuelve `lock-own-active`.
   */
  async renovarLocksPropios(lockIds, userId, lockId, metadata = {}) {
    const expiresAt = Timestamp.fromMillis(Date.now() + LOCK_DURATION_MS - CLOCK_SKEW_MARGIN_MS);
    const declarados = metadata?.fecha
      ? construirLocksPorSlot({ lockId, ...metadata })
      : null;
    const declaraSegundoDia = Boolean(metadata.fecha2)
      && String(metadata.fecha2) !== String(metadata.fecha);

    // Fail-closed: si se declara D2 pero no se puede derivar (p. ej. sin
    // instructor), no hay set completo que renovar.
    if (declarados && declaraSegundoDia
      && !declarados.some(item => String(item.fecha) === String(metadata.fecha2))) {
      return { success: false, error: { code: 'lock-invalid', message: 'El bloqueo no cubre los dos días de la sesión.' } };
    }

    const objetivos = declarados || [...new Set(lockIds || [])].map(id => ({
      id,
      fecha: null,
      horaId: null,
      esPrincipal: String(id) === String(lockId)
    }));

    const lecturas = await Promise.allSettled(
      objetivos.map(item => getDoc(doc(db, 'ocupacionTemporal', item.id)))
    );
    const resultados = lecturas.map((lectura, index) => {
      const id = objetivos[index].id;
      if (lectura.status !== 'fulfilled') {
        return { id, status: 'rejected', error: lectura.reason };
      }
      const existe = lectura.value.exists();
      return {
        id,
        status: 'fulfilled',
        exists: existe,
        data: existe ? lectura.value.data() : null
      };
    });

    const clasificacion = clasificarRenovacion(resultados, userId, lockId, { declaraSegundoDia });
    // Sin locks propios: el flujo puede intentar la creación normal.
    if (clasificacion.estado === 'sin-propios') return null;
    if (clasificacion.code) {
      return { success: false, error: { code: clasificacion.code, message: clasificacion.message } };
    }

    try {
      const batch = writeBatch(db);
      for (const item of objetivos) {
        const existente = clasificacion.propios.find(propio => String(propio.id) === String(item.id));
        if (existente) {
          // D-03: las reglas solo permiten actualizar `expiresAt`.
          batch.set(doc(db, 'locks', item.id), { expiresAt }, { merge: true });
          batch.set(doc(db, 'ocupacionTemporal', item.id), { expiresAt }, { merge: true });
          continue;
        }
        // Sin metadata no se puede reconstruir el payload de un faltante.
        if (!declarados) continue;
        const payload = {
          esquema: 'recursos-v1',
          expiresAt,
          userId,
          instructorId: metadata.instructorId || null,
          motoAsignadaId: metadata.motoAsignadaId || null,
          fecha: item.fecha,
          horaId: item.horaId
        };
        batch.set(doc(db, 'locks', item.id), payload);
        batch.set(doc(db, 'ocupacionTemporal', item.id), payload);
      }
      await batch.commit();
      return { success: true, data: { lockId, lockIds: objetivos.map(item => item.id), renovado: true } };
    } catch (error) {
      return { success: false, error: { code: error.code, message: error.message } };
    }
  },

  async renovarLock(lockId) {
    if (!lockId)
      return { success: false, error: { code: 'missing-fields', message: 'Falta el ID del lock' } };

    try {
      const lockSnap = await getDoc(doc(db, 'locks', lockId));
      if (!lockSnap.exists()) {
        return { success: false, error: { code: 'lock-not-found', message: 'El bloqueo ya no existe' } };
      }

      const lockData = lockSnap.data();
      const lockIds = construirLockIds({ lockId, ...lockData });
      const expiresAt = Timestamp.fromMillis(Date.now() + LOCK_DURATION_MS - CLOCK_SKEW_MARGIN_MS);
      const snapshots = await Promise.all(
        lockIds.map(id => getDoc(doc(db, 'locks', id)))
      );

      const batch = writeBatch(db);
      lockIds.forEach((id, index) => {
        if (snapshots[index].exists()) {
          batch.update(doc(db, 'locks', id), { expiresAt });
          batch.update(doc(db, 'ocupacionTemporal', id), { expiresAt });
        }
      });
      await batch.commit();
      return { success: true, data: { lockId, lockIds } };
    } catch (error) {
      return { success: false, error: { code: error.code, message: error.message } };
    }
  },


  async liberarLock(lockId) {
    if (!lockId)
      return { success: false, error: { code: 'missing-fields', message: 'Falta el ID del lock' } };

    try {
      // El lock principal contiene fecha/hora/instructor/moto. A partir de
      // esos datos reconstruimos los IDs por recurso para liberar el lote
      // completo, incluso si la UI solo conoce el ID principal.
      let lockIds = [lockId];
      try {
        const lockSnap = await getDoc(doc(db, 'locks', lockId));
        if (lockSnap.exists()) {
          lockIds = construirLockIds({ lockId, ...lockSnap.data() });
        }
      } catch (readError) {
        // Si el lock ya no existe/no se puede leer, al menos intentamos
        // borrar el ID que conoce la UI.
        console.warn('[LockService] No se pudo leer lock para liberar lote:', readError?.code);
      }

      // Borrar solo documentos existentes evita evaluar reglas de delete
      // sobre IDs legacy que nunca llegaron a crearse. allSettled: un ID por
      // recurso ilegible (p. ej. de otro usuario) no debe impedir liberar el
      // lock principal propio.
      const snapshots = await Promise.allSettled(
        lockIds.map(id => getDoc(doc(db, 'locks', id)))
      );
      const existentes = lockIds.filter((_, index) =>
        snapshots[index].status === 'fulfilled' && snapshots[index].value.exists()
      );
      if (existentes.length === 0) {
        return { success: true, data: { lockIds: [] } };
      }
      const batch = writeBatch(db);
      for (const id of existentes) {
        batch.delete(doc(db, 'ocupacionTemporal', id));
        batch.delete(doc(db, 'locks', id));
      }
      await batch.commit();
      return { success: true, data: { lockIds: existentes } };
    } catch (error) {
      return { success: false, error: { code: error.code, message: error.message } };
    }
  },

    /**
   * Valida estructura de un lock
   * @param {Object} lock - Datos del lock
   * @returns {Object} { valido: boolean, razon?: string }
   */
  validarLock(lock) {
    if (!lock) return { valido: false, razon: 'lock_nulo' };
    if (!lock.userId) return { valido: false, razon: 'sin_userId' };
    if (!lock.fecha) return { valido: false, razon: 'sin_fecha' };
    if (!lock.horaId) return { valido: false, razon: 'sin_horaId' };
    if (!lock.instructorId) return { valido: false, razon: 'sin_instructorId' };
    if (!lock.expiresAt) return { valido: false, razon: 'sin_expiresAt' };
    
    const ahora = Date.now();
    if (lock.expiresAt.toMillis() <= ahora) {
      return { valido: false, razon: 'expirado' };
    }
    
    // Verificar moto si aplica (el campo necesitaMoto no está en locks actualmente;
    // se valida si motoAsignadaId es null y no se puede determinar, se omite)
    // Para evitar falsos positivos, no validamos moto aquí a menos que sea obligatoria.
    
    return { valido: true };
  },

  /**
   * Verifica que un lock siga vigente y pertenezca al usuario/contexto actual.
   * Se usa al restaurar Paso 3 después de una recarga para no mantener en
   * pantalla un bloqueo vencido o de otro usuario.
   */
  async validarLockVigente(lockId, { userId, fecha, horaId } = {}) {
    if (!lockId || !userId) {
      return { success: false, error: { code: 'missing-fields', message: 'Faltan datos para validar el lock' } };
    }

    try {
      const snap = await getDoc(doc(db, 'locks', lockId));
      if (!snap.exists()) {
        return { success: false, error: { code: 'lock-not-found', message: 'El bloqueo ya no existe' } };
      }

      const lock = snap.data();
      const estructura = this.validarLock(lock);
      if (!estructura.valido) {
        return { success: false, error: { code: estructura.razon, message: 'El bloqueo expiró o no es válido' } };
      }
      if (lock.userId !== userId) {
        return { success: false, error: { code: 'lock-owner-mismatch', message: 'El bloqueo pertenece a otro usuario' } };
      }
      if (fecha && String(lock.fecha) !== String(fecha)) {
        return { success: false, error: { code: 'lock-date-mismatch', message: 'El bloqueo no coincide con la fecha seleccionada' } };
      }
      if (horaId && String(lock.horaId) !== String(horaId)) {
        return { success: false, error: { code: 'lock-slot-mismatch', message: 'El bloqueo no coincide con el horario seleccionado' } };
      }

      return { success: true, data: lock };
    } catch (error) {
      return { success: false, error: { code: error.code, message: error.message } };
    }
  },

  /**
   * Purga locks corruptos para una fecha específica
   * @param {string} fecha - Fecha a purgar (YYYY-MM-DD)
   * @returns {Promise<{success: boolean, purgados: number}>}
   */
     async purgarLocksCorruptos(fecha) {
    try {
      const locksSnapshot = await getDocs(
        query(collection(db, 'locks'), where('fecha', '==', fecha))
      );
      const ocupacionSnapshot = await getDocs(
        query(collection(db, 'ocupacionTemporal'), where('fecha', '==', fecha))
      );

      const corruptos = [];

      locksSnapshot.docs.forEach(docSnap => {
        const lock = docSnap.data();
        const validacion = this.validarLock(lock);
        if (!validacion.valido) {
          corruptos.push({ id: docSnap.id, razon: validacion.razon });
        }
      });

      const locksIds = new Set(locksSnapshot.docs.map(d => d.id));
      ocupacionSnapshot.docs.forEach(docSnap => {
        if (locksIds.has(docSnap.id)) return;
        const temp = docSnap.data();
        const validacion = this.validarLock(temp);
        if (!validacion.valido) {
          corruptos.push({ id: docSnap.id, razon: validacion.razon });
        }
      });

      if (corruptos.length === 0) {
        return { success: true, purgados: 0 };
      }

      const resultados = await Promise.allSettled(
        corruptos.map(async (lock) => {
          try {
            await deleteDoc(doc(db, 'locks', lock.id));
            await deleteDoc(doc(db, 'ocupacionTemporal', lock.id));
            return { id: lock.id, eliminado: true, razon: lock.razon };
          } catch (error) {
            console.warn(`[LockService] No se pudo purgar ${lock.id} (${lock.razon}):`, error.message);
            return { id: lock.id, eliminado: false, razon: lock.razon, error: error.message };
          }
        })
      );

      const purgados = resultados.filter(r => r.status === 'fulfilled' && r.value.eliminado).length;
      const fallidos = resultados.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.eliminado)).length;

      console.log(`[LockService] Purga completada para ${fecha}: ${purgados} eliminados, ${fallidos} fallidos`);

      return { success: true, purgados, fallidos };
    } catch (error) {
      console.error('[LockService] Error purgando locks:', error);
      return { success: false, purgados: 0, error };
    }
  },

  /**
   * D7: limpia los locks vencidos de cualquier usuario (máximo MAX_LIMPIEZA
   * por pasada). No filtra por userId ni por fecha: un lock con
   * `expiresAt <= now` ya no excluye a nadie y solo ensucia `locks` y
   * `ocupacionTemporal`. Requiere sesión admin para poder consultar y borrar
   * locks ajenos (ver firestore.rules).
   */
  async limpiarLocksExpirados() {
    try {
      const q = query(
        collection(db, 'locks'),
        where('expiresAt', '<=', Timestamp.now()),
        orderBy('expiresAt'),
        limit(MAX_LIMPIEZA)
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        return { success: true, data: { eliminados: 0, ids: [] } };
      }

      // Un solo batch: locks/* y su espejo ocupacionTemporal/* se purgan juntos.
      const batch = writeBatch(db);
      snapshot.docs.forEach(d => {
        batch.delete(doc(db, 'ocupacionTemporal', d.id));
        batch.delete(d.ref);
      });
      await batch.commit();
      return { success: true, data: { eliminados: snapshot.docs.length, ids: snapshot.docs.map(d => d.id) } };
    } catch (error) {
      return { success: false, error: { code: error.code, message: error.message } };
    }
  },

  escucharOcupacionTemporal(fecha, callback) {
    const fechas = (Array.isArray(fecha) ? fecha : [fecha]).filter(Boolean);
    if (fechas.length === 0) return () => {};
    const unicas = [...new Set(fechas)];
    const ocupacionRef = collection(db, 'ocupacionTemporal');
    // Un curso de 2 días necesita ver locks de D1 y D2 en la misma foto.
    const q = unicas.length === 1
      ? query(ocupacionRef, where('fecha', '==', unicas[0]))
      : query(ocupacionRef, where('fecha', 'in', unicas));

    const unsub = onSnapshot(q, (snap) => {
      const ahora = Date.now();
      const locks = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(lock => lock.expiresAt && lock.expiresAt.toMillis() > ahora);
        console.log('[LockService] Locks recibidos:', locks.length, 'Primeros locks:', locks.slice(0, 2).map(l => l.id));
      callback(locks);
    }, (error) => {
      console.warn('[LockService] Error en listener de ocupación temporal:', error);
    });

    return () => unsub();
  },
};
