/**
 * Tipos TypeScript generados basados en la documentación Swagger
 * Estos tipos aseguran la compatibilidad con la API del backend
 */

// =============================================
// TIPOS BASE Y COMUNES
// =============================================

/**
 * Respuesta estándar de la API
 */
export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  status?: number;
  success?: boolean;
}

/**
 * Parámetros de paginación estándar
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

/**
 * Respuesta paginada estándar
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;               // total items (maps from total_items)
  page: number;                // current page
  limit: number;               // page size
  totalPages: number;          // total pages (maps from total_pages)
  hasNextPage?: boolean;       // maps from has_next_page
  hasPreviousPage?: boolean;   // maps from has_previous_page
  rawMeta?: any;               // keep original meta.pagination for advanced UIs
}

// =============================================
// TIPOS DE AUTENTICACIÓN
// =============================================

/**
 * Datos de entrada para login
 */
export interface LoginInput {
  identification: number;
  password: string;
}

/**
 * Respuesta de login exitoso
 */
export interface LoginResponse {
  access_token?: string;
  message?: string;
  user?: UserResponse;
}

/**
 * Datos del usuario autenticado
 */
export interface UserResponse {
  id: number;
  identification: string | number;
  fullname: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string;
  address?: string;
  role: 'Administrador' | 'Instructor' | 'Aprendiz';
  status: boolean | string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

// =============================================
// TIPOS DE USUARIOS
// =============================================

/**
 * Datos de entrada para crear/actualizar usuario
 */
export interface UserInput {
  identification: number | string;
  fullname: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string;
  address?: string;
  role: 'Administrador' | 'Instructor' | 'Aprendiz';
  password: string;
  status?: boolean;
  is_active?: boolean;
}

/**
 * Roles disponibles en el sistema
 */
export type UserRole = 'Administrador' | 'Instructor' | 'Aprendiz';

/**
 * Estados de usuario (alias para compatibilidad con servicios)
 */
export type UserStatus = 'active' | 'inactive' | 'pending' | 'suspended' | string;

export interface UserStatusDetail {
  id: number;
  name: string;
  description?: string;
}

// =============================================
// TIPOS DE ANIMALES
// =============================================

/**
 * Datos de entrada para crear/actualizar animal
 */
export interface AnimalInput {
  record: string;
  name?: string;
  birth_date: string; // YYYY-MM-DD
  weight: number; // Requerido por el backend
  breed_id: number;
  gender: 'Macho' | 'Hembra' | 'Castrado';
  status?: 'Sano' | 'Enfermo' | 'En tratamiento' | 'En observación' | 'Cuarentena' | 'Vendido' | 'Fallecido';
  father_id?: number;
  mother_id?: number;
  notes?: string;
}

/**
 * Respuesta de animal
 */
export interface AnimalResponse {
  id: number;
  record: string;
  name?: string;
  birth_date: string;
  weight?: number;
  breed_id: number;
  gender: 'Macho' | 'Hembra' | 'Castrado';
  status: 'Sano' | 'Enfermo' | 'En tratamiento' | 'En observación' | 'Cuarentena' | 'Vendido' | 'Fallecido';
  father_id?: number;
  mother_id?: number;
  notes?: string;
  breed?: BreedResponse;
  father?: AnimalResponse;
  mother?: AnimalResponse;
  created_at?: string;
  updated_at?: string;
}

/**
 * Estados de animales
 */
export type AnimalStatus = 'Sano' | 'Enfermo' | 'En tratamiento' | 'En observación' | 'Cuarentena' | 'Vendido' | 'Fallecido';

// =============================================
// TIPOS DE ESPECIES Y RAZAS
// =============================================

/**
 * Datos de entrada para especie
 */
export interface SpeciesInput {
  name: string;
  description?: string;
}

/**
 * Respuesta de especie
 */
export interface SpeciesResponse {
  id: number;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Datos de entrada para raza
 */
export interface BreedInput {
  name: string;
  species_id: number;
  description?: string;
  characteristics?: string;
}

/**
 * Respuesta de raza
 */
export interface BreedResponse {
  id: number;
  name: string;
  species_id: number;
  description?: string;
  characteristics?: string;
  species?: SpeciesResponse;
  created_at?: string;
  updated_at?: string;
}

// =============================================
// TIPOS DE RUTAS DE ADMINISTRACIÓN (normalizada)
// =============================================
export interface RouteAdministrationInput {
  name: string;
  description?: string;
  status?: boolean;
}

export interface RouteAdministrationResponse extends RouteAdministrationInput {
  id: number;
  created_at?: string;
  updated_at?: string;
}

// =============================================
// TIPOS DE Potreros/POTREROS
// =============================================

/**
 * Datos de entrada para campo
 */
export interface FieldInput {
  name: string;
  location?: string;
  area: string;
  capacity?: string;
  state: 'Disponible' | 'Ocupado' | 'Mantenimiento' | 'Restringido';
  management?: string;
  measurements?: string;
  food_type_id?: number;
}

/**
 * Respuesta de campo
 */
export interface FieldResponse {
  id: number;
  name: string;
  location?: string;
  area: string;
  capacity?: string;
  state: 'Disponible' | 'Ocupado' | 'Mantenimiento' | 'Restringido';
  management?: string;
  measurements?: string;
  food_type_id?: number;
  food_type?: FoodTypeResponse;
  current_animals?: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Estados de Potreros
 */
export type FieldState = 'Disponible' | 'Ocupado' | 'Mantenimiento' | 'Restringido';

// =============================================
// TIPOS DE ENFERMEDADES
// =============================================

/**
 * Datos de entrada para enfermedad
 */
export interface DiseaseInput {
  disease: string;
  description?: string;
  symptoms?: string;
  treatment?: string;
}

/**
 * Respuesta de enfermedad
 */
export interface DiseaseResponse {
  id: number;
  disease: string;
  description?: string;
  symptoms?: string;
  treatment?: string;
  created_at?: string;
  updated_at?: string;
}

// =============================================
// TIPOS DE MEJORAS GENÉTICAS
// =============================================

/**
 * Datos de entrada para mejora genética
 */
export interface GeneticImprovementInput {
  animal_id: number;
  improvement_type: string;
  description?: string;
  expected_result?: string;
  date: string; // YYYY-MM-DD
}

/**
 * Respuesta de mejora genética
 */
export interface GeneticImprovementResponse {
  id: number;
  genetic_event_techique: string;
  details?: string;
  results?: string;
  date: string;
  animal_id: number;
  animals?: AnimalResponse;
  created_at?: string;
  updated_at?: string;
}

// =============================================
// TIPOS DE ALIMENTOS
// =============================================

/**
 * Datos de entrada para tipo de alimento
 */
export interface FoodTypeInput {
  food_type: string;
  sowing_date?: string;
  harvest_date?: string;
  area?: number;
  handlings?: string;
  gauges?: string;
  description?: string; // alias de handlings
  name?: string; // alias de food_type
}

/**
 * Respuesta de tipo de alimento
 */
export interface FoodTypeResponse {
  id: number;
  food_type: string;
  sowing_date?: string;
  harvest_date?: string;
  area?: number;
  handlings?: string;
  gauges?: string;
  description?: string; // alias de handlings
  name?: string; // alias de food_type
  created_at?: string;
  updated_at?: string;
}

// =============================================
// TIPOS DE RELACIONES
// =============================================

/**
 * Datos de entrada para enfermedad de animal
 * Nota: El backend NO acepta el campo 'severity'
 */
export interface AnimalDiseaseInput {
  animal_id: number;
  disease_id: number;
  instructor_id: number; // Requerido por el backend
  diagnosis_date: string; // YYYY-MM-DD
  status?: string;
  notes?: string;
}

/**
 * Respuesta de enfermedad de animal
 */
export interface AnimalDiseaseResponse {
  id: number;
  animal_id: number;
  disease_id: number;
  instructor_id: number;
  diagnosis_date: string;
  status?: string;
  notes?: string;
  animal_record?: string;
  disease_name?: string;
  instructor_name?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Datos de entrada para animal en campo
 * Nota: El backend NO acepta el campo 'reason'
 */
export interface AnimalFieldInput {
  animal_id: number;
  field_id: number;
  assignment_date: string; // YYYY-MM-DD
  removal_date?: string; // YYYY-MM-DD
  notes?: string;
}

/**
 * Respuesta de animal en campo
 */
export interface AnimalFieldResponse {
  id: number;
  animal_id: number;
  field_id: number;
  assignment_date: string;
  removal_date?: string;
  notes?: string;
  animal_record?: string;
  field_name?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

// =============================================
// TIPOS MÉDICOS
// =============================================

/**
 * Datos de entrada para medicamento
 */
export interface MedicationInput {
  name: string;
  description?: string;
  dosage_form?: string;
  concentration?: string;
  manufacturer?: string;
  withdrawal_period_days?: number;
  storage_conditions?: string;
  contraindications?: string;
}

/**
 * Respuesta de medicamento
 */
export interface MedicationResponse {
  id: number;
  name: string;
  description?: string;
  dosage_form?: string;
  concentration?: string;
  manufacturer?: string;
  withdrawal_period_days?: number;
  storage_conditions?: string;
  contraindications?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Frecuencia de dosificación (alias para compatibilidad con servicios)
 */
export type MedicationFrequency = 'Una vez' | 'Diaria' | 'Semanal' | 'Mensual' | string;

/**
 * Tipos de vacunas
 */
/**
 * Tipos de vacuna validados por el backend
 */
export type VaccineType = 'Atenuada' | 'Inactivada' | 'Toxoide' | 'Subunidad' | 'Conjugada' | 'Recombinante' | 'Adn' | 'Arn';

/**
 * Estados de vacunación
 */
export type VaccineStatus = 'Programada' | 'Aplicada' | 'Vencida' | 'Cancelada' | string;

/**
 * Estados de vacunación (alias)
 */
export type VaccinationStatus = VaccineStatus;

/**
 * Rutas de administración
 */
export type AdministrationRoute = 'Intramuscular' | 'Subcutánea' | 'Oral' | 'Intranasal' | 'Intravenosa' | 'Tópica' | string;

/**
 * Datos de entrada para vacuna
 * Estructura real de BD: vaccines(id, name, dosis, route_administration_id,
 * vaccination_interval, type, national_plan, target_disease_id, created_at, updated_at)
 */
export interface VaccineInput {
  name: string;
  dosis?: string;
  route_administration_id?: number;
  vaccination_interval?: number;
  type?: VaccineType;
  national_plan?: boolean;
  target_disease_id?: number;
}

/**
 * Respuesta de vacuna
 */
export interface VaccineResponse {
  id: number;
  name: string;
  dosis?: string;
  route_administration_id?: number;
  vaccination_interval?: number;
  type?: VaccineType;
  national_plan?: boolean;
  target_disease_id?: number;
  created_at?: string;
  updated_at?: string;
  // Campos poblados por el backend
  route_administration_name?: string;
  target_disease_name?: string;
}

/**
 * Datos de entrada para tratamiento
 */
export interface TreatmentInput {
  animal_id: number;
  diagnosis: string;
  treatment_date: string; // YYYY-MM-DD
  // backward-compatible aliases
  treatment_type?: string; // e.g. 'medication' | 'vaccination' | 'surgery'
  // NOTE: removed duplicate alias property for treatment_date to satisfy TS types
  veterinarian?: string;
  symptoms?: string;
  treatment_plan?: string;
  follow_up_date?: string; // YYYY-MM-DD
  cost?: number;
  notes?: string;
  status?: 'Iniciado' | 'En progreso' | 'Completado' | 'Suspendido';
}

/**
 * Respuesta de tratamiento
 */
export interface TreatmentResponse {
  id: number;
  animal_id: number;
  diagnosis: string;
  treatment_date: string;
  treatment_type?: string;
  // NOTE: removed duplicate alias property for treatment_date to satisfy TS types
  veterinarian?: string;
  symptoms?: string;
  treatment_plan?: string;
  follow_up_date?: string;
  cost?: number;
  notes?: string;
  status?: 'Iniciado' | 'En progreso' | 'Completado' | 'Suspendido';
  animal?: AnimalResponse;
  created_at?: string;
  updated_at?: string;
}

/**
 * Datos de entrada para vacunación
 * Estructura real de BD: vaccinations(id, animal_id, vaccine_id, vaccination_date,
 * apprentice_id, instructor_id, created_at, updated_at)
 */
export interface VaccinationInput {
  animal_id: number;
  vaccine_id: number;
  vaccination_date: string; // YYYY-MM-DD
  apprentice_id?: number;
  instructor_id?: number;
}

/**
 * Respuesta de vacunación
 */
export interface VaccinationResponse {
  id: number;
  animal_id: number;
  vaccine_id: number;
  vaccination_date: string;
  apprentice_id?: number;
  instructor_id?: number;
  created_at?: string;
  updated_at?: string;
  // Campos poblados por el backend
  animal_record?: string;
  vaccine_name?: string;
  apprentice_name?: string;
  instructor_name?: string;
}

// =============================================
// TIPOS DE RELACIONES MÉDICAS
// =============================================

/**
 * Datos de entrada para medicamento de tratamiento
 * Estructura real de BD: treatment_medications(id, treatment_id, medication_id, created_at, updated_at)
 */
export interface TreatmentMedicationInput {
  treatment_id: number;
  medication_id: number;
}

/**
 * Respuesta de medicamento de tratamiento
 */
export interface TreatmentMedicationResponse {
  id: number;
  treatment_id: number;
  medication_id: number;
  created_at?: string;
  updated_at?: string;
  // Campos poblados por el backend
  treatment_diagnosis?: string;
  medication_name?: string;
}

/**
 * Datos de entrada para vacuna de tratamiento
 */
export interface TreatmentVaccineInput {
  treatment_id: number;
  vaccine_id: number;
  dose: string;
  application_site?: string;
  batch_number?: string;
  expiry_date?: string; // YYYY-MM-DD
  // backward-compatible fields
  scheduled_date?: string;
  administered_date?: string;
  vaccination_status?: string;
  vaccine_type?: string;
  notes?: string;
}

/**
 * Respuesta de vacuna de tratamiento
 */
export interface TreatmentVaccineResponse {
  id: number;
  treatment_id: number;
  vaccine_id: number;
  dose: string;
  application_site?: string;
  batch_number?: string;
  expiry_date?: string;
  scheduled_date?: string;
  administered_date?: string;
  vaccination_status?: string;
  vaccine_type?: string;
  notes?: string;
  treatment_diagnosis?: string;
  vaccine_name?: string;
  animal_record?: string;
  created_at?: string;
  updated_at?: string;
}

// =============================================
// TIPOS DE CONTROLES
// =============================================

/**
 * Datos de entrada para control
 */
export interface ControlInput {
  animal_id: number;
  // Preferred new naming
  checkup_date: string; // YYYY-MM-DD
  description?: string;
  health_status?: string;
  // Legacy aliases (still accepted by backend, kept for backward-compat)
  control_date?: string; // legacy alias of checkup_date
  observations?: string; // legacy alias of description
  healt_status?: string; // legacy alias of health_status (backend typo)
  // Deprecated fields (kept optional for compatibility)
  weight?: number;
  height?: number;
  body_condition?: number; // 1-5 scale
  temperature?: number;
  heart_rate?: number;
  respiratory_rate?: number;
  veterinarian?: string;
  next_control_date?: string; // YYYY-MM-DD
}

/**
 * Respuesta de control
 */
export interface ControlResponse {
  id: number;
  animal_id: number;
  // Preferred new naming
  checkup_date?: string;
  description?: string;
  health_status?: string;
  // Legacy aliases from backend (kept for compatibility)
  control_date?: string; // legacy alias of checkup_date
  observations?: string; // legacy alias of description
  healt_status?: string; // legacy alias of health_status (backend typo)
  // Deprecated fields (may exist on some responses)
  weight?: number;
  height?: number;
  body_condition?: number;
  temperature?: number;
  heart_rate?: number;
  respiratory_rate?: number;
  veterinarian?: string;
  next_control_date?: string;
  animal?: AnimalResponse;
  created_at?: string;
  updated_at?: string;
}

// =============================================
// TIPOS DE ANALÍTICAS
// =============================================

/**
 * Datos del dashboard
 */
export interface DashboardData {
  total_animals?: number;
  active_animals?: number;
  total_fields?: number;
  occupied_fields?: number;
  recent_treatments?: number;
  pending_vaccinations?: number;
  health_alerts?: number;
  monthly_costs?: number;
  [key: string]: any;
}

/**
 * Estadísticas de animales
 */
export interface AnimalStatistics {
  total: number;
  by_status: Record<AnimalStatus, number>;
  by_gender: Record<'Macho' | 'Hembra', number>;
  by_breed: Array<{ breed_name: string; count: number }>;
  average_weight: number;
  age_distribution: Array<{ age_range: string; count: number }>;
}

/**
 * Estadísticas de salud
 */
export interface HealthStatistics {
  total_treatments: number;
  active_treatments: number;
  total_vaccinations: number;
  pending_vaccinations: number;
  common_diseases: Array<{ disease_name: string; count: number }>;
  treatment_success_rate: number;
}

/**
 * Estadísticas de producción
 */
export interface ProductionStatistics {
  total_fields: number;
  field_utilization: number;
  animals_per_field: number;
  feed_consumption: number;
  monthly_costs: number;
  productivity_index: number;
}

// =============================================
// TIPOS DE ALERTAS
// =============================================

/**
 * Alerta del sistema
 */
export interface SystemAlert {
  id: number;
  type: 'health' | 'vaccination' | 'treatment' | 'field' | 'system';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  entity_type?: string;
  entity_id?: number;
  created_at: string;
  read_at?: string;
  resolved_at?: string;
}

// =============================================
// TIPOS DE UTILIDAD
// =============================================

/**
 * Opciones de filtrado genérico
 */
export interface FilterOptions {
  search?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  [key: string]: any;
}

/**
 * Opciones de ordenamiento
 */
export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * Metadatos de respuesta
 */
export interface ResponseMetadata {
  timestamp: string;
  version: string;
  request_id?: string;
  execution_time?: number;
}

// =============================================
// EXPORTACIONES DE TIPOS UNIÓN
// =============================================

export type EntityInput = 
  | UserInput
  | AnimalInput
  | SpeciesInput
  | BreedInput
  | FieldInput
  | DiseaseInput
  | GeneticImprovementInput
  | FoodTypeInput
  | AnimalDiseaseInput
  | AnimalFieldInput
  | MedicationInput
  | VaccineInput
  | TreatmentInput
  | VaccinationInput
  | TreatmentMedicationInput
  | TreatmentVaccineInput
  | ControlInput;

export type EntityResponse = 
  | UserResponse
  | AnimalResponse
  | SpeciesResponse
  | BreedResponse
  | FieldResponse
  | DiseaseResponse
  | GeneticImprovementResponse
  | FoodTypeResponse
  | AnimalDiseaseResponse
  | AnimalFieldResponse
  | MedicationResponse
  | VaccineResponse
  | TreatmentResponse
  | VaccinationResponse
  | TreatmentMedicationResponse
  | TreatmentVaccineResponse
  | ControlResponse;