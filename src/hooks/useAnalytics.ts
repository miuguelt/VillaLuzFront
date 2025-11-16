import { useQuery, UseQueryResult } from '@tanstack/react-query';
import analyticsService from '@/services/analyticsService';
import { ANALYTICS_FEATURES } from '@/config/analyticsFeatures';
import type { AnimalStatistics, HealthStatistics, ProductionStatistics } from '@/types/swaggerTypes';

/**
 * Hook personalizado para manejar todas las queries de analytics
 * Centraliza la lógica de caching y refetch para endpoints de analytics
 *
 * Nota: Algunos endpoints están deshabilitados (enabled: false) porque
 * no existen en el backend. Ver @/config/analyticsFeatures.ts para detalles.
 */
export const useAnalytics = () => {
  /**
   * Dashboard completo con todas las estadísticas
   * Refetch automático cada 5 minutos
   */
  const useDashboard = (): UseQueryResult<any, Error> =>
    useQuery({
      queryKey: ['dashboard-complete'],
      queryFn: () => analyticsService.getCompleteDashboardStats(),
      enabled: ANALYTICS_FEATURES.DASHBOARD_COMPLETE,
      staleTime: 2 * 60 * 1000, // 2 minutos
      refetchInterval: 5 * 60 * 1000, // Refetch cada 5 minutos
      retry: 2,
    });

  /**
   * Inventario de animales (distribución por especie, raza, sexo)
   * ❌ DISABLED: Endpoint not implemented in backend
   */
  const useAnimalInventory = (): UseQueryResult<any, Error> =>
    useQuery({
      queryKey: ['animal-inventory'],
      queryFn: () => analyticsService.getAnimalInventory(),
      enabled: ANALYTICS_FEATURES.ANIMAL_INVENTORY,
      staleTime: 2 * 60 * 1000,
      retry: false,
    });

  /**
   * Pirámide de edad de animales
   * ❌ DISABLED: Endpoint not implemented in backend
   */
  const useAgePyramid = (): UseQueryResult<any, Error> =>
    useQuery({
      queryKey: ['age-pyramid'],
      queryFn: () => analyticsService.getAgePyramid(),
      enabled: ANALYTICS_FEATURES.AGE_PYRAMID,
      staleTime: 5 * 60 * 1000,
      retry: false,
    });

  /**
   * Estadísticas detalladas de animales
   * Incluye distribución por estado, sexo, raza, grupos de edad y peso promedio
   */
  const useAnimalStatistics = (): UseQueryResult<AnimalStatistics, Error> =>
    useQuery({
      queryKey: ['animal-statistics'],
      queryFn: () => analyticsService.getAnimalStatistics(),
      enabled: ANALYTICS_FEATURES.ANIMAL_STATISTICS,
      staleTime: 5 * 60 * 1000,
      retry: 1,
    });

  /**
   * Estadísticas de salud (tratamientos, vacunas, enfermedades comunes)
   */
  const useHealthStatistics = (): UseQueryResult<HealthStatistics, Error> =>
    useQuery({
      queryKey: ['health-statistics'],
      queryFn: () => analyticsService.getHealthStatistics(),
      enabled: ANALYTICS_FEATURES.HEALTH_STATISTICS,
      staleTime: 5 * 60 * 1000,
      retry: 1,
    });

  /**
   * Estadísticas de producción y rendimiento
   */
  const useProductionStatistics = (): UseQueryResult<ProductionStatistics, Error> =>
    useQuery({
      queryKey: ['production-statistics'],
      queryFn: () => analyticsService.getProductionStatistics(),
      enabled: ANALYTICS_FEATURES.PRODUCTION_STATISTICS,
      staleTime: 5 * 60 * 1000,
      retry: 1,
    });

  /**
   * Tendencias de animales (nacimientos, muertes, ventas)
   * @param months - Número de meses a consultar (default: 12)
   * ❌ DISABLED: Endpoint not implemented in backend
   * 💡 Alternative: Use /analytics/production/statistics for trends data
   */
  const useAnimalTrends = (months: number = 12): UseQueryResult<any, Error> =>
    useQuery({
      queryKey: ['animal-trends', months],
      queryFn: () => analyticsService.getAnimalTrends(months),
      enabled: ANALYTICS_FEATURES.ANIMAL_TRENDS,
      staleTime: 5 * 60 * 1000,
      retry: false,
    });

  /**
   * Eficiencia reproductiva
   * ❌ DISABLED: Endpoint not implemented in backend
   */
  const useReproductiveEfficiency = (): UseQueryResult<any, Error> =>
    useQuery({
      queryKey: ['reproductive-efficiency'],
      queryFn: () => analyticsService.getReproductiveEfficiency(),
      enabled: ANALYTICS_FEATURES.REPRODUCTIVE_EFFICIENCY,
      staleTime: 10 * 60 * 1000,
      retry: false,
    });

  /**
   * Resumen de salud general
   * ❌ DISABLED: Endpoint not implemented in backend
   * 💡 Alternative: Use /analytics/health/statistics
   */
  const useHealthSummary = (): UseQueryResult<any, Error> =>
    useQuery({
      queryKey: ['health-summary'],
      queryFn: () => analyticsService.getHealthSummary(),
      enabled: ANALYTICS_FEATURES.HEALTH_SUMMARY,
      staleTime: 2 * 60 * 1000,
      retry: false,
    });

  /**
   * Estadísticas de enfermedades
   * @param months - Número de meses a consultar (default: 12)
   * ❌ DISABLED: Endpoint not implemented in backend
   */
  const useDiseases = (months: number = 12): UseQueryResult<any, Error> =>
    useQuery({
      queryKey: ['diseases', months],
      queryFn: () => analyticsService.getDiseaseStatistics(months),
      enabled: ANALYTICS_FEATURES.DISEASE_STATISTICS,
      staleTime: 5 * 60 * 1000,
      retry: false,
    });

  /**
   * Cobertura de vacunación
   * ❌ DISABLED: Endpoint not implemented in backend
   */
  const useVaccinationCoverage = (): UseQueryResult<any, Error> =>
    useQuery({
      queryKey: ['vaccination-coverage'],
      queryFn: () => analyticsService.getVaccinationCoverage(),
      enabled: ANALYTICS_FEATURES.VACCINATION_COVERAGE,
      staleTime: 5 * 60 * 1000,
      retry: false,
    });

  /**
   * Ocupación de potreros
   * ❌ DISABLED: Endpoint not implemented in backend
   * 💡 Alternative: Use /analytics/dashboard/complete -> animales_por_campo
   */
  const useFieldOccupation = (): UseQueryResult<any, Error> =>
    useQuery({
      queryKey: ['field-occupation'],
      queryFn: () => analyticsService.getFieldOccupation(),
      enabled: ANALYTICS_FEATURES.FIELD_OCCUPATION,
      staleTime: 2 * 60 * 1000,
      retry: false,
    });

  /**
   * Mapa de salud de potreros
   * ❌ DISABLED: Endpoint not implemented in backend
   */
  const useFieldHealthMap = (): UseQueryResult<any, Error> =>
    useQuery({
      queryKey: ['field-health-map'],
      queryFn: () => analyticsService.getFieldHealthMap(),
      enabled: ANALYTICS_FEATURES.FIELD_HEALTH_MAP,
      staleTime: 5 * 60 * 1000,
      retry: false,
    });

  /**
   * Alertas del sistema
   * ✅ AVAILABLE in backend
   */
  const useAlerts = (params?: any): UseQueryResult<any, Error> =>
    useQuery({
      queryKey: ['alerts', params],
      queryFn: () => analyticsService.getAlerts(params),
      enabled: ANALYTICS_FEATURES.ALERTS,
      staleTime: 1 * 60 * 1000, // 1 minuto (más frecuente para alertas)
      refetchInterval: 2 * 60 * 1000, // Refetch cada 2 minutos
      retry: 2,
    });

  /**
   * Distribución de animales para gráficos
   * ❌ DISABLED: Endpoint not implemented in backend
   */
  const useAnimalDistribution = (): UseQueryResult<any, Error> =>
    useQuery({
      queryKey: ['animal-distribution'],
      queryFn: () => analyticsService.getAnimalDistribution(),
      enabled: ANALYTICS_FEATURES.ANIMAL_DISTRIBUTION,
      staleTime: 5 * 60 * 1000,
      retry: false,
    });

  /**
   * Heatmap de salud
   * ❌ DISABLED: Endpoint not implemented in backend
   */
  const useHealthHeatmap = (): UseQueryResult<any, Error> =>
    useQuery({
      queryKey: ['health-heatmap'],
      queryFn: () => analyticsService.getHealthHeatmap(),
      enabled: ANALYTICS_FEATURES.HEALTH_HEATMAP,
      staleTime: 5 * 60 * 1000,
      retry: false,
    });

  return {
    useDashboard,
    useAnimalStatistics,
    useHealthStatistics,
    useProductionStatistics,
    useAnimalInventory,
    useAgePyramid,
    useAnimalTrends,
    useReproductiveEfficiency,
    useHealthSummary,
    useDiseases,
    useVaccinationCoverage,
    useFieldOccupation,
    useFieldHealthMap,
    useAlerts,
    useAnimalDistribution,
    useHealthHeatmap,
  };
};

export default useAnalytics;
