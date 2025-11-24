import api, { refreshClient } from "./api";
import { getCookie } from '@/utils/cookieUtils';
import { 
  decodeToken,
  isValidTokenFormat,
  getUserFromToken
} from '@/utils/jwtUtils';
import { extractJWT } from "@/utils/tokenUtils";

// Safe ENV accessor for Jest/Node and Vite browser
const ENV: Record<string, any> = ((globalThis as any)?.['import']?.['meta']?.['env'])
  ?? ((typeof (globalThis as any).process !== 'undefined' ? ((globalThis as any).process as any).env : undefined) as any)
  ?? {};
const IS_DEV: boolean = (typeof ENV.DEV !== 'undefined' ? !!ENV.DEV : (ENV.NODE_ENV !== 'production'));
const DEBUG_LOG: boolean = IS_DEV && String(ENV.VITE_DEBUG_MODE || '').toLowerCase() === 'true';

const logAuthWarning = (context: string, error: unknown) => {
  if (DEBUG_LOG) {
    console.warn(`[AuthService] ${context}`, error);
  }
};

// Asegurarse de que no se duplique /api/v1 en las URLs
const AUTH_URL = "auth";
// Single-flight compartido para /auth/me: reutiliza la misma promesa entre consumidores
let inflightMePromise: Promise<any> | null = null;
// TTL de micro-caché para /auth/me (evita ráfagas de verificación)
const ME_TTL_MS = 120_000; // 2 minutos
let meCache: { ts: number; data: UserProfileResponse | null } = { ts: 0, data: null };
// Registro de cooldown tras 429 (Rate Limit)
const _meRateLimitUntil: number = 0;

// Clave de almacenamiento para token
const AUTH_STORAGE_KEY = ENV.VITE_AUTH_STORAGE_KEY || 'finca_access_token';

// Helpers de caché para recordar la última ruta de login válida (usar sessionStorage: no sensible)
const LOGIN_PATH_CACHE_KEY = (ENV?.VITE_AUTH_LOGIN_PATH_CACHE_KEY || 'finca_auth_login_path');

function _getCachedLoginPath(): string | null {
  try {
    const v = sessionStorage.getItem(LOGIN_PATH_CACHE_KEY);
    return v && v.trim() ? v : null;
  } catch (error) {
    logAuthWarning('getCachedLoginPath', error);
    return null;
  }
}

function _setCachedLoginPath(path: string): void {
  try {
    if (typeof path === 'string' && path.trim().length > 0) {
      sessionStorage.setItem(LOGIN_PATH_CACHE_KEY, path.trim());
    }
  } catch (error) {
    logAuthWarning('setCachedLoginPath', error);
  }
}

function clearCachedLoginPath(): void {
  try {
    sessionStorage.removeItem(LOGIN_PATH_CACHE_KEY);
  } catch (error) {
    logAuthWarning('clearCachedLoginPath', error);
  }
}

// Utilidades para extraer tokens/usuarios en respuestas con estructuras inconsistentes
const MAX_NESTED_LOOKUP_DEPTH = 6;
const normalizeKey = (key: string) => key.replace(/[^a-z0-9]/gi, '').toLowerCase();
const TOKEN_KEY_CANDIDATES = new Set([
  'accesstoken',
  'token',
  'jwttoken',
  'jwt',
  'refreshtoken',
]);
const USER_CONTAINER_HINTS = ['user', 'usuario', 'userdata', 'user_data', 'userprofile', 'user_profile', 'profile', 'perfil', 'data', 'payload', 'result'];
const USER_IDENTITY_KEYS = ['id', 'user_id', 'identification', 'fullname', 'full_name', 'name', 'email', 'role'];
const USER_SECONDARY_KEYS = ['status', 'active', 'is_active', 'enabled'];
const SKIP_KEYS = new Set(['message', 'messages', 'status', 'success', 'error', 'errors', 'code', 'detail', 'details']);

const isPlainObject = (value: unknown): value is Record<string, any> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const looksLikeUserObject = (value: unknown): boolean => {
  if (!isPlainObject(value)) return false;
  if (USER_IDENTITY_KEYS.some((key) => key in value)) return true;
  if ('id' in value && USER_SECONDARY_KEYS.some((key) => key in value)) return true;
  return false;
};

const isLikelyTokenString = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  const bare = trimmed.startsWith('Bearer ') ? trimmed.slice(7).trim() : trimmed;
  if (bare.length < 16) return false;
  if (/\s/.test(bare)) return false;
  return true;
};

const findUserCandidate = (payload: any, depth = 0): any => {
  if (depth > MAX_NESTED_LOOKUP_DEPTH || payload == null) return undefined;
  if (looksLikeUserObject(payload)) return payload;

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const found = findUserCandidate(item, depth + 1);
      if (found) return found;
    }
    return undefined;
  }

  if (!isPlainObject(payload)) return undefined;

  for (const key of USER_CONTAINER_HINTS) {
    if (key in payload) {
      const found = findUserCandidate((payload as any)[key], depth + 1);
      if (found) return found;
    }
  }

  for (const [key, value] of Object.entries(payload)) {
    if (USER_CONTAINER_HINTS.includes(key) || SKIP_KEYS.has(key)) continue;
    const found = findUserCandidate(value, depth + 1);
    if (found) return found;
  }

  return undefined;
};

const findTokenCandidate = (payload: any, depth = 0): any => {
  if (depth > MAX_NESTED_LOOKUP_DEPTH || payload == null) return undefined;

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const found = findTokenCandidate(item, depth + 1);
      if (found !== undefined) return found;
    }
    return undefined;
  }

  if (!isPlainObject(payload)) return undefined;

  for (const [key, value] of Object.entries(payload)) {
    const normalizedKey = normalizeKey(key);
    if (TOKEN_KEY_CANDIDATES.has(normalizedKey)) {
      if (typeof value === 'string') {
        if (isLikelyTokenString(value)) return value;
        continue;
      }
      const nested = findTokenCandidate(value, depth + 1);
      if (nested !== undefined) return nested;
      return value;
    }
  }

  const prioritized = ['data', 'payload', 'result', 'attributes', 'meta', 'response'];
  for (const key of prioritized) {
    if (key in payload) {
      const found = findTokenCandidate((payload as any)[key], depth + 1);
      if (found !== undefined) return found;
    }
  }

  for (const [key, value] of Object.entries(payload)) {
    if (prioritized.includes(key) || SKIP_KEYS.has(key)) continue;
    const found = findTokenCandidate(value, depth + 1);
    if (found !== undefined) return found;
  }

  return undefined;
};
// Interfaces basadas en la documentación de la API
interface LoginRequest {
  identification: string;
  password: string;
}

interface LoginResponse {
  access_token?: string;
  message?: string;
  user?: {
    id: number;
    identification: string;
    fullname: string;
    email: string;
    role: string;
    status: boolean;
  };
}

interface UserProfileResponse {
    message: string;
    user: LoginResponse['user'];
    status?: number;
}

interface AuthError {
  message: string;
  status?: number;
  details?: any;
}

class AuthService {
  private readonly TOKEN_COOKIE_NAME = 'access_token_cookie';

  /**
   * Retrieve token from sessionStorage
   */
  private getTokenFromStorage(): string | null {
    try {
      if (typeof localStorage !== 'undefined') {
        const t = localStorage.getItem(AUTH_STORAGE_KEY);
        return t && t.length ? t : null;
      }
    } catch (error) {
      logAuthWarning('getTokenFromStorage', error);
    }
    return null;
  }

  /**
   * Check if current token is close to expiry and should be refreshed
   */
  public needsTokenRefresh(): boolean {
    const tok = this.getTokenFromStorage();
    if (!tok) return false;
    const meta = decodeToken(tok);
    return !!(meta && (meta as any).isExpired);
  }


  /**
   * Renueva el token de autenticación.
   * @returns Promise que se resuelve cuando el token se renueva exitosamente.
   */
  async refreshToken(): Promise<void> {
    try {
      // En producción con JWT_COOKIE_CSRF_PROTECT, incluir explícitamente el header CSRF
      const csrfRefresh = getCookie('csrf_refresh_token');
      const headers: Record<string, string> = { 'Accept': 'application/json', 'Content-Type': 'application/json' };
      if (csrfRefresh) {
        headers['X-CSRF-Token'] = csrfRefresh;
        headers['X-CSRF-TOKEN'] = csrfRefresh; // compat nombres
      }
      const response = await refreshClient.post(`/auth/refresh`, null, { headers });
      const _r = response?.data ?? response;
      const rawTokenCandidate = _r ? findTokenCandidate(_r) : undefined;
      const normalizedToken = extractJWT(rawTokenCandidate);
      if (normalizedToken && isValidTokenFormat(normalizedToken)) {
        try {
          if (typeof localStorage !== 'undefined') localStorage.setItem(AUTH_STORAGE_KEY, normalizedToken);
        } catch (error) {
          logAuthWarning('refreshToken:setItem', error);
        }
      }
    } catch (error) {
      this.clearAuthData();
      throw this.handleError(error);
    }
  }

  /**
   * Realiza el inicio de sesión en el sistema.
   */
  async login(identification: string | number, password: string): Promise<LoginResponse> {
    try {
      const payload: LoginRequest = { identification: String(identification), password };
      const response = await api.post(`/auth/login`, payload);
      const _r = response?.data ?? response;
  
      const rawTokenCandidate = _r ? findTokenCandidate(_r) : undefined;
      let normalizedUser = _r ? findUserCandidate(_r) : undefined;
      if (!normalizedUser && looksLikeUserObject(_r)) {
        normalizedUser = _r;
      }
      const normalizedMessage = (_r && (_r.message || _r.data?.message || _r.data?.data?.message)) || undefined;
  
      const normalizedToken = extractJWT(rawTokenCandidate);
  
      let finalAccessToken: string | undefined = undefined;
      let finalUser = normalizedUser;
  
      if (normalizedToken) {
        if (!isValidTokenFormat(normalizedToken)) {
          throw new Error('Formato de token inválido recibido en login');
        }
        const tokenMetadata = decodeToken(normalizedToken);
        if (!tokenMetadata.isExpired) {
          finalAccessToken = normalizedToken;
          // Persistir JWT para usarlo en Authorization
        try {
          if (typeof localStorage !== 'undefined') localStorage.setItem(AUTH_STORAGE_KEY, normalizedToken);
        } catch (error) {
          logAuthWarning('login:setItem', error);
        }
          if (!finalUser && (tokenMetadata as any).userId) {
            finalUser = getUserFromToken(normalizedToken);
          }
        }
      }
  
      return {
        access_token: finalAccessToken,
        message: normalizedMessage,
        user: finalUser
      } as LoginResponse;
    } catch (error) {
      this.clearAuthData();
      throw this.handleError(error);
    }
  }

  /**
   * Obtiene el perfil del usuario autenticado.
   */
  async getUserProfile(config?: { cancelToken?: any; signal?: AbortSignal }): Promise<UserProfileResponse> {
    try {
      // Evitar ráfaga: usar micro-caché
      const now = Date.now();
      if (meCache.data && (now - meCache.ts) < ME_TTL_MS) {
        return meCache.data;
      }

      // Single-flight: evitar múltiples llamadas concurrentes
      if (inflightMePromise) return inflightMePromise as any;

      inflightMePromise = (async () => {
        const axiosConfig: any = {};
        if (config?.signal) axiosConfig.signal = config.signal;
        if (config?.cancelToken) axiosConfig.cancelToken = config.cancelToken;

        // Revalidación únicamente vía /auth/me.
        // Si el backend responde 401 porque el access token expiró,
        // los interceptores de api.ts intentarán automáticamente el refresh y reintentarán la solicitud.
        // Aquí no hacemos refresh manual para evitar duplicidad de lógica.
        const response: any = await api.get(`/${AUTH_URL}/me`, axiosConfig);
        const _r = response?.data ?? response;
        const normalizedMessage = (_r && (_r.message || _r.data?.message || _r.data?.data?.message)) || undefined;
        let normalizedUser = _r ? findUserCandidate(_r) : undefined;
        if (!normalizedUser && looksLikeUserObject(_r)) {
          normalizedUser = _r;
        }

        const result: UserProfileResponse = {
          message: normalizedMessage || 'Perfil obtenido',
          user: normalizedUser,
          status: response?.status
        };

        meCache = { ts: Date.now(), data: result };
        inflightMePromise = null;
        return result;
      })();

      return inflightMePromise as any;
    } catch (error) {
      inflightMePromise = null;
      throw this.handleError(error);
    }
  }

  /* Obsolete inline exports removed; proper wrappers are defined at the end of the file. */

  /**
   * Obtiene el token de autenticación actual desde sessionStorage; fallback a cookie legible.
   */
  getCurrentToken(): string | null {
    return this.getTokenFromStorage();
  }

  /**
   * Limpia todos los datos de autenticación del cliente.
   */
  private clearAuthData(): void {
    try {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (error) {
      logAuthWarning('clearAuthData:localStorage', error);
    }
    try {
      if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (error) {
      logAuthWarning('clearAuthData:sessionStorage', error);
    }
    try {
      if (typeof document !== 'undefined') {
        document.cookie = `${AUTH_STORAGE_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
        document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;';
      }
    } catch (error) {
      logAuthWarning('clearAuthData:cookie', error);
    }
  }

  /**
   * Manejo de errores
   */
  private handleError(error: any): AuthError {
    const status = error?.response?.status ?? error?.status ?? 500;
    const data = error?.response?.data ?? error?.data;

    const toText = (val: any): string | undefined => {
      if (val == null) return undefined;
      const t = typeof val;
      if (t === 'string') return val;
      if (t === 'number' || t === 'boolean') return String(val);
      if (Array.isArray(val)) {
        const msgs = val.map(v => toText(v)).filter(Boolean);
        return msgs.length ? msgs.join(' ') : JSON.stringify(val);
      }
      if (t === 'object') {
        // Intentar campos comunes; si no, serializar
        return toText(val.message) || toText(val.error) || toText(val.detail) || toText(val.details) || JSON.stringify(val);
      }
      return undefined;
    };

    const message =
      toText(data?.message) ||
      toText(data?.error) ||
      toText(data?.detail) ||
      toText(data?.details) ||
      toText(error?.message) ||
      'Error de autenticación';

    const details = (data !== undefined ? data : error);
    return { message, status, details };
  }

  /**
   * Cierra la sesión llamando al endpoint /auth/logout y limpia metadatos no sensibles.
   */
  async logout(): Promise<void> {
    try {
      await api.post(`/auth/logout`)
      clearCachedLoginPath()
      this.clearAuthData();
    } catch (error) {
      throw this.handleError(error)
    }
  }
}

// Instancia singleton del servicio de autenticación
const authService = new AuthService();

export { authService };

// --- Funciones de ayuda para compatibilidad con el resto de la aplicación ---

export const loginUser = async (userData: any) => {
  try {
    const result = await authService.login(userData.identification, userData.password);

    // Normalizar respuesta para extraer usuario y token de forma robusta,
    // soportando tanto el nuevo backend (envoltorio `data`) como variantes anteriores.
    const _r: any = result;

    // 1) Usuario: probar rutas directas más comunes y luego heurística genérica
    let normalizedUser =
      _r?.user ??
      _r?.data?.user ??
      _r?.data?.data?.user ??
      (_r ? findUserCandidate(_r) : undefined);

    if (!normalizedUser && looksLikeUserObject(_r)) {
      normalizedUser = _r;
    }

    // 2) Token: intentar rutas directas y, si fallan, heurística findTokenCandidate
    const directTokenCandidate =
      _r?.access_token ??
      _r?.token ??
      _r?.data?.access_token ??
      _r?.data?.data?.access_token;

    let normalizedToken = directTokenCandidate
      ? extractJWT(directTokenCandidate)
      : undefined;

    if (!normalizedToken && _r) {
      const tokenFromHeuristics = findTokenCandidate(_r);
      normalizedToken = extractJWT(tokenFromHeuristics);
    }

    // Si no hay token visible, intentar validar sesión vía /auth/me (cookie HttpOnly)
    if (!normalizedToken) {
      console.warn('⚠️ Token no recibido del backend. Intentando validar sesión vía /auth/me...');
      try {
        // Validar sesión directamente con /auth/me
        // En caso de 401 por token expirado, los interceptores se encargarán del refresh y reintento.
        const profile = await authService.getUserProfile();
        const userFromProfile = (profile as any)?.user ?? (profile as any)?.data?.user ?? undefined;
        if (userFromProfile) {
          normalizedUser = userFromProfile;
          console.log('✅ Sesión validada vía /auth/me.');
        }
      } catch (e) {
        console.error('❌ No se pudo validar la sesión vía /auth/me:', e);
      }
    }

    // Fallback: si no hay token pero sí tenemos usuario en la respuesta de login, asumir sesión basada en cookie HttpOnly
    if (!normalizedToken && normalizedUser) {
      console.warn('⚠️ No se confirmó /auth/me, pero el backend devolvió objeto de usuario en login. Continuaremos como sesión basada en cookie HttpOnly.');
      normalizedToken = 'cookie';
    }

    // Verificar que se obtuvo algún indicador de sesión (token o usuario)
    if (!normalizedToken && !normalizedUser) {
      console.error('❌ Token no recibido del backend ni validación por cookie exitosa:', result);
      throw new Error('Token de autenticación no recibido del servidor');
    }

    return {
      success: true,
      data: result,
      user: normalizedUser,
      access_token: normalizedToken,
      message: (result as any)?.message || 'Login exitoso'
    };
  } catch (error: any) {
    // Re-lanzar el error para que el componente de login lo maneje
    const status = error?.response?.status ?? error?.status;
    const data = error?.response?.data ?? error?.details ?? error;
    const msg = (typeof error?.message === 'string'
      ? error.message
      : typeof data?.message === 'string'
        ? data.message
        : 'Error de autenticación');
    throw { status, data, message: msg };
  }
};

export const isAuthenticated = async () => {
  try {
    const profile = await authService.getUserProfile();
    return !!profile?.user;
  } catch (error) {
    logAuthWarning('isAuthenticated', error);
    return false;
  }
};

export const getUserProfile = (config?: { cancelToken?: any; signal?: AbortSignal }) => authService.getUserProfile(config);
export const getCurrentToken = () => authService.getCurrentToken();
export const needsTokenRefresh = () => authService.needsTokenRefresh();


// Función compatible para renovar token, utilizada por AuthenticationContext
export const refreshToken = async (): Promise<void> => {
  try {
    if (IS_DEV && ENV.VITE_DEBUG_MODE === 'true') {
      console.log('🔁 refreshToken util: calling refreshClient.post');
    }
    // Enviar explícitamente CSRF para el flujo de refresh
    const csrfRefresh = getCookie('csrf_refresh_token');
    const headers: Record<string, string> = { 'Accept': 'application/json', 'Content-Type': 'application/json' };
    if (csrfRefresh) {
      headers['X-CSRF-Token'] = csrfRefresh;
      headers['X-CSRF-TOKEN'] = csrfRefresh;
    }
    await refreshClient.post('/auth/refresh', null, { headers });
    if (IS_DEV && ENV.VITE_DEBUG_MODE === 'true') {
      console.log('🔁 refreshToken util: refresh completed (cookies managed by server)');
    }
    // No procesar ni devolver access_token del body; confiar en cookie HttpOnly
    return;
  } catch (error) {
    console.error('❌ refreshToken error:', error);
    throw error;
  }
};



export default authService;

/**
 * Normalize backend role representations to the canonical frontend roles.
 * Accepts many common variants and returns one of: "Administrador" | "Instructor" | "Aprendiz" or null.
 */
export function normalizeRole(role: any): string | null {
  if (role === undefined || role === null) return null;

  // Numeric codes mapping support (common in some backends)
  if (typeof role === 'number') {
    if (role === 1) return 'Administrador';
    if (role === 2) return 'Instructor';
    if (role === 3) return 'Aprendiz';
  }

  // Convert to string and normalize accents/spacing for robust matching
  let s = String(role).toLowerCase().trim();
  // Handle direct stringified numeric codes
  if (s === '1' || s === '01') return 'Administrador';
  if (s === '2' || s === '02') return 'Instructor';
  if (s === '3' || s === '03') return 'Aprendiz';

  // Remove diacritics and normalize separators
  try {
    s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  } catch (error) { /* older engines may not support normalize, ignore */ 
    logAuthWarning('normalizeRole', error);
  }
  const sn = s
    .replace(/[_-]+/g, ' ') // underscores/hyphens to spaces
    .replace(/[^a-z0-9\s]/g, '') // strip punctuation
    .replace(/\s+/g, ' ') // collapse spaces
    .trim();

  const adminAliases = new Set([
    'admin', 'administrator', 'administrador', 'administradora',
    'superadmin', 'super administrador', 'super administradora',
    'admin role', 'role admin', 'rol admin'
  ]);
  const instructorAliases = new Set([
    'instructor', 'teacher', 'profesor', 'profesora', 'docente',
    'instructor role', 'role instructor', 'rol instructor'
  ]);
  const apprenticeAliases = new Set([
    'apprentice', 'aprendiz', 'student', 'estudiante', 'alumno', 'alumna',
    'apprentice role', 'role apprentice', 'rol apprentice'
  ]);

  if (adminAliases.has(sn)) return 'Administrador';
  if (instructorAliases.has(sn)) return 'Instructor';
  if (apprenticeAliases.has(sn)) return 'Aprendiz';

  // Unknown/unsupported role variants: return null (never empty string)
  return null;
}

export const authServiceLogout = async () => {
  return await authService.logout()
}
