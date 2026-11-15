import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { LucideIcon } from 'lucide-react';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { ActionButton } from '../templates/ConsolePrimitives';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

const SIZE_CLASS: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl',
};

interface ModalProps {
  title: string;
  description?: ReactNode;
  onClose: () => void;
  children?: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  /** `alertdialog` para avisos que interrumpen y exigen una respuesta. */
  role?: 'dialog' | 'alertdialog';
  icon?: LucideIcon;
  iconClassName?: string;
  /** Ocupa todo el alto disponible (visores a pantalla completa). */
  fill?: boolean;
  /** Clases del contenedor del contenido; por defecto aplica padding y scroll. */
  bodyClassName?: string;
}

/**
 * Diálogo modal accesible: atrapa el foco, se cierra con Escape o al pulsar el
 * fondo, bloquea el scroll de la página y devuelve el foco al elemento que lo abrió.
 * Dentro del diálogo, marca con `data-autofocus` el control que debe recibir el foco.
 */
export function Modal({
  title,
  description,
  onClose,
  children,
  footer,
  size = 'md',
  role = 'dialog',
  icon: Icon,
  iconClassName,
  fill = false,
  bodyClassName,
}: ModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const initialFocus =
      panel.querySelector<HTMLElement>('[data-autofocus]') ??
      panel.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) ??
      panel;
    initialFocus.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      const outside = !panel.contains(active);
      if (event.shiftKey && (active === first || outside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || outside)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-surface/80 p-0 backdrop-blur-sm sm:items-center sm:p-gutter-md"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          'animate-setup-enter flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-lg border border-outline bg-surface-container-low shadow-console focus:outline-none sm:rounded-lg',
          SIZE_CLASS[size],
          fill && 'h-[92dvh]',
        )}
      >
        <header className="flex shrink-0 items-start justify-between gap-gutter-md border-b border-outline-variant px-gutter-md py-gutter-sm sm:px-gutter-lg sm:py-gutter-md">
          <div className="flex min-w-0 items-start gap-gutter-sm">
            {Icon && (
              <Icon
                className={cn('mt-0.5 h-5 w-5 shrink-0', iconClassName ?? 'text-primary')}
                aria-hidden="true"
              />
            )}
            <div className="min-w-0">
              <h2 id={titleId} className="font-headline text-title-md text-on-surface">
                {title}
              </h2>
              {description && (
                <p
                  id={descriptionId}
                  className="mt-1 font-body text-body-md text-on-surface-variant"
                >
                  {description}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1 shrink-0 rounded p-2 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        {children !== undefined && (
          <div
            className={cn(
              'min-h-0 flex-1',
              bodyClassName ?? 'overflow-y-auto px-gutter-md py-gutter-md sm:px-gutter-lg',
            )}
          >
            {children}
          </div>
        )}

        {footer && (
          <footer className="flex shrink-0 flex-col-reverse gap-gutter-sm border-t border-outline-variant px-gutter-md py-gutter-sm sm:flex-row sm:justify-end sm:px-gutter-lg sm:py-gutter-md">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}

interface ConfirmDialogProps {
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** `danger` enfoca primero la opción que no destruye nada. */
  tone?: 'primary' | 'warning' | 'danger';
  icon?: LucideIcon;
  onConfirm: () => void;
  onCancel: () => void;
}

const CONFIRM_ICON_CLASS: Record<NonNullable<ConfirmDialogProps['tone']>, string> = {
  primary: 'text-primary',
  warning: 'text-warning',
  danger: 'text-error',
};

/** Confirmación de una acción con consecuencias; sustituye a `window.confirm`. */
export function ConfirmDialog({
  title,
  description,
  children,
  confirmLabel,
  cancelLabel = 'Cancelar',
  tone = 'primary',
  icon,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const destructive = tone === 'danger';
  return (
    <Modal
      title={title}
      description={description}
      onClose={onCancel}
      size="sm"
      role="alertdialog"
      icon={icon}
      iconClassName={CONFIRM_ICON_CLASS[tone]}
      footer={
        <>
          <ActionButton
            variant="secondary"
            onClick={onCancel}
            {...(destructive ? { 'data-autofocus': true } : {})}
          >
            {cancelLabel}
          </ActionButton>
          <ActionButton
            variant={destructive ? 'danger' : 'primary'}
            onClick={onConfirm}
            {...(destructive ? {} : { 'data-autofocus': true })}
          >
            {confirmLabel}
          </ActionButton>
        </>
      }
    >
      {children}
    </Modal>
  );
}
