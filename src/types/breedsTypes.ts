import { Species } from "./speciesTypes";

export interface Breeds{
    id?: number;
    name: string;
    species_id: number;

    species?: Species; // Made optional to allow create/edit forms to omit nested species object
}

export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
  }