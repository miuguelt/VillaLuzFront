import React, { useMemo } from 'react';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';
import { formatChangePercentage } from '@/utils/formatUtils';

interface KPICardProps {
  title: string;
  value: string | number;
  unit?: string;
  change?: number;
  icon?: React.ReactNode;
  loading?: boolean;
  subtitle?: string;
  goodWhenHigher?: boolean;
}

/**
 * Componente para mostrar KPIs (Key Performance Indicators)
 * Muestra un valor principal con indicador de cambio opcional
 */
const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  unit,
  change,
  icon,
  loading = false,
  subtitle,
  goodWhenHigher = true,
}) => {
  const hasChange = change !== undefined && change !== null;
  const isPositive = hasChange
    ? (goodWhenHigher ? (change as number) >= 0 : (change as number) <= 0)
    : false;
  const changeColor = isPositive ? 'text-green-600' : 'text-red-600';
  const bgColor = isPositive ? 'bg-green-50' : 'bg-red-50';
  const formattedChange = useMemo(
    () => formatChangePercentage(change),
    [change]
  );

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        {icon && <span className="text-2xl">{icon}</span>}
      </div>

      <div className="flex items-baseline justify-between">
        <div className="flex flex-col">
          <p className="text-3xl font-bold text-gray-900">
            {value}
            {unit && (
              <span className="ml-1 text-base font-semibold text-gray-500">
                {unit}
              </span>
            )}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>

        {formattedChange && (
          <div
            className={`flex items-center space-x-1 ${bgColor} px-2 py-1 rounded-full`}
            title={typeof change === 'number' ? `${change.toFixed(1)}% vs periodo anterior` : undefined}
          >
            {isPositive ? (
              <ArrowUpIcon className={`w-4 h-4 ${changeColor}`} />
            ) : (
              <ArrowDownIcon className={`w-4 h-4 ${changeColor}`} />
            )}
            <span className={`text-sm font-semibold ${changeColor}`}>
              {formattedChange}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default KPICard;
