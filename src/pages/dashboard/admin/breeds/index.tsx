import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { AdminCRUDPage, CRUDColumn, CRUDFormSection, CRUDConfig } from '@/components/common/AdminCRUDPage';
import { breedsService } from '@/services/breedsService';
import type { BreedResponse, BreedInput } from '@/types/swaggerTypes';
import { speciesService } from '@/services/speciesService';
import { checkBreedDependencies } from '@/services/dependencyCheckService';
import { BreedActionsMenu } from '@/components/dashboard/BreedActionsMenu';
import { SpeciesLink } from '@/components/common/ForeignKeyHelpers';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SectionCard, InfoField, modalStyles } from '@/components/common/ModalStyles';


// Mapear respuesta a formulario
const mapResponseToForm = (item: BreedResponse & { [k: string]: any }): BreedInput => ({
  name: item.name || '',
  species_id: item.species_id,
});

// Validación mejorada
const validateForm = (formData: BreedInput): string | null => {
  if (!formData.name || !formData.name.trim()) {
    return '⚠️ El nombre de la raza es obligatorio.';
  }

  // Validar species_id: debe ser un número válido > 0
  const speciesId = Number(formData.species_id);
  if (!formData.species_id || Number.isNaN(speciesId) || speciesId <= 0) {
    return '⚠️ Debe seleccionar una especie válida para esta raza.';
  }

  return null;
};

// Datos iniciales - NO usar 0, usar undefined para forzar selección
const initialFormData: BreedInput = {
  name: '',
  species_id: undefined as any, // Forzar que el usuario seleccione
};

// Página principal
function AdminBreedsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [speciesOptions, setSpeciesOptions] = React.useState<Array<{ value: number; label: string }>>([]);

  // Obtener parámetros de filtro de la URL
  const speciesIdFilter = searchParams.get('species_id');
  const speciesNameFilter = searchParams.get('species_name');

  React.useEffect(() => {
    (async () => {
      try {
        const res = await speciesService.getSpecies({ page: 1, limit: 1000 });
        setSpeciesOptions((res?.data || []).map((s: any) => ({ value: s.id, label: s.name })));
      } catch (e) {
        // silenciar
      }
    })();
  }, []);

  // Función para limpiar el filtro
  const clearFilter = () => {
    setSearchParams({});
  };

  // Crear mapa de búsqueda optimizado
  const speciesMap = React.useMemo(() => {
    const map = new Map<number, string>();
    speciesOptions.forEach(opt => map.set(opt.value, opt.label));
    return map;
  }, [speciesOptions]);

  // Columnas de la tabla
  const columns: CRUDColumn<BreedResponse & { [k: string]: any }>[] = React.useMemo(() => [
    { key: 'name', label: 'Nombre' },
    {
      key: 'species_id',
      label: 'Especie',
      render: (v) => {
        if (!v) return '-';
        const id = Number(v);
        const label = speciesMap.get(id) || `Especie ${id}`;
        return <SpeciesLink id={id} label={label} />;
      }
    },
    { key: 'created_at', label: 'Creado', render: (v) => (v ? new Date(v as string).toLocaleDateString('es-ES') : '-') },
  ], [speciesMap]);

  const formSectionsLocal: CRUDFormSection<BreedInput>[] = [
    {
      title: 'Información Básica',
      gridCols: 2,
      fields: [
        { name: 'name', label: 'Nombre', type: 'text', required: true, placeholder: 'Ej: MixedFeline' },
        { name: 'species_id', label: 'Especie', type: 'select', required: true, options: speciesOptions, placeholder: 'Seleccionar especie...' },
      ],
    },
  ];

  // Renderizado personalizado para la tarjeta
  const renderBreedCard = (item: BreedResponse & { [k: string]: any }) => {
    const speciesLabel = item.species_id ? speciesMap.get(item.species_id) || `Especie ${item.species_id}` : '-';

    return (
      <div className={modalStyles.spacing.section}>
        <SectionCard title="Información Básica">
          <InfoField label="Nombre" value={item.name || '-'} valueSize="large" />
          <InfoField
            label="Especie"
            value={item.species_id ? <SpeciesLink id={item.species_id} label={speciesLabel} /> : '-'}
          />
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
  const renderBreedDetail = (item: BreedResponse & { [k: string]: any }) => {
    const speciesLabel = item.species_id ? speciesMap.get(item.species_id) || `Especie ${item.species_id}` : '-';

    return (
      <div className={modalStyles.spacing.section}>
        {/* Menú de Acciones */}
        <div className="flex items-center justify-end gap-2 px-1 pb-3">
          <div className="text-xs text-muted-foreground font-medium">Acciones rápidas:</div>
          <BreedActionsMenu breed={item as BreedResponse} />
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

            <SectionCard title="Especie">
              <InfoField
                label="Especie"
                value={item.species_id ? <SpeciesLink id={item.species_id} label={speciesLabel} /> : '-'}
                valueSize="large"
              />
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

  const crudConfigLocal: CRUDConfig<BreedResponse & { [k: string]: any }, BreedInput> = {
    title: 'Razas',
    entityName: 'Raza',
    columns,
    formSections: formSectionsLocal,
    // Limitar campos para reducir payload y acelerar render
    defaultFields: 'id,name,species_id,created_at,updated_at',
    searchPlaceholder: 'Buscar razas...',
    emptyStateMessage: 'No hay razas disponibles.',
    emptyStateDescription: 'Crea la primera para comenzar.',
    enableDetailModal: true,
    enableCreateModal: true,
    enableEditModal: true,
    enableDelete: true,
    showDetailTimestamps: false,
    showEditTimestamps: false,
    showIdInDetailTitle: false,
    // Aplicar filtro por species_id si está en la URL
    additionalFilters: speciesIdFilter ? { species_id: parseInt(speciesIdFilter) } : undefined,
    // Verificación de dependencias antes de eliminar
    preDeleteCheck: async (id: number) => {
      return await checkBreedDependencies(id);
    },
    // Agregar menú de acciones
    customActions: (record) => (
      <div className="flex items-center gap-1">
        <BreedActionsMenu breed={record as BreedResponse} />
      </div>
    ),
    // Renderizado personalizado
    renderCard: renderBreedCard,
    customDetailContent: renderBreedDetail,
    // Banner personalizado cuando hay filtro activo
    customHeader: speciesIdFilter ? (
      <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-sm">
            <span className="font-medium text-blue-900 dark:text-blue-100">Filtrando por especie:</span>
            <span className="ml-2 text-blue-700 dark:text-blue-300 font-semibold">
              {speciesNameFilter || `ID ${speciesIdFilter}`}
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilter}
          className="text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100 hover:bg-blue-100 dark:hover:bg-blue-900"
        >
          <X className="h-4 w-4 mr-1" />
          Quitar filtro
        </Button>
      </div>
    ) : undefined,
  };

  return (
    <AdminCRUDPage
      config={crudConfigLocal}
      service={breedsService}
      initialFormData={initialFormData}
      mapResponseToForm={mapResponseToForm}
      validateForm={validateForm}
      // Activar actualización en tiempo real en la vista de razas
      realtime={true}
      // Aumentar el intervalo de polling para reducir carga innecesaria
      pollIntervalMs={8000}
      refetchOnFocus={true}
      refetchOnReconnect={true}
      // Activar hover mejorado con borde azul y fondo azul suave
      enhancedHover={true}
    />
  );
}

export default AdminBreedsPage;
