import { X } from 'lucide-react';
import { useDesignStore } from '../../store/useDesignStore';

const TONE_CLASS: Record<string, string> = {
  success: 'border-success/50 text-success',
  error: 'border-error/50 text-error',
  warning: 'border-warning/50 text-warning',
  info: 'border-primary/50 text-primary',
};

export function ToastStack() {
  const toasts = useDesignStore((state) => state.toasts);
  const dismiss = useDesignStore((state) => state.dismissToast);

  return (
    <div
      className="fixed bottom-4 right-4 z-[60] flex w-[min(340px,calc(100vw-2rem))] flex-col gap-2"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`rounded border bg-surface-container-low/95 px-3 py-2 text-xs shadow-console backdrop-blur ${
            TONE_CLASS[toast.tone] ?? TONE_CLASS.info
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <span className="leading-relaxed">{toast.message}</span>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="shrink-0 rounded p-0.5 text-on-surface-variant transition-colors hover:text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
              aria-label="Cerrar notificación"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
