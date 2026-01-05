import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/shared/ui/input';
import { Button } from '@/shared/ui/button';
import { Label } from '@/shared/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Separator } from '@/shared/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/ui/popover';
import {
  CalendarIcon,
  Search,
  Filter,
  X,
  SlidersHorizontal,
  Download
} from 'lucide-react';
import { Calendar } from '@/shared/ui/calendar';
import { format } from 'date-fns';
import { formatDateColombia } from '@/shared/utils/dateUtils';


export interface FilterOption {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'dateRange' | 'number';
  options?: { value: string; label: string }[];
  placeholder?: string;
}

export interface SearchFilters {
  [key: string]: any;
}

interface AdvancedSearchProps {
  onSearch: (query: string, filters: SearchFilters) => void;
  onExport?: () => void;
  filterOptions: FilterOption[];
  placeholder?: string;
  showExport?: boolean;
  className?: string;
  searchDebounceMs?: number;
}

const AdvancedSearch: React.FC<AdvancedSearchProps> = ({
  onSearch,
  onExport,
  filterOptions,
  placeholder = "Buscar...",
  showExport = false,
  className = "",
  searchDebounceMs = 300,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Actualizar filtros activos cuando cambian los filtros
  useEffect(() => {
    const active = Object.entries(filters)
      .filter(([_, value]) => value !== '' && value !== null && value !== undefined)
      .map(([key, _]) => key);
    setActiveFilters(active);
  }, [filters]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Manejar cambio en filtros
  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onSearch(searchQuery, newFilters);
  };

  // Limpiar un filtro específico
  const clearFilter = (key: string) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    setFilters(newFilters);
    onSearch(searchQuery, newFilters);
  };

  // Limpiar todos los filtros
  const clearAllFilters = () => {
    setFilters({});
    setSearchQuery('');
    onSearch('', {});
  };

  // Manejar búsqueda con debounce
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSearch(query, filters);
    }, Math.max(0, searchDebounceMs));
  };

  // Renderizar campo de filtro según su tipo
  const renderFilterField = (option: FilterOption) => {
    const value = filters[option.key] || '';

    switch (option.type) {
      case 'text':
        return (
          <Input
            placeholder={option.placeholder || `Filtrar por ${option.label.toLowerCase()}`}
            value={value}
            onChange={(e) => handleFilterChange(option.key, e.target.value)}
          />
        );

      case 'select':
        return (
          <Select
            value={value}
            onValueChange={(val) => handleFilterChange(option.key, val)}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Selecciona ${option.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              {option.options?.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'date':
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {value ? format(new Date(value), 'PPP') : 'Seleccionar fecha'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={value ? new Date(value) : undefined}
                onSelect={(date) => handleFilterChange(option.key, date ? formatDateColombia(date) : '')}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        );

      case 'number':
        return (
          <Input
            type="number"
            placeholder={option.placeholder || `Filtrar por ${option.label.toLowerCase()}`}
            value={value}
            onChange={(e) => handleFilterChange(option.key, e.target.value)}
          />
        );

      default:
        return null;
    }
  };

  const getFilterLabel = (key: string) => {
    const opt = filterOptions.find((o) => o.key === key);
    return opt?.label || key;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Barra de búsqueda principal */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filtros
          {activeFilters.length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {activeFilters.length}
            </Badge>
          )}
        </Button>
        
        {showExport && (
          <Button
            variant="outline"
            onClick={onExport}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Exportar
          </Button>
        )}
      </div>

      {/* Filtros activos */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-muted-foreground">Filtros activos:</span>
          {activeFilters.map((key) => (
            <Badge key={key} variant="secondary" className="flex items-center gap-1">
              {getFilterLabel(key)}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => clearFilter(key)}
              />
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-muted-foreground hover:text-destructive"
          >
            Limpiar todo
          </Button>
        </div>
      )}

      {/* Panel de filtros */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtros Avanzados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filterOptions.map((option) => (
                <div key={option.key} className="space-y-2">
                  <Label htmlFor={option.key}>{option.label}</Label>
                  {renderFilterField(option)}
                </div>
              ))}
            </div>
            
            {filterOptions.length > 0 && (
              <>
                <Separator className="my-4" />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={clearAllFilters}
                  >
                    Limpiar Filtros
                  </Button>
                  <Button
                    onClick={() => setShowFilters(false)}
                  >
                    Aplicar Filtros
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdvancedSearch;
