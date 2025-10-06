import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Componente Skeleton para las tarjetas de estadísticas del dashboard
 * Muestra una estructura similar a StatisticsCard pero con animación de carga
 */
export const StatisticsCardSkeleton: React.FC = () => {
  return (
    <div className="w-full max-w-full sm:max-w-sm h-36 sm:h-40 md:h-44 lg:h-48 bg-slate-900 rounded-lg overflow-hidden">
      <div className="flex flex-col h-full p-4 sm:p-5">
        {/* Header skeleton */}
        <div className="flex flex-col items-start gap-1 sm:gap-1.5 mb-4">
          <Skeleton className="h-5 w-32 bg-slate-700" />
          <Skeleton className="h-3 w-48 bg-slate-700" />
        </div>
        
        {/* Content skeleton */}
        <div className="flex-1 flex items-center justify-between">
          <Skeleton className="h-10 w-20 bg-slate-700" />
          <Skeleton className="h-8 w-8 rounded-full bg-slate-700" />
        </div>
      </div>
    </div>
  );
};

/**
 * Componente Skeleton para una fila de estadísticas del dashboard
 * Muestra múltiples tarjetas en una fila con animación de carga
 */
export const StatisticsRowSkeleton: React.FC<{ cardCount?: number }> = ({ cardCount = 4 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
      {Array.from({ length: cardCount }).map((_, index) => (
        <StatisticsCardSkeleton key={index} />
      ))}
    </div>
  );
};

/**
 * Componente Skeleton para la sección de gráficos del dashboard
 */
export const ChartSkeleton: React.FC = () => {
  return (
    <div className="w-full h-64 bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-6 w-48 bg-gray-200" />
        <Skeleton className="h-8 w-24 bg-gray-200" />
      </div>
      
      {/* Chart area skeleton */}
      <div className="h-48 flex items-end justify-between">
        {Array.from({ length: 12 }).map((_, index) => (
          <div key={index} className="flex flex-col items-center flex-1">
            <Skeleton 
              className="w-full bg-gray-200 mb-2" 
            />
            <Skeleton className="h-3 w-8 bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Componente Skeleton para la tabla de datos del dashboard
 */
export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({ 
  rows = 5, 
  columns = 4 
}) => {
  return (
    <div className="w-full bg-white rounded-lg shadow-md overflow-hidden mb-6">
      {/* Table header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48 bg-gray-200" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-24 bg-gray-200" />
            <Skeleton className="h-8 w-8 bg-gray-200" />
          </div>
        </div>
      </div>
      
      {/* Table content */}
      <div className="divide-y divide-gray-200">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <Skeleton 
                  key={colIndex} 
                  className={`h-4 bg-gray-200 ${
                    colIndex === 0 ? 'w-full' : 
                    colIndex === 1 ? 'w-3/4' : 
                    colIndex === 2 ? 'w-1/2' : 'w-2/3'
                  }`} 
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Componente Skeleton para el layout principal del dashboard
 * Combina múltiples elementos para simular la estructura completa del dashboard
 */
export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header skeleton */}
      <div className="mb-8">
        <Skeleton className="h-8 w-64 bg-gray-200 mb-2" />
        <Skeleton className="h-4 w-96 bg-gray-200" />
      </div>
      
      {/* Statistics cards skeleton */}
      <StatisticsRowSkeleton cardCount={4} />
      
      {/* Charts and tables grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartSkeleton />
        <TableSkeleton rows={4} columns={3} />
      </div>
      
      {/* Additional content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TableSkeleton rows={6} columns={5} />
        </div>
        <div className="space-y-4">
          {/* Activity feed skeleton */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <Skeleton className="h-6 w-32 bg-gray-200 mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <Skeleton className="h-8 w-8 rounded-full bg-gray-200" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-full bg-gray-200 mb-1" />
                    <Skeleton className="h-3 w-24 bg-gray-200" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Quick actions skeleton */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <Skeleton className="h-6 w-32 bg-gray-200 mb-4" />
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full bg-gray-200" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Componente Skeleton para el estado de carga inicial
 * Muestra una pantalla completa con mensaje de carga
 */
export const InitialLoadingSkeleton: React.FC<{ message?: string }> = ({ 
  message = 'Cargando datos del dashboard...' 
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-8">
      <div className="w-full max-w-4xl space-y-8">
        {/* Logo o icono */}
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center">
            <svg 
              className="w-8 h-8 text-white animate-pulse" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" 
              />
            </svg>
          </div>
        </div>
        
        {/* Mensaje de carga */}
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-semibold text-gray-800">
            {message}
          </h1>
          <p className="text-gray-600 max-w-md mx-auto">
            Estamos preparando tu dashboard con la información más reciente. Esto solo tomará unos segundos.
          </p>
        </div>
        
        {/* Indicadores de progreso */}
        <div className="space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-3 h-3 bg-green-600 rounded-full animate-pulse"></div>
            <div className="w-3 h-3 bg-green-600 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-3 h-3 bg-green-600 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
          </div>
          
          {/* Barra de progreso */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-green-600 h-2 rounded-full animate-pulse" style={{ width: '70%' }}></div>
          </div>
        </div>
        
        {/* Mini preview del dashboard */}
        <div className="mt-8 opacity-50">
          <DashboardSkeleton />
        </div>
      </div>
    </div>
  );
};

/**
 * Componente Skeleton para errores críticos
 * Muestra una pantalla de error cuando falla la carga de datos críticos
 */
export const CriticalErrorSkeleton: React.FC<{ 
  message?: string; 
  onRetry?: () => void 
}> = ({ 
  message = 'Error crítico al cargar los datos del dashboard', 
  onRetry 
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-orange-50 p-8">
      <div className="w-full max-w-md space-y-6 text-center">
        {/* Icono de error */}
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
            <svg 
              className="w-8 h-8 text-white" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" 
              />
            </svg>
          </div>
        </div>
        
        {/* Mensaje de error */}
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-gray-800">
            Error crítico
          </h1>
          <p className="text-gray-600">
            {message}
          </p>
          <p className="text-sm text-gray-500">
            La aplicación no puede continuar sin estos datos. Por favor, inténtalo nuevamente.
          </p>
        </div>
        
        {/* Botón de reintentar */}
        {onRetry && (
          <button
            onClick={onRetry}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Reintentar
          </button>
        )}
        
        {/* Información adicional */}
        <div className="text-xs text-gray-500">
          Si el problema persiste, contacta al administrador del sistema.
        </div>
      </div>
    </div>
  );
};

export default DashboardSkeleton;