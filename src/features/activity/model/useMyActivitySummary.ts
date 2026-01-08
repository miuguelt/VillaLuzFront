import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchMyActivitySummary, MyActivitySummary } from '@/features/activity/api/activity.service';

type CacheEntry = { ts: number; data: MyActivitySummary };

const DEFAULT_TTL_MS = 30_000;

export function useMyActivitySummary(opts: { enabled?: boolean; ttlMs?: number } = {}) {
  const enabled = opts.enabled !== false;
  const ttlMs = typeof opts.ttlMs === 'number' ? opts.ttlMs : DEFAULT_TTL_MS;

  const cacheRef = useRef<CacheEntry | null>(null);
  const [data, setData] = useState<MyActivitySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        const cached = cacheRef.current;
        if (cached && Date.now() - cached.ts < ttlMs) {
          setData(cached.data);
          setLoading(false);
          return;
        }
        const summary = await fetchMyActivitySummary({ signal });
        cacheRef.current = { ts: Date.now(), data: summary };
        setData(summary);
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
        setError(e?.message || 'Error cargando resumen de actividad');
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    [ttlMs]
  );

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [enabled, load]);

  const refetch = useCallback(() => {
    cacheRef.current = null;
    load();
  }, [load]);

  return { data, loading, error, refetch };
}

