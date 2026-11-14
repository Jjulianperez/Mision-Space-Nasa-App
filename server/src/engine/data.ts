import type { GroundStation } from '../../../shared/types.js';

export function estimateDataRecoveryRatio(
  totalDataGenerated: number,
  totalDownlinkCapacity: number,
  station: GroundStation,
): number {
  if (totalDataGenerated <= 0) {
    return 0;
  }
  const contactRatio = station.windowDurationSeconds / station.windowPeriodSeconds;
  return Math.min(
    1,
    (totalDownlinkCapacity * station.downlinkMultiplier * contactRatio) / totalDataGenerated,
  );
}
