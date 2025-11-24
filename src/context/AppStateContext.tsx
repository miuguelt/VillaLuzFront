import React, { createContext, useContext, useReducer, useEffect, useRef, useCallback, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from './ToastContext';
import dataPreloadService, { 
  DashboardCriticalData, 
  AnimalModuleData, 
  UserModuleData,
  PreloadError,
  PreloadErrorType 
} from '@/services/dataPreloadService';

/**
 * Estados de la aplicación
 */
export enum AppStateStatus {
  INITIALIZING = 'INITIALIZING',
  LOADING_DASHBOARD = 'LOADING_DASHBOARD',
  DASHBOARD_READY = 'DASHBOARD_READY',
  LOADING_MODULES = 'LOADING_MODULES',
  READY = 'READY',
  ERROR = 'ERROR',
  OFFLINE = 'OFFLINE'
}

/**
 * Interfaz para el estado global de la aplicación
 */
export interface AppState {
  // Estado general
  status: AppStateStatus;
  isOnline: boolean;
  
  // Datos de la aplicación
  dashboardData: DashboardCriticalData | null;
  animalModuleData: AnimalModuleData | null;
  userModuleData: UserModuleData | null;
  
  // Estado de carga
  isLoading: boolean;
  dashboardLoaded: boolean;
  animalModuleLoaded: boolean;
  userModuleLoaded: boolean;
  
  // Errores
  errors: PreloadError[];
  hasCriticalErrors: boolean;
  
  // Metadatos
  lastUpdate: number | null;
  sessionId: string;
}

/**
 * Acciones disponibles para el estado de la aplicación
 */
export type AppStateAction =
  | { type: 'SET_STATUS'; payload: AppStateStatus }
  | { type: 'SET_ONLINE_STATUS'; payload: boolean }
  | { type: 'SET_DASHBOARD_DATA'; payload: DashboardCriticalData }
  | { type: 'SET_ANIMAL_MODULE_DATA'; payload: AnimalModuleData }
  | { type: 'SET_USER_MODULE_DATA'; payload: UserModuleData }
  | { type: 'SET_LOADING_STATE'; payload: { isLoading: boolean } }
  | { type: 'SET_MODULE_LOADED'; payload: { module: 'dashboard' | 'animal' | 'user'; loaded: boolean } }
  | { type: 'ADD_ERROR'; payload: PreloadError }
  | { type: 'CLEAR_ERRORS' }
  | { type: 'CLEAR_NON_CRITICAL_ERRORS' }
  | { type: 'INVALIDATE_CACHE'; payload?: { module?: 'dashboard' | 'animal' | 'user' } }
  | { type: 'RESET_STATE' }
  | { type: 'UPDATE_LAST_UPDATE' };

/**
 * Estado inicial de la aplicación
 */
const initialState: AppState = {
  status: AppStateStatus.INITIALIZING,
  isOnline: navigator.onLine,
  dashboardData: null,
  animalModuleData: null,
  userModuleData: null,
  isLoading: false,
  dashboardLoaded: false,
  animalModuleLoaded: false,
  userModuleLoaded: false,
  errors: [],
  hasCriticalErrors: false,
  lastUpdate: null,
  sessionId: generateSessionId()
};

/**
 * Genera un ID de sesión único
 */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Reducer para gestionar el estado de la aplicación
 */
function appStateReducer(state: AppState, action: AppStateAction): AppState {
  switch (action.type) {
    case 'SET_STATUS':
      return {
        ...state,
        status: action.payload
      };

    case 'SET_ONLINE_STATUS':
      return {
        ...state,
        isOnline: action.payload,
        status: action.payload 
          ? (state.hasCriticalErrors ? AppStateStatus.ERROR : AppStateStatus.READY)
          : AppStateStatus.OFFLINE
      };

    case 'SET_DASHBOARD_DATA':
      return {
        ...state,
        dashboardData: action.payload,
        dashboardLoaded: true,
        lastUpdate: Date.now()
      };

    case 'SET_ANIMAL_MODULE_DATA':
      return {
        ...state,
        animalModuleData: action.payload,
        animalModuleLoaded: true,
        lastUpdate: Date.now()
      };

    case 'SET_USER_MODULE_DATA':
      return {
        ...state,
        userModuleData: action.payload,
        userModuleLoaded: true,
        lastUpdate: Date.now()
      };

    case 'SET_LOADING_STATE':
      return {
        ...state,
        isLoading: action.payload.isLoading
      };

    case 'SET_MODULE_LOADED': {
      const { module: moduleKey, loaded } = action.payload;
      return {
        ...state,
        [`${moduleKey}Loaded`]: loaded
      };
    }

    case 'ADD_ERROR':
      {
        const newErrors = [...state.errors, action.payload];
        const hasCriticalErrors = newErrors.some(error => error.critical);
        return {
          ...state,
          errors: newErrors,
          hasCriticalErrors,
          status: hasCriticalErrors ? AppStateStatus.ERROR : state.status
        };
      }

    case 'CLEAR_ERRORS':
      return {
        ...state,
        errors: [],
        hasCriticalErrors: false,
        status: state.dashboardLoaded ? AppStateStatus.READY : AppStateStatus.INITIALIZING
      };

    case 'CLEAR_NON_CRITICAL_ERRORS':
      {
        const criticalErrors = state.errors.filter(error => error.critical);
        return {
          ...state,
          errors: criticalErrors,
          hasCriticalErrors: criticalErrors.length > 0
        };
      }

    case 'INVALIDATE_CACHE': {
      {
        const moduleKey = action.payload?.module;
        if (moduleKey) {
          return {
            ...state,
            [`${moduleKey}Data`]: null,
            [`${moduleKey}Loaded`]: false
          };
        } else {
          return {
            ...state,
            dashboardData: null,
            animalModuleData: null,
            userModuleData: null,
            dashboardLoaded: false,
            animalModuleLoaded: false,
            userModuleLoaded: false,
            status: AppStateStatus.INITIALIZING
          };
        }
      }
    }

    case 'RESET_STATE':
      return {
        ...initialState,
        sessionId: generateSessionId()
      };

    case 'UPDATE_LAST_UPDATE':
      return {
        ...state,
        lastUpdate: Date.now()
      };

    default:
      return state;
  }
}

/**
 * Contexto para el estado global de la aplicación
 */
const AppStateContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppStateAction>;
  // Acciones convenientes
  startPreload: () => Promise<void>;
  retryPreload: () => Promise<void>;
  refreshDashboard: () => Promise<void>;
  refreshAnimalModule: () => Promise<void>;
  refreshUserModule: () => Promise<void>;
  clearErrors: () => void;
  clearNonCriticalErrors: () => void;
  invalidateCache: (module?: 'dashboard' | 'animal' | 'user') => void;
  isDataFresh: (maxAgeMs?: number) => boolean;
} | null>(null);

/**
 * Props para el provider del estado de la aplicación
 */
interface AppStateProviderProps {
  children: ReactNode;
  /**
   * Iniciar precarga automáticamente cuando el usuario está autenticado
   */
  autoStart?: boolean;
}

/**
 * Provider para el estado global de la aplicación
 * 
 * Características:
 * - Gestión centralizada del estado de la aplicación
 * - Integración con el servicio de precarga de datos
 * - Sincronización con el estado de autenticación
 * - Manejo automático de errores y estados de conexión
 */
export const AppStateProvider: React.FC<AppStateProviderProps> = ({
  children,
  autoStart = true
}) => {
  const [state, dispatch] = useReducer(appStateReducer, initialState);
  const { isAuthenticated, user: _user } = useAuth();
  const { showToast } = useToast();
  const preloadPromiseRef = useRef<Promise<void> | null>(null);

  // Sincronizar con el servicio de precarga
  useEffect(() => {
    const unsubscribe = dataPreloadService.onStateChange((serviceState) => {
      // Actualizar estado local basado en el estado del servicio
      dispatch({ type: 'SET_LOADING_STATE', payload: { isLoading: serviceState.isLoading } });
      dispatch({ type: 'SET_MODULE_LOADED', payload: { module: 'dashboard', loaded: serviceState.dashboardLoaded } });
      dispatch({ type: 'SET_MODULE_LOADED', payload: { module: 'animal', loaded: serviceState.animalModuleLoaded } });
      dispatch({ type: 'SET_MODULE_LOADED', payload: { module: 'user', loaded: serviceState.userModuleLoaded } });
      
      // Actualizar datos desde caché del servicio
      const dashboardData = dataPreloadService.getDashboardData();
      const animalModuleData = dataPreloadService.getAnimalModuleData();
      const userModuleData = dataPreloadService.getUserModuleData();
      
      if (dashboardData) {
        dispatch({ type: 'SET_DASHBOARD_DATA', payload: dashboardData });
      }
      if (animalModuleData) {
        dispatch({ type: 'SET_ANIMAL_MODULE_DATA', payload: animalModuleData });
      }
      if (userModuleData) {
        dispatch({ type: 'SET_USER_MODULE_DATA', payload: userModuleData });
      }
      
      // Actualizar errores
      serviceState.errors.forEach(error => {
        dispatch({ type: 'ADD_ERROR', payload: error });
      });
      
      // Actualizar estado general
      if (serviceState.isLoading) {
        if (serviceState.dashboardLoaded) {
          dispatch({ type: 'SET_STATUS', payload: AppStateStatus.LOADING_MODULES });
        } else {
          dispatch({ type: 'SET_STATUS', payload: AppStateStatus.LOADING_DASHBOARD });
        }
      } else if (serviceState.dashboardLoaded && !state.hasCriticalErrors) {
        dispatch({ type: 'SET_STATUS', payload: AppStateStatus.READY });
      } else if (state.hasCriticalErrors) {
        dispatch({ type: 'SET_STATUS', payload: AppStateStatus.ERROR });
      }
    });

    return unsubscribe;
  }, [state.hasCriticalErrors]);

  // Función para iniciar la precarga
  const startPreload = useCallback(async () => {
    if (preloadPromiseRef.current) {
      return preloadPromiseRef.current;
    }

    if (!isAuthenticated) {
      console.warn('[AppStateProvider] Usuario no autenticado, omitiendo precarga');
      return;
    }

    console.log('[AppStateProvider] Iniciando precarga de datos...');
    dispatch({ type: 'SET_STATUS', payload: AppStateStatus.LOADING_DASHBOARD });

    preloadPromiseRef.current = (async () => {
      try {
        await dataPreloadService.preloadData();
        dispatch({ type: 'SET_STATUS', payload: AppStateStatus.READY });
        console.log('[AppStateProvider] Precarga completada exitosamente');
      } catch (error: any) {
        console.error('[AppStateProvider] Error en la precarga:', error);
        
        // Añadir error al estado
        dispatch({
          type: 'ADD_ERROR',
          payload: {
            type: PreloadErrorType.DASHBOARD_CRITICAL,
            message: error?.message || 'Error crítico en la precarga',
            critical: true,
            timestamp: Date.now(),
            context: error
          }
        });
        
        dispatch({ type: 'SET_STATUS', payload: AppStateStatus.ERROR });
        
        showToast(
          'Error crítico al cargar los datos. La aplicación podría no funcionar correctamente.',
          'error',
          8000
        );
      } finally {
        preloadPromiseRef.current = null;
      }
    })();

    return preloadPromiseRef.current;
  }, [isAuthenticated, showToast]);

  // Manejar cambios en el estado de autenticación
  useEffect(() => {
    if (isAuthenticated) {
      dispatch({ type: 'SET_STATUS', payload: AppStateStatus.INITIALIZING });
      
      if (autoStart) {
        // Pequeño retraso para asegurar que todo esté inicializado
        setTimeout(() => {
          startPreload();
        }, 100);
      }
    } else {
      // Limpiar estado cuando el usuario no está autenticado
      dispatch({ type: 'RESET_STATE' });
    }
  }, [isAuthenticated, autoStart, startPreload]);

  // Manejar cambios en el estado de conexión
  useEffect(() => {
    const handleOnline = () => {
      dispatch({ type: 'SET_ONLINE_STATUS', payload: true });
      showToast('Conexión restablecida', 'success');
      
      // Reintentar precarga automáticamente al recuperar conexión
      if (isAuthenticated && state.dashboardLoaded) {
        startPreload();
      }
    };

    const handleOffline = () => {
      dispatch({ type: 'SET_ONLINE_STATUS', payload: false });
      showToast('Sin conexión a internet', 'warning');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isAuthenticated, state.dashboardLoaded, showToast, startPreload]);

  // Función para reintentar la precarga
  const retryPreload = async () => {
    console.log('[AppStateProvider] Reintentando precarga...');
    dispatch({ type: 'CLEAR_ERRORS' });
    dataPreloadService.invalidateCache();
    await startPreload();
  };

  // Funciones para refrescar módulos específicos
  const refreshDashboard = async () => {
    console.log('[AppStateProvider] Refrescando dashboard...');
    dataPreloadService.invalidateModuleData('dashboard');
    
    if (!state.isLoading) {
      await startPreload();
    }
  };

  const refreshAnimalModule = async () => {
    console.log('[AppStateProvider] Refrescando módulo Animal...');
    dataPreloadService.invalidateModuleData('animal');
    
    if (!state.isLoading) {
      await startPreload();
    }
  };

  const refreshUserModule = async () => {
    console.log('[AppStateProvider] Refrescando módulo Usuario...');
    dataPreloadService.invalidateModuleData('user');
    
    if (!state.isLoading) {
      await startPreload();
    }
  };

  // Funciones para manejar errores
  const clearErrors = () => {
    dispatch({ type: 'CLEAR_ERRORS' });
  };

  const clearNonCriticalErrors = () => {
    dispatch({ type: 'CLEAR_NON_CRITICAL_ERRORS' });
  };

  // Función para invalidar caché
  const invalidateCache = (module?: 'dashboard' | 'animal' | 'user') => {
    dispatch({ type: 'INVALIDATE_CACHE', payload: { module } });
    if (module) {
      dataPreloadService.invalidateModuleData(module);
    } else {
      dataPreloadService.invalidateCache();
    }
  };

  // Utilidad para verificar si los datos están frescos
  const isDataFresh = (maxAgeMs = 5 * 60 * 1000) => { // 5 minutos por defecto
    if (!state.lastUpdate) return false;
    return Date.now() - state.lastUpdate < maxAgeMs;
  };

  const value = {
    state,
    dispatch,
    startPreload,
    retryPreload,
    refreshDashboard,
    refreshAnimalModule,
    refreshUserModule,
    clearErrors,
    clearNonCriticalErrors,
    invalidateCache,
    isDataFresh
  };

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
};

/**
 * Hook para acceder al estado global de la aplicación
 */
export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (context === null) {
    throw new Error('useAppState debe ser usado dentro de un AppStateProvider');
  }
  return context;
};

export default AppStateContext;
