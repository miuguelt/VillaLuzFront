import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { getCookie } from '@/shared/utils/cookieUtils'
import { getApiBaseURL, getBackendBaseURL } from '@/shared/utils/envConfig';
import { getIndexedDBCache, setIndexedDBCache, startIndexedDBCacheCleanup } from '@/shared/api/cache/indexedDBCache';
import { shouldRefreshToken, isValidTokenFormat } from '@/shared/utils/jwtUtils';
import { extractJWT } from '@/shared/utils/tokenUtils';
import { toast } from "@/shared/hooks/use-toast"
import { getEnvVar } from '@/shared/utils/viteEnv'

const envStr = (key: string, fallback = ''): string => String(getEnvVar(key, fallback) ?? fallback);

const API_TIMEOUT = Number(envStr('VITE_API_TIMEOUT', '30000'));
const REFRESH_TIMEOUT = Number(envStr('VITE_REFRESH_TIMEOUT', '15000'));
// Mantener compatibilidad con VITE_FORCE_ABSOLUTE_BASE_URL pero preferir getApiBaseURL()
// Mantener compatibilidad con VITE_FORCE_ABSOLUTE_BASE_URL pero preferir getApiBaseURL()
const DEBUG_LOG = envStr('VITE_DEBUG_MODE', '').toLowerCase() === 'true';
const AUTH_STORAGE_KEY = envStr('VITE_AUTH_STORAGE_KEY', 'finca_access_token');
// Best practice: prefer cookie-based auth (HttpOnly) over storing bearer tokens in web storage.
// If your backend still requires Authorization: Bearer, set VITE_USE_BEARER_AUTH=true explicitly.
const USE_BEARER_AUTH = envStr('VITE_USE_BEARER_AUTH', '').toLowerCase() === 'true';
const HTTP_CACHE_TTL = Number(envStr('VITE_HTTP_CACHE_TTL', '20000')); // TTL por defecto 20s
const LOGIN_REDIRECT_PATH = envStr('VITE_LOGIN_PATH', '/login');
const SESSION_STORAGE_KEYS = [AUTH_STORAGE_KEY, 'access_token'];
const SESSION_COOKIE_CANDIDATES = ['access_token_cookie', 'access_token', 'csrf_access_token', 'csrf_refresh_token'];
const REALTIME_TRANSPORT = envStr('VITE_REALTIME_TRANSPORT', '').toLowerCase();
const TIMEOUT_RETRY_ATTEMPTS = Number(envStr('VITE_TIMEOUT_RETRY_ATTEMPTS', '2'));
const TIMEOUT_RETRY_BASE_MS = Number(envStr('VITE_TIMEOUT_RETRY_BASE_MS', '400'));
const TIMEOUT_RETRY_MAX_MS = Number(envStr('VITE_TIMEOUT_RETRY_MAX_MS', '3000'));
const TOAST_DEDUP_MS = Number(envStr('VITE_TOAST_DEDUP_MS', '3000'));
const IDB_READ_ONLINE = envStr('VITE_IDB_READ_ONLINE', 'false').toLowerCase() === 'true';
const IDB_READ_TIMEOUT_MS = Math.max(0, Number(envStr('VITE_IDB_READ_TIMEOUT_MS', '50')) || 0);


const AUTH_SESSION_ACTIVE_KEY = 'auth:session_active';

const AUTH_STATE_KEYS = [
  'auth:user',
  'auth:recent_ts',
  'auth:user:cache',
  'auth:auto_login_block',
  AUTH_SESSION_ACTIVE_KEY,
  'dev_user_data_session',
  'finca_auth_login_path',
];

const toastRecent = new Map<string, number>();
const showToastOnce = (key: string, options: Parameters<typeof toast>[0]) => {
  const now = Date.now();
  const last = toastRecent.get(key) || 0;
  if (now - last < TOAST_DEDUP_MS) return;
  toastRecent.set(key, now);
  toast(options);
};

function hasClientSession(): boolean {
  // Enforce re-authentication after a browser restart: only consider a session valid if the app
  // explicitly marked it as active during this browser session.
  try {
    if (typeof sessionStorage !== 'undefined') {
      const active = sessionStorage.getItem(AUTH_SESSION_ACTIVE_KEY);
      if (active !== '1') return false;
    }
  } catch { /* noop */ }

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

// Helpers for consistent headers and token handling.
type MutableHeaders = Record<string, any>;
type AuthGateState = 'unknown' | 'checking' | 'ready' | 'unauthenticated';

const CSRF_HEADER_KEYS = ['X-CSRF-Token', 'X-CSRF-TOKEN'] as const;

const isFormDataPayload = (data: unknown): boolean =>
  typeof FormData !== 'undefined' && data instanceof FormData;

const ensureJsonHeaders = (headers: MutableHeaders, data: unknown): void => {
  headers['Accept'] = 'application/json';
  if (!isFormDataPayload(data)) {
    headers['Content-Type'] = 'application/json';
  }
};

const setCsrfHeaders = (headers: MutableHeaders, token?: string): void => {
  if (!token) return;
  for (const key of CSRF_HEADER_KEYS) {
    headers[key] = token;
  }
};

const readStoredToken = (): string | null => {
  if (!USE_BEARER_AUTH) return null;
  try {
    if (typeof localStorage !== 'undefined') {
      const tok = localStorage.getItem(AUTH_STORAGE_KEY);
      return tok && tok.trim().length ? tok : null;
    }
  } catch (storageError) {
    logDebugError('[api] No se pudo leer token desde localStorage', storageError);
  }
  return null;
};

const setAuthHeader = (headers: MutableHeaders, shouldAttach: boolean, token?: string | null): void => {
  if (!USE_BEARER_AUTH) {
    if (headers['Authorization']) delete headers['Authorization'];
    return;
  }
  if (shouldAttach && token) {
    headers['Authorization'] = `Bearer ${token}`;
    return;
  }
  if (!shouldAttach && headers['Authorization']) {
    delete headers['Authorization'];
  }
};

const persistStoredToken = (token: string): void => {
  if (!USE_BEARER_AUTH) return;
  try { if (typeof localStorage !== 'undefined') localStorage.setItem(AUTH_STORAGE_KEY, token); } catch { /* noop */ }
  try { if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(AUTH_STORAGE_KEY, token); } catch { /* noop */ }
};

// Bases de URL: usar helper que decide según entorno y variables
const baseURL = getApiBaseURL();
const refreshBaseURL = getApiBaseURL();

// Asegurar credenciales en todas las llamadas axios (cookies/CSRF)
axios.defaults.withCredentials = true;

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
let authGateState: AuthGateState = 'unknown';
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
  // Endpoint de registro público de usuarios
  if (
    path === 'users/public' ||
    path.endsWith('/users/public')
  ) {
    return true;
  }
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
      const isAuthLogin = path.startsWith('auth/login');
      const isAuthRefresh = path.startsWith('auth/refresh');
      const isAuthMe = path.startsWith('auth/me');

      if (refreshPromise && !isAuthRefresh) {
        await refreshPromise;
      }

      const skipAuthHeader =
        isPublicEndpoint(path) ||
        (config as any).skipAuth === true ||
        (config as any).disableAuth === true ||
        (config as any).__skipAuthHeader === true;

      // Log de depuración para requests a /animals
      if (path.startsWith('animals') && config.method?.toLowerCase() === 'post') {
        if (DEBUG_LOG) console.log('[API][debug] POST /animals payload:', JSON.stringify(config.data, null, 2));
      }

      const headers = (config as any).headers as MutableHeaders | undefined;
      if (headers) {
        ensureJsonHeaders(headers, config.data);

        const shouldAttachAuth = !skipAuthHeader && !isAuthLogin && !isAuthRefresh;
        // Añadir Authorization Bearer si existe token y no es login/refresh ni endpoint público/forzado
        const token = readStoredToken();
        setAuthHeader(headers, shouldAttachAuth, token);

        const hasAccessCsrf = !!getCookie('csrf_access_token');
        const hasRefreshCsrf = !!getCookie('csrf_refresh_token');
        const isProtected = (!isPublicEndpoint(path) || isAuthMe) && !skipAuthHeader;
        if (!isAuthLogin && !isAuthRefresh && !isAuthMe && isProtected) {
          if (USE_BEARER_AUTH && token && shouldRefreshToken(token)) {
            await performRefresh({ retryOnCsrfError: true });
          } else if (!hasAccessCsrf && hasRefreshCsrf) {
            await performRefresh({ retryOnCsrfError: true });
          }
        }

        // Añadir CSRF desde cookies legibles según el endpoint
        if (isAuthRefresh) {
          const csrfRefresh = getCookie('csrf_refresh_token') ?? undefined;
          setCsrfHeaders(headers, csrfRefresh);
          if (DEBUG_LOG) {
            console.debug('[api][req] /auth/refresh CSRF refresh presente:', !!csrfRefresh, 'auth header:', !!headers['Authorization']);
          }
        } else if (isProtected) {
          const csrfAccess = getCookie('csrf_access_token') ?? undefined;
          setCsrfHeaders(headers, csrfAccess);
          if (DEBUG_LOG) {
            console.debug('[api][req]', path, 'CSRF access presente:', !!csrfAccess, 'auth header:', !!headers['Authorization']);
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
      const skipAuthHeader =
        isPublicEndpoint(path) ||
        (config as any).skipAuth === true ||
        (config as any).disableAuth === true ||
        (config as any).__skipAuthHeader === true;
      const headers = (config as any).headers as MutableHeaders | undefined;
      if (headers) {
        ensureJsonHeaders(headers, config.data);

        // Añadir Authorization si no es /auth/refresh; este endpoint usa solo cookies
        const token = readStoredToken();
        const shouldAttachAuth = !skipAuthHeader && !path.startsWith('auth/refresh');
        setAuthHeader(headers, shouldAttachAuth, token);
        if (path.startsWith('auth/refresh') && headers['Authorization']) {
          delete headers['Authorization'];
        }
        if (path.startsWith('auth/refresh')) {
          const csrfRefresh = getCookie('csrf_refresh_token') ?? undefined;
          setCsrfHeaders(headers, csrfRefresh);
        } else if (path.startsWith('auth/me')) {
          const csrfAccess = getCookie('csrf_access_token') ?? undefined;
          setCsrfHeaders(headers, csrfAccess);
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
  const details = payload?.error?.details ?? payload?.error?.detail ?? payload?.details ?? payload?.detail ?? {};
  const code = (payload?.error?.code || payload?.code || payload?.error || '').toString().toUpperCase();
  const exceptionClass = (details?.exception_class || details?.exceptionClass || '').toString();
  const clientAction = (details?.client_action || details?.clientAction || '').toString();
  const logoutUrl = details?.logout_url || details?.logoutUrl;
  const loginUrl = details?.login_url || details?.loginUrl;
  const traceId = payload?.error?.trace_id || payload?.error?.traceId;
  return { code, exceptionClass, clientAction, logoutUrl, loginUrl, rawDetails: details, traceId };
}

function shouldForceLogout(err: any): {
  shouldForce: boolean;
  logoutUrl?: string;
  loginUrl?: string;
  details?: any;
  traceId?: string;
  shouldRefresh?: boolean;
} {
  const { code, exceptionClass, clientAction, logoutUrl, loginUrl, rawDetails, traceId } = extractAuthErrorDetails(err);

  // Logic based on Guide:
  // 1. Explicit instruction to clear auth
  const needsClear = clientAction === 'CLEAR_AUTH_AND_RELOGIN' ||
    rawDetails?.should_clear_auth === true ||
    rawDetails?.shouldClearAuth === true;

  // 2. Explicit instruction to refresh
  const needsRefresh = clientAction === 'ATTEMPT_REFRESH';

  // 3. Fallbacks based on error codes (heuristics)
  const codeIndicatesExpiry =
    code === 'TOKEN_EXPIRED' ||
    code === 'TOKEN_EXPIRED_ERROR' ||
    code === 'JWT_ERROR' ||
    code === 'MISSING_TOKEN' ||
    code === 'UNAUTHORIZED';

  // Decision priority:
  // 1. Explicit clear -> Force Logout
  if (needsClear) {
    return { shouldForce: true, logoutUrl, loginUrl, details: rawDetails, traceId, shouldRefresh: false };
  }

  // 2. Explicit refresh -> Do NOT force logout, signal refresh
  if (needsRefresh) {
    return { shouldForce: false, logoutUrl, loginUrl, details: rawDetails, traceId, shouldRefresh: true };
  }

  // 3. Code indicates expiry -> Default to refresh attempt (unless already retried, logic handled in interceptor)
  // If it's just a generic 401 without specific instruction, we try to be helpful and refresh.
  if (codeIndicatesExpiry) {
    return { shouldForce: false, logoutUrl, loginUrl, details: rawDetails, traceId, shouldRefresh: true };
  }

  // 4. Other 401s (e.g. invalid permissions/scope but valid token?) -> Propagate error, don't force logout immediately.
  return {
    shouldForce: false,
    logoutUrl,
    loginUrl,
    details: rawDetails,
    traceId,
    shouldRefresh: false
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
  const keys = new Set([...SESSION_STORAGE_KEYS, ...AUTH_STATE_KEYS]);
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

          if (reason === 'expired' && (!samePath || !sameSearch)) {
            showToastOnce('session-expired', {
              title: "Sesión expirada",
              description: "Tu sesión ha expirado. Por favor inicia sesión nuevamente.",
              variant: "destructive",
            });
          }

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
          if (reason === 'expired' && currentPathWithQuery !== target) {
            showToastOnce('session-expired', {
              title: "Sesión expirada",
              description: "Tu sesión ha expirado. Por favor inicia sesión nuevamente.",
              variant: "destructive",
            });
          }
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

// Export: permitir que apiFetch() aplique la politica estandar basada en data.error.code/details
export async function forceLogoutFromApiError(
  code?: string,
  details?: any
): Promise<void> {
  const clientAction = (details?.client_action || details?.clientAction || '').toString();
  const shouldClear =
    clientAction === 'CLEAR_AUTH_AND_RELOGIN' ||
    details?.should_clear_auth === true ||
    details?.shouldClearAuth === true;

  if (!shouldClear) return;

  const reason = String(code || 'expired').toLowerCase().includes('missing') ? 'missing' : 'expired';
  const logoutUrl = details?.logout_url || details?.logoutUrl;
  const loginUrl = details?.login_url || details?.loginUrl;
  await forceClientLogout(reason, { logoutUrl, loginUrl });
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
    const csrfRefresh = getCookie('csrf_refresh_token') ?? undefined;
    const headers: Record<string, string> = { 'Accept': 'application/json', 'Content-Type': 'application/json' };
    setCsrfHeaders(headers, csrfRefresh);
    try {
      const resp = await refreshClient.post('/auth/refresh', null, { headers });
      const candidate = extractJWT(resp?.data);
      if (candidate && isValidTokenFormat(candidate)) {
        persistStoredToken(candidate);
      }
    } catch (err: any) {
      if (options?.retryOnCsrfError && isCsrfError(err)) {
        // Releer cookie y reintentar una sola vez
        const retryCsrf = getCookie('csrf_refresh_token') ?? undefined;
        const retryHeaders: Record<string, string> = { 'Accept': 'application/json', 'Content-Type': 'application/json' };
        setCsrfHeaders(retryHeaders, retryCsrf);
        const retryResp = await refreshClient.post('/auth/refresh', null, { headers: retryHeaders });
        const retryCandidate = extractJWT(retryResp?.data);
        if (retryCandidate && isValidTokenFormat(retryCandidate)) {
          persistStoredToken(retryCandidate);
        }
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

    if (status === 429) {
      try {
        const detail = {
          event: 'RATE_LIMIT_EXCEEDED',
          endpoint: path,
          status,
          message: error?.response?.data?.message || error?.message || 'Demasiadas solicitudes',
          timestamp: new Date().toISOString(),
        };
        const data = error?.response?.data ?? {};
        const d0 = (data?.error && data?.error?.details) ? data.error.details : undefined;
        const d1 = (!d0 && data?.details) ? data.details : d0 ?? data?.details;
        const bodyRetryAfterSeconds = d1?.retry_after_seconds;
        const bodyRetryAfter = d1?.retry_after;
        if (typeof window !== 'undefined' && 'dispatchEvent' in window) {
          const waitCandidate = bodyRetryAfterSeconds ?? bodyRetryAfter;
          let waitSeconds: number | undefined;
          if (typeof waitCandidate === 'number' && Number.isFinite(waitCandidate) && waitCandidate > 0) {
            waitSeconds = waitCandidate;
          } else if (typeof waitCandidate === 'string') {
            const n = parseInt(waitCandidate, 10);
            waitSeconds = Number.isNaN(n) ? undefined : n;
          }
          const evtDetail = { ...detail, waitSeconds };
          window.dispatchEvent(new CustomEvent('rate-limit-exceeded', { detail: evtDetail }));
        }
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
          const bodySecs =
            typeof bodyRetryAfterSeconds === 'number'
              ? bodyRetryAfterSeconds
              : typeof bodyRetryAfterSeconds === 'string'
                ? toInt(bodyRetryAfterSeconds)
                : typeof bodyRetryAfter === 'number'
                  ? bodyRetryAfter
                  : typeof bodyRetryAfter === 'string'
                    ? toInt(bodyRetryAfter)
                    : undefined;
          const headerSecs = toInt(retryAfter);
          if (bodySecs != null) {
            delayMs = Math.max(bodySecs * 1000, 5000);
          } else if (headerSecs != null) {
            delayMs = Math.max(headerSecs * 1000, 5000);
          } else {
            const resetSecs = toInt(rlReset);
            if (resetSecs != null) {
              const nowSecs = Math.floor(Date.now() / 1000);
              delayMs = Math.max((resetSecs - nowSecs) * 1000, 5000);
            }
          }
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

      // 1. Si el backend explícitamente pide logout
      if (tokenStatus.shouldForce) {
        if (DEBUG_LOG) console.warn('[api] 401 Forzando logout por error explícito:', tokenStatus.details);
        await forceClientLogout('expired', { logoutUrl: tokenStatus.logoutUrl, loginUrl: tokenStatus.loginUrl });
        return Promise.reject(error);
      }

      // 2. Si no hay sesión local (cookies/storage) y da 401, no tiene sentido refrescar.
      if (!hasStoredAuth && !isAuthMeRequest) {
        if (DEBUG_LOG) console.warn('[api] 401 sin sesión local. Forzando logout.');
        await forceClientLogout('missing', { logoutUrl: tokenStatus.logoutUrl, loginUrl: tokenStatus.loginUrl });
        return Promise.reject(error);
      }

      // 3. Intentar refresh si se sugiere o si parece expirado
      if (tokenStatus.shouldRefresh) {
        try {
          if (DEBUG_LOG) {
            const hasAccess = !!getCookie('csrf_access_token');
            const hasRefresh = !!getCookie('csrf_refresh_token');
            console.log('[api][resp] 401 detectado. Intentando refresh. Cookies:', { access: hasAccess, refresh: hasRefresh }, 'Retry:', !!originalRequest._retry);
          }

          // Evitar bucles infinitos: solo un reintento
          if (!originalRequest._retry) {
            originalRequest._retry = true;
            await performRefresh({ retryOnCsrfError: true });
            if (DEBUG_LOG) console.log('[api] Refresh exitoso. Reintentando request original:', path);
            // Reset authorization header to force re-reading from storage/cookies in request interceptor
            if (originalRequest.headers) {
              delete originalRequest.headers['Authorization'];
              delete originalRequest.headers['X-CSRF-Token'];
              delete originalRequest.headers['X-CSRF-TOKEN'];
            }
            return api(originalRequest);
          } else {
            // Si ya reintentamos y sigue 401 -> Logout
            if (DEBUG_LOG) console.warn('[api] 401 tras reintento (refresh fallido o token inválido). Forzando logout.');
            await forceClientLogout('expired');
            return Promise.reject(error);
          }
        } catch (refreshErr) {
          if (DEBUG_LOG) console.error('[api] Falló el refresh automático tras 401:', refreshErr);
          // Si falla el refresh (ej. refresh token expirado también), logout.
          await forceClientLogout('expired');
          return Promise.reject(refreshErr);
        }
      }

      // 4. Si es 401 pero no hay instrucción de refresh ni logout, devolver el error tal cual
      // (Puede ser falta de permisos, scope, etc. que no se arregla con refresh)
      if (DEBUG_LOG) console.warn('[api] 401 recibido sin instrucción de refresh ni logout. Propagando error.');
      return Promise.reject(error);
    }

    const method = String(originalRequest?.method || 'get').toLowerCase();
    const codeStr = String(error?.code || '').toUpperCase();
    const msgStr = String(error?.message || '').toLowerCase();
    const isTimeoutLike = status === 408 || codeStr === 'ECONNABORTED' || codeStr === 'ETIMEDOUT' || msgStr.includes('timeout');
    const isNetworkLike = codeStr === 'ERR_NETWORK' || (!status && msgStr.includes('network'));
    const skipRetry = (originalRequest as any)?.skipTimeoutRetry === true;
    const aborted = axios.isCancel(error) || (!!(originalRequest as any)?.signal && (originalRequest as any).signal.aborted === true);
    if (!skipRetry && !aborted && (method === 'get' || method === 'head') && (isTimeoutLike || isNetworkLike)) {
      const attempt = Number((originalRequest as any)._timeoutAttempt ?? 0) + 1;
      if (attempt <= TIMEOUT_RETRY_ATTEMPTS) {
        (originalRequest as any)._timeoutAttempt = attempt;
        let delay = Math.floor(TIMEOUT_RETRY_BASE_MS * Math.pow(1.7, attempt - 1));
        if (delay > TIMEOUT_RETRY_MAX_MS) delay = TIMEOUT_RETRY_MAX_MS;
        delay += Math.floor(Math.random() * 100);
        await new Promise((r) => setTimeout(r, delay));
        return api(originalRequest);
      }
    }

    // Global Error Toasts
    if (!aborted) {
      const data = error?.response?.data;
      const detailMsg =
        (typeof data === 'string' ? data : undefined) ||
        data?.message ||
        data?.error ||
        data?.detail ||
        data?.details ||
        error?.message;
      if (status === 403) {
        showToastOnce('forbidden', {
          title: "Acceso denegado",
          description: "No tienes permisos para realizar esta acción.",
          variant: "destructive",
        });
      } else if (status >= 500) {
        showToastOnce('server-error', {
          title: "Error del servidor",
          description: "Error del servidor. Por favor intenta más tarde.",
          variant: "destructive",
        });
      } else if (status === 0 || isNetworkLike || !status) {
        showToastOnce('network-error', {
          title: "Error",
          description: detailMsg || "Ocurrió un error de red. Verifica tu conexión.",
          variant: "destructive",
        });
      } else if (detailMsg) {
        showToastOnce(`error-${status}`, {
          title: "Error",
          description: String(detailMsg),
          variant: "destructive",
        });
      }
    }

    return Promise.reject(error);
  }
);

// --- COALESCING de GET global (single-flight) para igualar comportamiento dev/prod ---
// Evita enviar múltiples GET idénticos (método+URL+params) simultáneamente y comparte la misma promesa
const inflightGet = new Map<string, Promise<any>>();
const rateLimitBackoff = new Map<string, number>();
const lastRequestAt = new Map<string, number>();
const REQUEST_MIN_INTERVAL_MS = Number(getEnvVar('VITE_REQUEST_MIN_INTERVAL_MS', '500'));
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
const memoryCache = new Map<string, { data: any; expiry: number; etag?: string; lastModified?: string }>();

/**
 * Lee del cache (memoria primero, luego IndexedDB)
 */
type CacheReadOptions = {
  allowIdb?: boolean;
  timeoutMs?: number;
};

const IDB_READ_TIMEOUT_SENTINEL = Symbol('IDB_READ_TIMEOUT');

async function readCache(key: string, options?: CacheReadOptions): Promise<any | null> {
  const cacheKey = `http-cache:${key}`;

  // 1. Intentar memoria primero (ultra rápido)
  const memEntry = memoryCache.get(cacheKey);
  if (memEntry && Date.now() <= memEntry.expiry) {
    return memEntry.data;
  }

  const isOnline = typeof navigator === 'undefined' || navigator.onLine !== false;
  const allowIdb = options?.allowIdb ?? (isOnline ? IDB_READ_ONLINE : true);
  if (!allowIdb) {
    return null;
  }

  const timeoutMs = options?.timeoutMs ?? IDB_READ_TIMEOUT_MS;

  // 2. Fallback a IndexedDB (persistente entre sesiones)
  try {
    const idbPromise = getIndexedDBCache<any>(cacheKey, {
      allowStaleWhenOffline: true,
      offlineGraceMs: 10 * 60 * 1000, // hasta 10 minutos adicionales en modo offline
    });

    const readWithTimeout = timeoutMs > 0
      ? Promise.race([
        idbPromise,
        new Promise<symbol>((resolve) => setTimeout(() => resolve(IDB_READ_TIMEOUT_SENTINEL), timeoutMs)),
      ])
      : idbPromise;

    const idbResult = await readWithTimeout;

    if (idbResult === IDB_READ_TIMEOUT_SENTINEL) {
      // No bloquear la request; hidratar memoria si el IDB termina luego
      void idbPromise.then((data) => {
        if (!data) return;
        memoryCache.set(cacheKey, {
          data,
          expiry: Date.now() + HTTP_CACHE_TTL,
        });
      }).catch(() => { /* noop */ });
      return null;
    }

    if (idbResult) {
      // Hidratar memoria con dato de IndexedDB
      memoryCache.set(cacheKey, {
        data: idbResult,
        expiry: Date.now() + HTTP_CACHE_TTL,
      });
      return idbResult;
    }
  } catch (error) {
    console.warn('[api] Error leyendo cache IndexedDB:', error);
  }

  return null;
}

/**
 * Escribe en cache (memoria + IndexedDB)
 */
function writeCache(key: string, data: any, ttlMs: number = HTTP_CACHE_TTL, meta?: { etag?: string; lastModified?: string }): void {
  const cacheKey = `http-cache:${key}`;
  const expiry = Date.now() + Math.max(1000, ttlMs);

  // 1. Escribir en memoria (sincrónico, rápido)
  memoryCache.set(cacheKey, { data, expiry, etag: meta?.etag, lastModified: meta?.lastModified });

  // 2. Escribir en IndexedDB (asíncrono, persistente) en background
  void setIndexedDBCache(cacheKey, data, ttlMs).catch(err => {
    console.warn('[api] Error escribiendo cache IndexedDB:', err);
  });
}

const originalGet = api.get.bind(api);
(api as any).get = async (url: string, config?: any) => {
  // Si se proporcionó cancelToken o signal, evitar coalescing pero mantener cache/backoff
  const hasCancel = !!(config && (config.cancelToken || config.signal));
  const key = buildGetKey(url, config);
  const path = normalizePath(url as any);

  // Condicional GET: incluir If-None-Match / If-Modified-Since si tenemos metadatos en memoria
  try {
    const mem = memoryCache.get(`http-cache:${key}`);
    if (mem) {
      const headers = { ...(config?.headers || {}) };
      if (mem.etag) {
        headers['If-None-Match'] = mem.etag;
      } else if (mem.lastModified) {
        headers['If-Modified-Since'] = mem.lastModified;
      }
      config = { ...(config || {}), headers };
    }
  } catch {
    // noop
  }

  // Si existe backoff activo por rate limit, servir caché si está disponible
  try {
    const until = rateLimitBackoff.get(path) || 0;
    if (until && Date.now() < until) {
      const cachedBackoff = await readCache(key, { allowIdb: true });
      if (cachedBackoff) {
        if (DEBUG_LOG) console.log('[api] Cache durante backoff:', key);
        return { data: cachedBackoff, status: 200, statusText: 'OK', headers: {}, config } as AxiosResponse;
      }
    }
  } catch (backoffError) {
    logDebugError('[api] No se pudo evaluar backoff activo', backoffError);
  }

  // Throttle simple por endpoint para evitar ráfagas que disparan rate limit
  try {
    if (REQUEST_MIN_INTERVAL_MS > 0 && path) {
      const last = lastRequestAt.get(path) || 0;
      const elapsed = Date.now() - last;
      if (elapsed < REQUEST_MIN_INTERVAL_MS) {
        await new Promise((r) => setTimeout(r, REQUEST_MIN_INTERVAL_MS - elapsed));
      }
      lastRequestAt.set(path, Date.now());
    }
  } catch (throttleError) {
    logDebugError('[api] No se pudo aplicar throttle', throttleError);
  }

  // Cache fresco primero (ahora asíncrono por IndexedDB)
  const cached = await readCache(key);
  if (cached) {
    if (DEBUG_LOG) console.log('[api] Cache HIT:', key);
    return { data: cached, status: 200, statusText: 'OK', headers: {}, config } as AxiosResponse;
  }

  const existing = inflightGet.get(key);
  if (existing && !hasCancel) {
    if (DEBUG_LOG) console.log('[api] Coalesced GET:', key);
    return existing;
  }

  const p = originalGet(url, config).then((resp: AxiosResponse) => {
    // Guardar en caché la respuesta (ahora en IndexedDB + memoria)
    try {
      const etag = resp.headers?.['etag'] || resp.headers?.['ETag'];
      const lastModified = resp.headers?.['last-modified'] || resp.headers?.['Last-Modified'];
      writeCache(key, resp.data, HTTP_CACHE_TTL, { etag, lastModified });
    } catch (cacheError) {
      logDebugError('[api] No se pudo almacenar respuesta en caché', cacheError);
    }
    if (resp.status === 304) {
      try {
        const mem = memoryCache.get(`http-cache:${key}`);
        if (mem && Date.now() <= mem.expiry) {
          return { data: mem.data, status: 200, statusText: 'Not Modified', headers: resp.headers, config } as AxiosResponse;
        }
      } catch { /* noop */ }
    }
    return resp;
  });
  inflightGet.set(key, p);
  const clear = () => inflightGet.delete(key);
  p.then(clear, clear);
  return p;
};

export default api;
export { unwrapApi } from '@/shared/utils/apiUnwrap';

let __sseStarted = false;
let __sse: EventSource | null = null;
let __sseUrl: string | null = null;
let __sseLastErrorAt = 0;
let __sseReconnectTimer: any = null;
let __sseReconnecting = false;
let __sseRetryAttempt = 0;

function buildSseUrls(): string[] {
  const baseApi = (api.defaults.baseURL || getApiBaseURL() || '').replace(/\/$/, '');
  const list = [
    baseApi ? `${baseApi}/events` : '',
  ].filter((u, i, a) => !!u && a.indexOf(u) === i);
  return list;
}

function parseSseData(raw: any): { endpoint?: string; action?: string; id?: string | number } {
  try {
    const txt = typeof raw === 'string' ? raw : String(raw ?? '');
    const obj = JSON.parse(txt);
    const endpoint =
      obj.endpoint || obj.path || obj.resource || obj.collection || obj.model || obj.entity || obj.table;
    const action = obj.action || obj.event || obj.type;
    const id = obj.id ?? obj.pk ?? obj.item_id ?? obj.itemId;
    return { endpoint: endpoint ? String(endpoint) : undefined, action: action ? String(action) : undefined, id };
  } catch {
    const txt = typeof raw === 'string' ? raw : '';
    if (txt.includes(':')) {
      const [topic, maybeId] = txt.split(':');
      return { endpoint: topic, id: maybeId };
    }
    return {};
  }
}

function dispatchGlobalChange(detail: any) {
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('server-global-change', { detail }));
    }
  } catch { void 0; }
}

function dispatchResourceChange(detail: { endpoint?: string; action?: string; id?: string | number }) {
  try {
    if (typeof window !== 'undefined') {
      const d = {
        endpoint: detail.endpoint ? String(detail.endpoint).split('/').filter(Boolean).pop() : undefined,
        action: detail.action,
        id: detail.id,
      };
      window.dispatchEvent(new CustomEvent('server-resource-changed', { detail: d }));
    }
  } catch { void 0; }
}

export function startServerEvents(): void {
  // Disabled to prevent duplicate connections (429) & enable clean lints
  // console.warn('startServerEvents is deprecated. Use lib/events.ts');
}

export function startWebSocket(): void {
  // Disabled: Use lib/events.ts instead
}

export function startRealtime(): void {
  // Disabled: Use lib/events.ts instead
}



