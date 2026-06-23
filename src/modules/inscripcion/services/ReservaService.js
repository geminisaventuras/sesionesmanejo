// @build: 2026-06-22 | id: RESERVA-CAMPOS-COMPLETOS | desc: Agregar correo, apellido, contactoEmergencia, totales y pin a CAMPOS_PERMITIDOS
import { db } from '../../shared/firebase/firebase';
import { collection, doc, runTransaction, Timestamp } from 'firebase/firestore';

const appId = 'motoescuela-pro-v1';

const CAMPOS_OBLIGATORIOS = ['userId', 'cedula', 'fecha', 'fecha2', 'horaId', 'cursoId'];

const CAMPOS_PERMITIDOS = {
  userId: { tipo: 'string', maxLength: 128 },
  cedula: { tipo: 'string', maxLength: 10 },
  nombre: { tipo: 'string', maxLength: 50 },
  apellido: { tipo: 'string', maxLength: 50 },
  telefono: { tipo: 'string', maxLength: 11 },
  correo: { tipo: 'string', maxLength: 100 },
  fechaNacimiento: { tipo: 'string', maxLength: 10 },
  sexo: { tipo: 'string', maxLength: 20 },
  estado: { tipo: 'string', maxLength: 50 },
  zona: { tipo: 'string', maxLength: 100 },
  contactoEmergencia: { tipo: 'string', maxLength: 11 },
  condicionMedica: { tipo: 'string', maxLength: 2 },
  detalleCondicion: { tipo: 'string', maxLength: 200 },
  sabeBicicleta: { tipo: 'string', maxLength: 2 },
  traeMoto: { tipo: 'string', maxLength: 2 },
  tipoMoto: { tipo: 'string', maxLength: 20 },
  fecha: { tipo: 'string', maxLength: 10 },
  fecha2: { tipo: 'string', maxLength: 10 },
  horaId: { tipo: 'string', maxLength: 50 },
  instructorId: { tipo: 'string', maxLength: 50 },
  motoAsignadaId: { tipo: ['string', 'null'], maxLength: 50 },
  cursoId: { tipo: 'string', maxLength: 50 },
  sedeId: { tipo: 'string', maxLength: 50 },
  pagoBanco: { tipo: 'string', maxLength: 50 },
  pagoTelefono: { tipo: 'string', maxLength: 11 },
  pagoCedula: { tipo: 'string', maxLength: 10 },
  pagoRef: { tipo: 'string', maxLength: 4 },
  pin: { tipo: 'string', maxLength: 6 },
  pagoTotalMoneda: { tipo: 'number' },
  pagoTotalVES: { tipo: 'number' },
  pagoInstructor: { tipo: 'number' },
  pagoProveedor: { tipo: 'number' },
  expiraEn: { tipo: 'number' },
  modulosEstado: { tipo: 'array', maxLength: 10, elemento: 'string' }
};

function validarCampo(campo, valor, esquema) {
  if (!esquema) return { valido: true };
  if (Array.isArray(esquema.tipo)) {
    const tipoValor = valor === null ? 'null' : typeof valor;
    if (!esquema.tipo.includes(tipoValor))
      return { valido: false, error: `Campo ${campo} debe ser ${esquema.tipo.join(' o ')}, recibido ${tipoValor}` };
  } else if (esquema.tipo === 'array') {
    if (!Array.isArray(valor))
      return { valido: false, error: `Campo ${campo} debe ser un Array` };
    if (esquema.maxLength && valor.length > esquema.maxLength)
      return { valido: false, error: `Campo ${campo} excede la longitud máxima de ${esquema.maxLength} elementos` };
    if (esquema.elemento)
      for (const elem of valor)
        if (typeof elem !== esquema.elemento)
          return { valido: false, error: `Campo ${campo} contiene elementos que no son de tipo ${esquema.elemento}` };
  } else if (typeof valor !== esquema.tipo) {
    return { valido: false, error: `Campo ${campo} debe ser ${esquema.tipo}, recibido ${typeof valor}` };
  }
  if (valor !== null && esquema.tipo === 'string' && esquema.maxLength && valor.length > esquema.maxLength)
    return { valido: false, error: `Campo ${campo} excede la longitud máxima de ${esquema.maxLength} caracteres` };
  return { valido: true };
}

export const ReservaService = {
  async crearReserva(reservaData, lockId) {
    if (!reservaData || !lockId)
      return { success: false, error: { code: 'missing-fields', message: 'Faltan datos de la reserva o lockId' } };

    for (const campo of CAMPOS_OBLIGATORIOS)
      if (reservaData[campo] === undefined || reservaData[campo] === null)
        return { success: false, error: { code: 'missing-field', message: `Campo obligatorio faltante: ${campo}` } };

    for (const [campo, valor] of Object.entries(reservaData))
      if (CAMPOS_PERMITIDOS[campo]) {
        const validacion = validarCampo(campo, valor, CAMPOS_PERMITIDOS[campo]);
        if (!validacion.valido)
          return { success: false, error: { code: 'invalid-type', message: validacion.error } };
      }

    const datosSaneados = {};
    for (const campo of Object.keys(CAMPOS_PERMITIDOS))
      if (reservaData[campo] !== undefined)
        datosSaneados[campo] = reservaData[campo];

    const reservasRef = collection(db, 'artifacts', appId, 'public', 'data', 'reservas');
    const reservaDoc = doc(reservasRef);
    const lockRef = doc(db, 'locks', lockId);

    try {
      await runTransaction(db, async (transaction) => {
        const lockSnap = await transaction.get(lockRef);
        if (!lockSnap.exists()) throw new Error('El horario ya no está disponible');
        if (lockSnap.data().userId !== datosSaneados.userId) throw new Error('El horario está bloqueado por otro usuario');

        transaction.set(reservaDoc, {
          ...datosSaneados,
          id: reservaDoc.id,
          createdAt: Timestamp.now(),
          estadoPago: 'Pendiente',
          estadoCurso: 'Pendiente'
        });
        transaction.delete(lockRef);
      });
      return { success: true, data: { id: reservaDoc.id } };
    } catch (error) {
      return { success: false, error: { code: 'transaction-failed', message: error.message } };
    }
  }
};