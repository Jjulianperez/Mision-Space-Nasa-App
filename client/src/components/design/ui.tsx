import { useEffect } from 'react';
import {
  CircleCheck,
  CircleX,
  Info,
  ShieldCheck,
  TriangleExclamationPoint,
  X,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useDesignStore, type ToastItem, type ToastTone } from '../../store/useDesignStore';
import {
  COMPATIBILITY_LABEL,
  STATUS_LABEL,
  type DesignStatus,
  type OrbitCompatibility,
} from '../../lib/designCalculations';

export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

export type Tone = 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error';

const TONE_BG_CLASS: Record<Tone, string> = {
  primary: 'bg-primary',
  secondary: 'bg-secondary',
  accent: 'bg-accent',
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-error',
};

const TONE_TEXT_CLASS: Record<Tone, string> = {
  primary: 'text-primary',
  secondary: 'text-secondary',
  accent: 'text-accent',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-error',
};

export function toneTextClass(tone: Tone): string {
  return TONE_TEXT_CLASS[tone];
}

export function MeterBar({
  percent,
  tone,
  label,
  className,
}: {
  percent: number;
  tone: Tone;
  label: string;
  className?: string;
}) {
  const width = Math.max(0, Math.min(100, percent));

  return (
    <div
      className={cx('h-1.5 w-full overflow-hidden rounded-full bg-surface-container', className)}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(width)}
    >
      <div
        className={cx('h-full rounded-full transition-all duration-500 ease-state-change', TONE_BG_CLASS[tone])}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

const STATUS_CLASS: Record<DesignStatus, { box: string; dot: string }> = {
  NOMINAL: {
    box: 'border-success/40 bg-success/10 text-success',
    dot: 'bg-success',
  },
  ALERTA: {
    box: 'border-accent/40 bg-accent/10 text-accent',
    dot: 'bg-accent',
  },
  CRITICO: {
    box: 'border-error/40 bg-error/10 text-error',
    dot: 'bg-error',
  },
};

export function DesignStatusPill({
  status,
  compact = false,
}: {
  status: DesignStatus;
  compact?: boolean;
}) {
  const styles = STATUS_CLASS[status];
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-mono-xs uppercase tracking-[0.12em]',
        styles.box,
      )}
      role="status"
    >
      <span className={cx('h-1.5 w-1.5 rounded-full', styles.dot, 'pulse-soft')} aria-hidden="true" />
      {compact ? STATUS_LABEL[status] : `Sistema · ${STATUS_LABEL[status]}`}
    </span>
  );
}

const COMPATIBILITY_STYLE: Record<
  OrbitCompatibility,
  { box: string; icon: typeof ShieldCheck }
> = {
  COMPATIBLE: { box: 'border-success/40 bg-success/10 text-success', icon: ShieldCheck },
  PARCIAL: { box: 'border-accent/40 bg-accent/10 text-accent', icon: TriangleExclamationPoint },
  INCOMPATIBLE: { box: 'border-error/40 bg-error/10 text-error', icon: CircleX },
};

export function CompatibilityBadge({
  status,
  label,
  className,
}: {
  status: OrbitCompatibility;
  label?: string;
  className?: string;
}) {
  const style = COMPATIBILITY_STYLE[status];
  const Icon = style.icon;

  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-label text-label-sm',
        style.box,
        className,
      )}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {label ?? COMPATIBILITY_LABEL[status]}
    </span>
  );
}

export function CardHeader({
  icon,
  title,
  eyebrow,
  right,
}: {
  icon: ReactNode;
  title: string;
  eyebrow?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        {icon}
        <div>
          {eyebrow ? (
            <p className="font-mono text-mono-xs uppercase tracking-[0.18em] text-on-surface-variant">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="font-headline text-title-md text-on-surface">{title}</h2>
        </div>
      </div>
      {right}
    </div>
  );
}

const TOAST_STYLE: Record<ToastTone, { box: string; icon: typeof CircleCheck }> = {
  success: { box: 'border-success/40 bg-surface-container text-success', icon: CircleCheck },
  warning: {
    box: 'border-accent/40 bg-surface-container text-accent',
    icon: TriangleExclamationPoint,
  },
  error: { box: 'border-error/40 bg-surface-container text-error', icon: CircleX },
  info: { box: 'border-primary/40 bg-surface-container text-primary', icon: Info },
};

function ToastCard({ toast }: { toast: ToastItem }) {
  const dismissToast = useDesignStore((state) => state.dismissToast);
  const style = TOAST_STYLE[toast.tone];
  const Icon = style.icon;

  useEffect(() => {
    const timeout = window.setTimeout(() => dismissToast(toast.id), 4600);
    return () => window.clearTimeout(timeout);
  }, [dismissToast, toast.id]);

  return (
    <div
      className={cx(
        'toast-in pointer-events-auto flex w-full items-start gap-2.5 rounded-md border px-3 py-2.5 shadow-console backdrop-blur',
        style.box,
      )}
      role="status"
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <p className="flex-1 font-body text-body-md text-on-surface">{toast.message}</p>
      <button
        type="button"
        onClick={() => dismissToast(toast.id)}
        className="rounded p-0.5 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
        aria-label="Cerrar notificación"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

export function ToastStack() {
  const toasts = useDesignStore((state) => state.toasts);

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[80] flex w-[min(92vw,360px)] flex-col gap-2"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
