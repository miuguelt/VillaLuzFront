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
  const palette = useMemo(() => {
    if (occupationRate > 110) {
      return {
        text: 'text-rose-600 dark:text-rose-300',
        progress: 'from-rose-500 via-red-500 to-red-700',
        track: 'bg-rose-100/70 dark:bg-rose-900/40',
        border: 'border border-rose-300/70 dark:border-rose-500/40',
        cardBg:
          'bg-card/95 dark:bg-card/80 backdrop-blur-sm',
        badge: 'bg-rose-100 text-rose-900 dark:bg-rose-900/60 dark:text-rose-100',
        ring: 'hover:ring-2 hover:ring-rose-300/80 dark:hover:ring-rose-400/50',
      };
    }
    if (occupationRate > 80) {
      return {
        text: 'text-amber-700 dark:text-amber-300',
        progress: 'from-amber-400 via-orange-400 to-orange-500',
        track: 'bg-amber-100/70 dark:bg-amber-900/40',
        border: 'border border-amber-200/70 dark:border-amber-500/30',
        cardBg:
          'bg-card/95 dark:bg-card/80 backdrop-blur-sm',
        badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-100',
        ring: 'hover:ring-2 hover:ring-amber-300/70 dark:hover:ring-amber-400/50',
      };
    }
    if (occupationRate > 60) {
      return {
        text: 'text-emerald-700 dark:text-emerald-200',
        progress: 'from-emerald-400 via-green-500 to-lime-500',
        track: 'bg-emerald-100/60 dark:bg-emerald-900/40',
        border: 'border border-emerald-200/60 dark:border-emerald-500/30',
        cardBg:
          'bg-card/95 dark:bg-card/80 backdrop-blur-sm',
        badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-100',
        ring: 'hover:ring-2 hover:ring-emerald-300/70 dark:hover:ring-emerald-400/50',
      };
    }
    if (occupationRate > 30) {
      return {
        text: 'text-cyan-700 dark:text-cyan-200',
        progress: 'from-cyan-400 via-blue-400 to-sky-500',
        track: 'bg-cyan-100/60 dark:bg-cyan-900/40',
        border: 'border border-cyan-200/60 dark:border-sky-600/30',
        cardBg:
          'bg-card/95 dark:bg-card/80 backdrop-blur-sm',
        badge: 'bg-cyan-100 text-cyan-800 dark:bg-sky-900/60 dark:text-sky-100',
        ring: 'hover:ring-2 hover:ring-sky-300/70 dark:hover:ring-sky-500/50',
      };
    }
    return {
      text: 'text-indigo-700 dark:text-indigo-200',
      progress: 'from-indigo-400 via-blue-500 to-purple-500',
      track: 'bg-indigo-100/60 dark:bg-indigo-900/40',
      border: 'border border-indigo-100/70 dark:border-indigo-500/30',
      cardBg:
        'bg-card/95 dark:bg-card/80 backdrop-blur-sm',
      badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-100',
      ring: 'hover:ring-2 hover:ring-indigo-300/70 dark:hover:ring-indigo-400/50',
    };
  }, [occupationRate]);

  // OPTIMIZACIÓN: Memoizar className del card
  const cardClassName = useMemo(
    () =>
      `rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer group
       ${palette.cardBg} ${palette.border} ${palette.ring} hover:scale-[1.015] dark:text-gray-100`,
    [palette]
  );

  return (
    <div className={cardClassName}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors">
            {field.name}
          </h3>
          {field.ubication && (
            <div className="flex items-center mt-1 text-sm text-gray-500 dark:text-gray-300 group-hover:text-gray-700 dark:group-hover:text-gray-100 transition-colors">
              <MapPinIcon className="w-4 h-4 mr-1 group-hover:text-blue-500 dark:group-hover:text-blue-300" />
              {field.ubication}
            </div>
          )}
        </div>
        {field.state && (
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 group-hover:scale-110 ${palette.badge}`}
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
          <span className={`text-lg font-bold ${palette.text}`}>
            {occupied} / {capacity}
          </span>
        </div>

        {/* Barra de progreso - OPTIMIZADO: GPU-accelerated con will-change */}
        <div className={`w-full ${palette.track} rounded-full h-3 overflow-hidden`}>
          <div
            className={`h-3 rounded-full transition-[width] duration-500 bg-gradient-to-r ${palette.progress} will-change-[width]`}
            style={{ width: `${Math.min(occupationRate, 100)}%` }}
          />
        </div>

        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-gray-500">0%</span>
          <span className={`text-xs font-semibold ${palette.text}`}>
            {occupationRate.toFixed(0)}%
          </span>
          <span className="text-xs text-gray-500">100%</span>
        </div>
      </div>

      {/* Alertas */}
      {occupationRate > 100 && (
        <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-md dark:bg-rose-900/30 dark:border-rose-500/40">
          <p className="text-xs text-rose-800 dark:text-rose-200 font-medium">
            ⚠️ Potrero sobrecargado ({(occupationRate - 100).toFixed(0)}% sobre capacidad)
          </p>
        </div>
      )}

      {occupationRate > 80 && occupationRate <= 100 && (
        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md dark:bg-amber-900/20 dark:border-amber-500/30">
          <p className="text-xs text-amber-800 dark:text-amber-100 font-medium">
            ⚡ Potrero cerca de su capacidad máxima
          </p>
        </div>
      )}

      {/* Información adicional */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700 grid grid-cols-2 gap-4 text-sm">
        {field.area && (
          <div>
            <span className="text-gray-600 dark:text-gray-300">Área:</span>
            <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">{field.area}</span>
          </div>
        )}
        {field.food_types?.name && (
          <div>
            <span className="text-gray-600 dark:text-gray-300">Alimento:</span>
            <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
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
            className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white text-sm font-medium rounded-md
                     hover:from-blue-500 hover:to-indigo-500 transition-all duration-200
                     hover:shadow-lg hover:-translate-y-0.5
                     active:translate-y-0 active:shadow-sm
                     transform will-change-transform
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
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
            className="px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-md
                     hover:bg-gray-50 dark:hover:bg-slate-800 hover:border-gray-400 dark:hover:border-slate-500 transition-all duration-200
                     hover:shadow-lg hover:-translate-y-0.5
                     active:translate-y-0 active:shadow-sm
                     transform will-change-transform
                     focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
            title="Ver analítica"
            aria-label="Ver analítica"
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
