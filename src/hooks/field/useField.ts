
import { useResource } from '@/hooks/useResource';
import { fieldService } from '@/services/fieldService';
import { Fields } from '@/types/fieldsTypes';
import type { FieldResponse } from '@/types/swaggerTypes';
import type { Dispatch, SetStateAction } from 'react';

// Normalizer: maps API FieldResponse to local Fields type
const mapFieldResponseToLocal = (r: Partial<FieldResponse> & { [key: string]: any }): Fields => ({
  id: r.id ?? 0,
  name: r.name ?? '',
  location: r.location ?? '',
  capacity: r.capacity ?? '',
  state: r.state as any,
  management: r.management ?? '',
  measurements: r.measurements ?? '',
  area: r.area ?? '',
  food_type_id: r.food_type_id,
  food_types: undefined,
  animalFields: undefined,
});

export interface UseFieldsResult {
  fields: Fields[];
  data: Fields[];
  loading: boolean;
  refreshing?: boolean;
  error: string | null;
  refetch: (params?: Record<string, any>) => Promise<Fields[]>;
  addField: (payload: Partial<Fields>) => Promise<Fields | null>;
  editField: (id: number | string, payload: Partial<Fields>) => Promise<Fields | null>;
  deleteField: (id: number | string) => Promise<boolean>;
  // Aliases estandarizados
  createItem: (payload: Partial<Fields>) => Promise<Fields | null>;
  updateItem: (id: number | string, payload: Partial<Fields>) => Promise<Fields | null>;
  deleteItem: (id: number | string) => Promise<boolean>;
  setData: Dispatch<SetStateAction<Fields[]>>;
  meta?: any;
  setPage?: (p: number) => void;
  setLimit?: (l: number) => void;
  setSearch?: (s: string) => void;
  setFields?: (f: string) => void;
}

export function useFields(): UseFieldsResult {
  const resource = useResource<FieldResponse, any>(fieldService as any, {
    autoFetch: true,
    map: ((items: any[]) => (items as FieldResponse[]).map(mapFieldResponseToLocal)) as any,
  });

  const mapped = resource.data as unknown as Fields[];

  const addField = async (payload: Partial<Fields>): Promise<Fields | null> => {
    const created = await (resource.createItem as any)(payload as any);
    if (!created) return null;
    const mappedCreated = mapFieldResponseToLocal(created as any);
    resource.setData((prev: any[]) => {
      const arr = Array.isArray(prev) ? prev : [];
      const clean = arr.filter((x: any) => x?.id !== (created as any)?.id);
      return [...clean, mappedCreated] as any;
    });
    return mappedCreated;
  };

  const editField = async (id: number | string, payload: Partial<Fields>): Promise<Fields | null> => {
    const updated = await (resource.updateItem as any)(id, payload as any);
    if (!updated) return null;
    const mappedUpdated = mapFieldResponseToLocal(updated as any);
    resource.setData((prev: any[]) => {
      const arr = Array.isArray(prev) ? prev : [];
      return arr.map((x: any) => (x?.id === (updated as any)?.id || x?.id === id) ? { ...x, ...mappedUpdated } : x) as any;
    });
    return mappedUpdated;
  };

  return {
    fields: mapped,
    data: mapped,
    loading: (resource as any).loading,
    refreshing: (resource as any).refreshing,
    error: (resource as any).error,
    refetch: resource.refetch as unknown as (params?: Record<string, any>) => Promise<Fields[]>,
    addField,
    editField,
    deleteField: resource.deleteItem,
    // Aliases estandarizados
    createItem: addField,
    updateItem: editField,
    deleteItem: resource.deleteItem,
    setData: resource.setData as unknown as Dispatch<SetStateAction<Fields[]>>,
    meta: (resource as any).meta,
    setPage: (resource as any).setPage,
    setLimit: (resource as any).setLimit,
    setSearch: (resource as any).setSearch,
    setFields: (resource as any).setFields,
  };
}
