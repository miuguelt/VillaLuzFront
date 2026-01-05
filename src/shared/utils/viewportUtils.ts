/**
 * Utilidades para calcular límites óptimos de datos según el viewport
 * Optimiza la carga inicial para llenar la pantalla sin scroll excesivo
 */

// Importación de React para el hook
import * as React from 'react';
import { VIEWPORT_CONFIG, getReservedHeight, getRowHeight, getPaginationLimits } from '@/shared/config/viewport.config';

export interface ViewportDimensions {
  width: number;
  height: number;
  isSmall: boolean;  // < 640px (mobile)
  isMedium: boolean; // 640-1024px (tablet)
  isLarge: boolean;  // > 1024px (desktop)
  deviceType: 'mobile' | 'tablet' | 'desktop';
}

export function getViewportDimensions(): ViewportDimensions {
  const width = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const height = typeof window !== 'undefined' ? window.innerHeight : 1080;

  const isSmall = width < VIEWPORT_CONFIG.breakpoints.sm;
  const isMedium = width >= VIEWPORT_CONFIG.breakpoints.sm && width < VIEWPORT_CONFIG.breakpoints.lg;
  const isLarge = width >= VIEWPORT_CONFIG.breakpoints.lg;

  let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
  if (isSmall) deviceType = 'mobile';
  else if (isMedium) deviceType = 'tablet';

  return {
    width,
    height,
    isSmall,
    isMedium,
    isLarge,
    deviceType,
  };
}

/**
 * Calcula el límite óptimo de items para una tabla/lista
 * basándose en la altura del viewport y el tipo de dispositivo
 */
export function calculateOptimalLimit(
  rowHeight?: number,
  reservedHeight?: number,
  minLimit?: number,
  maxLimit?: number
): number {
  const viewport = getViewportDimensions();

  // Usar valores de configuración si no se especifican
  const actualRowHeight = rowHeight ?? getRowHeight(viewport.deviceType);
  const actualReservedHeight = reservedHeight ?? getReservedHeight(viewport.deviceType);
  const limits = getPaginationLimits(viewport.deviceType);
  const actualMinLimit = minLimit ?? limits.min;
  const actualMaxLimit = maxLimit ?? limits.max;

  // Espacio disponible para contenido
  const availableHeight = viewport.height - actualReservedHeight;

  // Calcular cuántas filas caben
  const rowsFit = Math.floor(availableHeight / actualRowHeight);

  // Agregar buffer según dispositivo (para scroll suave)
  let buffer = 5;
  if (viewport.deviceType === 'tablet') buffer = 8;
  if (viewport.deviceType === 'desktop') buffer = 12;

  const optimal = rowsFit + buffer;

  // Limitar entre min y max
  return Math.max(actualMinLimit, Math.min(actualMaxLimit, optimal));
}

/**
 * Límites predefinidos según tipo de dispositivo
 * NUEVA FUNCIÓN optimizada con configuración centralizada
 */
export function getDefaultLimitByDevice(): number {
  const viewport = getViewportDimensions();

  // Si tenemos muy poca altura, usar el mínimo
  if (viewport.height < 500) {
    return getPaginationLimits(viewport.deviceType).min;
  }

  // Calcular óptimo usando configuración
  const optimal = calculateOptimalLimit();

  // Logging para debugging (solo en desarrollo)
  if (typeof window !== 'undefined' && (window as any).__DEV__) {
    console.log('[ViewportUtils] Límite calculado:', {
      deviceType: viewport.deviceType,
      width: viewport.width,
      height: viewport.height,
      optimal,
      config: getPaginationLimits(viewport.deviceType),
    });
  }

  return optimal;
}

/**
 * Hook para obtener el límite óptimo y actualizarlo en resize
 */
export function useOptimalLimit(customOptions?: {
  rowHeight?: number;
  reservedHeight?: number;
  minLimit?: number;
  maxLimit?: number;
}): number {
  const isServer = typeof window === 'undefined';

  const [limit, setLimit] = React.useState(() => {
    if (isServer) {
      return 20;
    }
    if (customOptions) {
      return calculateOptimalLimit(
        customOptions.rowHeight,
        customOptions.reservedHeight,
        customOptions.minLimit,
        customOptions.maxLimit
      );
    }
    return getDefaultLimitByDevice();
  });

  React.useEffect(() => {
    if (isServer) return;
    const handleResize = () => {
      const newLimit = customOptions
        ? calculateOptimalLimit(
            customOptions.rowHeight,
            customOptions.reservedHeight,
            customOptions.minLimit,
            customOptions.maxLimit
          )
        : getDefaultLimitByDevice();

      if (newLimit !== limit) {
        setLimit(newLimit);
      }
    };

    // Debounce para evitar cálculos excesivos
    let timeoutId: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleResize, 150);
    };

    window.addEventListener('resize', debouncedResize);
    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(timeoutId);
    };
  }, [customOptions, isServer, limit]);

  return limit;
}
