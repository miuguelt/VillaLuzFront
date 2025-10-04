

import { useState, useEffect, useCallback } from 'react';
import { useResource } from '@/hooks/useResource';
import { animalsService } from '@/services/animalService';
import { AnimalResponse } from '@/types/swaggerTypes';
import { animalStatsToChartData, withRetry } from '@/utils/dataUtils';
import { ChartDataItem } from '@/types/commonTypes';
import type { Dispatch, SetStateAction } from 'react';

// Normalizer: ensure required fields are present
const mapAnimalResponseToLocal = (a: Partial<AnimalResponse> & { [key: string]: any }): AnimalResponse => ({
  id: a.id ?? 0,
  record: a.record ?? '',
  // removed deprecated name field mapping to avoid reliance in UI labels
  birth_date: a.birth_date ?? '',
  weight: a.weight ?? 0,
  breed_id: a.breed_id ?? a.breeds_id ?? 0,
  breeds_id: a.breeds_id ?? a.breed_id ?? 0,
  gender: a.gender ?? a.sex ?? 'Macho',
  sex: a.sex ?? a.gender ?? 'Macho',
  status: a.status ?? 'Sano',
  // CRÍTICO: Mantener idFather/idMother del backend + aliases para compatibilidad
  idFather: a.idFather ?? a.father_id,
  idMother: a.idMother ?? a.mother_id,
  father_id: a.idFather ?? a.father_id,
  mother_id: a.idMother ?? a.mother_id,
  notes: a.notes,
  breed: a.breed,
  father: a.father,
  mother: a.mother,
  created_at: a.created_at,
  updated_at: a.updated_at,
} as any);

export interface UseAnimalsResult {
  animals: AnimalResponse[];
  data: AnimalResponse[];
  loading: boolean;
  error: string | null;
  fetchAnimals: (params?: Record<string, any>) => Promise<AnimalResponse[]>;
  addAnimal: (payload: Partial<AnimalResponse>) => Promise<AnimalResponse | null>;
  editAnimal: (id: number | string, payload: Partial<AnimalResponse>) => Promise<AnimalResponse | null>;
  deleteAnimal: (id: number | string) => Promise<boolean>;
  createItem: (payload: Partial<AnimalResponse>) => Promise<AnimalResponse | null>;
  updateItem: (id: number | string, payload: Partial<AnimalResponse>) => Promise<AnimalResponse | null>;
  deleteItem: (id: number | string) => Promise<boolean>;
  setData: Dispatch<SetStateAction<AnimalResponse[]>>;
  animalStatusData: ChartDataItem[];
  fetchAnimalStatus: () => Promise<void>;
  reload: (params?: Record<string, any>) => Promise<AnimalResponse[]>;
  clearError: () => void;
}

export function useAnimals(): UseAnimalsResult {
  // Use generic resource hook for CRUD
  const resource = useResource<AnimalResponse, any>(animalsService as any, {
    autoFetch: true,
    map: ((items: any[]) => (items as AnimalResponse[]).map(mapAnimalResponseToLocal)) as any,
  });

  // Custom animal status/statistics logic
  const [animalStatusData, setAnimalStatusData] = useState<ChartDataItem[]>([]);
  const [statusLoading, setStatusLoading] = useState<boolean>(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const fetchAnimalStatus = useCallback(async (): Promise<void> => {
    setStatusLoading(true);
    setStatusError(null);
    try {
      const response = await withRetry(
        () => animalsService.getAnimalStatusStats(),
        3,
        1000
      );
      if (response && typeof response === 'object') {
        const chartData = animalStatsToChartData(response);
        setAnimalStatusData(chartData);
      } else {
        setAnimalStatusData([]);
        setStatusError('Formato de respuesta inválido');
      }
    } catch (err) {
      setStatusError('Error al cargar el estado de los animales');
      setAnimalStatusData([]);
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    resource.refetch();
    fetchAnimalStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mapped = resource.data as unknown as AnimalResponse[];

  const addAnimal = async (payload: Partial<AnimalResponse>): Promise<AnimalResponse | null> => {
    const created = await (resource.createItem as any)(payload as any);
    if (!created) return null;
    const mappedCreated = mapAnimalResponseToLocal(created as any);
    (resource.setData as any)((prev: any[]) => {
      const arr = Array.isArray(prev) ? prev : [];
      const clean = arr.filter((x: any) => x?.id !== (created as any)?.id);
      return [...clean, mappedCreated] as any;
    });
    return mappedCreated;
  };

  const editAnimal = async (id: number | string, payload: Partial<AnimalResponse>): Promise<AnimalResponse | null> => {
    const updated = await (resource.updateItem as any)(id, payload as any);
    if (!updated) return null;
    const mappedUpdated = mapAnimalResponseToLocal(updated as any);
    (resource.setData as any)((prev: any[]) => {
      const arr = Array.isArray(prev) ? prev : [];
      return arr.map((x: any) => (x?.id === (updated as any)?.id || x?.id === id) ? { ...x, ...mappedUpdated } : x) as any;
    });
    return mappedUpdated;
  };

  return {
    animals: mapped,
    data: mapped,
    loading: (resource as any).loading || statusLoading,
    error: ((resource as any).error || statusError) as string | null,
    fetchAnimals: resource.refetch as unknown as (params?: Record<string, any>) => Promise<AnimalResponse[]>,
    addAnimal,
    editAnimal,
    createItem: addAnimal,
    updateItem: editAnimal,
    deleteAnimal: resource.deleteItem,
    deleteItem: resource.deleteItem,
    setData: resource.setData as unknown as Dispatch<SetStateAction<AnimalResponse[]>>,
    animalStatusData,
    fetchAnimalStatus,
    reload: resource.refetch as unknown as (params?: Record<string, any>) => Promise<AnimalResponse[]>,
    clearError: () => (resource.setData as any)([]),
  };
}

// (All legacy code removed; see above for new implementation)
