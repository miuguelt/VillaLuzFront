import { Animals } from "./animalsTypes";

export interface Diseases {
    id?: number;
    name: string;
    symptoms: string;
    details: string;

    animals?: Animals[];
}

export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
  }