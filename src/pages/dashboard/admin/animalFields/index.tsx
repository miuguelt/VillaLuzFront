import React, { useMemo } from 'react';
import { AdminCRUDPage, CRUDColumn, CRUDFormSection, CRUDConfig } from '@/components/common/AdminCRUDPage';
import { animalFieldsService } from '@/services/animalFieldsService';
import { animalsService } from '@/services/animalService';
import { fieldService } from '@/services/fieldService';
import { GenericModal } from '@/components/common/GenericModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle } from 'lucide-react';
import { FIELD_STATES } from '@/constants/enums';
import type { AnimalFieldResponse, AnimalFieldInput, FieldInput } from '@/types/swaggerTypes';
import { getTodayColombia } from '@/utils/dateUtils';

function AdminAnimalFieldsPage() {
  const [animalOptions, setAnimalOptions] = React.useState<Array<{ value: number; label: string }>>([]);
  const [fieldOptions, setFieldOptions] = React.useState<Array<{ value: number; label: string }>>([]);
  const [loading, setLoading] = React.useState(true);
  const [isNewFieldModalOpen, setIsNewFieldModalOpen] = React.useState(false);
  const [newFieldData, setNewFieldData] = React.useState<FieldInput>({
    name: '',
    area: '',
    state: 'Disponible',
    location: '',
    capacity: '',
    management: '',
    measurements: '',
  });

  // Carga paralela optimizada de opciones
  React.useEffect(() => {
    const loadOptions = async () => {
      setLoading(true);
      try {
        const [animalsResult, fieldsResult] = await Promise.all([
          animalsService.getAnimals({ page: 1, limit: 1000 }).catch((e) => {
            console.warn('[animal-fields] No se pudieron cargar animales', e);
            return null;
          }),
          fieldService.getFields({ page: 1, limit: 1000 }).catch((e) => {
            console.warn('[animal-fields] No se pudieron cargar campos', e);
            return null;
          })
        ]);

        // Procesar animales
        if (animalsResult) {
          setAnimalOptions((animalsResult || []).map((a: any) => ({
            value: a.id,
            label: a.record || `Animal ${a.id}`
          })));
        }

        // Procesar campos
        if (fieldsResult) {
          const items = (fieldsResult as any)?.data || fieldsResult || [];
          setFieldOptions((items || []).map((f: any) => ({
            value: f.id,
            label: f.name || `Campo ${f.id}`
          })));
        }
      } finally {
        setLoading(false);
      }
    };

    loadOptions();
  }, []);

  // Función para recargar solo los campos
  const reloadFields = async () => {
    try {
      const fieldsResult = await fieldService.getFields({ page: 1, limit: 1000 });
      const items = (fieldsResult as any)?.data || fieldsResult || [];
      setFieldOptions((items || []).map((f: any) => ({
        value: f.id,
        label: f.name || `Campo ${f.id}`
      })));
    } catch (e) {
      console.warn('[animal-fields] Error al recargar campos', e);
    }
  };

  // Función para crear un nuevo campo
  const handleCreateField = async () => {
    try {
      if (!newFieldData.name || !newFieldData.area) {
        alert('El nombre y el área son obligatorios');
        return;
      }

      await fieldService.createField(newFieldData);

      // Recargar la lista de campos
      await reloadFields();

      // Resetear el formulario y cerrar modal
      setNewFieldData({
        name: '',
        area: '',
        state: 'Disponible',
        location: '',
        capacity: '',
        management: '',
        measurements: '',
      });
      setIsNewFieldModalOpen(false);

      alert('Campo creado exitosamente');
    } catch (error: any) {
      console.error('Error al crear campo:', error);
      alert(`Error al crear campo: ${error?.response?.data?.message || error.message || 'Error desconocido'}`);
    }
  };

  // Crear mapas de búsqueda optimizados
  const animalMap = useMemo(() => {
    const map = new Map<number, string>();
    animalOptions.forEach(opt => map.set(opt.value, opt.label));
    return map;
  }, [animalOptions]);

  const fieldMap = useMemo(() => {
    const map = new Map<number, string>();
    fieldOptions.forEach(opt => map.set(opt.value, opt.label));
    return map;
  }, [fieldOptions]);

  // Columnas de la tabla con renderizado optimizado
  const columns: CRUDColumn<AnimalFieldResponse & { [k: string]: any }>[] = useMemo(() => [
    { key: 'id', label: 'ID', width: 12 },
    {
      key: 'animal_id',
      label: 'Animal',
      render: (v) => animalMap.get(Number(v)) || `Animal ${v}`
    },
    {
      key: 'field_id',
      label: 'Campo',
      render: (v) => fieldMap.get(Number(v)) || `Campo ${v}`
    },
    {
      key: 'assignment_date',
      label: 'Fecha Asignación',
      render: (v) => v ? new Date(v as string).toLocaleDateString('es-ES') : '-'
    },
    {
      key: 'removal_date',
      label: 'Fecha Retiro',
      render: (v) => v ? new Date(v as string).toLocaleDateString('es-ES') : '-'
    },
    {
      key: 'notes',
      label: 'Notas',
      render: (v) => {
        if (!v) return '-';
        const str = String(v);
        return str.length > 50 ? `${str.substring(0, 50)}...` : str;
      }
    },
    {
      key: 'created_at' as any,
      label: 'Creado',
      render: (v) => v ? new Date(v as string).toLocaleDateString('es-ES') : '-'
    },
  ], [animalMap, fieldMap]);

  const formSections: CRUDFormSection<AnimalFieldInput & { [k: string]: any }>[] = [
    {
      title: 'Información de Asignación',
      gridCols: 2,
      fields: [
        {
          name: 'animal_id' as any,
          label: 'Animal',
          type: 'select',
          required: true,
          options: animalOptions,
          placeholder: 'Seleccionar animal'
        },
        {
          name: 'field_id' as any,
          label: 'Campo',
          type: 'select',
          required: true,
          options: fieldOptions,
          placeholder: 'Seleccionar campo'
        },
        {
          name: 'assignment_date' as any,
          label: 'Fecha de Asignación',
          type: 'date',
          required: true
        },
        {
          name: 'removal_date' as any,
          label: 'Fecha de Retiro',
          type: 'date',
          placeholder: 'Dejar vacío si aún está en el campo'
        },
        {
          name: 'notes' as any,
          label: 'Notas',
          type: 'textarea',
          placeholder: 'Observaciones adicionales (opcional)',
          colSpan: 2
        },
      ],
    },
  ];

  const crudConfig: CRUDConfig<AnimalFieldResponse & { [k: string]: any }, AnimalFieldInput & { [k: string]: any }> = {
    title: 'Asignación de Animales a Campos',
    entityName: 'Asignación de animal',
    columns,
    formSections,
    searchPlaceholder: 'Buscar asignaciones de animales...',
    emptyStateMessage: 'No hay asignaciones registradas.',
    emptyStateDescription: 'Crea la primera asignación para comenzar.',
    enableDetailModal: true,
    enableCreateModal: true,
    enableEditModal: true,
    enableDelete: true,
  };

  // No renderizar hasta que las opciones estén cargadas
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando asignaciones de animales...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Asignación de Animales a Campos</h1>
        <Button
          onClick={() => setIsNewFieldModalOpen(true)}
          className="flex items-center gap-2"
        >
          <PlusCircle className="h-4 w-4" />
          Crear Nuevo Campo
        </Button>
      </div>

      <AdminCRUDPage
        config={crudConfig}
        service={animalFieldsService}
        initialFormData={initialFormData}
        mapResponseToForm={mapResponseToForm}
        validateForm={validateForm}
        realtime={true}
        pollIntervalMs={8000}
        refetchOnFocus={true}
        refetchOnReconnect={true}
        enhancedHover={true}
      />

      {/* Modal para crear nuevo campo */}
      <GenericModal
        isOpen={isNewFieldModalOpen}
        onOpenChange={setIsNewFieldModalOpen}
        title="Crear Nuevo Campo"
        size="2xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nombre del Campo *</Label>
              <Input
                id="name"
                value={newFieldData.name}
                onChange={(e) => setNewFieldData({ ...newFieldData, name: e.target.value })}
                placeholder="Ej: Campo A"
              />
            </div>
            <div>
              <Label htmlFor="location">Ubicación</Label>
              <Input
                id="location"
                value={newFieldData.location}
                onChange={(e) => setNewFieldData({ ...newFieldData, location: e.target.value })}
                placeholder="Ej: Zona Norte"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="area">Área *</Label>
              <Input
                id="area"
                value={newFieldData.area}
                onChange={(e) => setNewFieldData({ ...newFieldData, area: e.target.value })}
                placeholder="Ej: 5 hectáreas"
              />
            </div>
            <div>
              <Label htmlFor="capacity">Capacidad</Label>
              <Input
                id="capacity"
                value={newFieldData.capacity}
                onChange={(e) => setNewFieldData({ ...newFieldData, capacity: e.target.value })}
                placeholder="Ej: 50 animales"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="state">Estado *</Label>
              <select
                id="state"
                value={newFieldData.state}
                onChange={(e) => setNewFieldData({ ...newFieldData, state: e.target.value as any })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {FIELD_STATES.map(state => (
                  <option key={state.value} value={state.value}>{state.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="management">Gestión</Label>
              <Input
                id="management"
                value={newFieldData.management}
                onChange={(e) => setNewFieldData({ ...newFieldData, management: e.target.value })}
                placeholder="Ej: Rotacional"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="measurements">Medidas</Label>
            <Textarea
              id="measurements"
              value={newFieldData.measurements}
              onChange={(e) => setNewFieldData({ ...newFieldData, measurements: e.target.value })}
              placeholder="Dimensiones y características"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => setIsNewFieldModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreateField}>
              Crear Campo
            </Button>
          </div>
        </div>
      </GenericModal>
    </>
  );
}

export default AdminAnimalFieldsPage;

// Mapear respuesta a formulario
const mapResponseToForm = (item: AnimalFieldResponse & { [k: string]: any }): AnimalFieldInput & { [k: string]: any } => ({
  animal_id: item.animal_id,
  field_id: item.field_id,
  assignment_date: item.assignment_date,
  removal_date: item.removal_date,
  notes: item.notes || '',
});

// Validación
const validateForm = (formData: AnimalFieldInput & { [k: string]: any }): string | null => {
  // Validar animal_id: debe ser un número válido > 0
  const animalId = Number(formData.animal_id);
  if (!formData.animal_id || Number.isNaN(animalId) || animalId <= 0) {
    return '⚠️ Debe seleccionar un animal válido.';
  }

  // Validar field_id: debe ser un número válido > 0
  const fieldId = Number(formData.field_id);
  if (!formData.field_id || Number.isNaN(fieldId) || fieldId <= 0) {
    return '⚠️ Debe seleccionar un campo válido.';
  }

  if (!formData.assignment_date) return 'La fecha de asignación es obligatoria.';

  // Validación adicional: la fecha de retiro no puede ser anterior a la de asignación
  if (formData.removal_date && formData.assignment_date) {
    const assignmentDate = new Date(formData.assignment_date);
    const removalDate = new Date(formData.removal_date);
    if (removalDate < assignmentDate) {
      return 'La fecha de retiro no puede ser anterior a la fecha de asignación.';
    }
  }

  return null;
};

// Datos iniciales
const initialFormData: AnimalFieldInput & { [k: string]: any } = {
  animal_id: undefined as any, // Forzar que el usuario seleccione
  field_id: undefined as any, // Forzar que el usuario seleccione
  assignment_date: getTodayColombia(),
  removal_date: undefined,
  notes: '',
};
