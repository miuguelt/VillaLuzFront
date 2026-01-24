import React, { useState, useCallback, useEffect } from 'react';
import { X, Activity, Syringe, MapPin, Pill, ClipboardList, TrendingUp, Plus, List, Eye, Edit, Trash2, RefreshCw, ChevronDown, ChevronUp, ImageIcon, Copy } from 'lucide-react';
import { cn } from '@/shared/ui/cn';
import { useToast } from '@/app/providers/ToastContext';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { AnimalResponse } from '@/shared/api/generated/swaggerTypes';
import { ImageManager } from '@/shared/ui/common/ImageManager';
import { AnimalImageBanner } from './AnimalImageBanner';
import { GenericModal } from '@/shared/ui/common/GenericModal';
import { AnimalActionsMenu } from '@/widgets/dashboard/AnimalActionsMenu';
import { ParentMiniCard } from './ParentMiniCard';
import { geneticImprovementsService } from '@/entities/genetic-improvement/api/geneticImprovements.service';
import { animalDiseasesService } from '@/entities/animal-disease/api/animalDiseases.service';
import { animalFieldsService } from '@/entities/animal-field/api/animalFields.service';
import { vaccinationsService } from '@/entities/vaccination/api/vaccinations.service';
import { treatmentsService } from '@/entities/treatment/api/treatments.service';
import { controlService } from '@/entities/control/api/control.service';
import { animalImageService } from '@/entities/animal/api/animalImage.service';
// Importar servicio para limpiar caché de dependencias
import { clearAnimalDependencyCache, checkTreatmentDependencies } from '@/features/diagnostics/api/dependencyCheck.service';
import { diseaseService } from '@/entities/disease/api/disease.service';
import { fieldService } from '@/entities/field/api/field.service';
import { vaccinesService } from '@/entities/vaccine/api/vaccines.service';
import { usersService } from '@/entities/user/api/user.service';
import analyticsService from '@/features/reporting/api/analytics.service';
import { resolveRecordId } from '@/shared/utils/recordIdUtils';

import { ItemDetailModal } from './ItemDetailModal';
import { CollapsibleCard } from '@/shared/ui/common/CollapsibleCard';
import { TreatmentSuppliesModal } from '../treatments/TreatmentSuppliesModal';

interface AnimalModalContentProps {
  animal: AnimalResponse & { [k: string]: any };
  breedLabel: string;
  fatherLabel: string;
  motherLabel: string;
  onFatherClick?: (fatherId: number) => void;
  onMotherClick?: (motherId: number) => void;
  currentUserId?: number;
  onOpenHistory?: () => void;
  onOpenAncestorsTree?: () => void;
  onOpenDescendantsTree?: () => void;
  onEdit?: () => void;
  onReplicate?: () => void;
  // Contenedor con scroll para preservar posición al refrescar
  scrollContainerRef?: React.RefObject<HTMLDivElement>;
}

export function AnimalModalContent({
  animal,
  breedLabel,
  fatherLabel,
  motherLabel,
  onFatherClick,
  onMotherClick,
  currentUserId,
  onOpenHistory,
  onOpenAncestorsTree,
  onOpenDescendantsTree,
  onEdit,
  onReplicate,
  scrollContainerRef
}: AnimalModalContentProps) {
  const { showToast } = useToast();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const savedScrollTopRef = React.useRef(0);
  const [deletingItemId, setDeletingItemId] = useState<string | number | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | number | null>(null);

  const preserveScroll = useCallback(() => {
    const node = scrollContainerRef?.current;
    if (node) savedScrollTopRef.current = node.scrollTop;
  }, [scrollContainerRef]);

  const restoreScroll = useCallback(() => {
    const node = scrollContainerRef?.current;
    if (!node) return;
    requestAnimationFrame(() => {
      node.scrollTop = savedScrollTopRef.current;
    });
  }, [scrollContainerRef]);

  // Estados para datos relacionados
  const [geneticImprovements, setGeneticImprovements] = useState<any[]>([]);
  const [diseases, setDiseases] = useState<any[]>([]);
  const [fields, setFields] = useState<any[]>([]);
  const [vaccinations, setVaccinations] = useState<any[]>([]);
  const [treatments, setTreatments] = useState<any[]>([]);
  const [controls, setControls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [dataRefreshTrigger, setDataRefreshTrigger] = useState(0);
  const [hasRecentTreatments, setHasRecentTreatments] = useState<boolean | null>(null);
  const [animalImages, setAnimalImages] = useState<any[]>([]);
  const [imagesLoading, setImagesLoading] = useState(true);

  // Opciones para nombres
  const [diseaseOptions, setDiseaseOptions] = useState<Record<number, string>>({});
  const [fieldOptions, setFieldOptions] = useState<Record<number, string>>({});
  const [vaccineOptions, setVaccineOptions] = useState<Record<number, string>>({});
  const [userOptions, setUserOptions] = useState<Record<number, string>>({});

  // Estado para gestión de insumos (modal anidado)
  const [suppliesTreatment, setSuppliesTreatment] = useState<any | null>(null);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const [year, month, day] = dateStr.split('T')[0].split('-');
      return `${day}/${month}/${year}`;
    } catch (e) {
      return dateStr;
    }
  };

  // Estado para controlar qué tipo de modal abrir y en qué modo
  const [actionModalType, setActionModalType] = useState<
    'genetic_improvement' | 'animal_disease' | 'animal_field' | 'vaccination' | 'treatment' | 'control' | null
  >(null);
  const [actionModalMode, setActionModalMode] = useState<'create' | 'list' | 'view' | 'edit'>('create');
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // Estado para modal de insumos (tratamientos) - ELIMINADO por desuso (integrado en ItemDetailModal)


  // Funciones para abrir modales
  const openCreateModal = (type: typeof actionModalType) => {
    setActionModalType(type);
    setActionModalMode('create');
    setSelectedItem(null);
  };

  const openListModal = (type: typeof actionModalType) => {
    setActionModalType(type);
    setActionModalMode('list');
    setSelectedItem(null);
  };

  const openViewModal = (type: typeof actionModalType, item: any) => {
    setActionModalType(type);
    setActionModalMode('view');
    setSelectedItem(item);
  };

  const openEditModal = (type: typeof actionModalType, item: any) => {
    setActionModalType(type);
    setActionModalMode('edit');
    setSelectedItem(item);
  };

  const closeActionModal = () => {
    setActionModalType(null);
    setSelectedItem(null);
  };

  const gender = animal.sex || animal.gender;
  const birthDate = animal.birth_date
    ? new Date(animal.birth_date).toLocaleDateString('es-ES')
    : '-';
  const ageMonths = animal.age_in_months ?? '-';
  const ageDays = animal.age_in_days ?? '-';
  const weight = animal.weight ?? '-';
  const status = animal.status || '-';
  const isAdult = animal.is_adult === true ? 'Sí' : animal.is_adult === false ? 'No' : '-';

  // Cargar catálogos
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [diseasesRes, fieldsRes, vaccinesRes, usersRes] = await Promise.all([
          diseaseService.getDiseases({ page: 1, limit: 1000 }).catch(() => ({ data: [] })),
          fieldService.getFields({ page: 1, limit: 1000 }).catch(() => ({ data: [] })),
          vaccinesService.getVaccines?.({ page: 1, limit: 1000 }).catch(() => ({ data: [] })),
          usersService.getUsers({ page: 1, limit: 1000 }).catch(() => ({ data: [] })),
        ]);

        const dMap: Record<number, string> = {};
        ((diseasesRes as any)?.data || diseasesRes || []).forEach((d: any) => { dMap[d.id] = d.disease || d.name; });
        setDiseaseOptions(dMap);

        const fMap: Record<number, string> = {};
        ((fieldsRes as any)?.data || fieldsRes || []).forEach((f: any) => { fMap[f.id] = f.name; });
        setFieldOptions(fMap);

        const vMap: Record<number, string> = {};
        ((vaccinesRes as any)?.data || vaccinesRes || []).forEach((v: any) => { vMap[v.id] = v.name; });
        setVaccineOptions(vMap);

        const uMap: Record<number, string> = {};
        ((usersRes as any)?.data || usersRes || []).forEach((u: any) => { uMap[u.id] = u.fullname || u.name; });
        setUserOptions(uMap);
      } catch (err) {
        console.error('Error loading options in AnimalModalContent:', err);
      }
    };
    loadOptions();
  }, []);

  // Triggers individuales para cada sección
  const [triggers, setTriggers] = useState({
    genetic: 0,
    diseases: 0,
    fields: 0,
    vaccinations: 0,
    treatments: 0,
    controls: 0,
    images: 0,
    general: 0 // Para refrescos completos
  });

  // Función unificada para refrescar secciones específicas
  const handleRefresh = useCallback((type?: string) => {
    if (!type) {
      // Si no se especifica tipo, refrescar todo
      setTriggers(prev => ({
        ...prev,
        genetic: prev.genetic + 1,
        diseases: prev.diseases + 1,
        fields: prev.fields + 1,
        vaccinations: prev.vaccinations + 1,
        treatments: prev.treatments + 1,
        controls: prev.controls + 1,
        images: prev.images + 1,
        general: prev.general + 1
      }));
      return;
    }

    // Mapeo de tipos de modal a claves del estado triggers
    const mapping: Record<string, keyof typeof triggers> = {
      'genetic_improvement': 'genetic',
      'animal_disease': 'diseases',
      'animal_field': 'fields',
      'vaccination': 'vaccinations',
      'treatment': 'treatments',
      'control': 'controls'
    };

    const key = mapping[type];
    if (key) {
      console.log(`[AnimalModalContent] Refreshing specific section: ${key}`);
      setTriggers(prev => ({ ...prev, [key]: prev[key] + 1 }));

      // Si cambiamos tratamientos o vacunas, verificar fecha reciente
      if (key === 'treatments' || key === 'vaccinations') {
        // Se actualizará en el efecto correspondiente
      }
    } else {
      // Fallback a general si no coincide
      setTriggers(prev => ({ ...prev, general: prev.general + 1 }));
    }
  }, []);

  // Efectos individuales para cargar datos

  // 1. Mejoras Genéticas
  useEffect(() => {
    const fetchGenetic = async () => {
      try {
        const params = { animal_id: animal.id, page: 1, limit: 1000, cache_bust: triggers.genetic > 0 ? Date.now() : undefined };
        const res = await geneticImprovementsService.getGeneticImprovements(params);
        const allData = (res as any)?.data || res || [];
        const filtered = Array.isArray(allData) ? allData.filter((item: any) => String(item.animal_id) === String(animal.id)) : [];
        setGeneticImprovements(filtered);
      } catch (e) {
        console.error('Error fetching genetic stats', e);
      }
    };
    fetchGenetic();
  }, [animal.id, triggers.genetic]);

  // 2. Enfermedades
  useEffect(() => {
    const fetchDiseases = async () => {
      try {
        const params = { animal_id: animal.id, page: 1, limit: 1000, cache_bust: triggers.diseases > 0 ? Date.now() : undefined };
        const res = await animalDiseasesService.getAnimalDiseases(params);
        const allData = (res as any)?.data || res || [];
        const filtered = Array.isArray(allData) ? allData.filter((item: any) => String(item.animal_id) === String(animal.id)) : [];
        setDiseases(filtered);
      } catch (e) {
        console.error('Error fetching diseases', e);
      }
    };
    fetchDiseases();
  }, [animal.id, triggers.diseases]);

  // 3. Campos
  useEffect(() => {
    const fetchFields = async () => {
      try {
        const params = { animal_id: animal.id, page: 1, limit: 1000, cache_bust: triggers.fields > 0 ? Date.now() : undefined };
        const res = await animalFieldsService.getAnimalFields(params);
        const allData = (res as any)?.data || res || [];
        const filtered = Array.isArray(allData) ? allData.filter((item: any) => String(item.animal_id) === String(animal.id)) : [];
        setFields(filtered);
      } catch (e) {
        console.error('Error fetching fields', e);
      }
    };
    fetchFields();
  }, [animal.id, triggers.fields]);

  // 4. Vacunaciones
  useEffect(() => {
    const fetchVaccinations = async () => {
      try {
        const params = { animal_id: animal.id, page: 1, limit: 1000, cache_bust: triggers.vaccinations > 0 ? Date.now() : undefined };
        const res = await vaccinationsService.getVaccinations(params);
        const allData = (res as any)?.data || res || [];
        const filtered = Array.isArray(allData) ? allData.filter((item: any) => String(item.animal_id) === String(animal.id)) : [];
        setVaccinations(filtered);
      } catch (e) {
        console.error('Error fetching vaccinations', e);
      }
    };
    fetchVaccinations();
  }, [animal.id, triggers.vaccinations]);

  // 5. Tratamientos
  useEffect(() => {
    const fetchTreatments = async () => {
      try {
        const params = { animal_id: animal.id, page: 1, limit: 1000, cache_bust: triggers.treatments > 0 ? Date.now() : undefined };
        const res = await treatmentsService.getTreatments(params);
        const allData = (res as any)?.data || res || [];
        const filtered = Array.isArray(allData) ? allData.filter((item: any) => String(item.animal_id) === String(animal.id)) : [];
        setTreatments(filtered);
      } catch (e) {
        console.error('Error fetching treatments', e);
      }
    };
    fetchTreatments();
  }, [animal.id, triggers.treatments]);

  // 6. Controles
  useEffect(() => {
    const fetchControls = async () => {
      try {
        const params = { animal_id: animal.id, page: 1, limit: 1000, cache_bust: triggers.controls > 0 ? Date.now() : undefined };
        const res = await controlService.getControls(params);
        const allData = (res as any)?.data || res || [];
        const filtered = Array.isArray(allData) ? allData.filter((item: any) => String(item.animal_id) === String(animal.id)) : [];
        setControls(filtered);
      } catch (e) {
        console.error('Error fetching controls', e);
      }
    };
    fetchControls();
  }, [animal.id, triggers.controls]);

  // 7. Imágenes
  useEffect(() => {
    const fetchImages = async () => {
      setImagesLoading(true);
      try {
        const res = await animalImageService.getAnimalImages(animal.id);
        const allImages = res?.data?.images || [];
        setAnimalImages(allImages);
      } catch (e) {
        console.error('Error fetching images', e);
      } finally {
        setImagesLoading(false);
      }
    };
    fetchImages();
  }, [animal.id, triggers.images]);

  // Efecto global para calcular "Recientes" y loading inicial
  useEffect(() => {
    // Cuando cargan tanto tratamientos como vacunas, recalculamos la flag de recientes
    const now = new Date().getTime();
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

    const hasRecentTreatment = treatments.some((t: any) => {
      const d = new Date(t.treatment_date || t.date || t.created_at);
      return !isNaN(d.getTime()) && (now - d.getTime() <= THIRTY_DAYS_MS);
    });

    const hasRecentVaccination = vaccinations.some((v: any) => {
      const d = new Date(v.vaccination_date || v.date || v.created_at);
      return !isNaN(d.getTime()) && (now - d.getTime() <= THIRTY_DAYS_MS);
    });

    setHasRecentTreatments(hasRecentTreatment || hasRecentVaccination);

    // Asumimos que si tenemos los arrays inicializados (aunque vacios si no hay error), ya no estamos cargando lo vital
    // Es una heurística simple
    setLoading(false);

  }, [treatments, vaccinations]);



  return (
    <>
      <div className="space-y-4 pb-6" onKeyDown={(e) => e.stopPropagation()}>
        {/* Banner de imágenes con carrusel - LO PRIMERO - se oculta si no hay imágenes */}
        {!imagesLoading && animalImages.length > 0 && (
          <div className="w-full rounded-xl overflow-hidden shadow-lg -mt-4">
            <AnimalImageBanner
              animalId={animal.id}
              height="clamp(200px, 40vh, 500px)"
              showControls={true}
              autoPlayInterval={5000}
              hideWhenEmpty={true}
              objectFit="contain"
              refreshTrigger={refreshTrigger}
              initialImages={animalImages}
            />
          </div>
        )}

        {/* Header con título y menú de acciones - DEBAJO DEL CARRUSEL */}
        <div className="flex items-start justify-between gap-4 bg-gradient-to-br from-accent/30 to-accent/10 rounded-xl p-4 shadow-md border border-border/50">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground truncate" data-testid="animal-modal-title">
              {animal.record || `Animal #${animal.id}`}
            </h2>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <p className="text-xs sm:text-sm text-muted-foreground">
                ID: {animal.id} • {breedLabel}
              </p>
              {hasRecentTreatments && (
                <Badge className="text-[10px] sm:text-xs bg-amber-500 text-white shadow-sm">
                  Tiene tratamientos recientes (≤ 30 días)
                </Badge>
              )}
            </div>
          </div>
          {/* Menú de acciones (tres puntos) y botón de refresco - visible en PC y móvil */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {onReplicate && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-secondary/20 hover:text-secondary transition-colors hidden sm:flex"
                onClick={onReplicate}
                title="Replicar Animal"
              >
                <Copy className="h-4 w-4" />
              </Button>
            )}
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-primary/20 hover:text-primary transition-colors hidden sm:flex"
                onClick={onEdit}
                title="Editar Animal"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-primary/20 hover:text-primary transition-colors"
              onClick={() => {
                setIsManualRefreshing(true);
                setDataRefreshTrigger(prev => prev + 1);
              }}
              title="Refrescar datos (bypass cache)"
            >
              <RefreshCw className={cn("h-4 w-4", (loading || isManualRefreshing) && "animate-spin")} />
            </Button>
            <AnimalActionsMenu
              animal={animal as AnimalResponse}
              currentUserId={currentUserId}
              onOpenHistory={onOpenHistory}
              onOpenAncestorsTree={onOpenAncestorsTree}
              onOpenDescendantsTree={onOpenDescendantsTree}
              onRefresh={handleRefresh}
            />
          </div>
        </div>



        {/* Grid wrapper for collapsible sections */}
        <div className="space-y-4">
          {/* Información Básica - Collapsible */}
          <CollapsibleCard
            title="Información Básica"
            defaultCollapsed={true}
            accent="blue"
            data-testid="collapsible-section-basic-info"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <DetailField label="ID" value={animal.id} />
              <DetailField label="Registro" value={animal.record || '-'} />
              <DetailField label="Raza" value={breedLabel} />
              <DetailField label="Sexo" value={gender || '-'}>
                <Badge
                  variant="secondary"
                  className={`text-xs font-semibold shadow-sm ${gender === 'Macho' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                    gender === 'Hembra' ? 'bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300' :
                      'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                    }`}
                >
                  {gender || '-'}
                </Badge>
              </DetailField>
              <DetailField label="Estado" value={status}>
                <Badge
                  variant="outline"
                  className={`text-xs font-semibold shadow-sm ${status === 'Sano' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400' :
                    status === 'Enfermo' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400' :
                      'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400'
                    }`}
                >
                  {status}
                </Badge>
              </DetailField>
              <DetailField label="Peso" value={`${weight} kg`} />
              <DetailField label="Fecha de nacimiento" value={birthDate} />
              <DetailField label="Edad (días)" value={ageDays} />
              <DetailField label="Edad (meses)" value={ageMonths} />
              <DetailField label="Adulto" value={isAdult} />
            </div>
          </CollapsibleCard>

          {/* Genealogía - Collapsible */}
          <CollapsibleCard
            title="Genealogía"
            defaultCollapsed={true}
            accent="amber"
            data-testid="collapsible-section-genealogy"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Padre */}
              <ParentMiniCard
                parentId={animal.idFather || animal.father_id}
                parentLabel={fatherLabel || '-'}
                gender="Padre"
                onClick={
                  onFatherClick && (animal.idFather || animal.father_id)
                    ? () => onFatherClick(animal.idFather || animal.father_id)
                    : undefined
                }
              />

              {/* Madre */}
              <ParentMiniCard
                parentId={animal.idMother || animal.mother_id}
                parentLabel={motherLabel || '-'}
                gender="Madre"
                onClick={
                  onMotherClick && (animal.idMother || animal.mother_id)
                    ? () => onMotherClick(animal.idMother || animal.mother_id)
                    : undefined
                }
              />
            </div>
          </CollapsibleCard>

          {/* Notas - Collapsible */}
          {animal.notes && (
            <CollapsibleCard
              title="Notas"
              defaultCollapsed={true}
              accent="slate"
            >
              <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                {animal.notes}
              </p>
            </CollapsibleCard>
          )}
        </div>

        {/* Información del animal - En el centro (LEGACY WRAPPER REMOVED) */}
        <div className="space-y-6">
          {/* Grid responsive: 1 columna en móvil, 2 columnas en pantallas grandes (LEGACY GRID REMOVED - now inside collapsible) */}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Mejoras Genéticas - Verde */}
            {geneticImprovements.length > 0 && (
              <RelatedDataSection
                title="Mejoras Genéticas"
                icon={<TrendingUp className="h-5 w-5" />}
                data={geneticImprovements}
                accent="emerald"
                data-testid="related-section-genetic_improvement"
                renderItem={(item) => (
                  <div className="flex flex-col gap-1.5 w-full">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[13px] font-bold text-foreground leading-tight">
                        {item.improvement_type || item.genetic_event_technique || item.genetic_event_techique || 'Evento Genético'}
                      </span>
                      <Badge variant="outline" className="text-[9px] h-4 bg-green-500/10 text-green-700 border-green-200 shrink-0">
                        {formatDate(item.date)}
                      </Badge>
                    </div>
                    {(item.description || item.details) && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2 italic bg-background/50 p-1.5 rounded border border-green-100 dark:border-emerald-800/50">
                        {item.description || item.details}
                      </p>
                    )}
                  </div>
                )}
                onAdd={() => openCreateModal('genetic_improvement')}
                onViewAll={() => openListModal('genetic_improvement')}
                onView={(item) => openViewModal('genetic_improvement', item)}
                onItemClick={(item) => openViewModal('genetic_improvement', item)}
                onEdit={(item) => openEditModal('genetic_improvement', item)}
                onDelete={async (item) => {
                  const recordId = resolveRecordId(item);
                  if (!recordId) {
                    showToast('No se pudo determinar el ID del registro', 'error');
                    return;
                  }
                  if (confirmingDeleteId === recordId) {
                    setConfirmingDeleteId(null);
                    setDeletingItemId(recordId);

                    // Optimistic update
                    const previousItems = [...geneticImprovements];
                    setGeneticImprovements(prev => prev.filter((i: any) => String(resolveRecordId(i)) !== String(recordId)));

                    try {
                      await geneticImprovementsService.deleteGeneticImprovement(recordId as any);
                      await geneticImprovementsService.clearCache();
                      if (animal?.id) clearAnimalDependencyCache(animal.id);
                      showToast('Mejora genética eliminada correctamente', 'success');


                    } catch (error: any) {
                      // Revert optimistic update
                      setGeneticImprovements(previousItems);

                      const errorMessage = error.message || error.response?.data?.message || 'Error desconocido';
                      if (error.status === 404 || error.response?.status === 404 || String(errorMessage).toLowerCase().includes('no encontrado')) {
                        showToast('El registro ya fue eliminado', 'info');
                        if (animal?.id) clearAnimalDependencyCache(animal.id);
                        setDataRefreshTrigger(prev => prev + 1);
                      } else {
                        showToast('Error al eliminar: ' + errorMessage, 'error');
                      }
                    } finally {
                      setDeletingItemId(null);
                    }
                  } else {
                    setConfirmingDeleteId(recordId);
                    showToast('Haz clic de nuevo para confirmar la eliminación', 'warning');
                    setTimeout(() => setConfirmingDeleteId(prev => prev === recordId ? null : prev), 3000);
                  }
                }}
                confirmingDeleteId={confirmingDeleteId}
                deletingItemId={deletingItemId}
              />
            )}

            {/* Enfermedades - Rojo */}
            {diseases.length > 0 && (
              <RelatedDataSection
                title="Enfermedades"
                icon={<Activity className="h-5 w-5" />}
                data={diseases}
                accent="red"
                data-testid="related-section-animal_disease"
                renderItem={(item) => (
                  <div className="flex flex-col gap-1.5 w-full">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-bold text-foreground truncate">
                        {diseaseOptions[item.disease_id] || `Enfermedad #${item.disease_id}`}
                      </span>
                      <Badge
                        variant={item.status === 'Activo' ? 'destructive' : 'default'}
                        className={`text-[9px] h-4 ${item.status === 'Curado' ? 'bg-green-600 text-white' : ''}`}
                      >
                        {item.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span className="font-semibold">Diagnóstico:</span> {formatDate(item.diagnosis_date)}
                      </span>
                      {item.notes && <span className="italic max-w-[120px] truncate">"{item.notes}"</span>}
                    </div>
                  </div>
                )}
                onAdd={() => openCreateModal('animal_disease')}
                onViewAll={() => openListModal('animal_disease')}
                onView={(item) => openViewModal('animal_disease', item)}
                onItemClick={(item) => openViewModal('animal_disease', item)}
                onEdit={(item) => openEditModal('animal_disease', item)}
                onDelete={async (item) => {
                  const recordId = resolveRecordId(item);
                  if (!recordId) {
                    showToast('No se pudo determinar el ID del registro', 'error');
                    return;
                  }
                  if (confirmingDeleteId === recordId) {
                    setConfirmingDeleteId(null);
                    setDeletingItemId(recordId);

                    // Optimistic update
                    const previousItems = [...diseases];
                    setDiseases(prev => prev.filter((i: any) => String(resolveRecordId(i)) !== String(recordId)));

                    try {
                      await animalDiseasesService.deleteAnimalDisease(recordId as any);
                      await animalDiseasesService.clearCache();
                      if (animal?.id) clearAnimalDependencyCache(animal.id);
                      showToast('Registro de enfermedad eliminado correctamente', 'success');


                    } catch (error: any) {
                      // Revert optimistic update
                      setDiseases(previousItems);

                      const errorMessage = error.message || error.response?.data?.message || 'Error desconocido';
                      if (error.status === 404 || error.response?.status === 404 || String(errorMessage).toLowerCase().includes('no encontrado')) {
                        showToast('El registro ya fue eliminado', 'info');
                        if (animal?.id) clearAnimalDependencyCache(animal.id);
                        setDataRefreshTrigger(prev => prev + 1);
                      } else {
                        showToast('Error al eliminar: ' + errorMessage, 'error');
                      }
                    } finally {
                      setDeletingItemId(null);
                    }
                  } else {
                    setConfirmingDeleteId(recordId);
                    showToast('Haz clic de nuevo para confirmar la eliminación', 'warning');
                    setTimeout(() => setConfirmingDeleteId(prev => prev === recordId ? null : prev), 3000);
                  }
                }}
                confirmingDeleteId={confirmingDeleteId}
                deletingItemId={deletingItemId}
              />
            )}

            {/* Campos Asignados - Amarillo */}
            {fields.length > 0 && (
              <RelatedDataSection
                title="Campos Asignados"
                icon={<MapPin className="h-5 w-5" />}
                data={fields}
                accent="amber"
                renderItem={(item) => (
                  <div className="flex flex-col gap-1.5 w-full">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col">
                        <span className="text-[13px] font-bold text-foreground">
                          {fieldOptions[item.field_id] || `Campo #${item.field_id}`}
                        </span>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
                          <Badge variant="outline" className="text-[9px] h-4 bg-amber-500/10 text-amber-700 border-amber-200">
                            ID: {item.field_id}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {formatDate(item.assignment_date)}
                          </span>
                        </div>
                      </div>
                      <Badge variant={item.removal_date ? 'secondary' : 'default'} className={`text-[9px] h-4 ${!item.removal_date ? 'bg-green-600 text-white animate-pulse' : ''}`}>
                        {item.removal_date ? 'Retirado' : 'Activo'}
                      </Badge>
                    </div>
                  </div>
                )}
                onAdd={() => openCreateModal('animal_field')}
                onViewAll={() => openListModal('animal_field')}
                onView={(item) => openViewModal('animal_field', item)}
                onItemClick={(item) => openViewModal('animal_field', item)}
                onEdit={(item) => openEditModal('animal_field', item)}
                onDelete={async (item) => {
                  const recordId = resolveRecordId(item);
                  if (!recordId) {
                    showToast('No se pudo determinar el ID del registro', 'error');
                    return;
                  }
                  if (confirmingDeleteId === recordId) {
                    setConfirmingDeleteId(null);
                    setDeletingItemId(recordId);

                    // Optimistic update
                    const previousItems = [...fields];
                    setFields(prev => prev.filter((i: any) => String(resolveRecordId(i)) !== String(recordId)));

                    try {
                      await animalFieldsService.deleteAnimalField(recordId as any);
                      await animalFieldsService.clearCache();
                      if (animal?.id) clearAnimalDependencyCache(animal.id);
                      showToast('Asignación de campo eliminada correctamente', 'success');


                    } catch (error: any) {
                      // Revert optimistic update
                      setFields(previousItems);

                      const errorMessage = error.message || error.response?.data?.message || 'Error desconocido';
                      if (error.status === 404 || error.response?.status === 404 || String(errorMessage).toLowerCase().includes('no encontrado')) {
                        showToast('El registro ya fue eliminado', 'info');
                        if (animal?.id) clearAnimalDependencyCache(animal.id);
                        setDataRefreshTrigger(prev => prev + 1);
                      } else {
                        showToast('Error al eliminar: ' + errorMessage, 'error');
                      }
                    } finally {
                      setDeletingItemId(null);
                    }
                  } else {
                    setConfirmingDeleteId(recordId);
                    showToast('Haz clic de nuevo para confirmar la eliminación', 'warning');
                    setTimeout(() => setConfirmingDeleteId(prev => prev === recordId ? null : prev), 3000);
                  }
                }}
                confirmingDeleteId={confirmingDeleteId}
                deletingItemId={deletingItemId}
              />
            )}

            {/* Vacunaciones - Azul */}
            {vaccinations.length > 0 && (
              <RelatedDataSection
                title="Vacunaciones"
                icon={<Syringe className="h-5 w-5" />}
                data={vaccinations}
                accent="cyan"
                data-testid="related-section-vaccination"
                renderItem={(item) => (
                  <div className="flex flex-col gap-1.5 w-full">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-bold text-foreground truncate">
                        {vaccineOptions[item.vaccine_id] || `Vacuna #${item.vaccine_id}`}
                      </span>
                      <Badge variant="outline" className="text-[9px] h-4 bg-blue-500/10 text-blue-700 border-blue-200 shrink-0">
                        {formatDate(item.vaccination_date)}
                      </Badge>
                    </div>
                    {item.next_dose_date && (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 dark:text-sky-400">
                        <span className="w-1 h-1 rounded-full bg-blue-500 animate-ping" />
                        Próxima dosis: {formatDate(item.next_dose_date)}
                      </div>
                    )}
                  </div>
                )}
                onAdd={() => openCreateModal('vaccination')}
                onViewAll={() => openListModal('vaccination')}
                onView={(item) => openViewModal('vaccination', item)}
                onItemClick={(item) => openViewModal('vaccination', item)}
                onEdit={(item) => openEditModal('vaccination', item)}
                onDelete={async (item) => {
                  const recordId = resolveRecordId(item);
                  if (!recordId) {
                    showToast('No se pudo determinar el ID del registro', 'error');
                    return;
                  }
                  if (confirmingDeleteId === recordId) {
                    setConfirmingDeleteId(null);
                    setDeletingItemId(recordId);

                    // Optimistic update
                    const previousItems = [...vaccinations];
                    setVaccinations(prev => prev.filter((i: any) => String(resolveRecordId(i)) !== String(recordId)));

                    try {
                      await vaccinationsService.deleteVaccination(recordId as any);
                      await vaccinationsService.clearCache();
                      if (animal?.id) clearAnimalDependencyCache(animal.id);
                      showToast('Vacunación eliminada correctamente', 'success');


                    } catch (error: any) {
                      // Revert optimistic update
                      setVaccinations(previousItems);

                      const errorMessage = error.message || error.response?.data?.message || 'Error desconocido';
                      if (error.status === 404 || error.response?.status === 404 || String(errorMessage).toLowerCase().includes('no encontrado')) {
                        showToast('El registro ya fue eliminado', 'info');
                        if (animal?.id) clearAnimalDependencyCache(animal.id);
                        setDataRefreshTrigger(prev => prev + 1);
                      } else {
                        showToast('Error al eliminar: ' + errorMessage, 'error');
                      }
                    } finally {
                      setDeletingItemId(null);
                    }
                  } else {
                    setConfirmingDeleteId(recordId);
                    showToast('Haz clic de nuevo para confirmar la eliminación', 'warning');
                    setTimeout(() => setConfirmingDeleteId(prev => prev === recordId ? null : prev), 3000);
                  }
                }}
                confirmingDeleteId={confirmingDeleteId}
                deletingItemId={deletingItemId}
              />
            )}

            {/* Tratamientos - Púrpura */}
            {treatments.length > 0 && (
              <RelatedDataSection
                title="Tratamientos"
                icon={<Pill className="h-5 w-5" />}
                data={treatments}
                accent="purple"
                data-testid="related-section-treatment"
                renderItem={(item) => (
                  <>
                    <div className="flex flex-col gap-1.5 w-full">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[13px] font-bold text-foreground leading-tight">
                          {item.diagnosis || item.description || `Tratamiento #${item.id}`}
                        </span>
                        <Badge variant="outline" className="text-[9px] h-4 bg-purple-500/10 text-purple-700 border-purple-200 shrink-0">
                          {formatDate(item.treatment_date || item.treatment_date)}
                        </Badge>
                      </div>
                      {(item.frequency || item.dosis || item.description) && (
                        <div className="flex flex-col gap-1 text-[10px] text-muted-foreground italic">
                          <div className="flex items-center gap-2">
                            {item.dosis && <span>Dosis: {item.dosis}</span>}
                            {item.dosis && item.frequency && <span>•</span>}
                            {item.frequency && <span>Freq: {item.frequency}</span>}
                          </div>
                          {item.diagnosis && item.description && (
                            <p className="line-clamp-1 opacity-80">{item.description}</p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end pt-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[10px] text-purple-600 dark:text-purple-400 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/20 gap-1 border border-purple-100 dark:border-purple-800/30"
                        onClick={() => setSuppliesTreatment(item)}
                      >
                        <Syringe className="h-3 w-3" />
                        Ver Insumos
                      </Button>
                    </div>
                  </>
                )}
                onAdd={() => openCreateModal('treatment')}
                onViewAll={() => openListModal('treatment')}
                onEdit={(item) => openEditModal('treatment', item)}
                onView={(item) => openViewModal('treatment', item)}
                onItemClick={(item) => openViewModal('treatment', item)}
                onDelete={async (item) => {
                  const recordId = resolveRecordId(item);
                  if (!recordId) {
                    showToast('No se pudo determinar el ID del registro', 'error');
                    return;
                  }
                  if (confirmingDeleteId === recordId) {
                    setConfirmingDeleteId(null);
                    setDeletingItemId(recordId);
                    try {
                      // Verificar dependencias antes de eliminar
                      const depCheck = await checkTreatmentDependencies(recordId as number);
                      if (depCheck.hasDependencies) {
                        const depSummary = depCheck.dependencies?.map(d => `${d.count} ${d.entity}`).join(', ') || 'registros asociados';
                        showToast(
                          `⚠️ No se puede eliminar este tratamiento porque tiene ${depSummary}. Elimina primero las dependencias.`,
                          'error'
                        );
                        setDeletingItemId(null);
                        return;
                      }

                      // Optimistic update
                      const previousItems = [...treatments];
                      setTreatments(prev => prev.filter((i: any) => String(resolveRecordId(i)) !== String(recordId)));

                      await treatmentsService.deleteTreatment(recordId as any);
                      await treatmentsService.clearCache();
                      if (animal?.id) clearAnimalDependencyCache(animal.id);
                      showToast('Tratamiento eliminado correctamente', 'success');



                    } catch (error: any) {
                      // Revert optimistic update
                      setTreatments(previousItems);

                      const errorMessage = error.message || error.response?.data?.message || 'Error desconocido';
                      const isIntegrityError =
                        String(errorMessage).toLowerCase().includes('foreign key') ||
                        String(errorMessage).toLowerCase().includes('constraint') ||
                        String(errorMessage).toLowerCase().includes('dependenc') ||
                        String(errorMessage).toLowerCase().includes('referencia') ||
                        String(errorMessage).toLowerCase().includes('relacionado') ||
                        error.status === 409 || error.response?.status === 409;

                      if (isIntegrityError) {
                        showToast(
                          '⚠️ No se puede eliminar este tratamiento porque tiene medicamentos o vacunas asociados. Elimina primero esas relaciones.',
                          'error'
                        );
                      } else if (error.status === 404 || error.response?.status === 404 || String(errorMessage).toLowerCase().includes('no encontrado')) {
                        showToast('El registro ya fue eliminado', 'info');
                        if (animal?.id) clearAnimalDependencyCache(animal.id);
                        setDataRefreshTrigger(prev => prev + 1);
                      } else {
                        showToast('Error al eliminar: ' + errorMessage, 'error');
                      }
                    } finally {
                      setDeletingItemId(null);
                    }
                  } else {
                    setConfirmingDeleteId(recordId);
                    showToast('Haz clic de nuevo para confirmar la eliminación', 'warning');
                    setTimeout(() => setConfirmingDeleteId(prev => prev === recordId ? null : prev), 3000);
                  }
                }}
                confirmingDeleteId={confirmingDeleteId}
                deletingItemId={deletingItemId}
              />
            )}

            {/* Controles - Naranja */}
            {controls.length > 0 && (
              <RelatedDataSection
                title="Controles de Crecimiento"
                icon={<TrendingUp className="h-5 w-5" />}
                data={controls}
                accent="amber"
                renderItem={(item) => (
                  <div className="flex flex-col gap-1.5 w-full">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[13px] font-bold ${item.health_status === 'Excelente' || item.health_status === 'Bueno' || item.health_status === 'Sano' ? 'text-green-600' : item.health_status === 'Regular' ? 'text-amber-600' : 'text-rose-600'}`}>
                        {item.health_status || item.healt_status || 'Control de Salud'}
                      </span>
                      <span className="text-[10px] font-medium text-muted-foreground bg-background/50 px-1.5 py-0.5 rounded border border-orange-100">
                        {formatDate(item.checkup_date)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-[11px] font-medium">
                      {item.weight && (
                        <span className="text-foreground">
                          Peso: <span className="text-[12px] font-black">{item.weight} kg</span>
                        </span>
                      )}
                      {item.height && (
                        <span className="text-muted-foreground">
                          Altura: <span className="text-foreground">{item.height} m</span>
                        </span>
                      )}
                    </div>
                  </div>
                )}
                onAdd={() => openCreateModal('control')}
                onViewAll={() => openListModal('control')}
                onView={(item) => openViewModal('control', item)}
                onItemClick={(item) => openViewModal('control', item)}
                onEdit={(item) => openEditModal('control', item)}
                onDelete={async (item) => {
                  const recordId = resolveRecordId(item);
                  if (!recordId) {
                    showToast('No se pudo determinar el ID del registro', 'error');
                    return;
                  }
                  if (confirmingDeleteId === recordId) {
                    setConfirmingDeleteId(null);
                    setDeletingItemId(recordId);

                    // Optimistic update
                    const previousItems = [...controls];
                    setControls(prev => prev.filter((i: any) => String(resolveRecordId(i)) !== String(recordId)));

                    try {
                      await controlService.deleteControl(recordId as any);
                      await controlService.clearCache();
                      if (animal?.id) clearAnimalDependencyCache(animal.id);
                      showToast('Control eliminado correctamente', 'success');


                    } catch (error: any) {
                      // Revert optimistic update
                      setControls(previousItems);

                      const errorMessage = error.message || error.response?.data?.message || 'Error desconocido';
                      if (error.status === 404 || error.response?.status === 404 || String(errorMessage).toLowerCase().includes('no encontrado')) {
                        showToast('El registro ya fue eliminado', 'info');
                        if (animal?.id) clearAnimalDependencyCache(animal.id);
                        setDataRefreshTrigger(prev => prev + 1);
                      } else {
                        showToast('Error al eliminar: ' + errorMessage, 'error');
                      }
                    } finally {
                      setDeletingItemId(null);
                    }
                  } else {
                    setConfirmingDeleteId(recordId);
                    showToast('Haz clic de nuevo para confirmar la eliminación', 'warning');
                    setTimeout(() => setConfirmingDeleteId(prev => prev === recordId ? null : prev), 3000);
                  }
                }}
                confirmingDeleteId={confirmingDeleteId}
                deletingItemId={deletingItemId}
              />
            )}
          </div>
        </div>

        {/* Galería e imágenes - Al final */}
        {/* Galería e imágenes - Al final */}
        <CollapsibleCard
          title="Galería de Imágenes"
          defaultCollapsed={true}
          accent="slate"
        >
          {/* Componente unificado de gestión de imágenes */}
          <ImageManager
            animalId={animal.id}
            title=""
            onGalleryUpdate={() => {
              preserveScroll();
              // Refrescar también el estado local
              setDataRefreshTrigger(prev => prev + 1);
              setRefreshTrigger(prev => prev + 1);
              setTimeout(restoreScroll, 0);
            }}
            showControls={true}
            refreshTrigger={refreshTrigger}
            compact={true}
            initialImages={animalImages}
          />
        </CollapsibleCard>

        {/* Modal de detalle para VER */}
        {
          actionModalType && selectedItem && actionModalMode === 'view' && (
            <ItemDetailModal
              type={actionModalType}
              item={selectedItem}
              options={{
                diseases: diseaseOptions,
                fields: fieldOptions,
                vaccines: vaccineOptions,
                users: userOptions
              }}
              onClose={closeActionModal}
              onEdit={() => setActionModalMode('edit')}
              zIndex={2000}
            />
          )
        }

        {/* AnimalActionsMenu controlado externamente para CREAR/EDITAR/LISTAR */}
        {
          actionModalType && (actionModalMode === 'create' || actionModalMode === 'list' || actionModalMode === 'edit') && (
            <AnimalActionsMenu
              animal={animal as AnimalResponse}
              currentUserId={currentUserId}
              externalOpenModal={actionModalType}
              externalModalMode={actionModalMode === 'edit' ? 'create' : actionModalMode}
              externalEditingItem={selectedItem}
              onRefresh={handleRefresh}
              onModalClose={closeActionModal}
            />
          )
        }


      </div >

      {/* Modal de insumos de tratamiento (Nivel superior) */}
      <TreatmentSuppliesModal
        isOpen={!!suppliesTreatment}
        onClose={() => setSuppliesTreatment(null)}
        treatment={suppliesTreatment}
        zIndex={2100}
      />
    </>
  );
}



function DetailField({
  label,
  value,
  children
}: {
  label: string;
  value: any;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/70">
        {label}
      </div>
      {children || (
        <div className="text-sm font-semibold text-foreground">
          {value ?? '-'}
        </div>
      )}
    </div>
  );
}

function RelatedDataSection<T>({
  title,
  icon,
  data,
  renderItem,
  accent = 'slate',
  onAdd,
  onViewAll,
  onView,
  onEdit,
  onDelete,
  onItemClick,
  confirmingDeleteId,
  deletingItemId
}: {
  title: string;
  icon: React.ReactNode;
  data: T[];
  renderItem: (item: T) => React.ReactNode;
  accent?: 'blue' | 'cyan' | 'teal' | 'emerald' | 'purple' | 'indigo' | 'red' | 'amber' | 'slate';
  onAdd?: () => void;
  onViewAll?: () => void;
  onView?: (item: T) => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  onItemClick?: (item: T) => void;
  confirmingDeleteId?: string | number | null;
  deletingItemId?: string | number | null;
}) {
  const [isCollapsed, setIsCollapsed] = useState(true);

  const accentClasses: Record<string, string> = {
    blue: "text-blue-700 dark:text-blue-300 before:bg-blue-500 shadow-blue-500/10",
    cyan: "text-cyan-700 dark:text-cyan-300 before:bg-cyan-500 shadow-cyan-500/10",
    teal: "text-teal-700 dark:text-teal-300 before:bg-teal-500 shadow-teal-500/10",
    emerald: "text-emerald-700 dark:text-emerald-300 before:bg-emerald-500 shadow-emerald-500/10",
    purple: "text-purple-700 dark:text-purple-300 before:bg-purple-500 shadow-purple-500/10",
    indigo: "text-indigo-700 dark:text-indigo-300 before:bg-indigo-500 shadow-indigo-500/10",
    red: "text-red-700 dark:text-red-300 before:bg-red-500 shadow-red-500/10",
    amber: "text-amber-700 dark:text-amber-300 before:bg-amber-500 shadow-amber-500/10",
    slate: "text-slate-700 dark:text-slate-300 before:bg-slate-500 shadow-slate-500/10",
  };

  const classes = accentClasses[accent] || accentClasses.slate;
  const [textClasses, barClasses] = [
    classes.split(' before:')[0],
    classes.split(' before:')[1]
  ];

  return (
    <div className={cn(
      "rounded-xl shadow-lg border overflow-hidden transition-all duration-300 bg-card border-border/60",
      "hover:shadow-xl"
    )}>
      {/* Header con título y botones de acción */}
      <div
        className={cn(
          "flex items-center justify-between p-4 cursor-pointer transition-colors border-b border-border/40",
          "hover:bg-accent/5",
          isCollapsed ? "bg-card" : "bg-card/50"
        )}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-1.5 rounded-full backdrop-blur-sm border shadow-sm bg-background/50",
            textClasses
          )}>
            {icon}
          </div>
          <div className="flex flex-col">
            <h3 className={cn(
              "text-xs font-bold uppercase tracking-wider flex items-center gap-2",
              textClasses
            )}>
              {title}
            </h3>
            <span className="text-[10px] text-muted-foreground font-medium">
              {data.length} registros
            </span>
          </div>
        </div>

        {/* Botones de acción derecha */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 mr-1" onClick={(e) => e.stopPropagation()}>
            {onAdd && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={onAdd}
                className="h-8 w-8 p-0 rounded-full hover:bg-background/40 hover:scale-105 transition-all text-muted-foreground hover:text-foreground"
                title="Agregar nuevo"
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
            {onViewAll && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={onViewAll}
                className="h-8 w-8 p-0 rounded-full hover:bg-background/40 hover:scale-105 transition-all text-muted-foreground hover:text-foreground"
                title="Ver todos"
              >
                <List className="h-4 w-4" />
              </Button>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 rounded-full hover:bg-background/40"
          >
            {isCollapsed ? <ChevronDown className="h-5 w-5 opacity-70" /> : <ChevronUp className="h-5 w-5 opacity-70" />}
          </Button>
        </div>
      </div>

      <div className={cn(
        "transition-all duration-300 ease-in-out",
        isCollapsed ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-[1000px] opacity-100 overflow-visible'
      )}>
        <div className="p-4 pt-0">
          <div className="my-2 h-px bg-current opacity-5" />
          {data.length > 0 ? (
            <div className="space-y-2 mt-4">
              {data.slice(0, 5).map((item: any, index) => (
                <div
                  key={item.id || index}
                  className={cn(
                    "bg-card/40 backdrop-blur-md rounded-xl p-3 border border-border/10 transition-all hover:shadow-md hover:translate-x-1 group",
                    onItemClick ? 'cursor-pointer hover:bg-card/60' : ''
                  )}
                  onClick={onItemClick ? (e) => { e.stopPropagation(); onItemClick(item); } : undefined}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {renderItem(item)}
                    </div>

                    {(onView || onEdit || onDelete) && (
                      <div className="flex items-center gap-1 opacity-10 sm:opacity-0 group-hover:opacity-100 transition-opacity translate-y-1">
                        {onView && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={(e) => { e.stopPropagation(); e.preventDefault(); onView(item); }}
                            className="h-7 w-7 p-0 hover:bg-green-500/10 hover:text-green-600 rounded-full"
                            data-testid={`view-item-btn-${resolveRecordId(item)}`}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {onEdit && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={(e) => { e.stopPropagation(); e.preventDefault(); onEdit(item); }}
                            className="h-7 w-7 p-0 hover:bg-blue-500/10 hover:text-blue-600 rounded-full"
                            data-testid={`edit-item-btn-${resolveRecordId(item)}`}
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {onDelete && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={(e) => { e.stopPropagation(); e.preventDefault(); onDelete(item); }}
                            disabled={deletingItemId !== null && (deletingItemId === resolveRecordId(item))}
                            data-testid={`delete-item-btn-${resolveRecordId(item)}`}
                            className={cn(
                              "h-7 w-7 p-0 transition-all duration-200 rounded-full disabled:opacity-50",
                              confirmingDeleteId === resolveRecordId(item)
                                ? 'bg-red-600 text-white shadow-lg shadow-red-500/50 animate-pulse scale-110'
                                : 'hover:bg-red-500/10 hover:text-red-600'
                            )}
                          >
                            {deletingItemId !== null && (deletingItemId === resolveRecordId(item)) ? (
                              <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            ) : confirmingDeleteId === resolveRecordId(item) ? (
                              <span className="text-[10px] font-bold">✓</span>
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {data.length > 5 && (
                <div className="text-center pt-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={onViewAll}
                    className="text-[10px] font-bold uppercase tracking-widest opacity-60 hover:opacity-100 w-full"
                  >
                    Ver todos ({data.length})
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-xs italic opacity-60">
              No hay registros
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

