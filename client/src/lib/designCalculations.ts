import {
  BASE_PLATFORM,
  DEMO_MISSION,
  TEAM_ROLES,
  getModule,
  getOrbit,
  getLauncher,
  type CatalogTab,
  type DemoModule,
  type DesignMetrics,
  type DesignStatus,
  type DesignWarning,
  type LauncherOption,
  type ModuleCategory,
  type OrbitCompatibility,
  type OrbitCompatibilityStatus,
  type OrbitOption,
  type ProposalTemplate,
  type RoleStatus,
  type TeamRole,
} from '../data/demoCatalog';

export type {
  CatalogTab,
  DemoModule,
  DesignMetrics,
  DesignStatus,
  DesignWarning,
  LauncherOption,
  ModuleCategory,
  OrbitCompatibility,
  OrbitCompatibilityStatus,
  OrbitOption,
  ProposalTemplate,
  RoleStatus,
  TeamRole,
} from '../data/demoCatalog';

/** Mapa de recursos críticos por rol (para validación de acceso y estados). */
export const ROLE_RESOURCES: Record<TeamRole, string[]> = {
  CIENCIA: ['ciencia', 'datos'],
  NAVE: ['energia', 'vida', 'masa', 'datos', 'comunicaciones'],
  ORBITA: ['orbita', 'masa'],
  RECURSOS: ['presupuesto'],
};

/** Etiquetas de compatibilidad orbital. */
export const COMPATIBILITY_LABEL: Record<string, string> = {
  COMPATIBLE: 'Órbita compatible',
  PARCIAL: 'Órbita parcial',
  INCOMPATIBLE: 'Órbita incompatible',
};

/** Etiquetas de estado de diseño. */
export const STATUS_LABEL: Record<DesignStatus, string> = {
  NOMINAL: 'NOMINAL',
  ALERTA: 'ALERTA',
  CRITICO: 'CRÍTICO',
};

/** Obtener etiqueta de compatibilidad orbital. */
export function getOrbitCompatibility(status: OrbitCompatibilityStatus | string): string {
  return COMPATIBILITY_LABEL[status] ?? status;
}

/**
 * Computa las métricas completas de diseño a partir de los módulos seleccionados.
 */
export function computeDesignMetrics(
  selectedIds: string[],
  orbitId: string,
  launcherId: string,
): DesignMetrics {
  const orbit = getOrbit(orbitId);
  const launcher = getLauncher(launcherId);
  const modules: DemoModule[] = selectedIds
    .map((id) => getModule(id))
    .filter((module): module is DemoModule => Boolean(module));

  // Masa
  const moduleMassKg = modules.reduce((sum, module) => sum + module.massKg, 0);
  const massLimitKg = launcher.maxMassKg;
  const totalMassKg = BASE_PLATFORM.massKg + moduleMassKg + (orbit.massPenaltyKg || 0);
  const massPercentage = (totalMassKg / massLimitKg) * 100;
  const massMarginKg = massLimitKg - totalMassKg;

  // Presupuesto
  const moduleCostMillions = modules.reduce((sum, module) => sum + module.costMillions, 0);
  const budgetSpent = BASE_PLATFORM.costMillions + launcher.costMillions + moduleCostMillions;
  const budgetTotal = DEMO_MISSION.budgetMillions;
  const budgetRemaining = budgetTotal - budgetSpent;
  const budgetPercentage = (budgetSpent / budgetTotal) * 100;

  // Energía
  const generatedKw = modules.reduce((sum, module) => sum + (module.generationKw ?? 0), 0);
  const consumedKw =
    BASE_PLATFORM.powerConsumptionKw + modules.reduce((sum, module) => sum + module.powerKw, 0);
  const powerGeneratedKw = (BASE_PLATFORM.powerGenerationKw + generatedKw) * (orbit.powerFactor || 1);
  const powerConsumedKw = consumedKw;
  const powerRatio = (consumedKw / powerGeneratedKw) * 100;
  const powerMarginKw = powerGeneratedKw - consumedKw;

  // Datos
  const totalDataGenerated = modules.reduce((sum, module) => sum + module.dataGenMbps, 0);
  const totalDownlinkCapacity = modules.reduce((sum, module) => sum + module.dataDownlinkMbps, 0);
  const dataUtilization =
    totalDownlinkCapacity > 0
      ? (totalDataGenerated / totalDownlinkCapacity) * 100
      : totalDataGenerated > 0
        ? 100
        : 0;
  const dataMarginMbps = totalDownlinkCapacity - totalDataGenerated;
  const requiredDownlinkUtilization = DEMO_MISSION.requiredDownlinkRatio * 100;
  const downlinkCoverage =
    requiredDownlinkUtilization > 0
      ? Math.min(100, (dataUtilization / requiredDownlinkUtilization) * 100)
      : 100;

  // Ciencia
  const scienceRaw = modules.reduce((sum, module) => sum + module.sciencePoints, 0);
  const projectedSciencePoints = Math.round(scienceRaw * (orbit.scienceFactor || 1));
  const sciencePercentage = (projectedSciencePoints / 100) * 100;
  const scienceSlotsUsed = modules.filter((module) => module.category === 'SCI').length;

  // Riesgo estructural
  const riskSum = modules.reduce((sum, module) => sum + module.riskModifier, 0);
  const structuralRisk = Math.round(
    riskSum * 100 + (massPercentage > 90 ? 5 : 0) + (powerRatio > 100 ? 10 : 0),
  );

  // Vida útil
  let estimatedLifeYears =
    BASE_PLATFORM.baseLifeYears -
    riskSum * 0.8 +
    modules.reduce((sum, module) => sum + (module.lifeBonusYears ?? 0), 0) +
    (orbit.lifeDeltaYears || 0);
  if (consumedKw > powerGeneratedKw) estimatedLifeYears -= 1;
  if (totalMassKg > massLimitKg) estimatedLifeYears -= 0.5;
  if (totalDataGenerated > totalDownlinkCapacity) estimatedLifeYears -= 0.4;
  estimatedLifeYears = Math.max(0.5, Math.min(6, Math.round(estimatedLifeYears * 100) / 100));

  const lifePercentage = (estimatedLifeYears / 5) * 100;

  // Advertencias
  const warnings: DesignWarning[] = [];
  const addWarning = (
    id: string,
    severity: DesignWarning['severity'],
    title: string,
    detail: string,
    resource?: string,
  ) => {
    warnings.push({ id, severity, title, detail, resource });
  };

  if (totalMassKg > massLimitKg) {
    addWarning(
      'mass-over',
      'critical',
      'Masa sobre límite',
      `La masa total (${Math.round(totalMassKg)} kg) supera la capacidad del ${launcher.name}.`,
      'masa',
    );
  } else if (massPercentage >= 90) {
    addWarning(
      'mass-tight',
      'warning',
      'Masa en límite',
      `La masa alcanza el ${Math.round(massPercentage)}% del límite del ${launcher.name}.`,
      'masa',
    );
  }

  if (budgetRemaining < 0) {
    addWarning(
      'budget-over',
      'critical',
      'Presupuesto excedido',
      `La misión supera el presupuesto en ${Math.abs(budgetRemaining).toFixed(0)} M$ adicionales.`,
      'presupuesto',
    );
  } else if (budgetPercentage >= 95) {
    addWarning(
      'budget-tight',
      'warning',
      'Presupuesto casi agotado',
      `Se ha comprometido el ${Math.round(budgetPercentage)}% del presupuesto total.`,
      'presupuesto',
    );
  }

  if (consumedKw > powerGeneratedKw) {
    addWarning(
      'power-deficit',
      'critical',
      'Deficit de energía',
      `El consumo (${consumedKw.toFixed(2)} kW) supera la generación (${powerGeneratedKw.toFixed(2)} kW).`,
      'energia',
    );
  } else if (powerRatio >= 90) {
    addWarning(
      'power-tight',
      'warning',
      'Energía en umbral',
      `El consumo usa el ${Math.round(powerRatio)}% de la generación disponible.`,
      'energia',
    );
  }

  if (totalDataGenerated > totalDownlinkCapacity) {
    addWarning(
      'data-over',
      'critical',
      'Enlace sobrecargado',
      `Se generan ${Math.round(totalDataGenerated)} Mbps y la capacidad es de ${Math.round(totalDownlinkCapacity)} Mbps.`,
      'datos',
    );
  }

  if (projectedSciencePoints < DEMO_MISSION.targetSciencePoints) {
    addWarning(
      'science-gap',
      'warning',
      'Objetivo científico insuficiente',
      `Faltan ${DEMO_MISSION.targetSciencePoints - projectedSciencePoints} puntos científicos para completar la misión.`,
      'ciencia',
    );
  } else if (scienceSlotsUsed === 0) {
    addWarning(
      'science-empty',
      'info',
      'Sin carga útil científica',
      'El diseño no incluye instrumentos científicos activos.',
      'ciencia',
    );
  }

  if (totalDataGenerated > 0 && dataUtilization < (DEMO_MISSION.requiredDownlinkRatio) * 100) {
    addWarning(
      'link-underused',
      'warning',
      'Enlace subutilizado',
      `La utilización del enlace está por debajo del ${Math.round(
        (DEMO_MISSION.requiredDownlinkRatio) * 100,
      )}%.`,
      'datos',
    );
  }

  if (estimatedLifeYears < 3) {
    addWarning(
      'life-short',
      'warning',
      'Vida útil corta',
      `La vida útil estimada (${estimatedLifeYears.toFixed(1)} años) está por debajo del mínimo operativo.`,
      'vida',
    );
  }

  if (orbit.compatibility !== 'COMPATIBLE') {
    addWarning(
      'orbit-off-target',
      'warning',
      'Órbita fuera de objetivo',
      `La órbita seleccionada no está calibrada para el objetivo científico.`,
      'orbita',
    );
  }

  if (orbit.type === 'LUNAR' && !launcher.supportsLunar) {
    addWarning(
      'launcher-lunar',
      'critical',
      'Lanzador no apto para órbita lunar',
      `${launcher.name} no soporta órbitas lunares.`,
      'orbita',
    );
  }

  if (scienceSlotsUsed > 3) {
    addWarning(
      'science-slots',
      'warning',
      'Ranuras científicas completas',
      `La misión usa ${scienceSlotsUsed} de ${3} ranuras científicas disponibles.`,
      'ciencia',
    );
  }

  const status: DesignStatus = warnings.some((warning) => warning.severity === 'critical')
    ? 'CRITICO'
    : warnings.length > 0
      ? 'ALERTA'
      : 'NOMINAL';

  const commsBand =
    modules.filter((module) => module.dataDownlinkMbps > 0).map((module) => module.name).join(' + ');

  return {
    baseMassKg: BASE_PLATFORM.massKg,
    moduleMassKg,
    orbitMassPenaltyKg: orbit.massPenaltyKg || 0,
    massLimitKg,
    totalMassKg,
    massPercentage,
    massMarginKg,
    baseCostMillions: BASE_PLATFORM.costMillions,
    launcherCostMillions: launcher.costMillions,
    moduleCostMillions,
    budgetSpent,
    budgetRemaining,
    budgetTotal,
    budgetPercentage,
    powerGeneratedKw,
    powerConsumedKw,
    powerRatio,
    powerMarginKw,
    propulsiveEfficiency: Math.round((1 - totalMassKg / massLimitKg) * 100),
    totalDataGenerated,
    totalDownlinkCapacity,
    dataUtilization,
    dataMarginMbps,
    downlinkCoverage,
    requiredDownlinkRatio: DEMO_MISSION.requiredDownlinkRatio,
    scienceRaw,
    projectedSciencePoints,
    sciencePercentage,
    targetSciencePoints: DEMO_MISSION.targetSciencePoints,
    scienceSlotsUsed,
    structuralRisk,
    estimatedLifeYears,
    requiredLifeYears: 3,
    lifePercentage,
    scienceEfficiency:
      projectedSciencePoints > 0 ? budgetSpent / projectedSciencePoints : 0,
    commsBand,
    orbit,
    launcher,
    selectedModules: modules,
    warnings,
    warningCount: warnings.length,
    status,
  };
}

/** Devuelve el estado de rol basado en las advertencias del diseño. */
export function getRoleStatus(role: TeamRole, metrics: DesignMetrics): RoleStatus {
  const resources = ROLE_RESOURCES[role];
  const hasIssue = metrics.warnings.some(
    (warning) =>
      warning.resource !== undefined &&
      resources.includes(warning.resource) &&
      warning.severity !== 'info',
  );
  return hasIssue ? 'REVISION' : 'LISTO';
}

/** Insight educativo derivado del estado actual del diseño. */
export type DesignInsightTone = 'primary' | 'success' | 'warning' | 'error';

export interface DesignInsight {
  tone: DesignInsightTone;
  kicker: string;
  title: string;
  body: string;
}

export function getDesignInsight(metrics: DesignMetrics): DesignInsight {
  if (metrics.status === 'NOMINAL') {
    return {
      tone: 'success',
      kicker: 'Compromiso activo',
      title: 'Diseño en equilibrio',
      body: `La carga útil actual rinde ${metrics.projectedSciencePoints} de ${metrics.targetSciencePoints} puntos científicos con el consumo de energía dentro del margen operativo.`,
    };
  }

  const primaryWarning = metrics.warnings[0];
  const kicker = metrics.status === 'CRITICO' ? 'Bloqueo duro' : 'Alerta de diseño';

  if (metrics.status === 'CRITICO') {
    return {
      tone: 'error',
      kicker,
      title: primaryWarning?.title ?? 'Diseño crítico',
      body:
        primaryWarning?.detail ??
        'El diseño supera un límite operativo duro y no puede validarse para lanzamiento.',
    };
  }

  return {
    tone: 'warning',
    kicker,
    title: primaryWarning?.title ?? 'Alerta de diseño',
    body: primaryWarning?.detail ?? 'Uno o más recursos se aproximan al límite operativo.',
  };
}

/** Impacto de una propuesta sobre las métricas del diseño. */
export interface ProposalImpactDeltas {
  massKg: number;
  costMillions: number;
  sciencePoints: number;
  powerKw: number;
  generationKw: number;
  dataMbps: number;
  downlinkMbps: number;
  lifeYears: number;
}

export interface ProposalImpact {
  module: DemoModule;
  current: DesignMetrics;
  next: DesignMetrics;
  nextIds: string[];
  canApply: boolean;
  deltas: ProposalImpactDeltas;
}

export function getProposalImpact(
  proposal: ProposalTemplate,
  selectedModuleIds: string[],
  orbitId: string,
  launcherId: string,
): ProposalImpact | null {
  const module = getModule(proposal.moduleId);
  if (!module) return null;

  const isSelected = selectedModuleIds.includes(module.id);
  const canApply = proposal.action === 'ADD' ? !isSelected : isSelected;
  const nextIds = canApply
    ? proposal.action === 'ADD'
      ? [...selectedModuleIds, module.id]
      : selectedModuleIds.filter((id) => id !== module.id)
    : selectedModuleIds;

  const current = computeDesignMetrics(selectedModuleIds, orbitId, launcherId);
  const next = canApply ? computeDesignMetrics(nextIds, orbitId, launcherId) : current;

  return {
    module,
    current,
    next,
    nextIds,
    canApply,
    deltas: {
      massKg: next.totalMassKg - current.totalMassKg,
      costMillions: next.moduleCostMillions - current.moduleCostMillions,
      sciencePoints: next.projectedSciencePoints - current.projectedSciencePoints,
      powerKw: next.powerConsumedKw - current.powerConsumedKw,
      generationKw: next.powerGeneratedKw - current.powerGeneratedKw,
      dataMbps: next.totalDataGenerated - current.totalDataGenerated,
      downlinkMbps: next.totalDownlinkCapacity - current.totalDownlinkCapacity,
      lifeYears: next.estimatedLifeYears - current.estimatedLifeYears,
    },
  };
}

export type VoteStance = 'FOR' | 'AGAINST' | 'NEUTRAL';

export interface RoleVote {
  role: TeamRole;
  stance: VoteStance;
}

export function getTeamVotes(impact: ProposalImpact | null): RoleVote[] {
  if (!impact || !impact.canApply) {
    // Sin una proyección aplicable no hay postura técnica que votar.
    return TEAM_ROLES.map((role) => ({ role, stance: 'NEUTRAL' as VoteStance }));
  }

  const { deltas } = impact;
  const stanceFor = (role: TeamRole): VoteStance => {
    switch (role) {
      case 'CIENCIA':
        if (deltas.sciencePoints > 0) return 'FOR';
        if (deltas.sciencePoints < 0) return 'AGAINST';
        return 'NEUTRAL';
      case 'NAVE':
        if (deltas.massKg > 0) return 'AGAINST';
        if (deltas.massKg < 0) return 'FOR';
        if (deltas.powerKw < 0) return 'AGAINST';
        return 'FOR';
      case 'ORBITA':
        return deltas.massKg > 0 || deltas.powerKw > 0 ? 'NEUTRAL' : 'FOR';
      case 'RECURSOS':
        return deltas.costMillions > 0 ? 'AGAINST' : 'FOR';
    }
  };

  return TEAM_ROLES.map((role) => ({ role, stance: stanceFor(role) }));
}

export function countVotes(votes: RoleVote[], stance: VoteStance): number {
  return votes.filter((vote) => vote.stance === stance).length;
}

export interface CoordinationMeta {
  label: string;
  tone: 'primary' | 'success' | 'warning' | 'error';
}

export function getCoordinationMeta(coordination: number): CoordinationMeta {
  if (coordination >= 85) return { label: 'Alta sincronización', tone: 'success' };
  if (coordination >= 70) return { label: 'Sincronización estable', tone: 'primary' };
  if (coordination >= 50) return { label: 'Desfase moderado', tone: 'warning' };
  return { label: 'Desfase alto', tone: 'error' };
}

/** Función auxiliar: clamp. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Función auxiliar: redondeo. */
export function round(value: number, decimals: number = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
