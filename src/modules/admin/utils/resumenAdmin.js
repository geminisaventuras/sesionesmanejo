// @build: 2026-11-23 | id: T-065 / ERR-033 | desc: Cálculos puros del Home admin (ocupación desde espejo, motos activas, ingresos USD del mes y actividad reciente).
//
// No escribe datos ni define reglas de negocio nuevas: agrupa el mismo estado que ya
// consumen el Home, Ocupación y el centro de alertas para que los KPIs sean verificables.

import { msDeFecha } from './alertasAdmin.js';
import { obtenerFechaVenezuela } from '../../shared/utils/zonahoraria.js';

// `pagoTotalMoneda` es el precio base en USD (ver `monedaBase` de pack/individual).
// No se usa `monedaPagoStaff`: esa moneda es la del pago al staff, no la del ingreso.
export const MONEDA_INGRESOS = 'USD';

const ESTADOS_OCUPAN = ['Pendiente', 'Aprobado'];

/**
 * Reservas que ocupan el día, leídas desde el espejo `ocupacionConfirmada`
 * (ADR-011): un documento por reserva; `fecha`/`fecha2` cubren D1 y D2 sin doble
 * conteo. No se usa denominador de capacidad porque el agregado entre sedes sigue
 * siendo una decisión abierta de ADR-011.
 */
export function contarOcupacionHoy(ocupacion = [], hoyStr) {
  if (!hoyStr) return 0;
  return (ocupacion || []).filter(
    (doc) => ESTADOS_OCUPAN.includes(doc?.estadoPago)
      && doc?.estadoCurso !== 'Cancelado'
      && (doc?.fecha === hoyStr || doc?.fecha2 === hoyStr)
  ).length;
}

export function contarMotosActivas(motos = []) {
  return (motos || []).filter((moto) => moto?.activo).length;
}

export const esHijaDePack = (reserva) =>
  reserva?.tipoReserva === 'pack_sub' || Boolean(reserva?.packReservaId);

const esIngresoAprobado = (doc) =>
  doc?.estadoPago === 'Aprobado' && doc?.estadoCurso !== 'Cancelado';

/** Fecha de compra en milisegundos; `createdAt` manda y `fechaCompra` es respaldo. */
export const fechaCompraMs = (doc) => msDeFecha(doc?.createdAt ?? doc?.fechaCompra);

/**
 * Monto del ingreso en USD. Los documentos nuevos siempre traen `pagoTotalMoneda`;
 * el respaldo cubre snapshots legacy congelados sin convertir moneda.
 */
export const montoIngresoUSD = (doc) => {
  const candidatos = [
    doc?.pagoTotalMoneda,
    doc?.precioTotalCongelado,
    doc?.precioSnapshot?.precioTotal,
    doc?.precioTotal,
    doc?.precio,
  ];
  for (const valor of candidatos) {
    const monto = Number(valor);
    if (Number.isFinite(monto) && monto > 0) return monto;
  }
  return 0;
};

// Mes calendario VET: un pago del 1.º a las 00:30 VET no debe caer en el mes UTC anterior.
const mesVETDeMs = (ms) => obtenerFechaVenezuela(new Date(ms)).slice(0, 7);

// `ahora` puede ser Date, ISO o date-only VET; un Timestamp se normaliza igual.
export const referenciaFechaVET = (ahora) => (
  ahora instanceof Date || typeof ahora === 'string'
    ? ahora
    : new Date(msDeFecha(ahora) ?? Date.now())
);

/**
 * Ingresos del mes por FECHA DE COMPRA (no por fecha del curso):
 * - reservas individuales aprobadas, excluyendo hijas de pack (`pack_sub` o con
 *   `packReservaId`) para evitar doble conteo;
 * - maestras de `reservasPack` aprobadas.
 *
 * No aplica conversión de moneda ni reembolsos: los términos vigentes no contemplan
 * devoluciones y el monto se expresa en USD (`MONEDA_INGRESOS`). Los pagos parciales
 * siguen pendientes de una definición de negocio.
 */
export function calcularIngresosMes({ reservas = [], packs = [], ahora = new Date() } = {}) {
  const mesActual = obtenerFechaVenezuela(referenciaFechaVET(ahora)).slice(0, 7);

  const sumar = (lista, filtro) => (lista || [])
    .filter(filtro)
    .filter((doc) => {
      const ms = fechaCompraMs(doc);
      return ms !== null && mesVETDeMs(ms) === mesActual;
    })
    .reduce((acc, doc) => acc + montoIngresoUSD(doc), 0);

  return sumar(reservas, (reserva) => esIngresoAprobado(reserva) && !esHijaDePack(reserva))
    + sumar(packs, esIngresoAprobado);
}

/** Últimos eventos ya registrados para administración (solo lectura). */
export function obtenerActividadReciente(notifications = [], limite = 3) {
  const vistos = new Set();
  return [...(notifications || [])]
    .filter((notif) => String(notif?.userId) === 'admin')
    .filter((notif) => {
      const id = String(notif?.id);
      if (!id || vistos.has(id)) return false;
      vistos.add(id);
      return true;
    })
    .sort((a, b) => (msDeFecha(b?.createdAt) || 0) - (msDeFecha(a?.createdAt) || 0))
    .slice(0, Math.max(0, Number(limite) || 0));
}
