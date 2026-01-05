import React from "react";
import { Spinner } from "@/shared/ui/spinner";

/**
 * Loading: estado de carga accesible con spinner y etiqueta opcional.
 *
 * @example
 * ```tsx
 * <Loading label="Cargando usuarios..." />
 * ```
 */
export interface LoadingProps {
  label?: string;
  className?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}

export function Loading({ label = "Cargando...", className, size = "md" }: LoadingProps) {
  return (
    <div className={["flex items-center justify-center py-8", className].filter(Boolean).join(" ")}>
      <Spinner size={size} label={label} className="text-primary" />
      {label ? <span className="ml-2 text-sm text-muted-foreground">{label}</span> : null}
    </div>
  );
}

export default Loading;