import flightConfigJson from '../../../data/flight_config.json';
import flightEventsJson from '../../../data/flight_events.json';
import modulesJson from '../../../data/modules.json';
import missionsJson from '../../../data/missions.json';
import type {
  FlightEventDefinition,
  FlightSimulationConfig,
  GroundStation,
  MissionConfig,
  ModuleItem,
} from '@shared/types';

/**
 * Catálogos de respaldo del cliente.
 *
 * La fuente de verdad sigue siendo `/data`. El servidor expone los mismos
 * catálogos por HTTP; estas copias sólo se usan para que el lobby y la
 * simulación offline funcionen aunque el backend no esté levantado.
 */
export const CATALOG_MISSIONS = missionsJson as unknown as MissionConfig[];
export const CATALOG_MODULES = modulesJson.modules as unknown as ModuleItem[];
export const CATALOG_GROUND_STATIONS = modulesJson.groundStations as unknown as GroundStation[];
export const FLIGHT_CONFIG = flightConfigJson as unknown as FlightSimulationConfig;
export const FLIGHT_EVENTS = flightEventsJson as unknown as FlightEventDefinition[];

export function getCatalogMission(missionId: string): MissionConfig | undefined {
  return CATALOG_MISSIONS.find((mission) => mission.id === missionId);
}

export function getCatalogGroundStation(mission: MissionConfig): GroundStation {
  return (
    CATALOG_GROUND_STATIONS.find(
      (station) =>
        station.id === mission.groundStationId &&
        station.supportedOrbits.includes(mission.orbitType),
    ) ?? CATALOG_GROUND_STATIONS[0]
  );
}
