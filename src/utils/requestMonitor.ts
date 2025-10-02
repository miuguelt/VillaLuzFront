/**
 * Sistema de monitoreo de peticiones HTTP para detectar y optimizar llamadas redundantes
 */

import { ENV, IS_DEV } from '@/config/env';
import { logger, logApiCall, logCacheHit } from './logger';

interface RequestLog {
  url: string;
  method: string;
  timestamp: number;
  duration?: number;
  fromCache: boolean;
  size?: number;
}

class RequestMonitor {
  private requests: RequestLog[] = [];
  private isEnabled: boolean = false;
  private maxLogs: number = 1000;

  constructor() {
    this.isEnabled = IS_DEV && ENV.VITE_ENABLE_PERFORMANCE_MONITORING === 'true';
  }

  enable() {
    this.isEnabled = true;
  }

  disable() {
    this.isEnabled = false;
  }

  logRequest(url: string, method: string, fromCache: boolean = false, duration?: number, size?: number) {
    if (!this.isEnabled) return;

    const log: RequestLog = {
      url,
      method,
      timestamp: Date.now(),
      duration,
      fromCache,
      size
    };

    this.requests.push(log);

    // Mantener solo los últimos N logs
    if (this.requests.length > this.maxLogs) {
      this.requests = this.requests.slice(-this.maxLogs);
    }

    // Log en consola para debugging
    if (fromCache) {
      logCacheHit(method, url, duration || 0);
    } else {
      logApiCall(method, url, duration || 0, size);
    }
  }

  getStats(timeWindow: number = 60000) { // Últimos 60 segundos por defecto
    const now = Date.now();
    const recentRequests = this.requests.filter(req => now - req.timestamp <= timeWindow);
    
    const totalRequests = recentRequests.length;
    const cacheHits = recentRequests.filter(req => req.fromCache).length;
    const apiCalls = totalRequests - cacheHits;
    const cacheHitRate = totalRequests > 0 ? (cacheHits / totalRequests) * 100 : 0;
    
    // Agrupar por endpoint
    const endpointStats = recentRequests.reduce((acc, req) => {
      const endpoint = this.extractEndpoint(req.url);
      if (!acc[endpoint]) {
        acc[endpoint] = { total: 0, cached: 0, api: 0 };
      }
      acc[endpoint].total++;
      if (req.fromCache) {
        acc[endpoint].cached++;
      } else {
        acc[endpoint].api++;
      }
      return acc;
    }, {} as Record<string, { total: number; cached: number; api: number }>);

    // Detectar endpoints con muchas llamadas
    const redundantEndpoints = Object.entries(endpointStats)
      .filter(([_, stats]) => stats.api > 3) // Más de 3 llamadas API al mismo endpoint
      .map(([endpoint, stats]) => ({ endpoint, ...stats }));

    return {
      timeWindow,
      totalRequests,
      apiCalls,
      cacheHits,
      cacheHitRate,
      endpointStats,
      redundantEndpoints,
      averageResponseTime: this.calculateAverageResponseTime(recentRequests)
    };
  }

  private extractEndpoint(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname;
    } catch {
      return url;
    }
  }

  private calculateAverageResponseTime(requests: RequestLog[]): number {
    const requestsWithDuration = requests.filter(req => req.duration !== undefined);
    if (requestsWithDuration.length === 0) return 0;
    
    const totalDuration = requestsWithDuration.reduce((sum, req) => sum + (req.duration || 0), 0);
    return totalDuration / requestsWithDuration.length;
  }

  printStats(timeWindow?: number) {
    const stats = this.getStats(timeWindow);
    
    logger.debug('📊 Request Monitor Stats');
    logger.debug(`⏱️  Time Window: ${stats.timeWindow / 1000}s`);
    logger.debug(`📡 Total Requests: ${stats.totalRequests}`);
    logger.debug(`🌐 API Calls: ${stats.apiCalls}`);
    logger.debug(`🚀 Cache Hits: ${stats.cacheHits}`);
    logger.debug(`📈 Cache Hit Rate: ${stats.cacheHitRate.toFixed(1)}%`);
    logger.debug(`⚡ Avg Response Time: ${stats.averageResponseTime.toFixed(0)}ms`);
    
    if (stats.redundantEndpoints.length > 0) {
      logger.debug('⚠️  Potentially Redundant Endpoints');
      stats.redundantEndpoints.forEach(endpoint => {
        logger.debug(`${endpoint.endpoint}: ${endpoint.api} API calls, ${endpoint.cached} cached`);
      });
    }
    
    logger.debug('📋 Endpoint Breakdown');
    Object.entries(stats.endpointStats).forEach(([endpoint, endpointStats]) => {
      const hitRate = endpointStats.total > 0 ? (endpointStats.cached / endpointStats.total * 100).toFixed(1) : '0';
      logger.debug(`${endpoint}: ${endpointStats.total} total (${endpointStats.api} API, ${endpointStats.cached} cached, ${hitRate}% hit rate)`);
    });
  }

  getRedundantRequests(timeWindow: number = 10000): Array<{ url: string; count: number; timestamps: number[] }> {
    const now = Date.now();
    const recentRequests = this.requests.filter(req => 
      now - req.timestamp <= timeWindow && !req.fromCache
    );
    
    const urlCounts = recentRequests.reduce((acc, req) => {
      if (!acc[req.url]) {
        acc[req.url] = { count: 0, timestamps: [] };
      }
      acc[req.url].count++;
      acc[req.url].timestamps.push(req.timestamp);
      return acc;
    }, {} as Record<string, { count: number; timestamps: number[] }>);
    
    return Object.entries(urlCounts)
      .filter(([_, data]) => data.count > 1)
      .map(([url, data]) => ({ url, ...data }))
      .sort((a, b) => b.count - a.count);
  }

  clear() {
    this.requests = [];
  }

  exportLogs(): RequestLog[] {
    return [...this.requests];
  }
}

// Instancia global del monitor
export const requestMonitor = new RequestMonitor();

// Interceptor para Axios
export function setupAxiosInterceptor(axiosInstance: any) {
  // Request interceptor
  axiosInstance.interceptors.request.use(
    (config: any) => {
      config.metadata = { startTime: Date.now() };
      return config;
    },
    (error: any) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor
  axiosInstance.interceptors.response.use(
    (response: any) => {
      const endTime = Date.now();
      const duration = endTime - (response.config.metadata?.startTime || endTime);
      const size = JSON.stringify(response.data).length;
      
      requestMonitor.logRequest(
        response.config.url,
        response.config.method?.toUpperCase() || 'GET',
        false, // No es del caché
        duration,
        size
      );
      
      return response;
    },
    (error: any) => {
      const endTime = Date.now();
      const duration = endTime - (error.config?.metadata?.startTime || endTime);
      
      requestMonitor.logRequest(
        error.config?.url || 'unknown',
        error.config?.method?.toUpperCase() || 'GET',
        false,
        duration
      );
      
      return Promise.reject(error);
    }
  );
}

// Función para simular un hit de caché
export function simulateCacheHit(url: string, method: string = 'GET') {
  requestMonitor.logRequest(url, method, true, 0);
}

// Hook para usar el monitor en componentes React
export function useRequestMonitor() {
  return {
    getStats: (timeWindow?: number) => requestMonitor.getStats(timeWindow),
    printStats: (timeWindow?: number) => requestMonitor.printStats(timeWindow),
    getRedundantRequests: (timeWindow?: number) => requestMonitor.getRedundantRequests(timeWindow),
    clear: () => requestMonitor.clear(),
    exportLogs: () => requestMonitor.exportLogs()
  };
}

// Utilidad para mostrar estadísticas en la consola cada cierto tiempo
export function startPeriodicStats(intervalMs: number = 30000) {
  if (!IS_DEV || ENV.VITE_ENABLE_PERFORMANCE_MONITORING !== 'true') return;
  
  const interval = setInterval(() => {
    const stats = requestMonitor.getStats();
    if (stats.totalRequests > 0) {
      requestMonitor.printStats();
    }
  }, intervalMs);
  
  return () => clearInterval(interval);
}