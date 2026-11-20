// @build: 2026-11-19 | id: CURRENCY-FORMAT-ENTERPRISE | desc: Formato de moneda seguro para USD, EUR, VES y USDT
const MONEDAS_ISO = new Set(['USD', 'EUR', 'VES', 'COP', 'PEN', 'MXN', 'ARS', 'CLP', 'BRL']);

const numeroSeguro = (monto) => {
  const n = Number(monto);
  return Number.isFinite(n) ? n : 0;
};

export function formatearNumero(monto, { max = 2 } = {}) {
  return new Intl.NumberFormat('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: max
  }).format(numeroSeguro(monto));
}

export function formatearMonto(monto, moneda = 'USD') {
  const codigo = String(moneda || 'USD').toUpperCase();
  const n = numeroSeguro(monto);

  if (MONEDAS_ISO.has(codigo)) {
    try {
      return new Intl.NumberFormat('es-VE', {
        style: 'currency',
        currency: codigo,
        currencyDisplay: 'narrowSymbol',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(n);
    } catch {
      // Fallback para entornos sin datos ISO completos.
    }
  }

  return `${codigo} ${formatearNumero(n)}`;
}

export function formatearMontoCompacto(monto, moneda = 'USD') {
  const codigo = String(moneda || 'USD').toUpperCase();
  const n = numeroSeguro(monto);
  if (Math.abs(n) < 10000) return formatearMonto(n, codigo);

  const compacto = new Intl.NumberFormat('es-VE', {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(n);

  return `${codigo} ${compacto}`;
}

