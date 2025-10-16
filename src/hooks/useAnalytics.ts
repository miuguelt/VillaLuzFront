import { useQuery, UseQueryResult } from '@tanstack/react-query';
import analyticsService from '@/services/analyticsService';

/**
 * Hook personalizado para manejar todas las queries de analytics
 * Centraliza la lógica de caching y refetch para endpoints de analytics
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
      staleTime: 2 * 60 * 1000, // 2 minutos
      refetchInterval: 5 * 60 * 1000, // Refetch cada 5 minutos
      retry: 2,
    });

  /**
   * Inventario de animales (distribución por especie, raza, sexo)
   */
  const useAnimalInventory = (): UseQueryResult<any, Error> =>
    useQuery({
      queryKey: ['animal-inventory'],
      queryFn: () => analyticsService.getAnimalInventory(),
      staleTime: 2 * 60 * 1000,
      retry: 2,
    });

  /**
   * Pirámide de edad de animales
   */
  const useAgePyramid = (): UseQueryResult<any, Error> =>
    useQuery({
      queryKey: ['age-pyramid'],
      queryFn: () => analyticsService.getAgePyramid(),
      staleTime: 5 * 60 * 1000,
      retry: 2,
    });

  /**
   * Tendencias de animales (nacimientos, muertes, ventas)
   * @param months - Número de meses a consultar (default: 12)
   */
  const useAnimalTrends = (months: number = 12): UseQueryResult<any, Error> =>
    useQuery({
      queryKey: ['animal-trends', months],
      queryFn: () => analyticsService.getAnimalTrends(months),
      staleTime: 5 * 60 * 1000,
      retry: 2,
    });

  /**
   * Eficiencia reproductiva
   */
  const useReproductiveEfficiency = (): UseQueryResult<any, Error> =>
    useQuery({
      queryKey: ['reproductive-efficiency'],
      queryFn: () => analyticsService.getReproductiveEfficiency(),
      staleTime: 10 * 60 * 1000, // 10 minutos (cambia menos frecuentemente)
      retry: 2,
    });

  /**
   * Resumen de salud general
   */
  const useHealthSummary = (): UseQueryResult<any, Error> =>
    useQuery({
      queryKey: ['health-summary'],
      queryFn: () => analyticsService.getHealthSummary(),
      staleTime: 2 * 60 * 1000,
      retry: 2,
    });

  /**
   * Estadísticas de enfermedades
   * @param months - Número de meses a consultar (default: 12)
   */
  const useDiseases = (months: number = 12): UseQueryResult<any, Error> =>
    useQuery({
      queryKey: ['diseases', months],
      queryFn: () => analyticsService.getDiseaseStatistics(months),
      staleTime: 5 * 60 * 1000,
      retry: 2,
    });

  /**
   * Cobertura de vacunación
   */
  const useVaccinationCoverage = (): UseQueryResult<any, Error> =>
    useQuery({
      queryKey: ['vaccination-coverage'],
      queryFn: () => analyticsService.getVaccinationCoverage(),
      staleTime: 5 * 60 * 1000,
      retry: 2,
    });

  /**
   * Ocupación de potreros
   */
  const useFieldOccupation = (): UseQueryResult<any, Error> =>
    useQuery({
      queryKey: ['field-occupation'],
      queryFn: () => analyticsService.getFieldOccupation(),
      staleTime: 2 * 60 * 1000,
      retry: 2,
    });

  /**
   * Mapa de salud de potreros
   */
  const useFieldHealthMap = (): UseQueryResult<any, Error> =>
    useQuery({
      queryKey: ['field-health-map'],
      queryFn: () => analyticsService.getFieldHealthMap(),
      staleTime: 5 * 60 * 1000,
      retry: 2,
    });

  /**
   * Alertas del sistema
   * @param params - Parámetros de filtrado (priority, limit, etc.)
   */
  const useAlerts = (params?: any): UseQueryResult<any, Error> =>
    useQuery({
      queryKey: ['alerts', params],
      queryFn: () => analyticsService.getAlerts(params),
      staleTime: 1 * 60 * 1000, // 1 minuto (más frecuente para alertas)
      refetchInterval: 2 * 60 * 1000, // Refetch cada 2 minutos
      retry: 2,
    });

  /**
   * Distribución de animales para gráficos
   */
  const useAnimalDistribution = (): UseQueryResult<any, Error> =>
    useQuery({
      queryKey: ['animal-distribution'],
      queryFn: () => analyticsService.getAnimalDistribution(),
      staleTime: 5 * 60 * 1000,
      retry: 2,
    });

  /**
   * Heatmap de salud
   */
  const useHealthHeatmap = (): UseQueryResult<any, Error> =>
    useQuery({
      queryKey: ['health-heatmap'],
      queryFn: () => analyticsService.getHealthHeatmap(),
      staleTime: 5 * 60 * 1000,
      retry: 2,
    });

  return {
    useDashboard,
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
