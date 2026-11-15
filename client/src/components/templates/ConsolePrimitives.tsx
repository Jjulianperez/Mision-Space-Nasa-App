import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Satellite } from 'lucide-react';
import { cn } from '../../lib/cn';

export type ConsoleTone = 'primary' | 'accent' | 'success' | 'warning' | 'error' | 'muted';

const OUTLINE_TONE: Record<ConsoleTone, string> = {
  primary: 'border-primary/40 bg-primary/15 text-primary',
  accent: 'border-accent/40 bg-accent/15 text-accent',
  success: 'border-success/40 bg-success/15 text-success',
  warning: 'border-warning/40 bg-warning/15 text-warning',
  error: 'border-error/40 bg-error/15 text-error',
  muted: 'border-outline bg-surface-container text-on-surface-variant',
};

const SOLID_TONE: Record<ConsoleTone, string> = {
  primary: 'bg-primary text-on-primary',
  accent: 'bg-accent text-on-accent',
  success: 'bg-success text-on-success',
  warning: 'bg-warning text-on-warning',
  error: 'bg-error text-on-error',
  muted: 'bg-surface-container-high text-on-surface',
};

export function Pill({
  children,
  icon: Icon,
  tone = 'primary',
  solid = false,
  className,
}: {
  children: ReactNode;
  icon?: LucideIcon;
  tone?: ConsoleTone;
  solid?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-label text-label-sm',
        solid ? cn('border-transparent', SOLID_TONE[tone]) : OUTLINE_TONE[tone],
        className,
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
      {children}
    </span>
  );
}

export function Panel({
  children,
  className,
  as: Tag = 'article',
}: {
  children: ReactNode;
  className?: string;
  as?: 'article' | 'section' | 'div' | 'aside';
}) {
  return (
    <Tag
      className={cn(
        'rounded-md border border-outline-variant bg-surface-container-low p-gutter-md',
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function ConsoleHeader({
  section,
  badge,
  status,
  right,
  onHome,
}: {
  section: string;
  badge?: { label: string; icon?: LucideIcon; tone?: ConsoleTone };
  status?: { label: string; icon?: LucideIcon; tone?: ConsoleTone };
  right?: ReactNode;
  onHome?: () => void;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-gutter-md border-b border-outline-variant bg-surface-container-low px-gutter-lg py-gutter-sm">
      <div className="flex min-w-0 flex-wrap items-center gap-gutter-md">
        <button
          type="button"
          onClick={onHome}
          className="flex items-center gap-gutter-sm rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          aria-label="Volver al inicio de OrbitaLab"
        >
          <Satellite className="h-6 w-6 text-primary" aria-hidden="true" />
          <span className="font-headline text-title-md text-on-surface">OrbitaLab</span>
        </button>
        <span className="hidden h-5 w-px bg-outline-variant sm:block" aria-hidden="true" />
        <span className="font-label text-label-lg text-on-surface">{section}</span>
        {badge && (
          <Pill icon={badge.icon} tone={badge.tone ?? 'primary'}>
            {badge.label}
          </Pill>
        )}
      </div>
      <div className="flex items-center gap-gutter-sm">
        {right}
        {status && (
          <Pill icon={status.icon} tone={status.tone ?? 'success'} solid>
            {status.label}
          </Pill>
        )}
      </div>
    </header>
  );
}

export type MeterTone = 'primary' | 'accent' | 'success' | 'warning' | 'error';

const METER_FILL: Record<MeterTone, string> = {
  primary: 'bg-primary',
  accent: 'bg-accent',
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-error',
};

const METER_TEXT: Record<MeterTone, string> = {
  primary: 'text-primary',
  accent: 'text-accent',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-error',
};

export function MeterBar({
  label,
  value,
  percent,
  tone = 'primary',
  hint,
  mono = false,
  className,
}: {
  label: string;
  value: string;
  percent: number;
  tone?: MeterTone;
  hint?: string;
  mono?: boolean;
  className?: string;
}) {
  const safePercent = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0));
  return (
    <div className={cn('flex flex-col gap-gutter-xs', className)}>
      <div
        className={cn(
          'flex items-baseline justify-between gap-2',
          mono ? 'font-mono text-mono-sm' : 'font-body text-body-md',
        )}
      >
        <span className="text-on-surface-variant">{label}</span>
        <span className={cn('tabular-nums', METER_TEXT[tone])}>{value}</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-surface-container"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(safePercent)}
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-500', METER_FILL[tone])}
          style={{ width: `${safePercent}%` }}
        />
      </div>
      {hint && <span className="font-body text-[11px] leading-tight text-on-surface-variant">{hint}</span>}
    </div>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'accent';
  icon?: LucideIcon;
  fullWidth?: boolean;
};

const BUTTON_VARIANT: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'border border-primary bg-primary text-on-primary hover:opacity-90 disabled:opacity-40',
  secondary:
    'border border-outline bg-surface-container text-on-surface hover:border-primary hover:bg-surface-container-high disabled:opacity-40',
  ghost:
    'border border-transparent text-on-surface-variant hover:border-outline hover:bg-surface-container hover:text-on-surface disabled:opacity-40',
  danger:
    'border border-error/50 bg-error/15 text-error hover:bg-error/25 disabled:opacity-40',
  success:
    'border border-success/50 bg-success/15 text-success hover:bg-success/25 disabled:opacity-40',
  accent:
    'border border-accent/50 bg-accent/15 text-accent hover:bg-accent/25 disabled:opacity-40',
};

export function ActionButton({
  children,
  variant = 'primary',
  icon: Icon,
  fullWidth,
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-gutter-sm rounded px-gutter-lg py-gutter-sm font-label text-label-lg transition-colors duration-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed',
        BUTTON_VARIANT[variant],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function SectionTitle({
  children,
  icon: Icon,
  right,
}: {
  children: ReactNode;
  icon?: LucideIcon;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-gutter-sm">
      <h2 className="flex items-center gap-2 font-headline text-title-md text-on-surface">
        {Icon && <Icon className="h-4 w-4 text-primary" aria-hidden="true" />}
        {children}
      </h2>
      {right}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded border border-dashed border-outline bg-surface-container/60 px-gutter-md py-gutter-lg text-center font-body text-body-md text-on-surface-variant">
      {children}
    </div>
  );
}
