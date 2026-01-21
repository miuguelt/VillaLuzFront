import React, { StrictMode, Fragment, useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes'
import { AuthProvider } from './providers/AuthenticationContext'
// Removed setupApiInterceptors import; interceptors are configured within services/api on module load
import { CacheProvider } from './providers/CacheContext'
import { SidebarProvider } from './providers/SidebarContext'
import { ThemeProvider } from './providers/ThemeContext'
import { ToastProvider } from './providers/ToastContext'
import { I18nProvider } from '@/shared/i18n'
import { useToast } from './providers/ToastContext'
import { useCache } from './providers/CacheContext'
import { useAuth } from '@/features/auth/model/useAuth'
import { hasSessionCookies } from '@/shared/utils/cookieUtils'
import { refetchAllResources } from '@/shared/hooks/useResource'
import { PWAUpdateHandler } from '@/shared/ui/common/PWAUpdateHandler'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PrefetchManager } from '@/shared/ui/common/PrefetchManager'
import { OnlineStatusIndicator } from '@/shared/ui/common/OnlineStatusIndicator'
import sse, { connectSSE, closeSSE } from '@/lib/events'
import { publishEvent, subscribeBridge, claimLeadership } from '@/lib/eventsBridge'

// Configurar React Query Client con optimizaciones agresivas de caché
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Estrategia stale-while-revalidate para máxima fluidez
      refetchOnWindowFocus: false, // No refetch al cambiar de ventana
      refetchOnMount: false, // No refetch al montar si hay datos en caché
      refetchOnReconnect: true, // Solo refetch al reconectar
      retry: 2, // 2 reintentos para mayor resiliencia
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Backoff exponencial

      // Tiempos de caché optimizados para máxima fluidez
      staleTime: 5 * 60 * 1000, // 5 minutos - datos considerados frescos
      gcTime: 30 * 60 * 1000, // 30 minutos - mantener en memoria (antes: cacheTime)

      // Optimizaciones de red
      networkMode: 'offlineFirst', // Priorizar caché offline

      // Estructuración de errores
      throwOnError: false, // No lanzar errores, manejarlos gracefully

      // Refetch estratégico
      refetchInterval: false, // No refetch automático (salvo casos específicos)
      refetchIntervalInBackground: false,
    },
    mutations: {
      // Optimizaciones para mutaciones
      retry: 1, // 1 reintento para mutaciones
      retryDelay: 1000, // 1 segundo entre reintentos
      networkMode: 'online', // Mutaciones solo cuando hay conexión

      // Optimistic updates por defecto
      onMutate: undefined, // Permitir optimistic updates en componentes individuales
    },
  },
});

// CSS principal cargado desde index.html para evitar FOUC

// Recuperación defensiva ante fallos de carga de chunks (MIME incorrecto / módulo no encontrado)
(function registerChunkRecovery() {
  if (typeof window === 'undefined') return;
  const RECOVERY_FLAG = 'chunk-recovery-at';
  const now = Date.now();
  const last = Number(sessionStorage.getItem(RECOVERY_FLAG) || '0');
  // Evitar bucles infinitos: solo intentar una vez cada 90s
  if (now - last < 90_000) return;

  const recover = async () => {
    try {
      sessionStorage.setItem(RECOVERY_FLAG, String(Date.now()));
      // Limpiar caches del Service Worker y desregistrarlo
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k).catch(() => {})));
      }
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister().catch(() => {})));
      }
    } catch (err) {
      console.warn('[Recovery] Error limpiando caches/SW tras fallo de chunk', err);
    } finally {
      window.location.reload();
    }
  };

  const shouldRecover = (reason: any): boolean => {
    const msg = typeof reason === 'string'
      ? reason
      : reason?.message || reason?.toString?.() || '';
    return msg.includes('Failed to fetch dynamically imported module')
      || msg.includes('Expected a JavaScript or Wasm module script');
  };

  window.addEventListener('unhandledrejection', (event) => {
    if (shouldRecover(event?.reason)) {
      event?.preventDefault?.();
      recover();
    }
  });

  window.addEventListener('error', (event) => {
    // Detectar errores de módulo o scripts con MIME incorrecto
    const target = event?.target as any;
    const isScriptTag = target && target.tagName === 'SCRIPT';
    const msg = event?.message || '';
    if (shouldRecover(msg) || (isScriptTag && msg.includes('Failed to load module script'))) {
      event?.preventDefault?.();
      recover();
    }
  }, true);
})();

// Eliminar persistencia de autenticación en sessionStorage en main.tsx
// Limpieza one-time de claves legacy en localStorage (solo lectura/eliminación; no se vuelve a usar para persistencia)
(function legacyLocalStorageCleanup() {
  try {
    if (typeof window === 'undefined' || !('localStorage' in window)) return;
    const knownKeys = [
      'finca_access_token',
      'dev_user_data',
      'jwt_metadata',
      'auth:user',
      'auth:recent_ts',
      'auth:user:cache',
      'auth:auto_login_block',
      'auth:session_active',
      'offline_queue_v1',
      'sidebar-width',
      'theme',
      'finca_auth_login_path',
    ];
    for (const k of knownKeys) {
      try { window.localStorage.removeItem(k); } catch { /* noop */ }
    }
    const prefixList = ['app-cache:', 'offline_cache_v1:'];
    try {
      for (let i = window.localStorage.length - 1; i >= 0; i--) {
        const key = window.localStorage.key(i);
        if (!key) continue;
        if (prefixList.some(p => key.startsWith(p))) {
          try { window.localStorage.removeItem(key); } catch { /* noop */ }
        }
      }
    } catch { /* noop */ }
  } catch { /* noop */ }
})();

// Registrar Service Worker (PWA) con optimización de carga
const ENABLE_PWA = (import.meta as any)?.env?.VITE_ENABLE_PWA === 'true' || import.meta.env.PROD;

if (ENABLE_PWA && 'serviceWorker' in navigator) {
  // Registrar SW inmediatamente para mejor rendimiento
  const registerServiceWorker = async () => {
    try {
      const { registerSW } = await import('virtual:pwa-register');
      registerSW({
        immediate: true,
        onRegistered(swReg) {
          console.log('[PWA] Service Worker registrado', swReg);
          // Estrategia de precarga inteligente
          if (swReg?.active) {
            // Precargar rutas críticas después de que la app esté lista
            setTimeout(() => {
              // Prefetch SPA shell bajo el base proxied; evitar prefetch de endpoints API para no generar aborts en dev
              const ENABLE_PWA_PREFETCH = (import.meta as any)?.env?.VITE_ENABLE_PWA_PREFETCH === 'true';
              if (ENABLE_PWA_PREFETCH) {
                const criticalRoutes = ['/dashboard'];
                criticalRoutes.forEach(route => {
                  fetch(route, {
                    // Use GET for broader compatibility (some backends don't implement HEAD)
                    method: 'GET',
                    cache: 'force-cache',
                    credentials: 'include'
                  }).catch(() => {
                    // Silenciosamente fallar precarga
                  });
                });
              }
            }, 2000);
          }
        },
        onRegisterError(error) {
          console.error('[PWA] Error registrando Service Worker', error);
        },
      });

      // Obtener la instancia real del Service Worker registration para manejar actualizaciones
      navigator.serviceWorker.ready.then((registration) => {
        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing;
          installingWorker?.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Notificar al usuario sobre actualización disponible
              const event = new CustomEvent('pwa-update-available');
              window.dispatchEvent(event);
            }
          });
        });
      }).catch(() => {
        // Silenciosamente fallar manejo de actualizaciones
      });

    } catch (err) {
      console.warn('[PWA] Registro SW no disponible en este entorno', err);
    }
  };

  // Registrar SW en load pero también intentar inmediatamente para mejor PWA
  if (document.readyState === 'complete') {
    registerServiceWorker();
  } else {
    window.addEventListener('load', registerServiceWorker);
  }
} else {
  // En preview/desarrollo sin PWA: asegurarse de no tener SW/caches antiguas que sirvan bundles obsoletos
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations?.().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister().catch(() => {});
      }
    }).catch(() => {});
  }
  if (window.caches?.keys) {
    window.caches.keys().then((keys) => {
      keys.forEach((key) => {
        window.caches.delete(key).catch(() => {});
      });
    }).catch(() => {});
  }
}

// Puente React para notificaciones y sincronización al cambiar estado de red
function GlobalNetworkHandlers() {
  const { showToast } = useToast();
  const { preloadCriticalRoutes } = useCache();
  const { isAuthenticated } = useAuth();
  const preloadStartedRef = useRef(false);
  const lastRateLimitAtRef = useRef<number>(0);
  const cookiesReadyRef = useRef(false);

  useEffect(() => {
    const onOnline = async () => {
      try {
        showToast('Conexión restablecida. Sincronizando operaciones y refrescando datos…', 'info');
        await refetchAllResources();
        showToast('Datos actualizados tras recuperar la red.', 'success');
      } catch (e) {
        console.warn('[Network] Error al refrescar datos tras reconexión', e);
        showToast('Reconectado, pero ocurrió un error al refrescar datos.', 'warning');
      }
    };

    const onOffline = () => {
      showToast('Sin conexión. Navegación offline habilitada con datos cacheados.', 'warning');
    };

    const onQueueFlushed = (e: Event) => {
      try {
        const detail = (e as CustomEvent).detail;
        const remaining = detail?.remaining ?? 0;
        const message = remaining === 0
          ? 'Sincronización offline completada. Todo al día.'
          : `Sincronización completada con ${remaining} pendientes.`;
        showToast(message, 'success');
      } catch {
        showToast('Sincronización offline completada.', 'success');
      }
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('offline-queue-flushed', onQueueFlushed as EventListener);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('offline-queue-flushed', onQueueFlushed as EventListener);
    };
  }, [showToast]);

  // Aviso global para límite de solicitudes excedido (HTTP 429)
  useEffect(() => {
    const onRateLimitExceeded = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      const endpointLabel =
        typeof detail?.endpoint === 'string'
          ? (detail.endpoint.includes('animals') ? 'Animales' : detail.endpoint)
          : 'API';
      const now = Date.now();
      if (now - lastRateLimitAtRef.current < 15000) return; // evitar spam de toasts
      lastRateLimitAtRef.current = now;
      const wait = typeof detail?.waitSeconds === 'number' && detail.waitSeconds > 0 ? detail.waitSeconds : undefined;
      const waitText = wait ? ` Inténtalo nuevamente en ${wait} segundos.` : '';
      showToast(
        `Se alcanzó el límite de solicitudes en ${endpointLabel}. El servidor indicó RATE_LIMIT_EXCEEDED.${waitText}`,
        'warning',
        6000
      );
    };
    window.addEventListener('rate-limit-exceeded', onRateLimitExceeded as EventListener);
    return () => {
      window.removeEventListener('rate-limit-exceeded', onRateLimitExceeded as EventListener);
    };
  }, [showToast]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const parseEvent = (raw: any) => {
      try {
        const obj = typeof raw === 'string' ? JSON.parse(raw) : raw || {};
        const endpoint = obj.endpoint || obj.path || obj.resource || obj.collection || obj.model || obj.entity || obj.table;
        const action = obj.action || obj.event || obj.type;
        const id = obj.id ?? obj.pk ?? obj.item_id ?? obj.itemId;
        const ep = endpoint ? String(endpoint).split('/').filter(Boolean).pop() : undefined;
        return { endpoint: ep, action, id };
      } catch {
        return {};
      }
    };

    let unsubscribeSse: (() => void) | null = null;
    let unsubscribeBridge: (() => void) | null = null;
    let releaseLeader: (() => void) | null = null;
    let isCurrentLeader = false;

    const init = () => {
      const { isLeader, release } = claimLeadership();
      releaseLeader = release;
      if (isLeader) {
        isCurrentLeader = true;
        connectSSE();
        unsubscribeSse = sse.subscribe((payload) => {
          publishEvent(payload);
          const parsed = parseEvent(payload);
          try { window.dispatchEvent(new CustomEvent('server-global-change', { detail: parsed })); } catch { /* noop */ }
          try { window.dispatchEvent(new CustomEvent('server-resource-changed', { detail: parsed })); } catch { /* noop */ }
        });
      } else {
        isCurrentLeader = false;
        unsubscribeBridge = subscribeBridge((payload) => {
          const parsed = parseEvent(payload);
          try { window.dispatchEvent(new CustomEvent('server-global-change', { detail: parsed })); } catch { /* noop */ }
          try { window.dispatchEvent(new CustomEvent('server-resource-changed', { detail: parsed })); } catch { /* noop */ }
        });
      }
    };

    if (!cookiesReadyRef.current && !hasSessionCookies()) {
      const t = setTimeout(() => {
        cookiesReadyRef.current = hasSessionCookies();
        if (cookiesReadyRef.current) init();
      }, 1000);
      return () => clearTimeout(t);
    }
    init();

    return () => {
      if (isCurrentLeader) {
        closeSSE();
      }
      try { unsubscribeSse?.(); } catch { /* noop */ }
      try { unsubscribeBridge?.(); } catch { /* noop */ }
      try { releaseLeader?.(); } catch { /* noop */ }
    };
  }, [isAuthenticated]);

  // Precarga inteligente SÓLO cuando la autenticación está lista y DESPUÉS de que cargue el dashboard
  useEffect(() => {
    if (preloadStartedRef.current) return;
    if (!isAuthenticated) return; // Gate por auth: sin sesión no se precargan endpoints protegidos
    // Gate adicional: requerir cookies de sesión visibles
    if (!cookiesReadyRef.current && !hasSessionCookies()) {
      // Reintentar en breve para dar tiempo a que el navegador persista las cookies HttpOnly
      setTimeout(() => {
        cookiesReadyRef.current = hasSessionCookies();
        if (cookiesReadyRef.current && !preloadStartedRef.current) {
          preloadStartedRef.current = true;
          preloadCriticalRoutes();
          console.log('[Cache] Precarga inteligente activada tras detectar cookies de sesión');
        }
      }, 1500);
      return;
    }
    preloadStartedRef.current = true;

    // OPTIMIZACIÓN: Reducir delay para precarga más rápida (1s vs 5s)
    const timer = setTimeout(() => {
      try {
        preloadCriticalRoutes();
        console.log('[Cache] Precarga inteligente de rutas críticas activada (post-auth)');
      } catch (error) {
        console.warn('[Cache] Error en precarga inteligente:', error);
      }
    }, 1000); // 1s tras estar autenticado (optimizado para velocidad)

    return () => clearTimeout(timer);
  }, [preloadCriticalRoutes, isAuthenticated]);

  return null;
}

// Verificación de Tailwind en runtime (solo en desarrollo)
if ((import.meta as any)?.env?.DEV) {
  setTimeout(() => {
    const el = document.createElement('div');
    el.className = 'hidden bg-red-500';
    document.body.appendChild(el);
    const style = window.getComputedStyle(el);
    const hasDisplayNone = style.display === 'none';
    const hasBg = !!style.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)';
    console.log('[TailwindCheck] active:', hasDisplayNone || hasBg, { display: style.display, background: style.backgroundColor });
    document.body.removeChild(el);
  }, 0);
}

// Helper DEV: permitir impersonar rol vía querystring (?devRole=Administrador)
if ((import.meta as any)?.env?.DEV) {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has('clearDev')) {
      sessionStorage.removeItem('dev_user_data_session');
      console.log('[DevImpersonate] cleared dev_user_data_session');
    }
    const devRole = params.get('devRole') || params.get('impersonate') || params.get('role');
    if (devRole) {
      const devName = params.get('devName') || 'Dev User';
      const devId = params.get('devId') || '0';
      const payload = { role: devRole, fullname: devName, id: devId };
      sessionStorage.setItem('dev_user_data_session', JSON.stringify(payload));
      console.log('[DevImpersonate] session set:', payload);
    }
  } catch (e) {
    console.warn('[DevImpersonate] failed to set from query:', e);
  }
}

const UseWrapper = (import.meta as any)?.env?.VITE_ENABLE_STRICT_MODE === 'true' ? StrictMode : Fragment;

createRoot(document.getElementById('root')!).render(
  <UseWrapper>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <CacheProvider>
          <SidebarProvider>
            <ThemeProvider>
              <I18nProvider>
                <ToastProvider>
                  <AuthProvider>
                    {/* Bridge para toasts y refetch al recuperar red y precargas post-auth */}
                    <GlobalNetworkHandlers />
                    {/* Sistema inteligente de prefetching para máxima fluidez */}
                    <PrefetchManager />
                    <AppRoutes />
                    <OnlineStatusIndicator />
                    <PWAUpdateHandler />
                  </AuthProvider>
                </ToastProvider>
              </I18nProvider>
              </ThemeProvider>
          </SidebarProvider>
        </CacheProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </UseWrapper>
);
