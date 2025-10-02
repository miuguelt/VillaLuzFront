import { useCallback, useEffect, useRef, useState } from 'react';
import type { BaseService } from '@/services/baseService';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import { useCache, useCacheKey } from '@/context/CacheContext';

// Global registry of refetch callbacks for network-restore synchronization
const __resourceRefetchers = new Set<() => Promise<any>>();

export async function refetchAllResources(): Promise<void> {
  const fns = Array.from(__resourceRefetchers);
  await Promise.allSettled(
    fns.map((fn) => {
      try {
        return fn();
      } catch {
        return Promise.resolve();
      }
    })
  );
}

function registerResourceRefetch(fn: () => Promise<any>): () => void {
  __resourceRefetchers.add(fn);
  return () => {
    __resourceRefetchers.delete(fn);
  };
}

/**
 * Hook genérico minimalista para consumir cualquier instancia de BaseService<T>.
 * Objetivo: reducir duplicación y ofrecer una API consistente para listas + CRUD.
 */
export interface UseResourceOptions<P extends Record<string, any> = any> {
  autoFetch?: boolean;            // Ejecutar fetch inicial (default true)
  initialParams?: P;              // Parámetros iniciales para getAll/getPaginated
  deps?: any[];                   // Dependencias que re-disparan el fetch
  map?: <T>(items: T[]) => T[];   // Transformación opcional de la data
  cache?: boolean;                // Si true intenta reusar cache interna del servicio
  cacheTTL?: number;              // TTL para cache persistente (CacheContext)
  cacheKeyPrefix?: string;        // Prefijo opcional para la clave de caché
  // Opciones de tiempo real
  enableRealtime?: boolean;       // Habilita polling y refetch en foco/online
  pollIntervalMs?: number;        // Intervalo de polling (min 2000ms)
  refetchOnFocus?: boolean;       // Refrescar al recuperar foco/visibilidad (default true)
  refetchOnReconnect?: boolean;   // Refrescar al reconectar red (default true)
}

export interface UseResourceResult<T, P extends Record<string, any>> {
  data: T[];
  loading: boolean;
  error: string | null;
  refetch: (params?: P) => Promise<T[]>;
  createItem: (payload: Partial<T>) => Promise<T | null>;
  updateItem: (id: number | string, payload: Partial<T>) => Promise<T | null>;
  deleteItem: (id: number | string) => Promise<boolean>;
  setData: React.Dispatch<React.SetStateAction<T[]>>; // escape hatch
  // Exponer meta de paginación cuando aplique
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages?: number;
    hasNextPage?: boolean;
    hasPreviousPage?: boolean;
    rawMeta?: any;
  } | null;
  // Setters útiles para controlar desde UI
  setPage?: (page: number) => void;
  setLimit?: (limit: number) => void;
  setSearch?: (s: string) => void;
  setFields?: (f: string) => void;
  // Nuevo: estado de refresco suave para evitar parpadeos
  refreshing?: boolean;
}

export function useResource<T extends { id?: number | string }, P extends Record<string, any> = Record<string, any>>(
  service: BaseService<T>,
  options: UseResourceOptions<P> = {}
): UseResourceResult<T, P> {
  const { autoFetch = true, initialParams, deps = [], map, cache = true, cacheTTL, cacheKeyPrefix } = options;
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<UseResourceResult<T, P>["meta"]>(null);
  const [refreshing, setRefreshing] = useState(false);
  // Controles de tiempo real
  const realtimeEnabled = options.enableRealtime === true;
  const pollInterval = typeof options.pollIntervalMs === 'number' ? Math.max(2000, options.pollIntervalMs) : 0;
  const refetchOnFocus = options.refetchOnFocus !== false; // default true
  const refetchOnReconnect = options.refetchOnReconnect !== false; // default true
  const pollTimerRef = useRef<any>(null);

  const lastParams = useRef<P | undefined>(initialParams);
  const cancelSource = useRef(axios.CancelToken.source());
  // Cambio: usar timestamp en lugar de boolean para mantener bypass activo por período
  const skipCacheUntil = useRef<number>(0);
  const crudInProgress = useRef<boolean>(false);

  // Cache persistente con TTL
  const { getCache, setCache, invalidatePattern, invalidateByEndpoint } = useCache();
  const { generateKey } = useCacheKey();
  const entityKeyRef = useRef<string>((service as any)?.endpoint || service.constructor?.name || 'resource');
  const prefix = cacheKeyPrefix || entityKeyRef.current;

  // Sincronización con query params (?page, ?limit, ?search, ?fields)
  const [searchParams, setSearchParams] = useSearchParams();
  const pageQP = Number(searchParams.get('page') || '') || undefined;
  const limitQP = Number(searchParams.get('limit') || '') || undefined;
  const searchQP = searchParams.get('search') || undefined;
  const fieldsQP = searchParams.get('fields') || undefined;

  const setPage = useCallback((page: number) => {
    const sp = new URLSearchParams(searchParams);
    sp.set('page', String(page));
    setSearchParams(sp, { replace: true });
  }, [searchParams, setSearchParams]);

  const setLimit = useCallback((limit: number) => {
    const sp = new URLSearchParams(searchParams);
    sp.set('limit', String(limit));
    // reset page when limit changes
    sp.set('page', '1');
    setSearchParams(sp, { replace: true });
  }, [searchParams, setSearchParams]);

  const setSearch = useCallback((s: string) => {
    const sp = new URLSearchParams(searchParams);
    if (s) sp.set('search', s); else sp.delete('search');
    sp.set('page', '1');
    setSearchParams(sp, { replace: true });
  }, [searchParams, setSearchParams]);

  const setFields = useCallback((f: string) => {
    const sp = new URLSearchParams(searchParams);
    if (f) sp.set('fields', f); else sp.delete('fields');
    setSearchParams(sp, { replace: true });
  }, [searchParams, setSearchParams]);

  const safeExecute = useCallback(async <R,>(fn: () => Promise<R>): Promise<R> => {
    try {
      setLoading(true);
      setError(null);
      return await fn();
    } catch (e: any) {
      setError(e?.message || 'Error inesperado');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const buildEffectiveParams = useCallback((): Record<string, any> | undefined => {
    // Combinar en orden de prioridad: query params URL -> params pasados a refetch -> initialParams
    const base = { ...(initialParams as any) };
    const last = { ...(lastParams.current as any) };
    const fromURL: Record<string, any> = {};
    if (pageQP !== undefined) fromURL.page = pageQP;
    if (limitQP !== undefined) fromURL.limit = limitQP;
    if (searchQP !== undefined) fromURL.search = searchQP;
    if (fieldsQP !== undefined) fromURL.fields = fieldsQP;
    return { ...base, ...last, ...fromURL };
  }, [fieldsQP, initialParams, limitQP, pageQP, searchQP]);

  const refetch = useCallback(async (params?: P): Promise<T[]> => {
    lastParams.current = params || lastParams.current;
    const effective = buildEffectiveParams();
    // Cancelar cualquier petición anterior antes de iniciar una nueva
    try { cancelSource.current.cancel('Refetching: cancel previous request'); } catch { /* noop */ }
    cancelSource.current = axios.CancelToken.source();
    const effectiveWithToken = { ...(effective || {}), cancelToken: cancelSource.current.token } as any;

    // 1) Intentar cache persistente (si cache=true)
    let cacheKey = generateKey(prefix, effective);

    const hasData = Array.isArray(data) && data.length > 0;
    if (hasData) setRefreshing(true);

    try {
      // Optimización: usar caché en memoria primero para respuestas rápidas
      // PERO: si skipCacheUntil está activo (timestamp futuro), omitir el caché y hacer fetch fresco
      const now = Date.now();
      const shouldSkipCache = now < skipCacheUntil.current;
      const shouldUseCache = cache && !shouldSkipCache;

      if (shouldUseCache) {
        const cached = getCache<{ items?: T[]; data?: T[]; meta?: any; timestamp?: number }>(cacheKey);
        if (cached && cached.timestamp) {
          const cacheAge = Date.now() - cached.timestamp;
          // Si el caché es reciente (< 30s), usarlo inmediatamente sin mostrar loading
          if (cacheAge < 30000) {
            const items = (cached.items || cached.data || []) as T[];
            const finalList = map ? map(items) : items;
            setData(finalList);
            if (cached.meta) {
              setMeta({
                page: Number(cached.meta.page ?? effective?.page ?? 1),
                limit: Number(cached.meta.limit ?? effective?.limit ?? finalList.length ?? 10),
                total: Number(cached.meta.total ?? finalList.length ?? 0),
                totalPages: cached.meta.totalPages,
                hasNextPage: cached.meta.hasNextPage,
                hasPreviousPage: cached.meta.hasPreviousPage,
                rawMeta: cached.meta.rawMeta,
              });
            } else {
              setMeta(null);
            }
            // Refrescar en background inmediatamente (sin esperas en tiempo)
            // Lanzar la actualización sin bloquear la UI
            void safeExecute(async () => {
                const hasPaging = effective && (effective.page !== undefined || effective.limit !== undefined);
                if (hasPaging) {
                  const resp: any = await (service as any).getPaginated(effectiveWithToken);
                  const items: T[] = (resp?.data ?? resp) as T[];
                  const finalList = map ? map(items) : items;

                  // Usar directamente la respuesta del servidor
                  setData(finalList);
                  setMeta({
                    page: Number(resp?.page ?? effectiveWithToken?.page ?? 1),
                    limit: Number(resp?.limit ?? effectiveWithToken?.limit ?? finalList.length ?? 10),
                    total: Number(resp?.total ?? finalList.length ?? 0),
                    totalPages: resp?.totalPages,
                    hasNextPage: resp?.hasNextPage,
                    hasPreviousPage: resp?.hasPreviousPage,
                    rawMeta: resp?.rawMeta,
                  });
                  setCache(cacheKey, {
                    items: finalList,
                    meta: {
                      page: Number(resp?.page ?? effectiveWithToken?.page ?? 1),
                      limit: Number(resp?.limit ?? effectiveWithToken?.limit ?? finalList.length ?? 10),
                      total: Number(resp?.total ?? finalList.length ?? 0),
                      totalPages: resp?.totalPages,
                      hasNextPage: resp?.hasNextPage,
                      hasPreviousPage: resp?.hasPreviousPage,
                      rawMeta: resp?.rawMeta,
                    },
                    timestamp: Date.now()
                  }, cacheTTL);
                } else {
                  const list = await service.getAll(effectiveWithToken);
                  const finalList = map ? map(list) : list;

                  // Usar directamente la respuesta del servidor
                  setData(finalList);

                  setMeta(null);
                  setCache(cacheKey, { data: finalList, timestamp: Date.now() }, cacheTTL);
                }
            }).catch(() => {
              // Silenciosamente fallar background refresh
            });
            return finalList;
          }
        }
      }

      const result = await safeExecute(async () => {
        // Si hay page/limit en los params efectivos, usar paginado
        const hasPaging = effective && (effective.page !== undefined || effective.limit !== undefined);
        if (hasPaging) {
          const resp: any = await (service as any).getPaginated(effectiveWithToken);
          const items: T[] = (resp?.data ?? resp) as T[];
          const finalList = map ? map(items) : items;

          // MERGE INTELIGENTE: preservar items recién creados que no aparezcan en la respuesta
          const serverIds = new Set(finalList.map(item => String((item as any)?.id)));
          const missingRecentItems: T[] = [];

          // Buscar items recién creados/actualizados que NO están en la respuesta del servidor
          for (const recentId of Array.from(recentlyCreatedIds.current)) {
            if (!serverIds.has(recentId)) {
              // Buscar primero en la ref de items guardados (más confiable)
              let localItem = recentlyCreatedItems.current.get(recentId);
              // Fallback: buscar en el estado local actual
              if (!localItem) {
                localItem = data.find(item => String((item as any)?.id) === recentId);
              }

              if (localItem) {
                missingRecentItems.push(localItem);
                console.warn('[useResource] Item recién creado no aparece en respuesta del servidor:', {
                  id: recentId,
                  item: localItem,
                  foundIn: recentlyCreatedItems.current.has(recentId) ? 'ref' : 'state',
                  serverResponse: {
                    page: resp?.page,
                    limit: resp?.limit,
                    total: resp?.total,
                    itemCount: finalList.length,
                    itemIds: finalList.map(i => (i as any)?.id)
                  }
                });
              } else {
                console.error('[useResource] Item recién creado NO encontrado ni en ref ni en state:', {
                  id: recentId,
                  hasInRef: recentlyCreatedItems.current.has(recentId),
                  stateLength: data.length,
                  stateIds: data.map(i => (i as any)?.id)
                });
              }
            }
          }

          // Combinar: items recientes faltantes + respuesta del servidor
          const mergedList = missingRecentItems.length > 0
            ? [...missingRecentItems, ...finalList]
            : finalList;

          setData(mergedList);
          setMeta({
            page: Number(resp?.page ?? effectiveWithToken?.page ?? 1),
            limit: Number(resp?.limit ?? effectiveWithToken?.limit ?? mergedList.length ?? 10),
            total: Number(resp?.total ?? mergedList.length ?? 0),
            totalPages: resp?.totalPages,
            hasNextPage: resp?.hasNextPage,
            hasPreviousPage: resp?.hasPreviousPage,
            rawMeta: resp?.rawMeta,
          });

          // Guardar en caché persistente con timestamp (solo los datos del servidor, sin merge)
          if (cache) {
            setCache(cacheKey, {
              items: finalList,
              meta: {
                page: Number(resp?.page ?? effectiveWithToken?.page ?? 1),
                limit: Number(resp?.limit ?? effectiveWithToken?.limit ?? finalList.length ?? 10),
                total: Number(resp?.total ?? finalList.length ?? 0),
                totalPages: resp?.totalPages,
                hasNextPage: resp?.hasNextPage,
                hasPreviousPage: resp?.hasPreviousPage,
                rawMeta: resp?.rawMeta,
              },
              timestamp: Date.now()
            }, cacheTTL);
          }

          console.log('[useResource] Refetch completado (paginado):', {
            serverItems: finalList.length,
            serverItemIds: finalList.map(i => (i as any)?.id),
            missingRecentItems: missingRecentItems.length,
            missingItemIds: missingRecentItems.map(i => (i as any)?.id),
            mergedTotal: mergedList.length,
            recentlyTracked: Array.from(recentlyCreatedIds.current),
            page: resp?.page,
            limit: resp?.limit,
            total: resp?.total
          });

          return mergedList;
        }
        // No paginado: usar getAll clásico
        const list = await service.getAll(effectiveWithToken);
        const finalList = map ? map(list) : list;

        // MERGE INTELIGENTE para getAll también
        const serverIds = new Set(finalList.map(item => String((item as any)?.id)));
        const missingRecentItems: T[] = [];

        for (const recentId of Array.from(recentlyCreatedIds.current)) {
          if (!serverIds.has(recentId)) {
            // Buscar primero en la ref de items guardados
            let localItem = recentlyCreatedItems.current.get(recentId);
            if (!localItem) {
              localItem = data.find(item => String((item as any)?.id) === recentId);
            }

            if (localItem) {
              missingRecentItems.push(localItem);
              console.warn('[useResource] Item recién creado no aparece en getAll:', {
                id: recentId,
                item: localItem,
                foundIn: recentlyCreatedItems.current.has(recentId) ? 'ref' : 'state',
                totalItems: finalList.length
              });
            } else {
              console.error('[useResource] Item recién creado NO encontrado (getAll):', {
                id: recentId,
                hasInRef: recentlyCreatedItems.current.has(recentId),
                stateLength: data.length
              });
            }
          }
        }

        const mergedList = missingRecentItems.length > 0
          ? [...missingRecentItems, ...finalList]
          : finalList;

        setData(mergedList);
        setMeta(null);
        if (cache) {
          setCache(cacheKey, { data: finalList, timestamp: Date.now() }, cacheTTL);
        }
        return mergedList;
      });
      return result;
    } finally {
      if (hasData) setRefreshing(false);
      // NO resetear skipCacheUntil aquí - dejarlo expirar naturalmente por timestamp
    }
  }, [buildEffectiveParams, cache, cacheTTL, data, generateKey, getCache, map, prefix, safeExecute, service, setCache]);

  // Ref para trackear items recién creados/actualizados que deben preservarse en refetch
  const recentlyCreatedIds = useRef<Set<string>>(new Set());
  const recentlyCreatedTimestamps = useRef<Map<string, number>>(new Map());
  const recentlyCreatedItems = useRef<Map<string, T>>(new Map()); // Guardar items completos

  // CRUD helpers
  const createItem = useCallback(async (payload: Partial<T>) => {
    // Marcar CRUD en progreso para pausar polling
    crudInProgress.current = true;
    try {
      return await safeExecute(async () => {
        const created = await service.create(payload);

        // Trackear el ID del item creado para merge inteligente
        const createdId = String((created as any)?.id);
        if (createdId && createdId !== 'undefined') {
          recentlyCreatedIds.current.add(createdId);
          recentlyCreatedTimestamps.current.set(createdId, Date.now());
          recentlyCreatedItems.current.set(createdId, created); // Guardar item completo

          // Auto-limpiar después de 30 segundos (sin setTimeout - se limpia en próximo create)
          const now = Date.now();
          for (const [id, timestamp] of Array.from(recentlyCreatedTimestamps.current.entries())) {
            if (now - timestamp > 30000) {
              recentlyCreatedIds.current.delete(id);
              recentlyCreatedTimestamps.current.delete(id);
              recentlyCreatedItems.current.delete(id);
            }
          }
        }

        // Invalidar caché ANTES de actualizar estado (persistente + en memoria del servicio)
        invalidateByEndpoint(prefix);
        if (typeof (service as any).clearCache === 'function') {
          (service as any).clearCache();
        }
        // Forzar bypass de caché por 10 segundos (tiempo para múltiples refetches)
        skipCacheUntil.current = Date.now() + 10000;

        // Actualización optimista del estado local COMPLETA
        setData(prev => {
          const arr = Array.isArray(prev) ? prev : [];
          const createdIdRaw = (created as any)?.id;
          const createdIdKey = createdIdRaw != null ? String(createdIdRaw) : null;
          // Deduplicar por id normalizado (string) para evitar duplicados
          const dedup = createdIdKey != null ? arr.filter((x: any) => String(x?.id) !== createdIdKey) : arr;
          // Agregar al inicio para visibilidad inmediata
          return [created as any, ...dedup];
        });

        console.log('[useResource] Item creado exitosamente:', {
          id: createdId,
          payload,
          created
        });

        return created;
      }).catch((error) => {
        console.error('[useResource] Error al crear item:', error);
        return null;
      });
    } finally {
      // Marcar CRUD como completado inmediatamente - confiar en que el refetch sincronizará
      crudInProgress.current = false;
    }
  }, [service, safeExecute, invalidateByEndpoint, prefix]);

  const updateItem = useCallback(async (id: number | string, payload: Partial<T>) => {
    // Marcar CRUD en progreso para pausar polling
    crudInProgress.current = true;
    try {
      return await safeExecute(async () => {
        const updated = await service.update(id, payload);

        // Trackear el ID del item actualizado
        const updatedId = String(id);
        if (updatedId && updatedId !== 'undefined') {
          recentlyCreatedIds.current.add(updatedId);
          recentlyCreatedTimestamps.current.set(updatedId, Date.now());
          recentlyCreatedItems.current.set(updatedId, updated); // Guardar item completo actualizado
        }

        // Invalidar caché ANTES de actualizar estado (persistente + en memoria del servicio)
        invalidateByEndpoint(prefix);
        if (typeof (service as any).clearCache === 'function') {
          (service as any).clearCache();
        }
        // Forzar bypass de caché por 10 segundos
        skipCacheUntil.current = Date.now() + 10000;

        // Actualización optimista del estado local
        setData(prev => prev.map(i => (i.id === id ? { ...i, ...updated } : i)));

        console.log('[useResource] Item actualizado exitosamente:', {
          id: updatedId,
          payload,
          updated
        });

        return updated;
      }).catch((error) => {
        console.error('[useResource] Error al actualizar item:', error);
        return null;
      });
    } finally {
      // Marcar CRUD como completado inmediatamente
      crudInProgress.current = false;
    }
  }, [service, safeExecute, invalidateByEndpoint, prefix]);

  const deleteItem = useCallback(async (id: number | string) => {
    // Marcar CRUD en progreso para pausar polling
    crudInProgress.current = true;
    try {
      return await safeExecute(async () => {
        try {
          // El await aquí garantiza que el backend completó la eliminación
          const ok = await service.delete(id);
          if (ok) {
            // Remover de tracking de items recientes
            const deletedId = String(id);
            recentlyCreatedIds.current.delete(deletedId);
            recentlyCreatedTimestamps.current.delete(deletedId);
            recentlyCreatedItems.current.delete(deletedId);

            // PRIMERO: Invalidar caché completamente (persistente + en memoria del servicio)
            invalidateByEndpoint(prefix);
            if (typeof (service as any).clearCache === 'function') {
              (service as any).clearCache();
            }
            // SEGUNDO: Forzar bypass de caché por 15 segundos (más tiempo para eliminaciones)
            skipCacheUntil.current = Date.now() + 15000;
            // TERCERO: Actualizar estado local inmediatamente (optimistic update)
            setData(prev => prev.filter(i => String((i as any)?.id) !== String(id)));

            console.log('[useResource] Item eliminado exitosamente:', {
              id: deletedId
            });
          }
          return ok;
        } catch (err: any) {
          // Si es 404, el elemento ya fue eliminado, actualizar estado local
          if (err?.response?.status === 404) {
            const deletedId = String(id);
            recentlyCreatedIds.current.delete(deletedId);
            recentlyCreatedTimestamps.current.delete(deletedId);
            recentlyCreatedItems.current.delete(deletedId);

            invalidateByEndpoint(prefix);
            if (typeof (service as any).clearCache === 'function') {
              (service as any).clearCache();
            }
            skipCacheUntil.current = Date.now() + 15000;
            setData(prev => prev.filter(i => String((i as any)?.id) !== String(id)));

            console.log('[useResource] Item ya estaba eliminado (404):', {
              id: deletedId
            });
          }
          // Propagar el error para que AdminCRUDPage lo maneje
          throw err;
        }
      }).catch((err) => {
        console.error('[useResource] Error al eliminar item:', err);
        // Propagar el error para que AdminCRUDPage lo maneje
        throw err;
      });
    } finally {
      // Marcar CRUD como completado inmediatamente
      crudInProgress.current = false;
    }
  }, [service, safeExecute, invalidateByEndpoint, prefix]);

  // Initial + deps effect
  useEffect(() => {
    if (autoFetch) {
      refetch(initialParams as P | undefined);
    }
    return () => {
      cancelSource.current.cancel('Unmounted');
      cancelSource.current = axios.CancelToken.source();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFetch, service, cache, pageQP, limitQP, searchQP, fieldsQP, ...deps]);

  // Tiempo real: polling periódico con bypass de caché para datos frescos
  useEffect(() => {
    if (!realtimeEnabled || !pollInterval) return;
    if (pollTimerRef.current) {
      try { clearInterval(pollTimerRef.current); } catch { /* noop */ }
      pollTimerRef.current = null;
    }
    pollTimerRef.current = setInterval(() => {
      // NO hacer polling si hay CRUD en progreso (evita sobrescribir actualizaciones optimistas)
      if (crudInProgress.current) {
        return;
      }
      // Forzar bypass de caché por 5 segundos para obtener datos frescos
      skipCacheUntil.current = Date.now() + 5000;
      void refetch().catch(() => {});
    }, pollInterval);
    return () => {
      if (pollTimerRef.current) {
        try { clearInterval(pollTimerRef.current); } catch { /* noop */ }
        pollTimerRef.current = null;
      }
    };
  }, [realtimeEnabled, pollInterval, refetch]);

  // Tiempo real: refetch al recuperar foco/visibilidad y al reconectar
  useEffect(() => {
    const onFocus = () => {
      if (!realtimeEnabled || !refetchOnFocus) return;
      // Respetar CRUD en progreso
      if (crudInProgress.current) return;
      skipCacheUntil.current = Date.now() + 5000;
      void refetch().catch(() => {});
    };
    const onOnline = () => {
      if (!realtimeEnabled || !refetchOnReconnect) return;
      // Respetar CRUD en progreso
      if (crudInProgress.current) return;
      skipCacheUntil.current = Date.now() + 5000;
      void refetch().catch(() => {});
    };
    if (realtimeEnabled) {
      window.addEventListener('focus', onFocus);
      const onVisibility = () => { if (document.visibilityState === 'visible') onFocus(); };
      window.addEventListener('visibilitychange', onVisibility);
      window.addEventListener('online', onOnline);
      return () => {
        window.removeEventListener('focus', onFocus);
        window.removeEventListener('visibilitychange', onVisibility);
        window.removeEventListener('online', onOnline);
      };
    }
    return () => {};
  }, [realtimeEnabled, refetchOnFocus, refetchOnReconnect, refetch]);

  // Register this resource for global refetch on network restore
  useEffect(() => {
    const unregister = registerResourceRefetch(() => refetch(undefined as any));
    return unregister;
  }, [refetch]);

  return { data, loading, error, refetch, createItem, updateItem, deleteItem, setData, meta, setPage, setLimit, setSearch, setFields, refreshing } as UseResourceResult<T, P>;
}

export default useResource;
