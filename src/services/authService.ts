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

// Asegurarse de que no se duplique /api/v1 en las URLs
const AUTH_URL = "auth";
// Single-flight compartido para /auth/me: reutiliza la misma promesa entre consumidores
let inflightMePromise: Promise<any> | null = null;
// TTL de micro-caché para /auth/me (evita ráfagas de verificación)
const ME_TTL_MS = 120_000; // 2 minutos
let meCache: { ts: number; data: UserProfileResponse | null } = { ts: 0, data: null };
// Registro de cooldown tras 429 (Rate Limit)
let meRateLimitUntil: number = 0;

// Clave de almacenamiento para token
const AUTH_STORAGE_KEY = ENV.VITE_AUTH_STORAGE_KEY || 'finca_access_token';

// Helpers de caché para recordar la última ruta de login válida (usar sessionStorage: no sensible)
const LOGIN_PATH_CACHE_KEY = (ENV?.VITE_AUTH_LOGIN_PATH_CACHE_KEY || 'finca_auth_login_path');

function getCachedLoginPath(): string | null {
  try {
    const v = sessionStorage.getItem(LOGIN_PATH_CACHE_KEY);
    return v && v.trim() ? v : null;
  } catch {
    return null;
  }
}

function setCachedLoginPath(path: string): void {
  try {
    if (typeof path === 'string' && path.trim().length > 0) {
      sessionStorage.setItem(LOGIN_PATH_CACHE_KEY, path.trim());
    }
  } catch {
    // ignore storage errors (SSR / privacy modes)
  }
}

function clearCachedLoginPath(): void {
  try {
    sessionStorage.removeItem(LOGIN_PATH_CACHE_KEY);
  } catch {
    // ignore
  }
}
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
    } catch {}
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
      const rawTokenCandidate = (_r && (_r.access_token || _r.data?.access_token || _r.data?.data?.access_token)) || undefined;
      const normalizedToken = extractJWT(rawTokenCandidate);
      if (normalizedToken && isValidTokenFormat(normalizedToken)) {
        try { if (typeof localStorage !== 'undefined') localStorage.setItem(AUTH_STORAGE_KEY, normalizedToken); } catch {}
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
  
      const rawTokenCandidate = (_r && (_r.access_token || _r.data?.access_token || _r.data?.data?.access_token)) || undefined;
      const normalizedUser = (_r && (_r.user || _r.data?.user || _r.data?.data?.user)) || undefined;
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
          try { if (typeof localStorage !== 'undefined') localStorage.setItem(AUTH_STORAGE_KEY, normalizedToken); } catch {}
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
        const normalizedUser = (_r && (_r.user || _r.data?.user || _r.data?.data?.user)) || undefined;

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
    } catch {}
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
    // Normalizar ruta al objeto user en posibles envoltorios del backend
    const _r: any = result;
    let normalizedUser = (_r && (
      _r.user ||
      _r.data?.user ||
      _r.data?.data?.user ||
      ((_r.id || _r.fullname || _r.identification) ? _r : undefined)
    )) || undefined;
    let normalizedToken = (_r && (_r.access_token || _r.data?.access_token || _r.data?.data?.access_token)) || undefined;

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
  } catch {
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
  } catch { /* older engines may not support normalize, ignore */ }
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
