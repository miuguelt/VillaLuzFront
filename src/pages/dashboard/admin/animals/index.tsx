import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Edit } from 'lucide-react';
import { AdminCRUDPage, CRUDColumn, CRUDFormSection, CRUDConfig } from '@/shared/ui/common/AdminCRUDPage';
import { animalsService } from '@/entities/animal/api/animal.service';
import type { AnimalResponse, AnimalInput } from '@/shared/api/generated/swaggerTypes';
import { breedsService } from '@/entities/breed/api/breeds.service';
import { getTodayColombia } from '@/shared/utils/dateUtils';

import { AnimalHistoryModal } from '@/widgets/dashboard/AnimalHistoryModal';
import GeneticTreeModal from '@/widgets/dashboard/GeneticTreeModal';
import { useAnimalTreeApi, graphToAncestorLevels, graphToDescendantLevels } from '@/entities/animal/model/useAnimalTreeApi';
import DescendantsTreeModal from '@/widgets/dashboard/DescendantsTreeModal';
import { useForeignKeySelect } from '@/shared/hooks/useForeignKeySelect';
import { ANIMAL_GENDERS } from '@/shared/constants/enums';
import { useState } from 'react';
import { useGlobalViewMode } from '@/shared/hooks/useGlobalViewMode';
import { checkAnimalDependencies, clearAnimalDependencyCache } from '@/features/diagnostics/api/dependencyCheck.service';
import { Button } from '@/shared/ui/button';
import { GenericModal } from '@/shared/ui/common/GenericModal';
import { AnimalActionsMenu } from '@/widgets/dashboard/AnimalActionsMenu';
import { useAuth } from '@/features/auth/model/useAuth';
import { BreedLink, AnimalLink } from '@/shared/ui/common/ForeignKeyHelpers';
import { AnimalCard } from '@/widgets/dashboard/animals/AnimalCard';
import { AnimalModalContent } from '@/widgets/dashboard/animals/AnimalModalContent';
import { AnimalImagePreUpload } from '@/widgets/dashboard/animals/AnimalImagePreUpload';
import { animalImageService } from '@/entities/animal/api/animalImage.service';
import { useToast } from '@/app/providers/ToastContext';

const ANIMAL_STATUS_OPTIONS = [
  { value: 'Vivo', label: 'Vivo' },
  { value: 'Vendido', label: 'Vendido' },
  { value: 'Muerto', label: 'Muerto' },
] as const;

const normalizeGender = (value: unknown): AnimalInput['gender'] | undefined => {
  if (value === null || value === undefined) return undefined;
  const normalized = String(value).trim().toLowerCase();
  let mapped: AnimalInput['gender'] | undefined;
  if (['m', 'macho', 'male'].includes(normalized)) mapped = 'Macho';
  if (['f', 'hembra', 'female'].includes(normalized)) mapped = 'Hembra';
  if (['c', 'castrado', 'castrated'].includes(normalized)) mapped = 'Castrado';
  if (!mapped) return undefined;
  return ANIMAL_GENDERS.some((opt) => opt.value === mapped) ? mapped : undefined;
};

const normalizeStatus = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined;
  const normalized = String(value).trim().toLowerCase();
  let mapped: string | undefined;
  if (['vivo', 'activo', 'sano'].includes(normalized)) mapped = 'Vivo';
  if (['vendido', 'sold'].includes(normalized)) mapped = 'Vendido';
  if (['muerto', 'fallecido', 'dead'].includes(normalized)) mapped = 'Muerto';
  if (!mapped) return undefined;
  return ANIMAL_STATUS_OPTIONS.some((opt) => opt.value === mapped) ? mapped : undefined;
};

const toNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === '') return undefined;
  const num = Number(value);
  return Number.isNaN(num) ? undefined : num;
};

// Mapear respuesta del backend al formulario
const mapResponseToForm = (item: AnimalResponse & { [k: string]: any }): Partial<AnimalInput> => {
  const status = normalizeStatus(item.status ?? item.estado) || 'Vivo';
  return {
    record: item.record || item.code || item.registro || '',
    birth_date: item.birth_date || item.birthDate || item.fecha_nacimiento,
    weight: toNumber(item.weight ?? item.peso),
    breed_id: toNumber(item.breeds_id ?? item.breed_id ?? item.breedId ?? item.raza_id),
    gender: normalizeGender(item.sex ?? item.gender ?? item.sexo ?? item.genero),
    status: status as any,
    father_id: toNumber(item.idFather ?? item.father_id ?? item.padre_id ?? item.fatherId),
    mother_id: toNumber(item.idMother ?? item.mother_id ?? item.madre_id ?? item.motherId),
    notes: item.notes ?? item.observations ?? item.observaciones ?? '',
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
  status: 'Vivo' as any,
  father_id: undefined,
  mother_id: undefined,
  notes: '',
};

function AdminAnimalsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [, setFormData] = useState<Partial<AnimalInput>>(initialFormData);
  const [viewMode, setViewMode] = useGlobalViewMode();

  // Estado para imágenes pre-seleccionadas durante la creación
  const [pendingImages, setPendingImages] = useState<File[]>([]);

  // Preferencia global ya persistida en el hook

  // Hook para razas - usar getPaginated con límite alto para obtener todas
  const {
    options: breedOptions,
    loading: _loadingBreeds,
    handleSearch: _handleSearchBreeds,
  } = useForeignKeySelect(
    (params) => breedsService.getPaginated({ ...params, limit: 1000 }),
    (b: { id: number; name: string }) => ({ value: b.id, label: b.name }),
    undefined,
    1000
  );

  // Hook para padres (solo machos) - cargar todos con límite alto
  const {
    options: fatherOptions,
    loading: _loadingFathers,
    refresh: refreshFathers,
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
    loading: _loadingMothers,
    refresh: refreshMothers,
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
          options: ANIMAL_STATUS_OPTIONS as any
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
    { key: 'record', label: 'Registro', width: 15 },
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
        if (!breedId) return '-';
        const id = Number(breedId);
        const label = breedOptions.find((b) => Number(b.value) === id)?.label || `Raza ${id}`;
        return <BreedLink id={id} label={label} />;
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
        if (!fatherId) return '-';
        const id = Number(fatherId);
        const label = fatherOptions.find((o) => Number(o.value) === id)?.label || `Animal ${id}`;
        return <AnimalLink id={id} label={label} />;
      }
    },
    {
      key: 'mother_id',
      label: 'Madre',
      render: (v, record) => {
        const motherId = v || record.idMother || record.mother_id;
        if (!motherId) return '-';
        const id = Number(motherId);
        const label = motherOptions.find((o) => Number(o.value) === id)?.label || `Animal ${id}`;
        return <AnimalLink id={id} label={label} />;
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
  const _openBreedDetailModal = async (breedId: number) => {
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

  // Función personalizada para renderizar las tarjetas de animales
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

    return (
      <AnimalCard
        animal={item}
        breedLabel={breedLabel}
        fatherLabel={fatherLabel}
        motherLabel={motherLabel}
        onFatherClick={openAnimalDetailModal}
        onMotherClick={openAnimalDetailModal}
        hideFooterActions
      />
    );
  };

  // Contenido personalizado para el modal de detalle con imágenes
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

    return (
      <AnimalModalContent
        animal={item}
        breedLabel={breedLabel}
        fatherLabel={fatherLabel}
        motherLabel={motherLabel}
        onFatherClick={openAnimalDetailModal}
        onMotherClick={openAnimalDetailModal}
        currentUserId={user?.id}
        onOpenHistory={() => openHistoryModal(item)}
        onOpenAncestorsTree={() => openGeneticTreeModal(item)}
        onOpenDescendantsTree={() => openDescendantsTreeModal(item)}
        onEdit={() => {
          const search = new URLSearchParams(window.location.search);
          search.set('edit', String(item.id));
          if (search.has('detail')) search.delete('detail'); // Intentar cerrar el detalle limpiando el param
          navigate(`?${search.toString()}`);
        }}
        onReplicate={() => {
          // Navegar a create=true
          const search = new URLSearchParams(window.location.search);
          search.set('create', 'true');
          if (search.has('detail')) search.delete('detail');
          navigate(`?${search.toString()}`);
          showToast('Modo creación iniciado. Ingrese los detalles del nuevo animal.', 'info');
        }}
      />
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
      <div className="flex items-center gap-1">
        <AnimalActionsMenu
          animal={record as AnimalResponse}
          currentUserId={user?.id}
          onOpenHistory={() => openHistoryModal(record as any)}
          onOpenAncestorsTree={() => openGeneticTreeModal(record as any)}
          onOpenDescendantsTree={() => openDescendantsTreeModal(record as any)}
        />
      </div>
    ),
    // Verificación exhaustiva de dependencias antes de eliminar
    preDeleteCheck: async (id: number) => {
      // Limpiar caché para evitar dependencias falsas de animales recién creados
      clearAnimalDependencyCache(id);
      return await checkAnimalDependencies(id);
    },
    // Refrescar dropdowns después de crear/actualizar animales
    onAfterCreate: async (createdAnimal) => {
      console.log('[AdminAnimalsPage] Animal creado, refrescando dropdowns:', createdAnimal);

      // Refrescar listas de padre y madre para que aparezcan animales nuevos
      refreshFathers();
      refreshMothers();

      // Subir imágenes pendientes si existen
      if (pendingImages.length > 0 && createdAnimal?.id) {
        console.log(`[AdminAnimalsPage] Subiendo ${pendingImages.length} imágenes para el animal ${createdAnimal.id}`);
        try {
          const uploadResponse = await animalImageService.uploadImages(
            createdAnimal.id,
            pendingImages,
            {
              compress: true,
              quality: 0.8,
            }
          );

          if (uploadResponse.success) {
            console.log(`[AdminAnimalsPage] ${uploadResponse.data.total_uploaded} imagen(es) subida(s) exitosamente`);

            // Despachar evento global para refrescar galerías
            window.dispatchEvent(new CustomEvent('animal-images:updated', {
              detail: { animalId: createdAnimal.id, uploaded: uploadResponse.data.uploaded }
            }));
          }
        } catch (err) {
          console.error('[AdminAnimalsPage] Error al subir imágenes:', err);
        } finally {
          // Limpiar imágenes pendientes
          setPendingImages([]);
        }
      }
    },
    onAfterUpdate: async (updatedAnimal) => {
      console.log('[AdminAnimalsPage] Animal actualizado, refrescando dropdowns:', updatedAnimal);
      // Refrescar listas de padre y madre para reflejar cambios de nombre
      refreshFathers();
      refreshMothers();
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
        realtime={true}
        pollIntervalMs={0}
        refetchOnFocus={false}
        refetchOnReconnect={true}
        cache={true}
        cacheTTL={300000}
        enhancedHover={true}
        additionalFormContent={(_formData, editingItem) => {
          // Solo mostrar selector de imágenes durante la creación (no en edición)
          if (editingItem) return null;

          return (
            <div className="relative rounded-xl p-4 border border-border/40 bg-gradient-to-br from-card/30 via-card/20 to-transparent shadow-sm backdrop-blur-sm">
              <div className="mb-4 pb-2 border-b border-border/30">
                <h3 className="text-base sm:text-lg font-semibold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  Imágenes del Animal (Opcional)
                </h3>
              </div>
              <AnimalImagePreUpload
                files={pendingImages}
                onChange={setPendingImages}
                maxFiles={20}
              />
            </div>
          );
        }}
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
      {isAnimalDetailOpen && selectedAnimal && (() => {
        const breedId = selectedAnimal.breeds_id || selectedAnimal.breed_id;
        const breedLabel = breedId
          ? (breedOptions.find((b) => Number(b.value) === Number(breedId))?.label || (selectedAnimal.breed?.name) || `ID ${breedId}`)
          : '-';

        const fatherId = selectedAnimal.idFather || selectedAnimal.father_id;
        const fatherLabel = fatherId
          ? (fatherOptions.find((o) => Number(o.value) === Number(fatherId))?.label || `ID ${fatherId}`)
          : '-';

        const motherId = selectedAnimal.idMother || selectedAnimal.mother_id;
        const motherLabel = motherId
          ? (motherOptions.find((o) => Number(o.value) === Number(motherId))?.label || `ID ${motherId}`)
          : '-';

        return (
          <GenericModal
            isOpen={isAnimalDetailOpen}
            onOpenChange={setIsAnimalDetailOpen}
            title={`Detalle del Animal: ${selectedAnimal.id}`}
            description="Información detallada del animal"
            size="full"
            variant="compact"
            enableBackdropBlur
            className="bg-card text-card-foreground border-border shadow-lg transition-all duration-200 ease-out"
            footer={(
              <div className="border-t border-border/40 bg-gradient-to-r from-muted/30 via-muted/20 to-muted/30 px-4 sm:px-6 py-3">
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  {/* Navegación deshabilitada (estética igual al detalle principal) */}
                  <div className="flex gap-2 sm:flex-1">
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      disabled
                      className="flex-1 sm:flex-initial transition-all duration-150"
                    >
                      <ChevronLeft className="h-4 w-4 sm:mr-1" />
                      <span className="hidden sm:inline">Anterior</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      disabled
                      className="flex-1 sm:flex-initial transition-all duration-150"
                    >
                      <span className="hidden sm:inline">Siguiente</span>
                      <ChevronRight className="h-4 w-4 sm:ml-1" />
                    </Button>
                  </div>

                  {/* Acciones principales */}
                  <div className="flex gap-2 sm:justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={() => setIsAnimalDetailOpen(false)}
                      className="flex-1 sm:flex-initial transition-all duration-150 hover:shadow-sm active:scale-[0.98]"
                    >
                      Cerrar
                    </Button>
                    <Button
                      size="sm"
                      type="button"
                      onClick={() => {
                        // Disparar la edición usando el mecanismo de AdminCRUDPage (query param ?edit=ID)
                        const search = new URLSearchParams(window.location.search);
                        search.set('edit', String(selectedAnimal.id));
                        const qs = `?${search.toString()}`;
                        navigate(qs);
                        setIsAnimalDetailOpen(false);
                      }}
                      className="flex-1 sm:flex-initial transition-all duration-150 hover:shadow-sm active:scale-[0.98]"
                    >
                      <Edit className="h-4 w-4 sm:mr-1" />
                      <span className="hidden sm:inline">Editar</span>
                    </Button>
                  </div>
                </div>
              </div>
            )}
          >
            <AnimalModalContent
              animal={selectedAnimal}
              breedLabel={breedLabel}
              fatherLabel={fatherLabel}
              motherLabel={motherLabel}
              onFatherClick={openAnimalDetailModal}
              onMotherClick={openAnimalDetailModal}
              currentUserId={user?.id}
              onOpenHistory={() => openHistoryModal(selectedAnimal)}
              onOpenAncestorsTree={() => openGeneticTreeModal(selectedAnimal)}
              onOpenDescendantsTree={() => openDescendantsTreeModal(selectedAnimal)}
            />
          </GenericModal>
        );
      })()}

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
        onNavigateToAnimal={openGeneticTreeModal}
        onOpenDescendantsTreeForAnimal={openDescendantsTreeModal}
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
        onNavigateToAnimal={openDescendantsTreeModal}
        onOpenAncestorsTreeForAnimal={openGeneticTreeModal}
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
