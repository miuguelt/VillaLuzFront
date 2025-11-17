/**
 * Utilidades de formato numérico para dashboards/analytics
 */

export interface PercentageFormatOptions {
  /**
   * Valor absoluto máximo a mostrar antes de aplicar sufijo "+".
   * Ej: 1700% se mostrará como "999+%" si maxAbs = 999.
   */
  maxAbs?: number;
}

/**
 * Formatea un cambio porcentual para pantallas de dashboard.
 * - Redondea a 1 decimal para cambios pequeños (< 10%), sin decimales para el resto.
 * - Limita el valor absoluto a `maxAbs` y añade sufijo "+" si se supera.
 * - Devuelve `null` si el valor es nulo/indefinido o NaN.
 */
export const formatChangePercentage = (
  raw: number | null | undefined,
  options: PercentageFormatOptions = {}
): string | null => {
  if (raw === null || raw === undefined) return null;

  const numeric = Number(raw);
  if (Number.isNaN(numeric)) return null;

  if (numeric === 0) return '0%';

  const maxAbs = options.maxAbs ?? 999;
  const abs = Math.abs(numeric);

  const overflow = abs > maxAbs;
  const clamped = overflow ? maxAbs : abs;

  // Más precisión para cambios pequeños, menos para cambios grandes
  const decimals = clamped < 10 ? 1 : 0;
  const formatted = clamped.toFixed(decimals);

  const sign = numeric > 0 ? '+' : '-';
  const suffix = overflow ? '+' : '';

  return `${sign}${formatted}${suffix}%`;
};

