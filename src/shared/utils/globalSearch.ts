/**
 * Utilidad de búsqueda global optimizada para PWA offline-first
 * Busca en TODOS los campos de un objeto (incluso anidados) de forma normalizada
 */

/**
 * Normaliza un string para búsqueda: lowercase, sin acentos, sin caracteres especiales
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Eliminar diacríticos
    .replace(/[^\w\s.]/g, ' ') // Reemplazar caracteres especiales con espacios (preservar puntos para decimales)
    .replace(/\s+/g, ' ') // Normalizar espacios múltiples
    .trim();
}

/**
 * Detecta si un string es una fecha ISO 8601
 */
function isISODateString(str: string): boolean {
  if (typeof str !== 'string') return false;
  // Formato ISO: 2024-01-15T00:00:00.000Z o 2024-01-15
  const isoRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
  return isoRegex.test(str);
}

/**
 * Convierte una fecha a múltiples formatos searchables
 * @param date - Date object o string ISO
 * @returns String con múltiples formatos de fecha separados por espacios
 */
function formatDateForSearch(date: Date | string): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;

    // Verificar que sea una fecha válida
    if (isNaN(d.getTime())) return '';

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear());

    // Nombres de meses en español e inglés
    const monthNamesEs = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    const monthNamesEn = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december'
    ];

    const monthNameEs = monthNamesEs[d.getMonth()];
    const monthNameEn = monthNamesEn[d.getMonth()];

    // Generar múltiples formatos
    const formats = [
      `${day}/${month}/${year}`,        // 15/01/2024
      `${month}/${day}/${year}`,        // 01/15/2024
      `${year}-${month}-${day}`,        // 2024-01-15
      `${day}-${month}-${year}`,        // 15-01-2024
      `${day} ${month} ${year}`,        // 15 01 2024
      day,                               // 15
      month,                             // 01
      year,                              // 2024
      monthNameEs,                       // enero
      monthNameEn,                       // january
      `${monthNameEs} ${year}`,         // enero 2024
      `${monthNameEn} ${year}`,         // january 2024
      `${day} ${monthNameEs}`,          // 15 enero
      `${day} ${monthNameEn}`,          // 15 january
      `${day} ${monthNameEs} ${year}`,  // 15 enero 2024
      `${day} ${monthNameEn} ${year}`,  // 15 january 2024
    ];

    return formats.join(' ');
  } catch {
    return '';
  }
}

/**
 * Convierte un objeto completo a string searchable (incluyendo propiedades anidadas)
 * Incluye conversión de fechas a formatos legibles y campos especiales como ID
 */
function objectToSearchableString(obj: any, maxDepth: number = 3, currentDepth: number = 0): string {
  if (currentDepth > maxDepth) return '';
  if (obj === null || obj === undefined) return '';

  // Tipos primitivos: convertir directamente
  const type = typeof obj;

  // String: verificar si es fecha ISO
  if (type === 'string') {
    if (isISODateString(obj)) {
      // Es una fecha ISO: convertir a múltiples formatos
      return formatDateForSearch(obj);
    }
    return obj;
  }

  if (type === 'number' || type === 'boolean') return String(obj);

  // Date objects: convertir a formatos legibles
  if (obj instanceof Date) {
    return formatDateForSearch(obj);
  }

  // Arrays: procesar cada elemento
  if (Array.isArray(obj)) {
    return obj
      .map(item => objectToSearchableString(item, maxDepth, currentDepth + 1))
      .filter(Boolean)
      .join(' ');
  }

  // Objetos: extraer valores de todas las propiedades
  if (type === 'object') {
    // Omitir objetos React internos y funciones
    if (obj.$$typeof || obj._owner || typeof obj === 'function') return '';

    const values: string[] = [];

    // IMPORTANTE: Incluir explícitamente el campo 'id' primero
    if ('id' in obj && obj.id !== null && obj.id !== undefined) {
      values.push(`id ${String(obj.id)}`); // Añadir con prefijo para búsquedas tipo "id 123"
      values.push(String(obj.id)); // También sin prefijo para búsquedas directas "123"
    }

    // IMPORTANTE: Incluir campo 'identification' si existe (número de identificación de usuarios)
    if ('identification' in obj && obj.identification !== null && obj.identification !== undefined) {
      const identValue = String(obj.identification);
      values.push(`identification ${identValue}`); // Con prefijo
      values.push(`identificacion ${identValue}`); // Variante en español
      values.push(identValue); // Sin prefijo para búsqueda directa
    }

    for (const key in obj) {
      // NO omitir campos que terminan en '_id' (breed_id, father_id, mother_id, etc.)
      // SOLO omitir propiedades que empiezan con doble guion bajo (__private)
      // NO omitir propiedades con un solo guion bajo al inicio
      if (
        key.startsWith('__') ||  // Omitir __private
        key === '$$typeof' ||
        key === '_owner' ||
        key === 'key' ||
        key === 'ref' ||
        key === 'id' ||  // Ya lo procesamos arriba
        key === 'identification'  // Ya lo procesamos arriba
      ) {
        continue;
      }

      try {
        const value = obj[key];
        if (value !== null && value !== undefined) {
          // Incluir el nombre de la clave para búsquedas como "breed_id: 5"
          const searchableValue = objectToSearchableString(value, maxDepth, currentDepth + 1);
          if (searchableValue) {
            values.push(searchableValue);
            // Si es un campo *_id, también incluir con prefijo para búsquedas específicas
            if (key.endsWith('_id')) {
              values.push(`${key} ${searchableValue}`);
            }
          }
        }
      } catch {
        // Ignorar propiedades inaccesibles
      }
    }

    return values.filter(Boolean).join(' ');
  }

  return '';
}

/**
 * Búsqueda global en un array de objetos
 * @param items - Array de objetos a buscar
 * @param query - String de búsqueda (puede contener múltiples términos separados por espacios)
 * @param options - Opciones de búsqueda
 * @returns Array filtrado con items que coinciden con la búsqueda
 */
export function globalSearch<T>(
  items: T[],
  query: string,
  options?: {
    /** Si true, todos los términos deben aparecer (AND). Si false, basta con uno (OR). Default: false */
    matchAll?: boolean;
    /** Profundidad máxima para buscar en objetos anidados. Default: 3 */
    maxDepth?: number;
    /** Cache de strings searchables para optimizar búsquedas repetidas */
    cache?: Map<T, string>;
  }
): T[] {
  if (!query || !query.trim()) return items;

  const { matchAll = false, maxDepth = 3, cache } = options || {};

  // Normalizar query y dividir en términos
  const normalizedQuery = normalizeString(query);
  const terms = normalizedQuery.split(/\s+/).filter(Boolean);

  if (terms.length === 0) return items;

  return items.filter(item => {
    // Obtener o generar el string searchable del item
    let searchableText: string;

    if (cache && cache.has(item)) {
      searchableText = cache.get(item)!;
    } else {
      const rawText = objectToSearchableString(item, maxDepth);
      searchableText = normalizeString(rawText);

      // Guardar en caché si está disponible
      if (cache) {
        cache.set(item, searchableText);
      }
    }

    // Buscar términos
    if (matchAll) {
      // Modo AND: todos los términos deben aparecer
      return terms.every(term => searchableText.includes(term));
    } else {
      // Modo OR: basta con que aparezca uno
      return terms.some(term => searchableText.includes(term));
    }
  });
}

/**
 * Resalta términos de búsqueda en un texto
 * @param text - Texto original
 * @param query - Términos de búsqueda
 * @returns Texto con términos resaltados en HTML
 */
export function highlightSearchTerms(text: string, query: string): string {
  if (!query || !query.trim() || !text) return text;

  const terms = normalizeString(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return text;

  let result = text;

  // Resaltar cada término (case-insensitive, acento-insensitive)
  terms.forEach(term => {
    const regex = new RegExp(
      `(${term.split('').join('[^\\w]*')})`, // Permitir caracteres intermedios
      'gi'
    );
    result = result.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>');
  });

  return result;
}

/**
 * Hook para mantener caché de búsquedas
 * Útil para optimizar búsquedas repetidas sobre el mismo dataset
 */
export function createSearchCache<T>(): Map<T, string> {
  return new Map<T, string>();
}

/**
 * Calcula una "puntuación de relevancia" para ordenar resultados
 * Mayor puntuación = más relevante
 * @param item - Item a evaluar
 * @param query - Query de búsqueda
 * @returns Puntuación (mayor = más relevante)
 */
export function calculateRelevanceScore<T>(item: T, query: string): number {
  if (!query || !query.trim()) return 0;

  const searchableText = normalizeString(objectToSearchableString(item));
  const normalizedQuery = normalizeString(query);
  const terms = normalizedQuery.split(/\s+/).filter(Boolean);

  let score = 0;

  terms.forEach(term => {
    // Coincidencia exacta de palabra completa: +100 puntos
    const exactWordRegex = new RegExp(`\\b${term}\\b`, 'i');
    if (exactWordRegex.test(searchableText)) {
      score += 100;
    }

    // Coincidencia al inicio de texto: +50 puntos
    if (searchableText.startsWith(term)) {
      score += 50;
    }

    // Coincidencia parcial: +10 puntos
    if (searchableText.includes(term)) {
      score += 10;
    }

    // Bonus por longitud de término (términos más largos = más específicos)
    score += term.length * 2;
  });

  return score;
}
