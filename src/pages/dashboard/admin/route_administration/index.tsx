import React from 'react';
import { AdminCRUDPage, CRUDColumn, CRUDFormSection, CRUDConfig } from '@/components/common/AdminCRUDPage';
import { routeAdministrationsService } from '@/services/routeAdministrationsService';
import type { RouteAdministrationResponse, RouteAdministrationInput } from '@/types/swaggerTypes';

// Columnas (width numérico -> w-{n})
const columns: CRUDColumn<RouteAdministrationResponse & { [k: string]: any }>[] = [
  { key: 'id', label: 'ID', width: 12 },
  { key: 'name', label: 'Nombre' },
  { key: 'description', label: 'Descripción', render: (v) => v || '-' },
  { key: 'status', label: 'Estado', render: (v) => (v ? 'Activa' : 'Inactiva') },
  { key: 'created_at', label: 'Creado', render: (v) => (v ? new Date(v as string).toLocaleDateString('es-ES') : '-') },
];

// Secciones del formulario
const formSections: CRUDFormSection<RouteAdministrationInput>[] = [
  {
    title: 'Información Básica',
    gridCols: 2,
    fields: [
      { name: 'name', label: 'Nombre', type: 'text', required: true, placeholder: 'Ej: Oral' },
      { name: 'status', label: 'Activa', type: 'checkbox' },
      { name: 'description', label: 'Descripción', type: 'textarea', placeholder: 'Descripción breve', colSpan: 2 },
    ],
  },
];

// Configuración CRUD
const crudConfig: CRUDConfig<RouteAdministrationResponse & { [k: string]: any }, RouteAdministrationInput> = {
  title: 'Rutas de Administración',
  entityName: 'Ruta de Administración',
  columns,
  formSections,
  searchPlaceholder: 'Buscar rutas...',
  emptyStateMessage: 'No hay rutas de administración disponibles.',
  emptyStateDescription: 'Crea la primera para comenzar.',
  enableDetailModal: true,
  enableCreateModal: true,
  enableEditModal: true,
  enableDelete: true,
};

// Mapear respuesta a formulario
const mapResponseToForm = (item: RouteAdministrationResponse & { [k: string]: any }): RouteAdministrationInput => ({
  name: item.name || '',
  description: item.description || '',
  status: item.status ?? true,
});

// Validación
const validateForm = (formData: RouteAdministrationInput): string | null => {
  if (!formData.name || !formData.name.trim()) return 'El nombre es obligatorio.';
  return null;
};

// Datos iniciales
const initialFormData: RouteAdministrationInput = {
  name: '',
  description: '',
  status: true,
};

// Página principal
const AdminRouteAdministrationPage = () => (
  <AdminCRUDPage
    config={crudConfig}
    service={routeAdministrationsService}
    initialFormData={initialFormData}
    mapResponseToForm={mapResponseToForm}
    validateForm={validateForm}
  />
);

export default AdminRouteAdministrationPage;
