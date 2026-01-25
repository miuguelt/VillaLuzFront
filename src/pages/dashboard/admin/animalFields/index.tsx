import React, { useMemo } from 'react';
import { AdminCRUDPage, CRUDColumn, CRUDFormSection, CRUDConfig } from '@/shared/ui/common/AdminCRUDPage';
import { animalFieldsService } from '@/entities/animal-field/api/animalFields.service';
import { animalsService } from '@/entities/animal/api/animal.service';
import { fieldService } from '@/entities/field/api/field.service';
import type { AnimalFieldResponse, AnimalFieldInput } from '@/shared/api/generated/swaggerTypes';
import { getTodayColombia } from '@/shared/utils/dateUtils';
import { AnimalLink, FieldLink } from '@/shared/ui/common/ForeignKeyHelpers';
import { useForeignKeySelect } from '@/shared/hooks/useForeignKeySelect';

function AdminAnimalFieldsPage() {
  const { options: animalOptions, loading: animalLoading } = useForeignKeySelect(
    (p) => animalsService.getAnimals(p),
    (a) => ({ value: a.id, label: a.record || `Animal ${a.id}` })
  );

  const { options: fieldOptions, loading: fieldLoading } = useForeignKeySelect(
    (p) => fieldService.getFields(p),
    (f) => ({ value: f.id, label: f.name || `Campo ${f.id}` })
  );

  // Crear mapas de búsqueda optimizados
  const animalMap = useMemo(() => {
    const map = new Map<number | string, string>();
    animalOptions.forEach(opt => map.set(opt.value, opt.label));
    return map;
  }, [animalOptions]);

  const fieldMap = useMemo(() => {
    const map = new Map<number | string, string>();
    fieldOptions.forEach(opt => map.set(opt.value, opt.label));
    return map;
  }, [fieldOptions]);

  // Columnas de la tabla con renderizado optimizado
  const columns: CRUDColumn<AnimalFieldResponse & { [k: string]: any }>[] = useMemo(() => [

    {
      key: 'animal_id',
      label: 'Animal',
      render: (v) => {
        if (!v) return '-';
        const id = Number(v);
        const label = animalMap.get(id) || `Animal ${id}`;
        return <AnimalLink id={id} label={label} />;
      }
    },
    {
      key: 'field_id',
      label: 'Campo',
      render: (v) => {
        if (!v) return '-';
        const id = Number(v);
        const label = fieldMap.get(id) || `Campo ${id}`;
        return <FieldLink id={id} label={label} />;
      }
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
          placeholder: 'Seleccionar animal',
          loading: animalLoading
        },
        {
          name: 'field_id' as any,
          label: 'Campo',
          type: 'select',
          required: true,
          options: fieldOptions,
          placeholder: 'Seleccionar campo',
          loading: fieldLoading
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

  // No renderizar full-page loader para evitar bloqueos

  return (
    <>
      <AdminCRUDPage
        config={crudConfig}
        service={animalFieldsService}
        initialFormData={initialFormData}
        mapResponseToForm={mapResponseToForm}
        validateForm={validateForm}
        realtime={true}
        pollIntervalMs={0}
        refetchOnFocus={false}
        refetchOnReconnect={true}
        cache={true}
        cacheTTL={300000}
        enhancedHover={true}
      />

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
