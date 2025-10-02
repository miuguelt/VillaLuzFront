// Unified access to Vite (import.meta.env) and Jest/Node (process.env / mocked global) environments
// Works in browser, Vite build, and Jest tests where we polyfill globalThis.import.meta in setupTests.

export const VITE_ENV: Record<string, any> = (() => {
  // Use Jest polyfill path (we defined globalThis.import.meta.env in setupTests)
  const poly = (globalThis as any)?.import?.meta?.env;
  if (poly) return poly;
  // Fallback to process.env when available (Node scripts)
  // Guard access with typeof to avoid TS errors when node types are missing
  // and to work in browser-only environments.
  if (typeof (globalThis as any).process !== 'undefined') return ((globalThis as any).process as any).env || {};
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
