/**
 * Hook para verificación ligera de cambios usando endpoint /metadata
 * Permite verificar si hay cambios sin descargar datos completos
 */

import { useState, useCallback, useEffect } from 'react';
import { PWAApiClient, ResourceMetadata } from '@/shared/api/pwa-client';
import { getETag, setETag } from '@/shared/api/cache/etagStore';

interface MetadataState {
  metadata: ResourceMetadata | null;
  isLoading: boolean;
  error: string | null;
  hasChanges: boolean;
}

interface UseMetadataOptions {
  /**
   * Auto-verificar al montar el componente
   */
  autoCheck?: boolean;

  /**
   * Intervalo de verificación automática en milisegundos
   */
  checkInterval?: number;

  /**
   * Callback cuando se detectan cambios
   */
  onChangesDetected?: (metadata: ResourceMetadata) => void;

  /**
   * Callback cuando NO hay cambios
   */
  onNoChanges?: () => void;
}

/**
 * Hook para verificar cambios usando metadata endpoint
 *
 * @param resource - Nombre del recurso (ej: 'users', 'diseases')
 * @param options - Opciones de configuración
 *
 * @example
 * ```tsx
 * function UserList() {
 *   const { metadata, hasChanges, check } = useMetadata('users', {
 *     autoCheck: true,
 *     checkInterval: 30000, // Verificar cada 30 segundos
 *     onChangesDetected: (meta) => {
 *       console.log(`Hay ${meta.total_count} usuarios, última modificación: ${meta.last_modified}`);
 *       // Recargar datos completos
 *     },
 *   });
 *
 *   return (
 *     <div>
 *       {hasChanges && <Badge>Hay cambios disponibles</Badge>}
 *       <button onClick={check}>Verificar cambios</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useMetadata(
  resource: string,
  options: UseMetadataOptions = {}
) {
  const {
    autoCheck = false,
    checkInterval,
    onChangesDetected,
    onNoChanges,
  } = options;

  const [state, setState] = useState<MetadataState>({
    metadata: null,
    isLoading: false,
    error: null,
    hasChanges: false,
  });

  const [client] = useState(() => new PWAApiClient(resource));

  /**
   * Verifica si hay cambios comparando ETags
   */
  const check = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Obtener metadata del servidor
      const metadata = await client.getMetadata();

      if (!metadata) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Metadata no disponible',
          hasChanges: false,
        }));
        return false;
      }

      // Obtener ETag almacenado
      const storedETag = await getETag(resource);

      // Comparar ETags
      const hasChanges = !storedETag || storedETag !== metadata.etag;

      setState(prev => ({
        ...prev,
        metadata,
        isLoading: false,
        hasChanges,
        error: null,
      }));

      // Actualizar ETag almacenado
      if (metadata.etag) {
        await setETag(resource, metadata.etag);
      }

      // Callbacks
      if (hasChanges && onChangesDetected) {
        onChangesDetected(metadata);
      } else if (!hasChanges && onNoChanges) {
        onNoChanges();
      }

      return hasChanges;
    } catch (error: any) {
      const errorMsg = error?.message || 'Error al verificar metadata';

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMsg,
        hasChanges: false,
      }));

      return false;
    }
  }, [client, resource, onChangesDetected, onNoChanges]);

  /**
   * Resetea el estado de metadata
   */
  const reset = useCallback(() => {
    setState({
      metadata: null,
      isLoading: false,
      error: null,
      hasChanges: false,
    });
  }, []);

  // Auto-check al montar
  useEffect(() => {
    if (autoCheck) {
      check();
    }
  }, [autoCheck, check]); // Solo al montar

  // Intervalo de verificación
  useEffect(() => {
    if (checkInterval && checkInterval > 0) {
      const intervalId = setInterval(() => {
        check();
      }, checkInterval);

      return () => clearInterval(intervalId);
    }
  }, [checkInterval, check]);

  return {
    /**
     * Verifica si hay cambios
     */
    check,

    /**
     * Resetea el estado
     */
    reset,

    /**
     * Metadata del recurso
     */
    metadata: state.metadata,

    /**
     * True si está cargando
     */
    isLoading: state.isLoading,

    /**
     * Error de verificación (si hubo)
     */
    error: state.error,

    /**
     * True si hay cambios detectados
     */
    hasChanges: state.hasChanges,

    /**
     * Total de registros según metadata
     */
    totalCount: state.metadata?.total_count ?? 0,

    /**
     * Timestamp de última modificación
     */
    lastModified: state.metadata?.last_modified ?? null,

    /**
     * ETag actual
     */
    etag: state.metadata?.etag ?? null,

    /**
     * Cliente PWA subyacente
     */
    client,
  };
}

/**
 * Hook para verificar cambios en múltiples recursos
 *
 * @example
 * ```tsx
 * function Dashboard() {
 *   const { checkAll, results, isChecking } = useMultiResourceMetadata([
 *     'users',
 *     'diseases',
 *     'breeds',
 *   ]);
 *
 *   useEffect(() => {
 *     checkAll();
 *   }, []);
 *
 *   return (
 *     <div>
 *       {Object.entries(results).map(([resource, result]) => (
 *         <div key={resource}>
 *           {resource}: {result.hasChanges ? 'Hay cambios' : 'Sin cambios'}
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useMultiResourceMetadata(resources: string[]) {
  const [isChecking, setIsChecking] = useState(false);
  const [results, setResults] = useState<Record<string, {
    hasChanges: boolean;
    metadata?: ResourceMetadata;
    error?: string;
  }>>({});

  const checkAll = useCallback(async () => {
    setIsChecking(true);

    const checkResults: typeof results = {};

    await Promise.all(
      resources.map(async (resource) => {
        const client = new PWAApiClient(resource);

        try {
          const hasChanges = await client.hasChanges();
          const metadata = await client.getMetadata();

          checkResults[resource] = {
            hasChanges,
            metadata: metadata || undefined,
          };
        } catch (error: any) {
          checkResults[resource] = {
            hasChanges: false,
            error: error?.message || 'Error desconocido',
          };
        }
      })
    );

    setResults(checkResults);
    setIsChecking(false);

    return checkResults;
  }, [resources]);

  return {
    checkAll,
    isChecking,
    results,
    /**
     * True si algún recurso tiene cambios
     */
    hasAnyChanges: Object.values(results).some(r => r.hasChanges),
    /**
     * Recursos que tienen cambios
     */
    changedResources: Object.entries(results)
      .filter(([_, r]) => r.hasChanges)
      .map(([resource, _]) => resource),
  };
}

/**
 * Hook combinado que verifica metadata y sincroniza si hay cambios
 *
 * @example
 * ```tsx
 * function SmartUserList() {
 *   const { data, sync, hasChanges, isLoading } = useSmartSync('users', {
 *     checkInterval: 30000,
 *     autoSyncOnChanges: true,
 *   });
 *
 *   return (
 *     <div>
 *       {hasChanges && <Badge>Sincronizando cambios...</Badge>}
 *       <UserTable data={data} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useSmartSync<T = any>(
  resource: string,
  options: {
    checkInterval?: number;
    autoSyncOnChanges?: boolean;
    onSyncComplete?: (count: number) => void;
  } = {}
) {
  const { checkInterval, autoSyncOnChanges = false, onSyncComplete } = options;

  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { check, hasChanges, metadata } = useMetadata(resource, {
    autoCheck: true,
    checkInterval,
  });

  const [client] = useState(() => new PWAApiClient<T>(resource));

  const sync = useCallback(async () => {
    setIsLoading(true);

    try {
      const { data: syncedData } = await client.syncSince();
      setData(syncedData);

      if (onSyncComplete) {
        onSyncComplete(syncedData.length);
      }

      // Re-verificar metadata
      await check();
    } catch (error) {
      console.error(`Error sincronizando ${resource}:`, error);
    } finally {
      setIsLoading(false);
    }
  }, [client, resource, check, onSyncComplete]);

  // Auto-sync cuando se detectan cambios
  useEffect(() => {
    if (autoSyncOnChanges && hasChanges) {
      sync();
    }
  }, [autoSyncOnChanges, hasChanges, sync]);

  return {
    data,
    sync,
    check,
    hasChanges,
    isLoading,
    metadata,
    totalCount: metadata?.total_count ?? 0,
    lastModified: metadata?.last_modified ?? null,
  };
}
