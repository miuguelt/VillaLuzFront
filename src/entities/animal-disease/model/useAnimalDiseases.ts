
import { useResource } from '@/shared/hooks/useResource';
import { animalDiseasesService } from '@/entities/animal-disease/api/animalDiseases.service';
import { AnimalDiseases } from '@/entities/animal-disease/model/types';
import type { AnimalDiseaseResponse } from '@/shared/api/generated/swaggerTypes';

// Normalizer: maps API AnimalDiseaseResponse to local AnimalDiseases type but preserves extra alias/nested fields
const mapAnimalDiseaseResponseToLocal = (r: Partial<AnimalDiseaseResponse> & { [key: string]: any }): AnimalDiseases => ({
  // Preserve all original fields first (includes alias fields and nested relations if present)
  ...(r as any),
  // Normalize core fields to expected local shape (override if missing)
  id: r.id ?? 0,
  animal_id: r.animal_id ?? 0,
  disease_id: r.disease_id ?? 0,
  instructor_id: r.instructor_id,
  diagnosis_date: r.diagnosis_date ?? '',
  status: (r.status as any) ?? 'Activo',
} as any);

export type UseAnimalDiseasesOptions = {
  paginated?: boolean;
  initialPage?: number;
  initialLimit?: number;
};

export function useAnimalDiseases(options: UseAnimalDiseasesOptions = {}) {
  const { paginated = false, initialPage = 1, initialLimit = 10 } = options;

  const resource = useResource<AnimalDiseaseResponse, any>(animalDiseasesService as any, {
    autoFetch: true,
    // Ask backend to include related entities and commonly used alias fields to avoid N+1 fetches on the page
    initialParams: paginated
      ? { page: initialPage, limit: initialLimit, include_relations: 'animals,diseases,instructors', fields: 'animal_record,disease_name,instructor_fullname' }
      : { include_relations: 'animals,diseases,instructors', fields: 'animal_record,disease_name,instructor_fullname' },
    map: ((items: any[]) => (items as AnimalDiseaseResponse[]).map(mapAnimalDiseaseResponseToLocal)) as any,
  }) as unknown as {
    data: AnimalDiseases[];
    loading: boolean;
    error: string | null;
    refreshing?: boolean;
    refetch: (params?: any) => Promise<AnimalDiseases[]>;
    createItem: (payload: Partial<AnimalDiseases>) => Promise<AnimalDiseases | null>;
    updateItem: (id: number | string, payload: Partial<AnimalDiseases>) => Promise<AnimalDiseases | null>;
    deleteItem: (id: number | string) => Promise<boolean>;
    setData: React.Dispatch<React.SetStateAction<AnimalDiseases[]>>;
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages?: number;
      hasNextPage?: boolean;
      hasPreviousPage?: boolean;
      rawMeta?: any;
    } | null;
    setPage: (page: number) => void;
    setLimit: (limit: number) => void;
  };
  return {
    animalDiseases: resource.data,
    data: resource.data,
    loading: resource.loading,
    refreshing: (resource as any).refreshing,
    error: resource.error,
    refetch: resource.refetch,
    addAnimalDiseases: resource.createItem,
    editAnimalDisease: resource.updateItem,
    deleteAnimalDisease: resource.deleteItem,
    setData: resource.setData,
    createItem: resource.createItem,
    updateItem: resource.updateItem,
    deleteItem: resource.deleteItem,
    // Exponer meta y controles de paginación
    meta: resource.meta,
    setPage: resource.setPage,
    setLimit: resource.setLimit,
  };
}
