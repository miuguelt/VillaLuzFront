import React from 'react';
import { AdminCRUDPage, CRUDColumn, CRUDFormSection, CRUDConfig } from '@/components/common/AdminCRUDPage';
import { speciesService } from '@/services/speciesService';
import type { SpeciesResponse, SpeciesInput } from '@/types/swaggerTypes';
import { checkSpeciesDependencies } from '@/services/dependencyCheckService';

// Columnas de la tabla (mostrar únicamente name)
const columns: CRUDColumn<SpeciesResponse & { [k: string]: any }>[] = [
  { key: 'name', label: 'name' },
];

// Secciones del formulario (sin cambios funcionales)
const formSections: CRUDFormSection<SpeciesInput>[] = [
  {
    title: 'Información Básica',
    gridCols: 2,
    fields: [
      { name: 'name', label: 'Nombre', type: 'text', required: true, placeholder: 'Ej: Bovino' },
      { name: 'description', label: 'Descripción', type: 'textarea', placeholder: 'Descripción de la especie', colSpan: 2 },
    ],
  },
];

// Configuración CRUD
const crudConfig: CRUDConfig<SpeciesResponse & { [k: string]: any }, SpeciesInput> = {
  title: 'Especies',
  entityName: 'Especie',
  columns,
  formSections,
  searchPlaceholder: 'Buscar especies...',
  emptyStateMessage: 'No hay especies disponibles.',
  emptyStateDescription: 'Crea la primera para comenzar.',
  enableDetailModal: true, // Habilitado
  enableCreateModal: true,
  enableEditModal: true,
  enableDelete: true,
  // Correcciones de modales
  showEditTimestamps: false,
  showDetailTimestamps: false,
  showIdInDetailTitle: false, // ocultar el id del título
  confirmDeleteTitle: '¿Eliminar especie?',
  confirmDeleteDescription: 'Esta acción no se puede deshacer. Se eliminará la especie de forma permanente.',
  // Verificación de dependencias antes de eliminar
  preDeleteCheck: async (id: number) => {
    return await checkSpeciesDependencies(id);
  },
};

// Mapear respuesta a formulario
const mapResponseToForm = (item: SpeciesResponse & { [k: string]: any }): SpeciesInput => ({
  name: item.name || '',
  description: item.description || '',
});

// Validación simple
const validateForm = (formData: SpeciesInput): string | null => {
  if (!formData.name || !formData.name.trim()) return 'El nombre es obligatorio.';
  return null;
};

// Datos iniciales
const initialFormData: SpeciesInput = {
  name: '',
  description: '',
};

// Página principal
const AdminSpeciesPage = () => (
  <AdminCRUDPage
    config={crudConfig}
    service={speciesService}
    initialFormData={initialFormData}
    mapResponseToForm={mapResponseToForm}
    validateForm={validateForm}
  />
);

export default AdminSpeciesPage;
