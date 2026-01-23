import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { AdminCRUDPage, CRUDColumn, CRUDFormSection, CRUDConfig } from '@/shared/ui/common/AdminCRUDPage';
import { treatmentsService } from '@/entities/treatment/api/treatments.service';
import { animalsService } from '@/entities/animal/api/animal.service';
import { Button } from '@/shared/ui/button';
import { TreatmentSuppliesModal } from '@/widgets/dashboard/treatments/TreatmentSuppliesModal';
import { TreatmentSuppliesPanel } from '@/widgets/dashboard/treatments/TreatmentSuppliesPanel';
import type { TreatmentResponse, TreatmentInput } from '@/shared/api/generated/swaggerTypes';
import { getTodayColombia } from '@/shared/utils/dateUtils';
import { AnimalLink } from '@/shared/ui/common/ForeignKeyHelpers';
import { useToast } from '@/app/providers/ToastContext';
import { Badge } from '@/shared/ui/badge';

const AdminTreatmentsPage: React.FC = () => {
  const { showToast } = useToast();
  const [animalOptions, setAnimalOptions] = useState<{ value: number; label: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // States for supplies modal
  const [assocOpen, setAssocOpen] = useState(false);
  const [selectedTreatment, setSelectedTreatment] = useState<TreatmentResponse | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res: any = await animalsService.getAnimals?.();
        const items = Array.isArray(res) ? res : res?.data || res?.items || [];
        setAnimalOptions((items || []).map((a: any) => ({
          value: a.id,
          label: a.record || a.tag || `ID ${a.id}`
        })));
      } catch (e) {
        showToast('Error al cargar animales', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, [showToast]);

  const animalMap = useMemo(() => {
    const map = new Map<number, string>();
    animalOptions.forEach(opt => map.set(opt.value, opt.label));
    return map;
  }, [animalOptions]);

  const openAssociations = useCallback((item: TreatmentResponse) => {
    setSelectedTreatment(item);
    setAssocOpen(true);
  }, []);

  const closeAssociations = useCallback(() => {
    setAssocOpen(false);
    setSelectedTreatment(null);
  }, []);

  const TreatmentAssociationsPanel: React.FC<{ item: TreatmentResponse }> = ({ item }) => {
    return (
      <div className="pt-2">
        <TreatmentSuppliesPanel treatment={item} />
      </div>
    );
  };

  const columns: CRUDColumn<TreatmentResponse & { [k: string]: any }>[] = useMemo(() => [
    {
      key: 'action' as any,
      label: '',
      sortable: false,
      render: (_v, item) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-primary hover:text-primary hover:bg-primary/10"
          onClick={(e) => {
            e.stopPropagation();
            openAssociations(item);
          }}
          title="Ver Insumos"
        >
          <span className="flex items-center gap-1">💉 Ver Insumos</span>
        </Button>
      )
    },
    {
      key: 'animal_id' as any,
      label: 'Animal',
      render: (value: any) => {
        if (!value) return '-';
        const id = Number(value);
        const label = animalMap.get(id) || `Animal ${id}`;
        return <AnimalLink id={id} label={label} />;
      }
    },
    {
      key: 'treatment_date' as any,
      label: 'Fecha',
      render: (v) => (v ? new Date(String(v)).toLocaleDateString('es-ES') : '-')
    },
    {
      key: 'diagnosis' as any,
      label: 'Diagnóstico',
      render: (v) => v || '-'
    },
    {
      key: 'dosis' as any,
      label: 'Dosis',
      render: (_v, item) => (item as any).dosis ?? (item as any).dose ?? '-'
    },
    {
      key: 'frequency' as any,
      label: 'Frecuencia',
      render: (_v, item) => (item as any).frequency ?? (item as any).frecuencia ?? '-'
    },
    {
      key: 'created_at' as any,
      label: 'Creado',
      render: (v) => (v ? new Date(String(v)).toLocaleString('es-ES') : '-')
    },
  ], [animalMap, openAssociations]);

  const formSections: CRUDFormSection<TreatmentInput & { [k: string]: any }>[] = [
    {
      title: 'Información del Tratamiento',
      gridCols: 2,
      fields: [
        { name: 'animal_id' as any, label: 'Animal', type: 'select', required: true, options: animalOptions, placeholder: 'Seleccionar animal' },
        { name: 'treatment_date' as any, label: 'Fecha', type: 'date', required: true },
        { name: 'diagnosis' as any, label: 'Diagnóstico', type: 'text', required: true, placeholder: 'Ej: Fiebre, infección...' },
        { name: 'description' as any, label: 'Descripción', type: 'textarea', placeholder: 'Detalles del tratamiento', colSpan: 2 },
        { name: 'dosis' as any, label: 'Dosis', type: 'text', placeholder: 'Ej: 10ml' },
        { name: 'frequency' as any, label: 'Frecuencia', type: 'text', placeholder: 'Ej: Cada 12 horas' },
        { name: 'observations' as any, label: 'Observaciones', type: 'textarea', placeholder: 'Notas adicionales', colSpan: 2 },
      ],
    },
  ];

  const crudConfig: CRUDConfig<TreatmentResponse & { [k: string]: any }, TreatmentInput & { [k: string]: any }> = {
    title: 'Tratamientos',
    entityName: 'Tratamiento',
    columns,
    formSections,
    searchPlaceholder: 'Buscar tratamientos...',
    emptyStateMessage: 'No hay tratamientos registrados.',
    emptyStateDescription: 'Crea el primer registro para comenzar.',
    enableDetailModal: true,
    enableCreateModal: true,
    enableEditModal: true,
    enableDelete: true,
    showDetailTimestamps: false,
    showEditTimestamps: false,
    showIdInDetailTitle: false,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="text-center animate-pulse">
          <p className="text-muted-foreground text-sm">Cargando tratamientos...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <AdminCRUDPage
        config={crudConfig}
        service={treatmentsService}
        initialFormData={buildInitialFormData}
        mapResponseToForm={mapResponseToForm}
        validateForm={validateForm}
        customDetailContent={(item) => <TreatmentAssociationsPanel item={item as any} />}
        realtime={true}
      />

      <TreatmentSuppliesModal
        isOpen={assocOpen}
        onClose={closeAssociations}
        treatment={selectedTreatment}
      />
    </>
  );
};

// Handlers for AdminCRUDPage
const mapResponseToForm = (item: TreatmentResponse & { [k: string]: any }): TreatmentInput & { [k: string]: any } => ({
  animal_id: item.animal_id ?? (item as any)?.animal?.id,
  treatment_date: (item as any).treatment_date || (item as any).date || '',
  diagnosis: (item as any).diagnosis ?? (item as any).description ?? '',
  description: (item as any).description ?? (item as any).diagnosis ?? '',
  dosis: (item as any).dosis ?? (item as any).dose ?? '',
  frequency: (item as any).frequency ?? (item as any).frecuencia ?? '',
  observations: (item as any).observations ?? (item as any).notes ?? '',
});

const validateForm = (formData: TreatmentInput & { [k: string]: any }): string | null => {
  if (!formData.animal_id) return 'El animal es obligatorio.';
  if (!formData.treatment_date) return 'La fecha es obligatoria.';
  if (!formData.diagnosis?.trim()) return 'El diagnóstico es obligatorio.';
  return null;
};

const buildInitialFormData = (): TreatmentInput & { [k: string]: any } => ({
  animal_id: 0,
  treatment_date: getTodayColombia(),
  diagnosis: '',
  description: '',
  dosis: '',
  frequency: '',
  observations: '',
});

export default AdminTreatmentsPage;
