/// <reference types="vite/client" />
/// <reference types="react" />
/// <reference types="react-dom" />
/// <reference types="node" />

// Tipos para vite-plugin-pwa virtual modules
declare module 'virtual:pwa-register' {
  export type RegisterSWOptions = {
    immediate?: boolean
    onNeedRefresh?: () => void
    onOfflineReady?: () => void
    onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void
    onRegisterError?: (error: any) => void
  }
  export function registerSW(options?: RegisterSWOptions): (reloadPage?: boolean) => Promise<void>
}