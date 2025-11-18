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

  // Colores según el código de colores de la aplicación
  const variantStyles = {
    default: {
      spinnerClass: 'text-primary',
      progressBg: 'from-primary/60 via-primary to-primary/60',
      borderColor: 'rgba(59, 130, 246, 0.3)',
      bgGradient: 'from-blue-50/95 to-indigo-50/95',
    },
    success: {
      spinnerClass: 'text-green-600',
      progressBg: 'from-green-500/60 via-green-600 to-green-500/60',
      borderColor: 'rgba(34, 197, 94, 0.4)',
      bgGradient: 'from-green-50/95 to-emerald-50/95',
    },
    warning: {
      spinnerClass: 'text-yellow-600',
      progressBg: 'from-yellow-500/60 via-amber-500 to-yellow-500/60',
      borderColor: 'rgba(251, 191, 36, 0.4)',
      bgGradient: 'from-yellow-50/95 to-amber-50/95',
    },
    danger: {
      spinnerClass: 'text-red-600',
      progressBg: 'from-red-500/60 via-red-600 to-red-500/60',
      borderColor: 'rgba(239, 68, 68, 0.4)',
      bgGradient: 'from-red-50/95 to-rose-50/95',
    },
    info: {
      spinnerClass: 'text-blue-600',
      progressBg: 'from-blue-500/60 via-cyan-500 to-blue-500/60',
      borderColor: 'rgba(59, 130, 246, 0.4)',
      bgGradient: 'from-blue-50/95 to-cyan-50/95',
    },
  };

  const styles = variantStyles[variant];

  return (
    <div
      className={`fixed inset-0 z-[99998] flex items-center justify-center transition-all duration-300 ease-out animate-fade-in ${
        allowInteraction ? 'pointer-events-none' : ''
      }`}
      style={{
        backgroundColor: opaque
          ? 'rgba(0, 0, 0, 0.35)'
          : allowInteraction
            ? 'rgba(0, 0, 0, 0.07)'
            : 'rgba(0, 0, 0, 0.15)',
        backdropFilter: show ? 'blur(8px)' : 'blur(0px)',
        WebkitBackdropFilter: show ? 'blur(8px)' : 'blur(0px)',
        opacity: show ? 1 : 0,
      }}
    >
      {/* Contenedor del indicador - siempre encima con mejor visibilidad */}
      <div
        className={`flex flex-col items-center gap-4 px-8 py-6 rounded-2xl shadow-2xl border-2 transform transition-all duration-300 ease-out animate-scale-in ${
          show ? 'scale-100 opacity-100 translate-y-0' : 'scale-90 opacity-0 translate-y-4'
        } ${allowInteraction ? 'pointer-events-auto' : ''} bg-gradient-to-br ${styles.bgGradient}`}
        style={{
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderColor: styles.borderColor,
          boxShadow: `0 20px 40px -10px ${styles.borderColor}, 0 10px 20px -5px ${styles.borderColor}`,
        }}
      >
        {/* Spinner animado con color temático */}
        <div className="relative">
          <Loader2
            className={`w-12 h-12 ${styles.spinnerClass} animate-spin`}
            strokeWidth={2.5}
          />
          {/* Anillo pulsante de fondo */}
          <div
            className={`absolute inset-0 rounded-full border-4 ${styles.spinnerClass} opacity-20 animate-pulse`}
            style={{ borderStyle: 'dashed' }}
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
        <div className="w-32 h-1.5 bg-muted/30 rounded-full overflow-hidden shadow-inner">
          <div
            className={`h-full bg-gradient-to-r ${styles.progressBg} rounded-full`}
            style={{
              animation: 'progressIndeterminate 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite',
            }}
          />
        </div>

        {/* Dots loading animation */}
        <div className="flex gap-1.5">
          <span
            className={`w-2 h-2 ${styles.spinnerClass} bg-current rounded-full animate-bounce`}
            style={{ animationDelay: '0s' }}
          />
          <span
            className={`w-2 h-2 ${styles.spinnerClass} bg-current rounded-full animate-bounce`}
            style={{ animationDelay: '0.15s' }}
          />
          <span
            className={`w-2 h-2 ${styles.spinnerClass} bg-current rounded-full animate-bounce`}
            style={{ animationDelay: '0.3s' }}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Hook personalizado para manejar estados de carga
 */
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
