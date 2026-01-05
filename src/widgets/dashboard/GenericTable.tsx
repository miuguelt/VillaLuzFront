
import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption,
} from "@/shared/ui/table";
import { Button } from "@/shared/ui/button";
import { MoreHorizontal, ChevronLeft, ChevronRight, Eye, Edit, Trash2, Search } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { useSearchParams } from "react-router-dom";
import { Input } from "@/shared/ui/input";
import SkeletonTable from "@/widgets/feedback/SkeletonTable";
import { globalSearch, createSearchCache } from "@/shared/utils/globalSearch";
// import { PaginationBar } from "@/shared/ui/common"; // revertido: volvemos a controles previos

// Compatible meta: admite total o totalItems para distintos orígenes
interface CompatibleMeta {
  page: number;
  limit?: number;
  total?: number;
  totalItems?: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
}

interface GenericTableProps<T> {
  headers: string[];
  data: T[];
  columns: string[];
  keyValue: string;
  onEdit: (item: T) => void;
  onView?: (item: T) => void;
  onDelete?: (item: T) => void;
  // Opcionales: habilitar paginación y búsqueda controladas por URL
  meta?: CompatibleMeta | null;
  enableSearchBar?: boolean;
  // Performance
  searchDebounceMs?: number;
  enableVirtualization?: boolean;
  virtualizationRowHeight?: number; // px por fila
  virtualizationHeight?: number; // altura del viewport virtualizado
  virtualizationOverscan?: number; // filas extra arriba/abajo
  // Loading states (opcionales y retro-compatibles)
  loading?: boolean; // carga inicial
  refreshing?: boolean; // refresco suave, no bloqueante
  skeletonRows?: number; // filas del esqueleto en carga inicial
  skeletonColumnWidths?: Array<number | undefined>; // anchos opcionales del esqueleto
  // Nuevas opciones para botones elegantes
  showViewButton?: boolean;
  showEditButton?: boolean;
  showDeleteButton?: boolean;
  useDropdownActions?: boolean; // Para mantener compatibilidad con el dropdown anterior
  // Búsqueda global
  enableClientSideSearch?: boolean; // Habilitar búsqueda client-side global (default: false, usa server-side)
  searchPlaceholder?: string; // Placeholder personalizado para el input de búsqueda
}

const GenericTable = React.memo(<T,>({
  headers,
  data,
  columns,
  keyValue,
  onEdit,
  onView,
  onDelete,
  meta,
  enableSearchBar = false,
  searchDebounceMs = 300,
  enableVirtualization = true, // Ahora habilitado por defecto para mejor rendimiento
  virtualizationRowHeight = 44,
  virtualizationHeight = 480,
  virtualizationOverscan = 5,
  loading = false,
  refreshing = false,
  skeletonRows = 8,
  skeletonColumnWidths,
  showViewButton = true,
  showEditButton = true,
  showDeleteButton = false,
  useDropdownActions = false,
  enableClientSideSearch = false,
  searchPlaceholder = "Buscar...",
}: GenericTableProps<T>) => {
  //Metodo para evaluar si hay un punto en el valor y obtener el valor de un objeto anidado
  const getValue = (obj: any, path: string) => {
    return path.split(".").reduce((acc, part) => acc && acc[part], obj);
  };

  const formatValue = (val: any) => {
    if (val === null || val === undefined || val === "") return "-";
    if (typeof val === "boolean") return val ? "Sí" : "No";
    if (typeof val === "object") {
      if ("name" in val && typeof (val as any).name !== "object") return String((val as any).name);
      try { return JSON.stringify(val); } catch { return String(val); }
    }
    return String(val);
  };

  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get("page") || meta?.page || 1);
  const limit = Number(searchParams.get("limit") || meta?.limit || 10);
  const search = searchParams.get("search") || "";

  // Debounce para la barra de búsqueda
  const [searchInput, setSearchInput] = React.useState<string>(search);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cache para búsqueda client-side (optimización)
  const searchCacheRef = React.useRef(createSearchCache<T>());

  React.useEffect(() => {
    setSearchInput(search);
  }, [search]);

  // Filtrado client-side global (búsqueda en TODOS los campos)
  const filteredData = React.useMemo(() => {
    if (!enableClientSideSearch || !search.trim()) {
      return data;
    }

    // Usar globalSearch para buscar en todos los campos del objeto
    return globalSearch(data, search, {
      matchAll: false, // Modo OR: basta con que aparezca uno de los términos
      maxDepth: 3, // Buscar hasta 3 niveles de profundidad en objetos anidados
      cache: searchCacheRef.current,
    });
  }, [data, search, enableClientSideSearch]);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const newParams = new URLSearchParams(searchParams);
      if (value.trim()) {
        newParams.set("search", value.trim());
      } else {
        newParams.delete("search");
      }
      newParams.set("page", "1"); // Reset a página 1 al buscar
      setSearchParams(newParams);

      // Limpiar caché de búsqueda cuando cambia el query
      searchCacheRef.current.clear();
    }, searchDebounceMs);
  };

  const handlePageChange = (newPage: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("page", String(newPage));
    setSearchParams(newParams);
  };

  // Componente para renderizar botones de acción elegantes (memoizado)
  const ActionButtons = React.memo(({ item }: { item: T }) => {
    if (useDropdownActions) {
      // Mantener el dropdown original para compatibilidad
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-8 w-8 p-0 border" aria-label="Abrir menú de acciones" title="Abrir menú de acciones">
              <span className="sr-only">Abrir menú</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {showViewButton && onView && (
              <DropdownMenuItem onClick={() => onView(item)} className="hover:cursor-pointer">
                Ver detalles
              </DropdownMenuItem>
            )}
            {showEditButton && (
              <DropdownMenuItem onClick={() => onEdit(item)} className="hover:cursor-pointer">
                Editar
              </DropdownMenuItem>
            )}
            {showDeleteButton && onDelete && (
              <DropdownMenuItem onClick={() => onDelete(item)} className="hover:cursor-pointer text-red-600">
                Eliminar
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    // Botones elegantes con iconos
    return (
      <div className="flex items-center gap-1">
        {showViewButton && onView && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600 transition-colors"
            onClick={() => onView(item)}
            aria-label="Ver detalles"
            title="Ver detalles"
          >
            <Eye className="h-4 w-4" />
          </Button>
        )}
        {showEditButton && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-amber-50 hover:text-amber-600 transition-colors"
            onClick={() => onEdit(item)}
            aria-label="Editar"
            title="Editar"
          >
            <Edit className="h-4 w-4" />
          </Button>
        )}
        {showDeleteButton && onDelete && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600 transition-colors"
            onClick={() => onDelete(item)}
            aria-label="Eliminar"
            title="Eliminar"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }) as React.FC<{ item: T }>;

  // Lógica de virtualización (usar datos filtrados)
  const displayData = filteredData; // Usar datos filtrados por búsqueda global
  const needsVirtualization = enableVirtualization && displayData.length > 20;
  const totalHeight = displayData.length * virtualizationRowHeight;
  const containerHeight = Math.min(virtualizationHeight, totalHeight);

  const [scrollTop, setScrollTop] = React.useState(0);
  const startIndex = needsVirtualization ? Math.floor(scrollTop / virtualizationRowHeight) : 0;
  const endIndex = needsVirtualization
    ? Math.min(startIndex + Math.ceil(containerHeight / virtualizationRowHeight) + virtualizationOverscan, displayData.length)
    : displayData.length;

  const slice = displayData.slice(Math.max(0, startIndex - virtualizationOverscan), endIndex);
  const topPadding = Math.max(0, startIndex - virtualizationOverscan) * virtualizationRowHeight;
  const bottomPadding = Math.max(0, displayData.length - endIndex) * virtualizationRowHeight;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  // Cálculo de paginación (usar displayData para reflejar búsqueda client-side)
  const totalItems = enableClientSideSearch
    ? displayData.length
    : (meta?.total ?? meta?.totalItems ?? data.length);
  const totalPages = meta?.totalPages ?? Math.ceil(totalItems / limit);
  const hasNextPage = meta?.hasNextPage ?? page < totalPages;
  const hasPreviousPage = meta?.hasPreviousPage ?? page > 1;

  if (loading) {
    return (
      <div className="space-y-4">
        {enableSearchBar && (
          <div className="flex items-center space-x-2">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder={searchPlaceholder}
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
                disabled
              />
            </div>
          </div>
        )}
        <SkeletonTable 
          columnLabels={[...headers, 'Acciones']} 
          rows={skeletonRows} 
          columnWidths={skeletonColumnWidths}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-3">
      {enableSearchBar && (
        <div className="flex items-center justify-between space-x-2 flex-shrink-0">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder={searchPlaceholder}
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
          {enableClientSideSearch && search.trim() && (
            <div className="text-sm text-muted-foreground whitespace-nowrap">
              {displayData.length} de {data.length} registros
            </div>
          )}
        </div>
      )}

      <div
        className={`relative border rounded-md flex-1 min-h-0 overflow-auto`}
        onScroll={needsVirtualization ? handleScroll : undefined}
      >
        {refreshing && displayData.length > 0 && (
          <div
            className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-muted to-transparent animate-pulse"
            aria-hidden="true"
          />
        )}
        <Table aria-label="Tabla de datos genérica" aria-busy={refreshing || undefined} className={refreshing ? "opacity-95 transition-opacity" : undefined}>
          <TableCaption>Listado de registros</TableCaption>
          <TableHeader>
            <TableRow>
              {headers.map((header) => (
                <TableHead key={header} scope="col">{header}</TableHead>
              ))}
              <TableHead scope="col">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {needsVirtualization ? (
              <>
                {/* Espaciador superior */}
                {topPadding > 0 && (
                  <TableRow style={{ height: topPadding }} aria-hidden>
                    <TableCell colSpan={headers.length + 1} />
                  </TableRow>
                )}

                {slice.map((item: any) => (
                  <TableRow key={String((item as any)[keyValue])} style={{ height: virtualizationRowHeight }}>
                    {columns.map((column) => {
                      const raw = getValue(item, column);
                      return (
                        <TableCell key={`${(item as any)[keyValue]}-${column}`}>{formatValue(raw)}</TableCell>
                      );
                    })}
                    <TableCell>
                      <ActionButtons item={item} />
                    </TableCell>
                  </TableRow>
                ))}

                {/* Espaciador inferior */}
                {bottomPadding > 0 && (
                  <TableRow style={{ height: bottomPadding }} aria-hidden>
                    <TableCell colSpan={headers.length + 1} />
                  </TableRow>
                )}
              </>
            ) : (
              displayData.map((item: any) => (
                <TableRow key={String((item as any)[keyValue])}>
                  {columns.map((column) => {
                    const raw = getValue(item, column);
                    return (
                      <TableCell key={`${(item as any)[keyValue]}-${column}`}>{formatValue(raw)}</TableCell>
                    );
                  })}
                  <TableCell>
                    <ActionButtons item={item} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginación previa con botones y estilo original */}
      {meta && totalPages > 1 && (
        <div className="flex items-center justify-between mt-2">
          <div className="text-sm text-muted-foreground">
            Página {page} de {Math.max(totalPages, 1)}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={!hasPreviousPage}
              aria-label="Anterior"
              className="inline-flex items-center justify-center rounded-md border border-input bg-background h-8 w-8 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={!hasNextPage}
              aria-label="Siguiente"
              className="inline-flex items-center justify-center rounded-md border border-input bg-background h-8 w-8 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}) as <T>(props: GenericTableProps<T>) => JSX.Element;

export default GenericTable;
