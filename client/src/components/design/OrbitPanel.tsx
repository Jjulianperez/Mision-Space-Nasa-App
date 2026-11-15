import { Orbit, Rocket, Weight } from 'lucide-react';
import {
  LAUNCHER_OPTIONS,
  ORBIT_OPTIONS,
  type LauncherOption,
  type OrbitOption,
} from '../../data/demoCatalog';
import type { DesignMetrics } from '../../lib/designCalculations';
import { formatKg, formatMillions, formatNumber } from '../../lib/format';
import { useDesignStore } from '../../store/useDesignStore';
import { CompatibilityBadge, MeterBar, cx } from './ui';

function OrbitEffects({ orbit }: { orbit: OrbitOption }) {
  const effects: string[] = [];

  if (orbit.massPenaltyKg > 0) effects.push(`+${formatKg(orbit.massPenaltyKg)}`);
  if (orbit.scienceFactor !== 1) effects.push(`Ciencia ×${formatNumber(orbit.scienceFactor, 2)}`);
  if (orbit.powerFactor !== 1) effects.push(`Energía ×${formatNumber(orbit.powerFactor, 2)}`);
  if (orbit.lifeDeltaYears !== 0) {
    effects.push(`Vida ${orbit.lifeDeltaYears > 0 ? '+' : '−'}${formatNumber(Math.abs(orbit.lifeDeltaYears), 1)} a`);
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-mono-xs text-on-surface-variant">
      {effects.length ? (
        effects.map((effect) => (
          <span key={effect} className="rounded bg-surface-container px-1.5 py-0.5">
            {effect}
          </span>
        ))
      ) : (
        <span className="rounded bg-success/10 px-1.5 py-0.5 text-success">Línea base de misión</span>
      )}
    </div>
  );
}

function LauncherFit({ launcher, totalMassKg }: { launcher: LauncherOption; totalMassKg: number }) {
  const fits = totalMassKg <= launcher.maxMassKg;
  const excess = totalMassKg - launcher.maxMassKg;

  return (
    <span
      className={cx(
        'shrink-0 rounded-full border px-1.5 py-0.5 font-mono text-mono-xs',
        fits
          ? 'border-success/30 bg-success/10 text-success'
          : 'border-error/40 bg-error/10 text-error',
      )}
    >
      {fits ? 'Cabe' : `Excede +${formatKg(excess)}`}
    </span>
  );
}

export function OrbitPanel({ metrics }: { metrics: DesignMetrics }) {
  const orbitId = useDesignStore((state) => state.orbitId);
  const launcherId = useDesignStore((state) => state.launcherId);
  const selectOrbit = useDesignStore((state) => state.selectOrbit);
  const selectLauncher = useDesignStore((state) => state.selectLauncher);

  const massTone =
    metrics.massPercentage > 100 ? 'error' : metrics.massPercentage >= 90 ? 'warning' : 'success';

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Orbit className="h-4 w-4 text-accent" aria-hidden="true" />
          <h2 className="font-title text-label-lg text-on-surface">Órbita objetivo</h2>
          <span className="ml-auto font-mono text-mono-xs text-on-surface-variant">
            {ORBIT_OPTIONS.length} opciones
          </span>
        </div>

        {ORBIT_OPTIONS.map((orbit) => {
          const selected = orbit.id === orbitId;
          return (
            <button
              key={orbit.id}
              type="button"
              onClick={() => selectOrbit(orbit.id)}
              aria-pressed={selected}
              className={cx(
                'w-full rounded-md border p-3 text-left transition-all duration-200 ease-state-change focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                selected
                  ? 'border-accent/60 bg-accent/5'
                  : 'border-outline-variant bg-surface-container-low hover:border-outline hover:bg-surface-container',
              )}
            >
              <div className="flex items-start gap-2.5">
                <span
                  className={cx(
                    'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                    selected ? 'border-accent' : 'border-outline',
                  )}
                  aria-hidden="true"
                >
                  {selected ? <span className="h-2 w-2 rounded-full bg-accent" /> : null}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <h3 className="font-title text-label-lg text-on-surface">{orbit.name}</h3>
                    <CompatibilityBadge status={orbit.compatibility} />
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-x-2 font-mono text-mono-xs text-on-surface-variant">
                    <span>{orbit.altitudeLabel}</span>
                    <span className="text-outline">·</span>
                    <span>Inc. {orbit.inclination}</span>
                  </div>

                  <p className="mt-1 font-body text-body-md text-on-surface-variant">
                    {orbit.description}
                  </p>
                  <OrbitEffects orbit={orbit} />
                </div>
              </div>
            </button>
          );
        })}
      </section>

      <div className="h-px bg-outline-variant" />

      <section className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Rocket className="h-4 w-4 text-primary" aria-hidden="true" />
          <h2 className="font-title text-label-lg text-on-surface">Vehículo lanzador</h2>
          <span className="ml-auto font-mono text-mono-xs text-on-surface-variant">
            {LAUNCHER_OPTIONS.length} opciones
          </span>
        </div>

        {LAUNCHER_OPTIONS.map((launcher) => {
          const selected = launcher.id === launcherId;
          return (
            <button
              key={launcher.id}
              type="button"
              onClick={() => selectLauncher(launcher.id)}
              aria-pressed={selected}
              className={cx(
                'w-full rounded-md border p-3 text-left transition-all duration-200 ease-state-change focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                selected
                  ? 'border-primary/60 bg-primary/5'
                  : 'border-outline-variant bg-surface-container-low hover:border-outline hover:bg-surface-container',
              )}
            >
              <div className="flex items-start gap-2.5">
                <span
                  className={cx(
                    'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                    selected ? 'border-primary' : 'border-outline',
                  )}
                  aria-hidden="true"
                >
                  {selected ? <span className="h-2 w-2 rounded-full bg-primary" /> : null}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <h3 className="font-title text-label-lg text-on-surface">{launcher.name}</h3>
                    <LauncherFit launcher={launcher} totalMassKg={metrics.totalMassKg} />
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-x-2 font-mono text-mono-xs text-on-surface-variant">
                    <span className="inline-flex items-center gap-1">
                      <Weight className="h-3 w-3" aria-hidden="true" />
                      {formatKg(launcher.maxMassKg)}
                    </span>
                    <span className="text-outline">·</span>
                    <span>{formatMillions(launcher.costMillions)}</span>
                    <span className="text-outline">·</span>
                    <span className={launcher.supportsLunar ? 'text-success' : ''}>
                      {launcher.supportsLunar ? 'TLI habilitado' : 'Sólo LEO / SSO'}
                    </span>
                  </div>

                  <p className="mt-1 font-body text-body-md text-on-surface-variant">
                    {launcher.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </section>

      <div className="rounded-md border border-outline-variant bg-surface-container p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="font-label text-label-sm text-on-surface-variant">Masa con este lanzador</span>
          <span className="font-mono text-mono-sm tabular-nums text-on-surface">
            {formatKg(metrics.totalMassKg)} / {formatKg(metrics.massLimitKg)}
          </span>
        </div>
        <MeterBar
          percent={metrics.massPercentage}
          tone={massTone}
          label="Masa total frente al límite del lanzador"
          className="mt-2"
        />
        <p className="mt-2 font-body text-body-md text-on-surface-variant">
          {metrics.massMarginKg >= 0
            ? `Quedan ${formatKg(metrics.massMarginKg)} de margen. `
            : `Excedes el límite en ${formatKg(Math.abs(metrics.massMarginKg))}. `}
          El lanzador fija el límite de masa y el coste de lanzamiento. Cambiarlo recalcula el presupuesto.
        </p>
      </div>
    </div>
  );
}
