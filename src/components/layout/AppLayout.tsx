import React from "react";
import { ToastContainer } from "@/components/feedback/ToastContainer";

/**
 * AppLayout: contenedor base para páginas.
 *
 * Estructura:
 * <div className="h-full min-h-0 bg-background/95 backdrop-blur-sm">
 *   <main className="container mx-auto px-4 sm:px-6 pt-0 pb-6 sm:pb-8 max-w-screen-xl">
 *     {header}
 *     <div className="space-y-4 sm:space-y-6">
 *       {children}
 *     </div>
 *   </main>
 *   // Contenedor global de toasts accesibles (montado con ToastContainer)
 * </div>
 *
 * @example
 * ```tsx
 * import { AppLayout } from "@/components/layout/AppLayout";
 * import { PageHeader } from "@/components/layout/PageHeader";
 *
 * export default function ExamplePage() {
 *   return (
 *     <AppLayout
 *       header={<>
 *         <PageHeader
 *           title="Título de Página"
 *           description="Descripción breve de la sección"
 *           actions={<button className="btn btn-primary">Acción</button>}
 *         />
 *       </>}
 *     >
 *       <div>Contenido</div>
 *     </AppLayout>
 *   );
 * } ``` */
export interface AppLayoutProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  className?: string,
  // Nuevo: permite ajustar el espaciado vertical entre bloques de contenido dentro del layout
  contentClassName?: string;
}

export function AppLayout({ children, header, className, contentClassName }: AppLayoutProps) {
  const innerStackClasses = contentClassName ?? "space-y-4 sm:space-y-6"; // por defecto mantiene el espaciado actual
  return (
    <div className="h-full min-h-0 bg-background/95 backdrop-blur-sm">
      <main className={["container mx-auto px-4 sm:px-6 pt-0 pb-6 sm:pb-8 max-w-screen-xl", className].filter(Boolean).join(" ") }>
        {header}
        <div className={innerStackClasses}>{children}</div>
      </main>
      {/* Contenedor global de toasts accesibles */}
      <ToastContainer />
    </div>
  );
}

export default AppLayout;