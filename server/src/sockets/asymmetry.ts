import type {
  AsymmetricFlightPayload,
  FlightCrisisAlert,
  GroundStation,
  MissionConfig,
  ModuleItem,
  RoleType,
  TelemetryMetrics,
} from '../../../shared/types.js';
import { flightConfig } from '../catalog.js';
import type { FlightRuntimeState } from '../flight/loop.js';

export function buildAsymmetricFlightPayload(
  role: RoleType,
  mission: MissionConfig,
  telemetry: TelemetryMetrics,
  modules: ModuleItem[],
  station: GroundStation,
  flight: FlightRuntimeState,
): AsymmetricFlightPayload {
  const base = { progress: flight.progress, act: flight.act };

  if (role === 'COMMS') {
    const elapsedSeconds = ((flight.progress / 100) * flight.durationMs) / 1000;
    const phaseOfWindow = elapsedSeconds % station.windowPeriodSeconds;
    return {
      ...base,
      role,
      trajectory: flightConfig.trajectoryByOrbit[mission.orbitType],
      threats: flight.crisisTriggered
        ? [
            {
              eventId: flight.activeEvent.id,
              title: flight.activeEvent.title,
              severity: flight.activeEvent.severity,
              description: flight.activeEvent.description,
            },
          ]
        : [],
      downlinkWindowOpen: phaseOfWindow < station.windowDurationSeconds,
    };
  }

  if (role === 'PROPULSION') {
    const progressFactor = flight.progress / 100;
    return {
      ...base,
      role,
      internal: {
        fuelPercent: Math.max(
          0,
          flightConfig.baseFuelPercent -
            progressFactor * flightConfig.fuelConsumptionPercentPerProgress * 100,
        ),
        temperatureC:
          flightConfig.baseTemperatureC +
          telemetry.massPercentage * flightConfig.temperatureRiseCPerMassPercent +
          progressFactor * flightConfig.temperatureRiseCAtFullProgress,
        integrityPercent: Math.max(
          0,
          100 - telemetry.structuralRisk * flightConfig.integrityLossPerStructuralRisk,
        ),
        energyBalanceKw: telemetry.powerGeneratedKw - telemetry.powerConsumedKw,
      },
      repairPuzzle:
        flight.crisisTriggered &&
        !flight.crisisResolved &&
        flight.activeEvent.puzzle?.role === 'PROPULSION'
          ? {
              id: flight.activeEvent.puzzle.id,
              prompt: flight.activeEvent.puzzle.prompt,
            }
          : null,
    };
  }

  if (role === 'SCIENCE') {
    return {
      ...base,
      role,
      sensors: modules
        .filter((module) => module.category === 'SCI')
        .map((module) => ({
          moduleId: module.id,
          name: module.name,
          active: flight.activeSensorIds.includes(module.id),
          dataGenMbps: module.dataGenMbps,
        })),
      calibrationPuzzle:
        flight.crisisTriggered &&
        !flight.crisisResolved &&
        flight.activeEvent.puzzle?.role === 'SCIENCE'
          ? {
              id: flight.activeEvent.puzzle.id,
              prompt: flight.activeEvent.puzzle.prompt,
            }
          : null,
    };
  }

  const activeExperiments = modules.filter(
    (module) =>
      module.category === 'SCI' && !flight.disabledExperimentIds.includes(module.id),
  );
  const projectedPoints = activeExperiments.reduce(
    (total, module) => total + module.sciencePoints,
    0,
  );
  return {
    ...base,
    role,
    science: {
      projectedPoints,
      targetPoints: mission.targetSciencePoints,
      progressPercent:
        mission.targetSciencePoints > 0
          ? Math.min(100, (projectedPoints / mission.targetSciencePoints) * 100)
          : 0,
    },
    crisisDecisionAvailable: flight.crisisTriggered && !flight.crisisResolved,
    activeExperimentIds: activeExperiments.map((module) => module.id),
  };
}

export function toCrisisAlert(flight: FlightRuntimeState): FlightCrisisAlert {
  return {
    eventId: flight.activeEvent.id,
    title: flight.activeEvent.title,
    severity: flight.activeEvent.severity,
    description: flight.activeEvent.description,
  };
}