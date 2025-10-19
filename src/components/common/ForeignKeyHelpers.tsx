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
import { SectionCard, InfoField, modalStyles } from '@/components/common/ModalStyles';
import { AnimalImageBanner } from '@/components/dashboard/animals/AnimalImageBanner';

// Helper para Animal con renderizado personalizado
export const AnimalLink: React.FC<{ id: number | string; label: string }> = ({ id, label }) => {
  const renderAnimalContent = (item: any) => {
    const gender = item.sex || item.gender;
    const birthDate = item.birth_date ? new Date(item.birth_date).toLocaleDateString('es-ES') : '-';
    const status = item.status || item.state || 'Vivo';

    // Calcular edad
    const ageDisplay = () => {
      if (item.age_in_months !== undefined && item.age_in_months !== null) {
        if (item.age_in_months < 12) {
          return `${item.age_in_months} ${item.age_in_months === 1 ? 'mes' : 'meses'}`;
        } else {
          const years = Math.floor(item.age_in_months / 12);
          const months = item.age_in_months % 12;
          return months > 0
            ? `${years} ${years === 1 ? 'año' : 'años'} y ${months} ${months === 1 ? 'mes' : 'meses'}`
            : `${years} ${years === 1 ? 'año' : 'años'}`;
        }
      }
      if (item.age_in_days !== undefined && item.age_in_days !== null) {
        return `${item.age_in_days} ${item.age_in_days === 1 ? 'día' : 'días'}`;
      }
      return '-';
    };

    const getStatusColor = (status: string) => {
      const colors: Record<string, string> = {
        'Vivo': 'bg-green-500/90 hover:bg-green-600 text-white',
        'Muerto': 'bg-red-500/90 hover:bg-red-600 text-white',
        'Vendido': 'bg-blue-500/90 hover:bg-blue-600 text-white',
      };
      return colors[status] || 'bg-gray-500/90 hover:bg-gray-600 text-white';
    };

    return (
      <div className="flex flex-col h-full min-h-0 -m-4 -mb-4 sm:-m-5 sm:-mb-4">
        {/* Banner de Imágenes - altura optimizada */}
        <div className="flex-shrink-0">
          <AnimalImageBanner
            animalId={item.id}
            height="220px"
            showControls={true}
            autoPlayInterval={5000}
            hideWhenEmpty={true}
          />
        </div>

        {/* Contenido en dos columnas con scroll */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-2 sm:px-6">
          <div className={modalStyles.twoColGrid}>
            {/* Columna izquierda */}
            <div className={modalStyles.spacing.section}>
              <SectionCard title="Información Básica">
                <div className="grid grid-cols-2 gap-2 items-start">
                  <InfoField label="ID" value={`#${item.id}`} />
                  <div className="col-span-2">
                    <InfoField label="Registro" value={item.record || item.name || '-'} valueSize="large" />
                  </div>
                  <InfoField label="Sexo" value={gender || '-'} />
                  <div>
                    <div className={modalStyles.fieldLabel}>Estado</div>
                    <Badge className={`text-xs px-2 py-0.5 ${getStatusColor(status)}`}>
                      {status}
                    </Badge>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="Información Física">
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2">
                    <InfoField label="Fecha de Nacimiento" value={birthDate} />
                  </div>
                  <InfoField label="Edad" value={ageDisplay()} />
                  <InfoField label="Peso" value={item.weight ? `${item.weight} kg` : '-'} />
                  <InfoField label="Adulto" value={item.is_adult ? 'Sí' : 'No'} />
                </div>
              </SectionCard>

              {item.notes && (
                <SectionCard title="Notas">
                  <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap line-clamp-4 hover:line-clamp-none transition-all">
                    {item.notes}
                  </p>
                </SectionCard>
              )}
            </div>

            {/* Columna derecha */}
            <div className={modalStyles.spacing.section}>
              <SectionCard title="Información Genética">
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2">
                    <InfoField label="Raza" value={item.breed?.name || item.breed_id ? `ID ${item.breed_id}` : '-'} />
                  </div>
                  <InfoField label="Padre" value={item.father_id ? `REC${String(item.father_id).padStart(4, '0')}` : '-'} />
                  <InfoField label="Madre" value={item.mother_id ? `REC${String(item.mother_id).padStart(4, '0')}` : '-'} />
                </div>
              </SectionCard>

              <SectionCard title="Información del Sistema">
                <div className="grid grid-cols-2 gap-2">
                  <InfoField
                    label="Creado"
                    value={item.created_at ? new Date(item.created_at).toLocaleDateString('es-ES') : '-'}
                  />
                  <InfoField
                    label="Actualizado"
                    value={item.updated_at ? new Date(item.updated_at).toLocaleDateString('es-ES') : '-'}
                  />
                </div>
              </SectionCard>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <ForeignKeyLink
      id={id}
      label={label}
      service={animalsService}
      modalTitle="Detalle del Animal"
      renderContent={renderAnimalContent}
      size="6xl"
      enableFullScreenToggle
    />
  );
};

// Helper para Breed (Raza) con renderizado personalizado
export const BreedLink: React.FC<{ id: number | string; label: string }> = ({ id, label }) => {
  const renderBreedContent = (item: any) => {
    return (
      <div className={modalStyles.spacing.section}>
        <div className={modalStyles.twoColGrid}>
          {/* Columna izquierda */}
          <div className={modalStyles.spacing.section}>
            <SectionCard title="Información Básica">
              <div className={modalStyles.spacing.sectionSmall}>
                <InfoField label="ID" value={`#${item.id}`} />
                <InfoField label="Nombre" value={item.name || '-'} valueSize="xlarge" />
              </div>
            </SectionCard>

            {item.description && (
              <SectionCard title="Descripción">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {item.description}
                </p>
              </SectionCard>
            )}

            {item.characteristics && (
              <SectionCard title="Características">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {item.characteristics}
                </p>
              </SectionCard>
            )}
          </div>

          {/* Columna derecha */}
          <div className={modalStyles.spacing.section}>
            <SectionCard title="Especie">
              <InfoField
                label="Especie"
                value={item.species?.name || item.species_id ? `ID ${item.species_id}` : '-'}
                valueSize="large"
              />
            </SectionCard>

            <SectionCard title="Información del Sistema">
              <div className={modalStyles.fieldsGrid}>
                <InfoField
                  label="Creado"
                  value={item.created_at ? new Date(item.created_at).toLocaleDateString('es-ES') : '-'}
                />
                <InfoField
                  label="Actualizado"
                  value={item.updated_at ? new Date(item.updated_at).toLocaleDateString('es-ES') : '-'}
                />
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    );
  };

  return (
    <ForeignKeyLink
      id={id}
      label={label}
      service={breedsService}
      modalTitle="Detalle de la Raza"
      renderContent={renderBreedContent}
    />
  );
};

// Helper para Species (Especie) con renderizado personalizado
export const SpeciesLink: React.FC<{ id: number | string; label: string }> = ({ id, label }) => {
  const renderSpeciesContent = (item: any) => {
    return (
      <div className={modalStyles.spacing.section}>
        <div className={modalStyles.twoColGrid}>
          {/* Columna izquierda */}
          <div className={modalStyles.spacing.section}>
            <SectionCard title="Información Básica">
              <div className={modalStyles.spacing.sectionSmall}>
                <InfoField label="ID" value={`#${item.id}`} />
                <InfoField label="Nombre" value={item.name || '-'} valueSize="xlarge" />
              </div>
            </SectionCard>

            {item.description && (
              <SectionCard title="Descripción">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {item.description}
                </p>
              </SectionCard>
            )}
          </div>

          {/* Columna derecha */}
          <div className={modalStyles.spacing.section}>
            <SectionCard title="Información del Sistema">
              <div className={modalStyles.fieldsGrid}>
                <InfoField
                  label="Creado"
                  value={item.created_at ? new Date(item.created_at).toLocaleDateString('es-ES') : '-'}
                />
                <InfoField
                  label="Actualizado"
                  value={item.updated_at ? new Date(item.updated_at).toLocaleDateString('es-ES') : '-'}
                />
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    );
  };

  return (
    <ForeignKeyLink
      id={id}
      label={label}
      service={speciesService}
      modalTitle="Detalle de la Especie"
      renderContent={renderSpeciesContent}
    />
  );
};

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

// Helper para Vaccine (Vacuna) con renderizado personalizado
export const VaccineLink: React.FC<{ id: number | string; label: string }> = ({ id, label }) => {
  const renderVaccineContent = (item: any) => {
    return (
      <div className={modalStyles.spacing.section}>
        <div className={modalStyles.twoColGrid}>
          {/* Columna izquierda */}
          <div className={modalStyles.spacing.section}>
            <SectionCard title="Información Básica">
              <div className={modalStyles.spacing.sectionSmall}>
                <InfoField label="ID" value={`#${item.id}`} />
                <InfoField label="Nombre" value={item.name || '-'} valueSize="xlarge" />
                <InfoField label="Tipo" value={item.type || '-'} />
                {item.national_plan !== undefined && (
                  <div className="mt-2">
                    <div className={modalStyles.fieldLabel}>Plan Nacional</div>
                    <Badge className={`text-sm px-3 py-1 ${item.national_plan ? 'bg-blue-500/90 hover:bg-blue-600 text-white' : 'bg-gray-500/90 hover:bg-gray-600 text-white'}`}>
                      {item.national_plan ? 'Sí' : 'No'}
                    </Badge>
                  </div>
                )}
              </div>
            </SectionCard>

            <SectionCard title="Dosificación">
              <InfoField label="Dosis" value={item.dosis || '-'} valueSize="large" />
              <InfoField label="Intervalo de Vacunación" value={item.vaccination_interval ? `${item.vaccination_interval} días` : '-'} />
            </SectionCard>
          </div>

          {/* Columna derecha */}
          <div className={modalStyles.spacing.section}>
            <SectionCard title="Administración">
              <InfoField label="Ruta de Administración" value={item.route_administration_id ? `ID ${item.route_administration_id}` : '-'} />
              <InfoField label="Enfermedad Objetivo" value={item.target_disease_id ? `ID ${item.target_disease_id}` : '-'} />
            </SectionCard>

            <SectionCard title="Información del Sistema">
              <div className={modalStyles.fieldsGrid}>
                <InfoField
                  label="Creado"
                  value={item.created_at ? new Date(item.created_at).toLocaleDateString('es-ES') : '-'}
                />
                <InfoField
                  label="Actualizado"
                  value={item.updated_at ? new Date(item.updated_at).toLocaleDateString('es-ES') : '-'}
                />
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    );
  };

  return (
    <ForeignKeyLink
      id={id}
      label={label}
      service={vaccinesService}
      modalTitle="Detalle de la Vacuna"
      renderContent={renderVaccineContent}
    />
  );
};

// Helper para Medication (Medicamento) con renderizado personalizado
export const MedicationLink: React.FC<{ id: number | string; label: string }> = ({ id, label }) => {
  const renderMedicationContent = (item: any) => {
    const availability = item.availability;

    return (
      <div className={modalStyles.spacing.section}>
        <div className={modalStyles.twoColGrid}>
          {/* Columna izquierda */}
          <div className={modalStyles.spacing.section}>
            <SectionCard title="Información Básica">
              <div className={modalStyles.spacing.sectionSmall}>
                <InfoField label="ID" value={`#${item.id}`} />
                <InfoField label="Nombre" value={item.name || '-'} valueSize="xlarge" />
                {availability !== undefined && (
                  <div className="mt-2">
                    <div className={modalStyles.fieldLabel}>Disponibilidad</div>
                    <Badge className={`text-sm px-3 py-1 ${availability ? 'bg-green-500/90 hover:bg-green-600 text-white' : 'bg-gray-500/90 hover:bg-gray-600 text-white'}`}>
                      {availability ? 'Disponible' : 'No disponible'}
                    </Badge>
                  </div>
                )}
              </div>
            </SectionCard>

            <SectionCard title="Dosificación">
              <div className={modalStyles.fieldsGrid}>
                <InfoField label="Dosis" value={item.dosis || item.dosage_form || '-'} valueSize="large" />
                <InfoField label="Concentración" value={item.concentration || '-'} />
              </div>
            </SectionCard>

            {item.description && (
              <SectionCard title="Descripción">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {item.description}
                </p>
              </SectionCard>
            )}
          </div>

          {/* Columna derecha */}
          <div className={modalStyles.spacing.section}>
            {item.indications && (
              <SectionCard title="Indicaciones">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {item.indications}
                </p>
              </SectionCard>
            )}

            {item.contraindications && (
              <SectionCard title="Contraindicaciones">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {item.contraindications}
                </p>
              </SectionCard>
            )}

            <SectionCard title="Información del Sistema">
              <div className={modalStyles.fieldsGrid}>
                <InfoField
                  label="Creado"
                  value={item.created_at ? new Date(item.created_at).toLocaleDateString('es-ES') : '-'}
                />
                <InfoField
                  label="Actualizado"
                  value={item.updated_at ? new Date(item.updated_at).toLocaleDateString('es-ES') : '-'}
                />
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    );
  };

  return (
    <ForeignKeyLink
      id={id}
      label={label}
      service={medicationsService}
      modalTitle="Detalle del Medicamento"
      renderContent={renderMedicationContent}
    />
  );
};

// Helper para Disease (Enfermedad) con renderizado personalizado
export const DiseaseLink: React.FC<{ id: number | string; label: string }> = ({ id, label }) => {
  const renderDiseaseContent = (item: any) => {
    return (
      <div className={modalStyles.spacing.section}>
        <div className={modalStyles.twoColGrid}>
          {/* Columna izquierda */}
          <div className={modalStyles.spacing.section}>
            <SectionCard title="Información Básica">
              <div className={modalStyles.spacing.sectionSmall}>
                <InfoField label="ID" value={`#${item.id}`} />
                <InfoField label="Enfermedad" value={item.disease || item.name || '-'} valueSize="xlarge" />
              </div>
            </SectionCard>

            {item.description && (
              <SectionCard title="Descripción">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {item.description}
                </p>
              </SectionCard>
            )}

            {item.symptoms && (
              <SectionCard title="Síntomas">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {item.symptoms}
                </p>
              </SectionCard>
            )}
          </div>

          {/* Columna derecha */}
          <div className={modalStyles.spacing.section}>
            {item.treatment && (
              <SectionCard title="Tratamiento">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {item.treatment}
                </p>
              </SectionCard>
            )}

            <SectionCard title="Información del Sistema">
              <div className={modalStyles.fieldsGrid}>
                <InfoField
                  label="Creado"
                  value={item.created_at ? new Date(item.created_at).toLocaleDateString('es-ES') : '-'}
                />
                <InfoField
                  label="Actualizado"
                  value={item.updated_at ? new Date(item.updated_at).toLocaleDateString('es-ES') : '-'}
                />
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    );
  };

  return (
    <ForeignKeyLink
      id={id}
      label={label}
      service={diseaseService}
      modalTitle="Detalle de la Enfermedad"
      renderContent={renderDiseaseContent}
    />
  );
};

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
