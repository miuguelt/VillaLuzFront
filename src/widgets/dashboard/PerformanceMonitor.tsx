import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardContent } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { useRequestMonitor } from '@/shared/utils/requestMonitor';
import { useCacheDebug } from '@/shared/hooks/useOptimizedFormData';
import { Badge } from '@/shared/ui/badge';
import { Progress } from '@/shared/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// Module-level constant so it doesn't affect hook dependencies
const commonEntities = ['animals', 'users', 'diseases', 'species', 'breeds', 'fields', 'medications', 'vaccines'];

interface PerformanceMonitorProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  autoRefresh = true,
  refreshInterval = 5000
}) => {
  const [stats, setStats] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const { getStats, printStats, getRedundantRequests, clear } = useRequestMonitor();
  const { getCacheStats, logCacheStats } = useCacheDebug();

  const updateStats = useCallback(() => {
    const requestStats = getStats(60000); // Últimos 60 segundos
    const redundantRequests = getRedundantRequests(30000); // Últimos 30 segundos
    const cacheStats = getCacheStats(commonEntities);
    
    setStats({
      ...requestStats,
      redundantRequests,
      cacheStats
    });
  }, [getStats, getRedundantRequests, getCacheStats]);

  useEffect(() => {
    updateStats();
  }, [updateStats]);

  useEffect(() => {
    if (autoRefresh && isVisible) {
      const interval = setInterval(updateStats, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, isVisible, updateStats]);

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsVisible(true)}
          variant="outline"
          size="sm"
          className="bg-background"
        >
          📊 Performance
        </Button>
      </div>
    );
  }

  const chartData = stats?.endpointStats ? Object.entries(stats.endpointStats).map(([endpoint, data]: [string, any]) => ({
    endpoint: endpoint.split('/').pop() || endpoint,
    api: data.api,
    cached: data.cached,
    total: data.total
  })) : [];

  const pieData = [
    { name: 'Cache Hits', value: stats?.cacheHits || 0, color: '#10b981' },
    { name: 'API Calls', value: stats?.apiCalls || 0, color: '#f59e0b' }
  ];

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-[80vh] overflow-hidden">
      <Card className="bg-background border shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">📊 Performance Monitor</h3>
            <div className="flex gap-1">
              <Button
                onClick={updateStats}
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
              >
                🔄
              </Button>
              <Button
                onClick={() => {
                  printStats();
                  logCacheStats(commonEntities);
                }}
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
              >
                📋
              </Button>
              <Button
                onClick={clear}
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
              >
                🗑️
              </Button>
              <Button
                onClick={() => setIsVisible(false)}
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
              >
                ✕
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0 max-h-[60vh] overflow-y-auto">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-8">
              <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
              <TabsTrigger value="cache" className="text-xs">Cache</TabsTrigger>
              <TabsTrigger value="endpoints" className="text-xs">Endpoints</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-3 mt-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Total Requests:</span>
                    <Badge variant="secondary">{stats?.totalRequests || 0}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>API Calls:</span>
                    <Badge variant="destructive">{stats?.apiCalls || 0}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Cache Hits:</span>
                    <Badge variant="default">{stats?.cacheHits || 0}</Badge>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Hit Rate:</span>
                    <Badge variant={stats?.cacheHitRate > 50 ? "default" : "secondary"}>
                      {stats?.cacheHitRate?.toFixed(1) || 0}%
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Time:</span>
                    <Badge variant="outline">{stats?.averageResponseTime?.toFixed(0) || 0}ms</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Redundant:</span>
                    <Badge variant={stats?.redundantEndpoints?.length > 0 ? "destructive" : "default"}>
                      {stats?.redundantEndpoints?.length || 0}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-xs font-medium">Cache Hit Rate</div>
                <Progress value={stats?.cacheHitRate || 0} className="h-2" />
              </div>
              
              {stats?.totalRequests > 0 && (
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={50}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="cache" className="space-y-3 mt-3">
              <div className="space-y-2">
                <div className="text-xs font-medium">Cache Status by Entity</div>
                {stats?.cacheStats?.map((stat: any, index: number) => (
                  <div key={index} className="flex items-center justify-between text-xs">
                    <span className="capitalize">{stat.entity}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant={stat.cached ? "default" : "secondary"}>
                        {stat.cached ? '✅' : '❌'}
                      </Badge>
                      <span className="text-muted-foreground">
                        {stat.itemCount} items
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="endpoints" className="space-y-3 mt-3">
              {chartData.length > 0 && (
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="endpoint" 
                        tick={{ fontSize: 10 }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="api" fill="#f59e0b" name="API Calls" />
                      <Bar dataKey="cached" fill="#10b981" name="Cache Hits" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              
              {stats?.redundantRequests?.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-destructive">⚠️ Redundant Requests</div>
                  {stats.redundantRequests.slice(0, 3).map((req: any, index: number) => (
                    <div key={index} className="text-xs p-2 bg-destructive text-destructive-foreground rounded">
                      <div className="font-mono text-[10px] truncate">{req.url}</div>
                      <div className="text-destructive-foreground">{req.count} calls in 30s</div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformanceMonitor;