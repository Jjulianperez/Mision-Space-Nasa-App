import { useMemo, useState } from 'react';
import { ChartNoAxesColumn, CircleCheck, CircleX, FlaskConical, Handshake, MessageSquare, Orbit, Rocket, Satellite, TriangleExclamationPoint, Wrench, X } from 'lucide-react';
import { useDesignStore } from '../../store/useDesignStore';
import { DEMO_MISSION, MODULES_BY_ID, TEAM_ROLES, getLauncher, getOrbit, type DemoModule } from '../../data/demoCatalog';
import { computeDesignMetrics, getRoleStatus } from '../../lib/designCalculations';
import { formatNumber } from '../../lib/format';
import { ActiveComponents } from './ActiveComponents';
import { CatalogPanel } from './CatalogPanel';
import { SpacecraftBlueprint } from './SpacecraftBlueprint';
import { TeamRolesPanel } from './TeamRolesPanel';
import { TradeoffCard } from './TradeoffCard';
import { TelemetryPanel } from './TelemetryPanel';
import { NegotiationCard } from './NegotiationCard';
import { CompatibilityBadge, DesignStatusPill, ToastStack, cx } from './ui';

export function DesignScreen() {
  const selectedModuleIds = useDesignStore((state) => state.selectedModuleIds);
  const orbitId = useDesignStore((state) => state.orbitId);
  const launcherId = useDesignStore((state) => state.launcherId);
  const launchModalOpen = useDesignStore((state) => state.launchModalOpen);
  const openLaunchModal = useDesignStore((state) => state.openLaunchModal);
  const closeLaunchModal = useDesignStore((state) => state.closeLaunchModal);
  const confirmLaunch = useDesignStore((state) => state.confirmLaunch);
  const resetDesign = useDesignStore((state) => state.resetDesign);
  const notify = useDesignStore((state) => state.notify);

  const [view, setView] = useState<'diseno' | 'colaboracion' | 'negociacion'>('diseno');

  const metrics = useMemo(
    () => computeDesignMetrics(selectedModuleIds, orbitId, launcherId),
    [selectedModuleIds, orbitId, launcherId],
  );

  // Regla de lanzamiento: solo se bloquea con presupuesto < 0 o masa > 100% del lanzador.
  const hardBlocked = metrics.budgetRemaining < 0 || metrics.totalMassKg > metrics.massLimitKg;

  const modules = useMemo<DemoModule[]>(
    () =>
      selectedModuleIds
        .map((id) => MODULES_BY_ID[id])
        .filter((module): module is DemoModule => Boolean(module)),
    [selectedModuleIds],
  );

  return (
    <section className="min-h-screen bg-surface font-body">
      {/* =====================
          TOP MISSION & TEAM HEADER
       ===================== */}
      <header className="border-b border-outline-variant bg-surface-container-low px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Satellite className="h-6 w-6 text-primary" aria-hidden="true" />
          <span className="font-headline text-title-md text-on-surface" data-design-text-token="title-md">OrbitaLab</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-label text-label-sm text-on-surface-variant" data-design-text-token="label-sm">Objetivo:</span>
          <span className="font-label text-label-lg text-on-surface" data-design-text-token="label-lg">
            {DEMO_MISSION.title}
          </span>
          <CompatibilityBadge status={metrics.orbit.compatibility} />
        </div>

        <div className="flex items-center gap-3">
          {/* 4-Role Team Collaboration Strip */}
          <div className="flex items-center gap-1.5 bg-surface-container px-3 py-1.5 rounded border border-outline-variant">
            <span className="font-label text-label-sm text-on-surface-variant mr-1.5" data-design-text-token="label-sm">Equipo (4):</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-sm bg-surface-container-high text-primary font-label text-label-sm border border-primary">
              <Wrench className="h-4 w-4" aria-hidden="true" />
              <span data-design-text-token="label-sm">Nave</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-sm text-on-surface font-label text-label-sm">
              <FlaskConical className="h-4 w-4 text-secondary" aria-hidden="true" />
              <span data-design-text-token="label-sm">Ciencia</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-sm text-on-surface font-label text-label-sm">
              <Orbit className="h-4 w-4 text-accent" aria-hidden="true" />
              <span data-design-text-token="label-sm">Órbita</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-sm text-on-surface font-label text-label-sm">
              <ChartNoAxesColumn className="h-4 w-4 text-success" aria-hidden="true" />
              <span data-design-text-token="label-sm">Recursos</span>
            </span>
          </div>

          {/* Simulate launch button */}
          <button
            type="button"
            onClick={openLaunchModal}
            disabled={launchModalOpen}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded bg-primary text-on-primary font-label text-label-lg transition-colors duration-state-change ease-state-change hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            aria-label="Simular lanzamiento"
          >
            <Rocket className="h-5 w-5" aria-hidden="true" />
            <span data-design-text-token="label-lg">Simular lanzamiento</span>
          </button>
        </div>
      </header>

      {/* VIEW TABS: Diseño / Colaboración / Negociación */}
      <div className="border-b border-outline-variant bg-surface-container-low px-4 py-2">
        <div className="inline-flex items-center gap-1 rounded-md border border-outline-variant bg-surface-container p-1">
          <button
            type="button"
            onClick={() => setView('diseno')}
            aria-pressed={view === 'diseno'}
            className={cx(
              'inline-flex items-center gap-1.5 rounded border px-3 py-1.5 font-label text-label-sm transition-all duration-200 ease-state-change focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
              view === 'diseno'
                ? 'border-primary/50 bg-primary/10 text-primary'
                : 'border-transparent text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface',
            )}
          >
            <Rocket className="h-3.5 w-3.5" aria-hidden="true" />
            Diseño
          </button>
          <button
            type="button"
            onClick={() => setView('colaboracion')}
            aria-pressed={view === 'colaboracion'}
            className={cx(
              'inline-flex items-center gap-1.5 rounded border px-3 py-1.5 font-label text-label-sm transition-all duration-200 ease-state-change focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
              view === 'colaboracion'
                ? 'border-secondary/50 bg-secondary/10 text-secondary'
                : 'border-transparent text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface',
            )}
          >
            <Handshake className="h-3.5 w-3.5" aria-hidden="true" />
            Colaboración
          </button>
          <button
            type="button"
            onClick={() => setView('negociacion')}
            aria-pressed={view === 'negociacion'}
            className={cx(
              'inline-flex items-center gap-1.5 rounded border px-3 py-1.5 font-label text-label-sm transition-all duration-200 ease-state-change focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
              view === 'negociacion'
                ? 'border-accent/50 bg-accent/10 text-accent'
                : 'border-transparent text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface',
            )}
          >
            <MessageSquare className="h-3.5 w-3.5" aria-hidden="true" />
            Negociación
          </button>
        </div>
      </div>

      {/* =====================
          MAIN WORKSPACE (Diseño | Colaboración)
       ===================== */}
      <main className="flex-1 grid grid-cols-12 gap-5 p-5">
        {view === 'diseno' ? (
          <div className="contents">
        {/* LEFT COLUMN: Tabs + Catalog */}
        <aside className="col-span-3 bg-surface-container-low border border-outline-variant rounded-md p-3 flex flex-col gap-3 xl:col-span-3">
          <CatalogPanel metrics={metrics} />
        </aside>

        {/* CENTER COLUMN: Spacecraft Blueprint + Active Components + Trade-off */}
        <section className="col-span-6 flex flex-col gap-3">
          <div className="flex flex-col gap-3">
            <SpacecraftBlueprint modules={modules} metrics={metrics} />
            <ActiveComponents modules={modules} orbit={getOrbit(orbitId)} launcher={getLauncher(launcherId)} />
            <TradeoffCard metrics={metrics} />
          </div>
        </section>

        {/* RIGHT COLUMN: Live Telemetry */}
        <aside className="col-span-3 bg-surface-container-low border border-outline-variant rounded-md p-3 flex flex-col gap-3 xl:col-span-3">
          <TelemetryPanel metrics={metrics} />
        </aside>
          </div>
        ) : view === 'colaboracion' ? (
          <div className="contents">
            {/* COLLABORATION WORKSPACE: Team Roles (full width) */}
            <div className="col-span-12 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-headline text-title-md text-on-surface">Roles del Equipo de Misión</h2>
                  <p className="font-body text-body-md text-on-surface-variant">
                    Cada participante gestiona un área crítica y valida los compromisos antes del lanzamiento.
                  </p>
                </div>
                <span className="font-mono text-mono-sm text-success tabular-nums">
                  {TEAM_ROLES.filter((role) => getRoleStatus(role, metrics) === 'LISTO').length} / {TEAM_ROLES.length} Listos
                </span>
              </div>
              <TeamRolesPanel metrics={metrics} />
            </div>
          </div>
        ) : (
          <div className="contents">
            {/* NEGOTIATION WORKSPACE: debate / voting panel */}
            <div className="col-span-12 flex flex-col items-center gap-3">
              <div className="w-full max-w-3xl">
                <NegotiationCard />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* =====================
          LAUNCH MODAL (bottom sheet)
       ===================== */}
      {launchModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-low rounded-2xl p-6 max-w-sm w-full mx-4 shadow-console max-h-[85vh] overflow-y-auto">
            <h2 className="font-headline text-title-lg text-on-surface mb-3">Revisión pre-lanzamiento</h2>
            <p className="font-body text-body-md text-on-surface-variant mb-4">
              Se validarán los bloqueos duros antes de simular el vuelo.
            </p>

            {/* Estado global del diseño */}
            <div className="mb-4 flex items-center justify-between gap-2 rounded-md border border-outline-variant bg-surface-container px-2.5 py-2">
              <DesignStatusPill status={metrics.status} compact />
              <span className="font-mono text-mono-xs text-on-surface-variant text-right">
                {metrics.warnings.length} alerta(s) activas · lanzamiento permitido bajo riesgo
              </span>
            </div>

            {/* Bloqueo duro: solo presupuesto < 0 o masa > 100% */}
            {hardBlocked ? (
              <div className="mb-4 rounded border border-error/30 bg-error/10 px-3 py-2.5" role="alert">
                <div className="flex items-start gap-2">
                  <CircleX className="mt-0.5 h-4 w-4 shrink-0 text-error" aria-hidden="true" />
                  <div>
                    <p className="font-label text-label-sm text-error">Bloqueo duro de lanzamiento</p>
                    <p className="mt-0.5 font-body text-body-md text-on-surface-variant">
                      El diseño supera el presupuesto o la masa máxima del lanzador. Corrige los recursos antes de confirmar.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Alertas activas (no bloquean por sí solas salvo el bloqueo duro) */}
            {metrics.warnings.length > 0 ? (
              <div className="mb-4 rounded border border-accent/30 bg-accent/5 px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-label text-label-sm text-accent">Alertas activas del diseño</p>
                  <span className="font-mono text-mono-xs text-on-surface-variant">
                    {metrics.warnings.length}
                  </span>
                </div>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {metrics.warnings.slice(0, 4).map((warning) => (
                    <li key={warning.id} className="rounded border border-outline-variant bg-surface-container/60 px-2 py-1.5">
                      <p className="font-label text-label-sm text-on-surface">{warning.title}</p>
                      <p className="mt-0.5 font-body text-body-md text-on-surface-variant">{warning.detail}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="mb-4 rounded border border-success/30 bg-success/5 px-3 py-2.5">
                <div className="flex items-start gap-2">
                  <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                  <div>
                    <p className="font-label text-label-sm text-success">Sin alertas activas</p>
                    <p className="mt-0.5 font-body text-body-md text-on-surface-variant">
                      El diseño está dentro de los límites operativos para el lanzamiento.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {metrics.warnings.length > 0 && !hardBlocked ? (
              <div className="mb-4 flex items-start gap-2 rounded border border-outline-variant bg-surface-container/60 px-3 py-2.5">
                <TriangleExclamationPoint className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                <p className="font-body text-body-md text-on-surface-variant">
                  El diseño presenta alertas de margen (masa, energía, datos o ciencia). El lanzamiento
                  no está bloqueado por protocolo, pero el equipo debe gestionar el riesgo antes de volar.
                </p>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded border border-success/30 bg-success/10 p-2.5">
                <p className="font-mono text-mono-xs uppercase tracking-[0.1em] text-success">Masa</p>
                <p className="font-mono text-headline-md tabular-nums text-on-surface">
                  {metrics.totalMassKg} / {metrics.massLimitKg} kg
                </p>
              </div>
              <div className="rounded border border-error/30 bg-error/10 p-2.5">
                <p className="font-mono text-mono-xs uppercase tracking-[0.1em] text-error">Presupuesto</p>
                <p className="font-mono text-headline-md tabular-nums text-on-surface">
                  {formatNumber(metrics.budgetSpent)} / {formatNumber(metrics.budgetTotal)} M$
                </p>
              </div>
            </div>
            <div className="mb-4 rounded border border-outline-variant bg-surface-container/60 px-3 py-2">
              <p className="font-mono text-mono-xs uppercase tracking-[0.1em] text-on-surface-variant">
                Bloqueos duros
              </p>
              <p className="mt-1 font-mono text-mono-sm tabular-nums text-on-surface">
                {metrics.budgetRemaining < 0
                  ? `Presupuesto agotado (${formatNumber(Math.abs(metrics.budgetRemaining))} M$ de déficit)`
                  : metrics.totalMassKg > metrics.massLimitKg
                    ? `Masa sobre capacidad (${Math.round(metrics.totalMassKg)} kg vs ${metrics.massLimitKg} kg)`
                    : 'Ninguno — la misión puede proceder a la simulación.'}
              </p>
            </div>
            <div>
              <button
                type="button"
                onClick={confirmLaunch}
                disabled={hardBlocked}
                className={cx(
                  'w-full inline-flex items-center justify-center gap-2 rounded px-4 py-2 font-label text-label-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                  hardBlocked
                    ? 'cursor-not-allowed bg-surface-container-high text-on-surface-variant'
                    : 'bg-primary text-on-primary hover:opacity-90',
                )}
              >
                <Rocket className="h-5 w-5" aria-hidden="true" />
                Confirmar y simular
              </button>
              <button
                type="button"
                onClick={closeLaunchModal}
                className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded border border-outline px-4 py-2 font-label text-label-lg transition-colors hover:bg-surface-container-high focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <X className="h-5 w-5" aria-hidden="true" />
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================
          TOASTS (alertas operativas)
       ===================== */}
      <ToastStack />
    </section>
  );
}
