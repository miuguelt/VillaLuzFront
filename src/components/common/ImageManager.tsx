import React, { useState, useCallback, useEffect } from 'react';
import { Image as ImageIcon, Upload, X, ZoomIn, Download, Star, Trash2, MoreVertical, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
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
import { useToast } from '@/context/ToastContext';

interface ImageManagerProps {
  /** ID del animal asociado */
  animalId: number;
  /** Título para mostrar en el header */
  title?: string;
  /** Callback cuando se actualiza la galería */
  onGalleryUpdate?: () => void;
  /** Mostrar controles de edición */
  showControls?: boolean;
  /** Trigger externo para recargar las imágenes */
  refreshTrigger?: number;
  /** Altura del banner de imágenes */
  bannerHeight?: string;
  /** Modo compacto para integrar en modales */
  compact?: boolean;
  /** Permitir selección múltiple de imágenes */
  allowMultipleSelection?: boolean;
  /** Callback cuando se seleccionan imágenes */
  onSelectionChange?: (selectedImages: AnimalImage[]) => void;
}

interface FilePreview {
  file: File;
  preview: string;
  id: string;
}

export function ImageManager({
  animalId,
  title = 'Galería de Imágenes',
  onGalleryUpdate,
  showControls = true,
  refreshTrigger = 0,
  bannerHeight = "300px",
  compact = false,
  allowMultipleSelection = false,
  onSelectionChange,
}: ImageManagerProps) {
  const { showToast } = useToast();
  const [images, setImages] = useState<AnimalImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<AnimalImage | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [settingPrimaryId, setSettingPrimaryId] = useState<number | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());

  // Estados para la subida de imágenes
  const [showUpload, setShowUpload] = useState(false);
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Estados para selección múltiple
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set());

  // Tipos de archivo permitidos
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const maxFileSize = 5 * 1024 * 1024; // 5MB
  const maxFiles = 10;

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
        setImages([]);
        if (response.errorCode !== 'NOT_FOUND') {
          setError(response.message || 'Error al cargar imágenes');
        }
      }
    } catch (err: any) {
      const status = err.response?.status;

      if (status === 404) {
        setImages([]);
        setError(null);
      } else {
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

  // Escuchar evento global de actualización de imágenes
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

  // Validar archivo
  const validateFile = useCallback(
    (file: File): string | null => {
      if (!allowedTypes.includes(file.type)) {
        return `${file.name}: Tipo de archivo no permitido. Solo se permiten: JPG, PNG, WEBP, GIF`;
      }

      if (file.size > maxFileSize) {
        return `${file.name}: El archivo excede el tamaño máximo de 5MB`;
      }

      return null;
    },
    [allowedTypes, maxFileSize]
  );

  // Procesar archivos seleccionados
  const processFiles = useCallback(
    (selectedFiles: FileList | File[]) => {
      const fileArray = Array.from(selectedFiles);
      const validFiles: FilePreview[] = [];
      const errors: string[] = [];

      for (const file of fileArray) {
        const validationError = validateFile(file);
        if (validationError) {
          errors.push(validationError);
          continue;
        }

        // Verificar que no exceda el límite
        if (files.length + validFiles.length >= maxFiles) {
          errors.push(`Máximo ${maxFiles} imágenes permitidas`);
          break;
        }

        // Crear preview
        const preview = URL.createObjectURL(file);
        validFiles.push({
          file,
          preview,
          id: `${Date.now()}-${Math.random()}`,
        });
      }

      if (errors.length > 0) {
        setUploadError(errors.join('. '));
      } else {
        setUploadError(null);
      }

      if (validFiles.length > 0) {
        setFiles((prev) => [...prev, ...validFiles]);
        setUploadSuccess(null);
      }
    },
    [files.length, maxFiles, validateFile]
  );

  // Manejar drop
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    },
    [processFiles]
  );

  // Manejar drag over
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  // Manejar drag leave
  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  // Manejar cambio de input
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files);
      }
    },
    [processFiles]
  );

  // Remover archivo
  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const fileToRemove = prev.find((f) => f.id === id);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter((f) => f.id !== id);
    });
    setUploadError(null);
    setUploadSuccess(null);
  }, []);

  // Limpiar previews al desmontar
  useEffect(() => {
    return () => {
      files.forEach((f) => URL.revokeObjectURL(f.preview));
    };
  }, [files]);

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

        showToast('Imagen principal establecida correctamente', 'success');
      } catch (err: any) {
        const errorMessage =
          err.response?.data?.message ||
          err.message ||
          'Error al establecer imagen principal';
        setError(errorMessage);
        showToast(errorMessage, 'error');
      } finally {
        setSettingPrimaryId(null);
      }
    },
    [onGalleryUpdate, showToast]
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

        // Actualizar estado local (aunque el backend ya no tenga la imagen)
        setImages((prev) => prev.filter((img) => img.id !== imageId));

        if (onGalleryUpdate) {
          onGalleryUpdate();
        }

        showToast('Imagen eliminada correctamente', 'success');
      } catch (err: any) {
        const status = err?.response?.status;
        const defaultMessage = 'No se pudo eliminar la imagen. Intenta nuevamente.';
        const errorMessage = err?.message || err?.response?.data?.message || defaultMessage;

        if (err?.code === 'AUTH_REQUIRED') {
          const authMessage =
            errorMessage ||
            'Tu sesión expiró. Vuelve a iniciar sesión para administrar las imágenes.';
          setError(authMessage);
          showToast(authMessage, 'error');
        } else {
          setError(errorMessage);
          // Si el backend respondió con 5xx o 401 (sin código custom), mostrar mensaje amigable
          if (status && status >= 500) {
            showToast('El servidor no pudo eliminar la imagen en este momento.', 'error');
          } else {
            showToast(errorMessage, 'error');
          }
        }
      } finally {
        setDeletingId(null);
      }
    },
    [onGalleryUpdate, showToast]
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

  // Subir imágenes
  const handleUpload = useCallback(async () => {
    if (files.length === 0) {
      setUploadError('Debe seleccionar al menos una imagen');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const filesToUpload = files.map((f) => f.file);

      const response = await animalImageService.uploadImages(
        animalId,
        filesToUpload,
        {
          onProgress: (progress) => {
            setUploadProgress(progress);
          },
        }
      );

      if (response.success) {
        setUploadSuccess(
          `${response.data.total_uploaded} imagen(es) subida(s) exitosamente`
        );

        // Limpiar archivos
        files.forEach((f) => URL.revokeObjectURL(f.preview));
        setFiles([]);
        setUploadProgress(0);

        // Callback de éxito
        if (onGalleryUpdate) {
          onGalleryUpdate();
        }

        // Mostrar toast de confirmación
        showToast(
          `✅ ${response.data.total_uploaded} imagen(es) subida(s) correctamente`,
          'success'
        );

        // Despachar evento global para que cualquier galería o banner se refresque
        try {
          window.dispatchEvent(new CustomEvent('animal-images:updated', {
            detail: { animalId, uploaded: response.data.uploaded }
          }));
        } catch {}
      } else {
        throw new Error(response.message || 'Error al subir imágenes');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Error al subir imágenes';
      setUploadError(errorMessage);
      
      // Mostrar toast de error
      showToast(`❌ ${errorMessage}`, 'error');
    } finally {
      setUploading(false);
    }
  }, [files, animalId, onGalleryUpdate, showToast]);

  // Manejar selección de imágenes
  const handleImageSelect = useCallback((image: AnimalImage, isSelected: boolean) => {
    if (!allowMultipleSelection) return;

    setSelectedImages((prev) => {
      const newSet = new Set(prev);
      if (isSelected) {
        newSet.add(image.id);
      } else {
        newSet.delete(image.id);
      }
      return newSet;
    });
  }, [allowMultipleSelection]);

  // Notificar cambios en la selección
  useEffect(() => {
    if (onSelectionChange && allowMultipleSelection) {
      const selectedImagesList = images.filter(img => selectedImages.has(img.id));
      onSelectionChange(selectedImagesList);
    }
  }, [selectedImages, images, onSelectionChange, allowMultipleSelection]);

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

  return (
    <div className={`space-y-4 ${compact ? 'space-y-3' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {images.length} imagen(es)
          </Badge>
          {showControls && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowUpload(!showUpload)}
              className="flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              {showUpload ? 'Cancelar' : 'Subir'}
            </Button>
          )}
        </div>
      </div>

      {/* Sistema de carga de imágenes */}
      {showUpload && (
        <div className="bg-card rounded-lg p-4 border shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold">Cargar imágenes</h4>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowUpload(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Zona de drop */}
          <div
            className={`relative border-2 border-dashed rounded-xl p-8 transition-all ${
              dragActive
                ? 'border-primary bg-primary/5 scale-[1.02]'
                : 'border-border hover:border-primary/50 hover:bg-accent/5'
            } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <input
              type="file"
              multiple
              accept={allowedTypes.join(',')}
              onChange={handleFileChange}
              className="hidden"
              disabled={uploading}
            />

            <div className="flex flex-col items-center justify-center gap-4 text-center">
              <div
                className={`p-4 rounded-full transition-colors ${
                  dragActive ? 'bg-primary text-primary-foreground' : 'bg-accent'
                }`}
              >
                <Upload className="w-8 h-8" />
              </div>

              <div>
                <p className="text-lg font-medium mb-1">
                  {dragActive
                    ? 'Suelta las imágenes aquí'
                    : 'Arrastra y suelta imágenes aquí'}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  o haz clic para seleccionar archivos
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.querySelector('input[type="file"]')?.click()}
                  disabled={uploading}
                >
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Seleccionar Imágenes
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                JPG, PNG, WEBP, GIF - Máximo 5MB por archivo - Hasta {maxFiles}{' '}
                imágenes
              </p>
            </div>
          </div>

          {/* Preview de archivos seleccionados */}
          {files.length > 0 && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  {files.length} imagen(es) seleccionada(s)
                </p>
                {!uploading && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      files.forEach((f) => URL.revokeObjectURL(f.preview));
                      setFiles([]);
                      setUploadError(null);
                    }}
                  >
                    Limpiar todo
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {files.map((filePreview) => (
                  <div
                    key={filePreview.id}
                    className="relative group aspect-square rounded-lg overflow-hidden border bg-accent/5"
                  >
                    <img
                      src={filePreview.preview}
                      alt={filePreview.file.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-colors flex items-center justify-center">
                      {!uploading && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeFile(filePreview.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                      <p className="text-xs text-white truncate">
                        {filePreview.file.name}
                      </p>
                      <p className="text-xs text-white/70">
                        {(filePreview.file.size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Progreso de subida */}
          {uploading && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Subiendo imágenes...</span>
                <span className="font-medium">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}

          {/* Mensajes de error */}
          {uploadError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{uploadError}</AlertDescription>
            </Alert>
          )}

          {/* Mensajes de éxito */}
          {uploadSuccess && (
            <Alert className="border-green-500 bg-green-500/10">
              <AlertCircle className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-700 dark:text-green-400">
                {uploadSuccess}
              </AlertDescription>
            </Alert>
          )}

          {/* Botón de subida */}
          {files.length > 0 && !uploading && (
            <div className="flex justify-end gap-2 mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  files.forEach((f) => URL.revokeObjectURL(f.preview));
                  setFiles([]);
                  setUploadError(null);
                  setUploadSuccess(null);
                }}
              >
                Cancelar
              </Button>
              <Button type="button" onClick={handleUpload}>
                <Upload className="w-4 h-4 mr-2" />
                Subir {files.length} Imagen(es)
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Galería de imágenes */}
      {images.length === 0 && !showUpload ? (
        <div className="flex justify-center py-8">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 px-6 py-3 border-2 border-dashed hover:border-primary hover:bg-primary/5 transition-all rounded-lg"
          >
            <ImageIcon className="w-5 h-5" />
            Cargar nuevas imágenes
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {images.map((image) => (
            <div
              key={image.id}
              className={`relative group aspect-square rounded-lg overflow-hidden border bg-accent/5 hover:shadow-lg transition-all ${
                allowMultipleSelection && selectedImages.has(image.id) ? 'ring-2 ring-primary' : ''
              }`}
            >
              {/* Checkbox para selección múltiple */}
              {allowMultipleSelection && (
                <div className="absolute top-2 left-2 z-10">
                  <input
                    type="checkbox"
                    checked={selectedImages.has(image.id)}
                    onChange={(e) => handleImageSelect(image, e.target.checked)}
                    className="w-4 h-4 rounded border-2 border-primary/50"
                  />
                </div>
              )}

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
                  className="w-full h-full object-cover cursor-pointer transition-transform duration-300 hover:scale-110"
                  onClick={() => setSelectedImage(image)}
                  loading="lazy"
                  style={{
                    imageRendering: 'auto',
                  }}
                  onError={() => {
                    setImageErrors(prev => new Set(prev).add(image.id));
                  }}
                />
              )}

              {/* Badge de imagen principal */}
              {image.is_primary && (
                <div className="absolute top-2 right-2">
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

              {/* Menú desplegable de acciones */}
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
      )}

      {/* Modal de vista previa - pantalla completa */}
      <Dialog
        open={selectedImage !== null}
        onOpenChange={(open) => !open && setSelectedImage(null)}
      >
        <DialogContent className="max-w-[100vw] max-h-[100vh] w-screen h-screen p-0 bg-black border-none overflow-hidden rounded-none m-0 fixed inset-0">
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
            <div className="absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden bg-black group">
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
                  className="w-full h-full"
                  style={{
                    objectFit: 'contain',
                    objectPosition: 'center',
                    imageRendering: '-webkit-optimize-contrast',
                    WebkitFontSmoothing: 'antialiased',
                    MozOsxFontSmoothing: 'grayscale',
                    backfaceVisibility: 'hidden',
                    transform: 'translateZ(0)',
                    willChange: 'transform',
                    maxWidth: '100%',
                    maxHeight: '100%',
                    width: 'auto',
                    height: 'auto',
                  }}
                  decoding="async"
                  fetchPriority="high"
                  onError={() => {
                    setImageErrors(prev => new Set(prev).add(selectedImage.id));
                  }}
                />
              )}

              {/* Información de la imagen - aparece solo en hover */}
              <div className="absolute bottom-4 left-0 right-0 flex justify-center z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 group-hover:opacity-100">
                <div className="bg-black/80 backdrop-blur-md text-white px-6 py-3 rounded-full text-sm font-medium shadow-2xl border border-white/10">
                  {selectedImage.filename} • {(selectedImage.file_size / 1024).toFixed(0)} KB • {selectedImage.mime_type}
                  {selectedImage.is_primary && (
                    <span className="ml-2 text-yellow-400">⭐ Principal</span>
                  )}
                </div>
              </div>

              {/* Indicador de cierre - aparece solo en hover */}
              <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="bg-black/80 backdrop-blur-md text-white/70 px-4 py-2 rounded-full text-xs font-medium shadow-2xl border border-white/10">
                  ESC para cerrar
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
