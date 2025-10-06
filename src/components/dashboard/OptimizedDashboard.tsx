import React, { useEffect, useState } from 'react';
import { useAppState, AppStateProvider } from '@/context/AppStateContext';
import { useAuth } from '@/hooks/useAuth';
import { 
  DashboardSkeleton, 
  InitialLoadingSkeleton, 
  CriticalErrorSkeleton 
} from './DashboardSkeleton';
import { 
  PreloadErrorHandler, 
  NonCriticalErrorBanner,
  CriticalErrorDisplay 
} from './PreloadErrorHandler';
import { AppStateStatus } from '@/context/AppStateContext';

/**
 * Props para el componente OptimizedDashboard
 */
interface OptimizedDashboardProps {
  /**
   * Componente a renderizar cuando los datos del dashboard están listos
   */
  children: React.ReactNode;
  /**
   * Mensaje personalizado para la pantalla de carga inicial
   */
  loadingMessage?: string;
  /**
   * Si es true, muestra errores no críticos en un banner
   */
  showNonCriticalErrors?: boolean;
}

/**
 * Componente optimizado para el dashboard con estrategia de precarga integrada
 * 
 * Características principales:
 * - Prioridad absoluta a los datos críticos del dashboard
 * - Muestra skeleton screens específicos durante la carga
 * - Manejo granular de errores según criticidad
 * - Precarga no bloqueante de módulos secundarios
 * - Indicadores de estado específicos para cada etapa
 */
export const OptimizedDashboard: React.FC<OptimizedDashboardProps> = ({
  children,
  loadingMessage = 'Cargando datos del dashboard...',
  showNonCriticalErrors = true
}) => {
  const { 
    state, 
    retryPreload, 
    clearErrors, 
    clearNonCriticalErrors,
    refreshDashboard,
    isDataFresh
  } = useAppState();
  const { user, isAuthenticated } = useAuth();
  const [showNonCriticalBanner, setShowNonCriticalBanner] = useState(true);

  // Efecto para manejar errores no críticos
  useEffect(() => {
    const hasNonCriticalErrors = state.errors.some(error => !error.critical);
    
    if (hasNonCriticalErrors && showNonCriticalErrors) {
      // Auto-ocultar banner después de 10 segundos
      const timer = setTimeout(() => {
        setShowNonCriticalBanner(false);
      }, 10000);
      
      return () => clearTimeout(timer);
    }
  }, [state.errors, showNonCriticalErrors]);

  // Si el usuario no está autenticado, no mostrar nada (el AuthProvider se encargará de la redirección)
  if (!isAuthenticated) {
    return null;
  }

  // ESTADO 1: Inicializando - Mostrar pantalla de carga inicial
  if (state.status === AppStateStatus.INITIALIZING) {
    return <InitialLoadingSkeleton message={loadingMessage} />;
  }

  // ESTADO 2: Cargando datos críticos del dashboard - Mostrar skeleton específico
  if (state.status === AppStateStatus.LOADING_DASHBOARD) {
    return (
      <div className="w-full h-full">
        <DashboardSkeleton />
      </div>
    );
  }

  // ESTADO 3: Error crítico - Mostrar pantalla de error con opción de reintentar
  if (state.status === AppStateStatus.ERROR && state.hasCriticalErrors) {
    return (
      <div className="w-full h-full flex items-center justify-center p-8">
        <CriticalErrorDisplay
          errors={state.errors}
          onRetry={retryPreload}
        />
      </div>
    );
  }

  // ESTADO 4: Offline - Mostrar mensaje de conexión perdida
  if (state.status === AppStateStatus.OFFLINE) {
    return (
      <div className="w-full h-full flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-800 mb-2">
            Sin conexión a internet
          </h1>
          <p className="text-gray-600 mb-4">
            Verifica tu conexión y los datos se recargarán automáticamente.
          </p>
          <button
            onClick={retryPreload}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // ESTADO 5: Dashboard listo con datos críticos - Renderizar contenido principal
  return (
    <div className="w-full h-full">
      {/* Banner para errores no críticos */}
      {showNonCriticalErrors && 
       state.errors.some(error => !error.critical) && 
       showNonCriticalBanner && (
        <NonCriticalErrorBanner
          errors={state.errors}
          onRetry={retryPreload}
          onDismiss={() => {
            setShowNonCriticalBanner(false);
            clearNonCriticalErrors();
          }}
        />
      )}

      {/* Indicador de estado de carga de módulos secundarios */}
      {state.status === AppStateStatus.LOADING_MODULES && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            <div className="flex-1">
              <p className="text-sm text-blue-700">
                Cargando módulos adicionales...
              </p>
              <div className="flex items-center space-x-4 mt-1">
                <span className={`text-xs ${state.animalModuleLoaded ? 'text-green-600' : 'text-gray-500'}`}>
                  {state.animalModuleLoaded ? '✓ Animales' : '○ Animales'}
                </span>
                <span className={`text-xs ${state.userModuleLoaded ? 'text-green-600' : 'text-gray-500'}`}>
                  {state.userModuleLoaded ? '✓ Usuarios' : '○ Usuarios'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Indicador de datos desactualizados */}
      {state.status === AppStateStatus.READY && !isDataFresh() && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm text-yellow-700">
                Los datos pueden estar desactualizados.
              </p>
            </div>
            <button
              onClick={refreshDashboard}
              className="text-yellow-700 hover:text-yellow-900 text-sm underline ml-4"
            >
              Actualizar
            </button>
          </div>
        </div>
      )}

      {/* Contenido principal del dashboard */}
      <div className="relative">
        {/* Overlay de carga para módulos secundarios (no bloqueante) */}
        {state.status === AppStateStatus.LOADING_MODULES && (
          <div className="absolute inset-0 bg-white bg-opacity-50 z-10 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">
                Cargando módulos adicionales...
              </p>
            </div>
          </div>
        )}
        
        {/* Renderizar children solo cuando los datos críticos están listos */}
        {state.dashboardLoaded && children}
      </div>

      {/* Panel de errores detallado (colapsable) */}
      {state.errors.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 max-w-md">
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-900">
                Problemas detectados ({state.errors.length})
              </h3>
              <button
                onClick={clearErrors}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <PreloadErrorHandler
              errors={state.errors}
              onRetry={retryPreload}
              onClearErrors={clearErrors}
              className="max-h-60 overflow-y-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Componente wrapper que integra el OptimizedDashboard con el AppStateProvider
 * Útil para envolver toda la aplicación o secciones específicas
 */
export const OptimizedDashboardProvider: React.FC<{
  children: React.ReactNode;
  autoStart?: boolean;
}> = ({ 
  children, 
  autoStart = true
}) => {
  return (
    <AppStateProvider autoStart={autoStart}>
      <OptimizedDashboard>
        {children}
      </OptimizedDashboard>
    </AppStateProvider>
  );
};

/**
 * Hook personalizado para facilitar el uso del OptimizedDashboard
 * Proporciona acceso al estado y acciones comunes
 */
export const useOptimizedDashboard = () => {
  const appState = useAppState();
  const auth = useAuth();
  
  return {
    // Estado
    isLoading: appState.state.isLoading,
    isReady: appState.state.status === AppStateStatus.READY,
    hasErrors: appState.state.errors.length > 0,
    hasCriticalErrors: appState.state.hasCriticalErrors,
    dashboardData: appState.state.dashboardData,
    
    // Acciones
    refresh: appState.refreshDashboard,
    retry: appState.retryPreload,
    clearErrors: appState.clearErrors,
    
    // Utilidades
    isDataFresh: appState.isDataFresh,
    getTimeSinceLastUpdate: () => 
      appState.state.lastUpdate ? Date.now() - appState.state.lastUpdate : null
  };
};

export default OptimizedDashboard;