import { GenericModal } from "@/components/common/GenericModal";
import { getAnimalLabel } from '@/utils/animalHelpers';
import React from 'react';
import { cn } from '@/components/ui/cn.ts';
import { Users, Heart } from 'lucide-react';
import type { AnimalTreeSummary, AnimalTreeEdgeExamples } from '@/types/animalTreeTypes';
import { TreeHelpTooltip } from './TreeHelpTooltip';

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

  // Sincronizar el slider con los niveles cuando llegan datos asíncronos
  React.useEffect(() => {
    const total = Array.isArray(levels) ? levels.length : 1;
    // Mostrar por defecto todas las generaciones disponibles
    setDepthShown(Math.max(1, total));
  }, [levels]);

  // Estado para colapsables y paginación de ejemplos
  const [expandedSex, setExpandedSex] = React.useState<Record<'Macho' | 'Hembra' | 'Unknown', boolean>>({ Macho: true, Hembra: true, Unknown: false });
  const [pageSex, setPageSex] = React.useState<Record<'Macho' | 'Hembra' | 'Unknown', number>>({ Macho: 0, Hembra: 0, Unknown: 0 });
  const [expandedSpecies, setExpandedSpecies] = React.useState<Record<string, boolean>>({});
  const [pageSpecies, setPageSpecies] = React.useState<Record<string, number>>({});
  const pageSize = 5;

  const getId = (n: any): number | undefined => {
    const id = n?.id ?? n?.idAnimal;
    return id && Number.isInteger(Number(id)) && Number(id) > 0 ? Number(id) : undefined;
  };

  const getFatherId = (n: any): number | undefined => {
    // PRIORIZAR idFather (formato del backend)
    const fId = n?.idFather ?? n?.father_id ?? n?.father?.id ?? n?.father?.idAnimal;
    return fId && Number.isInteger(Number(fId)) && Number(fId) > 0 ? Number(fId) : undefined;
  };

  const getMotherId = (n: any): number | undefined => {
    // PRIORIZAR idMother (formato del backend)
    const mId = n?.idMother ?? n?.mother_id ?? n?.mother?.id ?? n?.mother?.idAnimal;
    return mId && Number.isInteger(Number(mId)) && Number(mId) > 0 ? Number(mId) : undefined;
  };

  const displayLevels: any[][] = React.useMemo(() => {
    if (!animal || !levels) return [];
    const limited = Array.isArray(levels) ? levels.slice(0, Math.max(1, depthShown)) : [];

    // Ordenar cada nivel para que padre esté antes que madre
    const sorted = limited.map((level, idx) => {
      if (idx === 0 || level.length <= 1) return level;

      // Separar padres y madres basándose en su sexo
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

      // Orden: padres primero, luego madres, luego desconocidos
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

  const getRoleLabel = (ancestor: any, prevLevel: any[] | undefined) => {
    if (!prevLevel || prevLevel.length === 0) return null;
    let isFather = false;
    let isMother = false;
    for (const child of prevLevel) {
      const childFatherId = getFatherId(child as any);
      const childMotherId = getMotherId(child as any);
      const ancId = getId(ancestor);
      if (childFatherId && ancId && childFatherId === ancId) isFather = true;
      if (childMotherId && ancId && childMotherId === ancId) isMother = true;
      if (isFather && isMother) break;
    }
    if (isFather && isMother) return 'Padre / Madre';
    if (isFather) return 'Padre';
    if (isMother) return 'Madre';
    return null;
  };

  const getGenerationLabel = (levelIndex: number) => {
    switch (levelIndex) {
      case 0: return null; // Eliminado: no aporta información genética relevante
      case 1: return 'Padres';
      case 2: return 'Abuelos';
      case 3: return 'Bisabuelos';
      case 4: return 'Tatarabuelos';
      case 5: return 'Trastatarabuelos';
      default: return `Generación ${levelIndex}`;
    }
  };

  const getSexIcon = (sex?: string) => {
    if (sex === 'Macho') return '♂';
    if (sex === 'Hembra') return '♀';
    return '•';
  };

  const getSpeciesIcon = (name?: string) => {
    const n = (name || '').toLowerCase();
    if (n.includes('bov')) return '🐄'; // bovino
    if (n.includes('vac') || n.includes('res')) return '🐄';
    if (n.includes('porc')) return '🐖'; // porcino
    if (n.includes('equ')) return '🐴'; // equino
    if (n.includes('ov')) return '🐑'; // ovino
    if (n.includes('capr')) return '🐐'; // caprino
    if (n.includes('avic') || n.includes('gall') || n.includes('pollo')) return '🐓'; // aves
    return '🦊'; // genérico
  };

  const scrollToNode = (id?: number) => {
    if (!id) return;
    const el = document.getElementById(`node-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
      }, 1500);
    }
  };

  // Permitir que el modal se abra aunque falte el animal raíz.
  // Mostraremos estados vacíos/cargando dentro del contenido.

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
                ? 'Este animal no tiene padres registrados en la base de datos. Para mostrar antepasados, asegúrese de que los campos idFather e idMother estén configurados correctamente.'
                : 'Este animal no tiene antepasados registrados'}
            </p>
            
            {/* Información de depuración */}
            {dependencyInfo && (
              <div className="mt-6 p-4 rounded-lg border bg-muted/30 border-border/50 max-w-md mx-auto">
                <h4 className="text-sm font-semibold text-foreground mb-2">Información de depuración:</h4>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>Padre registrado: {dependencyInfo.father_id ? `ID ${dependencyInfo.father_id}` : 'No'}</div>
                  <div>Madre registrada: {dependencyInfo.mother_id ? `ID ${dependencyInfo.mother_id}` : 'No'}</div>
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

          {/* Conteos removidos para simplificar UI */}
          <div className="hidden" />
        </div>

        {/* Resumen removido según solicitud del usuario */}
        <div className="hidden" />

        {/* Se removió la sección de ejemplos para dejar solo el resultado */}

        {/* Árbol genealógico */}
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
                  {levelIndex > 0 && lineageMode === 'ambos' && (
                    <div className="w-1 h-8 bg-gradient-to-b from-primary/50 to-primary/20 rounded-full mb-4" />
                  )}

                  {/* Animales en esta generación */}
                  <div className={cn(
                    "grid gap-4 w-full max-w-4xl",
                    lineageMode === 'ambos' && level.length === 2 ? "sm:grid-cols-2" : "grid-cols-1 max-w-md"
                  )}>
                    {level.map((ancestor, idx) => {
                      const role = getRoleLabel(ancestor, displayLevels[levelIndex - 1]);
                      const isFather = role?.includes('Padre');
                      const isMother = role?.includes('Madre');

                      return (
                        <div
                          key={getId(ancestor) ?? `lvl-${levelIndex}-idx-${idx}`}
                          id={getId(ancestor) ? `node-${getId(ancestor)}` : undefined}
                          className="relative flex flex-col items-center"
                        >
                          {/* Conexión vertical individual */}
                          {levelIndex > 0 && lineageMode === 'ambos' && (
                            <div className={cn(
                              "w-1 h-6 rounded-full mb-2",
                              isFather ? "bg-gradient-to-b from-blue-500/50 to-transparent" : "bg-gradient-to-b from-pink-500/50 to-transparent"
                            )} />
                          )}

                          {/* Etiqueta de rol */}
                          {role && (
                            <div className="mb-3">
                              <span className={cn(
                                "px-4 py-1.5 rounded-full text-xs font-bold shadow-md backdrop-blur-sm",
                                "border transition-all duration-200",
                                isFather && !isMother && "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300/50",
                                isMother && !isFather && "bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 border-pink-300/50",
                                isFather && isMother && "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300/50"
                              )}>
                                {role}
                              </span>
                            </div>
                          )}

                          {/* Tarjeta del animal */}
                          <div className={cn(
                            "relative group w-full p-4 rounded-2xl border-2 transition-all duration-300",
                            "hover:scale-105 hover:shadow-2xl hover:z-10",
                            "backdrop-blur-sm",
                            levelIndex === 0 && "bg-gradient-to-br from-primary/20 to-primary/10 border-primary/50 shadow-xl shadow-primary/20",
                            levelIndex > 0 && ancestor.sex === 'Macho' && "bg-gradient-to-br from-blue-100/80 to-blue-50/50 dark:from-blue-900/20 dark:to-blue-800/10 border-blue-300/50",
                            levelIndex > 0 && ancestor.sex === 'Hembra' && "bg-gradient-to-br from-pink-100/80 to-pink-50/50 dark:from-pink-900/20 dark:to-pink-800/10 border-pink-300/50",
                            levelIndex > 0 && !ancestor.sex && "bg-gradient-to-br from-card/80 to-muted/50 border-border/50"
                          )}>
                            {/* Brillo superior */}
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

                            <div className="flex flex-col items-center space-y-3 text-center">
                              {/* Icono de sexo */}
                              <div className={cn(
                                "flex items-center justify-center w-10 h-10 rounded-full",
                                "border-2 text-2xl font-bold transition-all duration-200",
                                "group-hover:scale-110",
                                ancestor.sex === 'Macho' && "bg-blue-500/20 border-blue-500/50 text-blue-600 dark:text-blue-400",
                                ancestor.sex === 'Hembra' && "bg-pink-500/20 border-pink-500/50 text-pink-600 dark:text-pink-400",
                                !ancestor.sex && "bg-muted border-border/50 text-muted-foreground"
                              )}>
                                {getSexIcon(ancestor.sex)}
                              </div>

                              {/* Información */}
                              <div className="space-y-2 w-full">
                                <p className={cn(
                                  "font-bold text-sm sm:text-base truncate",
                                  levelIndex === 0 && "text-primary",
                                  levelIndex > 0 && "text-foreground"
                                )} title={getAnimalLabel(ancestor)}>
                                  {getAnimalLabel(ancestor) || 'Sin registro'}
                                </p>

                                {ancestor.sex && (
                                  <p className="text-xs font-medium text-foreground/70">
                                    {ancestor.sex}
                                  </p>
                                )}

                                {ancestor.breed?.name && (
                                  <p className="text-xs text-muted-foreground truncate px-2 py-0.5 rounded-full bg-background/50" title={ancestor.breed.name}>
                                    {ancestor.breed.name}
                                  </p>
                                )}

                                {ancestor.birth_date && (
                                  <p className="text-[11px] text-muted-foreground/80">
                                    {new Date(ancestor.birth_date).toLocaleDateString('es-ES', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric'
                                    })}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Conexión al siguiente nivel */}
                          {lineageMode === 'ambos' && levelIndex < displayLevels.length - 1 && (
                            <div className="w-1 h-6 bg-gradient-to-b from-primary/20 to-transparent rounded-full mt-4" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </GenericModal>
  );
};

export default GeneticTreeModal;