import { Diseases } from "./diseasesTypes";

export type route_administration = "Oral" | "Intranasal" | "Topica" | "Intramuscular" | "Intravenosa" | "Subcutánea"; 

export type vaccine_type = "Atenuada" | "Inactivada" | "Toxoide" | "Subunidad" | "Conjugada" | "Recombinante" | "Adn" | "Arn";

export interface Vaccines{
    id?: number;
    name: string;
    dosis: string;
    route_administration: route_administration;
    route_administration_id?: number;
    vaccination_interval: string;
    vaccine_type: vaccine_type;
    national_plan: string;
    target_disease_id: number;

    diseases?: Diseases;
}