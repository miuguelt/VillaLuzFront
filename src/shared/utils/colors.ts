/**
 * Paleta de colores para analytics y visualizaciones
 * Centraliza los colores para mantener consistencia en toda la aplicación
 */

export const COLORS = {
  // Animales
  animals: {
    male: '#3B82F6',
    female: '#EC4899',
    alive: '#10B981',
    dead: '#EF4444',
    sold: '#F59E0B',
  },

  // Salud
  health: {
    excellent: '#10B981',
    good: '#3B82F6',
    healthy: '#8B5CF6',
    regular: '#F59E0B',
    bad: '#EF4444',
  },

  // Alertas
  alerts: {
    critical: '#DC2626',
    high: '#EF4444',
    warning: '#F59E0B',
    medium: '#F59E0B',
    info: '#3B82F6',
    low: '#3B82F6',
  },

  // Ocupación
  occupation: {
    underutilized: '#9CA3AF',
    normal: '#10B981',
    high: '#F59E0B',
    overloaded: '#EF4444',
  },

  // Gráficos
  charts: {
    primary: '#3B82F6',
    secondary: '#8B5CF6',
    tertiary: '#EC4899',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
  },
};

/**
 * Obtiene el color según el porcentaje de ocupación
 */
export const getOccupationColor = (rate: number): string => {
  if (rate > 100) return COLORS.occupation.overloaded;
  if (rate > 80) return COLORS.occupation.high;
  if (rate > 50) return COLORS.occupation.normal;
  return COLORS.occupation.underutilized;
};

/**
 * Obtiene el color según el estado de salud
 */
export const getHealthColor = (status: string): string => {
  const statusLower = status.toLowerCase();
  return (COLORS.health as any)[statusLower] || COLORS.health.regular;
};

/**
 * Obtiene el color según la severidad de la alerta
 */
export const getAlertColor = (severity: string): string => {
  return (COLORS.alerts as any)[severity] || COLORS.alerts.info;
};

/**
 * Obtiene un array de colores para gráficos de distribución
 */
export const getChartColors = (count: number): string[] => {
  const baseColors = [
    COLORS.charts.primary,
    COLORS.charts.success,
    COLORS.charts.warning,
    COLORS.charts.danger,
    COLORS.charts.secondary,
    COLORS.charts.tertiary,
  ];

  // Si necesitamos más colores, generar variaciones
  if (count <= baseColors.length) {
    return baseColors.slice(0, count);
  }

  const colors = [...baseColors];
  for (let i = baseColors.length; i < count; i++) {
    // Generar variaciones de los colores base
    const baseColor = baseColors[i % baseColors.length];
    colors.push(adjustColorBrightness(baseColor, (i / count) * 50));
  }

  return colors;
};

/**
 * Ajusta el brillo de un color hexadecimal
 */
export const adjustColorBrightness = (hex: string, percent: number): string => {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = ((num >> 8) & 0x00ff) + amt;
  const B = (num & 0x0000ff) + amt;

  return (
    '#' +
    (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    )
      .toString(16)
      .slice(1)
  );
};

/**
 * Convierte un color hex a rgba
 */
export const hexToRgba = (hex: string, alpha: number = 1): string => {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = num >> 16;
  const g = (num >> 8) & 0x00ff;
  const b = num & 0x0000ff;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/**
 * Obtiene un gradiente de colores
 */
export const getGradient = (color: string, steps: number = 5): string[] => {
  const gradients = [];
  for (let i = 0; i < steps; i++) {
    const opacity = 0.2 + (i / steps) * 0.6; // De 0.2 a 0.8
    gradients.push(hexToRgba(color, opacity));
  }
  return gradients;
};

export default COLORS;
