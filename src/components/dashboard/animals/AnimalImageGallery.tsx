import React, { useState, useEffect, useCallback } from 'react';
import {
  Image as ImageIcon,
  Star,
  Trash2,
  X,
  ZoomIn,
  Download,
  Loader2,
  AlertCircle,
  MoreVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  animalImageService,
  type AnimalImage,
} from '@/services/animalImageService';

interface AnimalImageGalleryProps {
  animalId: number;
  /** Callback cuando se actualiza la galería */
  onGalleryUpdate?: () => void;
  /** Mostrar controles de edición */
  showControls?: boolean;
  /** Trigger externo para recargar las imágenes */
  refreshTrigger?: number;
}

export function AnimalImageGallery({
  animalId,
  onGalleryUpdate,
  showControls = true,
  refreshTrigger = 0,
}: AnimalImageGalleryProps) {
  const [images, setImages] = useState<AnimalImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<AnimalImage | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [settingPrimaryId, setSettingPrimaryId] = useState<number | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());

  // Cargar imágenes
  const fetchImages = useCallback(async () => {
    if (!animalId || animalId <= 0) {
      setError('ID de animal inválido');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await animalImageService.getAnimalImages(animalId);

      if (response.success) {
        setImages(response.data.images || []);
      } else {
        // No mostrar como error si simplemente no hay imágenes
        setImages([]);
      }
    } catch (err: any) {
      const status = err.response?.status;

      // 404 significa que no hay imágenes para este animal (no es un error)
      if (status === 404) {
        setImages([]);
        setError(null);
      } else {
        // Otros errores sí son problemáticos
        const errorMessage =
          err.response?.data?.message ||
          err.message ||
          'Error al cargar imágenes';
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, [animalId]);

  // Cargar imágenes al montar y cuando cambie el trigger
  useEffect(() => {
    fetchImages();
  }, [fetchImages, refreshTrigger]);

  // Escuchar evento global de actualización de imágenes para refrescar sin recargar la página
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { animalId?: number } | undefined;
      if (!detail || detail.animalId === animalId) {
        fetchImages();
      }
    };
    window.addEventListener('animal-images:updated', handler as EventListener);
    return () => {
      window.removeEventListener('animal-images:updated', handler as EventListener);
    };
  }, [animalId, fetchImages]);

  // Establecer imagen principal
  const handleSetPrimary = useCallback(
    async (imageId: number) => {
      setSettingPrimaryId(imageId);
      setError(null);

      try {
        await animalImageService.setPrimaryImage(imageId);

        // Actualizar estado local
        setImages((prev) =>
          prev.map((img) => ({
            ...img,
            is_primary: img.id === imageId,
          }))
        );

        if (onGalleryUpdate) {
          onGalleryUpdate();
        }
      } catch (err: any) {
        const errorMessage =
          err.response?.data?.message ||
          err.message ||
          'Error al establecer imagen principal';
        setError(errorMessage);
      } finally {
        setSettingPrimaryId(null);
      }
    },
    [onGalleryUpdate]
  );

  // Eliminar imagen
  const handleDelete = useCallback(
    async (imageId: number) => {
      if (!confirm('¿Está seguro de eliminar esta imagen?')) {
        return;
      }

      setDeletingId(imageId);
      setError(null);

      try {
        await animalImageService.deleteImage(imageId);

        // Actualizar estado local
        setImages((prev) => prev.filter((img) => img.id !== imageId));

        if (onGalleryUpdate) {
          onGalleryUpdate();
        }
      } catch (err: any) {
        const errorMessage =
          err.response?.data?.message ||
          err.message ||
          'Error al eliminar imagen';
        setError(errorMessage);
      } finally {
        setDeletingId(null);
      }
    },
    [onGalleryUpdate]
  );

  // Descargar imagen
  const handleDownload = useCallback((image: AnimalImage) => {
    const link = document.createElement('a');
    link.href = image.url;
    link.download = image.filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">Cargando imágenes...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && images.length === 0) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  // Empty state
  if (images.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed rounded-xl">
        <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-lg font-medium mb-1">No hay imágenes</p>
        <p className="text-sm text-muted-foreground">
          Sube algunas imágenes para comenzar
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Error temporal (cuando hay imágenes pero falla una operación) */}
      {error && images.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Info */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {images.length} imagen(es)
        </p>
      </div>

      {/* Galería */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {images.map((image) => (
          <div
            key={image.id}
            className="relative group aspect-square rounded-lg overflow-hidden border bg-accent/5 hover:shadow-lg transition-all"
          >
            {/* Imagen */}
            {imageErrors.has(image.id) ? (
              <div className="w-full h-full flex items-center justify-center bg-muted/20 cursor-pointer" onClick={() => setSelectedImage(image)}>
                <div className="text-center">
                  <ImageIcon className="w-8 h-8 mx-auto text-muted-foreground mb-1" />
                  <p className="text-xs text-muted-foreground">Error</p>
                </div>
              </div>
            ) : (
              <img
                src={image.url}
                alt={image.filename}
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => setSelectedImage(image)}
                loading="lazy"
                onError={() => {
                  setImageErrors(prev => new Set(prev).add(image.id));
                }}
              />
            )}

            {/* Badge de imagen principal */}
            {image.is_primary && (
              <div className="absolute top-2 left-2">
                <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">
                  <Star className="w-3 h-3 mr-1 fill-current" />
                  Principal
                </Badge>
              </div>
            )}

            {/* Botón de ver imagen */}
            <div
              className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center cursor-pointer"
              onClick={() => setSelectedImage(image)}
            >
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                title="Ver en grande"
              >
                <ZoomIn className="w-5 h-5" />
              </Button>
            </div>

            {/* Menú desplegable de acciones (esquina superior derecha) */}
            {showControls && (
              <div className="absolute top-2 right-2 z-10">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImage(image);
                      }}
                    >
                      <ZoomIn className="w-4 h-4 mr-2" />
                      Ver en grande
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(image);
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Descargar
                    </DropdownMenuItem>

                    {!image.is_primary && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetPrimary(image.id);
                          }}
                          disabled={settingPrimaryId === image.id}
                        >
                          {settingPrimaryId === image.id ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Star className="w-4 h-4 mr-2" />
                          )}
                          Establecer como principal
                        </DropdownMenuItem>
                      </>
                    )}

                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(image.id);
                      }}
                      disabled={deletingId === image.id}
                      className="text-destructive focus:text-destructive"
                    >
                      {deletingId === image.id ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 mr-2" />
                      )}
                      Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            {/* Info del archivo */}
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="text-xs text-white truncate" title={image.filename}>
                {image.filename}
              </p>
              <p className="text-xs text-white/70">
                {(image.file_size / 1024).toFixed(0)} KB
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de vista previa - pantalla completa */}
      <Dialog
        open={selectedImage !== null}
        onOpenChange={(open) => !open && setSelectedImage(null)}
      >
        <DialogContent className="max-w-[100vw] max-h-[100vh] w-screen h-screen p-0 bg-black/98 border-none overflow-hidden rounded-none">
          <DialogHeader className="sr-only">
            <DialogTitle className="flex items-center gap-2">
              {selectedImage?.is_primary && (
                <Star className="w-5 h-5 text-yellow-500 fill-current" />
              )}
              {selectedImage?.filename}
            </DialogTitle>
            <DialogDescription>
              {selectedImage &&
                `${(selectedImage.file_size / 1024).toFixed(2)} KB - ${
                  selectedImage.mime_type
                } - Subida el ${new Date(
                  selectedImage.created_at
                ).toLocaleDateString('es-ES')}`}
            </DialogDescription>
          </DialogHeader>

          {selectedImage && (
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Imagen a pantalla completa */}
              {imageErrors.has(selectedImage.id) ? (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <ImageIcon className="w-16 h-16 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No se pudo cargar la imagen</p>
                  </div>
                </div>
              ) : (
                <img
                  src={selectedImage.url}
                  alt={selectedImage.filename}
                  className="w-auto h-auto object-contain"
                  style={{ 
                    imageRendering: 'auto',
                    maxWidth: '100vw',
                    maxHeight: '100vh',
                    width: 'auto',
                    height: 'auto'
                  }}
                  onError={() => {
                    setImageErrors(prev => new Set(prev).add(selectedImage.id));
                  }}
                />
              )}

              {/* Información de la imagen */}
              <div className="absolute bottom-8 left-0 right-0 flex justify-center z-10">
                <div className="bg-black/80 backdrop-blur-md text-white px-6 py-3 rounded-full text-sm font-medium shadow-2xl border border-white/10">
                  {selectedImage.filename} • {(selectedImage.file_size / 1024).toFixed(0)} KB • {selectedImage.mime_type}
                  {selectedImage.is_primary && (
                    <span className="ml-2 text-yellow-400">⭐ Principal</span>
                  )}
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
    </div>
  );
}
