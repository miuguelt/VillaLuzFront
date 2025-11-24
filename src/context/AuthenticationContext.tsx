import { createContext, useState, useEffect, ReactNode, useCallback, useRef, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { User, AuthContextType, Role, role as RoleType } from "@/types/userTypes"
import { getUserProfile, normalizeRole, authServiceLogout } from "@/services/authService"
import { isDevelopment } from "@/utils/envConfig"

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Avoid dynamic imports during Jest tests to prevent ESM/vite-specific syntax from breaking
const isTestEnv = typeof (globalThis as any).process !== 'undefined' && !!(((globalThis as any).process as any).env?.JEST_WORKER_ID)

const prefetchRoleRoutes = (role?: string | Role | null) => {
  if (isTestEnv) return
  try {
    // Prefetch layout común
    void import("@/components/dashboard/layout/DashboardLayout.tsx")
    switch (role) {
      case Role.Administrador:
      case 'Admin':
      case 'Administrador':
        void import("@/pages/dashboard/admin/AdminDashboard.tsx")
        break
      case Role.Instructor:
      case 'Instructor':
        void import("@/pages/dashboard/instructor/InstructorDashboard.tsx")
        break
      case Role.Aprendiz:
      case 'Apprentice':
      case 'Aprendiz':
        void import("@/pages/dashboard/apprentice/ApprenticeDashboard.tsx")
        break
      default:
        // Prefetch mínimos para rutas públicas
        void import("@/pages/landing/index")
        void import("@/pages/login/index.tsx")
        break
    }
  } catch {
    // Ignorar fallos de prefetch en entornos sin soporte dinámico
  }
}

// Eliminadas referencias a AUTH_STORAGE_KEY y sessionStorage para autenticación
// Persistencia ligera de usuario autenticado (sin tokens) para mejorar TTFB/TTI
const LS_AUTH_USER_KEY = 'auth:user'
const LS_AUTH_TTL = 24 * 60 * 60 * 1000 // 24 horas (persistencia en localStorage)
const LS_AUTH_RECENT_TS = 'auth:recent_ts'
const RECENT_WINDOW_MS = 2000 // evitar revalidación inmediata (2s) tras login
// Caché en memoria para reducir llamadas a /auth/me (1 hora)
const USER_CACHE_TTL = 60 * 60 * 1000 // 1 hora en memoria
const LS_USER_CACHE_KEY = 'auth:user:cache'
// DEV-only session key set by main.tsx via query params (devRole/impersonate/role)
const DEV_USER_SESSION_KEY = 'dev_user_data_session'

// Implementación real de helpers de localStorage con tolerancia a entornos sin storage
const lsGet = (k: string): string | null => {
  try {
    if (typeof window === 'undefined' || !('localStorage' in window)) return null
    const v = window.localStorage.getItem(k)
    return v && v.trim() ? v : null
  } catch {
    return null
  }
}
const lsSet = (k: string, v: string) => {
  try {
    if (typeof window === 'undefined' || !('localStorage' in window)) return
    window.localStorage.setItem(k, v)
  } catch { /* noop */ }
}
const lsRemove = (k: string) => {
  try {
    if (typeof window === 'undefined' || !('localStorage' in window)) return
    window.localStorage.removeItem(k)
  } catch { /* noop */ }
}

function safeJsonParse<T>(value: string | null): T | null {
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

// Caché de usuario con TTL de 1 hora para reducir llamadas a /auth/me
const setCachedUser = (u: User | null) => {
  try {
    if (!u) {
      lsRemove(LS_USER_CACHE_KEY)
      return
    }
    const payload = { user: u, cachedAt: Date.now() }
    lsSet(LS_USER_CACHE_KEY, JSON.stringify(payload))
    console.log('[AuthContext] Usuario cacheado por 1 hora')
  } catch { /* noop */ }
}

const getCachedUser = (): User | null => {
  try {
    const parsed = safeJsonParse<{ user?: User; cachedAt?: number }>(lsGet(LS_USER_CACHE_KEY))
    if (!parsed) return null
    const cachedAt = Number(parsed?.cachedAt || 0)
    const age = Date.now() - cachedAt

    if (!cachedAt || age > USER_CACHE_TTL) {
      // Expirado (> 1 hora): limpiar y devolver null
      lsRemove(LS_USER_CACHE_KEY)
      console.log('[AuthContext] Caché de usuario expirado (edad:', Math.round(age / 1000 / 60), 'min)')
      return null
    }

    console.log('[AuthContext] Usuario recuperado del caché (edad:', Math.round(age / 1000 / 60), 'min)')
    return parsed?.user || null
  } catch {
    return null
  }
}

const invalidateUserCache = () => {
  lsRemove(LS_USER_CACHE_KEY)
  console.log('[AuthContext] Caché de usuario invalidado')
}

const persistUser = (u: User | null) => {
  try {
    if (!u) {
      lsRemove(LS_AUTH_USER_KEY)
      lsRemove(LS_AUTH_RECENT_TS)
      invalidateUserCache()
      return
    }
    const payload = { user: u, ts: Date.now() }
    lsSet(LS_AUTH_USER_KEY, JSON.stringify(payload))
    // Marcar reciente para evitar revalidación inmediata en background
    lsSet(LS_AUTH_RECENT_TS, String(payload.ts))
    // También cachear por 1 hora
    setCachedUser(u)
  } catch { /* noop */ }
}

const readPersistedUser = (): User | null => {
  try {
    const parsed = safeJsonParse<{ user?: User; ts?: number }>(lsGet(LS_AUTH_USER_KEY))
    if (!parsed) return null
    const ts = Number(parsed?.ts || 0)
    if (!ts || (Date.now() - ts) > LS_AUTH_TTL) {
      // Expirado: limpiar y devolver null
      lsRemove(LS_AUTH_USER_KEY)
      return null
    }
    return parsed?.user || null
  } catch {
    return null
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [name, setName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const navigate = useNavigate()

 // Hacer que el role switch sea SOLO para entorno de desarrollo (ignorar flags en producción)
 const enableRoleSwitch = isDevelopment()

  const clearAuthState = useCallback(() => {
    setUser(null)
    setRole(null)
    setName(null)
    setIsAuthenticated(false)
    persistUser(null)
  }, [])

  // Controller para cancelar llamadas /auth/me en curso cuando cambie la vista o se dispare nuevamente
  const meAbortRef = useRef<AbortController | null>(null)
  const last429AtRef = useRef<number>(0)
  const meActiveOptsRef = useRef<{ background?: boolean } | null>(null)
  // BroadcastChannel para coordinar entre pestañas
  const bcRef = useRef<any>(null)
  const lastInflightTxAtRef = useRef<number>(0)
  const lastInflightRxAtRef = useRef<number>(0)
  // Helper para enviar mensajes por BroadcastChannel
  const postBC = (type: string, payload?: any) => {
    if (!bcRef.current) return
    try { bcRef.current.postMessage({ type, payload, ts: Date.now() }) } catch { /* noop */ }
  }

  // Verificar estado de autenticación
  const checkAuthStatus = useCallback(async (opts?: { background?: boolean; force?: boolean }) => {
    // Si hay una verificación en primer plano en curso, no iniciar otra en background para no abortar y dejar loading activo
    if (opts?.background && meAbortRef.current && meActiveOptsRef.current && !meActiveOptsRef.current.background) {
      return
    }

    // Suprimir revalidación en background si otra pestaña anunció inflight recientemente
    const nowStart = Date.now()
    if (opts?.background && lastInflightRxAtRef.current && (nowStart - lastInflightRxAtRef.current) < INFLIGHT_SUPPRESSION_WINDOW_MS) {
      return
    }

    // NUEVO: Intentar usar caché de 1 hora antes de llamar al backend
    if (!opts?.force) {
      const cachedUser = getCachedUser()
      if (cachedUser) {
        // Caché válido: usar datos cacheados sin llamar al backend
        setUser(cachedUser)
        setRole(cachedUser.role || null)
        setName(cachedUser.fullname || null)
        setIsAuthenticated(true)
        setLoading(false)
        prefetchRoleRoutes(cachedUser.role)
        console.log('[AuthContext] Usando usuario del caché (1h), evitando llamada a /auth/me')
        return
      }
    }

    // Evitar revalidación inmediata justo después de persistir (p. ej. tras login)
    const recentTsRaw = lsGet(LS_AUTH_RECENT_TS)
    const recentTs = recentTsRaw ? parseInt(recentTsRaw, 10) : 0
    const withinRecent = recentTs > 0 && (Date.now() - recentTs) < RECENT_WINDOW_MS
    if (withinRecent && opts?.background) {
      // Saltar revalidación en background si está dentro de la ventana reciente
      return
    }

    // Respeta cooldown tras 429 para evitar spam de /auth/me
    const now = Date.now()
    const since429 = now - (last429AtRef.current || 0)
    if (last429AtRef.current && since429 < RATE_LIMIT_COOLDOWN_MS) {
      if (opts?.background) return
      const persisted = readPersistedUser()
      if (persisted) {
        setLoading(false)
        // Propagar cooldown para que otras pestañas también respeten
        postBC('me:cooldown', { untilTs: Date.now() + (RATE_LIMIT_COOLDOWN_MS - since429) })
        return
      }
      // Si no hay datos persistidos y no podemos llamar /auth/me por cooldown, liberar la UI
      setLoading(false)
      postBC('me:cooldown', { untilTs: Date.now() + (RATE_LIMIT_COOLDOWN_MS - since429) })
      return
    }

    // Cancelar petición anterior si existía SOLO si no estamos en el caso de evitar background sobre foreground
    if (meAbortRef.current) {
      try { meAbortRef.current.abort() } catch { /* no-op */ }
    }
    const ctrl = new AbortController()
    meAbortRef.current = ctrl
    meActiveOptsRef.current = { background: !!opts?.background }

    if (!opts?.background) setLoading(true)
    // Anunciar inflight para coordinar con otras pestañas
    postBC('me:inflight')
    lastInflightTxAtRef.current = Date.now()

    try {
      const profile = await getUserProfile({ signal: ctrl.signal });
      if (meAbortRef.current !== ctrl || ctrl.signal.aborted) return

      const status = (profile as any)?.status
      const userFromApi = (profile as any)?.user ?? (profile as any)?.data?.user ?? null

      if (isDevelopment()) {
        console.debug('[Auth] /auth/me result:', { status, hasUser: !!userFromApi, rawRole: userFromApi?.role })
      }

      if (status === 429) {
        last429AtRef.current = Date.now()
        postBC('me:cooldown', { untilTs: Date.now() + RATE_LIMIT_COOLDOWN_MS })
        return
      }

      if (userFromApi) {
        const backendRole = userFromApi.role
        const canonRole = normalizeRole(backendRole) || (typeof backendRole === "string" ? backendRole : null)
        if (isDevelopment()) {
          console.debug('[Auth] normalizeRole:', { backendRole, canonRole, typeofBackendRole: typeof backendRole })
        }
        const normalizedUser = { ...userFromApi, role: canonRole } as User
        setUser(normalizedUser)
        setRole(canonRole)
        setName(normalizedUser.fullname)
        setIsAuthenticated(true)
        persistUser(normalizedUser)
        prefetchRoleRoutes(canonRole)
        // Compartir éxito con otras pestañas para evitar llamadas duplicadas
        postBC('me:success', { user: normalizedUser })
      } else {
        if (isDevelopment()) {
          console.debug('[Auth] /auth/me returned no user. status:', status)
        }
        if (status === 401) {
          // No cerrar sesión de forma agresiva si existe un usuario persistido (p.ej., cookies no disponibles temporalmente o desajuste de origen)
          const persisted = readPersistedUser()
          if (persisted) {
            if (isDevelopment()) {
              console.warn('[Auth] 401 en /auth/me, manteniendo estado persistido y revalidando en background.')
            }
            // Mantener estado actual; el interceptor intentará refresh si procede y se revalidará en próximos intentos
            // Opcional: notificar a otras pestañas del fallo suave
            postBC('me:soft-fail', { status })
          } else {
            clearAuthState()
          }
        } else {
          const persisted = readPersistedUser()
          if (!persisted) clearAuthState()
        }
      }
    } catch (error: any) {
      if (error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') {
        return
      }
      if (isDevelopment()) {
        console.error('[Auth] checkAuthStatus error:', error)
      }
      const persisted = readPersistedUser()
      if (persisted) {
        // Mantener estado actual; la sesión se revalidará en próximo intento
        // Si la llamada era en primer plano, apagar loading en finally
      } else {
        clearAuthState()
      }
    } finally {
      // Apagar loading si esta llamada es la activa y fue iniciada en primer plano
      if (meAbortRef.current === ctrl) {
        const activeIsForeground = meActiveOptsRef.current && !meActiveOptsRef.current.background
        if (activeIsForeground) setLoading(false)
      }
    }
  }, [clearAuthState])

  // Hidratar desde sessionStorage y revalidar en background
  useEffect(() => {
    // Bootstrap DEV impersonation if present (set by main.tsx) and only in development
    if (isDevelopment()) {
      const dev = safeJsonParse<{ role: any; fullname?: string; id?: any }>(lsGet(DEV_USER_SESSION_KEY))
      if (dev) {
        const canonRole = normalizeRole(dev.role) || (typeof dev.role === 'string' ? dev.role : null)
        if (canonRole) {
          const devUser: User = {
            id: Number(dev.id) || 0,
            identification: 0,
            fullname: dev.fullname || 'Dev User',
            email: 'dev@example.com',
            password: '',
            role: canonRole as any,
            status: true,
          }
          setUser(devUser)
          setRole(devUser.role)
          setName(devUser.fullname)
          setIsAuthenticated(true)
          setLoading(false)
          persistUser(devUser)
          prefetchRoleRoutes(devUser.role)
          return
        }
      }
    }
  
    const persisted = readPersistedUser()
    if (persisted) {
      setUser(persisted)
      setRole(persisted.role)
      setName(persisted.fullname)
      setIsAuthenticated(true)
      setLoading(false) // evitar pantalla de carga si tenemos datos locales
      prefetchRoleRoutes(persisted.role)
      // Revalidar en background para actualizar o limpiar si expiró sesión
      checkAuthStatus({ background: true })
    } else {
      // Sin datos locales: llamar /auth/me para validar sesión basada en cookie HttpOnly si existe
      checkAuthStatus()
    }
    return () => {
      if (meAbortRef.current) {
        try { meAbortRef.current.abort() } catch { /* no-op */ }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // Inicializar BroadcastChannel y listeners
  useEffect(() => {
    const BC = (globalThis as any).BroadcastChannel
    // Fallback si BroadcastChannel no está disponible: usar storage events
    if (!BC) {
      // Simular una interfaz mínima con postMessage para reutilizar postBC
      bcRef.current = {
        postMessage: (msg: any) => {
          try {
            const payload = { type: msg?.type, payload: msg?.payload, ts: Date.now() }
            localStorage.setItem(AUTH_BC_FALLBACK_KEY, JSON.stringify(payload))
          } catch { /* noop */ }
        }
      }

      const onMsg = (ev: any) => {
        const data = ev?.data || {}
        switch (data.type) {
          case 'me:inflight':
            lastInflightRxAtRef.current = Date.now()
            break
          case 'me:cooldown':
            last429AtRef.current = Date.now()
            setLoading(false)
            break
          case 'me:success': {
            const u = data?.payload?.user
            if (!u) break
            const canonRole = normalizeRole(u.role) || (typeof u.role === 'string' ? u.role : null)
            const normalizedUser = { ...u, role: canonRole } as User
            if (meAbortRef.current) { try { meAbortRef.current.abort() } catch { /* noop */ } }
            setUser(normalizedUser)
            setRole(canonRole)
            setName(normalizedUser.fullname)
            setIsAuthenticated(true)
            persistUser(normalizedUser)
            prefetchRoleRoutes(canonRole)
            setLoading(false)
            break
          }
          case 'logout': {
            const logout = async () => {
              try {
                await authServiceLogout()
                clearAuthState()
                postBC('logout')
                navigate('/', { replace: true })
                if (typeof window !== 'undefined') {
                  window.setTimeout(() => window.location.replace('/'), 50)
                }
              } catch {
                // noop
              }
            }
            logout()
            setLoading(false)
            break
          }
          default:
            break
        }
      }

      const onStorage = (e: StorageEvent) => {
        if (e.key !== AUTH_BC_FALLBACK_KEY || !e.newValue) return
        const parsed = safeJsonParse<any>(e.newValue)
        if (parsed) onMsg({ data: parsed })
      }
      window.addEventListener('storage', onStorage)

      return () => {
        window.removeEventListener('storage', onStorage)
      }
    }

    const bc = new BC(AUTH_BC_NAME)
    bcRef.current = bc

    const onMsg = (ev: any) => {
      const data = ev?.data || {}
      switch (data.type) {
        case 'me:inflight':
          lastInflightRxAtRef.current = Date.now()
          break
        case 'me:cooldown':
          last429AtRef.current = Date.now()
          setLoading(false)
          break
        case 'me:success': {
          const u = data?.payload?.user
          if (!u) break
          const canonRole = normalizeRole(u.role) || (typeof u.role === 'string' ? u.role : null)
          const normalizedUser = { ...u, role: canonRole } as User
          if (meAbortRef.current) { try { meAbortRef.current.abort() } catch { /* noop */ } }
          setUser(normalizedUser)
          setRole(canonRole)
          setName(normalizedUser.fullname)
          setIsAuthenticated(true)
          persistUser(normalizedUser)
          prefetchRoleRoutes(canonRole)
          setLoading(false)
          break
        }
        case 'logout': {
          const logout = async () => {
            try {
              // Llamar al endpoint /auth/logout para cerrar sesión en el backend
              await authServiceLogout();
              clearAuthState();
              postBC('logout');
              navigate('/', { replace: true });
              if (typeof window !== 'undefined') {
                window.setTimeout(() => window.location.replace('/'), 50);
              }
            } catch {
              // noop
            }
          }
          logout()
          setLoading(false)
          break
        }
        default:
          break
      }
    }

    // Compatibilidad con implementaciones de BroadcastChannel
    if (bc.addEventListener) {
      bc.addEventListener('message', onMsg)
    } else {
      bc.onmessage = onMsg
    }

    return () => {
      try { bc.close() } catch { /* noop */ }
    }
  }, [clearAuthState, navigate])

  // Login inmediato y redirección a rutas existentes según rol
  const login = useCallback((userData?: User, _token?: string) => {
    // Establecer estado inmediatamente con los datos proporcionados
    if (userData) {
      // Normalizar rol; si el backend retorna un rol desconocido (p. ej. "guest"), no lo forzamos a un rol válido
      const canon = normalizeRole((userData as any).role)
      const normalized = { ...userData, role: (canon || (userData as any).role) as any } as User
      setUser(normalized)
      setRole(normalized.role)
      setName(normalized.fullname)
      setIsAuthenticated(true)
      persistUser(normalized)

      // Elegir destino por rol usando rutas que existen en AppRoutes
      const roleToPath: Record<Role, string> = {
        [Role.Administrador]: '/admin/dashboard',
        [Role.Instructor]: '/instructor/dashboard',
        [Role.Aprendiz]: '/apprentice/dashboard',
      }
      // Prefetch oportunista antes de navegar (no bloquea)
      prefetchRoleRoutes(normalized.role)
      const dest = roleToPath[normalized.role as Role]
      if (dest) navigate(dest)
    } else {
      clearAuthState()
      navigate('/')
    }
  }, [clearAuthState, navigate])

  // Impersonate solo para DEV, cambia el estado local del rol
  const impersonateRole = useCallback((nextRole: RoleType) => {
    if (!enableRoleSwitch) return
    if (!user) return
    const newUser = { ...user, role: nextRole as any } as User
    setUser(newUser)
    setRole(newUser.role)
    setName(newUser.fullname)
    setIsAuthenticated(true)
    persistUser(newUser)
    prefetchRoleRoutes(newUser.role)
    const roleToPath: Record<Role, string> = {
      [Role.Administrador]: '/admin/dashboard',
      [Role.Instructor]: '/instructor/dashboard',
      [Role.Aprendiz]: '/apprentice/dashboard',
    }
    const nextPath = roleToPath[newUser.role as Role] || '/admin/dashboard'
    navigate(nextPath, { replace: true })
  }, [enableRoleSwitch, navigate, user])

  // Chequeo de permisos por rol
  const hasPermission = useCallback((permission: string) => {
    if (!user || !isAuthenticated) return false
    const rolePermissions: Record<Role, string[]> = {
      [Role.Administrador]: ['dashboard:read', 'user:read', 'user:write', 'system:read', 'system:write', 'animal:read', 'animal:write', 'treatment:read', 'treatment:write', 'task:read', 'task:write'],
      [Role.Instructor]: ['dashboard:read', 'user:read', 'animal:read', 'animal:write', 'treatment:read', 'treatment:write', 'task:read'],
      [Role.Aprendiz]: ['dashboard:read', 'animal:read', 'treatment:read', 'task:read'],
    }
    const userPermissions = rolePermissions[user.role] || []
    return userPermissions.includes(permission)
  }, [user, isAuthenticated])

  // Logout: llama a /auth/logout, limpia estado y coordina con otras pestañas
  const logout = useCallback(async () => {
    try {
      await authServiceLogout()
    } catch {
      // ignore logout errors
    } finally {
      clearAuthState()
      postBC('logout')
      navigate('/', { replace: true })
      if (typeof window !== 'undefined') {
        window.setTimeout(() => window.location.replace('/'), 50)
      }
    }
  }, [clearAuthState, navigate])

  // Método para refrescar datos del usuario (invalidando caché)
  const refreshUserData = useCallback(async () => {
    console.log('[AuthContext] Invalidando caché y refrescando datos del usuario')
    invalidateUserCache()
    await checkAuthStatus({ force: true })
  }, [checkAuthStatus])

  const value = useMemo<AuthContextType>(() => ({
    user,
    role: (role as RoleType | null),
    name,
    loading,
    isAuthenticated,
    login,
    logout,
    checkAuthStatus,
    refreshUserData,
    enableRoleSwitch,
    hasPermission,
    impersonateRole: enableRoleSwitch ? impersonateRole : undefined,
  }), [user, role, name, loading, isAuthenticated, login, logout, checkAuthStatus, refreshUserData, enableRoleSwitch, hasPermission, impersonateRole])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

const RATE_LIMIT_COOLDOWN_MS = 60_000; // 60s de enfriamiento tras 429

const AUTH_BC_NAME = 'auth:sync'
const INFLIGHT_SUPPRESSION_WINDOW_MS = 5000
const AUTH_BC_FALLBACK_KEY = 'auth:sync:storage'
