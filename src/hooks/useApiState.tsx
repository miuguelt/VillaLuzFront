import { useState, useCallback, useRef, useEffect } from 'react';
// Definición local de ApiError (el backend no expone un tipo formal)
export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  details?: any;
}

/**
 * Interfaz para el estado de una operación API
 */
interface ApiState<T = any> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
  success: boolean;
}

/**
 * Interfaz para opciones de configuración del hook
 */
interface UseApiStateOptions {
  initialData?: any;
  resetOnNewRequest?: boolean;
  debounceMs?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

/**
 * Interfaz para el resultado del hook
 */
interface UseApiStateResult<T> extends ApiState<T> {
  execute: (apiCall: () => Promise<T>) => Promise<T | null>;
  reset: () => void;
  setData: (data: T | null) => void;
  setError: (error: ApiError | null) => void;
  retry: () => Promise<T | null>;
  isIdle: boolean;
}

/**
 * Hook personalizado para manejar estados de carga, errores y datos de APIs
 * Implementa las mejores prácticas para el manejo de estados asincrónicos
 */
export function useApiState<T = any>(options: UseApiStateOptions = {}): UseApiStateResult<T> {
  const {
    initialData = null,
    resetOnNewRequest = true,
    debounceMs = 0,
    retryAttempts = 0,
    retryDelay = 1000
  } = options;

  // Estado principal
  const [state, setState] = useState<ApiState<T>>({
    data: initialData,
    loading: false,
    error: null,
    success: false
  });

  // Referencias para control de ejecución
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastApiCallRef = useRef<(() => Promise<T>) | null>(null);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  // Cleanup al desmontar el componente
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Actualizar estado de forma segura (solo si el componente está montado)
   */
  const safeSetState = useCallback((newState: Partial<ApiState<T>>) => {
    if (mountedRef.current) {
      setState((prevState: ApiState<T>) => ({ ...prevState, ...newState }));
    }
  }, []);

  /**
   * Ejecutar llamada a la API con manejo de errores y reintentos
   */
  const executeApiCall = useCallback(async (apiCall: () => Promise<T>, attempt = 1): Promise<T | null> => {
    try {
      // Cancelar petición anterior si existe
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Crear nuevo AbortController
      abortControllerRef.current = new AbortController();

      // Resetear estado si es necesario
      if (resetOnNewRequest && attempt === 1) {
        safeSetState({
          data: null,
          error: null,
          success: false
        });
      }

      // Establecer estado de carga
      safeSetState({ loading: true });

      // Ejecutar la llamada a la API
      const result = await apiCall();

      // Verificar si el componente sigue montado
      if (!mountedRef.current) {
        return null;
      }

      // Actualizar estado con éxito
      safeSetState({
        data: result,
        loading: false,
        error: null,
        success: true
      });

      return result;
    } catch (error: any) {
      // Verificar si el componente sigue montado
      if (!mountedRef.current) {
        return null;
      }

      // Ignorar errores de cancelación
      if (error.name === 'AbortError' || error.message?.includes('canceled')) {
        return null;
      }

      // Convertir error al formato estándar
      const apiError: ApiError = {
        message: error.message || 'Error desconocido',
        status: error.status || 0,
        code: error.code || 'UNKNOWN_ERROR',
        details: error.details || error
      };

      // Intentar reintento si está configurado
      if (attempt <= retryAttempts && apiError.status && apiError.status >= 500) {
        console.warn(`Reintentando petición (intento ${attempt}/${retryAttempts})...`);
        
        // Esperar antes del reintento
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        
        return executeApiCall(apiCall, attempt + 1);
      }

      // Actualizar estado con error
      safeSetState({
        loading: false,
        error: apiError,
        success: false
      });

      console.error('Error en llamada API:', apiError);
      return null;
    }
  }, [resetOnNewRequest, retryAttempts, retryDelay, safeSetState]);

  /**
   * Función principal para ejecutar llamadas API con debounce opcional
   */
  const execute = useCallback((apiCall: () => Promise<T>): Promise<T | null> => {
    // Guardar referencia para retry
    lastApiCallRef.current = apiCall;

    return new Promise((resolve) => {
      // Limpiar timeout anterior si existe
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      // Aplicar debounce si está configurado
      if (debounceMs > 0) {
        debounceTimeoutRef.current = setTimeout(async () => {
          const result = await executeApiCall(apiCall);
          resolve(result);
        }, debounceMs);
      } else {
        executeApiCall(apiCall).then(resolve);
      }
    });
  }, [debounceMs, executeApiCall]);

  /**
   * Reintentar la última llamada API
   */
  const retry = useCallback((): Promise<T | null> => {
    if (lastApiCallRef.current) {
      return execute(lastApiCallRef.current);
    }
    console.warn('No hay llamada API previa para reintentar');
    return Promise.resolve(null);
  }, [execute]);

  /**
   * Resetear el estado a valores iniciales
   */
  const reset = useCallback(() => {
    // Cancelar petición en curso
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Limpiar timeout de debounce
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Resetear estado
    safeSetState({
      data: initialData,
      loading: false,
      error: null,
      success: false
    });

    // Limpiar referencia de última llamada
    lastApiCallRef.current = null;
  }, [initialData, safeSetState]);

  /**
   * Establecer datos manualmente
   */
  const setData = useCallback((data: T | null) => {
    safeSetState({
      data,
      error: null,
      success: data !== null
    });
  }, [safeSetState]);

  /**
   * Establecer error manualmente
   */
  const setError = useCallback((error: ApiError | null) => {
    safeSetState({
      error,
      loading: false,
      success: false
    });
  }, [safeSetState]);

  return {
    ...state,
    execute,
    reset,
    setData,
    setError,
    retry,
    isIdle: !state.loading && !state.error && !state.success
  };
}

/**
 * Hook simplificado para operaciones CRUD comunes
 */
export function useCrudState<T = any>(options: UseApiStateOptions = {}) {
  const createState = useApiState<T>(options);
  const updateState = useApiState<T>(options);
  const deleteState = useApiState<boolean>(options);
  const fetchState = useApiState<T[]>({ ...options, initialData: [] });

  const reset = useCallback(() => {
    createState.reset();
    updateState.reset();
    deleteState.reset();
    fetchState.reset();
  }, [createState, updateState, deleteState, fetchState]);

  return {
    create: createState,
    update: updateState,
    delete: deleteState,
    fetch: fetchState,
    reset,
    isLoading: createState.loading || updateState.loading || deleteState.loading || fetchState.loading,
    hasError: !!(createState.error || updateState.error || deleteState.error || fetchState.error)
  };
}

export default useApiState;