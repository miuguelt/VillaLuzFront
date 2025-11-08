/**
 * Hooks de React para optimizaciones de performance
 */

import { useEffect, useRef, useCallback, useMemo, DependencyList } from 'react';
import { debounce, throttle, memoryCache, prefetchData, onScrollEnd } from '@/utils/performance';

// ============================================================================
// useDebounce - Hook para valores debounced
// ============================================================================

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// ============================================================================
// useDebouncedCallback - Hook para callbacks debounced
// ============================================================================

export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: DependencyList = []
): T {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useMemo(
    () =>
      debounce((...args: Parameters<T>) => {
        return callbackRef.current(...args);
      }, delay) as T,
    [delay, ...deps]
  );
}

// ============================================================================
// useThrottle - Hook para valores throttled
// ============================================================================

export function useThrottle<T>(value: T, delay: number): T {
  const [throttledValue, setThrottledValue] = React.useState<T>(value);
  const lastExecuted = useRef<number>(Date.now());

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastExecution = now - lastExecuted.current;

    if (timeSinceLastExecution >= delay) {
      lastExecuted.current = now;
      setThrottledValue(value);
    } else {
      const timer = setTimeout(() => {
        lastExecuted.current = Date.now();
        setThrottledValue(value);
      }, delay - timeSinceLastExecution);

      return () => clearTimeout(timer);
    }
  }, [value, delay]);

  return throttledValue;
}

// ============================================================================
// useThrottledCallback - Hook para callbacks throttled
// ============================================================================

export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: DependencyList = []
): T {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useMemo(
    () =>
      throttle((...args: Parameters<T>) => {
        return callbackRef.current(...args);
      }, delay) as T,
    [delay, ...deps]
  );
}

// ============================================================================
// useMemoryCache - Hook para usar el caché en memoria
// ============================================================================

export function useMemoryCache<T>(
  key: string,
  fetchFn: () => Promise<T> | T,
  ttl?: number
): {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  invalidate: () => void;
} {
  const [data, setData] = React.useState<T | null>(() => memoryCache.get<T>(key));
  const [loading, setLoading] = React.useState<boolean>(!memoryCache.has(key));
  const [error, setError] = React.useState<Error | null>(null);
  const isMounted = useRef(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchFn();

      if (isMounted.current) {
        setData(result);
        memoryCache.set(key, result, ttl);
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err as Error);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [key, fetchFn, ttl]);

  const invalidate = useCallback(() => {
    memoryCache.invalidate(key);
    setData(null);
  }, [key]);

  useEffect(() => {
    isMounted.current = true;

    // Si no hay datos en caché, hacer fetch
    if (!memoryCache.has(key)) {
      fetch();
    }

    return () => {
      isMounted.current = false;
    };
  }, [key, fetch]);

  return {
    data,
    loading,
    error,
    refetch: fetch,
    invalidate,
  };
}

// ============================================================================
// usePrefetch - Hook para prefetch de datos
// ============================================================================

export function usePrefetch(): {
  prefetch: (url: string, fetchFn: () => Promise<any>, priority?: 'high' | 'normal' | 'low') => void;
} {
  const prefetch = useCallback(
    (url: string, fetchFn: () => Promise<any>, priority: 'high' | 'normal' | 'low' = 'normal') => {
      prefetchData(url, fetchFn, { priority });
    },
    []
  );

  return { prefetch };
}

// ============================================================================
// useScrollEnd - Hook para detectar fin de scroll
// ============================================================================

export function useScrollEnd(callback: () => void, delay: number = 150): void {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    return onScrollEnd(() => callbackRef.current(), delay);
  }, [delay]);
}

// ============================================================================
// useIntersectionObserver - Hook para detectar elementos en viewport
// ============================================================================

export function useIntersectionObserver(
  elementRef: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
): { isIntersecting: boolean; entry: IntersectionObserverEntry | null } {
  const [isIntersecting, setIsIntersecting] = React.useState(false);
  const [entry, setEntry] = React.useState<IntersectionObserverEntry | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
      setEntry(entry);
    }, options);

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [elementRef, options.threshold, options.root, options.rootMargin]);

  return { isIntersecting, entry };
}

// ============================================================================
// useIdleCallback - Hook para ejecutar callbacks en tiempo idle
// ============================================================================

export function useIdleCallback(
  callback: () => void,
  options?: IdleRequestOptions
): void {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    let idleCallbackId: number | null = null;

    if ('requestIdleCallback' in window) {
      idleCallbackId = window.requestIdleCallback(() => {
        callbackRef.current();
      }, options);
    } else {
      // Fallback para navegadores sin soporte
      idleCallbackId = setTimeout(() => {
        callbackRef.current();
      }, 1) as unknown as number;
    }

    return () => {
      if (idleCallbackId !== null) {
        if ('cancelIdleCallback' in window) {
          window.cancelIdleCallback(idleCallbackId);
        } else {
          clearTimeout(idleCallbackId);
        }
      }
    };
  }, [options?.timeout]);
}

// ============================================================================
// useOptimisticUpdate - Hook para actualizaciones optimistas
// ============================================================================

export function useOptimisticUpdate<T>(
  initialData: T,
  updateFn: (data: T, update: Partial<T>) => T = (data, update) => ({ ...data, ...update })
): {
  data: T;
  optimisticUpdate: (update: Partial<T>) => void;
  commitUpdate: (finalData: T) => void;
  rollback: () => void;
} {
  const [data, setData] = React.useState<T>(initialData);
  const [savedData, setSavedData] = React.useState<T>(initialData);

  const optimisticUpdate = useCallback(
    (update: Partial<T>) => {
      setSavedData(data); // Guardar estado actual para posible rollback
      setData((prevData) => updateFn(prevData, update));
    },
    [data, updateFn]
  );

  const commitUpdate = useCallback((finalData: T) => {
    setData(finalData);
    setSavedData(finalData);
  }, []);

  const rollback = useCallback(() => {
    setData(savedData);
  }, [savedData]);

  return {
    data,
    optimisticUpdate,
    commitUpdate,
    rollback,
  };
}

// ============================================================================
// useLazyLoad - Hook para lazy loading de componentes pesados
// ============================================================================

export function useLazyLoad<T>(
  loader: () => Promise<T>,
  placeholder?: T
): { data: T | undefined; loading: boolean; error: Error | null } {
  const [data, setData] = React.useState<T | undefined>(placeholder);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    setLoading(true);

    loader()
      .then((result) => {
        if (isMounted.current) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted.current) {
          setError(err);
          setLoading(false);
        }
      });

    return () => {
      isMounted.current = false;
    };
  }, [loader]);

  return { data, loading, error };
}

// ============================================================================
// useMediaQuery - Hook para detectar media queries
// ============================================================================

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const handler = (event: MediaQueryListEvent) => setMatches(event.matches);

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
    // Legacy browsers
    else {
      mediaQuery.addListener(handler);
      return () => mediaQuery.removeListener(handler);
    }
  }, [query]);

  return matches;
}

// ============================================================================
// usePreferredMotion - Hook para detectar preferencia de movimiento
// ============================================================================

export function usePreferredMotion(): 'reduce' | 'no-preference' {
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  return prefersReducedMotion ? 'reduce' : 'no-preference';
}

// ============================================================================
// useNetworkStatus - Hook para detectar estado de la red
// ============================================================================

export function useNetworkStatus(): {
  online: boolean;
  effectiveType: string | null;
  saveData: boolean;
} {
  const [online, setOnline] = React.useState(navigator.onLine);
  const [effectiveType, setEffectiveType] = React.useState<string | null>(
    (navigator as any).connection?.effectiveType || null
  );
  const [saveData, setSaveData] = React.useState(
    (navigator as any).connection?.saveData || false
  );

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    const connection = (navigator as any).connection;
    const handleConnectionChange = () => {
      if (connection) {
        setEffectiveType(connection.effectiveType);
        setSaveData(connection.saveData);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (connection) {
      connection.addEventListener('change', handleConnectionChange);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connection) {
        connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, []);

  return { online, effectiveType, saveData };
}

// Fix: Importar React correctamente
import * as React from 'react';
