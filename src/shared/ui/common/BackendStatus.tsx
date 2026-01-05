import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  Server,
  Database,
  Wifi,
  WifiOff
} from 'lucide-react';
import analyticsService from '@/features/reporting/api/analytics.service';

interface BackendStatusProps {
  className?: string;
  showDetails?: boolean;
}

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'unknown';
  services?: {
    database?: string;
    cache?: {
      status: string;
      entries: number;
      hit_rate: number;
    };
  };
  version?: string;
  uptime_seconds?: number;
  timestamp?: string;
}

const BackendStatus: React.FC<BackendStatusProps> = ({ 
  className = "", 
  showDetails = false 
}) => {
  const [status, setStatus] = useState<HealthStatus>({ status: 'unknown', timestamp: undefined });
  const [loading, setLoading] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const checkBackendHealth = async () => {
    setLoading(true);
    try {
      // Attempt to call a backend health endpoint. If not available, approximate using health statistics.
      // Attempt health-specific endpoint first
      let health: any = null;
      try {
        health = await analyticsService.getHealthCheck();
      } catch {
        // fallback to statistics as probe
        await analyticsService.getHealthStatistics();
        health = { status: 'healthy' };
      }
      if (health && (health.status === 'healthy' || health.status === 'ok')) {
        setStatus({ status: 'healthy', timestamp: new Date().toISOString() } as any);
      } else {
        setStatus({ status: 'unhealthy', timestamp: new Date().toISOString() } as any);
      }
      setLastCheck(new Date());
    } catch (error) {
      console.error('Error checking backend health:', error);
      setStatus({ status: 'unhealthy' });
      setLastCheck(new Date());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkBackendHealth();
    // Check every 30 seconds
    const interval = setInterval(checkBackendHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    switch (status.status) {
      case 'healthy':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'unhealthy':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = () => {
    switch (status.status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'unhealthy':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Server className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusText = () => {
    switch (status.status) {
      case 'healthy':
        return 'Backend Connected';
      case 'unhealthy':
        return 'Backend with Problems';
      default:
        return 'Unknown Status';
    }
  };

  const formatUptime = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  if (!showDetails && status.status === 'healthy') {
    return null; // No mostrar nada si está todo bien y no se requieren detalles
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <Alert className={getStatusColor()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="font-medium">{getStatusText()}</span>
            {status.status === 'healthy' ? (
              <Wifi className="h-4 w-4 text-green-600" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-600" />
            )}
          </div>
          <div className="flex items-center gap-2">
            {lastCheck && (
              <span className="text-xs text-muted-foreground">
                {lastCheck.toLocaleTimeString()}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={checkBackendHealth}
              disabled={loading}
              className="h-6 w-6 p-0"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        
        {showDetails && (
          <AlertDescription className="mt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              {status.version && (
                <div className="flex items-center gap-1">
                  <Server className="h-3 w-3" />
                  <span>Version: {status.version}</span>
                </div>
              )}
              
              {status.uptime_seconds && (
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  <span>Uptime: {formatUptime(status.uptime_seconds)}</span>
                </div>
              )}
              
              {status.services?.database && (
                <div className="flex items-center gap-1">
                  <Database className="h-3 w-3" />
                  <span>Database: </span>
                  <Badge 
                    variant={status.services.database.includes('unhealthy') ? 'destructive' : 'default'}
                    className="text-xs"
                  >
                    {status.services.database.includes('unhealthy') ? 'Error' : 'OK'}
                  </Badge>
                </div>
              )}
              
              {status.services?.cache && (
                <div className="flex items-center gap-1">
                  <span>Cache: {status.services.cache.entries} entries</span>
                  <Badge variant="secondary" className="text-xs">
                    {Math.round(status.services.cache.hit_rate * 100)}% hit rate
                  </Badge>
                </div>
              )}
            </div>
            
            {status.status === 'unhealthy' && (
              <div className="mt-2 p-2 bg-red-100 rounded text-red-800 text-xs">
                <strong>Problems detected:</strong>
                <ul className="mt-1 list-disc list-inside">
                  {status.services?.database?.includes('unhealthy') && (
                    <li>Database connection error</li>
                  )}
                  <li>Some services may not work correctly</li>
                  <li>Contact the system administrator if the problem persists</li>
                </ul>
              </div>
            )}
          </AlertDescription>
        )}
      </Alert>
    </div>
  );
};

export default BackendStatus;