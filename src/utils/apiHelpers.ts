/**
 * Utilidades para manejar respuestas de API de manera segura
 * Funciones helper para evitar errores de tipo "filter is not a function" o "map is not a function"
 */

/**
 * Extrae datos de una respuesta API de manera segura
 * @param response - Respuesta de la API
 * @returns Array de datos o array vacío si no es válido
 */
export const extractApiData = <T = any>(response: any): T[] => {
  if (response?.success && response?.data) {
    return Array.isArray(response.data) ? response.data : [];
  }
  return [];
};

/**
 * Valida que los datos sean un array antes de usar métodos de array
 * @param data - Datos a validar
 * @returns Array válido o array vacío
 */
export const safeArray = <T = any>(data: any): T[] => {
  return Array.isArray(data) ? data : [];
};

/**
 * Extrae datos de respuesta con estructura wrapper {data: [...]}
 * @param response - Respuesta que puede tener estructura wrapper
 * @returns Array de datos extraídos
 */
export const extractWrappedData = <T = any>(response: any): T[] => {
  // Verificar si la respuesta tiene wrapper 'data'
  if (response && response.data && Array.isArray(response.data)) {
    return response.data;
  }
  // Verificar si es array directo
  if (Array.isArray(response)) {
    return response;
  }
  // Fallback a array vacío
  return [];
};

/**
 * Filtro seguro que valida que los datos sean un array antes de filtrar
 * @param data - Datos a filtrar
 * @param predicate - Función de filtro
 * @returns Array filtrado o array vacío
 */
export const safeFilter = <T = any>(
  data: any, 
  predicate: (item: T) => boolean
): T[] => {
  const arrayData = safeArray<T>(data);
  return arrayData.filter(predicate);
};

/**
 * Map seguro que valida que los datos sean un array antes de mapear
 * @param data - Datos a mapear
 * @param mapper - Función de mapeo
 * @returns Array mapeado o array vacío
 */
export const safeMap = <T = any, R = any>(
  data: any, 
  mapper: (item: T, index: number) => R
): R[] => {
  const arrayData = safeArray<T>(data);
  return arrayData.map(mapper);
};

/**
 * Reduce seguro que valida que los datos sean un array antes de reducir
 * @param data - Datos a reducir
 * @param reducer - Función de reducción
 * @param initialValue - Valor inicial
 * @returns Resultado de la reducción
 */
export const safeReduce = <T = any, R = any>(
  data: any, 
  reducer: (acc: R, item: T, index: number) => R,
  initialValue: R
): R => {
  const arrayData = safeArray<T>(data);
  return arrayData.reduce(reducer, initialValue);
};

/**
 * Obtiene la longitud de manera segura
 * @param data - Datos para obtener longitud
 * @returns Longitud del array o 0
 */
export const safeLength = (data: any): number => {
  return safeArray(data).length;
};

/**
 * Verifica si los datos están vacíos de manera segura
 * @param data - Datos a verificar
 * @returns true si está vacío, false si tiene elementos
 */
export const isEmpty = (data: any): boolean => {
  return safeLength(data) === 0;
};

/**
 * Obtiene el primer elemento de manera segura
 * @param data - Datos para obtener el primer elemento
 * @returns Primer elemento o undefined
 */
export const safeFirst = <T = any>(data: any): T | undefined => {
  const arrayData = safeArray<T>(data);
  return arrayData[0];
};

/**
 * Obtiene el último elemento de manera segura
 * @param data - Datos para obtener el último elemento
 * @returns Último elemento o undefined
 */
export const safeLast = <T = any>(data: any): T | undefined => {
  const arrayData = safeArray<T>(data);
  return arrayData[arrayData.length - 1];
};

/**
 * Busca un elemento de manera segura
 * @param data - Datos donde buscar
 * @param predicate - Función de búsqueda
 * @returns Elemento encontrado o undefined
 */
export const safeFind = <T = any>(
  data: any, 
  predicate: (item: T) => boolean
): T | undefined => {
  const arrayData = safeArray<T>(data);
  return arrayData.find(predicate);
};

/**
 * Verifica si algún elemento cumple la condición de manera segura
 * @param data - Datos a verificar
 * @param predicate - Función de verificación
 * @returns true si algún elemento cumple la condición
 */
export const safeSome = <T = any>(
  data: any, 
  predicate: (item: T) => boolean
): boolean => {
  const arrayData = safeArray<T>(data);
  return arrayData.some(predicate);
};

/**
 * Verifica si todos los elementos cumplen la condición de manera segura
 * @param data - Datos a verificar
 * @param predicate - Función de verificación
 * @returns true si todos los elementos cumplen la condición
 */
export const safeEvery = <T = any>(
  data: any, 
  predicate: (item: T) => boolean
): boolean => {
  const arrayData = safeArray<T>(data);
  return arrayData.every(predicate);
};

// Ejemplos de uso:

/**
 * Ejemplo de uso con fields
 */
export const getAvailableFields = (fieldsResponse: any) => {
  const fieldsArray = extractApiData(fieldsResponse);
  return safeFilter(fieldsArray, (field: any) => field.state === 'Disponible');
};

/**
 * Ejemplo de uso con user roles
 */
export const getUserRoleNames = (userRolesData: any) => {
  return safeMap(userRolesData?.data || userRolesData, (role: any) => role.name);
};

/**
 * Ejemplo de uso con controls
 */
export const getRecentControls = (controlsData: any, daysAgo: number = 30) => {
  const now = new Date();
  const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  
  return safeFilter(controlsData, (control: any) => {
    const controlDate = new Date(control.checkup_date);
    return controlDate >= cutoffDate;
  });
};