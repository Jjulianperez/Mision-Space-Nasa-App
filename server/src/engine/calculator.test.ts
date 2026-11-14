import { describe, expect, it } from 'vitest';
import { getMissionById, getModuleById } from '../catalog.js';
import { calculateTelemetryMetrics } from './calculator.js';

describe('calculateTelemetryMetrics', () => {
  it('sums mass, cost, electrical load, data, risk and science', () => {
    const mission = {
      ...getMissionById('leo-earth-observation'),
      budgetMillions: 1000,
      maxLauncherMassKg: 1000,
      requiredDownlinkRatio: 0.5,
    };
    const instrument = {
      ...getModuleById('SCI-01'),
      costMillions: 20,
      massKg: 200,
      powerKw: 10,
      dataGenMbps: 12,
      dataDownlinkMbps: 0,
      sciencePoints: 15,
      riskModifier: 3,
    };
    const solar = {
      ...getModuleById('COM-01'),
      costMillions: 30,
      massKg: 100,
      powerKw: -20,
      dataGenMbps: 0,
      dataDownlinkMbps: 0,
      sciencePoints: 0,
      riskModifier: -1,
    };

    expect(calculateTelemetryMetrics(mission, [instrument, solar])).toEqual({
      budgetSpent: 50,
      budgetRemaining: 950,
      totalMassKg: 300,
      massPercentage: 30,
      powerGeneratedKw: 50,
      powerConsumedKw: 25,
      propulsiveEfficiency: 92.5,
      totalDataGenerated: 12,
      totalDownlinkCapacity: 0,
      structuralRisk: 2,
      projectedSciencePoints: 15,
      warnings: ['Capacidad de bajada de datos inferior a la requerida'],
    });
  });

  it('adds structural risk only above strict 90% and 95% thresholds', () => {
    const mission = {
      ...getMissionById('leo-earth-observation'),
      maxLauncherMassKg: 1000,
    };
    const structure = { ...getModuleById('EST-01'), riskModifier: 0 };

    const atNinety = calculateTelemetryMetrics(mission, [{ ...structure, massKg: 900 }]);
    const aboveNinety = calculateTelemetryMetrics(mission, [{ ...structure, massKg: 901 }]);
    const aboveNinetyFive = calculateTelemetryMetrics(mission, [
      { ...structure, massKg: 951 },
    ]);

    expect(atNinety.structuralRisk).toBe(0);
    expect(atNinety.warnings).not.toContain('Estrés estructural en Max-Q');
    expect(aboveNinety.structuralRisk).toBe(12);
    expect(aboveNinety.warnings).toContain('Estrés estructural en Max-Q');
    expect(aboveNinetyFive.structuralRisk).toBe(17);
  });

  it('rejects a zero launcher mass instead of producing invalid percentages', () => {
    const mission = {
      ...getMissionById('leo-earth-observation'),
      maxLauncherMassKg: 0,
    };

    expect(() => calculateTelemetryMetrics(mission, [])).toThrow(
      'La masa máxima del lanzador debe ser mayor que cero.',
    );
  });
});
