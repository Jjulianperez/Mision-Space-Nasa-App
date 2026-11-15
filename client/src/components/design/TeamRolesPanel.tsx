import { Check } from 'lucide-react';
import {
  ROLE_META,
  TEAM_ROLES,
  type DesignMetrics,
  type TeamRole,
} from '../../data/demoCatalog';
import { getRoleStatus } from '../../lib/designCalculations';
import { formatKg, formatMillions, formatNumber } from '../../lib/format';
import { useDesignStore } from '../../store/useDesignStore';
import { ROLE_GLYPHS, ROLE_ICON_BOX_CLASS, ROLE_TEXT_CLASS } from './roleUi';
import { cx } from './ui';

const STATUS_READY_LABEL = 'Listo';
const STATUS_REVIEW_LABEL = 'En revisión';

function RoleCardContent({ role, metrics }: { role: TeamRole; metrics: DesignMetrics }) {
  const meta = ROLE_META[role];
  const Icon = ROLE_GLYPHS[role];
  const status = getRoleStatus(role, metrics);
  const ready = status === 'LISTO';
  const statusClass = ready
    ? 'border-success/40 bg-success/10 text-success'
    : 'border-accent/40 bg-accent/10 text-accent';
  const statusDotClass = ready ? 'bg-success' : 'bg-accent';

  const detail =
    role === 'CIENCIA'
      ? `${formatNumber(metrics.projectedSciencePoints)} pts · ${metrics.scienceSlotsUsed} ranuras`
      : role === 'NAVE'
        ? `${formatKg(metrics.totalMassKg)} / ${formatKg(metrics.massLimitKg)}`
        : role === 'ORBITA'
          ? `${formatKg(metrics.massLimitKg)} capacidad · ${metrics.orbit.shortName}`
          : `${formatMillions(metrics.budgetSpent)} / ${formatMillions(metrics.budgetTotal)}`;

  return (
    <div className="flex flex-col gap-3">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className={cx(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-md border',
              ROLE_ICON_BOX_CLASS[role],
            )}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className={cx('font-headline text-title-md truncate', ROLE_TEXT_CLASS[role])}>
              {meta.owner}
            </h3>
            <p className="font-label text-label-sm text-on-surface-variant">{meta.label}</p>
          </div>
        </div>
        <span
          className={cx(
            'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 font-label text-label-sm whitespace-nowrap',
            statusClass,
          )}
        >
          <span className={cx('h-1.5 w-1.5 rounded-full', statusDotClass)} aria-hidden="true" />
          {ready ? STATUS_READY_LABEL : STATUS_REVIEW_LABEL}
        </span>
      </header>

      <p className="font-body text-body-md text-on-surface-variant leading-relaxed">
        {meta.responsibility}
      </p>

      <div className="rounded-md border border-outline-variant bg-surface-container px-3 py-2.5 font-mono text-mono-md text-on-surface tabular-nums">
        {detail}
      </div>

      <div className="flex items-center gap-1.5 font-mono text-mono-xs text-on-surface-variant">
        <Check className="h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />
        {ready ? 'Validación previa completada' : 'Validación pendiente de consenso'}
      </div>
    </div>
  );
}

export function TeamRolesPanel({ metrics }: { metrics: DesignMetrics }) {
  const activeRole = useDesignStore((state) => state.activeRole);
  const setRole = useDesignStore((state) => state.setRole);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {TEAM_ROLES.map((role) => (
        <button
          key={role}
          type="button"
          onClick={() => setRole(role)}
          aria-pressed={activeRole === role}
          className={cx(
            'rounded-xl border p-5 text-left transition-all duration-200 ease-state-change focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
            activeRole === role
              ? 'border-primary/60 bg-primary/5'
              : 'border-outline-variant bg-surface-container-low hover:border-outline hover:bg-surface-container',
          )}
        >
          <RoleCardContent role={role} metrics={metrics} />
        </button>
      ))}
    </div>
  );
}
