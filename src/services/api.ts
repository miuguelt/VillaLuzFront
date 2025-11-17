import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { getCookie } from '@/utils/cookieUtils'
import { getApiBaseURL } from '@/utils/envConfig';
import { getIndexedDBCache, setIndexedDBCache, startIndexedDBCacheCleanup } from '@/utils/indexedDBCache';

// ENV y configuración
const env: Record<string, any> = ((globalThis as any)?.['import']?.['meta']?.['env'])
  ?? ((typeof (globalThis as any).process !== 'undefined' ? ((globalThis as any).process as any).env : undefined) as any)
  ?? {};
const API_TIMEOUT = Number(env.VITE_API_TIMEOUT ?? 30000); // Increased from 10s to 30s
const REFRESH_TIMEOUT = Number(env.VITE_REFRESH_TIMEOUT ?? 15000); // Increased from 8s to 15s
// Mantener compatibilidad con VITE_FORCE_ABSOLUTE_BASE_URL pero preferir getApiBaseURL()
const DEBUG_LOG = String(env.VITE_DEBUG_MODE ?? '').toLowerCase() === 'true';
const AUTH_STORAGE_KEY = env.VITE_AUTH_STORAGE_KEY || 'finca_access_token';
const HTTP_CACHE_TTL = Number(env.VITE_HTTP_CACHE_TTL ?? 20000); // TTL por defecto 20s
const LOGIN_REDIRECT_PATH = env.VITE_LOGIN_PATH || '/login';
const SESSION_STORAGE_KEYS = [AUTH_STORAGE_KEY, 'access_token'];
const SESSION_COOKIE_CANDIDATES = ['access_token_cookie', 'access_token', 'csrf_access_token', 'csrf_refresh_token'];

function hasClientSession(): boolean {
  try {
    if (typeof localStorage !== 'undefined') {
      for (const key of SESSION_STORAGE_KEYS) {
        const value = localStorage.getItem(key);
        if (value && value.trim().length) return true;
      }
    }
  } catch { /* noop */ }
  try {
    if (typeof sessionStorage !== 'undefined') {
      for (const key of SESSION_STORAGE_KEYS) {
        const value = sessionStorage.getItem(key);
        if (value && value.trim().length) return true;
      }
    }
  } catch { /* noop */ }
  try {
    return SESSION_COOKIE_CANDIDATES.some((name) => {
      try { return !!getCookie(name); } catch { return false; }
    });
  } catch {
    return false;
  }
}

const logDebugError = (prefix: string, error: unknown) => {
  if (DEBUG_LOG) console.warn(prefix, error);
};

// Bases de URL: usar helper que decide según entorno y variables
const baseURL = getApiBaseURL();
const refreshBaseURL = getApiBaseURL();

// Cliente principal con credenciales habilitadas (cookies)
const api: AxiosInstance = axios.create({
  baseURL,
  timeout: API_TIMEOUT,
  withCredentials: true,
});

// Cliente para refresh (sin Authorization explícito)
export const refreshClient: AxiosInstance = axios.create({
  baseURL: refreshBaseURL,
  timeout: REFRESH_TIMEOUT,
  withCredentials: true,
});

// -------------------------------------------------------------
// Gate global de autenticación
// Objetivo: para endpoints protegidos, esperar a que /auth/me termine
// antes de enviar la solicitud, evitando condiciones de carrera en arranque.
// -------------------------------------------------------------

// Estados del gate
let authGateState: 'unknown' | 'checking' | 'ready' | 'unauthenticated' = 'unknown';
let authGatePromise: Promise<void> | null = null;

// Normaliza URL relativa y la pasa a minúsculas sin barra inicial
function normalizePath(url?: string): string {
  if (!url) return '';
  try {
    let u = String(url).trim();
    // Quitar querystring y hash si vienen incrustados
    const q = u.indexOf('?');
    if (q >= 0) u = u.slice(0, q);
    const h = u.indexOf('#');
    if (h >= 0) u = u.slice(0, h);
    // Quitar base /api/vX si el caller la incluye
    u = u.replace(/^https?:\/\/.+?(\/api\/v\d+\/)/i, '');
    u = u.replace(/^\/?/, '');
    return u.toLowerCase();
  } catch {
    return '';
  }
}

// Determina si el endpoint es público y no requiere gate
function isPublicEndpoint(path: string): boolean {
  // Endpoints de auth y health son públicos para el gate
  if (!path) return true;
  if (path.startsWith('auth/')) return true; // login, logout, refresh, me
  if (path === 'health' || path.endsWith('/health')) return true;
  return false;
}

// Debe saltarse el gate para esta request (bandera interna o público)
function shouldSkipGate(config: InternalAxiosRequestConfig): boolean {
  // Bandera interna para evitar recursión
  if ((config as any).__skipAuthGate) return true;
  // Métodos que no deben bloquear
  const method = String(config.method || 'get').toLowerCase();
  if (method === 'options' || method === 'head') return true;
  // URLs absolutas externas
  if (config.url && /^(https?:)?\/\//i.test(String(config.url))) return true;
  const path = normalizePath(config.url as any);
  return isPublicEndpoint(path);
}

// Asegura que la sesión esté lista llamando a /auth/me una sola vez (single-flight)
async function ensureAuthReady(): Promise<void> {
  if (authGateState === 'ready' || authGateState === 'unauthenticated') return;
  if (authGatePromise) return authGatePromise;

  authGateState = 'checking';
  authGatePromise = (async () => {
    try {
      if (DEBUG_LOG) console.log('[api][gate] Iniciando comprobación /auth/me ...');
      // Usar refreshClient para evitar interceptores del propio api y posibles recursiones
      let resp: any;
      try {
        resp = await refreshClient.get('/auth/me', {
          headers: { 'Accept': 'application/json' },
        });
      } catch (e: any) {
        const st = e?.response?.status ?? 0;
        if (DEBUG_LOG) console.warn('[api][gate] /auth/me error inicial:', st, e?.message);
        if (st === 401) {
          // Intentar refresh y reintentar /auth/me una vez
          try {
            if (DEBUG_LOG) console.log('[api][gate] 401 en /auth/me, intentando /auth/refresh ...');
            await refreshClient.post('/auth/refresh');
            if (DEBUG_LOG) console.log('[api][gate] Refresh OK. Reintentando /auth/me ...');
            resp = await refreshClient.get('/auth/me', { headers: { 'Accept': 'application/json' } });
          } catch (e2: any) {
            const st2 = e2?.response?.status ?? 0;
            if (DEBUG_LOG) console.warn('[api][gate] Refresh + /auth/me reintento falló:', st2, e2?.message);
            throw e2; // Propagar para evaluar estado abajo
          }
        } else {
          throw e; // Otro error: propagar
        }
      }
      const st = resp?.status ?? 0;
      if (DEBUG_LOG) console.log('[api][gate] /auth/me status:', st);
      if (st === 200) authGateState = 'ready';
      else if (st === 401) authGateState = 'unauthenticated';
      else if (st === 429) authGateState = 'ready'; // no bloquear por rate limit
      else authGateState = 'ready';
    } catch (e: any) {
      const st = e?.response?.status ?? 0;
      if (DEBUG_LOG) console.warn('[api][gate] /auth/me error tras reintentos:', st, e?.message);
      if (st === 401) authGateState = 'unauthenticated';
      else authGateState = 'ready'; // No bloquear en errores de red
    } finally {
      if (DEBUG_LOG) console.log('[api][gate] Finalizado. Estado =', authGateState);
      authGatePromise = null;
    }
  })();

  return authGatePromise;
}

// Interceptor de solicitud: añadir encabezado CSRF adecuado y aplicar gate
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      // Gate global: si el endpoint requiere autenticación, esperar a /auth/me
      if (!shouldSkipGate(config)) {
        await ensureAuthReady();
      }

      const path = normalizePath(config.url as any);

      // Log de depuración para requests a /animals
      if (path.startsWith('animals') && config.method?.toLowerCase() === 'post') {
        console.log('[API] 🔍 POST /animals - Request data:', JSON.stringify(config.data, null, 2));
      }

      if ((config as any).headers) {
        (config as any).headers['Accept'] = 'application/json';

        // Solo establecer Content-Type si no es FormData
        // FormData necesita que el navegador establezca el Content-Type con el boundary correcto
        const isFormData = config.data instanceof FormData;
        if (!isFormData) {
          (config as any).headers['Content-Type'] = 'application/json';
        }

        const path = normalizePath(config.url as any);
        const isAuthLogin = path.startsWith('auth/login');
        const isAuthRefresh = path.startsWith('auth/refresh');
        // Añadir Authorization Bearer si existe token y no es login/refresh
        try {
          if (!isAuthLogin && !isAuthRefresh && typeof localStorage !== 'undefined') {
            const tok = localStorage.getItem(AUTH_STORAGE_KEY);
            if (tok && tok.length) {
              (config as any).headers['Authorization'] = `Bearer ${tok}`;
            }
          }
        } catch (storageError) {
          logDebugError('[api] No se pudo leer token desde localStorage', storageError);
        }
        // Añadir CSRF desde cookies legibles según el endpoint
        const isAuthMe = path.startsWith('auth/me');
        const isProtected = !isPublicEndpoint(path) || isAuthMe;
        if (isAuthRefresh) {
          const csrfRefresh = getCookie('csrf_refresh_token');
          if (csrfRefresh) {
            (config as any).headers['X-CSRF-Token'] = csrfRefresh;
            (config as any).headers['X-CSRF-TOKEN'] = csrfRefresh; // compat
          }
          if (DEBUG_LOG) {
            console.debug('[api][req] /auth/refresh CSRF refresh presente:', !!csrfRefresh, 'auth header:', !!(config as any).headers['Authorization']);
          }
        } else if (isProtected) {
          const csrfAccess = getCookie('csrf_access_token');
          if (csrfAccess) {
            (config as any).headers['X-CSRF-Token'] = csrfAccess;
            (config as any).headers['X-CSRF-TOKEN'] = csrfAccess; // compat
          }
          if (DEBUG_LOG) {
            console.debug('[api][req]', path, 'CSRF access presente:', !!csrfAccess, 'auth header:', !!(config as any).headers['Authorization']);
          }
        } else if (DEBUG_LOG) {
          console.debug('[api][req] endpoint público/skip gate:', path);
        }
      }
    } catch (e) {
      if (DEBUG_LOG) console.warn('[api] Error en interceptor de solicitud:', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de solicitud para refreshClient: asegura CSRF en /auth/refresh y /auth/me
refreshClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    try {
      const path = normalizePath(config.url as any);
      if ((config as any).headers) {
        (config as any).headers['Accept'] = 'application/json';

        // Solo establecer Content-Type si no es FormData
        const isFormData = config.data instanceof FormData;
        if (!isFormData) {
          (config as any).headers['Content-Type'] = 'application/json';
        }
        // Añadir Authorization si no es /auth/refresh; este endpoint usa solo cookies
        try {
          if (typeof localStorage !== 'undefined') {
            const tok = localStorage.getItem(AUTH_STORAGE_KEY);
            if (tok && tok.length) {
              const shouldAttachAuth = !path.startsWith('auth/refresh');
              if (shouldAttachAuth) {
                (config as any).headers['Authorization'] = `Bearer ${tok}`;
              } else if ((config as any).headers['Authorization']) {
                delete (config as any).headers['Authorization'];
              }
            }
          }
        } catch (storageError) {
          logDebugError('[refreshClient] No se pudo leer token desde localStorage', storageError);
        }
        if (path.startsWith('auth/refresh') && (config as any).headers['Authorization']) {
          delete (config as any).headers['Authorization'];
        }
        if (path.startsWith('auth/refresh')) {
          const csrfRefresh = getCookie('csrf_refresh_token');
          if (csrfRefresh) {
            (config as any).headers['X-CSRF-Token'] = csrfRefresh;
            (config as any).headers['X-CSRF-TOKEN'] = csrfRefresh;
          }
        } else if (path.startsWith('auth/me')) {
          const csrfAccess = getCookie('csrf_access_token');
          if (csrfAccess) {
            (config as any).headers['X-CSRF-Token'] = csrfAccess;
            (config as any).headers['X-CSRF-TOKEN'] = csrfAccess;
          }
        }
      }
    } catch (e) {
      if (DEBUG_LOG) console.warn('[refreshClient] Error en interceptor de solicitud:', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// --- Mutex global para refresh y detectores de error ---
let refreshPromise: Promise<void> | null = null;
let forceLogoutPromise: Promise<void> | null = null;

function isTokenExpired(err: any): boolean {
  const status = err?.response?.status ?? err?.status;
  const data = err?.response?.data ?? err?.data;
  const code = (data?.code || data?.error || data?.detail || data?.message || '').toString().toUpperCase();
  return status === 401 && (code.includes('TOKEN_EXPIRED') || code.includes('EXPIRED'));
}

function extractAuthErrorDetails(err: any) {
  const payload = err?.response?.data;
  const errorBlock = payload?.error || payload || {};
  const details = errorBlock?.details || errorBlock?.detail || {};
  const code = (errorBlock?.code || errorBlock?.error || payload?.code || '').toString().toUpperCase();
  const exceptionClass = (details?.exception_class || details?.exceptionClass || '').toString();
  const clientAction = (details?.client_action || details?.clientAction || '').toString();
  const logoutUrl = details?.logout_url || details?.logoutUrl;
  const loginUrl = details?.login_url || details?.loginUrl;
  return { code, exceptionClass, clientAction, logoutUrl, loginUrl, rawDetails: details };
}

function shouldForceLogout(err: any) {
  const { code, exceptionClass, clientAction, logoutUrl, loginUrl, rawDetails } = extractAuthErrorDetails(err);
  const exceptionIsExpired = exceptionClass.toLowerCase().includes('expired');
  const needsClear = clientAction === 'CLEAR_AUTH_AND_RELOGIN';
  const codeIndicatesExpiry = code === 'TOKEN_EXPIRED' || code === 'TOKEN_EXPIRED_ERROR';
  return {
    shouldForce: codeIndicatesExpiry || exceptionIsExpired || needsClear,
    logoutUrl,
    loginUrl,
    details: rawDetails,
  };
}

async function callBackendLogout(logoutUrl?: string) {
  const target = logoutUrl && /^https?:\/\//i.test(logoutUrl)
    ? logoutUrl
    : `${baseURL?.replace(/\/$/, '') || ''}${logoutUrl
        ? logoutUrl.startsWith('/') ? logoutUrl : `/${logoutUrl}`
        : '/auth/logout'}`;
  try {
    await fetch(target, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Accept': 'application/json' },
    });
  } catch (err) {
    if (DEBUG_LOG) console.warn('[api] Logout fetch falló:', err);
  }
}

function clearClientTokens() {
  const keys = [AUTH_STORAGE_KEY, 'access_token'];
  for (const key of keys) {
    try {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
    } catch (storageError) {
      logDebugError('[api] No se pudo limpiar localStorage', storageError);
    }
    try {
      if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(key);
    } catch (storageError) {
      logDebugError('[api] No se pudo limpiar sessionStorage', storageError);
    }
  }
}

async function forceClientLogout(reason = 'expired', options?: { logoutUrl?: string; loginUrl?: string }) {
  if (forceLogoutPromise) return forceLogoutPromise;
  forceLogoutPromise = (async () => {
    clearClientTokens();
    await callBackendLogout(options?.logoutUrl);
    if (typeof window !== 'undefined') {
      const loginPath = options?.loginUrl || LOGIN_REDIRECT_PATH || '/login';
      const redirectToLogin = () => {
        try {
          const loginUrl = new URL(loginPath, window.location.origin);
          loginUrl.searchParams.set('reason', reason);
          const target = loginUrl.toString();
          const current = new URL(window.location.href);
          const samePath = current.pathname === loginUrl.pathname;
          const sameSearch = current.search === loginUrl.search;

          if (samePath) {
            if (!sameSearch) {
              // Only query differs; update it without triggering a reload
              window.history.replaceState(window.history.state, '', target);
            }
            // Already on target URL – avoid forcing another reload loop
            return;
          }

          window.location.assign(target);
        } catch (urlError) {
          logDebugError('[api] No se pudo construir URL de login', urlError);
          const hasQuery = loginPath.includes('?');
          const separator = hasQuery ? '&' : '?';
          const target = `${loginPath}${separator}reason=${encodeURIComponent(reason)}`;
          const currentPathWithQuery = `${window.location.pathname}${window.location.search}`;
          if (currentPathWithQuery === target) {
            window.history.replaceState(window.history.state, '', target);
            return;
          }
          window.location.assign(target);
        }
      };

      redirectToLogin();
    }
  })().finally(() => {
    // En tests o entornos sin navegación, permitir reintentos manuales
    if (typeof window === 'undefined') {
      forceLogoutPromise = null;
    }
  });
  return forceLogoutPromise;
}

function isCsrfError(err: any): boolean {
  const status = err?.response?.status ?? err?.status;
  const data = err?.response?.data ?? err?.data;
  const text = (data?.code || data?.error || data?.detail || data?.message || '').toString();
  const upper = text.toUpperCase();
  // Algunos backends reportan 400/403 para CSRF faltante; contemplar 401/400/403 y mensajes con "CSRF"
  return (status === 401 || status === 400 || status === 403) && upper.includes('CSRF');
}

async function performRefresh(options?: { retryOnCsrfError?: boolean }): Promise<void> {
  if (refreshPromise) return refreshPromise;
  const doRefresh = async () => {
    const csrfRefresh = getCookie('csrf_refresh_token');
    const headers: Record<string, string> = { 'Accept': 'application/json', 'Content-Type': 'application/json' };
    if (csrfRefresh) {
      headers['X-CSRF-Token'] = csrfRefresh;
      headers['X-CSRF-TOKEN'] = csrfRefresh;
    }
    try {
      await refreshClient.post('/auth/refresh', null, { headers });
    } catch (err: any) {
      if (options?.retryOnCsrfError && isCsrfError(err)) {
        // Releer cookie y reintentar una sola vez
        const retryCsrf = getCookie('csrf_refresh_token');
        const retryHeaders: Record<string, string> = { 'Accept': 'application/json', 'Content-Type': 'application/json' };
        if (retryCsrf) {
          retryHeaders['X-CSRF-Token'] = retryCsrf;
          retryHeaders['X-CSRF-TOKEN'] = retryCsrf;
        }
        await refreshClient.post('/auth/refresh', null, { headers: retryHeaders });
      } else {
        throw err;
      }
    }
  };
  refreshPromise = doRefresh().finally(() => { refreshPromise = null; });
  return refreshPromise;
}

// Interceptor de respuesta: manejar refresh, ETags y reintentos con mutex
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Leer y exponer headers PWA relevantes
    if (DEBUG_LOG && response.headers) {
      const pwHeaders = {
        etag: response.headers['etag'] || response.headers['ETag'],
        lastModified: response.headers['last-modified'] || response.headers['Last-Modified'],
        cacheControl: response.headers['cache-control'] || response.headers['Cache-Control'],
        cacheStrategy: response.headers['x-cache-strategy'] || response.headers['X-Cache-Strategy'],
        totalCount: response.headers['x-total-count'] || response.headers['X-Total-Count'],
        hasMore: response.headers['x-has-more'] || response.headers['X-Has-More'],
      };

      // Log solo si hay headers PWA presentes
      const hasPWAHeaders = Object.values(pwHeaders).some(v => v !== undefined);
      if (hasPWAHeaders) {
        const path = normalizePath(response.config?.url as any);
        console.debug(`[api][PWA] ${path} headers:`, pwHeaders);
      }
    }

    // Confiar en cookies HttpOnly; devolver respuesta
    return response;
  },
  async (error: any) => {
    const originalRequest = error?.config || {};
    const status = error?.response?.status;
    const path = normalizePath(originalRequest?.url as any);

    // Aviso global: límite de solicitudes excedido (HTTP 429)
    if (status === 429) {
      try {
        const detail = {
          event: 'RATE_LIMIT_EXCEEDED',
          endpoint: path,
          status,
          message: error?.response?.data?.message || error?.message || 'Demasiadas solicitudes',
          timestamp: new Date().toISOString(),
        };
        if (typeof window !== 'undefined' && 'dispatchEvent' in window) {
          window.dispatchEvent(new CustomEvent('rate-limit-exceeded', { detail }));
        }
        // Registrar ventana de backoff si el servidor sugiere Retry-After / RateLimit-Reset
        try {
          const headers = error?.response?.headers ?? {} as Record<string, any>;
          const retryAfter = headers['retry-after'] ?? headers['Retry-After'];
          const rlReset = headers['ratelimit-reset'] ?? headers['RateLimit-Reset'];
          let delayMs = 30000; // 30s por defecto
          const toInt = (v: any) => {
            if (v == null) return undefined;
            const s = Array.isArray(v) ? v[0] : v;
            const n = parseInt(String(s), 10);
            return Number.isNaN(n) ? undefined : n;
          };
          const retrySecs = toInt(retryAfter);
          if (retrySecs != null) {
            delayMs = Math.max(retrySecs * 1000, 5000);
          } else {
            const resetSecs = toInt(rlReset);
            if (resetSecs != null) {
              const nowSecs = Math.floor(Date.now() / 1000);
              delayMs = Math.max((resetSecs - nowSecs) * 1000, 5000);
            }
          }
          // rateLimitBackoff se declara más abajo; el closure lo resolverá a runtime
          try {
            rateLimitBackoff.set(path, Date.now() + delayMs);
          } catch (backoffError) {
            logDebugError('[api] No se pudo registrar backoff de rate limit', backoffError);
          }
        } catch (rlError) {
          logDebugError('[api] No se pudo procesar cabeceras de rate limit', rlError);
        }
      } catch (notifyError) {
        logDebugError('[api] No se pudo despachar evento de rate limit', notifyError);
      }
    }

    // Evitar recursión
    if (!originalRequest._retry) originalRequest._retry = false;

    // No intentar refresh en login o en el propio refresh
    const isAuthLogin = path.startsWith('auth/login');
    const isAuthRefresh = path.startsWith('auth/refresh');
    if (status === 401 && (isAuthLogin || isAuthRefresh)) {
      if (DEBUG_LOG) console.log('[api] 401 en ruta de auth sin refresh:', path);
      return Promise.reject(error);
    }

    if (status === 401) {
      const tokenStatus = shouldForceLogout(error);
      const hasStoredAuth = hasClientSession();
      const isAuthMeRequest = path.startsWith('auth/me');
      if (tokenStatus.shouldForce && hasStoredAuth && !isAuthMeRequest) {
        await forceClientLogout('expired', { logoutUrl: tokenStatus.logoutUrl, loginUrl: tokenStatus.loginUrl });
        return Promise.reject(error);
      }
      try {
        if (DEBUG_LOG) {
          const hasAccess = !!getCookie('csrf_access_token');
          const hasRefresh = !!getCookie('csrf_refresh_token');
          console.warn('[api][resp] 401 en', path, 'cookies -> access:', hasAccess, 'refresh:', hasRefresh, 'retryFlag:', !!originalRequest._retry);
        }
        if (!originalRequest._retry || isTokenExpired(error) || isCsrfError(error)) {
          originalRequest._retry = true;
          await performRefresh({ retryOnCsrfError: true });
          if (DEBUG_LOG) console.log('[api] Refresh OK. Reintentando:', path);
          return api(originalRequest);
        }
      } catch (refreshErr) {
        if (DEBUG_LOG) console.error('[api] Falló el refresh:', refreshErr);
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

// --- COALESCING de GET global (single-flight) para igualar comportamiento dev/prod ---
// Evita enviar múltiples GET idénticos (método+URL+params) simultáneamente y comparte la misma promesa
const inflightGet = new Map<string, Promise<any>>();
const rateLimitBackoff = new Map<string, number>();
const stableStringify = (obj: any) => {
  if (!obj || typeof obj !== 'object') return '';
  const keys = Object.keys(obj).sort();
  const normalized: Record<string, any> = {};
  for (const k of keys) normalized[k] = obj[k];
  return JSON.stringify(normalized);
};
const buildGetKey = (url: string, config?: any) => {
  const base = api.defaults.baseURL || '';
  const full = url.startsWith('/') ? `${base}${url}` : `${base}/${url}`;
  const paramsStr = stableStringify(config?.params);
  return `GET ${full}?${paramsStr}`;
};

// Iniciar limpieza automática de cache IndexedDB al importar este módulo
if (typeof window !== 'undefined') {
  startIndexedDBCacheCleanup(300000); // Cada 5 minutos
}

// Cache dual: memoria (rápido) + IndexedDB (persistente)
const memoryCache = new Map<string, { data: any; expiry: number }>();

/**
 * Lee del cache (memoria primero, luego IndexedDB)
 */
async function readCache(key: string): Promise<any | null> {
  const cacheKey = `http-cache:${key}`;

  // 1. Intentar memoria primero (ultra rápido)
  const memEntry = memoryCache.get(cacheKey);
  if (memEntry && Date.now() <= memEntry.expiry) {
    return memEntry.data;
  }

  // 2. Fallback a IndexedDB (persistente entre sesiones)
  try {
    const idbData = await getIndexedDBCache<any>(cacheKey);
    if (idbData) {
      // Hidratar memoria con dato de IndexedDB
      memoryCache.set(cacheKey, {
        data: idbData,
        expiry: Date.now() + HTTP_CACHE_TTL,
      });
      return idbData;
    }
  } catch (error) {
    console.warn('[api] Error leyendo cache IndexedDB:', error);
  }

  return null;
}

/**
 * Escribe en cache (memoria + IndexedDB)
 */
function writeCache(key: string, data: any, ttlMs: number = HTTP_CACHE_TTL): void {
  const cacheKey = `http-cache:${key}`;
  const expiry = Date.now() + Math.max(1000, ttlMs);

  // 1. Escribir en memoria (sincrónico, rápido)
  memoryCache.set(cacheKey, { data, expiry });

  // 2. Escribir en IndexedDB (asíncrono, persistente) en background
  void setIndexedDBCache(cacheKey, data, ttlMs).catch(err => {
    console.warn('[api] Error escribiendo cache IndexedDB:', err);
  });
}

const originalGet = api.get.bind(api);
(api as any).get = async (url: string, config?: any) => {
  // Si se proporcionó cancelToken o signal, no coalescar para respetar cancelaciones de componente
  const hasCancel = !!(config && (config.cancelToken || config.signal));
  if (hasCancel) {
    return originalGet(url, config);
  }
  const key = buildGetKey(url, config);

  // Si existe backoff activo por rate limit, servir caché si está disponible
  try {
    const path = normalizePath(url as any);
    const until = rateLimitBackoff.get(path) || 0;
    if (until && Date.now() < until) {
      const cachedBackoff = await readCache(key);
      if (cachedBackoff) {
        if (DEBUG_LOG) console.log('[api] Cache durante backoff:', key);
        return { data: cachedBackoff, status: 200, statusText: 'OK', headers: {}, config } as AxiosResponse;
      }
    }
  } catch (backoffError) {
    logDebugError('[api] No se pudo evaluar backoff activo', backoffError);
  }

  // Cache fresco primero (ahora asíncrono por IndexedDB)
  const cached = await readCache(key);
  if (cached) {
    if (DEBUG_LOG) console.log('[api] Cache HIT:', key);
    return { data: cached, status: 200, statusText: 'OK', headers: {}, config } as AxiosResponse;
  }

  const existing = inflightGet.get(key);
  if (existing) {
    if (DEBUG_LOG) console.log('[api] Coalesced GET:', key);
    return existing;
  }

  const p = originalGet(url, config).then((resp: AxiosResponse) => {
    // Guardar en caché la respuesta (ahora en IndexedDB + memoria)
    try {
      writeCache(key, resp.data, HTTP_CACHE_TTL);
    } catch (cacheError) {
      logDebugError('[api] No se pudo almacenar respuesta en caché', cacheError);
    }
    return resp;
  });
  inflightGet.set(key, p);
  const clear = () => inflightGet.delete(key);
  p.then(clear, clear);
  return p;
};

export default api;
export { unwrapApi } from '@/utils/apiUnwrap';
