// @build: 2026-11-21 | id: DEUDAS-PROVEEDOR-SERVICE | desc: Cobros parciales/totales de deudas de proveedores (D2)
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  getDocs,
  query,
  where,
  limit,
  arrayUnion,
  updateDoc,
  Timestamp
} from 'firebase/firestore';
import { auth, db } from '../../shared/firebase/firebase';
import { obtenerFechaVenezuela } from '../utils/zonahoraria';
import { emitirEvento } from './NotificacionesEventos';

const APP_ID = 'motoescuela-pro-v1';

// D2-FINANZAS: deudas y ledger de proveedores viven en colecciones raíz.
const COL_DEUDAS_PROVEEDOR = 'deudasProveedor';
const COL_LEDGER_PROVEEDOR = 'ledgerProveedor';
const COL_SOLICITUDES = 'solicitudesPagoDeuda';
const COL_MOVIMIENTOS = ['artifacts', APP_ID, 'public', 'data', 'movimientos'];

const numero = (valor, fallback = 0) => {
  const n = Number(valor);
  return Number.isFinite(n) ? n : fallback;
};

const redondear2 = (valor) => Math.round((numero(valor) + Number.EPSILON) * 100) / 100;

const timestampMs = (valor) => {
  if (valor == null) return 0;
  if (typeof valor.toMillis === 'function') return valor.toMillis();
  if (typeof valor === 'number') return valor;
  if (valor instanceof Date) return valor.getTime();
  const fecha = new Date(valor).getTime();
  return Number.isFinite(fecha) ? fecha : 0;
};

const ordenarPorAntiguedad = (deudas) => [...deudas].sort(
  (a, b) => timestampMs(a.createdAt) - timestampMs(b.createdAt)
);

export const DeudasProveedorService = {
  /**
   * Registra un pago (parcial o total) de una deuda de proveedor.
   * Atómico: descuenta saldo, crea el ingreso en caja y el asiento del ledger.
   */
  async registrarPagoDeuda({
    deudaId,
    monto,
    moneda = 'USD',
    metodoPago = 'efectivo',
    referencia = '',
    banco = '',
    notas = '',
    montoVES = null,
    tasaAplicada = null,
    pagadoPor
  } = {}) {
    if (!deudaId) {
      return { success: false, error: { code: 'invalid-args', message: 'Falta deudaId' } };
    }
    const montoPago = redondear2(monto);
    if (!(montoPago > 0)) {
      return { success: false, error: { code: 'invalid-args', message: 'El monto debe ser mayor a 0' } };
    }
    if (!pagadoPor) {
      return { success: false, error: { code: 'invalid-args', message: 'Falta el usuario que registra el pago (pagadoPor)' } };
    }

    const deudaRef = doc(db, COL_DEUDAS_PROVEEDOR, deudaId);
    const movimientoRef = doc(collection(db, ...COL_MOVIMIENTOS));
    const ledgerRef = doc(collection(db, COL_LEDGER_PROVEEDOR));
    const ahora = Timestamp.now();
    const fechaISO = obtenerFechaVenezuela();

    let saldoFinal = null;
    let estadoFinal = null;

    try {
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(deudaRef);
        if (!snap.exists()) {
          throw new Error(`Deuda ${deudaId} no existe`);
        }

        const deuda = snap.data();
        const estadoActual = deuda.estado || 'pendiente';
        const saldoActual = redondear2(deuda.saldo);

        if (estadoActual === 'saldada' || saldoActual <= 0) {
          throw new Error(`La deuda ${deudaId} ya está saldada`);
        }
        if (estadoActual !== 'pendiente') {
          throw new Error(`La deuda ${deudaId} no está pendiente (estado: ${estadoActual})`);
        }
        if (montoPago > saldoActual + 1e-9) {
          throw new Error(`El monto (${montoPago.toFixed(2)}) supera el saldo pendiente (${saldoActual.toFixed(2)})`);
        }

        saldoFinal = redondear2(saldoActual - montoPago);
        estadoFinal = saldoFinal <= 0 ? 'saldada' : 'pendiente';

        transaction.update(deudaRef, {
          saldo: saldoFinal,
          estado: estadoFinal,
          actualizado: ahora,
          abonos: arrayUnion({
            tipo: 'pago_directo',
            monto: montoPago,
            moneda,
            metodoPago,
            referencia: referencia || '',
            banco: banco || '',
            notas: notas || '',
            montoVES: montoVES != null ? redondear2(montoVES) : null,
            tasaAplicada: tasaAplicada != null ? Number(tasaAplicada) : null,
            fecha: ahora,
            registradoPor: pagadoPor,
            movimientoId: movimientoRef.id
          })
        });

        transaction.set(movimientoRef, {
          tipo: 'ingreso',
          categoria: 'recuperacion_deuda_proveedor',
          monto: montoPago,
          moneda,
          fecha: fechaISO,
          desc: `Recuperación deuda proveedor ${deuda.proveedorId || deudaId}`,
          userId: pagadoPor,
          createdBy: pagadoPor,
          createdAt: ahora,
          estado: 'confirmado',
          origen: 'pago_deuda_proveedor',
          origenId: deudaId,
          deudaId,
          proveedorId: deuda.proveedorId || null,
          reservaId: deuda.reservaId || null,
          metodoPago,
          referencia: referencia || '',
          banco: banco || '',
          montoVES: montoVES != null ? redondear2(montoVES) : null,
          tasaAplicada: tasaAplicada != null ? Number(tasaAplicada) : null
        });

        transaction.set(ledgerRef, {
          tipo: 'pago_deuda',
          proveedorId: deuda.proveedorId || null,
          deudaId,
          reservaId: deuda.reservaId || null,
          monto: montoPago,
          moneda,
          metodoPago,
          movimientoId: movimientoRef.id,
          createdAt: ahora,
          createdBy: pagadoPor,
          idempotencyKey: `pago_deuda:${deudaId}:${movimientoRef.id}`
        });
      });

      if (pagadoPor) {
        void emitirEvento({
          tipo: 'deuda_proveedor',
          entidadTipo: 'deudaProveedor',
          entidadId: deudaId,
          actorUid: pagadoPor,
          token: `${saldoFinal}|${estadoFinal}`,
          datos: { deudaId, monto: montoPago, moneda },
        });
      }

      return {
        success: true,
        data: {
          id: deudaId,
          movimientoId: movimientoRef.id,
          saldo: saldoFinal,
          estado: estadoFinal
        }
      };
    } catch (error) {
      return {
        success: false,
        error: { code: 'transaction-failed', message: error.message }
      };
    }
  },

  /**
   * Deudas de un proveedor concreto. Por defecto solo las pendientes.
   */
  async obtenerDeudasProveedor(proveedorId, { soloPendientes = true } = {}) {
    if (!proveedorId) {
      return { success: false, error: { code: 'invalid-args', message: 'Falta proveedorId' } };
    }
    try {
      const q = query(
        collection(db, COL_DEUDAS_PROVEEDOR),
        where('proveedorId', '==', String(proveedorId))
      );
      const snap = await getDocs(q);
      let deudas = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (soloPendientes) {
        deudas = deudas.filter((d) => d.estado === 'pendiente');
      }
      return { success: true, data: ordenarPorAntiguedad(deudas) };
    } catch (error) {
      return { success: false, error: { code: error.code, message: error.message } };
    }
  },

  /**
   * Listado de deudas para finanzas admin (todas las proveedores).
   */
  async obtenerTodasDeudas({ soloPendientes = true, limitDocs = 200 } = {}) {
    try {
      const tope = Math.max(1, Math.min(1000, Number(limitDocs) || 200));
      const q = query(
        collection(db, COL_DEUDAS_PROVEEDOR),
        limit(tope)
      );
      const snap = await getDocs(q);
      let deudas = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (soloPendientes) {
        deudas = deudas.filter((d) => d.estado === 'pendiente');
      }
      return { success: true, data: ordenarPorAntiguedad(deudas) };
    } catch (error) {
      return { success: false, error: { code: error.code, message: error.message } };
    }
  },

  /**
   * El proveedor declara un pago (total o parcial) de su deuda. No mueve
   * dinero ni saldo: crea una solicitud para que el admin la confirme.
   */
  async crearSolicitudPagoDeuda({
    deudaId,
    monto,
    moneda = 'USD',
    montoVES = null,
    tasaAplicada = null,
    metodoPago = 'efectivo',
    referencia = '',
    banco = '',
    notas = '',
    proveedorId
  } = {}) {
    if (!deudaId || !proveedorId) {
      return { success: false, error: { code: 'invalid-args', message: 'Faltan deudaId o proveedorId' } };
    }
    const montoPago = redondear2(monto);
    if (!(montoPago > 0)) {
      return { success: false, error: { code: 'invalid-args', message: 'El monto debe ser mayor a 0' } };
    }

    try {
      const deudaSnap = await getDoc(doc(db, COL_DEUDAS_PROVEEDOR, deudaId));
      if (!deudaSnap.exists()) {
        return { success: false, error: { code: 'not-found', message: 'La deuda no existe' } };
      }
      const deuda = deudaSnap.data();
      if (String(deuda.proveedorId) !== String(proveedorId)) {
        return { success: false, error: { code: 'forbidden', message: 'La deuda no pertenece al proveedor' } };
      }
      const saldo = redondear2(deuda.saldo);
      if (deuda.estado !== 'pendiente' || saldo <= 0) {
        return { success: false, error: { code: 'invalid-state', message: 'La deuda no está pendiente' } };
      }
      if (montoPago > saldo + 1e-9) {
        return { success: false, error: { code: 'invalid-args', message: 'El monto supera el saldo pendiente' } };
      }

      // La consulta debe acotarse al proveedor: las reglas le permiten leer
      // solo sus propios documentos y Firestore rechaza queries no acotadas.
      const pendientesSnap = await getDocs(
        query(
          collection(db, COL_SOLICITUDES),
          where('deudaId', '==', deudaId),
          where('proveedorId', '==', String(proveedorId))
        )
      );
      if (pendientesSnap.docs.some((d) => d.data().estado === 'pendiente')) {
        return { success: false, error: { code: 'duplicate', message: 'Ya existe una solicitud pendiente para esta deuda' } };
      }

      const ref = await addDoc(collection(db, COL_SOLICITUDES), {
        deudaId,
        proveedorId,
        reservaId: deuda.reservaId || null,
        monto: montoPago,
        moneda,
        montoVES: montoVES != null ? redondear2(montoVES) : null,
        tasaAplicada: tasaAplicada != null ? Number(tasaAplicada) : null,
        metodoPago,
        referencia: referencia || '',
        banco: banco || '',
        notas: notas || '',
        estado: 'pendiente',
        createdAt: Timestamp.now(),
        createdBy: proveedorId
      });

      const actorUid = auth.currentUser?.uid || proveedorId;
      if (actorUid) {
        void emitirEvento({
          tipo: 'deuda_proveedor',
          entidadTipo: 'deudaProveedor',
          entidadId: deudaId,
          actorUid,
          token: `solicitud|${ref.id}`,
          datos: { deudaId, monto: montoPago, moneda },
        });
      }

      return { success: true, data: { id: ref.id } };
    } catch (error) {
      return { success: false, error: { code: error.code || 'create-failed', message: error.message } };
    }
  },

  async obtenerSolicitudesProveedor(proveedorId, { soloPendientes = true } = {}) {
    if (!proveedorId) {
      return { success: false, error: { code: 'invalid-args', message: 'Falta proveedorId' } };
    }
    try {
      const snap = await getDocs(
        query(collection(db, COL_SOLICITUDES), where('proveedorId', '==', String(proveedorId)))
      );
      let solicitudes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (soloPendientes) solicitudes = solicitudes.filter((s) => s.estado === 'pendiente');
      solicitudes.sort((a, b) => timestampMs(b.createdAt) - timestampMs(a.createdAt));
      return { success: true, data: solicitudes };
    } catch (error) {
      return { success: false, error: { code: error.code, message: error.message } };
    }
  },

  suscribirDeudasProveedor(proveedorId, callback) {
    if (!proveedorId) return () => {};
    const q = query(
      collection(db, COL_DEUDAS_PROVEEDOR),
      where('proveedorId', '==', String(proveedorId))
    );
    return onSnapshot(
      q,
      (snap) => {
        const deudas = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((d) => d.estado === 'pendiente' && redondear2(d.saldo) > 0);
        callback(ordenarPorAntiguedad(deudas));
      },
      (error) => {
        console.error('[DeudasProveedorService] deudas:', error);
        callback([]);
      }
    );
  },

  suscribirSolicitudesProveedor(proveedorId, callback) {
    if (!proveedorId) return () => {};
    const q = query(
      collection(db, COL_SOLICITUDES),
      where('proveedorId', '==', String(proveedorId))
    );
    return onSnapshot(
      q,
      (snap) => {
        const solicitudes = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((s) => s.estado === 'pendiente')
          .sort((a, b) => timestampMs(b.createdAt) - timestampMs(a.createdAt));
        callback(solicitudes);
      },
      (error) => {
        console.error('[DeudasProveedorService] solicitudes proveedor:', error);
        callback([]);
      }
    );
  },

  suscribirSolicitudesPago(callback) {
    const q = query(collection(db, COL_SOLICITUDES), limit(200));
    return onSnapshot(
      q,
      (snap) => {
        const solicitudes = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((s) => s.estado === 'pendiente')
          .sort((a, b) => timestampMs(b.createdAt) - timestampMs(a.createdAt));
        callback(solicitudes);
      },
      (error) => {
        console.error('[DeudasProveedorService] solicitudes:', error);
        callback([]);
      }
    );
  },

  async obtenerSolicitudesPago({ soloPendientes = true, limitDocs = 200 } = {}) {
    try {
      const tope = Math.max(1, Math.min(1000, Number(limitDocs) || 200));
      const snap = await getDocs(query(collection(db, COL_SOLICITUDES), limit(tope)));
      let solicitudes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (soloPendientes) solicitudes = solicitudes.filter((s) => s.estado === 'pendiente');
      solicitudes.sort((a, b) => timestampMs(b.createdAt) - timestampMs(a.createdAt));
      return { success: true, data: solicitudes };
    } catch (error) {
      return { success: false, error: { code: error.code, message: error.message } };
    }
  },

  async resolverSolicitudPago({
    solicitudId,
    estado,
    motivoRechazo = '',
    pagadoPor,
    movimientoId = null,
    saldoRestante = null
  } = {}) {
    if (!solicitudId || !['aprobada', 'rechazada'].includes(estado)) {
      return { success: false, error: { code: 'invalid-args', message: 'Solicitud o estado inválido' } };
    }
    if (!pagadoPor) {
      return { success: false, error: { code: 'invalid-args', message: 'Falta el usuario que resuelve' } };
    }
    try {
      await updateDoc(doc(db, COL_SOLICITUDES, solicitudId), {
        estado,
        motivoRechazo: estado === 'rechazada' ? (motivoRechazo || '') : '',
        resueltoPor: pagadoPor,
        resueltoEn: Timestamp.now(),
        movimientoId,
        saldoRestante
      });
      return { success: true, data: { id: solicitudId, estado } };
    } catch (error) {
      return { success: false, error: { code: error.code, message: error.message } };
    }
  }
};
