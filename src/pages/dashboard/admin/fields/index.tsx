import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGlobalViewMode } from '@/hooks/useGlobalViewMode';
import { AdminCRUDPage, CRUDColumn, CRUDFormSection, CRUDConfig } from '@/components/common/AdminCRUDPage';
import { fieldService } from '@/services/fieldService';
import { foodTypesService } from '@/services/foodTypesService';
import { FIELD_STATES } from '@/constants/enums';
import type { FieldResponse } from '@/types/swaggerTypes';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FieldActionsMenu } from '@/components/dashboard/FieldActionsMenu';
import { GenericModal } from '@/components/common/GenericModal';
import { animalsService } from '@/services/animalService';
import { animalFieldsService } from '@/services/animalFieldsService';
import type { AnimalResponse } from '@/types/swaggerTypes';
import { AnimalCard } from '@/components/dashboard/animals/AnimalCard';
import { AnimalModalContent } from '@/components/dashboard/animals/AnimalModalContent';
import { AnimalActionsMenu } from '@/components/dashboard/AnimalActionsMenu';
import { Eye, Edit } from 'lucide-react';
import { FoodTypeLink } from '@/components/common/ForeignKeyHelpers';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useAnalytics } from '@/hooks/useAnalytics';

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
  const navigate = useNavigate();
  const [foodTypeOptions, setFoodTypeOptions] = useState<Array<{ value: number; label: string }>>([]);
  const [viewMode, setViewMode] = useGlobalViewMode();

  // Modal: Animales por potrero
  const [isAnimalsOpen, setIsAnimalsOpen] = useState(false);
  const [modalField, setModalField] = useState<FieldResponse | null>(null);
  const [animalsLoading, setAnimalsLoading] = useState(false);
  const [fieldAnimals, setFieldAnimals] = useState<AnimalResponse[]>([]);
  const [detailAnimal, setDetailAnimal] = useState<AnimalResponse | null>(null);
  const [detailAnimalsFieldId, setDetailAnimalsFieldId] = useState<number | null>(null);
  const [animalFilterSex, setAnimalFilterSex] = useState<'all' | 'Macho' | 'Hembra' | 'Castrado'>('all');
  const [animalFilterStatus, setAnimalFilterStatus] = useState<
    | 'all'
    | 'Sano'
    | 'Enfermo'
    | 'En tratamiento'
    | 'En observación'
    | 'Cuarentena'
    | 'Vendido'
    | 'Fallecido'
  >('all');

  const { useAlerts } = useAnalytics();
  const { data: alertsData } = useAlerts({ limit: 100 });
  const allAlerts: any[] = (alertsData as any)?.alerts ?? (Array.isArray(alertsData) ? (alertsData as any[]) : []);

  const matchesField = useCallback((animal: AnimalResponse & { [k: string]: any }, fieldId: number): boolean => {
    if (!animal || !fieldId) return false;
    const candidates = [
      animal.field_id,
      (animal as any).fieldId,
      (animal as any).fields_id,
      (animal as any).id_field,
      (animal as any).current_field_id,
      (animal as any).field?.id,
      (animal as any).latest_field_assignment?.field_id,
    ];
    return candidates.some((value) => value != null && Number(value) === fieldId);
  }, []);

  const dedupeAnimals = (items: AnimalResponse[]): AnimalResponse[] => {
    const seen = new Set<number>();
    const result: AnimalResponse[] = [];
    items.forEach((item) => {
      if (!item) return;
      const idNum = Number(item.id);
      if (!Number.isFinite(idNum)) return;
      if (!seen.has(idNum)) {
        seen.add(idNum);
        result.push(item);
      }
    });
    return result;
  };

  const fetchAnimalsByIds = async (ids: number[]): Promise<AnimalResponse[]> => {
    const uniqueIds = Array.from(new Set(ids.filter((id) => Number.isFinite(Number(id)) && Number(id) > 0)));
    if (!uniqueIds.length) return [];
    const responses = await Promise.all(uniqueIds.map(async (id) => {
      try {
        if (typeof (animalsService as any).getAnimalById === 'function') {
          return await (animalsService as any).getAnimalById(id);
        }
        return await animalsService.getById(id);
      } catch (error) {
        console.warn(`[fields] No se pudo cargar el animal ${id}`, error);
        return null;
      }
    }));
    return responses.filter(Boolean) as AnimalResponse[];
  };

  // Cargar animales asociados a un potrero (puede usarse para modal o para el detalle inline)
  const loadAnimalsForField = useCallback(async (field: FieldResponse & { [k: string]: any }, options?: { openModal?: boolean }) => {
    const { openModal = false } = options || {};
    if (openModal) {
      setModalField(field);
      setIsAnimalsOpen(true);
    }

    setAnimalsLoading(true);
    const fieldIdNum = Number(field.id);
    try {
      // 1) Obtener asignaciones activas del potrero
      const assignmentsResp = await animalFieldsService.getPaginated({
        field_id: field.id,
        limit: 1000,
        page: 1,
        cache_bust: Date.now(),
        include_relations: 1,
      });
      const assignmentIds = (assignmentsResp?.data || [])
        .filter((assignment: any) => {
          const matches = Number(assignment.field_id) === fieldIdNum;
          const notRemoved = !assignment.removal_date;
          const notDisabled = assignment.is_active !== false;
          return matches && notRemoved && notDisabled;
        })
        .map((assignment: any) => Number(assignment.animal_id))
        .filter((id: number) => Number.isFinite(id));

      let animals: AnimalResponse[] = [];
      if (assignmentIds.length > 0) {
        animals = await fetchAnimalsByIds(assignmentIds);
      } else {
        // 2) Fallback directo desde servicio de animales filtrando por field_id
        const direct = await animalsService.getAnimalsPaginated({
          field_id: field.id,
          limit: 1000,
          include_relations: 1,
          cache_bust: Date.now(),
        });
        animals = (direct?.data || []) as AnimalResponse[];
      }

      let normalized = (animals || []).filter((animal) => matchesField(animal, fieldIdNum));

      // 3) Último recurso: filtrar una lista general
      if (!normalized.length) {
        const fallback = await animalsService.getAnimalsPaginated({
          limit: 1000,
          include_relations: 1,
          cache_bust: Date.now(),
        });
        normalized = ((fallback?.data || []) as AnimalResponse[]).filter((animal) => matchesField(animal, fieldIdNum));
      }

      setFieldAnimals(dedupeAnimals(normalized));
      setDetailAnimalsFieldId(fieldIdNum);
    } catch (e) {
      console.warn('[fields] Error cargando animales del potrero', e);
      setFieldAnimals([]);
    } finally {
      setAnimalsLoading(false);
    }
  }, [matchesField]);

  // Abrir modal y asegurar listado de animales del potrero
  const openAnimalsForField = useCallback(async (field: FieldResponse & { [k: string]: any }) => {
    await loadAnimalsForField(field, { openModal: true });
  }, [loadAnimalsForField]);

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
              className="w-full group cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-md"
              title="Ver animales en este potrero"
            >
              <div className="transition-transform duration-150 group-hover:scale-[1.01]">
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
    customDetailContent: (item) => {
      const location = item.location || item.ubication || '-';
      const management = item.management || item.handlings || '-';
      const measurements = item.measurements || item.gauges || '-';
      const animalCount = item.animal_count ?? 0;
      const capacity = item.capacity || '';
      const foodTypeLabel = item.food_type_id
        ? (foodTypeOptions.find((ft) => Number(ft.value) === Number(item.food_type_id))?.label || `ID ${item.food_type_id}`)
        : '-';

      const fieldIdNum = Number(item.id);
      if (fieldIdNum && detailAnimalsFieldId !== fieldIdNum && !animalsLoading) {
        void loadAnimalsForField(item, { openModal: false });
      }

      const animalsForField =
        detailAnimalsFieldId === fieldIdNum ? fieldAnimals : [];

      const filteredAnimalsForField = animalsForField.filter((a) => {
        const sex = (a as any).gender;
        const status = (a as any).status;
        if (animalFilterSex !== 'all' && sex !== animalFilterSex) return false;
        if (animalFilterStatus !== 'all' && status !== animalFilterStatus) return false;
        return true;
      });

      const totalAnimals = animalsForField.length;
      const visibleAnimals = filteredAnimalsForField;
      const maleCount = visibleAnimals.filter(
        (a) => (a as any).gender === 'Macho'
      ).length;
      const femaleCount = visibleAnimals.filter(
        (a) => (a as any).gender === 'Hembra'
      ).length;
      const neuteredCount = visibleAnimals.filter(
        (a) => (a as any).gender === 'Castrado'
      ).length;
      const avgWeight =
        visibleAnimals.length > 0
          ? (
            visibleAnimals.reduce(
              (sum, a) => sum + (Number((a as any).weight) || 0),
              0
            ) / visibleAnimals.length
          ).toFixed(1)
          : null;

      const fieldAlerts = allAlerts.filter((alert: any) => {
        const animalId = alert.animal_id ?? alert.animalId ?? alert.animal?.id;
        if (!animalId) return false;
        return animalsForField.some((a) => Number((a as any).id) === Number(animalId));
      });

      return (
        <>
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

          <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">
                  Animales en el campo ({animalsForField.length})
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {!animalsLoading && animalsForField.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mb-4 text-xs">
                  <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground">
                    Total: <span className="font-semibold text-foreground">{totalAnimals}</span>
                  </span>
                  <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground">
                    Mostrando:{' '}
                    <span className="font-semibold text-foreground">{visibleAnimals.length}</span>
                  </span>
                  <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                    Machos: <span className="font-semibold">{maleCount}</span>
                  </span>
                  <span className="px-2 py-1 rounded-full bg-pink-50 text-pink-700 border border-pink-100">
                    Hembras: <span className="font-semibold">{femaleCount}</span>
                  </span>
                  {neuteredCount > 0 && (
                    <span className="px-2 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-100">
                      Castrados: <span className="font-semibold">{neuteredCount}</span>
                    </span>
                  )}
                  {avgWeight && (
                    <span className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                      Peso promedio: <span className="font-semibold">{avgWeight} kg</span>
                    </span>
                  )}
                </div>
              )}
              {!animalsLoading && animalsForField.length > 0 && (
                <div className="flex flex-wrap items-center gap-3 mb-4 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Sexo:</span>
                    {(['all', 'Macho', 'Hembra', 'Castrado'] as const).map((sex) => (
                      <button
                        key={sex}
                        type="button"
                        onClick={() => setAnimalFilterSex(sex)}
                        className={`px-2 py-0.5 rounded-full border text-[11px] ${animalFilterSex === sex
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-card text-muted-foreground border-border hover:bg-muted'
                          }`}
                      >
                        {sex === 'all' ? 'Todos' : sex}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Estado:</span>
                    {(['all', 'Sano', 'Enfermo', 'En tratamiento'] as const).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setAnimalFilterStatus(status)}
                        className={`px-2 py-0.5 rounded-full border text-[11px] ${animalFilterStatus === status
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-card text-muted-foreground border-border hover:bg-muted'
                          }`}
                      >
                        {status === 'all' ? 'Todos' : status}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {animalsLoading && (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Cargando animales del campo...
                </div>
              )}
              {!animalsLoading && animalsForField.length === 0 && (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No hay animales asignados a este campo.
                </div>
              )}
              {!animalsLoading && animalsForField.length > 0 && visibleAnimals.length > 0 && (
                <div className="grid auto-cols-[minmax(260px,1fr)] grid-flow-col gap-4 overflow-x-auto pb-2 snap-x snap-mandatory md:auto-cols-auto md:grid-flow-row md:grid-cols-2 lg:grid-cols-3 md:overflow-visible">
                  {visibleAnimals.map((a) => {
                    const breedLabel =
                      (a as any).breed?.name ||
                      (a as any).breed_name ||
                      `ID ${(a as any).breed_id ?? (a as any).breeds_id ?? '-'}`;
                    const fatherLabel =
                      (a as any).father?.record ||
                      (a as any).father_record ||
                      `${(a as any).idFather ?? (a as any).father_id ?? '-'}`;
                    const motherLabel =
                      (a as any).mother?.record ||
                      (a as any).mother_record ||
                      `${(a as any).idMother ?? (a as any).mother_id ?? '-'}`;

                    return (
                      <div
                        key={a.id}
                        className="bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                      >
                        <AnimalCard
                          animal={a}
                          breedLabel={breedLabel}
                          fatherLabel={fatherLabel}
                          motherLabel={motherLabel}
                          hasAlerts={fieldAlerts.some(
                            (alert: any) =>
                              Number(alert.animal_id ?? alert.animalId ?? alert.animal?.id) ===
                              Number((a as any).id)
                          )}
                          onCardClick={() => setDetailAnimal(a)}
                          actions={
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => setDetailAnimal(a)}
                                title="Ver detalle"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => navigate(`/admin/animals?edit=${a.id}`)}
                                title="Editar"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <AnimalActionsMenu animal={a} />
                            </div>
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {!!fieldAlerts.length && (
            <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Alertas activas en este campo</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {fieldAlerts.slice(0, 6).map((alert: any) => (
                    <li
                      key={alert.id}
                      className="flex items-start justify-between gap-3 border-b border-border/40 pb-2 last:border-none"
                    >
                      <div className="space-y-0.5">
                        <div className="font-medium text-foreground">
                          {alert.title || 'Alerta'}
                        </div>
                        {alert.message && (
                          <div className="text-xs text-muted-foreground">
                            {alert.message}
                          </div>
                        )}
                        {alert.animal_record && (
                          <div className="text-[11px] text-muted-foreground/80">
                            Animal: {alert.animal_record}
                          </div>
                        )}
                      </div>
                      {alert.priority && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] bg-amber-50 text-amber-700 border border-amber-100">
                          {alert.priority}
                        </span>
                      )}
                    </li>
                  ))}
                  {fieldAlerts.length > 6 && (
                    <li className="pt-1 text-xs text-muted-foreground">
                      +{fieldAlerts.length - 6} alertas adicionales asociadas a estos animales
                    </li>
                  )}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
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
        pollIntervalMs={8000}
        refetchOnFocus={true}
        refetchOnReconnect={true}
        enhancedHover={true}
      />

      {/* Modal con tarjetas de animales del potrero */}
      {isAnimalsOpen && (
        <GenericModal
          isOpen={isAnimalsOpen}
          onOpenChange={setIsAnimalsOpen}
          title={`Animales en ${modalField?.name ?? 'Potrero'} (${fieldAnimals.length})`}
          description={modalField ? `Ubicación: ${modalField.ubication || modalField.location || '-'}` : undefined}
          size="5xl"
          enableBackdropBlur
        >
          {animalsLoading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Cargando animales...</div>
          ) : fieldAnimals.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">No hay animales en este potrero.</div>
          ) : (
            <div className="grid auto-cols-[minmax(260px,1fr)] grid-flow-col gap-4 overflow-x-auto pb-2 snap-x snap-mandatory md:auto-cols-auto md:grid-flow-row md:grid-cols-2 lg:grid-cols-3 md:overflow-visible">
              {fieldAnimals.map((a) => {
                const breedLabel = (a as any).breed?.name || (a as any).breed_name || `ID ${(a as any).breed_id ?? (a as any).breeds_id ?? '-'}`;
                const fatherLabel = (a as any).father?.record || (a as any).father_record || `${(a as any).idFather ?? (a as any).father_id ?? '-'}`;
                const motherLabel = (a as any).mother?.record || (a as any).mother_record || `${(a as any).idMother ?? (a as any).mother_id ?? '-'}`;
                return (
                  <div key={a.id} className="snap-center bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <AnimalCard
                      animal={a}
                      breedLabel={breedLabel}
                      fatherLabel={fatherLabel}
                      motherLabel={motherLabel}
                      onCardClick={() => setDetailAnimal(a)}
                      actions={
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setDetailAnimal(a)} title="Ver detalle">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => navigate(`/admin/animals?edit=${a.id}`)} title="Editar">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AnimalActionsMenu animal={a} />
                        </div>
                      }
                    />
                  </div>
                );
              })}
            </div>
          )}
        </GenericModal>
      )}

      {/* Modal de detalle de animal */}
      {detailAnimal && (
        <GenericModal
          isOpen={!!detailAnimal}
          onOpenChange={(open) => !open && setDetailAnimal(null)}
          title={`Detalle del Animal: ${detailAnimal.record || detailAnimal.id}`}
          size="5xl"
          enableBackdropBlur
        >
          <AnimalModalContent
            animal={detailAnimal as any}
            breedLabel={(detailAnimal as any).breed?.name || (detailAnimal as any).breed_name || `ID ${(detailAnimal as any).breed_id ?? (detailAnimal as any).breeds_id ?? '-'}`}
            fatherLabel={(detailAnimal as any).father?.record || (detailAnimal as any).father_record || `${(detailAnimal as any).idFather ?? (detailAnimal as any).father_id ?? '-'}`}
            motherLabel={(detailAnimal as any).mother?.record || (detailAnimal as any).mother_record || `${(detailAnimal as any).idMother ?? (detailAnimal as any).mother_id ?? '-'}`}
          />
        </GenericModal>
      )}
    </>
  );
}

export default AdminFieldsPage;
