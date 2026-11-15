import type {
  AsymmetricFlightPayload,
  FlightAct,
  FlightActionType,
  FlightCrisisAlert,
  FlightEventDefinition,
  FlightOutcome,
  MissionConfig,
  MissionReport,
  ModuleItem,
  RoleType,
  TelemetryMetrics,
} from '@shared/types';
import { FLIGHT_CONFIG, FLIGHT_EVENTS, getCatalogGroundStation } from '../data/catalogs';

export interface LocalFlightState {
  startedAt: number;
  durationMs: number;
  progress: number;
  act: FlightAct;
  activeEvent: FlightEventDefinition;
  crisisTriggered: boolean;
  crisisResolved: boolean;
  activeSensorIds: string[];
  disabledExperimentIds: string[];
  decisions: string[];
  role: RoleType;
  mission: MissionConfig;
  modules: ModuleItem[];
  telemetry: TelemetryMetrics;
}

export interface LocalFlightAdvance {
  state: LocalFlightState;
  crisisStarted: boolean;
  completed: boolean;
}

function estimateDataRecoveryRatio(
  telemetry: Pick<TelemetryMetrics, 'totalDataGenerated' | 'totalDownlinkCapacity'>,
  mission: MissionConfig,
): number {
  if (telemetry.totalDataGenerated <= 0) return 0;
  const station = getCatalogGroundStation(mission);
  const contactRatio = station.windowDurationSeconds / station.windowPeriodSeconds;
  return Math.min(
    1,
    (telemetry.totalDownlinkCapacity * station.downlinkMultiplier * contactRatio) /
      telemetry.totalDataGenerated,
  );
}

function selectEvent(
  telemetry: TelemetryMetrics,
  mission: MissionConfig,
): FlightEventDefinition {
  const recoveryRatio = estimateDataRecoveryRatio(telemetry, mission);
  const trigger: FlightEventDefinition['trigger'] =
    telemetry.powerConsumedKw > telemetry.powerGeneratedKw
      ? 'POWER_DEFICIT'
      : telemetry.massPercentage > 90
        ? 'STRUCTURAL_STRESS'
        : recoveryRatio < mission.requiredDownlinkRatio
          ? 'LOW_DOWNLINK'
          : 'NOMINAL';
  const event = FLIGHT_EVENTS.find((candidate) => candidate.trigger === trigger);
  if (!event) {
    throw new Error(`No hay un evento de vuelo configurado para "${trigger}".`);
  }
  return event;
}

export function createLocalFlight(input: {
  mission: MissionConfig;
  modules: ModuleItem[];
  telemetry: TelemetryMetrics;
  role: RoleType;
  startedAt?: number;
}): LocalFlightState {
  return {
    startedAt: input.startedAt ?? Date.now(),
    durationMs: FLIGHT_CONFIG.durationSeconds * 1000,
    progress: 0,
    act: 'ASCENT_INSERTION',
    activeEvent: selectEvent(input.telemetry, input.mission),
    crisisTriggered: false,
    crisisResolved: false,
    activeSensorIds: input.modules
      .filter((module) => module.category === 'SCI')
      .map((module) => module.id),
    disabledExperimentIds: [],
    decisions: [],
    role: input.role,
    mission: input.mission,
    modules: input.modules,
    telemetry: input.telemetry,
  };
}

export function advanceLocalFlight(
  current: LocalFlightState,
  now: number,
): LocalFlightAdvance {
  const elapsedMs = Math.max(0, now - current.startedAt);
  const progress = Math.min(100, (elapsedMs / current.durationMs) * 100);
  const act: FlightAct =
    progress < FLIGHT_CONFIG.crisisProgressPercent
      ? 'ASCENT_INSERTION'
      : progress < FLIGHT_CONFIG.crisisActEndPercent
        ? 'CRISIS'
        : 'OPERATIONS';
  const crisisStarted =
    !current.crisisTriggered && progress >= FLIGHT_CONFIG.crisisProgressPercent;

  return {
    state: {
      ...current,
      progress,
      act,
      crisisTriggered: current.crisisTriggered || crisisStarted,
    },
    crisisStarted,
    completed: progress >= 100,
  };
}

export function buildCrisisAlert(state: LocalFlightState): FlightCrisisAlert | null {
  if (!state.crisisTriggered) return null;
  return {
    eventId: state.activeEvent.id,
    title: state.activeEvent.title,
    severity: state.activeEvent.severity,
    description: state.activeEvent.description,
  };
}

export function buildLocalPayload(state: LocalFlightState): AsymmetricFlightPayload {
  const base = { progress: state.progress, act: state.act };

  if (state.role === 'COMMS') {
    const station = getCatalogGroundStation(state.mission);
    const elapsedSeconds = ((state.progress / 100) * state.durationMs) / 1000;
    const phaseOfWindow = elapsedSeconds % station.windowPeriodSeconds;
    return {
      ...base,
      role: 'COMMS',
      trajectory: FLIGHT_CONFIG.trajectoryByOrbit[state.mission.orbitType],
      threats: state.crisisTriggered
        ? [
            {
              eventId: state.activeEvent.id,
              title: state.activeEvent.title,
              severity: state.activeEvent.severity,
              description: state.activeEvent.description,
            },
          ]
        : [],
      downlinkWindowOpen: phaseOfWindow < station.windowDurationSeconds,
    };
  }

  if (state.role === 'PROPULSION') {
    const progressFactor = state.progress / 100;
    return {
      ...base,
      role: 'PROPULSION',
      internal: {
        fuelPercent: Math.max(
          0,
          FLIGHT_CONFIG.baseFuelPercent -
            progressFactor * FLIGHT_CONFIG.fuelConsumptionPercentPerProgress * 100,
        ),
        temperatureC:
          FLIGHT_CONFIG.baseTemperatureC +
          state.telemetry.massPercentage * FLIGHT_CONFIG.temperatureRiseCPerMassPercent +
          progressFactor * FLIGHT_CONFIG.temperatureRiseCAtFullProgress,
        integrityPercent: Math.max(
          0,
          100 - state.telemetry.structuralRisk * FLIGHT_CONFIG.integrityLossPerStructuralRisk,
        ),
        energyBalanceKw:
          state.telemetry.powerGeneratedKw - state.telemetry.powerConsumedKw,
      },
      repairPuzzle:
        state.crisisTriggered &&
        !state.crisisResolved &&
        state.activeEvent.puzzle?.role === 'PROPULSION'
          ? {
              id: state.activeEvent.puzzle.id,
              prompt: state.activeEvent.puzzle.prompt,
            }
          : null,
    };
  }

  if (state.role === 'SCIENCE') {
    return {
      ...base,
      role: 'SCIENCE',
      sensors: state.modules
        .filter((module) => module.category === 'SCI')
        .map((module) => ({
          moduleId: module.id,
          name: module.name,
          active: state.activeSensorIds.includes(module.id),
          dataGenMbps: module.dataGenMbps,
        })),
      calibrationPuzzle:
        state.crisisTriggered &&
        !state.crisisResolved &&
        state.activeEvent.puzzle?.role === 'SCIENCE'
          ? {
              id: state.activeEvent.puzzle.id,
              prompt: state.activeEvent.puzzle.prompt,
            }
          : null,
    };
  }

  const activeExperiments = state.modules.filter(
    (module) =>
      module.category === 'SCI' && !state.disabledExperimentIds.includes(module.id),
  );
  const projectedPoints = activeExperiments.reduce(
    (total, module) => total + module.sciencePoints,
    0,
  );
  return {
    ...base,
    role: 'DIRECTOR',
    science: {
      projectedPoints,
      targetPoints: state.mission.targetSciencePoints,
      progressPercent:
        state.mission.targetSciencePoints > 0
          ? Math.min(100, (projectedPoints / state.mission.targetSciencePoints) * 100)
          : 0,
    },
    crisisDecisionAvailable: state.crisisTriggered && !state.crisisResolved,
    activeExperimentIds: activeExperiments.map((module) => module.id),
  };
}

function readString(payload: Record<string, unknown>, key: string): string {
  const value = payload[key];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`La acción de vuelo requiere el campo "${key}".`);
  }
  return value.trim();
}

export function applyLocalAction(
  current: LocalFlightState,
  actionType: FlightActionType,
  payload: Record<string, unknown>,
): LocalFlightState {
  if (actionType === 'SOLVE_PUZZLE') {
    if (!current.crisisTriggered) {
      throw new Error('El acertijo estará disponible al comenzar la fase crítica.');
    }
    if (!current.activeEvent.puzzle) {
      throw new Error('No hay un acertijo de crisis activo.');
    }
    if (current.role !== current.activeEvent.puzzle.role) {
      throw new Error('El acertijo solo puede resolverlo el rol asignado.');
    }
    const puzzleId = readString(payload, 'puzzleId');
    const answer = readString(payload, 'answer').toUpperCase();
    if (
      puzzleId !== current.activeEvent.puzzle.id ||
      answer !== current.activeEvent.puzzle.answer
    ) {
      throw new Error('La respuesta del acertijo no es correcta.');
    }
    return { ...current, crisisResolved: true };
  }

  if (actionType === 'TOGGLE_SENSOR') {
    if (current.role !== 'SCIENCE') {
      throw new Error('Solo el rol de Ciencia puede cambiar el estado de los sensores.');
    }
    const moduleId = readString(payload, 'moduleId');
    const enabled = payload.enabled;
    if (typeof enabled !== 'boolean') {
      throw new Error('La acción del sensor requiere un valor enabled booleano.');
    }
    const sensor = current.modules.find(
      (module) => module.id === moduleId && module.category === 'SCI',
    );
    if (!sensor) {
      throw new Error('El sensor indicado no está instalado en esta nave.');
    }
    const activeSensorIds = enabled
      ? [...new Set([...current.activeSensorIds, moduleId])]
      : current.activeSensorIds.filter((id) => id !== moduleId);
    const disabledExperimentIds = enabled
      ? current.disabledExperimentIds.filter((id) => id !== moduleId)
      : [...new Set([...current.disabledExperimentIds, moduleId])];
    return { ...current, activeSensorIds, disabledExperimentIds };
  }

  if (current.role !== 'DIRECTOR') {
    throw new Error('Solo el Director de Misión puede tomar decisiones ejecutivas.');
  }
  if (!current.crisisTriggered) {
    throw new Error('La decisión ejecutiva estará disponible al comenzar la fase crítica.');
  }
  if (payload.decision !== 'SACRIFICE_EXPERIMENT') {
    throw new Error('La decisión ejecutiva solicitada no es válida.');
  }
  const moduleId = readString(payload, 'moduleId');
  const experiment = current.modules.find(
    (module) => module.id === moduleId && module.category === 'SCI',
  );
  if (!experiment || current.disabledExperimentIds.includes(moduleId)) {
    throw new Error('El experimento no está activo o ya fue sacrificado.');
  }
  return {
    ...current,
    activeSensorIds: current.activeSensorIds.filter((id) => id !== moduleId),
    disabledExperimentIds: [...current.disabledExperimentIds, moduleId],
    decisions: [...current.decisions, `SACRIFICE_EXPERIMENT:${moduleId}`],
    crisisResolved: true,
  };
}

export function buildLocalReport(
  state: LocalFlightState,
  roomId = 'LOCAL-ROOM',
): MissionReport {
  const activeModules = state.modules.filter(
    (module) => !state.disabledExperimentIds.includes(module.id),
  );
  const sciencePointsEarned = activeModules
    .filter((module) => module.category === 'SCI')
    .reduce((total, module) => total + module.sciencePoints, 0);
  const dataGeneratedMbps = activeModules.reduce(
    (total, module) => total + module.dataGenMbps,
    0,
  );
  const downlinkMbps = state.modules.reduce(
    (total, module) => total + module.dataDownlinkMbps,
    0,
  );
  const dataRecoveryRatio = estimateDataRecoveryRatio(
    {
      totalDataGenerated: dataGeneratedMbps,
      totalDownlinkCapacity: downlinkMbps,
    },
    state.mission,
  );
  const scienceScore =
    state.mission.targetSciencePoints > 0
      ? FLIGHT_CONFIG.scoreWeights.science *
        Math.min(1, sciencePointsEarned / state.mission.targetSciencePoints)
      : 0;
  const dataScore =
    state.mission.requiredDownlinkRatio === 0
      ? FLIGHT_CONFIG.scoreWeights.data
      : FLIGHT_CONFIG.scoreWeights.data *
        Math.min(1, dataRecoveryRatio / state.mission.requiredDownlinkRatio);
  const operationsScore = state.crisisResolved
    ? FLIGHT_CONFIG.scoreWeights.operations
    : state.activeEvent.severity === 'LOW'
      ? FLIGHT_CONFIG.scoreWeights.operations * 0.75
      : FLIGHT_CONFIG.scoreWeights.operations * 0.4;
  const score = Math.round(scienceScore + dataScore + operationsScore);

  const rootCauses: MissionReport['rootCauses'] = [];
  const recommendations: string[] = [];

  if (sciencePointsEarned < state.mission.targetSciencePoints) {
    rootCauses.push({
      code: 'SCIENCE_TARGET_MISSED',
      title: 'Objetivo científico incompleto',
      explanation: `Se obtuvieron ${sciencePointsEarned} de ${state.mission.targetSciencePoints} puntos científicos proyectados.`,
    });
    recommendations.push(
      'Revisar la selección de instrumentos y sus dependencias antes del lanzamiento.',
    );
  }
  if (dataRecoveryRatio < state.mission.requiredDownlinkRatio) {
    rootCauses.push({
      code: 'DATA_RECOVERY_BELOW_TARGET',
      title: 'Datos recuperados por debajo del objetivo',
      explanation: `La tasa estimada de recuperación fue ${(dataRecoveryRatio * 100).toFixed(0)}%, frente al ${(state.mission.requiredDownlinkRatio * 100).toFixed(0)}% requerido.`,
    });
    recommendations.push(
      'Aumentar capacidad de enlace o reducir la generación de datos.',
    );
  }
  if (state.activeEvent.trigger !== 'NOMINAL' || !state.crisisResolved) {
    rootCauses.push({
      code: state.activeEvent.id,
      title: state.activeEvent.title,
      explanation: state.crisisResolved
        ? `${state.activeEvent.rootCause} El equipo resolvió la crisis durante el vuelo.`
        : `${state.activeEvent.rootCause} La crisis quedó sin resolver.`,
    });
    if (!state.crisisResolved) {
      recommendations.push(state.activeEvent.recommendation);
    }
  }
  state.telemetry.warnings.forEach((warning, index) => {
    rootCauses.push({
      code: `DESIGN_WARNING_${index + 1}`,
      title: warning,
      explanation: state.crisisResolved
        ? `${warning} La alerta fue gestionada durante el vuelo.`
        : `${warning} La debilidad de diseño seguía presente al terminar el vuelo.`,
    });
  });
  if (rootCauses.length === 0) {
    rootCauses.push({
      code: 'MISSION_OBJECTIVES_MET',
      title: 'Objetivos principales alcanzados',
      explanation:
        'La misión cumplió los objetivos científicos y de recuperación de datos.',
    });
  }

  const outcome: FlightOutcome =
    score >= FLIGHT_CONFIG.outcomeThresholds.success && state.crisisResolved
      ? 'SUCCESS'
      : score >= FLIGHT_CONFIG.outcomeThresholds.partial
        ? 'PARTIAL'
        : 'FAILURE';

  return {
    roomId,
    outcome,
    score,
    sciencePointsEarned,
    dataRecoveryRatio,
    crisisResolved: state.crisisResolved,
    rootCauses,
    recommendations: [...new Set(recommendations)],
    missionReference: state.mission.realNasaReference,
    flightDurationSeconds: state.durationMs / 1000,
  };
}
