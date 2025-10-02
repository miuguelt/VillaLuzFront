import { Animals } from "./animalsTypes";
import { Fields } from "./fieldsTypes";

// DEPRECATED: Use AnimalFieldResponse from swaggerTypes.ts instead
export interface AnimalFields{
    id?: number;
    assignment_date: string; // Corregido: era treatment_date
    removal_date?: string;   // Corregido: era end_date
    duration?: string;
    animal_id: number;
    field_id: number;
    reason?: string;
    notes?: string;
    status?: boolean | string;
    is_active?: boolean;

    animals?: Animals;
    fields?: Fields;
    
    // Potreros adicionales para compatibilidad
    animal_record?: string;
    field_name?: string;
    created_at?: string;
    updated_at?: string;
}

export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
  }