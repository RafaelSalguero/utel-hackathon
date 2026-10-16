const PESOS = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  currencyDisplay: 'narrowSymbol',
  maximumFractionDigits: 0,
});

const NUMERO = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });

export const formatMoney = (monto: number): string => PESOS.format(monto);

export const formatNumber = (n: number): string => NUMERO.format(n);

// 0.112 -> "11%"; the sign is drawn separately with an arrow.
export const formatPercent = (fraccion: number): string => `${NUMERO.format(Math.abs(fraccion) * 100)}%`;

export const formatBytes = (bytes: number): string =>
  bytes < 1024 * 1024 ? `${NUMERO.format(bytes / 1024)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
