import React, { useEffect } from 'react';
import { OptimizedDashboardProvider, useOptimizedDashboard, OptimizedDashboard } from '@/components/dashboard/OptimizedDashboard';
import { PreloadIndicators, FloatingStatusIndicator, NavbarStatusIndicator } from '@/components/dashboard/PreloadIndicators';
import StatisticsCard from '@/components/dashboard/Cards';
import { StatisticsCardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { AppStateStatus } from '@/context/AppStateContext';

/**
 * Componente de ejemplo que muestra cómo implementar la estrategia de precarga
 * Este es un ejemplo completo que demuestra todas las características
 */

// Componente de ejemplo para el contenido del dashboard
const DashboardContent: React.FC = () => {
  const { 
    isLoading, 
    isReady, 
    hasErrors, 
    hasCriticalErrors, 
    dashboardData,
    refresh,
    retry,
    isDataFresh,
    getTimeSinceLastUpdate
  } = useOptimizedDashboard();

  // Simular actualización periódica de datos
  useEffect(() => {
    if (!isReady) return;
    
    const interval = setInterval(() => {
      // Verificar si los datos están desactualizados (más de 5 minutos)
      if (!isDataFresh(5 * 60 * 1000)) {
        console.log('[DashboardExample] Datos desactualizados, refrescando...');
        refresh();
      }
    }, 60000); // Verificar cada minuto

    return () => clearInterval(interval);
  }, [isReady, isDataFresh, refresh]);

  // Si hay errores críticos, mostrar mensaje de error
  if (hasCriticalErrors) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">
            Error crítico en el dashboard
          </h2>
          <p className="text-gray-600 mb-4">
            No se pueden mostrar los datos debido a errores críticos.
          </p>
          <button
            onClick={retry}
            className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // Mostrar skeleton mientras carga el contenido principal
  if (isLoading || !dashboardData) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <StatisticsCardSkeleton key={index} />
          ))}
        </div>
        
        {/* Indicador de carga detallado */}
        <div className="mt-8">
          <PreloadIndicators
            status={AppStateStatus.LOADING_DASHBOARD}
            moduleProgress={{
              dashboard: false,
              animal: false,
              user: false
            }}
            isOnline={navigator.onLine}
            variant="compact"
          />
        </div>
      </div>
    );
  }

  // Contenido principal del dashboard
  return (
    <div className="space-y-6">
      {/* Header con información de estado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Dashboard Principal
          </h1>
          <p className="text-gray-600">
            Última actualización: {getTimeSinceLastUpdate() ? 
              `Hace ${Math.floor(getTimeSinceLastUpdate()! / 1000)}s` : 
              'Nunca'
            }
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Indicador de estado en la barra de navegación */}
          <NavbarStatusIndicator
            status={isReady ? AppStateStatus.READY : AppStateStatus.LOADING_DASHBOARD}
            isOnline={navigator.onLine}
          />
          
          {/* Botón de refresco manual */}
          <button
            onClick={refresh}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Tarjetas de estadísticas usando los datos precargados */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatisticsCard
          title="Animales Registrados"
          description="Total de animales en el sistema"
          value={dashboardData.counts.animalsRegistered}
          color="bg-blue-600"
        />
        <StatisticsCard
          title="Usuarios Activos"
          description="Usuarios con sesión activa"
          value={dashboardData.counts.usersActive}
          color="bg-green-600"
        />
        <StatisticsCard
          title="Tratamientos Activos"
          description="Tratamientos en curso"
          value={dashboardData.counts.activeTreatments}
          color="bg-yellow-600"
        />
        <StatisticsCard
          title="Tareas Pendientes"
          description="Tareas por completar"
          value={dashboardData.counts.pendingTasks}
          color="bg-red-600"
        />
      </div>

      {/* Sección de estadísticas adicionales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Estadísticas del Sistema</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total de usuarios:</span>
              <span className="font-medium">{dashboardData.counts.usersRegistered}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Vacunaciones aplicadas:</span>
              <span className="font-medium">{dashboardData.counts.vaccinationsApplied}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Controles realizados:</span>
              <span className="font-medium">{dashboardData.counts.controlsPerformed}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Campos registrados:</span>
              <span className="font-medium">{dashboardData.counts.fieldsRegistered}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Inventario</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Vacunas disponibles:</span>
              <span className="font-medium">{dashboardData.counts.vaccinesCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Medicamentos:</span>
              <span className="font-medium">{dashboardData.counts.medicationsCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Enfermedades registradas:</span>
              <span className="font-medium">{dashboardData.counts.diseasesCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tipos de alimento:</span>
              <span className="font-medium">{dashboardData.counts.foodTypesCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Indicador de estado flotante */}
      <FloatingStatusIndicator
        status={isReady ? AppStateStatus.READY : AppStateStatus.LOADING_DASHBOARD}
        moduleProgress={{
          dashboard: true,
          animal: false, // Estos vendrían del estado real
          user: false
        }}
        isOnline={navigator.onLine}
        onClick={() => {
          // Mostrar detalles del estado al hacer clic
          console.log('Mostrar detalles del estado');
        }}
      />
    </div>
  );
};

// Componente principal que envuelve todo con el provider
export const PreloadImplementationExample: React.FC = () => {
  return (
    <OptimizedDashboardProvider autoStart={true}>
      <div className="min-h-screen bg-gray-50">
        {/* Barra de navegación con indicador de estado */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-semibold text-gray-900">
                  Sistema de Gestión Agrícola
                </h1>
              </div>
              
              <div className="flex items-center space-x-4">
                <NavbarStatusIndicator
                  status={AppStateStatus.READY} // Esto vendría del estado real
                  isOnline={navigator.onLine}
                />
              </div>
            </div>
          </div>
        </header>

        {/* Contenido principal */}
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            {/* Indicador de carga detallado */}
            <div className="mb-6">
              <PreloadIndicators
                status={AppStateStatus.READY} // Esto vendría del estado real
                moduleProgress={{
                  dashboard: true,
                  animal: false, // Estos vendrían del estado real
                  user: false
                }}
                isOnline={navigator.onLine}
                variant="compact"
              />
            </div>

            {/* Contenido del dashboard */}
            <DashboardContent />
          </div>
        </main>
      </div>
    </OptimizedDashboardProvider>
  );
};

/**
 * Componente simplificado para mostrar cómo integrar la estrategia de precarga
 * en un componente existente sin modificar toda la estructura
 */
export const SimplePreloadIntegration: React.FC = () => {
  return (
    <OptimizedDashboardProvider>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Dashboard con Precarga Optimizada</h1>
        
        {/* El contenido existente se envuelve con OptimizedDashboard */}
        <OptimizedDashboard>
          {/* Aquí va el contenido existente del dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Tarjetas existentes */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium mb-2">Animales</h3>
              <p className="text-3xl font-bold text-blue-600">0</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium mb-2">Usuarios</h3>
              <p className="text-3xl font-bold text-green-600">0</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium mb-2">Tratamientos</h3>
              <p className="text-3xl font-bold text-yellow-600">0</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium mb-2">Tareas</h3>
              <p className="text-3xl font-bold text-red-600">0</p>
            </div>
          </div>
          
          {/* Más contenido existente... */}
          <div className="mt-8 bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Contenido Adicional</h2>
            <p className="text-gray-600">
              Este es un ejemplo de cómo integrar la estrategia de precarga en un componente existente.
              El OptimizedDashboard se encargará de mostrar los skeletons durante la carga y manejar los errores.
            </p>
          </div>
        </OptimizedDashboard>
      </div>
    </OptimizedDashboardProvider>
  );
};

/**
 * Hook personalizado para facilitar el acceso a los datos del dashboard
 * con la estrategia de precarga implementada
 */
export const useDashboardData = () => {
  const { dashboardData, isLoading, isReady, hasErrors } = useOptimizedDashboard();
  
  return {
    // Datos del dashboard
    counts: dashboardData?.counts || {},
    
    // Estado de carga
    isLoading,
    isReady,
    hasErrors,
    
    // Utilidades
    hasData: !!dashboardData,
    dataAge: dashboardData?.timestamp ? Date.now() - dashboardData.timestamp : null
  };
};

export default PreloadImplementationExample;