import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import fs from 'fs';
import { X509Certificate } from 'crypto';

// ===========================================================
// CONFIGURACIÓN VITE / REACT / DOCKER (finca / mifinca)
// ===========================================================
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const runtimeEnv = env.VITE_RUNTIME_ENV || mode;
  const isProd = runtimeEnv === 'production';

  // ===========================================================
  // BACKEND URL (por alias interno en Docker)
  // ===========================================================
  const backendUrl =
    env.VITE_API_BASE_URL ||
    (isProd ? 'http://finca:8081/api/v1' : 'http://finca:8081/api/v1');

  // ProxyTarget = backend sin /api/v1
  const proxyTarget = backendUrl.replace(/\/$/, '').replace(/\/api\/v1$/, '');

  // ===========================================================
  // HTTPS LOCAL (solo para desarrollo fuera de Docker)
  // ===========================================================
  let httpsConfig: any = undefined;
  if (command === 'serve' && !isProd) {
    const keyPath = path.resolve(__dirname, 'certificates', 'cert.key');
    const certPath = path.resolve(__dirname, 'certificates', 'cert.crt');
    const caPath = path.resolve(__dirname, 'certificates', 'ca.crt');

    if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
      console.warn('[HTTPS] Certificados no encontrados. Se usará HTTPS autogenerado.');
      httpsConfig = true;
    } else {
      const certBuf = fs.readFileSync(certPath);
      try {
        const x509 = new X509Certificate(certBuf);
        const validTo = new Date(x509.validTo);
        const daysRemaining = Math.floor((validTo.getTime() - Date.now()) / 86_400_000);
        if (daysRemaining < 0) {
          console.warn(`[HTTPS] Certificado expirado (${validTo.toISOString()}). Se usará HTTPS autogenerado.`);
          httpsConfig = true;
        } else if (daysRemaining <= 14) {
          console.warn(`[HTTPS] Advertencia: el certificado local expira en ${daysRemaining} días (${validTo.toISOString()}).`);
        }
      } catch (err) {
        console.warn('[HTTPS] No se pudo inspeccionar el certificado local:', err);
      }

      if (httpsConfig !== true) {
        httpsConfig = {
          key: fs.readFileSync(keyPath),
          cert: certBuf,
          ...(fs.existsSync(caPath) ? { ca: fs.readFileSync(caPath) } : {})
        };
      }
    }
  }

  // ===========================================================
  // CONFIGURACIÓN FINAL
  // ===========================================================
  return {
    plugins: [
      tailwindcss(),
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        manifest: {
          name: 'Finca Villa Luz',
          short_name: 'Finca',
          description: 'Gestión de finca - Trabaja offline en el campo',
          theme_color: '#166534',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          icons: [
            { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
            { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
          ]
        },
        workbox: {
          navigateFallback: '/index.html',
          cleanupOutdatedCaches: true,
          globPatterns: ['**/*.{js,css,html,svg,ico,png,jpg,jpeg,webp,woff,woff2}'],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          runtimeCaching: [
            {
              urlPattern: ({ url }) => url.pathname.startsWith('/api/v1/auth'),
              handler: 'NetworkOnly',
              options: { cacheName: 'auth-api-bypass', fetchOptions: { credentials: 'include' } }
            },
            {
              urlPattern: ({ url }) => {
                const master = ['diseases', 'breeds', 'species', 'medications', 'vaccines', 'fields', 'food_types', 'route_administrations'];
                return url.pathname.startsWith('/api/v1/') &&
                  master.some(r => url.pathname.includes(`/api/v1/${r}`)) &&
                  !url.pathname.startsWith('/api/v1/auth');
              },
              handler: 'CacheFirst',
              options: {
                cacheName: 'api-master-data',
                fetchOptions: { credentials: 'include' },
                expiration: { maxEntries: 100, maxAgeSeconds: 1800 },
              }
            },
            {
              urlPattern: ({ url }) => url.pathname.startsWith('/api/v1'),
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-fallback',
                fetchOptions: { credentials: 'include' },
                networkTimeoutSeconds: 5,
                expiration: { maxEntries: 200, maxAgeSeconds: 300 },
              }
            },
            {
              urlPattern: ({ request }) => request.destination === 'image',
              handler: 'StaleWhileRevalidate',
              options: { cacheName: 'images-cache', fetchOptions: { credentials: 'include' }, expiration: { maxEntries: 100, maxAgeSeconds: 604800 } }
            },
            {
              // Excluir fuentes de Google Fonts del cacheo con credenciales para evitar errores de CORS
              // Usar NetworkOnly para evitar completamente problemas de CORS con el service worker
              urlPattern: ({ url }) => url.origin.includes('fonts.gstatic.com') || url.origin.includes('fonts.googleapis.com'),
              handler: 'NetworkOnly', // No cachear en service worker, dejar que el navegador maneje las fuentes
              options: { 
                fetchOptions: { 
                  credentials: 'omit', // Sin credenciales para evitar CORS
                  mode: 'cors' // Asegurar modo CORS
                }
              }
            },
            {
              urlPattern: ({ request, url }) => {
                // Solo cachear fuentes locales, no externas
                const isFont = request.destination === 'font';
                const isLocal = !url.origin.includes('fonts.gstatic.com') && !url.origin.includes('fonts.googleapis.com');
                return ['style', 'script'].includes(request.destination) || (isFont && isLocal);
              },
              handler: 'CacheFirst',
              options: { cacheName: 'assets-cache', fetchOptions: { credentials: 'include' }, expiration: { maxEntries: 60, maxAgeSeconds: 2592000 } }
            }
          ],
          skipWaiting: true,
          clientsClaim: true
        },
        devOptions: {
          enabled: env.VITE_ENABLE_PWA_PREFETCH === 'true' && mode === 'development',
          navigateFallback: 'index.html'
        }
      })
    ],
    resolve: {
      alias: [
        { find: '@', replacement: path.resolve(__dirname, './src') },
        { find: '@/lib/utils', replacement: path.resolve(__dirname, './src/lib/utils.ts') }
      ],
      conditions: ['module'],
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json']
    },
    define: {
      __VITE_IMPORT_META_ENV__: 'import.meta.env'
    },
    esbuild: { target: 'esnext' },
    build: {
      target: 'esnext',
      sourcemap: true,
      chunkSizeWarningLimit: 1000
    },
    server: {
      https: httpsConfig,
      host: '0.0.0.0',
      port: 5180,
      strictPort: true,
      cors: true,
      proxy: {
        '/api/v1': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
          cookieDomainRewrite: '',
          cookiePathRewrite: '/',
          configure: (proxy) => {
            proxy.on('error', (err) => console.error('Proxy error:', err));
          }
        },
        '/public': { target: proxyTarget, changeOrigin: true, secure: false },
        '/static': { target: proxyTarget, changeOrigin: true, secure: false }
      }
    }
  };
});
