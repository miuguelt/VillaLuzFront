import { PaginatedResponse } from '@/shared/api/generated/swaggerTypes';

export interface UnifiedPaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export function toUnifiedMeta<T>(resp: PaginatedResponse<T>): UnifiedPaginationMeta {
  return {
    page: resp.page,
    limit: resp.limit,
    totalItems: resp.total,
    totalPages: resp.totalPages,
    hasNextPage: !!resp.hasNextPage,
    hasPreviousPage: !!resp.hasPreviousPage,
  };
}

export interface ListParamsOptions {
  page?: number;
  page_size?: number;  // alias for limit
  limit?: number;
  search?: string;
  ordering?: string;  // e.g., 'name' or '-name' for desc
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  filters?: Record<string, any>;
  include_relations?: boolean;
  cache_bust?: number;
  fields?: string;
  export?: string;
  [key: string]: any;
}

export function buildListParams(opts: ListParamsOptions = {}): Record<string, any> {
  // Parse ordering to sort_by and sort_order
  let sortBy = opts.sort_by || opts.ordering;
  let sortOrder = opts.sort_order;
  if (opts.ordering && !opts.sort_by) {
    if (opts.ordering.startsWith('-')) {
      sortBy = opts.ordering.slice(1);
      sortOrder = 'desc';
    } else {
      sortBy = opts.ordering;
      sortOrder = 'asc';
    }
  }

  return {
    page: opts.page ?? 1,
    limit: opts.page_size ?? opts.limit ?? 10,
    search: opts.search,
    sort_by: sortBy,
    sort_order: sortOrder,
    ...(opts.filters || {}),  // Spread filters directly
    include_relations: opts.include_relations,
    cache_bust: opts.cache_bust,
    fields: opts.fields,
    export: opts.export,
    ...opts,  // Remaining keys
  };
}
