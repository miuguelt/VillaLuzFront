import { Animals } from "./animalsTypes";
import { Vaccines } from "./vaccinesTypes";

export interface Vaccinations{
    id?: number;
    animal_id: number;
    vaccine_id: number;
    application_date: string;
    apprentice_id?: number; // Puede ser NULL según la BD
    instructor_id: number;

    animals?: Animals;
    vaccines?: Vaccines[];
}

export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
  }