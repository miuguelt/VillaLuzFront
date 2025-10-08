import { GenericModal } from "@/components/common/GenericModal";
import { getAnimalLabel } from '@/utils/animalHelpers';
import React from 'react';
import { cn } from '@/components/ui/cn.ts';
import { Users, Baby } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AnimalTreeSummary, AnimalTreeEdgeExamples } from '@/types/animalTreeTypes';
import { TreeHelpTooltip } from './TreeHelpTooltip';

interface AnimalNode {
  idAnimal?: number;
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
}

const DescendantsTreeModal = ({
  isOpen,
  onClose,
  animal,
  levels,
  counts,
  dependencyInfo,
  treeError
}: DescendantsTreeModalProps) => {
  // Permitir que el modal se abra aunque falte el animal raíz.
  // Mostraremos estados vacíos/cargando dentro del contenido.

  const [depthShown, setDepthShown] = React.useState<number>(Math.max(1, (levels?.length ?? 1)));

  // Estado para colapsables y paginación de ejemplos
  const [expandedSex, setExpandedSex] = React.useState<Record<'Macho' | 'Hembra' | 'Unknown', boolean>>({ Macho: true, Hembra: true, Unknown: false });
  const [pageSex, setPageSex] = React.useState<Record<'Macho' | 'Hembra' | 'Unknown', number>>({ Macho: 0, Hembra: 0, Unknown: 0 });
  const [expandedSpecies, setExpandedSpecies] = React.useState<Record<string, boolean>>({});
  const [pageSpecies, setPageSpecies] = React.useState<Record<string, number>>({});
  const pageSize = 5;

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

  const getSexIcon = (sex?: string) => {
    if (sex === 'Macho') return '♂';
    if (sex === 'Hembra') return '♀';
    return '•';
  };

  const getId = (n: any): number | undefined => {
    const id = n?.idAnimal ?? n?.id;
    return id && Number.isInteger(Number(id)) && Number(id) > 0 ? Number(id) : undefined;
  };

  const getSpeciesIcon = (name?: string) => {
    const n = (name || '').toLowerCase();
    if (n.includes('bov')) return '🐄';
    if (n.includes('vac') || n.includes('res')) return '🐄';
    if (n.includes('porc')) return '🐖';
    if (n.includes('equ')) return '🐴';
    if (n.includes('ov')) return '🐑';
    if (n.includes('capr')) return '🐐';
    if (n.includes('avic') || n.includes('gall') || n.includes('pollo')) return '🐓';
    return '🦊';
  };

  const scrollToNode = (id?: number) => {
    if (!id) return;
    const el = document.getElementById(`node-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-purple-600', 'ring-offset-2');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-purple-600', 'ring-offset-2');
      }, 1500);
    }
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
                          <div className={cn(
                            "relative group w-full p-4 rounded-2xl border-2 transition-all duration-300",
                            "hover:scale-105 hover:shadow-2xl hover:z-10",
                            "backdrop-blur-sm",
                            levelIndex === 0 && "bg-gradient-to-br from-primary/20 to-primary/10 border-primary/50 shadow-xl shadow-primary/20",
                            levelIndex > 0 && sex === 'Macho' && "bg-gradient-to-br from-blue-100/80 to-blue-50/50 dark:from-blue-900/20 dark:to-blue-800/10 border-blue-300/50",
                            levelIndex > 0 && sex === 'Hembra' && "bg-gradient-to-br from-pink-100/80 to-pink-50/50 dark:from-pink-900/20 dark:to-pink-800/10 border-pink-300/50",
                            levelIndex > 0 && !sex && "bg-gradient-to-br from-card/80 to-muted/50 border-border/50"
                          )}>
                            {/* Brillo superior */}
                            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

                            <div className="flex flex-col items-center space-y-3 text-center">
                              {/* Icono de sexo */}
                              <div className={cn(
                                "flex items-center justify-center w-10 h-10 rounded-full",
                                "border-2 text-2xl font-bold transition-all duration-200",
                                "group-hover:scale-110",
                                sex === 'Macho' && "bg-blue-500/20 border-blue-500/50 text-blue-600 dark:text-blue-400",
                                sex === 'Hembra' && "bg-pink-500/20 border-pink-500/50 text-pink-600 dark:text-pink-400",
                                !sex && "bg-muted border-border/50 text-muted-foreground"
                              )}>
                                {getSexIcon(sex)}
                              </div>

                              {/* Información */}
                              <div className="space-y-2 w-full">
                                <p className={cn(
                                  "font-bold text-sm sm:text-base truncate",
                                  levelIndex === 0 && "text-primary",
                                  levelIndex > 0 && "text-foreground"
                                )} title={getAnimalLabel(descendant)}>
                                  {getAnimalLabel(descendant) || 'Sin registro'}
                                </p>

                                {sex && (
                                  <p className="text-xs font-medium text-foreground/70">
                                    {sex}
                                  </p>
                                )}

                                {(descendant as any).breed?.name && (
                                  <p className="text-xs text-muted-foreground truncate px-2 py-0.5 rounded-full bg-background/50" title={(descendant as any).breed.name}>
                                    {(descendant as any).breed.name}
                                  </p>
                                )}

                                {(descendant as any).birth_date && (
                                  <p className="text-[11px] text-muted-foreground/80">
                                    {new Date((descendant as any).birth_date).toLocaleDateString('es-ES', {
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
    </GenericModal>
  );
};

export default DescendantsTreeModal;