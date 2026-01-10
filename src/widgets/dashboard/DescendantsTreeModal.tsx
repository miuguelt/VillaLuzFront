import { GenericModal } from "@/shared/ui/common/GenericModal";
import { getAnimalLabel } from '@/entities/animal/lib/animalHelpers';
import React from 'react';
import { cn } from '@/shared/ui/cn.ts';
import { Baby } from 'lucide-react';
import type { AnimalTreeSummary, AnimalTreeEdgeExamples } from '@/entities/animal/model/tree.types';
import { animalsService } from '@/entities/animal/api/animal.service';
import { useAuth } from '@/features/auth/model/useAuth';
import { TreeHelpTooltip } from './TreeHelpTooltip';
import { AnimalMiniCard } from './AnimalMiniCard';
import { AnimalModalContent } from './animals/AnimalModalContent';
import { AnimalHistoryModal } from './AnimalHistoryModal';

interface AnimalNode {
  idAnimal?: number;
  animal_id?: number;
  id?: number;
  record?: string;
  name?: string;
  birth_date?: string;
  sex?: string;
  gender?: 'Macho' | 'Hembra';
  breed?: any;
}

interface DescendantsTreeModalProps {
  isOpen: boolean;
  onClose: () => void;
  animal: AnimalNode | null;
  levels: AnimalNode[][];
  counts?: { nodes: number; edges: number };
  onLoadMore?: () => void | Promise<void>;
  loadingMore?: boolean;
  summary?: AnimalTreeSummary;
  edgeExamples?: AnimalTreeEdgeExamples;
  dependencyInfo?: {
    has_children: boolean;
    children_as_father: number;
    children_as_mother: number;
    total_children: number;
  };
  treeError?: string | null;
  onNavigateToAnimal?: (animal: any) => void;
  onOpenAncestorsTreeForAnimal?: (animal: any) => void;
}

const DescendantsTreeModal = ({
  isOpen,
  onClose,
  animal,
  levels,
  counts,
  dependencyInfo,
  treeError,
  onNavigateToAnimal,
  onOpenAncestorsTreeForAnimal
}: DescendantsTreeModalProps) => {
  // Permitir que el modal se abra aunque falte el animal raíz.
  // Mostraremos estados vacíos/cargando dentro del contenido.

  const [depthShown, setDepthShown] = React.useState<number>(Math.max(1, (levels?.length ?? 1)));
  const { user } = useAuth();
  const [detailAnimal, setDetailAnimal] = React.useState<any | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = React.useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = React.useState(false);
  const [historyAnimal, setHistoryAnimal] = React.useState<any | null>(null);

  const displayLevels = React.useMemo(() => {
    return Array.isArray(levels) ? levels.slice(0, Math.max(1, depthShown)) : [];
  }, [levels, depthShown]);

  const getGenerationLabel = (levelIndex: number) => {
    switch (levelIndex) {
      case 0: return null; // Eliminado: no aporta información genética relevante
      case 1: return 'Hijos';
      case 2: return 'Nietos';
      case 3: return 'Bisnietos';
      case 4: return 'Tataranietos';
      case 5: return 'Trastataranietos';
      default: return `Generación ${levelIndex}`;
    }
  };

  const getId = (n: any): number | undefined => {
    const id = n?.idAnimal ?? n?.id ?? n?.animal_id;
    return id && Number.isInteger(Number(id)) && Number(id) > 0 ? Number(id) : undefined;
  };

  const getFatherId = (n: any): number | undefined => {
    const fId = n?.idFather ?? n?.father_id ?? n?.father?.id ?? n?.father?.idAnimal;
    return fId && Number.isInteger(Number(fId)) && Number(fId) > 0 ? Number(fId) : undefined;
  };

  const getMotherId = (n: any): number | undefined => {
    const mId = n?.idMother ?? n?.mother_id ?? n?.mother?.id ?? n?.mother?.idAnimal;
    return mId && Number.isInteger(Number(mId)) && Number(mId) > 0 ? Number(mId) : undefined;
  };

  const openAnimalDetail = async (clickedAnimal: AnimalNode) => {
    const id = getId(clickedAnimal);
    if (!id) return;
    setIsDetailModalOpen(true);
    setDetailAnimal(clickedAnimal);
    try {
      const full = await animalsService.getAnimalById(id);
      setDetailAnimal(full);
    } catch (error) {
      console.error('Error loading animal details:', error);
    }
  };

  const openAnimalDetailById = (id: number) => {
    void openAnimalDetail({ id });
  };

  const openHistory = (record: any) => {
    const payload = {
      idAnimal: Number(record?.id ?? record?.idAnimal ?? record?.animal_id ?? 0),
      record: record?.record || '',
      breed: record?.breed,
      birth_date: record?.birth_date,
      sex: record?.sex || record?.gender,
      status: record?.status,
    };
    setHistoryAnimal(payload);
    setIsHistoryOpen(true);
  };

  const getBreedLabel = (record: any) => {
    if (!record) return '-';
    return record?.breed?.name || record?.breed_name || (record?.breeds_id || record?.breed_id ? `ID ${record.breeds_id ?? record.breed_id}` : '-');
  };

  const getParentLabel = (parent: any, parentId?: number) => {
    if (parent?.record) return parent.record;
    if (parent?.name) return parent.name;
    return parentId ? `ID ${parentId}` : '-';
  };

  const detailFatherId = detailAnimal ? getFatherId(detailAnimal) : undefined;
  const detailMotherId = detailAnimal ? getMotherId(detailAnimal) : undefined;
  const detailBreedLabel = getBreedLabel(detailAnimal);
  const detailFatherLabel = getParentLabel(detailAnimal?.father, detailFatherId);
  const detailMotherLabel = getParentLabel(detailAnimal?.mother, detailMotherId);

  return (
    <GenericModal
      isOpen={isOpen}
      onOpenChange={(open) => { if (!open) onClose(); }}
      variant="compact"
      fullScreen
      allowFullScreenToggle
      title={
        <div className="flex items-center gap-2">
          <span>👶 Árbol de Descendientes</span>
          <TreeHelpTooltip type="descendants" />
        </div>
      }
      description={`${getAnimalLabel(animal) || 'Sin registro'} - Línea genealógica descendente`}
      size="7xl"
      enableBackdropBlur
    >
      <div className="relative w-full">
        {!animal && (
          <div className="mb-3 rounded-md bg-yellow-50 border border-yellow-200 text-yellow-800 px-3 py-2 text-sm">
            Cargando datos del animal raíz o no disponibles aún.
          </div>
        )}
        {treeError ? (
          <div className="text-center py-12">
            <Baby className="mx-auto h-16 w-16 text-red-500/30 mb-4" />
            <p className="text-red-600 text-lg font-medium">Error al cargar información de descendientes</p>
            <p className="text-muted-foreground/70 text-sm mt-2">{treeError}</p>
          </div>
        ) : levels.length === 0 || (counts && counts.edges === 0) ? (
          <div className="text-center py-12">
            <Baby className="mx-auto h-16 w-16 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground text-lg font-medium">No se encontró información de descendientes</p>
            <p className="text-muted-foreground/70 text-sm mt-2">
              {dependencyInfo && !dependencyInfo.has_children
                ? 'Este animal no tiene hijos registrados en la base de datos. Para mostrar descendientes, asegúrese de que otros animales tengan este animal configurado como padre (idFather) o madre (idMother).'
                : 'Este animal no tiene descendientes registrados'}
            </p>
            
            {/* Información de depuración */}
            {dependencyInfo && (
              <div className="mt-6 p-4 rounded-lg border bg-muted/30 border-border/50 max-w-md mx-auto">
                <h4 className="text-sm font-semibold text-foreground mb-2">Información de depuración:</h4>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>Hijos como padre: {dependencyInfo.children_as_father}</div>
                  <div>Hijos como madre: {dependencyInfo.children_as_mother}</div>
                  <div>Total de hijos: {dependencyInfo.total_children}</div>
                  <div>Total de nodos: {counts?.nodes || 0}</div>
                  <div>Total de relaciones: {counts?.edges || 0}</div>
                  <div>Profundidad alcanzada: {levels.length - 1}</div>
                </div>
              </div>
            )}
          </div>
        ) : (
         <div className="space-y-6">

           {/* Controles */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-gradient-to-r from-purple/5 via-purple/10 to-purple/5 border border-purple-200/30 shadow-sm">
              <div className="flex items-center gap-3 flex-wrap justify-center">
                <Baby className="h-5 w-5 text-purple-600" />
                <div className="flex flex-col items-center sm:items-start">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Descendientes:</span>
                  <span className="text-sm font-bold text-purple-700">
                    {levels.length > 1 ? `${levels.length - 1} generaciones` : 'Sin descendientes'}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Generaciones:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={1}
                    max={Math.max(1, levels.length)}
                    value={depthShown}
                    onChange={(e) => setDepthShown(Number(e.target.value))}
                    className="w-24 h-2 bg-purple-200/50 rounded-lg appearance-none cursor-pointer accent-purple-600"
                  />
                  <span className="text-sm font-bold text-purple-700 min-w-[2ch] px-2 py-1 bg-purple-100/50 rounded-md">{depthShown}</span>
                </div>
              </div>

              {/* Métricas removidas según solicitud */}
              <div className="hidden" />
            </div>

            {/* Resumen removido según solicitud */}
            <div className="hidden" />

            {/* Árbol de descendientes */}
            <div className="flex flex-col items-center space-y-4 px-2 py-3">
              {displayLevels.map((level, levelIndex) => (
                <div key={levelIndex} className="w-full flex flex-col items-center">
                  {/* Etiqueta de generación - solo para niveles > 0 */}
                  {getGenerationLabel(levelIndex) && (
                    <div className="relative mb-6">
                      <div className={cn(
                        "px-6 py-2 rounded-full text-sm font-bold shadow-lg backdrop-blur-sm",
                        "border-2 transition-all duration-300",
                        "bg-gradient-to-r from-card/80 to-muted/60 text-foreground border-border/50"
                      )}>
                        {getGenerationLabel(levelIndex)}
                      </div>
                    </div>
                  )}

                  {/* Conexión vertical */}
                  {levelIndex > 0 && (
                    <div className="w-1 h-8 bg-gradient-to-b from-primary/50 to-primary/20 rounded-full mb-4" />
                  )}

                  {/* Descendientes en esta generación */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-5xl">
                    {level.map((descendant) => {
                      const sex = (descendant as any).sex ?? (descendant as any).gender;

                      return (
                        <div
                          key={getId(descendant)}
                          id={`node-${getId(descendant)}`}
                          className="relative flex flex-col items-center"
                        >
                          {/* Conexión vertical individual */}
                          {levelIndex > 0 && (
                            <div className={cn(
                              "w-1 h-6 rounded-full mb-2",
                              sex === 'Macho' ? "bg-gradient-to-b from-blue-500/50 to-transparent" : "bg-gradient-to-b from-pink-500/50 to-transparent"
                            )} />
                          )}
                          {/* Tarjeta del animal */}
                          <AnimalMiniCard
                            animal={descendant}
                            levelIndex={levelIndex}
                            onClick={() => openAnimalDetail(descendant)}
                          />
                          {/* Conexión al siguiente nivel */}
                          {levelIndex < displayLevels.length - 1 && (
                            <div className="w-1 h-6 bg-gradient-to-b from-primary/20 to-transparent rounded-full mt-4" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Leyenda */}
            <div className="flex flex-wrap justify-center gap-4 p-4 rounded-xl bg-muted/30 border border-border/50">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary to-primary/80 border-2 border-primary/50" />
                <span className="text-xs font-medium text-foreground/80">Animal actual</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 border-2 border-blue-300/50" />
                <span className="text-xs font-medium text-foreground/80">Macho ♂</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-pink-100 to-pink-50 border-2 border-pink-300/50" />
                <span className="text-xs font-medium text-foreground/80">Hembra ♀</span>
              </div>
            </div>

            {/* Se removió la sección de ejemplos para dejar solo el resultado */}
          </div>
        )}
      </div>

      {/* Modal de detalle del animal seleccionado */}
      {detailAnimal && (
        <GenericModal
          isOpen={isDetailModalOpen}
          onOpenChange={setIsDetailModalOpen}
          title={`Detalle - ${getAnimalLabel(detailAnimal)}`}
          size="5xl"
          enableBackdropBlur
          enableNavigation={false}
        >
          <AnimalModalContent
            animal={detailAnimal as any}
            breedLabel={detailBreedLabel}
            fatherLabel={detailFatherLabel}
            motherLabel={detailMotherLabel}
            onFatherClick={detailFatherId ? () => openAnimalDetailById(detailFatherId) : undefined}
            onMotherClick={detailMotherId ? () => openAnimalDetailById(detailMotherId) : undefined}
            currentUserId={user?.id}
            onOpenHistory={() => openHistory(detailAnimal)}
            onOpenAncestorsTree={() => {
              if (!detailAnimal) return;
              onOpenAncestorsTreeForAnimal?.(detailAnimal);
              setIsDetailModalOpen(false);
            }}
            onOpenDescendantsTree={() => {
              if (!detailAnimal) return;
              onNavigateToAnimal?.(detailAnimal);
              setIsDetailModalOpen(false);
            }}
          />
        </GenericModal>
      )}

      {isHistoryOpen && historyAnimal && (
        <AnimalHistoryModal
          animal={historyAnimal}
          onClose={() => {
            setIsHistoryOpen(false);
            setHistoryAnimal(null);
          }}
        />
      )}
    </GenericModal>
  );
};

export default DescendantsTreeModal;





