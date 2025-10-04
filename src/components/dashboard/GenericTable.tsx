
import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, ChevronLeft, ChevronRight, Eye, Edit, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSearchParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import SkeletonTable from "@/components/feedback/SkeletonTable";

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

  React.useEffect(() => {
    setSearchInput(search);
  }, [search]);

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

  // Lógica de virtualización
  const needsVirtualization = enableVirtualization && data.length > 20;
  const totalHeight = data.length * virtualizationRowHeight;
  const containerHeight = Math.min(virtualizationHeight, totalHeight);

  const [scrollTop, setScrollTop] = React.useState(0);
  const startIndex = needsVirtualization ? Math.floor(scrollTop / virtualizationRowHeight) : 0;
  const endIndex = needsVirtualization 
    ? Math.min(startIndex + Math.ceil(containerHeight / virtualizationRowHeight) + virtualizationOverscan, data.length)
    : data.length;

  const slice = data.slice(Math.max(0, startIndex - virtualizationOverscan), endIndex);
  const topPadding = Math.max(0, startIndex - virtualizationOverscan) * virtualizationRowHeight;
  const bottomPadding = Math.max(0, data.length - endIndex) * virtualizationRowHeight;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  // Cálculo de paginación
  const totalItems = meta?.total ?? meta?.totalItems ?? data.length;
  const totalPages = meta?.totalPages ?? Math.ceil(totalItems / limit);
  const hasNextPage = meta?.hasNextPage ?? page < totalPages;
  const hasPreviousPage = meta?.hasPreviousPage ?? page > 1;

  if (loading) {
    return (
      <div className="space-y-4">
        {enableSearchBar && (
          <div className="flex items-center space-x-2">
            <Input
              placeholder="Buscar..."
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="max-w-sm"
              disabled
            />
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
        <div className="flex items-center space-x-2 flex-shrink-0">
          <Input
            placeholder="Buscar..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="max-w-sm"
          />
        </div>
      )}

      <div
        className={`relative border rounded-md flex-1 min-h-0 overflow-auto`}
        onScroll={needsVirtualization ? handleScroll : undefined}
      >
        {refreshing && data.length > 0 && (
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
              data.map((item: any) => (
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

      {/* Paginación */}
      {meta && totalPages > 1 && (
        <div className="flex items-center justify-between flex-shrink-0 py-2 px-3 bg-white border-t">
          <div className="text-sm text-muted-foreground">
            Página {page} de {totalPages} ({totalItems} registros)
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page - 1)}
              disabled={!hasPreviousPage}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page + 1)}
              disabled={!hasNextPage}
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}) as <T>(props: GenericTableProps<T>) => JSX.Element;

export default GenericTable;
