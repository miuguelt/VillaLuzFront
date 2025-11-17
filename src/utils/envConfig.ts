/**
 * Configuración de URLs y entorno desde variables de entorno
 * Detecta automáticamente el modo (producción/desarrollo) y configura las URLs apropiadas
 */

// Tipos de entorno
export type Environment = 'development' | 'production';

// Unificar acceso a variables de entorno usando el helper que funciona en Vite/Browser/Jest/Node
import { VITE_ENV, getRuntimeEnv } from './viteEnv';

// Safe ENV accessor: usa VITE_ENV (inyectado por Vite o polyfilled en tests)
const ENV: Record<string, any> = VITE_ENV;

// Detectar el entorno actual
export const getEnvironment = (): Environment => {
  // Usar VITE_RUNTIME_ENV si está disponible; fallback a MODE/NODE_ENV
  const runtime = getRuntimeEnv();
  return runtime === 'production' ? 'production' : 'development';
};

// Verificar si estamos en modo desarrollo
export const isDevelopment = (): boolean => {
  return getEnvironment() === 'development';
};

// Verificar si estamos en modo producción
export const isProduction = (): boolean => {
  return getEnvironment() === 'production';
};

// URL base del backend según el entorno
export const getBackendBaseURL = (): string => {
  const env = getEnvironment();
  
  // Si hay variable de entorno específica, usarla
  if (ENV.VITE_API_BASE_URL) {
    return ENV.VITE_API_BASE_URL;
  }

  // Heurística para bundles de producción/preview servidos localmente:
  // Si el frontend se sirve desde localhost/127.0.0.1/::1 y NO hay VITE_API_BASE_URL,
  // asumimos que el backend local está en 127.0.0.1:8081 para evitar que apunte a producción.
  try {
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
    if (isLocalHost && isProduction()) {
      return 'http://127.0.0.1:8081';
    }
  } catch {
    // Ignorar errores de acceso a window en entornos SSR/tests
  }
  
  // URLs por defecto según el entorno
  switch (env) {
    case 'production':
      // Backend público actual en producción
      return 'https://finca.enlinea.sbs';
    case 'development':
    default:
      return 'http://127.0.0.1:8081';
  }
};

// URL completa de la API (backend + /api/v1)
export const getApiBaseURL = (): string => {
  // If running in development and no explicit VITE_API_BASE_URL is provided,
  // return a relative path so the Vite dev server proxy can forward requests
  // to the backend and avoid CORS issues.
  if (isDevelopment() && !ENV.VITE_API_BASE_URL) {
    return '/api/v1';
  }

  const backendUrl = getBackendBaseURL();

  // Si la URL base ya incluye /api/v1, no lo añadimos de nuevo
  if (backendUrl.endsWith('/api/v1')) {
    return backendUrl;
  }

  return `${backendUrl}/api/v1`;
};

// URL de documentación del backend
export const getBackendDocsURL = (): string => {
  // Si hay variable de entorno específica, usarla
  if (ENV.VITE_BACKEND_DOCS_URL) {
    return ENV.VITE_BACKEND_DOCS_URL;
  }
  
  // Generar URL de docs basada en el backend URL
  const backendUrl = getBackendBaseURL();
  return `${backendUrl}/docs`;
};

// URL de health check del backend
export const getBackendHealthURL = (): string => {
  const backendUrl = getBackendBaseURL();
  return `${backendUrl}/health`;
};

// URL del frontend según el entorno
export const getFrontendURL = (): string => {
  const env = getEnvironment();
  
  // Si hay variable de entorno específica, usarla
  if (ENV.VITE_FRONTEND_URL) {
    return ENV.VITE_FRONTEND_URL;
  }
  
  // URLs por defecto según el entorno
  switch (env) {
    case 'production':
      // Frontend público actual en producción
      return 'https://villaluz.enlinea.sbs';
    case 'development':
    default:
      return 'https://localhost:5175';
  }
};

// Configuración de cookies según el entorno
export const getCookieConfig = () => {
  const env = getEnvironment();
  
  return {
    secure: env === 'production',
    sameSite: 'none' as const,
    // Dominio base actualizado para producción
    domain: env === 'production' ? '.enlinea.sbs' : undefined
  };
};

// Configuración de logging según el entorno
export const getLogLevel = (): 'debug' | 'info' | 'warn' | 'error' => {
  const env = getEnvironment();
  
  switch (env) {
    case 'development':
      return 'debug';
    case 'production':
    default:
      return 'warn';
  }
};

// Información del entorno para debugging
export const getEnvironmentInfo = () => {
  return {
    environment: getEnvironment(),
    isDevelopment: isDevelopment(),
    isProduction: isProduction(),
    urls: {
      backend: getBackendBaseURL(),
      frontend: getFrontendURL(),
      api: getApiBaseURL(),
      docs: getBackendDocsURL(),
      health: getBackendHealthURL()
    },
    logLevel: getLogLevel(),
    cookieConfig: getCookieConfig(),
    variables: {
      // VITE_NODE_ENV eliminado: ya no es necesario para detectar entorno
      NODE_ENV: ENV.NODE_ENV,
      MODE: ENV.MODE,
      DEV: ENV.DEV,
      PROD: ENV.PROD,
      VITE_RUNTIME_ENV: ENV.VITE_RUNTIME_ENV,
      VITE_API_BASE_URL: ENV.VITE_API_BASE_URL,
      VITE_FRONTEND_URL: ENV.VITE_FRONTEND_URL,
      VITE_BACKEND_DOCS_URL: ENV.VITE_BACKEND_DOCS_URL
    }
  };
};
