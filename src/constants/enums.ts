/**
 * Enumeraciones y constantes centralizadas
 *
 * Este archivo contiene todas las enumeraciones y listas de opciones
 * que deben estar sincronizadas con el backend para evitar errores de validación.
 *
 * IMPORTANTE: Cualquier cambio en el backend debe reflejarse aquí.
 */

// =============================================
// VACUNAS
// =============================================

/**
 * Tipos de vacuna validados por el backend
 * Backend: validators/vaccine_validator.py
 */
export const VACCINE_TYPES = [
  { value: 'Atenuada', label: 'Atenuada' },
  { value: 'Inactivada', label: 'Inactivada' },
  { value: 'Toxoide', label: 'Toxoide' },
  { value: 'Subunidad', label: 'Subunidad' },
  { value: 'Conjugada', label: 'Conjugada' },
  { value: 'Recombinante', label: 'Recombinante' },
  { value: 'Adn', label: 'ADN' },
  { value: 'Arn', label: 'ARN' },
] as const;

export const VACCINE_TYPE_VALUES = VACCINE_TYPES.map(t => t.value);

// =============================================
// ESTADOS
// =============================================

/**
 * Estados de campo validados por el backend
 * Backend: validators/field_validator.py
 */
export const FIELD_STATES = [
  { value: 'Disponible', label: 'Disponible' },
  { value: 'Ocupado', label: 'Ocupado' },
  { value: 'Mantenimiento', label: 'Mantenimiento' },
  { value: 'Restringido', label: 'Restringido' },
] as const;

export const FIELD_STATE_VALUES = FIELD_STATES.map(s => s.value);

/**
 * Estados de enfermedad animal validados por el backend
 * Backend: validators/animal_disease_validator.py
 */
export const ANIMAL_DISEASE_STATUSES = [
  { value: 'Activo', label: 'Activo' },
  { value: 'En tratamiento', label: 'En tratamiento' },
  { value: 'Recuperado', label: 'Recuperado' },
  { value: 'Tratado', label: 'Tratado' },
  { value: 'Observación', label: 'Observación' },
  { value: 'Crónico', label: 'Crónico' },
] as const;

export const ANIMAL_DISEASE_STATUS_VALUES = ANIMAL_DISEASE_STATUSES.map(s => s.value);

/**
 * Severidades de enfermedad animal validadas por el backend
 * Backend: validators/animal_disease_validator.py (si existe)
 */
export const ANIMAL_DISEASE_SEVERITIES = [
  { value: 'Leve', label: 'Leve' },
  { value: 'Moderada', label: 'Moderada' },
  { value: 'Severa', label: 'Severa' },
  { value: 'Crítica', label: 'Crítica' },
] as const;

export const ANIMAL_DISEASE_SEVERITY_VALUES = ANIMAL_DISEASE_SEVERITIES.map(s => s.value);

// =============================================
// RUTAS DE ADMINISTRACIÓN
// =============================================

/**
 * Rutas de administración validadas por el backend
 * Backend: validators/medication_validator.py
 */
export const ADMINISTRATION_ROUTES = [
  { value: 'Intramuscular', label: 'Intramuscular (IM)' },
  { value: 'Subcutánea', label: 'Subcutánea (SC)' },
  { value: 'Intravenosa', label: 'Intravenosa (IV)' },
  { value: 'Oral', label: 'Oral (VO)' },
  { value: 'Intranasal', label: 'Intranasal' },
  { value: 'Tópica', label: 'Tópica' },
] as const;

export const ADMINISTRATION_ROUTE_VALUES = ADMINISTRATION_ROUTES.map(r => r.value);

// =============================================
// GÉNEROS
// =============================================

/**
 * Géneros de animales validados por el backend
 * Backend: validators/animal_validator.py
 */
export const ANIMAL_GENDERS = [
  { value: 'Macho', label: 'Macho' },
  { value: 'Hembra', label: 'Hembra' },
  { value: 'Castrado', label: 'Castrado' },
] as const;

export const ANIMAL_GENDER_VALUES = ANIMAL_GENDERS.map(g => g.value);

// =============================================
// ESTADOS DE ANIMAL
// =============================================

/**
 * Estados de animal validados por el backend
 * Backend: validators/animal_validator.py
 */
export const ANIMAL_STATES = [
  { value: 'Sano', label: 'Sano' },
  { value: 'Enfermo', label: 'Enfermo' },
  { value: 'En tratamiento', label: 'En tratamiento' },
  { value: 'En observación', label: 'En observación' },
  { value: 'Cuarentena', label: 'Cuarentena' },
  { value: 'Vendido', label: 'Vendido' },
  { value: 'Fallecido', label: 'Fallecido' },
] as const;

export const ANIMAL_STATE_VALUES = ANIMAL_STATES.map(s => s.value);

// =============================================
// TIPOS DE ARCHIVO
// =============================================

/**
 * Extensiones de archivo permitidas para uploads
 */
export const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'] as const;
export const ALLOWED_DOCUMENT_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx'] as const;
export const ALLOWED_ALL_EXTENSIONS = [...ALLOWED_IMAGE_EXTENSIONS, ...ALLOWED_DOCUMENT_EXTENSIONS] as const;

// =============================================
// HELPER FUNCTIONS
// =============================================

/**
 * Valida si un valor está en una lista de opciones
 */
export function isValidOption<T extends readonly { value: string }[]>(
  value: string | undefined,
  options: T
): boolean {
  if (!value) return false;
  return options.some(opt => opt.value === value);
}

/**
 * Obtiene el label de un valor
 */
export function getLabelForValue<T extends readonly { value: string; label: string }[]>(
  value: string | undefined,
  options: T
): string | undefined {
  if (!value) return undefined;
  return options.find(opt => opt.value === value)?.label;
}

// =============================================
// EXPORTACIÓN DE TIPOS
// =============================================

export type VaccineTypeValue = typeof VACCINE_TYPES[number]['value'];
export type FieldStateValue = typeof FIELD_STATES[number]['value'];
export type AnimalDiseaseStatusValue = typeof ANIMAL_DISEASE_STATUSES[number]['value'];
export type AnimalDiseaseSeverityValue = typeof ANIMAL_DISEASE_SEVERITIES[number]['value'];
export type AdministrationRouteValue = typeof ADMINISTRATION_ROUTES[number]['value'];
export type AnimalGenderValue = typeof ANIMAL_GENDERS[number]['value'];
export type AnimalStateValue = typeof ANIMAL_STATES[number]['value'];
