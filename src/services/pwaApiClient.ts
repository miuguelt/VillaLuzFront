/**
 * PWA API Client con soporte completo para optimizaciones del backend
 * - ETags y validación condicional (304 Not Modified)
 * - Sincronización incremental (?since=timestamp)
 * - Endpoint /metadata para verificación ligera
 * - Respeto de headers X-Cache-Strategy
 */

import api from './api';
import { BaseService } from './baseService';
import {
  getETag,
  setETag,
  clearETag,
  getLastSync,
  setLastSync,
  normalizeResourceKey,
  hasETagChanged
} from '@/utils/etagStore';
import type { PaginatedResponse } from '@/types/swaggerTypes';

const __DEV__ = typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development';

/**
 * Metadata de un recurso (endpoint /metadata)
 */
export interface ResourceMetadata {
  resource: string;
  total_count: number;
  last_modified: string; // ISO timestamp
  etag: string;
}

/**
 * Configuración de cache por tipo de recurso (basado en X-Cache-Strategy)
 */
export type CacheStrategy = 'cache-first' | 'network-first' | 'stale-while-revalidate';

/**
 * Configuración de recursos maestros vs transaccionales
 */
const RESOURCE_STRATEGIES: Record<string, CacheStrategy> = {
  // Datos maestros (públicos, cambian poco)
  'diseases': 'cache-first',
  'breeds': 'cache-first',
  'species': 'cache-first',
  'medications': 'cache-first',
  'vaccines': 'cache-first',
  'fields': 'cache-first',
  'food_types': 'cache-first',
  'route_administrations': 'cache-first',

  // Datos transaccionales (privados, cambian frecuentemente)
  'vaccinations': 'stale-while-revalidate',
  'treatments': 'stale-while-revalidate',
  'animal_diseases': 'stale-while-revalidate',
  'treatment_medications': 'stale-while-revalidate',
  'treatment_vaccines': 'stale-while-revalidate',
  'controls': 'stale-while-revalidate',
  'animals': 'stale-while-revalidate',
  'animal_fields': 'stale-while-revalidate',

  // Datos de usuario (privados, críticos)
  'users': 'network-first',
};

/**
 * Cliente PWA extendido con capacidades de optimización
 */
export class PWAApiClient<T = any> extends BaseService<T> {
  private resourceKey: string;

  constructor(endpoint: string, options?: any) {
    super(endpoint, options);
    this.resourceKey = normalizeResourceKey(endpoint);
  }

  /**
   * Obtiene la estrategia de caché para este recurso
   */
  public getCacheStrategy(): CacheStrategy {
    return RESOURCE_STRATEGIES[this.resourceKey] || 'network-first';
  }

  /**
   * Obtiene metadata del recurso sin descargar datos completos
   * Usa endpoint /metadata del backend
   */
  async getMetadata(): Promise<ResourceMetadata | null> {
    try {
      const response = await api.get(`${this.endpoint}/metadata`);
      const metadata = response.data?.data || response.data;

      // Guardar ETag de metadata para futuros checks
      if (metadata?.etag) {
        await setETag(`${this.resourceKey}:metadata`, metadata.etag);
      }

      return metadata;
    } catch (error: any) {
      if (__DEV__) {
        console.warn(`[PWA] Metadata no disponible para ${this.resourceKey}:`, error?.message);
      }
      return null;
    }
  }

  /**
   * Verifica si hay cambios en el servidor comparando ETags
   * Retorna true si hay cambios, false si no
   */
  async hasChanges(): Promise<boolean> {
    const metadata = await this.getMetadata();
    if (!metadata) return true; // Asumir cambios si no hay metadata

    const storedETag = await getETag(this.resourceKey);
    if (!storedETag) return true; // No hay ETag previo

    return metadata.etag !== storedETag;
  }

  /**
   * Obtiene datos con validación condicional usando ETags
   * Si el servidor responde 304, retorna datos cacheados
   */
  async getWithETag(params?: Record<string, any>): Promise<PaginatedResponse<T>> {
    const storedETag = await getETag(this.resourceKey);
    const storedLastModified = await getETag(`${this.resourceKey}:last-modified`);

    // Agregar headers condicionales si existen
    const headers: Record<string, string> = {};
    if (storedETag) {
      headers['If-None-Match'] = storedETag;
    }
    if (storedLastModified) {
      headers['If-Modified-Since'] = storedLastModified;
    }

    try {
      const response = await api.get(this.endpoint, {
        params,
        headers,
        validateStatus: (status) => status === 200 || status === 304,
      });

      // 304 Not Modified - usar caché
      if (response.status === 304) {
        if (__DEV__) {
          console.log(`[PWA] 304 Not Modified para ${this.resourceKey} - usando caché`);
        }

        // Retornar desde caché en memoria o IndexedDB
        const cached = await this.getFromCache(this.getCacheKey(params));
        if (cached) {
          return cached as PaginatedResponse<T>;
        }

        // Si no hay caché, hacer request normal
        return this.getPaginated(params);
      }

      // 200 OK - datos nuevos
      const etag = response.headers['etag'] || response.headers['ETag'];
      const lastModified = response.headers['last-modified'] || response.headers['Last-Modified'];

      // Guardar ETags para próxima validación
      if (etag) {
        await setETag(this.resourceKey, etag);
      }
      if (lastModified) {
        await setETag(`${this.resourceKey}:last-modified`, undefined, lastModified);
      }

      // Procesar respuesta normalmente
      const data = response.data?.data || response.data?.items || response.data;
      return {
        data: Array.isArray(data) ? data : [],
        total: response.data?.total || 0,
        page: response.data?.page || 1,
        limit: response.data?.limit || 10,
        totalPages: response.data?.totalPages || response.data?.pages || 1,
        hasNextPage: response.data?.hasNextPage ?? false,
        hasPreviousPage: response.data?.hasPreviousPage ?? false,
      };
    } catch (error) {
      console.error(`[PWA] Error en getWithETag para ${this.resourceKey}:`, error);
      // Fallback a método normal
      return this.getPaginated(params);
    }
  }

  /**
   * Sincronización incremental - solo cambios desde última sincronización
   * Usa ?since=timestamp del backend
   */
  async syncSince(since?: string): Promise<{ data: T[]; hasMore: boolean; newSync: string }> {
    // Usar timestamp guardado si no se proporciona
    const sinceTimestamp = since || await getLastSync(this.resourceKey) || new Date(0).toISOString();

    if (__DEV__) {
      console.log(`[PWA] Sincronizando ${this.resourceKey} desde ${sinceTimestamp}`);
    }

    try {
      const response = await api.get(this.endpoint, {
        params: { since: sinceTimestamp },
      });

      const data = response.data?.data || response.data?.items || [];
      const hasMore = response.data?.meta?.pagination?.has_next_page ?? false;
      const newSync = new Date().toISOString();

      // Guardar nuevo timestamp de sync
      await setLastSync(this.resourceKey, newSync);

      // Actualizar ETag si viene en headers
      const etag = response.headers['etag'] || response.headers['ETag'];
      if (etag) {
        await setETag(this.resourceKey, etag);
      }

      if (__DEV__) {
        console.log(`[PWA] ✅ ${data.length} cambios descargados para ${this.resourceKey}`);
      }

      return {
        data: Array.isArray(data) ? data : [],
        hasMore,
        newSync,
      };
    } catch (error: any) {
      console.error(`[PWA] Error en syncSince para ${this.resourceKey}:`, error?.message);
      throw error;
    }
  }

  /**
   * Sync completo: reinicia timestamp y descarga todo
   */
  async fullSync(): Promise<{ data: T[]; total: number }> {
    if (__DEV__) {
      console.log(`[PWA] Sincronización completa de ${this.resourceKey}`);
    }

    // Resetear timestamp de sync
    await setLastSync(this.resourceKey, new Date(0).toISOString());

    const response = await this.getPaginated();

    // Actualizar timestamp
    await setLastSync(this.resourceKey, new Date().toISOString());

    return {
      data: response.data || [],
      total: response.total || 0,
    };
  }

  /**
   * Invalidar caché y ETags de este recurso
   */
  async invalidate(): Promise<void> {
    this.clearCache();
    await clearETag(this.resourceKey);
    await clearETag(`${this.resourceKey}:metadata`);
    await clearETag(`${this.resourceKey}:last-modified`);
  }
}

/**
 * Factory para crear clientes PWA específicos
 */
export function createPWAClient<T>(endpoint: string): PWAApiClient<T> {
  return new PWAApiClient<T>(endpoint);
}

/**
 * Verifica cambios en múltiples recursos simultáneamente
 */
export async function checkMultipleResources(
  resources: string[]
): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {};

  await Promise.all(
    resources.map(async (resource) => {
      const client = createPWAClient(resource);
      results[resource] = await client.hasChanges();
    })
  );

  return results;
}

/**
 * Sincroniza múltiples recursos en paralelo
 */
export async function syncMultipleResources(
  resources: string[]
): Promise<Record<string, { success: boolean; count: number; error?: string }>> {
  const results: Record<string, { success: boolean; count: number; error?: string }> = {};

  await Promise.all(
    resources.map(async (resource) => {
      const client = createPWAClient(resource);
      try {
        const { data } = await client.syncSince();
        results[resource] = {
          success: true,
          count: data.length,
        };
      } catch (error: any) {
        results[resource] = {
          success: false,
          count: 0,
          error: error?.message || 'Unknown error',
        };
      }
    })
  );

  return results;
}
