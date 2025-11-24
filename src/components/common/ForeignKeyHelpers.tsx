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
import { AnimalModalContent } from '@/components/dashboard/animals/AnimalModalContent';
import { useAuth } from '@/hooks/useAuth';
import { AnimalHistoryModal } from '@/components/dashboard/AnimalHistoryModal';
import GeneticTreeModal from '@/components/dashboard/GeneticTreeModal';
import DescendantsTreeModal from '@/components/dashboard/DescendantsTreeModal';
import { useAnimalTreeApi, graphToAncestorLevels, graphToDescendantLevels } from '@/hooks/animal/useAnimalTreeApi';

// Helper para Animal con renderizado personalizado
export const AnimalLink: React.FC<{ id: number | string; label: string }> = ({ id, label }) => {
  const renderAnimalContent = (initialAnimal: any) => {
    const Wrapper: React.FC<{ initial: any }> = ({ initial }) => {
      const [animal, setAnimal] = React.useState<any>(initial);
      const { user } = useAuth();

      // Modales auxiliares (historial y árboles) para replicar el detalle completo
      const [isHistoryOpen, setIsHistoryOpen] = React.useState(false);
      const [historyAnimal, setHistoryAnimal] = React.useState<any | null>(null);

      const ancestorsApi = useAnimalTreeApi();
      const descendantsApi = useAnimalTreeApi();
      const [isTreeOpen, setIsTreeOpen] = React.useState(false);
      const [treeAnimal, setTreeAnimal] = React.useState<any | null>(null);
      const [treeLevels, setTreeLevels] = React.useState<any[][]>([]);
      const [ancestorCounts, setAncestorCounts] = React.useState<any>();
      const [ancestorSummary, setAncestorSummary] = React.useState<any>();
      const [ancestorEdgeExamples, setAncestorEdgeExamples] = React.useState<any>();
      const [treeRootId, setTreeRootId] = React.useState<number | null>(null);

      const [isDescOpen, setIsDescOpen] = React.useState(false);
      const [descAnimal, setDescAnimal] = React.useState<any | null>(null);
      const [descLevels, setDescLevels] = React.useState<any[][]>([]);
      const [descCounts, setDescCounts] = React.useState<any>();
      const [descSummary, setDescSummary] = React.useState<any>();
      const [descEdgeExamples, setDescEdgeExamples] = React.useState<any>();
      const [descRootId, setDescRootId] = React.useState<number | null>(null);

      const loadAnimal = async (animalId: number) => {
        const next = await animalsService.getById(animalId);
        setAnimal(next);
      };

      const computeBreedLabel = (a: any) =>
        a?.breed?.name || (a?.breeds_id || a?.breed_id ? `ID ${a.breeds_id ?? a.breed_id}` : '-');
      const computeParentLabel = (parentId?: number | null) => (parentId ? `ID ${parentId}` : '-');

      const breedLabel = computeBreedLabel(animal);
      const fatherId = animal?.idFather || animal?.father_id;
      const motherId = animal?.idMother || animal?.mother_id;
      const fatherLabel = computeParentLabel(fatherId ?? null);
      const motherLabel = computeParentLabel(motherId ?? null);

      const openHistory = (record: any) => {
        const payload = {
          idAnimal: Number(record?.id ?? 0),
          record: record?.record || '',
          breed: record?.breed,
          birth_date: record?.birth_date,
          sex: record?.sex || record?.gender,
          status: record?.status,
        };
        setHistoryAnimal(payload);
        setIsHistoryOpen(true);
      };

      const openAncestorsTree = async (record: any) => {
        const idNum = Number(record?.id ?? 0);
        if (!idNum) return;
        const resp = await ancestorsApi.fetchAncestors(idNum, 3, 'id,record,sex,breeds_id,idFather,idMother');
        if (!resp) {
          setTreeAnimal(record);
          setTreeLevels([]);
          setAncestorCounts(undefined);
          setAncestorSummary(undefined);
          setAncestorEdgeExamples(undefined);
          setTreeRootId(idNum);
          setIsTreeOpen(true);
          return;
        }
        setTreeRootId(resp.rootId);
        setTreeAnimal(resp.nodes[resp.rootId]);
        setTreeLevels(graphToAncestorLevels(resp));
        setAncestorCounts(resp.counts);
        setAncestorSummary(resp.summary);
        setAncestorEdgeExamples(resp.edge_examples);
        setIsTreeOpen(true);
      };

      const openDescendantsTree = async (record: any) => {
        const idNum = Number(record?.id ?? 0);
        if (!idNum) return;
        const resp = await descendantsApi.fetchDescendants(idNum, 3, 'id,record,sex,breeds_id,idFather,idMother');
        if (!resp) {
          setDescAnimal(record);
          setDescLevels([]);
          setDescCounts(undefined);
          setDescSummary(undefined);
          setDescEdgeExamples(undefined);
          setDescRootId(idNum);
          setIsDescOpen(true);
          return;
        }
        setDescRootId(resp.rootId);
        setDescAnimal(resp.nodes[resp.rootId]);
        setDescLevels(graphToDescendantLevels(resp));
        setDescCounts(resp.counts);
        setDescSummary(resp.summary);
        setDescEdgeExamples(resp.edge_examples);
        setIsDescOpen(true);
      };

      return (
        <>
          <AnimalModalContent
            animal={animal}
            breedLabel={breedLabel}
            fatherLabel={fatherLabel}
            motherLabel={motherLabel}
            onFatherClick={fatherId ? (id: number) => loadAnimal(id) : undefined}
            onMotherClick={motherId ? (id: number) => loadAnimal(id) : undefined}
            currentUserId={user?.id}
            onOpenHistory={() => openHistory(animal)}
            onOpenAncestorsTree={() => openAncestorsTree(animal)}
            onOpenDescendantsTree={() => openDescendantsTree(animal)}
          />

          {isHistoryOpen && historyAnimal && (
            <AnimalHistoryModal
              animal={historyAnimal}
              onClose={() => {
                setIsHistoryOpen(false);
                setHistoryAnimal(null);
              }}
            />
          )}

          <GeneticTreeModal
            isOpen={isTreeOpen}
            onClose={() => {
              setIsTreeOpen(false);
              setTreeAnimal(null);
              setTreeLevels([]);
              ancestorsApi.clearError();
            }}
            animal={treeAnimal}
            levels={treeLevels}
            counts={ancestorCounts}
            summary={ancestorSummary}
            edgeExamples={ancestorEdgeExamples}
            dependencyInfo={ancestorsApi.dependencyInfo}
            treeError={ancestorsApi.error}
            loadingMore={ancestorsApi.loading}
            onLoadMore={async () => {
              if (!treeRootId || !ancestorsApi.graph) return;
              const merged = await ancestorsApi.loadMore('ancestors', treeRootId, ancestorsApi.graph, {
                increment: 2,
                fields: 'id,record,sex,breeds_id,idFather,idMother',
              });
              setTreeAnimal(merged.nodes[merged.rootId]);
              setTreeLevels(graphToAncestorLevels(merged));
              setAncestorCounts(merged.counts);
              setAncestorSummary(merged.summary);
              setAncestorEdgeExamples(merged.edge_examples);
            }}
          />

          <DescendantsTreeModal
            isOpen={isDescOpen}
            onClose={() => {
              setIsDescOpen(false);
              setDescAnimal(null);
              setDescLevels([]);
              descendantsApi.clearError();
            }}
            animal={descAnimal}
            levels={descLevels}
            counts={descCounts}
            summary={descSummary}
            edgeExamples={descEdgeExamples}
            dependencyInfo={descendantsApi.dependencyInfo}
            treeError={descendantsApi.error}
            loadingMore={descendantsApi.loading}
            onLoadMore={async () => {
              if (!descRootId || !descendantsApi.graph) return;
              const merged = await descendantsApi.loadMore('descendants', descRootId, descendantsApi.graph, {
                increment: 2,
                fields: 'id,record,sex,breeds_id,idFather,idMother',
              });
              setDescAnimal(merged.nodes[merged.rootId]);
              setDescLevels(graphToDescendantLevels(merged));
              setDescCounts(merged.counts);
              setDescSummary(merged.summary);
              setDescEdgeExamples(merged.edge_examples);
            }}
          />
        </>
      );
    };

    return <Wrapper initial={initialAnimal} />;
  };

  return (
    <ForeignKeyLink
      id={id}
      label={label}
      service={animalsService}
      modalTitle="Detalle del Animal"
      renderContent={renderAnimalContent}
      size="full"
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
// eslint-disable-next-line react-refresh/only-export-components
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
