import React, { useMemo } from 'react';
import { AdminCRUDPage, CRUDColumn, CRUDFormSection, CRUDConfig } from '@/components/common/AdminCRUDPage';
import { vaccinationsService } from '@/services/vaccinationsService';
import { animalsService } from '@/services/animalService';
import { vaccinesService } from '@/services/vaccinesService';
import { usersService } from '@/services/userService';
import type { VaccinationResponse, VaccinationInput } from '@/types/swaggerTypes';

function AdminVaccinationsPage() {
  const [animalOptions, setAnimalOptions] = React.useState<Array<{ value: number; label: string }>>([]);
  const [vaccineOptions, setVaccineOptions] = React.useState<Array<{ value: number; label: string }>>([]);
  const [apprenticeOptions, setApprenticeOptions] = React.useState<Array<{ value: number; label: string }>>([]);
  const [instructorOptions, setInstructorOptions] = React.useState<Array<{ value: number; label: string }>>([]);
  const [loading, setLoading] = React.useState(true);

  // Carga paralela optimizada de opciones
  React.useEffect(() => {
    const loadOptions = async () => {
      setLoading(true);
      try {
        const [animalsResult, vaccinesResult, usersResult] = await Promise.all([
          animalsService.getAnimals({ page: 1, limit: 1000 }).catch((e) => {
            console.warn('[vaccinations] No se pudieron cargar animales', e);
            return null;
          }),
          vaccinesService.getVaccines?.({ page: 1, limit: 1000 }).catch((e) => {
            console.warn('[vaccinations] No se pudieron cargar vacunas', e);
            return null;
          }),
          usersService.getUsers({ page: 1, limit: 1000 }).catch((e: any) => {
            console.warn('[vaccinations] No se pudieron cargar usuarios', e);
            return null;
          })
        ]);

        // Procesar animales
        if (animalsResult) {
          setAnimalOptions((animalsResult || []).map((a: any) => ({
            value: a.id,
            label: a.record || `ID ${a.id}`
          })));
        }

        // Procesar vacunas
        if (vaccinesResult) {
          const items = (vaccinesResult as any)?.data || vaccinesResult || [];
          setVaccineOptions((items || []).map((v: any) => ({
            value: v.id,
            label: v.name || `Vacuna ${v.id}`
          })));
        }

        // Procesar usuarios (aprendices e instructores)
        if (usersResult) {
          const users = (usersResult as any)?.data || usersResult || [];
          const usersList = (users || []).map((u: any) => ({
            value: u.id,
            label: u.fullname || u.name || `Usuario ${u.id}`
          }));

          // Filtrar por roles si es posible, de lo contrario usar la misma lista
          setApprenticeOptions(usersList);
          setInstructorOptions(usersList);
        }
      } finally {
        setLoading(false);
      }
    };

    loadOptions();
  }, []);

  // Crear mapas de búsqueda optimizados
  const animalMap = useMemo(() => {
    const map = new Map<number, string>();
    animalOptions.forEach(opt => map.set(opt.value, opt.label));
    return map;
  }, [animalOptions]);

  const vaccineMap = useMemo(() => {
    const map = new Map<number, string>();
    vaccineOptions.forEach(opt => map.set(opt.value, opt.label));
    return map;
  }, [vaccineOptions]);

  const apprenticeMap = useMemo(() => {
    const map = new Map<number, string>();
    apprenticeOptions.forEach(opt => map.set(opt.value, opt.label));
    return map;
  }, [apprenticeOptions]);

  const instructorMap = useMemo(() => {
    const map = new Map<number, string>();
    instructorOptions.forEach(opt => map.set(opt.value, opt.label));
    return map;
  }, [instructorOptions]);

  // Columnas de la tabla con renderizado optimizado
  const columns: CRUDColumn<VaccinationResponse & { [k: string]: any }>[] = useMemo(() => [
    { key: 'id', label: 'ID', width: 12 },
    { key: 'vaccination_date', label: 'Fecha', render: (v) => (v ? new Date(v as string).toLocaleDateString('es-ES') : '-') },
    {
      key: 'animal_id',
      label: 'Animal',
      render: (v) => animalMap.get(Number(v)) || `Animal ${v}` || '-'
    },
    {
      key: 'vaccine_id',
      label: 'Vacuna',
      render: (v) => vaccineMap.get(Number(v)) || `Vacuna ${v}` || '-'
    },
    {
      key: 'apprentice_id',
      label: 'Aprendiz',
      render: (v) => v ? (apprenticeMap.get(Number(v)) || `Aprendiz ${v}`) : '-'
    },
    {
      key: 'instructor_id',
      label: 'Instructor',
      render: (v) => v ? (instructorMap.get(Number(v)) || `Instructor ${v}`) : '-'
    },
    { key: 'created_at' as any, label: 'Creado', render: (v) => (v ? new Date(v as string).toLocaleDateString('es-ES') : '-') },
  ], [animalMap, vaccineMap, apprenticeMap, instructorMap]);

  const formSections: CRUDFormSection<VaccinationInput & { [k: string]: any }>[] = [
    {
      title: 'Información de Vacunación',
      gridCols: 2,
      fields: [
        { name: 'animal_id', label: 'Animal', type: 'select', required: true, options: animalOptions, placeholder: 'Seleccionar animal' },
        { name: 'vaccine_id', label: 'Vacuna', type: 'select', required: true, options: vaccineOptions, placeholder: 'Seleccionar vacuna' },
        { name: 'vaccination_date', label: 'Fecha de Vacunación', type: 'date', required: true },
        { name: 'apprentice_id' as any, label: 'Aprendiz', type: 'select', options: apprenticeOptions, placeholder: 'Seleccionar aprendiz' },
        { name: 'instructor_id' as any, label: 'Instructor', type: 'select', options: instructorOptions, placeholder: 'Seleccionar instructor', colSpan: 2 },
      ],
    },
  ];

  const crudConfig: CRUDConfig<VaccinationResponse & { [k: string]: any }, VaccinationInput & { [k: string]: any }> = {
    title: 'Vacunaciones',
    entityName: 'Vacunación',
    columns,
    formSections,
    searchPlaceholder: 'Buscar vacunaciones...',
    emptyStateMessage: 'No hay vacunaciones registradas.',
    emptyStateDescription: 'Crea la primera vacunación para comenzar.',
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
          <p className="text-muted-foreground">Cargando vacunaciones...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminCRUDPage
      config={crudConfig}
      service={vaccinationsService}
      initialFormData={initialFormData}
      mapResponseToForm={mapResponseToForm}
      validateForm={validateForm}
      enhancedHover={true}
    />
  );
}

export default AdminVaccinationsPage;

// Mapear respuesta a formulario
const mapResponseToForm = (item: VaccinationResponse & { [k: string]: any }): VaccinationInput & { [k: string]: any } => ({
  animal_id: item.animal_id,
  vaccine_id: item.vaccine_id,
  vaccination_date: item.vaccination_date,
  apprentice_id: item.apprentice_id,
  instructor_id: item.instructor_id,
});

// Validación
const validateForm = (formData: VaccinationInput & { [k: string]: any }): string | null => {
  if (!formData.animal_id) return 'El animal es obligatorio.';
  if (!formData.vaccine_id) return 'La vacuna es obligatoria.';
  if (!formData.vaccination_date) return 'La fecha de vacunación es obligatoria.';
  return null;
};

// Datos iniciales
const initialFormData: VaccinationInput & { [k: string]: any } = {
  animal_id: 0,
  vaccine_id: 0,
  vaccination_date: new Date().toISOString().split('T')[0],
  apprentice_id: undefined,
  instructor_id: undefined,
};
