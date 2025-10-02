
import { useResource } from '@/hooks/useResource';
import { medicationsService } from '@/services/medicationsService';
import { Medications } from '@/types/medicationsTypes';
import type { MedicationResponse } from '@/types/swaggerTypes';
import type { Dispatch, SetStateAction } from 'react';

const mapMedicationResponseToLocal = (m: Partial<MedicationResponse> & { [key: string]: any }): Medications => ({
  id: m.id ?? 0,
  name: m.name ?? '',
  description: m.description ?? '',
  indications: m.indications ?? '',
  contraindications: m.contraindications ?? '',
  route_administration: (m as any).route_administration ?? 'Oral',
  availability: typeof (m as any).availability === 'boolean' ? (m as any).availability : true,
  treatments: (m as any).treatments,
});

export interface UseMedicationsResult {
  medications: Medications[];
  data: Medications[];
  loading: boolean;
  refreshing?: boolean;
  error: string | null;
  refetch: (params?: Record<string, any>) => Promise<Medications[]>;
  addMedications: (payload: Partial<Medications>) => Promise<Medications | null>;
  editMedication: (id: number | string, payload: Partial<Medications>) => Promise<Medications | null>;
  deleteMedication: (id: number | string) => Promise<boolean>;
  // Aliases estandarizados para compatibilidad cruzada
  createItem: (payload: Partial<Medications>) => Promise<Medications | null>;
  updateItem: (id: number | string, payload: Partial<Medications>) => Promise<Medications | null>;
  deleteItem: (id: number | string) => Promise<boolean>;
  setData: Dispatch<SetStateAction<Medications[]>>;
  meta?: any;
  setPage?: (p: number) => void;
  setLimit?: (l: number) => void;
  setSearch?: (s: string) => void;
  setFields?: (f: string) => void;
}

export function useMedications(): UseMedicationsResult {
  const resource = useResource<MedicationResponse, any>(medicationsService as any, {
    autoFetch: true,
    initialParams: { page: 1, limit: 10 },
    map: ((items: any[]) => (items as MedicationResponse[]).map(mapMedicationResponseToLocal)) as any,
  });

  const mapped = resource.data as unknown as Medications[];

  const addMedications = async (payload: Partial<Medications>): Promise<Medications | null> => {
    try {
      const created = await (resource.createItem as any)(payload as any);
      if (!created) return null;
      
      const mappedCreated = mapMedicationResponseToLocal(created as any);
      
      // Actualización optimista inmediata
      resource.setData((prev: any[]) => {
        const clean = Array.isArray(prev) ? prev.filter((x: any) => (x?.id) !== (created as any)?.id) : [];
        return [...clean, mappedCreated] as any;
      });
      
      // Forzar refetch para asegurar sincronización con el servidor
      setTimeout(() => {
        resource.refetch();
      }, 100);
      
      return mappedCreated;
    } catch (error) {
      console.error('Error creating medication:', error);
      throw error;
    }
  };

  const editMedication = async (id: number | string, payload: Partial<Medications>): Promise<Medications | null> => {
    try {
      const updated = await (resource.updateItem as any)(id, payload as any);
      if (!updated) return null;
      
      const mappedUpdated = mapMedicationResponseToLocal(updated as any);
      
      // Actualización optimista inmediata
      resource.setData((prev: any[]) => {
        const arr = Array.isArray(prev) ? prev : [];
        return arr.map((x: any) => (x?.id === (updated as any)?.id || x?.id === id) ? { ...x, ...mappedUpdated } : x) as any;
      });
      
      // Forzar refetch para asegurar sincronización con el servidor
      setTimeout(() => {
        resource.refetch();
      }, 100);
      
      return mappedUpdated;
    } catch (error) {
      console.error('Error updating medication:', error);
      throw error;
    }
  };

  const deleteMedication = async (id: number | string): Promise<boolean> => {
    try {
      const result = await resource.deleteItem(id);
      
      if (result) {
        // Actualización optimista inmediata
        resource.setData((prev: any[]) => {
          const arr = Array.isArray(prev) ? prev : [];
          return arr.filter((x: any) => x?.id !== id) as any;
        });
        
        // Forzar refetch para asegurar sincronización con el servidor
        setTimeout(() => {
          resource.refetch();
        }, 100);
      }
      
      return result;
    } catch (error) {
      console.error('Error deleting medication:', error);
      throw error;
    }
  };

  return {
    medications: mapped,
    data: mapped,
    loading: (resource as any).loading,
    refreshing: (resource as any).refreshing,
    error: (resource as any).error,
    refetch: resource.refetch as unknown as (params?: Record<string, any>) => Promise<Medications[]>,
    addMedications,
    editMedication,
    deleteMedication,
    // Aliases estandarizados
    createItem: addMedications,
    updateItem: editMedication,
    deleteItem: deleteMedication,
    setData: resource.setData as unknown as Dispatch<SetStateAction<Medications[]>>,
    meta: (resource as any).meta,
    setPage: (resource as any).setPage,
    setLimit: (resource as any).setLimit,
    setSearch: (resource as any).setSearch,
    setFields: (resource as any).setFields,
  };
}
    
