import React from 'react';
import { createPortal } from 'react-dom';
import { useToast } from '@/app/providers/ToastContext';
import { cn } from '@/shared/ui/cn';

const variantClasses: Record<string, string> = {
  success: 'bg-success text-success-foreground border-success-600/40',
  error: 'bg-destructive text-destructive-foreground border-destructive-600/40',
  warning: 'bg-warning text-warning-foreground border-warning-600/40',
  info: 'bg-accent text-accent-foreground border-border/60',
};

export const ToastContainer: React.FC<{ className?: string }> = ({ className }) => {
  const { toasts, removeToast } = useToast();

  if (!toasts?.length) return null;

  return createPortal(
    <div
      className={cn(
        'pointer-events-none fixed top-3 right-3 z-[1000] flex w-full max-w-sm flex-col gap-2',
        'sm:top-4 sm:right-4',
        className
      )}
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((t) => {
        const style = variantClasses[t.type || 'info'] || variantClasses.info;
        // Elegir aria-live según severidad
        const live = t.type === 'error' || t.type === 'warning' ? 'assertive' : 'polite';
        return (
          <div
            key={t.id}
            role="status"
            aria-live={live as any}
            className={cn(
              'pointer-events-auto rounded-md border shadow-lg backdrop-blur-sm',
              'px-3 py-2 text-sm flex items-start gap-2',
              style
            )}
          >
            <div className="flex-1 min-w-0">
              <p className="break-words" title={t.message}>{t.message}</p>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="ml-2 inline-flex items-center justify-center rounded-md border border-input/50 bg-background/30 px-2 py-1 text-xs hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Cerrar notificación"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>,
    document.body
  );
};

export default ToastContainer;