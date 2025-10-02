import React from "react";

/**
 * PageHeader: encabezado consistente para páginas.
 *
 * Muestra:
 * - Breadcrumbs opcionales (slot)
 * - Título (h1) y descripción en texto atenuado
 * - Slot de acciones alineado a la derecha
 *
 * @example
 * ```tsx
 * import { PageHeader } from "@/components/layout/PageHeader";
 * 
 * <PageHeader
 *   title="Gestión de Usuarios"
 *   description="Administra usuarios del sistema"
 *   actions={<button className="btn btn-primary">Nuevo</button>}
 *   breadcrumbs={<nav aria-label="Breadcrumb">...</nav>}
 * />
 * ```
 */
export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  className?: string;
  // Nuevo: modo denso para reducir márgenes/padding/espaciado
  dense?: boolean;
  // Opcional: clases extra para el <h1>
  titleClassName?: string;
}

export function PageHeader({ title, description, actions, breadcrumbs, className, dense = false, titleClassName }: PageHeaderProps) {
  const headerBase = dense
    ? "mb-0 bg-transparent rounded-none p-0 sm:p-1 shadow-none border-none"
    : "mb-6 sm:mb-8 bg-card/30 backdrop-blur-sm rounded-lg p-4 sm:p-6 shadow-sm border border-border/50 transition-all duration-300 hover:shadow-md";
  const wrapperClasses = dense
    ? "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
    : "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between";
  const breadcrumbsMb = dense ? "mb-2" : "mb-3";
  const titleClasses = [
    dense ? "text-xl sm:text-2xl font-bold tracking-tight text-foreground transition-colors duration-200" : "text-2xl sm:text-3xl font-bold tracking-tight text-foreground transition-colors duration-200",
    titleClassName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <header className={[headerBase, className].filter(Boolean).join(" ")}>
      {breadcrumbs ? (
        <div className={breadcrumbsMb} aria-label="Breadcrumb">
          {breadcrumbs}
        </div>
      ) : null}
      <div className={wrapperClasses}>
        <div className="space-y-1.5">
          <h1 className={titleClasses}>{title}</h1>
          {description ? (
            <p className="text-sm sm:text-base text-muted-foreground transition-colors duration-200">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex items-center gap-3">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}

export default PageHeader;