import { cn } from "@/lib/utils";

export type PageSize = 5 | 10 | 25 | 50;

export type PaginationBarProps = {
  page: number;
  totalPages: number;
  pageSize: number;
  totalItems?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: PageSize) => void;
  className?: string;
  pageWindow?: number; // how many page numbers to show
  // Nuevo: barra fija inferior para que siempre sea visible
  fixedBottom?: boolean; // por defecto true (especialmente útil en PC)
  containerClassName?: string;
  innerClassName?: string;
};

export function ResultInfo({
  page,
  pageSize,
  totalItems,
  className,
}: {
  page: number;
  pageSize: number;
  totalItems?: number;
  className?: string;
}) {
  if (!totalItems || totalItems <= 0) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);
  return (
    <div className={cn("text-sm text-muted-foreground", className)}>
      Mostrando {start} a {end} de {totalItems.toLocaleString()} resultados
    </div>
  );
}

export function PageSizeSelect({
  value,
  onChange,
  className,
  options = [5, 10, 25, 50] as PageSize[],
}: {
  value: number;
  onChange?: (size: PageSize) => void;
  className?: string;
  options?: PageSize[];
}) {
  if (!onChange) return null;
  return (
    <div className={cn("flex items-center gap-2 text-sm text-foreground", className)}>
      <span>Mostrar:</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value) as PageSize)}
        className="border border-input rounded-md px-2 py-1 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
        aria-label="Seleccionar número de elementos por página"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
      <span>por página</span>
    </div>
  );
}

export function PaginationBar({
  page,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  className,
  pageWindow = 5,
  fixedBottom = true,
  containerClassName,
  innerClassName,
}: PaginationBarProps) {
  const canPrev = page > 1;
  const canNext = page < totalPages;

  const startPage = Math.max(1, page - Math.floor(pageWindow / 2));
  const endPage = Math.min(totalPages, startPage + pageWindow - 1);

  const goTo = (p: number) => {
    if (p >= 1 && p <= totalPages && p !== page) onPageChange(p);
  };

  const content = (
    <div className={cn("bg-card shadow-lg rounded-lg border border-border p-4", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageSizeSelect value={pageSize} onChange={onPageSizeChange} />

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => goTo(page - 1)}
            disabled={!canPrev}
            className="px-3 py-2 border border-border text-foreground rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
            aria-label="Página anterior"
          >
            ← Anterior
          </button>

          <div className="flex items-center gap-1">
            {startPage > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => goTo(1)}
                  className="px-3 py-2 min-w-[40px] border border-border text-sm text-foreground rounded-md hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                  aria-label="Primera página"
                >
                  1
                </button>
                {startPage > 2 && (
                  <span aria-hidden className="px-2 py-2 text-sm text-muted-foreground">
                    ...
                  </span>
                )}
              </>
            )}

            {Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map((p) => (
              <button
                type="button"
                key={p}
                onClick={() => goTo(p)}
                className={cn(
                  "px-3 py-2 min-w-[40px] border rounded-md text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring",
                  p === page
                    ? "bg-background text-foreground border-transparent ring-2 ring-[#3b82f6] shadow-sm"
                    : "border-border text-foreground hover:bg-muted"
                )}
                aria-label={`Ir a la página ${p}`}
                aria-current={p === page ? "page" : undefined}
              >
                {p}
              </button>
            ))}

            {endPage < totalPages && (
              <>
                {endPage < totalPages - 1 && (
                  <span aria-hidden className="px-2 py-2 text-sm text-muted-foreground">
                    ...
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => goTo(totalPages)}
                  className="px-3 py-2 min-w-[40px] border border-border text-sm text-foreground rounded-md hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                  aria-label="Última página"
                >
                  {totalPages}
                </button>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => goTo(page + 1)}
            disabled={!canNext}
            className="px-3 py-2 border border-border text-foreground rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
            aria-label="Página siguiente"
          >
            Siguiente →
          </button>
        </div>

        <div className="text-sm text-muted-foreground">
          Página {page} de {Math.max(totalPages, 1)}
          {typeof totalItems === "number" && totalItems >= 0 ? (
            <span className="ml-2 text-muted-foreground">({totalItems.toLocaleString()} totales)</span>
          ) : null}
        </div>
      </div>
    </div>
  );

  if (!fixedBottom) return content;

  return (
    <>
      {/* Espaciador fantasma solo en sm+ para que el contenido no quede tapado */}
      <div className="hidden sm:block sm:h-20" aria-hidden />
      <div
        className={cn(
          "sm:fixed sm:bottom-0 sm:left-0 sm:right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border shadow-lg",
          containerClassName
        )}
      >
        <div className={cn("max-w-7xl mx-auto px-3 py-3 sm:px-6 sm:py-4", innerClassName)}>
          {content}
        </div>
      </div>
    </>
  );
}

export default PaginationBar;