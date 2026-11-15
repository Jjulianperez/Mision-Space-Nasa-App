const FORMATTERS = [0, 1, 2].map(
  (digits) =>
    new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }),
);

export function formatNumber(value: number, decimals: 0 | 1 | 2 = 0): string {
  return FORMATTERS[decimals].format(value);
}

export function formatKg(value: number): string {
  return `${formatNumber(value)} kg`;
}

export function formatMillions(value: number): string {
  return `${formatNumber(value)} M$`;
}

/** Potencias en kW: sin decimales cuando el valor es entero, uno en caso contrario. */
export function formatKw(value: number): string {
  return `${formatNumber(value, Number.isInteger(value) ? 0 : 1)} kW`;
}

export function formatMbps(value: number): string {
  return `${formatNumber(value)} Mbps`;
}

export function formatPercent(value: number): string {
  return `${formatNumber(value)} %`;
}

/** Número con signo explícito («+12», «−8»), para variaciones respecto al diseño. */
export function formatSigned(value: number): string {
  if (value === 0) return '0';
  return `${value > 0 ? '+' : '−'}${formatNumber(Math.abs(value))}`;
}
