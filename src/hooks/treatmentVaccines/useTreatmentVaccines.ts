
import { useResource } from '@/hooks/useResource';
import { treatmentVaccinesService } from '@/services/treatmentVaccinesService';
import { TreatmentVaccines } from '@/types/treatmentVaccinesTypes';
import type { TreatmentVaccineResponse } from '@/types/swaggerTypes';
import type { Dispatch, SetStateAction } from 'react';

// Normalizer: maps API TreatmentVaccineResponse to local TreatmentVaccines type
const mapTreatmentVaccineResponseToLocal = (r: Partial<TreatmentVaccineResponse> & { [key: string]: any }): TreatmentVaccines => ({
  id: r.id ?? 0,
  treatment_id: r.treatment_id ?? 0,
  vaccine_id: r.vaccine_id ?? 0,
  treatments: undefined,
  vaccines: undefined,
});

export interface UseTreatmentVaccinesResult {
  treatmentVaccines: TreatmentVaccines[];
  data: TreatmentVaccines[];
  loading: boolean;
  error: string | null;
  refetch: (params?: Record<string, any>) => Promise<TreatmentVaccines[]>;
  addTreatmentVaccine: (payload: Partial<TreatmentVaccines>) => Promise<TreatmentVaccines | null>;
  editTreatmentVaccine: (id: number | string, payload: Partial<TreatmentVaccines>) => Promise<TreatmentVaccines | null>;
  deleteTreatmentVaccine: (id: number | string) => Promise<boolean>;
  // Aliases estandarizados
  createItem: (payload: Partial<TreatmentVaccines>) => Promise<TreatmentVaccines | null>;
  updateItem: (id: number | string, payload: Partial<TreatmentVaccines>) => Promise<TreatmentVaccines | null>;
  deleteItem: (id: number | string) => Promise<boolean>;
  setData: Dispatch<SetStateAction<TreatmentVaccines[]>>;
}

export function useTreatmentVaccines(): UseTreatmentVaccinesResult {
  const resource = useResource<TreatmentVaccineResponse, any>(treatmentVaccinesService as any, {
    autoFetch: true,
    map: ((items: any[]) => (items as TreatmentVaccineResponse[]).map(mapTreatmentVaccineResponseToLocal)) as any,
  });

  const mapped = resource.data as unknown as TreatmentVaccines[];

  const addTreatmentVaccine = async (payload: Partial<TreatmentVaccines>): Promise<TreatmentVaccines | null> => {
    const created = await (resource.createItem as any)(payload as any);
    if (!created) return null;
    const mappedCreated = mapTreatmentVaccineResponseToLocal(created as any);
    resource.setData((prev: any[]) => {
      const arr = Array.isArray(prev) ? prev : [];
      const clean = arr.filter((x: any) => x?.id !== (created as any)?.id);
      return [...clean, mappedCreated] as any;
    });
    return mappedCreated;
  };

  const editTreatmentVaccine = async (id: number | string, payload: Partial<TreatmentVaccines>): Promise<TreatmentVaccines | null> => {
    const updated = await (resource.updateItem as any)(id, payload as any);
    if (!updated) return null;
    const mappedUpdated = mapTreatmentVaccineResponseToLocal(updated as any);
    resource.setData((prev: any[]) => {
      const arr = Array.isArray(prev) ? prev : [];
      return arr.map((x: any) => (x?.id === (updated as any)?.id || x?.id === id) ? { ...x, ...mappedUpdated } : x) as any;
    });
    return mappedUpdated;
  };

  return {
    treatmentVaccines: mapped,
    data: mapped,
    loading: (resource as any).loading,
    error: (resource as any).error,
    refetch: resource.refetch as unknown as (params?: Record<string, any>) => Promise<TreatmentVaccines[]>,
    addTreatmentVaccine,
    editTreatmentVaccine,
    deleteTreatmentVaccine: resource.deleteItem,
    // Aliases estandarizados
    createItem: addTreatmentVaccine,
    updateItem: editTreatmentVaccine,
    deleteItem: resource.deleteItem,
    setData: resource.setData as unknown as Dispatch<SetStateAction<TreatmentVaccines[]>>,
  };
}
