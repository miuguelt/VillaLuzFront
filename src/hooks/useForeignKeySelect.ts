import * as React from 'react';
import { unwrapArray } from '@/utils/apiUnwrap';

export interface FKOption {
  value: number | string;
  label: string;
}

type FetchFn = (params?: Record<string, any>) => Promise<any>;

/**
 * Hook minimalista para selectors de llaves foráneas con búsqueda.
 * - Recibe un `fetchFn` (servicio) y un mapper a opción.
 * - Soporta filtro opcional.
 * - Maneja loading y protección contra respuestas fuera de orden.
 */
export function useForeignKeySelect(
  fetchFn: FetchFn,
  mapToOption: (item: any) => FKOption,
  filterFn?: (item: any) => boolean,
  initialLimit: number = 1000,
  searchLimit: number = 50
) {
  const [options, setOptions] = React.useState<FKOption[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const tokenRef = React.useRef<{ token: number }>({ token: 0 });
  const fetchFnRef = React.useRef<FetchFn>(fetchFn);
  const mapToOptionRef = React.useRef<(item: any) => FKOption>(mapToOption);
  const filterFnRef = React.useRef<typeof filterFn>(filterFn);

  // Mantener refs actualizados sin re-crear callbacks
  React.useEffect(() => { fetchFnRef.current = fetchFn; }, [fetchFn]);
  React.useEffect(() => { mapToOptionRef.current = mapToOption; }, [mapToOption]);
  React.useEffect(() => { filterFnRef.current = filterFn; }, [filterFn]);

  const toList = (response: any) => {
    // Si es una respuesta paginada con data
    if (response && typeof response === 'object' && 'data' in response && Array.isArray(response.data)) {
      return response.data;
    }
    // Si es un array directo
    if (Array.isArray(response)) {
      return response;
    }
    // Usar unwrapArray como fallback
    const unwrapped = unwrapArray(response);
    return unwrapped;
  };

  const loadOptions = React.useCallback(async (params: Record<string, any> = {}) => {
    setLoading(true);
    const token = ++tokenRef.current.token;
    try {
      const resp = await fetchFnRef.current({ page: 1, limit: initialLimit, ...params });
      const list = toList(resp);
      if (tokenRef.current.token === token) {
        const filtered = filterFnRef.current ? list.filter(filterFnRef.current) : list;
        setOptions(filtered.map(mapToOptionRef.current));
      }
    } catch (error) {
      console.error('[useForeignKeySelect] Error loading options:', error);
      if (tokenRef.current.token === token) {
        setOptions([]);
      }
    } finally {
      if (tokenRef.current.token === token) {
        setLoading(false);
      }
    }
  }, [initialLimit]);

  // Carga inicial
  React.useEffect(() => {
    loadOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = React.useCallback(async (q: string) => {
    // Si la búsqueda está vacía, cargar con límite inicial
    if (!q || q.trim() === '') {
      await loadOptions({ limit: initialLimit });
    } else {
      // Si hay búsqueda, usar límite de búsqueda
      await loadOptions({ limit: searchLimit, search: q, q: q });
    }
  }, [loadOptions, searchLimit, initialLimit]);

  const refresh = React.useCallback(() => {
    loadOptions();
  }, [loadOptions]);

  return { options, loading, handleSearch, refresh };
}

export default useForeignKeySelect;