import type { MissionConfig, ModuleItem, TelemetryMetrics } from '../../../shared/types.js';
import { getGroundStationForMission } from '../catalog.js';
import { estimateDataRecoveryRatio as estimateDataRecoveryRatioForStation } from './data.js';

const BASE_POWER_CONSUMPTION_KW = 15;
const BASE_POWER_GENERATION_KW = 30;
const STRUCTURAL_STRESS_THRESHOLD = 90;
const HIGH_STRUCTURAL_STRESS_THRESHOLD = 95;

export function estimateDataRecoveryRatio(
  totalDataGenerated: number,
  totalDownlinkCapacity: number,
  mission: MissionConfig,
): number {
  return estimateDataRecoveryRatioForStation(
    totalDataGenerated,
    totalDownlinkCapacity,
    getGroundStationForMission(mission),
  );
}

function sumModules(
  modules: ModuleItem[],
  getValue: (module: ModuleItem) => number,
  metricName: string,
): number {
  return modules.reduce((total, module) => {
    const value = getValue(module);
    if (!Number.isFinite(value)) {
      throw new Error(`El valor de ${metricName} del módulo "${module.id}" debe ser finito.`);
    }
    return total + value;
  }, 0);
}

export function calculateTelemetryMetrics(
  mission: MissionConfig,
  selectedModules: ModuleItem[],
): TelemetryMetrics {
  if (!Number.isFinite(mission.maxLauncherMassKg) || mission.maxLauncherMassKg <= 0) {
    throw new Error('La masa máxima del lanzador debe ser mayor que cero.');
  }
  if (!Number.isFinite(mission.budgetMillions) || mission.budgetMillions < 0) {
    throw new Error('El presupuesto de la misión debe ser un número no negativo.');
  }
  if (
    !Number.isFinite(mission.requiredDownlinkRatio) ||
    mission.requiredDownlinkRatio < 0 ||
    mission.requiredDownlinkRatio > 1
  ) {
    throw new Error('La proporción de bajada requerida debe estar entre 0 y 1.');
  }

  const budgetSpent = sumModules(selectedModules, (module) => module.costMillions, 'costo');
  const totalMassKg = sumModules(selectedModules, (module) => module.massKg, 'masa');
  const moduleConsumptionKw = sumModules(
    selectedModules,
    (module) => Math.max(module.powerKw, 0),
    'consumo eléctrico',
  );
  const moduleGenerationKw = sumModules(
    selectedModules,
    (module) => Math.max(-module.powerKw, 0),
    'generación eléctrica',
  );
  const totalDataGenerated = sumModules(
    selectedModules,
    (module) => module.dataGenMbps,
    'generación de datos',
  );
  const totalDownlinkCapacity = sumModules(
    selectedModules,
    (module) => module.dataDownlinkMbps,
    'capacidad de bajada',
  );
  const moduleRisk = sumModules(selectedModules, (module) => module.riskModifier, 'riesgo');
  const projectedSciencePoints = sumModules(
    selectedModules,
    (module) => module.sciencePoints,
    'puntos científicos',
  );

  const massPercentage = (totalMassKg / mission.maxLauncherMassKg) * 100;
  // El sobrepeso estructural aumenta el riesgo, pero solo el >100% bloquea el lanzamiento.
  const structuralRiskPenalty =
    (massPercentage > STRUCTURAL_STRESS_THRESHOLD ? 12 : 0) +
    (massPercentage > HIGH_STRUCTURAL_STRESS_THRESHOLD ? 5 : 0);
  const structuralRisk = Math.min(100, Math.max(0, moduleRisk + structuralRiskPenalty));
  const powerConsumedKw = BASE_POWER_CONSUMPTION_KW + moduleConsumptionKw;
  const powerGeneratedKw = BASE_POWER_GENERATION_KW + moduleGenerationKw;
  const dataRecoveryRatio = estimateDataRecoveryRatio(
    totalDataGenerated,
    totalDownlinkCapacity,
    mission,
  );
  const warnings: string[] = [];

  if (massPercentage > STRUCTURAL_STRESS_THRESHOLD) {
    warnings.push('Estrés estructural en Max-Q');
  }
  if (powerConsumedKw > powerGeneratedKw) {
    warnings.push('Consumo eléctrico superior a la generación disponible');
  }
  if (dataRecoveryRatio < mission.requiredDownlinkRatio) {
    warnings.push('Capacidad de bajada de datos inferior a la requerida');
  }

  return {
    budgetSpent,
    budgetRemaining: mission.budgetMillions - budgetSpent,
    totalMassKg,
    massPercentage,
    powerGeneratedKw,
    powerConsumedKw,
    propulsiveEfficiency: 100 - (totalMassKg / mission.maxLauncherMassKg) * 25,
    totalDataGenerated,
    totalDownlinkCapacity,
    structuralRisk,
    projectedSciencePoints,
    warnings,
  };
}
