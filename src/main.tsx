import React, { StrictMode, Fragment, useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './components/routes/AppRoutes.tsx'
import { AuthProvider } from './context/AuthenticationContext'
// Removed setupApiInterceptors import; interceptors are configured within services/api on module load
import { CacheProvider } from './context/CacheContext'
import { SidebarProvider } from './context/SidebarContext'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './context/ToastContext'
import { I18nProvider } from './i18n'
import { useToast } from './context/ToastContext'
import { useCache } from './context/CacheContext'
import { useAuth } from '@/hooks/useAuth'
import { refetchAllResources } from './hooks/useResource'
import { PWAUpdateHandler } from './components/common/PWAUpdateHandler'

// CSS principal cargado desde index.html para evitar FOUC

// Eliminar persistencia de autenticación en sessionStorage en main.tsx
// Limpieza one-time de claves legacy en localStorage (solo lectura/eliminación; no se vuelve a usar para persistencia)
(function legacyLocalStorageCleanup() {
  try {
    if (typeof window === 'undefined' || !('localStorage' in window)) return;
    const knownKeys = [
      'finca_access_token',
      'dev_user_data',
      'jwt_metadata',
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
const ENABLE_PWA = (import.meta as any)?.env?.VITE_ENABLE_PWA === 'true';

if (ENABLE_PWA && 'serviceWorker' in navigator) {
  // Registrar SW inmediatamente para mejor rendimiento
  const registerServiceWorker = async () => {
    try {
      const { registerSW } = await import('virtual:pwa-register');
      const unregisterSW = registerSW({
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

  // Precarga inteligente SÓLO cuando la autenticación está lista y DESPUÉS de que cargue el dashboard
  useEffect(() => {
    if (preloadStartedRef.current) return;
    if (!isAuthenticated) return; // Gate por auth: sin sesión no se precargan endpoints protegidos
    preloadStartedRef.current = true;

    // Aumentar delay para evitar competir con llamadas críticas del dashboard
    const timer = setTimeout(() => {
      try {
        preloadCriticalRoutes();
        console.log('[Cache] Precarga inteligente de rutas críticas activada (post-auth)');
      } catch (error) {
        console.warn('[Cache] Error en precarga inteligente:', error);
      }
    }, 5000); // 5s tras estar autenticado (optimizado para no interferir)

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
                  <AppRoutes />
                  <PWAUpdateHandler />
                </AuthProvider>
              </ToastProvider>
            </I18nProvider>
            </ThemeProvider>
        </SidebarProvider>
      </CacheProvider>
    </BrowserRouter>
  </UseWrapper>
);
