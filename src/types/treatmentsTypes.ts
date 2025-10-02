import { Animals } from "./animalsTypes";
import { TreatmentMedications } from "./treatmentMedicationsTypes";
import { TreatmentVaccines } from "./treatmentVaccinesTypes";

export interface Treatments{
    id?: number;
    treatment_date: string;
    end_date: string;
    description: string;
    frequency: string;
    observations: string;
    dosis: string;
    animal_id: number;
    treatment_type?: string;

    animals?: Animals;
    vaccines_treatments?: TreatmentVaccines[];
    medication_treatments?: TreatmentMedications[];
}

export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
  }