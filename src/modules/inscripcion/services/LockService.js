import { doc, setDoc, query, collection, where, Timestamp, deleteDoc, getDoc, getDocs, onSnapshot, writeBatch } from 'firebase/firestore';
import { db } from '../../shared/firebase/firebase';
import { construirLockIds } from '../utils/solapamientoHelpers';
import { clasificarConflictoLock } from '../utils/locksHelpers';

const MAX_LIMPIEZA = 10;
const LOCK_DURATION_MS = 10 * 60 * 1000;
const CLOCK_SKEW_MARGIN_MS = 10 * 1000;

export const LockService = {
  async crearLock(lockId, userId, metadata = {}) {
    if (!lockId || !userId)
      return { success: false, error: { code: 'missing-fields', message: 'Faltan datos del lock' } };

    if (!metadata.fecha || !metadata.horaId) {
      return { success: false, error: { code: 'missing-fields', message: 'Faltan datos del recurso a bloquear' } };
    }

    const batch = writeBatch(db);
    const expiresAt = Timestamp.fromMillis(Date.now() + LOCK_DURATION_MS - CLOCK_SKEW_MARGIN_MS);
    const datosLock = {
      esquema: 'recursos-v1',
      expiresAt,
      userId,
      fecha: metadata.fecha,
      horaId: metadata.horaId,
      instructorId: metadata.instructorId || null,
      motoAsignadaId: metadata.motoAsignadaId || null
    };
    const lockIds = construirLockIds({ lockId, ...metadata });

    // B-LOCK-PERMISSION-DENIED-GENERICO: leer solo los locks que el usuario
    // puede ver (propios/admin). Si el conflicto es suyo, mensaje específico;
    // si es ajeno, las reglas no dejan leerlo y el batch devolverá el genérico.
    const lecturas = await Promise.allSettled(lockIds.map(id => getDoc(doc(db, 'locks', id))));
    for (const lectura of lecturas) {
      if (lectura.status !== 'fulfilled' || !lectura.value.exists()) continue;
      const conflicto = clasificarConflictoLock(lectura.value.data(), userId);
      if (conflicto === 'lock-own-active') {
        return { success: false, error: { code: 'lock-own-active', message: 'Ya tienes este horario separado. Continúa con el pago o espera a que expire.' } };
      }
      if (conflicto === 'lock-owner-mismatch') {
        return { success: false, error: { code: 'lock-owner-mismatch', message: 'Este horario acaba de ser separado por otro usuario.' } };
      }
    }

    // Batch atómico: si cualquiera de los IDs por recurso ya existe (mismo
    // instructor o misma moto en el mismo bloque), Firestore rechaza el lote
    // completo y no queda un lock parcial.
    for (const id of lockIds) {
      batch.set(doc(db, 'locks', id), datosLock);
      batch.set(doc(db, 'ocupacionTemporal', id), datosLock);
    }

    try {
      await batch.commit();
      return { success: true, data: { lockId, lockIds } };
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
      // sobre IDs legacy que nunca llegaron a crearse.
      const snapshots = await Promise.all(
        lockIds.map(id => getDoc(doc(db, 'locks', id)))
      );
      const existentes = lockIds.filter((_, index) => snapshots[index].exists());
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

  async limpiarLocksExpirados(fecha, userId) {
    if (!userId)
      return { success: false, error: { code: 'missing-fields', message: 'Falta el userId para limpiar locks' } };
    try {
      const locksRef = collection(db, 'locks');
      const q = query(
        locksRef,
        where('userId', '==', userId),
        where('fecha', '==', fecha),
        where('expiresAt', '<=', Timestamp.now())
      );
      const snapshot = await getDocs(q);
      const expirados = snapshot.docs.slice(0, MAX_LIMPIEZA);
      const batchPromises = [];
      expirados.forEach(d => {
        const batch = writeBatch(db);
        batch.delete(doc(db, 'ocupacionTemporal', d.id));
        batch.delete(d.ref);
        batchPromises.push(batch.commit().catch(() => {}));
      });
      await Promise.all(batchPromises);
      return { success: true, data: { eliminados: expirados.length } };
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