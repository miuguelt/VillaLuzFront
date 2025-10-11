import React, { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

/**
 * Toolbar: barra de herramientas reutilizable para listas y tablas.
 *
 * Características:
 * - Campo de búsqueda opcional a la izquierda.
 * - Slot de contenido intermedio (children) para filtros u otros controles.
 * - Slot de acciones a la derecha (right).
 * - Diseño responsive (stack en móvil, distribución en fila en pantallas medianas+).
 *
 * @example
 * ```tsx
 * import { Toolbar } from "@/components/common/Toolbar";
 * import { Button } from "@/components/ui/button";
 *
 * <Toolbar
 *   searchPlaceholder="Buscar por nombre..."
 *   searchValue={search}
 *   onSearchChange={setSearch}
 *   right={<Button onClick={onAdd} aria-label="Nuevo registro">Nuevo</Button>}
 * >
 *   <Select>...</Select>
 * </Toolbar>
 * ```
 */
export interface ToolbarProps {
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (v: string) => void;
  children?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
  searchDebounceMs?: number;
}

export function Toolbar({
  searchPlaceholder = "Buscar...",
  searchValue,
  onSearchChange,
  children,
  right,
  className,
  searchDebounceMs = 300,
}: ToolbarProps) {
  const [internalValue, setInternalValue] = useState<string>(searchValue ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sincronizar cuando cambia el valor controlado externamente
  useEffect(() => {
    setInternalValue(searchValue ?? "");
  }, [searchValue]);

  // Limpiar timer al desmontar
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleChange = (v: string) => {
    setInternalValue(v);
    if (typeof onSearchChange === "function") {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onSearchChange(v);
      }, Math.max(0, searchDebounceMs));
    }
  };

  return (
    <div
      className={[
        "w-full flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      role="region"
      aria-label="Barra de herramientas"
    >
      {/* Buscador ocupa toda la fila en móvil */}
      {typeof onSearchChange === "function" ? (
        <div className="w-full sm:flex-1 sm:min-w-0 order-1 sm:order-none">
          <Input
            value={internalValue}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="w-full sm:max-w-sm h-10 text-base sm:text-sm"
          />
        </div>
      ) : null}

      {/* Filtros y controles adicionales */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 order-2 sm:order-none">
        {children ? (
          <div className="flex flex-wrap items-center gap-2">{children}</div>
        ) : (
          <span className="sr-only">Sin filtros adicionales</span>
        )}

        <div className="flex items-center gap-2">{right}</div>
      </div>
    </div>
  );
}

export default Toolbar;