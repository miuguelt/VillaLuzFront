import React, { memo, useMemo } from 'react';
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
 *
 * OPTIMIZADO: Memoizado para evitar re-renders y forced reflows
 */
const FieldCardComponent: React.FC<FieldCardProps> = ({
  field,
  onViewDetails,
  onViewAnalytics,
}) => {
  // OPTIMIZACIÓN: Memoizar cálculos para evitar recalcularlos en cada render
  const capacity = useMemo(() => parseInt(String(field.capacity)) || 0, [field.capacity]);
  const occupied = useMemo(() => field.animal_count || 0, [field.animal_count]);
  const occupationRate = useMemo(
    () => capacity > 0 ? (occupied / capacity) * 100 : 0,
    [capacity, occupied]
  );

  // OPTIMIZACIÓN: Memoizar todos los colores en un solo useMemo
  const colors = useMemo(() => {
    if (occupationRate > 100) {
      return {
        text: 'text-red-600',
        progress: 'bg-red-600',
        bg: 'bg-red-50',
      };
    }
    if (occupationRate > 80) {
      return {
        text: 'text-yellow-600',
        progress: 'bg-yellow-500',
        bg: 'bg-yellow-50',
      };
    }
    if (occupationRate > 50) {
      return {
        text: 'text-green-600',
        progress: 'bg-green-500',
        bg: 'bg-green-50',
      };
    }
    return {
      text: 'text-gray-600',
      progress: 'bg-gray-400',
      bg: 'bg-gray-50',
    };
  }, [occupationRate]);

  // OPTIMIZACIÓN: Memoizar className del card
  const cardClassName = useMemo(() => {
    let baseColor = 'border-l-4 border-transparent';

    if (occupationRate > 100) {
      baseColor = 'border-l-4 border-red-500 hover:border-l-8';
    } else if (occupationRate > 80) {
      baseColor = 'border-l-4 border-yellow-500 hover:border-l-8';
    } else if (occupationRate > 50) {
      baseColor = 'border-l-4 border-green-500 hover:border-l-8';
    } else {
      baseColor = 'border-l-4 border-blue-500 hover:border-l-8';
    }

    return `bg-white rounded-lg shadow hover:shadow-2xl transition-all duration-300 p-6
            ${baseColor}
            hover:scale-[1.02] transform will-change-transform
            cursor-pointer group`;
  }, [occupationRate]);

  return (
    <div className={cardClassName}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
            {field.name}
          </h3>
          {field.ubication && (
            <div className="flex items-center mt-1 text-sm text-gray-500 group-hover:text-gray-700 transition-colors">
              <MapPinIcon className="w-4 h-4 mr-1 group-hover:text-blue-500" />
              {field.ubication}
            </div>
          )}
        </div>
        {field.state && (
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200
                      group-hover:scale-110 ${
              field.state === 'Disponible'
                ? 'bg-green-100 text-green-800 group-hover:bg-green-200'
                : field.state === 'Ocupado'
                ? 'bg-blue-100 text-blue-800 group-hover:bg-blue-200'
                : field.state === 'Mantenimiento'
                ? 'bg-yellow-100 text-yellow-800 group-hover:bg-yellow-200'
                : 'bg-gray-100 text-gray-800 group-hover:bg-gray-200'
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
          <span className={`text-lg font-bold ${colors.text}`}>
            {occupied} / {capacity}
          </span>
        </div>

        {/* Barra de progreso - OPTIMIZADO: GPU-accelerated con will-change */}
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className={`h-3 rounded-full transition-[width] duration-500 ${colors.progress} will-change-[width]`}
            style={{ width: `${Math.min(occupationRate, 100)}%` }}
          />
        </div>

        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-gray-500">0%</span>
          <span className={`text-xs font-semibold ${colors.text}`}>
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

      {/* Botones de acción - OPTIMIZADOS con efectos GPU-accelerated */}
      <div className="mt-4 flex space-x-2">
        {onViewDetails && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(field);
            }}
            className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md
                     hover:bg-blue-700 transition-all duration-200
                     hover:shadow-lg hover:-translate-y-0.5
                     active:translate-y-0 active:shadow-sm
                     transform will-change-transform
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <span className="inline-block hover:scale-105 transition-transform">
              Ver Detalles
            </span>
          </button>
        )}
        {onViewAnalytics && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewAnalytics(field);
            }}
            className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md
                     hover:bg-gray-50 hover:border-gray-400 transition-all duration-200
                     hover:shadow-lg hover:-translate-y-0.5
                     active:translate-y-0 active:shadow-sm
                     transform will-change-transform
                     focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
            title="Ver Analytics"
          >
            <ChartBarIcon className="w-5 h-5 hover:scale-110 transition-transform" />
          </button>
        )}
      </div>
    </div>
  );
};

// OPTIMIZACIÓN: Memoizar componente con comparación personalizada
const FieldCard = memo(FieldCardComponent, (prevProps, nextProps) => {
  // Solo re-renderiza si cambian estos valores importantes
  return (
    prevProps.field.id === nextProps.field.id &&
    prevProps.field.animal_count === nextProps.field.animal_count &&
    prevProps.field.capacity === nextProps.field.capacity &&
    prevProps.field.state === nextProps.field.state
  );
});

FieldCard.displayName = 'FieldCard';

export default FieldCard;
