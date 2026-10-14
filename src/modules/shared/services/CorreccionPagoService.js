// @build: 2026-10-12 | id: CORREGIR-PAGO-FASE2A | desc: Facade de corrección de pagos unificada (solo lectura + delegación)
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { ReservaService } from '../../inscripcion/services/ReservaService';
import { AccesoTeoricoService } from '../../public/services/AccesoTeoricoService';
import {
  SERVICE_TYPES,
  SERVICE_COLLECTIONS,
  SERVICE_LABELS,
  MOTIVO_RECHAZO_DEFAULT,
  MAX_INTENTOS_CORRECCION,
} from '../../../constants/servicios';

const APP_ID = 'motoescuela-pro-v1';
const BASE_PATH = ['artifacts', APP_ID, 'public', 'data'];

/**
 * Normaliza el detalle de un documento para la página /corregir-pago/:tipo/:id.
 * Devuelve un contrato unificado sin importar el tipo.
 *
 * @param {string} tipo - 'reserva' | 'pack' | 'teorico'
 * @param {string} id   - ID del documento (child para reservas, maestra para packs, doc propio para teóricos)
 * @returns {Promise<{success: boolean, data?: object, error?: object}>}
 */
async function obtenerDetalle(tipo, id) {
  try {
    if (!tipo || !id) {
      return { success: false, error: { code: 'missing-args', message: 'Faltan tipo o id' } };
    }

    // ───── Reserva individual ─────
    if (tipo === SERVICE_TYPES.RESERVA) {
      const ref = doc(db, ...BASE_PATH, 'reservas', id);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        return { success: false, error: { code: 'not-found', message: 'Reserva no encontrada' } };
      }
      const data = snap.data();
      return {
        success: true,
        data: {
          id: snap.id,
          tipo: SERVICE_TYPES.RESERVA,
          tipoLabel: SERVICE_LABELS[SERVICE_TYPES.RESERVA],
          estadoPago: data.estadoPago,
          estaRechazado: data.estadoPago === 'Rechazado',
          monto: Number(data.pagoTotalMoneda) || 0,
          moneda: 'USD',
          montoVES: Number(data.pagoTotalVES) || 0,
          pagoRef: data.pagoRef || '',
          pagoBanco: data.pagoBanco || '',
          pagoTelefono: data.pagoTelefono || '',
          pagoCedula: data.pagoCedula || '',
          motivoRechazo: data.motivoRechazo || MOTIVO_RECHAZO_DEFAULT,
          intentosCorreccion: Number(data.intentosCorreccion) || 0,
          intentosMax: MAX_INTENTOS_CORRECCION,
          esPackSub: data.tipoReserva === 'pack_sub',
          packReservaId: data.packReservaId || null,
          userId: data.userId,
          correo: data.correo || '',
        },
      };
    }

    // ───── Pack (maestra) ─────
    if (tipo === SERVICE_TYPES.PACK) {
      const maestraRef = doc(db, ...BASE_PATH, 'reservasPack', id);
      const maestraSnap = await getDoc(maestraRef);
      if (!maestraSnap.exists()) {
        return { success: false, error: { code: 'not-found', message: 'Pack no encontrado' } };
      }
      const maestra = maestraSnap.data();

      // El pack cancelado no se corrige. Se bloquea explícitamente.
      if (maestra.estado === 'cancelado' || maestra.estadoPago === 'Cancelado') {
        return {
          success: false,
          error: { code: 'pack-cancelado', message: 'Este pack fue cancelado. Contacta al administrador.' },
        };
      }

      // Resolver child actual (es la que se corrige realmente)
      const subReservas = maestra.subReservas || [];
      const cursoActual = maestra.cursoActual ?? 0;
      const subActual = subReservas[cursoActual];
      const childId = subActual?.reservaId || maestra.cursoReservaId || null;

      let childData = null;
      if (childId) {
        const childSnap = await getDoc(doc(db, ...BASE_PATH, 'reservas', childId));
        if (childSnap.exists()) childData = childSnap.data();
      }

      // Los datos de corrección salen de la child cuando existe.
      // Si no hay child, se usa la maestra (pago pendiente sin child agendada).
      const fuente = childData || maestra;

      return {
        success: true,
        data: {
          id: maestraSnap.id,
          tipo: SERVICE_TYPES.PACK,
          tipoLabel: SERVICE_LABELS[SERVICE_TYPES.PACK],
          childId,
          estadoPago: maestra.estadoPago,
          estaRechazado: maestra.estadoPago === 'Rechazado',
          packNombre: maestra.packNombre || 'Pack',
          monto: Number(maestra.precioTotalCongelado) || 0,
          moneda: 'USD',
          montoVES: Number(maestra.pagoTotalVES) || 0,
          pagoRef: fuente.pagoRef || '',
          pagoBanco: fuente.pagoBanco || '',
          pagoTelefono: fuente.pagoTelefono || '',
          pagoCedula: fuente.pagoCedula || '',
          motivoRechazo: maestra.motivoRechazo || MOTIVO_RECHAZO_DEFAULT,
          intentosCorreccion: Number(maestra.intentosCorreccion) || 0,
          intentosMax: MAX_INTENTOS_CORRECCION,
          userId: maestra.userId,
        },
      };
    }

    // ───── Acceso teórico ─────
    if (tipo === SERVICE_TYPES.TEORICO) {
      const ref = doc(db, ...BASE_PATH, 'accesosTeoricos', id);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        return { success: false, error: { code: 'not-found', message: 'Acceso teórico no encontrado' } };
      }
      const data = snap.data();

      // T2.1: rechazarAcceso ahora escribe estadoPago: 'Rechazado'.
      // Se mantiene la detección legacy (Pendiente + motivoRechazo + rechazadoEn)
      // para accesos rechazados ANTES de T2.
      // Solo legacy si NO tiene historialRechazos (flujo nuevo)
      const sinHistorial = !Array.isArray(data.historialRechazos) || data.historialRechazos.length === 0;
      const esLegacyRechazado =
        data.estadoPago === 'Pendiente' && !!data.motivoRechazo && !!data.rechazadoEn && sinHistorial;
      const estaRechazado = data.estadoPago === 'Rechazado' || esLegacyRechazado;

      return {
        success: true,
        data: {
          id: snap.id,
          tipo: SERVICE_TYPES.TEORICO,
          tipoLabel: SERVICE_LABELS[SERVICE_TYPES.TEORICO],
          estadoPago: data.estadoPago,
          estadoPagoEfectivo: esLegacyRechazado ? 'Rechazado' : data.estadoPago,
          estaRechazado,
          cursoTeoricoId: data.cursoTeoricoId,
          monto: Number(data.precio) || 0,
          moneda: data.moneda || 'USD',
          pagoRef: data.pagoRef || '',
          pagoBanco: data.pagoBanco || '',
          pagoTelefono: data.pagoTelefono || '',
          pagoCedula: data.pagoCedula || '',
          motivoRechazo: data.motivoRechazo || MOTIVO_RECHAZO_DEFAULT,
          intentosCorreccion: Number(data.intentosCorreccion) || 0,
          intentosMax: MAX_INTENTOS_CORRECCION,
          userId: data.userId,
        },
      };
    }

    return { success: false, error: { code: 'unknown-type', message: `Tipo no soportado: ${tipo}` } };
  } catch (error) {
    console.error('[CorreccionPagoService.obtenerDetalle] Error:', error);
    return { success: false, error: { code: error.code || 'unknown', message: error.message } };
  }
}

/**
 * Delega la corrección al service correspondiente.
 * Para tipo 'pack', usa el childId resuelto (ReservaService espera la child, no la maestra).
 *
 * @param {string} tipo
 * @param {string} id            - ID principal (maestra para packs)
 * @param {string} nuevaRef      - 4 dígitos
 * @param {string} [childIdOpt]  - Opcional, si el llamador ya resolvió la child del pack
 */
async function corregir(tipo, id, nuevaRef, childIdOpt) {
  try {
    if (!tipo || !id || !nuevaRef || nuevaRef.length !== 4) {
      return { success: false, error: { code: 'invalid-args', message: 'Argumentos inválidos' } };
    }

    if (tipo === SERVICE_TYPES.RESERVA) {
      return ReservaService.corregirReferenciaPago(id, nuevaRef);
    }

    if (tipo === SERVICE_TYPES.PACK) {
      let childId = childIdOpt;
      if (!childId) {
        // Resolver child desde la maestra
        const maestraSnap = await getDoc(doc(db, ...BASE_PATH, 'reservasPack', id));
        if (!maestraSnap.exists()) {
          return { success: false, error: { code: 'not-found', message: 'Pack no encontrado' } };
        }
        const maestra = maestraSnap.data();
        const subReservas = maestra.subReservas || [];
        const cursoActual = maestra.cursoActual ?? 0;
        childId = subReservas[cursoActual]?.reservaId || maestra.cursoReservaId || null;
        if (!childId) {
          return { success: false, error: { code: 'no-child', message: 'El pack no tiene child activa para corregir.' } };
        }
      }
      // ReservaService actualiza child + maestra atómicamente.
      return ReservaService.corregirReferenciaPago(childId, nuevaRef);
    }

    if (tipo === SERVICE_TYPES.TEORICO) {
      // NOTA: este método se implementará en la Tanda 2.
      // Hoy no existe. Se deja hook para no romper el import del facade.
      if (typeof AccesoTeoricoService.corregirReferenciaPago === 'function') {
        return AccesoTeoricoService.corregirReferenciaPago(id, nuevaRef);
      }
      return {
        success: false,
        error: { code: 'not-implemented', message: 'La corrección de accesos teóricos estará disponible próximamente.' },
      };
    }

    return { success: false, error: { code: 'unknown-type', message: `Tipo no soportado: ${tipo}` } };
  } catch (error) {
    console.error('[CorreccionPagoService.corregir] Error:', error);
    return { success: false, error: { code: error.code || 'unknown', message: error.message } };
  }
}

export const CorreccionPagoService = {
  obtenerDetalle,
  corregir,
  // Re-exporto constantes útiles para consumidores
  SERVICE_TYPES,
  SERVICE_COLLECTIONS,
  SERVICE_LABELS,
};
