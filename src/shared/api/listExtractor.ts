// Utilidad central para extraer listas desde diferentes formas de envoltura de respuestas API
// Acepta una respuesta Axios o un objeto simple con posibles estructuras:
// { data: [...] }
// { data: { items: [...] } }
// { items: [...] }
// { <key>: [...] }
// { data: { <key>: [...] } }
// También intenta buscar el primer array dentro del objeto cuando no se especifican claves.


// Busca recursivamente el primer array en cualquier nivel de un objeto
function findFirstArrayDeep(obj: any): any[] | null {
  if (!obj || typeof obj !== 'object') return null;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const val = obj[key];
      if (Array.isArray(val)) return val;
      if (val && typeof val === 'object') {
        const found = findFirstArrayDeep(val);
        if (found) return found;
      }
    }
  }
  return null;
}

export function extractListFromResponse(resp: any, preferredKeys: string[] = []): any[] {
  if (!resp) return [];
  const norm = (resp as any).normalizedData;
  if (Array.isArray(norm)) return norm;

  // Resp Axios -> resp.data
  const root = resp.data !== undefined ? resp.data : resp;
  // Algunas APIs ponen la carga real dentro de root.data
  const data = root && root.data !== undefined ? root.data : root;

  // Si ya es array directo
  if (Array.isArray(data)) return data;

  // Intentar con claves preferidas en orden: primero usuario, luego genéricas
  const candidateKeys = [
    ...preferredKeys,
    'items','data','list','results','animals','users','species','breeds','medications','vaccines',
    // Añadido para soportar respuestas con clave específica de tratamientos
    'treatments'
  ];
  for (const k of candidateKeys) {
    const segment = (data as any)?.[k];
    if (Array.isArray(segment)) return segment;
  }

  // Buscar primer array en cualquier nivel de anidación
  if (data && typeof data === 'object') {
    const deepFound = findFirstArrayDeep(data);
    if (Array.isArray(deepFound)) return deepFound;
  }

  return [];
}

// Extrae objeto paginado conservando metadatos y devolviendo lista bajo key canonical
export function extractPaginatedList(resp: any, preferredKeys: string[] = [], listKeyFallback = 'items') {
  const root = resp?.data || resp || {};
  const data = root?.data ?? root;
  const list = extractListFromResponse(resp, preferredKeys);

  // Metadatos comunes
  const metaKeys = ['total','page','per_page','pages','total_pages','has_next','has_prev','has_next_page','has_previous_page','pagination'];
  const metadata: Record<string, any> = {};
  for (const k of metaKeys) {
    if (data && data[k] !== undefined) {
      metadata[k] = data[k];
    }
  }

  // Si la paginación viene en un objeto anidado en data
  if (data && data.pagination && typeof data.pagination === 'object') {
    Object.assign(metadata, data.pagination);
  }

  // Si la paginación viene en root.meta (como en algunas APIs)
  if (root && root.meta && typeof root.meta === 'object') {
    if (root.meta.pagination && typeof root.meta.pagination === 'object') {
      Object.assign(metadata, root.meta.pagination);
    } else {
      // Si meta no tiene pagination, asumir que meta contiene directamente los metadatos
      Object.assign(metadata, root.meta);
    }
  }

  // Mapear nombres alternativos de Potreros de paginación
  if (metadata.has_next_page !== undefined) metadata.has_next = metadata.has_next_page;
  if (metadata.has_previous_page !== undefined) metadata.has_prev = metadata.has_previous_page;
  if (metadata.total_pages !== undefined) metadata.pages = metadata.total_pages;

  return {
    ...metadata,
    [listKeyFallback]: list,
  };
}
