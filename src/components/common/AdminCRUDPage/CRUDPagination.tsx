/*
 * CRUDPagination
 * 
 * Componente optimizado para la paginación de tablas.
 * Implementa navegación eficiente y accesible.
 */

import React, { memo, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/cn.ts';
import { useT } from '@/i18n';

interface CRUDPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
}

export const CRUDPagination = memo<CRUDPaginationProps>(({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
  loading = false,
}) => {
  const t = useT();
  
  // Manejar cambio de página
  const handlePageChange = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage && !loading) {
      onPageChange(page);
    }
  }, [currentPage, totalPages, loading, onPageChange]);
  
  // Generar array de páginas a mostrar
  const getVisiblePages = useCallback(() => {
    const delta = 2; // Número de páginas a mostrar antes y después de la actual
    
    // Caso especial: menos de 7 páginas totales
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    // Caso normal: mostrar páginas alrededor de la actual
    const range = [];
    const rangeWithDots = [];
    let l;

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 || // Primera página
        i === totalPages || // Última página
        (i >= currentPage - delta && i <= currentPage + delta) // Páginas alrededor de la actual
      ) {
        range.push(i);
      }
    }

    // Agregar puntos suspensivos donde haya saltos
    range.forEach((i) => {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    });

    return rangeWithDots;
  }, [currentPage, totalPages]);
  
  const visiblePages = getVisiblePages();
  
  return (
    <div className="sticky bottom-0 z-10 bg-card/95 border-t backdrop-blur-sm shadow-sm flex-shrink-0">
      <div className="px-2 py-1.5 sm:py-2">
        <div className="flex justify-between items-center text-[11px] sm:text-[12px] md:text-sm gap-2">
          {/* Información de paginación */}
          <div className="text-muted-foreground">
            <span className="hidden sm:inline">{t('common.page', 'Página')} </span>
            <span className="sm:hidden">Pág. </span>
            {currentPage} <span className="hidden sm:inline">{t('common.of', 'de')}</span><span className="sm:hidden">/</span> {Math.max(totalPages, 1)}
            <span className="ml-2 hidden sm:inline">
              ({totalItems} {totalItems === 1 ? 'registro' : 'registros'})
            </span>
          </div>
          
          {/* Controles de paginación */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Botón anterior */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={loading || currentPage <= 1}
              aria-label={t('common.previous', 'Anterior')}
              className="inline-flex items-center justify-center h-7 w-7 sm:h-9 sm:w-9 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            >
              <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
            </Button>
            
            {/* Números de página */}
            <div className="hidden sm:flex items-center gap-1">
              {visiblePages.map((page, index) => (
                <React.Fragment key={index}>
                  {page === '...' ? (
                    <span className="px-2 py-1 text-muted-foreground">...</span>
                  ) : (
                    <Button
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(page as number)}
                      disabled={loading}
                      className={cn(
                        "h-7 w-7 sm:h-9 sm:w-9 text-sm font-medium",
                        currentPage === page && "bg-primary text-primary-foreground"
                      )}
                    >
                      {page}
                    </Button>
                  )}
                </React.Fragment>
              ))}
            </div>
            
            {/* Paginación simplificada para móviles */}
            <div className="sm:hidden text-xs text-muted-foreground">
              {currentPage} / {totalPages}
            </div>
            
            {/* Botón siguiente */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={loading || currentPage >= totalPages}
              aria-label={t('common.next', 'Siguiente')}
              className="inline-flex items-center justify-center h-7 w-7 sm:h-9 sm:w-9 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            >
              <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});

CRUDPagination.displayName = 'CRUDPagination';

export default CRUDPagination;
