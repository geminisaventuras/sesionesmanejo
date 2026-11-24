// @build: 2026-11-23 | id: T-065 | desc: Cálculos puros del Home admin (ocupación, motos activas, ingresos del mes y actividad reciente).
//
// No escribe datos ni define reglas de negocio nuevas: agrupa el mismo estado que ya
// consumen el Home y el centro de alertas para que los KPIs sean verificables.

import { msDeFecha } from './alertasAdmin.js';

/**
 * Reservas/bloques ocupados hoy. No se usa denominador porque todavía no existe una
 * regla real de capacidad por tutores, motos y sedes.
 */
export function contarReservasHoy(reservas = [], hoyStr) {
  if (!hoyStr) return 0;
  return (reservas || []).filter(
    (reserva) => (reserva?.estadoPago === 'Aprobado' || reserva?.estadoPago === 'Pendiente')
      && (reserva?.fecha === hoyStr || reserva?.fecha2 === hoyStr)
  ).length;
}

export function contarMotosActivas(motos = []) {
  return (motos || []).filter((moto) => moto?.activo).length;
}

const esHijaDePack = (reserva) => reserva?.tipoReserva === 'pack_sub' || Boolean(reserva?.packReservaId);

const esDelMes = (valor, ahora) => {
  const ms = msDeFecha(valor);
  if (ms === null) return false;
  const fecha = new Date(ms);
  return fecha.getMonth() === ahora.getMonth() && fecha.getFullYear() === ahora.getFullYear();
};

/**
 * Ingresos del mes por FECHA DE COMPRA (no por fecha del curso):
 * - reservas individuales aprobadas, excluyendo hijas de pack (`pack_sub` o con
 *   `packReservaId`) para evitar doble conteo;
 * - maestras de `reservasPack` aprobadas, usando `fechaCompra` y `createdAt` como respaldo.
 *
 * Se suman los campos ya expresados en la moneda configurada (`pagoTotalMoneda`) y no se
 * aplica conversión de moneda. La definición exacta queda pendiente de confirmación del
 * Operador (pagos parciales, reembolsos y tasas históricas).
 */
export function calcularIngresosMes({ reservas = [], packs = [], ahora = new Date() } = {}) {
  const totalReservas = (reservas || [])
    .filter((reserva) => reserva?.estadoPago === 'Aprobado' && !esHijaDePack(reserva))
    .filter((reserva) => esDelMes(reserva?.createdAt ?? reserva?.fechaCompra, ahora))
    .reduce((acc, reserva) => acc + (Number(reserva?.pagoTotalMoneda) || 0), 0);

  const totalPacks = (packs || [])
    .filter((pack) => pack?.estadoPago === 'Aprobado')
    .filter((pack) => esDelMes(pack?.fechaCompra ?? pack?.createdAt, ahora))
    .reduce((acc, pack) => acc + (Number(pack?.pagoTotalMoneda) || 0), 0);

  return totalReservas + totalPacks;
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
