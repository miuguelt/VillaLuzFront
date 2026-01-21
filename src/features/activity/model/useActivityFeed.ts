import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityPage, ActivityQuery, fetchActivity } from '@/features/activity/api/activity.service';

type CacheEntry = { ts: number; data: ActivityPage };

const DEFAULT_TTL_MS = 30_000;

const buildCacheKey = (query: ActivityQuery) =>
  JSON.stringify({
    page: query.page,
    limit: query.limit,
    entity: query.entity ?? null,
    action: query.action ?? null,
    severity: query.severity ?? null,
    from: query.from ?? null,
    to: query.to ?? null,
    animalId: query.animalId ?? null,
    entityId: query.entityId ?? null,
    userId: query.userId ?? null,
    fields: query.fields ?? null,
    include: query.include ?? null,
    scope: query.scope ?? null,
    cursor: query.cursor ?? null,
  });

export function useActivityFeed(
  query: ActivityQuery,
  opts: {
    enableCache?: boolean;
    ttlMs?: number;
    enabled?: boolean;
    fetcher?: (q: ActivityQuery, o?: { signal?: AbortSignal }) => Promise<ActivityPage>;
  } = {}
) {
  const enabled = opts.enabled !== false;
  const fetcher = opts.fetcher ?? fetchActivity;
  const resolvedQuery = useMemo(
    () => ({
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      per_page: query.per_page,
      entity: query.entity,
      action: query.action,
      severity: query.severity,
      from: query.from,
      to: query.to,
      animalId: query.animalId,
      entityId: query.entityId,
      userId: query.userId,
      fields: query.fields,
      include: query.include,
      scope: query.scope,
      cursor: query.cursor,
    }),
    [
      query.page,
      query.limit,
      query.per_page,
      query.entity,
      query.action,
      query.severity,
      query.from,
      query.to,
      query.animalId,
      query.entityId,
      query.userId,
      query.fields,
      query.include,
      query.scope,
      query.cursor,
    ]
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
        const page = await fetcher(resolvedQuery, { signal });
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
    [cacheKey, enableCache, fetcher, resolvedQuery, ttlMs]
  );

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [enabled, load]);

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
