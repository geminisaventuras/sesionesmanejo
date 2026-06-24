// ============================================================
// Archivo: src/modules/inscripcion/services/ReservaService.js
// ============================================================
import { db, auth } from '../../shared/firebase/firebase';
import { collection, doc, runTransaction, updateDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { validarInscripcionCompleta } from '../../shared/schemas/validations';

const appId = 'motoescuela-pro-v1';

const CAMPOS_OBLIGATORIOS = ['userId', 'cedula', 'fecha', 'fecha2', 'horaId', 'cursoId'];

export const ReservaService = {
  async crearReserva(reservaData, lockId) {
    if (!reservaData || !lockId) {
      return { success: false, error: { code: 'missing-fields', message: 'Faltan datos de la reserva o lockId' } };
    }

    const uid = auth.currentUser?.uid;
    if (!uid) {
      return { success: false, error: { code: 'auth-required', message: 'No hay sesión activa. Recarga la página.' } };
    }

    const datosCompletos = { ...reservaData, userId: uid };

    for (const campo of CAMPOS_OBLIGATORIOS) {
      if (datosCompletos[campo] === undefined || datosCompletos[campo] === null) {
        return { success: false, error: { code: 'missing-field', message: `Campo obligatorio faltante: ${campo}` } };
      }
    }

    const validacion = validarInscripcionCompleta(datosCompletos);
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
        if (!lockSnap.exists()) {
          throw new Error('El horario ya no está disponible');
        }
        if (lockSnap.data().userId !== uid) {
          throw new Error('El horario está bloqueado por otro usuario');
        }

        transaction.set(reservaDoc, {
          ...validacion.data,
          userId: uid,
          fecha: datosCompletos.fecha,
          fecha2: datosCompletos.fecha2,
          horaId: datosCompletos.horaId,
          instructorId: datosCompletos.instructorId,
          motoAsignadaId: datosCompletos.motoAsignadaId,
          traeMoto: datosCompletos.traeMoto,
          cursoId: datosCompletos.cursoId,
          pagoRef: datosCompletos.pagoRef,
          pagoBanco: datosCompletos.pagoBanco,
          pagoTelefono: datosCompletos.pagoTelefono,
          pagoCedula: datosCompletos.pagoCedula,
          pagoTotalMoneda: datosCompletos.pagoTotalMoneda,
          pagoTotalVES: datosCompletos.pagoTotalVES,
          precio: datosCompletos.pagoTotalMoneda,
          id: reservaDoc.id,
          createdAt: Timestamp.now(),
          estadoPago: 'Pendiente',
          estadoCurso: 'Pendiente'
        });

        transaction.set(ocupacionConfirmadaRef, {
          userId: uid,
          fecha: datosCompletos.fecha,
          fecha2: datosCompletos.fecha2,
          horaId: datosCompletos.horaId,
          instructorId: datosCompletos.instructorId,
          motoAsignadaId: datosCompletos.motoAsignadaId,
          traeMoto: datosCompletos.traeMoto,
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
    if (!uid) {
      return { success: false, error: { code: 'missing-uid', message: 'Falta el UID del usuario' } };
    }
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
  }
};
