import { Orbit, Rocket } from 'lucide-react';
import type { DemoModule, LauncherOption, OrbitOption } from '../../data/demoCatalog';
import {
  CATEGORY_BG_CLASS,
  CATEGORY_BORDER_CLASS,
  CATEGORY_DOT_CLASS,
  CATEGORY_TEXT_CLASS,
} from './roleUi';
import { cx } from './ui';

export function ActiveComponents({
  modules,
  orbit,
  launcher,
}: {
  modules: DemoModule[];
  orbit: OrbitOption;
  launcher: LauncherOption;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <span className="font-mono text-mono-xs uppercase tracking-[0.16em] text-on-surface-variant">
          Componentes activos
        </span>
        <span className="font-mono text-mono-xs text-on-surface-variant">
          {modules.length} módulos · {orbit.shortName} · {launcher.name}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {modules.map((module) => (
          <span
            key={module.id}
            className={cx(
              'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-label text-label-sm',
              CATEGORY_BORDER_CLASS[module.category],
              CATEGORY_BG_CLASS[module.category],
              CATEGORY_TEXT_CLASS[module.category],
            )}
            title={`${module.name} · ${module.tagline}`}
          >
            <span
              className={cx('h-1.5 w-1.5 rounded-full', CATEGORY_DOT_CLASS[module.category])}
              aria-hidden="true"
            />
            {module.name}
          </span>
        ))}

        <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 font-label text-label-sm text-accent">
          <Orbit className="h-3 w-3" aria-hidden="true" />
          {orbit.shortName}
        </span>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 font-label text-label-sm text-primary">
          <Rocket className="h-3 w-3" aria-hidden="true" />
          {launcher.name}
        </span>
      </div>
    </div>
  );
}
