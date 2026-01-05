
import { useResource } from '@/shared/hooks/useResource';
import { controlService } from '@/entities/control/api/control.service';
import { Control } from '@/entities/control/model/types';
import type { ControlResponse } from '@/shared/api/generated/swaggerTypes';
import type { Dispatch, SetStateAction } from 'react';

// Normalizer: maps API ControlResponse to local Control type
const mapControlResponseToLocal = (r: Partial<ControlResponse> & { [key: string]: any }): Control => ({
  id: r.id ?? 0,
  checkup_date: r.checkup_date ?? r.date ?? '',
  health_status: (r.health_status as any) ?? (r.healt_status as any) ?? 'Bueno',
  description: r.description ?? '',
  animal_id: r.animal_id ?? 0,
  healt_status: r.healt_status as any,
  animals: undefined,
});

export interface UseControlsResult {
  controls: Control[];
  data: Control[];
  loading: boolean;
  refreshing?: boolean;
  error: string | null;
  refetch: (params?: Record<string, any>) => Promise<Control[]>;
  // Aliases estandarizados para compatibilidad cruzada
  createItem: (payload: Partial<Control>) => Promise<Control | null>;
  updateItem: (id: number | string, payload: Partial<Control>) => Promise<Control | null>;
  addControl: (payload: Partial<Control>) => Promise<Control | null>;
  editControl: (id: number | string, payload: Partial<Control>) => Promise<Control | null>;
  deleteItem: (id: number | string) => Promise<boolean>;
  setData: Dispatch<SetStateAction<Control[]>>;
}

export function useControls(): UseControlsResult {
  const resource = useResource<ControlResponse, any>(controlService as any, {
    autoFetch: true,
    map: ((items: any[]) => (items as ControlResponse[]).map(mapControlResponseToLocal)) as any,
  });

  const mapped = resource.data as unknown as Control[];

  const addControl = async (payload: Partial<Control>): Promise<Control | null> => {
    const created = await (resource.createItem as any)(payload as any);
    if (!created) return null;
    const mappedCreated = mapControlResponseToLocal(created as any);
    resource.setData((prev: any[]) => {
      const arr = Array.isArray(prev) ? prev : [];
      const clean = arr.filter((x: any) => x?.id !== (created as any)?.id);
      return [...clean, mappedCreated] as any;
    });
    return mappedCreated;
  };

  const editControl = async (id: number | string, payload: Partial<Control>): Promise<Control | null> => {
    const updated = await (resource.updateItem as any)(id, payload as any);
    if (!updated) return null;
    const mappedUpdated = mapControlResponseToLocal(updated as any);
    resource.setData((prev: any[]) => {
      const arr = Array.isArray(prev) ? prev : [];
      return arr.map((x: any) => (x?.id === (updated as any)?.id || x?.id === id) ? { ...x, ...mappedUpdated } : x) as any;
    });
    return mappedUpdated;
  };

  const createItem = addControl; // compat alias
  const updateItem = editControl; // compat alias

  return {
    controls: mapped,
    data: mapped,
    loading: (resource as any).loading,
    refreshing: (resource as any).refreshing,
    error: (resource as any).error,
    refetch: resource.refetch as unknown as (params?: Record<string, any>) => Promise<Control[]>,
    createItem,
    updateItem,
    addControl,
    editControl,
    deleteItem: resource.deleteItem,
    setData: resource.setData as unknown as Dispatch<SetStateAction<Control[]>>,
  };
}
