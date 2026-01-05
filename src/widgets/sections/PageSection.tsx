import React from "react";
// ... existing code ...

/**
 * PageSection: contenedor de sección basado en Card.
 *
 * Aplica estilos consistentes:
 * - bg-card border rounded-lg shadow-sm
 *
 * @example
 * ```tsx
 * import { PageSection } from "@/widgets/sections/PageSection";
 *
 * <PageSection className="mt-4">
 *   <div>Contenido de la sección</div>
 * </PageSection>
 * ```
 */
export interface PageSectionProps {
  children: React.ReactNode;
  className?: string;
  role?: string;
  ariaLabel?: string;
}

export function PageSection({ children, className, role, ariaLabel }: PageSectionProps) {
  return (
    <section
      role={role}
      aria-label={ariaLabel}
      className={["bg-card border rounded-lg shadow-sm", className].filter(Boolean).join(" ")}
    >
      <div className="p-4 sm:p-6">{children}</div>
    </section>
  );
}

export default PageSection;