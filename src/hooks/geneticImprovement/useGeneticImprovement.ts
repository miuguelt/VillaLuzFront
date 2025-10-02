
import { useResource } from '@/hooks/useResource';
import { geneticImprovementsService } from '@/services/geneticImprovementsService';
import { GeneticImprovements } from '@/types/geneticImprovementsTypes';
import type { GeneticImprovementResponse } from '@/types/swaggerTypes';
import type { Dispatch, SetStateAction } from 'react';

// Normalizer: maps API GeneticImprovementResponse to local GeneticImprovements type
const mapGeneticImprovementResponseToLocal = (r: Partial<GeneticImprovementResponse> & { [key: string]: any }): GeneticImprovements => ({
  id: r.id ?? 0,
  animal_id: r.animal_id ?? 0,
  genetic_event_date: r.date ?? '',
  genetic_event_technique: r.genetic_event_technique ?? r.genetic_event_techique ?? '',
  genetic_event_description: r.details ?? '',
  genetic_event_result: r.results ?? '',
  genetic_event_cost: 0,
  genetic_event_responsible: '',
  genetic_event_techique: r.genetic_event_techique,
  date: r.date,
  details: r.details,
  results: r.results,
  animals: undefined,
});

export interface UseGeneticImprovementsResult {
  geneticImprovements: GeneticImprovements[];
  data: GeneticImprovements[];
  loading: boolean;
  refreshing?: boolean;
  error: string | null;
  refetch: (params?: Record<string, any>) => Promise<GeneticImprovements[]>;
  createItem: (payload: Partial<GeneticImprovements>) => Promise<GeneticImprovements | null>; // alias compat
  updateItem: (id: number | string, payload: Partial<GeneticImprovements>) => Promise<GeneticImprovements | null>; // alias compat
  addGeneticImprovement: (payload: Partial<GeneticImprovements>) => Promise<GeneticImprovements | null>;
  editGeneticImprovement: (id: number | string, payload: Partial<GeneticImprovements>) => Promise<GeneticImprovements | null>;
  deleteItem: (id: number | string) => Promise<boolean>;
  setData: Dispatch<SetStateAction<GeneticImprovements[]>>;
}

export function useGeneticImprovements(): UseGeneticImprovementsResult {
  const resource = useResource<GeneticImprovementResponse, any>(geneticImprovementsService as any, {
    autoFetch: true,
    map: ((items: any[]) => (items as GeneticImprovementResponse[]).map(mapGeneticImprovementResponseToLocal)) as any,
  });

  const mapped = resource.data as unknown as GeneticImprovements[];

  const addGeneticImprovement = async (payload: Partial<GeneticImprovements>): Promise<GeneticImprovements | null> => {
    const created = await (resource.createItem as any)(payload as any);
    if (!created) return null;
    const mappedCreated = mapGeneticImprovementResponseToLocal(created as any);
    resource.setData((prev: any[]) => {
      const arr = Array.isArray(prev) ? prev : [];
      const clean = arr.filter((x: any) => x?.id !== (created as any)?.id);
      return [...clean, mappedCreated] as any;
    });
    return mappedCreated;
  };

  const editGeneticImprovement = async (id: number | string, payload: Partial<GeneticImprovements>): Promise<GeneticImprovements | null> => {
    const updated = await (resource.updateItem as any)(id, payload as any);
    if (!updated) return null;
    const mappedUpdated = mapGeneticImprovementResponseToLocal(updated as any);
    resource.setData((prev: any[]) => {
      const arr = Array.isArray(prev) ? prev : [];
      return arr.map((x: any) => (x?.id === (updated as any)?.id || x?.id === id) ? { ...x, ...mappedUpdated } : x) as any;
    });
    return mappedUpdated;
  };

  const createItem = addGeneticImprovement; // compat alias
  const updateItem = editGeneticImprovement; // compat alias

  return {
    geneticImprovements: mapped,
    data: mapped,
    loading: (resource as any).loading,
    refreshing: (resource as any).refreshing,
    error: (resource as any).error,
    refetch: resource.refetch as unknown as (params?: Record<string, any>) => Promise<GeneticImprovements[]>,
    createItem,
    updateItem,
    addGeneticImprovement,
    editGeneticImprovement,
    deleteItem: resource.deleteItem,
    setData: resource.setData as unknown as Dispatch<SetStateAction<GeneticImprovements[]>>,
  };
}
