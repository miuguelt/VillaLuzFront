/**
 * Utilidad para cache persistente en IndexedDB
 * Optimizada para PWA offline-first con sincronización precisa
 */

const DB_NAME = 'VillaLuzCache';
const DB_VERSION = 1;
const STORE_NAME = 'apiCache';

interface CacheEntry {
  key: string;
  data: any;
  timestamp: number;
  ttl?: number; // Time to live en milisegundos
  version?: number;
}

const isIndexedDBSupported = (): boolean => {
  try {
    return typeof window !== 'undefined' && !!window.indexedDB;
  } catch {
    return false;
  }
};

/**
 * Inicializa la base de datos IndexedDB
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIndexedDBSupported()) {
      reject(new Error('IndexedDB not available'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Crear object store si no existe
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

/**
 * Guarda datos en IndexedDB con TTL opcional
 */
export async function setIndexedDBCache<T>(
  key: string,
  data: T,
  ttl?: number
): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const entry: CacheEntry = {
      key,
      data,
      timestamp: Date.now(),
      ttl,
      version: 1,
    };

    await new Promise<void>((resolve, reject) => {
      const request = store.put(entry);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    db.close();
  } catch (error) {
    console.warn('[IndexedDBCache] Error al guardar:', error);
    // No lanzar error - degradar silenciosamente a memoria
  }
}

/**
 * Obtiene datos de IndexedDB (respeta TTL)
 */
export async function getIndexedDBCache<T>(key: string): Promise<T | null> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    const entry = await new Promise<CacheEntry | null>((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });

    db.close();

    if (!entry) return null;

    // Verificar TTL si está definido
    if (entry.ttl) {
      const age = Date.now() - entry.timestamp;
      if (age > entry.ttl) {
        // Expirado: eliminar en background
        void deleteIndexedDBCache(key);
        return null;
      }
    }

    return entry.data as T;
  } catch (error) {
    console.warn('[IndexedDBCache] Error al leer:', error);
    return null;
  }
}

/**
 * Elimina una entrada del cache
 */
export async function deleteIndexedDBCache(key: string): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    await new Promise<void>((resolve, reject) => {
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    db.close();
  } catch (error) {
    console.warn('[IndexedDBCache] Error al eliminar:', error);
  }
}

/**
 * Invalida todo el cache de un endpoint específico
 */
export async function invalidateIndexedDBCacheByPrefix(
  prefix: string
): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const keys = await new Promise<string[]>((resolve, reject) => {
      const request = store.getAllKeys();
      request.onsuccess = () => resolve(request.result as string[]);
      request.onerror = () => reject(request.error);
    });

    // Eliminar todas las claves que empiecen con el prefijo
    const deletePromises = keys
      .filter(key => String(key).startsWith(prefix))
      .map(key => new Promise<void>((resolve, reject) => {
        const deleteRequest = store.delete(key);
        deleteRequest.onsuccess = () => resolve();
        deleteRequest.onerror = () => reject(deleteRequest.error);
      }));

    await Promise.all(deletePromises);
    db.close();
  } catch (error) {
    console.warn('[IndexedDBCache] Error al invalidar por prefijo:', error);
  }
}

/**
 * Limpia entradas expiradas del cache
 */
export async function clearExpiredIndexedDBCache(): Promise<number> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const entries = await new Promise<CacheEntry[]>((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });

    const now = Date.now();
    let deletedCount = 0;

    for (const entry of entries) {
      if (entry.ttl) {
        const age = now - entry.timestamp;
        if (age > entry.ttl) {
          await new Promise<void>((resolve, reject) => {
            const deleteRequest = store.delete(entry.key);
            deleteRequest.onsuccess = () => {
              deletedCount++;
              resolve();
            };
            deleteRequest.onerror = () => reject(deleteRequest.error);
          });
        }
      }
    }

    db.close();
    return deletedCount;
  } catch (error) {
    console.warn('[IndexedDBCache] Error al limpiar expirados:', error);
    return 0;
  }
}

/**
 * Limpia TODO el cache (útil para debugging o logout)
 */
export async function clearAllIndexedDBCache(): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    await new Promise<void>((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    db.close();
  } catch (error) {
    console.warn('[IndexedDBCache] Error al limpiar todo:', error);
  }
}

/**
 * Obtiene el tamaño estimado del cache (número de entradas)
 */
export async function getIndexedDBCacheSize(): Promise<number> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    const count = await new Promise<number>((resolve, reject) => {
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    db.close();
    return count;
  } catch (error) {
    console.warn('[IndexedDBCache] Error al obtener tamaño:', error);
    return 0;
  }
}

/**
 * Ejecuta limpieza automática de cache expirado en background
 * Llamar al inicializar la app o periódicamente
 */
export function startIndexedDBCacheCleanup(intervalMs: number = 300000): void {
  if (!isIndexedDBSupported()) {
    return;
  }
  // Limpiar inmediatamente
  void clearExpiredIndexedDBCache();

  // Limpiar cada X minutos (default: 5 min)
  setInterval(() => {
    void clearExpiredIndexedDBCache().then(count => {
      if (count > 0) {
        console.log(`[IndexedDBCache] Limpiados ${count} registros expirados`);
      }
    });
  }, intervalMs);
}
