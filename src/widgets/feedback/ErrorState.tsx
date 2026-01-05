import React from "react";
import { Button } from "@/shared/ui/button";

/**
 * ErrorState: bloque de error simple con acción de reintento opcional.
 *
 * @example
 * ```tsx
 * <ErrorState message="No se pudo cargar" onRetry={() => window.location.reload()} />
 * ```
 */
export interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ message = "Ocurrió un error inesperado", onRetry, className }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={[
        "flex flex-col items-center justify-center text-center px-6 py-10 border border-destructive rounded-lg",
        "bg-destructive text-destructive-foreground",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <h3 className="text-base font-semibold">Error</h3>
      <p className="mt-1 text-sm text-destructive">{message}</p>
      {onRetry ? (
        <div className="mt-4">
          <Button variant="outline" onClick={onRetry} aria-label="Reintentar">
            Reintentar
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export default ErrorState;