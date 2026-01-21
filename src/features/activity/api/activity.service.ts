import { apiFetch } from '@/shared/api/apiFetch';

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
  fields?: string | string[];
  include?: string | string[];
  scope?: string;
  cursor?: string;
};

export type ActivityPage = {
  items: ActivityItem[];
  page: number;
  limit: number;
  total?: number;
  total_pages?: number;
  has_next?: boolean;
  next_cursor?: string;
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
  fields,
  include,
  scope,
  cursor,
}: ActivityQuery) => {
  const resolvedPage = page ?? 1;
  const resolvedPerPage = per_page ?? limit ?? 20;

  const params = new URLSearchParams();
  // Solo enviar 'page' si no estamos usando cursor, o si el backend soporta ambos (híbrido).
  // La guía sugiere cursor para timeline.
  if (!cursor) {
    params.set('page', String(resolvedPage));
  } else {
    params.set('cursor', cursor);
  }

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

  if (fields) params.set('fields', Array.isArray(fields) ? fields.join(',') : fields);
  if (include) params.set('include', Array.isArray(include) ? include.join(',') : include);
  if (scope) params.set('scope', scope);

  return { params, resolvedPage, resolvedPerPage };
};

function readPagination(raw: any): any {
  return (
    raw?.meta?.pagination ??
    raw?.data?.meta?.pagination ??
    raw?.data?.pagination ??
    raw?.data?.meta ??
    raw?.meta ??
    raw?.pagination ??
    raw ??
    {}
  );
}

function toActivityPage(raw: any, fallback: { page: number; limit: number }): ActivityPage {
  const data = raw?.data ?? raw;
  const items = extractItems(data);

  const pagination = readPagination(raw);
  const resolvedPage = toNumber(pagination.page) ?? fallback.page;
  const resolvedLimit =
    toNumber(pagination.limit) ??
    toNumber(pagination.per_page) ??
    toNumber(pagination.perPage) ??
    fallback.limit;

  return {
    items,
    page: resolvedPage,
    limit: resolvedLimit,
    total: toNumber(pagination.total),
    total_pages: toNumber(pagination.total_pages) ?? toNumber(pagination.totalPages),
    has_next: typeof pagination.has_next === 'boolean' ? pagination.has_next : undefined,
    next_cursor: pagination.next_cursor || pagination.cursor || undefined,
  };
}

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
  opts: FetchOpts = {}
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
      ? `users/${encodeURIComponent(String(userId))}/activity`
      : 'activity';

  const res = await apiFetch<any>({ url: `${basePath}?${params.toString()}`, method: 'GET', signal: opts.signal });

  return toActivityPage(res.data, { page, limit });
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

export async function fetchMyActivity(query: ActivityQuery = {}, opts: FetchOpts = {}): Promise<ActivityPage> {
  const { params, resolvedPage, resolvedPerPage } = buildActivityParams(query);

  const res = await apiFetch<any>({ url: `activity/me?${params.toString()}`, method: 'GET', signal: opts.signal });

  return toActivityPage(res.data, { page: resolvedPage, limit: resolvedPerPage });
}

export async function fetchMyActivitySummary(opts: FetchOpts = {}): Promise<MyActivitySummary> {
  const res = await apiFetch<any>({ url: 'activity/me/summary', method: 'GET', signal: opts.signal });
  return (res.data?.data ?? res.data) as MyActivitySummary;
}

export async function fetchMyActivityStats(
  { days = 30, ...query }: ActivityQuery & { days?: number } = {},
  opts: FetchOpts = {}
) {
  const { params } = buildActivityParams(query);
  params.set('days', String(days));

  const res = await apiFetch<any>({ url: `activity/me/stats?${params.toString()}`, method: 'GET', signal: opts.signal });

  return res.data?.data ?? res.data;
}

export async function fetchActivityStats(
  { days = 30, ...query }: ActivityQuery & { days?: number } = {},
  opts: FetchOpts = {}
) {
  const { params } = buildActivityParams(query);
  params.set('days', String(days));

  const res = await apiFetch<any>({ url: `activity/stats?${params.toString()}`, method: 'GET', signal: opts.signal });

  return res.data?.data ?? res.data;
}

export async function fetchActivityFilters({ days = 365 }: { days?: number } = {}, opts: FetchOpts = {}) {
  const params = new URLSearchParams({ days: String(days) });

  const res = await apiFetch<any>({ url: `activity/filters?${params.toString()}`, method: 'GET', signal: opts.signal });

  return res.data?.data ?? res.data;
}
