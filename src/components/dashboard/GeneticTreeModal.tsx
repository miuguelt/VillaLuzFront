import { GenericModal } from "@/components/common/GenericModal";
import { getAnimalLabel } from '@/utils/animalHelpers';
import React from 'react';
import { cn } from '@/components/ui/cn.ts';
import { Users, Heart } from 'lucide-react';
import type { AnimalTreeSummary, AnimalTreeEdgeExamples } from '@/types/animalTreeTypes';
import { TreeHelpTooltip } from './TreeHelpTooltip';
import { AnimalMiniCard } from './AnimalMiniCard';
import { AnimalModalContent } from './animals/AnimalModalContent';

interface AnimalNode {
  id?: number;
  record?: string;
  name?: string;
  birth_date?: string;
  sex?: string;
  breed?: any;
  father_id?: number | null;
  mother_id?: number | null;
}

interface GeneticTreeModalProps {
  isOpen: boolean;
  onClose: () => void;
  animal: AnimalNode | null;
  levels: AnimalNode[][];
  counts?: { nodes: number; edges: number };
  onLoadMore?: () => void;
  loadingMore?: boolean;
  summary?: AnimalTreeSummary;
  edgeExamples?: AnimalTreeEdgeExamples;
  dependencyInfo?: {
    has_parents: boolean;
    father_id: number;
    mother_id: number;
  };
  treeError?: string | null;
}

interface CoupleGroup {
  father?: any;
  mother?: any;
  children?: number[];
}

const GeneticTreeModal = ({
  isOpen,
  onClose,
  animal,
  levels,
  counts,
  dependencyInfo,
  treeError
}: GeneticTreeModalProps) => {
  const [lineageMode, setLineageMode] = React.useState<'ambos' | 'paterna' | 'materna'>('ambos');
  const [depthShown, setDepthShown] = React.useState<number>(Math.max(1, (levels?.length ?? 1)));

  // Estado para modal de detalle
  const [selectedAnimal, setSelectedAnimal] = React.useState<AnimalNode | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = React.useState(false);

  // Sincronizar el slider con los niveles cuando llegan datos asíncronos
  React.useEffect(() => {
    const total = Array.isArray(levels) ? levels.length : 1;
    setDepthShown(Math.max(1, total));
  }, [levels]);

  // Función para abrir modal de detalle
  const handleAnimalClick = (clickedAnimal: AnimalNode) => {
    setSelectedAnimal(clickedAnimal);
    setIsDetailModalOpen(true);
  };

  const getId = (n: any): number | undefined => {
    const id = n?.id ?? n?.idAnimal;
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

  const displayLevels: any[][] = React.useMemo(() => {
    if (!animal || !levels) return [];
    const limited = Array.isArray(levels) ? levels.slice(0, Math.max(1, depthShown)) : [];

    // Ordenar cada nivel para que padre esté antes que madre
    const sorted = limited.map((level, idx) => {
      if (idx === 0 || level.length <= 1) return level;

      const fathers = level.filter((a: any) => {
        const sex = a?.sex ?? a?.gender;
        return sex === 'Macho';
      });
      const mothers = level.filter((a: any) => {
        const sex = a?.sex ?? a?.gender;
        return sex === 'Hembra';
      });
      const unknown = level.filter((a: any) => {
        const sex = a?.sex ?? a?.gender;
        return sex !== 'Macho' && sex !== 'Hembra';
      });

      return [...fathers, ...mothers, ...unknown];
    });

    if (lineageMode === 'ambos') return sorted;
    if (!sorted || sorted.length === 0) return [];

    const root = sorted[0]?.[0];
    if (!root) return sorted;

    const chain: any[] = [root];
    for (let li = 1; li < sorted.length; li++) {
      const prev = chain[li - 1];
      const expectedId = lineageMode === 'paterna' ? getFatherId(prev) : getMotherId(prev);
      if (!expectedId) break;
      const candidate = (sorted[li] || []).find((n: any) => getId(n) === expectedId);
      if (!candidate) break;
      chain.push(candidate);
    }
    const filtered: any[][] = [];
    for (let i = 0; i < chain.length; i++) filtered.push([chain[i]]);
    return filtered;
  }, [animal, levels, depthShown, lineageMode]);

  // Agrupar animales en parejas (padre-madre) por nivel
  const groupedLevels: CoupleGroup[][] = React.useMemo(() => {
    if (lineageMode !== 'ambos') return [];

    return displayLevels.map((level, levelIndex) => {
      if (levelIndex === 0) return [{ father: level[0] }]; // Animal raíz

      const couples: CoupleGroup[] = [];
      const processed = new Set<number>();

      // Obtener el nivel anterior para saber qué animales conectan
      const prevLevel = displayLevels[levelIndex - 1] || [];

      // Para cada animal del nivel anterior, encontrar su padre y madre en el nivel actual
      prevLevel.forEach((child: any) => {
        const fatherId = getFatherId(child);
        const motherId = getMotherId(child);
        const childId = getId(child);

        const father = level.find((a: any) => getId(a) === fatherId);
        const mother = level.find((a: any) => getId(a) === motherId);

        if (father || mother) {
          // Buscar si ya existe una pareja con este padre o madre
          const existingCouple = couples.find(c =>
            (father && c.father && getId(c.father) === getId(father)) ||
            (mother && c.mother && getId(c.mother) === getId(mother))
          );

          if (existingCouple) {
            // Agregar el hijo a la pareja existente
            if (childId) {
              if (!existingCouple.children) existingCouple.children = [];
              if (!existingCouple.children.includes(childId)) {
                existingCouple.children.push(childId);
              }
            }
            // Completar la pareja si falta padre o madre
            if (father && !existingCouple.father) existingCouple.father = father;
            if (mother && !existingCouple.mother) existingCouple.mother = mother;
          } else {
            // Crear nueva pareja
            couples.push({
              father,
              mother,
              children: childId ? [childId] : []
            });
          }

          if (father) processed.add(getId(father)!);
          if (mother) processed.add(getId(mother)!);
        }
      });

      // Agregar animales que no están en parejas
      level.forEach((a: any) => {
        const id = getId(a);
        if (id && !processed.has(id)) {
          const sex = a?.sex ?? a?.gender;
          couples.push({
            [sex === 'Macho' ? 'father' : sex === 'Hembra' ? 'mother' : 'father']: a
          });
        }
      });

      return couples;
    });
  }, [displayLevels, lineageMode]);

  const getGenerationLabel = (levelIndex: number) => {
    switch (levelIndex) {
      case 0: return null;
      case 1: return 'Padres';
      case 2: return 'Abuelos';
      case 3: return 'Bisabuelos';
      case 4: return 'Tatarabuelos';
      case 5: return 'Trastatarabuelos';
      default: return `Generación ${levelIndex}`;
    }
  };

  const getGenerationCount = (levelIndex: number) => {
    const expectedCount = Math.pow(2, levelIndex);
    return `(${expectedCount} esperados)`;
  };

  return (
    <GenericModal
      isOpen={isOpen}
      onOpenChange={(open) => { if (!open) onClose(); }}
      variant="compact"
      fullScreen
      allowFullScreenToggle
      title={
        <div className="flex items-center gap-2">
          <span>🌳 Árbol de Antepasados</span>
          <TreeHelpTooltip type="ancestors" />
        </div>
      }
      description={`${getAnimalLabel(animal) || 'Sin registro'} - Línea genealógica ascendente`}
      size="7xl"
      enableBackdropBlur
    >
      <div className="relative w-full">
        {treeError ? (
          <div className="text-center py-12">
            <Users className="mx-auto h-16 w-16 text-red-500/30 mb-4" />
            <p className="text-red-600 text-lg font-medium">Error al cargar información genealógica</p>
            <p className="text-muted-foreground/70 text-sm mt-2">{treeError}</p>
          </div>
        ) : levels.length === 0 || (counts && counts.edges === 0) ? (
          <div className="text-center py-12">
            <Users className="mx-auto h-16 w-16 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground text-lg font-medium">No se encontró información genealógica</p>
            <p className="text-muted-foreground/70 text-sm mt-2">
              {dependencyInfo && !dependencyInfo.has_parents
                ? 'Este animal no tiene padres registrados en la base de datos.'
                : 'Este animal no tiene antepasados registrados'}
            </p>

            {dependencyInfo && (
              <div className="mt-6 p-4 rounded-lg border bg-muted/30 border-border/50 max-w-md mx-auto">
                <h4 className="text-sm font-semibold text-foreground mb-2">Información de depuración:</h4>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>Padre registrado: {dependencyInfo.father_id ? `ID ${dependencyInfo.father_id}` : 'No'}</div>
                  <div>Madre registrada: {dependencyInfo.mother_id ? `ID ${dependencyInfo.mother_id}` : 'No'}</div>
                  <div>Total de nodos: {counts?.nodes || 0}</div>
                  <div>Total de relaciones: {counts?.edges || 0}</div>
                </div>
              </div>
            )}
          </div>
        ) : (
         <div className="space-y-6">
           {/* Controles */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border border-primary/20 shadow-sm">
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Filtrar línea:</span>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    onClick={() => setLineageMode('ambos')}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm",
                      lineageMode === 'ambos'
                        ? "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/30 ring-2 ring-primary/50"
                        : "bg-background/50 hover:bg-background border border-border/50 hover:shadow-md"
                    )}
                  >
                    👨‍👩‍👦 Completa
                  </button>
                  <button
                    onClick={() => setLineageMode('paterna')}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm",
                      lineageMode === 'paterna'
                        ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-600/30 ring-2 ring-blue-400/50"
                        : "bg-background/50 hover:bg-background border border-border/50 hover:shadow-md"
                    )}
                  >
                    ♂ Paterna
                  </button>
                  <button
                    onClick={() => setLineageMode('materna')}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm",
                      lineageMode === 'materna'
                        ? "bg-gradient-to-r from-pink-600 to-pink-500 text-white shadow-lg shadow-pink-600/30 ring-2 ring-pink-400/50"
                        : "bg-background/50 hover:bg-background border border-border/50 hover:shadow-md"
                    )}
                  >
                    ♀ Materna
                  </button>
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
                    className="w-24 h-2 bg-primary/20 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <span className="text-sm font-bold text-primary min-w-[2ch] px-2 py-1 bg-primary/10 rounded-md">{depthShown}</span>
                </div>
          </div>
        </div>

        {/* Árbol genealógico con agrupación por parejas */}
        <div className="flex flex-col items-center space-y-8 px-2 py-3">
          {lineageMode === 'ambos' && groupedLevels.length > 0 ? (
            // Vista con agrupación por parejas
            groupedLevels.map((couples, levelIndex) => (
              <div key={levelIndex} className="w-full flex flex-col items-center">
                {/* Etiqueta de generación */}
                {getGenerationLabel(levelIndex) && (
                  <div className="relative mb-6">
                    <div className={cn(
                      "px-6 py-2 rounded-full text-sm font-bold shadow-lg backdrop-blur-sm",
                      "border-2 transition-all duration-300",
                      "bg-gradient-to-r from-card/80 to-muted/60 text-foreground border-border/50"
                    )}>
                      <span>{getGenerationLabel(levelIndex)}</span>
                      <span className="ml-2 text-xs text-muted-foreground font-normal">
                        {getGenerationCount(levelIndex)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Conexión vertical desde nivel anterior */}
                {levelIndex > 0 && (
                  <div className="w-1 h-8 bg-gradient-to-b from-primary/50 to-primary/20 rounded-full mb-6" />
                )}

                {/* Parejas en este nivel */}
                <div className={cn(
                  "grid gap-8 w-full",
                  levelIndex === 0 ? "max-w-md" :
                  couples.length === 1 ? "max-w-xl grid-cols-1" :
                  couples.length === 2 ? "max-w-4xl grid-cols-1 sm:grid-cols-2" :
                  couples.length <= 4 ? "max-w-6xl grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" :
                  "max-w-7xl grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                )}>
                  {couples.map((couple, coupleIdx) => (
                    <div key={coupleIdx} className="flex flex-col items-center">
                      {/* Conexión desde nivel anterior */}
                      {levelIndex > 0 && (
                        <div className="w-1 h-6 bg-gradient-to-b from-primary/30 to-transparent rounded-full mb-3" />
                      )}

                      {/* Grupo de pareja */}
                      <div className={cn(
                        "relative p-4 rounded-2xl border-2 backdrop-blur-sm",
                        "transition-all duration-300 hover:shadow-xl",
                        "bg-gradient-to-br from-background/80 to-muted/40",
                        "border-border/30 hover:border-primary/30"
                      )}>
                        {/* Icono de corazón si es una pareja completa */}
                        {couple.father && couple.mother && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                            <div className="bg-pink-500 text-white rounded-full p-1.5 shadow-lg">
                              <Heart className="h-4 w-4 fill-current" />
                            </div>
                          </div>
                        )}

                        {/* Animales de la pareja */}
                        <div className={cn(
                          "flex gap-4",
                          couple.father && couple.mother ? "flex-row items-start justify-center" : "flex-col items-center"
                        )}>
                          {/* Padre */}
                          {couple.father && (
                            <div className="flex flex-col items-center">
                              <AnimalMiniCard
                                animal={couple.father}
                                role="Padre"
                                levelIndex={levelIndex}
                                onClick={() => handleAnimalClick(couple.father)}
                                className="mb-2"
                              />
                            </div>
                          )}

                          {/* Madre */}
                          {couple.mother && (
                            <div className="flex flex-col items-center">
                              <AnimalMiniCard
                                animal={couple.mother}
                                role="Madre"
                                levelIndex={levelIndex}
                                onClick={() => handleAnimalClick(couple.mother)}
                                className="mb-2"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Conexión al siguiente nivel */}
                      {levelIndex < groupedLevels.length - 1 && (
                        <div className="w-1 h-6 bg-gradient-to-b from-transparent to-primary/20 rounded-full mt-4" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            // Vista sin agrupación (linaje paterna/materna)
            displayLevels.map((level, levelIndex) => (
              <div key={levelIndex} className="w-full flex flex-col items-center">
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

                {levelIndex > 0 && (
                  <div className="w-1 h-8 bg-gradient-to-b from-primary/50 to-primary/20 rounded-full mb-4" />
                )}

                <div className="grid gap-4 w-full max-w-md">
                  {level.map((ancestor, idx) => {
                    const role = ancestor.sex === 'Macho' ? 'Padre' : ancestor.sex === 'Hembra' ? 'Madre' : null;
                    return (
                      <div
                        key={getId(ancestor) ?? `lvl-${levelIndex}-idx-${idx}`}
                        id={getId(ancestor) ? `node-${getId(ancestor)}` : undefined}
                        className="relative flex flex-col items-center"
                      >
                        {levelIndex > 0 && (
                          <div className="w-1 h-6 bg-gradient-to-b from-primary/30 to-transparent rounded-full mb-2" />
                        )}

                        <AnimalMiniCard
                          animal={ancestor}
                          role={role}
                          levelIndex={levelIndex}
                          onClick={() => handleAnimalClick(ancestor)}
                        />

                        {levelIndex < displayLevels.length - 1 && (
                          <div className="w-1 h-6 bg-gradient-to-b from-transparent to-primary/20 rounded-full mt-4" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
          </div>
        )}
      </div>

      {/* Modal de detalle del animal seleccionado */}
      {selectedAnimal && (
        <GenericModal
          isOpen={isDetailModalOpen}
          onOpenChange={setIsDetailModalOpen}
          title={`Detalle - ${getAnimalLabel(selectedAnimal)}`}
          size="5xl"
          enableBackdropBlur
          enableNavigation={false}
        >
          <AnimalModalContent animal={selectedAnimal as any} />
        </GenericModal>
      )}
    </GenericModal>
  );
};

export default GeneticTreeModal;
