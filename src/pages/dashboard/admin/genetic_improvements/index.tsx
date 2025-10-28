import React, { useMemo } from 'react';
import { AdminCRUDPage, CRUDColumn, CRUDFormSection, CRUDConfig } from '@/components/common/AdminCRUDPage';
import { geneticImprovementsService } from '@/services/geneticImprovementsService';
import { animalsService } from '@/services/animalService';
import type {
  AdminGeneticImprovementResponse,
  AdminGeneticImprovementInput,
  GeneType,
  EnhancementLevel,
} from '@/types/adminGeneticImprovementsTypes';
import { getTodayColombia } from '@/utils/dateUtils';

// Opciones para selects
const geneTypeOptions = [
  { value: 'Resistencia a enfermedades', label: 'Resistencia a enfermedades' },
  { value: 'Productividad láctea', label: 'Productividad láctea' },
  { value: 'Crecimiento muscular', label: 'Crecimiento muscular' },
  { value: 'Fertilidad', label: 'Fertilidad' },
  { value: 'Calidad de carne', label: 'Calidad de carne' },
  { value: 'Adaptación climática', label: 'Adaptación climática' },
  { value: 'Otros', label: 'Otros' },
];

const enhancementLevelOptions = [
  { value: 'Bajo', label: 'Bajo' },
  { value: 'Medio', label: 'Medio' },
  { value: 'Alto', label: 'Alto' },
  { value: 'Experimental', label: 'Experimental' },
];

const statusOptions = [
  { value: 'Activo', label: 'Activo' },
  { value: 'Inactivo', label: 'Inactivo' },
  { value: 'En desarrollo', label: 'En desarrollo' },
  { value: 'Completado', label: 'Completado' },
];

// Configuración de secciones del formulario
const formSections: CRUDFormSection<AdminGeneticImprovementInput>[] = [
  {
    title: 'Información de Mejora Genética',
    gridCols: 2,
    fields: [
      {
        name: 'date',
        label: 'Fecha',
        type: 'date' as const,
        required: true,
      },
      {
        name: 'animal_id',
        label: 'ID Animal',
        type: 'number' as const,
        required: true,
        placeholder: 'ID del animal',
      },
      {
        name: 'genetic_event_technique',
        label: 'Técnica del Evento Genético',
        type: 'text' as const,
        required: true,
        placeholder: 'Técnica utilizada',
      },
      {
        name: 'details',
        label: 'Detalles',
        type: 'textarea' as const,
        required: true,
        placeholder: 'Detalles de la mejora genética',
        colSpan: 2,
      },
      {
        name: 'results',
        label: 'Resultados',
        type: 'textarea' as const,
        required: true,
        placeholder: 'Resultados obtenidos',
        colSpan: 2,
      },
    ],
  },
];

// Configuración completa del CRUD (sin columns, se pasa dinámicamente)
const crudConfigBase = {
  title: 'Mejoras Genéticas',
  entityName: 'Mejora Genética',
  formSections,
  searchPlaceholder: 'Buscar mejoras genéticas...',
  emptyStateMessage: 'No hay mejoras genéticas disponibles.',
  emptyStateDescription: 'Crea la primera mejora genética para comenzar.',
  enableDetailModal: true,
  enableCreateModal: true,
  enableEditModal: true,
  enableDelete: true,
};

// Función para mapear respuesta de API a datos del formulario
const mapResponseToForm = (item: AdminGeneticImprovementResponse): AdminGeneticImprovementInput => ({
  animal_id: item.animal_id,
  date: item.date,
  details: item.details || '',
  results: item.results || '',
  genetic_event_technique: item.genetic_event_technique || '',
});

// Función de validación del formulario
const validateForm = (formData: AdminGeneticImprovementInput): string | null => {
  if (!formData.date?.trim()) {
    return 'La fecha es obligatoria.';
  }
  if (!formData.animal_id || formData.animal_id <= 0) {
    return 'El ID del animal es obligatorio y debe ser mayor a 0.';
  }
  if (!formData.genetic_event_technique?.trim()) {
    return 'La técnica del evento genético es obligatoria.';
  }
  if (!formData.details?.trim()) {
    return 'Los detalles son obligatorios.';
  }
  if (!formData.results?.trim()) {
    return 'Los resultados son obligatorios.';
  }
  return null;
};

// Contenido personalizado para el modal de detalle
const customDetailContent = (item: AdminGeneticImprovementResponse) => (
  <div className="space-y-6">
    {/* Información básica */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <h4 className="font-medium text-foreground mb-2">Información General</h4>
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">ID:</dt>
            <dd className="font-medium">{item.id}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">ID Animal:</dt>
            <dd className="font-medium">{item.animal_id}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Técnica:</dt>
            <dd className="font-medium">{item.genetic_event_technique}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Fecha:</dt>
            <dd className="font-medium">{new Date(item.date).toLocaleDateString('es-ES')}</dd>
          </div>
        </dl>
      </div>
    </div>

    {/* Detalles y Resultados */}
    <div className="space-y-4">
      {item.details && (
        <div>
          <h4 className="font-medium text-foreground mb-2">Detalles</h4>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.details}</p>
        </div>
      )}
      {item.results && (
        <div>
          <h4 className="font-medium text-foreground mb-2">Resultados</h4>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.results}</p>
        </div>
      )}
    </div>

    {/* Fechas del sistema */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
      <div>
        <dt className="text-muted-foreground">Creado:</dt>
        <dd className="font-medium">{new Date(item.created_at).toLocaleString('es-ES')}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Actualizado:</dt>
        <dd className="font-medium">{new Date(item.updated_at).toLocaleString('es-ES')}</dd>
      </div>
    </div>
  </div>
);

// Datos iniciales del formulario
const initialFormData: AdminGeneticImprovementInput = {
  animal_id: undefined as any, // Forzar que el usuario seleccione
  date: getTodayColombia(),
  details: '',
  results: '',
  genetic_event_technique: '',
};

// Componente principal
const AdminGeneticImprovementsPage = () => {
  const [animalOptions, setAnimalOptions] = React.useState<Array<{ value: number; label: string }>>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const list: any = await animalsService.getAll?.({ page: 1, page_size: 1000 } as any);
        const arr: any[] = Array.isArray(list) ? list : (list?.items ?? list?.data ?? list?.results ?? []);
        setAnimalOptions(arr.map((a: any) => ({ value: a.id, label: a.record || `ID ${a.id}` })));
      } catch {
        setAnimalOptions([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Crear mapa de búsqueda optimizado
  const animalMap = useMemo(() => {
    const map = new Map<number, string>();
    animalOptions.forEach(opt => map.set(opt.value, opt.label));
    return map;
  }, [animalOptions]);

  // Configuración de columnas para la tabla
  const columns: CRUDColumn<AdminGeneticImprovementResponse>[] = useMemo(() => [
    // Eliminado columna ID según requerimiento de ocultar Potreros presentes en el JSON de respuesta
    // {
    //   key: 'id',
    //   label: 'ID',
    //   width: 12,
    // },
    {
      key: 'genetic_event_technique' as any,
      label: 'Técnica',
      render: (value) => value || '-',
    },
    {
      key: 'details' as any,
      label: 'Detalles',
      render: (value) => value || '-',
    },
    {
      key: 'results' as any,
      label: 'Resultado',
      render: (value) => value || '-',
    },
    {
      key: 'date' as any,
      label: 'Fecha',
      render: (value) => (value ? new Date(value as string).toLocaleDateString('es-ES') : '-'),
    },
    {
      key: 'animal_id' as any,
      label: 'Animal',
      render: (value: any) => animalMap.get(Number(value)) || `Animal ${value}` || '-'
    },
    // Ocultamos created_at (está en el JSON de respuesta dado)
    // {
    //   key: 'created_at',
    //   label: 'Creado',
    //   render: (value) => value ? new Date(value as string).toLocaleDateString('es-ES') : '-',
    // },
  ], [animalMap]);

  const formSectionsWithAnimalSelect = React.useMemo(() => {
    return formSections.map((sec) => ({
      ...sec,
      fields: sec.fields.map((f) => (
        (f as any).name === 'animal_id'
          ? { ...(f as any), label: 'Animal (opcional)', type: 'select', options: animalOptions }
          : f
      )),
    }));
  }, [animalOptions]);

  // No renderizar hasta que las opciones estén cargadas para evitar mostrar IDs
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando mejoras genéticas...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminCRUDPage
      config={{ ...crudConfigBase, columns, formSections: formSectionsWithAnimalSelect }}
      service={geneticImprovementsService}
      initialFormData={initialFormData}
      mapResponseToForm={mapResponseToForm}
      validateForm={validateForm}
      customDetailContent={customDetailContent}
      realtime={true}
      pollIntervalMs={8000}
      refetchOnFocus={true}
      refetchOnReconnect={true}
      enhancedHover={true}
    />
  );
};

export default AdminGeneticImprovementsPage;
