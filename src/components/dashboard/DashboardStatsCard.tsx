import React, { memo, useMemo } from 'react';
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

// OPTIMIZACIÓN: Memoizar componente para evitar re-renders innecesarios
const DashboardStatsCardComponent: React.FC<DashboardStatsCardProps> = ({
  title,
  icon: Icon,
  stat,
  description,
  onClick,
  className = '',
  valueFormatter = (val) => val.toString(),
}) => {
  // OPTIMIZACIÓN: Memoizar cálculos para evitar recalcularlos en cada render
  const value = useMemo(() => stat?.valor ?? 0, [stat?.valor]);
  const change = useMemo(() => stat?.cambio_porcentual, [stat?.cambio_porcentual]);
  const hasChange = useMemo(() => change !== undefined && change !== null, [change]);

  const { TrendIcon, trendColor, trendBgColor } = useMemo(() => {
    if (!hasChange || change === 0) {
      return {
        TrendIcon: Minus,
        trendColor: 'text-gray-500',
        trendBgColor: 'bg-gray-100',
      };
    }
    if (change > 0) {
      return {
        TrendIcon: TrendingUp,
        trendColor: 'text-green-500',
        trendBgColor: 'bg-green-50',
      };
    }
    return {
      TrendIcon: TrendingDown,
      trendColor: 'text-red-500',
      trendBgColor: 'bg-red-50',
    };
  }, [hasChange, change]);

  // OPTIMIZACIÓN: Evitar forced reflow con will-change y transform GPU-accelerated
  const cardClassName = useMemo(
    () => `hover:shadow-lg transition-shadow duration-200 ${
      onClick ? 'cursor-pointer hover:brightness-[0.98] will-change-[filter]' : ''
    } ${className}`,
    [onClick, className]
  );

  return (
    <Card className={cardClassName} onClick={onClick}>
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
                className={`${trendBgColor} border-0 ${trendColor}`}
              >
                <TrendIcon className="h-3 w-3 mr-1" />
                <span className="text-xs font-medium">
                  {change! > 0 ? '+' : ''}
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

// Memoizar componente con comparación personalizada
export const DashboardStatsCard = memo(DashboardStatsCardComponent, (prevProps, nextProps) => {
  // OPTIMIZACIÓN: Comparación personalizada para evitar re-renders innecesarios
  return (
    prevProps.title === nextProps.title &&
    prevProps.stat?.valor === nextProps.stat?.valor &&
    prevProps.stat?.cambio_porcentual === nextProps.stat?.cambio_porcentual &&
    prevProps.description === nextProps.description &&
    prevProps.className === nextProps.className &&
    prevProps.onClick === nextProps.onClick
  );
});

DashboardStatsCard.displayName = 'DashboardStatsCard';

interface DashboardStatsGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

// OPTIMIZACIÓN: Memoizar grid para evitar re-renders cuando children no cambian
const DashboardStatsGridComponent: React.FC<DashboardStatsGridProps> = ({
  children,
  columns = 4,
  className = '',
}) => {
  const gridCols = useMemo(() => ({
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  }), []);

  const gridClassName = useMemo(
    () => `grid ${gridCols[columns]} gap-4 ${className}`,
    [columns, className, gridCols]
  );

  return (
    <div className={gridClassName}>
      {children}
    </div>
  );
};

export const DashboardStatsGrid = memo(DashboardStatsGridComponent);
DashboardStatsGrid.displayName = 'DashboardStatsGrid';

export default DashboardStatsCard;
