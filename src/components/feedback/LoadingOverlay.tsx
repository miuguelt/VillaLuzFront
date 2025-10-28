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
}

/**
 * Overlay elegante de carga con transparencia del 97%
 * Indica al usuario que se está procesando información sin bloquear completamente la UI
 */
export function LoadingOverlay({
  show,
  message = 'Cargando...',
  opaque = false,
  allowInteraction = false,
}: LoadingOverlayProps) {
  if (!show) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-all duration-500 ease-out ${
        allowInteraction ? 'pointer-events-none' : ''
      }`}
      style={{
        backgroundColor: opaque ? 'rgba(0, 0, 0, 0.15)' : 'rgba(0, 0, 0, 0.03)',
        backdropFilter: show ? 'blur(2px)' : 'blur(0px)',
        WebkitBackdropFilter: show ? 'blur(2px)' : 'blur(0px)',
        opacity: show ? 1 : 0,
      }}
    >
      {/* Contenedor del indicador - siempre captura eventos */}
      <div
        className={`flex flex-col items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border transform transition-all duration-500 ease-out ${
          show ? 'scale-100 opacity-100 translate-y-0' : 'scale-90 opacity-0 translate-y-4'
        } ${allowInteraction ? 'pointer-events-auto' : ''}`}
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderColor: 'rgba(0, 0, 0, 0.08)',
        }}
      >
        {/* Spinner animado */}
        <Loader2
          className="w-8 h-8 text-primary animate-spin"
          strokeWidth={2.5}
        />

        {/* Mensaje */}
        {message && (
          <p className="text-sm font-medium text-foreground/80 animate-pulse">
            {message}
          </p>
        )}

        {/* Indicador de progreso sutil */}
        <div className="w-24 h-1 bg-muted/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary/60 via-primary to-primary/60 rounded-full animate-shimmer"
            style={{
              animation: 'shimmer 1.5s infinite',
              backgroundSize: '200% 100%',
            }}
          />
        </div>
      </div>

      {/* Estilos de animación */}
      <style>{`
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
      `}</style>
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
