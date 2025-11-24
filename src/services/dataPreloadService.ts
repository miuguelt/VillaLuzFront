import { animalsService } from './animalService';
import { usersService } from './userService';
import { controlService } from './controlService';
import { fieldService } from './fieldService';
import { vaccinationsService } from './vaccinationsService';
import { vaccinesService } from './vaccinesService';
import { medicationsService } from './medicationsService';
import { diseaseService } from './diseaseService';
import { speciesService } from './speciesService';
import { breedsService } from './breedsService';
import { foodTypesService } from './foodTypesService';
import { treatmentsService } from './treatmentsService';
import { animalFieldsService } from './animalFieldsService';
import { animalDiseasesService } from './animalDiseasesService';
import { geneticImprovementsService } from './geneticImprovementsService';
import { treatmentMedicationService } from './treatmentMedicationService';
import { treatmentVaccinesService } from './treatmentVaccinesService';

/**
 * Interfaz para los datos críticos del dashboard
 */
export interface DashboardCriticalData {
  counts: {
    usersRegistered: number;
    usersActive: number;
    animalsRegistered: number;
    activeTreatments: number;
    pendingTasks: number;
    systemAlerts: number;
    treatmentsTotal: number;
    vaccinationsApplied: number;
    controlsPerformed: number;
    fieldsRegistered: number;
    vaccinesCount: number;
    medicationsCount: number;
    diseasesCount: number;
    speciesCount: number;
    breedsCount: number;
    animalFieldsCount: number;
    animalDiseasesCount: number;
    geneticImprovementsCount: number;
    treatmentMedicationsCount: number;
    treatmentVaccinesCount: number;
    foodTypesCount: number;
  };
  // Datos adicionales de useModelStats
  modelStats: {
    production: any;
    health: any;
    dashboard: any;
  };
  timestamp: number;
}

/**
 * Interfaz para los datos del módulo Animal
 */
export interface AnimalModuleData {
  animals: any[];
  species: any[];
  breeds: any[];
  fields: any[];
  diseases: any[];
  medications: any[];
  vaccines: any[];
  foodTypes: any[];
  timestamp: number;
}

/**
 * Interfaz para los datos del módulo Usuario
 */
export interface UserModuleData {
  users: any[];
  userRoles: any;
  timestamp: number;
}

/**
 * Tipos de errores de precarga
 */
export enum PreloadErrorType {
  DASHBOARD_CRITICAL = 'DASHBOARD_CRITICAL',
  ANIMAL_MODULE = 'ANIMAL_MODULE',
  USER_MODULE = 'USER_MODULE',
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR'
}

/**
 * Interfaz para errores de precarga
 */
export interface PreloadError {
  type: PreloadErrorType;
  message: string;
  critical: boolean;
  timestamp: number;
  context?: any;
}

/**
 * Interfaz para el estado de precarga
 */
export interface PreloadState {
  isLoading: boolean;
  dashboardLoaded: boolean;
  animalModuleLoaded: boolean;
  userModuleLoaded: boolean;
  errors: PreloadError[];
  lastUpdate: number | null;
}

/**
 * Servicio centralizado para la precarga de datos con jerarquía clara
 * Prioridad 1: Datos críticos del dashboard (bloqueante)
 * Prioridad 2: Datos del módulo Animal (no bloqueante)
 * Prioridad 3: Datos del módulo Usuario (no bloqueante)
 */
class DataPreloadService {
  private static instance: DataPreloadService;
  private state: PreloadState = {
    isLoading: false,
    dashboardLoaded: false,
    animalModuleLoaded: false,
    userModuleLoaded: false,
    errors: [],
    lastUpdate: null
  };
  private stateChangeCallbacks: ((state: PreloadState) => void)[] = [];
  private cacheExpiryTime = 5 * 60 * 1000; // 5 minutos
  private offlineGraceMs = 24 * 60 * 60 * 1000; // Permitir usar caché hasta 24h cuando no hay red

  private constructor() {}

  /**
   * Obtiene la instancia singleton del servicio
   */
  static getInstance(): DataPreloadService {
    if (!DataPreloadService.instance) {
      DataPreloadService.instance = new DataPreloadService();
    }
    return DataPreloadService.instance;
  }

  /**
   * Registra un callback para cambios en el estado de precarga
   */
  onStateChange(callback: (state: PreloadState) => void): () => void {
    this.stateChangeCallbacks.push(callback);
    return () => {
      this.stateChangeCallbacks = this.stateChangeCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Notifica a todos los callbacks sobre un cambio de estado
   */
  private notifyStateChange(): void {
    this.stateChangeCallbacks.forEach(callback => callback({ ...this.state }));
  }

  /**
   * Añade un error al registro de errores
   */
  private addError(type: PreloadErrorType, message: string, critical: boolean = false, context?: any): void {
    const error: PreloadError = {
      type,
      message,
      critical,
      timestamp: Date.now(),
      context
    };
    this.state.errors.push(error);
    this.notifyStateChange();
    console.error(`[DataPreloadService] ${type}: ${message}`, context);
  }

  /**
   * Limpia errores antiguos (más de 10 minutos)
   */
  private cleanOldErrors(): void {
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    this.state.errors = this.state.errors.filter(error => error.timestamp > tenMinutesAgo);
  }

  /**
   * Verifica si los datos en caché aún son válidos
   */
  private isCacheValid(timestamp: number, allowOfflineStale: boolean = true): boolean {
    const age = Date.now() - timestamp;
    if (age < this.cacheExpiryTime) return true;

    const offline = allowOfflineStale && typeof navigator !== 'undefined' && navigator.onLine === false;
    if (offline && age < this.cacheExpiryTime + this.offlineGraceMs) {
      return true;
    }

    return false;
  }

  /**
   * Obtiene los datos críticos del dashboard con manejo de errores granular
   */
  private async fetchDashboardCriticalData(): Promise<DashboardCriticalData> {
    try {
      console.log('[DataPreloadService] Iniciando carga de datos críticos del dashboard...');
      
      // Función helper para extraer totales de respuestas variables
      const pickNumber = (obj: any, keys: string[], fallback = 0): number => {
        for (const k of keys) {
          const v = (obj ?? {})[k];
          if (typeof v === 'number' && !isNaN(v)) return v;
        }
        // Buscar en summary si existe
        const summary = (obj ?? {}).summary;
        if (summary && typeof summary === 'object') {
          for (const k of keys) {
            const v = (summary as any)[k];
            if (typeof v === 'number' && !isNaN(v)) return v;
          }
        }
        return fallback;
      };

      const getTotalFromStats = (stats: any, candidates: string[]): number => {
        return pickNumber(stats, ['total', ...candidates]);
      };

      // Importar useModelStats para obtener datos adicionales
      const { useModelStats } = await import('@/hooks/useModelStats');

      // Ejecutar todas las llamadas en paralelo para optimizar tiempo
      const [
        treatmentsStats,
        vaccinationsStats,
        treatmentVaccinesStats,
        usersStats,
        animalsStats,
        controlsStats,
        fieldsStats,
        vaccinesStats,
        medicationsStats,
        diseasesStats,
        speciesStats,
        breedsStats,
        animalFieldsStats,
        animalDiseasesStats,
        geneticImprovementsStats,
        treatmentMedicationsStats,
        treatmentVaccinesStatsCatalog,
        foodTypesStats,
        // Datos adicionales de useModelStats
        productionStats,
        healthStats,
        dashboardStats,
      ] = await Promise.all([
        treatmentsService.getTreatmentsStats().catch(() => ({ } as any)),
        vaccinationsService.getVaccinationsStats().catch(() => ({ } as any)),
        treatmentVaccinesService.getTreatmentVaccinesStats().catch(() => ({ } as any)),
        usersService.getUserStats().catch(() => ({ } as any)),
        animalsService.getAnimalStats().catch(() => ({ } as any)),
        controlService.getControlsStats().catch(() => ({ } as any)),
        fieldService.getFieldsStats().catch(() => ({ } as any)),
        vaccinesService.getVaccinesStats().catch(() => ({ } as any)),
        medicationsService.getMedicationsStats().catch(() => ({ } as any)),
        diseaseService.getDiseasesStats().catch(() => ({ } as any)),
        speciesService.getSpeciesStats().catch(() => ({ } as any)),
        breedsService.getBreedsStats().catch(() => ({ } as any)),
        animalFieldsService.getAnimalFieldsStats().catch(() => ({ } as any)),
        animalDiseasesService.getAnimalDiseasesStats().catch(() => ({ } as any)),
        geneticImprovementsService.getGeneticImprovementsStats().catch(() => ({ } as any)),
        treatmentMedicationService.getTreatmentMedicationsStats().catch(() => ({ } as any)),
        treatmentVaccinesService.getTreatmentVaccinesStats().catch(() => ({ } as any)),
        foodTypesService.getFoodTypesStats().catch(() => ({ } as any)),
        // Obtener datos de useModelStats
        new Promise((resolve) => {
          Promise.resolve().then(() => {
            try {
              const { data } = useModelStats('production');
              resolve(data || {});
            } catch (error) {
              if (process.env.NODE_ENV !== 'production') {
                console.warn('[dataPreload] stats production', error);
              }
              resolve({});
            }
          });
        }),
        new Promise((resolve) => {
          Promise.resolve().then(() => {
            try {
              const { data } = useModelStats('health');
              resolve(data || {});
            } catch (error) {
              if (process.env.NODE_ENV !== 'production') {
                console.warn('[dataPreload] stats health', error);
              }
              resolve({});
            }
          });
        }),
        new Promise((resolve) => {
          Promise.resolve().then(() => {
            try {
              const { data } = useModelStats('dashboard');
              resolve(data || {});
            } catch (error) {
              if (process.env.NODE_ENV !== 'production') {
                console.warn('[dataPreload] stats dashboard', error);
              }
              resolve({});
            }
          });
        }),
      ]);

      const counts = {
        usersRegistered: pickNumber(usersStats, ['total_users', 'total']),
        usersActive: pickNumber(usersStats, ['active_users', 'active']),
        animalsRegistered: getTotalFromStats(animalsStats, ['total_animals']),
        activeTreatments: Number(pickNumber(treatmentsStats, ['active_treatments', 'active']) ?? 0),
        pendingTasks: Number(
          pickNumber(treatmentVaccinesStats, ['pending_vaccinations', 'pending']) ??
          pickNumber(vaccinationsStats, ['pending_vaccinations', 'pending']) ??
          0
        ),
        systemAlerts: 0, // Se delega al AdminDashboard (fetchAlerts)
        treatmentsTotal: getTotalFromStats(treatmentsStats, ['total_treatments']),
        vaccinationsApplied: getTotalFromStats(vaccinationsStats, ['total_vaccinations']),
        controlsPerformed: getTotalFromStats(controlsStats, ['total_controls']),
        fieldsRegistered: getTotalFromStats(fieldsStats, ['total_fields']),
        vaccinesCount: getTotalFromStats(vaccinesStats, ['total_vaccines']),
        medicationsCount: getTotalFromStats(medicationsStats, ['total_medications']),
        diseasesCount: getTotalFromStats(diseasesStats, ['total_diseases']),
        speciesCount: getTotalFromStats(speciesStats, ['total_species']),
        breedsCount: getTotalFromStats(breedsStats, ['total_breeds']),
        animalFieldsCount: getTotalFromStats(animalFieldsStats, ['total_animal_fields', 'total_fields', 'total']),
        animalDiseasesCount: getTotalFromStats(animalDiseasesStats, ['total_animal_diseases', 'total_diseases', 'total']),
        geneticImprovementsCount: getTotalFromStats(geneticImprovementsStats, ['total_genetic_improvements', 'total_improvements', 'total']),
        treatmentMedicationsCount: getTotalFromStats(treatmentMedicationsStats, ['total_treatment_medications', 'total_medications', 'total']),
        treatmentVaccinesCount: getTotalFromStats(treatmentVaccinesStatsCatalog, ['total_treatment_vaccines', 'total_vaccines', 'total']),
        foodTypesCount: getTotalFromStats(foodTypesStats, ['total_food_types', 'total_types', 'total']),
      };

      const data: DashboardCriticalData = {
        counts,
        modelStats: {
          production: productionStats,
          health: healthStats,
          dashboard: dashboardStats
        },
        timestamp: Date.now()
      };

      console.log('[DataPreloadService] Datos críticos del dashboard cargados exitosamente');
      return data;
    } catch (error: any) {
      const errorMessage = error?.message || 'Error desconocido al cargar datos del dashboard';
      this.addError(PreloadErrorType.DASHBOARD_CRITICAL, errorMessage, true, error);
      throw new Error(`Error crítico al cargar datos del dashboard: ${errorMessage}`);
    }
  }

  /**
   * Obtiene los datos del módulo Animal (no bloqueante)
   */
  private async fetchAnimalModuleData(): Promise<AnimalModuleData> {
    try {
      console.log('[DataPreloadService] Iniciando carga de datos del módulo Animal...');
      
      // Ejecutar todas las llamadas en paralelo
      const [
        animalsResponse,
        speciesResponse,
        breedsResponse,
        fieldsResponse,
        diseasesResponse,
        medicationsResponse,
        vaccinesResponse,
        foodTypesResponse
      ] = await Promise.all([
        animalsService.getAnimals({ limit: 100 }).catch(() => ({ data: [] })),
        speciesService.getSpecies().catch(() => ({ data: [] })),
        breedsService.getBreeds().catch(() => ({ data: [] })),
        fieldService.getFields().catch(() => ({ data: [] })),
        diseaseService.getDiseases().catch(() => ({ data: [] })),
        medicationsService.getMedications().catch(() => ({ data: [] })),
        vaccinesService.getVaccines().catch(() => ({ data: [] })),
        foodTypesService.getFoodTypes().catch(() => ({ data: [] }))
      ]);

      // Extraer datos de las respuestas (pueden ser paginadas)
      const animals = Array.isArray(animalsResponse) ? animalsResponse : animalsResponse.data || [];
      const species = Array.isArray(speciesResponse) ? speciesResponse : speciesResponse.data || [];
      const breeds = Array.isArray(breedsResponse) ? breedsResponse : breedsResponse.data || [];
      const fields = Array.isArray(fieldsResponse) ? fieldsResponse : fieldsResponse.data || [];
      const diseases = Array.isArray(diseasesResponse) ? diseasesResponse : diseasesResponse.data || [];
      const medications = Array.isArray(medicationsResponse) ? medicationsResponse : medicationsResponse.data || [];
      const vaccines = Array.isArray(vaccinesResponse) ? vaccinesResponse : vaccinesResponse.data || [];
      const foodTypes = Array.isArray(foodTypesResponse) ? foodTypesResponse : foodTypesResponse.data || [];

      const data: AnimalModuleData = {
        animals,
        species,
        breeds,
        fields,
        diseases,
        medications,
        vaccines,
        foodTypes,
        timestamp: Date.now()
      };

      console.log('[DataPreloadService] Datos del módulo Animal cargados exitosamente');
      return data;
    } catch (error: any) {
      const errorMessage = error?.message || 'Error desconocido al cargar datos del módulo Animal';
      this.addError(PreloadErrorType.ANIMAL_MODULE, errorMessage, false, error);
      // No lanzamos el error para que no bloquee la aplicación
      return {
        animals: [],
        species: [],
        breeds: [],
        fields: [],
        diseases: [],
        medications: [],
        vaccines: [],
        foodTypes: [],
        timestamp: Date.now()
      };
    }
  }

  /**
   * Obtiene los datos del módulo Usuario (no bloqueante)
   */
  private async fetchUserModuleData(): Promise<UserModuleData> {
    try {
      console.log('[DataPreloadService] Iniciando carga de datos del módulo Usuario...');
      
      // Ejecutar todas las llamadas en paralelo
      const [usersResponse, userRoles] = await Promise.all([
        usersService.getUsers({ limit: 100 }).catch(() => ({ data: [] })),
        usersService.getUserRoles().catch(() => ({ roles: {}, total_users: 0 }))
      ]);

      // Extraer datos de la respuesta (puede ser paginada)
      const users = Array.isArray(usersResponse) ? usersResponse : usersResponse.data || [];

      const data: UserModuleData = {
        users,
        userRoles,
        timestamp: Date.now()
      };

      console.log('[DataPreloadService] Datos del módulo Usuario cargados exitosamente');
      return data;
    } catch (error: any) {
      const errorMessage = error?.message || 'Error desconocido al cargar datos del módulo Usuario';
      this.addError(PreloadErrorType.USER_MODULE, errorMessage, false, error);
      // No lanzamos el error para que no bloquee la aplicación
      return {
        users: [],
        userRoles: { roles: {}, total_users: 0 },
        timestamp: Date.now()
      };
    }
  }

  /**
   * Inicia el proceso de precarga con jerarquía clara
   */
  async preloadData(): Promise<void> {
    if (this.state.isLoading) {
      console.log('[DataPreloadService] La precarga ya está en curso, omitiendo...');
      return;
    }

    this.cleanOldErrors();
    this.state.isLoading = true;
    this.notifyStateChange();

    try {
      // PRIORIDAD 1: Datos críticos del dashboard (bloqueante)
      console.log('[DataPreloadService] Etapa 1: Cargando datos críticos del dashboard...');
      const dashboardData = await this.fetchDashboardCriticalData();
      
      // Guardar en caché local
      localStorage.setItem('dashboard_critical_data', JSON.stringify(dashboardData));
      this.state.dashboardLoaded = true;
      this.notifyStateChange();

      // PRIORIDAD 2 y 3: Datos de módulos en paralelo (no bloqueantes)
      console.log('[DataPreloadService] Etapa 2: Iniciando carga no bloqueante de módulos...');
      
      // Iniciar ambas precargas en paralelo sin esperar a que completen
      const animalModulePromise = this.fetchAnimalModuleData()
        .then(data => {
          localStorage.setItem('animal_module_data', JSON.stringify(data));
          this.state.animalModuleLoaded = true;
          this.notifyStateChange();
        })
        .catch(error => {
          console.error('[DataPreloadService] Error en precarga del módulo Animal:', error);
        });

      const userModulePromise = this.fetchUserModuleData()
        .then(data => {
          localStorage.setItem('user_module_data', JSON.stringify(data));
          this.state.userModuleLoaded = true;
          this.notifyStateChange();
        })
        .catch(error => {
          console.error('[DataPreloadService] Error en precarga del módulo Usuario:', error);
        });

      // Esperar a que ambas precargas terminen (sin bloquear la UI)
      await Promise.allSettled([animalModulePromise, userModulePromise]);
      
      this.state.lastUpdate = Date.now();
      console.log('[DataPreloadService] Proceso de precarga completado');
    } catch (error: any) {
      console.error('[DataPreloadService] Error crítico en el proceso de precarga:', error);
      this.addError(PreloadErrorType.DASHBOARD_CRITICAL, error?.message || 'Error crítico en precarga', true, error);
    } finally {
      this.state.isLoading = false;
      this.notifyStateChange();
    }
  }

  /**
   * Obtiene los datos críticos del dashboard desde caché o null si no están disponibles
   */
  getDashboardData(): DashboardCriticalData | null {
    try {
      const cached = localStorage.getItem('dashboard_critical_data');
      if (!cached) return null;
      
      const data = JSON.parse(cached) as DashboardCriticalData;
      if (!this.isCacheValid(data.timestamp)) {
        localStorage.removeItem('dashboard_critical_data');
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('[DataPreloadService] Error al obtener datos del dashboard desde caché:', error);
      return null;
    }
  }

  /**
   * Obtiene los datos del módulo Animal desde caché o null si no están disponibles
   */
  getAnimalModuleData(): AnimalModuleData | null {
    try {
      const cached = localStorage.getItem('animal_module_data');
      if (!cached) return null;
      
      const data = JSON.parse(cached) as AnimalModuleData;
      if (!this.isCacheValid(data.timestamp)) {
        localStorage.removeItem('animal_module_data');
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('[DataPreloadService] Error al obtener datos del módulo Animal desde caché:', error);
      return null;
    }
  }

  /**
   * Obtiene los datos del módulo Usuario desde caché o null si no están disponibles
   */
  getUserModuleData(): UserModuleData | null {
    try {
      const cached = localStorage.getItem('user_module_data');
      if (!cached) return null;
      
      const data = JSON.parse(cached) as UserModuleData;
      if (!this.isCacheValid(data.timestamp)) {
        localStorage.removeItem('user_module_data');
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('[DataPreloadService] Error al obtener datos del módulo Usuario desde caché:', error);
      return null;
    }
  }

  /**
   * Obtiene el estado actual de precarga
   */
  getState(): PreloadState {
    return { ...this.state };
  }

  /**
   * Invalida todos los datos en caché
   */
  invalidateCache(): void {
    localStorage.removeItem('dashboard_critical_data');
    localStorage.removeItem('animal_module_data');
    localStorage.removeItem('user_module_data');
    
    this.state.dashboardLoaded = false;
    this.state.animalModuleLoaded = false;
    this.state.userModuleLoaded = false;
    this.state.lastUpdate = null;
    
    console.log('[DataPreloadService] Caché invalidado');
    this.notifyStateChange();
  }

  /**
   * Invalida datos específicos de un módulo
   */
  invalidateModuleData(module: 'dashboard' | 'animal' | 'user'): void {
    switch (module) {
      case 'dashboard':
        localStorage.removeItem('dashboard_critical_data');
        this.state.dashboardLoaded = false;
        break;
      case 'animal':
        localStorage.removeItem('animal_module_data');
        this.state.animalModuleLoaded = false;
        break;
      case 'user':
        localStorage.removeItem('user_module_data');
        this.state.userModuleLoaded = false;
        break;
    }
    
    console.log(`[DataPreloadService] Caché del módulo ${module} invalidado`);
    this.notifyStateChange();
  }
}

export const dataPreloadService = DataPreloadService.getInstance();
export default dataPreloadService;
