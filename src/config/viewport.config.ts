/**
 * Configuración global de viewport y paginación
 * Centraliza los parámetros de visualización para mantener consistencia
 */

export const VIEWPORT_CONFIG = {
  // Breakpoints (deben coincidir con Tailwind)
  breakpoints: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
  },

  // Alturas estimadas de componentes (en píxeles)
  componentHeights: {
    header: 64,
    pageHeader: 80,
    toolbar: 60,
    pagination: 70,
    rowMobile: 80,
    rowTablet: 65,
    rowDesktop: 55,
  },

  // Límites de paginación
  pagination: {
    mobile: {
      min: 10,
      max: 30,
      default: 15,
    },
    tablet: {
      min: 15,
      max: 50,
      default: 25,
    },
    desktop: {
      min: 20,
      max: 100,
      default: 40,
    },
  },

  // Márgenes y padding (en píxeles)
  spacing: {
    mobile: {
      horizontal: 8,   // px-2
      vertical: 4,     // py-1
    },
    tablet: {
      horizontal: 12,  // px-3
      vertical: 8,     // py-2
    },
    desktop: {
      horizontal: 24,  // px-6
      vertical: 12,    // py-3
    },
  },
} as const;

/**
 * Calcula el total de altura reservada (header + footer) según dispositivo
 */
export function getReservedHeight(_deviceType: 'mobile' | 'tablet' | 'desktop'): number {
  const { header, pageHeader, toolbar, pagination } = VIEWPORT_CONFIG.componentHeights;

  return header + pageHeader + toolbar + pagination;
}

/**
 * Obtiene la altura de fila según el tipo de dispositivo
 */
export function getRowHeight(deviceType: 'mobile' | 'tablet' | 'desktop'): number {
  const { rowMobile, rowTablet, rowDesktop } = VIEWPORT_CONFIG.componentHeights;

  switch (deviceType) {
    case 'mobile':
      return rowMobile;
    case 'tablet':
      return rowTablet;
    case 'desktop':
      return rowDesktop;
    default:
      return rowDesktop;
  }
}

/**
 * Obtiene los límites de paginación según el tipo de dispositivo
 */
export function getPaginationLimits(deviceType: 'mobile' | 'tablet' | 'desktop') {
  return VIEWPORT_CONFIG.pagination[deviceType];
}
