import React from 'react';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  icon?: string;
  loading?: boolean;
  subtitle?: string;
}

/**
 * Componente para mostrar KPIs (Key Performance Indicators)
 * Muestra un valor principal con indicador de cambio opcional
 */
const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  change,
  icon,
  loading = false,
  subtitle,
}) => {
  const isPositive = change !== undefined && change >= 0;
  const changeColor = isPositive ? 'text-green-600' : 'text-red-600';
  const bgColor = isPositive ? 'bg-green-50' : 'bg-red-50';

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
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>

        {change !== undefined && (
          <div className={`flex items-center space-x-1 ${bgColor} px-2 py-1 rounded-full`}>
            {isPositive ? (
              <ArrowUpIcon className={`w-4 h-4 ${changeColor}`} />
            ) : (
              <ArrowDownIcon className={`w-4 h-4 ${changeColor}`} />
            )}
            <span className={`text-sm font-semibold ${changeColor}`}>
              {Math.abs(change).toFixed(1)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default KPICard;
