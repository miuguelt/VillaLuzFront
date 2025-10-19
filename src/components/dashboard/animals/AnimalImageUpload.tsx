import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, Image as ImageIcon, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { animalImageService } from '@/services/animalImageService';

interface AnimalImageUploadProps {
  animalId: number;
  onUploadSuccess?: (uploadedImages: any[]) => void;
  onUploadError?: (error: Error) => void;
  maxFiles?: number;
  compress?: boolean;
  quality?: number;
}

interface FilePreview {
  file: File;
  preview: string;
  id: string;
}

export function AnimalImageUpload({
  animalId,
  onUploadSuccess,
  onUploadError,
  maxFiles = 20,
  compress = true,
  quality = 0.8,
}: AnimalImageUploadProps) {
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tipos de archivo permitidos
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const maxFileSize = 5 * 1024 * 1024; // 5MB

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
        setError(errors.join('. '));
      } else {
        setError(null);
      }

      if (validFiles.length > 0) {
        setFiles((prev) => [...prev, ...validFiles]);
        setSuccess(null);
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
    setError(null);
    setSuccess(null);
  }, []);

  // Limpiar previews al desmontar
  React.useEffect(() => {
    return () => {
      files.forEach((f) => URL.revokeObjectURL(f.preview));
    };
  }, [files]);

  // Subir imágenes
  const handleUpload = useCallback(async () => {
    if (files.length === 0) {
      setError('Debe seleccionar al menos una imagen');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError(null);
    setSuccess(null);

    try {
      const filesToUpload = files.map((f) => f.file);

      const response = await animalImageService.uploadImages(
        animalId,
        filesToUpload,
        {
          compress,
          quality,
          onProgress: (progress) => {
            setUploadProgress(progress);
          },
        }
      );

      if (response.success) {
        setSuccess(
          `${response.data.total_uploaded} imagen(es) subida(s) exitosamente`
        );

        // Limpiar archivos
        files.forEach((f) => URL.revokeObjectURL(f.preview));
        setFiles([]);
        setUploadProgress(0);

        // Callback de éxito
        if (onUploadSuccess) {
          onUploadSuccess(response.data.uploaded);
        }
      } else {
        throw new Error(response.message || 'Error al subir imágenes');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Error al subir imágenes';
      setError(errorMessage);

      if (onUploadError) {
        onUploadError(err);
      }
    } finally {
      setUploading(false);
    }
  }, [files, animalId, compress, quality, onUploadSuccess, onUploadError]);

  return (
    <div className="space-y-4">
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
          ref={fileInputRef}
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
              onClick={() => fileInputRef.current?.click()}
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
        <div className="space-y-3">
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
                  setError(null);
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
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Subiendo imágenes...</span>
            <span className="font-medium">{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
        </div>
      )}

      {/* Mensajes de error */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Mensajes de éxito */}
      {success && (
        <Alert className="border-green-500 bg-green-500/10">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <AlertDescription className="text-green-700 dark:text-green-400">
            {success}
          </AlertDescription>
        </Alert>
      )}

      {/* Botón de subida */}
      {files.length > 0 && !uploading && (
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              files.forEach((f) => URL.revokeObjectURL(f.preview));
              setFiles([]);
              setError(null);
              setSuccess(null);
            }}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={handleUpload}>
            <Upload className="w-4 h-4 mr-2" />
            Subir {files.length} Imagen(es)
            {compress && ' (Con compresión)'}
          </Button>
        </div>
      )}
    </div>
  );
}
