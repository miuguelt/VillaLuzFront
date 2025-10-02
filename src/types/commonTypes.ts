// Tipos comunes para respuestas de API optimizadas para JSON
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// Tipos para estadísticas normalizadas
export interface BaseStatistics {
  total: number;
  active?: number;
  inactive?: number;
  [key: string]: any;
}

// Estadísticas de usuarios normalizadas
export interface UserStatistics extends BaseStatistics {
  active_users: number;
  inactive_users: number;
  total_users: number;
  active_percentage: number;
}

// Datos de estado para gráficos (formato array esperado por charts)
export interface ChartDataItem {
  status: string;
  count: number;
  percentage: number;
  color?: string;
}

// Estadísticas de animales normalizadas
export interface AnimalStatistics extends BaseStatistics {
  total_animals: number;
  by_status?: Record<string, number>;
  by_breed?: Record<string, number>;
  by_species?: Record<string, number>;
}

// Estadísticas de Potreros normalizadas
export interface FieldStatistics extends BaseStatistics {
  total_fields: number;
  available: number;
  occupied: number;
  maintenance: number;
  restricted: number;
}

// Estadísticas de vacunas normalizadas
export interface VaccineStatistics extends BaseStatistics {
  total_vaccines: number;
  available: number;
  expired: number;
  low_stock?: number;
}

// Estadísticas de tratamientos normalizadas
export interface TreatmentStatistics extends BaseStatistics {
  total_treatments: number;
  active: number;
  completed: number;
  pending: number;
}

// Utilidad para normalizar respuestas de objetos a arrays para gráficos
export interface StatisticsToChartOptions {
  activeKey?: string;
  inactiveKey?: string;
  totalKey?: string;
  activeLabel?: string;
  inactiveLabel?: string;
  colors?: {
    active?: string;
    inactive?: string;
  };
}

// Tipos para respuestas paginadas estandarizadas
export interface PaginationMeta {
  page: number;
  limit: number;
  total_items: number;
  total_pages: number;
  has_next_page: boolean;
  has_previous_page: boolean;
}

export interface PaginatedApiResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  meta: {
    pagination: PaginationMeta;
  };
}

// Tipos para parámetros de consulta estandarizados
export interface QueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  include_relations?: string[];
  fields?: string[];
  filters?: Record<string, any>;
}

// Tipos para operaciones en lote
export interface BulkOperation<T> {
  operation: 'create' | 'update' | 'delete';
  data: T[];
}

export interface BulkResponse<T> {
  success: boolean;
  message: string;
  data: {
    created?: T[];
    updated?: T[];
    deleted?: string[];
    errors?: Array<{
      index: number;
      error: string;
      data?: T;
    }>;
  };
}

// Tipos para validación de datos
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface ValidationResponse {
  valid: boolean;
  errors: ValidationError[];
}

// Tipos para respuestas de estado del sistema
export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: Record<string, {
    status: 'up' | 'down';
    response_time?: number;
    last_check?: string;
  }>;
  timestamp: string;
}

// Constantes para normalización
export const CHART_COLORS = {
  active: '#10b981',     // green-500
  inactive: '#ef4444',   // red-500
  warning: '#f59e0b',    // amber-500
  info: '#3b82f6',       // blue-500
  success: '#10b981',    // green-500
  neutral: '#6b7280',    // gray-500
} as const;

export const STATUS_LABELS = {
  active: 'Activos',
  inactive: 'Inactivos',
  available: 'Disponibles',
  occupied: 'Ocupados',
  maintenance: 'Mantenimiento',
  restricted: 'Restringidos',
  completed: 'Completados',
  pending: 'Pendientes',
  expired: 'Vencidos',
  low_stock: 'Stock Bajo',
} as const;

// Tipos para paginación unificada
export interface PageParams {
  page: number;
  page_size: number;
  search?: string;
  ordering?: string;
  filters?: Record<string, any>;
}

export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}
