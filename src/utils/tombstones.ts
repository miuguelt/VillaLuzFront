// Utilidad para gestionar "tombstones" (marcas temporales de eliminación)
// Oculta registros eliminados aunque el backend tarde en reflejar la baja

type TombstoneStore = Record<string, number>; // id(normalizado) -> expiresAt

const LS_PREFIX = 'tombstones:';

const memoryStores = new Map<string, TombstoneStore>();

function storageKey(entity: string) {
  return `${LS_PREFIX}${entity.toLowerCase()}`;
}

function hasLocalStorage() {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
}

function now() {
  return Date.now();
}

function normalizeId(id: string | number) {
  return String(id);
}

function readStore(entity: string): TombstoneStore {
  if (hasLocalStorage()) {
    const raw = window.localStorage.getItem(storageKey(entity));
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed as TombstoneStore;
    } catch {}
    return {};
  }
  return memoryStores.get(storageKey(entity)) || {};
}

function writeStore(entity: string, store: TombstoneStore) {
  if (hasLocalStorage()) {
    window.localStorage.setItem(storageKey(entity), JSON.stringify(store));
  } else {
    memoryStores.set(storageKey(entity), store);
  }
}

export function clearExpired(entity: string) {
  const store = readStore(entity);
  const t = now();
  let changed = false;
  for (const [id, expires] of Object.entries(store)) {
    if (!expires || expires <= t) {
      delete store[id];
      changed = true;
    }
  }
  if (changed) writeStore(entity, store);
}

export function addTombstone(entity: string, id: string | number, ttlMs = 60000) {
  const e = entity.toLowerCase();
  const store = readStore(e);
  store[normalizeId(id)] = now() + Math.max(1000, ttlMs);
  writeStore(e, store);
}

export function hasTombstone(entity: string, id: string | number): boolean {
  const e = entity.toLowerCase();
  clearExpired(e);
  const store = readStore(e);
  const exp = store[normalizeId(id)];
  return !!exp && exp > now();
}

export function removeTombstone(entity: string, id: string | number) {
  const e = entity.toLowerCase();
  const store = readStore(e);
  const key = normalizeId(id);
  if (store[key]) {
    delete store[key];
    writeStore(e, store);
  }
}

export function getTombstoneIds(entity: string): Set<string> {
  const e = entity.toLowerCase();
  clearExpired(e);
  const store = readStore(e);
  return new Set(Object.keys(store));
}