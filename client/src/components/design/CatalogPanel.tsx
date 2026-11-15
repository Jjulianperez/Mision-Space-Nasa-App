import { Activity, Users } from 'lucide-react';
import {
  DEMO_MODULES,
  ROLE_META,
  SCIENCE_SLOTS,
  type CatalogTab,
} from '../../data/demoCatalog';
import { getRoleStatus, type DesignMetrics } from '../../lib/designCalculations';
import { useDesignStore } from '../../store/useDesignStore';
import { BudgetPanel } from './BudgetPanel';
import { ModuleCard } from './ModuleCard';
import { OrbitPanel } from './OrbitPanel';
import {
  ROLE_BANNER_CLASS,
  ROLE_GLYPHS,
  ROLE_ICON_BOX_CLASS,
  ROLE_TEXT_CLASS,
  TAB_ACTIVE_CLASS,
  TAB_GLYPH_CLASS,
  TAB_META,
} from './roleUi';
import { cx } from './ui';

const TABS: CatalogTab[] = ['ciencia', 'nave', 'orbita'];

function RoleBanner({ metrics }: { metrics: DesignMetrics }) {
  const activeRole = useDesignStore((state) => state.activeRole);
  const role = ROLE_META[activeRole];
  const Icon = ROLE_GLYPHS[activeRole];
  const status = getRoleStatus(activeRole, metrics);
  const isReady = status === 'LISTO';

  return (
    <div className={cx('rounded-md border p-3', ROLE_BANNER_CLASS[activeRole])}>
      <div className="flex items-start gap-2.5">
        <span
          className={cx(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-md border',
            ROLE_ICON_BOX_CLASS[activeRole],
          )}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <p className="font-mono text-mono-xs uppercase tracking-[0.16em] text-on-surface-variant">
              Puesto activo
            </p>
            <span
              className={cx(
                'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 font-label text-label-sm',
                isReady
                  ? 'border-success/40 bg-success/10 text-success'
                  : 'border-accent/40 bg-accent/10 text-accent',
              )}
            >
              <span
                className={cx('h-1.5 w-1.5 rounded-full', isReady ? 'bg-success' : 'bg-accent')}
                aria-hidden="true"
              />
              {isReady ? 'Listo' : 'En revisión'}
            </span>
          </div>

          <h2 className={cx('font-headline text-title-md', ROLE_TEXT_CLASS[activeRole])}>
            {role.owner}
          </h2>
          <p className="mt-0.5 font-body text-body-md text-on-surface-variant">{role.responsibility}</p>
        </div>
      </div>
    </div>
  );
}

function ScienceSlotPips({ used }: { used: number }) {
  return (
    <span className="flex items-center gap-1" aria-label={`${used} de ${SCIENCE_SLOTS} ranuras científicas`}>
      {Array.from({ length: SCIENCE_SLOTS }, (_, index) => (
        <span
          key={index}
          className={cx(
            'h-1.5 w-4 rounded-full transition-colors',
            index < used ? 'bg-secondary' : 'bg-surface-container-high',
          )}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

export function CatalogPanel({ metrics }: { metrics: DesignMetrics }) {
  const activeRole = useDesignStore((state) => state.activeRole);
  const activeTab = useDesignStore((state) => state.activeTab);
  const selectedModuleIds = useDesignStore((state) => state.selectedModuleIds);
  const setRole = useDesignStore((state) => state.setRole);
  const setTab = useDesignStore((state) => state.setTab);
  const toggleModule = useDesignStore((state) => state.toggleModule);

  const scienceModules = DEMO_MODULES.filter((module) => module.category === 'SCI');
  const comModules = DEMO_MODULES.filter((module) => module.category === 'COM');
  const estModules = DEMO_MODULES.filter((module) => module.category === 'EST');
  const scienceCount = metrics.selectedModules.filter((module) => module.category === 'SCI').length;

  return (
    <aside className="panel flex min-h-0 flex-col overflow-hidden xl:h-full">
      <div className="flex flex-col gap-2.5 border-b border-outline-variant p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="font-mono text-mono-xs uppercase tracking-[0.18em] text-on-surface-variant">
            Mesa de diseño
          </p>
          <span className="inline-flex items-center gap-1 font-mono text-mono-xs text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success pulse-soft" aria-hidden="true" />
            4/4 en línea
          </span>
        </div>

        <RoleBanner metrics={metrics} />

        {activeRole === 'RECURSOS' ? (
          <div className="flex items-center justify-between gap-2 rounded border border-outline-variant bg-surface-container px-2.5 py-2">
            <div>
              <p className="font-title text-label-sm text-on-surface">Auditoría de presupuesto</p>
              <p className="font-body text-mono-xs text-on-surface-variant">
                Libera módulos y protege la reserva de la misión.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRole('NAVE')}
              className="rounded border border-outline px-2 py-1 font-label text-label-sm text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
            >
              Volver
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-1 rounded-md border border-outline-variant bg-surface-container/70 p-1">
              {TABS.map((tab) => {
                const meta = TAB_META[tab];
                const Icon = meta.glyph;
                const active = activeTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setTab(tab)}
                    aria-selected={active}
                    role="tab"
                    title={`${meta.hint} · asume el rol ${ROLE_META[meta.role].label}`}
                    className={cx(
                      'flex items-center justify-center gap-1.5 rounded border px-1.5 py-1.5 font-label text-label-sm transition-all duration-200 ease-state-change focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                      active
                        ? TAB_ACTIVE_CLASS[tab]
                        : 'border-transparent text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface',
                    )}
                  >
                    <Icon
                      className={cx('h-3.5 w-3.5', active ? TAB_GLYPH_CLASS[tab] : 'text-on-surface-variant')}
                      aria-hidden="true"
                    />
                    {meta.label}
                  </button>
                );
              })}
            </div>
            <p className="flex items-center gap-1.5 font-mono text-mono-xs text-on-surface-variant/80">
              <Users className="h-3 w-3" aria-hidden="true" />
              Cada pestaña asume el rol que la gobierna.
            </p>
          </>
        )}
      </div>

      <div className="min-h-0 flex-1 p-3 xl:overflow-y-auto">
        {activeRole === 'CIENCIA' ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="font-title text-title-md text-on-surface">Instrumentos científicos</h2>
                <p className="font-body text-body-md text-on-surface-variant">
                  Añade carga útil dentro de las {SCIENCE_SLOTS} ranuras disponibles.
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="font-mono text-mono-xs text-on-surface-variant">
                  {scienceCount} / {SCIENCE_SLOTS} ranuras
                </span>
                <ScienceSlotPips used={scienceCount} />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {scienceModules.map((module) => (
                <ModuleCard
                  key={module.id}
                  module={module}
                  selected={selectedModuleIds.includes(module.id)}
                  onToggle={() => toggleModule(module.id)}
                />
              ))}
            </div>
          </div>
        ) : null}

        {activeRole === 'NAVE' ? (
          <div className="flex flex-col gap-4">
            <section className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="font-title text-title-md text-on-surface">Energía y comunicaciones</h2>
                  <p className="font-body text-body-md text-on-surface-variant">
                    Genera potencia y abre la autopista de datos.
                  </p>
                </div>
                <span className="font-mono text-mono-xs text-on-surface-variant">
                  {comModules.filter((module) => selectedModuleIds.includes(module.id)).length} /{' '}
                  {comModules.length}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {comModules.map((module) => (
                  <ModuleCard
                    key={module.id}
                    module={module}
                    selected={selectedModuleIds.includes(module.id)}
                    onToggle={() => toggleModule(module.id)}
                  />
                ))}
              </div>
            </section>

            <div className="h-px bg-outline-variant" />

            <section className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="font-title text-title-md text-on-surface">Plataforma</h2>
                  <p className="font-body text-body-md text-on-surface-variant">
                    Compran margen de vida, estabilidad y control orbital.
                  </p>
                </div>
                <span className="font-mono text-mono-xs text-on-surface-variant">
                  {estModules.filter((module) => selectedModuleIds.includes(module.id)).length} /{' '}
                  {estModules.length}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {estModules.map((module) => (
                  <ModuleCard
                    key={module.id}
                    module={module}
                    selected={selectedModuleIds.includes(module.id)}
                    onToggle={() => toggleModule(module.id)}
                  />
                ))}
              </div>
            </section>
          </div>
        ) : null}

        {activeRole === 'ORBITA' ? <OrbitPanel metrics={metrics} /> : null}

        {activeRole === 'RECURSOS' ? <BudgetPanel metrics={metrics} /> : null}
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-outline-variant px-3 py-2">
        <span className="inline-flex items-center gap-1.5 font-mono text-mono-xs uppercase tracking-[0.12em] text-on-surface-variant">
          <Activity className="h-3 w-3 text-primary" aria-hidden="true" />
          Recalculando en vivo
        </span>
        <span className="font-mono text-mono-xs text-on-surface-variant">
          {metrics.selectedModules.length} módulos
        </span>
      </div>
    </aside>
  );
}
