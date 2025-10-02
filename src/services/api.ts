import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { getCookie } from '@/utils/cookieUtils'
import { unwrapApi } from '@/utils/apiUnwrap';
import { extractJWT } from '@/utils/tokenUtils';

// ENV y configuración
const env: Record<string, any> = ((globalThis as any)?.['import']?.['meta']?.['env'])
  ?? ((typeof (globalThis as any).process !== 'undefined' ? ((globalThis as any).process as any).env : undefined) as any)
  ?? {};
const API_TIMEOUT = Number(env.VITE_API_TIMEOUT ?? 10000);
const REFRESH_TIMEOUT = Number(env.VITE_REFRESH_TIMEOUT ?? 8000);
const FORCE_ABSOLUTE = String(env.VITE_FORCE_ABSOLUTE_BASE_URL ?? '').toLowerCase() === 'true';
const DEBUG_LOG = String(env.VITE_DEBUG_MODE ?? '').toLowerCase() === 'true';
const AUTH_STORAGE_KEY = env.VITE_AUTH_STORAGE_KEY || 'finca_access_token';

// Bases de URL
const baseURL = FORCE_ABSOLUTE ? (env.VITE_API_BASE_URL || '/api/v1/') : '/api/v1/';
const refreshBaseURL = FORCE_ABSOLUTE ? (env.VITE_API_BASE_URL || '/api/v1/') : '/api/v1/';

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
        (config as any).headers['Content-Type'] = 'application/json';
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
        } catch {}
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
        (config as any).headers['Content-Type'] = 'application/json';
        // Añadir Authorization para /auth/refresh y /auth/me si hay token
        try {
          if (typeof localStorage !== 'undefined') {
            const tok = localStorage.getItem(AUTH_STORAGE_KEY);
            if (tok && tok.length) {
              (config as any).headers['Authorization'] = `Bearer ${tok}`;
            }
          }
        } catch {}
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

function isTokenExpired(err: any): boolean {
  const status = err?.response?.status ?? err?.status;
  const data = err?.response?.data ?? err?.data;
  const code = (data?.code || data?.error || data?.detail || data?.message || '').toString().toUpperCase();
  return status === 401 && (code.includes('TOKEN_EXPIRED') || code.includes('EXPIRED'));
}

function isCsrfError(err: any): boolean {
  const status = err?.response?.status ?? err?.status;
  const data = err?.response?.data ?? err?.data;
  const code = (data?.code || data?.error || data?.detail || data?.message || '').toString().toUpperCase();
  return status === 401 && code.includes('CSRF');
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

// Interceptor de respuesta: manejar refresh y reintentos con mutex
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Confiar en cookies HttpOnly; devolver respuesta
    return response;
  },
  async (error: any) => {
    const originalRequest = error?.config || {};
    const status = error?.response?.status;
    const path = normalizePath(originalRequest?.url as any);

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

const originalGet = api.get.bind(api);
(api as any).get = (url: string, config?: any) => {
  // Si se proporcionó cancelToken o signal, no coalescar para respetar cancelaciones de componente
  const hasCancel = !!(config && (config.cancelToken || config.signal));
  if (hasCancel) {
    return originalGet(url, config);
  }
  const key = buildGetKey(url, config);
  const existing = inflightGet.get(key);
  if (existing) {
    if (DEBUG_LOG) console.log('[api] Coalesced GET:', key);
    return existing;
  }
  const p = originalGet(url, config);
  inflightGet.set(key, p);
  const clear = () => inflightGet.delete(key);
  p.then(clear, clear);
  return p;
};

export default api;
export { unwrapApi } from '@/utils/apiUnwrap';
