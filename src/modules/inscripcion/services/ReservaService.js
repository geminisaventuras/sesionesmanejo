// Archivo: src/modules/inscripcion/services/ReservaService.js
// @build: 2026-11-21.14-10-52 | id: PACK-CHILD-C-DETERMINISTIC | backup: backup/packchild-c-20261121-141052/src/modules/inscripcion/services/ReservaService.js | desc: IDs deterministas de child pack_sub y verificación de existencia para unicidad estructural.

import { db, auth } from '../../shared/firebase/firebase';
import { collection, doc, runTransaction, updateDoc, getDocs, getDoc, setDoc, deleteDoc, Timestamp, serverTimestamp, query, where, writeBatch, increment, arrayUnion } from 'firebase/firestore';
import { validarInscripcionCompleta } from '../../shared/schemas/validations';
import { cumplePrerequisito } from '../../../constants/cursoSecuencia';
import { LockService } from './LockService';
import { construirSlotsObjetivo, construirLockIds, detectarLocksActivos, detectarSolapamiento } from '../utils/solapamientoHelpers';
import { consultarLocksTemporalesPorFechas, consultarOcupacionPorFechas } from './ocupacionRepository';

const appId = 'motoescuela-pro-v1';

const CAMPOS_OBLIGATORIOS = ['userId', 'cedula', 'fecha', 'horaId', 'cursoId'];

// ⚠️ NO DESACTIVAR EN PROD: previene solapamiento de reservas (BUG-2).
// Kill-switch de build: si se desactiva, el cross-check se omite (solo para rollback operativo).
const SOLAPAMIENTO_CROSSCHECK_ENABLED = true;

/**
 * Cross-check de ocupacion antes de crear una reserva (BUG-2).
 * Se ejecuta fuera de runTransaction porque el SDK cliente no permite queries
 * dentro de transacciones. Politica fail-closed total (dictamen MAMBA 19/11/2026):
 *  - error de red/permisos o truncamiento => no se crea la reserva.
 *  - conflicto => se libera el lock y se retorna slot-occupied.
 */
async function validarDisponibilidadAntesDeCrear({
  fecha,
  fecha2 = null,
  horaId,
  instructorId = null,
  motoAsignadaId = null,
  userId = null,
  lockId = null,
  contexto = 'reserva'
}) {
  if (!SOLAPAMIENTO_CROSSCHECK_ENABLED) {
    console.error('[SOLAPAMIENTO] Kill-switch desactivado; cross-check omitido.', { contexto });
    return { ok: true };
  }

  const slots = construirSlotsObjetivo({ fecha, fecha2, horaId });
  if (slots.length === 0 || !instructorId) return { ok: true };

  const fechas = [...new Set(slots.map(s => s.fecha))];
  const traceId = `SOL-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  try {
    const [ocupacion, locks] = await Promise.all([
      consultarOcupacionPorFechas(fechas),
      consultarLocksTemporalesPorFechas(fechas)
    ]);

    if (ocupacion.truncado || locks.truncado) {
      console.error('[SOLAPAMIENTO] Consulta truncada; fail-closed.', { traceId, contexto, fechas });
      return {
        ok: false,
        error: {
          code: 'ocupacion-no-verificable',
          message: 'No pudimos verificar la disponibilidad. Intenta de nuevo en unos segundos.',
          traceId
        }
      };
    }

    const conflictoReserva = detectarSolapamiento({
      reservasConfirmadas: ocupacion.reservas,
      slotsObjetivo: slots,
      instructorId,
      motoAsignadaId
    });
    const conflictoLock = detectarLocksActivos({
      locksTemporales: locks.locks,
      slotsObjetivo: slots,
      instructorId,
      motoAsignadaId,
      currentUserId: userId
    });

    if (conflictoReserva.haySolapamiento || conflictoLock.hayConflicto) {
      const conflictos = [...conflictoReserva.conflictos, ...conflictoLock.conflictos];
      console.warn('[SOLAPAMIENTO] Conflicto detectado', { traceId, contexto, conflictos });

      if (lockId) {
        await LockService.liberarLock(lockId).catch(err => {
          console.warn('[SOLAPAMIENTO] No se pudo liberar el lock', {
            traceId,
            lockId,
            error: err?.message
          });
        });
      }

      return {
        ok: false,
        error: {
          code: 'slot-occupied',
          message: 'Ese horario acaba de ser ocupado por otra reserva. Elige otro bloque.',
          traceId
        }
      };
    }

    return { ok: true };
  } catch (error) {
    console.error('[SOLAPAMIENTO] Error de verificación; fail-closed.', {
      traceId,
      contexto,
      code: error?.code,
      message: error?.message
    });
    return {
      ok: false,
      error: {
        code: 'ocupacion-no-verificable',
        message: 'No pudimos verificar la disponibilidad. Revisa tu conexión e intenta de nuevo.',
        traceId
      }
    };
  }
}

export const ReservaService = {
  // -------------------------------------------------
  // PROGRESO DE INSCRIPCIÓN
  // -------------------------------------------------
  _correoKey(correo) {
    return correo.replace(/[@.]/g, '_');
  },

   async guardarProgreso(userId, paso, datosFormulario, correo) {
    if (!correo) return { success: false, error: { code: 'missing-email' } };
    const correoKey = this._correoKey(correo);
    const ref = doc(db, 'artifacts', appId, 'public', 'data', 'progresoInscripcion', correoKey);
    try {
      const snapExistente = await getDoc(ref);
      const existente = snapExistente.exists() ? snapExistente.data() : {};

      // A6: log de adopción cuando el userId cambia (doc huérfano adoptado)
      if (snapExistente.exists() && existente.userId && existente.userId !== userId) {
        console.warn('[ReservaService] Adopción de progreso huérfano:', {
          correo,
          userIdAnterior: existente.userId,
          userIdNuevo: userId,
          pinAnterior: existente.pin || '(vacío)'
        });
      }

      const pinExistente = existente.pin || '';
      const pinNuevo = datosFormulario.pin;
      let pinFinal = pinExistente;
      if (pinNuevo && String(pinNuevo).trim() !== '') {
        pinFinal = String(pinNuevo).trim();
      }

      const datosActualizados = {
        userId,
        correo,
        pin: pinFinal,
        paso: Number(paso),
        datosFormulario: {
          ...(existente.datosFormulario || {}),
          ...datosFormulario,
          pin: pinFinal
        },
        updatedAt: Timestamp.now(),
        createdAt: existente.createdAt || Timestamp.now()
      };

      await setDoc(ref, datosActualizados, { merge: true });
      return { success: true };
    } catch (error) {
      return { success: false, error: { code: error.code, message: error.message } };
    }
  },

  async buscarProgresoPorCorreo(correo) {
    if (!correo) return { success: false, error: { code: 'missing-email' } };
    const correoKey = this._correoKey(correo);
    const ref = doc(db, 'artifacts', appId, 'public', 'data', 'progresoInscripcion', correoKey);
    try {
      const snap = await getDoc(ref);
      if (snap.exists()) {
        return { success: true, data: snap.data() };
      }
      return { success: true, data: null };
    } catch (error) {
      return { success: false, error: { code: error.code, message: error.message } };
    }
  },

  async limpiarProgreso(correo) {
    if (!correo) return { success: false, error: { code: 'missing-email' } };
    const correoKey = this._correoKey(correo);
    const ref = doc(db, 'artifacts', appId, 'public', 'data', 'progresoInscripcion', correoKey);
    try {
      await deleteDoc(ref);
      return { success: true };
    } catch (error) {
      return { success: false, error: { code: error.code, message: error.message } };
    }
  },

  // -------------------------------------------------
  // RESERVAS (existente sin cambios)
  // -------------------------------------------------
  async crearReserva(reservaData, lockId) {
    if (!reservaData || !lockId)
      return { success: false, error: { code: 'missing-fields', message: 'Faltan datos de la reserva o lockId' } };

     for (const campo of CAMPOS_OBLIGATORIOS)
      if (reservaData[campo] === undefined || reservaData[campo] === null)
        return { success: false, error: { code: 'missing-field', message: `Campo obligatorio faltante: ${campo}` } };

    // FIX-034: Freno tactico de identidad
    const usuarioActual = auth.currentUser;
    if (usuarioActual && reservaData.correo && reservaData.correo.toLowerCase() !== usuarioActual.email.toLowerCase()) {
      return { success: false, error: { code: 'identity-mismatch', message: 'El correo no coincide con tu sesión. Cierra sesión e intenta de nuevo.' } };
    }

        const { esRecompra: _uiFlag, ...reservaLimpia } = reservaData;
       const validacion = validarInscripcionCompleta(reservaLimpia);
    if (!validacion.success) {
      const primerError = Object.values(validacion.errores)[0] || 'Datos inválidos';
      return { success: false, error: { code: 'invalid-data', message: primerError } };
    }

    // ✅ NUEVO (FIX-PREREQ-BYPASS): Validación de prerequisitos (defensa en profundidad).
      let cursoData = null;
    try {
      const cursoRef = doc(db, 'artifacts', appId, 'public', 'data', 'cursos', reservaData.cursoId);
      const cursoSnap = await getDoc(cursoRef);
      if (cursoSnap.exists()) {
                cursoData = { id: cursoSnap.id, ...cursoSnap.data() };
        const esBasico = cursoData.tipoCurso === 'basico_auto' || cursoData.tipoCurso === 'basico_sincro';

        if (!esBasico) {
          const reservasUsuarioRef = collection(db, 'artifacts', appId, 'public', 'data', 'reservas');
          const qReservas = query(
            reservasUsuarioRef,
            where('userId', '==', reservaData.userId),
            where('estadoPago', '==', 'Aprobado')
          );
          const reservasSnap = await getDocs(qReservas);
          const reservasAprobadas = reservasSnap.docs.map(d => ({ id: d.id, ...d.data() }));

          const cursosRef = collection(db, 'artifacts', appId, 'public', 'data', 'cursos');
          const cursosSnap = await getDocs(cursosRef);
          const cursos = cursosSnap.docs.map(d => ({ id: d.id, ...d.data() }));

          const cumple = cumplePrerequisito(
            cursoData.tipoCurso,
            reservasAprobadas,
            cursoData,
            cursos
          );

          if (!cumple) {
            return {
              success: false,
              error: {
                code: 'invalid-prereqs',
                message: 'Este curso requiere que apruebes un curso previo primero.'
              }
            };
          }
        }
      }
    } catch (err) {
      console.error('[crearReserva] Error validando prereqs:', err);
    }

    // BUG-2: cross-check de ocupacion antes de entrar a la transaccion.
    const motoObjetivo = (cursoData?.motoIncluida === false) ? null : (reservaData.motoAsignadaId || null);
    const chequeoOcupacion = await validarDisponibilidadAntesDeCrear({
      fecha: reservaData.fecha,
      fecha2: reservaData.fecha2 || null,
      horaId: reservaData.horaId,
      instructorId: reservaData.instructorId || null,
      motoAsignadaId: motoObjetivo,
      userId: reservaData.userId,
      lockId,
      contexto: 'crearReserva'
    });
    if (!chequeoOcupacion.ok) return { success: false, error: chequeoOcupacion.error };

    const reservasRef = collection(db, 'artifacts', appId, 'public', 'data', 'reservas');
    const reservaDoc = doc(reservasRef);
    const lockRef = doc(db, 'locks', lockId);
    const ocupacionConfirmadaRef = doc(db, 'ocupacionConfirmada', reservaDoc.id);

    try {
      await runTransaction(db, async (transaction) => {
        const crearError = (code, message) => {
          const error = new Error(message);
          error.code = code;
          return error;
        };

        const lockSnap = await transaction.get(lockRef);
        if (!lockSnap.exists()) {
          throw crearError('slot-occupied', 'El horario ya no está disponible. Elige otro bloque.');
        }

        const lockData = lockSnap.data();

        // Fail-closed: un lock expirado o corrupto NO autoriza la reserva.
        // Antes se ignoraba y se creaba la reserva, permitiendo doble venta.
        const lockExpirado = !lockData.expiresAt || lockData.expiresAt.toMillis() <= Date.now();
        const lockCorrupto = !lockData.userId || !lockData.instructorId || !lockData.fecha || !lockData.horaId;
        if (lockExpirado) {
          throw crearError('lock-expired', 'El tiempo para completar la reserva expiró. Elige otro horario.');
        }
        if (lockCorrupto) {
          throw crearError('lock-invalid', 'El bloqueo del horario es inválido. Elige otro horario.');
        }
        if (String(lockData.userId) !== String(reservaData.userId)) {
          throw crearError('lock-owner-mismatch', 'El horario está bloqueado por otro usuario.');
        }

        // El lock debe corresponder exactamente a lo que se está reservando.
        const lockMoto = lockData.motoAsignadaId || null;
        // Para cursos sin moto incluida, la reserva normaliza moto a null
        // (misma regla que usa el resto del servicio).
        const reservaMoto = (cursoData?.motoIncluida === false)
          ? null
          : (reservaData.motoAsignadaId || null);
        const lockCoincide =
          String(lockData.fecha) === String(reservaData.fecha) &&
          String(lockData.horaId) === String(reservaData.horaId) &&
          String(lockData.instructorId) === String(reservaData.instructorId) &&
          String(lockMoto || '') === String(reservaMoto || '');
        if (!lockCoincide) {
          throw crearError('lock-mismatch', 'El bloqueo no coincide con el horario seleccionado.');
        }

        // Los locks nuevos se escriben con IDs por instructor y por moto.
        // En una transacción no se pueden hacer queries, pero sí leer los
        // documentos deterministas: así se cierra la ventana de carrera.
        const lockIds = construirLockIds({
          lockId,
          fecha: lockData.fecha,
          horaId: lockData.horaId,
          instructorId: lockData.instructorId,
          motoAsignadaId: lockData.motoAsignadaId
        });
        const recursosEsperados = lockData.esquema === 'recursos-v1' ? lockIds : [lockId];
        for (const id of recursosEsperados) {
          if (id === lockId) continue;
          const recursoSnap = await transaction.get(doc(db, 'locks', id));
          if (!recursoSnap.exists() || String(recursoSnap.data().userId) !== String(reservaData.userId)) {
            throw crearError('lock-resource-mismatch', 'El bloqueo de recursos cambió. Elige otro horario.');
          }
        }

        const datosReserva = {
          ...validacion.data,
          userId: reservaData.userId,
          cursoId: reservaData.cursoId,
          tipoCurso: typeof reservaData.tipoCurso === 'string' ? reservaData.tipoCurso.trim() : null,          sedeId: reservaData.sedeId,
          tipoMoto: reservaData.tipoMoto,
          fecha: reservaData.fecha,
          fecha2: reservaData.fecha2 || null,
          horaId: reservaData.horaId,
          instructorId: reservaData.instructorId,
                    motoAsignadaId: (cursoData?.motoIncluida === false) ? null : (reservaData.motoAsignadaId || null),
          
          // FIX-PERMITE-TRAER-MOTO: forzar coherencia con la config del curso.
          // Caso 1: curso sin moto (motoIncluida: false) → 'Sí' obligatorio (el estudiante DEBE traer propia).
          // Caso 2: curso con moto pero permiteTraerMotoPropia: false (Equilibrio) → 'No' obligatorio (moto escuela).
          // Caso 3: curso con moto y permiteTraerMotoPropia: true → respetar lo que envíe el cliente.
          traeMoto: (cursoData?.motoIncluida === false) ? 'Sí'
                   : (cursoData?.permiteTraerMotoPropia === false) ? 'No'
                   : (reservaData.traeMoto || 'No'),
          sabeBicicleta: reservaData.sabeBicicleta,
          fechaNacimiento: reservaData.fechaNacimiento,
          pagoTotalMoneda: reservaData.pagoTotalMoneda,
          pagoTotalVES: reservaData.pagoTotalVES,
          pagoBanco: reservaData.pagoBanco,
          pagoTelefono: reservaData.pagoTelefono,
          pagoCedula: reservaData.pagoCedula,
          pagoRef: reservaData.pagoRef,
          id: reservaDoc.id,
          createdAt: Timestamp.now(),
          estadoPago: 'Pendiente',
          estadoCurso: 'Pendiente',
          precio: reservaData.pagoTotalMoneda,
                proveedorId: reservaData.proveedorId || null,
          pin: reservaData.pin || null,
                 comisionInstructor: typeof reservaData.comisionInstructor === 'number' ? reservaData.comisionInstructor : 0,
          comisionProveedor: typeof reservaData.comisionProveedor === 'number' ? reservaData.comisionProveedor : 0,
          origenReinscripcion: reservaData.origenReinscripcion || 'nueva',
          createdAt: serverTimestamp()
        };

        transaction.set(reservaDoc, datosReserva);
              transaction.set(ocupacionConfirmadaRef, {
          userId: datosReserva.userId,
          fecha: datosReserva.fecha,
          fecha2: datosReserva.fecha2,
          horaId: datosReserva.horaId,
          horaIdReposicion: datosReserva.horaIdReposicion || null,
          instructorId: datosReserva.instructorId,
          tipoCurso: datosReserva.tipoCurso || null,
          motoAsignadaId: datosReserva.motoAsignadaId,
          motoReposicionId: datosReserva.motoReposicionId || null,
          traeMoto: datosReserva.traeMoto,
          sedeId: datosReserva.sedeId,          
          estadoPago: 'Pendiente',
          proveedorId: datosReserva.proveedorId || null,
          comisionProveedor: Number(datosReserva.comisionProveedor) || 0
        });

        // Purga atómica del lote completo: principal + IDs por recurso.
        // Si el lock legacy no tiene IDs por recurso, solo se borra el principal.
        for (const id of recursosEsperados) {
          transaction.delete(doc(db, 'ocupacionTemporal', id));
          transaction.delete(doc(db, 'locks', id));
        }
      });
        return { success: true, data: { id: reservaDoc.id } };
    } catch (error) {
      return {
        success: false,
        error: {
          code: error.code || 'transaction-failed',
          message: error.message
        }
      };
    }
  },

  // -------------------------------------------------
  // PACK COMERCIAL — Fase 3.7b
  // Crea reserva MAESTRA + reserva CHILD (primer curso) en una transacción atómica.
  // -------------------------------------------------
  async crearReservaPack(packData, lockId) {
    if (!packData || !lockId) {
      return { success: false, error: { code: 'missing-fields', message: 'Faltan datos del pack o lockId' } };
    }
    if (!packData.packId) {
      return { success: false, error: { code: 'missing-pack-id', message: 'Falta packId' } };
    }

    const usuarioActual = auth.currentUser;
    if (!usuarioActual) {
      return { success: false, error: { code: 'no-auth', message: 'Sesión no encontrada' } };
    }
    if (packData.userId && packData.userId !== usuarioActual.uid) {
      return { success: false, error: { code: 'identity-mismatch', message: 'El userId no coincide con tu sesión' } };
    }

    // Freno: 1 pack de sesiones activo máximo (los de solo teóricos sí se permiten en N)
    try {
      const rpRef = collection(db, 'artifacts', appId, 'public', 'data', 'reservasPack');
      const rpQ = query(rpRef, where('userId', '==', usuarioActual.uid));
      const rpSnap = await getDocs(rpQ);
      const packSnapPre = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'packs', packData.packId));
      const cursoIdsNuevo = packSnapPre.exists() ? (packSnapPre.data().cursoIds || []) : [];
      if (cursoIdsNuevo.length > 0) {
        const yaTiene = rpSnap.docs.some(d => {
          const p = d.data();
          const cursoIds = p.packSnapshot?.cursoIds || [];
          return (p.estadoPago === 'Aprobado' || p.estadoPago === 'Pendiente') && (p.estado === 'activo' || p.estado === undefined) && cursoIds.length > 0;
        });
        if (yaTiene) {
          return { success: false, error: { code: 'pack-sesiones-activo', message: 'Ya tienes un pack de sesiones activo. Termínalo antes de comprar otro.' } };
        }
      }
    } catch (err) {
      console.warn('[crearReservaPack] Error validando pack activo:', err);
      // fail-open: no bloquear si la validación falla por red
    }

    // BUG-2: cross-check de ocupacion antes de entrar a la transaccion.
    const chequeoOcupacion = await validarDisponibilidadAntesDeCrear({
      fecha: packData.fecha || null,
      fecha2: packData.fecha2 || null,
      horaId: packData.horaId || null,
      instructorId: packData.instructorId || null,
      motoAsignadaId: packData.motoAsignadaId || null,
      userId: usuarioActual.uid,
      lockId,
      contexto: 'crearReservaPack'
    });
    if (!chequeoOcupacion.ok) return { success: false, error: chequeoOcupacion.error };

    const packRef = doc(db, 'artifacts', appId, 'public', 'data', 'packs', packData.packId);
    const maestraRef = doc(collection(db, 'artifacts', appId, 'public', 'data', 'reservasPack'));
    const childRef = doc(db, 'artifacts', appId, 'public', 'data', 'reservas', `${maestraRef.id}_sub_0`);
    const lockRef = doc(db, 'locks', lockId);
    const temporalRef = doc(db, 'ocupacionTemporal', lockId);
    const espejoRef = doc(db, 'ocupacionConfirmada', childRef.id);

    try {
      let childIdFinal = null;
      let maestraIdFinal = null;

      await runTransaction(db, async (transaction) => {
        // 1. Leer y validar pack
        const packSnap = await transaction.get(packRef);
        if (!packSnap.exists()) {
          throw new Error('El pack ya no existe');
        }
        const pack = packSnap.data();
        if (pack.activo !== true) {
          throw new Error('El pack ya no está disponible');
        }

        // 2. Leer y validar lock
        const lockSnap = await transaction.get(lockRef);
        if (!lockSnap.exists()) {
          throw new Error('El horario ya no está disponible');
        }
        const lockData = lockSnap.data();
        const lockIds = lockData.esquema === 'recursos-v1'
          ? construirLockIds({ lockId, ...lockData })
          : [lockId];
        const lockExpirado = !lockData.expiresAt || lockData.expiresAt.toMillis() <= Date.now();
        const lockCorrupto = !lockData.userId || !lockData.instructorId || !lockData.fecha || !lockData.horaId;
        if (lockExpirado) throw new Error('El tiempo para completar la reserva expiró. Elige otro horario.');
        if (lockCorrupto) throw new Error('El bloqueo del horario es inválido. Elige otro horario.');
        if (String(lockData.userId) !== String(usuarioActual.uid)) {
          throw new Error('El horario está bloqueado por otro usuario');
        }

        // PACK-CHILD-C: el ID determinista garantiza una sola child por pack+índice.
        const childSnap = await transaction.get(childRef);
        if (childSnap.exists()) {
          throw new Error('La sesión inicial de este pack ya fue creada');
        }

        // 3. Resolver cursos del pack
        const cursosPack = (pack.cursoIds || []).map(cid => {
          // Los cursos no se leen dentro de la transacción (sería costoso).
          // El cliente ya los tiene en packData.cursoSnapshot.
          return packData.cursoSnapshot?.find(c => String(c.id) === String(cid)) || null;
        }).filter(Boolean);

        if (cursosPack.length === 0) {
          throw new Error('Pack sin cursos válidos');
        }

        const cursoEq = cursosPack[0];
        const sumaBase = cursosPack.reduce((acc, c) => acc + (Number(c.precioBase) || 0), 0);
        const descuentoMonto = Number(pack.descuentoTipo === 'porcentaje'
          ? (sumaBase * (Number(pack.descuentoValor) || 0)) / 100
          : (Number(pack.descuentoValor) || 0));
        // FIX-FINANCIERO: El backend calcula el precio, no confía en el frontend.
        const precioPack = Math.max(0, sumaBase - descuentoMonto);

        // 4. Prorrateo del primer curso (Equilibrio)
        const precioEqBase = Number(cursoEq.precioBase) || 0;
        const precioEqProrrateado = sumaBase > 0
          ? Number(((precioEqBase / sumaBase) * precioPack).toFixed(2))
          : 0;
        const descuentoEqAplicado = Number((precioEqBase - precioEqProrrateado).toFixed(2));

        // 5. Comisiones híbridas (completas del curso, negocio absorbe déficit)
        const comisionInstructorEq = Number(cursoEq.comisionInstructor) || 0;
        const comisionProveedorEq = Number(cursoEq.comisionProveedor) || 0;
        const totalComisionesEq = comisionInstructorEq + comisionProveedorEq;
        const deficitEq = Number((totalComisionesEq - precioEqProrrateado).toFixed(2));

        // 6. Vencimiento congelado
        const vencimientoDias = Number(pack.vencimientoDias) || 60;
        const ahora = Date.now();
        const vencimientoMs = ahora + (vencimientoDias * 24 * 60 * 60 * 1000);

        // 7. Sub-reservas (metadata): índice 0 activo, resto bloqueado
        const subReservas = cursosPack.map((c, idx) => ({
          cursoId: String(c.id),
          cursoNombre: c.nombre || '',
          estado: idx === 0 ? 'activo' : 'bloqueado',
          reservaId: idx === 0 ? childRef.id : null
        }));

        // 8. Datos de la MAESTRA
        const datosMaestra = {
          userId: usuarioActual.uid,
          packId: String(pack.id),
          packNombre: pack.nombre || 'Pack',
          packSnapshot: {
            cursoIds: pack.cursoIds || [],
            sedesPermitidas: pack.sedesPermitidas || [],
            cursosTeoricosIncluidos: pack.cursosTeoricosIncluidos || [],
            descuentoTipo: pack.descuentoTipo || 'porcentaje',
            descuentoValor: Number(pack.descuentoValor) || 0,
            vencimientoDias
          },
          // FIX-PACK-SEDE-POR-SESION: mapa de cursoId → sedesPermitidas del curso.
          // Se congela al comprar el pack (maestra inmutable post-compra).
          // Permite validar intersección curso ∩ pack en reglas Firestore sin joins.
          sedesPermitidasPorCurso: (() => {
            const mapa = {};
            cursosPack.forEach(c => {
              mapa[String(c.id)] = Array.isArray(c.sedesPermitidas) ? c.sedesPermitidas : [];
            });
            return mapa;
          })(),
          precioBaseCongelado: sumaBase,
          descuentoCongelado: {
            tipo: pack.descuentoTipo || 'porcentaje',
            valor: Number(pack.descuentoValor) || 0,
            monto: Number(descuentoMonto.toFixed(2))
          },
          precioTotalCongelado: Number(precioPack.toFixed(2)),
          fechaCompra: Timestamp.now(),
          vencimiento: Timestamp.fromMillis(vencimientoMs),
          estado: 'activo',
          estadoPago: 'Pendiente',
          cursoActual: 0,
          cursoReservaId: childRef.id,
          sedeId: packData.sedeId || null,
          tipoMoto: packData.tipoMoto || null,
          traeMotoPorCurso: packData.traeMotoPorCurso || {},
          pagoTotalMoneda: Number(precioPack.toFixed(2)),
          pagoTotalVES: Number(packData.pagoTotalVES) || 0,
          pagoBanco: packData.pagoBanco || null,
          pagoTelefono: packData.pagoTelefono || null,
          pagoCedula: packData.pagoCedula || null,
          pagoRef: packData.pagoRef || null,
          subReservas,
          origen: packData.origen || 'pack-publico',
          createdAt: serverTimestamp(),
          
          createdAt: Timestamp.now()
        };

        transaction.set(maestraRef, datosMaestra);

        // 9. Datos de la CHILD (Equilibrio)
        const datosChild = {
          userId: usuarioActual.uid,
          cedula: packData.cedula || null,
          nombre: packData.nombre || null,
          apellido: packData.apellido || null,
          correo: packData.correo || null,
          telefono: packData.telefono || null,
          contactoEmergencia: packData.contactoEmergencia || null,
          fechaNacimiento: packData.fechaNacimiento || null,
          sexo: packData.sexo || null,
          estado: packData.estado || null,
          zona: packData.zona || null,
          condicionMedica: packData.condicionMedica || null,
          detalleCondicion: packData.detalleCondicion || null,
          cursoId: String(cursoEq.id),
          tipoCurso: typeof cursoEq.tipoCurso === 'string' ? cursoEq.tipoCurso.trim() : null,
          sedeId: packData.sedeId || null,
          tipoMoto: (() => {
            // FIX-PACK-TIPOMOTO: SSOT es cursoEq.tiposMotoEscuela.
            // Backend tiene la última palabra, independiente de lo que envíe el frontend.
            const tipos = cursoEq.tiposMotoEscuela;
            if (!Array.isArray(tipos) || tipos.length === 0) return null;
            if (tipos.length === 1) return tipos[0];
            if (packData.tipoMoto && tipos.includes(packData.tipoMoto)) return packData.tipoMoto;
            console.warn('[crearReservaPack] tipoMoto corregido por SSOT:', {
              curso: cursoEq.nombre,
              tipoRecibido: packData.tipoMoto,
              tipoFinal: tipos[0]
            });
            return tipos[0];
          })(),
          fecha: packData.fecha || null,
          fecha2: packData.fecha2 || null,
          horaId: packData.horaId || null,
          instructorId: packData.instructorId || null,
          motoAsignadaId: packData.motoAsignadaId || null,
          // FIX-PERMITE-TRAER-MOTO-PACK-CREATE: reemplaza hardcode por 3 casos.
          // Mismo criterio que agendarSiguienteCursoPack y crearReserva individual.
          traeMoto: (cursoEq?.motoIncluida === false) ? 'Sí'
                   : (cursoEq?.permiteTraerMotoPropia === false) ? 'No'
                   : (packData.traeMotoPorCurso?.[String(cursoEq.id)] || 'No'),
          sabeBicicleta: 'No', // implícito por pack
          proveedorId: packData.proveedorId || null,
          pagoTotalMoneda: precioEqProrrateado,
          pagoTotalVES: Number(packData.pagoTotalVES) || 0,
          pagoBanco: packData.pagoBanco || null,
          pagoTelefono: packData.pagoTelefono || null,
          pagoCedula: packData.pagoCedula || null,
          pagoRef: packData.pagoRef || null,
          id: childRef.id,
          createdAt: Timestamp.now(),
          estadoPago: 'Pendiente',
          estadoCurso: 'Pendiente',
          precio: precioEqProrrateado,
          precioBaseOriginal: precioEqBase,
          descuentoAplicado: descuentoEqAplicado,
          comisionInstructor: comisionInstructorEq,
          comisionProveedor: comisionProveedorEq,
          deficitComision: deficitEq,
          comisionAbsorbidaPorNegocio: deficitEq,
          pin: packData.pin || null,
          terminosAceptados: packData.terminosAceptados === true,
          fechaAceptacionTerminos: packData.fechaAceptacionTerminos || null,
          createdAt: serverTimestamp(),
          // Campos de diferenciación
          packReservaId: maestraRef.id,
          tipoReserva: 'pack_sub',
          packCursoIndex: 0,
          packNombre: pack.nombre || 'Pack',
          origenReinscripcion: 'nueva'
        };

        transaction.set(childRef, datosChild);

        // 10. Espejo en ocupacionConfirmada (solo para la child)
        transaction.set(espejoRef, {
          userId: datosChild.userId,
          fecha: datosChild.fecha,
          fecha2: datosChild.fecha2,
          horaId: datosChild.horaId,
          horaIdReposicion: datosChild.horaIdReposicion || null,
          instructorId: datosChild.instructorId,
          tipoCurso: datosChild.tipoCurso,
          motoAsignadaId: datosChild.motoAsignadaId,
          motoReposicionId: datosChild.motoReposicionId || null,
          traeMoto: datosChild.traeMoto,
          sedeId: datosChild.sedeId,
          estadoPago: 'Pendiente',
          proveedorId: datosChild.proveedorId || null,
          comisionProveedor: Number(datosChild.comisionProveedor) || 0
        });

        // 11. Purga de locks (principal + IDs por instructor/moto)
        for (const id of lockIds) {
          transaction.delete(doc(db, 'ocupacionTemporal', id));
          transaction.delete(doc(db, 'locks', id));
        }

        childIdFinal = childRef.id;
        maestraIdFinal = maestraRef.id;
      });

      return {
        success: true,
        data: { id: childIdFinal, packReservaId: maestraIdFinal }
      };
    } catch (error) {
      console.error('[crearReservaPack] Error:', {
        userId: packData.userId,
        packId: packData.packId,
        errorCode: error.code,
        errorMessage: error.message,
        timestamp: new Date().toISOString()
      });
         return { success: false, error: { code: 'transaction-failed', message: error.message } };
    }
  },

  // -------------------------------------------------
  // PACK COMERCIAL — Fase 5.3
  // Agenda el siguiente curso del pack. El estudiante ya pagó el pack completo,
  // así que el nuevo child nace con estadoPago: 'Aprobado'.
  //
  // Caller: página /mi-pack/:id/agendar.
  // Escrituras: 5 (child, espejo, maestra, lock, ocupacionTemporal).
  // -------------------------------------------------
  async agendarSiguienteCursoPack(packData, lockId) {
    if (!packData || !lockId) {
      return { success: false, error: { code: 'missing-fields', message: 'Faltan datos o lockId' } };
    }
    if (!packData.packReservaId) {
      return { success: false, error: { code: 'missing-pack-id', message: 'Falta packReservaId' } };
    }

    const usuarioActual = auth.currentUser;
    if (!usuarioActual) {
      return { success: false, error: { code: 'no-auth', message: 'Sesión no encontrada' } };
    }

    const maestraRef = doc(db, 'artifacts', appId, 'public', 'data', 'reservasPack', packData.packReservaId);
    const lockRef = doc(db, 'locks', lockId);
    const temporalRef = doc(db, 'ocupacionTemporal', lockId);

    // BUG-2: cross-check de ocupacion antes de entrar a la transaccion.
    const chequeoOcupacion = await validarDisponibilidadAntesDeCrear({
      fecha: packData.fecha || null,
      fecha2: packData.fecha2 || null,
      horaId: packData.horaId || null,
      instructorId: packData.instructorId || null,
      motoAsignadaId: packData.motoAsignadaId || null,
      userId: usuarioActual.uid,
      lockId,
      contexto: 'agendarSiguienteCursoPack'
    });
    if (!chequeoOcupacion.ok) return { success: false, error: chequeoOcupacion.error };

    try {
      let childIdFinal = null;

      await runTransaction(db, async (transaction) => {
        // 1. Leer y validar maestra
        const maestraSnap = await transaction.get(maestraRef);
        if (!maestraSnap.exists()) {
          throw new Error('El pack no existe');
        }
        const maestra = maestraSnap.data();

        if (maestra.userId !== usuarioActual.uid) {
          throw new Error('No tienes permiso sobre este pack');
        }
        if (maestra.estado !== 'activo') {
          throw new Error('El pack no está activo');
        }

                if (maestra.estadoPago !== 'Aprobado') {
          throw new Error('El pack no tiene el pago aprobado.');
        }

        const vencimientoMs = maestra.vencimiento?.toMillis?.() || 0;
        if (vencimientoMs > 0 && vencimientoMs < Date.now()) {
          throw new Error('El pack está vencido. Contacta al administrador.');
        }

        // 2. Validar que el curso actual no tenga ya una reserva agendada
        const cursoActual = Number(maestra.cursoActual ?? 0);
        if (!Number.isInteger(cursoActual) || cursoActual < 0) {
          throw new Error('El pack tiene un índice de curso inválido.');
        }
        const subReservas = [...(maestra.subReservas || [])];
        const subActual = subReservas[cursoActual];
        if (!subActual) {
          throw new Error('Índice de curso inválido');
        }
        if (subActual.estado !== 'activo') {
          throw new Error('El curso actual no está disponible para agendar');
        }
        if (subActual.reservaId) {
          throw new Error('Este curso ya tiene una fecha agendada');
        }

        // PACK-CHILD-C: ID determinista por pack+índice (unicidad estructural).
        const childRef = doc(db, 'artifacts', appId, 'public', 'data', 'reservas', `${maestraRef.id}_sub_${cursoActual}`);
        const espejoRef = doc(db, 'ocupacionConfirmada', childRef.id);

        // 3. Validar que el curso a agendar coincide con el subReservas[cursoActual]
        const cursoData = packData.cursoSnapshot;
        if (!cursoData || String(cursoData.id) !== String(subActual.cursoId)) {
          throw new Error('El curso a agendar no coincide con el curso actual del pack');
        }

        // 4. Leer y validar lock
        const lockSnap = await transaction.get(lockRef);
        if (!lockSnap.exists()) {
          throw new Error('El horario ya no está disponible');
        }
        const lockData = lockSnap.data();
        const lockIds = lockData.esquema === 'recursos-v1'
          ? construirLockIds({ lockId, ...lockData })
          : [lockId];
        const lockExpirado = !lockData.expiresAt || lockData.expiresAt.toMillis() <= Date.now();
        const lockCorrupto = !lockData.userId || !lockData.instructorId || !lockData.fecha || !lockData.horaId;
        if (lockExpirado) throw new Error('El tiempo para completar la reserva expiró. Elige otro horario.');
        if (lockCorrupto) throw new Error('El bloqueo del horario es inválido. Elige otro horario.');
        if (String(lockData.userId) !== String(usuarioActual.uid)) {
          throw new Error('El horario está bloqueado por otro usuario');
        }

        // PACK-CHILD-C: verificar que el documento determinista aún no exista.
        const childSnap = await transaction.get(childRef);
        if (childSnap.exists()) {
          throw new Error('Esta sesión del pack ya fue agendada');
        }

        // 5. Prorrateo del curso actual
        const sumaBase = Number(maestra.precioBaseCongelado) || 0;
        const precioPack = Number(maestra.precioTotalCongelado) || 0;
        const precioBaseCurso = Number(cursoData.precioBase) || 0;
        const precioProrrateado = sumaBase > 0
          ? Number(((precioBaseCurso / sumaBase) * precioPack).toFixed(2))
          : 0;
        const descuentoAplicado = Number((precioBaseCurso - precioProrrateado).toFixed(2));

        // 6. Comisiones híbridas (completas, negocio absorbe déficit)
        const comisionInstructor = Number(cursoData.comisionInstructor) || 0;
        const comisionProveedor = Number(cursoData.comisionProveedor) || 0;
        const totalComisiones = comisionInstructor + comisionProveedor;
        const deficit = Number((totalComisiones - precioProrrateado).toFixed(2));

        // 7. traeMoto con SSOT del curso (FIX-PERMITE-TRAER-MOTO-PACK-BACKEND).
        // Jerarquía: mismo criterio que crearReserva (individual) y Paso2Pack (cliente).
        //   1. Sin moto app (motoIncluida: false) → 'Sí' obligatorio.
        //   2. Con moto app pero NO permite propia (Equilibrio) → 'No' obligatorio.
        //   3. Con moto app y permite propia → respetar el mapa traeMotoPorCurso.
        const traeMoto = (cursoData?.motoIncluida === false) ? 'Sí'
                       : (cursoData?.permiteTraerMotoPropia === false) ? 'No'
                       : ((maestra.traeMotoPorCurso || {})[String(cursoData.id)] || 'No');

        // 7-bis. FIX-PACK-SEDE-POR-SESION: validar intersección curso ∩ pack.
        // Sedes del pack (fallback legacy: solo sedeId).
        const sedesPack = Array.isArray(maestra.packSnapshot?.sedesPermitidas) && maestra.packSnapshot.sedesPermitidas.length > 0
          ? maestra.packSnapshot.sedesPermitidas
          : (maestra.sedeId ? [maestra.sedeId] : []);
        // Sedes del curso actual (del mapa denormalizado o del cursoData como fallback).
        const cursoIdStr = String(cursoData.id);
        const sedesCursoRaw = maestra.sedesPermitidasPorCurso?.[cursoIdStr];
        const sedesCurso = Array.isArray(sedesCursoRaw) && sedesCursoRaw.length > 0
          ? sedesCursoRaw
          : (Array.isArray(cursoData.sedesPermitidas) ? cursoData.sedesPermitidas : []);
        // Intersección: sedes válidas para esta sesión.
        const sedesValidasSesion = sedesCurso.length > 0
          ? sedesCurso.filter(s => sedesPack.includes(s))
          : sedesPack;
        if (sedesValidasSesion.length === 0) {
          throw new Error('El pack y este curso no comparten sedes. Contacta al administrador.');
        }
        // Determinar sede a usar (packData o fallback al primero válido).
        const sedeSesion = packData.sedeId && sedesValidasSesion.includes(packData.sedeId)
          ? packData.sedeId
          : sedesValidasSesion[0];

        // 8. Datos de la CHILD
        const datosChild = {
          userId: usuarioActual.uid,
          cedula: packData.cedula || null,
          nombre: packData.nombre || null,
          apellido: packData.apellido || null,
          correo: packData.correo || null,
          telefono: packData.telefono || null,
          contactoEmergencia: packData.contactoEmergencia || null,
          fechaNacimiento: packData.fechaNacimiento || null,
          sexo: packData.sexo || null,
          estado: packData.estado || null,
          zona: packData.zona || null,
          condicionMedica: packData.condicionMedica || null,
          detalleCondicion: packData.detalleCondicion || null,
          cursoId: String(cursoData.id),
          tipoCurso: typeof cursoData.tipoCurso === 'string' ? cursoData.tipoCurso.trim() : null,
          sedeId: sedeSesion,
          tipoMoto: (() => {
            // FIX-PACK-TIPOMOTO: SSOT es cursoData.tiposMotoEscuela.
            // Backend tiene la última palabra, independiente de lo que envíe el frontend.
            const tipos = cursoData.tiposMotoEscuela;
            if (!Array.isArray(tipos) || tipos.length === 0) return null;
            if (tipos.length === 1) return tipos[0];
            if (packData.tipoMoto && tipos.includes(packData.tipoMoto)) return packData.tipoMoto;
            console.warn('[agendarSiguienteCursoPack] tipoMoto corregido por SSOT:', {
              curso: cursoData.nombre,
              tipoRecibido: packData.tipoMoto,
              tipoFinal: tipos[0]
            });
            return tipos[0];
          })(),
          fecha: packData.fecha || null,
          fecha2: packData.fecha2 || null,
          horaId: packData.horaId || null,
          instructorId: packData.instructorId || null,
          motoAsignadaId: packData.motoAsignadaId || null,
          traeMoto,
          sabeBicicleta: 'Sí', // implícito por pack (ya completó Equilibrio)
          proveedorId: packData.proveedorId || null,
          createdAt: serverTimestamp(),
          pagoTotalMoneda: precioProrrateado,
          pagoTotalVES: Number(maestra.pagoTotalVES) || 0,
          pagoBanco: maestra.pagoBanco || null,
          pagoTelefono: maestra.pagoTelefono || null,
          pagoCedula: maestra.pagoCedula || null,
          pagoRef: maestra.pagoRef || null,
          id: childRef.id,
          createdAt: Timestamp.now(),
          estadoPago: 'Aprobado', // ya pagó el pack
          estadoCurso: 'Pendiente',
          precio: precioProrrateado,
          precioBaseOriginal: precioBaseCurso,
          descuentoAplicado,
          comisionInstructor,
          comisionProveedor,
          deficitComision: deficit,
          comisionAbsorbidaPorNegocio: deficit,
          pin: null,
          terminosAceptados: true,
          fechaAceptacionTerminos: new Date().toISOString(),
          // Campos de diferenciación
          packReservaId: maestraRef.id,
          tipoReserva: 'pack_sub',
          packCursoIndex: cursoActual,
          packNombre: maestra.packNombre || 'Pack',
          origenReinscripcion: 'nueva'
        };

        transaction.set(childRef, datosChild);

        // 9. Actualizar maestra: reservaId del curso actual + cursoReservaId
        subReservas[cursoActual] = {
          ...subActual,
          reservaId: childRef.id
        };

        transaction.update(maestraRef, {
          subReservas,
          cursoReservaId: childRef.id
        });

        // 10. Espejo en ocupacionConfirmada
        transaction.set(espejoRef, {
          userId: datosChild.userId,
          fecha: datosChild.fecha,
          fecha2: datosChild.fecha2,
          horaId: datosChild.horaId,
          horaIdReposicion: datosChild.horaIdReposicion || null,
          instructorId: datosChild.instructorId,
          tipoCurso: datosChild.tipoCurso,
          motoAsignadaId: datosChild.motoAsignadaId,
          motoReposicionId: datosChild.motoReposicionId || null,
          traeMoto: datosChild.traeMoto,
          sedeId: datosChild.sedeId,
          estadoPago: 'Aprobado',
          proveedorId: datosChild.proveedorId || null,
          comisionProveedor: Number(datosChild.comisionProveedor) || 0
        });

        // 11. Purga de locks (principal + IDs por instructor/moto)
        for (const id of lockIds) {
          transaction.delete(doc(db, 'ocupacionTemporal', id));
          transaction.delete(doc(db, 'locks', id));
        }

        childIdFinal = childRef.id;
      });

      return {
        success: true,
        data: { id: childIdFinal }
      };
    } catch (error) {
      console.error('[agendarSiguienteCursoPack] Error:', {
        userId: packData.userId,
        packReservaId: packData.packReservaId,
        errorCode: error.code,
        errorMessage: error.message,
        timestamp: new Date().toISOString()
      });
      return { success: false, error: { code: 'transaction-failed', message: error.message } };
    }
  },

  // -------------------------------------------------
  // PACK COMERCIAL — 3.8b
  // Aprueba la maestra + child en cascada. Transacción atómica.
  // -------------------------------------------------
  async aprobarReservaPack(packReservaId, childReservaId) {
    if (!packReservaId || !childReservaId) {
      return { success: false, error: { code: 'missing-fields', message: 'Faltan IDs' } };
    }

    const maestraRef = doc(db, 'artifacts', appId, 'public', 'data', 'reservasPack', packReservaId);
    const childRef = doc(db, 'artifacts', appId, 'public', 'data', 'reservas', childReservaId);
    const espejoRef = doc(db, 'ocupacionConfirmada', childReservaId);

    let maestraData = null;

    try {
      await runTransaction(db, async (transaction) => {
        const maestraSnap = await transaction.get(maestraRef);
        if (!maestraSnap.exists()) throw new Error('Pack no encontrado');
        maestraData = maestraSnap.data();

        const childSnap = await transaction.get(childRef);
        if (!childSnap.exists()) throw new Error('Reserva del pack no encontrada');

        // 1. Maestra → Aprobado
        transaction.update(maestraRef, {
          estadoPago: 'Aprobado',
          aprobadoEn: Timestamp.now()
        });

        // 2. Child → Aprobado + En Curso
        transaction.update(childRef, {
          estadoPago: 'Aprobado',
          estadoCurso: 'En Curso',
          aprobadoEn: Timestamp.now()
        });

        // 3. Espejo → Aprobado
        transaction.set(espejoRef, {
          userId: childSnap.data().userId,
          fecha: childSnap.data().fecha,
          fecha2: childSnap.data().fecha2,
          horaId: childSnap.data().horaId,
          instructorId: childSnap.data().instructorId,
          tipoCurso: childSnap.data().tipoCurso,
          motoAsignadaId: childSnap.data().motoAsignadaId,
          traeMoto: childSnap.data().traeMoto,
          sedeId: childSnap.data().sedeId,
          estadoPago: 'Aprobado',
          proveedorId: childSnap.data().proveedorId || null,
          comisionProveedor: Number(childSnap.data().comisionProveedor) || 0
        }, { merge: true });

        // FIX-METRICAS-TRIGGER: invalidar caché del estudiante
        transaction.update(doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', maestraData.userId), {
          updatedAt: Timestamp.now()
        });
      });

      // ────────── Batch post-transacción: accesos teóricos del pack ──────────
      try {
        const cursosTeoricosUnicos = [...new Set(maestraData?.packSnapshot?.cursosTeoricosIncluidos || [])];
        const yaCreados = Array.isArray(maestraData?.accesosTeoricosCreados) ? maestraData.accesosTeoricosCreados : [];
        const faltantes = cursosTeoricosUnicos.filter(id => !yaCreados.includes(id));
        const userIdPack = maestraData?.userId;

        if (faltantes.length > 0 && userIdPack) {
          const basePath = ['artifacts', appId, 'public', 'data'];
          const batch = writeBatch(db);
          const ahora = Timestamp.now();

          // 1. Crear accesos nuevos (precio: 0 obligatorio por regla Rama 2)
          for (const ctId of faltantes) {
            const accesoId = `pack_${packReservaId}_${ctId}`;
            const accesoRef = doc(db, ...basePath, 'accesosTeoricos', accesoId);
            batch.set(accesoRef, {
              id: accesoId,
              userId: String(userIdPack),
              cursoTeoricoId: String(ctId),
              estadoPago: 'Aprobado',
              precio: 0,
              moneda: 'USD',
              origen: 'pack',
              packReservaId,
              metodoPagoId: null,
              pagoBanco: null,
              pagoTelefono: null,
              pagoCedula: null,
              pagoRef: null,
              comisionInstructor: 0,
              comisionProveedor: 0,
              esAccesoVitalicio: true,
              fechaCompra: ahora,
              aprobadoEn: ahora,
              rechazadoEn: null,
              motivoRechazo: null,
              vencimiento: null,
              createdAt: ahora,
              updatedAt: ahora
            }, { merge: true });
          }

          // 2. Marca de idempotencia en la maestra (ALT-ARQ)
          batch.update(maestraRef, {
            accesosTeoricosCreados: arrayUnion(...faltantes)
          });

          // 3. usuarios/{uid}: increment atómico (evita race en doble-clic).
          // Si el doc no existe, se omite: la regla Firestore exige que
          // request.auth.uid == uid en el create, por lo que el admin no puede
          // crear el doc de otro usuario. El estudiante accede igual a sus
          // cursos porque VistaFormacion consulta `accesosTeoricos`, no el perfil.
          const userRef = doc(db, ...basePath, 'usuarios', String(userIdPack));
          const uSnap = await getDoc(userRef);
          if (uSnap.exists()) {
            batch.update(userRef, {
              'capacidades.modulosTeoricos': true,
              updatedAt: ahora
            });
          }

          // 4. Notificación agregada
          const notifRef = doc(collection(db, ...basePath, 'notificaciones'));
          batch.set(notifRef, {
            userId: String(userIdPack),
            tipo: 'pack_teoricos_desbloqueados',
            mensaje: `Tu pack desbloqueó ${faltantes.length} módulo(s) formativo(s). ¡Ya puedes acceder!`,
            packReservaId,
            leida: false,
            createdAt: ahora,
            emisorId: 'sistema'
          });

          await batch.commit();
        }
      } catch (batchErr) {
        console.warn('[aprobarReservaPack] batch accesos teóricos:', batchErr);
        return { success: true, batchWarning: 'accesos_teoricos_pendientes' };
      }
      // ────────── FIN batch ──────────

      return { success: true };
    } catch (error) {
      console.error('[aprobarReservaPack] Error:', error);
      return { success: false, error: { code: 'transaction-failed', message: error.message } };
    }
  },

  // -------------------------------------------------
  // PACK COMERCIAL — 3.8b
  // Rechaza la maestra + child (permite corregir).
  // -------------------------------------------------
  async rechazarReservaPack(packReservaId, childReservaId, motivo = '') {
    if (!packReservaId || !childReservaId) {
      return { success: false, error: { code: 'missing-fields', message: 'Faltan IDs' } };
    }

    const maestraRef = doc(db, 'artifacts', appId, 'public', 'data', 'reservasPack', packReservaId);
    const childRef = doc(db, 'artifacts', appId, 'public', 'data', 'reservas', childReservaId);
    const espejoRef = doc(db, 'ocupacionConfirmada', childReservaId);

    let maestraData = null;

    try {
      await runTransaction(db, async (transaction) => {
        const maestraSnap = await transaction.get(maestraRef);
        if (!maestraSnap.exists()) throw new Error('Pack no encontrado');
        maestraData = maestraSnap.data();

        transaction.update(maestraRef, {
          estadoPago: 'Rechazado',
          rechazadoEn: Timestamp.now(),
          motivoRechazo: motivo || 'La referencia del pago no coincide'
        });

        transaction.update(childRef, {
          estadoPago: 'Rechazado',
          rechazadoEn: Timestamp.now(),
          motivoRechazo: motivo || 'La referencia del pago no coincide'
        });

        // Espejo queda con estado Pendiente (sigue bloqueando el horario)
        transaction.set(espejoRef, { estadoPago: 'Pendiente' }, { merge: true });

        // FIX-METRICAS-TRIGGER: invalidar caché del estudiante
        transaction.update(doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', maestraData.userId), {
          updatedAt: Timestamp.now()
        });
      });

      return { success: true };
    } catch (error) {
      console.error('[rechazarReservaPack] Error:', error);
      return { success: false, error: { code: 'transaction-failed', message: error.message } };
    }
  },

  // -------------------------------------------------
  // PACK COMERCIAL — 3.8b
  // Cancela definitivamente (libera el horario).
  // -------------------------------------------------
  async cancelarReservaPack(packReservaId, childReservaId) {
    if (!packReservaId || !childReservaId) {
      return { success: false, error: { code: 'missing-fields', message: 'Faltan IDs' } };
    }

    const maestraRef = doc(db, 'artifacts', appId, 'public', 'data', 'reservasPack', packReservaId);
    const childRef = doc(db, 'artifacts', appId, 'public', 'data', 'reservas', childReservaId);
    const espejoRef = doc(db, 'ocupacionConfirmada', childReservaId);

    let maestraData = null;

    try {
      await runTransaction(db, async (transaction) => {
        const maestraSnap = await transaction.get(maestraRef);
        if (!maestraSnap.exists()) throw new Error('Pack no encontrado');
        maestraData = maestraSnap.data();

        transaction.update(maestraRef, {
          estadoPago: 'Cancelado',
          estado: 'cancelado',
          canceladoEn: Timestamp.now()
        });

        transaction.update(childRef, {
          estadoPago: 'Cancelado',
          estadoCurso: 'Cancelado',
          canceladoEn: Timestamp.now()
        });

        // Espejo se elimina → libera el horario
        transaction.delete(espejoRef);

        // FIX-METRICAS-TRIGGER: invalidar caché del estudiante
        transaction.update(doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', maestraData.userId), {
          updatedAt: Timestamp.now()
        });
      });

      // ────────── Batch post-transacción: soft-delete accesos teóricos ──────────
      try {
        const cursosTeoricos = Array.isArray(maestraData?.packSnapshot?.cursosTeoricosIncluidos)
          ? maestraData.packSnapshot.cursosTeoricosIncluidos
          : [];

        if (cursosTeoricos.length > 0) {
          const basePath = ['artifacts', appId, 'public', 'data'];
          const batch = writeBatch(db);
          const ahora = Timestamp.now();

          for (const ctId of cursosTeoricos) {
            const accesoId = `pack_${packReservaId}_${ctId}`;
            const accesoRef = doc(db, ...basePath, 'accesosTeoricos', accesoId);
            const snapAcceso = await getDoc(accesoRef);
            if (snapAcceso.exists() && snapAcceso.data().estadoPago !== 'Cancelado') {
              batch.update(accesoRef, {
                estadoPago: 'Cancelado',
                rechazadoEn: ahora,
                motivoRechazo: 'Pack cancelado por el administrador',
                updatedAt: ahora
              });
            }
          }

          await batch.commit();
        }
      } catch (batchErr) {
        console.warn('[cancelarReservaPack] soft-delete accesos teóricos:', batchErr);
      }
      // ────────── FIN batch ──────────

      // FASE-3.5: notificación al usuario sobre cancelación del pack
      if (maestraData?.userId) {
        try {
          const notifRef = doc(collection(db, 'artifacts', appId, 'public', 'data', 'notificaciones'));
          await setDoc(notifRef, {
            userId: String(maestraData.userId),
            tipo: 'pack_cancelado',
            mensaje: 'Tu pack fue cancelado por el administrador. Si crees que es un error, contacta a soporte.',
            packReservaId,
            leida: false,
            createdAt: Timestamp.now(),
            emisorId: 'sistema'
          });
        } catch (notifErr) {
          console.warn('[cancelarReservaPack] Error creando notificación:', notifErr);
        }
      }

      return { success: true };
    } catch (error) {
      console.error('[cancelarReservaPack] Error:', error);
      return { success: false, error: { code: 'transaction-failed', message: error.message } };
    }
  },

  async obtenerReservaPorUsuario(uid) {
    if (!uid) return { success: false, error: { code: 'missing-uid', message: 'Falta el UID del usuario' } };
    try {
      const reservasRef = collection(db, 'artifacts', appId, 'public', 'data', 'reservas');
      const q = query(reservasRef, where('userId', '==', String(uid)));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const data = snap.docs[0].data();
        return { success: true, data: { id: snap.docs[0].id, ...data } };
      }
      return { success: true, data: null };
    } catch (error) {
      return { success: false, error: { code: error.code, message: error.message } };
    }
  },

    async obtenerReservasPorUsuario(uid) {
    if (!uid) return { success: false, error: { code: 'missing-uid', message: 'Falta el UID del usuario' } };
    try {
      const reservasRef = collection(db, 'artifacts', appId, 'public', 'data', 'reservas');
      const q = query(reservasRef, where('userId', '==', String(uid)));
      const snap = await getDocs(q);
      const reservas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      reservas.sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() || 0;
        const tb = b.createdAt?.toMillis?.() || 0;
        return tb - ta;
      });
      return { success: true, data: reservas };
    } catch (error) {
      return { success: false, error: { code: error.code, message: error.message } };
    }
  },

  async obtenerReservaAprobadaReciente(uid) {
    const resultado = await this.obtenerReservasPorUsuario(uid);
    if (!resultado.success) return resultado;

    const aprobada = (resultado.data || []).find(r => r.estadoPago === 'Aprobado');
    return {
      success: true,
      data: aprobada || null
    };
  },

   async obtenerReservasAprobadas(uid) {
    const resultado = await this.obtenerReservasPorUsuario(uid);
    if (!resultado.success) return resultado;

    return {
      success: true,
      data: (resultado.data || []).filter(r => r.estadoPago === 'Aprobado')
    };
  },

  // FEATURE-BLOQUEOS-INSTRUCTORES: reservas activas de un instructor en un rango.
  // Usado por ModalBloqueoInstructor para validar conflicto antes de crear bloqueo.
  async obtenerReservasPorInstructor(instructorId, fechaInicio, fechaFin) {
    if (!instructorId) return { success: false, error: { code: 'missing-instructor', message: 'Falta el ID del instructor' } };
    try {
      const reservasRef = collection(db, 'artifacts', appId, 'public', 'data', 'reservas');
      const q = query(reservasRef, where('instructorId', '==', String(instructorId)));
      const snap = await getDocs(q);
      const reservas = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(r => {
          if (r.estadoPago !== 'Pendiente' && r.estadoPago !== 'Aprobado') return false;
          if (r.estadoCurso === 'Aprobado' || r.estadoCurso === 'Completado') return false;
          const enRango = (f) => f && f >= fechaInicio && f <= fechaFin;
          return enRango(r.fecha) || enRango(r.fecha2);
        });
      return { success: true, data: reservas };
    } catch (error) {
      return { success: false, error: { code: error.code, message: error.message } };
    }
  },

  // A2.6: reservas canceladas (por pago no coincidente). Ya vienen ordenadas
  // por createdAt desc desde obtenerReservasPorUsuario. La primera es la más reciente.
  async obtenerReservasCanceladas(uid) {
    const resultado = await this.obtenerReservasPorUsuario(uid);
    if (!resultado.success) return resultado;

    return {
      success: true,
      data: (resultado.data || []).filter(r => r.estadoPago === 'Cancelado')
    };
  },

  async obtenerUltimoBasicoAprobado(uid) {
    const resultado = await this.obtenerReservasAprobadas(uid);
    if (!resultado.success) return resultado;

    const basicos = (resultado.data || [])
      .filter(r =>
        r.tipoCurso === 'basico_auto' ||
        r.tipoCurso === 'basico_sincro'
      )
      .sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() || 0;
        const tb = b.createdAt?.toMillis?.() || 0;
        return tb - ta;
      });

    return {
      success: true,
      data: basicos[0] || null
    };
  },

   async corregirReferenciaPago(reservaId, nuevaRef) {
    if (!reservaId || !nuevaRef || nuevaRef.length !== 4) {
      return { success: false, error: { code: 'invalid-args', message: 'Referencia inválida' } };
    }
    try {
      const ref = doc(db, 'artifacts', appId, 'public', 'data', 'reservas', reservaId);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        return { success: false, error: { code: 'not-found', message: 'Reserva no encontrada' } };
      }
      const data = snap.data();

      // Si es una child de pack, actualizar también la maestra (mismo pago)
      if (data.tipoReserva === 'pack_sub' && data.packReservaId) {
        const batch = writeBatch(db);
        batch.update(ref, {
          pagoRef: nuevaRef,
          estadoPago: 'Pendiente'
        });
        const maestraRef = doc(db, 'artifacts', appId, 'public', 'data', 'reservasPack', data.packReservaId);
        batch.update(maestraRef, {
          pagoRef: nuevaRef,
          estadoPago: 'Pendiente',
          rechazadoEn: null
        });
        // FIX-METRICAS-TRIGGER: invalidar caché del estudiante
        batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', data.userId), {
          updatedAt: Timestamp.now()
        });
        await batch.commit();
      } else {
        // Reserva individual normal
        const batch = writeBatch(db);
        batch.update(ref, {
          pagoRef: nuevaRef,
          estadoPago: 'Pendiente'
        });
        // FIX-METRICAS-TRIGGER: invalidar caché del estudiante
        batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', data.userId), {
          updatedAt: Timestamp.now()
        });
        await batch.commit();
      }
       return { success: true };
    } catch (error) {
      return { success: false, error: { code: error.code, message: error.message } };
    }
  },

  // -------------------------------------------------
  // PACK COMERCIAL — Fase 5.2
  // Avanza la maestra cuando el curso actual del pack se completa.
  // Idempotente. Lo llaman instructor (fire-and-forget) y estudiante (reparación).
  // -------------------------------------------------
  async avanzarPackTrasCompletarCurso(packReservaId, childId, cursoActualIndex) {
    if (!packReservaId || !childId || cursoActualIndex === undefined || cursoActualIndex === null) {
      return { success: false, error: { code: 'invalid-args', message: 'Faltan argumentos' } };
    }

    try {
      const maestraRef = doc(db, 'artifacts', appId, 'public', 'data', 'reservasPack', packReservaId);
      const maestraSnap = await getDoc(maestraRef);
      if (!maestraSnap.exists()) {
        return { success: false, error: { code: 'not-found', message: 'Pack no encontrado' } };
      }
      const maestra = maestraSnap.data();
      // Bloqueo por estadoPago (allowlist).
      // El rechazo es reversible (ver Test B), pero hasta que el admin re-apruebe
      // no se debe avanzar el pack. Corta temprano para no ensuciar logs.
      if (maestra.estadoPago !== 'Aprobado') {
        console.log('[avanzarPack] omitido: estadoPago no aprobado →', maestra.estadoPago);
        return { success: true, skipped: true, reason: 'estadoPago-no-aprobado' };
      }

      // Idempotencia 1: cursoActual desactualizado → no-op
      if (maestra.cursoActual !== cursoActualIndex) {
        console.log('[avanzarPack] omitido: cursoActual desactualizado');
        return { success: true, skipped: true, reason: 'cursoActual-desactualizado' };
      }

      // Idempotencia 2: la subReserva actual debe apuntar a la child recibida
      const subActual = (maestra.subReservas || [])[cursoActualIndex];
      if (!subActual || String(subActual.reservaId) !== String(childId)) {
        console.log('[avanzarPack] omitido: childId no coincide con subReservas[actual]');
        return { success: true, skipped: true, reason: 'childId-no-coincide' };
      }

      // Idempotencia 3: la subReserva ya fue avanzada
      if (subActual.estado === 'completado') {
        console.log('[avanzarPack] omitido: subReserva ya completada');
        return { success: true, skipped: true, reason: 'ya-completado' };
      }

      // Validar que la child esté Aprobada
      const childRef = doc(db, 'artifacts', appId, 'public', 'data', 'reservas', childId);
      const childSnap = await getDoc(childRef);
      if (!childSnap.exists()) {
        return { success: false, error: { code: 'child-not-found' } };
      }
      if (childSnap.data().estadoCurso !== 'Aprobado') {
        return { success: false, error: { code: 'child-no-aprobado', message: 'La reserva hija no está Aprobada' } };
      }

      // Pack vencido: no avanzar, marcar como vencido
      const vencimientoMs = maestra.vencimiento?.toMillis?.() || 0;
      if (vencimientoMs > 0 && vencimientoMs < Date.now()) {
        await updateDoc(maestraRef, { estado: 'vencido' });
        console.log('[avanzarPack] pack vencido, marcado como vencido');
        return { success: true, skipped: true, reason: 'pack-vencido' };
      }

      // Construir subReservas actualizado
      const subReservas = [...(maestra.subReservas || [])];
      subReservas[cursoActualIndex] = {
        ...subReservas[cursoActualIndex],
        estado: 'completado'
      };

      const esUltimoCurso = cursoActualIndex >= subReservas.length - 1;

      if (esUltimoCurso) {
        await updateDoc(maestraRef, {
          subReservas,
          estado: 'completado'
        });
        console.log('[avanzarPack] pack completado al 100%');
        return { success: true, completado: true };
      }

      // Activar el siguiente curso
      subReservas[cursoActualIndex + 1] = {
        ...subReservas[cursoActualIndex + 1],
        estado: 'activo'
      };

      await updateDoc(maestraRef, {
        subReservas,
        cursoActual: cursoActualIndex + 1
      });
      console.log('[avanzarPack] pack avanzado al curso', cursoActualIndex + 1);
      return { success: true, nuevoCursoActual: cursoActualIndex + 1 };
    } catch (error) {
      console.error('[avanzarPackTrasCompletarCurso] Error:', error);
      return { success: false, error: { code: error.code, message: error.message } };
    }
  },
};