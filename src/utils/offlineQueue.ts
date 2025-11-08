import { getCookie } from '@/utils/cookieUtils';

/**
 * Sistema de cola para operaciones offline
 * Almacena operaciones pendientes y las sincroniza cuando hay conexión
 */

export interface QueuedOperation {
  id: string;
  timestamp: number;
  method: 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  data?: any;
  headers?: Record<string, string>;
  retries: number;
  maxRetries: number;
  status: 'pending' | 'syncing' | 'failed' | 'completed';
  error?: string;
}

const QUEUE_STORAGE_KEY = 'offline_operations_queue';
const MAX_RETRIES = 3;

class OfflineQueue {
  private queue: QueuedOperation[] = [];
  private isSyncing = false;
  private syncCallbacks: Array<(success: boolean, operation: QueuedOperation) => void> = [];

  constructor() {
    this.loadQueue();
    // Intentar sincronizar cuando se recupere la conexión
    window.addEventListener('online', () => this.syncQueue());
  }

  /**
   * Cargar cola desde localStorage
   */
  private loadQueue(): void {
    try {
      const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
        console.log(`[OfflineQueue] Cargadas ${this.queue.length} operaciones pendientes`);
      }
    } catch (error) {
      console.error('[OfflineQueue] Error al cargar cola:', error);
      this.queue = [];
    }
  }

  /**
   * Guardar cola en localStorage
   */
  private saveQueue(): void {
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      console.error('[OfflineQueue] Error al guardar cola:', error);
    }
  }

  /**
   * Agregar operación a la cola
   */
  enqueue(
    method: QueuedOperation['method'],
    url: string,
    data?: any,
    headers?: Record<string, string>
  ): string {
    const operation: QueuedOperation = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      method,
      url,
      data,
      headers,
      retries: 0,
      maxRetries: MAX_RETRIES,
      status: 'pending'
    };

    this.queue.push(operation);
    this.saveQueue();

    console.log(`[OfflineQueue] Operación encolada: ${method} ${url}`, operation);

    // Intentar sincronizar inmediatamente si hay conexión
    if (navigator.onLine && !this.isSyncing) {
      setTimeout(() => this.syncQueue(), 100);
    }

    return operation.id;
  }

  /**
   * Obtener todas las operaciones pendientes
   */
  getPendingOperations(): QueuedOperation[] {
    return this.queue.filter(op => op.status !== 'completed');
  }

  /**
   * Obtener número de operaciones pendientes
   */
  getPendingCount(): number {
    return this.getPendingOperations().length;
  }

  /**
   * Sincronizar cola con el servidor
   */
  async syncQueue(): Promise<void> {
    if (this.isSyncing || !navigator.onLine) {
      console.log('[OfflineQueue] Sincronización omitida:',
        !navigator.onLine ? 'sin conexión' : 'ya sincronizando');
      return;
    }

    const pendingOps = this.getPendingOperations();
    if (pendingOps.length === 0) {
      console.log('[OfflineQueue] No hay operaciones pendientes');
      return;
    }

    this.isSyncing = true;
    console.log(`[OfflineQueue] Iniciando sincronización de ${pendingOps.length} operaciones`);

    for (const operation of pendingOps) {
      if (operation.status === 'syncing') continue;

      try {
        operation.status = 'syncing';
        this.saveQueue();

        const headers: Record<string, string> = {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(operation.headers || {})
        };

        // Si el backend requiere CSRF basado en cookies, replicar encabezados
        const csrfToken = getCookie('csrf_access_token');
        if (csrfToken) {
          headers['X-CSRF-Token'] = headers['X-CSRF-Token'] || csrfToken;
          headers['X-CSRF-TOKEN'] = headers['X-CSRF-TOKEN'] || csrfToken;
        }

        const response = await fetch(operation.url, {
          method: operation.method,
          headers,
          body: operation.data ? JSON.stringify(operation.data) : undefined,
          credentials: 'include'
        });

        if (response.ok) {
          operation.status = 'completed';
          console.log(`[OfflineQueue] ✓ Sincronizada: ${operation.method} ${operation.url}`);
          this.notifyCallbacks(true, operation);
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error: any) {
        operation.retries++;
        const errorMsg = error.message || 'Error desconocido';
        operation.error = errorMsg;

        if (operation.retries >= operation.maxRetries) {
          operation.status = 'failed';
          console.error(`[OfflineQueue] ✗ Falló permanentemente: ${operation.method} ${operation.url}`, errorMsg);
          this.notifyCallbacks(false, operation);
        } else {
          operation.status = 'pending';
          console.warn(`[OfflineQueue] ⚠ Falló (intento ${operation.retries}/${operation.maxRetries}): ${operation.method} ${operation.url}`, errorMsg);
        }
      }

      this.saveQueue();
    }

    // Limpiar operaciones completadas (mantener las falladas para revisión)
    this.queue = this.queue.filter(op => op.status !== 'completed');
    this.saveQueue();

    this.isSyncing = false;
    console.log('[OfflineQueue] Sincronización completada');
  }

  /**
   * Limpiar operaciones falladas
   */
  clearFailedOperations(): void {
    this.queue = this.queue.filter(op => op.status !== 'failed');
    this.saveQueue();
    console.log('[OfflineQueue] Operaciones falladas limpiadas');
  }

  /**
   * Reintentar operaciones falladas
   */
  async retryFailedOperations(): Promise<void> {
    const failedOps = this.queue.filter(op => op.status === 'failed');
    failedOps.forEach(op => {
      op.status = 'pending';
      op.retries = 0;
      op.error = undefined;
    });
    this.saveQueue();
    await this.syncQueue();
  }

  /**
   * Registrar callback para notificaciones de sincronización
   */
  onSync(callback: (success: boolean, operation: QueuedOperation) => void): void {
    this.syncCallbacks.push(callback);
  }

  /**
   * Notificar a los callbacks registrados
   */
  private notifyCallbacks(success: boolean, operation: QueuedOperation): void {
    this.syncCallbacks.forEach(cb => {
      try {
        cb(success, operation);
      } catch (error) {
        console.error('[OfflineQueue] Error en callback:', error);
      }
    });
  }

  /**
   * Obtener estado de sincronización
   */
  getSyncStatus(): {
    syncing: boolean;
    pending: number;
    failed: number;
    completed: number;
  } {
    return {
      syncing: this.isSyncing,
      pending: this.queue.filter(op => op.status === 'pending').length,
      failed: this.queue.filter(op => op.status === 'failed').length,
      completed: this.queue.filter(op => op.status === 'completed').length
    };
  }
}

// Instancia singleton
export const offlineQueue = new OfflineQueue();
