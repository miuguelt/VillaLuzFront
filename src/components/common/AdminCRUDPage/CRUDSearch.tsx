/*
 * CRUDSearch
 * 
 * Componente optimizado para la búsqueda en tablas.
 * Implementa debouncing eficiente y mejor experiencia de usuario.
 */

import React, { memo, useCallback, useEffect, useRef } from 'react';
import { Search, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/cn.ts';

interface CRUDSearchProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchPlaceholder?: string;
  onOpenCreate?: () => void;
  customToolbar?: React.ReactNode;
}

export const CRUDSearch = memo<CRUDSearchProps>(({
  searchQuery,
  setSearchQuery,
  searchPlaceholder,
  onOpenCreate,
  customToolbar,
}) => {
  // Referencia para el timeout de debounce
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Manejar cambio de búsqueda con debounce
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    
    // Limpiar timeout anterior
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    // No se necesita debounce aquí ya que se maneja en el componente padre
  }, [setSearchQuery]);
  
  // Limpiar timeout al desmontar
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);
  
  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground h-3.5 w-3.5" />
        <Input
          placeholder={searchPlaceholder || 'Buscar...'}
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-7 w-44 sm:w-56 h-7 text-xs sm:text-sm"
        />
      </div>
      <Button
        size="sm"
        className="h-7 w-7 p-0"
        onClick={() => handleSearchChange(searchQuery)}
        aria-label="Buscar"
      >
        <Search className="h-4 w-4" />
      </Button>
      {onOpenCreate && (
        <Button
          size="sm"
          className="h-7 w-7 p-0"
          onClick={onOpenCreate}
          aria-label="Crear nuevo registro"
        >
          <Plus className="h-4 w-4" />
        </Button>
      )}
      {customToolbar}
    </div>
  );
});

CRUDSearch.displayName = 'CRUDSearch';

export default CRUDSearch;