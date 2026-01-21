import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useGlobalViewMode } from '@/shared/hooks/useGlobalViewMode';
import { AdminCRUDPage, CRUDColumn, CRUDFormSection, CRUDConfig } from '@/shared/ui/common/AdminCRUDPage';
import { fieldService } from '@/entities/field/api/field.service';
import { foodTypesService } from '@/entities/food-type/api/foodTypes.service';
import { FIELD_STATES } from '@/shared/constants/enums';
import type { FieldResponse } from '@/shared/api/generated/swaggerTypes';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { FieldActionsMenu } from '@/widgets/dashboard/FieldActionsMenu';
import { FieldAnimalsModal } from '@/widgets/dashboard/fields/FieldAnimalsModal';
import { FoodTypeLink } from '@/shared/ui/common/ForeignKeyHelpers';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui/card';

// Tipo de formulario alineado al JSON real del backend
type FieldFormInput = {
  name: string;
  ubication: string;
  area: string;
  capacity: string;
  state: 'Disponible' | 'Ocupado' | 'Mantenimiento' | 'Restringido' | string;
  handlings: string;
  gauges: string;
  food_type_id?: number;
};

// Función para calcular el porcentaje de ocupación
const calculateOccupancy = (animalCount: number, capacity: string): number => {
  const capacityNum = parseInt(capacity) || 0;
  if (capacityNum === 0) return 0;
  return Math.min(Math.round((animalCount / capacityNum) * 100), 100);
};

// Función para obtener el color según el porcentaje de ocupación
const getOccupancyColor = (percentage: number): string => {
  if (percentage >= 90) return 'bg-red-500'; // Crítico (90-100%)
  if (percentage >= 75) return 'bg-orange-500'; // Alto (75-89%)
  if (percentage >= 50) return 'bg-yellow-500'; // Medio (50-74%)
  if (percentage >= 25) return 'bg-blue-500'; // Bajo (25-49%)
  return 'bg-green-500'; // Muy bajo (0-24%)
};

// Color al hacer hover (más intenso) según el porcentaje
const getHoverOccupancyColor = (percentage: number): string => {
  if (percentage >= 90) return 'group-hover:bg-red-600 hover:bg-red-600';
  if (percentage >= 75) return 'group-hover:bg-orange-600 hover:bg-orange-600';
  if (percentage >= 50) return 'group-hover:bg-yellow-600 hover:bg-yellow-600';
  if (percentage >= 25) return 'group-hover:bg-blue-600 hover:bg-blue-600';
  return 'group-hover:bg-green-600 hover:bg-green-600';
};

// Componente de barra de progreso de ocupación
const FieldOccupancyBar: React.FC<{ animalCount: number; capacity: string }> = ({ animalCount, capacity }) => {
  const percentage = calculateOccupancy(animalCount, capacity);
  const colorClass = getOccupancyColor(percentage);
  const hoverColorClass = getHoverOccupancyColor(percentage);
  const capacityNum = parseInt(capacity) || 0;

  return (
    <div className="w-full space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {animalCount} / {capacityNum > 0 ? capacityNum : '?'}
        </span>
        <span className="font-medium">{percentage}%</span>
      </div>
      <div className="w-full bg-gray-200/80 rounded-full h-2 overflow-hidden ring-1 ring-gray-200/70 transition-all duration-300 group-hover:h-3 hover:h-3">
        <div
          className={`h-full ${colorClass} ${hoverColorClass} transition-all duration-300 group-hover:brightness-110 group-hover:saturate-125 hover:brightness-110 hover:saturate-125`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

// Página principal
function AdminFieldsPage() {
  const [foodTypeOptions, setFoodTypeOptions] = useState<Array<{ value: number; label: string }>>([]);
  const [viewMode, setViewMode] = useGlobalViewMode();

  // Modal: Animales por potrero
  const [isAnimalsOpen, setIsAnimalsOpen] = useState(false);
  const [modalField, setModalField] = useState<FieldResponse | null>(null);

  // Abrir modal de animales
  const openAnimalsForField = useCallback(async (field: FieldResponse & { [k: string]: any }) => {
    setModalField(field);
    setIsAnimalsOpen(true);
  }, []);

  // Crear mapa de búsqueda optimizado para tipos de alimento
  const foodTypeMap = useMemo(() => {
    const map = new Map<number, string>();
    foodTypeOptions.forEach(opt => map.set(opt.value, opt.label));
    return map;
  }, [foodTypeOptions]);

  // Columnas - Ahora animal_count viene directamente del backend
  const columns: CRUDColumn<FieldResponse & { [k: string]: any }>[] = useMemo(() => [
    { key: 'id', label: 'ID', render: (v) => <span className="font-mono text-[10px] bg-secondary/30 px-1.5 py-0.5 rounded">{v}</span> },
    { key: 'name', label: 'Nombre' },
    { key: 'location', label: 'Ubicación', render: (_v, item) => item.location || item.ubication || '-' },
    { key: 'area', label: 'Área' },
    { key: 'capacity', label: 'Capacidad' },
    { key: 'state', label: 'Estado' },
    {
      key: 'animal_count' as any,
      label: 'Cantidad',
      render: (_v, item) => {
        const animalCount = item.animal_count ?? 0;
        const capacityNum = parseInt(item.capacity || '0') || 0;
        const percentage = capacityNum > 0 ? Math.round((animalCount / capacityNum) * 100) : 0;

        // Determinar color del badge según ocupación
        let badgeColor = 'bg-green-100 text-green-800';
        if (percentage >= 90) badgeColor = 'bg-red-100 text-red-800';
        else if (percentage >= 75) badgeColor = 'bg-orange-100 text-orange-800';
        else if (percentage >= 50) badgeColor = 'bg-yellow-100 text-yellow-800';
        else if (percentage >= 25) badgeColor = 'bg-blue-100 text-blue-800';

        return (
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded-md text-xs font-semibold ${badgeColor}`}>
              {animalCount}
            </span>
          </div>
        );
      }
    },
    {
      key: 'occupancy' as any,
      label: 'Ocupación',
      render: (_v, item) => {
        const animalCount = item.animal_count ?? 0;
        const capacity = item.capacity || '';
        return (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation?.(); openAnimalsForField(item as any); }}
            className="min-w-[180px] group text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-md"
            title="Ver animales en este potrero"
          >
            <FieldOccupancyBar animalCount={animalCount} capacity={capacity} />
          </button>
        );
      }
    },
    { key: 'management', label: 'Manejo', render: (_v, item) => item.management || item.handlings || '-' },
    { key: 'measurements', label: 'Mediciones', render: (_v, item) => item.measurements || item.gauges || '-' },
    {
      key: 'food_type_id',
      label: 'Tipo de Alimento',
      render: (v) => {
        if (!v) return '-';
        const id = Number(v);
        const label = foodTypeMap.get(id) || `Tipo ${id}`;
        return <FoodTypeLink id={id} label={label} />;
      }
    },
    { key: 'created_at', label: 'Creado', render: (v) => (v ? new Date(v as string).toLocaleDateString('es-ES') : '-') },
  ], [foodTypeMap, openAnimalsForField]);

  // Configuración CRUD base
  const crudConfig: CRUDConfig<FieldResponse & { [k: string]: any }, FieldFormInput> = {
    title: 'Potreros',
    entityName: 'Campo',
    columns,
    formSections: [],
    searchPlaceholder: 'Buscar Potreros...',
    emptyStateMessage: 'No hay Potreros',
    emptyStateDescription: 'Crea el primero para comenzar',
    enableDetailModal: true,
    enableCreateModal: true,
    enableEditModal: true,
    enableDelete: true,
  };

  // Mapear respuesta a formulario (usando claves reales del backend)
  const mapResponseToForm = (item: FieldResponse & { [k: string]: any }): FieldFormInput => ({
    name: item.name || '',
    ubication: item.ubication || item.location || '',
    area: item.area || '',
    capacity: item.capacity || '',
    state: item.state || 'Disponible',
    handlings: item.handlings || item.management || '',
    gauges: item.gauges || item.measurements || '',
    food_type_id: item.food_type_id,
  });

  // Validación
  const validateForm = (formData: FieldFormInput): string | null => {
    if (!formData.name || !formData.name.trim()) return 'El nombre es obligatorio.';
    if (!formData.area || !formData.area.trim()) return 'El área es obligatoria.';
    if (!formData.state) return 'El estado es obligatorio.';

    // Validación del campo capacidad: solo números
    if (formData.capacity && formData.capacity.trim()) {
      const capacityNum = parseInt(formData.capacity);
      if (isNaN(capacityNum) || !/^\d+$/.test(formData.capacity.trim())) {
        return 'La capacidad debe ser un número entero válido (ej: 50).';
      }
      if (capacityNum <= 0) {
        return 'La capacidad debe ser mayor a 0.';
      }
    }

    return null;
  };

  // Datos iniciales (alineados al JSON real)
  const initialFormData: FieldFormInput = {
    name: '',
    ubication: '',
    area: '',
    capacity: '',
    state: 'Disponible',
    handlings: '',
    gauges: '',
    food_type_id: undefined,
  };

  useEffect(() => {
    try {
      localStorage.setItem('adminFieldsViewMode', viewMode);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[Fields] No se pudo persistir viewMode', error);
      }
    }
  }, [viewMode]);

  useEffect(() => {
    (async () => {
      try {
        const res: any = await foodTypesService.getFoodTypes?.({ page: 1, limit: 1000 });
        const list = Array.isArray(res) ? res : (res?.data ?? res?.items ?? []);
        setFoodTypeOptions((list || []).map((ft: any) => ({
          value: ft.id,
          label: ft.food_type || ft.name || ft.description || `ID ${ft.id}`,
        })));
      } catch (e) {
        console.warn('[fields] Error al cargar Potreros', e);
      }
    })();
  }, []);

  // Función para renderizar las tarjetas de campos
  const renderFieldCard = (item: FieldResponse & { [k: string]: any }) => {
    const foodTypeLabel = item.food_type_id
      ? (foodTypeOptions.find((ft) => Number(ft.value) === Number(item.food_type_id))?.label || `ID ${item.food_type_id}`)
      : '-';

    const location = item.location || item.ubication || '-';
    const management = item.management || item.handlings || '-';
    const measurements = item.measurements || item.gauges || '-';
    // Usamos animal_count directamente del backend
    const animalCount = item.animal_count ?? 0;
    const capacity = item.capacity || '';

    const openAnimalsModal = openAnimalsForField;

    return (
      <div className="flex flex-col h-full px-3 sm:px-4 py-3 sm:py-4">
        <div className="grid grid-cols-2 gap-3 text-xs flex-1">
          {/* Cabecera con Nombre e ID */}
          <div className="col-span-2 flex flex-col mb-1 border-b border-border/50 pb-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[15px] text-foreground truncate uppercase tracking-tight" title={item.name}>
                {item.name || 'Sin nombre'}
              </h3>
              <span className="text-[10px] bg-secondary/50 px-2 py-0.5 rounded-full font-mono text-muted-foreground border border-border/50 shadow-sm">
                ID: {item.id}
              </span>
            </div>
          </div>

          <div className="col-span-2 flex items-center justify-between mb-1 gap-2">
            <Badge variant="outline" className="text-xs px-2 py-0.5 flex-shrink-0">{item.state || '-'}</Badge>
            {animalCount > 0 && (
              <Badge variant="default" className="text-xs px-3 py-1 bg-primary/90">
                {animalCount} {animalCount === 1 ? 'Animal' : 'Animales'}
              </Badge>
            )}
          </div>

          {/* Barra de ocupación */}
          <div className="col-span-2 min-w-0">
            <div className="text-muted-foreground text-[10px] mb-1">Ocupación del Potrero</div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); openAnimalsModal(item); }}
              className="w-full group relative overflow-hidden cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-md transition-all duration-200 hover:shadow-md hover:ring-1 hover:ring-primary/20 active:scale-[0.98]"
              title="Ver animales en este potrero"
            >
              {/* Efecto de onda (Ripple) CSS puro al hacer click */}
              <div className="absolute inset-0 bg-primary/0 transition-colors duration-200 group-hover:bg-primary/5 group-active:bg-primary/10 z-10" />

              <div className="transition-transform duration-200 group-hover:scale-[1.02] relative z-0">
                <FieldOccupancyBar animalCount={animalCount} capacity={capacity} />
              </div>
            </button>
          </div>

          <div className="min-w-0 overflow-hidden">
            <div className="text-muted-foreground text-[10px] mb-0.5">Ubicación</div>
            <div className="truncate font-medium text-[13px]" title={location}>{location}</div>
          </div>
          <div className="min-w-0 overflow-hidden">
            <div className="text-muted-foreground text-[10px] mb-0.5">Área</div>
            <div className="truncate text-[12px]">{item.area || '-'}</div>
          </div>
          <div className="min-w-0 overflow-hidden">
            <div className="text-muted-foreground text-[10px] mb-0.5">Tipo de Alimento</div>
            <div className="truncate text-[13px]" title={foodTypeLabel}>{foodTypeLabel}</div>
          </div>
          <div className="col-span-2 min-w-0 overflow-hidden">
            <div className="text-muted-foreground text-[10px] mb-0.5">Manejo</div>
            <div className="truncate text-[12px]" title={management}>{management}</div>
          </div>
          <div className="col-span-2 min-w-0 overflow-hidden">
            <div className="text-muted-foreground text-[10px] mb-0.5">Mediciones</div>
            <div className="truncate text-[12px]" title={measurements}>{measurements}</div>
          </div>
        </div>
      </div>
    );
  };

  const formSectionsLocal: CRUDFormSection<FieldFormInput>[] = [
    {
      title: 'Información Básica',
      gridCols: 2,
      fields: [
        { name: 'name', label: 'Nombre', type: 'text', required: true, placeholder: 'Ej: Sector 34' },
        { name: 'area', label: 'Área', type: 'text', required: true, placeholder: 'Ej: 3 ha' },
        { name: 'state', label: 'Estado', type: 'select', required: true, options: FIELD_STATES as any },
        { name: 'food_type_id', label: 'Tipo de Alimento', type: 'select', options: foodTypeOptions, placeholder: 'Seleccionar tipo de alimento' },
      ],
    },
    {
      title: 'Detalles',
      gridCols: 2,
      fields: [
        { name: 'ubication', label: 'Ubicación', type: 'text', placeholder: 'Ej: Zona 34' },
        {
          name: 'capacity',
          label: 'Capacidad (animales)',
          type: 'text',
          placeholder: 'Solo números. Ej: 50',
          helperText: 'Ingrese solo números enteros. Ejemplo: 50'
        },
        { name: 'handlings', label: 'Manejo', type: 'textarea', placeholder: 'Prácticas de manejo', colSpan: 2 },
        { name: 'gauges', label: 'Mediciones', type: 'textarea', placeholder: 'Mediciones relevantes', colSpan: 2 },
      ],
    },
  ];

  const crudConfigLocal: CRUDConfig<FieldResponse & { [k: string]: any }, FieldFormInput> = {
    ...crudConfig,
    formSections: formSectionsLocal,
    viewMode,
    renderCard: renderFieldCard,
    customDetailContent: (item: FieldResponse & { [k: string]: any }) => {
      const location = item.location || item.ubication || '-';
      const management = item.management || item.handlings || '-';
      const measurements = item.measurements || item.gauges || '-';
      const animalCount = item.animal_count ?? 0;
      const capacity = item.capacity || '';
      const foodTypeLabel = item.food_type_id
        ? (foodTypeOptions.find((ft) => Number(ft.value) === Number(item.food_type_id))?.label || `ID ${item.food_type_id}`)
        : '-';



      return (
        <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Información general</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="space-y-1">
                <dt className="text-xs text-muted-foreground font-medium">Nombre</dt>
                <dd className="text-sm font-medium text-foreground">{item.name || '-'}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs text-muted-foreground font-medium">ID del Potrero</dt>
                <dd className="text-sm font-mono text-muted-foreground font-medium">{item.id || '-'}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs text-muted-foreground font-medium">Ubicación</dt>
                <dd className="text-sm font-medium text-foreground">{location}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs text-muted-foreground font-medium">Área</dt>
                <dd className="text-sm font-medium text-foreground">{item.area || '-'}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs text-muted-foreground font-medium">Capacidad</dt>
                <dd className="text-sm font-medium text-foreground">
                  {capacity ? `${capacity} animales` : '-'}
                </dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs text-muted-foreground font-medium">Estado</dt>
                <dd className="text-sm font-medium text-foreground">{item.state || '-'}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs text-muted-foreground font-medium">Tipo de alimento</dt>
                <dd className="text-sm font-medium text-foreground">{foodTypeLabel}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs text-muted-foreground font-medium">Manejo</dt>
                <dd className="text-sm font-medium text-foreground">{management}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs text-muted-foreground font-medium">Mediciones</dt>
                <dd className="text-sm font-medium text-foreground">{measurements}</dd>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <dt className="text-xs text-muted-foreground font-medium">Ocupación</dt>
                <dd className="mt-1">
                  <FieldOccupancyBar animalCount={animalCount} capacity={capacity} />
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      );
    },
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
      <div className="flex items-center gap-1">
        <FieldActionsMenu field={record as FieldResponse} />
      </div>
    ),
  };

  return (
    <>
      <AdminCRUDPage
        config={crudConfigLocal}
        service={fieldService}
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

      {/* Modal con tarjetas de animales del potrero - Nueva implementación */}
      <FieldAnimalsModal
        field={isAnimalsOpen ? modalField : null}
        isOpen={isAnimalsOpen}
        onClose={() => setIsAnimalsOpen(false)}
      />
    </>
  );
}

export default AdminFieldsPage;
