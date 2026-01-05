/**
 * Utilidades de optimización de performance
 * Sistema de caché en memoria, debouncing, throttling y prefetching inteligente
 */

// ============================================================================
// CACHE EN MEMORIA OPTIMIZADO
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private maxSize = 100; // Máximo de entradas en caché
  private defaultTTL = 5 * 60 * 1000; // 5 minutos por defecto

  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    // Si el caché está lleno, eliminar la entrada más antigua
    if (this.cache.size >= this.maxSize) {
      const oldestKey = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0]?.[0];
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttl,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    // Si expiró, eliminar y retornar null
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const now = Date.now();
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  invalidate(keyPattern?: string): void {
    if (!keyPattern) {
      // Limpiar todo el caché
      this.cache.clear();
      return;
    }

    // Limpiar entradas que coincidan con el patrón
    const regex = new RegExp(keyPattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  // Limpiar entradas expiradas (garbage collection)
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  // Obtener estadísticas del caché
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      entries: Array.from(this.cache.keys()),
    };
  }
}

// Instancia global del caché
export const memoryCache = new MemoryCache();

// Ejecutar limpieza cada 5 minutos
if (typeof window !== 'undefined') {
  setInterval(() => memoryCache.cleanup(), 5 * 60 * 1000);
}

// ============================================================================
// DEBOUNCE Y THROTTLE
// ============================================================================

/**
 * Debounce: Retrasa la ejecución hasta que hayan pasado `delay` ms sin llamadas
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function (this: any, ...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

/**
 * Throttle: Limita la ejecución a una vez cada `delay` ms
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;

    if (timeSinceLastCall >= delay) {
      // Ejecutar inmediatamente si ha pasado suficiente tiempo
      lastCall = now;
      func.apply(this, args);
    } else if (!timeoutId) {
      // Programar ejecución para cuando expire el delay
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        timeoutId = null;
        func.apply(this, args);
      }, delay - timeSinceLastCall);
    }
  };
}

// ============================================================================
// PREFETCHING INTELIGENTE
// ============================================================================

interface PrefetchOptions {
  priority?: 'high' | 'normal' | 'low';
  maxConcurrent?: number;
}

class PrefetchQueue {
  private queue: Array<{ url: string; priority: number; fetch: () => Promise<any> }> = [];
  private inFlight = new Set<string>();
  private maxConcurrent = 3;
  private processing = false;

  add(url: string, fetchFn: () => Promise<any>, options: PrefetchOptions = {}): void {
    // No agregar si ya está en cola o en proceso
    if (this.queue.some((item) => item.url === url) || this.inFlight.has(url)) {
      return;
    }

    const priority = options.priority === 'high' ? 2 : options.priority === 'low' ? 0 : 1;

    this.queue.push({ url, priority, fetch: fetchFn });
    this.queue.sort((a, b) => b.priority - a.priority); // Mayor prioridad primero

    if (!this.processing) {
      this.process();
    }
  }

  private async process(): Promise<void> {
    this.processing = true;

    while (this.queue.length > 0 && this.inFlight.size < this.maxConcurrent) {
      const item = this.queue.shift();
      if (!item) continue;

      this.inFlight.add(item.url);

      item
        .fetch()
        .catch((error) => {
          console.warn(`[Prefetch] Error fetching ${item.url}:`, error);
        })
        .finally(() => {
          this.inFlight.delete(item.url);
          if (this.queue.length > 0) {
            this.process();
          }
        });
    }

    if (this.queue.length === 0 && this.inFlight.size === 0) {
      this.processing = false;
    }
  }
}

export const prefetchQueue = new PrefetchQueue();

/**
 * Prefetch de una URL con estrategia inteligente
 */
export function prefetchData(
  url: string,
  fetchFn: () => Promise<any>,
  options: PrefetchOptions = {}
): void {
  // Solo prefetch si hay conexión
  if (!navigator.onLine) return;

  // Solo prefetch si el usuario no está en modo de ahorro de datos
  if ((navigator as any).connection?.saveData) return;

  prefetchQueue.add(url, fetchFn, options);
}

// ============================================================================
// OPTIMIZACIONES DE IMAGENES
// ============================================================================

/**
 * Lazy loading de imágenes con IntersectionObserver
 */
export function setupLazyImages(): void {
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            const src = img.dataset.src;
            if (src) {
              img.src = src;
              img.removeAttribute('data-src');
              observer.unobserve(img);
            }
          }
        });
      },
      {
        rootMargin: '50px', // Cargar 50px antes de que entre en viewport
      }
    );

    // Observar todas las imágenes con data-src
    document.querySelectorAll('img[data-src]').forEach((img) => {
      imageObserver.observe(img);
    });
  }
}

// ============================================================================
// OPTIMIZACIONES DE SCROLL
// ============================================================================

let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
let isScrolling = false;

/**
 * Detectar fin de scroll y ejecutar callback
 */
export function onScrollEnd(callback: () => void, delay: number = 150): () => void {
  const handleScroll = () => {
    if (!isScrolling) {
      isScrolling = true;
      document.body.classList.add('is-scrolling');
    }

    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
    }

    scrollTimeout = setTimeout(() => {
      isScrolling = false;
      document.body.classList.remove('is-scrolling');
      callback();
    }, delay);
  };

  window.addEventListener('scroll', handleScroll, { passive: true });

  return () => {
    window.removeEventListener('scroll', handleScroll);
    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
    }
  };
}

// ============================================================================
// MEMOIZATION CON LIMITE DE TAMAÑO
// ============================================================================

export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  maxSize: number = 50
): T {
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = fn(...args);

    // Si el caché está lleno, eliminar la entrada más antigua
    if (cache.size >= maxSize) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }

    cache.set(key, result);
    return result;
  }) as T;
}

// ============================================================================
// UTILIDADES DE PERFORMANCE
// ============================================================================

/**
 * Medir performance de una función
 */
export async function measurePerformance<T>(
  name: string,
  fn: () => T | Promise<T>
): Promise<T> {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  const duration = end - start;

  console.log(`[Performance] ${name} took ${duration.toFixed(2)}ms`);

  return result;
}

/**
 * Detectar si el dispositivo es de gama baja
 */
export function isLowEndDevice(): boolean {
  // Detectar por memoria disponible
  const memory = (navigator as any).deviceMemory;
  if (memory && memory < 4) return true;

  // Detectar por hardware concurrency (núcleos de CPU)
  const cores = navigator.hardwareConcurrency;
  if (cores && cores < 4) return true;

  // Detectar por save-data
  if ((navigator as any).connection?.saveData) return true;

  return false;
}

/**
 * Obtener estrategia de calidad de imagen según dispositivo
 */
export function getImageQualityStrategy(): 'high' | 'medium' | 'low' {
  if (isLowEndDevice()) return 'low';

  const connection = (navigator as any).connection;
  if (connection) {
    const effectiveType = connection.effectiveType;
    if (effectiveType === '4g') return 'high';
    if (effectiveType === '3g') return 'medium';
    return 'low';
  }

  return 'medium';
}

/**
 * Request Idle Callback con fallback
 */
export function requestIdleCallback(
  callback: IdleRequestCallback,
  options?: IdleRequestOptions
): number {
  if ('requestIdleCallback' in window) {
    return window.requestIdleCallback(callback, options);
  }

  // Fallback para navegadores que no soportan requestIdleCallback
  return setTimeout(() => {
    callback({
      didTimeout: false,
      timeRemaining: () => 50,
    } as IdleDeadline);
  }, 1) as unknown as number;
}

/**
 * Cancel Idle Callback con fallback
 */
export function cancelIdleCallback(id: number): void {
  if ('cancelIdleCallback' in window) {
    window.cancelIdleCallback(id);
  } else {
    clearTimeout(id);
  }
}

// ============================================================================
// BATCH PROCESSING
// ============================================================================

interface BatchOptions {
  maxBatchSize?: number;
  maxWaitTime?: number;
}

/**
 * Procesar operaciones en lotes para reducir llamadas
 */
export function createBatcher<T, R>(
  processFn: (items: T[]) => Promise<R[]>,
  options: BatchOptions = {}
): (item: T) => Promise<R> {
  const { maxBatchSize = 10, maxWaitTime = 50 } = options;

  let batch: T[] = [];
  let resolvers: Array<(value: R) => void> = [];
  let rejecters: Array<(reason: any) => void> = [];
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const flush = async () => {
    if (batch.length === 0) return;

    const currentBatch = batch;
    const currentResolvers = resolvers;
    const currentRejecters = rejecters;

    batch = [];
    resolvers = [];
    rejecters = [];

    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    try {
      const results = await processFn(currentBatch);
      results.forEach((result, index) => {
        currentResolvers[index](result);
      });
    } catch (error) {
      currentRejecters.forEach((reject) => reject(error));
    }
  };

  return (item: T): Promise<R> => {
    return new Promise<R>((resolve, reject) => {
      batch.push(item);
      resolvers.push(resolve);
      rejecters.push(reject);

      if (batch.length >= maxBatchSize) {
        flush();
      } else if (!timeoutId) {
        timeoutId = setTimeout(flush, maxWaitTime);
      }
    });
  };
}

// ============================================================================
// EXPORT DE ESTADÍSTICAS
// ============================================================================

export function getPerformanceStats() {
  return {
    cache: memoryCache.getStats(),
    lowEndDevice: isLowEndDevice(),
    imageQuality: getImageQualityStrategy(),
    connection: (navigator as any).connection
      ? {
          effectiveType: (navigator as any).connection.effectiveType,
          saveData: (navigator as any).connection.saveData,
          downlink: (navigator as any).connection.downlink,
        }
      : null,
  };
}
