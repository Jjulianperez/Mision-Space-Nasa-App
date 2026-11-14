import type {
  AuditIssue,
  MissionConfig,
  ModuleItem,
  PrelaunchAudit,
} from '../../../shared/types.js';
import {
  calculateTelemetryMetrics,
  estimateDataRecoveryRatio,
} from './calculator.js';

const MAX_SCIENCE_BAY_SLOTS = 3;

function issue(
  code: string,
  message: string,
  severity: AuditIssue['severity'],
): AuditIssue {
  return { code, message, severity };
}

export function auditPreLaunch(
  mission: MissionConfig,
  selectedModules: ModuleItem[],
): PrelaunchAudit {
  const telemetry = calculateTelemetryMetrics(mission, selectedModules);
  const warnings: AuditIssue[] = [];
  const blocks: AuditIssue[] = [];

  if (telemetry.budgetRemaining < 0) {
    blocks.push(issue('BUDGET_EXCEEDED', 'El presupuesto restante es menor que cero.', 'BLOCK'));
  }
  if (telemetry.massPercentage > 100) {
    blocks.push(issue('LAUNCHER_MASS_EXCEEDED', 'La masa supera el límite absoluto del lanzador.', 'BLOCK'));
  }

  const scienceBaySlotsUsed = selectedModules
    .filter((module) => module.category === 'SCI')
    .reduce((total, module) => total + (module.slotsRequired ?? 1), 0);
  if (scienceBaySlotsUsed > MAX_SCIENCE_BAY_SLOTS) {
    blocks.push(issue('SCIENCE_BAY_EXCEEDED', 'La bahía científica supera los 3 espacios disponibles.', 'BLOCK'));
  }

  const selectedIds = new Set(selectedModules.map((module) => module.id));
  for (const module of selectedModules) {
    if (module.requiresModuleId && !selectedIds.has(module.requiresModuleId)) {
      blocks.push(
        issue(
          'MISSING_REQUIRED_MODULE',
          `${module.name} requiere el módulo ${module.requiresModuleId}.`,
          'BLOCK',
        ),
      );
    }
  }

  if (telemetry.massPercentage > 90) {
    warnings.push(issue('STRUCTURAL_STRESS', 'Estrés estructural en Max-Q (>90% de masa).', 'WARNING'));
  }
  if (telemetry.powerConsumedKw > telemetry.powerGeneratedKw) {
    warnings.push(
      issue('POWER_DEFICIT', 'La energía está en déficit; se prevé una caída de tensión en el Acto 2.', 'WARNING'),
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
      issue('LOW_DOWNLINK', 'La capacidad de bajada puede ser insuficiente para recuperar los datos.', 'WARNING'),
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

export function validateModuleProposal(
  mission: MissionConfig,
  selectedModules: ModuleItem[],
  module: ModuleItem,
  action: 'ADD' | 'REMOVE',
): void {
  if (action === 'ADD') {
    if (selectedModules.some((selected) => selected.id === module.id)) {
      throw new Error(`El módulo "${module.id}" ya está seleccionado.`);
    }
    const proposedModules = [...selectedModules, module];
    const audit = auditPreLaunch(mission, proposedModules);
    const budgetBlock = audit.blocks.find((block) => block.code === 'BUDGET_EXCEEDED');
    if (budgetBlock) {
      throw new Error('La propuesta excede el presupuesto de la misión.');
    }
    const bayBlock = audit.blocks.find((block) => block.code === 'SCIENCE_BAY_EXCEEDED');
    if (bayBlock) {
      throw new Error('La propuesta supera el límite de 3 espacios de bahía científica.');
    }
    const requirementBlock = audit.blocks.find(
      (block) => block.code === 'MISSING_REQUIRED_MODULE',
    );
    if (requirementBlock) {
      throw new Error(requirementBlock.message);
    }
    return;
  }

  if (!selectedModules.some((selected) => selected.id === module.id)) {
    throw new Error(`El módulo "${module.id}" no está seleccionado.`);
  }
  const remainingModules = selectedModules.filter((selected) => selected.id !== module.id);
  const dependentModule = remainingModules.find(
    (selected) => selected.requiresModuleId === module.id,
  );
  if (dependentModule) {
    throw new Error(`No se puede quitar "${module.id}" mientras "${dependentModule.id}" lo requiera.`);
  }
}