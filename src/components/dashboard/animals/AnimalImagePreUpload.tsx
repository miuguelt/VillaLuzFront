import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FilePreview {
  file: File;
  preview: string;
  id: string;
}

interface AnimalImagePreUploadProps {
  files: File[];
  onChange: (files: File[]) => void;
  maxFiles?: number;
}

/**
 * Componente para seleccionar imágenes durante la creación de un animal
 * Las imágenes se almacenan localmente y se subirán después de crear el animal
 */
export function AnimalImagePreUpload({
  files: _externalFiles,
  onChange,
  maxFiles = 20,
}: AnimalImagePreUploadProps) {
  const [filePreviews, setFilePreviews] = useState<FilePreview[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tipos de archivo permitidos
  const allowedTypes = useMemo(
    () => ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    []
  );
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
        if (filePreviews.length + validFiles.length >= maxFiles) {
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
        const newPreviews = [...filePreviews, ...validFiles];
        setFilePreviews(newPreviews);
        onChange(newPreviews.map(fp => fp.file));
      }
    },
    [filePreviews, maxFiles, validateFile, onChange]
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
    setFilePreviews((prev) => {
      const fileToRemove = prev.find((f) => f.id === id);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      const newPreviews = prev.filter((f) => f.id !== id);
      onChange(newPreviews.map(fp => fp.file));
      return newPreviews;
    });
    setError(null);
  }, [onChange]);

  // Limpiar todos
  const clearAll = useCallback(() => {
    filePreviews.forEach((f) => URL.revokeObjectURL(f.preview));
    setFilePreviews([]);
    onChange([]);
    setError(null);
  }, [filePreviews, onChange]);

  // Limpiar previews al desmontar o cuando cambien
  React.useEffect(() => {
    return () => {
      filePreviews.forEach((f) => URL.revokeObjectURL(f.preview));
    };
  }, [filePreviews]);

  return (
    <div className="space-y-4">
      {/* Zona de drop */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-6 transition-all ${
          dragActive
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : 'border-border hover:border-primary/50 hover:bg-accent/5'
        }`}
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
        />

        <div className="flex flex-col items-center justify-center gap-3 text-center">
          <div
            className={`p-3 rounded-full transition-colors ${
              dragActive ? 'bg-primary text-primary-foreground' : 'bg-accent'
            }`}
          >
            <Upload className="w-6 h-6" />
          </div>

          <div>
            <p className="text-sm font-medium mb-1">
              {dragActive
                ? 'Suelta las imágenes aquí'
                : 'Arrastra y suelta imágenes'}
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              o haz clic para seleccionar
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon className="w-4 h-4 mr-2" />
              Seleccionar
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            JPG, PNG, WEBP, GIF - Max 5MB - Hasta {maxFiles} imágenes
          </p>
        </div>
      </div>

      {/* Mensaje de error */}
      {error && (
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg p-3">
          {error}
        </div>
      )}

      {/* Preview de archivos seleccionados */}
      {filePreviews.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {filePreviews.length} imagen(es) seleccionada(s)
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearAll}
            >
              Limpiar todo
            </Button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filePreviews.map((filePreview) => (
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
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8"
                    onClick={() => removeFile(filePreview.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/80 to-transparent">
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

          <p className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-2.5">
            💡 <strong>Nota:</strong> Las imágenes se subirán automáticamente después de crear el animal
          </p>
        </div>
      )}
    </div>
  );
}
