import React from 'react';
import { AdminCRUDPage, CRUDColumn, CRUDFormSection, CRUDConfig } from '@/components/common/AdminCRUDPage';
import { fieldService } from '@/services/fieldService';
import { foodTypesService } from '@/services/foodTypesService';
import { FIELD_STATES } from '@/constants/enums';
import type { FieldResponse } from '@/types/swaggerTypes';

// Tipo de formulario alineado al JSON real del backend
type FieldFormInput = {
  name: string;
  ubication: string;
  area: string;
  capacity: string;
  state: 'Disponible' | 'Ocupado' | 'Mantenimiento' | 'Restringido' | string;
  handlings: string;
  gauges: string;
  food_type_id?: number;
};

// Columnas (width numérico -> w-{n})
const columns: CRUDColumn<FieldResponse & { [k: string]: any }>[] = [
  { key: 'id', label: 'ID', width: 12 },
  { key: 'name', label: 'Nombre' },
  { key: 'location', label: 'Ubicación', render: (_v, item) => item.location || item.ubication || '-' },
  { key: 'area', label: 'Área' },
  { key: 'capacity', label: 'Capacidad' },
  { key: 'state', label: 'Estado' },
  { key: 'management', label: 'Manejo', render: (_v, item) => item.management || item.handlings || '-' },
  { key: 'measurements', label: 'Mediciones', render: (_v, item) => item.measurements || item.gauges || '-' },
  { key: 'food_type_id', label: 'Tipo de Alimento' },
  { key: 'created_at', label: 'Creado', render: (v) => (v ? new Date(v as string).toLocaleDateString('es-ES') : '-') },
];

// Configuración CRUD base
const crudConfig: CRUDConfig<FieldResponse & { [k: string]: any }, FieldFormInput> = {
  title: 'Potreros',
  entityName: 'Campo',
  columns,
  formSections: [],
  searchPlaceholder: 'Buscar Potreros...',
  emptyStateMessage: 'No hay Potreros',
  emptyStateDescription: 'Crea el primero para comenzar',
  enableDetailModal: true,
  enableCreateModal: true,
  enableEditModal: true,
  enableDelete: true,
};

// Mapear respuesta a formulario (usando claves reales del backend)
const mapResponseToForm = (item: FieldResponse & { [k: string]: any }): FieldFormInput => ({
  name: item.name || '',
  ubication: item.ubication || item.location || '',
  area: item.area || '',
  capacity: item.capacity || '',
  state: item.state || 'Disponible',
  handlings: item.handlings || item.management || '',
  gauges: item.gauges || item.measurements || '',
  food_type_id: item.food_type_id,
});

// Validación
const validateForm = (formData: FieldFormInput): string | null => {
  if (!formData.name || !formData.name.trim()) return 'El nombre es obligatorio.';
  if (!formData.area || !formData.area.trim()) return 'El área es obligatoria.';
  if (!formData.state) return 'El estado es obligatorio.';
  return null;
};

// Datos iniciales (alineados al JSON real)
const initialFormData: FieldFormInput = {
  name: '',
  ubication: '',
  area: '',
  capacity: '',
  state: 'Disponible',
  handlings: '',
  gauges: '',
  food_type_id: undefined,
};

// Página principal
function AdminFieldsPage() {
  const [foodTypeOptions, setFoodTypeOptions] = React.useState<Array<{ value: number; label: string }>>([]);

  React.useEffect(() => {
    (async () => {
      try {
        const res: any = await foodTypesService.getFoodTypes?.({ page: 1, limit: 1000 });
        const list = Array.isArray(res) ? res : (res?.data ?? res?.items ?? []);
        setFoodTypeOptions((list || []).map((ft: any) => ({
          value: ft.id,
          label: ft.food_type || ft.name || ft.description || `ID ${ft.id}`,
        })));
      } catch (e) {
        console.warn('[fields] Error al cargar Potreros', e);
      }
    })();
  }, []);

  const formSectionsLocal: CRUDFormSection<FieldFormInput>[] = [
    {
      title: 'Información Básica',
      gridCols: 2,
      fields: [
        { name: 'name', label: 'Nombre', type: 'text', required: true, placeholder: 'Ej: Sector 34' },
        { name: 'area', label: 'Área', type: 'text', required: true, placeholder: 'Ej: 3 ha' },
        { name: 'state', label: 'Estado', type: 'select', required: true, options: FIELD_STATES as any },
        { name: 'food_type_id', label: 'Tipo de Alimento', type: 'select', options: foodTypeOptions, placeholder: 'Seleccionar tipo de alimento' },
      ],
    },
    {
      title: 'Detalles',
      gridCols: 2,
      fields: [
        { name: 'ubication', label: 'Ubicación', type: 'text', placeholder: 'Ej: Zona 34' },
        { name: 'capacity', label: 'Capacidad', type: 'text', placeholder: 'Ej: 14' },
        { name: 'handlings', label: 'Manejo', type: 'textarea', placeholder: 'Prácticas de manejo', colSpan: 2 },
        { name: 'gauges', label: 'Mediciones', type: 'textarea', placeholder: 'Mediciones relevantes', colSpan: 2 },
      ],
    },
  ];

  const crudConfigLocal: CRUDConfig<FieldResponse & { [k: string]: any }, FieldFormInput> = {
    ...crudConfig,
    formSections: formSectionsLocal,
  };

  return (
    <AdminCRUDPage
      config={crudConfigLocal}
      service={fieldService}
      initialFormData={initialFormData}
      mapResponseToForm={mapResponseToForm}
      validateForm={validateForm}
      realtime={true}
      pollIntervalMs={8000}
      refetchOnFocus={true}
      refetchOnReconnect={true}
      enhancedHover={true}
    />
  );
}

export default AdminFieldsPage;
