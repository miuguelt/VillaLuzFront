// Tipos extendidos para la vista admin de mejoras genéticas
// Extiende los tipos base con Potreros específicos para gestión administrativa

/**
 * Tipos de genes disponibles para mejoras genéticas
 */
export type GeneType =
  | 'Resistencia a enfermedades'
  | 'Productividad láctea'
  | 'Crecimiento muscular'
  | 'Fertilidad'
  | 'Calidad de carne'
  | 'Adaptación climática'
  | 'Otros';

/**
 * Niveles de mejora genética
 */
export type EnhancementLevel = 'Bajo' | 'Medio' | 'Alto' | 'Experimental';

/**
 * Estados de mejora genética
 */
export type GeneticImprovementStatus = 'Activo' | 'Inactivo' | 'En desarrollo' | 'Completado';

/**
 * Datos de entrada simplificados para mejoras genéticas admin
 */
export interface AdminGeneticImprovementInput {
  animal_id: number;
  date: string;
  details: string;
  results: string;
  genetic_event_technique: string;
}

/**
 * Respuesta simplificada para mejoras genéticas admin
 */
export interface AdminGeneticImprovementResponse {
  id: number;
  animal_id: number;
  date: string;
  details: string;
  results: string;
  genetic_event_technique: string;
  created_at: string;
  updated_at: string;
}

/**
 * Filtros para búsqueda de mejoras genéticas
 */
export interface GeneticImprovementFilters {
  gene_type?: GeneType;
  enhancement_level?: EnhancementLevel;
  status?: GeneticImprovementStatus;
  availability?: boolean;
  success_rate_min?: number;
  success_rate_max?: number;
  date_from?: string;
  date_to?: string;
  search?: string;
}

/**
 * Estadísticas de mejoras genéticas
 */
export interface GeneticImprovementStats {
  total_improvements: number;
  active_improvements: number;
  by_gene_type: Record<GeneType, number>;
  by_enhancement_level: Record<EnhancementLevel, number>;
  average_success_rate: number;
  total_implementations: number;
  average_cost_per_unit: number;
}

/**
 * Configuración de columnas para tabla admin
 */
export interface GeneticImprovementTableColumn {
  key: keyof AdminGeneticImprovementResponse;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
  render?: (value: any, item: AdminGeneticImprovementResponse) => React.ReactNode;
}

/**
 * Configuración de formulario para mejoras genéticas
 */
export interface GeneticImprovementFormConfig {
  sections: {
    basic: {
      title: string;
      fields: Array<{
        name: keyof AdminGeneticImprovementInput;
        label: string;
        type: 'text' | 'textarea' | 'select' | 'number' | 'date' | 'checkbox' | 'multiselect';
        required?: boolean;
        options?: Array<{ value: string; label: string }>;
        placeholder?: string;
        validation?: {
          min?: number;
          max?: number;
          pattern?: RegExp;
        };
      }>;
    };
    technical: {
      title: string;
      fields: Array<{
        name: keyof AdminGeneticImprovementInput;
        label: string;
        type: 'text' | 'textarea' | 'select' | 'number' | 'date' | 'checkbox' | 'multiselect';
        required?: boolean;
        options?: Array<{ value: string; label: string }>;
        placeholder?: string;
        validation?: {
          min?: number;
          max?: number;
          pattern?: RegExp;
        };
      }>;
    };
    research: {
      title: string;
      fields: Array<{
        name: keyof AdminGeneticImprovementInput;
        label: string;
        type: 'text' | 'textarea' | 'select' | 'number' | 'date' | 'checkbox' | 'multiselect';
        required?: boolean;
        options?: Array<{ value: string; label: string }>;
        placeholder?: string;
        validation?: {
          min?: number;
          max?: number;
          pattern?: RegExp;
        };
      }>;
    };
  };
}
