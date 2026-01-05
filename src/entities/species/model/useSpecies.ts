
import { useResource } from '@/shared/hooks/useResource';
import { speciesService } from '@/entities/species/api/species.service';
import { Species } from '@/entities/species/model/types';
import type { SpeciesResponse } from '@/shared/api/generated/swaggerTypes';
import type { Dispatch, SetStateAction } from 'react';

// Normalizer: maps API SpeciesResponse to local Species type
const mapSpeciesResponseToLocal = (r: Partial<SpeciesResponse> & { [key: string]: any }): Species => ({
  id: r.id ?? 0,
  name: r.name ?? '',
});

export interface UseSpeciesResult {
  species: Species[];
  data: Species[];
  loading: boolean;
  refreshing?: boolean;
  error: string | null;
  refetch: (params?: Record<string, any>) => Promise<Species[]>;
  createItem: (payload: Partial<Species>) => Promise<Species | null>;
  updateItem: (id: number | string, payload: Partial<Species>) => Promise<Species | null>;
  deleteItem: (id: number | string) => Promise<boolean>;
  setData: Dispatch<SetStateAction<Species[]>>;
}

export function useSpecies(): UseSpeciesResult {
  const resource = useResource<SpeciesResponse, any>(speciesService as any, {
    autoFetch: true,
    map: ((items: any[]) => (items as SpeciesResponse[]).map(mapSpeciesResponseToLocal)) as any,
  });
  return {
    species: resource.data as unknown as Species[],
    data: resource.data as unknown as Species[],
    loading: (resource as any).loading,
    refreshing: (resource as any).refreshing,
    error: (resource as any).error,
    refetch: resource.refetch as unknown as (params?: Record<string, any>) => Promise<Species[]>,
    createItem: resource.createItem as unknown as (payload: Partial<Species>) => Promise<Species | null>,
    updateItem: resource.updateItem as unknown as (id: number | string, payload: Partial<Species>) => Promise<Species | null>,
    deleteItem: resource.deleteItem,
    setData: resource.setData as unknown as Dispatch<SetStateAction<Species[]>>,
  };
}
