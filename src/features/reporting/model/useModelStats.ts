import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';
import { unwrapApi } from '@/shared/api/client';
import { apiFetch } from '@/shared/api/apiFetch';

interface StatsState<T=any> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

const normalizeModel = (model: string) => model.replace(/Service$/,'').toLowerCase();

// Debounce helper with cancel capability
const debounce = <T extends (...args: any[]) => any>(func: T, delay: number) => {
  let timeoutId: any;
  const debounced = (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
  // attach cancel method to clear pending timer
  (debounced as any).cancel = () => { if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; } };
  return debounced as T & { cancel?: () => void };
};

interface UsersStats { total_users?: number; status_distribution?: { active?: number; inactive?: number } }
interface AnimalsStats { total_animals?: number; by_sex?: { Hembra?: number; Macho?: number }; by_status?: Record<string, number>; average_weight?: number }
interface HealthStatsN { summary: { total_treatments?: number; active_treatments?: number; total_vaccinations?: number; pending_vaccinations?: number } }
interface ProductionStatsN { summary: { total_controls?: number; total_fields?: number; field_utilization?: number; animals_per_field?: number; monthly_costs?: number } }
type NormalizedStats = UsersStats | AnimalsStats | HealthStatsN | ProductionStatsN;

const coalesce = <T,>(...vals: (T | undefined | null)[]) => vals.find(v => v !== undefined && v !== null) as T | undefined;
const toNumber = (v: any): number | undefined => {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

const normalizeBySex = (raw: any): { Hembra?: number; Macho?: number } | undefined => {
  const hembra = toNumber(coalesce(raw?.bySex?.female, raw?.by_sex?.hembras, raw?.hembras));
  const macho = toNumber(coalesce(raw?.bySex?.male, raw?.by_sex?.machos, raw?.machos));
  if (hembra === undefined && macho === undefined) return undefined;
  return { Hembra: hembra, Macho: macho };
};

const normalizeByStatus = (raw: any): Record<string, number> | undefined => {
  const map = raw?.byStatus || raw?.by_status || raw?.status_distribution || raw?.status;
  if (!map || typeof map !== 'object') return undefined;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(map)) {
    const n = toNumber(v);
    if (n !== undefined) out[k] = n;
  }
  return out;
};

function normalizeModelStats(model: 'users'|'animals'|'health'|'production', raw: any): NormalizedStats {
  switch (model) {
    case 'users':
      return { total_users: toNumber(coalesce(raw?.totalUsers, raw?.total_users, raw?.count)), status_distribution: normalizeByStatus(raw) };
    case 'animals':
      return { total_animals: toNumber(coalesce(raw?.totalAnimals, raw?.total_animals, raw?.count)), by_sex: normalizeBySex(raw), by_status: normalizeByStatus(raw), average_weight: toNumber(coalesce(raw?.avgWeight, raw?.average_weight)) };
    case 'health':
      return { summary: { total_treatments: toNumber(coalesce(raw?.totalTreatments, raw?.summary?.total_treatments)), active_treatments: toNumber(coalesce(raw?.activeTreatments, raw?.summary?.active_treatments)), total_vaccinations: toNumber(coalesce(raw?.totalVaccinations, raw?.summary?.total_vaccinations)), pending_vaccinations: toNumber(coalesce(raw?.pendingVaccinations, raw?.summary?.pending_vaccinations)) } };
    case 'production':
      return { summary: { total_controls: toNumber(coalesce(raw?.totalControls, raw?.summary?.total_controls)), total_fields: toNumber(coalesce(raw?.totalFields, raw?.summary?.total_fields)), field_utilization: toNumber(coalesce(raw?.fieldUtilization, raw?.summary?.field_utilization)), animals_per_field: toNumber(coalesce(raw?.animalsPerField, raw?.summary?.animals_per_field)), monthly_costs: toNumber(coalesce(raw?.monthlyCosts, raw?.summary?.monthly_costs)) } };
    default:
      return {} as any;
  }
}

interface UseModelStatsOptions {
  enabled?: boolean;
  [key: string]: any;
}

export function useModelStats<T=any>(model: string, options?: UseModelStatsOptions): StatsState<T> {
  const { enabled = true, ...params } = options || {};
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const cancelTokenSourceRef = useRef<ReturnType<typeof axios.CancelToken.source> | null>(null);

  // Memoizar params para evitar recreación innecesaria
  const stableParams = useMemo(() => params, [params]);

  const fetchStats = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true); setError(null);
    // Cancel any previous inflight request
    if (cancelTokenSourceRef.current) {
      try { cancelTokenSourceRef.current.cancel('Nueva consulta de estadísticas, se cancela la anterior'); } catch { /* noop */ }
    }
    cancelTokenSourceRef.current = axios.CancelToken.source();

    try {
      let endpoint: string;
      const slug = normalizeModel(model);

      // Redirigir modelos conocidos a los endpoints correctos
      switch (slug) {
        case 'users':
          endpoint = '/users/statistics';
          break;
        case 'animals':
          endpoint = '/analytics/animals/statistics';
          break;
        case 'health':
          endpoint = '/analytics/health/statistics';
          break;
        case 'production':
          endpoint = '/analytics/production/statistics';
          break;
        default:
          // Fallback genérico para debugging
          endpoint = '/analytics/dashboard';
          break;
      }

      const res = await apiFetch({ url: endpoint, method: 'GET', params: stableParams, cancelToken: cancelTokenSourceRef.current.token });
      const raw = unwrapApi(res);
      const normalized = normalizeModelStats(slug as any, raw);
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[useModelStats]', { model: slug, keys: Object.keys(raw || {}), normalized });
      }
      setData(normalized as T);
    } catch (e:any) {
      if (axios.isCancel(e)) {
        // Cancelled request: do not set error or log noisy messages
        return;
      }
      setError(e?.message || 'Error cargando estadísticas');
    } finally {
      setLoading(false);
    }
  }, [model, stableParams, enabled]);

  // Debounced version of fetchStats
  const debouncedFetchStats = useMemo(() => debounce(fetchStats, 300), [fetchStats]);

  useEffect(() => {
    if (enabled) {
      debouncedFetchStats();
    } else {
      setLoading(false);
    }
    return () => {
      // Cancel any pending debounce timer and inflight request on unmount or dependency change
      (debouncedFetchStats as any).cancel?.();
      if (cancelTokenSourceRef.current) {
        try { cancelTokenSourceRef.current.cancel('Componente desmontado'); } catch { /* noop */ }
        cancelTokenSourceRef.current = null;
      }
    };
  }, [model, debouncedFetchStats, enabled]);

  return { data, loading, error, refresh: fetchStats };
}

export default useModelStats;
