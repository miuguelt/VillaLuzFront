import React, { useState } from 'react';
import { AlertTriangle, RefreshCw, WifiOff, Shield, Database, Info } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
import { Collapsible, CollapsibleContent } from '@/shared/ui/collapsible';
import { PreloadError, PreloadErrorType } from '@/features/dashboard/api/dataPreload.service';

/**
 * Props para el componente de manejo de errores de precarga
 */
interface PreloadErrorHandlerProps {
  /**
   * Lista de errores a mostrar
   */
  errors: PreloadError[];
  /**
   * Función para reintentar la precarga
   */
  onRetry?: () => void;
  /**
   * Función para limpiar errores
   */
  onClearErrors?: () => void;
  /**
   * Si es true, muestra solo errores críticos
   */
  showOnlyCritical?: boolean;
  /**
   * Clases CSS adicionales
   */
  className?: string;
}

/**
 * Componente para manejar errores de precarga de forma granular
 * 
 * Características:
 * - Diferencia entre errores críticos y no críticos
 * - Proporciona acciones específicas según el tipo de error
 * - Muestra información detallada del error
 * - Permite reintentar operaciones específicas
 */
export const PreloadErrorHandler: React.FC<PreloadErrorHandlerProps> = ({
  errors,
  onRetry,
  onClearErrors,
  showOnlyCritical = false,
  className = ''
}) => {
  const [expandedErrors, setExpandedErrors] = useState<Set<string>>(new Set());

  // Filtrar errores según la configuración
  const filteredErrors = showOnlyCritical 
    ? errors.filter(error => error.critical)
    : errors;

  // Si no hay errores que mostrar, no renderizar nada
  if (filteredErrors.length === 0) {
    return null;
  }

  // Agrupar errores por tipo
  const errorsByType = filteredErrors.reduce((acc, error) => {
    if (!acc[error.type]) {
      acc[error.type] = [];
    }
    acc[error.type].push(error);
    return acc;
  }, {} as Record<PreloadErrorType, PreloadError[]>);

  // Obtener información específica del tipo de error
  const getErrorTypeInfo = (type: PreloadErrorType) => {
    switch (type) {
      case PreloadErrorType.DASHBOARD_CRITICAL:
        return {
          title: 'Error crítico del dashboard',
          description: 'No se pudieron cargar los datos esenciales del dashboard. La aplicación puede no funcionar correctamente.',
          icon: AlertTriangle,
          color: 'destructive',
          critical: true,
          actions: ['retry', 'details']
        };
      case PreloadErrorType.ANIMAL_MODULE:
        return {
          title: 'Error en módulo Animal',
          description: 'No se pudieron cargar los datos del módulo Animal. Algunas funciones pueden no estar disponibles.',
          icon: Database,
          color: 'default',
          critical: false,
          actions: ['retry-module', 'details']
        };
      case PreloadErrorType.USER_MODULE:
        return {
          title: 'Error en módulo Usuario',
          description: 'No se pudieron cargar los datos del módulo Usuario. Algunas funciones pueden no estar disponibles.',
          icon: Database,
          color: 'default',
          critical: false,
          actions: ['retry-module', 'details']
        };
      case PreloadErrorType.NETWORK_ERROR:
        return {
          title: 'Error de red',
          description: 'Problemas de conectividad al intentar cargar los datos. Verifica tu conexión a internet.',
          icon: WifiOff,
          color: 'default',
          critical: false,
          actions: ['retry', 'details']
        };
      case PreloadErrorType.AUTHENTICATION_ERROR:
        return {
          title: 'Error de autenticación',
          description: 'Problemas con la sesión de usuario. Es posible que necesites iniciar sesión nuevamente.',
          icon: Shield,
          color: 'destructive',
          critical: true,
          actions: ['retry', 'details']
        };
      default:
        return {
          title: 'Error desconocido',
          description: 'Ocurrió un error inesperado al cargar los datos.',
          icon: AlertTriangle,
          color: 'default',
          critical: false,
          actions: ['retry', 'details']
        };
    }
  };

  // Formatear timestamp para mostrarlo de forma legible
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Toggle expansión de detalles de error
  const toggleErrorExpansion = (errorId: string) => {
    const newExpanded = new Set(expandedErrors);
    if (newExpanded.has(errorId)) {
      newExpanded.delete(errorId);
    } else {
      newExpanded.add(errorId);
    }
    setExpandedErrors(newExpanded);
  };

  // Renderizar acciones específicas para un tipo de error
  const renderErrorActions = (type: PreloadErrorType, error: PreloadError) => {
    const typeInfo = getErrorTypeInfo(type);
    
    return (
      <div className="flex flex-wrap gap-2 mt-3">
        {typeInfo.actions.includes('retry') && onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            Reintentar todo
          </Button>
        )}
        
        {typeInfo.actions.includes('retry-module') && onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Aquí podríamos implementar un reintento específico del módulo
              // Por ahora, usamos el reintento general
              onRetry();
            }}
            className="flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            Reintentar módulo
          </Button>
        )}
        
        {typeInfo.actions.includes('details') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleErrorExpansion(`${type}-${error.timestamp}`)}
            className="flex items-center gap-1"
          >
            <Info className="w-3 h-3" />
            Detalles
          </Button>
        )}
      </div>
    );
  };

  // Renderizar contenido expandido con detalles del error
  const renderErrorDetails = (error: PreloadError) => {
    const errorId = `${error.type}-${error.timestamp}`;
    const isExpanded = expandedErrors.has(errorId);
    
    return (
      <Collapsible open={isExpanded} onOpenChange={() => toggleErrorExpansion(errorId)}>
        <CollapsibleContent className="mt-3">
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md text-sm">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">Tipo:</span>
                <Badge variant={error.critical ? 'destructive' : 'secondary'}>
                  {error.type}
                </Badge>
              </div>
              
              <div className="flex justify-between">
                <span className="font-medium">Hora:</span>
                <span>{formatTimestamp(error.timestamp)}</span>
              </div>
              
              <div>
                <span className="font-medium">Mensaje:</span>
                <p className="mt-1 text-gray-600 dark:text-gray-400">
                  {error.message}
                </p>
              </div>
              
              {error.context && (
                <div>
                  <span className="font-medium">Contexto:</span>
                  <pre className="mt-1 text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-auto max-h-32">
                    {JSON.stringify(error.context, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Contador de errores */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">
          {showOnlyCritical ? 'Errores críticos' : 'Errores detectados'}
        </h3>
        <div className="flex items-center gap-2">
          <Badge variant={showOnlyCritical ? 'destructive' : 'secondary'}>
            {filteredErrors.length} {filteredErrors.length === 1 ? 'error' : 'errores'}
          </Badge>
          
          {onClearErrors && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearErrors}
              className="text-gray-500 hover:text-gray-700"
            >
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {/* Lista de errores agrupados por tipo */}
      {Object.entries(errorsByType).map(([type, typeErrors]) => {
        const typeInfo = getErrorTypeInfo(type as PreloadErrorType);
        const Icon = typeInfo.icon;
        
        return (
          <Alert key={type} variant={typeInfo.color as any}>
            <Icon className="h-4 w-4" />
            <AlertTitle className="flex items-center gap-2">
              {typeInfo.title}
              {typeInfo.critical && (
                <Badge variant="destructive" className="text-xs">
                  Crítico
                </Badge>
              )}
            </AlertTitle>
            <AlertDescription>
              {typeInfo.description}
              
              {/* Mostrar el error más reciente de este tipo */}
              {typeErrors.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium">
                    Error más reciente: {typeErrors[0].message}
                  </p>
                  
                  {/* Renderizar acciones para el error más reciente */}
                  {renderErrorActions(type as PreloadErrorType, typeErrors[0])}
                  
                  {/* Renderizar detalles del error más reciente */}
                  {renderErrorDetails(typeErrors[0])}
                  
                  {/* Si hay múltiples errores del mismo tipo, mostrar contador */}
                  {typeErrors.length > 1 && (
                    <div className="mt-2 text-xs text-gray-500">
                      {typeErrors.length - 1} error(es) adicional(es) de este tipo
                    </div>
                  )}
                </div>
              )}
            </AlertDescription>
          </Alert>
        );
      })}
      
      {/* Acciones globales */}
      {onRetry && (
        <div className="flex justify-center pt-4">
          <Button onClick={onRetry} className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Reintentar carga completa
          </Button>
        </div>
      )}
    </div>
  );
};

/**
 * Componente simplificado para mostrar solo errores críticos
 * Útil para la pantalla de error completo
 */
export const CriticalErrorDisplay: React.FC<{
  errors: PreloadError[];
  onRetry?: () => void;
}> = ({ errors, onRetry }) => {
  const criticalErrors = errors.filter(error => error.critical);
  
  if (criticalErrors.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Error crítico
        </h1>
        <p className="text-gray-600">
          No se pudo cargar información esencial para el funcionamiento de la aplicación.
        </p>
      </div>

      <PreloadErrorHandler
        errors={criticalErrors}
        onRetry={onRetry}
        showOnlyCritical={true}
      />
    </div>
  );
};

/**
 * Componente para mostrar errores no críticos en un banner discreto
 */
export const NonCriticalErrorBanner: React.FC<{
  errors: PreloadError[];
  onRetry?: () => void;
  onDismiss?: () => void;
}> = ({ errors, onRetry, onDismiss }) => {
  const nonCriticalErrors = errors.filter(error => !error.critical);
  
  if (nonCriticalErrors.length === 0) {
    return null;
  }

  return (
    <div className="w-full bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
      <div className="flex items-center">
        <AlertTriangle className="h-5 w-5 text-yellow-400 mr-2" />
        <div className="flex-1">
          <p className="text-sm text-yellow-700">
            Algunos datos no pudieron cargarse. La aplicación seguirá funcionando, 
            pero algunas características pueden no estar disponibles.
          </p>
        </div>
        <div className="flex space-x-2 ml-4">
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-yellow-700 hover:text-yellow-900 text-sm underline"
            >
              Reintentar
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-yellow-700 hover:text-yellow-900 text-sm underline"
            >
              Ocultar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PreloadErrorHandler;