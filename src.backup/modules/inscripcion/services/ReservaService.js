// ============================================================
// Archivo: src/modules/inscripcion/services/ReservaService.js
// @build: 2026-07-21 | id: SERV-PROGRESO-INSCRIPCION | desc: Nuevos métodos para progreso de inscripción
// ============================================================
import { db } from '../../shared/firebase/firebase';
import { collection, doc, runTransaction, updateDoc, getDocs, getDoc, setDoc, deleteDoc, Timestamp, query, where } from 'firebase/firestore';
import { validarInscripcionCompleta } from '../../shared/schemas/validations';

const appId = 'motoescuela-pro-v1';

const CAMPOS_OBLIGATORIOS = ['userId', 'cedula', 'fecha', 'fecha2', 'horaId', 'cursoId'];

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
      await setDoc(ref, {
        userId,
        correo,
        pin: datosFormulario.pin || '',
        paso: Number(paso),
        datosFormulario,
        updatedAt: Timestamp.now(),
        createdAt: Timestamp.now()
      }, { merge: true });
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

    const validacion = validarInscripcionCompleta(reservaData);
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
        if (lockSnap.data().userId !== reservaData.userId) {
          throw new Error('El horario está bloqueado por otro usuario');
        }

        const datosReserva = {
          ...validacion.data,
          userId: reservaData.userId,
          cursoId: reservaData.cursoId,
          sedeId: reservaData.sedeId,
          tipoMoto: reservaData.tipoMoto,
          fecha: reservaData.fecha,
          fecha2: reservaData.fecha2,
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
          precio: reservaData.pagoTotalMoneda
        };

        transaction.set(reservaDoc, datosReserva);
        transaction.set(ocupacionConfirmadaRef, {
          userId: datosReserva.userId,
          fecha: datosReserva.fecha,
          fecha2: datosReserva.fecha2,
          horaId: datosReserva.horaId,
          instructorId: datosReserva.instructorId,
          motoAsignadaId: datosReserva.motoAsignadaId,
          traeMoto: datosReserva.traeMoto,
          estadoPago: 'Pendiente'
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
