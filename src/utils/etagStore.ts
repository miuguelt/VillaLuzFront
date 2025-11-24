/**
 * Almacenamiento de ETags y Last-Modified para validación condicional HTTP
 * Soporta localStorage (fallback) + IndexedDB (persistente)
 */

import { getIndexedDBCache, setIndexedDBCache } from './indexedDBCache';

const ETAG_STORAGE_KEY = 'http_etags_v1';

interface ETagEntry {
  etag?: string;
  lastModified?: string;
  lastSync?: string; // ISO timestamp de última sincronización
  timestamp: number;
}

interface ETagStore {
  [resource: string]: ETagEntry;
}

/**
 * Carga el store de ETags desde IndexedDB o localStorage
 */
async function loadETagStore(): Promise<ETagStore> {
  try {
    // Intentar IndexedDB primero
    const idbStore = await getIndexedDBCache<ETagStore>(ETAG_STORAGE_KEY);
    if (idbStore) return idbStore;
  } catch (e) {
    console.warn('[ETagStore] Error leyendo IndexedDB:', e);
  }

  // Fallback a localStorage
  try {
    const stored = localStorage.getItem(ETAG_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    console.warn('[ETagStore] Error leyendo localStorage:', e);
    return {};
  }
}

/**
 * Guarda el store de ETags en IndexedDB y localStorage
 */
async function saveETagStore(store: ETagStore): Promise<void> {
  try {
    // IndexedDB (persistente)
    await setIndexedDBCache(ETAG_STORAGE_KEY, store, 7 * 24 * 60 * 60 * 1000); // 7 días

    // localStorage (fallback rápido)
    localStorage.setItem(ETAG_STORAGE_KEY, JSON.stringify(store));
  } catch (e) {
    console.warn('[ETagStore] Error guardando:', e);
  }
}

/**
 * Obtiene el ETag almacenado para un recurso
 */
export async function getETag(resource: string): Promise<string | null> {
  const store = await loadETagStore();
  return store[resource]?.etag || null;
}

/**
 * Obtiene el Last-Modified almacenado para un recurso
 */
export async function getLastModified(resource: string): Promise<string | null> {
  const store = await loadETagStore();
  return store[resource]?.lastModified || null;
}

/**
 * Guarda ETag y/o Last-Modified para un recurso
 */
export async function setETag(
  resource: string,
  etag?: string,
  lastModified?: string
): Promise<void> {
  const store = await loadETagStore();

  store[resource] = {
    ...store[resource],
    etag,
    lastModified,
    timestamp: Date.now(),
  };

  await saveETagStore(store);
}

/**
 * Elimina el ETag de un recurso (útil tras modificaciones)
 */
export async function clearETag(resource: string): Promise<void> {
  const store = await loadETagStore();
  delete store[resource];
  await saveETagStore(store);
}

/**
 * Limpia todos los ETags almacenados
 */
export async function clearAllETags(): Promise<void> {
  await saveETagStore({});
}

/**
 * Obtiene el timestamp de última sincronización para un recurso
 */
export async function getLastSync(resource: string): Promise<string | null> {
  const store = await loadETagStore();
  return store[resource]?.lastSync || null;
}

/**
 * Establece el timestamp de última sincronización para un recurso
 */
export async function setLastSync(resource: string, isoTimestamp?: string): Promise<void> {
  const store = await loadETagStore();
  const timestamp = isoTimestamp || new Date().toISOString();

  store[resource] = {
    ...store[resource],
    lastSync: timestamp,
    timestamp: Date.now(),
  };

  await saveETagStore(store);
}

/**
 * Obtiene todos los ETags almacenados (útil para debugging)
 */
export async function getAllETags(): Promise<ETagStore> {
  return loadETagStore();
}

/**
 * Verifica si un ETag ha cambiado comparando con el almacenado
 */
export async function hasETagChanged(resource: string, newETag?: string): Promise<boolean> {
  if (!newETag) return false;

  const stored = await getETag(resource);
  if (!stored) return true; // No hay ETag previo, considerarlo como cambio

  return stored !== newETag;
}

/**
 * Normaliza el nombre de un recurso para usar como clave
 * Ejemplos:
 * - "users?page=1&limit=10" -> "users"
 * - "/api/v1/diseases" -> "diseases"
 */
export function normalizeResourceKey(urlOrPath: string): string {
  try {
    // Quitar querystring
    let path = urlOrPath.split('?')[0];

    // Quitar /api/vX/ prefix
    path = path.replace(/^\/api\/v\d+\//i, '');

    // Quitar slashes iniciales/finales
    path = path.replace(/^\/+|\/+$/g, '');

    return path.toLowerCase();
  } catch (e) {
    return urlOrPath;
  }
}
