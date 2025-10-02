import { Vaccinations } from '@/types/vaccinationsTypes';
import { TreatmentVaccines } from './treatmentVaccinesTypes';
import { Diseases } from '@/types/diseasesTypes';
import { Control } from '@/types/controlTypes';
import { GeneticImprovements } from '@/types/geneticImprovementsTypes';
import { AnimalFields } from '@/types/animalFieldsTypes';
import { Breeds } from '@/types/breedsTypes';

export type sex = "Macho" | "Hembra" | "";
export type status = "Vivo" | "Vendido" | "Muerto" | "";

export interface Animals{
    id?: number;
    sex: sex;
    birth_date: string;
    weight: number;
    record: string;
    status: status;
    breeds_id: number;
    idFather?: number | null;
    idMother?: number | null;
    notes?: string;
    
    // Potreros adicionales para compatibilidad con formularios y relaciones
    idAnimal?: number;
    name?: string;
    father_id?: number | null;
    mother_id?: number | null;

    father?: Animals;
    mother?: Animals;

    breed?: Breeds;
    treatments?: TreatmentVaccines[];
    vaccinations?: Vaccinations[];
    diseases?: Diseases[];
    controls?: Control[];
    geneticImprovements?: GeneticImprovements[];
    animalFields?: AnimalFields[];
}


export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
  }