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
import { Eye, Edit, Activity, TrendingUp } from 'lucide-react';
import { getTodayColombia } from '@/utils/dateUtils';
import { AnimalLink } from '@/components/common/ForeignKeyHelpers';

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
  const description = (item as any)?.description ?? (item as any)?.observations ?? '-';

  return (
    <div className="space-y-3">
      {/* Información básica */}
      <div className="grid grid-cols-1 gap-2 text-xs">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Animal:</span>
          <span className="font-medium text-foreground truncate max-w-[60%]" title={animalLabel}>
            {animalLabel}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Fecha:</span>
          <span className="font-medium text-foreground">{formattedDate}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Estado:</span>
          <span className="font-medium text-foreground">{healthStatus}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Peso:</span>
          <span className="font-medium text-foreground">{item.weight ?? '-'} kg</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Altura:</span>
          <span className="font-medium text-foreground">{item.height ?? '-'} m</span>
        </div>
      </div>

      {/* Descripción */}
      {description && description !== '-' && (
        <div className="border-t pt-2">
          <div className="text-xs">
            <span className="text-muted-foreground">Descripción:</span>
            <p className="mt-1 text-foreground line-clamp-2" title={description}>
              {description}
            </p>
          </div>
        </div>
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
  return (
    <div className="space-y-4">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Información del Control</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">ID</dt>
              <dd className="font-medium">{item.id}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Animal</dt>
              <dd className="font-medium">{animalLabel}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Fecha de Chequeo</dt>
              <dd className="font-medium">{(() => { const d = (item as any)?.checkup_date ?? (item as any)?.control_date; return d ? new Date(d as string).toLocaleDateString('es-ES') : '-'; })()}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Peso</dt>
              <dd className="font-medium">{item.weight ?? '-'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Altura</dt>
              <dd className="font-medium">{item.height ?? '-'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Estado de Salud</dt>
              <dd className="font-medium">{(item as any)?.health_status ?? (item as any)?.healt_status ?? '-'}</dd>
            </div>
            <div className="md:col-span-2 text-xs">
              <dt className="text-muted-foreground">Descripción</dt>
              <dd className="font-medium whitespace-pre-wrap">{(item as any)?.description ?? (item as any)?.observations ?? '-'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Creado</dt>
              <dd className="font-medium">{item.created_at ? new Date(item.created_at as string).toLocaleDateString('es-ES') : '-'}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
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
