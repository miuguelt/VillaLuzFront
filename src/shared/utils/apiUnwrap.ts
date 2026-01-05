// Utilidad central para normalizar respuestas API { success, message, data }
// Acepta AxiosResponse o dato crudo.
export function unwrapApi<T = any>(resp: any): T {
  if (!resp) return resp as T;
  // Axios response shape
  if (resp.data !== undefined) {
    const d = resp.data;
    if (d && typeof d === 'object') {
      if (d.data !== undefined) return d.data as T; // APIResponse wrapper
      return d as T;
    }
  }
  // Direct object already normalized
  if (resp.data === undefined && resp.success === true && resp.data !== undefined) {
    return resp.data as T;
  }
  return resp as T;
}

export const unwrapArray = <T=any>(resp: any): T[] => {
  const r = unwrapApi<T[] | any>(resp);
  if (Array.isArray(r)) return r as T[];
  const obj = r as any;
  if (obj && typeof obj === 'object') {
    // Direct common keys
    if (Array.isArray(obj.items)) return obj.items as T[];
    if (Array.isArray(obj.data)) return obj.data as T[];
    if (Array.isArray(obj.results)) return obj.results as T[];
    if (Array.isArray(obj.list)) return obj.list as T[];
    if (Array.isArray(obj.animals)) return obj.animals as T[];
    if (Array.isArray(obj.breeds)) return obj.breeds as T[];
    // Nested typical wrapper { data: { items: [...] } }
    if (obj.data && typeof obj.data === 'object' && Array.isArray(obj.data.items)) {
      return obj.data.items as T[];
    }
  }
  return [] as T[];
};
