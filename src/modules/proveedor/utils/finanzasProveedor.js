// Finanzas del proveedor: cálculos puros sobre el espejo `ocupacionConfirmada`,
// `pagosStaff` y `deudasProveedor`. Sin lecturas ni escrituras.
//
// El portal del proveedor solo puede leer el espejo, sus propios pagos y sus
// propias deudas; estas funciones no amplían ese alcance.

import { construirAsignacionesProveedor } from '../../shared/utils/finanzasHelpers.js';

const numero = (valor, fallback = 0) => {
  const n = Number(valor);
  return Number.isFinite(n) ? n : fallback;
};

const redondear2 = (valor) => Math.round((numero(valor) + Number.EPSILON) * 100) / 100;

export const idIgual = (a, b) => {
  if (a == null || b == null) return false;
  return String(a) === String(b);
};

// Acepta Timestamp de Firestore, Date, epoch ms o ISO.
export const aMs = (valor) => {
  if (valor == null) return 0;
  if (typeof valor.toMillis === 'function') {
    try {
      return valor.toMillis();
    } catch {
      return 0;
    }
  }
  if (valor instanceof Date) return valor.getTime();
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : 0;
  if (typeof valor === 'string') {
    const ms = Date.parse(valor);
    return Number.isFinite(ms) ? ms : 0;
  }
  return 0;
};

const fechaLocalISO = (ms) => {
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dia}`;
};

export const comoFechaISO = (valor) => {
  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}/.test(valor)) {
    return valor.slice(0, 10);
  }
  const ms = aMs(valor);
  return ms > 0 ? fechaLocalISO(ms) : '';
};

export const etiquetaMetodo = (metodo) => {
  const mapa = {
    efectivo: 'Efectivo',
    pago_movil: 'Pago Móvil',
    transferencia: 'Transferencia',
    zelle: 'Zelle',
    usdt: 'USDT',
    banco: 'Banco',
    otro: 'Otro'
  };
  return mapa[String(metodo || '').toLowerCase()] || (metodo ? String(metodo) : '—');
};

// Asignaciones (D1/D2/unico) de la comisión del proveedor en una reserva.
export function asignacionesProveedor(reserva, uid, config = {}) {
  if (!reserva || !uid) return [];
  return construirAsignacionesProveedor(reserva, config)
    .filter((asignacion) => idIgual(asignacion.proveedorId, uid));
}

// Reservas aprobadas con comisión pendiente de pago para este proveedor.
export function reservasPorCobrar(reservas = [], uid, config = {}) {
  if (!uid) return [];
  return (reservas || [])
    .flatMap((reserva) => {
      if (!reserva) return [];
      if (reserva.estadoPago !== 'Aprobado') return [];
      if (reserva.estadoCurso === 'Cancelado') return [];
      const pendientes = asignacionesProveedor(reserva, uid, config)
        .filter((asignacion) => asignacion.pagado !== true && numero(asignacion.monto) > 0);
      if (pendientes.length === 0) return [];
      return [{
        id: reserva.id,
        reserva,
        fecha: reserva.fecha || reserva.fecha2 || '',
        tipoCurso: reserva.tipoCurso || '',
        sedeId: reserva.sedeId || '',
        dias: pendientes.map((asignacion) => asignacion.dia),
        monto: redondear2(pendientes.reduce((acc, asignacion) => acc + numero(asignacion.monto), 0))
      }];
    })
    .sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')));
}

export function calcularResumenProveedor({
  reservas = [],
  pagos = [],
  deudas = [],
  uid,
  config = {}
} = {}) {
  const porCobrar = reservasPorCobrar(reservas, uid, config)
    .reduce((acc, item) => acc + numero(item.monto), 0);

  let cobrado = 0;
  for (const reserva of reservas || []) {
    if (!reserva || reserva.estadoPago !== 'Aprobado') continue;
    if (reserva.estadoCurso === 'Cancelado') continue;
    for (const asignacion of asignacionesProveedor(reserva, uid, config)) {
      if (asignacion.pagado === true) cobrado += numero(asignacion.monto);
    }
  }

  const pagosNeto = (pagos || []).reduce((acc, pago) => acc + numero(pago?.montoTotal), 0);
  const pagosBruto = (pagos || []).reduce(
    (acc, pago) => acc + numero(pago?.montoBruto, numero(pago?.montoTotal)),
    0
  );
  const descuentosEnPagos = (pagos || []).reduce((acc, pago) => acc + numero(pago?.descuentoDeuda), 0);

  const deudaPendiente = (deudas || [])
    .filter((deuda) => (deuda?.estado || 'pendiente') === 'pendiente')
    .reduce((acc, deuda) => acc + Math.max(0, numero(deuda?.saldo)), 0);

  const abonos = (deudas || []).flatMap((deuda) => deuda?.abonos || []);
  const deudaPagada = abonos.reduce((acc, abono) => acc + numero(abono?.monto), 0);

  return {
    cobrado: redondear2(cobrado),
    porCobrar: redondear2(porCobrar),
    comisionTotal: redondear2(cobrado + porCobrar),
    pagosNeto: redondear2(pagosNeto),
    pagosBruto: redondear2(pagosBruto),
    descuentosEnPagos: redondear2(descuentosEnPagos),
    deudaPendiente: redondear2(deudaPendiente),
    deudaPagada: redondear2(deudaPagada)
  };
}

// Historial unificado: pagos recibidos, abonos/descuentos de deuda y solicitudes
// informativas. Las solicitudes aprobadas no se duplican: el abono es el registro
// contable real.
export function construirHistorial({ pagos = [], deudas = [], solicitudes = [] } = {}) {
  const items = [];

  for (const pago of pagos || []) {
    if (!pago) continue;
    const ms = aMs(pago.timestamp) || aMs(pago.createdAt) || aMs(pago.fecha);
    items.push({
      id: `pago:${pago.id || ms}`,
      tipo: 'pago',
      fechaMs: ms,
      fecha: comoFechaISO(pago.fecha) || comoFechaISO(ms),
      monto: redondear2(pago.montoTotal),
      montoBruto: redondear2(numero(pago.montoBruto, numero(pago.montoTotal))),
      descuentoDeuda: redondear2(pago.descuentoDeuda),
      moneda: pago.moneda || null,
      metodoPago: pago.metodoPago || '',
      referencia: pago.referencia || '',
      banco: pago.banco || '',
      reservaIds: Array.isArray(pago.reservaIds) ? pago.reservaIds : [],
      detalle: 'Pago de comisión',
      informativo: false
    });
  }

  for (const deuda of deudas || []) {
    if (!deuda) continue;
    const abonos = Array.isArray(deuda.abonos) ? deuda.abonos : [];
    abonos.forEach((abono, indice) => {
      if (!abono) return;
      const esDescuento = abono.tipo === 'descuento';
      const ms = aMs(abono.fecha);
      items.push({
        id: `abono:${deuda.id || 'deuda'}:${indice}`,
        tipo: esDescuento ? 'descuento' : 'abono',
        fechaMs: ms,
        fecha: comoFechaISO(abono.fecha),
        monto: redondear2(abono.monto),
        moneda: abono.moneda || deuda.moneda || null,
        metodoPago: abono.metodoPago || '',
        referencia: abono.referencia || '',
        banco: abono.banco || '',
        reservaId: deuda.reservaId || null,
        detalle: esDescuento ? 'Descuento automático de deuda' : 'Abono a deuda',
        informativo: false
      });
    });

    // Deuda legacy saldada sin detalle de abonos: un solo registro histórico.
    if ((deuda.estado || '') === 'saldada' && abonos.length === 0) {
      const ms = aMs(deuda.actualizado) || aMs(deuda.createdAt);
      items.push({
        id: `deuda:${deuda.id || ms}`,
        tipo: 'deuda_saldada',
        fechaMs: ms,
        fecha: comoFechaISO(deuda.actualizado) || comoFechaISO(deuda.createdAt),
        monto: redondear2(numero(deuda.montoOriginal, deuda.saldo)),
        moneda: deuda.moneda || null,
        metodoPago: '',
        referencia: '',
        banco: '',
        reservaId: deuda.reservaId || null,
        detalle: 'Deuda saldada',
        informativo: false
      });
    }
  }

  for (const solicitud of solicitudes || []) {
    if (!solicitud) continue;
    const estado = solicitud.estado || 'pendiente';
    if (estado === 'aprobada') continue; // ya figura como abono
    const ms = aMs(solicitud.createdAt) || aMs(solicitud.fecha);
    items.push({
      id: `solicitud:${solicitud.id || ms}`,
      tipo: 'solicitud',
      estadoSolicitud: estado,
      fechaMs: ms,
      fecha: comoFechaISO(solicitud.createdAt),
      monto: redondear2(solicitud.monto),
      moneda: solicitud.moneda || null,
      metodoPago: solicitud.metodoPago || '',
      referencia: solicitud.referencia || '',
      banco: solicitud.banco || '',
      reservaId: solicitud.reservaId || null,
      detalle: estado === 'rechazada' ? 'Solicitud de pago rechazada' : 'Solicitud de pago en revisión',
      informativo: true
    });
  }

  return items.sort((a, b) => {
    if (b.fechaMs !== a.fechaMs) return b.fechaMs - a.fechaMs;
    return String(b.fecha || '').localeCompare(String(a.fecha || ''));
  });
}

export function filtrarHistorial(
  items = [],
  { tipo = 'todo', desde = '', hasta = '' } = {}
) {
  const porTipo = {
    todo: () => true,
    pago: (item) => item.tipo === 'pago',
    abono: (item) => item.tipo === 'abono' || item.tipo === 'descuento',
    deuda: (item) => item.tipo === 'deuda_saldada'
  };
  const coincideTipo = porTipo[tipo] || porTipo.todo;

  return (items || []).filter((item) => {
    if (!coincideTipo(item)) return false;
    if (!desde && !hasta) return true;
    if (!item.fecha) return false;
    if (desde && item.fecha < desde) return false;
    if (hasta && item.fecha > hasta) return false;
    return true;
  });
}

// Desglose mensual de movimientos reales (pagos, abonos y descuentos).
export function resumenMensual(items = [], meses = 6) {
  const grupos = new Map();
  for (const item of items || []) {
    if (!item || item.informativo) continue;
    if (!['pago', 'abono', 'descuento'].includes(item.tipo)) continue;
    const clave = (item.fecha || '').slice(0, 7);
    if (!clave) continue;
    if (!grupos.has(clave)) {
      grupos.set(clave, { mes: clave, pagos: 0, abonos: 0, descuentos: 0 });
    }
    const grupo = grupos.get(clave);
    if (item.tipo === 'pago') grupo.pagos += numero(item.monto);
    else if (item.tipo === 'descuento') grupo.descuentos += numero(item.monto);
    else grupo.abonos += numero(item.monto);
  }

  return Array.from(grupos.values())
    .map((grupo) => ({
      ...grupo,
      pagos: redondear2(grupo.pagos),
      abonos: redondear2(grupo.abonos),
      descuentos: redondear2(grupo.descuentos),
      total: redondear2(grupo.pagos + grupo.abonos + grupo.descuentos)
    }))
    .sort((a, b) => b.mes.localeCompare(a.mes))
    .slice(0, meses);
}
