import { Animals } from "./animalsTypes";

export interface GeneticImprovements {
    id?: number;
    animal_id: number;
    genetic_event_date: string;
    genetic_event_technique: string;
    genetic_event_description: string;
    genetic_event_result: string;
    genetic_event_cost: number;
    genetic_event_responsible: string;
    
    // Potreros adicionales para compatibilidad con formularios
    genetic_event_techique?: string;
    date?: string;
    details?: string;
    results?: string;

    animals?: Animals; // Adjusted to match expected structure
}

export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
  }