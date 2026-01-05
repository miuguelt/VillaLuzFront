import React, { useState } from 'react';
import { useAnalytics } from '@/features/reporting/model/useAnalytics';
import AlertCard from './AlertCard';
import { FunnelIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

/**
 * Panel de alertas del sistema
 * Muestra alertas filtradas por prioridad con acciones
 */
const AlertsPanel: React.FC = () => {
  const [priority, setPriority] = useState<string>('all');
  const { useAlerts } = useAnalytics();

  const params = priority !== 'all' ? { priority, limit: 50 } : { limit: 50 };
  const { data, isLoading, refetch, isFetching } = useAlerts(params);

  const handleAction = (alert: any) => {
    console.log('Handling alert:', alert);
    // Aquí puedes navegar o ejecutar acciones específicas
    switch (alert.type) {
      case 'vaccination_overdue':
        // Navegar a programar vacunación
        console.log('Navegar a vacunaciones');
        break;
      case 'health_checkup_overdue':
        // Navegar a programar control
        console.log('Navegar a controles');
        break;
      case 'field_overloaded':
        // Navegar a gestión de campos
        console.log('Navegar a campos');
        break;
      default:
        break;
    }
  };

  const priorities = [
    { value: 'all', label: 'Todas', color: 'gray' },
    { value: 'critical', label: 'Críticas', color: 'red' },
    { value: 'warning', label: 'Advertencias', color: 'yellow' },
    { value: 'info', label: 'Información', color: 'blue' },
  ];

  const getColorClasses = (color: string, isActive: boolean) => {
    if (!isActive) {
      return 'bg-gray-100 text-gray-600 hover:bg-gray-200';
    }

    const colorMap: Record<string, string> = {
      gray: 'bg-gray-200 text-gray-800',
      red: 'bg-red-100 text-red-800',
      yellow: 'bg-yellow-100 text-yellow-800',
      blue: 'bg-blue-100 text-blue-800',
    };

    return colorMap[color] || colorMap.gray;
  };

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header con filtros */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Sistema de Alertas
          </h2>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 disabled:text-gray-400 flex items-center space-x-2"
          >
            <ArrowPathIcon
              className={`w-5 h-5 ${isFetching ? 'animate-spin' : ''}`}
            />
            <span>Actualizar</span>
          </button>
        </div>

        {/* Filtros */}
        <div className="flex items-center space-x-2 flex-wrap gap-2">
          <FunnelIcon className="w-5 h-5 text-gray-400" />
          <span className="text-sm text-gray-600">Filtrar por:</span>
          {priorities.map((p) => (
            <button
              key={p.value}
              onClick={() => setPriority(p.value)}
              className={`px-3 py-1 text-sm font-medium rounded-full transition-colors ${getColorClasses(
                p.color,
                priority === p.value
              )}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de alertas */}
      <div className="p-6">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : data?.alerts && data.alerts.length > 0 ? (
          <>
            {/* Estadísticas */}
            {data.statistics && (
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">
                    {data.statistics.by_priority?.high || 0}
                  </p>
                  <p className="text-sm text-red-800">Críticas</p>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-600">
                    {data.statistics.by_priority?.medium || 0}
                  </p>
                  <p className="text-sm text-yellow-800">Advertencias</p>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">
                    {data.statistics.by_priority?.low || 0}
                  </p>
                  <p className="text-sm text-blue-800">Información</p>
                </div>
              </div>
            )}

            {/* Alertas */}
            <div className="space-y-4">
              {data.alerts.map((alert: any, index: number) => (
                <AlertCard
                  key={alert.id || index}
                  alert={alert}
                  onAction={handleAction}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-4xl mb-2">✅</p>
            <p className="text-gray-500">No hay alertas en este momento</p>
            {priority !== 'all' && (
              <button
                onClick={() => setPriority('all')}
                className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Ver todas las alertas
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertsPanel;
