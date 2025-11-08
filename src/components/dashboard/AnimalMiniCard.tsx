import React, { useState } from 'react';
import { cn } from '@/components/ui/cn.ts';
import { ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react';
import { getAnimalLabel } from '@/utils/animalHelpers';

interface AnimalMiniCardProps {
  animal: any;
  role?: string | null;
  levelIndex?: number;
  onClick?: () => void;
  className?: string;
}

export const AnimalMiniCard: React.FC<AnimalMiniCardProps> = ({
  animal,
  role,
  levelIndex = 0,
  onClick,
  className
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Obtener imágenes del animal (simulación - debes ajustar según tu estructura de datos)
  const images = animal?.images || animal?.photos || [];
  const hasImages = images.length > 0;

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const getSexIcon = (sex?: string) => {
    if (sex === 'Macho') return '♂';
    if (sex === 'Hembra') return '♀';
    return '•';
  };

  const isFather = role?.includes('Padre');
  const isMother = role?.includes('Madre');

  return (
    <div className={cn("relative flex flex-col items-center", className)}>
      {/* Etiqueta de rol */}
      {role && (
        <div className="mb-2">
          <span className={cn(
            "px-3 py-1 rounded-full text-[10px] font-bold shadow-md backdrop-blur-sm",
            "border transition-all duration-200",
            isFather && !isMother && "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300/50",
            isMother && !isFather && "bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 border-pink-300/50",
            isFather && isMother && "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300/50"
          )}>
            {role}
          </span>
        </div>
      )}

      {/* Tarjeta mini con carrusel */}
      <div
        onClick={onClick}
        className={cn(
          "relative group w-full max-w-[320px] rounded-xl border-2 overflow-hidden",
          "transition-all duration-300 cursor-pointer",
          "hover:scale-[1.02] hover:shadow-2xl hover:z-10",
          "backdrop-blur-sm",
          levelIndex === 0 && "bg-gradient-to-br from-primary/20 to-primary/10 border-primary/50 shadow-xl shadow-primary/20",
          levelIndex > 0 && animal.sex === 'Macho' && "bg-gradient-to-br from-blue-100/80 to-blue-50/50 dark:from-blue-900/20 dark:to-blue-800/10 border-blue-300/50",
          levelIndex > 0 && animal.sex === 'Hembra' && "bg-gradient-to-br from-pink-100/80 to-pink-50/50 dark:from-pink-900/20 dark:to-pink-800/10 border-pink-300/50",
          levelIndex > 0 && !animal.sex && "bg-gradient-to-br from-card/80 to-muted/50 border-border/50"
        )}
      >
        {/* Brillo superior */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent z-10" />

        {/* Sección de imagen con carrusel */}
        {hasImages ? (
          <div className="relative h-48 bg-muted/20 overflow-hidden group/carousel">
            <img
              src={images[currentImageIndex]?.url || images[currentImageIndex]}
              alt={getAnimalLabel(animal)}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />

            {/* Overlay oscuro sutil */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

            {/* Controles de carrusel - siempre visibles */}
            {images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className={cn(
                    "absolute left-2 top-1/2 -translate-y-1/2 z-20",
                    "w-8 h-8 rounded-full bg-background/90 backdrop-blur-sm",
                    "flex items-center justify-center",
                    "transition-all duration-200",
                    "hover:bg-background hover:scale-110 active:scale-95",
                    "shadow-lg border border-border/50"
                  )}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={nextImage}
                  className={cn(
                    "absolute right-2 top-1/2 -translate-y-1/2 z-20",
                    "w-8 h-8 rounded-full bg-background/90 backdrop-blur-sm",
                    "flex items-center justify-center",
                    "transition-all duration-200",
                    "hover:bg-background hover:scale-110 active:scale-95",
                    "shadow-lg border border-border/50"
                  )}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>

                {/* Indicadores de imagen - más grandes */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                  {images.map((_: any, idx: number) => (
                    <button
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentImageIndex(idx);
                      }}
                      className={cn(
                        "rounded-full transition-all cursor-pointer",
                        idx === currentImageIndex
                          ? "bg-white w-6 h-2"
                          : "bg-white/60 hover:bg-white/80 w-2 h-2"
                      )}
                    />
                  ))}
                </div>

                {/* Contador de imágenes */}
                <div className="absolute top-2 left-2 z-10">
                  <div className="bg-black/60 backdrop-blur-sm text-white text-xs font-medium px-2 py-1 rounded-full">
                    {currentImageIndex + 1} / {images.length}
                  </div>
                </div>
              </>
            )}

            {/* Icono de sexo flotante */}
            <div className={cn(
              "absolute top-2 right-2 z-10",
              "flex items-center justify-center w-8 h-8 rounded-full",
              "border-2 text-lg font-bold backdrop-blur-md",
              "shadow-lg",
              animal.sex === 'Macho' && "bg-blue-500/90 border-blue-300 text-white",
              animal.sex === 'Hembra' && "bg-pink-500/90 border-pink-300 text-white",
              !animal.sex && "bg-muted/90 border-border text-muted-foreground"
            )}>
              {getSexIcon(animal.sex)}
            </div>
          </div>
        ) : (
          <div className="relative h-48 bg-muted/30 flex items-center justify-center">
            <ImageIcon className="h-16 w-16 text-muted-foreground/30" />

            {/* Icono de sexo flotante */}
            <div className={cn(
              "absolute top-2 right-2",
              "flex items-center justify-center w-8 h-8 rounded-full",
              "border-2 text-lg font-bold backdrop-blur-sm",
              animal.sex === 'Macho' && "bg-blue-500/20 border-blue-500/50 text-blue-600 dark:text-blue-400",
              animal.sex === 'Hembra' && "bg-pink-500/20 border-pink-500/50 text-pink-600 dark:text-pink-400",
              !animal.sex && "bg-muted border-border/50 text-muted-foreground"
            )}>
              {getSexIcon(animal.sex)}
            </div>
          </div>
        )}

        {/* Información del animal */}
        <div className="p-4 space-y-2">
          <p className={cn(
            "font-bold text-base truncate",
            levelIndex === 0 && "text-primary",
            levelIndex > 0 && "text-foreground"
          )} title={getAnimalLabel(animal)}>
            {getAnimalLabel(animal) || 'Sin registro'}
          </p>

          {animal.sex && (
            <p className="text-xs font-medium text-foreground/70">
              {animal.sex}
            </p>
          )}

          {animal.breed?.name && (
            <p className="text-xs text-muted-foreground truncate px-2.5 py-1 rounded-full bg-background/50 inline-block" title={animal.breed.name}>
              {animal.breed.name}
            </p>
          )}

          {animal.birth_date && (
            <p className="text-xs text-muted-foreground/80 flex items-center gap-1">
              <span>📅</span>
              {new Date(animal.birth_date).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
            </p>
          )}
        </div>

        {/* Efecto de hover - indicador de click */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="absolute inset-0 ring-2 ring-primary/50 ring-inset rounded-xl" />
        </div>
      </div>
    </div>
  );
};
