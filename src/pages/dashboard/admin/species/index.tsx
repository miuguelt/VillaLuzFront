import React from 'react';
import { AdminCRUDPage, CRUDColumn, CRUDFormSection, CRUDConfig } from '@/components/common/AdminCRUDPage';
import { speciesService } from '@/services/speciesService';
import type { SpeciesResponse, SpeciesInput } from '@/types/swaggerTypes';
import { checkSpeciesDependencies } from '@/services/dependencyCheckService';
import { SpeciesActionsMenu } from '@/components/dashboard/SpeciesActionsMenu';
import { SectionCard, InfoField, modalStyles } from '@/components/common/ModalStyles';

// Columnas de la tabla
const columns: CRUDColumn<SpeciesResponse & { [k: string]: any }>[] = [
  { key: 'id', label: 'ID', render: (v) => `#${v}` },
  { key: 'name', label: 'Nombre' },
  {
    key: 'created_at',
    label: 'Creado',
    render: (v) => (v ? new Date(v as string).toLocaleDateString('es-ES') : '-'),
  },
  {
    key: 'updated_at',
    label: 'Actualizado',
    render: (v) => (v ? new Date(v as string).toLocaleDateString('es-ES') : '-'),
  },
];

// Secciones del formulario
const formSections: CRUDFormSection<SpeciesInput>[] = [
  {
    title: 'Información Básica',
    gridCols: 2,
    fields: [
      { name: 'name', label: 'Nombre', type: 'text', required: true, placeholder: 'Ej: Bovino' },
    ],
  },
];

// Renderizado personalizado para la tarjeta
const renderSpeciesCard = (item: SpeciesResponse & { [k: string]: any }) => {
  return (
    <div className={modalStyles.spacing.section}>
      <SectionCard title="Información Básica">
        <InfoField label="Nombre" value={item.name || '-'} valueSize="large" />
      </SectionCard>
      <SectionCard title="Fecha de Creación">
        <InfoField
          label="Creado"
          value={item.created_at ? new Date(item.created_at).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }) : '-'}
        />
      </SectionCard>
    </div>
  );
};

// Renderizado personalizado para el detalle
const renderSpeciesDetail = (item: SpeciesResponse & { [k: string]: any }) => {
  return (
    <div className={modalStyles.spacing.section}>
      {/* Menú de Acciones */}
      <div className="flex items-center justify-end gap-2 px-1 pb-3">
        <div className="text-xs text-muted-foreground font-medium">Acciones rápidas:</div>
        <SpeciesActionsMenu species={item as SpeciesResponse} />
      </div>

      <div className={modalStyles.twoColGrid}>
        {/* Columna izquierda */}
        <div className={modalStyles.spacing.section}>
          <SectionCard title="Información Básica">
            <div className={modalStyles.spacing.sectionSmall}>
              <InfoField label="ID" value={`#${item.id}`} />
              <InfoField label="Nombre" value={item.name || '-'} valueSize="xlarge" />
            </div>
          </SectionCard>
        </div>

        {/* Columna derecha */}
        <div className={modalStyles.spacing.section}>
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

// Configuración CRUD
const crudConfig: CRUDConfig<SpeciesResponse & { [k: string]: any }, SpeciesInput> = {
  title: 'Especies',
  entityName: 'Especie',
  columns,
  formSections,
  // Especificar campos a cargar para optimizar
  defaultFields: 'id,name,created_at,updated_at',
  searchPlaceholder: 'Buscar especies...',
  emptyStateMessage: 'No hay especies disponibles.',
  emptyStateDescription: 'Crea la primera para comenzar.',
  enableDetailModal: true,
  enableCreateModal: true,
  enableEditModal: true,
  enableDelete: true,
  showEditTimestamps: false,
  showDetailTimestamps: false,
  showIdInDetailTitle: false,
  confirmDeleteTitle: '¿Eliminar especie?',
  confirmDeleteDescription: 'Esta acción no se puede deshacer. Se eliminará la especie de forma permanente.',
  // Verificación de dependencias antes de eliminar
  preDeleteCheck: async (id: number) => {
    return await checkSpeciesDependencies(id);
  },
  // Agregar menú de acciones
  customActions: (record) => (
    <div className="flex items-center gap-1">
      <SpeciesActionsMenu species={record as SpeciesResponse} />
    </div>
  ),
  // Renderizado personalizado
  renderCard: renderSpeciesCard,
  customDetailContent: renderSpeciesDetail,
};

// Mapear respuesta a formulario
const mapResponseToForm = (item: SpeciesResponse & { [k: string]: any }): SpeciesInput => ({
  name: item.name || '',
});

// Validación simple
const validateForm = (formData: SpeciesInput): string | null => {
  if (!formData.name || !formData.name.trim()) return 'El nombre es obligatorio.';
  return null;
};

// Datos iniciales
const initialFormData: SpeciesInput = {
  name: '',
};

// Página principal
const AdminSpeciesPage = () => (
  <AdminCRUDPage
    config={crudConfig}
    service={speciesService}
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

export default AdminSpeciesPage;
