import React from 'react';
import { AdminCRUDPage, CRUDColumn, CRUDFormSection, CRUDConfig } from '@/shared/ui/common/AdminCRUDPage';
import { medicationsService } from '@/entities/medication/api/medications.service';
import type { MedicationResponse } from '@/shared/api/generated/swaggerTypes';
import { routeAdministrationsService } from '@/entities/route-administration/api/routeAdministrations.service';
import { Badge } from '@/shared/ui/badge';
import { SectionCard, InfoField, modalStyles } from '@/shared/ui/common/ModalStyles';
import { ItemDetailModal } from '@/widgets/dashboard/animals/ItemDetailModal';

// Input del formulario
type MedicationInput = {
  name: string;
  description?: string;
  dosis?: string;
  availability?: boolean;
  route_administration_id?: number;
  indications?: string;
  contraindications?: string;
};

// Columnas de la tabla
const columns: CRUDColumn<MedicationResponse & { [k: string]: any }>[] = [

  { key: 'name', label: 'Nombre', render: (v) => v || '-' },
  { key: 'dosis', label: 'Dosis', render: (v) => v || '-' },
  { key: 'availability', label: 'Disponibilidad', render: (v) => (v ? 'Sí' : 'No') },
  { key: 'route_administration_id', label: 'Ruta de Administración' },
  { key: 'indications', label: 'Indicaciones', render: (v) => v || '-' },
  { key: 'contraindications', label: 'Contraindicaciones', render: (v) => v || '-' },
  { key: 'description', label: 'Descripción', render: (v) => v || '-' },
  { key: 'created_at', label: 'Creado', render: (v) => (v ? new Date(v as string).toLocaleDateString('es-ES') : '-') },
];

// Secciones del formulario
const formSections: CRUDFormSection<MedicationInput>[] = [
  {
    title: 'Información Básica',
    gridCols: 2,
    fields: [
      { name: 'name', label: 'Nombre', type: 'text', required: true, placeholder: 'Ej: Florfenicol', helperText: 'Ingrese un nombre descriptivo (minimo 3 caracteres).', validation: { min: 3 } },
      { name: 'dosis', label: 'Dosis', type: 'text', placeholder: 'Ej: 20mg/kg' },
      { name: 'route_administration_id', label: 'ID Ruta de Administración', type: 'number', placeholder: 'Ej: 1, 2, 3' },
      { name: 'availability', label: 'Disponible', type: 'checkbox' },
    ],
  },
  {
    title: 'Detalles',
    gridCols: 2,
    fields: [
      { name: 'indications', label: 'Indicaciones', type: 'textarea', placeholder: 'Ej: Enfermedades respiratorias', colSpan: 2 },
      { name: 'contraindications', label: 'Contraindicaciones', type: 'textarea', placeholder: 'Ej: No usar en leche', colSpan: 2 },
      { name: 'description', label: 'Descripción', type: 'textarea', placeholder: 'Descripción general del medicamento', colSpan: 2 },
    ],
  },
];

// Configuración CRUD
const crudConfig: CRUDConfig<MedicationResponse & { [k: string]: any }, MedicationInput> = {
  title: 'Medicamentos',
  entityName: 'Medicamento',
  columns,
  formSections,
  searchPlaceholder: 'Buscar medicamentos...',
  emptyStateMessage: 'No hay medicamentos disponibles.',
  emptyStateDescription: 'Crea el primer registro para comenzar.',
  enableDetailModal: true,
  enableCreateModal: true,
  enableEditModal: true,
  enableDelete: true,
};

// Mapear respuesta a formulario
const mapResponseToForm = (item: MedicationResponse & { [k: string]: any }): MedicationInput => ({
  name: item.name || '',
  description: (item as any).description || '',
  dosis: (item as any).dosis || '',
  availability: (item as any).availability ?? true,
  route_administration_id: (item as any).route_administration_id,
  indications: (item as any).indications || '',
  contraindications: (item as any).contraindications || '',
});

// Validación
const validateForm = (formData: MedicationInput): string | null => {
  if (!formData.name || !formData.name.trim()) {
    return 'El nombre es obligatorio.';
  }
  return null;
};

// Datos iniciales
const initialFormData: MedicationInput = {
  name: '',
  description: '',
  dosis: '',
  availability: true,
  route_administration_id: undefined,
  indications: '',
  contraindications: '',
};

// Página principal
function AdminMedicationsPage() {
  const [routeOptions, setRouteOptions] = React.useState<Array<{ value: number; label: string }>>([]);

  React.useEffect(() => {
    (async () => {
      try {
        const res: any = await routeAdministrationsService.getRouteAdministrations?.({ page: 1, limit: 1000 });
        const list = Array.isArray(res) ? res : (res?.data ?? res?.items ?? []);
        setRouteOptions((list || []).map((r: any) => ({
          value: r.id,
          label: r.name || r.description || r.route || r.route_administration || `ID ${r.id}`,
        })));
      } catch (e) {
        console.warn('[medications] Error en carga de opciones', e);
      }
    })();
  }, []);

  const formSectionsLocal: CRUDFormSection<MedicationInput>[] = [
    {
      title: 'Información Básica',
      gridCols: 2,
      fields: [
        { name: 'name', label: 'Nombre', type: 'text', required: true, placeholder: 'Ej: Florfenicol' },
        { name: 'dosis', label: 'Dosis', type: 'text', placeholder: 'Ej: 20mg/kg' },
        { name: 'route_administration_id', label: 'Ruta de Administración', type: 'select', options: routeOptions, placeholder: 'Seleccionar ruta' },
        { name: 'availability', label: 'Disponible', type: 'checkbox' },
      ],
    },
    {
      title: 'Detalles',
      gridCols: 2,
      fields: [
        { name: 'indications', label: 'Indicaciones', type: 'textarea', placeholder: 'Ej: Enfermedades respiratorias', colSpan: 2 },
        { name: 'contraindications', label: 'Contraindicaciones', type: 'textarea', placeholder: 'Ej: No usar en leche', colSpan: 2 },
        { name: 'description', label: 'Descripción', type: 'textarea', placeholder: 'Descripción general del medicamento', colSpan: 2 },
      ],
    },
  ];

  const getRouteLabel = (id?: number | null) => {
    if (!id) return '-';
    return routeOptions.find((r) => r.value === id)?.label || `ID ${id}`;
  };


  const crudConfigLocal: CRUDConfig<MedicationResponse & { [k: string]: any }, MedicationInput> = {
    ...crudConfig,
    formSections: formSectionsLocal,
    showDetailTimestamps: false,
    showEditTimestamps: false,
    showIdInDetailTitle: false,
  };

  return (
    <AdminCRUDPage
      config={crudConfigLocal}
      service={medicationsService}
      initialFormData={initialFormData}
      mapResponseToForm={mapResponseToForm}
      validateForm={validateForm}
      customDetailContent={(item, { onEdit }) => (
        <ItemDetailModal
          type="medication"
          item={item}
          onEdit={onEdit}
          onClose={() => { }} // CRUDPage handles closing
          options={{
            routes: Object.fromEntries(routeOptions.map(o => [o.value, o.label]))
          }}
        />
      )}
      realtime={true}
      pollIntervalMs={0}
      refetchOnFocus={false}
      refetchOnReconnect={true}
      cache={true}
      cacheTTL={300000}
      forceFreshOnMount={false}
      enhancedHover={true}
    />
  );
}

export default AdminMedicationsPage;
