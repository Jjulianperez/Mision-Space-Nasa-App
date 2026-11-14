import { describe, expect, it } from 'vitest';
import { getMissionById, getModuleById } from '../catalog.js';
import { auditPreLaunch, validateModuleProposal } from './audit.js';

describe('auditPreLaunch', () => {
  const mission = {
    ...getMissionById('leo-earth-observation'),
    budgetMillions: 1000,
    maxLauncherMassKg: 1000,
  };

  it('warns above 90% mass but permits launch below the absolute limit', () => {
    const audit = auditPreLaunch(mission, [
      { ...getModuleById('EST-01'), massKg: 950 },
    ]);

    expect(audit.canLaunch).toBe(true);
    expect(audit.warnings.map((warning) => warning.code)).toContain('STRUCTURAL_STRESS');
    expect(audit.blocks).toHaveLength(0);
  });

  it('blocks only when a hard limit is crossed', () => {
    const audit = auditPreLaunch(mission, [
      { ...getModuleById('EST-01'), massKg: 1001 },
    ]);

    expect(audit.canLaunch).toBe(false);
    expect(audit.blocks.map((block) => block.code)).toContain('LAUNCHER_MASS_EXCEEDED');
  });

  it('warns about a power deficit without blocking launch', () => {
    const audit = auditPreLaunch(mission, [
      { ...getModuleById('SCI-01'), powerKw: 20 },
    ]);

    expect(audit.canLaunch).toBe(true);
    expect(audit.warnings.map((warning) => warning.code)).toContain('POWER_DEFICIT');
    expect(audit.blocks).toHaveLength(0);
  });

  it('warns when projected science is below the mission objective without blocking launch', () => {
    const audit = auditPreLaunch(mission, []);

    expect(audit.canLaunch).toBe(true);
    expect(audit.warnings.map((warning) => warning.code)).toContain('SCIENCE_TARGET');
    expect(audit.blocks).toHaveLength(0);
  });

  it('blocks budget overrun and science-bay overflow', () => {
    const budgetAudit = auditPreLaunch(
      { ...mission, budgetMillions: 10 },
      [{ ...getModuleById('EST-01'), costMillions: 11 }],
    );
    const bayAudit = auditPreLaunch(mission, [
      getModuleById('SCI-05'),
      getModuleById('SCI-01'),
      getModuleById('SCI-02'),
    ]);

    expect(budgetAudit.blocks.map((block) => block.code)).toContain('BUDGET_EXCEEDED');
    expect(bayAudit.scienceBaySlotsUsed).toBe(4);
    expect(bayAudit.blocks.map((block) => block.code)).toContain('SCIENCE_BAY_EXCEEDED');
  });

  it('rejects proposals that break module dependencies', () => {
    expect(() =>
      validateModuleProposal(
        mission,
        [],
        getModuleById('EST-03'),
        'ADD',
      ),
    ).toThrow('requiere el módulo EST-01');
  });
});
