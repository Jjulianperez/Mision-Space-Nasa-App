import { Coins, Sparkles, X } from 'lucide-react';
import type { DesignMetrics } from '../../lib/designCalculations';
import {
  formatKg,
  formatMillions,
  formatNumber,
  formatPercent,
} from '../../lib/format';
import { useDesignStore } from '../../store/useDesignStore';
import {
  CATEGORY_DOT_CLASS,
  MODULE_GLYPHS,
  MODULE_ICON_BOX_CLASS,
  ROLE_TEXT_CLASS,
} from './roleUi';
import { MeterBar, cx } from './ui';

function BreakdownRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={cx('font-body text-body-md', strong ? 'text-on-surface' : 'text-on-surface-variant')}>
        {label}
      </span>
      <span
        className={cx(
          'font-mono text-mono-sm tabular-nums',
          strong ? 'text-on-surface' : 'text-on-surface-variant',
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function BudgetPanel({ metrics }: { metrics: DesignMetrics }) {
  const toggleModule = useDesignStore((state) => state.toggleModule);
  const requestProposal = useDesignStore((state) => state.requestProposal);
  const proposal = useDesignStore((state) => state.proposal);

  const budgetTone =
    metrics.budgetRemaining < 0
      ? 'error'
      : metrics.budgetPercentage >= 95
        ? 'warning'
        : 'success';

  return (
    <div className="flex flex-col gap-4">
      <section className="relative overflow-hidden rounded-md border border-success/30 bg-success/5 p-3.5">
        <div className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-success/10 blur-2xl" />
        <div className="relative flex items-start justify-between gap-2">
          <div>
            <p className="font-mono text-mono-xs uppercase tracking-[0.16em] text-success/80">
              Presupuesto disponible
            </p>
            <p
              className={cx(
                'mt-1 font-mono text-headline-md tabular-nums',
                metrics.budgetRemaining < 0 ? 'text-error' : 'text-success',
              )}
            >
              {formatMillions(metrics.budgetRemaining)}
            </p>
            <p className="font-body text-body-md text-on-surface-variant">
              de {formatMillions(metrics.budgetTotal)} asignados a la misión
            </p>
          </div>
          <span className="flex h-9 w-9 items-center justify-center rounded-md border border-success/30 bg-success/10 text-success">
            <Coins className="h-4 w-4" aria-hidden="true" />
          </span>
        </div>

        <div className="relative mt-3">
          <div className="mb-1 flex items-center justify-between font-mono text-mono-xs text-on-surface-variant">
            <span>Comprometido {formatMillions(metrics.budgetSpent)}</span>
            <span>{formatPercent(metrics.budgetPercentage)}</span>
          </div>
          <MeterBar
            percent={metrics.budgetPercentage}
            tone={budgetTone}
            label="Presupuesto comprometido"
          />
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2">
        <div className="rounded-md border border-outline-variant bg-surface-container p-2.5">
          <p className="font-label text-label-sm text-on-surface-variant">Módulos activos</p>
          <p className="mt-0.5 font-mono text-mono-md tabular-nums text-on-surface">
            {metrics.selectedModules.length}
          </p>
        </div>
        <div className="rounded-md border border-outline-variant bg-surface-container p-2.5">
          <p className="font-label text-label-sm text-on-surface-variant">Ciencia</p>
          <p className="mt-0.5 font-mono text-mono-md tabular-nums text-accent">
            {formatNumber(metrics.projectedSciencePoints)} pts
          </p>
        </div>
        <div className="rounded-md border border-outline-variant bg-surface-container p-2.5">
          <p className="font-label text-label-sm text-on-surface-variant">Masa comprometida</p>
          <p className="mt-0.5 font-mono text-mono-md tabular-nums text-on-surface">
            {formatKg(metrics.totalMassKg)}
          </p>
        </div>
        <div className="rounded-md border border-outline-variant bg-surface-container p-2.5">
          <p className="font-label text-label-sm text-on-surface-variant">Coste por punto</p>
          <p className="mt-0.5 font-mono text-mono-md tabular-nums text-on-surface">
            {formatNumber(metrics.scienceEfficiency, 2)} M$/pt
          </p>
        </div>
      </section>

      <section className="rounded-md border border-outline-variant bg-surface-container p-3">
        <h3 className="mb-2 font-title text-label-lg text-on-surface">Desglose de costes</h3>
        <div className="flex flex-col gap-1.5">
          <BreakdownRow label="Plataforma base" value={formatMillions(metrics.baseCostMillions)} />
          <BreakdownRow
            label={`Lanzador · ${metrics.launcher.name}`}
            value={formatMillions(metrics.launcherCostMillions)}
          />
          <BreakdownRow
            label={`Módulos · ${metrics.selectedModules.length}`}
            value={formatMillions(metrics.moduleCostMillions)}
          />
          <div className="my-1 h-px bg-outline-variant" />
          <BreakdownRow label="Total comprometido" value={formatMillions(metrics.budgetSpent)} strong />
          <BreakdownRow
            label="Reserva restante"
            value={formatMillions(metrics.budgetRemaining)}
            strong
          />
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-title text-label-lg text-on-surface">Módulos liberables</h3>
          <span className="font-mono text-mono-xs text-on-surface-variant">
            {metrics.selectedModules.length} instalados
          </span>
        </div>

        {metrics.selectedModules.length ? (
          <div className="flex flex-col gap-1.5">
            {metrics.selectedModules.map((module) => {
              const Icon = MODULE_GLYPHS[module.glyph];
              return (
                <div
                  key={module.id}
                  className="flex items-center gap-2 rounded border border-outline-variant bg-surface-container px-2 py-1.5"
                >
                  <span
                    className={cx(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded border',
                      MODULE_ICON_BOX_CLASS[module.category],
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-label text-label-sm text-on-surface">{module.name}</p>
                    <p className="font-mono text-mono-xs text-on-surface-variant">
                      {formatMillions(module.costMillions)} · {formatKg(module.massKg)}
                    </p>
                  </div>
                  <span
                    className={cx('h-1.5 w-1.5 shrink-0 rounded-full', CATEGORY_DOT_CLASS[module.category])}
                    aria-hidden="true"
                  />
                  <button
                    type="button"
                    onClick={() => toggleModule(module.id)}
                    className="rounded p-1 text-on-surface-variant transition-colors hover:bg-error/10 hover:text-error focus-visible:outline focus-visible:outline-2 focus-visible:outline-error"
                    title={`Liberar ${module.name}`}
                    aria-label={`Liberar ${module.name}`}
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="rounded border border-dashed border-outline-variant bg-surface-container/50 p-3 text-center font-body text-body-md text-on-surface-variant">
            No hay módulos instalados. El diseño sólo conserva la plataforma base.
          </p>
        )}
      </section>

      <button
        type="button"
        onClick={requestProposal}
        disabled={Boolean(proposal)}
        className={cx(
          'inline-flex w-full items-center justify-center gap-2 rounded-md border px-3 py-2 font-label text-label-lg transition-colors',
          proposal
            ? 'cursor-not-allowed border-outline-variant bg-surface-container text-on-surface-variant/60'
            : 'border-success/40 bg-success/10 text-success hover:bg-success/20',
        )}
      >
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        {proposal ? 'Propuesta abierta en la mesa' : 'Solicitar propuesta de ahorro'}
      </button>

      <p className="font-body text-body-md text-on-surface-variant">
        Liberar un módulo devuelve su coste y su masa, pero puede reducir la ciencia o el enlace.
        Cada decisión queda registrada en la mesa de negociación.
      </p>

      <p className={cx('font-mono text-mono-xs uppercase tracking-[0.14em]', ROLE_TEXT_CLASS.RECURSOS)}>
        Modo auditoría · Director de Recursos
      </p>
    </div>
  );
}
