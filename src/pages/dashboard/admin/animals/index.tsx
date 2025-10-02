import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminCRUDPage, CRUDColumn, CRUDFormSection, CRUDConfig } from '@/components/common/AdminCRUDPage';
import { animalsService } from '@/services/animalService';
import type { AnimalResponse, AnimalInput } from '@/types/swaggerTypes';
import { breedsService } from '@/services/breedsService';
import { AnimalHistoryModal } from '@/components/dashboard/AnimalHistoryModal';
import GeneticTreeModal from '@/components/dashboard/GeneticTreeModal';
import { useGeneticTree } from '@/hooks/animal/useGeneticTree';
import DescendantsTreeModal from '@/components/dashboard/DescendantsTreeModal';
import { useDescendantsTree } from '@/hooks/animal/useDescendantsTree';
import { useForeignKeySelect } from '@/hooks/useForeignKeySelect';
import { ANIMAL_GENDERS, ANIMAL_STATES } from '@/constants/enums';
import { History, GitBranch, Baby } from 'lucide-react';
import { useEffect, useState } from 'react';
import { checkAnimalDependencies } from '@/services/dependencyCheckService';

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
  birth_date: new Date().toISOString().split('T')[0],
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
  const [formData, setFormData] = useState<Partial<AnimalInput>>(initialFormData);

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
  const { buildGeneticTree } = useGeneticTree();
  
  const [isDescOpen, setIsDescOpen] = React.useState<boolean>(false);
  const [descAnimal, setDescAnimal] = React.useState<any | null>(null);
  const [descLevels, setDescLevels] = React.useState<any[][]>([]);
  const { buildDescendantsTree } = useDescendantsTree();

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
    {
      key: "acciones",
      label: "Acciones",
      render: (_, record) => (
        <div className="flex gap-1.5">
          <button
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200/60 rounded-lg hover:from-emerald-100 hover:to-emerald-50 hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-1 backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              openHistoryModal(record);
            }}
            title="Ver historial médico completo"
          >
            <History className="w-3.5 h-3.5" />
            <span className="hidden sm:inline"></span>
          </button>
          <button
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200/60 rounded-lg hover:from-blue-100 hover:to-blue-50 hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              openGeneticTreeModal(record);
            }}
            title="Ver árbol de antepasados (padres, abuelos, bisabuelos...)"
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span className="hidden sm:inline"></span>
          </button>
          <button
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-purple-700 bg-gradient-to-br from-purple-50 to-purple-100/50 border border-purple-200/60 rounded-lg hover:from-purple-100 hover:to-purple-50 hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-1 backdrop-blur-sm"
            onClick={(e) => {
              e.stopPropagation();
              openDescendantsTreeModal(record);
            }}
            title="Ver árbol de descendientes (hijos, nietos, bisnietos...)"
          >
            <Baby className="w-3.5 h-3.5" />
            <span className="hidden sm:inline"></span>
          </button>
        </div>
      ),
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
    const { animal, levels } = await buildGeneticTree(id, 10);
    setTreeAnimal(animal);
    setTreeLevels(levels);
    setIsTreeOpen(true);
  };

  const openDescendantsTreeModal = async (record: AnimalResponse & { [k: string]: any }) => {
    const id = Number(record.id ?? 0);
    if (!id) return;
    const { animal, levels } = await buildDescendantsTree(id, 10);
    setDescAnimal(animal);
    setDescLevels(levels);
    setIsDescOpen(true);
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
    // Verificación exhaustiva de dependencias antes de eliminar
    preDeleteCheck: async (id: number) => {
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
        }}
        animal={treeAnimal}
        levels={treeLevels}
      />

      <DescendantsTreeModal
        isOpen={isDescOpen}
        onClose={() => {
          setIsDescOpen(false);
          setDescAnimal(null);
          setDescLevels([]);
        }}
        animal={descAnimal}
        levels={descLevels}
      />
    </>
  );
}

export default AdminAnimalsPage;