/**
 * Indicador visual de sincronización de datos
 * Muestra el estado de sync y última actualización
 */

import React, { memo } from 'react';
import { RefreshCw, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/cn.ts';

interface DataSyncIndicatorProps {
  /**
   * Estado de sincronización
   */
  status: 'idle' | 'syncing' | 'success' | 'error';

  /**
   * Timestamp de última sincronización (ISO string)
   */
  lastSync?: string | null;

  /**
   * Número de cambios en última sincronización
   */
  changesCount?: number;

  /**
   * Callback para sincronizar manualmente
   */
  onSync?: () => void;

  /**
   * Mostrar en formato compacto
   */
  compact?: boolean;

  /**
   * Clase CSS adicional
   */
  className?: string;
}

/**
 * Formatea tiempo relativo (ej: "hace 2 minutos")
 */
function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 10) return 'ahora mismo';
  if (diffSec < 60) return `hace ${diffSec}s`;
  if (diffMin < 60) return `hace ${diffMin} min`;
  if (diffHour < 24) return `hace ${diffHour}h`;
  if (diffDay === 1) return 'ayer';
  return `hace ${diffDay} días`;
}

export const DataSyncIndicator = memo<DataSyncIndicatorProps>(({
  status,
  lastSync,
  changesCount = 0,
  onSync,
  compact = false,
  className,
}) => {
  // Renderizado compacto (solo icono)
  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        {status === 'syncing' && (
          <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
        )}
        {status === 'success' && (
          <CheckCircle className="h-4 w-4 text-green-500" />
        )}
        {status === 'error' && (
          <AlertCircle className="h-4 w-4 text-red-500" />
        )}
        {status === 'idle' && lastSync && (
          <Clock className="h-4 w-4 text-gray-400" />
        )}
      </div>
    );
  }

  // Renderizado completo
  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Estado */}
      <div className="flex items-center gap-2">
        {status === 'syncing' && (
          <>
            <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
            <span className="text-sm text-muted-foreground">Sincronizando...</span>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm text-muted-foreground">
              Sincronizado
              {changesCount > 0 && ` (${changesCount} cambios)`}
            </span>
          </>
        )}

        {status === 'error' && (
          <>
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm text-destructive">Error al sincronizar</span>
          </>
        )}

        {status === 'idle' && lastSync && (
          <>
            <Clock className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-muted-foreground">
              {formatRelativeTime(lastSync)}
            </span>
          </>
        )}
      </div>

      {/* Badge con contador de cambios */}
      {changesCount > 0 && status === 'success' && (
        <Badge variant="secondary" className="text-xs">
          +{changesCount}
        </Badge>
      )}

      {/* Botón de sync manual */}
      {onSync && status !== 'syncing' && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onSync}
          className="h-7 px-2"
          title="Sincronizar ahora"
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
});

DataSyncIndicator.displayName = 'DataSyncIndicator';

/**
 * Variante minimalista (solo badge)
 */
export const SyncBadge = memo<Pick<DataSyncIndicatorProps, 'status' | 'changesCount'>>(({
  status,
  changesCount = 0,
}) => {
  if (status === 'idle' && changesCount === 0) return null;

  return (
    <Badge
      variant={status === 'error' ? 'destructive' : status === 'syncing' ? 'default' : 'secondary'}
      className="flex items-center gap-1 text-xs"
    >
      {status === 'syncing' && <RefreshCw className="h-3 w-3 animate-spin" />}
      {status === 'success' && <CheckCircle className="h-3 w-3" />}
      {status === 'error' && <AlertCircle className="h-3 w-3" />}

      {status === 'syncing' && 'Sincronizando'}
      {status === 'success' && changesCount > 0 && `${changesCount} nuevos`}
      {status === 'success' && changesCount === 0 && 'Al día'}
      {status === 'error' && 'Error'}
    </Badge>
  );
});

SyncBadge.displayName = 'SyncBadge';
