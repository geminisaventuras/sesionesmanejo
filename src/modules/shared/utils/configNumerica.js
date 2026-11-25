// @build: 2026-11-21 | id: CONFIG-NUMERICA | desc: Normaliza los campos monetarios de configuración para que reglas y cálculo puro operen con números.

export const CAMPOS_NUMERICOS_CONFIG = [
  'tasaUSD',
  'tasaEUR',
  'tasaUSDT',
  'precioBase',
  'recargoGuarenas',
  'recargoSinBici',
  'descuentoMotoPropia',
  'descuentoPromo',
  'pagoInstructor',
  'pagoProveedor'
];

// FT-058: la tarifa de movilidad se guarda numérica para que cliente y reglas
// calculen lo mismo. `modalidad`, `redondeoUSD`, `modoPago` y `activo` no se tocan.
export const CAMPOS_NUMERICOS_MOVILIDAD = [
  'tarifaPlanaUSD',
  'precioPorKmUSD',
  'kmEstandar',
  'factorProgresivo',
  'kmTope',
  'minimoUSD',
  'kmIncluidosMinimo',
  'penalizacionPct',
  'ventanaCancelacionHoras'
];

function normalizarObjeto(obj, campos) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const salida = { ...obj };
  for (const campo of campos) {
    if (!(campo in salida)) continue;
    const valor = salida[campo];
    if (valor === '' || valor === null || valor === undefined) {
      salida[campo] = 0;
      continue;
    }
    const numero = Number(valor);
    salida[campo] = Number.isFinite(numero) ? numero : 0;
  }
  return salida;
}

export function normalizarConfigNumerica(config = {}) {
  if (!config || typeof config !== 'object') return config;
  const salida = { ...config };
  for (const campo of CAMPOS_NUMERICOS_CONFIG) {
    if (!(campo in salida)) continue;
    const valor = salida[campo];
    if (valor === '' || valor === null || valor === undefined) {
      salida[campo] = 0;
      continue;
    }
    const numero = Number(valor);
    salida[campo] = Number.isFinite(numero) ? numero : 0;
  }
  if ('movilidad' in salida) {
    salida.movilidad = normalizarObjeto(salida.movilidad, CAMPOS_NUMERICOS_MOVILIDAD);
    // FT-058: se normaliza al guardar para que cliente y reglas calculen igual.
    if (salida.movilidad && typeof salida.movilidad === 'object' && !Array.isArray(salida.movilidad)) {
      const m = { ...salida.movilidad };
      m.tarifaPlanaUSD = Math.max(0, Number(m.tarifaPlanaUSD) || 0);
      m.precioPorKmUSD = Math.max(0, Number(m.precioPorKmUSD) || 0);
      m.kmEstandar = Math.max(0, Number(m.kmEstandar) || 0);
      m.factorProgresivo = Math.max(1, Number(m.factorProgresivo) || 1);
      m.kmTope = Math.max(0, Number(m.kmTope) || 0);
      m.minimoUSD = Math.max(0, Number(m.minimoUSD) || 0);
      m.kmIncluidosMinimo = Math.max(0, Number(m.kmIncluidosMinimo) || 0);
      m.penalizacionPct = Math.min(100, Math.max(0, Number(m.penalizacionPct) || 0));
      m.ventanaCancelacionHoras = Math.max(0, Number(m.ventanaCancelacionHoras) || 0);
      salida.movilidad = m;
    }
  }
  return salida;
}
