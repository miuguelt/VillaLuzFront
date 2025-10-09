import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminCRUDPage, CRUDColumn, CRUDFormSection, CRUDConfig } from '@/components/common/AdminCRUDPage';
import { animalsService } from '@/services/animalService';
import type { AnimalResponse, AnimalInput } from '@/types/swaggerTypes';
import { breedsService } from '@/services/breedsService';
import { getTodayColombia } from '@/utils/dateUtils';

import { AnimalHistoryModal } from '@/components/dashboard/AnimalHistoryModal';
import GeneticTreeModal from '@/components/dashboard/GeneticTreeModal';
import { useAnimalTreeApi, graphToAncestorLevels, graphToDescendantLevels } from '@/hooks/animal/useAnimalTreeApi';
import DescendantsTreeModal from '@/components/dashboard/DescendantsTreeModal';
import { useForeignKeySelect } from '@/hooks/useForeignKeySelect';
import { ANIMAL_GENDERS, ANIMAL_STATES } from '@/constants/enums';
import { History, GitBranch, Baby } from 'lucide-react';
import { useEffect, useState } from 'react';
import { checkAnimalDependencies, clearAnimalDependencyCache } from '@/services/dependencyCheckService';
import { Button } from '@/components/ui/button';
import { GenericModal } from '@/components/common/GenericModal';
import { AnimalActionsMenu } from '@/components/dashboard/AnimalActionsMenu';
import { useAuth } from '@/hooks/useAuth';

// Mapear respuesta del backend al formulario
const mapResponseToForm = (item: AnimalResponse & { [k: string]: any }): Partial<AnimalInput> => {
  return {
    record: item.record || '',
    birth_date: item.birth_date,
    weight: item.weight,
    breed_id: item.breeds_id || item.breed_id,
    gender: item.sex || item.gender,
    status: item.status || 'Sano',
    father_id: item.idFather || item.father_id,
    mother_id: item.idMother || item.mother_id,
    notes: item.notes || '',
  };
};

// Validación mejorada con advertencias y recomendaciones
const validateForm = (formData: Partial<AnimalInput>): string | null => {
  if (!formData.record || !formData.record.trim()) {
    return '⚠️ El registro es obligatorio. Ejemplo: REC0001, BOV001, etc.';
  }

  if (!formData.birth_date) {
    return '⚠️ La fecha de nacimiento es obligatoria para calcular la edad del animal.';
  }

  // Validar que la fecha de nacimiento no sea futura
  const birthDate = new Date(formData.birth_date);
  const today = new Date();
  if (birthDate > today) {
    return '⚠️ La fecha de nacimiento no puede ser futura. Verifique la fecha ingresada.';
  }

  // Advertir si el animal es muy viejo (más de 20 años)
  const yearsDiff = (today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
  if (yearsDiff > 20) {
    return '⚠️ La fecha de nacimiento indica que el animal tendría más de 20 años. ¿Es correcta esta fecha?';
  }

  const breedNum = Number(formData.breed_id);
  if (formData.breed_id == null || Number.isNaN(breedNum) || breedNum <= 0) {
    return '⚠️ Debe seleccionar una raza. La raza es importante para el seguimiento genético.';
  }

  if (!formData.gender) {
    return '⚠️ El sexo del animal es obligatorio.';
  }

  // Validar peso (requerido por el backend)
  if (formData.weight === undefined || formData.weight === null) {
    return '⚠️ El peso del animal es obligatorio.';
  }

  const weightNum = Number(formData.weight);
  if (Number.isNaN(weightNum) || weightNum <= 0) {
    return '⚠️ El peso debe ser un valor positivo mayor a 0 kg.';
  }

  if (weightNum > 2000) {
    return '⚠️ El peso parece excesivo (>2000 kg). Verifique el valor ingresado.';
  }

  // Advertir si se selecciona el mismo animal como padre y madre
  if (formData.father_id && formData.mother_id && formData.father_id === formData.mother_id) {
    return '⚠️ No puede seleccionar el mismo animal como padre y madre.';
  }

  return null;
};

// Datos iniciales
const initialFormData: Partial<AnimalInput> = {
  record: '',
  birth_date: getTodayColombia(),
  weight: undefined, // Requerido: será validado antes de enviar
  breed_id: undefined as any, // Forzar que el usuario seleccione
  gender: 'Macho',
  status: 'Sano',
  father_id: undefined,
  mother_id: undefined,
  notes: '',
};

function AdminAnimalsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState<Partial<AnimalInput>>(initialFormData);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>(() => {
    const saved = localStorage.getItem('adminAnimalsViewMode');
    return saved === 'cards' ? 'cards' : 'table';
  });

  useEffect(() => {
    try {
      localStorage.setItem('adminAnimalsViewMode', viewMode);
    } catch {}
  }, [viewMode]);

  // Hook para razas - usar getPaginated con límite alto para obtener todas
  const {
    options: breedOptions,
    loading: loadingBreeds,
    handleSearch: handleSearchBreeds,
  } = useForeignKeySelect(
    (params) => breedsService.getPaginated({ ...params, limit: 1000 }),
    (b: { id: number; name: string }) => ({ value: b.id, label: b.name }),
    undefined,
    1000
  );

  // Hook para padres (solo machos) - cargar todos con límite alto
  const {
    options: fatherOptions,
    loading: loadingFathers,
  } = useForeignKeySelect(
    (params) => animalsService.getAnimalsPaginated({ ...params, limit: 1000 }),
    (a: { id: number; record: string; sex?: string; gender?: string }) => ({
      value: a.id,
      label: a.record ? `${a.record}` : `ID ${a.id}`
    }),
    (a: { sex?: string; gender?: string }) => {
      const gender = a.sex || a.gender;
      return String(gender).toLowerCase() === 'macho';
    },
    1000
  );

  // Hook para madres (solo hembras) - cargar todas con límite alto
  const {
    options: motherOptions,
    loading: loadingMothers,
  } = useForeignKeySelect(
    (params) => animalsService.getAnimalsPaginated({ ...params, limit: 1000 }),
    (a: { id: number; record: string; sex?: string; gender?: string }) => ({
      value: a.id,
      label: a.record ? `${a.record}` : `ID ${a.id}`
    }),
    (a: { sex?: string; gender?: string }) => {
      const gender = a.sex || a.gender;
      return String(gender).toLowerCase() === 'hembra';
    },
    1000
  );

  // Estados para modales
  const [isHistoryOpen, setIsHistoryOpen] = React.useState<boolean>(false);
  const [historyAnimal, setHistoryAnimal] = React.useState<{
    idAnimal: number;
    record: string;
    breed?: any;
    birth_date?: string;
    sex?: string;
    status?: string;
  } | null>(null);

  const [isTreeOpen, setIsTreeOpen] = React.useState<boolean>(false);
  const [treeAnimal, setTreeAnimal] = React.useState<any | null>(null);
  const [treeLevels, setTreeLevels] = React.useState<any[][]>([]);
  const ancestorsApi = useAnimalTreeApi();
  const [ancestorCounts, setAncestorCounts] = useState<{ nodes: number; edges: number } | undefined>(undefined);
  const [ancestorSummary, setAncestorSummary] = useState<any | undefined>(undefined);
  const [ancestorEdgeExamples, setAncestorEdgeExamples] = useState<any | undefined>(undefined);
  const [treeRootId, setTreeRootId] = useState<number | null>(null);
  
  const [isDescOpen, setIsDescOpen] = React.useState<boolean>(false);
  const [descAnimal, setDescAnimal] = React.useState<any | null>(null);
  const [descLevels, setDescLevels] = React.useState<any[][]>([]);
  const descendantsApi = useAnimalTreeApi();
  const [descCounts, setDescCounts] = useState<{ nodes: number; edges: number } | undefined>(undefined);
  const [descSummary, setDescSummary] = useState<any | undefined>(undefined);
  const [descEdgeExamples, setDescEdgeExamples] = useState<any | undefined>(undefined);
  const [descRootId, setDescRootId] = useState<number | null>(null);

  // Estados para modales de FK
  const [isBreedDetailOpen, setIsBreedDetailOpen] = useState(false);
  const [selectedBreed, setSelectedBreed] = useState<any | null>(null);
  const [isAnimalDetailOpen, setIsAnimalDetailOpen] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState<any | null>(null);

  // Secciones del formulario
  const formSectionsLocal: CRUDFormSection<Partial<AnimalInput>>[] = [
    {
      title: 'Información Básica',
      gridCols: 3,
      fields: [
        { 
          name: 'record', 
          label: 'Registro', 
          type: 'text', 
          required: true, 
          placeholder: 'Ej: REC0001' 
        },
        {
          name: 'birth_date',
          label: 'Fecha de Nacimiento',
          type: 'date',
          required: true
        },
        {
          name: 'breed_id',
          label: 'Raza',
          type: 'select',
          required: true,
          options: breedOptions,
          placeholder: 'Seleccionar raza'
        },
        {
          name: 'gender',
          label: 'Sexo',
          type: 'select',
          required: true,
          options: ANIMAL_GENDERS as any
        },
        {
          name: 'status',
          label: 'Estado',
          type: 'select',
          options: ANIMAL_STATES as any
        },
        {
          name: 'weight',
          label: 'Peso (kg)',
          type: 'number',
          required: true,
          placeholder: 'Ej: 250'
        },
      ],
    },
    {
      title: 'Genealogía y Adquisición',
      gridCols: 3,
      fields: [
        {
          name: 'father_id',
          label: 'Padre',
          type: 'select',
          options: fatherOptions,
          placeholder: 'Seleccionar padre',
          excludeSelf: true
        },
        {
          name: 'mother_id',
          label: 'Madre',
          type: 'select',
          options: motherOptions,
          placeholder: 'Seleccionar madre',
          excludeSelf: true
        },
      ],
    },
  ];

  // Columnas de la tabla
  const columns: CRUDColumn<AnimalResponse & { [k: string]: any }>[] = [
    { key: 'id', label: 'ID', width: 12 },
    { key: 'record', label: 'Registro' },
    { 
      key: 'gender', 
      label: 'Sexo', 
      render: (v, record) => v || record.sex || '-' 
    },
    { 
      key: 'status', 
      label: 'Estado', 
      render: (v) => v || '-' 
    },
    { 
      key: 'breed_id', 
      label: 'Raza', 
      render: (v, record) => {
        const breedId = v || record.breeds_id || record.breed_id;
        return breedId 
          ? (breedOptions.find((b) => Number(b.value) === Number(breedId))?.label || `ID ${breedId}`) 
          : '-';
      }
    },
    { 
      key: 'birth_date', 
      label: 'Nacimiento', 
      render: (v) => v ? new Date(v as string).toLocaleDateString('es-ES') : '-' 
    },
    { 
      key: 'weight', 
      label: 'Peso (kg)', 
      render: (v) => v ?? '-' 
    },
    { 
      key: 'age_in_months', 
      label: 'Edad (meses)', 
      render: (v) => v ?? '-' 
    },
    { 
      key: 'is_adult', 
      label: 'Adulto', 
      render: (v) => v === true ? 'Sí' : v === false ? 'No' : '-' 
    },
    { 
      key: 'father_id', 
      label: 'Padre', 
      render: (v, record) => {
        const fatherId = v || record.idFather || record.father_id;
        return fatherId 
          ? (fatherOptions.find((o) => Number(o.value) === Number(fatherId))?.label || `ID ${fatherId}`) 
          : '-';
      }
    },
    { 
      key: 'mother_id', 
      label: 'Madre', 
      render: (v, record) => {
        const motherId = v || record.idMother || record.mother_id;
        return motherId 
          ? (motherOptions.find((o) => Number(o.value) === Number(motherId))?.label || `ID ${motherId}`) 
          : '-';
      }
    },
    {
      key: 'created_at',
      label: 'Creado',
      render: (v) => v ? new Date(v as string).toLocaleDateString('es-ES') : '-'
    },
  ];
  
  // Funciones para abrir modales
  const openHistoryModal = (record: AnimalResponse & { [k: string]: any }) => {
    const modalAnimal = {
      idAnimal: Number(record.id ?? 0),
      record: record.record || '',
      breed: (record as any).breed,
      birth_date: record.birth_date,
      sex: record.sex || record.gender,
      status: record.status,
    };
    setHistoryAnimal(modalAnimal);
    setIsHistoryOpen(true);
  };
  
  const openGeneticTreeModal = async (record: AnimalResponse & { [k: string]: any }) => {
    const id = Number(record.id ?? 0);
    if (!id) return;
    const resp = await ancestorsApi.fetchAncestors(id, 3, 'id,record,sex,breeds_id,idFather,idMother');
    if (!resp) {
      // Si hay error, abrimos el modal de todas formas para mostrar el mensaje
      setTreeAnimal(record);
      setTreeLevels([]);
      setAncestorCounts(undefined);
      setAncestorSummary(undefined);
      setAncestorEdgeExamples(undefined);
      setTreeRootId(id);
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

  const openDescendantsTreeModal = async (record: AnimalResponse & { [k: string]: any }) => {
    const id = Number(record.id ?? 0);
    if (!id) return;
    const resp = await descendantsApi.fetchDescendants(id, 3, 'id,record,sex,breeds_id,idFather,idMother');
    if (!resp) {
      // Si hay error, abrimos el modal de todas formas para mostrar el mensaje
      setDescAnimal(record);
      setDescLevels([]);
      setDescCounts(undefined);
      setDescSummary(undefined);
      setDescEdgeExamples(undefined);
      setDescRootId(id);
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

  // Funciones para abrir modales de FK
  const openBreedDetailModal = async (breedId: number) => {
    try {
      const breed = await breedsService.getById(breedId);
      setSelectedBreed(breed);
      setIsBreedDetailOpen(true);
    } catch (error) {
      console.error('Error loading breed details:', error);
    }
  };

  const openAnimalDetailModal = async (animalId: number) => {
    try {
      const animal = await animalsService.getById(animalId);
      setSelectedAnimal(animal);
      setIsAnimalDetailOpen(true);
    } catch (error) {
      console.error('Error loading animal details:', error);
    }
  };

  // Contenido personalizado para el modal de detalle
  const renderAnimalDetail = (item: AnimalResponse & { [k: string]: any }) => {
    const breedId = item.breeds_id || item.breed_id;
    const breedLabel = breedId
      ? (breedOptions.find((b) => Number(b.value) === Number(breedId))?.label || (item.breed?.name) || `ID ${breedId}`)
      : '-';
    
    const fatherId = item.idFather || item.father_id;
    const fatherLabel = fatherId
      ? (fatherOptions.find((o) => Number(o.value) === Number(fatherId))?.label || `ID ${fatherId}`)
      : '-';
    
    const motherId = item.idMother || item.mother_id;
    const motherLabel = motherId
      ? (motherOptions.find((o) => Number(o.value) === Number(motherId))?.label || `ID ${motherId}`)
      : '-';

    const gender = item.sex || item.gender;
    const birthDate = item.birth_date ? new Date(item.birth_date).toLocaleDateString('es-ES') : '-';
    const createdAt = item.created_at ? new Date(item.created_at).toLocaleString('es-ES') : '-';

    return (
      <div className="space-y-2 text-sm">
        <div><strong>ID:</strong> {item.id}</div>
        <div><strong>Registro:</strong> {item.record || '-'}</div>
        <div><strong>Sexo:</strong> {gender || '-'}</div>
        <div><strong>Estado:</strong> {item.status || '-'}</div>
        <div><strong>Raza:</strong> {breedLabel}</div>
        <div><strong>Fecha de nacimiento:</strong> {birthDate}</div>
        <div><strong>Peso (kg):</strong> {item.weight ?? '-'}</div>
        <div><strong>Edad (días):</strong> {item.age_in_days ?? '-'}</div>
        <div><strong>Edad (meses):</strong> {item.age_in_months ?? '-'}</div>
        <div><strong>Adulto:</strong> {item.is_adult === true ? 'Sí' : item.is_adult === false ? 'No' : '-'}</div>
        <div><strong>Padre:</strong> {fatherLabel}</div>
        <div><strong>Madre:</strong> {motherLabel}</div>
        <div><strong>Creado:</strong> {createdAt}</div>
      </div>
    );
  };

  // Función personalizada para renderizar tarjetas de animales
  const renderAnimalCard = (item: AnimalResponse & { [k: string]: any }) => {
    const breedId = item.breeds_id || item.breed_id;
    const breedLabel = breedId
      ? (breedOptions.find((b) => Number(b.value) === Number(breedId))?.label || (item.breed?.name) || `ID ${breedId}`)
      : '-';

    const fatherId = item.idFather || item.father_id;
    const fatherLabel = fatherId
      ? (fatherOptions.find((o) => Number(o.value) === Number(fatherId))?.label || `ID ${fatherId}`)
      : '-';

    const motherId = item.idMother || item.mother_id;
    const motherLabel = motherId
      ? (motherOptions.find((o) => Number(o.value) === Number(motherId))?.label || `ID ${motherId}`)
      : '-';

    const gender = item.sex || item.gender;
    const birthDate = item.birth_date ? new Date(item.birth_date).toLocaleDateString('es-ES') : '-';
    const ageMonths = item.age_in_months ?? '-';
    const weight = item.weight ?? '-';
    const status = item.status || '-';

    return (
      <div className="space-y-3">
        {/* Información básica - mejor distribución para usar el ancho completo */}
        <div className="grid grid-cols-1 gap-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Registro:</span>
            <span className="font-medium text-foreground">{item.record || '-'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Sexo:</span>
            <span className="font-medium text-foreground">{gender || '-'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Estado:</span>
            <span className="font-medium text-foreground">{status}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Edad:</span>
            <span className="font-medium text-foreground">{ageMonths} meses</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Peso:</span>
            <span className="font-medium text-foreground">{weight} kg</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Nacimiento:</span>
            <span className="font-medium text-foreground">{birthDate}</span>
          </div>
        </div>

        {/* Raza con enlace - mejor uso del espacio */}
        <div className="border-t pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Raza:</span>
            {breedId ? (
              <button
                className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors truncate max-w-[60%]"
                onClick={(e) => {
                  e.stopPropagation();
                  openBreedDetailModal(Number(breedId));
                }}
                title="Ver detalle de la raza"
              >
                {breedLabel}
              </button>
            ) : (
              <span className="text-xs font-medium text-muted-foreground">-</span>
            )}
          </div>
        </div>

        {/* Genealogía con enlaces - mejor distribución */}
        <div className="border-t pt-2 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Padre:</span>
            {fatherId ? (
              <button
                className="text-xs font-medium text-green-600 hover:text-green-800 hover:underline transition-colors truncate max-w-[60%]"
                onClick={(e) => {
                  e.stopPropagation();
                  openAnimalDetailModal(Number(fatherId));
                }}
                title="Ver detalle del padre"
              >
                {fatherLabel}
              </button>
            ) : (
              <span className="text-xs font-medium text-muted-foreground">-</span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Madre:</span>
            {motherId ? (
              <button
                className="text-xs font-medium text-purple-600 hover:text-purple-800 hover:underline transition-colors truncate max-w-[60%]"
                onClick={(e) => {
                  e.stopPropagation();
                  openAnimalDetailModal(Number(motherId));
                }}
                title="Ver detalle de la madre"
              >
                {motherLabel}
              </button>
            ) : (
              <span className="text-xs font-medium text-muted-foreground">-</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const crudConfigLocal: CRUDConfig<AnimalResponse & { [k: string]: any }, Partial<AnimalInput>> = {
    title: 'Animales',
    entityName: 'Animal',
    columns,
    formSections: formSectionsLocal,
    searchPlaceholder: 'Buscar animales...',
    emptyStateMessage: 'No hay animales',
    emptyStateDescription: 'Crea el primero para comenzar',
    enableDetailModal: true,
    enableCreateModal: true,
    enableEditModal: true,
    enableDelete: true,
    viewMode,
    renderCard: renderAnimalCard,
    customToolbar: (
      <div className="flex items-center gap-1">
        <Button
          variant={viewMode === 'table' ? 'primary' : 'outline'}
          size="sm"
          className="h-7"
          onClick={() => setViewMode('table')}
          aria-label="Vista en tabla"
        >
          Tabla
        </Button>
        <Button
          variant={viewMode === 'cards' ? 'primary' : 'outline'}
          size="sm"
          className="h-7"
          onClick={() => setViewMode('cards')}
          aria-label="Vista en tarjetas"
        >
          Tarjetas
        </Button>
      </div>
    ),
    customActions: (record) => (
      <>
        <button
          className="icon-btn"
          onClick={(e) => {
            e.stopPropagation();
            openHistoryModal(record as any);
          }}
          title="Ver historial médico completo"
          aria-label="Ver historial"
        >
          <History />
        </button>
        <button
          className="icon-btn"
          onClick={(e) => {
            e.stopPropagation();
            openGeneticTreeModal(record as any);
          }}
          title="Ver árbol de antepasados (padres, abuelos, bisabuelos...)"
          aria-label="Ver árbol genealógico"
        >
          <GitBranch />
        </button>
        <button
          className="icon-btn"
          onClick={(e) => {
            e.stopPropagation();
            openDescendantsTreeModal(record as any);
          }}
          title="Ver árbol de descendientes (hijos, nietos, bisnietos...)"
          aria-label="Ver descendientes"
        >
          <Baby />
        </button>
        <AnimalActionsMenu
          animal={record as AnimalResponse}
          currentUserId={user?.id}
        />
      </>
    ),
    // Verificación exhaustiva de dependencias antes de eliminar
    preDeleteCheck: async (id: number) => {
      // Limpiar caché para evitar dependencias falsas de animales recién creados
      clearAnimalDependencyCache(id);
      return await checkAnimalDependencies(id);
    },
  };

  return (
    <>
      <AdminCRUDPage
        config={crudConfigLocal}
        service={animalsService}
        initialFormData={initialFormData}
        mapResponseToForm={mapResponseToForm}
        validateForm={validateForm}
        customDetailContent={renderAnimalDetail}
        onFormDataChange={setFormData}
        enhancedHover={true}
      />

      {/* Modal de detalle de raza */}
      {isBreedDetailOpen && selectedBreed && (
        <GenericModal
          isOpen={isBreedDetailOpen}
          onOpenChange={setIsBreedDetailOpen}
          title={`Detalle de Raza: ${selectedBreed.name || selectedBreed.id}`}
          description="Información detallada de la raza"
          size="4xl"
          enableBackdropBlur
          className="bg-card text-card-foreground border-border shadow-lg transition-all duration-200 ease-out"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><strong>ID:</strong> {selectedBreed.id}</div>
              <div><strong>Nombre:</strong> {selectedBreed.name || '-'}</div>
              <div><strong>Especie:</strong> {selectedBreed.species?.name || selectedBreed.species_id || '-'}</div>
              <div><strong>Descripción:</strong> {selectedBreed.description || '-'}</div>
              <div><strong>Creado:</strong> {selectedBreed.created_at ? new Date(selectedBreed.created_at).toLocaleString('es-ES') : '-'}</div>
              <div><strong>Actualizado:</strong> {selectedBreed.updated_at ? new Date(selectedBreed.updated_at).toLocaleString('es-ES') : '-'}</div>
            </div>
          </div>
        </GenericModal>
      )}

      {/* Modal de detalle de animal (padre/madre) */}
      {isAnimalDetailOpen && selectedAnimal && (
        <GenericModal
          isOpen={isAnimalDetailOpen}
          onOpenChange={setIsAnimalDetailOpen}
          title={`Detalle de Animal: ${selectedAnimal.record || `ID ${selectedAnimal.id}`}`}
          description="Información detallada del animal"
          size="5xl"
          enableBackdropBlur
          className="bg-card text-card-foreground border-border shadow-lg transition-all duration-200 ease-out"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><strong>ID:</strong> {selectedAnimal.id}</div>
              <div><strong>Registro:</strong> {selectedAnimal.record || '-'}</div>
              <div><strong>Sexo:</strong> {selectedAnimal.sex || selectedAnimal.gender || '-'}</div>
              <div><strong>Estado:</strong> {selectedAnimal.status || '-'}</div>
              <div><strong>Raza:</strong> {selectedAnimal.breed?.name || selectedAnimal.breeds?.name || '-'}</div>
              <div><strong>Fecha de nacimiento:</strong> {selectedAnimal.birth_date ? new Date(selectedAnimal.birth_date).toLocaleDateString('es-ES') : '-'}</div>
              <div><strong>Peso:</strong> {selectedAnimal.weight ? `${selectedAnimal.weight} kg` : '-'}</div>
              <div><strong>Edad:</strong> {selectedAnimal.age_in_months ? `${selectedAnimal.age_in_months} meses` : '-'}</div>
            </div>
            {(selectedAnimal.father_id || selectedAnimal.mother_id) && (
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Genealogía</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>Padre:</strong> {selectedAnimal.father?.record || selectedAnimal.father_id || '-'}</div>
                  <div><strong>Madre:</strong> {selectedAnimal.mother?.record || selectedAnimal.mother_id || '-'}</div>
                </div>
              </div>
            )}
          </div>
        </GenericModal>
      )}

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
            fields: 'id,record,sex,breeds_id,idFather,idMother'
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
            fields: 'id,record,sex,breeds_id,idFather,idMother'
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
}

export default AdminAnimalsPage;