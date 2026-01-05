export type ActivityAction = 'create' | 'update' | 'delete' | 'alert' | 'system';
export type ActivitySeverity = 'low' | 'medium' | 'high';
export type ActivityEntity =
  | 'animal'
  | 'treatment'
  | 'vaccination'
  | 'control'
  | 'field'
  | 'disease'
  | 'improvement'
  | (string & {});

export type ActivityLinks = Partial<{
  detail: string;
  animal: string;
  crud: string;
  analytics: string;
}>;

export type ActivityItem = {
  id: string | number;
  action: ActivityAction | (string & {});
  entity: ActivityEntity;
  entity_id?: string | number;
  user_id?: number;
  timestamp: string;
  severity?: ActivitySeverity | (string & {});
  title?: string;
  summary?: string;
  metadata?: Record<string, any>;
  links?: ActivityLinks;
  animal_id?: number;
};

export type ActivityQuery = {
  page?: number;
  limit?: number;
  entity?: string;
  action?: string;
  severity?: string;
  from?: string;
  to?: string;
  animalId?: number | string;
  userId?: number | string;
};

export type ActivityPage = {
  items: ActivityItem[];
  page: number;
  limit: number;
  total?: number;
  total_pages?: number;
  has_next?: boolean;
};

const toNumber = (value: any): number | undefined => {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
};

const extractItems = (payload: any): ActivityItem[] => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload as ActivityItem[];
  if (Array.isArray(payload.items)) return payload.items as ActivityItem[];
  if (Array.isArray(payload.events)) return payload.events as ActivityItem[];
  if (Array.isArray(payload.data)) return payload.data as ActivityItem[];
  if (Array.isArray(payload.results)) return payload.results as ActivityItem[];
  return [];
};

export async function fetchActivity(
  {
    page = 1,
    limit = 20,
    entity,
    action,
    severity,
    from,
    to,
    animalId,
    userId,
  }: ActivityQuery = {},
  opts: { signal?: AbortSignal } = {}
): Promise<ActivityPage> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (entity) params.set('entity', entity);
  if (action) params.set('action', action);
  if (severity) params.set('severity', severity);
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (animalId != null && String(animalId).trim() !== '') params.set('animal_id', String(animalId));

  const basePath =
    userId != null && String(userId).trim() !== ''
      ? `/api/v1/users/${encodeURIComponent(String(userId))}/activity`
      : '/api/v1/activity';

  if (basePath === '/api/v1/activity' && userId != null && String(userId).trim() !== '') {
    params.set('user_id', String(userId));
  }

  const res = await fetch(`${basePath}?${params.toString()}`, {
    method: 'GET',
    credentials: 'include',
    signal: opts.signal,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      json?.message || json?.error || json?.detail || 'Error cargando actividad';
    throw new Error(message);
  }

  const data = json?.data ?? json;
  const items = extractItems(data);

  const pagination =
    json?.meta?.pagination ??
    json?.data?.meta?.pagination ??
    json?.data?.pagination ??
    data?.meta?.pagination ??
    data?.pagination ??
    data?.meta ??
    data ??
    {};

  const resolvedPage = toNumber(pagination.page) ?? page;
  const resolvedLimit =
    toNumber(pagination.limit) ??
    toNumber(pagination.per_page) ??
    toNumber(pagination.perPage) ??
    limit;

  return {
    items,
    page: resolvedPage,
    limit: resolvedLimit,
    total: toNumber(pagination.total),
    total_pages: toNumber(pagination.total_pages) ?? toNumber(pagination.totalPages),
    has_next: typeof pagination.has_next === 'boolean' ? pagination.has_next : undefined,
  };
}
