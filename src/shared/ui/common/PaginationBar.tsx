import React from 'react';
import { cn } from '@/shared/ui/cn.ts';

export interface PaginationBarProps {
  page: number;
  pages: number;
  onPageChange: (page: number) => void;
  // Compatibilidad retro: algunas páginas pasan estos props aunque no son necesarios para el render
  pageSize?: number;
  total?: number;
  showNumbers?: boolean;
  boundaryCount?: number;
  siblingCount?: number;
  fixedBottom?: boolean; // fijo en escritorio para que siempre sea visible
  containerClassName?: string;
  innerClassName?: string;
}

export const PaginationBar: React.FC<PaginationBarProps> = ({
  page,
  pages,
  onPageChange,
  pageSize: _pageSize, // no usado, mantenido por compatibilidad
  total: _total, // no usado, mantenido por compatibilidad
  showNumbers = true,
  boundaryCount = 1,
  siblingCount = 1,
  fixedBottom = true,
  containerClassName,
  innerClassName,
}) => {
  const canPrev = page > 1;
  const canNext = page < pages;

  const goTo = (p: number) => {
    if (p >= 1 && p <= pages && p !== page) onPageChange(p);
  };

  // Render de números de página
  const makePageNumbers = () => {
    if (!showNumbers) return null;

    const start = Math.max(1, page - siblingCount);
    const end = Math.min(pages, page + siblingCount);

    const numbers: React.ReactNode[] = [];

    // Primeros límites
    for (let i = 1; i <= Math.min(boundaryCount, pages); i++) {
      if (i < start) {
        numbers.push(
          <button
            key={i}
            onClick={() => goTo(i)}
            className="px-3 py-2 min-w-[40px] border border-border text-sm text-foreground rounded-md hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
            aria-label={`Ir a la página ${i}`}
          >
            {i}
          </button>
        );
      }
    }

    if (start > boundaryCount + 1) {
      numbers.push(
        <span key="start-ellipsis" aria-hidden className="px-2 py-2 text-sm text-muted-foreground">
          ...
        </span>
      );
    }

    for (let i = start; i <= end; i++) {
      numbers.push(
        <button
          key={i}
          onClick={() => goTo(i)}
          className={cn(
            'px-3 py-2 min-w-[40px] border rounded-md text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring',
            i === page
              ? 'bg-background text-foreground border-transparent ring-2 ring-[#3b82f6] shadow-sm'
              : 'border-border text-foreground hover:bg-muted'
          )}
          aria-current={i === page ? 'page' : undefined}
          aria-label={`Ir a la página ${i}`}
        >
          {i}
        </button>
      );
    }

    if (end < pages - boundaryCount) {
      numbers.push(
        <span key="end-ellipsis" aria-hidden className="px-2 py-2 text-sm text-muted-foreground">
          ...
        </span>
      );
    }

    for (let i = Math.max(pages - boundaryCount + 1, end + 1); i <= pages; i++) {
      numbers.push(
        <button
          key={i}
          onClick={() => goTo(i)}
          className="px-3 py-2 min-w-[40px] border border-border text-sm text-foreground rounded-md hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
          aria-label={`Ir a la página ${i}`}
        >
          {i}
        </button>
      );
    }

    return <div className="flex items-center gap-1">{numbers}</div>;
  };

  const content = (
    <div className="bg-card shadow-lg rounded-lg border border-border p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => goTo(page - 1)}
            disabled={!canPrev}
            className="px-3 py-2 border border-border text-foreground rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
            aria-label="Página anterior"
          >
            ← Anterior
          </button>

          {makePageNumbers()}

          <button
            onClick={() => goTo(page + 1)}
            disabled={!canNext}
            className="px-3 py-2 border border-border text-foreground rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
            aria-label="Página siguiente"
          >
            Siguiente →
          </button>
        </div>

        <div className="text-sm text-muted-foreground">Página {page} de {Math.max(pages, 1)}</div>
      </div>
    </div>
  );

  if (!fixedBottom) return content;

  return (
    <>
      {/* Spacer interno para reservar el alto de la barra fija en sm+ sin tocar el body */}
      <div className="hidden sm:block h-20" aria-hidden="true" />

      <div
        className={cn(
          'sm:fixed sm:bottom-0 sm:left-[var(--sidebar-width,0px)] sm:right-0 z-[9999] bg-background/95 backdrop-blur-sm border-t border-border shadow-lg',
          containerClassName
        )}
      >
        <div className={cn('max-w-7xl mx-auto px-3 py-3 sm:px-6 sm:py-4', innerClassName)}>{content}</div>
      </div>
    </>
  );
};