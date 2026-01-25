import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AdminCRUDPage, CRUDColumn, CRUDFormSection, CRUDConfig } from '@/shared/ui/common/AdminCRUDPage';
import { animalDiseasesService } from '@/entities/animal-disease/api/animalDiseases.service';
import { animalsService } from '@/entities/animal/api/animal.service';
import { diseaseService } from '@/entities/disease/api/disease.service';
import { usersService } from '@/entities/user/api/user.service';
import { ANIMAL_DISEASE_STATUSES } from '@/shared/constants/enums';
import type { AnimalDiseaseResponse, AnimalDiseaseInput } from '@/shared/api/generated/swaggerTypes';
import { getTodayColombia } from '@/shared/utils/dateUtils';
import { AnimalLink, DiseaseLink, UserLink } from '@/shared/ui/common/ForeignKeyHelpers';
import { useForeignKeySelect } from '@/shared/hooks/useForeignKeySelect';

function AdminAnimalDiseasesPage() {
  const [searchParams] = useSearchParams();
  const preselectedUserId = searchParams.get('user_id');

  const { options: animalOptions, loading: animalLoading } = useForeignKeySelect(
    (p) => animalsService.getAnimals(p),
    (a) => ({ value: a.id, label: a.record || `ID ${a.id}` })
  );

  const { options: diseaseOptions, loading: diseaseLoading } = useForeignKeySelect(
    (p) => diseaseService.getDiseases(p),
    (d) => ({ value: d.id, label: d.disease || d.name || `Enfermedad ${d.id}` })
  );

  const { options: instructorOptions, loading: instructorLoading } = useForeignKeySelect(
    (p) => usersService.getUsers(p),
    (u) => ({ value: u.id, label: u.fullname || u.name || `Usuario ${u.id}` })
  );

  // Crear mapas de búsqueda optimizados
  const animalMap = useMemo(() => {
    const map = new Map<number | string, string>();
    animalOptions.forEach(opt => map.set(opt.value, opt.label));
    return map;
  }, [animalOptions]);

  const diseaseMap = useMemo(() => {
    const map = new Map<number | string, string>();
    diseaseOptions.forEach(opt => map.set(opt.value, opt.label));
    return map;
  }, [diseaseOptions]);

  const instructorMap = useMemo(() => {
    const map = new Map<number | string, string>();
    instructorOptions.forEach(opt => map.set(opt.value, opt.label));
    return map;
  }, [instructorOptions]);

  // Columnas de la tabla con renderizado optimizado y Foreign Key Links
  const columns: CRUDColumn<AnimalDiseaseResponse & { [k: string]: any }>[] = useMemo(() => [
    { key: 'id', label: 'ID', render: (v) => v ?? '-' },

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
      key: 'disease_id',
      label: 'Enfermedad',
      render: (v) => {
        if (!v) return '-';
        const id = Number(v);
        const label = diseaseMap.get(id) || `Enfermedad ${id}`;
        return <DiseaseLink id={id} label={label} />;
      }
    },
    {
      key: 'instructor_id',
      label: 'Instructor',
      render: (v) => {
        if (!v) return '-';
        const id = Number(v);
        const label = instructorMap.get(id) || `Instructor ${id}`;
        return <UserLink id={id} label={label} role="Instructor" />;
      }
    },
    { key: 'diagnosis_date', label: 'Diagn¢stico', render: (v) => (v ? new Date(v as string).toLocaleDateString('es-ES') : '-') },
    { key: 'status', label: 'Estado', render: (v) => v || '-' },
    { key: 'notes' as any, label: 'Notas', render: (v) => v || '-' },
    { key: 'created_at' as any, label: 'Creado', render: (v) => (v ? new Date(v as string).toLocaleDateString('es-ES') : '-') },
    { key: 'updated_at' as any, label: 'Actualizado', render: (v) => (v ? new Date(v as string).toLocaleDateString('es-ES') : '-') },
  ], [animalMap, diseaseMap, instructorMap]);

  const formSections: CRUDFormSection<AnimalDiseaseInput & { [k: string]: any }>[] = [
    {
      title: 'Información Básica',
      gridCols: 2,
      fields: [
        { name: 'animal_id' as any, label: 'Animal', type: 'select', required: true, options: animalOptions, placeholder: 'Seleccionar animal', loading: animalLoading },
        { name: 'disease_id' as any, label: 'Enfermedad', type: 'select', required: true, options: diseaseOptions, placeholder: 'Seleccionar enfermedad', loading: diseaseLoading },
        { name: 'instructor_id' as any, label: 'Instructor', type: 'select', required: true, options: instructorOptions, placeholder: 'Seleccionar instructor', loading: instructorLoading },
        { name: 'diagnosis_date' as any, label: 'Fecha de Diagnóstico', type: 'date', required: true },
        { name: 'status' as any, label: 'Estado', type: 'select', options: ANIMAL_DISEASE_STATUSES as any, placeholder: 'Seleccionar estado', colSpan: 2 },
        { name: 'notes' as any, label: 'Notas', type: 'textarea', placeholder: 'Observaciones', colSpan: 2 },
      ],
    },
  ];

  const crudConfig: CRUDConfig<AnimalDiseaseResponse & { [k: string]: any }, AnimalDiseaseInput & { [k: string]: any }> = {
    title: 'Enfermedades de Animales',
    entityName: 'Enfermedad de animal',
    columns,
    formSections,
    searchPlaceholder: 'Buscar enfermedades de animales...',
    emptyStateMessage: 'No hay enfermedades de animales registradas.',
    emptyStateDescription: 'Crea el primer registro para comenzar.',
    enableDetailModal: true,
    enableCreateModal: true,
    enableEditModal: true,
    enableDelete: true,
  };

  // Crear initialFormData con usuario preseleccionado si existe
  const dynamicInitialFormData = useMemo(() => ({
    ...initialFormData,
    instructor_id: preselectedUserId ? Number(preselectedUserId) : undefined as any,
  }), [preselectedUserId]);

  // Opciones de configuración de AdminCRUDPage

  return (
    <AdminCRUDPage
      config={crudConfig}
      service={animalDiseasesService}
      initialFormData={dynamicInitialFormData}
      mapResponseToForm={mapResponseToForm}
      validateForm={validateForm}
      additionalFormContent={(_formData, editingItem) => {
        if (!editingItem) return null;
        return (
          <div className="mt-4 rounded-lg border border-border/50 bg-muted/20 p-3 text-xs sm:text-sm">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div><span className="font-semibold">ID:</span> {editingItem.id}</div>
              <div><span className="font-semibold">Creado:</span> {editingItem.created_at ? new Date(editingItem.created_at as any).toLocaleString("es-ES") : "-"}</div>
              <div><span className="font-semibold">Actualizado:</span> {editingItem.updated_at ? new Date(editingItem.updated_at as any).toLocaleString("es-ES") : "-"}</div>
            </div>
          </div>
        );
      }}
      realtime={true}
      pollIntervalMs={0}
      refetchOnFocus={false}
      refetchOnReconnect={true}
      cache={true}
      cacheTTL={300000}
      enhancedHover={true}
    />
  );
}

export default AdminAnimalDiseasesPage;

// Mapear respuesta a formulario
const mapResponseToForm = (item: AnimalDiseaseResponse & { [k: string]: any }): AnimalDiseaseInput & { [k: string]: any } => ({
  animal_id: item.animal_id,
  disease_id: item.disease_id,
  instructor_id: item.instructor_id,
  diagnosis_date: item.diagnosis_date,
  status: item.status,
  notes: item.notes || '',
});

// Validación
const validateForm = (formData: AnimalDiseaseInput & { [k: string]: any }): string | null => {
  // Validar animal_id: debe ser un número válido > 0
  const animalId = Number(formData.animal_id);
  if (!formData.animal_id || Number.isNaN(animalId) || animalId <= 0) {
    return '⚠️ Debe seleccionar un animal válido.';
  }

  // Validar disease_id: debe ser un número válido > 0
  const diseaseId = Number(formData.disease_id);
  if (!formData.disease_id || Number.isNaN(diseaseId) || diseaseId <= 0) {
    return '⚠️ Debe seleccionar una enfermedad válida.';
  }

  // Validar instructor_id: debe ser un número válido > 0
  const instructorId = Number(formData.instructor_id);
  if (!formData.instructor_id || Number.isNaN(instructorId) || instructorId <= 0) {
    return '⚠️ Debe seleccionar un instructor válido.';
  }

  if (!formData.diagnosis_date) return 'La fecha de diagnóstico es obligatoria.';
  return null;
};

// Datos iniciales
const initialFormData: AnimalDiseaseInput & { [k: string]: any } = {
  animal_id: undefined as any, // Forzar que el usuario seleccione
  disease_id: undefined as any, // Forzar que el usuario seleccione
  instructor_id: undefined as any, // Forzar que el usuario seleccione
  diagnosis_date: getTodayColombia(),
  status: ANIMAL_DISEASE_STATUSES[0]?.value ?? 'Activo',
  notes: '',
};
