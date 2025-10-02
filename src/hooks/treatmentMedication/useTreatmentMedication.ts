import { useResource } from '@/hooks/useResource';
import { treatmentMedicationService } from '@/services/treatmentMedicationService';
import type { Dispatch, SetStateAction } from 'react';

export interface UseTreatmentMedicationsResult {
  data: any[]; // Preserve full API response structure
  loading: boolean;
  error: string | null;
  refetch: (params?: any) => Promise<any[]>;
  createItem: (payload: any) => Promise<any | null>;
  updateItem: (id: number | string, payload: any) => Promise<any | null>;
  deleteItem: (id: number | string) => Promise<boolean>;
  setData: Dispatch<SetStateAction<any[]>>;
  
  // Pagination from useResource
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages?: number;
    hasNextPage?: boolean;
    hasPreviousPage?: boolean;
    rawMeta?: any;
  } | null;
  setPage?: (page: number) => void;
  setLimit?: (limit: number) => void;
  setSearch?: (search: string) => void;
  setFields?: (fields: string) => void;
}

export function useTreatmentMedications(): UseTreatmentMedicationsResult {
  const resource = useResource(treatmentMedicationService as any, {
    autoFetch: true,
    // No mapping - preserve original API response structure for display fields
  });

  return {
    data: resource.data || [],
    loading: resource.loading,
    error: resource.error,
    refetch: resource.refetch,
    createItem: resource.createItem,
    updateItem: resource.updateItem,
    deleteItem: resource.deleteItem,
    setData: resource.setData,
    
    // Expose pagination controls
    meta: resource.meta,
    setPage: resource.setPage,
    setLimit: resource.setLimit,
    setSearch: resource.setSearch,
    setFields: resource.setFields,
  };
}
