// Utilidades para manejo optimizado de JSON y transformación de datos
import { 
  ChartDataItem, 
  StatisticsToChartOptions, 
  UserStatistics, 
  CHART_COLORS, 
  STATUS_LABELS 
} from '@/shared/types/common.types';

/**
 * Convierte respuesta de estadísticas de objeto a formato de array para gráficos
 */
export function statisticsToChartData(
  stats: Record<string, any>, 
  options: StatisticsToChartOptions = {}
): ChartDataItem[] {
  const {
    activeKey = 'active_users',
    inactiveKey = 'inactive_users',
    totalKey = 'total_users',
    activeLabel = STATUS_LABELS.active,
    inactiveLabel = STATUS_LABELS.inactive,
    colors = CHART_COLORS
  } = options;

  const total = stats[totalKey] || 0;
  const active = stats[activeKey] || 0;
  const inactive = stats[inactiveKey] || 0;

  const result: ChartDataItem[] = [];

  if (active > 0) {
    result.push({
      status: activeLabel,
      count: active,
      percentage: total > 0 ? parseFloat(((active / total) * 100).toFixed(2)) : 0,
      color: colors.active || CHART_COLORS.active
    });
  }

  if (inactive > 0) {
    result.push({
      status: inactiveLabel,
      count: inactive,
      percentage: total > 0 ? parseFloat(((inactive / total) * 100).toFixed(2)) : 0,
      color: colors.inactive || CHART_COLORS.inactive
    });
  }

  return result;
}

/**
 * Convierte específicamente datos de usuario a formato de gráfico
 */
export function userStatsToChartData(userStats: UserStatistics): ChartDataItem[] {
  return statisticsToChartData(userStats, {
    activeKey: 'active_users',
    inactiveKey: 'inactive_users',
    totalKey: 'total_users',
    activeLabel: 'Activos',
    inactiveLabel: 'Inactivos'
  });
}

/**
 * Convierte datos de animal status a formato de gráfico
 */
export function animalStatsToChartData(animalStats: Record<string, any>): ChartDataItem[] {
  const statusMapping: Record<string, string> = {
    'Activo': 'Activos',
    'Vendido': 'Vendidos',
    'Enfermo': 'Enfermos',
    'Muerto': 'Muertos'
  };

  return Object.entries(animalStats.by_status || {}).map(([status, count]) => ({
    status: statusMapping[status] || status,
    count: count as number,
    percentage: animalStats.total_animals > 0 
      ? parseFloat(((count as number / animalStats.total_animals) * 100).toFixed(2)) 
      : 0,
    color: getStatusColor(status)
  }));
}

/**
 * Convierte datos de Potreros a formato de gráfico
 */
export function fieldStatsToChartData(fieldStats: Record<string, any>): ChartDataItem[] {
  const states = ['available', 'occupied', 'maintenance', 'restricted'];
  const total = fieldStats.total_fields || 0;

  return states
    .filter(state => fieldStats[state] > 0)
    .map(state => ({
      status: STATUS_LABELS[state as keyof typeof STATUS_LABELS] || state,
      count: fieldStats[state],
      percentage: total > 0 
        ? parseFloat(((fieldStats[state] / total) * 100).toFixed(2)) 
        : 0,
      color: getFieldStateColor(state)
    }));
}

/**
 * Obtiene color según el estado del animal
 */
function getStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    'Activo': CHART_COLORS.success,
    'Vendido': CHART_COLORS.info,
    'Enfermo': CHART_COLORS.warning,
    'Muerto': CHART_COLORS.inactive
  };
  return colorMap[status] || CHART_COLORS.neutral;
}

/**
 * Obtiene color según el estado del campo
 */
function getFieldStateColor(state: string): string {
  const colorMap: Record<string, string> = {
    'available': CHART_COLORS.success,
    'occupied': CHART_COLORS.info,
    'maintenance': CHART_COLORS.warning,
    'restricted': CHART_COLORS.inactive
  };
  return colorMap[state] || CHART_COLORS.neutral;
}

/**
 * Normaliza respuesta de API extrayendo datos principales
 */
export function extractApiData<T>(response: any): T {
  // Casos comunes de estructura de respuesta
  if (response?.data?.data) return response.data.data;
  if (response?.data) return response.data;
  return response;
}

/**
 * Normaliza array de respuesta de API
 */
export function extractApiArray<T>(response: any, preferredKeys: string[] = []): T[] {
  const data = extractApiData(response);
  
  // Si ya es array, retornarlo
  if (Array.isArray(data)) return data as T[];
  
  // Si data no es objeto, retornar array vacío
  if (!data || typeof data !== 'object') return [];
  
  const dataObj = data as Record<string, any>;
  
  // Buscar en keys preferidas
  for (const key of preferredKeys) {
    if (dataObj[key] && Array.isArray(dataObj[key])) {
      return dataObj[key] as T[];
    }
  }
  
  // Keys comunes para arrays
  const commonArrayKeys = ['items', 'results', 'list', 'data'];
  for (const key of commonArrayKeys) {
    if (dataObj[key] && Array.isArray(dataObj[key])) {
      return dataObj[key] as T[];
    }
  }
  
  // Si no es array, envolver en array
  return data ? [data as T] : [];
}

/**
 * Valida y normaliza datos JSON
 */
export function normalizeJsonData<T>(data: any): T | null {
  try {
    // Si es string, intentar parsear
    if (typeof data === 'string') {
      return JSON.parse(data);
    }
    
    // Si es objeto válido, retornarlo
    if (data && typeof data === 'object') {
      return data;
    }
    
    return null;
  } catch (error) {
    console.warn('[JSON] Error parsing data:', error);
    return null;
  }
}

/**
 * Sanitiza parámetros de consulta removiendo valores undefined/null
 */
export function sanitizeQueryParams(params: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      sanitized[key] = value;
    }
  });
  
  return sanitized;
}

/**
 * Convierte datos a formato CSV para exportación
 */
export function dataToCSV<T extends Record<string, any>>(
  data: T[], 
  headers?: Record<keyof T, string>
): string {
  if (!data.length) return '';
  
  const keys = Object.keys(data[0]) as (keyof T)[];
  const headerRow = headers 
    ? keys.map(key => headers[key] || String(key)).join(',')
    : keys.join(',');
  
  const dataRows = data.map(item => 
    keys.map(key => {
      const value = item[key];
      // Escapar comillas y envolver en comillas si contiene comas
      const stringValue = String(value || '');
      return stringValue.includes(',') || stringValue.includes('"') 
        ? `"${stringValue.replace(/"/g, '""')}"` 
        : stringValue;
    }).join(',')
  );
  
  return [headerRow, ...dataRows].join('\n');
}

/**
 * Descarga datos como archivo JSON
 */
export function downloadAsJSON(data: any, filename: string): void {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.json') ? filename : `${filename}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Descarga datos como archivo CSV
 */
export function downloadAsCSV<T extends Record<string, any>>(
  data: T[], 
  filename: string,
  headers?: Record<keyof T, string>
): void {
  const csvContent = dataToCSV(data, headers);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Debounce function para optimizar llamadas a API
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Retry function para llamadas a API con fallos
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxAttempts) {
        throw lastError;
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
    }
  }
  
  throw lastError!;
}
