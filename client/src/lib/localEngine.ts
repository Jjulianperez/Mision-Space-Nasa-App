import type {
  AuditIssue,
  MissionConfig,
  ModuleAction,
  ModuleItem,
  PrelaunchAudit,
  TelemetryMetrics,
} from '@shared/types';
import { getCatalogGroundStation } from '../data/catalogs';

/**
 * Motor de diseño de la sesión offline.
 *
 * Es un espejo de `server/src/engine` (calculator.ts y audit.ts) y del asesor de
 * `server/src/sockets/room-service.ts`: mismas fórmulas, mismos códigos y mismos
 * mensajes, para que un diseño se comporte igual con o sin backend.
 * `localEngine.test.ts` ejecuta ambos motores con los catálogos reales y falla si
 * divergen: si cambias una regla aquí, cámbiala también en el servidor.
 */

const BASE_POWER_CONSUMPTION_KW = 15;
const BASE_POWER_GENERATION_KW = 30;
const STRUCTURAL_STRESS_THRESHOLD = 90;
const HIGH_STRUCTURAL_STRESS_THRESHOLD = 95;

export const MAX_SCIENCE_BAY_SLOTS = 3;

export function countScienceBaySlots(modules: ModuleItem[]): number {
  return modules
    .filter((module) => module.category === 'SCI')
    .reduce((total, module) => total + (module.slotsRequired ?? 1), 0);
}

export function estimateDataRecoveryRatio(
  totalDataGenerated: number,
  totalDownlinkCapacity: number,
  mission: MissionConfig,
): number {
  if (totalDataGenerated <= 0) {
    return 0;
  }
  const station = getCatalogGroundStation(mission);
  const contactRatio = station.windowDurationSeconds / station.windowPeriodSeconds;
  return Math.min(
    1,
    (totalDownlinkCapacity * station.downlinkMultiplier * contactRatio) / totalDataGenerated,
  );
}

function sum(modules: ModuleItem[], getValue: (module: ModuleItem) => number): number {
  return modules.reduce((total, module) => total + getValue(module), 0);
}

export function calculateTelemetry(
  mission: MissionConfig,
  selectedModules: ModuleItem[],
): TelemetryMetrics {
  const budgetSpent = sum(selectedModules, (module) => module.costMillions);
  const totalMassKg = sum(selectedModules, (module) => module.massKg);
  const moduleConsumptionKw = sum(selectedModules, (module) => Math.max(module.powerKw, 0));
  const moduleGenerationKw = sum(selectedModules, (module) => Math.max(-module.powerKw, 0));
  const totalDataGenerated = sum(selectedModules, (module) => module.dataGenMbps);
  const totalDownlinkCapacity = sum(selectedModules, (module) => module.dataDownlinkMbps);
  const moduleRisk = sum(selectedModules, (module) => module.riskModifier);
  const projectedSciencePoints = sum(selectedModules, (module) => module.sciencePoints);

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

function issue(code: string, message: string, severity: AuditIssue['severity']): AuditIssue {
  return { code, message, severity };
}

export function auditPreLaunch(
  mission: MissionConfig,
  selectedModules: ModuleItem[],
): PrelaunchAudit {
  const telemetry = calculateTelemetry(mission, selectedModules);
  const warnings: AuditIssue[] = [];
  const blocks: AuditIssue[] = [];

  if (telemetry.budgetRemaining < 0) {
    blocks.push(issue('BUDGET_EXCEEDED', 'El presupuesto restante es menor que cero.', 'BLOCK'));
  }
  if (telemetry.massPercentage > 100) {
    blocks.push(
      issue('LAUNCHER_MASS_EXCEEDED', 'La masa supera el límite absoluto del lanzador.', 'BLOCK'),
    );
  }

  const scienceBaySlotsUsed = countScienceBaySlots(selectedModules);

  if (telemetry.massPercentage > 90) {
    warnings.push(
      issue('STRUCTURAL_STRESS', 'Estrés estructural en Max-Q (>90% de masa).', 'WARNING'),
    );
  }
  if (telemetry.powerConsumedKw > telemetry.powerGeneratedKw) {
    warnings.push(
      issue(
        'POWER_DEFICIT',
        'La energía está en déficit; se prevé una caída de tensión en el Acto 2.',
        'WARNING',
      ),
    );
  }
  if (
    estimateDataRecoveryRatio(
      telemetry.totalDataGenerated,
      telemetry.totalDownlinkCapacity,
      mission,
    ) < mission.requiredDownlinkRatio
  ) {
    warnings.push(
      issue(
        'LOW_DOWNLINK',
        'La capacidad de bajada puede ser insuficiente para recuperar los datos.',
        'WARNING',
      ),
    );
  }
  if (telemetry.projectedSciencePoints < mission.targetSciencePoints) {
    warnings.push(
      issue(
        'SCIENCE_TARGET',
        'Los puntos científicos proyectados están por debajo del objetivo de la misión.',
        'WARNING',
      ),
    );
  }

  return {
    canLaunch: blocks.length === 0,
    warnings,
    blocks,
    telemetry,
    scienceBaySlotsUsed,
  };
}

/**
 * Devuelve por qué el motor rechazaría la propuesta, o `null` si es válida.
 * La mesa lo usa para aplicar propuestas offline y para explicar de antemano,
 * en el catálogo, por qué un módulo no se puede añadir o quitar.
 */
export function getProposalBlocker(
  mission: MissionConfig,
  selectedModules: ModuleItem[],
  module: ModuleItem,
  action: ModuleAction,
): string | null {
  if (action === 'ADD') {
    if (selectedModules.some((selected) => selected.id === module.id)) {
      return `El módulo "${module.id}" ya está seleccionado.`;
    }
    const proposedModules = [...selectedModules, module];
    const audit = auditPreLaunch(mission, proposedModules);
    if (audit.blocks.some((block) => block.code === 'BUDGET_EXCEEDED')) {
      return 'La propuesta excede el presupuesto de la misión.';
    }
    if (countScienceBaySlots(proposedModules) > MAX_SCIENCE_BAY_SLOTS) {
      return 'La propuesta supera el límite de 3 espacios de bahía científica.';
    }
    const selectedIds = new Set(proposedModules.map((selected) => selected.id));
    const moduleMissingRequirement = proposedModules.find(
      (selected) => selected.requiresModuleId && !selectedIds.has(selected.requiresModuleId),
    );
    return moduleMissingRequirement
      ? `${moduleMissingRequirement.name} requiere el módulo ${moduleMissingRequirement.requiresModuleId}.`
      : null;
  }

  if (!selectedModules.some((selected) => selected.id === module.id)) {
    return `El módulo "${module.id}" no está seleccionado.`;
  }
  const dependentModule = selectedModules.find(
    (selected) => selected.id !== module.id && selected.requiresModuleId === module.id,
  );
  return dependentModule
    ? `No se puede quitar "${module.id}" mientras "${dependentModule.id}" lo requiera.`
    : null;
}

/** Recomendaciones de los asesores virtuales para una partida en solitario. */
export function getAdvisorFeedback(
  audit: PrelaunchAudit,
  selectedModules: ModuleItem[],
  catalog: ModuleItem[],
): string[] {
  const messages = audit.warnings.map((warning) => `Asesor virtual: ${warning.message}`);
  const selectedIds = new Set(selectedModules.map((module) => module.id));
  const candidates = catalog.filter((module) => !selectedIds.has(module.id));

  for (const warning of audit.warnings) {
    const candidate =
      warning.code === 'POWER_DEFICIT'
        ? candidates
            .filter((module) => module.category === 'COM' && module.powerKw < 0)
            .sort((left, right) => left.powerKw - right.powerKw)[0]
        : warning.code === 'LOW_DOWNLINK'
          ? candidates
              .filter((module) => module.category === 'COM' && module.dataDownlinkMbps > 0)
              .sort((left, right) => right.dataDownlinkMbps - left.dataDownlinkMbps)[0]
          : warning.code === 'SCIENCE_TARGET'
            ? candidates
                .filter((module) => module.category === 'SCI' && module.sciencePoints > 0)
                .sort((left, right) => right.sciencePoints - left.sciencePoints)[0]
            : undefined;
    if (candidate) {
      messages.push(
        `Asesor virtual recomienda evaluar ${candidate.id} (${candidate.name}): ${candidate.apprenticeTip}`,
      );
    }
  }

  if (messages.length === 0) {
    messages.push('Asesores virtuales: el diseño mantiene los márgenes de advertencia actuales.');
  }
  return messages;
}
