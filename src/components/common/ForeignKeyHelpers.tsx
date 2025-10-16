import React from 'react';
import { ForeignKeyLink } from './ForeignKeyLink';
import { animalsService } from '@/services/animalService';
import { breedsService } from '@/services/breedsService';
import { speciesService } from '@/services/speciesService';
import { fieldService } from '@/services/fieldService';
import { foodTypesService } from '@/services/foodTypesService';
import { vaccinesService } from '@/services/vaccinesService';
import { medicationsService } from '@/services/medicationsService';
import { diseaseService } from '@/services/diseaseService';
import { usersService } from '@/services/userService';
import { Badge } from '@/components/ui/badge';

// Helper para Animal
export const AnimalLink: React.FC<{ id: number | string; label: string }> = ({ id, label }) => (
  <ForeignKeyLink
    id={id}
    label={label}
    service={animalsService}
    modalTitle="Detalle del Animal"
    fields={[
      { key: 'id', label: 'ID' },
      { key: 'record', label: 'Registro' },
      { key: 'name', label: 'Nombre' },
      {
        key: 'status',
        label: 'Estado',
        render: (value) => {
          const colors: Record<string, string> = {
            'Sano': 'bg-green-100 text-green-800',
            'Enfermo': 'bg-red-100 text-red-800',
            'En tratamiento': 'bg-yellow-100 text-yellow-800',
            'En observación': 'bg-blue-100 text-blue-800',
          };
          return (
            <Badge className={`text-xs ${colors[value] || 'bg-gray-100 text-gray-800'}`}>
              {value || 'Sin estado'}
            </Badge>
          );
        },
      },
      { key: 'gender', label: 'Género' },
      {
        key: 'birth_date',
        label: 'Fecha de Nacimiento',
        render: (value) => (value ? new Date(value).toLocaleDateString('es-ES') : '-'),
      },
      { key: 'weight', label: 'Peso (kg)' },
      { key: 'breed_id', label: 'ID de Raza' },
      { key: 'notes', label: 'Notas' },
      {
        key: 'created_at',
        label: 'Creado',
        render: (value) => (value ? new Date(value).toLocaleDateString('es-ES') : '-'),
      },
    ]}
  />
);

// Helper para Breed (Raza)
export const BreedLink: React.FC<{ id: number | string; label: string }> = ({ id, label }) => (
  <ForeignKeyLink
    id={id}
    label={label}
    service={breedsService}
    modalTitle="Detalle de la Raza"
    fields={[
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Nombre' },
      { key: 'species_id', label: 'ID de Especie' },
      { key: 'description', label: 'Descripción' },
      { key: 'characteristics', label: 'Características' },
      {
        key: 'created_at',
        label: 'Creado',
        render: (value) => (value ? new Date(value).toLocaleDateString('es-ES') : '-'),
      },
    ]}
  />
);

// Helper para Species (Especie)
export const SpeciesLink: React.FC<{ id: number | string; label: string }> = ({ id, label }) => (
  <ForeignKeyLink
    id={id}
    label={label}
    service={speciesService}
    modalTitle="Detalle de la Especie"
    fields={[
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Nombre' },
      { key: 'description', label: 'Descripción' },
      {
        key: 'created_at',
        label: 'Creado',
        render: (value) => (value ? new Date(value).toLocaleDateString('es-ES') : '-'),
      },
    ]}
  />
);

// Helper para Field (Potrero)
export const FieldLink: React.FC<{ id: number | string; label: string }> = ({ id, label }) => (
  <ForeignKeyLink
    id={id}
    label={label}
    service={fieldService}
    modalTitle="Detalle del Potrero"
    fields={[
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Nombre' },
      { key: 'location', label: 'Ubicación' },
      { key: 'area', label: 'Área' },
      { key: 'capacity', label: 'Capacidad' },
      { key: 'state', label: 'Estado' },
      { key: 'animal_count', label: 'Cantidad de Animales' },
      { key: 'management', label: 'Manejo' },
      { key: 'measurements', label: 'Mediciones' },
      { key: 'food_type_id', label: 'ID de Tipo de Alimento' },
      {
        key: 'created_at',
        label: 'Creado',
        render: (value) => (value ? new Date(value).toLocaleDateString('es-ES') : '-'),
      },
    ]}
  />
);

// Helper para FoodType (Tipo de Alimento)
export const FoodTypeLink: React.FC<{ id: number | string; label: string }> = ({ id, label }) => (
  <ForeignKeyLink
    id={id}
    label={label}
    service={foodTypesService}
    modalTitle="Detalle del Tipo de Alimento"
    fields={[
      { key: 'id', label: 'ID' },
      { key: 'food_type', label: 'Tipo de Alimento' },
      { key: 'description', label: 'Descripción' },
      {
        key: 'sowing_date',
        label: 'Fecha de Siembra',
        render: (value) => (value ? new Date(value).toLocaleDateString('es-ES') : '-'),
      },
      {
        key: 'harvest_date',
        label: 'Fecha de Cosecha',
        render: (value) => (value ? new Date(value).toLocaleDateString('es-ES') : '-'),
      },
      { key: 'area', label: 'Área' },
      { key: 'handlings', label: 'Manejos' },
      { key: 'gauges', label: 'Mediciones' },
      {
        key: 'created_at',
        label: 'Creado',
        render: (value) => (value ? new Date(value).toLocaleDateString('es-ES') : '-'),
      },
    ]}
  />
);

// Helper para Vaccine (Vacuna)
export const VaccineLink: React.FC<{ id: number | string; label: string }> = ({ id, label }) => (
  <ForeignKeyLink
    id={id}
    label={label}
    service={vaccinesService}
    modalTitle="Detalle de la Vacuna"
    fields={[
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Nombre' },
      { key: 'dosis', label: 'Dosis' },
      { key: 'type', label: 'Tipo' },
      { key: 'national_plan', label: 'Plan Nacional', render: (value) => (value ? 'Sí' : 'No') },
      { key: 'vaccination_interval', label: 'Intervalo de Vacunación (días)' },
      { key: 'route_administration_id', label: 'ID de Ruta de Administración' },
      { key: 'target_disease_id', label: 'ID de Enfermedad Objetivo' },
      {
        key: 'created_at',
        label: 'Creado',
        render: (value) => (value ? new Date(value).toLocaleDateString('es-ES') : '-'),
      },
    ]}
  />
);

// Helper para Medication (Medicamento)
export const MedicationLink: React.FC<{ id: number | string; label: string }> = ({ id, label }) => (
  <ForeignKeyLink
    id={id}
    label={label}
    service={medicationsService}
    modalTitle="Detalle del Medicamento"
    fields={[
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Nombre' },
      { key: 'description', label: 'Descripción' },
      { key: 'dosage_form', label: 'Forma de Dosificación' },
      { key: 'concentration', label: 'Concentración' },
      { key: 'manufacturer', label: 'Fabricante' },
      { key: 'withdrawal_period_days', label: 'Período de Retiro (días)' },
      { key: 'storage_conditions', label: 'Condiciones de Almacenamiento' },
      { key: 'contraindications', label: 'Contraindicaciones' },
      {
        key: 'created_at',
        label: 'Creado',
        render: (value) => (value ? new Date(value).toLocaleDateString('es-ES') : '-'),
      },
    ]}
  />
);

// Helper para Disease (Enfermedad)
export const DiseaseLink: React.FC<{ id: number | string; label: string }> = ({ id, label }) => (
  <ForeignKeyLink
    id={id}
    label={label}
    service={diseaseService}
    modalTitle="Detalle de la Enfermedad"
    fields={[
      { key: 'id', label: 'ID' },
      { key: 'disease', label: 'Enfermedad' },
      { key: 'description', label: 'Descripción' },
      { key: 'symptoms', label: 'Síntomas' },
      { key: 'treatment', label: 'Tratamiento' },
      {
        key: 'created_at',
        label: 'Creado',
        render: (value) => (value ? new Date(value).toLocaleDateString('es-ES') : '-'),
      },
    ]}
  />
);

// Helper para User (Usuario/Instructor/Aprendiz)
export const UserLink: React.FC<{ id: number | string; label: string; role?: string }> = ({
  id,
  label,
  role,
}) => (
  <ForeignKeyLink
    id={id}
    label={label}
    service={usersService}
    modalTitle={`Detalle del ${role || 'Usuario'}`}
    fields={[
      { key: 'id', label: 'ID' },
      { key: 'identification', label: 'Identificación' },
      { key: 'fullname', label: 'Nombre Completo' },
      { key: 'first_name', label: 'Nombre' },
      { key: 'last_name', label: 'Apellido' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Teléfono' },
      { key: 'address', label: 'Dirección' },
      { key: 'role', label: 'Rol' },
      { key: 'status', label: 'Estado', render: (value) => (value ? 'Activo' : 'Inactivo') },
      {
        key: 'created_at',
        label: 'Creado',
        render: (value) => (value ? new Date(value).toLocaleDateString('es-ES') : '-'),
      },
    ]}
  />
);

/**
 * Hook genérico para usar ForeignKeyLink en columnas de tablas
 */
export const useForeignKeyColumn = (
  type: 'animal' | 'breed' | 'species' | 'field' | 'foodType' | 'vaccine' | 'medication' | 'disease' | 'user',
  labelMap: Map<number, string>
) => {
  return (value: any) => {
    if (!value) return '-';

    const id = Number(value);
    const label = labelMap.get(id) || `ID ${id}`;

    const componentMap = {
      animal: AnimalLink,
      breed: BreedLink,
      species: SpeciesLink,
      field: FieldLink,
      foodType: FoodTypeLink,
      vaccine: VaccineLink,
      medication: MedicationLink,
      disease: DiseaseLink,
      user: UserLink,
    };

    const Component = componentMap[type];
    return <Component id={id} label={label} />;
  };
};
