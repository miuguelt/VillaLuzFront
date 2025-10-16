import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react';
import { DashboardStat } from '@/hooks/useCompleteDashboardStats';

interface DashboardStatsCardProps {
  title: string;
  icon: LucideIcon;
  stat: DashboardStat | undefined;
  description?: string;
  onClick?: () => void;
  className?: string;
  valueFormatter?: (value: number) => string;
}

export const DashboardStatsCard: React.FC<DashboardStatsCardProps> = ({
  title,
  icon: Icon,
  stat,
  description,
  onClick,
  className = '',
  valueFormatter = (val) => val.toString(),
}) => {
  const value = stat?.valor ?? 0;
  const change = stat?.cambio_porcentual;
  const hasChange = change !== undefined && change !== null;

  const getTrendIcon = () => {
    if (!hasChange || change === 0) return Minus;
    return change > 0 ? TrendingUp : TrendingDown;
  };

  const getTrendColor = () => {
    if (!hasChange || change === 0) return 'text-gray-500';
    return change > 0 ? 'text-green-500' : 'text-red-500';
  };

  const getTrendBgColor = () => {
    if (!hasChange || change === 0) return 'bg-gray-100';
    return change > 0 ? 'bg-green-50' : 'bg-red-50';
  };

  const TrendIcon = getTrendIcon();

  return (
    <Card
      className={`hover:shadow-lg transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:scale-[1.02]' : ''
      } ${className}`}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-2xl font-bold">{valueFormatter(value)}</div>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
          {hasChange && (
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`${getTrendBgColor()} border-0 ${getTrendColor()}`}
              >
                <TrendIcon className="h-3 w-3 mr-1" />
                <span className="text-xs font-medium">
                  {change > 0 ? '+' : ''}
                  {change}%
                </span>
              </Badge>
              <span className="text-xs text-muted-foreground">vs anterior</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

interface DashboardStatsGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

export const DashboardStatsGrid: React.FC<DashboardStatsGridProps> = ({
  children,
  columns = 4,
  className = '',
}) => {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={`grid ${gridCols[columns]} gap-4 ${className}`}>
      {children}
    </div>
  );
};

export default DashboardStatsCard;
