
import { vaccinesService } from '@/services/vaccinesService';
import { Vaccines, route_administration, vaccine_type } from '@/types/vaccinesTypes';
import type { VaccineResponse } from '@/types/swaggerTypes';
import useResource from '@/hooks/useResource';
import type { Dispatch, SetStateAction } from 'react';

// Normalizer: maps API VaccineResponse (flexible) to local Vaccines type
const mapVaccineResponseToLocal = (v: Partial<VaccineResponse> & { [key: string]: any }): Vaccines => {
  // Derive route administration name and id from multiple possible shapes
  const rawRouteName: string | undefined = (v as any).route_administration_name
    ?? (v as any).route_administration?.name
    ?? (v as any).administration_route
    ?? (v as any).route_administration;
  const route_administration_id: number | undefined = (v as any).route_administration_id
    ?? (v as any).route_administration?.id;

  // Normalize to our local union (fix common accent differences)
  const normalizeRoute = (name?: string): route_administration => {
    const n = (name || '').toLowerCase();
    if (n.includes('oral')) return 'Oral';
    if (n.includes('intranasal')) return 'Intranasal';
    if (n.includes('intramuscular')) return 'Intramuscular';
    if (n.includes('intravenosa')) return 'Intravenosa';
    if (n.includes('subcut')) return 'Subcutánea';
    if (n.includes('top') || n.includes('tóp')) return 'Topica';
    return 'Oral';
  };

  // Support both "type" and "vaccine_type" coming from API/backoffice
  const vaccineType: vaccine_type = ((v as any).type as vaccine_type)
    ?? ((v as any).vaccine_type as vaccine_type)
    ?? 'Atenuada';

  // Map nacional plan as string for UI; prefer backend string when present
  const national_plan: string = (v as any).national_plan
    ?? (typeof (v as any).is_mandatory === 'boolean' ? ((v as any).is_mandatory ? 'Sí' : 'No') : '');

  // Target disease single id (our local type expects a single number)
  const target_disease_id: number = (v as any).target_disease_id
    ?? (Array.isArray((v as any).target_diseases) && (v as any).target_diseases[0])
    ?? 0;

  return {
    id: (v.id as number) ?? 0,
    name: (v.name as string) ?? '',
    dosis: (v as any).dosis ?? (v as any).dosage ?? (v as any).dose ?? '',
    route_administration: normalizeRoute(rawRouteName),
    route_administration_id,
    vaccination_interval: (v as any).vaccination_interval ?? '',
    vaccine_type: vaccineType,
    national_plan,
    target_disease_id,
    diseases: (v as any).diseases,
  } as Vaccines;
};

export interface UseVaccinesResult {
  vaccines: Vaccines[];
  data: Vaccines[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refetch: (params?: Record<string, any>) => Promise<Vaccines[]>;
  // Alias de compatibilidad en línea con otros hooks
  createItem: (payload: Partial<Vaccines>) => Promise<Vaccines | null>;
  updateItem: (id: number | string, payload: Partial<Vaccines>) => Promise<Vaccines | null>;
  // API específica ya adoptada por consumidores
  addVaccine: (payload: Partial<Vaccines>) => Promise<Vaccines | null>;
  editVaccine: (id: number | string, payload: Partial<Vaccines>) => Promise<Vaccines | null>;
  deleteVaccine: (id: number | string) => Promise<boolean>;
  // Alias consistente con el resto del proyecto
  deleteItem?: (id: number | string) => Promise<boolean>;
  setData: Dispatch<SetStateAction<Vaccines[]>>;
  // Meta y setters opcionales según useResource
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
  setSearch?: (s: string) => void;
  setFields?: (f: string) => void;
}

export function useVaccines(): UseVaccinesResult {
  const resource = useResource<VaccineResponse, any>(vaccinesService as any, {
    initialParams: { page: 1, limit: 10 },
    map: ((items: any[]) => (items as VaccineResponse[]).map(mapVaccineResponseToLocal)) as any,
  });

  const mapped = resource.data as unknown as Vaccines[];

  // Envolver create/update para retornar y almacenar Vaccines (no VaccineResponse)
  const addVaccine = async (payload: Partial<Vaccines>): Promise<Vaccines | null> => {
    const created = await (resource.createItem as any)(payload as any);
    if (!created) return null;
    const mappedCreated = mapVaccineResponseToLocal(created as any);
    resource.setData((prev: any[]) => {
      const clean = Array.isArray(prev) ? prev.filter((x: any) => (x?.id) !== (created as any)?.id) : [];
      return [...clean, mappedCreated] as any;
    });
    return mappedCreated;
  };

  const editVaccine = async (id: number | string, payload: Partial<Vaccines>): Promise<Vaccines | null> => {
    const updated = await (resource.updateItem as any)(id, payload as any);
    if (!updated) return null;
    const mappedUpdated = mapVaccineResponseToLocal(updated as any);
    resource.setData((prev: any[]) => {
      const arr = Array.isArray(prev) ? prev : [];
      return arr.map((x: any) => (x?.id === (updated as any)?.id || x?.id === id) ? { ...x, ...mappedUpdated } : x) as any;
    });
    return mappedUpdated;
  };

  // Alias para API consistente con otros hooks
  const createItem = addVaccine;
  const updateItem = editVaccine;

  return {
    vaccines: mapped,
    data: mapped,
    loading: resource.loading,
    refreshing: (resource as any).refreshing ?? false,
    error: resource.error,
    refetch: resource.refetch as unknown as (params?: Record<string, any>) => Promise<Vaccines[]>,
    createItem,
    updateItem,
    addVaccine,
    editVaccine,
    deleteVaccine: resource.deleteItem,
    deleteItem: resource.deleteItem,
    setData: resource.setData as unknown as Dispatch<SetStateAction<Vaccines[]>>,
    // Nuevos: meta y setters de paginación/búsqueda/proyección
    meta: resource.meta,
    setPage: resource.setPage,
    setLimit: resource.setLimit,
    setSearch: resource.setSearch,
    setFields: resource.setFields,
  };
}
