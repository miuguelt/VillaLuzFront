/*
 * CRUDTable
 * 
 * Componente optimizado para renderizar tablas con gran volumen de datos.
 * Implementa virtualización, memoización y animaciones simplificadas.
 */

import React, { memo, useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Eye, Edit, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/ui/cn.ts';
import { useT } from '@/shared/i18n';

// Interfaces
import { CRUDColumn, CRUDConfig } from '../AdminCRUDPage';

interface CRUDTableProps<T extends { id: number }> {
  items: T[];
  columns: CRUDColumn<T>[];
  config: CRUDConfig<T, any>;
  onOpenDetail?: (item: T) => void;
  onOpenEdit?: (item: T) => void;
  onOpenDelete?: (id: number) => void;
  enhancedHover?: boolean;
  refreshing?: boolean;
}

// Componente memoizado para cada fila
const TableRow = memo(<T extends { id: number }>({
  item,
  index,
  columns,
  config,
  onOpenDetail,
  onOpenEdit,
  onOpenDelete,
  enhancedHover,
  fkLabelMap,
  deletingItems,
}: {
  item: T;
  index: number;
  columns: CRUDColumn<T>[];
  config: CRUDConfig<T, any>;
  onOpenDetail?: (item: T) => void;
  onOpenEdit?: (item: T) => void;
  onOpenDelete?: (id: number) => void;
  enhancedHover?: boolean;
  fkLabelMap: Record<string, Map<string, string>>;
  deletingItems: Set<string>;
}) => {
  const t = useT();
  
  const isDeleting = deletingItems.has(String(item.id));
  
  const handleClick = useCallback(() => {
    if (onOpenDetail) {
      onOpenDetail(item);
    }
  }, [onOpenDetail, item]);
  
  const handleEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenEdit) {
      onOpenEdit(item);
    }
  }, [onOpenEdit, item]);
  
  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenDelete) {
      onOpenDelete(item.id);
    }
  }, [onOpenDelete, item]);
  
  return (
    <tr
      className={cn(
        "h-10 md:h-12 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-muted/50",
        "transition-all duration-300 relative overflow-visible",
        enhancedHover ? "hover:bg-muted/40" : "hover:bg-muted/40",
        isDeleting && "opacity-50 bg-red-50 dark:bg-red-950/20"
      )}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        const target = e.target as HTMLElement | null;
        const isTypingTarget = !!target?.closest(
          'input, textarea, select, [contenteditable="true"]'
        );
        if (isTypingTarget) {
          return;
        }
        if (e.key === 'Enter' || e.key === ' ' || (e as any).keyCode === 13) {
          e.preventDefault();
          if (onOpenDetail) {
            onOpenDetail(item);
          }
        }
      }}
      data-item-id={item.id}
    >
      {columns.map((col) => (
        <td
          key={String(col.key)}
          className={cn(
            "px-2 sm:px-3 py-2 whitespace-nowrap text-[11px] md:text-sm",
            col.width ? `w-${col.width}` : '',
            "truncate max-w-[120px] sm:max-w-[180px] md:max-w-[240px]"
          )}
          title={col.render ? undefined : (fkLabelMap[String(col.key)]?.get(String((item as any)[col.key])) ?? String((item as any)[col.key] ?? ''))}
        >
          {col.render
            ? col.render((item as any)[col.key], item, index)
            : (() => {
                const raw = (item as any)[col.key];
                const mapped = fkLabelMap[String(col.key)]?.get(String(raw));
                return mapped ?? String(raw ?? '-');
              })()}
        </td>
      ))}
      
      {(config.enableDetailModal !== false || config.enableEditModal !== false || config.enableDelete || config.customActions) && (
        <td className="px-2 sm:px-3 py-2 whitespace-nowrap text-[11px] md:text-xs font-medium" 
            onClick={(e) => e.stopPropagation()} 
            onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap">
            {config.enableDetailModal !== false && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 sm:h-9 sm:w-9 p-0 border border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-700 dark:hover:text-blue-300 transition-all duration-200 rounded-lg"
                onClick={handleClick}
                aria-label={`${t('common.view', 'Ver')} ${config.entityName.toLowerCase()} ${item.id}`}
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
            {config.enableEditModal !== false && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 sm:h-9 sm:w-9 p-0 border border-amber-200 dark:border-amber-800 hover:border-amber-400 dark:hover:border-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 hover:text-amber-700 dark:hover:text-amber-300 transition-all duration-200 rounded-lg"
                onClick={handleEdit}
                aria-label={`${t('common.edit', 'Editar')} ${config.entityName.toLowerCase()} ${item.id}`}
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            {config.enableDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 sm:h-9 sm:w-9 p-0 border border-red-200 dark:border-red-800 hover:border-red-400 dark:hover:border-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-700 dark:hover:text-red-300 transition-all duration-200 rounded-lg"
                onClick={handleDelete}
                disabled={isDeleting}
                aria-label={`${t('common.delete', 'Eliminar')} ${config.entityName.toLowerCase()} ${item.id}`}
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            )}
            {config.customActions && config.customActions(item)}
          </div>
        </td>
      )}
    </tr>
  );
});

// Componente para renderizar la tabla virtualizada
const VirtualizedTable = memo(<T extends { id: number }>({
  items,
  columns,
  config,
  onOpenDetail,
  onOpenEdit,
  onOpenDelete,
  enhancedHover,
  fkLabelMap,
  deletingItems,
}: {
  items: T[];
  columns: CRUDColumn<T>[];
  config: CRUDConfig<T, any>;
  onOpenDetail?: (item: T) => void;
  onOpenEdit?: (item: T) => void;
  onOpenDelete?: (id: number) => void;
  enhancedHover?: boolean;
  fkLabelMap: Record<string, Map<string, string>>;
  deletingItems: Set<string>;
}) => {
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = items[index];
    
    return (
      <div style={style}>
        <table className="min-w-full divide-y divide-border/70 text-[12px] md:text-sm shadow-sm rounded-lg overflow-hidden">
          <tbody className="divide-y divide-border/60 bg-card">
            <TableRow
              item={item}
              index={index}
              columns={columns}
              config={config}
              onOpenDetail={onOpenDetail}
              onOpenEdit={onOpenEdit}
              onOpenDelete={onOpenDelete}
              enhancedHover={enhancedHover}
              fkLabelMap={fkLabelMap}
              deletingItems={deletingItems}
            />
          </tbody>
        </table>
      </div>
    );
  }, [items, columns, config, onOpenDetail, onOpenEdit, onOpenDelete, enhancedHover, fkLabelMap, deletingItems]);
  
  return (
    <List
      height={400}
      itemCount={items.length}
      itemSize={48}
      overscanCount={5}
    >
      {Row}
    </List>
  );
});

// Componente para renderizar la tabla tradicional
const TraditionalTable = memo(<T extends { id: number }>({
  items,
  columns,
  config,
  onOpenDetail,
  onOpenEdit,
  onOpenDelete,
  enhancedHover,
  fkLabelMap,
  deletingItems,
}: {
  items: T[];
  columns: CRUDColumn<T>[];
  config: CRUDConfig<T, any>;
  onOpenDetail?: (item: T) => void;
  onOpenEdit?: (item: T) => void;
  onOpenDelete?: (id: number) => void;
  enhancedHover?: boolean;
  fkLabelMap: Record<string, Map<string, string>>;
  deletingItems: Set<string>;
}) => {
  return (
    <table className="min-w-full divide-y divide-border/70 text-[12px] md:text-sm shadow-sm rounded-lg overflow-hidden">
      <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm supports-[backdrop-filter]:bg-muted/60 border-b border-border/50">
        <tr className="h-10">
          {columns.map((col) => (
            <th
              key={String(col.key)}
              className={cn(
                "px-2 sm:px-3 py-2 text-left text-[10px] sm:text-[11px] md:text-xs font-semibold text-muted-foreground uppercase tracking-wider",
                col.width ? `w-${col.width}` : '',
                "truncate"
              )}
            >
              {col.label}
            </th>
          ))}
          {(config.enableDelete || config.customActions) && (
            <th className="px-1 sm:px-2 py-1 text-left text-[10px] sm:text-[11px] md:text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <span className="hidden sm:inline">Acciones</span>
              <span className="sm:hidden">Acc.</span>
            </th>
          )}
        </tr>
      </thead>
      <tbody className="divide-y divide-border/60 bg-card">
        {items.map((item, index) => (
          <TableRow
            key={item.id}
            item={item}
            index={index}
            columns={columns}
            config={config}
            onOpenDetail={onOpenDetail}
            onOpenEdit={onOpenEdit}
            onOpenDelete={onOpenDelete}
            enhancedHover={enhancedHover}
            fkLabelMap={fkLabelMap}
            deletingItems={deletingItems}
          />
        ))}
      </tbody>
    </table>
  );
});

export function CRUDTable<T extends { id: number }>({
  items,
  columns,
  config,
  onOpenDetail,
  onOpenEdit,
  onOpenDelete,
  enhancedHover = false,
  refreshing = false,
}: CRUDTableProps<T>) {
  // Mapa de etiquetas para llaves foráneas
  const fkLabelMap = useMemo(() => {
    const map: Record<string, Map<string, string>> = {};
    try {
      (config.formSections || []).forEach((section) => {
        (section.fields || []).forEach((field) => {
          if ((field.type === 'select' || field.type === 'searchable-select') && field.options && field.options.length) {
            const m = new Map<string, string>();
            field.options.forEach((opt) => {
              m.set(String(opt.value), opt.label);
            });
            map[String(field.name)] = m;
          }
        });
      });
    } catch (e) {
      console.warn('[CRUDTable] Error construyendo mapa de etiquetas', e);
    }
    return map;
  }, [config.formSections]);
  
  // Items en proceso de eliminación
  const deletingItems = useMemo(() => new Set<string>(), []);
  
  // Determinar si usar virtualización
  const useVirtualization = items.length > 100;
  
  return (
    <div className={cn(
      "overflow-x-auto overflow-y-auto flex-1 bg-muted/40",
      refreshing && "opacity-70"
    )}>
      {config.viewMode === 'cards' ? (
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((item) => {
            const firstCol = columns[0];
            const rawTitle = (item as any)[firstCol?.key];
            const mappedTitle = fkLabelMap[String(firstCol?.key)]?.get(String(rawTitle));
            const titleText = mappedTitle ?? String(rawTitle ?? `${config.entityName} #${item.id}`);
            
            return (
              <div
                key={item.id}
                className="bg-card border border-border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer"
                onClick={() => onOpenDetail?.(item)}
              >
                <h3 className="font-medium text-sm mb-2 truncate">{titleText}</h3>
                <div className="text-xs text-muted-foreground space-y-1">
                  {columns.slice(1, 3).map((col) => {
                    const raw = (item as any)[col.key];
                    const mapped = fkLabelMap[String(col.key)]?.get(String(raw));
                    return (
                      <div key={String(col.key)}>
                        <span className="font-medium">{col.label}:</span>{' '}
                        <span>{mapped ?? String(raw ?? '-')}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-end gap-2 mt-3">
                  {config.enableDetailModal !== false && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenDetail?.(item);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  {config.enableEditModal !== false && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenEdit?.(item);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  {config.enableDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenDelete?.(item.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : useVirtualization ? (
        <VirtualizedTable
          items={items}
          columns={columns}
          config={config}
          onOpenDetail={onOpenDetail}
          onOpenEdit={onOpenEdit}
          onOpenDelete={onOpenDelete}
          enhancedHover={enhancedHover}
          fkLabelMap={fkLabelMap}
          deletingItems={deletingItems}
        />
      ) : (
        <TraditionalTable
          items={items}
          columns={columns}
          config={config}
          onOpenDetail={onOpenDetail}
          onOpenEdit={onOpenEdit}
          onOpenDelete={onOpenDelete}
          enhancedHover={enhancedHover}
          fkLabelMap={fkLabelMap}
          deletingItems={deletingItems}
        />
      )}
    </div>
  );
}

export default CRUDTable;
