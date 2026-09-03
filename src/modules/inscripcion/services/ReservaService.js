// ============================================================
// Archivo: src/modules/inscripcion/services/ReservaService.js
// @build: 2026-07-21 | id: SERV-PROGRESO-INSCRIPCION | desc: Nuevos métodos para progreso de inscripción
// ============================================================
import { db } from '../../shared/firebase/firebase';
import { collection, doc, runTransaction, updateDoc, getDocs, getDoc, setDoc, deleteDoc, Timestamp, query, where } from 'firebase/firestore';
import { validarInscripcionCompleta } from '../../shared/schemas/validations';

const appId = 'motoescuela-pro-v1';

const CAMPOS_OBLIGATORIOS = ['userId', 'cedula', 'fecha', 'horaId', 'cursoId'];
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

        const { esRecompra: _uiFlag, ...reservaLimpia } = reservaData;
    const validacion = validarInscripcionCompleta(reservaLimpia);
    if (!validacion.success) {
      const primerError = Object.values(validacion.errores)[0] || 'Datos inválidos';
      return { success: false, error: { code: 'invalid-data', message: primerError } };
    }

    const reservasRef = collection(db, 'artifacts', appId, 'public', 'data', 'reservas');
    const reservaDoc = doc(reservasRef);
    const lockRef = doc(db, 'locks', lockId);
    const ocupacionConfirmadaRef = doc(db, 'ocupacionConfirmada', reservaDoc.id);

    try {
      await runTransaction(db, async (transaction) => {
             const lockSnap = await transaction.get(lockRef);
        if (!lockSnap.exists()) throw new Error('El horario ya no está disponible');

        const lockData = lockSnap.data();

        // ✅ Validación robusta de expiración e integridad
        const lockExpirado = !lockData.expiresAt || lockData.expiresAt.toMillis() <= Date.now();
        const lockCorrupto = !lockData.userId || !lockData.instructorId || !lockData.fecha || !lockData.horaId;

        if (!lockExpirado && !lockCorrupto && lockData.userId !== reservaData.userId) {
          throw new Error('El horario está bloqueado por otro usuario');
        }

        // Si el lock está expirado o corrupto, se ignora y se eliminará al final de la transacción
        if (lockExpirado || lockCorrupto) {
          console.log(`[ReservaService] Lock ${lockId} ignorado (expirado: ${lockExpirado}, corrupto: ${lockCorrupto})`);
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
          motoAsignadaId: reservaData.motoAsignadaId || null,
          traeMoto: reservaData.traeMoto,
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
          pin: reservaData.pin || null
        };

        transaction.set(reservaDoc, datosReserva);
        transaction.set(ocupacionConfirmadaRef, {
          userId: datosReserva.userId,
          fecha: datosReserva.fecha,
          fecha2: datosReserva.fecha2,
          horaId: datosReserva.horaId,
          instructorId: datosReserva.instructorId,
          tipoCurso: datosReserva.tipoCurso || null,
          motoAsignadaId: datosReserva.motoAsignadaId,
          traeMoto: datosReserva.traeMoto,
          sedeId: datosReserva.sedeId,          
          estadoPago: 'Pendiente',
          proveedorId: datosReserva.proveedorId || null
        });
        transaction.delete(lockRef);
      });
      return { success: true, data: { id: reservaDoc.id } };
    } catch (error) {
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
      await updateDoc(ref, {
        pagoRef: nuevaRef,
        estadoPago: 'Pendiente'
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: { code: error.code, message: error.message } };
    }
  },
};
