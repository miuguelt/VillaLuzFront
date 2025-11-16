/**
 * PrefetchManager
 * Sistema inteligente de prefetching para rutas y datos comunes
 * Mejora drásticamente la percepción de velocidad de la aplicación
 */

import { useCallback, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useIdleCallback, useNetworkStatus } from '@/hooks/usePerformance';
import { isLowEndDevice } from '@/utils/performance';
import { animalService } from '@/services/animalService';
import { fieldService } from '@/services/fieldService';
import { breedsService } from '@/services/breedsService';
import { speciesService } from '@/services/speciesService';

interface PrefetchConfig {
  route: string;
  queryKey: string[];
  fetchFn: () => Promise<any>;
  priority: 'high' | 'normal' | 'low';
  dependencies?: string[]; // Rutas que deben prefetchearse antes
}

/**
 * Configuración de prefetch por ruta
 */
const PREFETCH_CONFIG: PrefetchConfig[] = [
  // Datos maestros - Alta prioridad, usados en todas partes
  {
    route: '/dashboard',
    queryKey: ['species'],
    fetchFn: () => speciesService.getPaginated({ limit: 100 }),
    priority: 'high',
  },
  {
    route: '/dashboard',
    queryKey: ['breeds'],
    fetchFn: () => breedsService.getPaginated({ limit: 200 }),
    priority: 'high',
  },

  // Animales - Prioridad normal, datasets grandes
  {
    route: '/dashboard/admin/animals',
    queryKey: ['animals', 'list'],
    fetchFn: () => animalService.getPaginated({ page: 1, limit: 20 }),
    priority: 'normal',
    dependencies: ['species', 'breeds'],
  },

  // Campos - Prioridad normal
  {
    route: '/dashboard/admin/fields',
    queryKey: ['fields', 'list'],
    fetchFn: () => fieldService.getPaginated({ limit: 50 }),
    priority: 'normal',
  },

  // Analytics - Baja prioridad, datos pesados
  {
    route: '/dashboard/admin/analytics',
    queryKey: ['analytics', 'dashboard'],
    fetchFn: async () => {
      // Simular carga de analytics
      return { loaded: true };
    },
    priority: 'low',
  },
];

export const PrefetchManager: React.FC = () => {
  const location = useLocation();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuth();
  const { online, saveData } = useNetworkStatus();
  const prefetchedRoutes = useRef<Set<string>>(new Set());
  const prefetchedQueries = useRef<Set<string>>(new Set());
  const isPrefetching = useRef(false);

  const markQueryPrefetched = (config: PrefetchConfig) => {
    const key = config.queryKey[0] ?? config.queryKey.join('|');
    prefetchedQueries.current.add(key);
  };

  /**
   * Prefetch de datos para una ruta específica
   */
  const prefetchRoute = useCallback(async (route: string) => {
    // Solo si está autenticado y online
    if (!isAuthenticated || !online) return;

    // No prefetch en modo ahorro de datos
    if (saveData) return;

    // No prefetch en dispositivos de gama baja
    if (isLowEndDevice()) return;

    // Evitar prefetch duplicado
    if (prefetchedRoutes.current.has(route) || isPrefetching.current) return;

    isPrefetching.current = true;

    try {
      // Obtener configuraciones para esta ruta
      const configs = PREFETCH_CONFIG.filter((config) =>
        route.startsWith(config.route)
      );

      // Ordenar por prioridad
      const sortedConfigs = configs.sort((a, b) => {
        const priorityOrder = { high: 3, normal: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

      // Prefetch en orden
      for (const config of sortedConfigs) {
        // Verificar dependencias
        if (config.dependencies) {
          const hasAllDeps = config.dependencies.every((dep) =>
            prefetchedQueries.current.has(dep)
          );
          if (!hasAllDeps) continue;
        }

        // Verificar si ya está en caché de React Query
        const cached = queryClient.getQueryData(config.queryKey);
        if (cached) {
          markQueryPrefetched(config);
          continue;
        }

        // Hacer prefetch
        await queryClient.prefetchQuery({
          queryKey: config.queryKey,
          queryFn: config.fetchFn,
          staleTime: 5 * 60 * 1000, // 5 minutos
        });

        markQueryPrefetched(config);

        // Pequeño delay entre prefetches para no saturar
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      prefetchedRoutes.current.add(route);
    } catch (error) {
      console.warn(`[Prefetch] Error prefetching route ${route}:`, error);
    } finally {
      isPrefetching.current = false;
    }
  }, [isAuthenticated, online, saveData, queryClient]);

  /**
   * Prefetch inteligente basado en la ruta actual
   */
  useEffect(() => {
    if (!isAuthenticated || !online) return;

    // Prefetch datos para la ruta actual
    prefetchRoute(location.pathname);

    // Predecir y prefetch rutas probables basándose en la ruta actual
    const predictNextRoutes = () => {
      const currentPath = location.pathname;

      // Si está en dashboard, prefetch rutas comunes según rol
      if (currentPath === '/dashboard') {
        if (user?.role === 'Administrador') {
          prefetchRoute('/dashboard/admin/animals');
          prefetchRoute('/dashboard/admin/fields');
        } else if (user?.role === 'Instructor') {
          prefetchRoute('/dashboard/instructor/animals');
        } else if (user?.role === 'Aprendiz') {
          prefetchRoute('/dashboard/apprentice/animals');
        }
      }

      // Si está en la lista de animales, prefetch campos y razas
      if (currentPath.includes('/animals')) {
        prefetchRoute('/dashboard/admin/fields');
        prefetchRoute('/dashboard/admin/breeds');
      }

      // Si está en cualquier página admin, prefetch otras páginas admin
      if (currentPath.startsWith('/dashboard/admin/')) {
        const adminRoutes = [
          '/dashboard/admin/animals',
          '/dashboard/admin/fields',
          '/dashboard/admin/breeds',
          '/dashboard/admin/species',
        ];

        adminRoutes.forEach((route) => {
          if (route !== currentPath) {
            // Prefetch con baja prioridad en idle time
            requestIdleCallback(() => {
              prefetchRoute(route);
            });
          }
        });
      }
    };

    // Ejecutar predicción en idle time
    requestIdleCallback(predictNextRoutes, { timeout: 2000 });
  }, [location.pathname, isAuthenticated, online, user?.role, prefetchRoute]);

  /**
   * Prefetch al hacer hover sobre links
   */
  useEffect(() => {
    if (!isAuthenticated || !online) return;

    const handleMouseEnter = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a[href]') as HTMLAnchorElement;

      if (link && link.href) {
        try {
          const url = new URL(link.href);
          // Solo prefetch rutas internas
          if (url.origin === window.location.origin) {
            // Usar requestIdleCallback para no bloquear interacciones
            if ('requestIdleCallback' in window) {
              window.requestIdleCallback(() => {
                prefetchRoute(url.pathname);
              }, { timeout: 500 });
            } else {
              setTimeout(() => prefetchRoute(url.pathname), 50);
            }
          }
        } catch (err) {
          // URL inválida, ignorar
        }
      }
    };

    // Agregar listeners con capture para capturar antes de que llegue al elemento
    document.addEventListener('mouseover', handleMouseEnter, { capture: true, passive: true });

    return () => {
      document.removeEventListener('mouseover', handleMouseEnter, { capture: true });
    };
  }, [isAuthenticated, online, prefetchRoute]);

  /**
   * Limpiar caché antigua periódicamente
   */
  useEffect(() => {
    const cleanup = () => {
      // Limpiar queries inactivas más antiguas de 30 minutos
      queryClient.clear();
      prefetchedRoutes.current.clear();
      prefetchedQueries.current.clear();
    };

    // Limpiar cada 30 minutos
    const interval = setInterval(cleanup, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, [queryClient]);

  /**
   * Prefetch de datos críticos al iniciar sesión
   */
  useIdleCallback(() => {
    if (!isAuthenticated || !online) return;

    // Prefetch datos maestros inmediatamente
    const criticalData = ['species', 'breeds'];

    criticalData.forEach((key) => {
      const config = PREFETCH_CONFIG.find((c) => c.queryKey[0] === key);
      if (!config) return;

      const cached = queryClient.getQueryData(config.queryKey);
      if (cached) {
        markQueryPrefetched(config);
        return;
      }

      void queryClient.prefetchQuery({
        queryKey: config.queryKey,
        queryFn: config.fetchFn,
        staleTime: 10 * 60 * 1000, // 10 minutos para datos críticos
      }).then(() => markQueryPrefetched(config));
    });
  }, { timeout: 1000 });

  // Este componente no renderiza nada
  return null;
};

export default PrefetchManager;
