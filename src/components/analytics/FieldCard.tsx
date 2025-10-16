import React from 'react';
import { MapPinIcon, ChartBarIcon } from '@heroicons/react/24/outline';

interface Field {
  id: number | string;
  name: string;
  ubication?: string;
  capacity: string | number;
  animal_count?: number;
  state?: string;
  area?: string;
  food_types?: {
    name?: string;
  };
}

interface FieldCardProps {
  field: Field;
  onViewDetails?: (field: Field) => void;
  onViewAnalytics?: (field: Field) => void;
}

/**
 * Componente para mostrar información de un potrero
 * Incluye ocupación actual basada en animal_count del backend
 */
const FieldCard: React.FC<FieldCardProps> = ({
  field,
  onViewDetails,
  onViewAnalytics,
}) => {
  const capacity = parseInt(String(field.capacity)) || 0;
  const occupied = field.animal_count || 0;
  const occupationRate = capacity > 0 ? (occupied / capacity) * 100 : 0;

  // Determinar color según ocupación
  const getOccupationColor = () => {
    if (occupationRate > 100) return 'text-red-600';
    if (occupationRate > 80) return 'text-yellow-600';
    if (occupationRate > 50) return 'text-green-600';
    return 'text-gray-600';
  };

  const getProgressColor = () => {
    if (occupationRate > 100) return 'bg-red-600';
    if (occupationRate > 80) return 'bg-yellow-500';
    if (occupationRate > 50) return 'bg-green-500';
    return 'bg-gray-400';
  };

  const getBgColor = () => {
    if (occupationRate > 100) return 'bg-red-50';
    if (occupationRate > 80) return 'bg-yellow-50';
    if (occupationRate > 50) return 'bg-green-50';
    return 'bg-gray-50';
  };

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-lg transition-all p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{field.name}</h3>
          {field.ubication && (
            <div className="flex items-center mt-1 text-sm text-gray-500">
              <MapPinIcon className="w-4 h-4 mr-1" />
              {field.ubication}
            </div>
          )}
        </div>
        {field.state && (
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              field.state === 'Disponible'
                ? 'bg-green-100 text-green-800'
                : field.state === 'Ocupado'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {field.state}
          </span>
        )}
      </div>

      {/* Ocupación */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600">
            Ocupación del Potrero
          </span>
          <span className={`text-lg font-bold ${getOccupationColor()}`}>
            {occupied} / {capacity}
          </span>
        </div>

        {/* Barra de progreso */}
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${getProgressColor()}`}
            style={{ width: `${Math.min(occupationRate, 100)}%` }}
          />
        </div>

        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-gray-500">0%</span>
          <span className={`text-xs font-semibold ${getOccupationColor()}`}>
            {occupationRate.toFixed(0)}%
          </span>
          <span className="text-xs text-gray-500">100%</span>
        </div>
      </div>

      {/* Alertas */}
      {occupationRate > 100 && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-xs text-red-800 font-medium">
            ⚠️ Potrero sobrecargado ({(occupationRate - 100).toFixed(0)}% sobre capacidad)
          </p>
        </div>
      )}

      {occupationRate > 80 && occupationRate <= 100 && (
        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-xs text-yellow-800 font-medium">
            ⚡ Potrero cerca de su capacidad máxima
          </p>
        </div>
      )}

      {/* Información adicional */}
      <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 gap-4 text-sm">
        {field.area && (
          <div>
            <span className="text-gray-600">Área:</span>
            <span className="ml-2 font-medium text-gray-900">{field.area}</span>
          </div>
        )}
        {field.food_types?.name && (
          <div>
            <span className="text-gray-600">Alimento:</span>
            <span className="ml-2 font-medium text-gray-900">
              {field.food_types.name}
            </span>
          </div>
        )}
      </div>

      {/* Botones de acción */}
      <div className="mt-4 flex space-x-2">
        {onViewDetails && (
          <button
            onClick={() => onViewDetails(field)}
            className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            Ver Detalles
          </button>
        )}
        {onViewAnalytics && (
          <button
            onClick={() => onViewAnalytics(field)}
            className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
          >
            <ChartBarIcon className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default FieldCard;
