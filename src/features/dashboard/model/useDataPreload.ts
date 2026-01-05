import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import { useToast } from '@/app/providers/ToastContext';
import dataPreloadService, { 
  PreloadState, 
  DashboardCriticalData, 
  AnimalModuleData, 
  UserModuleData,
  PreloadError,
  PreloadErrorType 
} from '@/features/dashboard/api/dataPreload.service';

/**
 * Opciones para el hook de precarga de datos
 */
export interface UseDataPreloadOptions {
  /**
   * Iniciar precarga automáticamente cuando el hook se monta
   */
  autoStart?: boolean;
  /**
   * Forzar recarga incluso si hay datos en caché válidos
   */
  forceRefresh?: boolean;
  /**
   * Mostrar notificaciones toast para errores no críticos
   */
  showNonCriticalErrors?: boolean;
  /**
   * Retraso antes de iniciar la precarga (ms)
   */
  startDelay?: number;
}

/**
 * Estado de retorno del hook de precarga
 */
export interface UseDataPreloadReturn {
  // Estado general
  isLoading: boolean;
  isInitialized: boolean;
  
  // Estado de carga por módulo
  dashboardLoaded: boolean;
  animalModuleLoaded: boolean;
  userModuleLoaded: boolean;
  
  // Datos
  dashboardData: DashboardCriticalData | null;
  animalModuleData: AnimalModuleData | null;
  userModuleData: UserModuleData | null;
  
  // Errores
  errors: PreloadError[];
  hasCriticalErrors: boolean;
  
  // Acciones
  startPreload: () => Promise<void>;
  retryPreload: () => Promise<void>;
  refreshDashboard: () => Promise<void>;
  refreshAnimalModule: () => Promise<void>;
  refreshUserModule: () => Promise<void>;
  clearErrors: () => void;
  invalidateCache: (module?: 'dashboard' | 'animal' | 'user') => void;
  
  // Utilidades
  getTimeSinceLastUpdate: () => number | null;
  isDataFresh: (maxAgeMs?: number) => boolean;
}

/**
 * Hook personalizado para la gestión de precarga de datos con jerarquía clara
 * 
 * Características principales:
 * - Prioridad absoluta a los datos del dashboard (bloqueante)
 * - Precarga no bloqueante para módulos Animal y Usuario
 * - Manejo granular de errores
 * - Integración con el sistema de autenticación
 * - Estado reactivo para la UI
 */
export function useDataPreload(options: UseDataPreloadOptions = {}): UseDataPreloadReturn {
  const {
    autoStart = true,
    forceRefresh = false,
    showNonCriticalErrors = true,
    startDelay = 0
  } = options;

  // Estado local para sincronizar con el servicio
  const [state, setState] = useState<PreloadState>(dataPreloadService.getState());
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Referencias para evitar llamadas duplicadas
  const preloadPromiseRef = useRef<Promise<void> | null>(null);
  const isMountedRef = useRef(true);
  
  // Hooks externos
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();

  // Sincronizar estado local con el servicio
  const updateState = useCallback((newState: PreloadState) => {
    if (isMountedRef.current) {
      setState(newState);
    }
  }, []);

  // Efecto para suscribirse a cambios en el estado del servicio
  useEffect(() => {
    const unsubscribe = dataPreloadService.onStateChange(updateState);
    return unsubscribe;
  }, [updateState]);

  // Efecto para manejar errores no críticos
  useEffect(() => {
    if (!showNonCriticalErrors || !isInitialized) return;
    
    const nonCriticalErrors = state.errors.filter(error => !error.critical);
    const newErrors = nonCriticalErrors.filter(error => {
      // Considerar "nuevo" si tiene menos de 5 segundos
      return Date.now() - error.timestamp < 5000;
    });
    
    newErrors.forEach(error => {
      let message = '';
      switch (error.type) {
        case PreloadErrorType.ANIMAL_MODULE:
          message = 'No se pudieron cargar los datos del módulo Animal. Algunas funciones podrían no estar disponibles.';
          break;
        case PreloadErrorType.USER_MODULE:
          message = 'No se pudieron cargar los datos del módulo Usuario. Algunas funciones podrían no estar disponibles.';
          break;
        case PreloadErrorType.NETWORK_ERROR:
          message = 'Error de conexión al cargar datos. Verifica tu conexión a internet.';
          break;
        default:
          message = 'Error al cargar datos. Inténtalo nuevamente.';
      }
      
      showToast(message, 'warning', 5000);
    });
  }, [state.errors, showNonCriticalErrors, isInitialized, showToast]);

  // Función para iniciar la precarga
  const startPreload = useCallback(async () => {
    // Evitar múltiples precargas simultáneas
    if (preloadPromiseRef.current) {
      console.log('[useDataPreload] La precarga ya está en curso, esperando...');
      return preloadPromiseRef.current;
    }

    // Solo iniciar si el usuario está autenticado
    if (!isAuthenticated) {
      console.log('[useDataPreload] Usuario no autenticado, omitiendo precarga');
      return;
    }

    console.log('[useDataPreload] Iniciando proceso de precarga...');
    
    preloadPromiseRef.current = (async () => {
      try {
        await dataPreloadService.preloadData();
        
        if (isMountedRef.current) {
          setIsInitialized(true);
          console.log('[useDataPreload] Precarga completada exitosamente');
        }
      } catch (error: any) {
        console.error('[useDataPreload] Error en la precarga:', error);
        
        // Si es un error crítico, mostrar toast
        if (error?.message?.includes('crítico')) {
          showToast(
            'Error crítico al cargar los datos del dashboard. La aplicación podría no funcionar correctamente.',
            'error',
            8000
          );
        }
        
        if (isMountedRef.current) {
          setIsInitialized(true); // Marcar como inicializado incluso con errores
        }
      } finally {
        preloadPromiseRef.current = null;
      }
    })();

    return preloadPromiseRef.current;
  }, [isAuthenticated, showToast]);

  // Función para reintentar la precarga
  const retryPreload = useCallback(async () => {
    console.log('[useDataPreload] Reintentando precarga...');
    await dataPreloadService.invalidateCache();
    await startPreload();
  }, [startPreload]);

  // Función para refrescar datos específicos
  const refreshDashboard = useCallback(async () => {
    console.log('[useDataPreload] Refrescando datos del dashboard...');
    dataPreloadService.invalidateModuleData('dashboard');
    
    // Si no hay una precarga en curso, iniciar una
    if (!state.isLoading) {
      await startPreload();
    }
  }, [state.isLoading, startPreload]);

  const refreshAnimalModule = useCallback(async () => {
    console.log('[useDataPreload] Refrescando datos del módulo Animal...');
    dataPreloadService.invalidateModuleData('animal');
    
    // Si no hay una precarga en curso, iniciar una
    if (!state.isLoading) {
      await startPreload();
    }
  }, [state.isLoading, startPreload]);

  const refreshUserModule = useCallback(async () => {
    console.log('[useDataPreload] Refrescando datos del módulo Usuario...');
    dataPreloadService.invalidateModuleData('user');
    
    // Si no hay una precarga en curso, iniciar una
    if (!state.isLoading) {
      await startPreload();
    }
  }, [state.isLoading, startPreload]);

  // Función para limpiar errores
  const clearErrors = useCallback(() => {
    // El servicio no tiene un método directo para limpiar errores,
    // pero podemos actualizar el estado local
    setState(prev => ({ ...prev, errors: [] }));
  }, []);

  // Función para invalidar caché
  const invalidateCache = useCallback((module?: 'dashboard' | 'animal' | 'user') => {
    if (module) {
      dataPreloadService.invalidateModuleData(module);
    } else {
      dataPreloadService.invalidateCache();
    }
  }, []);

  // Utilidades
  const getTimeSinceLastUpdate = useCallback(() => {
    return state.lastUpdate ? Date.now() - state.lastUpdate : null;
  }, [state.lastUpdate]);

  const isDataFresh = useCallback((maxAgeMs = 5 * 60 * 1000) => { // 5 minutos por defecto
    const lastUpdate = state.lastUpdate;
    if (!lastUpdate) return false;
    return Date.now() - lastUpdate < maxAgeMs;
  }, [state.lastUpdate]);

  // Efecto para iniciar precarga automáticamente
  useEffect(() => {
    if (!autoStart || !isAuthenticated) return;
    
    const startWithDelay = async () => {
      if (startDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, startDelay));
      }
      
      // Verificar si ya hay datos válidos en caché
      const hasValidCache = 
        dataPreloadService.getDashboardData() !== null ||
        dataPreloadService.getAnimalModuleData() !== null ||
        dataPreloadService.getUserModuleData() !== null;
      
      if (forceRefresh || !hasValidCache) {
        await startPreload();
      } else {
        // Si hay datos en caché, considerar como inicializado
        setIsInitialized(true);
        console.log('[useDataPreload] Usando datos en caché, precarga omitida');
      }
    };
    
    startWithDelay();
  }, [autoStart, isAuthenticated, forceRefresh, startDelay, startPreload]);

  // Efecto de limpieza
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Obtener datos actuales desde el servicio
  const dashboardData = dataPreloadService.getDashboardData();
  const animalModuleData = dataPreloadService.getAnimalModuleData();
  const userModuleData = dataPreloadService.getUserModuleData();
  
  const hasCriticalErrors = state.errors.some(error => error.critical);

  return {
    // Estado general
    isLoading: state.isLoading,
    isInitialized,
    
    // Estado de carga por módulo
    dashboardLoaded: state.dashboardLoaded,
    animalModuleLoaded: state.animalModuleLoaded,
    userModuleLoaded: state.userModuleLoaded,
    
    // Datos
    dashboardData,
    animalModuleData,
    userModuleData,
    
    // Errores
    errors: state.errors,
    hasCriticalErrors,
    
    // Acciones
    startPreload,
    retryPreload,
    refreshDashboard,
    refreshAnimalModule,
    refreshUserModule,
    clearErrors,
    invalidateCache,
    
    // Utilidades
    getTimeSinceLastUpdate,
    isDataFresh
  };
}

export default useDataPreload;