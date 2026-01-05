import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityPage, ActivityQuery, fetchActivity } from '@/features/activity/api/activity.service';

type CacheEntry = { ts: number; data: ActivityPage };

const DEFAULT_TTL_MS = 30_000;

const buildCacheKey = (query: Required<ActivityQuery>) =>
  JSON.stringify({
    page: query.page,
    limit: query.limit,
    entity: query.entity ?? null,
    action: query.action ?? null,
    severity: query.severity ?? null,
    from: query.from ?? null,
    to: query.to ?? null,
    animalId: query.animalId ?? null,
    userId: query.userId ?? null,
  });

export function useActivityFeed(
  query: ActivityQuery,
  opts: { enableCache?: boolean; ttlMs?: number } = {}
) {
  const resolvedQuery = useMemo(
    () => ({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      entity: query.entity,
      action: query.action,
      severity: query.severity,
      from: query.from,
      to: query.to,
      animalId: query.animalId,
      userId: query.userId,
    }),
    [query.page, query.limit, query.entity, query.action, query.severity, query.from, query.to, query.animalId, query.userId]
  );

  const enableCache = opts.enableCache !== false;
  const ttlMs = typeof opts.ttlMs === 'number' ? opts.ttlMs : DEFAULT_TTL_MS;

  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());
  const [data, setData] = useState<ActivityPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cacheKey = useMemo(() => buildCacheKey(resolvedQuery), [resolvedQuery]);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        if (enableCache) {
          const cached = cacheRef.current.get(cacheKey);
          if (cached && Date.now() - cached.ts < ttlMs) {
            setData(cached.data);
            setLoading(false);
            return;
          }
        }
        const page = await fetchActivity(resolvedQuery, { signal });
        if (enableCache) {
          cacheRef.current.set(cacheKey, { ts: Date.now(), data: page });
        }
        setData(page);
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
        setError(e?.message || 'Error cargando actividad');
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    [cacheKey, enableCache, resolvedQuery, ttlMs]
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const refetch = useCallback(() => {
    cacheRef.current.delete(cacheKey);
    load();
  }, [cacheKey, load]);

  return {
    items: data?.items ?? [],
    meta: data,
    loading,
    error,
    refetch,
  };
}
