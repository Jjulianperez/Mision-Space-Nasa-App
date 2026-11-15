const decimalFormatter = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const oneDecimalFormatter = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const twoDecimalFormatter = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function formatNumber(value: number, decimals = 0): string {
  if (decimals === 0) return decimalFormatter.format(value);
  if (decimals === 1) return oneDecimalFormatter.format(value);
  return twoDecimalFormatter.format(value);
}

export function formatKg(value: number): string {
  return `${formatNumber(value)} kg`;
}

export function formatMillions(value: number): string {
  return `${formatNumber(value)} M$`;
}

export function formatKw(value: number): string {
  return `${formatNumber(value, 2)} kW`;
}

export function formatMbps(value: number): string {
  return `${formatNumber(value)} Mbps`;
}

export function formatYears(value: number): string {
  return `${formatNumber(value, 2)} años`;
}

export function formatPercent(value: number, decimals = 0): string {
  return `${formatNumber(value, decimals)}%`;
}

export function formatSignedNumber(value: number, decimals = 0): string {
  if (value === 0) return '±0';
  const sign = value > 0 ? '+' : '−';
  return `${sign}${formatNumber(Math.abs(value), decimals)}`;
}

export function formatSignedKg(value: number): string {
  return `${formatSignedNumber(value)} kg`;
}

export function formatSignedMillions(value: number): string {
  return `${formatSignedNumber(value)} M$`;
}

export function formatSignedKw(value: number): string {
  return `${formatSignedNumber(value, 2)} kW`;
}

export function formatSignedMbps(value: number): string {
  return `${formatSignedNumber(value)} Mbps`;
}

export function formatSignedYears(value: number): string {
  return `${formatSignedNumber(value, 2)} a`;
}

export function formatScore(value: number): string {
  return formatNumber(value);
}
