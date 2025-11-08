import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import fs from 'fs';
import { X509Certificate } from 'crypto';

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Control explícito del entorno vía VITE_RUNTIME_ENV (sobrescribe mode)
  const runtimeEnv = (env.VITE_RUNTIME_ENV || mode);
  const isProd = runtimeEnv === 'production';
  // Backend por defecto según entorno
  const backendUrl = env.VITE_API_BASE_URL || (isProd ? 'https://finca.isladigital.xyz' : 'http://127.0.0.1:8081');
  // Preservar el esquema (http/https) definido en backendUrl; eliminar sufijo /api/v1 si viene.
  const proxyTarget = backendUrl.replace(/\/$/, '').replace(/\/api\/v1$/, '');

  // Configuración HTTPS sólo para dev server;
  // evita que la build de producción falle si faltan certificados.
  let httpsConfig: any = undefined;
  if (command === 'serve') {
    const keyPath = path.resolve(__dirname, 'certificates', 'cert.key');
    const certPath = path.resolve(__dirname, 'certificates', 'cert.crt');
    const caPath = path.resolve(__dirname, 'certificates', 'ca.crt');

    if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
      console.warn('[HTTPS] Certificados no encontrados en ./certificates (cert.key, cert.crt). Se forzará HTTPS usando certificado autogenerado de Vite.');
      // Permite a Vite levantar HTTPS con certificado autogenerado (devcert)
      httpsConfig = true;
    } else {
      const certBuf = fs.readFileSync(certPath);
      try {
        const x509 = new X509Certificate(certBuf);
        const validTo = new Date(x509.validTo);
        if (!isNaN(validTo.getTime())) {
          const daysRemaining = Math.floor((validTo.getTime() - Date.now()) / 86_400_000);
          if (daysRemaining < 0) {
            console.warn(`[HTTPS] El certificado local ha expirado (${validTo.toISOString()}). Se usará HTTPS autogenerado de Vite.`);
            httpsConfig = true;
          } else if (daysRemaining <= 14) {
            console.warn(`[HTTPS] Advertencia: el certificado local expira en ${daysRemaining} días (${validTo.toISOString()}).`);
          }
        } else {
          console.warn('[HTTPS] No se pudo determinar la fecha de expiración del certificado local.');
        }
      } catch (err) {
        console.warn('[HTTPS] No fue posible inspeccionar el certificado local para validar su expiración:', err);
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
          description: 'Sistema de gestión de finca - Trabaja offline en el campo',
          theme_color: '#166534',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ],
        },
        workbox: {
          navigateFallback: '/index.html',
          globPatterns: ['**/*.{js,css,html,svg,ico,png,jpg,jpeg,webp,woff,woff2}'],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB para imágenes grandes
          runtimeCaching: [
            // Auth endpoints - siempre NetworkOnly (nunca cachear)
            {
              urlPattern: ({ url }) => url.pathname.startsWith('/api/v1/auth'),
              handler: 'NetworkOnly',
              options: { cacheName: 'auth-api-bypass' }
            },
            // Datos maestros (diseases, breeds, species, etc.) - CacheFirst para offline
            {
              urlPattern: ({ url }) => {
                const masterResources = ['diseases', 'breeds', 'species', 'medications', 'vaccines', 'fields', 'food_types', 'route_administrations'];
                return url.pathname.startsWith('/api/v1/') &&
                       masterResources.some(r => url.pathname.includes(`/api/v1/${r}`)) &&
                       !url.pathname.startsWith('/api/v1/auth');
              },
              handler: 'CacheFirst',
              options: {
                cacheName: 'api-master-data',
                matchOptions: { ignoreVary: true },
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 30 * 60, // 30 minutos
                },
                plugins: [
                  {
                    cacheWillUpdate: async ({ response }) => {
                      if (!response || response.status !== 200) return null;
                      return response;
                    }
                  }
                ]
              }
            },
            // Datos transaccionales - StaleWhileRevalidate (mostrar cache, actualizar en background)
            {
              urlPattern: ({ url }) => {
                const transactionalResources = ['vaccinations', 'treatments', 'animal_diseases', 'treatment_medications', 'treatment_vaccines', 'controls', 'animals', 'animal_fields', 'genetic_improvements'];
                return url.pathname.startsWith('/api/v1/') &&
                       transactionalResources.some(r => url.pathname.includes(`/api/v1/${r}`)) &&
                       !url.pathname.startsWith('/api/v1/auth');
              },
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-transactional-data',
                networkTimeoutSeconds: 5,
                matchOptions: { ignoreVary: true },
                expiration: {
                  maxEntries: 200,
                  maxAgeSeconds: 5 * 60, // 5 minutos
                },
                plugins: [
                  {
                    cacheWillUpdate: async ({ response }) => {
                      if (!response || response.status !== 200) return null;
                      return response;
                    }
                  }
                ]
              }
            },
            // Datos de usuario - NetworkFirst (intentar red primero, fallback a cache)
            {
              urlPattern: ({ url }) => {
                const userResources = ['users'];
                return url.pathname.startsWith('/api/v1/') &&
                       userResources.some(r => url.pathname.includes(`/api/v1/${r}`)) &&
                       !url.pathname.startsWith('/api/v1/auth');
              },
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-user-data',
                networkTimeoutSeconds: 3,
                matchOptions: { ignoreVary: true },
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60, // 1 minuto
                },
                plugins: [
                  {
                    cacheWillUpdate: async ({ response }) => {
                      if (!response || response.status !== 200) return null;
                      return response;
                    }
                  }
                ]
              }
            },
            // Fallback para otros endpoints API - NetworkFirst
            {
              urlPattern: ({ url }) => url.pathname.startsWith('/api/v1') && !url.pathname.startsWith('/api/v1/auth'),
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache-fallback',
                networkTimeoutSeconds: 3,
                matchOptions: { ignoreVary: true },
                plugins: [
                  {
                    cacheWillUpdate: async ({ response }) => {
                      if (!response || response.status !== 200) return null;
                      return response;
                    }
                  }
                ]
              }
            },
            // Imágenes - StaleWhileRevalidate (mostrar cache, actualizar en background)
            {
              urlPattern: ({ request }) => request.destination === 'image',
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'images-cache',
                expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 }, // 7 días
              }
            },
            // Assets estáticos - CacheFirst (JS, CSS, fonts)
            {
              urlPattern: ({ request }) => ['style', 'script', 'worker', 'font'].includes(request.destination),
              handler: 'CacheFirst',
              options: {
                cacheName: 'assets-cache',
                expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 } // 30 días
              }
            },
          ],
          skipWaiting: true,
          clientsClaim: true,
        },
        devOptions: {
          // Habilitar PWA en desarrollo solo si VITE_ENABLE_PWA=true
          enabled: (env.VITE_ENABLE_PWA === 'true') && mode === 'development',
          navigateFallback: 'index.html',
        }
      }),
    ],
    resolve: {
        alias: [
          { find: '@', replacement: path.resolve(__dirname, './src') },
          // Ensure extension resolution for cn helper across environments
          { find: '@/lib/utils', replacement: path.resolve(__dirname, './src/lib/utils.ts') },
        ],
        conditions: ['module'],
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.json']
      },
      esbuild: {
      target: 'esnext'
    },
    build: {
      target: 'esnext',
      sourcemap: true,
      rollupOptions: {
        external: ['color'],
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-popover', '@radix-ui/react-tabs'],
            'forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
            'charts': ['recharts'],
          },
        },
      },
      chunkSizeWarningLimit: 1000
    },
    server: {
      https: httpsConfig,
      host: env.VITE_DEV_HOST || 'localhost',
      port: 5180, // Cambiar puerto a 5180
      cors: true,
      strictPort: true,
      proxy: {
        '/api/v1': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
          cookieDomainRewrite: '',
          cookiePathRewrite: '/',
          configure: (proxy) => {
            proxy.on('error', (err) => {
              console.log('Proxy error:', err);
            });
            proxy.on('proxyReq', (_ /* not used */, req) => {
              console.log('Sending Request to the Target:', req.method, req.url);
            });
            proxy.on('proxyRes', (proxyRes, req) => {
              const setCookie = proxyRes.headers['set-cookie'];
              if (setCookie) {
                console.log('Received Set-Cookie from target for', req.method, req.url, '=>', setCookie);
              } else if (req.url && req.url.includes('/auth/')) {
                console.log('No Set-Cookie header for', req.method, req.url, 'status:', proxyRes.statusCode);
              }
            });
          }
        },
        // Proxy para rutas estáticas (imágenes y uploads) en desarrollo
        '/public': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },
        '/static': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        }
      }
    }
  };
});