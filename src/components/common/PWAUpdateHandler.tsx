import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/context/ToastContext';
import { Wifi, WifiOff, RefreshCw, Download } from 'lucide-react';

export function PWAUpdateHandler() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isUpdating, setIsUpdating] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    // Escuchar actualizaciones PWA
    const handleUpdateAvailable = () => {
      setUpdateAvailable(true);
      showToast('Nueva versión disponible', 'info');
    };

    window.addEventListener('pwa-update-available', handleUpdateAvailable);

    // Manejar estado de conexión
    const handleOnline = () => {
      setIsOnline(true);
      showToast('Conexión restablecida', 'success');
    };

    const handleOffline = () => {
      setIsOnline(false);
      showToast('Modo offline activado', 'warning');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('pwa-update-available', handleUpdateAvailable);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showToast]);

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      // Registrar el Service Worker nuevamente para forzar la actualización
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.update();
        }
        
        // Esperar un momento y recargar
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (error) {
      console.error('Error al actualizar PWA:', error);
      showToast('Error al actualizar. Recarga la página manualmente.', 'error');
      setIsUpdating(false);
    }
  };

  const handleSkipUpdate = () => {
    setUpdateAvailable(false);
    showToast('Puedes actualizar más tarde desde el menú', 'info');
  };

  if (!updateAvailable) {
    // Indicador de estado de conexión en modo offline
    if (!isOnline) {
      return (
        <div className="fixed bottom-4 right-4 z-50 animate-fade-in">
          <Card className="w-64 shadow-lg border-orange-200 bg-orange-50">
            <CardContent className="p-3 flex items-center space-x-2">
              <WifiOff className="h-4 w-4 text-orange-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-orange-800">Modo Offline</p>
                <p className="text-xs text-orange-600">Trabajando con datos cacheados</p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Indicador de conexión online
    if (isOnline) {
      return (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="flex items-center space-x-1 text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs">
            <Wifi className="h-3 w-3" />
            <span>Online</span>
          </div>
        </div>
      );
    }

    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
      <Card className="w-80 shadow-xl border-blue-200 bg-blue-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center space-x-2 text-blue-800">
            <Download className="h-4 w-4" />
            <span>Actualización Disponible</span>
          </CardTitle>
          <CardDescription className="text-xs text-blue-600">
            Hay una nueva versión de la aplicación con mejoras y correcciones.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex space-x-2">
            <Button 
              onClick={handleUpdate}
              disabled={isUpdating}
              size="sm"
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {isUpdating ? (
                <RefreshCw className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <Download className="h-3 w-3 mr-1" />
              )}
              {isUpdating ? 'Actualizando...' : 'Actualizar Ahora'}
            </Button>
            <Button 
              onClick={handleSkipUpdate}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              Después
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default PWAUpdateHandler;
