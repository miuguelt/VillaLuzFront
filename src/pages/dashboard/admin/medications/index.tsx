import React from 'react';
import { AdminCRUDPage, CRUDColumn, CRUDFormSection, CRUDConfig } from '@/shared/ui/common/AdminCRUDPage';
import { medicationsService } from '@/entities/medication/api/medications.service';
import type { MedicationResponse } from '@/shared/api/generated/swaggerTypes';
import { routeAdministrationsService } from '@/entities/route-administration/api/routeAdministrations.service';
import { Badge } from '@/shared/ui/badge';
import { SectionCard, InfoField, modalStyles } from '@/shared/ui/common/ModalStyles';

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

  // Renderizado personalizado para la tarjeta
  const renderMedicationCard = (item: MedicationResponse & { [k: string]: any }) => {
    const availability = (item as any).availability;
    const dosis = (item as any).dosis || '-';

    return (
      <div className={modalStyles.spacing.section}>
        <SectionCard title="Información Básica">
          <InfoField label="Nombre" value={item.name || '-'} valueSize="large" />
          <div className="flex items-center gap-2 mt-2">
            <Badge className={`text-xs px-3 py-1 ${
              availability ? 'bg-green-500/90 hover:bg-green-600 text-white' : 'bg-gray-500/90 hover:bg-gray-600 text-white'
            }`}>
              {availability ? 'Disponible' : 'No disponible'}
            </Badge>
          </div>
        </SectionCard>
        <SectionCard title="Dosis">
          <InfoField label="Dosis" value={dosis} valueSize="large" />
        </SectionCard>
      </div>
    );
  };

  // Renderizado personalizado para el detalle
  const renderDetail = (item: (MedicationResponse & { [k: string]: any })) => {
    const availability = (item as any).availability;
    const routeId = (item as any).route_administration_id as number | undefined;
    const dosis = (item as any).dosis || '-';
    const indications = (item as any).indications;
    const contraindications = (item as any).contraindications;
    const description = (item as any).description;

    return (
      <div className={modalStyles.spacing.section}>
        <div className={modalStyles.twoColGrid}>
          {/* Columna izquierda */}
          <div className={modalStyles.spacing.section}>
            <SectionCard title="Información Básica">
              <div className={modalStyles.spacing.sectionSmall}>
                <InfoField label="ID" value={`#${item.id}`} />
                <InfoField label="Nombre" value={item.name || '-'} valueSize="xlarge" />
                <div className="mt-3">
                  <div className={modalStyles.fieldLabel}>Disponibilidad</div>
                  <Badge className={`text-sm px-3 py-1 ${
                    availability ? 'bg-green-500/90 hover:bg-green-600 text-white' : 'bg-gray-500/90 hover:bg-gray-600 text-white'
                  }`}>
                    {availability ? 'Disponible' : 'No disponible'}
                  </Badge>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Dosificación">
              <div className={modalStyles.fieldsGrid}>
                <InfoField label="Dosis" value={dosis} valueSize="large" />
                <InfoField label="Ruta" value={getRouteLabel(routeId)} />
              </div>
            </SectionCard>

            {description && (
              <SectionCard title="Descripción">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {description}
                </p>
              </SectionCard>
            )}
          </div>

          {/* Columna derecha */}
          <div className={modalStyles.spacing.section}>
            {indications && (
              <SectionCard title="Indicaciones">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {indications}
                </p>
              </SectionCard>
            )}

            {contraindications && (
              <SectionCard title="Contraindicaciones">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {contraindications}
                </p>
              </SectionCard>
            )}

            <SectionCard title="Información del Sistema">
              <div className={modalStyles.fieldsGrid}>
                <InfoField
                  label="Creado"
                  value={item.created_at ? new Date(item.created_at).toLocaleDateString('es-ES') : '-'}
                />
                <InfoField
                  label="Actualizado"
                  value={item.updated_at ? new Date(item.updated_at).toLocaleDateString('es-ES') : '-'}
                />
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    );
  };

  const crudConfigLocal: CRUDConfig<MedicationResponse & { [k: string]: any }, MedicationInput> = {
    ...crudConfig,
    formSections: formSectionsLocal,
    showDetailTimestamps: false,
    showEditTimestamps: false,
    showIdInDetailTitle: false,
    renderCard: renderMedicationCard,
  };

  return (
    <AdminCRUDPage
      config={crudConfigLocal}
      service={medicationsService}
      initialFormData={initialFormData}
      mapResponseToForm={mapResponseToForm}
      validateForm={validateForm}
      customDetailContent={renderDetail}
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
