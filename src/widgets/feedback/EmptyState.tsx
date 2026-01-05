import React from "react";

/**
 * EmptyState: estado vacío simple y accesible.
 *
 * @example
 * ```tsx
 * <EmptyState
 *   title="No hay usuarios"
 *   description="Crea el primero para comenzar"
 *   action={<Button onClick={onCreate}>Nuevo Usuario</Button>}
 * />
 * ```
 */
export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={["flex flex-col items-center justify-center text-center px-6 py-12 bg-muted border border-border rounded-lg", className].filter(Boolean).join(" ")}
      role="status"
      aria-live="polite"
    >
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description ? (
        <p className="mt-1 text-sm text-muted-foreground max-w-prose">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export default EmptyState;