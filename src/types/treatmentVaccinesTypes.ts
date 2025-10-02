import { Treatments } from "./treatmentsTypes";
import { Vaccines } from "./vaccinesTypes";

export interface TreatmentVaccines{
    id?: number;
    treatment_id: number | undefined;
    vaccine_id: number;

    treatments?: Treatments[];
    vaccines?: Vaccines;
}

export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
  }