import { describe, expect, it } from 'vitest';
import {
  getGroundStationForMission,
  getMissionById,
  listGroundStations,
  listMissions,
  listModules,
  selectFlightEvent,
} from './catalog.js';

describe('NASA-inspired local catalogs', () => {
  it('provides three missions and all three module categories', () => {
    expect(listMissions()).toHaveLength(3);
    expect(listModules('EST').length).toBeGreaterThan(0);
    expect(listModules('SCI').length).toBeGreaterThan(0);
    expect(listModules('COM').length).toBeGreaterThan(0);
    expect(listGroundStations()).toHaveLength(2);
  });

  it('returns a compatible terrestrial network for each mission', () => {
    for (const mission of listMissions()) {
      const station = getGroundStationForMission(mission);
      expect(station.supportedOrbits).toContain(mission.orbitType);
    }
  });

  it('selects the most urgent configured event for the design weakness', () => {
    const event = selectFlightEvent(
      {
        massPercentage: 95,
        powerConsumedKw: 40,
        powerGeneratedKw: 30,
        totalDataGenerated: 20,
        totalDownlinkCapacity: 0,
      },
      getMissionById('leo-earth-observation'),
    );

    expect(event.id).toBe('power-drop');
    expect(event.puzzle?.id).toBe('power-reset');
  });

  it('accounts for terrestrial contact windows when selecting a downlink crisis', () => {
    const mission = {
      ...getMissionById('leo-earth-observation'),
      requiredDownlinkRatio: 0.75,
    };
    const event = selectFlightEvent(
      {
        massPercentage: 30,
        powerConsumedKw: 20,
        powerGeneratedKw: 30,
        totalDataGenerated: 10,
        totalDownlinkCapacity: 10,
      },
      mission,
    );

    expect(event.id).toBe('low-downlink');
  });

  it('does not expose missing scenario IDs as undefined', () => {
    expect(() => getMissionById('unknown')).toThrow('No existe la misión');
  });
});
