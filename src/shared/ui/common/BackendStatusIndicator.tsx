import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { apiFetch } from '@/shared/api/apiFetch';

interface BackendStatus {
  isOnline: boolean;
  loading: boolean;
  lastChecked: Date | null;
  error?: string;
}

export const BackendStatusIndicator: React.FC = () => {
  const [status, setStatus] = useState<BackendStatus>({
    isOnline: false,
    loading: true,
    lastChecked: null
  });

  const checkBackendStatus = async () => {
    setStatus(prev => ({ ...prev, loading: true, error: undefined }));
    
    try {
      // Intentar hacer un HEAD request para verificar conectividad
      await apiFetch({ url: '/', method: 'HEAD' });
      setStatus({
        isOnline: true,
        loading: false,
        lastChecked: new Date(),
        error: undefined
      });
    } catch (error: any) {
      setStatus({
        isOnline: false,
        loading: false,
        lastChecked: new Date(),
        error: error.code === 'ERR_NETWORK' 
          ? 'No se puede conectar al servidor backend'
          : error.message || 'Error desconocido'
      });
    }
  };

  useEffect(() => {
    checkBackendStatus();
    // Verificar cada 30 segundos
    const interval = setInterval(checkBackendStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (status.loading && !status.lastChecked) {
    return (
      <Alert className="border-blue-200 bg-blue-50">
        <RefreshCw className="h-4 w-4 animate-spin" />
        <AlertDescription>
          Verificando conexión con el servidor...
        </AlertDescription>
      </Alert>
    );
  }

  if (!status.isOnline) {
    return (
      <Alert variant="destructive" className="mb-4">
        <XCircle className="h-4 w-4" />
        <AlertDescription>
          <div className="flex items-center justify-between">
            <div>
              <strong>Servidor no disponible</strong>
              <br />
              {status.error || 'No se puede conectar al backend'}
              <br />
              <small className="text-sm opacity-75">
                Última verificación: {status.lastChecked?.toLocaleTimeString()}
              </small>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={checkBackendStatus}
              disabled={status.loading}
              className="ml-4"
            >
              {status.loading ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                'Reintentar'
              )}
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="border-green-200 bg-green-50 mb-4">
      <CheckCircle className="h-4 w-4 text-green-600" />
      <AlertDescription className="text-green-800">
        <div className="flex items-center justify-between">
          <div>
            <strong>Servidor conectado</strong>
            <br />
            <small className="text-sm opacity-75">
              Última verificación: {status.lastChecked?.toLocaleTimeString()}
            </small>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={checkBackendStatus}
            disabled={status.loading}
            className="ml-4 border-green-300 text-green-700 hover:bg-green-100"
          >
            {status.loading ? (
              <RefreshCw className="h-3 w-3 animate-spin" />
            ) : (
              'Verificar'
            )}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default BackendStatusIndicator;
