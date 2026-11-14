import { describe, expect, it } from 'vitest';
import { getGroundStationForMission, getMissionById, getModuleById } from '../catalog.js';
import { calculateTelemetryMetrics } from '../engine/calculator.js';
import { buildAsymmetricFlightPayload } from '../sockets/asymmetry.js';
import {
  advanceFlightRuntime,
  applyFlightAction,
  createFlightRuntime,
} from './loop.js';

describe('flight loop and role payloads', () => {
  const mission = getMissionById('leo-earth-observation');
  const scienceInstrument = { ...getModuleById('SCI-01'), powerKw: 25 };
  const modules = [scienceInstrument];
  const telemetry = calculateTelemetryMetrics(mission, modules);

  it('moves through ascent, the 40% crisis and final operations exactly once', () => {
    const start = 10_000;
    const flight = createFlightRuntime('ROOM1', start, mission, modules, telemetry);
    const beforeCrisis = advanceFlightRuntime(flight, start + 29_999);
    const atCrisis = advanceFlightRuntime(beforeCrisis.state, start + 30_000);
    const afterCrisis = advanceFlightRuntime(atCrisis.state, start + 34_000);

    expect(beforeCrisis.state.act).toBe('ASCENT_INSERTION');
    expect(atCrisis.state.progress).toBe(40);
    expect(atCrisis.state.act).toBe('CRISIS');
    expect(atCrisis.crisisStarted).toBe(true);
    expect(afterCrisis.crisisStarted).toBe(false);
    expect(afterCrisis.state.act).toBe('OPERATIONS');
  });

  it('sends trajectory and threats only to COMMS and internal metrics only to PROPULSION', () => {
    const flight = advanceFlightRuntime(
      createFlightRuntime('ROOM1', 0, mission, modules, telemetry),
      30_000,
    ).state;
    const station = getGroundStationForMission(mission);
    const comms = buildAsymmetricFlightPayload(
      'COMMS',
      mission,
      telemetry,
      modules,
      station,
      flight,
    );
    const propulsion = buildAsymmetricFlightPayload(
      'PROPULSION',
      mission,
      telemetry,
      modules,
      station,
      flight,
    );
    const science = buildAsymmetricFlightPayload(
      'SCIENCE',
      mission,
      telemetry,
      modules,
      station,
      flight,
    );

    expect(comms.role).toBe('COMMS');
    expect(comms).toHaveProperty('trajectory');
    expect(comms).toHaveProperty('threats');
    expect(comms).not.toHaveProperty('internal');
    expect(propulsion.role).toBe('PROPULSION');
    expect(propulsion).toHaveProperty('internal');
    expect(propulsion).not.toHaveProperty('trajectory');
    expect(propulsion).not.toHaveProperty('threats');
    expect(science.role).toBe('SCIENCE');
    expect(science).toHaveProperty('sensors');
    expect(science).not.toHaveProperty('internal');
  });

  it('allows only the assigned specialist to solve the active crisis puzzle', () => {
    const flight = advanceFlightRuntime(
      createFlightRuntime('ROOM1', 0, mission, modules, telemetry),
      30_000,
    ).state;

    expect(() =>
      applyFlightAction(
        flight,
        'SCIENCE',
        'SOLVE_PUZZLE',
        { puzzleId: 'power-reset', answer: 'RESET-POWER' },
        modules,
      ),
    ).toThrow('rol asignado');

    const resolved = applyFlightAction(
      flight,
      'PROPULSION',
      'SOLVE_PUZZLE',
      { puzzleId: 'power-reset', answer: 'RESET-POWER' },
      modules,
    );
    expect(resolved.crisisResolved).toBe(true);
  });

  it('lets SCIENCE deactivate an installed sensor and exposes no other role telemetry', () => {
    const flight = createFlightRuntime('ROOM1', 0, mission, modules, telemetry);
    const updated = applyFlightAction(
      flight,
      'SCIENCE',
      'TOGGLE_SENSOR',
      { moduleId: 'SCI-01', enabled: false },
      modules,
    );
    const director = buildAsymmetricFlightPayload(
      'DIRECTOR',
      mission,
      telemetry,
      modules,
      getGroundStationForMission(mission),
      updated,
    );

    expect(updated.activeSensorIds).toEqual([]);
    expect(director.role).toBe('DIRECTOR');
    expect(director).toHaveProperty('science');
    expect(director).not.toHaveProperty('trajectory');
    expect(director).not.toHaveProperty('internal');
  });
});
