
import React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { BaseService } from '@/shared/api/base-service';
import { useCache, useCacheKey } from '@/app/providers/CacheContext';
import axios from 'axios';

import { useSearchParams } from 'react-router-dom';

// Tipos públicos de la API del hook
export type UseGenericCRUDOptions = {
  cacheTTL?: number;
  enableCache?: boolean;
  autoRefresh?: boolean;
};

export type FetchByIdParams = { fields?: string };

export type UseGenericCRUDResult<T extends { id?: number }> = {
  items: T[];
  loading: boolean;
  error: string | null;
  page: number;
  setPage: (p: number) => void;
  limit: number;
  setLimit: (l: number) => void;
  search?: string;
  setSearch: (s: string) => void;
  fields?: string;
  setFields: (f: string) => void;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  fetchItems: (forceRefresh?: boolean) => Promise<T[]>;
  refreshItems: () => void;
  clearError: () => void;
  addItem: (itemData: Partial<T>) => Promise<T | null>;
  updateItem: (id: number, itemData: Partial<T>) => Promise<T | null>;
  deleteItem: (id: number) => Promise<boolean>;
  fetchItemById: (id: number, params?: FetchByIdParams, forceRefresh?: boolean) => Promise<T | null>;
  // Compat names
  data: T[];
  setData: React.Dispatch<React.SetStateAction<T[]>>;
  // Nuevo: estado de refresco suave para evitar parpadeos en UI
  refreshing?: boolean;
};

export type SpecificCRUDHook<T extends { id?: number }> = () => UseGenericCRUDResult<T>;

/**
 * Hook genérico para operaciones CRUD con caché inteligente
 * Elimina la redundancia de código y peticiones innecesarias
 */
export function useGenericCRUD<T extends { id?: number }>(
  service: BaseService<T>,
  entityName: string,
  options: UseGenericCRUDOptions = {}
): UseGenericCRUDResult<T> {
  const { cacheTTL = 15 * 60 * 1000, enableCache = true, autoRefresh = true } = options;
  
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState<boolean>(false);
  const listCancelTokenSourceRef = useRef<ReturnType<typeof axios.CancelToken.source> | null>(axios.CancelToken.source());
  const itemCancelTokenSourceRef = useRef<ReturnType<typeof axios.CancelToken.source> | null>(axios.CancelToken.source());
  // Nuevo estado: refresco en segundo plano (no bloquea tabla)
  const [refreshing, setRefreshing] = useState<boolean>(false);
  
  // Estado de listado unificado: page, limit, search, fields
  const [pageState, setPageState] = useState<number>(1);
  const [limitState, setLimitState] = useState<number>(10);
  const [searchState, setSearchState] = useState<string | undefined>(undefined);
  const [fieldsState, setFieldsState] = useState<string | undefined>(undefined);
  
  // Sincronización con URL (?page, ?limit, ?search, ?fields)
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Meta de paginación unificada
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [hasNextPage, setHasNextPage] = useState<boolean>(false);
  const [hasPreviousPage, setHasPreviousPage] = useState<boolean>(false);
  
  const { getCache, setCache, invalidateByEndpoint } = useCache();
  const { generateKey } = useCacheKey();
  
  // Helper para construir mensajes de error más útiles
  const extractErrorMessage = (err: any, fallback: string): string => {
    // Cancelación controlada por axios
    if (axios.isCancel(err)) {
      return 'Operación cancelada';
    }
  
    // Errores de red (certificado, CORS, servidor caído)
    if (err?.code === 'ERR_NETWORK') {
      return 'No se pudo conectar con el servidor. Verifica el certificado HTTPS y que la API esté disponible.';
    }
  
    // AxiosError con respuesta del servidor
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      const data = err.response?.data as any;
      const serverMsg = (data?.message || data?.error || (Array.isArray(data?.errors) ? data.errors.map((e: any) => e.message || e).join(', ') : data?.errors)) as string | undefined;
  
      if (status === 401) return serverMsg || 'No autorizado. Inicia sesión para continuar.';
      if (status === 403) return serverMsg || 'Acceso denegado. Requiere permisos de Administrador.';
      if (status === 404) return serverMsg || 'Recurso no encontrado.';
      if (status === 422) return serverMsg || 'Datos inválidos. Revisa los Potreros e intenta nuevamente.';
      if (status === 429) return serverMsg || 'Demasiadas solicitudes. Intenta nuevamente más tarde.';
      if (status && status >= 500) {
        // Mensaje amistoso para errores del servidor
        return serverMsg || 'Error del servidor. Intenta nuevamente más tarde o contacta al administrador.';
      }
  
      // Fallback genérico de Axios
      return serverMsg || err.message || fallback;
    }
  
    // Fallback genérico
    return (err instanceof Error ? err.message : undefined) || fallback;
  };
  
  // Leer cambios de query params y sincronizar al estado
  useEffect(() => {
    try {
      const qp = Number(searchParams.get('page') || '') || 1;
      const ql = Number(searchParams.get('limit') || '') || 10;
      const qs = searchParams.get('search') || undefined;
      const qf = searchParams.get('fields') || undefined;
  
      // Solo actualizar si realmente cambian, para evitar bucles
      setPageState(prev => (prev !== qp ? qp : prev));
      setLimitState(prev => (prev !== ql ? ql : prev));
      setSearchState(prev => (prev !== qs ? qs : prev));
      setFieldsState(prev => (prev !== qf ? qf : prev));
    } catch (e) {
      // Ignorar errores de parseo/lectura de query params en entornos de desarrollo
      if (process.env.NODE_ENV !== 'production') {
         
        console.debug('[useGenericCRUD] searchParams parse error', e);
      }
    }
  }, [searchParams]);
  
  // Setters que también actualizan la URL
  const setPage = useCallback((p: number) => {
    setPageState(p);
    const sp = new URLSearchParams(searchParams);
    sp.set('page', String(p));
    setSearchParams(sp, { replace: true });
  }, [searchParams, setSearchParams]);
  
  const setLimit = useCallback((l: number) => {
    setLimitState(l);
    const sp = new URLSearchParams(searchParams);
    sp.set('limit', String(l));
    sp.set('page', '1');
    setSearchParams(sp, { replace: true });
  }, [searchParams, setSearchParams]);
  
  const setSearch = useCallback((s: string) => {
    setSearchState(s || undefined);
    const sp = new URLSearchParams(searchParams);
    if (s) sp.set('search', s); else sp.delete('search');
    sp.set('page', '1');
    setSearchParams(sp, { replace: true });
  }, [searchParams, setSearchParams]);
  
  const setFields = useCallback((f: string) => {
    setFieldsState(f || undefined);
    const sp = new URLSearchParams(searchParams);
    if (f) sp.set('fields', f); else sp.delete('fields');
    setSearchParams(sp, { replace: true });
  }, [searchParams, setSearchParams]);
  
  // Obtener todos los elementos (paginated) con caché
  const fetchItems = useCallback(async (forceRefresh: boolean = false) => {
    const cacheKey = generateKey(entityName, { page: pageState, limit: limitState, search: searchState, fields: fieldsState });
    const hadDataAtStart = Array.isArray(items) && items.length > 0;
    
    // Intentar obtener del caché primero
     if (enableCache && !forceRefresh) {
       const cachedData = getCache<{ items: T[]; meta: any }>(cacheKey);
       if (cachedData && Array.isArray(cachedData.items)) {
         setItems(cachedData.items);
         setTotal(cachedData.meta?.total ?? 0);
         setTotalPages(cachedData.meta?.totalPages ?? 0);
         setHasNextPage(cachedData.meta?.hasNextPage ?? false);
         setHasPreviousPage(cachedData.meta?.hasPreviousPage ?? false);
         setError(null);
         // Log cache hit para monitoreo
         service.logCacheHit();
         return cachedData.items;
       }
     }
    
    // Loading inicial sólo si no hay datos; si ya hay, usar "refreshing" para evitar parpadeo
    if (!hadDataAtStart) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError(null);
    // Cancelar cualquier solicitud de lista en curso y crear un nuevo token
    if (listCancelTokenSourceRef.current) {
      try { listCancelTokenSourceRef.current.cancel('Nueva carga de lista, se cancela la anterior'); } catch { /* noop */ }
    }
    listCancelTokenSourceRef.current = axios.CancelToken.source();
    try {
      const resp = await service.getPaginated({ page: pageState, limit: limitState, search: searchState, fields: fieldsState, cancelToken: listCancelTokenSourceRef.current?.token });
      const arrayData = Array.isArray((resp as any).data) ? (resp as any).data : [];
      setItems(arrayData);
      setTotal((resp as any).total || 0);
      setTotalPages((resp as any).totalPages || 0);
      // Usar has_next/has_prev de la respuesta si están disponibles, sino calcular
      setHasNextPage((resp as any).has_next !== undefined ? (resp as any).has_next : ((resp as any).page < ((resp as any).totalPages || 0)));
      setHasPreviousPage((resp as any).has_prev !== undefined ? (resp as any).has_prev : ((resp as any).page > 1));

      // Guardar en caché
      if (enableCache) {
        setCache(
          cacheKey,
          {
            items: arrayData,
            meta: {
              total: (resp as any).total,
              totalPages: (resp as any).totalPages,
              hasNextPage: (resp as any).has_next ?? ((resp as any).page < ((resp as any).totalPages || 0)),
              hasPreviousPage: (resp as any).has_prev ?? ((resp as any).page > 1),
            },
          },
          cacheTTL
        );
      }
      
      return arrayData;
    } catch (err) {
      if (!axios.isCancel(err)) {
        setError(extractErrorMessage(err, 'Error al cargar los datos'));
      }
      // Evitar vaciar la tabla si ya había datos (refetch suave)
      if (!hadDataAtStart) {
        setItems([]);
      }
      if (!axios.isCancel(err)) throw err;
      return Array.isArray(items) ? items : [];
    } finally {
      if (!hadDataAtStart) {
        setLoading(false);
      }
      setRefreshing(false);
    }
  }, [enableCache, cacheTTL, entityName, pageState, limitState, searchState, fieldsState, generateKey, getCache, setCache, service, items]);

  // Obtener un elemento por ID con Potreros opcionales
  const fetchItemById = useCallback(async (id: number, params?: FetchByIdParams, forceRefresh: boolean = false): Promise<T | null> => {
    const cacheKey = generateKey(entityName, { id, ...(params?.fields ? { fields: params.fields } : {}) });
    
    // Intentar obtener del caché primero
     if (enableCache && !forceRefresh) {
       const cachedData = getCache<T>(cacheKey);
       if (cachedData) {
         // Log cache hit para monitoreo
         service.logCacheHit(`${id}`);
         return cachedData;
       }
     }
    
    setLoading(true);
    setError(null);
    // Cancelar cualquier solicitud de item en curso y crear un nuevo token
    if (itemCancelTokenSourceRef.current) {
      try { itemCancelTokenSourceRef.current.cancel('Nueva carga de elemento, se cancela la anterior'); } catch { /* noop */ }
    }
    itemCancelTokenSourceRef.current = axios.CancelToken.source();
    try {
      const data = await service.getById(id, { ...(params || {}), cancelToken: itemCancelTokenSourceRef.current?.token });
      
      // Guardar en caché
      if (enableCache) {
        setCache(cacheKey, data, cacheTTL);
      }
      
      return data;
    } catch (err) {
      if (!axios.isCancel(err)) {
        setError(extractErrorMessage(err, 'Error al cargar el elemento'));
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, [service, entityName, enableCache, getCache, setCache, generateKey, cacheTTL]);

  // Crear un nuevo elemento e invalidar caché
  const addItem = useCallback(async (itemData: Partial<T>): Promise<T | null> => {
    setLoading(true);
    setError(null);
    try {
      const newItem = await service.create(itemData);
      
      // Actualizar estado local (en primera página visiblemente)
      setItems(prev => [...prev, newItem]);
      
      // Invalidar caché del endpoint y limpiar caché interno del servicio
      if (enableCache) {
        const endpoint = (service as any)?.endpoint || entityName;
        invalidateByEndpoint(endpoint);
        if (typeof (service as any).clearCache === 'function') {
          (service as any).clearCache();
        }
      }
      
      return newItem;
    } catch (err) {
      setError(extractErrorMessage(err, 'Error al crear el elemento'));
      return null;
    } finally {
      setLoading(false);
    }
  }, [service, entityName, enableCache, invalidateByEndpoint]);

  // Actualizar un elemento existente e invalidar caché
  const updateItem = useCallback(async (id: number, itemData: Partial<T>): Promise<T | null> => {
    setLoading(true);
    setError(null);
    try {
      const updatedItem = await service.update(id, itemData);
      
      // Actualizar estado local
      setItems(prev => prev.map(item => 
        item.id === id ? { ...item, ...updatedItem } : item
      ));
      
      // Invalidar caché del endpoint y limpiar caché interno del servicio
      if (enableCache) {
        const endpoint = (service as any)?.endpoint || entityName;
        invalidateByEndpoint(endpoint);
        if (typeof (service as any).clearCache === 'function') {
          (service as any).clearCache();
        }
      }
      
      return updatedItem;
    } catch (err) {
      setError(extractErrorMessage(err, 'Error al actualizar el elemento'));
      return null;
    } finally {
      setLoading(false);
    }
  }, [service, entityName, enableCache, invalidateByEndpoint]);

  // Eliminar un elemento e invalidar caché
  const deleteItem = useCallback(async (id: number): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await service.delete(id);
      
      // Actualizar estado local
      setItems(prev => prev.filter(item => item.id !== id));
      
      // Invalidar caché del endpoint y limpiar caché interno del servicio
      if (enableCache) {
        const endpoint = (service as any)?.endpoint || entityName;
        invalidateByEndpoint(endpoint);
        if (typeof (service as any).clearCache === 'function') {
          (service as any).clearCache();
        }
      }
      
      return true;
    } catch (err) {
      setError(extractErrorMessage(err, 'Error al eliminar el elemento'));
      return false;
    } finally {
      setLoading(false);
    }
  }, [service, entityName, enableCache, invalidateByEndpoint]);

  // Recargar datos forzando refresh
  const refreshItems = useCallback(() => {
    fetchItems(true);
  }, [fetchItems]);

  // Limpiar errores
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Debounce para evitar llamadas excesivas durante cambios rápidos de parámetros
  const debouncedFetchRef = useRef<number | null>(null);
  const lastFetchParamsRef = useRef<string>('');

  // Efecto UNIFICADO: evita múltiples llamadas redundantes con debouncing
  useEffect(() => {
    // Limpiar timeout anterior
    if (debouncedFetchRef.current) {
      clearTimeout(debouncedFetchRef.current);
    }

    // Crear hash de parámetros para detectar cambios reales
    const currentParams = JSON.stringify({ pageState, limitState, searchState, fieldsState });
    const paramsChanged = lastFetchParamsRef.current !== currentParams;

    if (reload) {
      fetchItems(true);
      setReload(false);
      lastFetchParamsRef.current = currentParams;
    } else if (autoRefresh && paramsChanged) {
      // Debounce de 300ms para evitar llamadas excesivas (aumentado de 150ms)
      debouncedFetchRef.current = window.setTimeout(() => {
        fetchItems();
        lastFetchParamsRef.current = currentParams;
      }, 300);
    }

    return () => {
      // Limpiar debounce timeout
      if (debouncedFetchRef.current) {
        clearTimeout(debouncedFetchRef.current);
        debouncedFetchRef.current = null;
      }
      // Cancelar solicitudes pendientes al desmontar
      if (listCancelTokenSourceRef.current) {
        try { listCancelTokenSourceRef.current.cancel('Componente desmontado: lista'); } catch { /* noop */ }
        listCancelTokenSourceRef.current = null;
      }
      if (itemCancelTokenSourceRef.current) {
        try { itemCancelTokenSourceRef.current.cancel('Componente desmontado: item'); } catch { /* noop */ }
        itemCancelTokenSourceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageState, limitState, searchState, fieldsState, reload]);

  return {
    items,
    loading,
    error,
    page: pageState, setPage,
    limit: limitState, setLimit,
    search: searchState, setSearch,
    fields: fieldsState, setFields,
    total, totalPages, hasNextPage, hasPreviousPage,
    fetchItems,
    refreshItems,
    clearError,
    addItem,
    updateItem,
    deleteItem,
    fetchItemById,
    // Compat names
    data: items,
    setData: setItems,
    // Nuevo estado de refresco
    refreshing,
  };
}

export function createCRUDHook<T extends { id?: number }>(
  service: BaseService<T>, 
  entityName: string,
  options?: UseGenericCRUDOptions
): SpecificCRUDHook<T> {
  return function useSpecificCRUD(): UseGenericCRUDResult<T> {
    return useGenericCRUD<T>(service, entityName, options);
  };
}

// Duplicate removed to avoid re-export conflict
