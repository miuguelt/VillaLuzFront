import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
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
      // Temporarily disable PWA for Docker build debugging
      // VitePWA({
      //   registerType: 'autoUpdate',
      //   manifest: {
      //     name: 'Finca Villa Luz',
      //     short_name: 'Finca',
      //     description: 'Gestión de finca - offline first',
      //     theme_color: '#166534',
      //     background_color: '#ffffff',
      //     display: 'standalone',
      //     start_url: '/',
      //     icons: [
      //       { src: '/favicon.ico', sizes: '64x64 32x32 24x24 16x16', type: 'image/x-icon' }
      //     ],
      //   },
      //   workbox: {
      //     navigateFallback: '/index.html',
      //     globPatterns: ['**/*.{js,css,html,svg,ico,png,jpg,jpeg}'],
      //     runtimeCaching: [
      //       // Auth endpoints - siempre NetworkOnly
      //       {
      //         urlPattern: ({ url }) => url.pathname.startsWith('/api/v1/auth'),
      //         handler: 'NetworkOnly',
      //         options: { cacheName: 'auth-api-bypass' }
      //       },
      // 
      //       // Datos maestros (diseases, breeds, species, etc.) - CacheFirst
      //       {
      //         urlPattern: ({ url }) => {
      //           const masterResources = ['diseases', 'breeds', 'species', 'medications', 'vaccines', 'fields', 'food_types', 'route_administrations'];
      //           return url.pathname.startsWith('/api/v1/') &&
      //                  masterResources.some(r => url.pathname.includes(`/api/v1/${r}`)) &&
      //                  !url.pathname.startsWith('/api/v1/auth');
      //         },
      //         handler: 'CacheFirst',
      //         options: {
      //           cacheName: 'api-master-data',
      //           matchOptions: { ignoreVary: true },
      //           expiration: {
      //             maxEntries: 100,
      //             maxAgeSeconds: 30 * 60, // 30 minutos
      //           },
      //           plugins: [
      //             {
      //               cacheWillUpdate: async ({ response }) => {
      //                 // Solo cachear respuestas 200 OK
      //                 if (!response || response.status !== 200) return null;
      // 
      //                 // Respetar header X-Cache-Strategy si viene
      //                 const strategy = response.headers.get('X-Cache-Strategy');
      //                 if (strategy && strategy !== 'cache-first') return null;
      // 
      //                 return response;
      //               }
      //             }
      //           ]
      //         }
      //       },
      // 
      //       // Datos transaccionales (vaccinations, treatments, etc.) - StaleWhileRevalidate
      //       {
      //         urlPattern: ({ url }) => {
      //           const transactionalResources = ['vaccinations', 'treatments', 'animal_diseases', 'treatment_medications', 'treatment_vaccines', 'controls', 'animals', 'animal_fields'];
      //           return url.pathname.startsWith('/api/v1/') &&
      //                  transactionalResources.some(r => url.pathname.includes(`/api/v1/${r}`)) &&
      //                  !url.pathname.startsWith('/api/v1/auth');
      //         },
      //         handler: 'StaleWhileRevalidate',
      //         options: {
      //           cacheName: 'api-transactional-data',
      //           matchOptions: { ignoreVary: true },
      //           expiration: {
      //             maxEntries: 200,
      //             maxAgeSeconds: 2 * 60, // 2 minutos
      //           },
      //           plugins: [
      //             {
      //               cacheWillUpdate: async ({ response }) => {
      //                 if (!response || response.status !== 200) return null;
      //                 return response;
      //               }
      //             }
      //           ]
      //         }
      //       },
      // 
      //       // Datos de usuario - NetworkFirst (críticos, siempre intentar red)
      //       {
      //         urlPattern: ({ url }) => {
      //           const userResources = ['users'];
      //           return url.pathname.startsWith('/api/v1/') &&
      //                  userResources.some(r => url.pathname.includes(`/api/v1/${r}`)) &&
      //                  !url.pathname.startsWith('/api/v1/auth');
      //         },
      //         handler: 'NetworkFirst',
      //         options: {
      //           cacheName: 'api-user-data',
      //           networkTimeoutSeconds: 3,
      //           matchOptions: { ignoreVary: true },
      //           expiration: {
      //             maxEntries: 50,
      //             maxAgeSeconds: 60, // 1 minuto
      //           },
      //           plugins: [
      //             {
      //               cacheWillUpdate: async ({ response }) => {
      //                 if (!response || response.status !== 200) return null;
      //                 return response;
      //               }
      //             }
      //           ]
      //         }
      //       },
      // 
      //       // Fallback para otros endpoints API - NetworkFirst
      //       {
      //         urlPattern: ({ url }) => url.pathname.startsWith('/api/v1') && !url.pathname.startsWith('/api/v1/auth'),
      //         handler: 'NetworkFirst',
      //         options: {
      //           cacheName: 'api-cache-fallback',
      //           networkTimeoutSeconds: 3,
      //           matchOptions: { ignoreVary: true },
      //           plugins: [
      //             {
      //               cacheWillUpdate: async ({ response }) => {
      //                 if (!response || response.status !== 200) return null;
      //                 return response;
      //               }
      //             }
      //           ]
      //         }
      //       },
      // 
      //       // Imágenes - StaleWhileRevalidate
      //       {
      //         urlPattern: ({ request }) => request.destination === 'image',
      //         handler: 'StaleWhileRevalidate',
      //         options: {
      //           cacheName: 'images-cache',
      //           expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 },
      //         }
      //       },
      // 
      //       // Assets estáticos - StaleWhileRevalidate
      //       {
      //         urlPattern: ({ request }) => ['style', 'script', 'worker'].includes(request.destination),
      //         handler: 'StaleWhileRevalidate',
      //         options: { cacheName: 'assets-cache' }
      //       },
      //     ],
      //     skipWaiting: true,
      //     clientsClaim: true,
      //   },
      //   devOptions: {
      //     // Habilita el SW de desarrollo solo si está explícitamente activado por variable
      //     enabled: (env.VITE_ENABLE_PWA === 'true') && mode === 'development',
      //     navigateFallback: 'index.html',
      //   }
      // }),
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