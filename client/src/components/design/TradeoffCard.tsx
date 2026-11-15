import { Library, Lightbulb } from 'lucide-react';
import { DEMO_MISSION } from '../../data/demoCatalog';
import { getDesignInsight, type DesignMetrics } from '../../lib/designCalculations';
import { formatKg, formatMillions, formatNumber } from '../../lib/format';
import { DesignStatusPill, cx } from './ui';

const INSIGHT_STYLE = {
  primary: {
    panel: 'border-l-primary/60',
    icon: 'border-primary/30 bg-primary/10 text-primary',
    kicker: 'text-primary',
    value: 'text-on-surface',
  },
  success: {
    panel: 'border-l-success/60',
    icon: 'border-success/30 bg-success/10 text-success',
    kicker: 'text-success',
    value: 'text-success',
  },
  warning: {
    panel: 'border-l-accent/60',
    icon: 'border-accent/30 bg-accent/10 text-accent',
    kicker: 'text-accent',
    value: 'text-accent',
  },
  error: {
    panel: 'border-l-error/60',
    icon: 'border-error/30 bg-error/10 text-error',
    kicker: 'text-error',
    value: 'text-error',
  },
} as const;

export function TradeoffCard({ metrics }: { metrics: DesignMetrics }) {
  const insight = getDesignInsight(metrics);
  const style = INSIGHT_STYLE[insight.tone];

  return (
    <article className={cx('panel overflow-hidden rounded-md border-l-2 p-4', style.panel)}>
      <div className="flex items-start gap-3">
        <span
          className={cx(
            'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border',
            style.icon,
          )}
        >
          <Lightbulb className="h-4 w-4" aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={cx('font-mono text-mono-xs uppercase tracking-[0.16em]', style.kicker)}>
                {insight.kicker}
              </span>
              <span className="h-1 w-1 rounded-full bg-outline" aria-hidden="true" />
              <span className="font-mono text-mono-xs uppercase tracking-[0.16em] text-on-surface-variant">
                Insight educativo
              </span>
            </div>
            <DesignStatusPill status={metrics.status} compact />
          </div>

          <h2 className="mt-1.5 font-headline text-title-md text-on-surface">{insight.title}</h2>
          <p className="mt-1 font-body text-body-md text-on-surface-variant text-pretty">
            {insight.body}
          </p>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded border border-outline-variant bg-surface-container/60 px-2 py-1.5">
              <p className="font-mono text-mono-xs uppercase tracking-[0.1em] text-on-surface-variant">
                Masa libre
              </p>
              <p className={cx('mt-0.5 font-mono text-mono-sm tabular-nums', style.value)}>
                {formatKg(metrics.massMarginKg)}
              </p>
            </div>
            <div className="rounded border border-outline-variant bg-surface-container/60 px-2 py-1.5">
              <p className="font-mono text-mono-xs uppercase tracking-[0.1em] text-on-surface-variant">
                Reserva
              </p>
              <p className={cx('mt-0.5 font-mono text-mono-sm tabular-nums', style.value)}>
                {formatMillions(metrics.budgetRemaining)}
              </p>
            </div>
            <div className="rounded border border-outline-variant bg-surface-container/60 px-2 py-1.5">
              <p className="font-mono text-mono-xs uppercase tracking-[0.1em] text-on-surface-variant">
                Ciencia
              </p>
              <p className={cx('mt-0.5 font-mono text-mono-sm tabular-nums', style.value)}>
                {formatNumber(metrics.projectedSciencePoints)} /{' '}
                {formatNumber(metrics.targetSciencePoints)}
              </p>
            </div>
          </div>

          <div className="mt-3 flex items-start gap-2 rounded border border-outline-variant bg-surface-container/50 p-2.5">
            <Library className="mt-0.5 h-3.5 w-3.5 shrink-0 text-on-surface-variant" aria-hidden="true" />
            <div className="min-w-0">
              <p className="font-label text-label-sm text-on-surface">
                Referencia NASA · {DEMO_MISSION.realNasaReference.missionName}
              </p>
              <p className="mt-0.5 font-body text-body-md text-on-surface-variant">
                {DEMO_MISSION.realNasaReference.engineeringLesson}
              </p>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
