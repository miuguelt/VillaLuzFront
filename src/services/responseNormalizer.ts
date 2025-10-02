/**
 * Utilities to normalize API responses into a predictable shape.
 * The goal: extract the meaningful payload (array or object) from various
 * envelope formats used by different backend endpoints.
 */
export function findFirstArrayDeep(obj: any, maxDepth = 2): any[] | null {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) return obj;
  if (typeof obj !== 'object') return null;

  // Breadth-first limited search up to maxDepth
  const queue: Array<{ value: any; depth: number }> = [{ value: obj, depth: 0 }];

  while (queue.length) {
    const { value, depth } = queue.shift()!;
    if (!value || typeof value !== 'object') continue;

    // Check direct array values
    for (const v of Object.values(value)) {
      if (Array.isArray(v)) return v as any[];
    }

    if (depth < maxDepth) {
      // enqueue nested objects for further inspection
      for (const v of Object.values(value)) {
        if (v && typeof v === 'object') queue.push({ value: v, depth: depth + 1 });
      }
    }
  }

  return null;
}

export function normalizeApiResponseBody(body: any): any {
  if (body === null || body === undefined) return body;

  // If it's already an array or primitive, return as-is
  if (Array.isArray(body)) return body;
  if (typeof body !== 'object') return body;

  // Quick candidates to check first
  const candidateKeys = ['items', 'results', 'animals', 'rows', 'records', 'data', 'users', 'fields', 'controls'];
  for (const key of candidateKeys) {
    const v = body[key];
    if (Array.isArray(v)) return v;
    if (v && typeof v === 'object' && Array.isArray(v.items)) return v.items;
  }

  // If the body has a 'data' object that itself contains arrays, prefer those
  if (body.data && typeof body.data === 'object') {
    const nested = findFirstArrayDeep(body.data, 2);
    if (nested) return nested;
  }

  // Fallback: find the first array property anywhere in the object
  const firstArray = findFirstArrayDeep(body, 2);
  if (firstArray) return firstArray;

  // If no array is found, return the 'data' property if it's an object, or the body itself
  return (body.data && typeof body.data === 'object' && !Array.isArray(body.data)) ? body.data : body;
}

// Normalizador para respuestas paginadas unificadas
import { PageResult } from '@/types/commonTypes';
import { extractPaginatedList } from './listExtractor';

export function normalizePagination<T>(response: any, preferredKeys: string[] = []): PageResult<T> | null {
  const paginated = extractPaginatedList(response, preferredKeys, 'items');
  if (!paginated || !Array.isArray(paginated.items)) return null;

  const {
    items,
    total = Array.isArray(paginated.items) ? paginated.items.length : 0,
    page = 1,
    per_page: page_size = 10,
    pages: totalPages = Math.ceil(total / page_size),
  } = paginated as any;

  return {
    items: items as T[],
    total,
    page,
    page_size,
    pages: totalPages,
  } as PageResult<T>;
}
