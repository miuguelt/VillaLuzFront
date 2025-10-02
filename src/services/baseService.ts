import api from './api';
import { PageResult } from '@/types/commonTypes';
import { extractListFromResponse } from './listExtractor';
import { normalizePagination } from './responseNormalizer';
import type { PaginatedResponse } from '@/types/swaggerTypes';

// Compatible flag for dev mode (avoids use of import.meta in Jest/CommonJS)
const __DEV__ = (typeof (globalThis as any).process !== 'undefined' && (globalThis as any).process.env && (globalThis as any).process.env.NODE_ENV === 'development');

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
      timeout: 10000,
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

  private getCacheKey(params?: Record<string, any>): string {
    const sortedParams = params ? JSON.stringify(Object.fromEntries(Object.entries(params).sort())) : '';
    return `${this.endpoint}:${sortedParams}`;
  }

  protected getFromCache(key: string): T | T[] | PageResult<T> | PaginatedResponse<T> | null {
    if (!this.options.enableCache) return null;
    const cached = this.cache.get(key);
    if (cached && (Date.now() - cached.timestamp < this.options.cacheTimeout!)) {
      return cached.data;
    }
    this.cache.delete(key);
    // Eliminada persistencia de caché
    // this.persistCache();
    return null;
  }

  protected setCache(key: string, data: any): void {
    if (this.options.enableCache) {
      this.cache.set(key, { data, timestamp: Date.now() });
      // Eliminada persistencia de caché
      // this.persistCache();
    }
  }

  public clearCache(): void {
    this.cache.clear();
    // Eliminada persistencia de caché
    // this.persistCache();
    if (__DEV__) {
      console.log(`[Cache] Cache cleared for ${this.endpoint}`);
    }
  }

  private static isOnline(): boolean {
    return typeof navigator === 'undefined' ? true : navigator.onLine;
  }

  // ------- Cola offline eliminada -------
  // private static readQueue() { ... }
  // private static writeQueue(items: OfflineWriteItem[]) { ... }
  public static enqueue(item: OfflineWriteItem): void {
    // No-op stub to satisfy references when offline queue is disabled
    if (__DEV__) {
      console.warn('[OfflineQueue] enqueue (noop):', item);
    }
  }
  // public static async flushOfflineQueue() { ... }

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
    const cached = this.getFromCache(cacheKey);
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
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached as unknown as PaginatedResponse<T>;
 
    const requestParams: Record<string, any> = {
      ...normalizedWithoutToken,
      limit: normalizedWithoutToken.limit,
      sort_dir: normalizedWithoutToken.sort_dir ?? normalizedWithoutToken.sort_order,
      q: normalizedWithoutToken.q ?? normalizedWithoutToken.search,
      fields: normalizedWithoutToken.fields,
    };
    delete requestParams.per_page;
    delete requestParams.sort_order;
    delete requestParams.search;

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
    const cached = this.getFromCache(cacheKey);
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
    }
    const response = await api.put(`${this.endpoint}/${id}`, data);
    this.clearCache();
    return response.data?.data || response.data;
  }

  async patch(id: number | string, data: Partial<T>): Promise<T> {
    if (!BaseService.isOnline()) {
      BaseService.enqueue({ endpoint: this.endpoint, method: 'PATCH', id, payload: data, timestamp: Date.now() });
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
    const searchParams = { ...normalizedParams, q: normalizedParams.search ?? query };
    const cacheKey = this.getCacheKey(searchParams);
    const cached = this.getFromCache(cacheKey);
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

    return {
      page: page ?? rest.page ?? 1,
      limit: limit ?? per_page ?? rest.limit ?? 10,
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
}