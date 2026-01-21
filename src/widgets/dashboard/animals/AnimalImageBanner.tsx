import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Image as ImageIcon, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/ui/dialog';
import {
  animalImageService,
  type AnimalImage,
} from '@/entities/animal/api/animalImage.service';

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
  /** Usar pantalla completa (ignora height) */
  fullscreen?: boolean;
}

type BannerImage = AnimalImage & { isPlaceholder?: boolean };

const BROKEN_IMAGE_PLACEHOLDER = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 260">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#eef2ff"/>
        <stop offset="100%" stop-color="#e2e8f0"/>
      </linearGradient>
    </defs>
    <rect width="400" height="260" rx="24" fill="url(#g)"/>
    <rect x="32" y="32" width="336" height="196" rx="16" fill="#fff" stroke="#cbd5f5" stroke-width="2"/>
    <path d="M108 176l42-52 36 44 30-36 64 76H108z" fill="#c7d2fe" opacity="0.8"/>
    <circle cx="150" cy="102" r="22" fill="#e0e7ff"/>
    <path d="M96 200h208" stroke="#cbd5f5" stroke-width="6" stroke-linecap="round" opacity="0.7"/>
    <text x="200" y="226" font-family="Inter, Helvetica, Arial" font-size="18" fill="#475569" text-anchor="middle">
      Imagen no disponible
    </text>
  </svg>`
)}`;

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
  objectFit = 'cover',
  fullscreen = false,
}: AnimalImageBannerProps) {
  const [images, setImages] = useState<BannerImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedImage, setSelectedImage] = useState<BannerImage | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [brokenImages, setBrokenImages] = useState(0);
  const [brokenNotice, setBrokenNotice] = useState<string | null>(null);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const isContainMode = objectFit === 'contain';

  // Callback ref to set CSS custom property for banner height
  const setBannerHeight = useCallback((element: HTMLDivElement | null) => {
    if (element && !fullscreen) {
      element.style.setProperty('--banner-height', height);
    }
  }, [height, fullscreen]);

  // Cargar imágenes con manejo completo de errores
  const fetchImages = useCallback(async () => {
    if (!animalId || animalId <= 0) {
      setLoading(false);
      setFetchError(null);
      return;
    }

    setLoading(true);
    setFetchError(null);
    setImageErrors(new Set<number>());
    setBrokenImages(0);
    setBrokenNotice(null);
    setCurrentIndex(0);

    try {
      const response = await animalImageService.getAnimalImages(animalId);

      if (response.success && response.data.images.length > 0) {
        // Ordenar: imagen principal primero
        const sorted = [...response.data.images].sort((a, b) => {
          if (a.is_primary) return -1;
          if (b.is_primary) return 1;
          return 0;
        });
        setImages(sorted.map((img) => ({ ...img, isPlaceholder: false })));
        setFetchError(null);
      } else {
        setImages([]);
        setFetchError(null);
        if (response.errorCode === 'NOT_FOUND') {
          const traceSuffix = response.traceId ? ` (Trace ID: ${response.traceId})` : '';
          setBrokenNotice(
            (response.message || 'El recurso de imágenes no existe.') + traceSuffix
          );
        }
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

  // Refrescar al recibir evento global
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { animalId?: number; uploaded?: any[] } | undefined;
      if (!detail || detail.animalId === animalId) {
        fetchImages();
        if (detail?.uploaded?.length) {
          setTimeout(fetchImages, 800);
          setTimeout(fetchImages, 1600);
        }
      }
    };
    window.addEventListener('animal-images:updated', handler as EventListener);
    return () => window.removeEventListener('animal-images:updated', handler as EventListener);
  }, [animalId, fetchImages]);

  // Auto-play del carrusel
  useEffect(() => {
    if (images.length <= 1 || isPaused || !autoPlayInterval) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [images.length, isPaused, autoPlayInterval]);

  const handleBrokenImage = useCallback((image: BannerImage) => {
    if (image.isPlaceholder) return;

    let shouldUpdateCounters = false;
    setImageErrors((prev) => {
      if (prev.has(image.id)) {
        return prev;
      }
      shouldUpdateCounters = true;
      const next = new Set(prev);
      next.add(image.id);
      return next;
    });

    if (shouldUpdateCounters) {
      setBrokenImages((prev) => prev + 1);
      setBrokenNotice(
        (prev) =>
          prev ??
          'Algunas imágenes no están disponibles en el servidor. Mostramos una imagen de referencia en su lugar.'
      );
    }

    setImages((prev) =>
      prev.map((img) =>
        img.id === image.id
          ? {
            ...img,
            url: BROKEN_IMAGE_PLACEHOLDER,
            isPlaceholder: true,
          }
          : img
      )
    );
  }, []);

  // Navegación con transiciones suaves
  const goToPrevious = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    setIsPaused(true);
    setTimeout(() => setIsTransitioning(false), 500);
  }, [images.length, isTransitioning]);

  const goToNext = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev + 1) % images.length);
    setIsPaused(true);
    setTimeout(() => setIsTransitioning(false), 500);
  }, [images.length, isTransitioning]);

  const goToIndex = useCallback((index: number) => {
    if (isTransitioning || index === currentIndex) return;
    setIsTransitioning(true);
    setCurrentIndex(index);
    setIsPaused(true);
    setTimeout(() => setIsTransitioning(false), 500);
  }, [currentIndex, isTransitioning]);

  // Navegación táctil (swipe)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setIsPaused(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!touchStartX.current || !touchEndX.current) return;

    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50; // Mínimo de píxeles para considerar un swipe

    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        // Swipe izquierda - siguiente
        goToNext();
      } else {
        // Swipe derecha - anterior
        goToPrevious();
      }
    }

    touchStartX.current = 0;
    touchEndX.current = 0;
  }, [goToNext, goToPrevious]);

  // Loading state
  if (loading) {
    return (
      <div
        ref={setBannerHeight}
        className={`overflow-hidden bg-accent/10 flex items-center justify-center ${fullscreen
          ? 'fixed inset-0 z-50 w-screen h-screen'
          : 'relative w-full h-full rounded-xl banner-container-dynamic'
          }`}
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
        ref={setBannerHeight}
        className={`overflow-hidden bg-gradient-to-br from-destructive/5 to-destructive/10 flex items-center justify-center border-2 border-dashed border-destructive/30 ${fullscreen
          ? 'fixed inset-0 z-50 w-screen h-screen'
          : 'relative w-full h-full rounded-xl banner-container-dynamic'
          }`}
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
        ref={setBannerHeight}
        className={`overflow-hidden bg-gradient-to-br from-accent/5 to-accent/10 flex items-center justify-center border-2 border-dashed border-border ${fullscreen
          ? 'fixed inset-0 z-50 w-screen h-screen'
          : 'relative w-full h-full rounded-xl banner-container-dynamic'
          }`}
      >
        <div className="text-center">
          <ImageIcon className="w-16 h-16 mx-auto text-muted-foreground mb-3" />
          <p className="text-base font-medium mb-1">No hay imágenes</p>
          <p className="text-sm text-muted-foreground">
            Este animal aún no tiene imágenes
          </p>
          {brokenImages > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              No pudimos mostrar {brokenImages} imagen(es) porque el archivo no está disponible.
            </p>
          )}
        </div>
      </div>
    );
  }

  const currentImage = images[currentIndex];

  return (
    <>
      {/* Banner principal - Carrusel elegante y responsivo */}
      <div
        ref={(el) => { carouselRef.current = el; setBannerHeight(el); }}
        className={`overflow-hidden group ${fullscreen
          ? 'fixed inset-0 z-50 bg-black w-screen h-screen'
          : `relative w-full h-full rounded-xl banner-container-dynamic ${isContainMode ? 'bg-slate-900/80 dark:bg-black' : ''}`
          }`}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Contenedor de imágenes con transición suave */}
        <div className="absolute inset-0 w-full h-full pointer-events-none">
          {images.map((image, index) => (
            <div
              key={image.id}
              className={`absolute inset-0 w-full h-full transition-all duration-500 ease-in-out ${index === currentIndex
                ? 'opacity-100 scale-100 z-10'
                : 'opacity-0 scale-95 z-0'
                }`}
            >
              <>
                <img
                  src={image.url}
                  alt={image.filename}
                  className={`block w-full h-full carousel-image ${objectFit === 'cover' ? 'object-cover' : 'object-contain'
                    } transition-transform duration-700 ease-out ${image.isPlaceholder ? 'opacity-80' : ''
                    }`}
                  loading={index === 0 ? 'eager' : 'lazy'}
                  onError={() => handleBrokenImage(image)}
                />
                {imageErrors.has(image.id) && (
                  <div className="absolute inset-0 bg-gradient-to-b from-background/40 to-background/70 flex items-center justify-center px-6 text-center">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">Imagen original no disponible</p>
                      <p className="text-xs text-muted-foreground">
                        Mostramos una referencia temporal para evitar dejar el espacio vacío.
                      </p>
                    </div>
                  </div>
                )}
                {/* Overlay gradient sutil - solo si no es fullscreen */}
                {!fullscreen && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                )}
              </>
            </div>
          ))}
        </div>

        {/* Botón de zoom - visible en hover/touch - SOLO este botón abre el carrusel */}
        <div className="absolute top-3 right-3 z-20 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-100 scale-90 pointer-events-auto">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedImage(currentImage);
            }}
            className="shadow-xl backdrop-blur-md bg-white/95 dark:bg-black/95 hover:bg-white dark:hover:bg-black border border-white/20 dark:border-white/10 h-9 w-9 sm:h-10 sm:w-10 md:h-11 md:w-11"
          >
            <ZoomIn className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
        </div>

        {/* Controles de navegación - adaptados a dispositivo - CON pointer-events-auto */}
        {showControls && images.length > 1 && (
          <>
            {/* Botón anterior - más grande en móvil */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToPrevious();
              }}
              disabled={isTransitioning}
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20
                opacity-0 group-hover:opacity-100 active:opacity-100
                transition-all duration-300
                p-2 sm:p-2.5 md:p-3
                rounded-full
                bg-black/60 hover:bg-black/80 active:bg-black/90
                text-white backdrop-blur-md
                shadow-xl border border-white/10
                disabled:opacity-50 disabled:cursor-not-allowed
                transform hover:scale-110 active:scale-95
                pointer-events-auto"
              aria-label="Imagen anterior"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" />
            </button>

            {/* Botón siguiente - más grande en móvil */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
              disabled={isTransitioning}
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20
                opacity-0 group-hover:opacity-100 active:opacity-100
                transition-all duration-300
                p-2 sm:p-2.5 md:p-3
                rounded-full
                bg-black/60 hover:bg-black/80 active:bg-black/90
                text-white backdrop-blur-md
                shadow-xl border border-white/10
                disabled:opacity-50 disabled:cursor-not-allowed
                transform hover:scale-110 active:scale-95
                pointer-events-auto"
              aria-label="Imagen siguiente"
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" />
            </button>
          </>
        )}

        {/* Indicadores de puntos - responsivos - CON pointer-events-auto */}
        {images.length > 1 && (
          <div className="absolute bottom-3 sm:bottom-4 md:bottom-5 left-0 right-0 flex justify-center gap-1.5 sm:gap-2 z-20 px-2 pointer-events-auto">
            <div className="flex gap-1.5 sm:gap-2 bg-black/30 backdrop-blur-md rounded-full px-2.5 py-1.5 sm:px-3 sm:py-2 border border-white/10">
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    goToIndex(index);
                  }}
                  disabled={isTransitioning}
                  className={`rounded-full transition-all duration-300 disabled:cursor-not-allowed
                    ${index === currentIndex
                      ? 'bg-white shadow-lg w-6 sm:w-7 md:w-8 h-2 sm:h-2.5'
                      : 'bg-white/50 hover:bg-white/70 active:bg-white/90 shadow-md w-2 sm:w-2.5 h-2 sm:h-2.5'
                    }`}
                  aria-label={`Ir a imagen ${index + 1}`}
                  aria-current={index === currentIndex ? 'true' : 'false'}
                />
              ))}
            </div>
          </div>
        )}

        {/* Contador de imágenes - solo en pantallas grandes */}
        {images.length > 1 && (
          <div className="hidden md:block absolute top-3 left-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="bg-black/60 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-xs font-medium shadow-xl border border-white/10">
              {currentIndex + 1} / {images.length}
            </div>
          </div>
        )}

        {brokenNotice && images.length > 0 && (
          <div className="absolute bottom-3 right-3 z-30 max-w-xs rounded-xl bg-background/90 text-foreground shadow-lg border border-border/60 px-3 py-2 text-xs flex items-start gap-2 pointer-events-auto">
            <div className="mt-0.5 text-primary">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold leading-none">Imágenes omitidas</p>
              <p className="text-[11px] leading-snug text-muted-foreground">
                {brokenNotice} {brokenImages > 0 ? `(${brokenImages})` : ''}
              </p>
              <button
                type="button"
                className="text-[11px] font-semibold text-primary hover:text-primary/80"
                onClick={() => setBrokenNotice(null)}
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Dialog de zoom - Carrusel pantalla completa con máxima calidad */}
      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent
          className="p-0 border-0 bg-transparent [&>button]:hidden"
          style={{
            maxWidth: '100vw',
            maxHeight: '100vh',
            width: '100vw',
            height: '100vh',
            margin: 0,
          }}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>{selectedImage?.filename || 'Imagen del animal'}</DialogTitle>
            <DialogDescription>
              Vista ampliada de la galería de imágenes del animal.
            </DialogDescription>
          </DialogHeader>
          {selectedImage && (
            <div
              className="fixed inset-0 w-screen h-screen flex items-center justify-center bg-black z-50"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {/* Contenedor de imágenes del carrusel en modal - ocupa todo el viewport */}
              <div className="absolute inset-0 w-screen h-screen">
                {images.map((image, index) => (
                  <div
                    key={image.id}
                    className={`absolute inset-0 w-screen h-screen flex items-center justify-center transition-all duration-700 ease-out ${index === currentIndex
                      ? 'opacity-100 scale-100 z-10 carousel-slide-active'
                      : 'opacity-0 scale-95 z-0 blur-sm carousel-slide-inactive'
                      }`}
                  >
                    {imageErrors.has(image.id) ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-center">
                          <ImageIcon className="w-16 h-16 mx-auto text-white/30 mb-2" />
                          <p className="text-sm text-white/50">No se pudo cargar la imagen</p>
                        </div>
                      </div>
                    ) : (
                      <img
                        src={image.url}
                        alt={image.filename}
                        className="max-w-full max-h-full w-auto h-auto object-contain animate-in fade-in zoom-in duration-700 carousel-image-modal"
                        decoding="async"
                        loading="eager"
                        onError={() => {
                          setImageErrors(prev => new Set(prev).add(image.id));
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Controles de navegación modernos y llamativos */}
              {images.length > 1 && (
                <>
                  {/* Botón anterior - diseño moderno con gradiente */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      goToPrevious();
                    }}
                    disabled={isTransitioning}
                    className="group absolute left-6 sm:left-10 top-1/2 -translate-y-1/2 z-30
                      p-4 sm:p-5
                      rounded-2xl
                      bg-gradient-to-br from-white/20 to-white/5 hover:from-white/30 hover:to-white/10
                      text-white backdrop-blur-xl
                      shadow-2xl border border-white/30
                      disabled:opacity-30 disabled:cursor-not-allowed
                      transform hover:scale-110 hover:-translate-x-1 active:scale-95
                      transition-all duration-300"
                    aria-label="Imagen anterior"
                  >
                    <ChevronLeft className="w-7 h-7 sm:w-9 sm:h-9 drop-shadow-lg group-hover:drop-shadow-2xl transition-all" />
                  </button>

                  {/* Botón siguiente - diseño moderno con gradiente */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      goToNext();
                    }}
                    disabled={isTransitioning}
                    className="group absolute right-6 sm:right-10 top-1/2 -translate-y-1/2 z-30
                      p-4 sm:p-5
                      rounded-2xl
                      bg-gradient-to-br from-white/20 to-white/5 hover:from-white/30 hover:to-white/10
                      text-white backdrop-blur-xl
                      shadow-2xl border border-white/30
                      disabled:opacity-30 disabled:cursor-not-allowed
                      transform hover:scale-110 hover:translate-x-1 active:scale-95
                      transition-all duration-300"
                    aria-label="Imagen siguiente"
                  >
                    <ChevronRight className="w-7 h-7 sm:w-9 sm:h-9 drop-shadow-lg group-hover:drop-shadow-2xl transition-all" />
                  </button>

                  {/* Indicadores de puntos modernos con efecto de brillo */}
                  <div className="absolute bottom-8 sm:bottom-12 left-0 right-0 flex justify-center gap-2 z-30 px-4">
                    <div className="flex gap-2.5 sm:gap-3 bg-gradient-to-r from-white/10 via-white/15 to-white/10 backdrop-blur-xl rounded-full px-6 py-3 sm:px-8 sm:py-4 border border-white/30 shadow-2xl">
                      {images.map((_, index) => (
                        <button
                          key={index}
                          onClick={(e) => {
                            e.stopPropagation();
                            goToIndex(index);
                          }}
                          disabled={isTransitioning}
                          className={`rounded-full transition-all duration-500 disabled:cursor-not-allowed
                            ${index === currentIndex
                              ? 'bg-gradient-to-r from-white via-white/90 to-white shadow-[0_0_20px_rgba(255,255,255,0.8)] w-10 sm:w-12 h-3 sm:h-3.5 scale-110'
                              : 'bg-white/40 hover:bg-white/60 active:bg-white/80 shadow-md w-3 sm:w-3.5 h-3 sm:h-3.5 hover:scale-110'
                            }`}
                          aria-label={`Ir a imagen ${index + 1}`}
                          aria-current={index === currentIndex ? 'true' : 'false'}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Contador de imágenes con diseño moderno */}
                  <div className="absolute top-8 sm:top-10 left-8 sm:left-10 z-30">
                    <div className="bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-xl text-white px-6 py-3 sm:px-7 sm:py-3.5 rounded-2xl text-base sm:text-lg font-semibold shadow-2xl border border-white/30">
                      <span className="drop-shadow-lg">{currentIndex + 1}</span>
                      <span className="mx-2 opacity-60">/</span>
                      <span className="opacity-80 drop-shadow-lg">{images.length}</span>
                    </div>
                  </div>
                </>
              )}

              {/* Botón de cierre moderno - top right */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImage(null);
                }}
                className="group absolute top-8 sm:top-10 right-8 sm:right-10 z-30
                  p-3 sm:p-4
                  rounded-2xl
                  bg-gradient-to-br from-red-500/30 to-red-600/20 hover:from-red-500/50 hover:to-red-600/40
                  text-white backdrop-blur-xl
                  shadow-2xl border border-red-400/40
                  transform hover:scale-110 hover:rotate-90 active:scale-95
                  transition-all duration-300"
                aria-label="Cerrar"
              >
                <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Información minimalista - solo aparece en hover */}
              <div className="absolute bottom-28 sm:bottom-32 left-0 right-0 flex justify-center z-20 px-4 opacity-0 hover:opacity-100 transition-opacity duration-500 group-hover:opacity-100">
                <div className="bg-white/5 backdrop-blur-md text-white/70 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full text-xs sm:text-sm font-light shadow-lg border border-white/10">
                  {images[currentIndex].filename.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '')}
                </div>
              </div>

              {/* Overlay de gradiente sutil en los bordes para efecto cinematográfico */}
              <div className="absolute inset-0 pointer-events-none z-[5]">
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/20" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/20" />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
