import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingOverlayProps {
  /** Mostrar el overlay */
  show: boolean;
  /** Mensaje personalizado (opcional) */
  message?: string;
  /** Hacer el overlay más opaco (menos transparente) */
  opaque?: boolean;
  /** Permitir clicks a través del overlay (no bloqueante) */
  allowInteraction?: boolean;
  /** Tipo de operación para colores temáticos */
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

/**
 * Overlay elegante de carga con código de colores y mejor visibilidad
 * Indica al usuario el tipo de operación con colores temáticos
 */
export function LoadingOverlay({
  show,
  message = 'Cargando...',
  opaque = false,
  allowInteraction = false,
  variant = 'default',
}: LoadingOverlayProps) {
  if (!show) return null;

  const tokens: Record<NonNullable<LoadingOverlayProps['variant']>, {
    spinnerClass: string;
    accentVar: string;
    ghostVar: string;
    ghostStrongVar: string;
  }> = {
    default: {
      spinnerClass: 'text-primary',
      accentVar: '--color-primary',
      ghostVar: '--primary-ghost',
      ghostStrongVar: '--primary-ghost-strong',
    },
    success: {
      spinnerClass: 'text-success',
      accentVar: '--color-success',
      ghostVar: '--success-ghost',
      ghostStrongVar: '--success-ghost-strong',
    },
    warning: {
      spinnerClass: 'text-warning',
      accentVar: '--color-warning',
      ghostVar: '--warning-ghost',
      ghostStrongVar: '--warning-ghost-strong',
    },
    danger: {
      spinnerClass: 'text-danger',
      accentVar: '--color-danger',
      ghostVar: '--danger-ghost',
      ghostStrongVar: '--danger-ghost-strong',
    },
    info: {
      spinnerClass: 'text-info',
      accentVar: '--color-info',
      ghostVar: '--info-ghost',
      ghostStrongVar: '--info-ghost-strong',
    },
  };

  const selected = tokens[variant];
  const accentColor = `hsl(var(${selected.accentVar}))`;
  const ghostColor = `hsl(var(${selected.ghostVar}))`;
  const ghostStrongColor = `hsl(var(${selected.ghostStrongVar}))`;

  return (
    <div
      className={`fixed inset-0 z-[99998] flex items-center justify-center transition-all duration-300 ease-out animate-fade-in ${
        allowInteraction ? 'pointer-events-none' : ''
      }`}
      style={{
        backgroundColor: opaque
          ? `hsl(var(--overlay-strong))`
          : allowInteraction
            ? `hsl(var(--overlay-muted))`
            : `hsl(var(--overlay-soft))`,
        backdropFilter: show ? 'blur(14px)' : 'blur(0px)',
        WebkitBackdropFilter: show ? 'blur(14px)' : 'blur(0px)',
        opacity: show ? 1 : 0,
      }}
    >
      {/* Contenedor del indicador - siempre encima con mejor visibilidad */}
      <div
        className={`flex flex-col items-center gap-4 px-8 py-6 rounded-2xl shadow-xl border transform transition-all duration-300 ease-out animate-scale-in bg-surface ${
          show ? 'scale-100 opacity-100 translate-y-0' : 'scale-90 opacity-0 translate-y-4'
        } ${allowInteraction ? 'pointer-events-auto' : ''}`}
        style={{
          borderColor: ghostStrongColor,
          boxShadow: `0 25px 55px -20px ${ghostStrongColor}, 0 12px 30px -12px ${ghostColor}`,
          backgroundColor: `hsl(var(--surface-primary))`,
        }}
      >
        {/* Spinner animado con color temático */}
        <div className="relative">
          <Loader2
            className={`w-12 h-12 ${selected.spinnerClass} animate-spin`}
            strokeWidth={2.5}
          />
          {/* Anillo pulsante de fondo */}
          <div
            className="absolute inset-0 rounded-full border-4 opacity-30 animate-pulse"
            style={{ borderStyle: 'dashed', borderColor: accentColor }}
          />
        </div>

        {/* Mensaje con mejor tipografía */}
        {message && (
          <div className="text-center space-y-1">
            <p className="text-base font-semibold text-foreground">
              {message}
            </p>
            <p className="text-xs text-muted-foreground">
              Por favor espere...
            </p>
          </div>
        )}

        {/* Barra de progreso indeterminada mejorada */}
        <div className="w-32 h-1.5 bg-surface-secondary rounded-full overflow-hidden shadow-inner">
          <div
            className="h-full rounded-full"
            style={{
              backgroundColor: ghostStrongColor,
              animation: 'progressIndeterminate 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite',
            }}
          />
        </div>

        {/* Dots loading animation */}
        <div className="flex gap-1.5">
          {[0, 0.15, 0.3].map((delay) => (
            <span
              key={delay}
              className={`w-2 h-2 rounded-full animate-bounce ${selected.spinnerClass}`}
              style={{ animationDelay: `${delay}s`, backgroundColor: accentColor }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Hook personalizado para manejar estados de carga
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useLoadingOverlay() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [message, setMessage] = React.useState<string>('Cargando...');

  const showLoading = React.useCallback((msg?: string) => {
    setMessage(msg || 'Cargando...');
    setIsLoading(true);
  }, []);

  const hideLoading = React.useCallback(() => {
    setIsLoading(false);
  }, []);

  const withLoading = React.useCallback(
    async <T,>(
      promise: Promise<T>,
      loadingMessage?: string
    ): Promise<T> => {
      showLoading(loadingMessage);
      try {
        const result = await promise;
        return result;
      } finally {
        // Pequeño delay para que el usuario vea la transición
        setTimeout(hideLoading, 200);
      }
    },
    [showLoading, hideLoading]
  );

  return {
    isLoading,
    message,
    showLoading,
    hideLoading,
    withLoading,
  };
}
