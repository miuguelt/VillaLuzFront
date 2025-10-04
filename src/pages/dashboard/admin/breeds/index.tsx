import React from 'react';
import { AdminCRUDPage, CRUDColumn, CRUDFormSection, CRUDConfig } from '@/components/common/AdminCRUDPage';
import { breedsService } from '@/services/breedsService';
import type { BreedResponse, BreedInput } from '@/types/swaggerTypes';
import { speciesService } from '@/services/speciesService';
import { checkBreedDependencies } from '@/services/dependencyCheckService';

// Columnas de la tabla (width numérico -> w-{n})
const columns: CRUDColumn<BreedResponse & { [k: string]: any }>[] = [
  { key: 'id', label: 'ID', width: 12 },
  { key: 'name', label: 'Nombre' },
  { key: 'species_id', label: 'Especie' },
  { key: 'created_at', label: 'Creado', render: (v) => (v ? new Date(v as string).toLocaleDateString('es-ES') : '-') },
];


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
  const [speciesOptions, setSpeciesOptions] = React.useState<Array<{ value: number; label: string }>>([]);

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

  const crudConfigLocal: CRUDConfig<BreedResponse & { [k: string]: any }, BreedInput> = {
    title: 'Razas',
    entityName: 'Raza',
    columns,
    formSections: formSectionsLocal,
    // Limitar campos para reducir payload y acelerar render
    defaultFields: 'id,name,species_id,created_at',
    searchPlaceholder: 'Buscar razas...',
    emptyStateMessage: 'No hay razas disponibles.',
    emptyStateDescription: 'Crea la primera para comenzar.',
    enableDetailModal: true,
    enableCreateModal: true,
    enableEditModal: true,
    enableDelete: true,
    // Verificación de dependencias antes de eliminar
    preDeleteCheck: async (id: number) => {
      return await checkBreedDependencies(id);
    },
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
