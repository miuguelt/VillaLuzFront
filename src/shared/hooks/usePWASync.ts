/**
 * Hook para sincronización incremental PWA
 * Permite sincronizar recursos solo descargando cambios desde última sincronización
 */

import { useState, useCallback, useEffect } from 'react';
import { PWAApiClient } from '@/shared/api/pwa-client';
import { getLastSync, setLastSync } from '@/shared/api/cache/etagStore';

interface SyncState {
  isSyncing: boolean;
  lastSync: string | null;
  error: string | null;
  changesCount: number;
}

interface UsePWASyncOptions {
  /**
   * Auto-sincronizar al montar el componente
   */
  autoSync?: boolean;

  /**
   * Intervalo de auto-sincronización en milisegundos (default: 5 minutos)
   */
  syncInterval?: number;

  /**
   * Callback cuando la sincronización completa
   */
  onSyncComplete?: (count: number) => void;

  /**
   * Callback cuando la sincronización falla
   */
  onSyncError?: (error: Error) => void;
}

/**
 * Hook para sincronización incremental de un recurso
 *
 * @param resource - Nombre del recurso (ej: 'users', 'diseases', etc.)
 * @param options - Opciones de configuración
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { sync, isSyncing, changesCount, lastSync } = usePWASync('users', {
 *     autoSync: true,
 *     syncInterval: 5 * 60 * 1000, // 5 minutos
 *     onSyncComplete: (count) => console.log(`${count} cambios descargados`),
 *   });
 *
 *   return (
 *     <div>
 *       <button onClick={sync} disabled={isSyncing}>
 *         Sincronizar
 *       </button>
 *       {lastSync && <p>Última sincronización: {new Date(lastSync).toLocaleString()}</p>}
 *     </div>
 *   );
 * }
 * ```
 */
export function usePWASync<T = any>(
  resource: string,
  options: UsePWASyncOptions = {}
) {
  const {
    autoSync = false,
    syncInterval,
    onSyncComplete,
    onSyncError,
  } = options;

  const [state, setState] = useState<SyncState>({
    isSyncing: false,
    lastSync: null,
    error: null,
    changesCount: 0,
  });

  const [client] = useState(() => new PWAApiClient<T>(resource));

  /**
   * Carga el timestamp de última sincronización
   */
  const loadLastSync = useCallback(async () => {
    const lastSyncTime = await getLastSync(resource);
    setState(prev => ({ ...prev, lastSync: lastSyncTime }));
  }, [resource]);

  /**
   * Sincroniza cambios desde última sincronización
   */
  const sync = useCallback(async (force: boolean = false) => {
    setState(prev => ({ ...prev, isSyncing: true, error: null }));

    try {
      // Si force, resetear timestamp
      const since = force ? new Date(0).toISOString() : state.lastSync || undefined;

      const { data, newSync } = await client.syncSince(since);

      setState(prev => ({
        ...prev,
        isSyncing: false,
        lastSync: newSync,
        changesCount: data.length,
        error: null,
      }));

      // Actualizar timestamp local
      await setLastSync(resource, newSync);

      // Callback de éxito
      if (onSyncComplete) {
        onSyncComplete(data.length);
      }

      return data;
    } catch (error: any) {
      const errorMsg = error?.message || 'Error desconocido en sincronización';

      setState(prev => ({
        ...prev,
        isSyncing: false,
        error: errorMsg,
      }));

      // Callback de error
      if (onSyncError) {
        onSyncError(error);
      }

      throw error;
    }
  }, [client, resource, state.lastSync, onSyncComplete, onSyncError]);

  /**
   * Sincronización completa (resetea timestamp)
   */
  const fullSync = useCallback(async () => {
    return sync(true);
  }, [sync]);

  /**
   * Limpia el estado de sincronización
   */
  const reset = useCallback(async () => {
    await setLastSync(resource, new Date(0).toISOString());
    setState({
      isSyncing: false,
      lastSync: null,
      error: null,
      changesCount: 0,
    });
  }, [resource]);

  // Cargar timestamp inicial
  useEffect(() => {
    loadLastSync();
  }, [loadLastSync]);

  // Auto-sync al montar
  useEffect(() => {
    if (autoSync) {
      sync();
    }
  }, [autoSync, sync]); // Solo ejecutar una vez al montar

  // Intervalo de auto-sync
  useEffect(() => {
    if (syncInterval && syncInterval > 0) {
      const intervalId = setInterval(() => {
        sync();
      }, syncInterval);

      return () => clearInterval(intervalId);
    }
  }, [syncInterval, sync]);

  return {
    /**
     * Sincroniza cambios incremental
     */
    sync,

    /**
     * Sincronización completa (descarga todo)
     */
    fullSync,

    /**
     * Resetea el estado de sincronización
     */
    reset,

    /**
     * True si está sincronizando
     */
    isSyncing: state.isSyncing,

    /**
     * Timestamp ISO de última sincronización
     */
    lastSync: state.lastSync,

    /**
     * Error de última sincronización (si hubo)
     */
    error: state.error,

    /**
     * Número de cambios en última sincronización
     */
    changesCount: state.changesCount,

    /**
     * Cliente PWA subyacente (para uso avanzado)
     */
    client,
  };
}

/**
 * Hook para sincronizar múltiples recursos en paralelo
 *
 * @example
 * ```tsx
 * function Dashboard() {
 *   const { syncAll, isSyncing, results } = useMultiResourceSync([
 *     'users',
 *     'diseases',
 *     'breeds',
 *   ]);
 *
 *   return (
 *     <button onClick={syncAll} disabled={isSyncing}>
 *       Sincronizar Todo
 *     </button>
 *   );
 * }
 * ```
 */
export function useMultiResourceSync(resources: string[]) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [results, setResults] = useState<Record<string, { success: boolean; count: number; error?: string }>>({});

  const syncAll = useCallback(async () => {
    setIsSyncing(true);

    const syncResults: Record<string, { success: boolean; count: number; error?: string }> = {};

    await Promise.all(
      resources.map(async (resource) => {
        const client = new PWAApiClient(resource);

        try {
          const { data } = await client.syncSince();
          syncResults[resource] = {
            success: true,
            count: data.length,
          };
        } catch (error: any) {
          syncResults[resource] = {
            success: false,
            count: 0,
            error: error?.message || 'Error desconocido',
          };
        }
      })
    );

    setResults(syncResults);
    setIsSyncing(false);

    return syncResults;
  }, [resources]);

  return {
    syncAll,
    isSyncing,
    results,
  };
}
