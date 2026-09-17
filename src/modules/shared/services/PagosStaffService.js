// @build: 2026-09-16 | id: PAGOS-STAFF-SERVICE | desc: Ledger financiero de pagos a instructores y proveedores
import {
  collection,
  doc,
  runTransaction,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../shared/firebase/firebase';

const APP_ID = 'motoescuela-pro-v1';

const COL_PAGOS = ['artifacts', APP_ID, 'public', 'data', 'pagosStaff'];
const COL_RESERVAS = ['artifacts', APP_ID, 'public', 'data', 'reservas'];

const getSufijo = (tipoStaff) => (tipoStaff === 'instructor' ? 'Instructor' : 'Proveedor');

export const PagosStaffService = {
  /**
   * Crea un pago a un instructor o proveedor cubriendo una o varias reservas.
   * Transacción atómica:
   *   1. Lee cada reserva para validar ownership y estado.
   *   2. Crea el documento en `pagosStaff`.
   *   3. Actualiza cada reserva con flags + referencia al pago.
   */
    async crearPago({
    tipoStaff,
    staffId,
    staffNombre = '',
    reservaIds = [],
    montoTotal,
    moneda = 'USD',
    metodoPago = 'efectivo',
    referencia = '',
    banco = '',
    notas = '',
    pagadoPor = null,
    montoTotalVES = null,
    tasaAplicada = null,
    monedaTasa = null
  }) {
    if (!tipoStaff || !staffId || !Array.isArray(reservaIds) || reservaIds.length === 0) {
      return {
        success: false,
        error: { code: 'invalid-args', message: 'Faltan datos del pago (tipoStaff, staffId, reservaIds)' }
      };
    }
    if (tipoStaff !== 'instructor' && tipoStaff !== 'proveedor') {
      return {
        success: false,
        error: { code: 'invalid-tipo', message: 'tipoStaff debe ser instructor o proveedor' }
      };
    }

    const sufijo = getSufijo(tipoStaff);
    const campoPagado = `pagado${sufijo}`;
    const campoPagadoEn = `pagado${sufijo}En`;
    const campoPagoId = `pago${sufijo}Id`;

    const pagosRef = collection(db, ...COL_PAGOS);
    const pagoDoc = doc(pagosRef);
    const pagoId = pagoDoc.id;
    const ahora = Timestamp.now();
    const fechaISO = new Date().toISOString().split('T')[0];

    try {
      await runTransaction(db, async (transaction) => {
        // 1. Leer todas las reservas
        const reservasLeidas = [];
        for (const rid of reservaIds) {
          const ref = doc(db, ...COL_RESERVAS, rid);
          const snap = await transaction.get(ref);
          if (!snap.exists()) {
            throw new Error(`Reserva ${rid} no existe`);
          }
          reservasLeidas.push({ ref, id: rid, data: snap.data() });
        }

              // 2. Validar ownership + no pagada previamente
        //    Soporta reservas legacy (flag global) y reservas compartidas
        //    (flag por participante en instructoresInvolucrados[])
        for (const r of reservasLeidas) {
          const esCompartida = r.data.esReservaCompartida === true;
          const involucrados = r.data.instructoresInvolucrados || [];

          if (tipoStaff === 'instructor') {
            if (esCompartida) {
              const involucrado = involucrados.find(
                inv => String(inv.id) === String(staffId)
              );
              if (!involucrado) {
                throw new Error(`Reserva ${r.id} no incluye al instructor ${staffId}`);
              }
            } else {
              if (String(r.data.instructorId) !== String(staffId)) {
                throw new Error(`Reserva ${r.id} no pertenece al instructor ${staffId}`);
              }
            }
          } else {
            if (r.data.proveedorId && String(r.data.proveedorId) !== String(staffId)) {
              throw new Error(`Reserva ${r.id} no pertenece al proveedor ${staffId}`);
            }
          }

          // Chequeo de ya-pagada
          if (tipoStaff === 'instructor' && esCompartida) {
            const involucrado = involucrados.find(
              inv => String(inv.id) === String(staffId)
            );
            if (involucrado?.pagado === true) {
              throw new Error(`Ya se pagó la parte del instructor en la reserva ${r.id}`);
            }
          } else {
            if (r.data[campoPagado] === true) {
              throw new Error(`Reserva ${r.id} ya está marcada como pagada`);
            }
          }
        }

        // 3. Crear el documento del pago
              // Snapshot de cada reserva al momento del pago (trazabilidad histórica)
        // Si la reserva es compartida, la comisión se fracciona por porcentaje
        const detalles = reservasLeidas.map(r => {
          const d = r.data;
          const comisionTotal = tipoStaff === 'instructor' ? d.comisionInstructor : d.comisionProveedor;
          let comision = typeof comisionTotal === 'number' ? comisionTotal : 0;

          let porcentaje = 100;
          if (tipoStaff === 'instructor' && d.esReservaCompartida === true) {
            const involucrado = (d.instructoresInvolucrados || []).find(
              inv => String(inv.id) === String(staffId)
            );
            if (involucrado && typeof involucrado.porcentaje === 'number') {
              porcentaje = involucrado.porcentaje;
              comision = comision * (porcentaje / 100);
            }
          }

          return {
            reservaId: r.id,
            fecha: d.fecha || null,
            horaId: d.horaId || null,
            cursoId: d.cursoId || null,
            tipoCurso: d.tipoCurso || null,
            sedeId: d.sedeId || null,
            instructorId: d.instructorId || null,
            estudiante: `${d.nombre || ''} ${d.apellido || ''}`.trim(),
            cedula: d.cedula || null,
            comision,
            porcentaje,
            esReservaCompartida: d.esReservaCompartida === true
          };
        });

              transaction.set(pagoDoc, {
          tipoStaff,
          staffId,
          staffNombre,
          reservaIds: [...reservaIds],
          montoTotal: Number(montoTotal) || 0,
          moneda,
          metodoPago,
          referencia: referencia || '',
          banco: banco || '',
          notas,
          pagadoPor,
          fecha: fechaISO,
          timestamp: ahora,
          createdAt: ahora,
          detalles,
          montoTotalVES: montoTotalVES != null ? Number(montoTotalVES) : null,
          tasaAplicada: tasaAplicada != null ? Number(tasaAplicada) : null,
          monedaTasa: monedaTasa || null
        });

               // 4. Marcar cada reserva
        //    - Legacy / no compartida: flag global pagadoInstructor/Proveedor
        //    - Compartida: actualiza el participante y, si todos pagados,
        //      escribe también el flag global para compatibilidad
        for (const r of reservasLeidas) {
          const esCompartida = r.data.esReservaCompartida === true;

          if (tipoStaff === 'instructor' && esCompartida) {
            const involucrados = (r.data.instructoresInvolucrados || []).map(inv => {
              if (String(inv.id) === String(staffId)) {
                return { ...inv, pagado: true, pagadoEn: ahora, pagoId };
              }
              return inv;
            });

            const todosPagados = involucrados.every(inv => inv.pagado === true);

            const updates = { instructoresInvolucrados: involucrados };
            if (todosPagados) {
              updates[campoPagado] = true;
              updates[campoPagadoEn] = ahora;
              updates[campoPagoId] = pagoId;
            }
            transaction.update(r.ref, updates);
          } else {
            transaction.update(r.ref, {
              [campoPagado]: true,
              [campoPagadoEn]: ahora,
              [campoPagoId]: pagoId
            });
          }
        }
      });

      return { success: true, data: { id: pagoId } };
    } catch (error) {
      return {
        success: false,
        error: { code: 'transaction-failed', message: error.message }
      };
    }
  },

  /**
   * Devuelve los pagos de un staff concreto, opcionalmente filtrados por rango de fechas.
   * Filtro de fechas se aplica en memoria para no exigir índices extra.
   */
  async obtenerPagosPorStaff(staffId, tipoStaff, { fechaInicio, fechaFin, limitDocs = 100 } = {}) {
    if (!staffId || !tipoStaff) {
      return { success: false, error: { code: 'invalid-args', message: 'Faltan staffId o tipoStaff' } };
    }
    try {
      const q = query(
        collection(db, ...COL_PAGOS),
        where('staffId', '==', String(staffId)),
        orderBy('fecha', 'desc'),
        limit(limitDocs)
      );
      const snap = await getDocs(q);
      let pagos = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      pagos = pagos.filter(p => p.tipoStaff === tipoStaff);

      if (fechaInicio || fechaFin) {
        pagos = pagos.filter(p => {
          if (fechaInicio && p.fecha < fechaInicio) return false;
          if (fechaFin && p.fecha > fechaFin) return false;
          return true;
        });
      }

      return { success: true, data: pagos };
    } catch (error) {
      return { success: false, error: { code: error.code, message: error.message } };
    }
  },

  /**
   * Devuelve el pago asociado a una reserva concreta (si existe).
   */
  async obtenerPagosPorReserva(reservaId) {
    if (!reservaId) {
      return { success: false, error: { code: 'invalid-args', message: 'Falta reservaId' } };
    }
    try {
      const q = query(
        collection(db, ...COL_PAGOS),
        where('reservaIds', 'array-contains', String(reservaId)),
        limit(5)
      );
      const snap = await getDocs(q);
      return {
        success: true,
        data: snap.docs.map(d => ({ id: d.id, ...d.data() }))
      };
    } catch (error) {
      return { success: false, error: { code: error.code, message: error.message } };
    }
  }
};
