import { BaseService } from './baseService';
import api from './api';
import { ANIMAL_IMAGES_ENDPOINTS } from '@/config/apiEndpoints';
import { getBackendBaseURL, getApiBaseURL, isDevelopment } from '@/utils/envConfig';

/**
 * Interfaz para una imagen de animal
 */
export interface AnimalImage {
  id: number;
  animal_id: number;
  filename: string;
  filepath: string;
  file_size: number;
  mime_type: string;
  is_primary: boolean;
  url: string;
  created_at: string;
  updated_at: string;
}

/**
 * Respuesta al subir imágenes
 */
export interface ImageUploadResponse {
  success: boolean;
  message: string;
  data: {
    uploaded: AnimalImage[];
    total_uploaded: number;
    total_errors: number;
    errors?: Array<{
      filename: string;
      error: string;
    }> | null;
  };
}

/**
 * Respuesta al obtener imágenes de un animal
 */
export interface AnimalImagesResponse {
  success: boolean;
  message: string;
  data: {
    animal_id: number;
    total: number;
    images: AnimalImage[];
  };
  errorCode?: string;
  traceId?: string;
}

/**
 * Opciones para la subida de imágenes
 */
export interface UploadOptions {
  /** Callback para progreso de subida (0-100) */
  onProgress?: (progress: number) => void;
  /** Comprimir imágenes antes de subir */
  compress?: boolean;
  /** Calidad de compresión (0-1) */
  quality?: number;
  /** Tamaño máximo en bytes antes de comprimir */
  maxSizeBeforeCompress?: number;
}

/**
 * Servicio para gestionar imágenes de animales
 */
class AnimalImageService extends BaseService<AnimalImage> {
  constructor() {
    super('animal-images', {
      enableCache: false, // Las imágenes no se cachean en memoria
    });
  }

  /**
   * Sube múltiples imágenes para un animal
   * @param animalId ID del animal
   * @param files Array de archivos a subir
   * @param options Opciones de subida
   */
  async uploadImages(
    animalId: number,
    files: File[],
    options: UploadOptions = {}
  ): Promise<ImageUploadResponse> {
    const {
      onProgress,
      compress = false,
      quality = 0.8,
      maxSizeBeforeCompress = 1024 * 1024, // 1MB
    } = options;

    // Validaciones
    if (!animalId || animalId <= 0) {
      throw new Error('El ID del animal es requerido');
    }

    if (!files || files.length === 0) {
      throw new Error('Debe seleccionar al menos una imagen');
    }

    // Validar tipos de archivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        throw new Error(
          `Tipo de archivo no permitido: ${file.type}. Solo se permiten: ${allowedTypes.join(', ')}`
        );
      }
    }

    // Comprimir imágenes si está habilitado
    let processedFiles = files;
    if (compress) {
      processedFiles = await Promise.all(
        files.map((file) =>
          file.size > maxSizeBeforeCompress
            ? this.compressImage(file, quality)
            : Promise.resolve(file)
        )
      );
    }

    // Crear FormData
    const formData = new FormData();
    formData.append('animal_id', animalId.toString());

    for (const file of processedFiles) {
      formData.append('files', file);
    }

    // Enviar request
    try {
      const response = await api.post<ImageUploadResponse>(
        ANIMAL_IMAGES_ENDPOINTS.UPLOAD,
        formData,
        {
          // No especificar Content-Type para que el navegador lo establezca automáticamente
          // con el boundary correcto para multipart/form-data
          headers: {},
          onUploadProgress: (progressEvent) => {
            if (onProgress && progressEvent.total) {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              onProgress(percentCompleted);
            }
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('[AnimalImageService] Error uploading images:', error);
      throw this.handleUploadError(error);
    }
  }

  /**
   * Obtiene todas las imágenes de un animal
   * @param animalId ID del animal
   */
  async getAnimalImages(animalId: number): Promise<AnimalImagesResponse> {
    if (!animalId || animalId <= 0) {
      throw new Error('El ID del animal es requerido');
    }

    try {
      const response = await api.get<AnimalImagesResponse>(
        ANIMAL_IMAGES_ENDPOINTS.GET_BY_ANIMAL(animalId)
      );

      // Asegurar que las URLs de las imágenes sean absolutas y evitar contenido mixto en dev
      if (response.data && response.data.data && response.data.data.images) {
        const backendBaseURL = getBackendBaseURL();
        const apiBaseURL = getApiBaseURL();
        const addVersionParam = (url: string, updatedAt?: string): string => {
          try {
            const hasProtocol = url.startsWith('http://') || url.startsWith('https://');
            if (hasProtocol) {
              const u = new URL(url);
              // usar updated_at si existe; si no, timestamp actual para asegurar recarga mínima
              const version = updatedAt ? String(new Date(updatedAt).getTime()) : String(Date.now());
              u.searchParams.set('v', version);
              return u.toString();
            }
            // URL relativa: agregar ?v= o &v=
            const concatChar = url.includes('?') ? '&' : '?';
            const version = updatedAt ? String(new Date(updatedAt).getTime()) : String(Date.now());
            return `${url}${concatChar}v=${version}`;
          } catch {
            return url;
          }
        };

        const buildAbsoluteStaticUrl = (path: string) => {
          const cleanPath = path.startsWith('/') ? path : `/${path}`;
          const backendBase = backendBaseURL.endsWith('/')
            ? backendBaseURL.slice(0, -1)
            : backendBaseURL;
          return `${backendBase}${cleanPath}`;
        };

        response.data.data.images = response.data.data.images.map((image: AnimalImage) => {
          // Si la URL ya es absoluta, intentar reescribir a origen local en desarrollo
          if (image.url && (image.url.startsWith('http://') || image.url.startsWith('https://'))) {
            if (isDevelopment()) {
              try {
                const abs = new URL(image.url);
                const path = abs.pathname + (abs.search || '');
                // Solo reescribir si apunta a rutas estáticas conocidas
                if (path.startsWith('/public/images') || path.startsWith('/static/uploads')) {
                  // En dev, usar la ruta local directa para aprovechar el proxy de Vite
                  return { ...image, url: addVersionParam(path, image.updated_at) };
                }
              } catch {
                // Ignorar errores de parseo y dejar la URL como está
              }
            }
            return { ...image, url: addVersionParam(image.url, image.updated_at) };
          }

          // Si la URL es relativa, construir URL adecuada según entorno
          if (image.url) {
            const imageUrl = image.url.startsWith('/') ? image.url : `/${image.url}`;

            // En desarrollo, enviar rutas estáticas conocidas sin prefijo /api/v1
            if (isDevelopment()) {
              if (imageUrl.startsWith('/public/images') || imageUrl.startsWith('/static/uploads')) {
                return {
                  ...image,
                  url: addVersionParam(buildAbsoluteStaticUrl(imageUrl), image.updated_at),
                };
              }
              // Para otras rutas relativas de API, construir con /api/v1
              if (apiBaseURL.startsWith('/')) {
                const baseRel = apiBaseURL.endsWith('/') ? apiBaseURL.slice(0, -1) : apiBaseURL;
                return { ...image, url: addVersionParam(`${baseRel}${imageUrl}`, image.updated_at) };
              }
            }

            // En producción o cuando hay backend explícito, usar backend base
            const baseUrl = backendBaseURL.endsWith('/') ? backendBaseURL.slice(0, -1) : backendBaseURL;
            return { ...image, url: addVersionParam(`${baseUrl}${imageUrl}`, image.updated_at) };
          }

          return image;
        });
      }
      
      return response.data;
    } catch (error: any) {
      const status = error?.response?.status;
      const apiError = error?.response?.data?.error;

      if (status === 404 || apiError?.code === 'NOT_FOUND') {
        return {
          success: false,
          message: apiError?.message || 'Las imágenes solicitadas no existen o fueron eliminadas.',
          errorCode: apiError?.code || 'NOT_FOUND',
          traceId: apiError?.trace_id,
          data: {
            animal_id: animalId,
            total: 0,
            images: [],
          },
        };
      }

      console.error('[AnimalImageService] Error fetching images:', error);
      throw error;
    }
  }

  /**
   * Elimina una imagen específica
   * @param imageId ID de la imagen
   */
  async deleteImage(imageId: number): Promise<void> {
    if (!imageId || imageId <= 0) {
      throw new Error('El ID de la imagen es requerido');
    }

    try {
      await api.delete(ANIMAL_IMAGES_ENDPOINTS.DELETE(imageId));
    } catch (error: any) {
      const status = error?.response?.status;
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Error al eliminar imagen';

      // Si la imagen ya no existe en el servidor, considerar la operación exitosa
      if (status === 404 || status === 410) {
        console.warn('[AnimalImageService] Imagen ya no existe, se omite el error');
        return;
      }

      // Si la sesión expiró o el refresh falló, lanzar error controlado
      const isAuthError =
        status === 401 ||
        status === 403 ||
        (status === 500 && typeof error?.config?.url === 'string' && error.config.url.includes('/auth/refresh'));

      if (isAuthError) {
        const authError = new Error(
          message || 'La sesión expiró. Inicia sesión nuevamente para administrar imágenes.'
        );
        (authError as any).code = 'AUTH_REQUIRED';
        throw authError;
      }

      console.error('[AnimalImageService] Error deleting image:', error);
      throw error;
    }
  }

  /**
   * Establece una imagen como principal
   * @param imageId ID de la imagen
   */
  async setPrimaryImage(imageId: number): Promise<AnimalImage> {
    if (!imageId || imageId <= 0) {
      throw new Error('El ID de la imagen es requerido');
    }

    try {
      const response = await api.put<{ success: boolean; data: AnimalImage }>(
        ANIMAL_IMAGES_ENDPOINTS.SET_PRIMARY(imageId)
      );
      return response.data.data;
    } catch (error: any) {
      console.error('[AnimalImageService] Error setting primary image:', error);
      throw error;
    }
  }

  /**
   * Comprime una imagen antes de subirla
   * @param file Archivo a comprimir
   * @param quality Calidad de compresión (0-1)
   */
  private async compressImage(file: File, quality: number): Promise<File> {
    return new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const img = new Image();

        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            resolve(file); // Si no hay contexto, retornar archivo original
            return;
          }

          // Calcular dimensiones manteniendo aspect ratio
          let width = img.width;
          let height = img.height;
          const maxDimension = 1920; // Máximo ancho/alto

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = (height / width) * maxDimension;
              width = maxDimension;
            } else {
              width = (width / height) * maxDimension;
              height = maxDimension;
            }
          }

          canvas.width = width;
          canvas.height = height;

          // Dibujar imagen redimensionada
          ctx.drawImage(img, 0, 0, width, height);

          // Convertir a blob
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                resolve(file);
                return;
              }

              // Crear nuevo archivo con el blob comprimido
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              });

              console.log(
                `[AnimalImageService] Imagen comprimida: ${file.name} (${(
                  file.size / 1024
                ).toFixed(2)}KB -> ${(compressedFile.size / 1024).toFixed(2)}KB)`
              );

              resolve(compressedFile);
            },
            file.type,
            quality
          );
        };

        img.onerror = () => {
          console.warn(
            '[AnimalImageService] Error al cargar imagen para compresión, usando original'
          );
          resolve(file);
        };

        img.src = e.target?.result as string;
      };

      reader.onerror = () => {
        console.warn(
          '[AnimalImageService] Error al leer archivo para compresión, usando original'
        );
        resolve(file);
      };

      reader.readAsDataURL(file);
    });
  }

  /**
   * Maneja errores de subida de imágenes
   */
  private handleUploadError(error: any): Error {
    const status = error?.response?.status;
    const data = error?.response?.data;

    if (status === 400) {
      return new Error(
        data?.message || 'Datos de solicitud inválidos. Verifique los archivos.'
      );
    }

    if (status === 404) {
      return new Error(
        data?.message || 'Animal no encontrado. Verifique el ID.'
      );
    }

    if (status === 413) {
      return new Error(
        data?.message ||
          'El archivo es demasiado grande. Tamaño máximo: 5MB por archivo.'
      );
    }

    if (status === 415) {
      return new Error(
        data?.message ||
          'Tipo de archivo no permitido. Solo se permiten: JPG, PNG, WEBP, GIF.'
      );
    }

    return new Error(
      data?.message || error?.message || 'Error al subir las imágenes'
    );
  }
}

export const animalImageService = new AnimalImageService();
