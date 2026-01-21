import React from 'react';
import { AdminCRUDPage, CRUDColumn, CRUDFormSection, CRUDConfig } from '@/shared/ui/common/AdminCRUDPage';
import { diseaseService } from '@/entities/disease/api/disease.service';
import { animalDiseasesService } from '@/entities/animal-disease/api/animalDiseases.service';
import type { DiseaseResponse } from '@/shared/api/generated/swaggerTypes';

// Columnas de la tabla (width numérico -> w-{n})
const columns: CRUDColumn<DiseaseResponse & { [k: string]: any }>[] = [
  
  { key: 'name', label: 'Nombre', render: (_v, item) => (item as any).name ?? (item as any).disease ?? '-' },
  { key: 'symptoms', label: 'Síntomas', render: (v) => v || '-' },
  { key: 'details', label: 'Detalles', render: (_v, item) => (item as any).details ?? (item as any).description ?? '-' },
  { key: 'created_at', label: 'Creado', render: (v) => (v ? new Date(v as string).toLocaleDateString('es-ES') : '-') },
];

// Tipo de formulario alineado con el backend
type DiseaseForm = {
  name: string;
  symptoms?: string;
  details?: string;
};

// Secciones del formulario
const formSections: CRUDFormSection<DiseaseForm>[] = [
  {
    title: 'Información Básica',
    gridCols: 2,
    fields: [
      { name: 'name', label: 'Nombre de la Enfermedad', type: 'text', required: true, placeholder: 'Ej: Brucelosis' },
      { name: 'symptoms', label: 'Síntomas', type: 'textarea', placeholder: 'Describa síntomas...' },
      { name: 'details', label: 'Detalles', type: 'textarea', placeholder: 'Detalles y descripción general...', colSpan: 2 },
    ],
  },
];

// Configuración CRUD
const crudConfig: CRUDConfig<DiseaseResponse & { [k: string]: any }, DiseaseForm> = {
  title: 'Enfermedades',
  entityName: 'Enfermedad',
  columns,
  formSections,
  searchPlaceholder: 'Buscar enfermedades...',
  emptyStateMessage: 'No hay enfermedades disponibles.',
  emptyStateDescription: 'Crea el primer registro para comenzar.',
  enableDetailModal: true,
  enableCreateModal: true,
  enableEditModal: true,
  enableDelete: true,
  preDeleteCheck: async (id: number) => {
    try {
      const resp = await animalDiseasesService.getAnimalDiseases({ page: 1, limit: 1, disease_id: id as any });
      const items = (resp as any)?.data || (resp as any)?.items || resp || [];
      if (Array.isArray(items) && items.length > 0) {
        return {
          hasDependencies: true,
          message: 'No se puede eliminar esta enfermedad porque tiene animales enfermos asociados.'
        };
      }
    } catch {
      return {
        hasDependencies: true,
        message: 'No se pudo verificar dependencias. Intente de nuevo en unos segundos.'
      };
    }
    return { hasDependencies: false };
  },
};

// Mapear respuesta a formulario
const mapResponseToForm = (item: DiseaseResponse & { [k: string]: any }): DiseaseForm => ({
  name: (item as any).name ?? (item as any).disease ?? '',
  symptoms: item.symptoms ?? '',
  details: (item as any).details ?? (item as any).description ?? '',
});

// Validación simple
const validateForm = (formData: DiseaseForm): string | null => {
  if (!formData.name || !formData.name.trim()) return 'El nombre de la enfermedad es obligatorio.';
  return null;
};

// Datos iniciales
const initialFormData: DiseaseForm = {
  name: '',
  symptoms: '',
  details: '',
};

// Página principal
const AdminDiseasesPage = () => (
  <AdminCRUDPage
    config={crudConfig}
    service={diseaseService}
    initialFormData={initialFormData}
    mapResponseToForm={mapResponseToForm}
    validateForm={validateForm}
    realtime={true}
    pollIntervalMs={0}
    refetchOnFocus={false}
    refetchOnReconnect={true}
    cache={true}
    cacheTTL={300000}
    enhancedHover={true}
  />
);

export default AdminDiseasesPage;
