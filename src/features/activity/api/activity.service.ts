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
  per_page?: number;
  entity?: string;
  action?: string;
  severity?: string;
  from?: string;
  to?: string;
  animalId?: number | string;
  entityId?: number | string;
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

type FetchOpts = { signal?: AbortSignal };

const readJson = async (res: Response) => res.json().catch(() => ({}));

const ensureOk = async (res: Response) => {
  const json = await readJson(res);
  if (!res.ok) {
    const message = json?.message || json?.error || json?.detail || 'Error cargando actividad';
    throw new Error(message);
  }
  return json;
};

const buildActivityParams = ({
  page,
  limit,
  per_page,
  entity,
  action,
  severity,
  from,
  to,
  animalId,
  entityId,
  userId,
}: ActivityQuery) => {
  const resolvedPage = page ?? 1;
  const resolvedPerPage = per_page ?? limit ?? 20;

  const params = new URLSearchParams({
    page: String(resolvedPage),
  });

  params.set('per_page', String(resolvedPerPage));
  params.set('limit', String(resolvedPerPage));

  if (entity) params.set('entity', entity);
  if (action) params.set('action', action);
  if (severity) params.set('severity', severity);
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (animalId != null && String(animalId).trim() !== '') params.set('animal_id', String(animalId));
  if (entityId != null && String(entityId).trim() !== '') params.set('entity_id', String(entityId));
  if (userId != null && String(userId).trim() !== '') params.set('user_id', String(userId));

  return { params, resolvedPage, resolvedPerPage };
};

export async function fetchActivity(
  {
    page = 1,
    limit = 20,
    per_page,
    entity,
    action,
    severity,
    from,
    to,
    animalId,
    entityId,
    userId,
  }: ActivityQuery = {},
  opts: { signal?: AbortSignal } = {}
): Promise<ActivityPage> {
  const { params } = buildActivityParams({
    page,
    limit,
    per_page,
    entity,
    action,
    severity,
    from,
    to,
    animalId,
    entityId,
    userId,
  });

  const basePath =
    userId != null && String(userId).trim() !== ''
      ? `/api/v1/users/${encodeURIComponent(String(userId))}/activity`
      : '/api/v1/activity';

  const res = await fetch(`${basePath}?${params.toString()}`, {
    method: 'GET',
    credentials: 'include',
    signal: opts.signal,
  });

  const json = await ensureOk(res);

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

export type ActivitySummaryWindow = {
  totals?: {
    events?: number;
    distinct_animals?: number;
  };
  by_entity?: Array<{ entity: string; count: number }>;
  daily?: Array<{ date: string; count: number }>;
};

export type MyActivitySummary = {
  last_activity_at?: string | null;
  window_7d?: ActivitySummaryWindow;
  window_30d?: ActivitySummaryWindow;
};

export async function fetchMyActivity(
  query: ActivityQuery = {},
  opts: FetchOpts = {}
): Promise<ActivityPage> {
  const { params, resolvedPage, resolvedPerPage } = buildActivityParams(query);

  const res = await fetch(`/api/v1/activity/me?${params.toString()}`, {
    method: 'GET',
    credentials: 'include',
    signal: opts.signal,
  });

  const json = await ensureOk(res);
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

  const resolvedLimit =
    toNumber(pagination.limit) ??
    toNumber(pagination.per_page) ??
    toNumber(pagination.perPage) ??
    resolvedPerPage;

  return {
    items,
    page: toNumber(pagination.page) ?? resolvedPage,
    limit: resolvedLimit,
    total: toNumber(pagination.total),
    total_pages: toNumber(pagination.total_pages) ?? toNumber(pagination.totalPages),
    has_next: typeof pagination.has_next === 'boolean' ? pagination.has_next : undefined,
  };
}

export async function fetchMyActivitySummary(opts: FetchOpts = {}): Promise<MyActivitySummary> {
  const res = await fetch('/api/v1/activity/me/summary', {
    method: 'GET',
    credentials: 'include',
    signal: opts.signal,
  });
  const json = await ensureOk(res);
  return (json?.data ?? json) as MyActivitySummary;
}

export async function fetchMyActivityStats(
  { days = 30, ...query }: ActivityQuery & { days?: number } = {},
  opts: FetchOpts = {}
) {
  const { params } = buildActivityParams(query);
  params.set('days', String(days));
  const res = await fetch(`/api/v1/activity/me/stats?${params.toString()}`, {
    method: 'GET',
    credentials: 'include',
    signal: opts.signal,
  });
  const json = await ensureOk(res);
  return json?.data ?? json;
}

export async function fetchActivityStats(
  { days = 30, ...query }: ActivityQuery & { days?: number } = {},
  opts: FetchOpts = {}
) {
  const { params } = buildActivityParams(query);
  params.set('days', String(days));
  const res = await fetch(`/api/v1/activity/stats?${params.toString()}`, {
    method: 'GET',
    credentials: 'include',
    signal: opts.signal,
  });
  const json = await ensureOk(res);
  return json?.data ?? json;
}

export async function fetchActivityFilters(
  { days = 365 }: { days?: number } = {},
  opts: FetchOpts = {}
) {
  const params = new URLSearchParams({ days: String(days) });
  const res = await fetch(`/api/v1/activity/filters?${params.toString()}`, {
    method: 'GET',
    credentials: 'include',
    signal: opts.signal,
  });
  const json = await ensureOk(res);
  return json?.data ?? json;
}
