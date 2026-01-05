/**
 * Configuración de entorno seguro para Jest y Vite
 * Proporciona acceso consistente a variables de entorno en ambos entornos
 */

// Safe ENV accessor for Jest/Node and Vite browser
const ENV: Record<string, any> = ((globalThis as any)?.['import']?.['meta']?.['env'])
  ?? ((typeof (globalThis as any).process !== 'undefined' ? ((globalThis as any).process as any).env : undefined) as any)
  ?? {};

const IS_DEV: boolean = (typeof ENV.DEV !== 'undefined' ? !!ENV.DEV : (ENV.NODE_ENV !== 'production'));

export { ENV, IS_DEV };