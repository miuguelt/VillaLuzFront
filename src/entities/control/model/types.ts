import { Animals } from "./animalsTypes";

export type health_status = "Excelente" | "Bueno" | "Regular" | "Malo";

export interface Control{
    id?: number;
    checkup_date: string;
    health_status: health_status;
    description: string;
    animal_id: number;
    
    // Campo adicional para compatibilidad con formularios
    healt_status?: health_status;

    animals?: Animals;
}

export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
  }