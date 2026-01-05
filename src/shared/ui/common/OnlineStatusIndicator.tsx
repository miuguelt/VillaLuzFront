import React from 'react';
import { useOnlineStatus } from '@/shared/hooks/useOnlineStatus';
import { cn } from '@/shared/ui/cn';
import { Wifi, WifiOff, RefreshCw, AlertTriangle, CheckCircle2, Cloud } from 'lucide-react';
import { offlineQueue } from '@/shared/api/offline/offlineQueue';

export const OnlineStatusIndicator: React.FC = () => {
  const { isOnline, wasOffline, pendingOperations, syncStatus } = useOnlineStatus();
  const [isExpanded, setIsExpanded] = React.useState(false);

  // Mostrar automáticamente cuando hay cambios importantes
  React.useEffect(() => {
    if (!isOnline || pendingOperations > 0 || syncStatus.failed > 0) {
      setIsExpanded(true);
      // Auto-colapsar después de 10 segundos si está todo bien
      if (isOnline && pendingOperations === 0 && syncStatus.failed === 0) {
        const timer = setTimeout(() => setIsExpanded(false), 10000);
        return () => clearTimeout(timer);
      }
    }
  }, [isOnline, pendingOperations, syncStatus.failed]);

  const handleRetryFailed = async () => {
    await offlineQueue.retryFailedOperations();
  };

  const handleClearFailed = () => {
    offlineQueue.clearFailedOperations();
  };

  // Estado principal del indicador
  const getStatus = () => {
    if (!isOnline) {
      return {
        icon: WifiOff,
        color: 'text-orange-600 dark:text-orange-400',
        bgColor: 'bg-orange-100 dark:bg-orange-900/30',
        borderColor: 'border-orange-300 dark:border-orange-700',
        label: 'Sin conexión',
        description: pendingOperations > 0
          ? `${pendingOperations} operación(es) pendiente(s) de sincronizar`
          : 'Trabajando offline - Los cambios se sincronizarán automáticamente'
      };
    }

    if (syncStatus.syncing) {
      return {
        icon: RefreshCw,
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
        borderColor: 'border-blue-300 dark:border-blue-700',
        label: 'Sincronizando...',
        description: `Sincronizando ${syncStatus.pending} operación(es)`
      };
    }

    if (syncStatus.failed > 0) {
      return {
        icon: AlertTriangle,
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-100 dark:bg-red-900/30',
        borderColor: 'border-red-300 dark:border-red-700',
        label: 'Error de sincronización',
        description: `${syncStatus.failed} operación(es) fallida(s)`
      };
    }

    if (wasOffline && pendingOperations === 0) {
      return {
        icon: CheckCircle2,
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-100 dark:bg-green-900/30',
        borderColor: 'border-green-300 dark:border-green-700',
        label: 'Sincronizado',
        description: 'Todas las operaciones pendientes se sincronizaron correctamente'
      };
    }

    if (pendingOperations > 0) {
      return {
        icon: Cloud,
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
        borderColor: 'border-blue-300 dark:border-blue-700',
        label: 'Pendiente',
        description: `${pendingOperations} operación(es) esperando sincronización`
      };
    }

    // Todo bien, online sin operaciones pendientes
    return {
      icon: Wifi,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      borderColor: 'border-green-300 dark:border-green-700',
      label: 'En línea',
      description: 'Conectado y sincronizado'
    };
  };

  const status = getStatus();
  const StatusIcon = status.icon;

  // No mostrar si está todo perfecto y colapsado
  if (isOnline && pendingOperations === 0 && syncStatus.failed === 0 && !wasOffline && !isExpanded) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div
        className={cn(
          "rounded-lg border-2 shadow-lg backdrop-blur-sm transition-all duration-300",
          status.bgColor,
          status.borderColor,
          isExpanded ? "p-4" : "p-2"
        )}
      >
        {/* Header - siempre visible */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 w-full text-left"
        >
          <StatusIcon
            className={cn(
              "h-5 w-5 flex-shrink-0",
              status.color,
              syncStatus.syncing && "animate-spin"
            )}
          />
          <div className="flex-1 min-w-0">
            <p className={cn("text-sm font-semibold truncate", status.color)}>
              {status.label}
            </p>
          </div>
          {pendingOperations > 0 && (
            <span className={cn(
              "px-2 py-0.5 rounded-full text-xs font-bold",
              "bg-white/50 dark:bg-black/20",
              status.color
            )}>
              {pendingOperations}
            </span>
          )}
        </button>

        {/* Contenido expandido */}
        {isExpanded && (
          <div className="mt-3 space-y-3">
            <p className="text-xs text-muted-foreground">
              {status.description}
            </p>

            {/* Detalles de sincronización */}
            {(syncStatus.pending > 0 || syncStatus.failed > 0) && (
              <div className="space-y-1.5 text-xs">
                {syncStatus.pending > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Pendientes:</span>
                    <span className="font-semibold">{syncStatus.pending}</span>
                  </div>
                )}
                {syncStatus.failed > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-red-600 dark:text-red-400">Fallidas:</span>
                    <span className="font-semibold text-red-600 dark:text-red-400">
                      {syncStatus.failed}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Acciones */}
            {syncStatus.failed > 0 && (
              <div className="flex gap-2">
                <button
                  onClick={handleRetryFailed}
                  className={cn(
                    "flex-1 px-3 py-1.5 rounded-md text-xs font-medium",
                    "bg-primary text-primary-foreground",
                    "hover:bg-primary/90 transition-colors"
                  )}
                >
                  <RefreshCw className="h-3 w-3 inline mr-1" />
                  Reintentar
                </button>
                <button
                  onClick={handleClearFailed}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium",
                    "bg-muted text-muted-foreground",
                    "hover:bg-muted/80 transition-colors"
                  )}
                >
                  Limpiar
                </button>
              </div>
            )}

            {/* Mensaje especial para modo offline */}
            {!isOnline && (
              <div className="pt-2 border-t border-current/20">
                <p className="text-[10px] text-muted-foreground italic">
                  💡 Puedes seguir trabajando. Los cambios se guardarán localmente
                  y se sincronizarán cuando recuperes la conexión.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
