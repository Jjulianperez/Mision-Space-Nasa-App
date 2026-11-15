import {
  CircleCheck,
  CircleX,
  Coins,
  Database,
  Info,
  Layers,
  Radio,
  RotateCcw,
  Timer,
  TriangleExclamationPoint,
  Weight,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { DesignMetrics, DesignWarning } from '../../lib/designCalculations';
import {
  formatKg,
  formatKw,
  formatMbps,
  formatMillions,
  formatPercent,
  formatSignedKw,
  formatYears,
} from '../../lib/format';
import { useDesignStore } from '../../store/useDesignStore';
import { DesignStatusPill, MeterBar, cx, toneTextClass, type Tone } from './ui';

const WARNING_STYLE = {
  critical: {
    box: 'border-error/30 bg-error/5',
    icon: CircleX,
    iconClass: 'text-error',
    label: 'Crítico',
  },
  warning: {
    box: 'border-accent/30 bg-accent/5',
    icon: TriangleExclamationPoint,
    iconClass: 'text-accent',
    label: 'Alerta',
  },
  info: {
    box: 'border-primary/30 bg-primary/5',
    icon: Info,
    iconClass: 'text-primary',
    label: 'Info',
  },
} as const;

const TONE_VALUE_CLASS: Record<Tone, string> = {
  primary: 'text-on-surface',
  secondary: 'text-secondary',
  accent: 'text-accent',
  success: 'text-success',
  warning: 'text-accent',
  error: 'text-error',
};

function ResourceRow({
  icon: Icon,
  label,
  value,
  percent,
  tone,
  detail,
  barLabel,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  percent: number;
  tone: Tone;
  detail: string;
  barLabel: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex min-w-0 items-center gap-1.5 font-label text-label-sm text-on-surface-variant">
          <Icon className={cx('h-3.5 w-3.5 shrink-0', toneTextClass(tone))} aria-hidden="true" />
          <span className="truncate">{label}</span>
        </span>
        <span className={cx('shrink-0 font-mono text-mono-sm tabular-nums', TONE_VALUE_CLASS[tone])}>
          {value}
        </span>
      </div>
      <MeterBar percent={percent} tone={tone} label={barLabel} className="mt-1.5" />
      <p className="mt-1 truncate font-mono text-mono-xs text-on-surface-variant">{detail}</p>
    </div>
  );
}

function WarningCard({ warning }: { warning: DesignWarning }) {
  const style = WARNING_STYLE[warning.severity];
  const Icon = style.icon;

  return (
    <div className={cx('rounded border px-2.5 py-2', style.box)}>
      <div className="flex items-start gap-2">
        <Icon className={cx('mt-0.5 h-3.5 w-3.5 shrink-0', style.iconClass)} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="font-label text-label-sm text-on-surface">{warning.title}</p>
            <span className={cx('shrink-0 font-mono text-mono-xs uppercase tracking-[0.08em]', style.iconClass)}>
              {style.label}
            </span>
          </div>
          <p className="mt-0.5 font-body text-body-md text-on-surface-variant">{warning.detail}</p>
        </div>
      </div>
    </div>
  );
}

export function TelemetryPanel({ metrics }: { metrics: DesignMetrics }) {
  const notify = useDesignStore((state) => state.notify);
  const resetDesign = useDesignStore((state) => state.resetDesign);
  const lastLaunchValidated = useDesignStore((state) => state.lastLaunchValidated);

  const massTone: Tone =
    metrics.massPercentage > 100 ? 'error' : metrics.massPercentage >= 90 ? 'warning' : 'primary';

  const powerTone: Tone =
    metrics.powerRatio > 100 ? 'error' : metrics.powerRatio >= 90 ? 'warning' : 'success';

  const budgetTone: Tone =
    metrics.budgetPercentage > 100 ? 'error' : metrics.budgetPercentage >= 95 ? 'warning' : 'success';

  const dataTone: Tone =
    metrics.totalDownlinkCapacity === 0 && metrics.totalDataGenerated > 0
      ? 'error'
      : metrics.dataUtilization > 100
        ? 'error'
        : metrics.dataUtilization < metrics.requiredDownlinkRatio * 100 && metrics.totalDataGenerated > 0
          ? 'warning'
          : 'secondary';

  const commsTone: Tone =
    metrics.totalDataGenerated === 0
      ? 'primary'
      : metrics.dataUtilization < metrics.requiredDownlinkRatio * 100
        ? 'warning'
        : 'success';

  const lifeTone: Tone =
    metrics.estimatedLifeYears < metrics.requiredLifeYears * 0.8
      ? 'error'
      : metrics.estimatedLifeYears < metrics.requiredLifeYears
        ? 'warning'
        : 'success';

  const dataDetail =
    metrics.totalDataGenerated === 0
      ? 'Sin carga científica generando datos'
      : metrics.totalDownlinkCapacity === 0
        ? 'No hay antena de descarga instalada'
        : `Uso del enlace ${formatPercent(metrics.dataUtilization)} · mínimo ${formatPercent(
            metrics.requiredDownlinkRatio * 100,
          )}`;

  const commsDetail =
    metrics.totalDataGenerated === 0
      ? `${metrics.commsBand} · en espera de carga científica`
      : metrics.totalDownlinkCapacity === 0
        ? 'Sin capacidad de descarga'
        : `${metrics.commsBand} · ${formatMbps(metrics.totalDownlinkCapacity)} de capacidad`;

  return (
    <aside className="panel flex min-h-0 flex-col gap-4 p-4 xl:h-full xl:overflow-y-auto">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-mono-xs uppercase tracking-[0.18em] text-on-surface-variant">
            Live telemetry
          </p>
          <h2 className="font-headline text-headline-md text-on-surface">Telemetría de recursos</h2>
          <p className="mt-0.5 font-body text-body-md text-on-surface-variant">
            Se recalcula con cada pieza del diseño.
          </p>
        </div>
        <DesignStatusPill status={metrics.status} compact />
      </div>

      <div className="flex flex-col gap-3.5">
        <ResourceRow
          icon={Weight}
          label="Masa total"
          value={`${formatKg(metrics.totalMassKg)} / ${formatKg(metrics.massLimitKg)}`}
          percent={metrics.massPercentage}
          tone={massTone}
          detail={
            metrics.massMarginKg >= 0
              ? `${formatKg(metrics.massMarginKg)} de margen · ${metrics.launcher.name}`
              : `Excede el límite en ${formatKg(Math.abs(metrics.massMarginKg))}`
          }
          barLabel="Masa total frente al lanzador"
        />

        <ResourceRow
          icon={Zap}
          label="Energía (consumo / generación)"
          value={`${formatKw(metrics.powerConsumedKw)} / ${formatKw(metrics.powerGeneratedKw)}`}
          percent={metrics.powerRatio}
          tone={powerTone}
          detail={`Margen ${formatSignedKw(metrics.powerMarginKw)} · ${formatPercent(
            metrics.powerRatio,
          )} de la generación`}
          barLabel="Consumo de energía frente a generación"
        />

        <ResourceRow
          icon={Coins}
          label="Presupuesto"
          value={`${formatMillions(metrics.budgetSpent)} / ${formatMillions(metrics.budgetTotal)}`}
          percent={metrics.budgetPercentage}
          tone={budgetTone}
          detail={`${formatMillions(metrics.budgetRemaining)} disponibles`}
          barLabel="Presupuesto comprometido"
        />

        <ResourceRow
          icon={Database}
          label="Tasa de datos"
          value={`${formatMbps(metrics.totalDataGenerated)} / ${formatMbps(
            metrics.totalDownlinkCapacity,
          )}`}
          percent={metrics.dataUtilization}
          tone={dataTone}
          detail={dataDetail}
          barLabel="Datos generados frente a capacidad de enlace"
        />

        <ResourceRow
          icon={Radio}
          label="Comunicaciones"
          value={`${formatPercent(Math.min(metrics.downlinkCoverage, 999))} cobertura`}
          percent={Math.min(metrics.downlinkCoverage, 100)}
          tone={commsTone}
          detail={commsDetail}
          barLabel="Cobertura de descarga frente al objetivo"
        />
        <ResourceRow
          icon={Timer}
          label="Vida útil estimada"
          value={`${formatYears(metrics.estimatedLifeYears)} / ${formatYears(
            metrics.requiredLifeYears,
          )}`}
          percent={metrics.lifePercentage}
          tone={lifeTone}
          detail={`Referencia de diseño ${formatYears(5)} · mínimo ${formatYears(
            metrics.requiredLifeYears,
          )}`}
          barLabel="Vida útil estimada frente a referencia de diseño"
        />
      </div>

      <div className="h-px bg-outline-variant" />

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-title text-label-lg text-on-surface">Alertas de diseño</h3>
          <span className="font-mono text-mono-xs text-on-surface-variant">
            {metrics.warnings.length}
          </span>
        </div>

        {metrics.warnings.length ? (
          <div className="flex flex-col gap-1.5">
            {metrics.warnings.slice(0, 5).map((warning) => (
              <WarningCard key={warning.id} warning={warning} />
            ))}
            {metrics.warnings.length > 5 ? (
              <p className="font-mono text-mono-xs text-on-surface-variant">
                +{metrics.warnings.length - 5} advertencias más en el informe de lanzamiento.
              </p>
            ) : null}
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded border border-success/30 bg-success/5 px-2.5 py-2">
            <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
            <div>
              <p className="font-label text-label-sm text-success">Todos los recursos en margen</p>
              <p className="mt-0.5 font-body text-body-md text-on-surface-variant">
                El diseño está listo para la revisión pre-lanzamiento.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-auto flex flex-col gap-2 border-t border-outline-variant pt-3">
        {lastLaunchValidated ? (
          <div className="flex items-center gap-2 rounded border border-success/30 bg-success/10 px-2.5 py-2">
            <CircleCheck className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
            <p className="font-label text-label-sm text-success">
              Secuencia de lanzamiento validada
            </p>
          </div>
        ) : null}

        <button
          type="button"
          onClick={() =>
            notify('Comparación guardada en la mesa local. (demo, sin backend)', 'success')
          }
          className="inline-flex w-full items-center justify-center gap-2 rounded border border-outline bg-surface-container px-3 py-2 font-label text-label-lg text-on-surface transition-colors hover:bg-surface-container-high focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <Layers className="h-4 w-4 text-primary" aria-hidden="true" />
          Guardar y comparar
        </button>

        <button
          type="button"
          onClick={resetDesign}
          className="inline-flex w-full items-center justify-center gap-2 rounded px-3 py-1.5 font-label text-label-sm text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Restablecer mesa
        </button>
      </div>
    </aside>
  );
}
