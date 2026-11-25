// @build: 2026-11-24 | id: MOVILIDAD-PRICING-1 | desc: Tarifa pura del servicio de movilidad (plana o por km progresivo), sin tocar el precio del curso.

import { calcularPagoTotalVES } from './precioIndividual.js';

// v1 admite kmIncluidosMinimo; la regla fija version == 1.
export const MOVILIDAD_VERSION = 1;

export const MOVILIDAD_DEFAULTS = Object.freeze({
  activo: false,
  modalidad: 'plana', // 'plana' | 'porKm'
  tarifaPlanaUSD: 0,
  precioPorKmUSD: 0,
  kmEstandar: 20,
  factorProgresivo: 1.25,
  kmTope: 40,
  minimoUSD: 0,
  // ERR-071: km cubiertos por el mínimo. 0 = automático (minimoUSD / precioPorKmUSD).
  kmIncluidosMinimo: 0,
  redondeoUSD: 'centavos', // 'centavos' | '0.50'
  penalizacionPct: 20,
  ventanaCancelacionHoras: 2,
  modoPago: 'directo', // 'directo' (al prestador) | 'app' (futuro)
});

const num = (valor, defecto = 0) => {
  const n = Number(valor);
  return Number.isFinite(n) ? n : defecto;
};

const redondear2 = (valor) => Math.round((num(valor) + Number.EPSILON) * 100) / 100;

/**
 * Normaliza la configuración de `configuraciones/main.movilidad`.
 * Nunca lanza: devuelve defaults seguros para que el módulo quede inactivo
 * si el admin no lo configuró.
 */
export function normalizarConfigMovilidad(config = {}) {
  const c = config && typeof config === 'object' ? config : {};
  const modalidad = c.modalidad === 'porKm' ? 'porKm' : 'plana';
  const redondeoUSD = c.redondeoUSD === '0.50' ? '0.50' : 'centavos';
  const modoPago = c.modoPago === 'app' ? 'app' : 'directo';
  return {
    activo: c.activo === true,
    modalidad,
    tarifaPlanaUSD: Math.max(0, num(c.tarifaPlanaUSD)),
    precioPorKmUSD: Math.max(0, num(c.precioPorKmUSD)),
    kmEstandar: Math.max(0, num(c.kmEstandar, MOVILIDAD_DEFAULTS.kmEstandar)),
    factorProgresivo: Math.max(1, num(c.factorProgresivo, MOVILIDAD_DEFAULTS.factorProgresivo)),
    kmTope: Math.max(0, num(c.kmTope, MOVILIDAD_DEFAULTS.kmTope)),
    minimoUSD: Math.max(0, num(c.minimoUSD)),
    kmIncluidosMinimo: Math.max(0, num(c.kmIncluidosMinimo)),
    redondeoUSD,
    penalizacionPct: Math.min(100, Math.max(0, num(c.penalizacionPct, MOVILIDAD_DEFAULTS.penalizacionPct))),
    ventanaCancelacionHoras: Math.max(0, num(c.ventanaCancelacionHoras, MOVILIDAD_DEFAULTS.ventanaCancelacionHoras)),
    modoPago,
  };
}

/**
 * Redondeo del monto en USD. `centavos` = 2 decimales (default del Operador).
 * `0.50` = pasos de medio dólar, para tablas de tarifa.
 */
export function redondearUSD(valor, modo = 'centavos') {
  const n = num(valor);
  if (modo === '0.50') return redondear2(Math.round(n * 2) / 2);
  return redondear2(n);
}

/**
 * Tarifa de un servicio de movilidad.
 *
 * - La distancia es la de IDA (origen del estudiante -> sede).
 * - El monto es UNO SOLO y cubre el viaje ida y vuelta; no se multiplica por 2.
 * - `plana`: monto único por día de servicio.
 * - `porKm`: hasta `kmIncluidosMinimo` (o `minimoUSD / precioPorKmUSD` si es 0)
 *   se cobra solo el mínimo; sobre eso se suma `minimoUSD` + km estándar a
 *   `precioPorKmUSD` + excedente sobre `kmEstandar` con `factorProgresivo`.
 *   `kmTope` corta el servicio.
 *
 * Devuelve siempre un objeto; `disponible:false` con `motivo` si no se puede
 * cotizar (inactivo, fuera de cobertura, distancia inválida o tarifa en cero).
 */
export function calcularTarifaMovilidad({ config = {}, distanciaKm } = {}) {
  const c = normalizarConfigMovilidad(config);
  const d = num(distanciaKm, NaN);

  if (!c.activo) return { disponible: false, motivo: 'inactivo' };
  if (!Number.isFinite(d) || d <= 0) return { disponible: false, motivo: 'distancia-invalida' };
  if (c.kmTope > 0 && d > c.kmTope) {
    return { disponible: false, motivo: 'fuera-cobertura', distanciaKm: redondear2(d), kmTope: c.kmTope };
  }

  let bruto = 0;
  let detalle = null;

  if (c.modalidad === 'plana') {
    bruto = c.tarifaPlanaUSD;
    detalle = { modalidad: 'plana', tarifaPlanaUSD: c.tarifaPlanaUSD };
  } else {
    // ERR-071: km incluidos en el mínimo. 0/vacío = automático (reproduce el piso actual).
    const kmIncluidos = c.kmIncluidosMinimo > 0
      ? c.kmIncluidosMinimo
      : (c.minimoUSD > 0 && c.precioPorKmUSD > 0 ? c.minimoUSD / c.precioPorKmUSD : 0);
    const kmEstandar = Math.max(0, Math.min(d, c.kmEstandar) - kmIncluidos);
    const kmExtra = Math.max(0, d - Math.max(c.kmEstandar, kmIncluidos));
    const costoEstandar = kmEstandar * c.precioPorKmUSD;
    const costoExtra = kmExtra * c.precioPorKmUSD * c.factorProgresivo;
    if (c.minimoUSD > 0 && d <= kmIncluidos) {
      bruto = c.minimoUSD;
    } else {
      bruto = (c.minimoUSD > 0 ? c.minimoUSD : 0) + costoEstandar + costoExtra;
    }
    detalle = {
      modalidad: 'porKm',
      kmIncluidosMinimo: redondear2(kmIncluidos),
      kmEstandar,
      kmExtra: redondear2(kmExtra),
      precioPorKmUSD: c.precioPorKmUSD,
      factorProgresivo: c.factorProgresivo,
      costoEstandar: redondear2(costoEstandar),
      costoExtra: redondear2(costoExtra),
    };
  }

  if (bruto < c.minimoUSD) bruto = c.minimoUSD;
  const montoUSD = redondearUSD(bruto, c.redondeoUSD);
  if (!(montoUSD > 0)) return { disponible: false, motivo: 'tarifa-no-configurada' };

  return {
    disponible: true,
    modalidad: c.modalidad,
    distanciaKm: redondear2(d),
    montoUSD,
    detalle,
    configuracion: c,
  };
}

/** Monto en Bs con la tasa congelada, igual que el resto de la app. */
export function calcularMontoVESMovilidad(montoUSD, tasaFX) {
  return calcularPagoTotalVES(montoUSD, tasaFX);
}

/**
 * Regla del Operador para mover el pin: si la nueva distancia cuesta más, se
 * cobra la diferencia; si cuesta menos, no hay reembolso.
 */
export function calcularDiferenciaUbicacion({ montoActualUSD, montoNuevoUSD } = {}) {
  const actual = redondear2(montoActualUSD);
  const nuevo = redondear2(montoNuevoUSD);
  const diferencia = redondear2(nuevo - actual);
  if (diferencia > 0) return { cobrarDiferencia: true, diferenciaUSD: diferencia, reembolsoUSD: 0 };
  return { cobrarDiferencia: false, diferenciaUSD: 0, reembolsoUSD: 0, ahorroUSD: redondear2(actual - nuevo) };
}

/** Penalización de cancelación sobre el monto del servicio. */
export function calcularPenalizacionMovilidad({ montoUSD, penalizacionPct } = {}) {
  const pct = Math.min(100, Math.max(0, num(penalizacionPct, MOVILIDAD_DEFAULTS.penalizacionPct)));
  return {
    penalizacionPct: pct,
    montoUSD: redondearUSD(num(montoUSD) * (pct / 100)),
  };
}

/**
 * Snapshot inmutable que se guarda en la solicitud. No entra en `reservas`
 * ni en `preciosCurso`: el costo de movilidad no es parte del precio del curso.
 */
export function construirSnapshotMovilidad({
  config = {},
  distanciaKm,
  tasaFX,
  calculadoEn = null,
  calculadoPor = null,
} = {}) {
  const tarifa = calcularTarifaMovilidad({ config, distanciaKm });
  if (!tarifa.disponible) return tarifa;
  const c = tarifa.configuracion;
  return {
    version: MOVILIDAD_VERSION,
    disponible: true,
    modalidad: tarifa.modalidad,
    distanciaKm: tarifa.distanciaKm,
    montoUSD: tarifa.montoUSD,
    montoVES: calcularMontoVESMovilidad(tarifa.montoUSD, tasaFX),
    tasaFX: num(tasaFX, 1),
    detalle: tarifa.detalle,
    penalizacionPct: c.penalizacionPct,
    ventanaCancelacionHoras: c.ventanaCancelacionHoras,
    modoPago: c.modoPago,
    calculadoEn,
    calculadoPor,
  };
}
