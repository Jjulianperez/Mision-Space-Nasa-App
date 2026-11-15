import type { MissionConfig, ModuleCategory, RoleType, TelemetryMetrics } from '@shared/types';
import { formatKg, formatKw, formatMillions, formatNumber, formatPercent } from '../../lib/format';
import { estimateDataRecoveryRatio } from '../../lib/localEngine';
import type { MeterTone } from '../templates/ConsolePrimitives';

export const CATEGORY_META: Record<
  ModuleCategory,
  { label: string; role: RoleType; textClass: string; unit: string }
> = {
  EST: { label: 'Estructura y propulsión', role: 'PROPULSION', textClass: 'text-accent', unit: 'piezas' },
  SCI: { label: 'Instrumentos científicos', role: 'SCIENCE', textClass: 'text-primary', unit: 'ranuras' },
  COM: { label: 'Energía y comunicaciones', role: 'COMMS', textClass: 'text-success', unit: 'piezas' },
};

export const CATEGORY_ORDER: ModuleCategory[] = ['EST', 'SCI', 'COM'];

/** Umbrales de uso de un recurso documentados para la mesa: verde, ámbar y rojo. */
const USAGE_WARNING_PERCENT = 75;
const USAGE_CRITICAL_PERCENT = 90;
const RISK_WARNING_PERCENT = 20;
const RISK_CRITICAL_PERCENT = 50;

export interface DesignGauge {
  id: string;
  label: string;
  value: string;
  percent: number;
  tone: MeterTone;
  /** Explicación breve, visible en modo Aprendiz. */
  hint: string;
  marks?: number[];
}

/** Cuanto más se consume de un recurso limitado, peor: verde <75 %, ámbar 75–90 %, rojo >90 %. */
function usageTone(percent: number): MeterTone {
  if (percent > USAGE_CRITICAL_PERCENT) return 'error';
  if (percent >= USAGE_WARNING_PERCENT) return 'warning';
  return 'success';
}

/** Sin capacidad, cualquier uso ya está fuera de margen (y la barra debe verse llena). */
const OVER_CAPACITY_PERCENT = 1000;

function ratioPercent(used: number, capacity: number): number {
  if (capacity > 0) return (used / capacity) * 100;
  return used > 0 ? OVER_CAPACITY_PERCENT : 0;
}

/**
 * Las seis barras de la mesa. Los colores siguen a la auditoría: verde si el margen
 * es sano, ámbar donde la auditoría avisa y rojo donde el margen es crítico.
 */
export function buildDesignGauges(
  telemetry: TelemetryMetrics,
  mission: MissionConfig,
): DesignGauge[] {
  const sciencePercent =
    mission.targetSciencePoints > 0
      ? ratioPercent(telemetry.projectedSciencePoints, mission.targetSciencePoints)
      : 100;
  const powerPercent = ratioPercent(telemetry.powerConsumedKw, telemetry.powerGeneratedKw);
  const budgetPercent = ratioPercent(telemetry.budgetSpent, mission.budgetMillions);
  const recoveryPercent =
    estimateDataRecoveryRatio(
      telemetry.totalDataGenerated,
      telemetry.totalDownlinkCapacity,
      mission,
    ) * 100;
  const requiredRecoveryPercent = mission.requiredDownlinkRatio * 100;
  const risk = telemetry.structuralRisk;

  return [
    {
      id: 'science',
      label: 'Objetivo científico',
      value: `${formatNumber(telemetry.projectedSciencePoints)} / ${formatNumber(mission.targetSciencePoints)} pts`,
      percent: sciencePercent,
      tone: sciencePercent >= 100 ? 'success' : 'warning',
      hint: 'Suma instrumentos hasta alcanzar los puntos que pide la misión.',
    },
    {
      id: 'mass',
      label: 'Masa',
      value: `${formatNumber(telemetry.totalMassKg)} / ${formatKg(mission.maxLauncherMassKg)}`,
      percent: telemetry.massPercentage,
      tone: usageTone(telemetry.massPercentage),
      hint: 'Por encima del 90 % hay estrés estructural; por encima del 100 % no se puede lanzar.',
      marks: [USAGE_WARNING_PERCENT, USAGE_CRITICAL_PERCENT],
    },
    {
      id: 'power',
      label: 'Energía consumida',
      value: `${formatNumber(telemetry.powerConsumedKw)} / ${formatKw(telemetry.powerGeneratedKw)}`,
      percent: powerPercent,
      tone: usageTone(powerPercent),
      hint: 'Si el consumo supera la generación habrá una caída de tensión en pleno vuelo.',
      marks: [USAGE_WARNING_PERCENT, USAGE_CRITICAL_PERCENT],
    },
    {
      id: 'budget',
      label: 'Presupuesto',
      value: `${formatNumber(telemetry.budgetSpent)} / ${formatMillions(mission.budgetMillions)}`,
      percent: budgetPercent,
      tone: usageTone(budgetPercent),
      hint: 'No se pueden proponer módulos que superen el presupuesto de la misión.',
      marks: [USAGE_WARNING_PERCENT, USAGE_CRITICAL_PERCENT],
    },
    {
      id: 'data',
      label: 'Datos recuperables',
      value: `${formatPercent(recoveryPercent)} · mín. ${formatPercent(requiredRecoveryPercent)}`,
      percent: recoveryPercent,
      tone: recoveryPercent >= requiredRecoveryPercent ? 'success' : 'warning',
      hint: `Generas ${formatNumber(telemetry.totalDataGenerated)} Mbps y puedes bajar ${formatNumber(telemetry.totalDownlinkCapacity)} Mbps, pero la estación solo es visible una parte de la órbita.`,
      marks: [requiredRecoveryPercent],
    },
    {
      id: 'risk',
      label: 'Riesgo estructural',
      value: formatPercent(risk),
      percent: risk,
      tone: risk > RISK_CRITICAL_PERCENT ? 'error' : risk > RISK_WARNING_PERCENT ? 'warning' : 'success',
      hint: 'Las estructuras reforzadas lo reducen; acercarse al límite de masa lo aumenta.',
      marks: [RISK_WARNING_PERCENT, RISK_CRITICAL_PERCENT],
    },
  ];
}
