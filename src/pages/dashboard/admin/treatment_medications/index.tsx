import React, { useMemo } from 'react';
import { AdminCRUDPage, CRUDColumn, CRUDFormSection, CRUDConfig } from '@/components/common/AdminCRUDPage';
import { treatmentMedicationService } from '@/services/treatmentMedicationService';
import { treatmentsService } from '@/services/treatmentsService';
import { medicationsService } from '@/services/medicationsService';
import type { TreatmentMedicationResponse, TreatmentMedicationInput } from '@/types/swaggerTypes';

function AdminTreatmentMedicationsPage() {
  const [treatmentOptions, setTreatmentOptions] = React.useState<Array<{ value: number; label: string }>>([]);
  const [medicationOptions, setMedicationOptions] = React.useState<Array<{ value: number; label: string }>>([]);
  const [loading, setLoading] = React.useState(true);

  // Carga paralela optimizada de opciones
  React.useEffect(() => {
    const loadOptions = async () => {
      setLoading(true);
      try {
        const [treatmentsResult, medicationsResult] = await Promise.all([
          treatmentsService.getTreatments?.().catch((e) => {
            console.warn('[treatment_medications] No se pudieron cargar tratamientos', e);
            return null;
          }),
          medicationsService.getMedications?.().catch((e) => {
            console.warn('[treatment_medications] No se pudieron cargar medicamentos', e);
            return null;
          })
        ]);

        // Procesar tratamientos
        if (treatmentsResult) {
          const items = (treatmentsResult as any)?.data || treatmentsResult || [];
          setTreatmentOptions((items || []).map((t: any) => ({
            value: t.id,
            label: t.diagnosis || `Tratamiento ${t.id}`
          })));
        }

        // Procesar medicamentos
        if (medicationsResult) {
          const items = (medicationsResult as any)?.data || medicationsResult || [];
          setMedicationOptions((items || []).map((m: any) => ({
            value: m.id,
            label: m.name || `Medicamento ${m.id}`
          })));
        }
      } finally {
        setLoading(false);
      }
    };

    loadOptions();
  }, []);

  // Crear mapas de búsqueda optimizados
  const treatmentMap = useMemo(() => {
    const map = new Map<number, string>();
    treatmentOptions.forEach(opt => map.set(opt.value, opt.label));
    return map;
  }, [treatmentOptions]);

  const medicationMap = useMemo(() => {
    const map = new Map<number, string>();
    medicationOptions.forEach(opt => map.set(opt.value, opt.label));
    return map;
  }, [medicationOptions]);

  // Columnas de la tabla con renderizado optimizado
  const columns: CRUDColumn<TreatmentMedicationResponse & { [k: string]: any }>[] = useMemo(() => [
    
    {
      key: 'treatment_id',
      label: 'Tratamiento',
      render: (v) => treatmentMap.get(Number(v)) || `Tratamiento ${v}` || '-'
    },
    {
      key: 'medication_id',
      label: 'Medicamento',
      render: (v) => medicationMap.get(Number(v)) || `Medicamento ${v}` || '-'
    },
    { key: 'created_at' as any, label: 'Creado', render: (v) => (v ? new Date(v as string).toLocaleDateString('es-ES') : '-') },
    { key: 'updated_at' as any, label: 'Actualizado', render: (v) => (v ? new Date(v as string).toLocaleDateString('es-ES') : '-') },
  ], [treatmentMap, medicationMap]);

  const formSections: CRUDFormSection<TreatmentMedicationInput & { [k: string]: any }>[] = [
    {
      title: 'Asignación de Medicamento',
      gridCols: 2,
      fields: [
        { name: 'treatment_id' as any, label: 'Tratamiento', type: 'select', required: true, options: treatmentOptions, placeholder: 'Seleccionar tratamiento' },
        { name: 'medication_id' as any, label: 'Medicamento', type: 'select', required: true, options: medicationOptions, placeholder: 'Seleccionar medicamento' },
      ],
    },
  ];

  const crudConfig: CRUDConfig<TreatmentMedicationResponse & { [k: string]: any }, TreatmentMedicationInput & { [k: string]: any }> = {
    title: 'Medicamentos de Tratamiento',
    entityName: 'Medicamento de tratamiento',
    columns,
    formSections,
    searchPlaceholder: 'Buscar medicamentos de tratamiento...',
    emptyStateMessage: 'No hay medicamentos de tratamiento registrados.',
    emptyStateDescription: 'Crea el primer registro para comenzar.',
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
          <p className="text-muted-foreground">Cargando medicamentos de tratamiento...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminCRUDPage
      config={crudConfig}
      service={treatmentMedicationService}
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
}

export default AdminTreatmentMedicationsPage;

// Mapear respuesta a formulario
const mapResponseToForm = (item: TreatmentMedicationResponse & { [k: string]: any }): TreatmentMedicationInput & { [k: string]: any } => ({
  treatment_id: item.treatment_id,
  medication_id: item.medication_id,
});

// Validación
const validateForm = (formData: TreatmentMedicationInput & { [k: string]: any }): string | null => {
  if (!formData.treatment_id) return 'El tratamiento es obligatorio.';
  if (!formData.medication_id) return 'El medicamento es obligatorio.';
  return null;
};

// Datos iniciales
const initialFormData: TreatmentMedicationInput & { [k: string]: any } = {
  treatment_id: 0,
  medication_id: 0,
};
