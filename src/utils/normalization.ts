// Normalización global de valores para presentación consistente
// Reglas:
// - null/undefined -> '—'
// - cadenas vacías o whitespace -> '—'
// - 'valor desconocido' (case-insensitive) -> '—'
// - números NaN / Infinity -> '—'
// - fechas ISO válidas -> formateadas YYYY-MM-DD (si hora 00:00) o locale corta
// - boolean -> Sí / No
// - objetos -> '{…}'
// - arrays -> '[n items]'

const UNKNOWN_PATTERNS = [/^valor desconocido$/i, /^desconocido$/i, /^n\/a$/i, /^no definido$/i];

export function normalizeDisplayValue(value: any): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return '—';
    if (UNKNOWN_PATTERNS.some(r=> r.test(trimmed))) return '—';
    // Detect ISO date
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(trimmed)) {
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) {
        if (d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0) {
          return d.toISOString().slice(0,10);
        }
        return d.toLocaleString();
      }
    }
    return trimmed;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return '—';
    return value.toString();
  }
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (Array.isArray(value)) return `[${value.length} items]`;
  if (typeof value === 'object') return '{…}';
  return String(value);
}

export function normalizeObjectValues<T extends Record<string, any>>(obj: T | undefined | null): Record<string,string> {
  if (!obj) return {};
  return Object.fromEntries(Object.entries(obj).map(([k,v])=> [k, normalizeDisplayValue(v)]));
}

// Helper para integrar con tablas o exportaciones
export function flattenNormalized(prefix: string, obj: any, out: Record<string,string> = {}): Record<string,string> {
  if (!obj) return out;
  Object.entries(obj).forEach(([k,v])=> {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      flattenNormalized(key, v, out);
    } else {
      out[key] = normalizeDisplayValue(v);
    }
  });
  return out;
}

export default normalizeDisplayValue;