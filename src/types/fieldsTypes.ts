import { AnimalFields } from "./animalFieldsTypes";
import { FoodTypes } from "./foodTypes";

export type state = "Disponible" | "Ocupado" | "Mantenimiento" | "Restringido";

export interface Fields {
    id?: number;
    name: string;
    location: string;
    capacity: string; // En la BD es varchar(255)
    state: state;
    management: string;
    measurements: string;
    area: string; // En la BD es varchar(255)
    food_type_id?: number;
    
    food_types?: FoodTypes;
    animalFields?: AnimalFields[];
}

export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
  }