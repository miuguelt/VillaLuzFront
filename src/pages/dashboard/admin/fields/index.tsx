import React, { useState, useEffect, useMemo } from 'react';
import { AdminCRUDPage, CRUDColumn, CRUDFormSection, CRUDConfig } from '@/components/common/AdminCRUDPage';
import { fieldService } from '@/services/fieldService';
import { foodTypesService } from '@/services/foodTypesService';
import { FIELD_STATES } from '@/constants/enums';
import type { FieldResponse } from '@/types/swaggerTypes';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FieldActionsMenu } from '@/components/dashboard/FieldActionsMenu';
import { FoodTypeLink } from '@/components/common/ForeignKeyHelpers';

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

// Componente de barra de progreso de ocupación
const FieldOccupancyBar: React.FC<{ animalCount: number; capacity: string }> = ({ animalCount, capacity }) => {
  const percentage = calculateOccupancy(animalCount, capacity);
  const colorClass = getOccupancyColor(percentage);
  const capacityNum = parseInt(capacity) || 0;

  return (
    <div className="w-full space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {animalCount} / {capacityNum > 0 ? capacityNum : '?'}
        </span>
        <span className="font-medium">{percentage}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full ${colorClass} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

// Página principal
function AdminFieldsPage() {
  const [foodTypeOptions, setFoodTypeOptions] = useState<Array<{ value: number; label: string }>>([]);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>(() => {
    const saved = localStorage.getItem('adminFieldsViewMode');
    return saved === 'cards' ? 'cards' : 'table';
  });

  // Crear mapa de búsqueda optimizado para tipos de alimento
  const foodTypeMap = useMemo(() => {
    const map = new Map<number, string>();
    foodTypeOptions.forEach(opt => map.set(opt.value, opt.label));
    return map;
  }, [foodTypeOptions]);

  // Columnas - Ahora animal_count viene directamente del backend
  const columns: CRUDColumn<FieldResponse & { [k: string]: any }>[] = useMemo(() => [
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
          <div className="min-w-[180px]">
            <FieldOccupancyBar animalCount={animalCount} capacity={capacity} />
          </div>
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
  ], [foodTypeMap]);

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
    } catch {}
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

    return (
      <div className="grid grid-cols-2 gap-3 text-xs h-full">
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
          <FieldOccupancyBar animalCount={animalCount} capacity={capacity} />
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
    <AdminCRUDPage
      config={crudConfigLocal}
      service={fieldService}
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

export default AdminFieldsPage;
