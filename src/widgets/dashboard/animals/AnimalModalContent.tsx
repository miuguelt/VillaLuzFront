import React, { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Activity, Syringe, MapPin, Pill, ClipboardList, TrendingUp, Plus, List, Eye, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/app/providers/ToastContext';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { AnimalResponse } from '@/shared/api/generated/swaggerTypes';
import { ImageManager } from '@/shared/ui/common/ImageManager';
import { AnimalImageBanner } from './AnimalImageBanner';
import { AnimalActionsMenu } from '@/widgets/dashboard/AnimalActionsMenu';
import { ParentMiniCard } from './ParentMiniCard';
import { geneticImprovementsService } from '@/entities/genetic-improvement/api/geneticImprovements.service';
import { animalDiseasesService } from '@/entities/animal-disease/api/animalDiseases.service';
import { animalFieldsService } from '@/entities/animal-field/api/animalFields.service';
import { vaccinationsService } from '@/entities/vaccination/api/vaccinations.service';
import { treatmentsService } from '@/entities/treatment/api/treatments.service';
import { controlService } from '@/entities/control/api/control.service';
// Importar servicio para limpiar caché de dependencias
import { clearAnimalDependencyCache, checkTreatmentDependencies } from '@/features/diagnostics/api/dependencyCheck.service';
import { diseaseService } from '@/entities/disease/api/disease.service';
import { fieldService } from '@/entities/field/api/field.service';
import { vaccinesService } from '@/entities/vaccine/api/vaccines.service';
import { usersService } from '@/entities/user/api/user.service';
import analyticsService from '@/features/reporting/api/analytics.service';
import { resolveRecordId } from '@/shared/utils/recordIdUtils';

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
  scrollContainerRef
}: AnimalModalContentProps) {
  const { showToast } = useToast();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const savedScrollTopRef = React.useRef(0);
  const [deletingItemId, setDeletingItemId] = useState<string | number | null>(null);

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
  const [dataRefreshTrigger, setDataRefreshTrigger] = useState(0);
  const [hasRecentTreatments, setHasRecentTreatments] = useState<boolean | null>(null);

  // Opciones para nombres
  const [diseaseOptions, setDiseaseOptions] = useState<Record<number, string>>({});
  const [fieldOptions, setFieldOptions] = useState<Record<number, string>>({});
  const [vaccineOptions, setVaccineOptions] = useState<Record<number, string>>({});
  const [userOptions, setUserOptions] = useState<Record<number, string>>({});

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

  // Cargar datos relacionados
  useEffect(() => {
    const loadRelatedData = async () => {
      setLoading(true);
      try {
        const [
          geneticData,
          diseasesData,
          fieldsData,
          vaccinationsData,
          treatmentsData,
          controlsData
        ] = await Promise.allSettled([
          geneticImprovementsService.getGeneticImprovements({ page: 1, limit: 1000 }),
          animalDiseasesService.getAnimalDiseases({ page: 1, limit: 1000 }),
          animalFieldsService.getAnimalFields({ page: 1, limit: 1000 }),
          vaccinationsService.getVaccinations({ page: 1, limit: 1000 }),
          treatmentsService.getTreatments({ page: 1, limit: 1000 }),
          controlService.getControls({ page: 1, limit: 1000 })
        ]);

        if (geneticData.status === 'fulfilled') {
          const allData = geneticData.value.data || geneticData.value || [];
          const filtered = Array.isArray(allData) ? allData.filter((item: any) => String(item.animal_id) === String(animal.id)) : [];
          console.log('[AnimalModalContent] Genetic Improvements for animal', animal.id, ':', filtered.length, 'items');
          setGeneticImprovements(filtered);
        }
        if (diseasesData.status === 'fulfilled') {
          const allData = diseasesData.value.data || diseasesData.value || [];
          const filtered = Array.isArray(allData) ? allData.filter((item: any) => String(item.animal_id) === String(animal.id)) : [];
          console.log('[AnimalModalContent] Diseases for animal', animal.id, ':', filtered.length, 'items');
          setDiseases(filtered);
        }
        if (fieldsData.status === 'fulfilled') {
          const allData = fieldsData.value.data || fieldsData.value || [];
          const filtered = Array.isArray(allData) ? allData.filter((item: any) => String(item.animal_id) === String(animal.id)) : [];
          console.log('[AnimalModalContent] Fields for animal', animal.id, ':', filtered.length, 'items');
          console.log('[AnimalModalContent] All fields data:', allData);
          console.log('[AnimalModalContent] Filtered fields:', filtered);
          setFields(filtered);
        }
        if (vaccinationsData.status === 'fulfilled') {
          const allData = vaccinationsData.value.data || vaccinationsData.value || [];
          const filtered = Array.isArray(allData) ? allData.filter((item: any) => String(item.animal_id) === String(animal.id)) : [];
          console.log('[AnimalModalContent] Vaccinations for animal', animal.id, ':', filtered.length, 'items');
          setVaccinations(filtered);
        }
        if (treatmentsData.status === 'fulfilled') {
          const allData = treatmentsData.value.data || treatmentsData.value || [];
          const filtered = Array.isArray(allData) ? allData.filter((item: any) => String(item.animal_id) === String(animal.id)) : [];
          console.log('[AnimalModalContent] Treatments for animal', animal.id, ':', filtered.length, 'items');
          setTreatments(filtered);
        }
        if (controlsData.status === 'fulfilled') {
          const allData = controlsData.value.data || controlsData.value || [];
          const filtered = Array.isArray(allData) ? allData.filter((item: any) => String(item.animal_id) === String(animal.id)) : [];
          console.log('[AnimalModalContent] Controls for animal', animal.id, ':', filtered.length, 'items');
          setControls(filtered);
        }

        // Calcular si hay tratamientos o vacunaciones recientes (≤ 30 días)
        const checkRecent = () => {
          const now = new Date().getTime();
          const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

          const hasRecentTreatment = (treatmentsData.status === 'fulfilled' ? (treatmentsData.value.data || treatmentsData.value || []) : [])
            .filter((t: any) => t.animal_id === animal.id)
            .some((t: any) => {
              const d = new Date(t.treatment_date || t.date || t.created_at);
              return !isNaN(d.getTime()) && (now - d.getTime() <= THIRTY_DAYS_MS);
            });

          const hasRecentVaccination = (vaccinationsData.status === 'fulfilled' ? (vaccinationsData.value.data || vaccinationsData.value || []) : [])
            .filter((v: any) => v.animal_id === animal.id)
            .some((v: any) => {
              const d = new Date(v.vaccination_date || v.date || v.created_at);
              return !isNaN(d.getTime()) && (now - d.getTime() <= THIRTY_DAYS_MS);
            });

          setHasRecentTreatments(hasRecentTreatment || hasRecentVaccination);
        };
        checkRecent();
      } catch (error) {
        console.error('Error loading related data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRelatedData();
  }, [animal.id, dataRefreshTrigger]);



  return (
    <div className="space-y-4 pb-6" onKeyDown={(e) => e.stopPropagation()}>
      {/* Banner de imágenes con carrusel - LO PRIMERO - se oculta si no hay imágenes */}
      <div className="w-full rounded-xl overflow-hidden shadow-lg -mt-4">
        <AnimalImageBanner
          animalId={animal.id}
          height="clamp(200px, 40vh, 500px)"
          showControls={true}
          autoPlayInterval={5000}
          hideWhenEmpty={true}
          objectFit="contain"
          refreshTrigger={refreshTrigger}
        />
      </div>

      {/* Header con título y menú de acciones - DEBAJO DEL CARRUSEL */}
      <div className="flex items-start justify-between gap-4 bg-gradient-to-br from-accent/30 to-accent/10 rounded-xl p-4 shadow-md border border-border/50">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground truncate">
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
        {/* Menú de acciones (tres puntos) - visible en PC y móvil */}
        <div className="flex-shrink-0">
          <AnimalActionsMenu
            animal={animal as AnimalResponse}
            currentUserId={currentUserId}
            onOpenHistory={onOpenHistory}
            onOpenAncestorsTree={onOpenAncestorsTree}
            onOpenDescendantsTree={onOpenDescendantsTree}
            onRefresh={() => setDataRefreshTrigger(prev => prev + 1)}
          />
        </div>
      </div>

      {/* Información del animal - En el centro */}
      <div className="space-y-6">
        {/* Grid responsive: 1 columna en móvil, 2 columnas en pantallas grandes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Información Básica */}
          <div className="bg-gradient-to-br from-accent/50 to-accent/20 rounded-xl p-5 shadow-lg border border-border/50">
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground/80 mb-4">
              Información Básica
            </h3>
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
          </div>

          {/* Genealogía - Mini cards con carrusel de imágenes */}
          <div className="bg-gradient-to-br from-accent/50 to-accent/20 rounded-xl p-5 shadow-lg border border-border/50">
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground/80 mb-4">
              Genealogía
            </h3>
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
          </div>
        </div>

        {/* Notas - ancho completo */}
        {animal.notes && (
          <div className="bg-gradient-to-br from-accent/50 to-accent/20 rounded-xl p-5 shadow-lg border border-border/50">
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground/80 mb-3">
              Notas
            </h3>
            <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
              {animal.notes}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Mejoras Genéticas - Verde */}
          {!loading && geneticImprovements.length > 0 && (
            <RelatedDataSection
              title="Mejoras Genéticas"
              icon={<TrendingUp className="h-5 w-5" />}
              data={geneticImprovements}
              colorClass="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-emerald-900/70 dark:to-emerald-950/60 border-green-200 dark:border-emerald-700"
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
              onEdit={(item) => openEditModal('genetic_improvement', item)}
              onDelete={async (item) => {
                if (!confirm('¿Está seguro de eliminar esta mejora genética?')) return;
                const recordId = resolveRecordId(item);
                if (recordId === null) {
                  showToast('No se pudo determinar el ID del registro', 'error');
                  return;
                }
                setDeletingItemId(recordId);
                try {
                  await geneticImprovementsService.deleteGeneticImprovement(recordId as any);
                  // Limpiar cachés
                  geneticImprovementsService.clearCache();
                  if (animal?.id) clearAnimalDependencyCache(animal.id);

                  showToast('Mejora genética eliminada correctamente', 'success');
                  setDataRefreshTrigger(prev => prev + 1);
                } catch (error: any) {
                  const errorMessage = error.message || error.response?.data?.message || 'Error desconocido';
                  // Verificar si es 404
                  if (error.status === 404 || error.response?.status === 404 || String(errorMessage).toLowerCase().includes('no encontrado')) {
                    showToast('El registro ya eliminado', 'info');
                    if (animal?.id) clearAnimalDependencyCache(animal.id);
                    setDataRefreshTrigger(prev => prev + 1);
                  } else {
                    showToast('Error al eliminar: ' + errorMessage, 'error');
                  }
                } finally {
                  setDeletingItemId(null);
                }
              }}
            />
          )}

          {/* Enfermedades - Rojo */}
          {!loading && diseases.length > 0 && (
            <RelatedDataSection
              title="Enfermedades"
              icon={<Activity className="h-5 w-5" />}
              data={diseases}
              colorClass="bg-gradient-to-br from-red-50 to-rose-50 dark:from-rose-900/70 dark:to-rose-950/60 border-red-200 dark:border-rose-700"
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
              onEdit={(item) => openEditModal('animal_disease', item)}
              onDelete={async (item) => {
                if (!confirm('¿Está seguro de eliminar este registro de enfermedad?')) return;
                const recordId = resolveRecordId(item);
                if (recordId === null) {
                  showToast('No se pudo determinar el ID del registro', 'error');
                  return;
                }
                setDeletingItemId(recordId);
                try {
                  await animalDiseasesService.deleteAnimalDisease(recordId as any);
                  // Limpiar cachés
                  animalDiseasesService.clearCache();
                  if (animal?.id) clearAnimalDependencyCache(animal.id);

                  showToast('Registro de enfermedad eliminado correctamente', 'success');
                  setDataRefreshTrigger(prev => prev + 1);
                } catch (error: any) {
                  const errorMessage = error.message || error.response?.data?.message || 'Error desconocido';
                  if (error.status === 404 || error.response?.status === 404 || String(errorMessage).toLowerCase().includes('no encontrado')) {
                    showToast('El registro ya eliminado', 'info');
                    if (animal?.id) clearAnimalDependencyCache(animal.id);
                    setDataRefreshTrigger(prev => prev + 1);
                  } else {
                    showToast('Error al eliminar: ' + errorMessage, 'error');
                  }
                } finally {
                  setDeletingItemId(null);
                }
              }}
            />
          )}

          {/* Campos Asignados - Amarillo */}
          {!loading && fields.length > 0 && (
            <RelatedDataSection
              title="Campos Asignados"
              icon={<MapPin className="h-5 w-5" />}
              data={fields}
              colorClass="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-amber-900/70 dark:to-amber-950/60 border-yellow-200 dark:border-amber-700"
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
              onEdit={(item) => openEditModal('animal_field', item)}
              onDelete={async (item) => {
                if (!confirm('¿Está seguro de eliminar esta asignación de campo?')) return;
                const recordId = resolveRecordId(item);
                if (recordId === null) {
                  showToast('No se pudo determinar el ID del registro', 'error');
                  return;
                }
                setDeletingItemId(recordId);
                try {
                  await animalFieldsService.deleteAnimalField(recordId as any);
                  // Limpiar cachés
                  animalFieldsService.clearCache();
                  if (animal?.id) clearAnimalDependencyCache(animal.id);

                  showToast('Asignación de campo eliminada correctamente', 'success');
                  setDataRefreshTrigger(prev => prev + 1);
                } catch (error: any) {
                  const errorMessage = error.message || error.response?.data?.message || 'Error desconocido';
                  if (error.status === 404 || error.response?.status === 404 || String(errorMessage).toLowerCase().includes('no encontrado')) {
                    showToast('El registro ya eliminado', 'info');
                    if (animal?.id) clearAnimalDependencyCache(animal.id);
                    setDataRefreshTrigger(prev => prev + 1);
                  } else {
                    showToast('Error al eliminar: ' + errorMessage, 'error');
                  }
                } finally {
                  setDeletingItemId(null);
                }
              }}
            />
          )}

          {/* Vacunaciones - Azul */}
          {!loading && vaccinations.length > 0 && (
            <RelatedDataSection
              title="Vacunaciones"
              icon={<Syringe className="h-5 w-5" />}
              data={vaccinations}
              colorClass="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-sky-900/70 dark:to-cyan-950/60 border-blue-200 dark:border-sky-700"
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
              onEdit={(item) => openEditModal('vaccination', item)}
              onDelete={async (item) => {
                if (!confirm('¿Está seguro de eliminar esta vacunación?')) return;
                const recordId = resolveRecordId(item);
                if (recordId === null) {
                  showToast('No se pudo determinar el ID del registro', 'error');
                  return;
                }
                setDeletingItemId(recordId);
                try {
                  await vaccinationsService.deleteVaccination(recordId as any);
                  // Limpiar cachés
                  vaccinationsService.clearCache();
                  if (animal?.id) clearAnimalDependencyCache(animal.id);

                  showToast('Vacunación eliminada correctamente', 'success');
                  setDataRefreshTrigger(prev => prev + 1);
                } catch (error: any) {
                  const errorMessage = error.message || error.response?.data?.message || 'Error desconocido';
                  if (error.status === 404 || error.response?.status === 404 || String(errorMessage).toLowerCase().includes('no encontrado')) {
                    showToast('El registro ya eliminado', 'info');
                    if (animal?.id) clearAnimalDependencyCache(animal.id);
                    setDataRefreshTrigger(prev => prev + 1);
                  } else {
                    showToast('Error al eliminar: ' + errorMessage, 'error');
                  }
                } finally {
                  setDeletingItemId(null);
                }
              }}
            />
          )}

          {/* Tratamientos - Púrpura */}
          {!loading && treatments.length > 0 && (
            <RelatedDataSection
              title="Tratamientos"
              icon={<Pill className="h-5 w-5" />}
              data={treatments}
              colorClass="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-violet-900/70 dark:to-purple-950/60 border-purple-200 dark:border-violet-700"
              renderItem={(item) => (
                <div className="flex flex-col gap-1.5 w-full">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[13px] font-bold text-foreground leading-tight">
                      {item.diagnosis || item.description || `Tratamiento #${item.id}`}
                    </span>
                    <Badge variant="outline" className="text-[9px] h-4 bg-purple-500/10 text-purple-700 border-purple-200 shrink-0">
                      {formatDate(item.treatment_date)}
                    </Badge>
                  </div>
                  {(item.frequency || item.dosis) && (
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground italic">
                      {item.dosis && <span>Dosis: {item.dosis}</span>}
                      {item.dosis && item.frequency && <span>•</span>}
                      {item.frequency && <span>Freq: {item.frequency}</span>}
                    </div>
                  )}
                </div>
              )}
              onAdd={() => openCreateModal('treatment')}
              onViewAll={() => openListModal('treatment')}
              onEdit={(item) => openEditModal('treatment', item)}
              onView={(item) => openViewModal('treatment', item)}
              onItemClick={(item) => openViewModal('treatment', item)}
              onDelete={async (item) => {
                if (!confirm('¿Está seguro de eliminar este tratamiento?')) return;
                const recordId = resolveRecordId(item);
                if (recordId === null) {
                  showToast('No se pudo determinar el ID del registro', 'error');
                  return;
                }
                setDeletingItemId(recordId);
                try {
                  // Verificar dependencias antes de eliminar
                  const depCheck = await checkTreatmentDependencies(recordId as number);
                  if (depCheck.hasDependencies) {
                    // Mostrar mensaje detallado de por qué no se puede eliminar
                    const depSummary = depCheck.dependencies?.map(d => `${d.count} ${d.entity}`).join(', ') || 'registros asociados';
                    showToast(
                      `⚠️ No se puede eliminar este tratamiento porque tiene ${depSummary}. Elimina primero las dependencias.`,
                      'error'
                    );
                    console.warn('[AnimalModalContent] Treatment has dependencies:', depCheck);
                    setDeletingItemId(null);
                    return;
                  }

                  await treatmentsService.deleteTreatment(recordId as any);
                  // Limpiar cachés
                  treatmentsService.clearCache();
                  if (animal?.id) clearAnimalDependencyCache(animal.id);

                  showToast('Tratamiento eliminado correctamente', 'success');
                  setDataRefreshTrigger(prev => prev + 1);
                } catch (error: any) {
                  const errorMessage = error.message || error.response?.data?.message || 'Error desconocido';

                  // Detectar errores de integridad referencial del backend
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
                    showToast('El registro ya eliminado', 'info');
                    if (animal?.id) clearAnimalDependencyCache(animal.id);
                    setDataRefreshTrigger(prev => prev + 1);
                  } else {
                    showToast('Error al eliminar: ' + errorMessage, 'error');
                  }
                } finally {
                  setDeletingItemId(null);
                }
              }}
            />
          )}

          {/* Controles - Naranja */}
          {!loading && controls.length > 0 && (
            <RelatedDataSection
              title="Controles"
              icon={<ClipboardList className="h-5 w-5" />}
              data={controls}
              colorClass="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 border-orange-200 dark:border-orange-800"
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
              onEdit={(item) => openEditModal('control', item)}
              onDelete={async (item) => {
                if (!confirm('¿Está seguro de eliminar este control?')) return;
                const recordId = resolveRecordId(item);
                if (recordId === null) {
                  showToast('No se pudo determinar el ID del registro', 'error');
                  return;
                }
                setDeletingItemId(recordId);
                try {
                  await controlService.deleteControl(recordId as any);
                  // Limpiar cachés
                  controlService.clearCache();
                  if (animal?.id) clearAnimalDependencyCache(animal.id);

                  showToast('Control eliminado correctamente', 'success');
                  setDataRefreshTrigger(prev => prev + 1);
                } catch (error: any) {
                  const errorMessage = error.message || error.response?.data?.message || 'Error desconocido';
                  if (error.status === 404 || error.response?.status === 404 || String(errorMessage).toLowerCase().includes('no encontrado')) {
                    showToast('El registro ya eliminado', 'info');
                    if (animal?.id) clearAnimalDependencyCache(animal.id);
                    setDataRefreshTrigger(prev => prev + 1);
                  } else {
                    showToast('Error al eliminar: ' + errorMessage, 'error');
                  }
                } finally {
                  setDeletingItemId(null);
                }
              }}
            />
          )}
        </div>
      </div>

      {/* Galería e imágenes - Al final */}
      <div className="bg-gradient-to-br from-accent/50 to-accent/20 rounded-xl p-5 shadow-lg border border-border/50">
        <h3 className="text-sm font-bold uppercase tracking-wider text-foreground/80 mb-4">
          Galería de Imágenes
        </h3>

        {/* Componente unificado de gestión de imágenes */}
        <ImageManager
          animalId={animal.id}
          title="Imágenes del Animal"
          onGalleryUpdate={() => {
            preserveScroll();
            setRefreshTrigger(prev => prev + 1);
            setTimeout(restoreScroll, 0);
          }}
          showControls={true}
          refreshTrigger={refreshTrigger}
          compact={true}
        />
      </div>

      {/* Modal de detalle para VER */}
      {actionModalType && selectedItem && actionModalMode === 'view' && (
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
        />
      )}

      {/* AnimalActionsMenu controlado externamente para CREAR/EDITAR/LISTAR */}
      {actionModalType && (actionModalMode === 'create' || actionModalMode === 'list' || actionModalMode === 'edit') && (
        <AnimalActionsMenu
          animal={animal as AnimalResponse}
          currentUserId={currentUserId}
          externalOpenModal={actionModalType}
          externalModalMode={actionModalMode === 'edit' ? 'create' : actionModalMode}
          externalEditingItem={selectedItem}
          onRefresh={() => {
            setDataRefreshTrigger(prev => prev + 1);
          }}
          onModalClose={closeActionModal}
        />
      )}
    </div>
  );
}

function ItemDetailModal({
  type,
  item,
  options,
  onClose,
  onEdit
}: {
  type: string;
  item: any;
  options: {
    diseases: Record<number, string>;
    fields: Record<number, string>;
    vaccines: Record<number, string>;
    users: Record<number, string>;
  };
  onClose: () => void;
  onEdit: () => void;
}) {
  const getTitle = () => {
    switch (type) {
      case 'genetic_improvement': return 'Detalle de Mejora Genética';
      case 'animal_disease': return 'Detalle de Enfermedad';
      case 'animal_field': return 'Detalle de Asignación de Campo';
      case 'vaccination': return 'Detalle de Vacunación';
      case 'treatment': return 'Detalle de Tratamiento';
      case 'control': return 'Detalle de Control';
      default: return 'Detalle';
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const [year, month, day] = dateStr.split('T')[0].split('-');
      return `${day}/${month}/${year}`;
    } catch (e) {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('es-ES');
    } catch (e) {
      return dateStr;
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-background rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-border/50 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/40">
          <div>
            <h2 className="text-xl font-bold">{getTitle()}</h2>
            <p className="text-xs text-muted-foreground mt-1">Información detallada del registro</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          {/* Renderizar campos según el tipo */}
          {
            type === 'genetic_improvement' && (
              <>
                <InfoField label="ID Registro" value={item.id} />
                <InfoField label="Técnica / Tipo" value={item.improvement_type || item.genetic_event_technique || '-'} />
                <InfoField label="Fecha de Evento" value={formatDate(item.date)} />
                {item.description && <InfoField label="Descripción" value={item.description} fullWidth />}
                {item.details && <InfoField label="Detalles" value={item.details} fullWidth />}
                {item.genetic_material_used && <InfoField label="Material Genético" value={item.genetic_material_used} />}
                {item.results && <InfoField label="Resultados" value={item.results} fullWidth />}
                {item.instructor_id && <InfoField label="Instructor" value={options.users[item.instructor_id] || `ID: ${item.instructor_id}`} />}
                <InfoField label="Creado" value={formatDateTime(item.created_at)} />
                <InfoField label="Actualizado" value={formatDateTime(item.updated_at)} />
              </>
            )
          }

          {
            type === 'animal_disease' && (
              <>
                <InfoField label="Enfermedad" value={options.diseases[item.disease_id] || `ID: ${item.disease_id}`} fullWidth />
                <InfoField label="Fecha Diagnóstico" value={formatDate(item.diagnosis_date)} />
                <InfoField label="Estado Actual" value={item.status || 'Activo'} badge badgeVariant={item.status === 'Activo' ? 'destructive' : item.status === 'Curado' ? 'success' : 'default'} />
                <InfoField label="Instructor" value={options.users[item.instructor_id] || `ID: ${item.instructor_id}`} />
                {item.notes && <InfoField label="Notas y Observaciones" value={item.notes} fullWidth />}
                <InfoField label="Fecha de Registro" value={formatDateTime(item.created_at)} />
              </>
            )
          }

          {
            type === 'animal_field' && (
              <>
                <InfoField label="Potrero / Campo" value={options.fields[item.field_id] || `ID: ${item.field_id}`} fullWidth />
                <InfoField label="Fecha Asignación" value={formatDate(item.assignment_date)} />
                <InfoField label="Fecha Retiro" value={item.removal_date ? formatDate(item.removal_date) : 'Activo'} badge badgeVariant={item.removal_date ? 'secondary' : 'success'} />
                {item.notes && <InfoField label="Notas" value={item.notes} fullWidth />}
                <InfoField label="Fecha de Registro" value={formatDateTime(item.created_at)} />
              </>
            )
          }

          {
            type === 'vaccination' && (
              <>
                <InfoField label="Vacuna Aplicada" value={options.vaccines[item.vaccine_id] || `ID: ${item.vaccine_id}`} fullWidth />
                <InfoField label="Fecha Aplicación" value={formatDate(item.vaccination_date)} />
                <InfoField label="Instructor" value={options.users[item.instructor_id] || `ID: ${item.instructor_id}`} />
                {item.apprentice_id && <InfoField label="Aprendiz" value={options.users[item.apprentice_id] || `ID: ${item.apprentice_id}`} />}
                {item.batch_number && <InfoField label="Número de Lote" value={item.batch_number} />}
                <InfoField label="Fecha de Registro" value={formatDateTime(item.created_at)} />
              </>
            )
          }

          {
            type === 'treatment' && (
              <>
                <InfoField label="Diagnóstico" value={item.diagnosis || item.description || '-'} fullWidth />
                <InfoField label="Fecha Inicio" value={formatDate(item.treatment_date)} />
                <InfoField label="Veterinario" value={item.veterinarian || '-'} />
                <InfoField label="Dosis" value={item.dosis || '-'} />
                <InfoField label="Frecuencia" value={item.frequency || '-'} />
                {item.observations && <InfoField label="Observaciones" value={item.observations} fullWidth />}
                {item.notes && <InfoField label="Notas adicionales" value={item.notes} fullWidth />}
                <InfoField label="Fecha de Registro" value={formatDateTime(item.created_at)} />
              </>
            )
          }

          {
            type === 'control' && (
              <>
                <InfoField label="Fecha de Control" value={formatDate(item.checkup_date)} />
                <InfoField label="Estado de Salud" value={item.health_status || item.health_status || '-'} badge badgeVariant={item.health_status === 'Excelente' || item.health_status === 'Bueno' || item.health_status === 'Sano' ? 'success' : item.health_status === 'Regular' ? 'default' : 'destructive'} />
                {item.weight && <InfoField label="Peso Pesado" value={`${item.weight} kg`} />}
                {item.height && <InfoField label="Altura Medida" value={`${item.height} m`} />}
                {item.description && <InfoField label="Descripción de Control" value={item.description} fullWidth />}
                <InfoField label="Fecha de Registro" value={formatDateTime(item.created_at)} />
              </>
            )
          }
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border/40 bg-muted/5">
          <Button variant="outline" onClick={onClose} className="rounded-xl px-6">
            Cerrar
          </Button>
          <Button onClick={onEdit} className="rounded-xl px-6 bg-primary text-white shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all">
            <Edit className="h-4 w-4 mr-2" />
            Editar Registro
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function InfoField({
  label,
  value,
  fullWidth = false,
  badge = false,
  badgeVariant = 'default'
}: {
  label: string;
  value: any;
  fullWidth?: boolean;
  badge?: boolean;
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'success' | 'outline';
}) {
  const displayValue = value !== null && value !== undefined ? String(value) : '-';

  return (
    <div className={`space-y-1.5 ${fullWidth ? 'col-span-full' : ''}`}>
      <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      {badge ? (
        <Badge variant={badgeVariant as any} className={badgeVariant === 'success' ? 'bg-green-600 text-white' : ''}>
          {displayValue}
        </Badge>
      ) : (
        <div className={`text-sm ${fullWidth ? 'whitespace-pre-wrap' : ''}`}>
          {displayValue}
        </div>
      )}
    </div>
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
  colorClass,
  onAdd,
  onViewAll,
  onView,
  onEdit,
  onDelete,
  onItemClick
}: {
  title: string;
  icon: React.ReactNode;
  data: T[];
  renderItem: (item: T) => React.ReactNode;
  colorClass?: string;
  onAdd?: () => void;
  onViewAll?: () => void;
  onView?: (item: T) => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  onItemClick?: (item: T) => void;
}) {
  return (
    <div className={`rounded-xl p-5 shadow-lg border-2 ${colorClass || 'bg-gradient-to-br from-accent/50 to-accent/20 border-border/50'}`}>
      {/* Header con título y botones de acción */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="text-foreground">{icon}</div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground/90">
            {title}
          </h3>
          <Badge variant="secondary" className="text-xs">
            {data.length}
          </Badge>
        </div>

        {/* Botones de acción */}
        <div className="flex items-center gap-1">
          {onAdd && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onAdd}
              className="h-7 w-7 p-0 hover:bg-foreground/10"
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
              className="h-7 w-7 p-0 hover:bg-foreground/10"
              title="Ver todos"
            >
              <List className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Lista de elementos */}
      {data.length > 0 ? (
        <div className="space-y-3">
          {data.slice(0, 5).map((item: any, index) => (
            <div
              key={item.id || index}
              className={`bg-card/50 backdrop-blur-sm rounded-lg p-3 border border-border/30 hover:border-foreground/30 transition-colors group ${onItemClick ? 'cursor-pointer hover:bg-card/80' : ''}`}
              onClick={onItemClick ? (e) => { e.stopPropagation(); onItemClick(item); } : undefined}
              {...(onItemClick && { role: 'button', tabIndex: 0, 'aria-label': 'Ver detalle del registro' })}
              onKeyDown={onItemClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onItemClick(item); } } : undefined}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  {renderItem(item)}
                </div>

                {/* Botones de acción por item */}
                {(onView || onEdit || onDelete) && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onView && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          onView(item);
                        }}
                        className="h-6 w-6 p-0 hover:bg-green-500/20 hover:text-green-600"
                        title="Ver detalle"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                    )}
                    {onEdit && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          onEdit(item);
                        }}
                        className="h-6 w-6 p-0 hover:bg-blue-500/20 hover:text-blue-600"
                        title="Editar"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          console.log('[RelatedDataSection Delete] Clicked, item:', item);
                          onDelete(item);
                        }}
                        className="h-6 w-6 p-0 hover:bg-red-500/20 hover:text-red-600"
                        title="Eliminar"
                      >
                        <Trash2 className="h-3 w-3" />
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
                variant="outline"
                onClick={onViewAll}
                className="text-xs"
              >
                Ver todos ({data.length})
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No hay registros
        </div>
      )}
    </div>
  );
}
