import flightEventsJson from '../../data/flight_events.json' with { type: 'json' };
import flightConfigJson from '../../data/flight_config.json' with { type: 'json' };
import missionsJson from '../../data/missions.json' with { type: 'json' };
import modulesJson from '../../data/modules.json' with { type: 'json' };
import type {
  FlightEventDefinition,
  FlightSimulationConfig,
  GroundStation,
  MissionConfig,
  ModuleItem,
  ModuleCategory,
  RoleType,
} from '../../shared/types.js';
import { estimateDataRecoveryRatio } from './engine/data.js';

const missionOrbits: MissionConfig['orbitType'][] = ['LEO', 'SSO', 'LUNAR', 'DEEP_SPACE'];
const categories: ModuleCategory[] = ['EST', 'SCI', 'COM'];
const roles: RoleType[] = ['DIRECTOR', 'PROPULSION', 'SCIENCE', 'COMMS'];
const eventTriggers: FlightEventDefinition['trigger'][] = [
  'POWER_DEFICIT',
  'STRUCTURAL_STRESS',
  'LOW_DOWNLINK',
  'NOMINAL',
  'SPACE_RADIATION',
  'FLUID_SHIFT_SANS',
  'SPATIAL_DISORIENTATION',
  'MICROBIOME_ALERT',
  'AUTONOMOUS_MEDICAL',
];
const eventSeverities: FlightEventDefinition['severity'][] = ['LOW', 'MEDIUM', 'HIGH'];

function isOneOf<T extends string>(value: string, values: T[]): value is T {
  return values.some((candidate) => candidate === value);
}

function isPuzzleRole(value: string): value is 'PROPULSION' | 'SCIENCE' {
  return value === 'PROPULSION' || value === 'SCIENCE';
}

function parseMissions(): MissionConfig[] {
  return missionsJson.map((mission) => {
    if (!isOneOf(mission.orbitType, missionOrbits)) {
      throw new Error(`La misión "${mission.id}" tiene una órbita desconocida.`);
    }
    return { ...mission, orbitType: mission.orbitType };
  });
}

function parseModules(): ModuleItem[] {
  return modulesJson.modules.map((module) => {
    if (
      !isOneOf(module.category, categories) ||
      !isOneOf(module.allowedRole, roles)
    ) {
      throw new Error(`El módulo "${module.id}" tiene una categoría o rol desconocido.`);
    }
    return {
      ...module,
      category: module.category,
      allowedRole: module.allowedRole,
    };
  });
}

function parseGroundStations(): GroundStation[] {
  return modulesJson.groundStations.map((station) => ({
    ...station,
    supportedOrbits: station.supportedOrbits.map((orbit) => {
      if (!isOneOf(orbit, missionOrbits)) {
        throw new Error(`La estación "${station.id}" contiene una órbita desconocida.`);
      }
      return orbit;
    }),
  }));
}

function parseFlightEvents(): FlightEventDefinition[] {
  return flightEventsJson.map((event) => {
    if (!isOneOf(event.trigger, eventTriggers) || !isOneOf(event.severity, eventSeverities)) {
      throw new Error(`El evento "${event.id}" tiene un disparador o severidad desconocidos.`);
    }
    let puzzle: FlightEventDefinition['puzzle'];
    if (event.puzzle) {
      if (!isPuzzleRole(event.puzzle.role)) {
        throw new Error(`El acertijo del evento "${event.id}" tiene un rol desconocido.`);
      }
      puzzle = {
        id: event.puzzle.id,
        role: event.puzzle.role,
        prompt: event.puzzle.prompt,
        answer: event.puzzle.answer,
      };
    }
    return {
      ...event,
      trigger: event.trigger,
      severity: event.severity,
      puzzle,
    };
  });
}

const missions = parseMissions();
const modules = parseModules();
const groundStations = parseGroundStations();
const flightEvents = parseFlightEvents();
export const flightConfig = flightConfigJson satisfies FlightSimulationConfig;

function assertUniqueIds<T extends { id: string }>(items: T[], catalogName: string): void {
  const ids = new Set<string>();
  for (const item of items) {
    if (ids.has(item.id)) {
      throw new Error(`El catálogo ${catalogName} contiene el ID duplicado "${item.id}".`);
    }
    ids.add(item.id);
  }
}

function assertCatalogsAreValid(): void {
  assertUniqueIds(missions, 'misiones');
  assertUniqueIds(modules, 'módulos');
  assertUniqueIds(groundStations, 'estaciones terrestres');
  assertUniqueIds(flightEvents, 'eventos de vuelo');
  if (
    flightConfig.durationSeconds <= 0 ||
    flightConfig.tickIntervalMs <= 0 ||
    flightConfig.crisisProgressPercent <= 0 ||
    flightConfig.crisisProgressPercent >= flightConfig.crisisActEndPercent ||
    flightConfig.crisisActEndPercent >= 100
  ) {
    throw new Error('La configuración de duración o de actos del vuelo es inválida.');
  }

  const moduleIds = new Set(modules.map((module) => module.id));
  const expectedRoleByCategory = {
    EST: 'PROPULSION',
    SCI: 'SCIENCE',
    COM: 'COMMS',
  } as const;
  for (const module of modules) {
    if (
      module.allowedRole !== expectedRoleByCategory[module.category] ||
      !Number.isFinite(module.costMillions) ||
      module.costMillions < 0 ||
      !Number.isFinite(module.massKg) ||
      module.massKg < 0 ||
      !Number.isFinite(module.powerKw) ||
      !Number.isFinite(module.dataGenMbps) ||
      module.dataGenMbps < 0 ||
      !Number.isFinite(module.dataDownlinkMbps) ||
      module.dataDownlinkMbps < 0 ||
      !Number.isFinite(module.sciencePoints) ||
      module.sciencePoints < 0 ||
      !Number.isFinite(module.riskModifier) ||
      (module.slotsRequired !== undefined &&
        (!Number.isInteger(module.slotsRequired) || module.slotsRequired < 1))
    ) {
      throw new Error(`El módulo "${module.id}" contiene valores de catálogo inválidos.`);
    }
    if (module.requiresModuleId && !moduleIds.has(module.requiresModuleId)) {
      throw new Error(
        `El módulo "${module.id}" requiere un módulo inexistente "${module.requiresModuleId}".`,
      );
    }
  }

  const stationIds = new Set(groundStations.map((station) => station.id));
  for (const mission of missions) {
    if (
      !Number.isFinite(mission.budgetMillions) ||
      mission.budgetMillions < 0 ||
      !Number.isFinite(mission.maxLauncherMassKg) ||
      mission.maxLauncherMassKg <= 0 ||
      !Number.isFinite(mission.targetSciencePoints) ||
      mission.targetSciencePoints < 0 ||
      !Number.isFinite(mission.requiredDownlinkRatio) ||
      mission.requiredDownlinkRatio < 0 ||
      mission.requiredDownlinkRatio > 1
    ) {
      throw new Error(`La misión "${mission.id}" contiene valores de catálogo inválidos.`);
    }
    const station = groundStations.find((item) => item.id === mission.groundStationId);
    if (!stationIds.has(mission.groundStationId) || !station?.supportedOrbits.includes(mission.orbitType)) {
      throw new Error(
        `La misión "${mission.id}" referencia una estación inexistente o incompatible "${mission.groundStationId}".`,
      );
    }
  }
  for (const station of groundStations) {
    if (station.windowDurationSeconds <= 0 || station.windowPeriodSeconds <= 0) {
      throw new Error(`La estación "${station.id}" tiene una ventana de enlace inválida.`);
    }
    if (
      !Number.isFinite(station.downlinkMultiplier) ||
      station.downlinkMultiplier <= 0 ||
      station.windowDurationSeconds > station.windowPeriodSeconds
    ) {
      throw new Error(`La estación "${station.id}" tiene parámetros de enlace inválidos.`);
    }
  }
  const configuredTriggers = new Set(flightEvents.map((event) => event.trigger));
  for (const trigger of eventTriggers) {
    if (!configuredTriggers.has(trigger)) {
      throw new Error(`No hay evento de vuelo configurado para la condición "${trigger}".`);
    }
    const scoreWeightTotal =
      flightConfig.scoreWeights.science +
      flightConfig.scoreWeights.data +
      flightConfig.scoreWeights.operations;
    if (
      scoreWeightTotal !== 100 ||
      flightConfig.outcomeThresholds.success < flightConfig.outcomeThresholds.partial ||
      flightConfig.outcomeThresholds.partial < 0 ||
      flightConfig.outcomeThresholds.success > 100
    ) {
      throw new Error('La ponderación o los umbrales de resultados del informe son inválidos.');
    }
    for (const orbit of missionOrbits) {
      const trajectory = flightConfig.trajectoryByOrbit[orbit];
      if (
        trajectory.length < 2 ||
        trajectory[0].progress !== 0 ||
        trajectory[trajectory.length - 1].progress !== 100 ||
        trajectory.some(
          (point, index) =>
            point.progress < 0 ||
            point.progress > 100 ||
            point.x < 0 ||
            point.x > 100 ||
            point.y < 0 ||
            point.y > 100 ||
            (index > 0 && point.progress <= trajectory[index - 1].progress),
        )
      ) {
        throw new Error(`La trayectoria didáctica de ${orbit} tiene puntos inválidos.`);
      }
    }
  }
}

assertCatalogsAreValid();

export function listMissions(): MissionConfig[] {
  return structuredClone(missions);
}

export function getMissionById(missionId: string): MissionConfig {
  const mission = missions.find((item) => item.id === missionId);
  if (!mission) {
    throw new Error(`No existe la misión "${missionId}".`);
  }
  return structuredClone(mission);
}

export function listModules(category?: ModuleItem['category']): ModuleItem[] {
  const matchingModules = category
    ? modules.filter((module) => module.category === category)
    : modules;
  return structuredClone(matchingModules);
}

export function getModuleById(moduleId: string): ModuleItem {
  const module = modules.find((item) => item.id === moduleId);
  if (!module) {
    throw new Error(`No existe el módulo "${moduleId}".`);
  }
  return structuredClone(module);
}

export function listGroundStations(): GroundStation[] {
  return structuredClone(groundStations);
}

export function getGroundStationForMission(mission: MissionConfig): GroundStation {
  const station = groundStations.find(
    (item) =>
      item.id === mission.groundStationId && item.supportedOrbits.includes(mission.orbitType),
  );
  if (!station) {
    throw new Error(`No hay una estación compatible configurada para la misión "${mission.id}".`);
  }
  return structuredClone(station);
}

export function selectFlightEvent(
  telemetry: {
    massPercentage: number;
    powerConsumedKw: number;
    powerGeneratedKw: number;
    totalDataGenerated: number;
    totalDownlinkCapacity: number;
  },
  mission: MissionConfig,
): FlightEventDefinition {
  const station = getGroundStationForMission(mission);
  const dataRecoveryRatio = estimateDataRecoveryRatio(
    telemetry.totalDataGenerated,
    telemetry.totalDownlinkCapacity,
    station,
  );
  const trigger: FlightEventDefinition['trigger'] =
    telemetry.powerConsumedKw > telemetry.powerGeneratedKw
      ? 'POWER_DEFICIT'
      : telemetry.massPercentage > 90
        ? 'STRUCTURAL_STRESS'
        : dataRecoveryRatio < mission.requiredDownlinkRatio
          ? 'LOW_DOWNLINK'
          : 'NOMINAL';
  const event = flightEvents.find((item) => item.trigger === trigger);
  if (!event) {
    throw new Error(`No hay evento de vuelo configurado para la condición "${trigger}".`);
  }
  return structuredClone(event);
}
