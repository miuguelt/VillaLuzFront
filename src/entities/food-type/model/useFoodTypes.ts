
import { useResource } from '@/shared/hooks/useResource';
import { foodTypesService } from '@/entities/food-type/api/foodTypes.service';
import { FoodTypes } from '@/entities/food-type/model/types';
import type { FoodTypeResponse } from '@/shared/api/generated/swaggerTypes';
import type { Dispatch, SetStateAction } from 'react';

// Normalizer: maps API FoodTypeResponse to local FoodTypes type
const mapFoodTypeResponseToLocal = (ft: Partial<FoodTypeResponse> & { [key: string]: any }): FoodTypes => ({
  id: ft.id ?? 0,
  food_type: ft.food_type || ft.name || '',
  sowing_date: ft.sowing_date,
  harvest_date: ft.harvest_date,
  area: ft.area,
  handlings: ft.handlings || ft.description,
  gauges: ft.gauges,
  description: ft.description,
  name: ft.name,
});

export interface UseFoodTypesResult {
  foodTypes: FoodTypes[];
  data: FoodTypes[];
  loading: boolean;
  error: string | null;
  refetch: (params?: Record<string, any>) => Promise<FoodTypes[]>;
  createItem: (payload: Partial<FoodTypes>) => Promise<FoodTypes | null>; // alias compat
  updateItem: (id: number | string, payload: Partial<FoodTypes>) => Promise<FoodTypes | null>; // alias compat
  addFoodType: (payload: Partial<FoodTypes>) => Promise<FoodTypes | null>;
  editFoodType: (id: number | string, payload: Partial<FoodTypes>) => Promise<FoodTypes | null>;
  deleteItem: (id: number | string) => Promise<boolean>;
  setData: Dispatch<SetStateAction<FoodTypes[]>>;
  refreshing?: boolean;
}

export function useFoodTypes(): UseFoodTypesResult {
  const resource = useResource<FoodTypeResponse, any>(foodTypesService as any, {
    autoFetch: true,
    map: ((items: any[]) => (items as FoodTypeResponse[]).map(mapFoodTypeResponseToLocal)) as any,
  });

  const mapped = resource.data as unknown as FoodTypes[];

  const addFoodType = async (payload: Partial<FoodTypes>): Promise<FoodTypes | null> => {
    const created = await (resource.createItem as any)(payload as any);
    if (!created) return null;
    const mappedCreated = mapFoodTypeResponseToLocal(created as any);
    resource.setData((prev: any[]) => {
      const arr = Array.isArray(prev) ? prev : [];
      const clean = arr.filter((x: any) => x?.id !== (created as any)?.id);
      return [...clean, mappedCreated] as any;
    });
    return mappedCreated;
  };

  const editFoodType = async (id: number | string, payload: Partial<FoodTypes>): Promise<FoodTypes | null> => {
    const updated = await (resource.updateItem as any)(id, payload as any);
    if (!updated) return null;
    const mappedUpdated = mapFoodTypeResponseToLocal(updated as any);
    resource.setData((prev: any[]) => {
      const arr = Array.isArray(prev) ? prev : [];
      return arr.map((x: any) => (x?.id === (updated as any)?.id || x?.id === id) ? { ...x, ...mappedUpdated } : x) as any;
    });
    return mappedUpdated;
  };

  const createItem = addFoodType; // compat alias
  const updateItem = editFoodType; // compat alias

  return {
    foodTypes: mapped,
    data: mapped,
    loading: (resource as any).loading,
    error: (resource as any).error,
    refetch: resource.refetch as unknown as (params?: Record<string, any>) => Promise<FoodTypes[]>,
    createItem,
    updateItem,
    addFoodType,
    editFoodType,
    deleteItem: resource.deleteItem,
    setData: resource.setData as unknown as Dispatch<SetStateAction<FoodTypes[]>>,
    refreshing: (resource as any).refreshing,
  };
}
