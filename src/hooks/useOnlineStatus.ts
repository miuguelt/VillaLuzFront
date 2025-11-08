import { useState, useEffect } from 'react';
import { offlineQueue } from '@/utils/offlineQueue';

interface OnlineStatus {
  isOnline: boolean;
  wasOffline: boolean;
  pendingOperations: number;
  syncStatus: ReturnType<typeof offlineQueue.getSyncStatus>;
}

/**
 * Hook para detectar estado de conexión y sincronización
 */
export const useOnlineStatus = (): OnlineStatus => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [wasOffline, setWasOffline] = useState<boolean>(false);
  const [pendingOperations, setPendingOperations] = useState<number>(
    offlineQueue.getPendingCount()
  );
  const [syncStatus, setSyncStatus] = useState(offlineQueue.getSyncStatus());

  useEffect(() => {
    const handleOnline = () => {
      console.log('[useOnlineStatus] Conexión restaurada');
      setIsOnline(true);
      setWasOffline(true);

      // Intentar sincronizar operaciones pendientes
      offlineQueue.syncQueue().then(() => {
        setPendingOperations(offlineQueue.getPendingCount());
        setSyncStatus(offlineQueue.getSyncStatus());
      });

      // Limpiar bandera después de 5 segundos
      setTimeout(() => setWasOffline(false), 5000);
    };

    const handleOffline = () => {
      console.log('[useOnlineStatus] Conexión perdida');
      setIsOnline(false);
    };

    // Actualizar estado de operaciones pendientes periódicamente
    const updatePendingOperations = () => {
      setPendingOperations(offlineQueue.getPendingCount());
      setSyncStatus(offlineQueue.getSyncStatus());
    };

    // Registrar callback para sincronización
    offlineQueue.onSync((success, operation) => {
      console.log(
        `[useOnlineStatus] Operación ${success ? 'sincronizada' : 'fallida'}:`,
        operation.method,
        operation.url
      );
      updatePendingOperations();
    });

    // Event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Actualizar periódicamente
    const interval = setInterval(updatePendingOperations, 2000);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  return {
    isOnline,
    wasOffline,
    pendingOperations,
    syncStatus
  };
};
