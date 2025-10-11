import React, { useMemo } from 'react';
import { AdminCRUDPage, CRUDColumn, CRUDFormSection, CRUDConfig } from '@/components/common/AdminCRUDPage';
import { vaccinesService } from '@/services/vaccinesService';
import { routeAdministrationsService } from '@/services/routeAdministrationsService';
import { diseaseService } from '@/services/diseaseService';
import { VACCINE_TYPES } from '@/constants/enums';
import type { VaccineResponse, VaccineInput } from '@/types/swaggerTypes';

function AdminVaccinesPage() {
  const [routeOptions, setRouteOptions] = React.useState<Array<{ value: number; label: string }>>([]);
  const [diseaseOptions, setDiseaseOptions] = React.useState<Array<{ value: number; label: string }>>([]);
  const [loading, setLoading] = React.useState(true);

  // Carga paralela optimizada de opciones
  React.useEffect(() => {
    const loadOptions = async () => {
      setLoading(true);
      try {
        const [routesResult, diseasesResult] = await Promise.all([
          routeAdministrationsService.getRouteAdministrations?.({ page: 1, limit: 1000 }).catch((e) => {
            console.warn('[vaccines] No se pudieron cargar rutas de administración', e);
            return null;
          }),
          diseaseService.getDiseases({ page: 1, limit: 1000 }).catch((e) => {
            console.warn('[vaccines] No se pudieron cargar enfermedades', e);
            return null;
          })
        ]);

        // Procesar rutas de administración
        if (routesResult) {
          const items = (routesResult as any)?.data || routesResult || [];
          setRouteOptions((items || []).map((r: any) => ({
            value: r.id,
            label: r.name || r.route || `Ruta ${r.id}`
          })));
        }

        // Procesar enfermedades
        if (diseasesResult) {
          const items = (diseasesResult as any)?.data || diseasesResult || [];
          setDiseaseOptions((items || []).map((d: any) => ({
            value: d.id,
            label: d.disease || d.name || `Enfermedad ${d.id}`
          })));
        }
      } finally {
        setLoading(false);
      }
    };

    loadOptions();
  }, []);

  // Crear mapas de búsqueda optimizados
  const routeMap = useMemo(() => {
    const map = new Map<number, string>();
    routeOptions.forEach(opt => map.set(opt.value, opt.label));
    return map;
  }, [routeOptions]);

  const diseaseMap = useMemo(() => {
    const map = new Map<number, string>();
    diseaseOptions.forEach(opt => map.set(opt.value, opt.label));
    return map;
  }, [diseaseOptions]);

  // Columnas de la tabla con renderizado optimizado
  const columns: CRUDColumn<VaccineResponse & { [k: string]: any }>[] = useMemo(() => [
    
    { key: 'name', label: 'Nombre' },
    { key: 'type', label: 'Tipo', render: (v) => v || '-' },
    { key: 'dosis', label: 'Dosis', render: (v) => v || '-' },
    {
      key: 'route_administration_id',
      label: 'Ruta Admin.',
      render: (v) => v ? (routeMap.get(Number(v)) || `Ruta ${v}`) : '-'
    },
    { key: 'vaccination_interval', label: 'Intervalo (días)', render: (v) => v || '-' },
    {
      key: 'target_disease_id',
      label: 'Enfermedad Objetivo',
      render: (v) => v ? (diseaseMap.get(Number(v)) || `Enfermedad ${v}`) : '-'
    },
    { key: 'national_plan', label: 'Plan Nacional', render: (v) => v ? 'Sí' : 'No' },
    { key: 'created_at' as any, label: 'Creado', render: (v) => (v ? new Date(v as string).toLocaleDateString('es-ES') : '-') },
  ], [routeMap, diseaseMap]);

  const formSections: CRUDFormSection<VaccineInput & { [k: string]: any }>[] = [
    {
      title: 'Información Básica',
      gridCols: 2,
      fields: [
        { name: 'name', label: 'Nombre', type: 'text', required: true, placeholder: 'Ej: Vacuna contra Aftosa', colSpan: 2 },
        { name: 'type', label: 'Tipo', type: 'select', options: VACCINE_TYPES as any, placeholder: 'Seleccionar tipo' },
        { name: 'dosis', label: 'Dosis', type: 'text', placeholder: 'Ej: 2 mL' },
        { name: 'route_administration_id' as any, label: 'Ruta de Administración', type: 'select', options: routeOptions, placeholder: 'Seleccionar ruta' },
        { name: 'vaccination_interval' as any, label: 'Intervalo de Vacunación (días)', type: 'number', placeholder: 'Ej: 180' },
        { name: 'target_disease_id' as any, label: 'Enfermedad Objetivo', type: 'select', options: diseaseOptions, placeholder: 'Seleccionar enfermedad', colSpan: 2 },
        { name: 'national_plan' as any, label: 'Plan Nacional', type: 'checkbox', colSpan: 2 },
      ],
    },
  ];

  const crudConfig: CRUDConfig<VaccineResponse & { [k: string]: any }, VaccineInput & { [k: string]: any }> = {
    title: 'Vacunas',
    entityName: 'Vacuna',
    columns,
    formSections,
    searchPlaceholder: 'Buscar vacunas...',
    emptyStateMessage: 'No hay vacunas registradas.',
    emptyStateDescription: 'Crea la primera vacuna para comenzar.',
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
          <p className="text-muted-foreground">Cargando vacunas...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminCRUDPage
      config={crudConfig}
      service={vaccinesService}
      initialFormData={initialFormData}
      mapResponseToForm={mapResponseToForm}
      validateForm={validateForm}
      enhancedHover={true}
    />
  );
}

export default AdminVaccinesPage;

// Mapear respuesta a formulario
const mapResponseToForm = (item: VaccineResponse & { [k: string]: any }): VaccineInput & { [k: string]: any } => ({
  name: item.name || '',
  dosis: item.dosis,
  route_administration_id: item.route_administration_id,
  vaccination_interval: item.vaccination_interval,
  type: item.type,
  national_plan: item.national_plan,
  target_disease_id: item.target_disease_id,
});

// Validación
const validateForm = (formData: VaccineInput & { [k: string]: any }): string | null => {
  if (!formData.name || !formData.name.trim()) return 'El nombre es obligatorio.';
  return null;
};

// Datos iniciales
const initialFormData: VaccineInput & { [k: string]: any } = {
  name: '',
  dosis: '',
  route_administration_id: undefined,
  vaccination_interval: undefined,
  type: undefined,
  national_plan: false,
  target_disease_id: undefined,
};
