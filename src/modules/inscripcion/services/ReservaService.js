// Archivo: src/modules/inscripcion/services/ReservaService.js
// @build: 2026-11-23 | id: PROVEEDOR-INACTIVO | desc: Compra/agendamiento bloquean motos de proveedor con activo === false; precios congelados sin cambios.
import { db, auth } from '../../shared/firebase/firebase';
import { collection, doc, runTransaction, updateDoc, getDocs, getDoc, setDoc, deleteDoc, Timestamp, serverTimestamp, query, where, writeBatch, increment, arrayUnion } from 'firebase/firestore';
import { validarInscripcionCompleta } from '../../shared/schemas/validations';
import { cumplePrerequisito } from '../../../constants/cursoSecuencia';
import { LockService } from './LockService';
import { construirSlotsObjetivo, construirLockIds, construirLocksPorSlot, detectarLocksActivos, detectarSolapamiento } from '../utils/solapamientoHelpers';
import { consultarBloqueosGlobalesPorFechas, consultarBloqueosInstructores, consultarLocksTemporalesPorFechas, consultarOcupacionPorFechas } from './ocupacionRepository';
import { detectarBloqueosAgenda } from '../../shared/utils/bloqueosHelpers';
import { resolverTraeMoto, seleccionarValoresCurso, packBloqueaNuevaCompra, calcularRecargoSedePack } from '../utils/packPricing.js';
import { calcularPrecioIndividual, resolverTraeMotoIndividual, resolverTasaFXVigente, calcularPagoTotalVES } from '../utils/precioIndividual.js';
import { resumenAccesoId } from '../../shared/utils/accesoTeoricoResumen';
import { validarCorreccionPago } from '../utils/pagoHelpers';
import { validarInstructorAsignado, validarMotoAsignada, proveedorBloqueado } from '../utils/recursosHelpers';
import { validarInstructorPermitidoCurso } from '../utils/instructoresPermitidos';
import { obtenerFechaVenezuela } from '../../shared/utils/zonahoraria';
import { evaluarSlotPasado, fechaVetHoy } from '../../shared/utils/reservaHelpers.js';
import { emitirEvento } from '../../shared/services/NotificacionesEventos';

const appId = 'motoescuela-pro-v1';

const CAMPOS_OBLIGATORIOS = ['userId', 'cedula', 'fecha', 'horaId', 'cursoId', 'sedeId'];

const rutaCatalogo = (columna) => `artifacts/${appId}/public/data/${columna}`;

/**
 * D11: el servicio no confía en el tutor/moto que vienen del lock o del
 * navegador. Se leen del catálogo antes de la transacción y se falla cerrado
 * con un error claro. `instructoresPublicos` es legible por cualquier
 * autenticado; para datos legacy sin espejo se intenta el documento privado.
 */
async function cargarInstructorParaReserva(instructorId) {
  if (instructorId === null || instructorId === undefined || String(instructorId).trim() === '') {
    return { ok: false, error: { code: 'instructor-requerido', message: 'Selecciona un tutor para este horario.' } };
  }
  const id = String(instructorId);
  try {
    const publicoSnap = await getDoc(doc(db, rutaCatalogo('instructoresPublicos'), id));
    if (publicoSnap.exists()) return { ok: true, data: { id: publicoSnap.id, ...publicoSnap.data() } };
  } catch (error) {
    console.warn('[ReservaService] No se pudo leer instructoresPublicos:', error?.code);
  }
  try {
    const privadoSnap = await getDoc(doc(db, rutaCatalogo('instructores'), id));
    if (privadoSnap.exists()) return { ok: true, data: { id: privadoSnap.id, ...privadoSnap.data() } };
  } catch (error) {
    console.warn('[ReservaService] No se pudo leer instructores:', error?.code);
    return { ok: false, error: { code: 'instructor-no-verificable', message: 'No pudimos verificar tu tutor. Revisa tu sesión e intenta de nuevo.' } };
  }
  return { ok: false, error: { code: 'instructor-not-found', message: 'El tutor seleccionado ya no existe. Elige otro horario.' } };
}

async function cargarMotoParaReserva(motoId) {
  if (motoId === null || motoId === undefined || String(motoId).trim() === '') {
    return { ok: true, data: null };
  }
  try {
    const snap = await getDoc(doc(db, rutaCatalogo('motos'), String(motoId)));
    if (snap.exists()) return { ok: true, data: { id: snap.id, ...snap.data() } };
    return { ok: false, error: { code: 'moto-not-found', message: 'La moto asignada ya no existe. Elige otro horario.' } };
  } catch (error) {
    console.error('[ReservaService] Error leyendo moto:', error);
    return { ok: false, error: { code: 'moto-no-verificable', message: 'No pudimos verificar la moto asignada. Revisa tu conexión e intenta de nuevo.' } };
  }
}

/**
 * Decisión del Operador (2026-11-23): carga el proveedor de la moto asignada
 * para bloquear la venta si `activo === false`.
 *
 * Fuente: espejo público `proveedoresPublicos/{id}` (`{ id, activo }`), legible
 * por cualquier autenticado. No se lee la colección privada `proveedores`, que
 * solo es legible por admin o por el propio proveedor (`firestore.rules`).
 *
 * Política ante fallos (documentada):
 *  - Doc inexistente → tolerante (`data: null`). No se puede afirmar que el
 *    proveedor esté inactivo y hay motos legacy sin doc de espejo. La regla de
 *    Firestore de la reserva individual sigue siendo la autoridad (exige el
 *    doc y `activo != false`); en packs la validación es defensa en
 *    profundidad.
 *  - Error de red o `permission-denied` → tolerante con warn. Fallar cerrado
 *    aquí rompería todo el registro público. Una sola lectura por creación.
 */
async function cargarProveedorParaReserva(proveedorId) {
  const id = proveedorId === null || proveedorId === undefined ? '' : String(proveedorId).trim();
  if (!id) return { ok: true, data: null };
  try {
    const snap = await getDoc(doc(db, rutaCatalogo('proveedoresPublicos'), id));
    if (snap.exists()) return { ok: true, data: { id: snap.id, ...snap.data() } };
    return { ok: true, data: null };
  } catch (err) {
    // `permission-denied` es esperado si cambia la política del espejo. No se
    // registra para no llenar la consola en cada registro.
    if (err?.code !== 'permission-denied') {
      console.warn('[ReservaService] Proveedor de la moto no verificable:', err?.code);
    }
    return { ok: true, data: null };
  }
}

async function validarRecursosReserva({ instructorId, motoId, sedeId, curso, exigirPermitidosCurso = false, requiereMoto = false }) {
  const [instructor, moto] = await Promise.all([
    cargarInstructorParaReserva(instructorId),
    cargarMotoParaReserva(motoId)
  ]);
  if (!instructor.ok) return { ok: false, error: instructor.error };
  if (!moto.ok) return { ok: false, error: moto.error };

  const checkInstructor = validarInstructorAsignado({ instructor: instructor.data, sedeId });
  if (!checkInstructor.ok) return { ok: false, error: { code: checkInstructor.code, message: checkInstructor.message } };

  // D10/T-054: packs e inscripción individual fallan cerrado si el curso no
  // declara `instructoresPermitidos`; las reglas de Firestore ya lo exigen.
  if (exigirPermitidosCurso) {
    const checkPermitido = validarInstructorPermitidoCurso({ curso, instructorId });
    if (!checkPermitido.ok) {
      return { ok: false, error: { code: checkPermitido.code, message: checkPermitido.message } };
    }
  }

  // ERR-049: la variante "moto de la app" no puede confirmarse sin moto.
  if (requiereMoto && !motoId) {
    return {
      ok: false,
      error: {
        code: 'moto-requerida',
        message: 'Este curso usa moto de Moto App. Elige una moto para continuar.'
      }
    };
  }

  const checkMoto = validarMotoAsignada({ moto: moto.data, motoId, sedeId, curso });
  if (!checkMoto.ok) return { ok: false, error: { code: checkMoto.code, message: checkMoto.message } };

  // Decisión del Operador (2026-11-23): un proveedor con `activo === false`
  // no puede vender. Se valida el proveedor de la MOTO asignada (autoridad,
  // no el `proveedorId` del navegador), en una sola lectura por creación.
  // Sin moto (moto propia o curso sin moto) no aplica.
  const proveedorIdMoto = moto.data?.proveedorId;
  if (proveedorIdMoto) {
    const proveedor = await cargarProveedorParaReserva(proveedorIdMoto);
    if (proveedorBloqueado(proveedor.data)) {
      return {
        ok: false,
        error: {
          code: 'proveedor-inactivo',
          message: 'La moto asignada pertenece a un proveedor inactivo. Elige otro horario.'
        }
      };
    }
  }

  return { ok: true, data: { instructor: instructor.data, moto: moto.data } };
}

/**
 * D10: el curso del pack se lee del catálogo (autoridad), no del snapshot
 * que envía el navegador. Sin catálogo verificable se falla cerrado.
 */
async function cargarCursoParaPack(cursoId) {
  const id = cursoId === null || cursoId === undefined ? '' : String(cursoId).trim();
  const error = (code, message) => ({ ok: false, error: { code, message } });
  if (!id) return error('curso-no-verificable', 'No pudimos validar el curso del pack. Contacta a administración.');

  try {
    const snap = await getDoc(doc(db, rutaCatalogo('cursos'), id));
    if (!snap.exists()) {
      return error('curso-no-verificable', 'El curso del pack ya no existe. Contacta a administración.');
    }
    return { ok: true, data: { id: snap.id, ...snap.data() } };
  } catch (err) {
    console.error('[ReservaService] Error leyendo curso del pack:', err);
    return error('curso-no-verificable', 'No pudimos verificar el curso del pack. Revisa tu conexión e intenta de nuevo.');
  }
}

// ⚠️ NO DESACTIVAR EN PROD: previene solapamiento de reservas (BUG-2).
// Kill-switch de build: si se desactiva, el cross-check se omite (solo para rollback operativo).
const SOLAPAMIENTO_CROSSCHECK_ENABLED = true;

// ERR-046: los bloqueos de proveedor guardan horaInicio/horaFin, no `horaId`.
// Se carga el label del horario para aplicar `afectaProveedor` sin duplicar
// su parser. Si el label falta, la validación de bloqueos falla cerrada.
async function cargarHoraLabels(horaIds = []) {
  const unicos = [...new Set((horaIds || []).filter(Boolean).map(String))];
  const entradas = await Promise.all(unicos.map(async (horaId) => {
    try {
      const snap = await getDoc(doc(db, rutaCatalogo('horarios'), horaId));
      return [horaId, snap.exists() ? (snap.data().label || null) : null];
    } catch (error) {
      console.warn('[SOLAPAMIENTO] No se pudo leer el horario', { horaId, code: error?.code });
      return [horaId, null];
    }
  }));
  return new Map(entradas);
}

/**
 * ERR-051: guard fail-closed de horario vencido antes de la transacción.
 * - fecha pasada (VET) => `slot-past` sin necesidad de label;
 * - fecha futura => permitido;
 * - hoy => se lee el label con `cargarHoraLabels`; si no se puede leer se
 *   rechaza `slot-no-verificable`; si el bloque ya inició, `slot-past`.
 * Al rechazar se libera el lock para no retener cupo inservible.
 */
async function validarSlotNoVencido({ fecha, horaId, lockId }) {
  const ahora = new Date();
  const hoy = fechaVetHoy(ahora);
  let label = null;
  if (fecha === hoy && horaId) {
    const labels = await cargarHoraLabels([horaId]);
    label = labels.get(String(horaId)) || null;
  }
  const resultado = evaluarSlotPasado({ fecha, label, ahora });
  if (!resultado.ok && lockId) {
    await LockService.liberarLock(lockId).catch(err => {
      console.warn('[ReservaService] No se pudo liberar el lock vencido', {
        lockId,
        error: err?.message
      });
    });
  }
  return resultado;
}

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
  horaId2 = null,
  instructorId = null,
  motoAsignadaId = null,
  motoProveedorId = null,
  sedeId = null,
  userId = null,
  lockId = null,
  contexto = 'reserva'
}) {
  if (!SOLAPAMIENTO_CROSSCHECK_ENABLED) {
    console.error('[SOLAPAMIENTO] Kill-switch desactivado; cross-check omitido.', { contexto });
    return { ok: true };
  }

  const slots = construirSlotsObjetivo({ fecha, fecha2, horaId, horaId2 });
  if (slots.length === 0 || !instructorId) return { ok: true };

  const fechas = [...new Set(slots.map(s => s.fecha))];
  const traceId = `SOL-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  try {
    const [ocupacion, locks, bloqueosGlobales, bloqueosInstructores, labels] = await Promise.all([
      consultarOcupacionPorFechas(fechas),
      consultarLocksTemporalesPorFechas(fechas),
      motoAsignadaId
        ? consultarBloqueosGlobalesPorFechas(fechas)
        : Promise.resolve({ bloqueos: [], truncado: false }),
      instructorId
        ? consultarBloqueosInstructores(instructorId)
        : Promise.resolve({ bloqueos: [], truncado: false }),
      cargarHoraLabels(slots.map(s => s.bloqueId))
    ]);

    if (ocupacion.truncado || locks.truncado || bloqueosGlobales.truncado || bloqueosInstructores.truncado) {
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

    // ERR-046: la UI ya descarta bloqueos de agenda, pero la creación debe
    // volver a validarlos. Sin label no se puede evaluar un bloqueo de
    // proveedor: fail-closed solo si existen bloqueos que revisar.
    const slotsConLabel = slots.map(slot => ({
      ...slot,
      horaLabel: labels.get(String(slot.bloqueId)) || null
    }));
    const hayBloqueosProveedor = Boolean(motoAsignadaId) && bloqueosGlobales.bloqueos.length > 0;
    if (hayBloqueosProveedor && slotsConLabel.some(slot => !slot.horaLabel)) {
      console.error('[SOLAPAMIENTO] Bloqueo de proveedor sin label de horario; fail-closed.', {
        traceId,
        contexto,
        fechas
      });
      return {
        ok: false,
        error: {
          code: 'ocupacion-no-verificable',
          message: 'No pudimos verificar la disponibilidad. Intenta de nuevo en unos segundos.',
          traceId
        }
      };
    }

    let motoProveedorIdResuelto = motoProveedorId;
    if (motoAsignadaId && !motoProveedorIdResuelto && hayBloqueosProveedor) {
      try {
        const motoSnap = await getDoc(doc(db, rutaCatalogo('motos'), String(motoAsignadaId)));
        if (motoSnap.exists()) motoProveedorIdResuelto = motoSnap.data().proveedorId || null;
      } catch (error) {
        console.warn('[SOLAPAMIENTO] No se pudo resolver el proveedor de la moto', {
          traceId,
          motoAsignadaId,
          code: error?.code
        });
      }
    }

    const conflictosAgenda = detectarBloqueosAgenda({
      slots: slotsConLabel,
      instructorId,
      motoId: motoAsignadaId,
      motoProveedorId: motoProveedorIdResuelto,
      sedeId,
      bloquesGlobales: bloqueosGlobales.bloqueos,
      bloquesInstructores: bloqueosInstructores.bloqueos
    });

    if (conflictosAgenda.length > 0) {
      console.warn('[SOLAPAMIENTO] Agenda bloqueada', { traceId, contexto, conflictosAgenda });

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
          code: 'slot-blocked',
          message: 'Ese horario está bloqueado en la agenda. Elige otro bloque.',
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

    if (!cursoData) {
      return { success: false, error: { code: 'course-not-found', message: 'El curso seleccionado no existe o no está disponible.' } };
    }

    // B-RESERVA-PRECIOS-CLIENTE: el precio individual se calcula desde el
    // catálogo (curso + configuración + sede) y se congela en la reserva.
    // Nunca se usa el monto ni las comisiones que envía el navegador.
    let configData = null;
    let sedeData = null;
    try {
      const [configSnap, sedeSnap] = await Promise.all([
        getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'configuraciones', 'main')),
        getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sedes', String(reservaData.sedeId)))
      ]);
      if (!configSnap.exists() || !sedeSnap.exists()) {
        return {
          success: false,
          error: { code: 'price-config-missing', message: 'No pudimos validar el precio del curso. Intenta de nuevo o contacta a soporte.' }
        };
      }
      configData = configSnap.data();
      sedeData = { id: sedeSnap.id, ...sedeSnap.data() };
    } catch (err) {
      console.error('[crearReserva] Error cargando catálogo de precios:', err);
      return {
        success: false,
        error: { code: 'price-config-unavailable', message: 'No pudimos validar el precio del curso. Revisa tu conexión e intenta de nuevo.' }
      };
    }

    const traeMotoResuelto = resolverTraeMotoIndividual(cursoData, reservaData.traeMoto);
    let precioSnapshot;
    try {
      precioSnapshot = calcularPrecioIndividual({
        curso: cursoData,
        config: configData,
        sede: sedeData,
        sedeId: reservaData.sedeId,
        sabeBicicleta: reservaData.sabeBicicleta,
        traeMoto: traeMotoResuelto,
        calculadoEn: new Date().toISOString(),
        calculadoPor: reservaData.userId,
        origen: reservaData.origenReinscripcion || 'nueva'
      });
    } catch (err) {
      console.error('[crearReserva] Precio individual inválido:', err);
      return {
        success: false,
        error: { code: 'invalid-price', message: err.message || 'El precio del curso no es válido.' }
      };
    }

    // Si el catálogo cambió mientras el estudiante completaba el formulario,
    // no se cobra un monto distinto al mostrado: se pide confirmar de nuevo.
    const precioMostrado = Number(reservaData.pagoTotalMoneda);
    if (Number.isFinite(precioMostrado) && Math.abs(precioMostrado - precioSnapshot.precioTotal) > 0.009) {
      return {
        success: false,
        error: {
          code: 'price-changed',
          message: 'El precio del curso cambió. Revisa el monto actualizado y confirma de nuevo.'
        }
      };
    }

    // BUG-2: cross-check de ocupacion antes de entrar a la transaccion.
    const motoObjetivo = (traeMotoResuelto === 'Sí' || cursoData?.motoIncluida === false) ? null : (reservaData.motoAsignadaId || null);

    // D11: el lock/payload no es autoridad sobre el catálogo. Tutor y moto se
    // revalidan (existencia, activo, sede y tipo) antes de consumir el lock.
    const validacionRecursos = await validarRecursosReserva({
      instructorId: reservaData.instructorId,
      motoId: motoObjetivo,
      sedeId: reservaData.sedeId,
      curso: cursoData,
      // T-054: la regla individual exige la allowlist del curso (fail-closed).
      exigirPermitidosCurso: true,
      // ERR-054: la variante "moto de la app" no se confirma sin moto.
      requiereMoto: traeMotoResuelto !== 'Sí'
    });
    if (!validacionRecursos.ok) return { success: false, error: validacionRecursos.error };

    const chequeoOcupacion = await validarDisponibilidadAntesDeCrear({
      fecha: reservaData.fecha,
      fecha2: reservaData.fecha2 || null,
      horaId: reservaData.horaId,
      horaId2: reservaData.horaId2 || null,
      instructorId: reservaData.instructorId || null,
      motoAsignadaId: motoObjetivo,
      motoProveedorId: validacionRecursos.data?.moto?.proveedorId || null,
      sedeId: reservaData.sedeId,
      userId: reservaData.userId,
      lockId,
      contexto: 'crearReserva'
    });
    if (!chequeoOcupacion.ok) return { success: false, error: chequeoOcupacion.error };

    // ERR-051: un bloque ya iniciado no se puede reservar.
    const guardSlot = await validarSlotNoVencido({
      fecha: reservaData.fecha,
      horaId: reservaData.horaId,
      lockId
    });
    if (!guardSlot.ok) return { success: false, error: guardSlot.error };

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

        // ERR-048: una sesión de 2 días exige que el lock retenga D2. Un lock
        // D1-only (legacy o incompleto) no autoriza la reserva: fail-closed.
        if (reservaData.fecha2 && String(reservaData.fecha2) !== String(reservaData.fecha)) {
          const lockFecha2 = lockData.fecha2 || null;
          if (!lockFecha2 || String(lockFecha2) !== String(reservaData.fecha2)) {
            throw crearError('lock-date-mismatch', 'El bloqueo no cubre la fecha del segundo día. Elige otro horario.');
          }
          const lockHora2 = lockData.horaId2 || lockData.horaId;
          const reservaHora2 = reservaData.horaId2 || reservaData.horaId;
          if (String(lockHora2) !== String(reservaHora2)) {
            throw crearError('lock-date-mismatch', 'El bloqueo no cubre el horario del segundo día. Elige otro horario.');
          }
        }

        // Los locks nuevos se escriben con IDs por instructor y por moto.
        // En una transacción no se pueden hacer queries, pero sí leer los
        // documentos deterministas: así se cierra la ventana de carrera.
        const lockIds = construirLockIds({
          lockId,
          fecha: lockData.fecha,
          fecha2: lockData.fecha2 || null,
          horaId: lockData.horaId,
          horaId2: lockData.horaId2 || null,
          instructorId: lockData.instructorId,
          motoAsignadaId: lockData.motoAsignadaId
        });
        const recursosEsperados = (lockData.esquema === 'recursos-v1' || lockData.fecha2)
          ? lockIds
          : [lockId];
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
          tipoCurso: typeof reservaData.tipoCurso === 'string' ? reservaData.tipoCurso.trim() : null,
          sedeId: reservaData.sedeId,
          tipoMoto: reservaData.tipoMoto,
          fecha: reservaData.fecha,
          fecha2: reservaData.fecha2 || null,
          horaId: reservaData.horaId,
          instructorId: reservaData.instructorId,
          // Moto propia: sin moto escolar ni proveedor, para cumplir la regla de comisión.
          motoAsignadaId: (traeMotoResuelto === 'Sí' || cursoData?.motoIncluida === false)
            ? null
            : (reservaData.motoAsignadaId || null),
          // FIX-PERMITE-TRAER-MOTO: la modalidad sale del catálogo, no del payload.
          traeMoto: traeMotoResuelto,
          sabeBicicleta: reservaData.sabeBicicleta,
          fechaNacimiento: reservaData.fechaNacimiento,
          // Precio y comisiones: snapshot inmutable calculado desde el catálogo.
          pagoTotalMoneda: precioSnapshot.precioTotal,
          pagoTotalVES: precioSnapshot.pagoTotalVES,
          pagoBanco: reservaData.pagoBanco,
          pagoTelefono: reservaData.pagoTelefono,
          pagoCedula: reservaData.pagoCedula,
          pagoRef: reservaData.pagoRef,
          id: reservaDoc.id,
          lockId,
          estadoPago: 'Pendiente',
          estadoCurso: 'Pendiente',
          precio: precioSnapshot.precioTotal,
          // B-04: el proveedor sale de la moto validada (autoridad del catálogo),
          // no del `proveedorId` que envía el navegador. Sin moto no hay proveedor.
          proveedorId: motoObjetivo
            ? (validacionRecursos.data?.moto?.proveedorId || null)
            : null,
          pin: reservaData.pin || null,
          comisionInstructor: precioSnapshot.comisionInstructor,
          comisionProveedor: precioSnapshot.comisionProveedor,
          deficitComision: precioSnapshot.deficitComision,
          precioSnapshot,
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
          estadoCurso: datosReserva.estadoCurso || 'Pendiente',
          pagadoProveedor: false,
          pagoProveedorId: null,
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

      const actorUid = auth.currentUser?.uid || null;
      if (actorUid) {
        void emitirEvento({
          tipo: 'reserva_creada',
          entidadTipo: 'reserva',
          entidadId: reservaDoc.id,
          actorUid,
          token: 'nueva',
          datos: {
            reservaId: reservaDoc.id,
            instructorId: datosReserva.instructorId || null,
            proveedorId: datosReserva.proveedorId || null,
          },
        });
      }

      return { success: true, data: { id: reservaDoc.id } };
    } catch (error) {
      const codigo = error.code || 'transaction-failed';
      // Un lock que no autorizó la reserva (vencido, corrupto, de otro usuario
      // o que no coincide) queda inservible: liberarlo evita que el cupo
      // aparezca ocupado hasta 10 min sin que nadie esté pagando (ERR-010).
      if (['slot-occupied', 'lock-expired', 'lock-invalid', 'lock-mismatch', 'lock-date-mismatch', 'lock-resource-mismatch', 'lock-owner-mismatch'].includes(codigo)) {
        await LockService.liberarLock(lockId).catch(() => {});
      }
      return {
        success: false,
        error: {
          code: codigo,
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
    let packPreData = null;
    // ERR-020: `cursoIdsNuevo` se usa dentro de la transacción; debe vivir en
    // el ámbito de la función y no dentro del try (ReferenceError previo).
    let cursoIdsNuevo = [];
    try {
      const rpRef = collection(db, 'artifacts', appId, 'public', 'data', 'reservasPack');
      const rpQ = query(rpRef, where('userId', '==', usuarioActual.uid));
      const rpSnap = await getDocs(rpQ);
      const packSnapPre = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'packs', packData.packId));
      packPreData = packSnapPre.exists() ? packSnapPre.data() : null;
      cursoIdsNuevo = packPreData ? (packPreData.cursoIds || []) : [];
      if (cursoIdsNuevo.length > 0) {
        const yaTiene = rpSnap.docs.some(d => packBloqueaNuevaCompra(d.data()));
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
      horaId2: packData.horaId2 || null,
      instructorId: packData.instructorId || null,
      motoAsignadaId: packData.motoAsignadaId || null,
      sedeId: packData.sedeId || null,
      userId: usuarioActual.uid,
      lockId,
      contexto: 'crearReservaPack'
    });
    if (!chequeoOcupacion.ok) return { success: false, error: chequeoOcupacion.error };

    // ERR-051: un bloque ya iniciado no se puede comprar en pack.
    const guardSlot = await validarSlotNoVencido({
      fecha: packData.fecha || null,
      horaId: packData.horaId || null,
      lockId
    });
    if (!guardSlot.ok) return { success: false, error: guardSlot.error };

    // B-FX-CONCILIACION: la tasa del pack se congela desde la configuración,
    // nunca desde el payload del navegador.
    let configData = null;
    try {
      const configSnap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'configuraciones', 'main'));
      if (!configSnap.exists()) {
        return { success: false, error: { code: 'fx-config-missing', message: 'No pudimos validar la tasa de cambio. Intenta de nuevo o contacta a soporte.' } };
      }
      configData = configSnap.data();
    } catch (err) {
      console.error('[crearReservaPack] Error cargando tasas:', err);
      return { success: false, error: { code: 'fx-config-unavailable', message: 'No pudimos validar la tasa de cambio. Revisa tu conexión e intenta de nuevo.' } };
    }
    const tasaFX = resolverTasaFXVigente(configData);

    // ERR-053 / ADR-017: el recargo de sede sale del catálogo autoritativo,
    // nunca del payload del navegador.
    let recargoSedeUnitario = 0;
    if (packData.sedeId != null && packData.sedeId !== '') {
      const sedeSnap = await getDoc(
        doc(db, 'artifacts', appId, 'public', 'data', 'sedes', String(packData.sedeId))
      );
      if (!sedeSnap.exists()) {
        return { success: false, error: { code: 'sede-no-valida', message: 'La sede elegida ya no está disponible.' } };
      }
      recargoSedeUnitario = Math.max(0, Number(sedeSnap.data()?.recargo) || 0);
    }

    // D11: revalidar el tutor y la moto efectiva del primer curso del pack
    // antes de consumir el lock. La moto sale del snapshot congelado, no del
    // payload del navegador.
    if (packPreData) {
      const preciosPre = packPreData.precios;
      const cursoEqPre = (preciosPre?.cursoIds || [])
        .map(cid => (packData.cursoSnapshot || []).find(c => String(c.id) === String(cid)))
        .filter(Boolean)[0] || null;
      const traeMotoPre = cursoEqPre
        ? resolverTraeMoto(preciosPre, 0, cursoEqPre.id, packData.traeMotoPorCurso)
        : 'Sí';
      const motoEfectivaPre = (traeMotoPre === 'Sí' || !cursoEqPre) ? null : (packData.motoAsignadaId || null);
      // D10: curso autoritativo del catálogo (no el snapshot del navegador).
      const cursoIdPre = (preciosPre?.cursoIds || [])[0] ?? cursoEqPre?.id;
      const cursoAutoridadPre = await cargarCursoParaPack(cursoIdPre);
      if (!cursoAutoridadPre.ok) return { success: false, error: cursoAutoridadPre.error };
      const validacionRecursos = await validarRecursosReserva({
        instructorId: packData.instructorId,
        motoId: motoEfectivaPre,
        sedeId: packData.sedeId,
        curso: cursoAutoridadPre.data,
        exigirPermitidosCurso: true,
        requiereMoto: traeMotoPre !== 'Sí'
      });
      if (!validacionRecursos.ok) return { success: false, error: validacionRecursos.error };
    }

    const packRef = doc(db, 'artifacts', appId, 'public', 'data', 'packs', packData.packId);
    // Lock transaccional por usuario: evita doble compra por doble submit.
    const packLockRef = doc(db, 'packActivo', usuarioActual.uid);
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

        // B-PACK-DOBLE-COMPRA: el lock por usuario se lee y se escribe dentro
        // de la misma transacción; dos compras concurrentes se serializan.
        if (cursoIdsNuevo.length > 0) {
          const lockSnap = await transaction.get(packLockRef);
          if (lockSnap.exists()) {
            const prevId = lockSnap.data().packReservaId;
            if (prevId) {
              const prevMasterSnap = await transaction.get(doc(db, 'artifacts', appId, 'public', 'data', 'reservasPack', prevId));
              if (prevMasterSnap.exists() && packBloqueaNuevaCompra(prevMasterSnap.data())) {
                throw new Error('Ya tienes un pack de sesiones activo. Termínalo antes de comprar otro.');
              }
            }
          }
        }

        // 2. Leer y validar lock
        const lockSnap = await transaction.get(lockRef);
        if (!lockSnap.exists()) {
          throw new Error('El horario ya no está disponible');
        }
        const lockData = lockSnap.data();
        const lockIds = (lockData.esquema === 'recursos-v1' || lockData.fecha2)
          ? construirLockIds({ lockId, ...lockData })
          : [lockId];
        const lockExpirado = !lockData.expiresAt || lockData.expiresAt.toMillis() <= Date.now();
        const lockCorrupto = !lockData.userId || !lockData.instructorId || !lockData.fecha || !lockData.horaId;
        if (lockExpirado) throw new Error('El tiempo para completar la reserva expiró. Elige otro horario.');
        if (lockCorrupto) throw new Error('El bloqueo del horario es inválido. Elige otro horario.');
        if (String(lockData.userId) !== String(usuarioActual.uid)) {
          throw new Error('El horario está bloqueado por otro usuario');
        }

        // ERR-048: el pack puede cubrir 2 días. Si la reserva declara fecha2,
        // el lock debe declararla y retener D2; un lock D1-only falla cerrado.
        if (packData.fecha2 && String(packData.fecha2) !== String(packData.fecha)) {
          if (!lockData.fecha2 || String(lockData.fecha2) !== String(packData.fecha2)) {
            throw new Error('El bloqueo no cubre la fecha del segundo día. Elige otro horario.');
          }
        }

        // Verifica que D2 (principal + IDs por recurso) siga siendo del usuario
        // antes de purgarlo. D1 ya quedó validado con el lock principal.
        const docsD2 = lockData.fecha2
          ? construirLocksPorSlot({ lockId, ...lockData })
            .filter(doc => String(doc.fecha) === String(lockData.fecha2))
          : [];
        for (const docD2 of docsD2) {
          const recursoSnap = await transaction.get(doc(db, 'locks', docD2.id));
          if (!recursoSnap.exists() || String(recursoSnap.data().userId) !== String(usuarioActual.uid)) {
            throw new Error('El bloqueo del segundo día cambió. Elige otro horario.');
          }
        }

        // PACK-CHILD-C: el ID determinista garantiza una sola child por pack+índice.
        const childSnap = await transaction.get(childRef);
        if (childSnap.exists()) {
          throw new Error('La sesión inicial de este pack ya fue creada');
        }

        // 3. Resolver cursos y precios congelados del pack (SSOT admin)
        const preciosPack = pack.precios;
        if (!preciosPack || !Array.isArray(preciosPack.cursoIds) || preciosPack.cursoIds.length === 0) {
          throw new Error('El pack no tiene snapshot de precios. Contacta al administrador.');
        }
        const cursosPack = preciosPack.cursoIds.map(cid =>
          packData.cursoSnapshot?.find(c => String(c.id) === String(cid)) || null
        ).filter(Boolean);
        if (
          cursosPack.length !== preciosPack.cursoIds.length ||
          !Array.isArray(preciosPack.preciosProrrateados) ||
          preciosPack.preciosProrrateados.length !== cursosPack.length
        ) {
          throw new Error('El snapshot de cursos o precios del pack está incompleto. Recarga e intenta de nuevo.');
        }

        // ERR-053 / ADR-017: recargo de sede por sesión práctica, después del
        // descuento del pack. El snapshot base del pack no cambia.
        const recargoPack = calcularRecargoSedePack({
          sesiones: preciosPack.cursoIds.length,
          recargoSede: recargoSedeUnitario,
        });
        const precioTotalPack = Number(
          (Number(preciosPack.precioTotal) + recargoPack.recargoSedeTotal).toFixed(2)
        );

        // FX congelado del pack: total USD (con recargo) × tasa vigente.
        const pagoTotalVESPack = calcularPagoTotalVES(precioTotalPack, tasaFX);
        const fxCongelado = {
          version: 1,
          monedaBase: 'USD',
          monedaCobro: String(configData?.monedaCobroClientes || 'EUR'),
          tasaFX,
          pagoTotalVES: pagoTotalVESPack,
          calculadoEn: new Date().toISOString(),
          calculadoPor: usuarioActual.uid,
          origen: 'pack-compra'
        };

        const cursoEq = cursosPack[0];
        const precioEqBase = Number(preciosPack.preciosBase?.[0] ?? 0);
        const precioEqProrrateado = Number(preciosPack.preciosProrrateados?.[0] ?? 0);
        const descuentoEqAplicado = Number((precioEqBase - precioEqProrrateado).toFixed(2));
        const traeMotoEq = resolverTraeMoto(preciosPack, 0, cursoEq.id, packData.traeMotoPorCurso);
        const valoresEq = seleccionarValoresCurso(preciosPack, 0, traeMotoEq, {
          motoAsignadaId: packData.motoAsignadaId,
          proveedorId: packData.proveedorId
        });
        const recargoEq = recargoPack.recargoSedeUnitario;
        const precioEqConRecargo = Number((valoresEq.precio + recargoEq).toFixed(2));
        const deficitEqConRecargo = Number((valoresEq.deficitComision - recargoEq).toFixed(2));

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
            cursoIds: preciosPack.cursoIds,
            sedesPermitidas: pack.sedesPermitidas || [],
            cursosTeoricosIncluidos: preciosPack.teoricosIds || [],
            descuentoTipo: preciosPack.descuentoTipo,
            descuentoValor: Number(preciosPack.descuentoValor) || 0,
            vencimientoDias
          },
          preciosCongelados: {
            ...preciosPack,
            recargoSedeUnitario: recargoPack.recargoSedeUnitario,
            recargoSedeTotal: recargoPack.recargoSedeTotal,
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
          precioBaseCongelado: Number(preciosPack.precioBaseTotal) || 0,
          descuentoCongelado: {
            tipo: preciosPack.descuentoTipo,
            valor: Number(preciosPack.descuentoValor) || 0,
            monto: Number(preciosPack.descuentoMonto) || 0
          },
          precioTotalCongelado: precioTotalPack,
          recargoSedeUnitario: recargoPack.recargoSedeUnitario,
          recargoSedeTotal: recargoPack.recargoSedeTotal,
          fechaCompra: Timestamp.now(),
          vencimiento: Timestamp.fromMillis(vencimientoMs),
          estado: 'activo',
          estadoPago: 'Pendiente',
          cursoActual: 0,
          cursoReservaId: childRef.id,
          sedeId: packData.sedeId || null,
          tipoMoto: packData.tipoMoto || null,
          traeMotoPorCurso: packData.traeMotoPorCurso || {},
          pagoTotalMoneda: precioTotalPack,
          pagoTotalVES: pagoTotalVESPack,
          fxCongelado,
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

        if (cursoIdsNuevo.length > 0) {
          transaction.set(packLockRef, {
            userId: usuarioActual.uid,
            packReservaId: maestraRef.id,
            updatedAt: serverTimestamp()
          }, { merge: true });
        }

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
          estadoId: packData.estadoId || null,
          municipio: packData.municipio || null,
          municipioId: packData.municipioId || null,
          ciudad: packData.ciudad || null,
          ciudadId: packData.ciudadId || null,
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
          motoAsignadaId: valoresEq.motoAsignadaId,
          // A+: la configuración de moto y la comisión vienen del snapshot del pack.
          traeMoto: traeMotoEq,
          sabeBicicleta: 'No', // implícito por pack
          proveedorId: valoresEq.proveedorId,
          pagoTotalMoneda: precioEqConRecargo,
          // VES prorrateado del child con la tasa congelada de la maestra.
          pagoTotalVES: calcularPagoTotalVES(precioEqConRecargo, tasaFX),
          pagoBanco: packData.pagoBanco || null,
          pagoTelefono: packData.pagoTelefono || null,
          pagoCedula: packData.pagoCedula || null,
          pagoRef: packData.pagoRef || null,
          id: childRef.id,
          createdAt: Timestamp.now(),
          estadoPago: 'Pendiente',
          estadoCurso: 'Pendiente',
          precio: precioEqConRecargo,
          precioBaseOriginal: valoresEq.precioBaseOriginal,
          descuentoAplicado: descuentoEqAplicado,
          comisionInstructor: valoresEq.comisionInstructor,
          comisionProveedor: valoresEq.comisionProveedor,
          deficitComision: deficitEqConRecargo,
          comisionAbsorbidaPorNegocio: deficitEqConRecargo,
          recargoSede: recargoEq,
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
          estadoCurso: datosChild.estadoCurso || 'Pendiente',
          pagadoProveedor: false,
          pagoProveedorId: null,
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

      const actorUid = auth.currentUser?.uid || null;
      if (actorUid && childIdFinal) {
        void emitirEvento({
          tipo: 'reserva_creada',
          entidadTipo: 'reserva',
          entidadId: childIdFinal,
          actorUid,
          token: 'nueva',
          datos: { reservaId: childIdFinal, packReservaId: maestraIdFinal },
        });
      }

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

    // D11: revalidar tutor y moto efectivos antes de consumir el lock. La moto
    // sale de los precios congelados de la maestra, no del payload.
    let recursosPre = null;
    try {
      const maestraPreSnap = await getDoc(maestraRef);
      if (maestraPreSnap.exists()) {
        const maestraPre = maestraPreSnap.data();
        const cursoDataPre = packData.cursoSnapshot;
        const cursoActualPre = Number(maestraPre.cursoActual ?? 0);
        const preciosPre = maestraPre.preciosCongelados;
        const traeMotoPre = cursoDataPre && preciosPre && Number.isInteger(cursoActualPre)
          ? resolverTraeMoto(preciosPre, cursoActualPre, cursoDataPre.id, packData.traeMotoPorCurso)
          : 'Sí';
        const motoEfectivaPre = traeMotoPre === 'Sí' ? null : (packData.motoAsignadaId || null);
        // D10: curso autoritativo del catálogo (no el snapshot del navegador).
        const cursoIdPre = (maestraPre.subReservas || [])[cursoActualPre]?.cursoId
          ?? preciosPre?.cursoIds?.[cursoActualPre]
          ?? cursoDataPre?.id;
        const cursoAutoridadPre = await cargarCursoParaPack(cursoIdPre);
        if (!cursoAutoridadPre.ok) return { success: false, error: cursoAutoridadPre.error };
        const validacionRecursos = await validarRecursosReserva({
          instructorId: packData.instructorId,
          motoId: motoEfectivaPre,
          sedeId: packData.sedeId || maestraPre.sedeId || null,
          curso: cursoAutoridadPre.data,
          exigirPermitidosCurso: true,
          requiereMoto: traeMotoPre !== 'Sí'
        });
        if (!validacionRecursos.ok) return { success: false, error: validacionRecursos.error };
        recursosPre = validacionRecursos.data;
      }
    } catch (err) {
      console.error('[agendarSiguienteCursoPack] Error validando recursos:', err);
      return {
        success: false,
        error: { code: 'recursos-no-verificables', message: 'No pudimos verificar el tutor o la moto. Revisa tu conexión e intenta de nuevo.' }
      };
    }

    // BUG-2: cross-check de ocupacion antes de entrar a la transaccion.
    const chequeoOcupacion = await validarDisponibilidadAntesDeCrear({
      fecha: packData.fecha || null,
      fecha2: packData.fecha2 || null,
      horaId: packData.horaId || null,
      horaId2: packData.horaId2 || null,
      instructorId: packData.instructorId || null,
      motoAsignadaId: packData.motoAsignadaId || null,
      motoProveedorId: recursosPre?.moto?.proveedorId || null,
      sedeId: packData.sedeId || null,
      userId: usuarioActual.uid,
      lockId,
      contexto: 'agendarSiguienteCursoPack'
    });
    if (!chequeoOcupacion.ok) return { success: false, error: chequeoOcupacion.error };

    // ERR-051: un bloque ya iniciado no se puede agendar desde un pack.
    const guardSlot = await validarSlotNoVencido({
      fecha: packData.fecha || null,
      horaId: packData.horaId || null,
      lockId
    });
    if (!guardSlot.ok) return { success: false, error: guardSlot.error };

    const crearError = (code, message) => {
      const error = new Error(message);
      error.code = code;
      return error;
    };

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
          throw crearError('slot-occupied', 'El horario ya no está disponible');
        }
        const lockData = lockSnap.data();
        const lockIds = (lockData.esquema === 'recursos-v1' || lockData.fecha2)
          ? construirLockIds({ lockId, ...lockData })
          : [lockId];
        const lockExpirado = !lockData.expiresAt || lockData.expiresAt.toMillis() <= Date.now();
        const lockCorrupto = !lockData.userId || !lockData.instructorId || !lockData.fecha || !lockData.horaId;
        if (lockExpirado) throw crearError('lock-expired', 'El tiempo para completar la reserva expiró. Elige otro horario.');
        if (lockCorrupto) throw crearError('lock-invalid', 'El bloqueo del horario es inválido. Elige otro horario.');
        if (String(lockData.userId) !== String(usuarioActual.uid)) {
          throw crearError('lock-owner-mismatch', 'El horario está bloqueado por otro usuario');
        }

        // ERR-048: si la sesión del pack es de 2 días, el lock debe declarar y
        // retener D2. Un lock D1-only falla cerrado.
        if (packData.fecha2 && String(packData.fecha2) !== String(packData.fecha)) {
          if (!lockData.fecha2 || String(lockData.fecha2) !== String(packData.fecha2)) {
            throw crearError('lock-date-mismatch', 'El bloqueo no cubre la fecha del segundo día. Elige otro horario.');
          }
        }

        // Verifica D2 (principal + IDs por recurso) antes de purgarlo.
        const docsD2 = lockData.fecha2
          ? construirLocksPorSlot({ lockId, ...lockData })
            .filter(doc => String(doc.fecha) === String(lockData.fecha2))
          : [];
        for (const docD2 of docsD2) {
          const recursoSnap = await transaction.get(doc(db, 'locks', docD2.id));
          if (!recursoSnap.exists() || String(recursoSnap.data().userId) !== String(usuarioActual.uid)) {
            throw crearError('lock-resource-mismatch', 'El bloqueo del segundo día cambió. Elige otro horario.');
          }
        }

        // PACK-CHILD-C: verificar que el documento determinista aún no exista.
        const childSnap = await transaction.get(childRef);
        if (childSnap.exists()) {
          throw new Error('Esta sesión del pack ya fue agendada');
        }

        // 5. Precios congelados de la maestra (SSOT inmutable de la compra)
        const preciosCongelados = maestra.preciosCongelados;
        if (
          !preciosCongelados ||
          !Array.isArray(preciosCongelados.preciosProrrateados) ||
          preciosCongelados.preciosProrrateados.length !== (maestra.packSnapshot?.cursoIds || []).length ||
          String(preciosCongelados.cursoIds?.[cursoActual]) !== String(subActual.cursoId)
        ) {
          throw new Error('El pack no tiene precios congelados válidos. Contacta al administrador.');
        }
        const precioBaseCurso = Number(preciosCongelados.preciosBase?.[cursoActual] ?? 0);
        const precioProrrateado = Number(preciosCongelados.preciosProrrateados?.[cursoActual] ?? 0);
        const descuentoAplicado = Number((precioBaseCurso - precioProrrateado).toFixed(2));

        // 6. Configuración de moto y comisiones desde el snapshot congelado.
        const traeMoto = resolverTraeMoto(preciosCongelados, cursoActual, cursoData.id, packData.traeMotoPorCurso);
        const valores = seleccionarValoresCurso(preciosCongelados, cursoActual, traeMoto, {
          motoAsignadaId: packData.motoAsignadaId,
          proveedorId: packData.proveedorId
        });
        // ERR-053 / ADR-017: el recargo pagado al comprar queda congelado en la
        // maestra; una sesión posterior no se reprecia aunque cambie de sede.
        const recargoSesion = Number(preciosCongelados.recargoSedeUnitario) || 0;
        const precioConRecargo = Number((valores.precio + recargoSesion).toFixed(2));
        const deficitConRecargo = Number((valores.deficitComision - recargoSesion).toFixed(2));

        // Tasa congelada de la maestra; fallback a la tasa implícita histórica.
        const tasaFXMaestra = Number(maestra.fxCongelado?.tasaFX) > 0
          ? Number(maestra.fxCongelado.tasaFX)
          : (Number(maestra.precioTotalCongelado) > 0
              ? Number(maestra.pagoTotalVES) / Number(maestra.precioTotalCongelado)
              : 1);

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

        // D11: la sede efectiva puede diferir del payload; se revalidan tutor
        // y moto con la sede final antes de escribir la child.
        if (recursosPre) {
          const checkInstructorSede = validarInstructorAsignado({ instructor: recursosPre.instructor, sedeId: sedeSesion });
          if (!checkInstructorSede.ok) throw crearError(checkInstructorSede.code, checkInstructorSede.message);
          const checkMotoSede = validarMotoAsignada({ moto: recursosPre.moto, motoId: valores.motoAsignadaId, sedeId: sedeSesion, curso: cursoData });
          if (!checkMotoSede.ok) throw crearError(checkMotoSede.code, checkMotoSede.message);
        }

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
          estadoId: packData.estadoId || null,
          municipio: packData.municipio || null,
          municipioId: packData.municipioId || null,
          ciudad: packData.ciudad || null,
          ciudadId: packData.ciudadId || null,
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
          motoAsignadaId: valores.motoAsignadaId,
          traeMoto,
          sabeBicicleta: 'Sí', // implícito por pack (ya completó Equilibrio)
          proveedorId: valores.proveedorId,
          createdAt: serverTimestamp(),
          pagoTotalMoneda: precioConRecargo,
          // VES prorrateado del child (incluye recargo) con la tasa congelada.
          pagoTotalVES: calcularPagoTotalVES(precioConRecargo, tasaFXMaestra),
          pagoBanco: maestra.pagoBanco || null,
          pagoTelefono: maestra.pagoTelefono || null,
          pagoCedula: maestra.pagoCedula || null,
          pagoRef: maestra.pagoRef || null,
          id: childRef.id,
          createdAt: Timestamp.now(),
          estadoPago: 'Aprobado', // ya pagó el pack
          estadoCurso: 'Pendiente',
          precio: precioConRecargo,
          precioBaseOriginal: valores.precioBaseOriginal,
          descuentoAplicado,
          comisionInstructor: valores.comisionInstructor,
          comisionProveedor: valores.comisionProveedor,
          deficitComision: deficitConRecargo,
          comisionAbsorbidaPorNegocio: deficitConRecargo,
          recargoSede: recargoSesion,
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
          estadoCurso: datosChild.estadoCurso || 'Pendiente',
          pagadoProveedor: datosChild.pagadoProveedor === true,
          pagoProveedorId: datosChild.pagoProveedorId || null,
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

      const actorUid = auth.currentUser?.uid || null;
      if (actorUid && childIdFinal) {
        void emitirEvento({
          tipo: 'reserva_creada',
          entidadTipo: 'reserva',
          entidadId: childIdFinal,
          actorUid,
          token: 'nueva',
          datos: { reservaId: childIdFinal, packReservaId: packData.packReservaId || null },
        });
      }

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
      const codigo = error.code || 'transaction-failed';
      // Igual que en crearReserva: si el lock ya no sirve, se libera para no
      // dejar el cupo ocupado hasta su expiración (ERR-010).
      if ([
        'slot-occupied', 'lock-expired', 'lock-invalid', 'lock-mismatch', 'lock-date-mismatch', 'lock-resource-mismatch', 'lock-owner-mismatch',
        // D11: recursos inválidos dejan el lock inservible.
        'instructor-not-found', 'instructor-inactivo', 'instructor-sede-invalida',
        // D10: tutor no habilitado o curso sin allowlist dejan el lock inservible.
        'instructor-no-permitido-curso', 'curso-sin-instructores-permitidos', 'curso-no-verificable',
        'moto-not-found', 'moto-inactiva', 'moto-sede-invalida', 'moto-tipo-incompatible'
      ].includes(codigo)) {
        await LockService.liberarLock(lockId).catch(() => {});
      }
      return { success: false, error: { code: codigo, message: error.message } };
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
    const adminUid = auth.currentUser?.uid;
    if (!adminUid) {
      return { success: false, error: { code: 'auth-required', message: 'Sesión de administrador requerida' } };
    }

    const maestraRef = doc(db, 'artifacts', appId, 'public', 'data', 'reservasPack', packReservaId);
    const childRef = doc(db, 'artifacts', appId, 'public', 'data', 'reservas', childReservaId);
    const espejoRef = doc(db, 'ocupacionConfirmada', childReservaId);
    const movimientoId = `mov_pack_${packReservaId}`;
    const movimientoRef = doc(db, 'artifacts', appId, 'public', 'data', 'movimientos', movimientoId);

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
          estadoCurso: 'En Curso',
          pagadoProveedor: childSnap.data().pagadoProveedor === true,
          pagoProveedorId: childSnap.data().pagoProveedorId || null,
          proveedorId: childSnap.data().proveedorId || null,
          comisionProveedor: Number(childSnap.data().comisionProveedor) || 0
        }, { merge: true });

        // FIX-METRICAS-TRIGGER: invalidar caché del estudiante
        transaction.update(doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', maestraData.userId), {
          updatedAt: Timestamp.now()
        });

        // B-MOVIMIENTOS-ATOMICOS: un solo ingreso por pack en la aprobación.
        const montoMovimiento = Number(maestraData.pagoTotalMoneda) ||
          Number(maestraData.precioTotalCongelado) ||
          Math.max(0, (Number(maestraData.precioBaseCongelado) || 0) - (Number(maestraData.descuentoCongelado?.monto) || 0));
        if (montoMovimiento > 0) {
          transaction.set(movimientoRef, {
            id: movimientoId,
            tipo: 'ingreso',
            categoria: 'ingreso_reserva',
            origen: 'reserva',
            origenId: packReservaId,
            monto: Number(montoMovimiento.toFixed(2)),
            desc: `Pack C-${String(packReservaId).slice(-4)}`,
            fecha: obtenerFechaVenezuela(),
            userId: maestraData.userId,
            createdBy: adminUid,
            createdAt: Timestamp.now(),
            estado: 'confirmado',
            moneda: 'USD'
          });
        }
      });

      const actorUid = auth.currentUser?.uid || adminUid;
      if (actorUid && childReservaId) {
        void emitirEvento({
          tipo: 'pago_aprobado',
          entidadTipo: 'reserva',
          entidadId: childReservaId,
          actorUid,
          token: 'aprobado',
          datos: { reservaId: childReservaId, packReservaId },
        });
      }

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

            // B-TEORICO-MODULO-BYPASS: índice de acceso vigente para reglas.
            const resumenRef = doc(db, ...basePath, 'accesosTeoricosResumen', resumenAccesoId(userIdPack, ctId));
            batch.set(resumenRef, {
              userId: String(userIdPack),
              cursoTeoricoId: String(ctId),
              estado: 'Aprobado',
              vencimientoMs: null,
              origen: 'pack',
              accesoId,
              packReservaId,
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

        const childSnap = await transaction.get(childRef);
        if (!childSnap.exists()) throw new Error('Reserva del pack no encontrada');
        const child = childSnap.data();

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

        // Rechazado para corrección NO libera el cupo (ADR-011): el espejo
        // permanece Pendiente y sigue bloqueando hasta la cancelación definitiva.
        transaction.set(espejoRef, {
          userId: child.userId,
          fecha: child.fecha,
          fecha2: child.fecha2 || null,
          horaId: child.horaId,
          horaIdReposicion: child.horaIdReposicion || null,
          instructorId: child.instructorId,
          motoAsignadaId: child.motoAsignadaId || null,
          motoReposicionId: child.motoReposicionId || null,
          traeMoto: child.traeMoto || 'No',
          sedeId: child.sedeId || null,
          tipoCurso: child.tipoCurso || null,
          estadoPago: 'Pendiente',
          estadoCurso: child.estadoCurso || 'Pendiente',
          pagadoProveedor: child.pagadoProveedor === true,
          pagoProveedorId: child.pagoProveedorId || null,
          proveedorId: child.proveedorId || null,
          comisionProveedor: Number(child.comisionProveedor) || 0
        }, { merge: true });

        // FIX-METRICAS-TRIGGER: invalidar caché del estudiante
        transaction.update(doc(db, 'artifacts', appId, 'public', 'data', 'usuarios', maestraData.userId), {
          updatedAt: Timestamp.now()
        });
      });

      const actorUid = auth.currentUser?.uid || null;
      if (actorUid) {
        void emitirEvento({
          tipo: 'pago_rechazado',
          entidadTipo: 'reserva',
          entidadId: childReservaId,
          actorUid,
          token: 'rechazado',
          datos: { reservaId: childReservaId, packReservaId },
        });
      }

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
    let childData = null;

    try {
      await runTransaction(db, async (transaction) => {
        const maestraSnap = await transaction.get(maestraRef);
        if (!maestraSnap.exists()) throw new Error('Pack no encontrado');
        maestraData = maestraSnap.data();

        const childSnap = await transaction.get(childRef);
        if (!childSnap.exists()) throw new Error('Reserva del pack no encontrada');
        childData = childSnap.data();

        // B-PACK-SUBRESERVAS-METADATA: al cancelar el pack, las sesiones
        // activas/bloqueadas pasan a 'cancelado'; las completadas se conservan.
        const subReservasCanceladas = Array.isArray(maestraData.subReservas)
          ? maestraData.subReservas.map((s) => ({
              ...s,
              estado: s?.estado === 'completado' ? 'completado' : 'cancelado'
            }))
          : null;
        const datosCancelacion = {
          estadoPago: 'Cancelado',
          estado: 'cancelado',
          canceladoEn: Timestamp.now()
        };
        if (subReservasCanceladas && subReservasCanceladas.length > 0) {
          datosCancelacion.subReservas = subReservasCanceladas;
        }
        transaction.update(maestraRef, datosCancelacion);

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

      // Cancelación definitiva: además de borrar el espejo, se purgan los
      // locks del slot para que el horario quede realmente libre (ADR-011).
      try {
        if (childData?.instructorId) {
          const snapshotLocks = await getDocs(
            query(collection(db, 'ocupacionTemporal'), where('instructorId', '==', childData.instructorId))
          );
          const fechas = [childData.fecha, childData.fecha2].filter(Boolean);
          const batchLocks = writeBatch(db);
          let locksPurgados = 0;
          snapshotLocks.forEach(docSnap => {
            const lock = docSnap.data();
            let bloqueEsperado = null;
            if (lock.fecha === childData.fecha) bloqueEsperado = childData.horaId;
            else if (lock.fecha === childData.fecha2) {
              bloqueEsperado = childData.horaIdReposicion || childData.horaId;
            }
            const coincideFecha = fechas.includes(lock.fecha);
            if (coincideFecha && bloqueEsperado && String(lock.horaId) === String(bloqueEsperado)) {
              batchLocks.delete(docSnap.ref);
              batchLocks.delete(doc(db, 'locks', docSnap.id));
              locksPurgados += 1;
            }
          });
          if (locksPurgados > 0) await batchLocks.commit();
        }
      } catch (lockErr) {
        console.warn('[cancelarReservaPack] No se pudieron purgar locks:', lockErr);
      }

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
            // B-TEORICO-MODULO-BYPASS: cerrar el módulo al cancelar el pack.
            if (maestraData?.userId) {
              batch.delete(doc(db, ...basePath, 'accesosTeoricosResumen', resumenAccesoId(maestraData.userId, ctId)));
            }
          }

          await batch.commit();
        }
      } catch (batchErr) {
        console.warn('[cancelarReservaPack] soft-delete accesos teóricos:', batchErr);
      }
      // ────────── FIN batch ──────────

      const actorUid = auth.currentUser?.uid || null;
      if (actorUid && childReservaId) {
        void emitirEvento({
          tipo: 'reserva_cancelada',
          entidadTipo: 'reserva',
          entidadId: childReservaId,
          actorUid,
          token: 'cancelado',
          datos: { reservaId: childReservaId, packReservaId },
        });
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

      // B-INTENTOS-CORRECCION: el tope de 3 no depende de la UI.
      const motivoNoCorregible = validarCorreccionPago(data);
      if (motivoNoCorregible === 'invalid-state') {
        return { success: false, error: { code: 'invalid-state', message: 'Solo puedes corregir una reserva rechazada.' } };
      }
      if (motivoNoCorregible === 'attempts-exhausted') {
        return { success: false, error: { code: 'attempts-exhausted', message: 'Has alcanzado el límite de intentos. Contacta al administrador.' } };
      }

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