import { CircleCheck, Plus } from 'lucide-react';
import type { DemoModule } from '../../data/demoCatalog';
import { formatKg, formatKw, formatMbps, formatMillions } from '../../lib/format';
import {
  CATEGORY_BG_CLASS,
  CATEGORY_BORDER_CLASS,
  CATEGORY_SHORT_LABEL,
  CATEGORY_TEXT_CLASS,
  MODULE_ACCENT_CLASS,
  MODULE_GLYPHS,
  MODULE_ICON_BOX_CLASS,
  MODULE_SELECTED_CLASS,
} from './roleUi';
import { cx } from './ui';

export function ModuleCard({
  module,
  selected,
  onToggle,
}: {
  module: DemoModule;
  selected: boolean;
  onToggle: () => void;
}) {
  const Icon = MODULE_GLYPHS[module.glyph];
  const primaryBadge =
    module.sciencePoints > 0
      ? {
          text: `+${module.sciencePoints} pts`,
          className: 'border-secondary/30 bg-secondary/10 text-secondary',
        }
      : module.dataDownlinkMbps > 0
        ? {
            text: `${formatMbps(module.dataDownlinkMbps)} ↓`,
            className: 'border-primary/30 bg-primary/10 text-primary',
          }
        : module.generationKw
          ? {
              text: `+${formatKw(module.generationKw)}`,
              className: 'border-success/30 bg-success/10 text-success',
            }
          : null;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      title={module.apprenticeTip}
      className={cx(
        'group relative w-full overflow-hidden rounded-md border p-3 text-left transition-all duration-200 ease-state-change focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        selected
          ? MODULE_SELECTED_CLASS[module.category]
          : 'border-outline-variant bg-surface-container-low hover:border-outline hover:bg-surface-container',
      )}
    >
      {selected ? (
        <span
          className={cx('absolute inset-y-0 left-0 w-0.5', MODULE_ACCENT_CLASS[module.category])}
          aria-hidden="true"
        />
      ) : null}

      <div className="flex items-start gap-2.5">
        <span
          className={cx(
            'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded border',
            MODULE_ICON_BOX_CLASS[module.category],
          )}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span
                  className={cx(
                    'rounded border px-1 py-0.5 font-mono text-mono-xs uppercase tracking-[0.08em]',
                    CATEGORY_BORDER_CLASS[module.category],
                    CATEGORY_BG_CLASS[module.category],
                    CATEGORY_TEXT_CLASS[module.category],
                  )}
                >
                  {CATEGORY_SHORT_LABEL[module.category]}
                </span>
                <span className="font-mono text-mono-xs text-on-surface-variant/70">{module.id}</span>
              </div>
              <h3 className="mt-1 truncate font-title text-label-lg font-semibold text-on-surface">
                {module.name}
              </h3>
            </div>

            <span
              className={cx(
                'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors',
                selected
                  ? cx('border-transparent', CATEGORY_TEXT_CLASS[module.category])
                  : 'border-outline text-on-surface-variant group-hover:border-primary/60 group-hover:text-primary',
              )}
              aria-hidden="true"
            >
              {selected ? <CircleCheck className="h-4 w-4" /> : <Plus className="h-3.5 w-3.5" />}
            </span>
          </div>

          <p className="mt-1 line-clamp-2 font-body text-body-md text-on-surface-variant">
            {module.tagline}
          </p>
        </div>
      </div>

      <div className="mt-2.5 flex items-end justify-between gap-2 border-t border-outline-variant/60 pt-2">
        <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 font-mono text-mono-xs text-on-surface-variant">
          <span>{formatKg(module.massKg)}</span>
          <span className="text-outline">·</span>
          <span>{formatMillions(module.costMillions)}</span>
          <span className="text-outline">·</span>
          <span>{module.generationKw ? `+${formatKw(module.generationKw)}` : formatKw(module.powerKw)}</span>
          {module.dataGenMbps > 0 ? (
            <>
              <span className="text-outline">·</span>
              <span>{formatMbps(module.dataGenMbps)} ↑</span>
            </>
          ) : null}
        </p>

        {primaryBadge ? (
          <span
            className={cx(
              'shrink-0 rounded-full border px-1.5 py-0.5 font-mono text-mono-xs',
              primaryBadge.className,
            )}
          >
            {primaryBadge.text}
          </span>
        ) : null}
      </div>
    </button>
  );
}
