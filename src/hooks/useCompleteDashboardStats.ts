import { useState, useEffect, useCallback } from 'react';
import { analyticsService } from '@/services/analyticsService';

export interface StatTrend {
  periodo_actual: number;
  periodo_anterior: number;
}

export interface DashboardStat {
  valor: number;
  /**
   * Desglose de altas recientes para el periodo actual (últimos 30 días)
   * y el periodo inmediatamente anterior (30-60 días).
   * Campo opcional: no todas las métricas lo incluyen.
   */
  tendencia?: StatTrend;
  cambio_porcentual?: number;
  desglose?: Record<string, any>;
}

export interface CompleteDashboardStats {
  // Usuarios
  usuarios_registrados: DashboardStat;
  usuarios_activos: DashboardStat;

  // Animales
  animales_registrados: DashboardStat;
  animales_activos: DashboardStat;

  // Tratamientos
  tratamientos_totales: DashboardStat;
  tratamientos_activos: DashboardStat;

  // Alertas y Tareas
  tareas_pendientes: DashboardStat;
  alertas_sistema: DashboardStat;

  // Vacunas y Controles
  vacunas_aplicadas: DashboardStat;
  controles_realizados: DashboardStat;
  campos_registrados: DashboardStat;

  // Catálogos
  catalogo_vacunas: DashboardStat;
  catalogo_medicamentos: DashboardStat;
  catalogo_enfermedades: DashboardStat;
  catalogo_especies: DashboardStat;
  catalogo_razas: DashboardStat;
  catalogo_tipos_alimento: DashboardStat;

  // Relaciones
  animales_por_campo: DashboardStat;
  animales_por_enfermedad: DashboardStat;

  // Mejoras y Tratamientos
  mejoras_geneticas: DashboardStat;
  tratamientos_medicamentos: DashboardStat;
  tratamientos_vacunas: DashboardStat;
}

interface UseCompleteDashboardStatsResult {
  stats: CompleteDashboardStats | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  lastUpdated: Date | null;
}

/**
 * Hook optimizado para obtener todas las estadísticas del dashboard
 * en una sola llamada HTTP. Incluye auto-refresh cada 2 minutos
 * para aprovechar el caché del backend.
 */
export function useCompleteDashboardStats(
  autoRefresh: boolean = true,
  refreshInterval: number = 120000 // 2 minutos (mismo que el caché del backend)
): UseCompleteDashboardStatsResult {
  const [stats, setStats] = useState<CompleteDashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await analyticsService.getCompleteDashboardStats();

      setStats(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching complete dashboard stats:', err);
      setError(err instanceof Error ? err : new Error('Error desconocido'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Cargar datos iniciales
    fetchStats();

    // Configurar auto-refresh si está habilitado
    if (autoRefresh) {
      const intervalId = setInterval(() => {
        fetchStats();
      }, refreshInterval);

      return () => clearInterval(intervalId);
    }
  }, [fetchStats, autoRefresh, refreshInterval]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
    lastUpdated,
  };
}

/**
 * Función helper para obtener el valor de una estadística
 * con un valor por defecto si no existe
 */
export function getStatValue(
  stat: DashboardStat | undefined,
  defaultValue: number = 0
): number {
  return stat?.valor ?? defaultValue;
}

/**
 * Función helper para obtener el cambio porcentual
 * con formato de display
 */
export function getStatChange(
  stat: DashboardStat | undefined
): { value: number; isPositive: boolean; display: string } | null {
  if (!stat?.cambio_porcentual && stat?.cambio_porcentual !== 0) {
    return null;
  }

  const value = stat.cambio_porcentual;
  const isPositive = value >= 0;
  const display = `${isPositive ? '+' : ''}${value}%`;

  return { value, isPositive, display };
}

export default useCompleteDashboardStats;
