
import { useResource } from '@/shared/hooks/useResource';
import { breedsService } from '@/entities/breed/api/breeds.service';
import { Breeds } from '@/entities/breed/model/types';
import type { BreedResponse } from '@/shared/api/generated/swaggerTypes';
import type { Dispatch, SetStateAction } from 'react';

// Normalizer: maps API BreedResponse to local Breeds type
const mapBreedResponseToLocal = (r: Partial<BreedResponse> & { [key: string]: any }): Breeds => ({
  id: r.id ?? 0,
  name: r.name ?? '',
  species_id: r.species_id ?? 0,
  species: (r as any).species || { id: r.species_id ?? 0, name: '', description: '' },
});

export interface UseBreedsResult {
  breeds: Breeds[];
  data: Breeds[];
  loading: boolean;
  refreshing?: boolean;
  error: string | null;
  refetch: (params?: Record<string, any>) => Promise<Breeds[]>;
  addBreed: (payload: Partial<Breeds>) => Promise<Breeds | null>;
  editBreed: (id: number | string, payload: Partial<Breeds>) => Promise<Breeds | null>;
  deleteBreed: (id: number | string) => Promise<boolean>;
  // Aliases estandarizados para compatibilidad cruzada
  createItem: (payload: Partial<Breeds>) => Promise<Breeds | null>;
  updateItem: (id: number | string, payload: Partial<Breeds>) => Promise<Breeds | null>;
  deleteItem: (id: number | string) => Promise<boolean>;
  setData: Dispatch<SetStateAction<Breeds[]>>;
}

export function useBreeds(): UseBreedsResult {
  const resource = useResource<BreedResponse, any>(breedsService as any, {
    autoFetch: true,
    map: ((items: any[]) => (items as BreedResponse[]).map(mapBreedResponseToLocal)) as any,
  });

  const mapped = resource.data as unknown as Breeds[];

  const addBreed = async (payload: Partial<Breeds>): Promise<Breeds | null> => {
    const created = await (resource.createItem as any)(payload as any);
    if (!created) return null;
    const mappedCreated = mapBreedResponseToLocal(created as any);
    resource.setData((prev: any[]) => {
      const arr = Array.isArray(prev) ? prev : [];
      const clean = arr.filter((x: any) => x?.id !== (created as any)?.id);
      return [...clean, mappedCreated] as any;
    });
    return mappedCreated;
  };

  const editBreed = async (id: number | string, payload: Partial<Breeds>): Promise<Breeds | null> => {
    const updated = await (resource.updateItem as any)(id, payload as any);
    if (!updated) return null;
    const mappedUpdated = mapBreedResponseToLocal(updated as any);
    resource.setData((prev: any[]) => {
      const arr = Array.isArray(prev) ? prev : [];
      return arr.map((x: any) => (x?.id === (updated as any)?.id || x?.id === id) ? { ...x, ...mappedUpdated } : x) as any;
    });
    return mappedUpdated;
  };

  const deleteBreed = async (id: number | string): Promise<boolean> => {
    try {
      const result = await resource.deleteItem(id);
      return result;
    } catch (error) {
      console.error('[useBreeds] Error al eliminar breed:', error);
      // Propagar el error para que AdminCRUDPage lo maneje
      throw error;
    }
  };

  return {
    breeds: mapped,
    data: mapped,
    loading: (resource as any).loading,
    refreshing: (resource as any).refreshing,
    error: (resource as any).error,
    refetch: resource.refetch as unknown as (params?: Record<string, any>) => Promise<Breeds[]>,
    addBreed,
    editBreed,
    deleteBreed,
    // Aliases estandarizados
    createItem: addBreed,
    updateItem: editBreed,
    deleteItem: deleteBreed,
    setData: resource.setData as unknown as Dispatch<SetStateAction<Breeds[]>>,
  };
}
