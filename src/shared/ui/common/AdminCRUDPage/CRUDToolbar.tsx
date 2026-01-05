/*
 * CRUDToolbar
 * 
 * Componente optimizado para la barra de herramientas de CRUD.
 * Implementa búsqueda eficiente y acciones principales.
 */

import React, { memo, useCallback } from 'react';
import { Search, Plus } from 'lucide-react';
import { Input } from '@/shared/ui/input';
import { Button } from '@/shared/ui/button';

interface CRUDToolbarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchPlaceholder?: string;
  onOpenCreate?: () => void;
  customToolbar?: React.ReactNode;
}

export const CRUDToolbar = memo<CRUDToolbarProps>(({
  searchQuery,
  setSearchQuery,
  searchPlaceholder,
  onOpenCreate,
  customToolbar,
}) => {
  // Manejar cambio de búsqueda con debounce
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
  }, [setSearchQuery]);
  
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

CRUDToolbar.displayName = 'CRUDToolbar';

export default CRUDToolbar;
