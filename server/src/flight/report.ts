import type {
  FlightEventDefinition,
  MissionReport,
  ModuleItem,
  RoomState,
} from '../../../shared/types.js';
import { estimateDataRecoveryRatio } from '../engine/calculator.js';
import { flightConfig } from '../catalog.js';
import type { FlightRuntimeState } from './loop.js';

export function calculateActiveTelemetry(
  modules: ModuleItem[],
  disabledExperimentIds: string[],
): { sciencePoints: number; dataGeneratedMbps: number } {
  const activeModules = modules.filter(
    (module) => !disabledExperimentIds.includes(module.id),
  );
  return {
    sciencePoints: activeModules
      .filter((module) => module.category === 'SCI')
      .reduce((total, module) => total + module.sciencePoints, 0),
    dataGeneratedMbps: activeModules.reduce(
      (total, module) => total + module.dataGenMbps,
      0,
    ),
  };
}

export function generateMissionReport(
  room: RoomState,
  flight: FlightRuntimeState,
): MissionReport {
  const activeTelemetry = calculateActiveTelemetry(
    room.selectedModules,
    flight.disabledExperimentIds,
  );
  const sciencePointsEarned = activeTelemetry.sciencePoints;
  const generatedMbps = activeTelemetry.dataGeneratedMbps;
  const downlinkMbps = room.selectedModules.reduce(
    (total, module) => total + module.dataDownlinkMbps,
    0,
  );
  const dataRecoveryRatio = estimateDataRecoveryRatio(
    generatedMbps,
    downlinkMbps,
    room.mission,
  );
  const scienceScore =
    room.mission.targetSciencePoints > 0
      ? flightConfig.scoreWeights.science *
        Math.min(1, sciencePointsEarned / room.mission.targetSciencePoints)
      : 0;
  const dataScore =
    room.mission.requiredDownlinkRatio === 0
      ? flightConfig.scoreWeights.data
      : flightConfig.scoreWeights.data *
        Math.min(1, dataRecoveryRatio / room.mission.requiredDownlinkRatio);
  const operationsScore = flight.crisisResolved
    ? flightConfig.scoreWeights.operations
    : flight.activeEvent.severity === 'LOW'
      ? flightConfig.scoreWeights.operations * 0.75
      : flightConfig.scoreWeights.operations * 0.4;
  const score = Math.round(scienceScore + dataScore + operationsScore);
  const rootCauses: MissionReport['rootCauses'] = [];
  const recommendations: string[] = [];

  if (sciencePointsEarned < room.mission.targetSciencePoints) {
    rootCauses.push({
      code: 'SCIENCE_TARGET_MISSED',
      title: 'Objetivo científico incompleto',
      explanation: `Se obtuvieron ${sciencePointsEarned} de ${room.mission.targetSciencePoints} puntos científicos proyectados.`,
    });
    recommendations.push('Revisar la selección de instrumentos y sus dependencias antes del lanzamiento.');
  }
  if (dataRecoveryRatio < room.mission.requiredDownlinkRatio) {
    rootCauses.push({
      code: 'DATA_RECOVERY_BELOW_TARGET',
      title: 'Datos recuperados por debajo del objetivo',
      explanation: `La tasa estimada de recuperación fue ${(dataRecoveryRatio * 100).toFixed(0)}%, frente al ${(room.mission.requiredDownlinkRatio * 100).toFixed(0)}% requerido.`,
    });
    recommendations.push('Aumentar capacidad de enlace o reducir la generación de datos.');
  }
  if (flight.activeEvent.trigger !== 'NOMINAL' || !flight.crisisResolved) {
    rootCauses.push({
      code: flight.activeEvent.id,
      title: flight.activeEvent.title,
      explanation: flight.crisisResolved
        ? `${flight.activeEvent.rootCause} El equipo resolvió la crisis durante el vuelo.`
        : `${flight.activeEvent.rootCause} La crisis quedó sin resolver.`,
    });
    if (!flight.crisisResolved) {
      recommendations.push(flight.activeEvent.recommendation);
    }
  }
  const activeEventWarningCode: Partial<Record<FlightEventDefinition['trigger'], string>> = {
    POWER_DEFICIT: 'POWER_DEFICIT',
    STRUCTURAL_STRESS: 'STRUCTURAL_STRESS',
    LOW_DOWNLINK: 'LOW_DOWNLINK',
    NOMINAL: '',
    SPACE_RADIATION: '',
    FLUID_SHIFT_SANS: '',
    SPATIAL_DISORIENTATION: '',
    MICROBIOME_ALERT: '',
    AUTONOMOUS_MEDICAL: '',
  };
  for (const warning of room.audit.warnings) {
    if (
      (warning.code === 'STRUCTURAL_STRESS' || warning.code === 'POWER_DEFICIT') &&
      warning.code !== activeEventWarningCode[flight.activeEvent.trigger]
    ) {
      rootCauses.push({
        code: warning.code,
        title: warning.message,
        explanation: flight.crisisResolved
          ? `${warning.message} La alerta fue gestionada durante el vuelo.`
          : `${warning.message} La debilidad de diseño seguía presente al terminar el vuelo.`,
      });
    }
  }
  if (rootCauses.length === 0) {
    rootCauses.push({
      code: 'MISSION_OBJECTIVES_MET',
      title: 'Objetivos principales alcanzados',
      explanation: 'La misión cumplió los objetivos científicos y de recuperación de datos.',
    });
  }

  const outcome: MissionReport['outcome'] =
    score >= flightConfig.outcomeThresholds.success && flight.crisisResolved
      ? 'SUCCESS'
      : score >= flightConfig.outcomeThresholds.partial
        ? 'PARTIAL'
        : 'FAILURE';

  return {
    roomId: room.roomId,
    outcome,
    score,
    sciencePointsEarned,
    dataRecoveryRatio,
    crisisResolved: flight.crisisResolved,
    rootCauses,
    recommendations: [...new Set(recommendations)],
    missionReference: room.mission.realNasaReference,
    flightDurationSeconds: flight.durationMs / 1000,
  };
}