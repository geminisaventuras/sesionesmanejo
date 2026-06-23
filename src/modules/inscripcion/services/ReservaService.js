import { db } from '../../shared/firebase/firebase';
import { collection, doc, runTransaction, updateDoc, writeBatch, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { validarInscripcionCompleta } from '../../shared/schemas/validations';

const appId = 'motoescuela-pro-v1';

const CAMPOS_OBLIGATORIOS = ['userId', 'cedula', 'fecha', 'fecha2', 'horaId', 'cursoId'];

export const ReservaService = {
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
        if (lockSnap.data().userId !== validacion.data.userId) throw new Error('El horario está bloqueado por otro usuario');

        transaction.set(reservaDoc, {
          ...validacion.data,
          id: reservaDoc.id,
          createdAt: Timestamp.now(),
          estadoPago: 'Pendiente',
          estadoCurso: 'Pendiente'
        });

        transaction.set(ocupacionConfirmadaRef, {
          userId: validacion.data.userId,
          fecha: validacion.data.fecha,
          fecha2: validacion.data.fecha2,
          horaId: validacion.data.horaId,
          instructorId: validacion.data.instructorId,
          motoAsignadaId: validacion.data.motoAsignadaId,
          traeMoto: validacion.data.traeMoto,
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