// @build: 2026-09-03 | id: CURRENCY-FORMAT | desc: Utilidad para formatear montos de dinero
export function formatearMonto(monto, moneda = 'USD') {
  if (monto === null || monto === undefined) return '$0.00';
  
  return new Intl.NumberFormat('es-VE', {
    style: 'currency',
    currency: moneda,
    minimumFractionDigits: 2
  }).format(monto);
}
