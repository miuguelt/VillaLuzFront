// Unified access to Vite (import.meta.env) and Jest/Node (process.env) environments
// Works in browser/Vite build, and Jest tests where we polyfill import meta replacements.

declare const __VITE_IMPORT_META_ENV__: Record<string, any> | undefined;

const resolveImportMetaEnv = (): Record<string, any> | undefined => {
  try {
    if (typeof __VITE_IMPORT_META_ENV__ !== 'undefined') {
      return __VITE_IMPORT_META_ENV__;
    }
  } catch {
    // __VITE_IMPORT_META_ENV__ no disponible (entornos Node/jest)
  }
  return undefined;
};

export const VITE_ENV: Record<string, any> = (() => {
  // Preferir la constante definida por Vite (reemplazada por import.meta.env en build).
  const fromDefine = resolveImportMetaEnv();
  if (fromDefine) return fromDefine;

  // Jest polyfill support (setupTests asigna globalThis.import.meta.env)
  const poly = (globalThis as any)?.import?.meta?.env;
  if (poly) return poly;

  // Fallback a process.env cuando está disponible (scripts Node)
  if (typeof (globalThis as any).process !== 'undefined') {
    return ((globalThis as any).process as any).env || {};
  }

  return {};
})();

export const getEnvVar = <T = string>(key: string, defaultValue?: T): any => {
  const v = (VITE_ENV as any)[key];
  return typeof v === 'undefined' ? defaultValue : v;
};

export const isDevMode = (): boolean => {
  if (typeof VITE_ENV.DEV !== 'undefined') return !!VITE_ENV.DEV;
  if (typeof VITE_ENV.MODE !== 'undefined') return VITE_ENV.MODE === 'development';
  if (typeof VITE_ENV.NODE_ENV !== 'undefined') return VITE_ENV.NODE_ENV !== 'production';
  return false;
};

// Runtime env derivado principalmente de VITE_RUNTIME_ENV, con fallback a MODE/NODE_ENV
export const getRuntimeEnv = (): 'development' | 'production' => {
  const runtime = (VITE_ENV as any)?.VITE_RUNTIME_ENV as string | undefined;
  const mode = (VITE_ENV as any)?.MODE as string | undefined;
  const nodeEnv = (VITE_ENV as any)?.NODE_ENV as string | undefined;
  const val = (runtime || mode || (nodeEnv === 'production' ? 'production' : 'development'))?.toLowerCase();
  return val === 'production' ? 'production' : 'development';
};

export const isProductionEnv = (): boolean => getRuntimeEnv() === 'production';
export const isDevelopmentEnv = (): boolean => getRuntimeEnv() === 'development';
