import React, { useState, useCallback, useEffect } from 'react';
import { X, MoreVertical, Activity, Syringe, MapPin, Pill, ClipboardList, TrendingUp, Plus, List, Eye, Edit, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AnimalResponse } from '@/types/swaggerTypes';
import { AnimalImageBanner } from './AnimalImageBanner';
import { AnimalImageGallery } from './AnimalImageGallery';
import { AnimalImageUpload } from './AnimalImageUpload';
import { AnimalActionsMenu } from '@/components/dashboard/AnimalActionsMenu';
import { ParentMiniCard } from './ParentMiniCard';
import { geneticImprovementsService } from '@/services/geneticImprovementsService';
import { animalDiseasesService } from '@/services/animalDiseasesService';
import { animalFieldsService } from '@/services/animalFieldsService';
import { vaccinationsService } from '@/services/vaccinationsService';
import { treatmentsService } from '@/services/treatmentsService';
import { controlService } from '@/services/controlService';

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
  onOpenDescendantsTree
}: AnimalModalContentProps) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showUpload, setShowUpload] = useState(false);

  // Estados para datos relacionados
  const [geneticImprovements, setGeneticImprovements] = useState<any[]>([]);
  const [diseases, setDiseases] = useState<any[]>([]);
  const [fields, setFields] = useState<any[]>([]);
  const [vaccinations, setVaccinations] = useState<any[]>([]);
  const [treatments, setTreatments] = useState<any[]>([]);
  const [controls, setControls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataRefreshTrigger, setDataRefreshTrigger] = useState(0);

  const gender = animal.sex || animal.gender;
  const birthDate = animal.birth_date
    ? new Date(animal.birth_date).toLocaleDateString('es-ES')
    : '-';
  const ageMonths = animal.age_in_months ?? '-';
  const ageDays = animal.age_in_days ?? '-';
  const weight = animal.weight ?? '-';
  const status = animal.status || '-';
  const isAdult = animal.is_adult === true ? 'Sí' : animal.is_adult === false ? 'No' : '-';

  const handleUploadSuccess = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
    setShowUpload(false);
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
          geneticImprovementsService.getGeneticImprovementsPaginated({ animal_id: animal.id, limit: 1000 }),
          animalDiseasesService.getAnimalDiseasesPaginated({ animal_id: animal.id, limit: 1000 }),
          animalFieldsService.getAnimalFieldsPaginated({ animal_id: animal.id, limit: 1000 }),
          vaccinationsService.getVaccinationsPaginated({ animal_id: animal.id, limit: 1000 }),
          treatmentsService.getTreatmentsPaginated({ animal_id: animal.id, limit: 1000 }),
          controlService.getControlsPaginated({ animal_id: animal.id, limit: 1000 })
        ]);

        if (geneticData.status === 'fulfilled') setGeneticImprovements(geneticData.value.data || []);
        if (diseasesData.status === 'fulfilled') setDiseases(diseasesData.value.data || []);
        if (fieldsData.status === 'fulfilled') setFields(fieldsData.value.data || []);
        if (vaccinationsData.status === 'fulfilled') setVaccinations(vaccinationsData.value.data || []);
        if (treatmentsData.status === 'fulfilled') setTreatments(treatmentsData.value.data || []);
        if (controlsData.status === 'fulfilled') setControls(controlsData.value.data || []);
      } catch (error) {
        console.error('Error loading related data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRelatedData();
  }, [animal.id, dataRefreshTrigger]);

  return (
    <div className="space-y-6">
      {/* Banner de imágenes con carrusel - LO PRIMERO - se oculta si no hay imágenes */}
      <div className="w-full rounded-xl overflow-hidden shadow-lg -mt-4">
        <AnimalImageBanner
          animalId={animal.id}
          height="450px"
          showControls={true}
          autoPlayInterval={5000}
          hideWhenEmpty={true}
          objectFit="cover"
          refreshTrigger={refreshTrigger}
        />
      </div>

      {/* Header con título y menú de acciones - DEBAJO DEL CARRUSEL */}
      <div className="flex items-start justify-between gap-4 bg-gradient-to-br from-accent/30 to-accent/10 rounded-xl p-4 shadow-md border border-border/50">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground truncate">
            {animal.record || `Animal #${animal.id}`}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            ID: {animal.id} • {breedLabel}
          </p>
        </div>
        {/* Menú de acciones (tres puntos) - visible en PC y móvil */}
        <div className="flex-shrink-0">
          <AnimalActionsMenu
            animal={animal as AnimalResponse}
            currentUserId={currentUserId}
            onOpenHistory={onOpenHistory}
            onOpenAncestorsTree={onOpenAncestorsTree}
            onOpenDescendantsTree={onOpenDescendantsTree}
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
        {!loading && geneticImprovements.length > 0 && (
          <RelatedDataSection
            title="Mejoras Genéticas"
            icon={<TrendingUp className="h-5 w-5" />}
            data={geneticImprovements}
            colorClass="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-800"
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
            onAdd={() => {/* TODO: Abrir modal de crear mejora genética */}}
            onViewAll={() => {/* TODO: Abrir lista completa */}}
            onEdit={async (item) => {/* TODO: Editar */}}
            onDelete={async (item) => {
              if (confirm('¿Eliminar esta mejora genética?')) {
                await geneticImprovementsService.deleteGeneticImprovement(item.id);
                setDataRefreshTrigger(prev => prev + 1);
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
            colorClass="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30 border-red-200 dark:border-red-800"
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
            onAdd={() => {/* TODO */}}
            onViewAll={() => {/* TODO */}}
            onEdit={async (item) => {/* TODO */}}
            onDelete={async (item) => {
              if (confirm('¿Eliminar esta enfermedad?')) {
                await animalDiseasesService.deleteAnimalDisease(item.id);
                setDataRefreshTrigger(prev => prev + 1);
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
            colorClass="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30 border-yellow-200 dark:border-yellow-800"
            renderItem={(item) => (
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-foreground/90">Campo ID: {item.field_id}</span>
                  <span className="text-xs text-muted-foreground">{new Date(item.assignment_date).toLocaleDateString('es-ES')}</span>
                </div>
                {item.status && (
                  <Badge variant={item.status === 'Actualmente asignado' ? 'default' : 'secondary'}>
                    {item.status}
                  </Badge>
                )}
              </div>
            )}
            onAdd={() => {/* TODO */}}
            onViewAll={() => {/* TODO */}}
            onEdit={async (item) => {/* TODO */}}
            onDelete={async (item) => {
              if (confirm('¿Eliminar asignación de campo?')) {
                await animalFieldsService.deleteAnimalField(item.id);
                setDataRefreshTrigger(prev => prev + 1);
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
            colorClass="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-blue-200 dark:border-blue-800"
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
            onAdd={() => {/* TODO */}}
            onViewAll={() => {/* TODO */}}
            onEdit={async (item) => {/* TODO */}}
            onDelete={async (item) => {
              if (confirm('¿Eliminar vacunación?')) {
                await vaccinationsService.deleteVaccination(item.id);
                setDataRefreshTrigger(prev => prev + 1);
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
            colorClass="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/30 border-purple-200 dark:border-purple-800"
            renderItem={(item) => (
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground/90">{item.disease_description || `Tratamiento ${item.id}`}</span>
                  <span className="text-xs text-muted-foreground">{new Date(item.start_date).toLocaleDateString('es-ES')}</span>
                </div>
                {item.end_date && (
                  <span className="text-xs text-muted-foreground">Hasta: {new Date(item.end_date).toLocaleDateString('es-ES')}</span>
                )}
              </div>
            )}
            onAdd={() => {/* TODO */}}
            onViewAll={() => {/* TODO */}}
            onEdit={async (item) => {/* TODO */}}
            onDelete={async (item) => {
              if (confirm('¿Eliminar tratamiento?')) {
                await treatmentsService.deleteTreatment(item.id);
                setDataRefreshTrigger(prev => prev + 1);
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
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-foreground/90">{item.control_type || 'Control'}</span>
                  <span className="text-xs text-muted-foreground">{new Date(item.control_date).toLocaleDateString('es-ES')}</span>
                </div>
                {item.weight && (
                  <span className="text-xs font-semibold text-foreground/80">{item.weight} kg</span>
                )}
              </div>
            )}
            onAdd={() => {/* TODO */}}
            onViewAll={() => {/* TODO */}}
            onEdit={async (item) => {/* TODO */}}
            onDelete={async (item) => {
              if (confirm('¿Eliminar control?')) {
                await controlService.deleteControl(item.id);
                setDataRefreshTrigger(prev => prev + 1);
              }
            }}
          />
        )}
      </div>

      {/* Galería e imágenes - Al final */}
      <div className="bg-gradient-to-br from-accent/50 to-accent/20 rounded-xl p-5 shadow-lg border border-border/50">
        <h3 className="text-sm font-bold uppercase tracking-wider text-foreground/80 mb-4">
          Galería
        </h3>

        {/* Galería con controles de eliminación siempre habilitados */}
        <AnimalImageGallery
          animalId={animal.id}
          showControls={true}
          refreshTrigger={refreshTrigger}
          onGalleryUpdate={() => setRefreshTrigger(prev => prev + 1)}
        />

        {/* Botón para cargar imágenes - siempre disponible */}
        {!showUpload && (
          <div className="mt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowUpload(true)}
              className="w-full"
            >
              Cargar nuevas imágenes
            </Button>
          </div>
        )}

        {/* Sistema de carga de imágenes */}
        {showUpload && (
          <div className="mt-4 bg-card rounded-lg p-4 border shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground/80">
                Cargar imágenes
              </h4>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowUpload(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <AnimalImageUpload
              animalId={animal.id}
              onUploadSuccess={handleUploadSuccess}
              maxFiles={10}
            />
          </div>
        )}
      </div>
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
                {(onEdit || onDelete) && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
