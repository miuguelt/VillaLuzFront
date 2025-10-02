
import { useResource } from '@/hooks/useResource';
import { diseaseService } from '@/services/diseaseService';
import { Diseases } from '@/types/diseasesTypes';
import type { DiseaseResponse } from '@/types/swaggerTypes';
import type { Dispatch, SetStateAction } from 'react';

// Normalizer: maps API DiseaseResponse to local Diseases type
const mapDiseaseResponseToLocal = (r: Partial<DiseaseResponse> & { [key: string]: any }): Diseases => ({
  id: r.id ?? 0,
  // backend puede enviar "disease" o "name"
  name: (r as any).disease ?? (r as any).name ?? '',
  // backend puede enviar "symptoms"; compatibilidad con legacy "syntoptoms"
  symptoms: (r as any).symptoms ?? (r as any).syntoptoms ?? '',
  // backend puede enviar "description" o "details"
  details: (r as any).description ?? (r as any).details ?? '',
});

export interface UseDiseasesResult {
  diseases: Diseases[];
  data: Diseases[];
  loading: boolean;
  error: string | null;
  refetch: (params?: Record<string, any>) => Promise<Diseases[]>;
  addDiseases: (payload: Partial<Diseases>) => Promise<Diseases | null>;
  editDisease: (id: number | string, payload: Partial<Diseases>) => Promise<Diseases | null>;
  deleteDisease: (id: number | string) => Promise<boolean>;
  // Aliases estandarizados para compatibilidad cruzada
  createItem: (payload: Partial<Diseases>) => Promise<Diseases | null>;
  updateItem: (id: number | string, payload: Partial<Diseases>) => Promise<Diseases | null>;
  deleteItem: (id: number | string) => Promise<boolean>;
  setData: Dispatch<SetStateAction<Diseases[]>>;
}

export function useDiseases(): UseDiseasesResult {
  const resource = useResource<DiseaseResponse, any>(diseaseService as any, {
    autoFetch: true,
    map: ((items: any[]) => (items as DiseaseResponse[]).map(mapDiseaseResponseToLocal)) as any,
  });

  const mapped = resource.data as unknown as Diseases[];

  const addDiseases = async (payload: Partial<Diseases>): Promise<Diseases | null> => {
    const created = await (resource.createItem as any)(payload as any);
    if (!created) return null;
    const mappedCreated = mapDiseaseResponseToLocal(created as any);
    resource.setData((prev: any[]) => {
      const arr = Array.isArray(prev) ? prev : [];
      const clean = arr.filter((x: any) => x?.id !== (created as any)?.id);
      return [...clean, mappedCreated] as any;
    });
    return mappedCreated;
  };

  const editDisease = async (id: number | string, payload: Partial<Diseases>): Promise<Diseases | null> => {
    const updated = await (resource.updateItem as any)(id, payload as any);
    if (!updated) return null;
    const mappedUpdated = mapDiseaseResponseToLocal(updated as any);
    resource.setData((prev: any[]) => {
      const arr = Array.isArray(prev) ? prev : [];
      return arr.map((x: any) => (x?.id === (updated as any)?.id || x?.id === id) ? { ...x, ...mappedUpdated } : x) as any;
    });
    return mappedUpdated;
  };

  return { diseases: mapped, data: mapped, loading: (resource as any).loading, error: (resource as any).error, refetch: resource.refetch as unknown as (params?: Record<string, any>) => Promise<Diseases[]>, addDiseases, editDisease, deleteDisease: resource.deleteItem, createItem: addDiseases, updateItem: editDisease, deleteItem: resource.deleteItem, setData: resource.setData as unknown as Dispatch<SetStateAction<Diseases[]>> };
}
