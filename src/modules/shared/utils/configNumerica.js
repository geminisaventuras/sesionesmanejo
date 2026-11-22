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
  return salida;
}
