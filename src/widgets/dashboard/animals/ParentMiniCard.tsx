import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { animalImageService, type AnimalImage } from '@/entities/animal/api/animalImage.service';

interface ParentMiniCardProps {
  parentId: number | null | undefined;
  parentLabel: string;
  gender: 'Padre' | 'Madre';
  onClick?: () => void;
}

/**
 * Mini card elegante y minimalista con carrusel de imágenes para mostrar padre/madre
 * Centrada en las fotos para permitir reconocimiento visual
 */
export function ParentMiniCard({ parentId, parentLabel, gender, onClick }: ParentMiniCardProps) {
  const [images, setImages] = useState<AnimalImage[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());

  const fetchImages = useCallback(async () => {
    if (!parentId || parentId <= 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setImageErrors(new Set());
    setCurrentIndex(0);
    try {
      const response = await animalImageService.getAnimalImages(parentId);
      if (response.success && response.data.images.length > 0) {
        // Ordenar: imagen principal primero
        const sorted = [...response.data.images].sort((a, b) => {
          if (a.is_primary) return -1;
          if (b.is_primary) return 1;
          return 0;
        });
        setImages(sorted);
      } else if (response.errorCode === 'NOT_FOUND') {
        setImages([]);
      } else {
        setImages([]);
      }
    } catch (err) {
      console.error(`Error al cargar imágenes del ${gender.toLowerCase()}:`, err);
      setImages([]);
    } finally {
      setLoading(false);
    }
  }, [parentId, gender]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  // Refrescar al recibir evento global (para que se actualice sin F5)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { animalId?: number } | undefined;
      if (!detail?.animalId) return;
      if (detail.animalId === parentId) {
        fetchImages();
      }
    };
    window.addEventListener('animal-images:updated', handler as EventListener);
    return () => window.removeEventListener('animal-images:updated', handler as EventListener);
  }, [parentId, fetchImages]);

  const goToPrevious = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goToNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  // Si no hay parentId, mostrar card vacía
  if (!parentId) {
    return (
      <div className="relative group rounded-xl overflow-hidden bg-gradient-to-br from-muted/30 to-muted/10 border-2 border-dashed border-border/50 aspect-[4/3] flex flex-col items-center justify-center p-3">
        <ImageIcon className="w-8 h-8 text-muted-foreground/40 mb-1.5" />
        <p className="text-xs font-medium text-muted-foreground/60">{gender}</p>
        <p className="text-[10px] text-muted-foreground/40">Sin registro</p>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className="relative group rounded-xl overflow-hidden bg-gradient-to-br from-accent/20 to-accent/5 border border-border/60 hover:border-primary/50 aspect-[4/3] cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
    >
      {/* Carrusel de imágenes */}
      <div className="absolute inset-0 w-full h-full">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center bg-muted/10">
            <ImageIcon className="w-10 h-10 text-muted-foreground/40 animate-pulse" />
          </div>
        ) : images.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted/20 to-muted/5">
            <div className="text-center">
              <ImageIcon className="w-10 h-10 mx-auto text-muted-foreground/40 mb-1" />
              <p className="text-[10px] text-muted-foreground/50">Sin fotos</p>
            </div>
          </div>
        ) : (
          <>
            {/* Imágenes con transición */}
            {images.map((image, index) => (
              <div
                key={image.id}
                className={`absolute inset-0 w-full h-full transition-all duration-500 ease-in-out ${
                  index === currentIndex
                    ? 'opacity-100 scale-100 z-10'
                    : 'opacity-0 scale-95 z-0'
                }`}
              >
                {imageErrors.has(image.id) ? (
                  <div className="w-full h-full flex items-center justify-center bg-muted/10">
                    <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
                  </div>
                ) : (
                  <img
                    src={image.url}
                    alt={image.filename}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={() => {
                      setImageErrors((prev) => new Set(prev).add(image.id));
                    }}
                  />
                )}
              </div>
            ))}

            {/* Controles de navegación - aparecen al hover */}
            {images.length > 1 && (
              <>
                <button
                  onClick={goToPrevious}
                  className="absolute left-1 top-1/2 -translate-y-1/2 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-1 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm"
                  aria-label="Imagen anterior"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={goToNext}
                  className="absolute right-1 top-1/2 -translate-y-1/2 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-1 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm"
                  aria-label="Imagen siguiente"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                {/* Indicadores de puntos */}
                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="flex gap-1 bg-black/40 backdrop-blur-sm rounded-full px-1.5 py-0.5">
                    {images.map((_, index) => (
                      <div
                        key={index}
                        className={`rounded-full transition-all duration-300 ${
                          index === currentIndex
                            ? 'bg-white w-3 h-1.5'
                            : 'bg-white/50 w-1.5 h-1.5'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Overlay gradient sutil para mejor legibilidad del texto */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none z-[5]" />
          </>
        )}
      </div>

      {/* Información del padre/madre - siempre visible */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-2 bg-gradient-to-t from-black/70 via-black/50 to-transparent backdrop-blur-[1px]">
        <div className="text-[10px] uppercase tracking-wider font-bold text-white/80 mb-0.5">
          {gender}
        </div>
        <div className="text-sm font-bold text-white truncate drop-shadow-lg">
          {parentLabel}
        </div>
      </div>

      {/* Indicador de click - sutil */}
      <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="w-6 h-6 rounded-full bg-primary/80 backdrop-blur-sm flex items-center justify-center shadow-lg">
          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  );
}
