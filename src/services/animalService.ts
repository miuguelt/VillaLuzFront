import { BaseService } from './baseService';
import { AnimalResponse, AnimalInput, AnimalStatistics, PaginatedResponse } from '@/types/swaggerTypes';
import { BulkResponse } from '@/types/commonTypes';
import analyticsService from './analyticsService';
import { checkAnimalDependencies, clearAnimalDependencyCache } from './dependencyCheckService';
import type { AnimalTreeGraph, TreeQueryParams } from '@/types/animalTreeTypes';

interface AnimalStatusStats {
  by_status: Record<string, number>;
  total_animals: number;
}

class AnimalsService extends BaseService<AnimalResponse> {
  constructor() {
    super('animals', {
      enableCache: true,
      preferredListKeys: ['animals', 'results'],
    });
  }

  // Normaliza valores de sexo a forma canónica ("Macho" | "Hembra")
  private normalizeSex(value: any): 'Macho' | 'Hembra' | undefined {
    if (!value && value !== 0) return undefined;
    const s = String(value).trim().toLowerCase();
    if (s === 'm' || s === 'male' || s === 'macho' || s === '1' || s === '01') return 'Macho';
    if (s === 'f' || s === 'female' || s === 'hembra' || s === '2' || s === '02') return 'Hembra';
    // Fallback: si viene ya correcto, respétalo
    if (s === 'macho') return 'Macho';
    if (s === 'hembra') return 'Hembra';
    return undefined;
  }

  // Detecta si el término de búsqueda parece una fecha o año (para habilitar búsqueda por columnas de fecha)
  private isDateLike(term: any): boolean {
    if (term === null || term === undefined) return false;
    const s = String(term).trim();
    if (!s) return false;
    // Año (YYYY)
    if (/^\d{4}$/.test(s)) return true;
    // Formatos comunes de fecha: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, YYYY/MM/DD, YYYY-MM-DD
    if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(s)) return true;
    if(/^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/.test(s)) return true;
    return false;
  }

  // Enriquece parámetros para que el backend busque también en columnas de fecha cuando el término es un año/fecha
  private enrichParamsForDateSearch(params: Record<string, any> = {}): Record<string, any> {
    const searchTerm = params.search ?? params.q;
    if (!this.isDateLike(searchTerm)) return params;

    const extraDateFields = ['birth_date', 'created_at', 'updated_at'];
    const existingFields = (params.fields ? String(params.fields) : '').split(',').map(f => f.trim()).filter(Boolean);
    const merged = Array.from(new Set([...existingFields, ...extraDateFields]));

    return {
      ...params,
      // Forzar que ambos parámetros se envíen por compatibilidad y que fields incluya columnas de fecha
      search: searchTerm,
      q: searchTerm,
      fields: merged.join(','),
    };
  }

  // Normaliza estado a forma canónica usada en UI
  private normalizeStatus(value: any): string | undefined {
    if (value === null || value === undefined) return undefined;
    const s = String(value).trim().toLowerCase();
    if (s === 'vivo' || s === 'activo' || s === 'alive') return 'Activo';
    if (s === 'muerto' || s === 'dead' || s === 'fallecido') return 'Muerto';
    if (s === 'vendido' || s === 'sold') return 'Vendido';
    if (s === 'inactivo' || s === 'inactive') return 'Inactivo';
    return value as string;
  }

  // Mapea estado del UI a valores aceptados por backend
  private mapStatusToBackend(value: any): 'Vivo' | 'Muerto' | 'Vendido' | undefined {
    if (value === null || value === undefined) return undefined;
    const s = String(value).trim().toLowerCase();
    if (s === 'vivo' || s === 'activo' || s === 'alive') return 'Vivo';
    if (s === 'muerto' || s === 'dead' || s === 'fallecido') return 'Muerto';
    if (s === 'vendido' || s === 'sold') return 'Vendido';
    // "inactivo" no es aceptado por backend; omitir para que use default si existe
    return undefined;
  }

  // Construye payload compatible con backend (sex, breeds_id, etc.)
  private buildApiPayload(data: Partial<AnimalInput> & { [k: string]: any }): Record<string, any> {

    const birthDate = this.parseDate(data.birth_date ?? (data as any).birthDate);
    const sex = this.normalizeSex(data.gender ?? (data as any).sex ?? (data as any).sexo);
    const breedsId = data.breed_id ?? (data as any).breeds_id ?? (data as any).raza_id ?? (data as any).breedId;
    const status = this.mapStatusToBackend(data.status ?? (data as any).estado);



    // Validar campos requeridos por el backend
    if (!sex) {
      throw new Error('El campo "gender/sex" es requerido y no puede estar vacío');
    }
    if (!breedsId || breedsId <= 0) {
      throw new Error('El campo "breed_id/breeds_id" es requerido y debe ser mayor a 0');
    }
    if (data.weight === undefined || data.weight === null) {
      throw new Error('El campo "weight" es requerido');
    }

    const payload: Record<string, any> = {
      record: data.record ?? (data as any).code ?? (data as any).registro,
      birth_date: birthDate,
      weight: data.weight,
      breeds_id: breedsId,
      sex,
      status,
      idFather: data.father_id ?? data.idFather,
      idMother: data.mother_id ?? data.idMother,
      notes: data.notes ?? (data as any).observations ?? (data as any).observaciones,
    };



    // Eliminar claves con undefined/null/0 inválidos (pero mantener weight=0 como válido)
    Object.keys(payload).forEach((k) => {
      const v = (payload as any)[k];
      // Eliminar undefined, null, strings vacíos
      if (v === undefined || v === null || (typeof v === 'string' && !v.trim())) {
        delete (payload as any)[k];
      }
      // Eliminar breeds_id si es 0 o negativo (valor inválido)
      else if (k === 'breeds_id' && (typeof v === 'number') && v <= 0) {

        delete (payload as any)[k];
      }
      // Eliminar idFather/idMother si son 0 (significa "sin padre/madre")
      else if ((k === 'idFather' || k === 'idMother') && v === 0) {
        delete (payload as any)[k];
      }
    });


    return payload;
  }

  private parseDate(value: any): string | undefined {
    if (!value) return undefined;
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    const v = (value as any)?.$d;
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    return undefined;
  }

  private computeAgeDays(birth_date?: string): number | undefined {
    if (!birth_date) return undefined;
    const bd = new Date(birth_date);
    if (isNaN(bd.getTime())) return undefined;
    const now = new Date();
    const diffMs = now.getTime() - bd.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  private normalizeAnimal(item: any): AnimalResponse & { [k: string]: any } {
    const birth_date = this.parseDate(item?.birth_date ?? item?.birthDate);
    const age_in_days = item?.age_in_days ?? this.computeAgeDays(birth_date);
    const age_in_months = item?.age_in_months ?? (typeof age_in_days === 'number' ? Math.floor(age_in_days / 30) : undefined);
    const gender = this.normalizeSex(item?.gender ?? item?.sex ?? item?.sexo ?? item?.genero);
    
    // Asegurar que breeds_id se mapee correctamente a breed_id para compatibilidad con la UI
    const breedsId = item?.breeds_id;
    const breedId = item?.breed_id ?? item?.breedId ?? item?.raza_id;

    return {
      // Mantener otros campos originales por compatibilidad (pero SIN sobreescribir normalizaciones)
      ...item,

      // IDs y códigos
      id: item?.id ?? item?.idAnimal ?? item?.animal_id,
      record: item?.record ?? item?.code ?? item?.registro ?? '',
      name: item?.name ?? item?.nombre,
      // Fechas y métricas
      birth_date,
      weight: item?.weight ?? item?.peso,
      created_at: item?.created_at ?? item?.createdAt,
      // Relaciones
      breed_id: breedsId ?? breedId,
      breeds_id: breedsId ?? breedId, // Mantener el campo original también
      gender,
      sex: gender, // Asegurar que el campo sex también esté disponible para compatibilidad
      status: this.normalizeStatus(item?.status ?? item?.estado),
      // IMPORTANTE: Mantener idFather/idMother como campos principales (formato del backend)
      idFather: item?.idFather ?? item?.father_id ?? item?.padre_id,
      idMother: item?.idMother ?? item?.mother_id ?? item?.madre_id,
      // Campos alternativos para compatibilidad
      father_id: item?.idFather ?? item?.father_id ?? item?.padre_id,
      mother_id: item?.idMother ?? item?.mother_id ?? item?.madre_id,
      notes: item?.notes ?? item?.observations ?? item?.observaciones,
      // Extras que la UI puede mostrar
      age_in_days,
      age_in_months,
      is_adult: item?.is_adult ?? (typeof age_in_months === 'number' ? age_in_months >= 12 : undefined),
    } as any;
  }

  async getAnimals(params?: Record<string, any>): Promise<AnimalResponse[]> {
    const list = await this.getAll(params);
    return (Array.isArray(list) ? list.map((it: any) => this.normalizeAnimal(it)) : list) as any;
  }

  async getAnimalsPaginated(params?: Record<string, any>): Promise<PaginatedResponse<AnimalResponse>> {
    // Enriquecer parámetros con ordenamiento por defecto si no se especifica
    const enrichedParams = this.enrichParamsForDateSearch(params || {});

    // Si no hay ordenamiento explícito, ordenar por fecha de creación descendente (más recientes primero)
    // Esto asegura que los registros recién creados aparezcan al inicio de la lista en página 1
    if (!enrichedParams.sort && !enrichedParams.order && !enrichedParams.orderBy) {
      enrichedParams.sort = 'created_at';
      enrichedParams.order = 'desc';
    }

    const pag = await this.getPaginated(enrichedParams);
    return { ...pag, data: (pag.data || []).map((it: any) => this.normalizeAnimal(it)) } as PaginatedResponse<AnimalResponse>;
  }

  // Sobrescribe getPaginated para inyectar fields cuando el término de búsqueda es un año/fecha
  async getPaginated(params?: Record<string, any>): Promise<PaginatedResponse<AnimalResponse>> {
    const enriched = this.enrichParamsForDateSearch(params || {});
    const pag = await super.getPaginated(enriched);
    return pag as PaginatedResponse<AnimalResponse>;
  }

  async getAnimalById(id: number): Promise<AnimalResponse> {
    const item = await this.getById(id);
    return this.normalizeAnimal(item);
  }

  // IMPORTANTE: Sobrescribir create/update/patch para usar buildApiPayload
  // Esto asegura que useResource y otros hooks usen la transformación correcta
  async create(data: any): Promise<any> {
    const payload = this.buildApiPayload(data);
    return super.create(payload);
  }

  async update(id: number | string, data: any): Promise<any> {
    const payload = this.buildApiPayload(data);
    return super.update(id, payload);
  }

  async patch(id: number | string, data: any): Promise<any> {
    const payload = this.buildApiPayload(data);
    return super.patch(id, payload);
  }

  // Métodos legacy mantenidos por compatibilidad
  async createAnimal(animalData: AnimalInput): Promise<AnimalResponse> {
    return this.create(animalData as any);
  }

  async updateAnimal(id: number, animalData: Partial<AnimalInput>): Promise<AnimalResponse> {
    return this.update(id, animalData as any);
  }

  async patchAnimal(id: number, animalData: Partial<AnimalInput>): Promise<AnimalResponse> {
    return this.patch(id, animalData as any);
  }

  async deleteAnimal(id: number): Promise<boolean> {
    console.log(`[AnimalsService.deleteAnimal] Iniciando eliminación para animal ID: ${id}`);
    
    try {
      // Verificar dependencias usando el servicio optimizado
      const dependencyCheck = await checkAnimalDependencies(id);
      
      if (dependencyCheck.hasDependencies) {
        console.log(`[AnimalsService.deleteAnimal] ❌ Eliminación bloqueada por dependencias`, {
          animalId: id,
          dependencies: dependencyCheck.dependencies
        });
        
        // Lanzar error con mensaje detallado para que la UI lo muestre
        const error = new Error(dependencyCheck.message || 'No se puede eliminar el animal por dependencias');
        (error as any).detailedMessage = dependencyCheck.detailedMessage;
        (error as any).dependencies = dependencyCheck.dependencies;
        (error as any).isDependencyError = true;
        throw error;
      }
      
      console.log(`[AnimalsService.deleteAnimal] ✅ Sin dependencias, procediendo con eliminación`);
      
      // Proceder con la eliminación evitando recursión: usar método del BaseService
      const success = await super.delete(id);
      
      if (success) {
        console.log(`[AnimalsService.deleteAnimal] ✅ Animal eliminado exitosamente`, { animalId: id });
        // Limpiar caché de dependencias para este animal
        clearAnimalDependencyCache(id);
      }
      
      return success;
    } catch (error: any) {
      console.error(`[AnimalsService.deleteAnimal] ❌ Error en eliminación`, {
        animalId: id,
        error: error.message,
        isDependencyError: error.isDependencyError
      });
      
      // Re-lanzar el error para que la UI lo maneje
      throw error;
    }
  }

  // Sobrescribir el método delete base para asegurar consistencia
  async delete(id: number | string): Promise<boolean> {
    // Para animales, siempre usar deleteAnimal que incluye verificación de dependencias
    if (typeof id === 'number') {
      return this.deleteAnimal(id);
    }
    
    // Para otros casos, delegar al método base
    return super.delete(id);
  }

  async createBulk(data: AnimalInput[]): Promise<BulkResponse<AnimalResponse>> {
    return this.customRequest('bulk', 'POST', data);
  }

  async searchAnimals(query: string): Promise<AnimalResponse[]> {
    // /animals/search no está disponible en backend; usar query param estándar "search" -> BaseService lo mapea a "q"
    const list = await this.getAll(this.enrichParamsForDateSearch({ search: query }));
    return (Array.isArray(list) ? list.map((it: any) => this.normalizeAnimal(it)) : list) as any;
  }

  async getAnimalStats(): Promise<AnimalStatistics> {
    // /animals/stats no existe; delegar a endpoint analítico consolidado
    return analyticsService.getAnimalStatistics();
  }
  
  async getAnimalStatusStats(): Promise<AnimalStatusStats> {
    return this.customRequest<AnimalStatusStats>('status', 'GET');
  }

  // --- Árboles genealógicos (grafo plano desde backend) ---
  async getAncestorTree(params: TreeQueryParams): Promise<AnimalTreeGraph> {
    const { animal_id, max_depth, fields } = params;
    const graph = await this.customRequest<AnimalTreeGraph>('tree/ancestors', 'GET', undefined, {
      params: { animal_id, max_depth, fields }
    });
    return { ...graph, type: 'ancestors' };
  }

  async getDescendantTree(params: TreeQueryParams): Promise<AnimalTreeGraph> {
    const { animal_id, max_depth, fields } = params;
    const graph = await this.customRequest<AnimalTreeGraph>('tree/descendants', 'GET', undefined, {
      params: { animal_id, max_depth, fields }
    });
    return { ...graph, type: 'descendants' };
  }
}

export const animalsService = new AnimalsService();

// Backwards compatibility wrappers (legacy imports expect these names)
export const animalService = animalsService;
export const getAnimals = (params?: any) => animalsService.getAnimals(params as any);
export const getAnimalStatus = () => animalsService.getAnimalStatusStats();

