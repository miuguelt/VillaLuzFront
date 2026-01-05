import React from 'react';
import { cn } from '@/shared/ui/cn.ts';
import { AlertCircle, CheckCircle, Info, Loader2 } from 'lucide-react';

interface TreeStatusIndicatorProps {
  counts?: { nodes: number; edges: number };
  depth: number;
  maxDepth?: number;
  isLoading?: boolean;
  hasError?: boolean;
  dependencyInfo?: {
    has_parents?: boolean;
    has_children?: boolean;
    father_id?: number;
    mother_id?: number;
    children_as_father?: number;
    children_as_mother?: number;
    total_children?: number;
  };
  type: 'ancestors' | 'descendants';
  className?: string;
}

export const TreeStatusIndicator: React.FC<TreeStatusIndicatorProps> = ({
  counts,
  depth,
  maxDepth,
  isLoading,
  hasError,
  dependencyInfo,
  type,
  className
}) => {
  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Cargando información genealógica...</span>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className={cn("flex items-center gap-2 text-sm text-red-600", className)}>
        <AlertCircle className="w-4 h-4" />
        <span>Error al cargar el árbol</span>
      </div>
    );
  }

  if (!counts || counts.nodes === 0) {
    return (
      <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
        <Info className="w-4 h-4" />
        <span>Sin datos genealógicos disponibles</span>
      </div>
    );
  }

  // Caso especial: solo la raíz sin relaciones
  if (counts.nodes === 1 && counts.edges === 0) {
    return (
      <div className={cn("flex items-center gap-2 text-sm text-yellow-600", className)}>
        <AlertCircle className="w-4 h-4" />
        <span>
          {type === 'ancestors' 
            ? 'Este animal no tiene padres registrados' 
            : 'Este animal no tiene hijos registrados'}
        </span>
      </div>
    );
  }

  // Estado normal con datos
  const hasMoreLevels = maxDepth ? depth < maxDepth : false;
  const hasRelations = counts.edges > 0;

  return (
    <div className={cn("flex items-center gap-4 text-sm", className)}>
      <div className="flex items-center gap-2">
        {hasRelations ? (
          <CheckCircle className="w-4 h-4 text-green-600" />
        ) : (
          <Info className="w-4 h-4 text-blue-600" />
        )}
        <span className="text-foreground">
          {counts.nodes} {counts.nodes === 1 ? 'nodo' : 'nodos'}
        </span>
        {hasRelations && (
          <span className="text-muted-foreground">
            · {counts.edges} {counts.edges === 1 ? 'relación' : 'relaciones'}
          </span>
        )}
      </div>

      <div className="text-muted-foreground">
        Profundidad: {depth}
        {maxDepth && `/${maxDepth}`}
      </div>

      {hasMoreLevels && (
        <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
          Hay más niveles disponibles
        </div>
      )}

      {/* Información adicional de dependencias */}
      {dependencyInfo && (
        <div className="text-xs text-muted-foreground">
          {type === 'ancestors' ? (
            <span>
              Padre: {dependencyInfo.father_id ? `ID ${dependencyInfo.father_id}` : 'No'} · 
              Madre: {dependencyInfo.mother_id ? `ID ${dependencyInfo.mother_id}` : 'No'}
            </span>
          ) : (
            <span>
              Hijos: {dependencyInfo.total_children || 0}
              {dependencyInfo.children_as_father && ` (${dependencyInfo.children_as_father} como padre)`}
              {dependencyInfo.children_as_mother && ` (${dependencyInfo.children_as_mother} como madre)`}
            </span>
          )}
        </div>
      )}
    </div>
  );
};