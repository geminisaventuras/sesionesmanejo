// @build: 2026-11-22 | id: DEUDAS-INSTRUCTOR-SERVICE | desc: Cobros de deudas de tutores por relevo post-pago (FT-001)
import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  runTransaction,
  arrayUnion,
  Timestamp,
  where
} from 'firebase/firestore';
import { db } from '../../shared/firebase/firebase';

const APP_ID = 'motoescuela-pro-v1';

const COL_DEUDAS_INSTRUCTOR = 'deudasInstructor';
const COL_LEDGER_INSTRUCTOR = 'ledgerInstructor';
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

export const DeudasInstructorService = {
  /**
   * Registra un pago (parcial o total) de una deuda de tutor.
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

    const deudaRef = doc(db, COL_DEUDAS_INSTRUCTOR, deudaId);
    const movimientoRef = doc(collection(db, ...COL_MOVIMIENTOS));
    const ledgerRef = doc(collection(db, COL_LEDGER_INSTRUCTOR));
    const ahora = Timestamp.now();
    const fechaISO = new Date().toISOString().split('T')[0];

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
          categoria: 'recuperacion_deuda_instructor',
          monto: montoPago,
          moneda,
          fecha: fechaISO,
          desc: `Recuperación deuda tutor ${deuda.instructorId || deudaId}`,
          userId: pagadoPor,
          createdBy: pagadoPor,
          createdAt: ahora,
          estado: 'confirmado',
          origen: 'pago_deuda_instructor',
          origenId: deudaId,
          deudaId,
          instructorId: deuda.instructorId || null,
          reservaId: deuda.reservaId || null,
          metodoPago,
          referencia: referencia || '',
          banco: banco || '',
          montoVES: montoVES != null ? redondear2(montoVES) : null,
          tasaAplicada: tasaAplicada != null ? Number(tasaAplicada) : null
        });

        transaction.set(ledgerRef, {
          tipo: 'pago_deuda',
          instructorId: deuda.instructorId || null,
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

  async obtenerDeudasInstructor(instructorId, { soloPendientes = true } = {}) {
    if (!instructorId) {
      return { success: false, error: { code: 'invalid-args', message: 'Falta instructorId' } };
    }
    try {
      const q = query(
        collection(db, COL_DEUDAS_INSTRUCTOR),
        where('instructorId', '==', String(instructorId))
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

  async obtenerTodasDeudas({ soloPendientes = true, limitDocs = 200 } = {}) {
    try {
      const tope = Math.max(1, Math.min(1000, Number(limitDocs) || 200));
      const q = query(
        collection(db, COL_DEUDAS_INSTRUCTOR),
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

  suscribirDeudasInstructor(instructorId, callback) {
    if (!instructorId) return () => {};
    const q = query(
      collection(db, COL_DEUDAS_INSTRUCTOR),
      where('instructorId', '==', String(instructorId))
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
        console.error('[DeudasInstructorService] deudas:', error);
        callback([]);
      }
    );
  }
};
