import { GenericModal } from "@/components/common/GenericModal";
import { getAnimalLabel } from '@/utils/animalHelpers';
import React from 'react';
import { cn } from '@/lib/utils';
import { Users, Baby } from 'lucide-react';

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
}

const DescendantsTreeModal = ({ isOpen, onClose, animal, levels }: DescendantsTreeModalProps) => {
  if (!animal) return null;

  const [depthShown, setDepthShown] = React.useState<number>(Math.max(1, (levels?.length ?? 1)));

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

  return (
    <GenericModal
      isOpen={isOpen}
      onOpenChange={onClose}
      title="👶 Árbol de Descendientes"
      description={`${getAnimalLabel(animal) || 'Sin registro'} - Línea genealógica descendente`}
      size="7xl"
      enableBackdropBlur
    >
      <div className="relative w-full">
        {levels.length === 0 ? (
          <div className="text-center py-12">
            <Baby className="mx-auto h-16 w-16 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground text-lg font-medium">No se encontró información de descendientes</p>
            <p className="text-muted-foreground/70 text-sm mt-2">Este animal no tiene descendientes registrados</p>
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
            </div>

            {/* Árbol de descendientes */}
            <div className="flex flex-col items-center space-y-6 max-h-[60vh] overflow-y-auto px-2 py-4">
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
                            "relative group w-full p-5 rounded-2xl border-2 transition-all duration-300",
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
                                "flex items-center justify-center w-12 h-12 rounded-full",
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
                                  "font-bold text-base sm:text-lg truncate",
                                  levelIndex === 0 && "text-primary",
                                  levelIndex > 0 && "text-foreground"
                                )} title={getAnimalLabel(descendant)}>
                                  {getAnimalLabel(descendant) || 'Sin registro'}
                                </p>

                                {sex && (
                                  <p className="text-sm font-medium text-foreground/70">
                                    {sex}
                                  </p>
                                )}

                                {(descendant as any).breed?.name && (
                                  <p className="text-xs text-muted-foreground truncate px-3 py-1 rounded-full bg-background/50" title={(descendant as any).breed.name}>
                                    {(descendant as any).breed.name}
                                  </p>
                                )}

                                {(descendant as any).birth_date && (
                                  <p className="text-xs text-muted-foreground/80">
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
          </div>
        )}
      </div>
    </GenericModal>
  );
};

export default DescendantsTreeModal;