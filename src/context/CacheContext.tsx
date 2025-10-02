import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { getApiBaseURL, isDevelopment } from '@/utils/envConfig';

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

// Persistencia en sessionStorage con TTL
const LS_PREFIX = 'app-cache:';
const lsGet = (k: string): string | null => { try { return sessionStorage.getItem(k); } catch { return null; } };
const lsSet = (k: string, v: string) => { try { sessionStorage.setItem(k, v); } catch { /* quota/disabled */ } };
const lsRemove = (k: string) => { try { sessionStorage.removeItem(k); } catch { /* noop */ } };
const lsKeys = (): string[] => { try { return Array.from({ length: sessionStorage.length }, (_, i) => sessionStorage.key(i)!).filter(Boolean) as string[]; } catch { return []; } };

export const CacheProvider: React.FC<CacheProviderProps> = ({
  children,
  defaultTTL = 5 * 60 * 1000 // 5 minutos por defecto (optimizado para primera carga)
}) => {
  const [cache, setCache] = useState<Map<string, CacheEntry<any>>>(new Map());
  const [preloadQueue, setPreloadQueue] = useState<string[]>([]);

  const getCache = useCallback(<T,>(key: string): T | null => {
    // 1) Intentar en memoria
    const inMem = cache.get(key);
    if (inMem) {
      if (Date.now() > inMem.expiry) {
        const mem = new Map(cache);
        mem.delete(key);
        setCache(mem);
        // limpiar persistencia si expiró
        lsRemove(LS_PREFIX + key);
        return null;
      }
      return inMem.data as T;
    }

    // 2) Intentar desde sessionStorage (hidratar si válido)
    const raw = lsGet(LS_PREFIX + key);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as CacheEntry<T>;
        if (parsed && typeof parsed.expiry === 'number' && Date.now() <= parsed.expiry) {
          const mem = new Map(cache);
          mem.set(key, parsed);
          setCache(mem);
          return parsed.data as T;
        }
        // expirado: limpiar
        lsRemove(LS_PREFIX + key);
      } catch {
        // corrupto: limpiar
        lsRemove(LS_PREFIX + key);
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
    try { lsSet(LS_PREFIX + key, JSON.stringify(entry)); } catch { /* noop */ }
  }, [cache, defaultTTL]);

  const invalidateCache = useCallback((key: string): void => {
    const newCache = new Map(cache);
    newCache.delete(key);
    setCache(newCache);
    // eliminar persistencia
    lsRemove(LS_PREFIX + key);
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
    // sessionStorage (buscar por prefijo y probar la parte de la clave)
    for (const k of lsKeys()) {
      if (!k || !k.startsWith(LS_PREFIX)) continue;
      const logicalKey = k.slice(LS_PREFIX.length);
      if (regex.test(logicalKey)) {
        lsRemove(k);
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
    for (const k of lsKeys()) {
      if (k && k.startsWith(LS_PREFIX)) {
        lsRemove(k);
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

  // Precarga en background de rutas críticas
  const preloadCriticalRoutes = useCallback(() => {
    // Nota: el gating por autenticación se realiza en GlobalNetworkHandlers usando isAuthenticated.
    // Aquí mantenemos sólo la protección de mismo origen y la lógica de precarga.

    // Forzar base relativa para precargas: evita CORS/cookies cruzadas tanto en dev (localhost) como en prod (mismo origen)
    const apiBaseURL = '/api/v1';
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    
    const routeMappings = {
      'api:animals': `${apiBaseURL}/animals`,
      'api:fields': `${apiBaseURL}/fields`,
      'api:diseases': `${apiBaseURL}/diseases`
    };

    Object.entries(routeMappings).forEach(([cacheKey, realURL]) => {
      const cached = getCache(cacheKey);
      const shouldPreload = !cached || ((cached as any)?.expiry - Date.now() < 60000);
      if (!shouldPreload) return;

      try {
        const resolved = new URL(realURL, origin);
        if (resolved.origin !== origin) {
          console.warn(`[CacheContext] Skip preload ${cacheKey} (cross-origin): ${resolved.href}`);
          return;
        }
      } catch {
        if (!realURL.startsWith('/')) {
          console.warn(`[CacheContext] Skip preload ${cacheKey} (non-relative): ${realURL}`);
          return;
        }
      }

      setTimeout(() => {
        console.debug(`[CacheContext] Preloading ${cacheKey} -> ${realURL}`);
        fetch(realURL, {
          method: 'GET',
          cache: 'force-cache',
          credentials: 'include' as RequestCredentials,
          priority: 'low' as any,
          headers: { Accept: 'application/json' }
        }).then(response => {
          if (response.ok) return response.json();
          throw new Error(`Failed to preload ${cacheKey}`);
        }).then(data => {
          setCacheData(cacheKey, data, 3 * 60 * 1000);
        }).catch(() => { /* silent */ });
      }, Math.random() * 5000);
    });
  }, [getCache, setCacheData]);

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
