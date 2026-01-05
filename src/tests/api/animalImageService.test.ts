import { animalImageService } from '@/entities/animal/api/animalImage.service';
import * as envConfig from '@/shared/utils/envConfig';
import api from '@/shared/api/client';

describe('AnimalImageService', () => {
  describe('uploadImages', () => {
    it('should throw error if animalId is invalid', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      await expect(
        animalImageService.uploadImages(0, [file])
      ).rejects.toThrow('El ID del animal es requerido');

      await expect(
        animalImageService.uploadImages(-1, [file])
      ).rejects.toThrow('El ID del animal es requerido');
    });

    it('should throw error if no files provided', async () => {
      await expect(
        animalImageService.uploadImages(1, [])
      ).rejects.toThrow('Debe seleccionar al menos una imagen');
    });

    it('should throw error if file type is not allowed', async () => {
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });

      await expect(
        animalImageService.uploadImages(1, [file])
      ).rejects.toThrow('Tipo de archivo no permitido');
    });
  });

  describe('getAnimalImages', () => {
    it('should throw error if animalId is invalid', async () => {
      await expect(
        animalImageService.getAnimalImages(0)
      ).rejects.toThrow('El ID del animal es requerido');

      await expect(
        animalImageService.getAnimalImages(-1)
      ).rejects.toThrow('El ID del animal es requerido');
    });
  });

  describe('deleteImage', () => {
    it('should throw error if imageId is invalid', async () => {
      await expect(
        animalImageService.deleteImage(0)
      ).rejects.toThrow('El ID de la imagen es requerido');

      await expect(
        animalImageService.deleteImage(-1)
      ).rejects.toThrow('El ID de la imagen es requerido');
    });
  });

  describe('setPrimaryImage', () => {
    it('should throw error if imageId is invalid', async () => {
      await expect(
        animalImageService.setPrimaryImage(0)
      ).rejects.toThrow('El ID de la imagen es requerido');

      await expect(
        animalImageService.setPrimaryImage(-1)
      ).rejects.toThrow('El ID de la imagen es requerido');
    });
  });
});

describe('AnimalImageService URL normalization', () => {
  const baseResponse = {
    success: true,
    message: 'OK',
    data: {
      animal_id: 1,
      total: 1,
      images: [
        {
          id: 10,
          animal_id: 1,
          filename: 'a.jpg',
          filepath: '/uploads/a.jpg',
          file_size: 1000,
          mime_type: 'image/jpeg',
          is_primary: false,
          url: '/uploads/a.jpg',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ],
    },
  };

  const versionParam = new Date(baseResponse.data.images[0].updated_at).getTime().toString();

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('makes URL absolute in dev using /api/v1 proxy path', async () => {
    jest.spyOn(envConfig, 'isDevelopment').mockReturnValue(true);
    jest.spyOn(envConfig, 'getApiBaseURL').mockReturnValue('/api/v1');
    jest.spyOn(envConfig, 'getBackendBaseURL').mockReturnValue('https://backend.example');

    jest.spyOn(api, 'get').mockResolvedValue({ data: baseResponse } as any);

    const result = await animalImageService.getAnimalImages(1);
    expect(result.data.images[0].url).toBe(`/api/v1/uploads/a.jpg?v=${versionParam}`);
  });

  it('makes URL absolute in prod using backend base (absolute API base)', async () => {
    jest.spyOn(envConfig, 'isDevelopment').mockReturnValue(false);
    jest.spyOn(envConfig, 'getApiBaseURL').mockReturnValue('https://backend.example/api/v1');
    jest.spyOn(envConfig, 'getBackendBaseURL').mockReturnValue('https://backend.example');

    jest.spyOn(api, 'get').mockResolvedValue({ data: baseResponse } as any);

    const result = await animalImageService.getAnimalImages(1);
    expect(result.data.images[0].url).toBe(`https://backend.example/api/v1/uploads/a.jpg?v=${versionParam}`);
  });

  it('leaves absolute image URLs unchanged', async () => {
    const absoluteResponse = {
      ...baseResponse,
      data: {
        ...baseResponse.data,
        images: [
          {
            ...baseResponse.data.images[0],
            url: 'https://cdn.other.com/u/a.jpg',
          },
        ],
      },
    };

    jest.spyOn(envConfig, 'isDevelopment').mockReturnValue(true);
    jest.spyOn(envConfig, 'getApiBaseURL').mockReturnValue('/api/v1');
    jest.spyOn(envConfig, 'getBackendBaseURL').mockReturnValue('https://backend.example');

    jest.spyOn(api, 'get').mockResolvedValue({ data: absoluteResponse } as any);

    const result = await animalImageService.getAnimalImages(1);
    expect(result.data.images[0].url).toBe(`https://cdn.other.com/u/a.jpg?v=${versionParam}`);
  });
});
