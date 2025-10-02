import React, { useEffect, useState, useMemo } from 'react';
import { AdminCRUDPage, CRUDColumn, CRUDFormSection, CRUDConfig } from '@/components/common/AdminCRUDPage';
import { treatmentVaccinesService } from '@/services/treatmentVaccinesService';
import { treatmentsService } from '@/services/treatmentsService';
import { vaccinesService } from '@/services/vaccinesService';
import type { TreatmentVaccineResponse, TreatmentVaccineInput } from '@/types/swaggerTypes';

const AdminTreatmentVaccinesPage: React.FC = () => {
  const [treatmentOptions, setTreatmentOptions] = useState<{ value: number; label: string }[]>([]);
  const [vaccineOptions, setVaccineOptions] = useState<{ value: number; label: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Carga paralela optimizada de opciones
  useEffect(() => {
    const loadOptions = async () => {
      setLoading(true);
      try {
        // Cargar ambos recursos en paralelo para mejor rendimiento
        const [treatmentsResult, vaccinesResult] = await Promise.all([
          treatmentsService.getTreatments?.().catch((e) => {
            console.warn('[treatment_vaccines] No se pudo cargar tratamientos', e);
            return null;
          }),
          vaccinesService.getVaccines?.().catch((e) => {
            console.warn('[treatment_vaccines] No se pudo cargar vacunas', e);
            return null;
          })
        ]);

        // Procesar tratamientos
        if (treatmentsResult) {
          const itemsT = Array.isArray(treatmentsResult) ? treatmentsResult : treatmentsResult?.data || [];
          setTreatmentOptions((itemsT || []).map((t: any) => ({
            value: t.id,
            label: [t.diagnosis, t.notes || t.description].filter(Boolean).join(' — ') || `Tratamiento ${t.id}`,
          })));
        }

        // Procesar vacunas
        if (vaccinesResult) {
          const itemsV = Array.isArray(vaccinesResult) ? vaccinesResult : vaccinesResult?.data || [];
          setVaccineOptions((itemsV || []).map((v: any) => ({
            value: v.id,
            label: [v.name, v.description].filter(Boolean).join(' — ') || `Vacuna ${v.id}`,
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

  const vaccineMap = useMemo(() => {
    const map = new Map<number, string>();
    vaccineOptions.forEach(opt => map.set(opt.value, opt.label));
    return map;
  }, [vaccineOptions]);

  // Columnas de la tabla con renderizado optimizado
  const columns: CRUDColumn<TreatmentVaccineResponse & { [k: string]: any }>[] = useMemo(() => [
    { key: 'id', label: 'ID', width: 10 },
    {
      key: 'treatment_id',
      label: 'Tratamiento',
      render: (v) => treatmentMap.get(Number(v)) || `Tratamiento ${v}` || '-'
    },
    {
      key: 'vaccine_id',
      label: 'Vacuna',
      render: (v) => vaccineMap.get(Number(v)) || `Vacuna ${v}` || '-'
    },
    { key: 'dose' as any, label: 'Dosis', render: (v) => v || '-' },
    { key: 'created_at' as any, label: 'Creado', render: (v) => (v ? new Date(v as string).toLocaleDateString('es-ES') : '-') },
    { key: 'updated_at' as any, label: 'Actualizado', render: (v) => (v ? new Date(v as string).toLocaleDateString('es-ES') : '-') },
  ], [treatmentMap, vaccineMap]);

  // Formulario
  const formSectionsLocal: CRUDFormSection<TreatmentVaccineInput & { [k: string]: any }>[] = [
    {
      title: 'Asignación',
      gridCols: 2,
      fields: [
        { name: 'treatment_id' as any, label: 'Tratamiento', type: 'select', required: true, options: treatmentOptions, placeholder: 'Seleccione tratamiento' },
        { name: 'vaccine_id' as any, label: 'Vacuna', type: 'select', required: true, options: vaccineOptions, placeholder: 'Seleccione vacuna' },
        { name: 'dose' as any, label: 'Dosis', type: 'text', required: true, placeholder: 'Ej: 2ml', colSpan: 2 },
      ],
    },
  ];

  const crudConfigLocal: CRUDConfig<TreatmentVaccineResponse & { [k: string]: any }, TreatmentVaccineInput & { [k: string]: any }> = {
    title: 'Vacunas de Tratamiento',
    entityName: 'Vacuna de tratamiento',
    columns,
    formSections: formSectionsLocal,
    searchPlaceholder: 'Buscar vacunas de tratamiento...',
    emptyStateMessage: 'No hay vacunas de tratamiento',
    emptyStateDescription: 'Crea el primero para comenzar.',
    enableDetailModal: true,
    enableCreateModal: true,
    enableEditModal: true,
    enableDelete: true,
  };

  // Mapeo respuesta -> formulario
  const mapResponseToForm = (item: TreatmentVaccineResponse & { [k: string]: any }): TreatmentVaccineInput & { [k: string]: any } => ({
    treatment_id: item.treatment_id,
    vaccine_id: item.vaccine_id,
    dose: (item as any).dose || '',
  });

  // Validación
  const validateForm = (formData: TreatmentVaccineInput & { [k: string]: any }): string | null => {
    if (!formData.treatment_id) return 'El tratamiento es obligatorio.';
    if (!formData.vaccine_id) return 'La vacuna es obligatoria.';
    if (!formData.dose || !String(formData.dose).trim()) return 'La dosis es obligatoria.';
    return null;
  };

  // Datos iniciales
  const initialFormData: TreatmentVaccineInput & { [k: string]: any } = {
    treatment_id: 0,
    vaccine_id: 0,
    dose: '',
  };

  // No renderizar hasta que las opciones estén cargadas
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando vacunas de tratamiento...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminCRUDPage
      config={crudConfigLocal}
      service={treatmentVaccinesService}
      initialFormData={initialFormData}
      mapResponseToForm={mapResponseToForm}
      validateForm={validateForm}
    />
  );
};

export default AdminTreatmentVaccinesPage;
