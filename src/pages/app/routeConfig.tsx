// Archivo reducido: ya no se gestionan rutas dinámicas de dominio.
// Se mantiene solo export simbólico para evitar errores de import antiguos.
export type Role = 'Administrador' | 'Instructor' | 'Aprendiz';
export interface RouteConfig { path: string; element: any; roles?: Role[] }
export const routeConfig: RouteConfig[] = [];
