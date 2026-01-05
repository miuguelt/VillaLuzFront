import React from 'react';
import { AdminCRUDPage, CRUDColumn, CRUDFormSection, CRUDConfig } from '@/shared/ui/common/AdminCRUDPage';
import { foodTypesService } from '@/entities/food-type/api/foodTypes.service';
import type { FoodTypeResponse } from '@/shared/api/generated/swaggerTypes';

// Columnas de la tabla (width numérico -> w-{n})
const columns: CRUDColumn<FoodTypeResponse & { [k: string]: any }>[] = [
  
  { key: 'food_type', label: 'Nombre', render: (_v, item) => item.name || item.food_type },
  { key: 'description', label: 'Descripción', render: (v, item) => (v || (item as any).handlings || '-') },
  { key: 'created_at', label: 'Creado', render: (v) => (v ? new Date(v as string).toLocaleDateString('es-ES') : '-') },
];

// Tipo de formulario alineado con el backend
type FoodTypeForm = {
  food_type: string;
  handlings?: string;
  sowing_date?: string;
  harvest_date?: string;
  area?: number;
  gauges?: string;
};

// Secciones del formulario
const formSections: CRUDFormSection<FoodTypeForm>[] = [
  {
    title: 'Información Básica',
    gridCols: 2,
    fields: [
      { name: 'food_type', label: 'Tipo de Alimento', type: 'text', required: true, placeholder: 'Ej: Pasto de corte' },
      { name: 'handlings', label: 'Manejos/Descripción', type: 'textarea', placeholder: 'Descripción breve...', colSpan: 2 },
    ],
  },
  {
    title: 'Detalles (opcional)',
    gridCols: 3,
    fields: [
      { name: 'sowing_date', label: 'Fecha de Siembra', type: 'date' },
      { name: 'harvest_date', label: 'Fecha de Cosecha', type: 'date' },
      { name: 'area', label: 'Área (m²/ha)', type: 'number' },
      { name: 'gauges', label: 'Calibres', type: 'textarea', placeholder: 'Notas de calibres', colSpan: 3 },
    ],
  },
];

// Configuración CRUD
const crudConfig: CRUDConfig<FoodTypeResponse & { [k: string]: any }, FoodTypeForm> = {
  title: 'Tipos de Alimento',
  entityName: 'Tipo de Alimento',
  columns,
  formSections,
  searchPlaceholder: 'Buscar tipos de alimento...',
  emptyStateMessage: 'No hay tipos de alimento',
  emptyStateDescription: 'Crea el primero para comenzar',
  enableDetailModal: true,
  enableCreateModal: true,
  enableEditModal: true,
  enableDelete: true,
};

// Mapear respuesta a formulario
const mapResponseToForm = (item: FoodTypeResponse & { [k: string]: any }): FoodTypeForm => ({
  food_type: item.food_type || (item as any).name || '',
  handlings: item.handlings || (item as any).description || '',
  sowing_date: item.sowing_date,
  harvest_date: item.harvest_date,
  area: item.area,
  gauges: item.gauges,
});

// Validación simple
const validateForm = (formData: FoodTypeForm): string | null => {
  if (!formData.food_type || !formData.food_type.trim()) return 'El tipo de alimento es obligatorio.';
  return null;
};

// Datos iniciales
const initialFormData: FoodTypeForm = {
  food_type: '',
  handlings: '',
  sowing_date: undefined,
  harvest_date: undefined,
  area: undefined,
  gauges: '',
};

// Página principal
const AdminFoodTypesPage = () => (
  <AdminCRUDPage
    config={crudConfig}
    service={foodTypesService}
    initialFormData={initialFormData}
    mapResponseToForm={mapResponseToForm}
    validateForm={validateForm}
    enhancedHover={true}
  />
);

export default AdminFoodTypesPage;
