import { useCallback, useEffect, useRef, useState } from 'react';
import type { BaseService } from '@/shared/api/base-service';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';
import { useCache, useCacheKey } from '@/app/providers/CacheContext';

// Global registry of refetch callbacks for network-restore synchronization
const __resourceRefetchers = new Set<() => Promise<any>>();
// Global in-flight deduplication per cache key to coalesce concurrent refetches
const __resourceInflight = new Map<string, Promise<any>>();
// Global throttling per cache key to prevent excessive refetch frequency
const __resourceLastFetchAt = new Map<string, number>();
// Backoff map per endpoint prefix informed by client rate limit events
const __endpointBackoffUntil = new Map<string, number>();

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
  const pollInterval = typeof options.pollIntervalMs === 'number'
    ? (options.pollIntervalMs > 0 ? Math.max(2000, options.pollIntervalMs) : 0)
    : 0;
  const refetchOnFocus = options.refetchOnFocus !== false; // default true
  const refetchOnReconnect = options.refetchOnReconnect !== false; // default true
  const pollTimerRef = useRef<any>(null);

  const lastParams = useRef<P | undefined>(initialParams);
  const cancelSource = useRef(axios.CancelToken.source());
  // Cambio: usar timestamp en lugar de boolean para mantener bypass activo por período
  const skipCacheUntil = useRef<number>(0);
  const crudInProgress = useRef<boolean>(false);

  // Cache persistente con TTL
  const { getCache, setCache, invalidateByEndpoint } = useCache();
  const { generateKey } = useCacheKey();
  const entityKeyRef = useRef<string>((service as any)?.endpoint || service.constructor?.name || 'resource');
  const prefix = cacheKeyPrefix || entityKeyRef.current;

  // Sincronización con query params (?page, ?limit, ?search, ?fields)
  const [searchParams, setSearchParams] = useSearchParams();
  const pageQP = Number(searchParams.get('page') || '') || undefined;
  const limitQP = Number(searchParams.get('limit') || '') || undefined;
  const searchQP = searchParams.get('search') || undefined;
  const fieldsQP = searchParams.get('fields') || undefined;
  // Nuevo: sincronizar orden con la URL
  const orderingQP = searchParams.get('ordering') || undefined;
  const sortByQP = searchParams.get('sort_by') || undefined;
  const sortOrderQP = (searchParams.get('sort_order') as 'asc' | 'desc' | undefined) || undefined;

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

  const safeExecute = useCallback(async <R,>(fn: () => Promise<R>): Promise<R | undefined> => {
    try {
      setLoading(true);
      setError(null);
      return await fn();
    } catch (e: any) {
      if (axios.isCancel(e)) {
        // Silently ignore canceled requests
        return undefined;
      }
      setError(e?.message || 'Error inesperado');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  // Mutations (create/update/delete) no deben setear el `error` global del recurso,
  // porque ese `error` se usa para renderizar ErrorState de la vista principal.
  const safeExecuteMutation = useCallback(async <R,>(fn: () => Promise<R>): Promise<R | undefined> => {
    try {
      setLoading(true);
      return await fn();
    } catch (e: any) {
      if (axios.isCancel(e)) {
        return undefined;
      }
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
    // Orden: preferir sort_by/sort_order; si no existen, usar ordering
    if (sortByQP !== undefined) fromURL.sort_by = sortByQP;
    if (sortOrderQP !== undefined) fromURL.sort_order = sortOrderQP;
    if (orderingQP !== undefined && fromURL.sort_by === undefined) {
      fromURL.ordering = orderingQP;
    }
    return { ...base, ...last, ...fromURL };
  }, [fieldsQP, initialParams, limitQP, pageQP, searchQP, orderingQP, sortByQP, sortOrderQP]);

  const refetch = useCallback(async (params?: P): Promise<T[]> => {
    lastParams.current = params || lastParams.current;
    const effective = buildEffectiveParams();
    const cacheKey = generateKey(prefix, effective);
    const nowTs = Date.now();
    const lastTs = __resourceLastFetchAt.get(cacheKey) || 0;
    const backoffUntil = __endpointBackoffUntil.get(prefix) || 0;
    // Guard: si existe backoff activo para el endpoint, saltar refetch de red
    if (backoffUntil && nowTs < backoffUntil) {
      return data;
    }
    // Throttle: evitar refetchs de alta frecuencia por efectos/estado
    if (nowTs - lastTs < 1500) {
      return data;
    }
    // Cancelar cualquier petición anterior antes de iniciar una nueva
    try { cancelSource.current.cancel('Refetching: cancel previous request'); } catch { /* noop */ }
    cancelSource.current = axios.CancelToken.source();
    const effectiveWithToken = { ...(effective || {}), cancelToken: cancelSource.current.token } as any;

    // 1) Intentar cache persistente (si cache=true)
    __resourceLastFetchAt.set(cacheKey, nowTs);

    const hasData = Array.isArray(data) && data.length > 0;
    if (hasData) setRefreshing(true);

    const applyStableOrder = (list: T[]): T[] => {
      if (!Array.isArray(list) || list.length === 0) return list;
      if (!Array.isArray(data) || data.length === 0) return list;

      const now = Date.now();
      for (const [id, ts] of Array.from(recentlyUpdatedTimestamps.current.entries())) {
        if (now - ts > 120000) {
          recentlyUpdatedIds.current.delete(id);
          recentlyUpdatedTimestamps.current.delete(id);
          recentlyUpdatedItems.current.delete(id);
        }
      }

      if (recentlyUpdatedIds.current.size === 0) return list;

      const nextMap = new Map<string, T>();
      list.forEach((item) => {
        const id = String((item as any)?.id);
        if (id && id !== 'undefined') nextMap.set(id, item);
      });

      const ordered: T[] = [];
      const used = new Set<string>();
      data.forEach((prevItem) => {
        const id = String((prevItem as any)?.id);
        if (!id || id === 'undefined') return;
        const nextItem = nextMap.get(id);
        if (nextItem) {
          ordered.push(nextItem);
          used.add(id);
        }
      });

      list.forEach((item) => {
        const id = String((item as any)?.id);
        if (!id || id === 'undefined' || used.has(id)) return;
        ordered.push(item);
      });

      return ordered.length > 0 ? ordered : list;
    };

    try {
      // Optimización: usar caché en memoria primero para respuestas rápidas
      // PERO: si skipCacheUntil está activo (timestamp futuro), omitir el caché y hacer fetch fresco
      const now = Date.now();
      const shouldSkipCache = now < skipCacheUntil.current;
      const shouldUseCache = cache && !shouldSkipCache;
      if (shouldSkipCache) {
        effectiveWithToken.cache_bust = Date.now();
      }

      if (shouldUseCache) {
        const cached = getCache<{ items?: T[]; data?: T[]; meta?: any; timestamp?: number }>(cacheKey);
        if (cached && cached.timestamp) {
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
          // Lanzar la actualizacion sin bloquear la UI (deduplicado por cacheKey)
          const isOnline = typeof navigator === 'undefined' ? true : navigator.onLine !== false;
          if (isOnline && !__resourceInflight.has(cacheKey)) {
            const bgParams = { ...effectiveWithToken, cache_bust: Date.now() };
            const bgPromise = safeExecute(async () => {
              const hasPaging = effective && (effective.page !== undefined || effective.limit !== undefined);
              if (hasPaging) {
                const resp: any = await (service as any).getPaginated(bgParams);
                const items: T[] = (resp?.data ?? resp) as T[];
                const finalList = map ? map(items) : items;

                // MERGE INTELIGENTE tambien en refresco en background
                const serverIds = new Set(finalList.map(item => String((item as any)?.id)));
                const missingRecentItems: T[] = [];
                for (const recentId of Array.from(recentlyCreatedIds.current)) {
                  if (!serverIds.has(recentId)) {
                    let localItem = recentlyCreatedItems.current.get(recentId);
                    if (!localItem) {
                      localItem = data.find(item => String((item as any)?.id) === recentId);
                    }
                    if (localItem) missingRecentItems.push(localItem);
                  }
                }
                let mergedList = missingRecentItems.length > 0
                  ? [...missingRecentItems, ...finalList]
                  : finalList;
                const effectiveLimit = Number(resp?.limit ?? effectiveWithToken?.limit);
                if (missingRecentItems.length > 0 && effectiveLimit && mergedList.length > effectiveLimit) {
                  mergedList = mergedList.slice(0, effectiveLimit);
                }
                // Filtrar eliminados recientes
                const deletedIds = recentlyDeletedIds.current;
                if (deletedIds.size > 0) {
                  mergedList = mergedList.filter(item => !deletedIds.has(String((item as any)?.id)));
                }

                setData(applyStableOrder(mergedList));
                setMeta({
                  page: Number(resp?.page ?? effectiveWithToken?.page ?? 1),
                  limit: Number(resp?.limit ?? effectiveWithToken?.limit ?? mergedList.length ?? 10),
                  total: Number(resp?.total ?? mergedList.length ?? 0),
                  totalPages: resp?.totalPages,
                  hasNextPage: resp?.hasNextPage,
                  hasPreviousPage: resp?.hasPreviousPage,
                  rawMeta: resp?.rawMeta,
                });
                setCache(cacheKey, {
                  items: mergedList,
                  meta: {
                    page: Number(resp?.page ?? effectiveWithToken?.page ?? 1),
                    limit: Number(resp?.limit ?? effectiveWithToken?.limit ?? mergedList.length ?? 10),
                    total: Number(resp?.total ?? mergedList.length ?? 0),
                    totalPages: resp?.totalPages,
                    hasNextPage: resp?.hasNextPage,
                    hasPreviousPage: resp?.hasPreviousPage,
                    rawMeta: resp?.rawMeta,
                  },
                  timestamp: Date.now(),
                  includesLocalRecent: missingRecentItems.length > 0,
                  recentIds: Array.from(recentlyCreatedIds.current)
                }, cacheTTL);
              } else {
                const list = await service.getAll(bgParams);
                const finalList = map ? map(list) : list;

                // MERGE tambien en background para no perder items recientes
                const serverIds = new Set(finalList.map(item => String((item as any)?.id)));
                const missingRecentItems: T[] = [];
                for (const recentId of Array.from(recentlyCreatedIds.current)) {
                  if (!serverIds.has(recentId)) {
                    let localItem = recentlyCreatedItems.current.get(recentId);
                    if (!localItem) {
                      localItem = data.find(item => String((item as any)?.id) === recentId);
                    }
                    if (localItem) missingRecentItems.push(localItem);
                  }
                }
                const mergedList = missingRecentItems.length > 0
                  ? [...missingRecentItems, ...finalList]
                  : finalList;

                setData(applyStableOrder(mergedList));
                setMeta(null);
                setCache(cacheKey, { data: mergedList, timestamp: Date.now(), includesLocalRecent: missingRecentItems.length > 0, recentIds: Array.from(recentlyCreatedIds.current) }, cacheTTL);
              }
            });
            __resourceInflight.set(cacheKey, bgPromise as Promise<any>);
            void bgPromise.finally(() => { __resourceInflight.delete(cacheKey); }).catch(() => {
              // Silenciosamente fallar background refresh
            });
          }
          return finalList;
        }
      }

      // Deduplicación de fetch principal por cacheKey
      let fetchPromise = __resourceInflight.get(cacheKey);
      if (!fetchPromise) {
        fetchPromise = safeExecute(async () => {
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
          let mergedList = missingRecentItems.length > 0
            ? [...missingRecentItems, ...finalList]
            : finalList;

          // Si el merge excede el límite, recortar priorizando los recién creados
          const effectiveLimit = Number(resp?.limit ?? effectiveWithToken?.limit);
          if (missingRecentItems.length > 0 && effectiveLimit && mergedList.length > effectiveLimit) {
            mergedList = mergedList.slice(0, effectiveLimit);
          }

          // FILTRAR items eliminados recientemente que el backend aún devuelve
          const deletedIds = recentlyDeletedIds.current;
          if (deletedIds.size > 0) {
            const beforeFilter = mergedList.length;
            mergedList = mergedList.filter(item => !deletedIds.has(String((item as any)?.id)));
            const afterFilter = mergedList.length;

            if (beforeFilter !== afterFilter) {
              console.warn('[useResource] Filtrados items eliminados recientemente que el backend aún devuelve:', {
                beforeFilter,
                afterFilter,
                filtered: beforeFilter - afterFilter,
                deletedIds: Array.from(deletedIds)
              });
            }
          }

          setData(applyStableOrder(mergedList));
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

        let mergedList = missingRecentItems.length > 0
          ? [...missingRecentItems, ...finalList]
          : finalList;

        // FILTRAR items eliminados recientemente que el backend aún devuelve
        const deletedIds = recentlyDeletedIds.current;
        if (deletedIds.size > 0) {
          const beforeFilter = mergedList.length;
          mergedList = mergedList.filter(item => !deletedIds.has(String((item as any)?.id)));
          const afterFilter = mergedList.length;

          if (beforeFilter !== afterFilter) {
            console.warn('[useResource] Filtrados items eliminados recientemente (getAll) que el backend aún devuelve:', {
              beforeFilter,
              afterFilter,
              filtered: beforeFilter - afterFilter,
              deletedIds: Array.from(deletedIds)
            });
          }
        }

        setData(applyStableOrder(mergedList));
        setMeta(null);
        if (cache) {
          setCache(cacheKey, { data: finalList, timestamp: Date.now() }, cacheTTL);
        }
        return mergedList;
    });
        __resourceInflight.set(cacheKey, fetchPromise as Promise<any>);
      }
      const result = await fetchPromise;
      __resourceInflight.delete(cacheKey);
      if (result === undefined) {
        // Request was canceled, return current data
        return data;
      }
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

  const recentlyUpdatedIds = useRef<Set<string>>(new Set());
  const recentlyUpdatedTimestamps = useRef<Map<string, number>>(new Map());
  const recentlyUpdatedItems = useRef<Map<string, T>>(new Map());

  // Ref para trackear items recién eliminados que deben filtrarse del refetch si el backend aún los devuelve
  const recentlyDeletedIds = useRef<Set<string>>(new Set());
  const recentlyDeletedTimestamps = useRef<Map<string, number>>(new Map());

  // CRUD helpers
  const createItem = useCallback(async (payload: Partial<T>) => {
    // Marcar CRUD en progreso para pausar polling
    crudInProgress.current = true;
    try {
      const result = await safeExecuteMutation(async () => {
        const created = await service.create(payload);

        // Trackear el ID del item creado para merge inteligente
        const createdId = String((created as any)?.id);
        if (createdId && createdId !== 'undefined') {
          recentlyCreatedIds.current.add(createdId);
          recentlyCreatedTimestamps.current.set(createdId, Date.now());
          recentlyCreatedItems.current.set(createdId, created); // Guardar item completo

          // Auto-limpiar después de 2 minutos (120 segundos) para dar tiempo al usuario a ver el item
          // Este tiempo más largo evita que items recién creados desaparezcan en refrescos automáticos
          const now = Date.now();
          for (const [id, timestamp] of Array.from(recentlyCreatedTimestamps.current.entries())) {
            if (now - timestamp > 120000) {
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
        // Forzar bypass de caché por 30 segundos para asegurar que múltiples refetches obtengan datos frescos
        // Esto evita que el caché obsoleto oculte el item recién creado
        skipCacheUntil.current = Date.now() + 30000;

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
      });
      if (result === undefined) {
        // Request was canceled
        return null;
      }
      return result;
    } catch (error) {
      // No suprimir el error: reenviarlo para que la UI pueda mostrar el detalle real
      console.error('[useResource] Error al crear item:', error);
      throw error;
    } finally {
      // Marcar CRUD como completado inmediatamente - confiar en que el refetch sincronizará
      crudInProgress.current = false;
    }
  }, [service, safeExecuteMutation, invalidateByEndpoint, prefix]);

  const updateItem = useCallback(async (id: number | string, payload: Partial<T>) => {
    // Marcar CRUD en progreso para pausar polling
    crudInProgress.current = true;
    try {
      const result = await safeExecuteMutation(async () => {
        const updatedRaw = await service.update(id, payload);
        const updated = (updatedRaw && typeof updatedRaw === 'object')
          ? { ...(payload as any), ...(updatedRaw as any) }
          : { ...(payload as any), id };

        // Trackear el ID del item actualizado
        const updatedId = String(id);
        if (updatedId && updatedId !== 'undefined') {
          recentlyUpdatedIds.current.add(updatedId);
          recentlyUpdatedTimestamps.current.set(updatedId, Date.now());
          recentlyUpdatedItems.current.set(updatedId, updated); // Guardar item completo actualizado
        }

        // Invalidar caché ANTES de actualizar estado (persistente + en memoria del servicio)
        invalidateByEndpoint(prefix);
        if (typeof (service as any).clearCache === 'function') {
          (service as any).clearCache();
        }
        // Forzar bypass de caché por 30 segundos para asegurar datos frescos
        skipCacheUntil.current = Date.now() + 30000;

        // Actualización optimista del estado local (normalizar IDs para evitar mismatch string/number)
        const applyAliasSync = (prevItem: any, nextItem: any) => {
          const hasKey = (obj: any, key: string) => obj && Object.prototype.hasOwnProperty.call(obj, key);
          const mirrorIfNeeded = (a: string, b: string) => {
            const aExists = hasKey(prevItem, a) || hasKey(nextItem, a);
            const bExists = hasKey(prevItem, b) || hasKey(nextItem, b);
            if (!aExists && !bExists) return;
            const aVal = (nextItem as any)[a];
            const bVal = (nextItem as any)[b];
            if (aVal !== undefined && bVal === undefined && bExists) (nextItem as any)[b] = aVal;
            if (bVal !== undefined && aVal === undefined && aExists) (nextItem as any)[a] = bVal;
          };
          mirrorIfNeeded('diagnosis', 'description');
          mirrorIfNeeded('dosis', 'dose');
          mirrorIfNeeded('frequency', 'frecuencia');
          mirrorIfNeeded('observations', 'notes');
          mirrorIfNeeded('status', 'estado');
          return nextItem;
        };

        setData(prev => prev.map((i: any) => {
          if (String(i?.id) !== String(id)) return i;
          const next = { ...i, ...updated };
          return applyAliasSync(i, next);
        }));

        console.log('[useResource] Item actualizado exitosamente:', {
          id: updatedId,
          payload,
          updated
        });

        if (typeof navigator === 'undefined' || navigator.onLine !== false) {
          void refetch();
        }

        return updated;
      });
      if (result === undefined) {
        // Request was canceled
        return null;
      }
      return result;
    } catch (error) {
      console.error('[useResource] Error al actualizar item:', error);
      throw error;
    } finally {
      // Marcar CRUD como completado inmediatamente
      crudInProgress.current = false;
    }
  }, [service, safeExecuteMutation, invalidateByEndpoint, prefix, refetch]);

  const deleteItem = useCallback(async (id: number | string) => {
    // Marcar CRUD en progreso para pausar polling
    crudInProgress.current = true;
    try {
      const result = await safeExecuteMutation(async () => {
        try {
          // El await aquí garantiza que el backend completó la eliminación
          const ok = await service.delete(id);
          if (ok) {
            // Remover de tracking de items recientes
            const deletedId = String(id);
            recentlyCreatedIds.current.delete(deletedId);
            recentlyCreatedTimestamps.current.delete(deletedId);
            recentlyCreatedItems.current.delete(deletedId);

            // NUEVO: Registrar item como eliminado recientemente para filtrarlo en refetch
            recentlyDeletedIds.current.add(deletedId);
            recentlyDeletedTimestamps.current.set(deletedId, Date.now());

            // Auto-limpiar items eliminados después de 10 segundos
            const now = Date.now();
            for (const [delId, timestamp] of Array.from(recentlyDeletedTimestamps.current.entries())) {
              if (now - timestamp > 10000) {
                recentlyDeletedIds.current.delete(delId);
                recentlyDeletedTimestamps.current.delete(delId);
              }
            }

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
              id: deletedId,
              deletedIdsTracked: Array.from(recentlyDeletedIds.current)
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

            // Registrar como eliminado
            recentlyDeletedIds.current.add(deletedId);
            recentlyDeletedTimestamps.current.set(deletedId, Date.now());

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
      });
      if (result === undefined) {
        // Request was canceled
        return false;
      }
      return result;
    } catch (err) {
      console.error('[useResource] Error al eliminar item:', err);
      // Propagar el error para que AdminCRUDPage lo maneje
      throw err;
    } finally {
      // Marcar CRUD como completado inmediatamente
      crudInProgress.current = false;
    }
  }, [service, safeExecuteMutation, invalidateByEndpoint, prefix]);

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

  useEffect(() => {
    if (!realtimeEnabled) return;
    const endpointSlug = (() => {
      const ep = entityKeyRef.current || '';
      const parts = String(ep).split('/').filter(Boolean);
      return parts.length ? parts[parts.length - 1] : ep;
    })();
    const onResourceChanged = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      const slug = String(detail?.endpoint || '');
      if (!slug || slug !== endpointSlug) return;
      if (crudInProgress.current) return;
      skipCacheUntil.current = Date.now() + 5000;
      void refetch().catch(() => {});
    };
    const onGlobalChange = () => {
      if (crudInProgress.current) return;
      skipCacheUntil.current = Date.now() + 5000;
      void refetch().catch(() => {});
    };
    window.addEventListener('server-resource-changed', onResourceChanged as EventListener);
    window.addEventListener('server-global-change', onGlobalChange as EventListener);
    return () => {
      window.removeEventListener('server-resource-changed', onResourceChanged as EventListener);
      window.removeEventListener('server-global-change', onGlobalChange as EventListener);
    };
  }, [realtimeEnabled, refetch]);

  // Integración con backoff de rate limit del cliente
  useEffect(() => {
    const handler = (evt: any) => {
      try {
        const detail = evt?.detail || {};
        const endpointPath: string = String(detail.endpoint || '');
        // Extraer slug del final del path (e.g., '/api/v1/medications' -> 'medications')
        const parts = endpointPath.split('/').filter(Boolean);
        const slug = parts.length ? parts[parts.length - 1] : endpointPath;
        const waitSeconds = typeof detail.waitSeconds === 'number' && detail.waitSeconds > 0
          ? detail.waitSeconds
          : undefined;
        const until = Date.now() + (waitSeconds ? waitSeconds * 1000 : 30000);
        __endpointBackoffUntil.set(slug, until);
      } catch { /* noop */ }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('rate-limit-exceeded', handler as any);
      return () => window.removeEventListener('rate-limit-exceeded', handler as any);
    }
    return () => {};
  }, []);

  // Register this resource for global refetch on network restore
  useEffect(() => {
    const unregister = registerResourceRefetch(() => refetch(undefined as any));
    return unregister;
  }, [refetch]);

  return { data, loading, error, refetch, createItem, updateItem, deleteItem, setData, meta, setPage, setLimit, setSearch, setFields, refreshing } as UseResourceResult<T, P>;
}

export default useResource;
