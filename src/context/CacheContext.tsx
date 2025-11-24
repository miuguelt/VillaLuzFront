import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { getApiBaseURL } from '@/utils/envConfig';
import { speciesService } from '@/services/speciesService';
import { breedsService } from '@/services/breedsService';
import { fieldService } from '@/services/fieldService';
import { diseaseService } from '@/services/diseaseService';
import { medicationsService } from '@/services/medicationsService';
import { vaccinesService } from '@/services/vaccinesService';
import { foodTypesService } from '@/services/foodTypesService';
import { animalService } from '@/services/animalService';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

interface CacheContextType {
  getCache: <T>(key: string) => T | null;
  setCache: <T>(key: string, data: T, ttl?: number) => void;
  invalidateCache: (key: string) => void;
  invalidatePattern: (pattern: string) => void;
  // Nuevo: invalidar por endpoint real (coincide con las claves generadas por useCacheKey)
  invalidateByEndpoint: (endpoint: string) => void;
  clearCache: () => void;
  preloadData: <T>(key: string, fetchFn: () => Promise<T>, ttl?: number) => Promise<T>;
  preloadCriticalRoutes: () => void;
}

const CacheContext = createContext<CacheContextType | undefined>(undefined);

export const useCache = () => {
  const context = useContext(CacheContext);
  if (context === undefined) {
    throw new Error('useCache must be used within a CacheProvider');
  }
  return context;
};

interface CacheProviderProps {
  children: ReactNode;
  defaultTTL?: number; // Time to live en milisegundos
}

// Persistencia priorizando localStorage (fallback a sessionStorage) con TTL + tolerancia offline
const CACHE_PREFIX = 'offline_cache_v2:';
const OFFLINE_GRACE_MS = 24 * 60 * 60 * 1000; // 24h de gracia para redes intermitentes

const getPreferredStorage = (): Storage | null => {
  try {
    if (typeof window === 'undefined') return null;
    if (window.localStorage) return window.localStorage;
    if (window.sessionStorage) return window.sessionStorage;
    return null;
  } catch {
    return null;
  }
};

const storageGet = (k: string): string | null => {
  const storage = getPreferredStorage();
  if (!storage) return null;
  try { return storage.getItem(k); } catch { return null; }
};
const storageSet = (k: string, v: string) => {
  const storage = getPreferredStorage();
  if (!storage) return;
  try { storage.setItem(k, v); } catch { /* quota/disabled */ }
};
const storageRemove = (k: string) => {
  const storage = getPreferredStorage();
  if (!storage) return;
  try { storage.removeItem(k); } catch { /* noop */ }
};
const storageKeys = (): string[] => {
  const storage = getPreferredStorage();
  if (!storage) return [];
  try {
    return Array.from({ length: storage.length }, (_, i) => storage.key(i)!).filter(Boolean) as string[];
  } catch {
    return [];
  }
};

const isOffline = (): boolean => {
  try {
    return typeof navigator !== 'undefined' && navigator.onLine === false;
  } catch {
    return false;
  }
};

export const CacheProvider: React.FC<CacheProviderProps> = ({
  children,
  defaultTTL = 5 * 60 * 1000 // 5 minutos por defecto (optimizado para primera carga)
}) => {
  const [cache, setCache] = useState<Map<string, CacheEntry<any>>>(new Map());
  const [, setPreloadQueue] = useState<string[]>([]);
  const { generateKey } = useCacheKey();

  const getCache = useCallback(<T,>(key: string): T | null => {
    const now = Date.now();
    const offline = isOffline();

    const purgeKey = () => {
      const mem = new Map(cache);
      mem.delete(key);
      setCache(mem);
      storageRemove(CACHE_PREFIX + key);
    };

    // 1) Intentar en memoria
    const inMem = cache.get(key);
    if (inMem) {
      const offlineAllowedUntil = inMem.expiry + OFFLINE_GRACE_MS;
      const expired = now > inMem.expiry;
      if (expired && !(offline && now <= offlineAllowedUntil)) {
        purgeKey();
        return null;
      }
      return inMem.data as T;
    }

    // 2) Intentar desde storage persistente (hidratar si válido)
    const raw = storageGet(CACHE_PREFIX + key);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as CacheEntry<T>;
        if (parsed && typeof parsed.expiry === 'number') {
          const offlineAllowedUntil = parsed.expiry + OFFLINE_GRACE_MS;
          const expired = now > parsed.expiry;
          if (expired && !(offline && now <= offlineAllowedUntil)) {
            storageRemove(CACHE_PREFIX + key);
            return null;
          }
          const mem = new Map(cache);
          mem.set(key, parsed);
          setCache(mem);
          return parsed.data as T;
        }
        storageRemove(CACHE_PREFIX + key);
      } catch {
        storageRemove(CACHE_PREFIX + key);
      }
    }

    return null;
  }, [cache]);

  const setCacheData = useCallback(<T,>(key: string, data: T, ttl?: number): void => {
    const timeToLive = ttl || defaultTTL;
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + timeToLive
    };
    // memoria
    const newCache = new Map(cache);
    newCache.set(key, entry);
    setCache(newCache);
    // persistencia
    try { storageSet(CACHE_PREFIX + key, JSON.stringify(entry)); } catch { /* noop */ }
  }, [cache, defaultTTL]);

  const invalidateCache = useCallback((key: string): void => {
    const newCache = new Map(cache);
    newCache.delete(key);
    setCache(newCache);
    // eliminar persistencia
    storageRemove(CACHE_PREFIX + key);
  }, [cache]);

  const invalidatePattern = useCallback((pattern: string): void => {
    const newCache = new Map(cache);
    const regex = new RegExp(pattern);
    // memoria
    for (const key of newCache.keys()) {
      if (regex.test(key)) {
        newCache.delete(key);
      }
    }
    setCache(newCache);
    // storage (buscar por prefijo y probar la parte de la clave)
    for (const k of storageKeys()) {
      if (!k || !k.startsWith(CACHE_PREFIX)) continue;
      const logicalKey = k.slice(CACHE_PREFIX.length);
      if (regex.test(logicalKey)) {
        storageRemove(k);
      }
    }
  }, [cache]);

  // Invalidación consistente por endpoint real
  const invalidateByEndpoint = useCallback((endpoint: string): void => {
    const apiBaseURL = getApiBaseURL();
    // Normalizar endpoint para evitar dobles barras
    const normalized = (endpoint || '').replace(/^\/+/, '');
    const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Las claves generadas por useCacheKey son `${apiBaseURL}/${endpoint}` + opcional `:<paramsBase64>`
    const prefix = `^${escapeRegex(`${apiBaseURL}/${normalized}`)}`;
    try {
      invalidatePattern(prefix);
    } catch (e) {
      // fallback defensivo
      console.warn('[CacheContext] invalidateByEndpoint fallback using invalidatePattern', e);
      invalidatePattern(prefix);
    }
  }, [invalidatePattern]);

  const clearCache = useCallback((): void => {
    setCache(new Map());
    // remover todas las entradas del prefijo
    for (const k of storageKeys()) {
      if (k && k.startsWith(CACHE_PREFIX)) {
        storageRemove(k);
      }
    }
  }, []);

  // Estrategia de precarga inteligente
  const preloadData = useCallback(async (key: string, fetchFn: () => Promise<any>, ttl?: number) => {
    // Verificar si ya está en caché y es válido
    const existing = getCache(key);
    if (existing) {
      return existing;
    }

    // Añadir a la cola de precarga si no está ya en proceso
    setPreloadQueue(prev => {
      if (prev.includes(key)) {
        return prev;
      }
      return [...prev, key];
    });

    try {
      const data = await fetchFn();
      setCacheData(key, data, ttl);
      return data;
    } catch (error) {
      console.warn(`[CacheContext] Error en precarga de ${key}:`, error);
      throw error;
    } finally {
      // Remover de la cola de precarga
      setPreloadQueue(prev => prev.filter(k => k !== key));
    }
  }, [getCache, setCacheData]);

  // Precarga en background de rutas críticas usando servicios autenticados
  const preloadCriticalRoutes = useCallback(() => {
    if (isOffline()) {
      console.debug('[CacheContext] Precarga omitida: sin conexión');
      return;
    }

    const baseTtl = 45 * 60 * 1000; // 45 minutos para listas dinámicas
    const masterTtl = 12 * 60 * 60 * 1000; // 12h para catálogos maestros

    const toCachePayload = (resp: any) => {
      const items = Array.isArray(resp?.data) ? resp.data : [];
      return {
        items,
        data: items,
        meta: {
          page: resp?.page ?? 1,
          limit: resp?.limit ?? items.length ?? 0,
          total: resp?.total ?? items.length ?? 0,
          totalPages: resp?.totalPages ?? resp?.pages ?? 1,
          hasNextPage: resp?.hasNextPage ?? resp?.has_next ?? false,
          hasPreviousPage: resp?.hasPreviousPage ?? resp?.has_prev ?? false,
          rawMeta: resp?.rawMeta ?? resp?.meta,
        },
        timestamp: Date.now(),
      };
    };

    const tasks: Array<{ key: string; fetchFn: () => Promise<any>; ttl: number }> = [
      { key: generateKey('species', { limit: 200 }), fetchFn: () => speciesService.getPaginated({ limit: 200 }), ttl: masterTtl },
      { key: generateKey('breeds', { limit: 200 }), fetchFn: () => breedsService.getPaginated({ limit: 200 }), ttl: masterTtl },
      { key: generateKey('fields', { limit: 200 }), fetchFn: () => fieldService.getPaginated({ limit: 200 }), ttl: masterTtl },
      { key: generateKey('diseases', { limit: 200 }), fetchFn: () => diseaseService.getPaginated({ limit: 200 }), ttl: masterTtl },
      { key: generateKey('medications', { limit: 200 }), fetchFn: () => medicationsService.getPaginated({ limit: 200 }), ttl: masterTtl },
      { key: generateKey('vaccines', { limit: 200 }), fetchFn: () => vaccinesService.getPaginated({ limit: 200 }), ttl: masterTtl },
      { key: generateKey('food_types', { limit: 200 }), fetchFn: () => foodTypesService.getPaginated({ limit: 200 }), ttl: masterTtl },
      { key: generateKey('animals', { page: 1, limit: 20 }), fetchFn: () => animalService.getPaginated({ page: 1, limit: 20 }), ttl: baseTtl },
    ];

    tasks.forEach(({ key, fetchFn, ttl }) => {
      if (getCache(key)) return; // ya en caché
      void preloadData(
        key,
        async () => {
          const resp = await fetchFn();
          return toCachePayload(resp);
        },
        ttl
      ).catch((err) => console.warn(`[CacheContext] Error en precarga de ${key}:`, err));
    });
  }, [generateKey, getCache, preloadData]);

  const value: CacheContextType = {
    getCache,
    setCache: setCacheData,
    invalidateCache,
    invalidatePattern,
    invalidateByEndpoint,
    clearCache,
    preloadData,
    preloadCriticalRoutes
  };

  return (
    <CacheContext.Provider value={value}>
      {children}
    </CacheContext.Provider>
  );
};

// Hook para generar claves de cache consistentes
export const useCacheKey = () => {
  const generateKey = useCallback((endpoint: string, params?: Record<string, any>): string => {
    const apiBaseURL = getApiBaseURL();
    const baseKey = `${apiBaseURL}/${endpoint}`;
    
    if (!params || Object.keys(params).length === 0) {
      return baseKey;
    }
    
    // Ordenar parámetros para consistencia
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {} as Record<string, any>);
    
    const paramString = JSON.stringify(sortedParams);
    return `${baseKey}:${btoa(paramString)}`;
  }, []);

  return { generateKey };
};

// Utilidades para invalidación de cache
export const CacheUtils = {
  // Patrones comunes para invalidación
  patterns: {
    animals: 'api:animals',
    users: 'api:users',
    diseases: 'api:diseases',
    controls: 'api:control',
    fields: 'api:fields',
    medications: 'api:medications',
    treatments: 'api:treatments',
    species: 'api:species',
    breeds: 'api:breeds',
    vaccines: 'api:vaccines',
    vaccinations: 'api:vaccinations'
  },
  
  // Generar claves relacionadas para invalidación en cascada
  getRelatedKeys: (entity: string, id?: number): string[] => {
    const keys = [`api:${entity}`];
    
    if (id) {
      keys.push(`api:${entity}:${id}`);
    }
    
    // Agregar entidades relacionadas
    switch (entity) {
      case 'animals':
        keys.push('api:animalDiseases', 'api:animalFields', 'api:geneticImprovements');
        break;
      case 'diseases':
        keys.push('api:animalDiseases');
        break;
      case 'fields':
        keys.push('api:animalFields');
        break;
      case 'treatments':
        keys.push('api:treatmentMedications');
        break;
    }
    
    return keys;
  },

  // Función de utilidad para convertir claves "api:" a URLs reales
  getRealURL: (cacheKey: string): string => {
    const apiBaseURL = getApiBaseURL();
    if (cacheKey.startsWith('api:')) {
      const endpoint = cacheKey.substring(4); // Remover "api:"
      return `${apiBaseURL}/${endpoint}`;
    }
    return cacheKey; // Si no es una clave "api:", devolver como está
  }
};
