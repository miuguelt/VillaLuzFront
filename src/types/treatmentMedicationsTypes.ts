import { Medications } from "./medicationsTypes";
import { Treatments } from "./treatmentsTypes";

export interface TreatmentMedications {
  id?: number;
  treatment_id: number;
  medication_id: number;

  treatments?: Treatments[];
  medications?: Medications;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}
