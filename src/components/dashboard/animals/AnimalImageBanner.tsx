import React, { useState, useEffect, useCallback } from 'react';
import { Image as ImageIcon, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  animalImageService,
  type AnimalImage,
} from '@/services/animalImageService';

interface AnimalImageBannerProps {
  animalId: number;
  /** Altura del banner */
  height?: string;
  /** Mostrar controles de navegación */
  showControls?: boolean;
  /** Auto-play del carrusel (ms) */
  autoPlayInterval?: number;
  /** Ocultar por completo cuando no haya imágenes */
  hideWhenEmpty?: boolean;
  /** Trigger externo para recargar las imágenes */
  refreshTrigger?: number;
  /** Modo de ajuste de imagen: 'contain' o 'cover' */
  objectFit?: 'contain' | 'cover';
}

/**
 * Banner elegante de carrusel para mostrar las imágenes de un animal
 */
export function AnimalImageBanner({
  animalId,
  height = '300px',
  showControls = true,
  autoPlayInterval = 5000,
  hideWhenEmpty = false,
  refreshTrigger = 0,
  objectFit = 'contain',
}: AnimalImageBannerProps) {
  const [images, setImages] = useState<AnimalImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedImage, setSelectedImage] = useState<AnimalImage | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Cargar imágenes con manejo completo de errores
  const fetchImages = useCallback(async () => {
    if (!animalId || animalId <= 0) {
      setLoading(false);
      setFetchError(null);
      return;
    }

    setLoading(true);
    setFetchError(null);

    try {
      const response = await animalImageService.getAnimalImages(animalId);

      if (response.success && response.data.images.length > 0) {
        // Ordenar: imagen principal primero
        const sorted = [...response.data.images].sort((a, b) => {
          if (a.is_primary) return -1;
          if (b.is_primary) return 1;
          return 0;
        });
        setImages(sorted);
        setFetchError(null);
      } else {
        setImages([]);
        setFetchError(null);
      }
    } catch (err: any) {
      const status = err.response?.status;
      console.error('Error al cargar imágenes:', err);

      if (status === 404) {
        setImages([]);
        setFetchError(null);
      } else if (status === 401 || status === 403) {
        setImages([]);
        setFetchError('No tienes permisos para ver las imágenes');
      } else if (status === 500) {
        setImages([]);
        setFetchError('Error del servidor al cargar las imágenes');
      } else if (err.code === 'ERR_NETWORK' || !window.navigator.onLine) {
        setImages([]);
        setFetchError('Sin conexión a internet');
      } else {
        setImages([]);
        setFetchError('Error al cargar las imágenes');
      }
    } finally {
      setLoading(false);
    }
  }, [animalId]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages, refreshTrigger]);

  // Auto-play del carrusel
  useEffect(() => {
    if (images.length <= 1 || isPaused || !autoPlayInterval) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [images.length, isPaused, autoPlayInterval]);

  // Navegación
  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    setIsPaused(true);
  }, [images.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
    setIsPaused(true);
  }, [images.length]);

  const goToIndex = useCallback((index: number) => {
    setCurrentIndex(index);
    setIsPaused(true);
  }, []);

  // Loading state
  if (loading) {
    return (
      <div
        className="relative rounded-xl overflow-hidden bg-accent/10 flex items-center justify-center"
        style={{ height }}
      >
        <div className="text-center">
          <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground animate-pulse mb-2" />
          <p className="text-sm text-muted-foreground">Cargando imágenes...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (fetchError) {
    if (hideWhenEmpty) {
      return null;
    }
    return (
      <div
        className="relative rounded-xl overflow-hidden bg-gradient-to-br from-destructive/5 to-destructive/10 flex items-center justify-center border-2 border-dashed border-destructive/30"
        style={{ height }}
      >
        <div className="text-center px-4">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-destructive/10 flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-destructive" />
          </div>
          <p className="text-base font-medium mb-1 text-destructive">Error al cargar imágenes</p>
          <p className="text-sm text-muted-foreground">
            {fetchError}
          </p>
          <button
            onClick={fetchImages}
            className="mt-3 px-4 py-2 text-sm font-medium rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (images.length === 0) {
    if (hideWhenEmpty) {
      return null;
    }
    return (
      <div
        className="relative rounded-xl overflow-hidden bg-gradient-to-br from-accent/5 to-accent/10 flex items-center justify-center border-2 border-dashed border-border"
        style={{ height }}
      >
        <div className="text-center">
          <ImageIcon className="w-16 h-16 mx-auto text-muted-foreground mb-3" />
          <p className="text-base font-medium mb-1">No hay imágenes</p>
          <p className="text-sm text-muted-foreground">
            Este animal aún no tiene imágenes
          </p>
        </div>
      </div>
    );
  }

  const currentImage = images[currentIndex];

  return (
    <>
      {/* Banner principal */}
      <div
        className="relative rounded-xl overflow-hidden group"
        style={{ height }}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Imagen de fondo */}
        <div className="absolute inset-0">
          {imageErrors.has(currentImage.id) ? (
            <div className="w-full h-full flex items-center justify-center bg-muted/20">
              <div className="text-center">
                <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                {/* Texto de error ocultado para no tapar la imagen */}
              </div>
            </div>
          ) : (
            <img
              src={currentImage.url}
              alt={currentImage.filename}
              className={`w-full h-full ${objectFit === 'cover' ? 'object-cover' : 'object-contain'} transition-opacity duration-500`}
              loading="lazy"
              onError={() => {
                setImageErrors(prev => new Set(prev).add(currentImage.id));
              }}
            />
          )}
          {/* Overlay gradient muy sutil para no opacar la imagen */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/5 via-transparent to-transparent" />
        </div>


        {/* Botón de zoom */}
        <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={() => setSelectedImage(currentImage)}
            className="shadow-lg backdrop-blur-sm bg-white/90 dark:bg-black/90"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
        </div>

        {/* Controles de navegación */}
        {showControls && images.length > 1 && (
          <>
            {/* Botón anterior */}
            <button
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm"
              aria-label="Imagen anterior"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            {/* Botón siguiente */}
            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm"
              aria-label="Imagen siguiente"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        {/* Información de la imagen eliminada para no cubrir la vista */}
        {/*
        <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-white font-semibold text-lg mb-1">
                {currentImage.filename}
              </p>
              <p className="text-white/80 text-sm">
                {(currentImage.file_size / 1024).toFixed(0)} KB •{' '}
                {currentImage.mime_type} •{' '}
                {new Date(currentImage.created_at).toLocaleDateString('es-ES')}
              </p>
            </div>
            {images.length > 1 && (
              <div className="flex-shrink-0 px-3 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white text-sm font-medium">
                {currentIndex + 1} / {images.length}
              </div>
            )}
          </div>
        </div>
        */}

        {/* Indicadores de puntos */}
        {images.length > 1 && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-10">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => goToIndex(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentIndex
                    ? 'bg-white shadow-lg w-8'
                    : 'bg-white/60 hover:bg-white/80 shadow-md'
                }`}
                aria-label={`Ir a imagen ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Dialog de zoom - pantalla completa para máxima calidad */}
      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent className="max-w-[100vw] max-h-[100vh] w-screen h-screen p-0 bg-black/98 border-none overflow-hidden rounded-none">
          <DialogHeader className="sr-only">
            <DialogTitle>{selectedImage?.filename}</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="relative w-full h-full flex items-center justify-center">
              <img
                src={selectedImage.url}
                alt={selectedImage.filename}
                className="max-w-full max-h-full w-auto h-auto object-contain"
                style={{ imageRendering: 'high-quality' }}
              />
              {/* Información de la imagen en la parte inferior */}
              <div className="absolute bottom-8 left-0 right-0 flex justify-center z-10">
                <div className="bg-black/80 backdrop-blur-md text-white px-6 py-3 rounded-full text-sm font-medium shadow-2xl border border-white/10">
                  {selectedImage.filename} • {(selectedImage.file_size / 1024).toFixed(0)} KB
                </div>
              </div>

              {/* Indicador de cierre */}
              <div className="absolute top-8 right-8 z-10">
                <div className="bg-black/80 backdrop-blur-md text-white/70 px-4 py-2 rounded-full text-xs font-medium shadow-2xl border border-white/10">
                  Presione ESC o haga clic para cerrar
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
