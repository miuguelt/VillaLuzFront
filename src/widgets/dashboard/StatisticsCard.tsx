import React from 'react';
import { normalizeDisplayValue } from '@/shared/utils/normalization';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Progress } from '@/shared/ui/progress';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatisticsCardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  progress?: {
    value: number;
    max: number;
    label?: string;
  };
  icon?: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'destructive';
  color?: string; // Clase CSS para color personalizado
  showGeneticTree?: boolean; // Para funcionalidad específica
  extraClasses?: string; // Futurista: glassmorphism y neon effects
  onClick?: () => void; // Nuevo: soporte de click para navegación / drill-down
}

const StatisticsCard: React.FC<StatisticsCardProps> = ({
  title,
  value,
  description,
  trend,
  progress,
  icon,
  variant = 'default',
  // color y showGeneticTree se mantienen para compatibilidad futura
  extraClasses,
  onClick,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return 'border-green-200 bg-gradient-to-br from-green-50 to-green-100 dark:border-green-800 dark:from-green-950 dark:to-green-900';
      case 'warning':
        return 'border-yellow-200 bg-gradient-to-br from-yellow-50 to-yellow-100 dark:border-yellow-800 dark:from-yellow-950 dark:to-yellow-900';
      case 'destructive':
        return 'border-red-200 bg-gradient-to-br from-red-50 to-red-100 dark:border-red-800 dark:from-red-950 dark:to-red-900';
      default:
        return 'border-border bg-card';
    }
  };

  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend.value > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (trend.value < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-600" />;
  };

  const getTrendColor = () => {
    if (!trend) return '';
    if (trend.isPositive && trend.value > 0) return 'text-green-600';
    if (!trend.isPositive && trend.value > 0) return 'text-red-600';
    if (trend.isPositive && trend.value < 0) return 'text-red-600';
    if (!trend.isPositive && trend.value < 0) return 'text-green-600';
    return 'text-gray-600';
  };

  return (
    // Si hay onClick, añadimos cursor-pointer y enfoque accesible
    <Card
      className={`rounded-lg shadow-sm transition-all duration-200 hover:shadow-lg hover:scale-[1.02] ring-1 ring-inset ring-border/50 ${getVariantStyles()} ${onClick ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40' : ''} ${extraClasses ?? ""}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && (
          <div className="h-4 w-4 text-muted-foreground">
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold">{normalizeDisplayValue(value)}</div>
          {trend && (
            <div className={`flex items-center space-x-1 ${getTrendColor()}`}>
              {getTrendIcon()}
              <span className="text-xs font-medium">
                {Math.abs(trend.value)}%
              </span>
            </div>
          )}
        </div>
        
        {description && (
          <p className="text-xs text-muted-foreground mt-1">
            {description}
          </p>
        )}
        
        {progress && (
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                {progress.label || 'Progreso'}
              </span>
              <span className="font-medium">
                {progress.value}/{progress.max}
              </span>
            </div>
            <Progress 
              value={(progress.value / progress.max) * 100} 
              className="h-2"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StatisticsCard;