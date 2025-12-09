import React, { useState, useCallback, useEffect } from 'react';
import { X, Activity, Syringe, MapPin, Pill, ClipboardList, TrendingUp, Plus, List, Eye, Edit, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AnimalResponse } from '@/types/swaggerTypes';
import { ImageManager } from '@/components/common/ImageManager';
import { AnimalImageBanner } from './AnimalImageBanner';
import { AnimalActionsMenu } from '@/components/dashboard/AnimalActionsMenu';
import { ParentMiniCard } from './ParentMiniCard';
import { geneticImprovementsService } from '@/services/geneticImprovementsService';
import { animalDiseasesService } from '@/services/animalDiseasesService';
import { animalFieldsService } from '@/services/animalFieldsService';
import { vaccinationsService } from '@/services/vaccinationsService';
import { treatmentsService } from '@/services/treatmentsService';
import { controlService } from '@/services/controlService';
import analyticsService from '@/services/analyticsService';
import { resolveRecordId } from '@/utils/recordIdUtils';

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
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const savedScrollTopRef = React.useRef(0);

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
          const filtered = Array.isArray(allData) ? allData.filter((item: any) => item.animal_id === animal.id) : [];
          console.log('[AnimalModalContent] Genetic Improvements for animal', animal.id, ':', filtered.length, 'items');
          setGeneticImprovements(filtered);
        }
        if (diseasesData.status === 'fulfilled') {
          const allData = diseasesData.value.data || diseasesData.value || [];
          const filtered = Array.isArray(allData) ? allData.filter((item: any) => item.animal_id === animal.id) : [];
          console.log('[AnimalModalContent] Diseases for animal', animal.id, ':', filtered.length, 'items');
          setDiseases(filtered);
        }
        if (fieldsData.status === 'fulfilled') {
          const allData = fieldsData.value.data || fieldsData.value || [];
          const filtered = Array.isArray(allData) ? allData.filter((item: any) => item.animal_id === animal.id) : [];
          console.log('[AnimalModalContent] Fields for animal', animal.id, ':', filtered.length, 'items');
          console.log('[AnimalModalContent] All fields data:', allData);
          console.log('[AnimalModalContent] Filtered fields:', filtered);
          setFields(filtered);
        }
        if (vaccinationsData.status === 'fulfilled') {
          const allData = vaccinationsData.value.data || vaccinationsData.value || [];
          const filtered = Array.isArray(allData) ? allData.filter((item: any) => item.animal_id === animal.id) : [];
          console.log('[AnimalModalContent] Vaccinations for animal', animal.id, ':', filtered.length, 'items');
          setVaccinations(filtered);
        }
        if (treatmentsData.status === 'fulfilled') {
          const allData = treatmentsData.value.data || treatmentsData.value || [];
          const filtered = Array.isArray(allData) ? allData.filter((item: any) => item.animal_id === animal.id) : [];
          console.log('[AnimalModalContent] Treatments for animal', animal.id, ':', filtered.length, 'items');
          setTreatments(filtered);
        }
        if (controlsData.status === 'fulfilled') {
          const allData = controlsData.value.data || controlsData.value || [];
          const filtered = Array.isArray(allData) ? allData.filter((item: any) => item.animal_id === animal.id) : [];
          console.log('[AnimalModalContent] Controls for animal', animal.id, ':', filtered.length, 'items');
          setControls(filtered);
        }
      } catch (error) {
        console.error('Error loading related data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRelatedData();
  }, [animal.id, dataRefreshTrigger]);

  useEffect(() => {
    const checkRecentTreatments = async () => {
      try {
        const history = await analyticsService
          .getAnimalMedicalHistory(Number(animal.id))
          .catch(() => null);
        if (!history) {
          setHasRecentTreatments(false);
          return;
        }
        const treatmentsList = (history as any).treatments || [];
        const now = new Date().getTime();
        const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
        const hasRecent = treatmentsList.some((t: any) => {
          const dateStr = t.start_date || t.date || t.created_at;
          if (!dateStr) return false;
          const d = new Date(dateStr);
          if (Number.isNaN(d.getTime())) return false;
          return now - d.getTime() <= THIRTY_DAYS_MS;
        });
        setHasRecentTreatments(hasRecent);
      } catch {
        setHasRecentTreatments(false);
      }
    };

    checkRecentTreatments();
  }, [animal.id]);

  return (
    <div className="space-y-6">
      {/* Banner de imágenes con carrusel - LO PRIMERO - se oculta si no hay imágenes */}
      <div className="w-full rounded-xl overflow-hidden shadow-lg -mt-4">
        <AnimalImageBanner
          animalId={animal.id}
          height="clamp(280px, 55vh, 640px)"
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
        <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6">
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
                  className={`text-xs font-semibold shadow-sm ${
                    gender === 'Macho' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
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
                  className={`text-xs font-semibold shadow-sm ${
                    status === 'Sano' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400' :
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

        {/* Mejoras Genéticas - Verde */}
        {!loading && (
          <RelatedDataSection
            title="Mejoras Genéticas"
            icon={<TrendingUp className="h-5 w-5" />}
            data={geneticImprovements}
            colorClass="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-emerald-900/70 dark:to-emerald-950/60 border-green-200 dark:border-emerald-700"
            renderItem={(item) => (
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground/90">{item.improvement_type || item.genetic_event_technique || item.genetic_event_techique || '-'}</span>
                  <span className="text-xs text-muted-foreground">{new Date(item.date).toLocaleDateString('es-ES')}</span>
                </div>
                {(item.description || item.details) && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{item.description || item.details}</p>
                )}
              </div>
            )}
            onAdd={() => openCreateModal('genetic_improvement')}
            onViewAll={() => openListModal('genetic_improvement')}
            onView={(item) => openViewModal('genetic_improvement', item)}
            onEdit={(item) => openEditModal('genetic_improvement', item)}
            onDelete={async (item) => {
              if (!confirm('¿Está seguro de eliminar esta mejora genética?')) return;
              try {
                const recordId = resolveRecordId(item);
                if (recordId === null) throw new Error('No se pudo determinar el ID del registro');
                await geneticImprovementsService.deleteGeneticImprovement(recordId as any);
                setDataRefreshTrigger(prev => prev + 1);
              } catch (error: any) {
                alert('Error al eliminar: ' + (error?.response?.data?.message || error.message));
              }
            }}
          />
        )}

        {/* Enfermedades - Rojo */}
        {!loading && (
          <RelatedDataSection
            title="Enfermedades"
            icon={<Activity className="h-5 w-5" />}
            data={diseases}
            colorClass="bg-gradient-to-br from-red-50 to-rose-50 dark:from-rose-900/70 dark:to-rose-950/60 border-red-200 dark:border-rose-700"
            renderItem={(item) => (
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-foreground/90">Enfermedad ID: {item.disease_id}</span>
                  <span className="text-xs text-muted-foreground">{new Date(item.diagnosis_date).toLocaleDateString('es-ES')}</span>
                </div>
                <Badge variant={item.status === 'Activo' ? 'destructive' : 'default'} className={item.status === 'Curado' ? 'bg-green-600 text-white' : ''}>
                  {item.status}
                </Badge>
              </div>
            )}
            onAdd={() => openCreateModal('animal_disease')}
            onViewAll={() => openListModal('animal_disease')}
            onView={(item) => openViewModal('animal_disease', item)}
            onEdit={(item) => openEditModal('animal_disease', item)}
            onDelete={async (item) => {
              if (!confirm('¿Está seguro de eliminar este registro de enfermedad?')) return;
              try {
                const recordId = resolveRecordId(item);
                if (recordId === null) throw new Error('No se pudo determinar el ID del registro');
                await animalDiseasesService.deleteAnimalDisease(recordId as any);
                setDataRefreshTrigger(prev => prev + 1);
              } catch (error: any) {
                alert('Error al eliminar: ' + (error?.response?.data?.message || error.message));
              }
            }}
          />
        )}

        {/* Campos Asignados - Amarillo */}
        {!loading && (
          <RelatedDataSection
            title="Campos Asignados"
            icon={<MapPin className="h-5 w-5" />}
            data={fields}
            colorClass="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-amber-900/70 dark:to-amber-950/60 border-yellow-200 dark:border-amber-700"
            renderItem={(item) => (
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-foreground/90">Campo ID: {item.field_id}</span>
                  <span className="text-xs text-muted-foreground">Asignado: {new Date(item.assignment_date).toLocaleDateString('es-ES')}</span>
                  {item.removal_date && (
                    <span className="text-xs text-muted-foreground">Retirado: {new Date(item.removal_date).toLocaleDateString('es-ES')}</span>
                  )}
                </div>
                <Badge variant={item.removal_date ? 'secondary' : 'default'} className={!item.removal_date ? 'bg-green-600 text-white' : ''}>
                  {item.removal_date ? 'Retirado' : 'Actualmente asignado'}
                </Badge>
              </div>
            )}
            onAdd={() => openCreateModal('animal_field')}
            onViewAll={() => openListModal('animal_field')}
            onView={(item) => openViewModal('animal_field', item)}
            onEdit={(item) => openEditModal('animal_field', item)}
            onDelete={async (item) => {
              if (!confirm('¿Está seguro de eliminar esta asignación de campo?')) return;
              try {
                const recordId = resolveRecordId(item);
                if (recordId === null) throw new Error('No se pudo determinar el ID del registro');
                await animalFieldsService.deleteAnimalField(recordId as any);
                setDataRefreshTrigger(prev => prev + 1);
              } catch (error: any) {
                alert('Error al eliminar: ' + (error?.response?.data?.message || error.message));
              }
            }}
          />
        )}

        {/* Vacunaciones - Azul */}
        {!loading && (
          <RelatedDataSection
            title="Vacunaciones"
            icon={<Syringe className="h-5 w-5" />}
            data={vaccinations}
            colorClass="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-sky-900/70 dark:to-cyan-950/60 border-blue-200 dark:border-sky-700"
            renderItem={(item) => (
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground/90">Vacuna ID: {item.vaccine_id}</span>
                  <span className="text-xs text-muted-foreground">{new Date(item.vaccination_date).toLocaleDateString('es-ES')}</span>
                </div>
                {item.next_dose_date && (
                  <span className="text-xs text-muted-foreground">Próxima dosis: {new Date(item.next_dose_date).toLocaleDateString('es-ES')}</span>
                )}
              </div>
            )}
            onAdd={() => openCreateModal('vaccination')}
            onViewAll={() => openListModal('vaccination')}
            onView={(item) => openViewModal('vaccination', item)}
            onEdit={(item) => openEditModal('vaccination', item)}
            onDelete={async (item) => {
              if (!confirm('¿Está seguro de eliminar esta vacunación?')) return;
              try {
                const recordId = resolveRecordId(item);
                if (recordId === null) throw new Error('No se pudo determinar el ID del registro');
                await vaccinationsService.deleteVaccination(recordId as any);
                setDataRefreshTrigger(prev => prev + 1);
              } catch (error: any) {
                alert('Error al eliminar: ' + (error?.response?.data?.message || error.message));
              }
            }}
          />
        )}

        {/* Tratamientos - Púrpura */}
        {!loading && (
          <RelatedDataSection
            title="Tratamientos"
            icon={<Pill className="h-5 w-5" />}
            data={treatments}
            colorClass="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-violet-900/70 dark:to-purple-950/60 border-purple-200 dark:border-violet-700"
            renderItem={(item) => (
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground/90">{item.diagnosis || item.description || `Tratamiento ${item.id}`}</span>
                  <span className="text-xs text-muted-foreground">{item.treatment_date ? new Date(item.treatment_date).toLocaleDateString('es-ES') : '-'}</span>
                </div>
                {item.frequency && (
                  <span className="text-xs text-muted-foreground">Frecuencia: {item.frequency}</span>
                )}
              </div>
            )}
            onAdd={() => openCreateModal('treatment')}
            onViewAll={() => openListModal('treatment')}
            onEdit={(item) => openEditModal('treatment', item)}
            onView={(item) => openViewModal('treatment', item)}
            onDelete={async (item) => {
              if (!confirm('¿Está seguro de eliminar este tratamiento?')) return;
              try {
                const recordId = resolveRecordId(item);
                if (recordId === null) throw new Error('No se pudo determinar el ID del registro');
                await treatmentsService.deleteTreatment(recordId as any);
                setDataRefreshTrigger(prev => prev + 1);
              } catch (error: any) {
                alert('Error al eliminar: ' + (error?.response?.data?.message || error.message));
              }
            }}
          />
        )}

        {/* Controles - Naranja */}
        {!loading && (
          <RelatedDataSection
            title="Controles"
            icon={<ClipboardList className="h-5 w-5" />}
            data={controls}
            colorClass="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 border-orange-200 dark:border-orange-800"
            renderItem={(item) => (
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-foreground/90">{item.health_status || item.healt_status || 'Control'}</span>
                  <span className="text-xs text-muted-foreground">{item.checkup_date ? new Date(item.checkup_date).toLocaleDateString('es-ES') : '-'}</span>
                </div>
                <div className="flex flex-col gap-0.5 items-end">
                  {item.weight && (
                    <span className="text-xs font-semibold text-foreground/80">{item.weight} kg</span>
                  )}
                  {item.height && (
                    <span className="text-xs text-muted-foreground">{item.height} m</span>
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
              try {
                const recordId = resolveRecordId(item);
                if (recordId === null) throw new Error('No se pudo determinar el ID del registro');
                await controlService.deleteControl(recordId as any);
                setDataRefreshTrigger(prev => prev + 1);
              } catch (error: any) {
                alert('Error al eliminar: ' + (error?.response?.data?.message || error.message));
              }
            }}
          />
        )}
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
          onClose={closeActionModal}
          onEdit={() => {
            setActionModalMode('edit');
          }}
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
  onClose,
  onEdit
}: {
  type: string;
  item: any;
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

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-background rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold">{getTitle()}</h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Renderizar campos según el tipo */}
          {type === 'genetic_improvement' && (
            <>
              <InfoField label="ID" value={item.id} />
              <InfoField label="Tipo de Mejora" value={item.improvement_type || item.genetic_event_technique || '-'} />
              <InfoField label="Fecha" value={item.date ? new Date(item.date).toLocaleDateString('es-ES') : '-'} />
              {item.description && <InfoField label="Descripción" value={item.description} fullWidth />}
              {item.details && <InfoField label="Detalles" value={item.details} fullWidth />}
              {item.genetic_material_used && <InfoField label="Material Genético" value={item.genetic_material_used} />}
              {item.expected_outcome && <InfoField label="Resultado Esperado" value={item.expected_outcome} fullWidth />}
              {item.actual_outcome && <InfoField label="Resultado Actual" value={item.actual_outcome} fullWidth />}
              {item.success_rate !== undefined && <InfoField label="Tasa de Éxito" value={`${item.success_rate}%`} />}
              {item.cost !== undefined && <InfoField label="Costo" value={`$${item.cost.toLocaleString()}`} />}
              {item.instructor_id && <InfoField label="ID Instructor" value={item.instructor_id} />}
              {item.created_at && <InfoField label="Creado" value={new Date(item.created_at).toLocaleString('es-ES')} />}
              {item.updated_at && <InfoField label="Actualizado" value={new Date(item.updated_at).toLocaleString('es-ES')} />}
            </>
          )}

          {type === 'animal_disease' && (
            <>
              <InfoField label="ID Registro" value={item.id} />
              <InfoField label="ID Enfermedad" value={item.disease_id || '-'} />
              <InfoField label="Fecha de Diagnóstico" value={item.diagnosis_date ? new Date(item.diagnosis_date).toLocaleDateString('es-ES') : '-'} />
              <InfoField label="Estado" value={item.status || '-'} badge badgeVariant={item.status === 'Activo' ? 'destructive' : item.status === 'Curado' ? 'success' : 'default'} />
              {item.severity && <InfoField label="Severidad" value={item.severity} />}
              {item.treatment_status && <InfoField label="Estado del Tratamiento" value={item.treatment_status} />}
              {item.recovery_date && <InfoField label="Fecha de Recuperación" value={new Date(item.recovery_date).toLocaleDateString('es-ES')} />}
              {item.veterinarian && <InfoField label="Veterinario" value={item.veterinarian} />}
              {item.diagnosis_method && <InfoField label="Método de Diagnóstico" value={item.diagnosis_method} />}
              {item.notes && <InfoField label="Notas" value={item.notes} fullWidth />}
              {item.instructor_id && <InfoField label="ID Instructor" value={item.instructor_id} />}
              {item.created_at && <InfoField label="Creado" value={new Date(item.created_at).toLocaleString('es-ES')} />}
              {item.updated_at && <InfoField label="Actualizado" value={new Date(item.updated_at).toLocaleString('es-ES')} />}
            </>
          )}

          {type === 'animal_field' && (
            <>
              <InfoField label="ID Registro" value={item.id} />
              <InfoField label="ID Campo" value={item.field_id || '-'} />
              <InfoField label="Fecha de Asignación" value={item.assignment_date ? new Date(item.assignment_date).toLocaleDateString('es-ES') : '-'} />
              {item.removal_date && <InfoField label="Fecha de Retiro" value={new Date(item.removal_date).toLocaleDateString('es-ES')} />}
              <InfoField label="Estado" value={item.removal_date ? 'Retirado' : 'Actualmente asignado'} badge badgeVariant={item.removal_date ? 'secondary' : 'success'} />
              {item.purpose && <InfoField label="Propósito" value={item.purpose} />}
              {item.pasture_quality && <InfoField label="Calidad del Pasto" value={item.pasture_quality} />}
              {item.area_size && <InfoField label="Tamaño del Área" value={`${item.area_size} ha`} />}
              {item.removal_reason && <InfoField label="Razón de Retiro" value={item.removal_reason} fullWidth />}
              {item.notes && <InfoField label="Notas" value={item.notes} fullWidth />}
              {item.created_at && <InfoField label="Creado" value={new Date(item.created_at).toLocaleString('es-ES')} />}
              {item.updated_at && <InfoField label="Actualizado" value={new Date(item.updated_at).toLocaleString('es-ES')} />}
            </>
          )}

          {type === 'vaccination' && (
            <>
              <InfoField label="ID Registro" value={item.id} />
              <InfoField label="ID Vacuna" value={item.vaccine_id || '-'} />
              <InfoField label="Fecha de Vacunación" value={item.vaccination_date ? new Date(item.vaccination_date).toLocaleDateString('es-ES') : '-'} />
              {item.next_dose_date && <InfoField label="Próxima Dosis" value={new Date(item.next_dose_date).toLocaleDateString('es-ES')} />}
              {item.dose_number && <InfoField label="Número de Dosis" value={item.dose_number} />}
              {item.batch_number && <InfoField label="Lote" value={item.batch_number} />}
              {item.manufacturer && <InfoField label="Fabricante" value={item.manufacturer} />}
              {item.expiry_date && <InfoField label="Fecha de Vencimiento" value={new Date(item.expiry_date).toLocaleDateString('es-ES')} />}
              {item.administered_by && <InfoField label="Administrado por" value={item.administered_by} />}
              {item.site_of_injection && <InfoField label="Sitio de Inyección" value={item.site_of_injection} />}
              {item.route_of_administration && <InfoField label="Vía de Administración" value={item.route_of_administration} />}
              {item.adverse_reaction && <InfoField label="Reacción Adversa" value={item.adverse_reaction} fullWidth />}
              {item.observations && <InfoField label="Observaciones" value={item.observations} fullWidth />}
              {item.created_at && <InfoField label="Creado" value={new Date(item.created_at).toLocaleString('es-ES')} />}
              {item.updated_at && <InfoField label="Actualizado" value={new Date(item.updated_at).toLocaleString('es-ES')} />}
            </>
          )}

          {type === 'treatment' && (
            <>
              <InfoField label="ID Registro" value={item.id} />
              <InfoField label="Diagnóstico" value={item.diagnosis || '-'} fullWidth />
              <InfoField label="Fecha de Tratamiento" value={item.treatment_date ? new Date(item.treatment_date).toLocaleDateString('es-ES') : '-'} />
              {item.dosis && <InfoField label="Dosis" value={item.dosis} />}
              <InfoField label="Frecuencia" value={item.frequency || '-'} />
              {item.description && <InfoField label="Descripción" value={item.description} fullWidth />}
              {item.treatment_type && <InfoField label="Tipo de Tratamiento" value={item.treatment_type} />}
              {item.veterinarian && <InfoField label="Veterinario" value={item.veterinarian} />}
              {item.symptoms && <InfoField label="Síntomas" value={item.symptoms} fullWidth />}
              {item.treatment_plan && <InfoField label="Plan de Tratamiento" value={item.treatment_plan} fullWidth />}
              {item.follow_up_date && <InfoField label="Fecha de Seguimiento" value={new Date(item.follow_up_date).toLocaleDateString('es-ES')} />}
              {item.cost !== undefined && <InfoField label="Costo" value={`$${item.cost.toLocaleString()}`} />}
              {item.status && <InfoField label="Estado" value={item.status} badge badgeVariant={item.status === 'Completado' ? 'success' : 'default'} />}
              {item.end_date && <InfoField label="Fecha de Finalización" value={new Date(item.end_date).toLocaleDateString('es-ES')} />}
              {item.observations && <InfoField label="Observaciones" value={item.observations} fullWidth />}
              {item.notes && <InfoField label="Notas" value={item.notes} fullWidth />}
              {item.created_at && <InfoField label="Creado" value={new Date(item.created_at).toLocaleString('es-ES')} />}
              {item.updated_at && <InfoField label="Actualizado" value={new Date(item.updated_at).toLocaleString('es-ES')} />}
            </>
          )}

          {type === 'control' && (
            <>
              <InfoField label="ID Registro" value={item.id} />
              <InfoField label="Fecha de Control" value={item.checkup_date ? new Date(item.checkup_date).toLocaleDateString('es-ES') : '-'} />
              <InfoField label="Estado de Salud" value={item.health_status || item.healt_status || '-'} badge badgeVariant={item.health_status === 'Excelente' || item.health_status === 'Bueno' ? 'success' : item.health_status === 'Regular' ? 'default' : 'destructive'} />
              {item.weight && <InfoField label="Peso" value={`${item.weight} kg`} />}
              {item.height && <InfoField label="Altura" value={`${item.height} m`} />}
              {item.body_condition_score && <InfoField label="Condición Corporal" value={item.body_condition_score} />}
              {item.temperature && <InfoField label="Temperatura" value={`${item.temperature} °C`} />}
              {item.heart_rate && <InfoField label="Frecuencia Cardíaca" value={`${item.heart_rate} lpm`} />}
              {item.respiratory_rate && <InfoField label="Frecuencia Respiratoria" value={`${item.respiratory_rate} rpm`} />}
              {item.blood_pressure && <InfoField label="Presión Arterial" value={item.blood_pressure} />}
              {item.physical_exam_findings && <InfoField label="Hallazgos del Examen Físico" value={item.physical_exam_findings} fullWidth />}
              {item.lab_results && <InfoField label="Resultados de Laboratorio" value={item.lab_results} fullWidth />}
              {item.recommendations && <InfoField label="Recomendaciones" value={item.recommendations} fullWidth />}
              {item.next_checkup_date && <InfoField label="Próximo Control" value={new Date(item.next_checkup_date).toLocaleDateString('es-ES')} />}
              {item.veterinarian && <InfoField label="Veterinario" value={item.veterinarian} />}
              {item.description && <InfoField label="Descripción" value={item.description} fullWidth />}
              {item.notes && <InfoField label="Notas" value={item.notes} fullWidth />}
              {item.created_at && <InfoField label="Creado" value={new Date(item.created_at).toLocaleString('es-ES')} />}
              {item.updated_at && <InfoField label="Actualizado" value={new Date(item.updated_at).toLocaleString('es-ES')} />}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-6 border-t">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          <Button onClick={onEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
        </div>
      </div>
    </div>
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
  onDelete
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
              className="bg-card/50 backdrop-blur-sm rounded-lg p-3 border border-border/30 hover:border-foreground/30 transition-colors group"
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
                        onClick={() => onView(item)}
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
                        onClick={() => onEdit(item)}
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
                        onClick={() => onDelete(item)}
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
