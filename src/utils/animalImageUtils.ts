import { AnimalImage } from '@/services/animalImageService';
import { resolveRecordId } from './recordIdUtils';

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value.trim());
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return null;
};

/**
 * Resuelve de forma tolerante el ID numérico de una imagen.
 */
export const getAnimalImageId = (
  image?: Partial<AnimalImage> | null
): number | null => {
  if (!image) return null;

  const candidate = resolveRecordId(image);
  const resolved = toNumber(candidate);
  if (resolved !== null) {
    return resolved;
  }

  const fallback = toNumber((image as any)?.id);
  if (fallback !== null) {
    return fallback;
  }

  return null;
};

/**
 * Genera una descripción corta para usar en confirmaciones o mensajes.
 */
export const formatAnimalImageName = (
  image?: Partial<AnimalImage> | null
): string => {
  if (!image) {
    return 'esta imagen';
  }
  if (typeof image?.filename === 'string' && image.filename.trim() !== '') {
    return `la imagen "${image.filename.trim()}"`;
  }
  const id = getAnimalImageId(image);
  return id !== null ? `la imagen #${id}` : 'esta imagen';
};
