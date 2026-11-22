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
  arrayUnion,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../shared/firebase/firebase';
import {
  construirAsignacionesProveedor,
  construirAsignacionesInstructor,
  aplicarDescuentoDeuda,
  calcularTotalPago
} from '../utils/finanzasHelpers';

const APP_ID = 'motoescuela-pro-v1';

const COL_PAGOS = ['artifacts', APP_ID, 'public', 'data', 'pagosStaff'];
const COL_RESERVAS = ['artifacts', APP_ID, 'public', 'data', 'reservas'];
const COL_MOVIMIENTOS = ['artifacts', APP_ID, 'public', 'data', 'movimientos'];
// D2-FINANZAS: deudas y ledger de proveedores viven en colecciones raíz.
const COL_DEUDAS_PROVEEDOR = 'deudasProveedor';
const COL_LEDGER_PROVEEDOR = 'ledgerProveedor';
// T-025 / FT-001: deuda del tutor saliente por relevo post-pago.
const COL_DEUDAS_INSTRUCTOR = 'deudasInstructor';
const COL_LEDGER_INSTRUCTOR = 'ledgerInstructor';

const getSufijo = (tipoStaff) => (tipoStaff === 'instructor' ? 'Instructor' : 'Proveedor');

const numero = (valor, fallback = 0) => {
  const n = Number(valor);
  return Number.isFinite(n) ? n : fallback;
};

const redondear2 = (valor) => Math.round((numero(valor) + Number.EPSILON) * 100) / 100;

const idIgual = (a, b) => String(a) === String(b);

const timestampMs = (valor) => {
  if (valor == null) return 0;
  if (typeof valor.toMillis === 'function') return valor.toMillis();
  if (typeof valor === 'number') return valor;
  if (valor instanceof Date) return valor.getTime();
  const fecha = new Date(valor).getTime();
  return Number.isFinite(fecha) ? fecha : 0;
};

export const PagosStaffService = {
  /**
   * Crea un pago a un instructor o proveedor cubriendo una o varias reservas.
   * Transacción atómica:
   *   1. Lee cada reserva para validar ownership y estado.
   *   2. Crea el documento en `pagosStaff`.
   *   3. Descuenta deudas pendientes del proveedor (FIFO) del bruto.
   *   4. Actualiza cada reserva con flags + referencia al pago.
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
    monedaTasa = null,
    config = {}
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
    if (!pagadoPor) {
      return {
        success: false,
        error: { code: 'invalid-args', message: 'Falta el usuario que registra el pago (pagadoPor)' }
      };
    }

    const sufijo = getSufijo(tipoStaff);
    const campoPagado = `pagado${sufijo}`;
    const campoPagadoEn = `pagado${sufijo}En`;
    const campoPagoId = `pago${sufijo}Id`;
    const esProveedor = tipoStaff === 'proveedor';
    const COL_DEUDAS_STAFF = esProveedor ? COL_DEUDAS_PROVEEDOR : COL_DEUDAS_INSTRUCTOR;
    const COL_LEDGER_STAFF = esProveedor ? COL_LEDGER_PROVEEDOR : COL_LEDGER_INSTRUCTOR;
    const CAMPO_DEUDA_STAFF = esProveedor ? 'proveedorId' : 'instructorId';

    const pagosRef = collection(db, ...COL_PAGOS);
    const pagoDoc = doc(pagosRef);
    const pagoId = pagoDoc.id;
    const movimientoDoc = doc(collection(db, ...COL_MOVIMIENTOS));
    const ahora = Timestamp.now();
    const fechaISO = new Date().toISOString().split('T')[0];

    try {
      let movimientoIdFinal = null;
      let resumenFinal = { montoBruto: null, descuentoDeuda: 0, montoTotal: null };

      // D2-FINANZAS / FT-001: el SDK web no permite transaction.get(query). Se
      // leen las deudas candidatas fuera y dentro de la transacción se relee
      // cada doc por referencia, validando estado/saldo actuales y el FIFO.
      let deudasCandidatas = [];
      {
        const deudasSnap = await getDocs(
          query(
            collection(db, COL_DEUDAS_STAFF),
            where(CAMPO_DEUDA_STAFF, '==', String(staffId))
          )
        );
        deudasCandidatas = deudasSnap.docs
          .map((d) => ({ id: d.id, ref: d.ref, ...d.data() }))
          .filter((d) => d.estado === 'pendiente' && numero(d.saldo) > 0)
          .sort((a, b) => timestampMs(a.createdAt) - timestampMs(b.createdAt));
      }

      await runTransaction(db, async (transaction) => {
        // 0. Deudas pendientes del proveedor: relectura transaccional por doc.
        const deudasPendientes = [];
        for (const candidata of deudasCandidatas) {
          const snap = await transaction.get(candidata.ref);
          if (!snap.exists()) continue;
          const actual = snap.data();
          if (actual.estado !== 'pendiente' || numero(actual.saldo) <= 0) continue;
          deudasPendientes.push({ id: candidata.id, ref: candidata.ref, ...actual });
        }

        // 1. Leer todas las reservas
        const reservasLeidas = [];
        for (const rid of reservaIds) {
          const ref = doc(db, ...COL_RESERVAS, rid);
          const snap = await transaction.get(ref);
          if (!snap.exists()) {
            throw new Error(`Reserva ${rid} no existe`);
          }
          reservasLeidas.push({
            ref,
            id: rid,
            data: snap.data(),
            asignaciones: [],
            pendientes: []
          });
        }

        // 2. Validar ownership + no pagada previamente
        //    Instructor: mapa D1/D2 (FT-001), compartida legacy o simple.
        //    Proveedor: asignaciones D1/D2.
        for (const r of reservasLeidas) {
          const esCompartida = r.data.esReservaCompartida === true;
          const involucrados = r.data.instructoresInvolucrados || [];

          r.modoInstructor = null;
          r.pendientes = [];
          r.asignaciones = [];

          if (tipoStaff === 'instructor') {
            if (r.data.pagosInstructorDia) {
              r.modoInstructor = 'mapa';
              const asignaciones = construirAsignacionesInstructor(r.data);
              const delStaff = asignaciones.filter(
                (asignacion) => idIgual(asignacion.instructorId, staffId)
              );
              if (delStaff.length === 0) {
                throw new Error(`Reserva ${r.id} no incluye al instructor ${staffId}`);
              }
              const pendientes = delStaff.filter((asignacion) => asignacion.pagado !== true);
              if (pendientes.length === 0) {
                throw new Error(`Ya se pagó la parte del instructor en la reserva ${r.id}`);
              }
              r.asignaciones = asignaciones;
              r.pendientes = pendientes;
            } else if (esCompartida) {
              r.modoInstructor = 'compartida';
              const involucrado = involucrados.find(
                inv => String(inv.id) === String(staffId)
              );
              if (!involucrado) {
                throw new Error(`Reserva ${r.id} no incluye al instructor ${staffId}`);
              }
              if (involucrado.pagado === true) {
                throw new Error(`Ya se pagó la parte del instructor en la reserva ${r.id}`);
              }
            } else {
              r.modoInstructor = 'legacy';
              if (String(r.data.instructorId) !== String(staffId)) {
                throw new Error(`Reserva ${r.id} no pertenece al instructor ${staffId}`);
              }
              if (r.data[campoPagado] === true) {
                throw new Error(`Reserva ${r.id} ya está marcada como pagada`);
              }
              r.asignaciones = construirAsignacionesInstructor(r.data);
              r.pendientes = r.asignaciones.filter((asignacion) => asignacion.pagado !== true);
            }
          } else {
            const asignaciones = construirAsignacionesProveedor(r.data, config);
            const esDelProveedor = asignaciones.some(
              (asignacion) => idIgual(asignacion.proveedorId, staffId)
            );
            if (!esDelProveedor) {
              throw new Error(`Reserva ${r.id} no tiene comisión asignada al proveedor ${staffId}`);
            }

            const pendientes = asignaciones.filter(
              (asignacion) => idIgual(asignacion.proveedorId, staffId) && asignacion.pagado !== true
            );
            if (pendientes.length === 0) {
              throw new Error(`Reserva ${r.id} ya tiene pagada la comisión del proveedor ${staffId}`);
            }
            r.asignaciones = asignaciones;
            r.pendientes = pendientes;
          }
        }

        // 3. Crear el documento del pago
        // Snapshot de cada reserva al momento del pago (trazabilidad histórica)
        // Si la reserva es compartida, la comisión se fracciona por porcentaje.
        const detalles = [];

        if (tipoStaff === 'instructor') {
          for (const r of reservasLeidas) {
            const d = r.data;

            if (r.modoInstructor === 'compartida') {
              const comisionTotal = d.comisionInstructor;
              let comision = typeof comisionTotal === 'number' ? comisionTotal : 0;

              let porcentaje = 100;
              if (d.esReservaCompartida === true) {
                const involucrado = (d.instructoresInvolucrados || []).find(
                  inv => String(inv.id) === String(staffId)
                );
                if (involucrado && typeof involucrado.porcentaje === 'number') {
                  porcentaje = involucrado.porcentaje;
                  comision = comision * (porcentaje / 100);
                }
              }

              detalles.push({
                reservaId: r.id,
                dia: 'compartido',
                instructorId: staffId,
                fecha: d.fecha || null,
                horaId: d.horaId || null,
                cursoId: d.cursoId || null,
                tipoCurso: d.tipoCurso || null,
                sedeId: d.sedeId || null,
                estudiante: `${d.nombre || ''} ${d.apellido || ''}`.trim(),
                cedula: d.cedula || null,
                comision,
                porcentaje,
                esReservaCompartida: true
              });
              continue;
            }

            const total = numero(d.comisionInstructor);
            for (const asignacion of r.pendientes) {
              const esD2 = asignacion.dia === 'd2';
              const monto = numero(asignacion.monto);
              detalles.push({
                reservaId: r.id,
                dia: asignacion.dia,
                instructorId: asignacion.instructorId || d.instructorId || null,
                fecha: (esD2 ? (d.fecha2 || d.fecha) : d.fecha) || null,
                horaId: (esD2 ? (d.horaIdReposicion || d.horaId) : d.horaId) || null,
                cursoId: d.cursoId || null,
                tipoCurso: d.tipoCurso || null,
                sedeId: d.sedeId || null,
                estudiante: `${d.nombre || ''} ${d.apellido || ''}`.trim(),
                cedula: d.cedula || null,
                comision: monto,
                porcentaje: total > 0 ? Math.round((monto / total) * 10000) / 100 : 100,
                esReservaCompartida: false
              });
            }
          }
        } else {
          for (const r of reservasLeidas) {
            const d = r.data;
            for (const asignacion of r.pendientes) {
              const esD2 = asignacion.dia === 'd2';
              detalles.push({
                reservaId: r.id,
                dia: asignacion.dia,
                proveedorId: asignacion.proveedorId,
                fecha: (esD2 ? (d.fecha2 || d.fecha) : d.fecha) || null,
                horaId: (esD2 ? (d.horaIdReposicion || d.horaId) : d.horaId) || null,
                cursoId: d.cursoId || null,
                tipoCurso: d.tipoCurso || null,
                sedeId: d.sedeId || null,
                instructorId: d.instructorId || null,
                estudiante: `${d.nombre || ''} ${d.apellido || ''}`.trim(),
                cedula: d.cedula || null,
                comision: asignacion.monto,
                porcentaje: 100,
                esReservaCompartida: false
              });
            }
          }
        }

        // El total bruto se reconcilia contra el detalle; el detalle es la fuente.
        const bruto = calcularTotalPago(detalles, { montoTotal, montoTotalVES, tasaAplicada });

        // D2-FINANZAS / FT-001: FIFO sobre deudas del staff. El pago guarda el neto.
        const descuento = aplicarDescuentoDeuda(deudasPendientes, bruto);
        const neto = descuento.neto;
        resumenFinal = {
          montoBruto: bruto,
          descuentoDeuda: descuento.descuento,
          montoTotal: neto
        };

        // El montoTotalVES del modal viene calculado sobre el bruto. Para que la
        // caja sea coherente con el egreso real, se proporcionaliza al neto:
        // montoTotalVES_neto = montoTotalVES_bruto * (neto / bruto).
        const montoTotalVESFinal = (montoTotalVES != null && montoTotalVES !== '')
          ? (bruto > 0 ? redondear2((neto / bruto) * Number(montoTotalVES)) : 0)
          : (montoTotalVES != null ? Number(montoTotalVES) : null);

        const debeCrearMovimiento = neto > 0;

        transaction.set(pagoDoc, {
          tipoStaff,
          staffId,
          staffNombre,
          reservaIds: [...reservaIds],
          montoTotal: neto,
          montoBruto: bruto,
          descuentoDeuda: descuento.descuento,
          deudasAplicadas: descuento.aplicadas,
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
          montoTotalVES: montoTotalVESFinal,
          tasaAplicada: tasaAplicada != null ? Number(tasaAplicada) : null,
          monedaTasa: monedaTasa || null,
          movimientoId: debeCrearMovimiento ? movimientoDoc.id : null
        });

        // B-MOVIMIENTOS-ATOMICOS: el egreso nace en la misma transacción que
        // el pago y los flags; no queda un pago sin movimiento ni viceversa.
        // Si el neto es 0, no se crea egreso (solo el pago y el asiento de deuda).
        if (debeCrearMovimiento) {
          transaction.set(movimientoDoc, {
            tipo: 'egreso',
            categoria: esProveedor ? 'comision_proveedor' : 'comision_instructor',
            monto: neto,
            moneda,
            fecha: fechaISO,
            desc: `Pago ${tipoStaff}: ${staffNombre || staffId}`,
            userId: pagadoPor,
            createdBy: pagadoPor,
            createdAt: ahora,
            estado: 'confirmado',
            origen: 'pago_staff',
            origenId: pagoId,
            pagoId,
            staffId,
            tipoStaff,
            reservaIds: [...reservaIds],
            metodoPago,
            referencia: referencia || '',
            banco: banco || '',
            notas: notas || ''
          });
        }

        // 4. Marcar cada reserva
        //    - Instructor: mapa D1/D2 (FT-001), compartida legacy o simple.
        //    - Proveedor: escribe el mapa D1/D2 y solo marca pagadoProveedor
        //      cuando todas las asignaciones aplicables quedaron pagadas.
        for (const r of reservasLeidas) {
          if (tipoStaff === 'instructor') {
            if (r.modoInstructor === 'compartida') {
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
              transaction.set(
                doc(db, 'ocupacionConfirmada', r.id),
                {
                  instructoresInvolucrados: involucrados,
                  pagadoInstructor: todosPagados,
                  pagoInstructorId: todosPagados ? pagoId : null
                },
                { merge: true }
              );
            } else {
              const mapa = {};
              for (const asignacion of r.asignaciones) {
                const pagadaAhora = r.pendientes.some(
                  (pendiente) => pendiente.dia === asignacion.dia &&
                    idIgual(pendiente.instructorId, asignacion.instructorId)
                );
                const pagado = pagadaAhora || asignacion.pagado === true;
                mapa[asignacion.dia] = {
                  instructorId: asignacion.instructorId ?? null,
                  nombre: asignacion.nombre ||
                    (idIgual(asignacion.instructorId, staffId) ? staffNombre : ''),
                  monto: redondear2(asignacion.monto),
                  montoPagado: pagadaAhora
                    ? redondear2(asignacion.monto)
                    : (pagado ? redondear2(numero(asignacion.montoPagado, asignacion.monto)) : 0),
                  pagado,
                  pagoId: pagadaAhora
                    ? pagoId
                    : (asignacion.pagoId || null),
                  ...(pagadaAhora ? { pagadoEn: ahora } : {})
                };
              }

              const todasPagadas = r.asignaciones.every(
                (asignacion) => mapa[asignacion.dia]?.pagado === true
              );

              transaction.update(r.ref, {
                pagosInstructorDia: mapa,
                pagadoInstructor: todasPagadas,
                pagadoInstructorEn: ahora,
                pagoInstructorId: pagoId
              });

              // Espejo público: el portal del tutor ve su parte pagada.
              transaction.set(
                doc(db, 'ocupacionConfirmada', r.id),
                {
                  pagosInstructorDia: mapa,
                  pagadoInstructor: todasPagadas,
                  pagoInstructorId: pagoId
                },
                { merge: true }
              );
            }
          } else {
            const d = r.data;
            const mapa = {};
            for (const asignacion of r.asignaciones) {
              const previoBruto = d.pagosProveedorDia?.[asignacion.dia] || {};
              const previoDelMismo = !previoBruto.proveedorId ||
                String(previoBruto.proveedorId) === String(asignacion.proveedorId);
              const previo = previoDelMismo ? previoBruto : {};
              const pagadaAhora = r.pendientes.some(
                (pendiente) => pendiente.dia === asignacion.dia
              );
              const pagado = pagadaAhora || asignacion.pagado === true;
              mapa[asignacion.dia] = {
                ...previo,
                proveedorId: asignacion.proveedorId,
                monto: asignacion.monto,
                pagado,
                montoPagado: pagadaAhora
                  ? asignacion.monto
                  : (pagado ? numero(previo.montoPagado, asignacion.monto) : 0),
                pagoId: pagadaAhora
                  ? pagoId
                  : (asignacion.pagoId || previo.pagoId || null),
                ...(pagadaAhora ? { pagadoEn: ahora } : {})
              };
            }

            const todasPagadas = r.asignaciones.every(
              (asignacion) => mapa[asignacion.dia]?.pagado === true
            );
            const proveedoresInvolucrados = Array.from(new Set(
              r.asignaciones
                .map((asignacion) => asignacion.proveedorId)
                .filter((proveedorId) => proveedorId != null && proveedorId !== '')
                .map(String)
            ));

            transaction.update(r.ref, {
              pagosProveedorDia: mapa,
              pagoProveedorId: pagoId,
              pagadoProveedorEn: ahora,
              pagadoProveedor: todasPagadas
            });

            // Espejo público: reflejar el pago para que el portal del proveedor
            // no siga mostrando la reserva como pendiente.
            transaction.set(
              doc(db, 'ocupacionConfirmada', r.id),
              {
                pagosProveedorDia: mapa,
                pagadoProveedor: todasPagadas,
                pagoProveedorId: pagoId,
                proveedoresInvolucrados
              },
              { merge: true }
            );
          }
        }

        // 5. Descontar deudas (solo proveedor) y escribir asiento append-only.
        for (const aplicada of descuento.aplicadas) {
          const deuda = deudasPendientes.find((d) => idIgual(d.id, aplicada.deudaId));
          if (!deuda) continue;

          const nuevoSaldo = redondear2(numero(deuda.saldo) - aplicada.monto);
          transaction.update(deuda.ref, {
            saldo: nuevoSaldo,
            estado: nuevoSaldo <= 0 ? 'saldada' : 'pendiente',
            actualizado: ahora,
            abonos: arrayUnion({
              tipo: 'descuento',
              monto: aplicada.monto,
              pagoId,
              metodoPago,
              referencia: referencia || '',
              banco: banco || '',
              notas: notas || '',
              fecha: ahora,
              registradoPor: pagadoPor
            })
          });

          const ledgerRef = doc(collection(db, COL_LEDGER_STAFF));
          transaction.set(ledgerRef, {
            tipo: 'descuento_deuda',
            ...(esProveedor
              ? { proveedorId: String(staffId) }
              : { instructorId: String(staffId) }),
            deudaId: deuda.id,
            reservaId: deuda.reservaId || null,
            monto: aplicada.monto,
            pagoId,
            createdAt: ahora,
            createdBy: pagadoPor,
            idempotencyKey: `descuento:${pagoId}:${deuda.id}`
          });
        }

        movimientoIdFinal = debeCrearMovimiento ? movimientoDoc.id : null;
      });

      return { success: true, data: { id: pagoId, movimientoId: movimientoIdFinal, ...resumenFinal } };
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
