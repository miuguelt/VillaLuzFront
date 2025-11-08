import api from './api';
import { PageResult } from '@/types/commonTypes';
import { extractListFromResponse } from './listExtractor';
import { normalizePagination } from './responseNormalizer';
import type { PaginatedResponse } from '@/types/swaggerTypes';
import { getDefaultLimitByDevice } from '@/utils/viewportUtils';
import {
  getIndexedDBCache,
  setIndexedDBCache,
  invalidateIndexedDBCacheByPrefix
} from '@/utils/indexedDBCache';
import { offlineQueue } from '@/utils/offlineQueue';
import { getApiBaseURL } from '@/utils/envConfig';

// Compatible flag for dev mode (avoids use of import.meta in Jest/CommonJS)
const __DEV__ = (typeof (globalThis as any).process !== 'undefined' && (globalThis as any).process.env && (globalThis as any).process.env.NODE_ENV === 'development');
const ENV: Record<string, any> = ((globalThis as any)?.['import']?.['meta']?.['env'])
  ?? ((typeof (globalThis as any).process !== 'undefined' ? ((globalThis as any).process as any).env : undefined) as any)
  ?? {};
const AUTH_STORAGE_KEY = ENV.VITE_AUTH_STORAGE_KEY || 'finca_access_token';

interface ServiceOptions {
  enableCache?: boolean;
  cacheTimeout?: number;
  preferredListKeys?: string[];
  retryAttempts?: number;
  timeout?: number;
  persistCache?: boolean;
}

// Tipos para cola offline de escrituras
type WriteMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE';
interface OfflineWriteItem {
  endpoint: string;
  method: WriteMethod;
  id?: number | string;
  path?: string; // soporte para customRequest
  payload?: any;
  timestamp: number;
}

function buildOfflineUrl(item: OfflineWriteItem): string {
  const base = (api?.defaults?.baseURL || getApiBaseURL() || '').replace(/\/$/, '');

  if (/^https?:\/\//i.test(item.endpoint)) {
    return item.endpoint;
  }

  const trimSegment = (value: string | number | undefined | null): string | null => {
    if (value === undefined || value === null) return null;
    const str = String(value).trim();
    if (!str) return null;
    return str.replace(/^\/+/, '').replace(/\/$/, '');
  };

  const endpointSegment = trimSegment(item.endpoint) || '';
  let resource = endpointSegment;

  if (item.path) {
    const pathSegment = trimSegment(item.path) || '';
    resource = pathSegment ? `${endpointSegment}/${pathSegment}` : endpointSegment;
  } else if (item.id !== undefined && item.id !== null) {
    const idSegment = trimSegment(String(item.id));
    resource = idSegment ? `${endpointSegment}/${idSegment}` : endpointSegment;
  }

  if (/^https?:\/\//i.test(resource)) {
    return resource;
  }

  const normalizedResource = resource.startsWith('/') ? resource : `/${resource}`;

  if (/^https?:\/\//i.test(base)) {
    const normalizedBase = base.endsWith('/') ? base : `${base}/`;
    return new URL(normalizedResource.replace(/^\//, ''), normalizedBase).toString();
  }

  return `${base}${normalizedResource}`;
}

export class BaseService<T> {
  protected endpoint: string;
  protected cache: Map<string, { data: any; timestamp: number }>;
  protected options: ServiceOptions;

  // private static readonly OFFLINE_QUEUE_KEY = 'offline_queue_v1';
  // private static cacheStorageKey(endpoint: string) { return `offline_cache_v1:${endpoint}`; }

  constructor(endpoint: string, options: ServiceOptions = {}) {
    this.endpoint = endpoint;
    this.options = {
      enableCache: true,
      cacheTimeout: 5 * 60 * 1000, // 5 minutos
      preferredListKeys: [],
      retryAttempts: 3,
      timeout: 30000, // Increased from 10s to 30s
      persistCache: true,
      ...options,
    };
    this.cache = new Map();
    // Eliminada carga de caché persistida
    // this.loadPersistedCache();

    // Eliminado listener global de reconexión y cola offline
    // if (typeof window !== 'undefined' && !(BaseService as any)._onlineHandlerRegistered) {
    //   window.addEventListener('online', () => {
    //     BaseService.flushOfflineQueue().catch((e) => console.warn('[OfflineQueue] flush error:', e));
    //   });
    //   (BaseService as any)._onlineHandlerRegistered = true;
    // }
  }

  // ------- Utilidades de caché persistente eliminadas -------
  // private loadPersistedCache() { ... }
  // private persistCache() { ... }
  // private static cacheStorageKey(endpoint: string) { ... }

  protected getCacheKey(params?: Record<string, any>): string {
    const sortedParams = params ? JSON.stringify(Object.fromEntries(Object.entries(params).sort())) : '';
    return `${this.endpoint}:${sortedParams}`;
  }

  /**
   * Obtiene datos del cache (memoria primero, luego IndexedDB)
   */
  protected async getFromCache(key: string): Promise<T | T[] | PageResult<T> | PaginatedResponse<T> | null> {
    if (!this.options.enableCache) return null;

    // 1. Cache en memoria (rápido)
    const memCached = this.cache.get(key);
    if (memCached && (Date.now() - memCached.timestamp < this.options.cacheTimeout!)) {
      return memCached.data;
    }

    // 2. Cache en IndexedDB (persistente)
    try {
      const idbKey = `service:${key}`;
      const idbData = await getIndexedDBCache<any>(idbKey);
      if (idbData) {
        // Hidratar memoria
        this.cache.set(key, { data: idbData, timestamp: Date.now() });
        return idbData;
      }
    } catch (error) {
      if (__DEV__) console.warn('[BaseService] Error leyendo cache IndexedDB:', error);
    }

    return null;
  }

  /**
   * Guarda datos en cache (memoria + IndexedDB)
   */
  protected setCache(key: string, data: any): void {
    if (!this.options.enableCache) return;

    // 1. Memoria (sincrónico)
    this.cache.set(key, { data, timestamp: Date.now() });

    // 2. IndexedDB (asíncrono en background)
    const idbKey = `service:${key}`;
    void setIndexedDBCache(idbKey, data, this.options.cacheTimeout).catch(err => {
      if (__DEV__) console.warn('[BaseService] Error escribiendo cache IndexedDB:', err);
    });
  }

  /**
   * Limpia cache (memoria + IndexedDB)
   */
  public clearCache(): void {
    // 1. Limpiar memoria
    this.cache.clear();

    // 2. Limpiar IndexedDB en background
    const prefix = `service:${this.endpoint}`;
    void invalidateIndexedDBCacheByPrefix(prefix).catch(err => {
      if (__DEV__) console.warn('[BaseService] Error limpiando cache IndexedDB:', err);
    });

    if (__DEV__) {
      console.log(`[Cache] Cache cleared for ${this.endpoint}`);
    }
  }

  private static isOnline(): boolean {
    return typeof navigator === 'undefined' ? true : navigator.onLine;
  }

  // ------- Cola offline con offlineQueue utility -------
  public static enqueue(item: OfflineWriteItem): void {
    const fullUrl = buildOfflineUrl(item);

    let token: string | null = null;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        token = window.localStorage.getItem(AUTH_STORAGE_KEY);
      }
    } catch {
      token = null;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    offlineQueue.enqueue(
      item.method,
      fullUrl,
      item.payload,
      headers
    );

    if (__DEV__) {
      console.log('[BaseService] Operación encolada:', item.method, fullUrl);
    }
  }

  async getAll(params?: Record<string, any>): Promise<T[]> {
    const normalizedParams = BaseService.buildListParams(params || {});
    const { cancelToken, ...restParams } = normalizedParams as any;

    const originalParams = (params || {}) as Record<string, any>;
    const hasExplicitLimit = Object.prototype.hasOwnProperty.call(originalParams, 'limit') || Object.prototype.hasOwnProperty.call(originalParams, 'per_page');
    const hasExplicitPage = Object.prototype.hasOwnProperty.call(originalParams, 'page');

    const sanitizedParams: Record<string, any> = { ...restParams };
    if (!hasExplicitPage) delete sanitizedParams.page;
    if (!hasExplicitLimit) delete sanitizedParams.limit;

    if (hasExplicitLimit) {
      sanitizedParams.limit = sanitizedParams.limit;
    }
    delete sanitizedParams.per_page;
    sanitizedParams.sort_dir = sanitizedParams.sort_dir ?? sanitizedParams.sort_order;
    sanitizedParams.q = sanitizedParams.q ?? sanitizedParams.search;

    delete sanitizedParams.sort_order;
    delete sanitizedParams.search;

    const cacheKey = this.getCacheKey(sanitizedParams);
    const cached = await this.getFromCache(cacheKey);
    if (cached) return cached as T[];

    // Intentar red; si offline o falla por red, caer a caché si existe
    try {
      const response = await api.get(this.endpoint, { params: sanitizedParams, cancelToken });
      const data = extractListFromResponse(response, this.options.preferredListKeys);
      this.setCache(cacheKey, data);
      return data;
    } catch (e: any) {
      const offlineLike = !BaseService.isOnline() || e?.code === 'ERR_NETWORK';
      if (offlineLike && cached) {
        if (__DEV__) console.warn('[GET all] offline fallback from cache for', this.endpoint);
        return cached as T[];
      }
      throw e;
    }
  }

  async getPaginated(params?: Record<string, any>): Promise<PaginatedResponse<T>> {
    const normalizedParams = BaseService.buildListParams(params || {});
    const { cancelToken, ...normalizedWithoutToken } = normalizedParams as any;
    const cacheKey = this.getCacheKey(normalizedWithoutToken);
    const cached = await this.getFromCache(cacheKey);
    if (cached) return cached as unknown as PaginatedResponse<T>;
 
    const searchValue = normalizedWithoutToken.q ?? normalizedWithoutToken.search;
    const requestParams: Record<string, any> = {
      ...normalizedWithoutToken,
      limit: normalizedWithoutToken.limit,
      sort_dir: normalizedWithoutToken.sort_dir ?? normalizedWithoutToken.sort_order,
      // Enviar ambos para máxima compatibilidad de backend
      q: searchValue,
      search: searchValue,
      fields: normalizedWithoutToken.fields,
    };
    delete requestParams.per_page;
    delete requestParams.sort_order;

    // Log cuando se filtrapor IDs específicos (como breed_id)
    const filterKeys = Object.keys(requestParams).filter(k => k.endsWith('_id') && requestParams[k]);
    if (filterKeys.length > 0) {
      console.log(`[BaseService.getPaginated] ${this.endpoint} - Filtrando por:`,
        Object.fromEntries(filterKeys.map(k => [k, requestParams[k]]))
      );
    }

    try {
      const response = await api.get(this.endpoint, { params: requestParams, cancelToken });

      // Log la respuesta cuando se filtra por IDs
      if (filterKeys.length > 0) {
        const items = response.data?.data || response.data?.items || [];
        console.log(`[BaseService.getPaginated] ${this.endpoint} - Respuesta del backend:`, {
          totalFromServer: response.data?.total,
          itemsCount: Array.isArray(items) ? items.length : 0,
          filters: Object.fromEntries(filterKeys.map(k => [k, requestParams[k]]))
        });
      }
      const normalized: PageResult<T> = normalizePagination<T>(response, this.options.preferredListKeys) || {
        items: [],
        total: 0,
        page: 1,
        page_size: 10,
        pages: 0,
      };
      const paginated: PaginatedResponse<T> = {
        data: normalized.items,
        total: normalized.total,
        page: normalized.page,
        limit: normalized.page_size,
        totalPages: normalized.pages,
        hasNextPage: normalized.page < normalized.pages,
        hasPreviousPage: normalized.page > 1,
        rawMeta: { page_size: normalized.page_size, totalPages: normalized.pages }
      };
      this.setCache(cacheKey, paginated);
      return paginated;
    } catch (e: any) {
      const offlineLike = !BaseService.isOnline() || e?.code === 'ERR_NETWORK';
      if (offlineLike && cached) {
        if (__DEV__) console.warn('[GET paginated] offline fallback from cache for', this.endpoint);
        return cached as unknown as PaginatedResponse<T>;
      }
       throw e;
     }
   }

  async getById(id: number | string, params?: Record<string, any>): Promise<T> {
    const normalizedParams = BaseService.buildListParams(params || {});
    const { cancelToken, ...normalizedWithoutToken } = normalizedParams as any;
    const requestParams: Record<string, any> = {};
    if (normalizedWithoutToken.fields) requestParams.fields = normalizedWithoutToken.fields;

    const cacheKey = this.getCacheKey({ id, ...requestParams });
    const cached = await this.getFromCache(cacheKey);
    if (cached) return cached as T;

    try {
      const response = await api.get(`${this.endpoint}/${id}`, { params: requestParams, cancelToken });
      const data = response.data?.data || response.data;
      this.setCache(cacheKey, data);
      return data;
    } catch (e: any) {
      const offlineLike = !BaseService.isOnline() || e?.code === 'ERR_NETWORK';
      if (offlineLike && cached) {
        if (__DEV__) console.warn('[GET byId] offline fallback from cache for', this.endpoint, id);
        return cached as T;
      }
      throw e;
    }
  }

  async create(data: Partial<T>): Promise<T> {
    if (!BaseService.isOnline()) {
      BaseService.enqueue({ endpoint: this.endpoint, method: 'POST', payload: data, timestamp: Date.now() });
      // Resultado optimista: devolver datos con flag de cola
      return ({ ...(data as any), __offlineQueued: true } as unknown) as T;
    }
    const response = await api.post(this.endpoint, data);
    this.clearCache();
    return response.data?.data || response.data;
  }

  async update(id: number | string, data: Partial<T>): Promise<T> {
    if (!BaseService.isOnline()) {
      BaseService.enqueue({ endpoint: this.endpoint, method: 'PUT', id, payload: data, timestamp: Date.now() });
      return ({ ...(data as any), id, __offlineQueued: true } as unknown) as T;
    }
    const response = await api.put(`${this.endpoint}/${id}`, data);
    this.clearCache();
    return response.data?.data || response.data;
  }

  async patch(id: number | string, data: Partial<T>): Promise<T> {
    if (!BaseService.isOnline()) {
      BaseService.enqueue({ endpoint: this.endpoint, method: 'PATCH', id, payload: data, timestamp: Date.now() });
      return ({ ...(data as any), id, __offlineQueued: true } as unknown) as T;
    }
    const response = await api.patch(`${this.endpoint}/${id}`, data);
    this.clearCache();
    return response.data?.data || response.data;
  }

  async delete(id: number | string): Promise<boolean> {
    if (!BaseService.isOnline()) {
      BaseService.enqueue({ endpoint: this.endpoint, method: 'DELETE', id, timestamp: Date.now() });
      this.clearCache();
      return true;
    }
    await api.delete(`${this.endpoint}/${id}`);
    this.clearCache();
    return true;
  }

  /**
   * Performs a HEAD request on the collection endpoint to validate availability / caching headers.
   * Useful for coverage tools against documented HEAD routes.
   */
  async headRoot(params?: Record<string, any>): Promise<Record<string, any>> {
    const response = await api.head(this.endpoint, { params });
    return response.headers as Record<string, any>;
  }

  /**
   * Performs a HEAD request on an individual resource endpoint.
   */
  async headById(id: number | string): Promise<Record<string, any>> {
    const response = await api.head(`${this.endpoint}/${id}`);
    return response.headers as Record<string, any>;
  }

  async search(query: string, params?: Record<string, any>): Promise<T[]> {
    const normalizedParams = BaseService.buildListParams(params || {});
    const searchValue = normalizedParams.search ?? query;
    const searchParams = { ...normalizedParams, q: searchValue, search: searchValue };
    const cacheKey = this.getCacheKey(searchParams);
    const cached = await this.getFromCache(cacheKey);
    if (cached) return cached as T[];

    try {
      const response = await api.get(`${this.endpoint}/search`, { params: searchParams });
      const data = extractListFromResponse(response, this.options.preferredListKeys);
      this.setCache(cacheKey, data);
      return data;
    } catch (e: any) {
      const offlineLike = !BaseService.isOnline() || e?.code === 'ERR_NETWORK';
      if (offlineLike && cached) {
        if (__DEV__) console.warn('[SEARCH] offline fallback from cache for', this.endpoint);
        return cached as T[];
      }
      throw e;
    }
  }
  
  async customRequest<R>(path: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH', payload: any = null, config: any = {}): Promise<R> {
    const url = `${this.endpoint}/${path}`;
    if (!BaseService.isOnline() && method !== 'GET') {
      BaseService.enqueue({ endpoint: this.endpoint, method: method as WriteMethod, path, payload, timestamp: Date.now() });
      return ({ __offlineQueued: true } as unknown) as R;
    }
    const response = await api.request({
      url,
      method,
      data: payload,
      ...config,
    });
    return response.data?.data || response.data || response;
  }

  /**
   * Helper para construir parámetros de listado compatibles con contrato unificado.
   * Acepta alias legacy y los normaliza.
   */
  public static buildListParams(opts: Record<string, any> = {}): Record<string, any> {
    const {
      page,
      limit,
      per_page, // legacy
      search,
      q, // legacy
      sort_by,
      sortBy,
      sort_order,
      order,
      include_relations,
      cache_bust,
      fields,
      export: exportFlag,
      ...rest
    } = opts;

    // Calcular límite dinámico basado en viewport si no se especifica
    let defaultLimit = 10; // Fallback SSR
    try {
      if (typeof window !== 'undefined') {
        defaultLimit = getDefaultLimitByDevice();
      }
    } catch (e) {
      // Silently fallback to 10
    }

    return {
      page: page ?? rest.page ?? 1,
      limit: limit ?? per_page ?? rest.limit ?? defaultLimit,
      search: search ?? q,
      sort_by: sort_by ?? sortBy,
      sort_order: sort_order ?? order,
      include_relations,
      cache_bust,
      fields,
      export: exportFlag,
      ...rest,
    };
  }

  public logCacheHit(key?: string): void {
    if (__DEV__) {
      console.log(`[Cache] hit for ${this.endpoint}${key ? ' key=' + key : ''}`);
    }
  }

  // ============================================================
  // PWA Optimization Methods
  // ============================================================

  /**
   * Obtiene metadata del recurso (endpoint /metadata)
   * Devuelve información ligera sin descargar datos completos
   */
  async getMetadata(): Promise<{ resource: string; total_count: number; last_modified: string; etag: string } | null> {
    try {
      const response = await api.get(`${this.endpoint}/metadata`);
      return response.data?.data || response.data;
    } catch (error: any) {
      if (__DEV__) {
        console.warn(`[BaseService] Metadata no disponible para ${this.endpoint}:`, error?.message);
      }
      return null;
    }
  }

  /**
   * Sincronización incremental - obtiene solo registros modificados desde una fecha
   * Usa el parámetro ?since=timestamp del backend
   *
   * @param since - Timestamp ISO 8601 desde el cual obtener cambios
   * @returns Registros modificados desde la fecha especificada
   */
  async getSince(since: string): Promise<T[]> {
    try {
      const response = await api.get(this.endpoint, {
        params: { since },
      });

      const data = extractListFromResponse(response, this.options.preferredListKeys);

      if (__DEV__) {
        console.log(`[BaseService] Sync incremental ${this.endpoint}: ${data.length} cambios desde ${since}`);
      }

      return data;
    } catch (error: any) {
      if (__DEV__) {
        console.error(`[BaseService] Error en getSince para ${this.endpoint}:`, error?.message);
      }
      throw error;
    }
  }

  /**
   * Realiza una petición GET con validación condicional usando ETags
   * Si el servidor responde 304 Not Modified, retorna datos cacheados
   *
   * @param params - Parámetros de query
   * @param etag - ETag almacenado para validación condicional
   * @param lastModified - Last-Modified almacenado para validación condicional
   * @returns Datos del servidor o caché si no hay cambios (304)
   */
  async getWithConditionalHeaders(
    params?: Record<string, any>,
    etag?: string,
    lastModified?: string
  ): Promise<{ data: T[]; etag?: string; lastModified?: string; status: number }> {
    const headers: Record<string, string> = {};

    if (etag) {
      headers['If-None-Match'] = etag;
    }
    if (lastModified) {
      headers['If-Modified-Since'] = lastModified;
    }

    try {
      const response = await api.get(this.endpoint, {
        params,
        headers,
        validateStatus: (status) => status === 200 || status === 304,
      });

      // 304 Not Modified - datos no han cambiado
      if (response.status === 304) {
        if (__DEV__) {
          console.log(`[BaseService] 304 Not Modified para ${this.endpoint} - usando caché`);
        }

        const cacheKey = this.getCacheKey(params);
        const cached = await this.getFromCache(cacheKey);

        return {
          data: (cached as T[]) || [],
          etag,
          lastModified,
          status: 304,
        };
      }

      // 200 OK - datos nuevos disponibles
      const data = extractListFromResponse(response, this.options.preferredListKeys);
      const newETag = response.headers['etag'] || response.headers['ETag'];
      const newLastModified = response.headers['last-modified'] || response.headers['Last-Modified'];

      // Cachear datos nuevos
      const cacheKey = this.getCacheKey(params);
      this.setCache(cacheKey, data);

      return {
        data,
        etag: newETag,
        lastModified: newLastModified,
        status: 200,
      };
    } catch (error: any) {
      if (__DEV__) {
        console.error(`[BaseService] Error en getWithConditionalHeaders para ${this.endpoint}:`, error?.message);
      }
      throw error;
    }
  }
}
