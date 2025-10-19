/**
 * Configuración centralizada de endpoints de API
 * Esto evita hardcodear URLs en múltiples lugares
 */

/**
 * Endpoints para gestión de imágenes de animales
 */
export const ANIMAL_IMAGES_ENDPOINTS = {
  /** Subir múltiples imágenes para un animal */
  UPLOAD: '/animal-images/upload',

  /** Obtener todas las imágenes de un animal */
  GET_BY_ANIMAL: (animalId: number | string) => `/animal-images/${animalId}`,

  /** Eliminar una imagen específica */
  DELETE: (imageId: number | string) => `/animal-images/image/${imageId}`,

  /** Establecer una imagen como principal */
  SET_PRIMARY: (imageId: number | string) => `/animal-images/image/${imageId}/set-primary`,
} as const;

/**
 * Configuración de API
 */
export const API_CONFIG = {
  /** Versión de API */
  VERSION: 'v1',

  /** Prefijo base de API (se añade automáticamente por el cliente axios) */
  BASE_PREFIX: '/api/v1',

  /** Endpoints de imágenes de animales */
  ANIMAL_IMAGES: ANIMAL_IMAGES_ENDPOINTS,
} as const;

/**
 * Construye una URL completa para un endpoint
 * Nota: En la mayoría de casos no necesitas esto porque axios ya tiene configurado el baseURL
 * Solo úsalo si necesitas construir URLs manualmente
 */
export const buildFullUrl = (endpoint: string): string => {
  // El cliente axios ya tiene /api/v1 como baseURL, así que solo retornamos el endpoint
  return endpoint;
};

export default API_CONFIG;
