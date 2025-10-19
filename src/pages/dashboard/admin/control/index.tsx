import React, { useEffect, useState, useMemo } from 'react';
import { AdminCRUDPage, CRUDColumn, CRUDFormSection, CRUDConfig } from '@/components/common/AdminCRUDPage';
import { controlService } from '@/services/controlService';
import { animalsService } from '@/services/animalService';
// Importar tipo ControlForm si no existe, lo definimos localmente arriba
// Ajustar el tipo importado: ya no usamos ControlInput aquí
import type { ControlResponse } from '@/types/swaggerTypes';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Edit, Activity, TrendingUp } from 'lucide-react';
import { getTodayColombia } from '@/utils/dateUtils';
import { AnimalLink } from '@/components/common/ForeignKeyHelpers';
import { SectionCard, InfoField, modalStyles } from '@/components/common/ModalStyles';

// Tipo de formulario simplificado alineado al JSON solicitado
type ControlForm = {
  animal_id: number;
  checkup_date: string;
  weight?: number;
  height?: number;
  health_status?: string;
  description?: string;
};

// Secciones del formulario basadas en opciones dinámicas
const formSectionsLocal = (
  animalOptions: { value: number; label: string }[]
): CRUDFormSection<ControlForm>[] => [
  {
    title: 'Información Básica',
    gridCols: 2,
    fields: [
      { name: 'animal_id', label: 'Animal', type: 'select', required: true, options: animalOptions, placeholder: 'Seleccionar animal' },
      { name: 'checkup_date', label: 'Fecha de Chequeo', type: 'date', required: true, placeholder: 'YYYY-MM-DD' },
    ],
  },
  {
    title: 'Métricas Básicas',
    gridCols: 2,
    fields: [
      { name: 'weight', label: 'Peso (kg)', type: 'number', validation: { min: 0 }, placeholder: 'Peso en kg' },
      { name: 'height', label: 'Altura (m)', type: 'number', validation: { min: 0 }, placeholder: 'Altura en metros' },
      {
        name: 'health_status',
        label: 'Estado de Salud',
        type: 'select',
        required: true,
        options: [
          { value: 'Excelente', label: 'Excelente' },
          { value: 'Bueno', label: 'Bueno' },
          { value: 'Regular', label: 'Regular' },
          { value: 'Malo', label: 'Malo' },
          { value: 'Sano', label: 'Sano' }
        ],
        placeholder: 'Seleccionar estado'
      },
    ],
  },
  {
    title: 'Descripción',
    fields: [
      { name: 'description', label: 'Descripción', type: 'textarea', placeholder: 'Descripción...', colSpan: 2 },
    ],
  },
];

// Función para renderizar tarjetas de controles
const renderControlCard = (animalOptions: { value: number; label: string }[]) => (item: ControlResponse & { [k: string]: any }) => {
  const animalLabel = animalOptions.find(opt => opt.value === item.animal_id)?.label || `Animal ${item.animal_id}`;
  const checkupDate = (item as any)?.checkup_date ?? (item as any)?.control_date;
  const formattedDate = checkupDate ? new Date(checkupDate as string).toLocaleDateString('es-ES') : '-';
  const healthStatus = (item as any)?.health_status ?? (item as any)?.healt_status ?? '-';
  const description = (item as any)?.description ?? (item as any)?.observations;

  const getBadgeColor = (status: string) => {
    switch(status) {
      case 'Excelente': return 'bg-green-500/90 hover:bg-green-600 text-white';
      case 'Bueno': case 'Sano': return 'bg-blue-500/90 hover:bg-blue-600 text-white';
      case 'Regular': return 'bg-yellow-500/90 hover:bg-yellow-600 text-white';
      case 'Malo': return 'bg-red-500/90 hover:bg-red-600 text-white';
      default: return 'bg-gray-500/90 hover:bg-gray-600 text-white';
    }
  };

  return (
    <div className={modalStyles.spacing.section}>
      <SectionCard title="Estado de Salud">
        <Badge className={`text-xs px-3 py-1 ${getBadgeColor(healthStatus)}`}>
          {healthStatus}
        </Badge>
      </SectionCard>

      <SectionCard title="Información del Control">
        <InfoField
          label="Animal"
          value={item.animal_id ? <AnimalLink id={item.animal_id} label={animalLabel} /> : '-'}
          valueSize="large"
        />
        <InfoField label="Fecha" value={formattedDate} />
      </SectionCard>

      <SectionCard title="Métricas">
        <div className={modalStyles.fieldsGrid}>
          <InfoField label="Peso" value={item.weight ? `${item.weight} kg` : '-'} valueSize="large" />
          <InfoField label="Altura" value={item.height ? `${item.height} m` : '-'} valueSize="large" />
        </div>
      </SectionCard>

      {description && (
        <SectionCard title="Descripción">
          <p className="text-xs text-foreground line-clamp-2">
            {description}
          </p>
        </SectionCard>
      )}
    </div>
  );
};

// Configuración completa del CRUD usando secciones dinámicas
const crudConfigLocal = (
  animalOptions: { value: number; label: string }[],
  columns: CRUDColumn<ControlResponse & { [k: string]: any }>[],
  viewMode: 'table' | 'cards',
  setViewMode: (mode: 'table' | 'cards') => void
): CRUDConfig<ControlResponse & { [k: string]: any }, ControlForm> => ({
  title: 'Controles',
  entityName: 'Control',
  columns,
  formSections: formSectionsLocal(animalOptions),
  searchPlaceholder: 'Buscar controles...',
  emptyStateMessage: 'No hay controles disponibles.',
  emptyStateDescription: 'Crea el primer registro para comenzar.',
  enableDetailModal: true,
  enableCreateModal: true,
  enableEditModal: true,
  enableDelete: true,
  showDetailTimestamps: false,
  showEditTimestamps: false,
  showIdInDetailTitle: false,
  viewMode,
  renderCard: renderControlCard(animalOptions),
  customToolbar: (
    <div className="flex items-center gap-1">
      <Button
        variant={viewMode === 'table' ? 'primary' : 'outline'}
        size="sm"
        className="h-7"
        onClick={() => setViewMode('table')}
        aria-label="Vista en tabla"
      >
        Tabla
      </Button>
      <Button
        variant={viewMode === 'cards' ? 'primary' : 'outline'}
        size="sm"
        className="h-7"
        onClick={() => setViewMode('cards')}
        aria-label="Vista en tarjetas"
      >
        Tarjetas
      </Button>
    </div>
  ),
  customActions: (record) => (
    <>
      <button
        className="icon-btn"
        onClick={(e) => {
          e.stopPropagation();
          // Aquí podrías abrir un modal de análisis detallado
          console.log('Análisis detallado del control:', record);
        }}
        title="Ver análisis detallado del control"
        aria-label="Ver análisis"
      >
        <Activity />
      </button>
      <button
        className="icon-btn"
        onClick={(e) => {
          e.stopPropagation();
          // Aquí podrías abrir un modal de tendencias
          console.log('Ver tendencias del animal:', record);
        }}
        title="Ver tendencias y evolución"
        aria-label="Ver tendencias"
      >
        <TrendingUp />
      </button>
    </>
  ),
});

// Función para mapear respuesta de API a datos del formulario
const mapResponseToForm = (item: ControlResponse): ControlForm => ({
  animal_id: item.animal_id,
  checkup_date: (item as any).checkup_date ?? (item as any).control_date ?? '',
  weight: item.weight,
  height: item.height,
  health_status: (item as any).health_status ?? (item as any).healt_status ?? '',
  description: (item as any).description ?? (item as any).observations ?? '',
});

// Función de validación del formulario
const validateForm = (formData: ControlForm): string | null => {
  // Validar animal_id: debe ser un número válido > 0
  const animalId = Number(formData.animal_id);
  if (!formData.animal_id || Number.isNaN(animalId) || animalId <= 0) {
    return '⚠️ Debe seleccionar un animal válido.';
  }
  if (!formData.checkup_date) {
    return 'La fecha de chequeo es obligatoria.';
  }
  if (formData.weight !== undefined && formData.weight! < 0) {
    return 'El peso no puede ser negativo.';
  }
  if (formData.height !== undefined && formData.height! < 0) {
    return 'La altura no puede ser negativa.';
  }
  return null;
};

// Contenido personalizado para el modal de detalle (actualizado para mostrar etiqueta del animal)
const makeCustomDetailContent = (animalOptions: { value: number; label: string }[]) => (item: ControlResponse) => {
  const map = new Map(animalOptions.map((o: { value: number; label: string }) => [o.value, o.label]));
  const animalLabel = map.get(item.animal_id as any) ?? item.animal_id;
  const checkupDate = (item as any)?.checkup_date ?? (item as any)?.control_date;
  const formattedDate = checkupDate ? new Date(checkupDate as string).toLocaleDateString('es-ES') : '-';
  const healthStatus = (item as any)?.health_status ?? (item as any)?.healt_status ?? '-';
  const description = (item as any)?.description ?? (item as any)?.observations;

  const getBadgeColor = (status: string) => {
    switch(status) {
      case 'Excelente': return 'bg-green-500/90 hover:bg-green-600 text-white';
      case 'Bueno': case 'Sano': return 'bg-blue-500/90 hover:bg-blue-600 text-white';
      case 'Regular': return 'bg-yellow-500/90 hover:bg-yellow-600 text-white';
      case 'Malo': return 'bg-red-500/90 hover:bg-red-600 text-white';
      default: return 'bg-gray-500/90 hover:bg-gray-600 text-white';
    }
  };

  return (
    <div className={modalStyles.spacing.section}>
      {/* Menú de Acciones */}
      <div className="flex items-center justify-end gap-2 px-1 pb-3">
        <div className="text-xs text-muted-foreground font-medium">Acciones rápidas:</div>
        <div className="flex items-center gap-2">
          <button
            className="inline-flex items-center justify-center rounded-lg p-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            onClick={(e) => {
              e.stopPropagation();
              console.log('Análisis detallado del control:', item);
            }}
            title="Ver análisis detallado del control"
            aria-label="Ver análisis"
          >
            <Activity className="h-4 w-4" />
          </button>
          <button
            className="inline-flex items-center justify-center rounded-lg p-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            onClick={(e) => {
              e.stopPropagation();
              console.log('Ver tendencias del animal:', item);
            }}
            title="Ver tendencias y evolución"
            aria-label="Ver tendencias"
          >
            <TrendingUp className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className={modalStyles.twoColGrid}>
        {/* Columna izquierda */}
        <div className={modalStyles.spacing.section}>
          <SectionCard title="Información Básica">
            <div className={modalStyles.spacing.sectionSmall}>
              <InfoField label="ID" value={`#${item.id}`} />
              <InfoField
                label="Animal"
                value={item.animal_id ? <AnimalLink id={item.animal_id} label={animalLabel as string} /> : '-'}
                valueSize="xlarge"
              />
              <InfoField label="Fecha" value={formattedDate} valueSize="large" />
            </div>
          </SectionCard>

          <SectionCard title="Estado de Salud">
            <Badge className={`text-sm px-4 py-1.5 ${getBadgeColor(healthStatus)}`}>
              {healthStatus}
            </Badge>
          </SectionCard>

          {description && (
            <SectionCard title="Descripción">
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {description}
              </p>
            </SectionCard>
          )}
        </div>

        {/* Columna derecha */}
        <div className={modalStyles.spacing.section}>
          <SectionCard title="Métricas Físicas">
            <div className={modalStyles.fieldsGrid}>
              <InfoField label="Peso" value={item.weight ? `${item.weight} kg` : '-'} valueSize="xlarge" />
              <InfoField label="Altura" value={item.height ? `${item.height} m` : '-'} valueSize="xlarge" />
            </div>
          </SectionCard>

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

// Componente principal con carga de opciones dinámicas
// IMPORTANTE: serviceAdapter debe delegar TODOS los métodos al servicio real
const serviceAdapter: any = Object.create(controlService);

// Delegar métodos de lectura directamente al servicio real
serviceAdapter.getAll = controlService.getAll.bind(controlService);
serviceAdapter.getPaginated = controlService.getPaginated.bind(controlService);
serviceAdapter.getById = controlService.getById.bind(controlService);
serviceAdapter.delete = controlService.delete.bind(controlService);

// Solo sobrescribir create y update para transformar el payload
serviceAdapter.create = async (payload: ControlForm) => {
  const toServer: any = {
    animal_id: payload.animal_id,
    checkup_date: payload.checkup_date,
    weight: payload.weight,
    height: payload.height,
    description: payload.description,
    health_status: payload.health_status,
  };
  Object.keys(toServer).forEach((k) => toServer[k] === undefined && delete toServer[k]);
  return (controlService as any).create(toServer);
};

serviceAdapter.update = async (id: number | string, payload: ControlForm) => {
  const toServer: any = {
    animal_id: payload.animal_id,
    checkup_date: payload.checkup_date,
    weight: payload.weight,
    height: payload.height,
    description: payload.description,
    health_status: payload.health_status,
  };
  Object.keys(toServer).forEach((k) => toServer[k] === undefined && delete toServer[k]);
  return (controlService as any).update(id, toServer);
};
const AdminControlPage: React.FC = () => {
  const [animalOptions, setAnimalOptions] = useState<{ value: number; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const list = await animalsService.getAll({ page: 1, page_size: 1000 } as any);
        const raw: any = list;
        const arr: any[] = Array.isArray(raw) ? raw : (raw?.items ?? raw?.data ?? raw?.results ?? []);
        const options = arr.map((a: any) => ({ value: a.id, label: a.record || `ID ${a.id}` }));
        if (mounted) setAnimalOptions(options);
      } catch {
        if (mounted) setAnimalOptions([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Crear mapa de búsqueda optimizado
  const animalMap = useMemo(() => {
    const map = new Map<number, string>();
    animalOptions.forEach(opt => map.set(opt.value, opt.label));
    return map;
  }, [animalOptions]);

  // Configuración de columnas para la tabla
  const columns: CRUDColumn<ControlResponse & { [k: string]: any }>[] = useMemo(() => [
    {
      key: 'animal_id',
      label: 'Animal',
      render: (value: any) => {
        if (!value) return '-';
        const id = Number(value);
        const label = animalMap.get(id) || `Animal ${id}`;
        return <AnimalLink id={id} label={label} />;
      }
    },
    {
      key: 'checkup_date',
      label: 'Fecha de Chequeo',
      render: (_value: any, item: any) => {
        const d = (item as any)?.checkup_date ?? (item as any)?.control_date;
        return d ? new Date(d as string).toLocaleDateString('es-ES') : '-';
      },
    },
    {
      key: 'weight',
      label: 'Peso',
      render: (value: any) => (value ?? '-') as any,
    },
    {
      key: 'height',
      label: 'Altura',
      render: (value: any) => (value ?? '-') as any,
    },
    {
      key: 'health_status',
      label: 'Estado de Salud',
      render: (_value: any, item: any) => (item as any)?.health_status ?? (item as any)?.healt_status ?? '-',
    },
    {
      key: 'description',
      label: 'Descripción',
      render: (_value: any, item: any) => (item as any)?.description ?? (item as any)?.observations ?? '-',
    },
    {
      key: 'created_at',
      label: 'Creado',
      render: (value) => (value ? new Date(value as string).toLocaleDateString('es-ES') : '-'),
    },
  ], [animalMap]);

  const initialFormData: ControlForm = {
    animal_id: undefined as any, // Forzar que el usuario seleccione
    checkup_date: getTodayColombia(),
    weight: undefined,
    height: undefined,
    health_status: '',
    description: '',
  };

  // No renderizar hasta que las opciones estén cargadas para evitar mostrar IDs
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando controles...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminCRUDPage
      config={crudConfigLocal(animalOptions, columns, viewMode, setViewMode)}
      service={serviceAdapter}
      initialFormData={initialFormData}
      mapResponseToForm={mapResponseToForm}
      validateForm={validateForm}
      customDetailContent={makeCustomDetailContent(animalOptions)}
      realtime={true}
      pollIntervalMs={8000}
      refetchOnFocus={true}
      refetchOnReconnect={true}
      enhancedHover={true}
    />
  );
};

export default AdminControlPage;
