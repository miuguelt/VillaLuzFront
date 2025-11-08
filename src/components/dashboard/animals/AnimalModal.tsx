import React, { useState, useCallback, useEffect } from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { AnimalResponse } from '@/types/swaggerTypes';
import { AnimalImageGallery } from './AnimalImageGallery';
import { AnimalImageUpload } from './AnimalImageUpload';

interface AnimalModalProps {
  isOpen: boolean;
  onClose: () => void;
  animal: AnimalResponse & { [k: string]: any };
  breedLabel: string;
  fatherLabel: string;
  motherLabel: string;
  mode?: 'view' | 'edit' | 'create';
  children?: React.ReactNode;
}

/**
 * Modal mejorado para animales
 * - Layout con columna de imágenes y 2 columnas de atributos en desktop
 * - 1 columna en móvil (mobile-first)
 * - Sección de carga de imágenes
 * - Botones con ancho del contenido
 * - Sombras y tipografía mejorada
 */
export function AnimalModal({
  isOpen,
  onClose,
  animal,
  breedLabel,
  fatherLabel,
  motherLabel,
  mode = 'view',
  children
}: AnimalModalProps) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showUpload, setShowUpload] = useState(false);

  // Escuchar evento para abrir la pestaña de subida
  useEffect(() => {
    const handleOpenUploadTab = (e: Event) => {
      const detail = (e as CustomEvent).detail as { animalId?: number } | undefined;
      if (!detail || detail.animalId === animal.id) {
        setShowUpload(true);
      }
    };
    
    window.addEventListener('open-upload-tab', handleOpenUploadTab as EventListener);
    return () => {
      window.removeEventListener('open-upload-tab', handleOpenUploadTab as EventListener);
    };
  }, [animal.id]);

  const gender = animal.sex || animal.gender;
  const birthDate = animal.birth_date
    ? new Date(animal.birth_date).toLocaleDateString('es-ES')
    : '-';
  const createdAt = animal.created_at
    ? new Date(animal.created_at).toLocaleString('es-ES')
    : '-';
  const updatedAt = animal.updated_at
    ? new Date(animal.updated_at).toLocaleString('es-ES')
    : '-';
  const ageMonths = animal.age_in_months ?? '-';
  const ageDays = animal.age_in_days ?? '-';
  const weight = animal.weight ?? '-';
  const status = animal.status || '-';
  const isAdult = animal.is_adult === true ? 'Sí' : animal.is_adult === false ? 'No' : '-';

  const handleUploadSuccess = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
    setShowUpload(false);
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        {/* Header del modal */}
        <DialogHeader className="sticky top-0 z-10 bg-gradient-to-br from-primary/10 to-background border-b px-6 py-4 space-y-1">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-2xl font-bold tracking-tight">
                {animal.record || `Animal #${animal.id}`}
              </DialogTitle>
              <DialogDescription className="text-sm mt-1">
                Información detallada del animal
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={`text-xs font-semibold shadow-sm ${
                  status === 'Sano' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400' :
                  status === 'Enfermo' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400' :
                  'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400'
                }`}
              >
                {status}
              </Badge>
              <Badge
                variant="secondary"
                className={`text-xs font-semibold shadow-sm ${
                  gender === 'Macho' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                  gender === 'Hembra' ? 'bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300' :
                  'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                }`}
              >
                {gender || '-'}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {/* Contenido del modal */}
        <div className="p-6 space-y-6">
          {/* Layout: Columna de imágenes + Columnas de atributos */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Columna de imágenes (1/3 en desktop, full en mobile) */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-gradient-to-br from-accent/50 to-accent/20 rounded-xl p-4 shadow-lg border border-border/50">
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground/80 mb-3">
                  Imágenes
                </h3>

                {/* Galería de imágenes */}
                <AnimalImageGallery
                  animalId={animal.id}
                  showControls={mode !== 'view'}
                  refreshTrigger={refreshTrigger}
                  onGalleryUpdate={() => setRefreshTrigger(prev => prev + 1)}
                />

                {/* Botón para mostrar carga de imágenes */}
                {mode !== 'view' && !showUpload && (
                  <div className="mt-4">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowUpload(true)}
                      className="w-full"
                    >
                      Cargar nuevas imágenes
                    </Button>
                  </div>
                )}

                {/* Componente de carga de imágenes */}
                {showUpload && mode !== 'view' && (
                  <div className="mt-4 bg-card rounded-lg p-4 border shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-foreground/80">
                        Cargar imágenes
                      </h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowUpload(false)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <AnimalImageUpload
                      animalId={animal.id}
                      onUploadSuccess={handleUploadSuccess}
                      maxFiles={10}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Columnas de atributos (2/3 en desktop, full en mobile) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Información básica */}
              <div className="bg-gradient-to-br from-accent/50 to-accent/20 rounded-xl p-5 shadow-lg border border-border/50">
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground/80 mb-4">
                  Información Básica
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <DetailField label="ID" value={animal.id} />
                  <DetailField label="Registro" value={animal.record || '-'} />
                  <DetailField label="Raza" value={breedLabel} />
                  <DetailField label="Sexo" value={gender || '-'} />
                  <DetailField label="Estado" value={status} />
                  <DetailField label="Peso" value={`${weight} kg`} />
                  <DetailField label="Fecha de nacimiento" value={birthDate} />
                  <DetailField label="Edad (días)" value={ageDays} />
                  <DetailField label="Edad (meses)" value={ageMonths} />
                  <DetailField label="Adulto" value={isAdult} />
                </div>
              </div>

              {/* Genealogía */}
              <div className="bg-gradient-to-br from-accent/50 to-accent/20 rounded-xl p-5 shadow-lg border border-border/50">
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground/80 mb-4">
                  Genealogía
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <DetailField label="Padre" value={fatherLabel} />
                  <DetailField label="Madre" value={motherLabel} />
                </div>
              </div>

              {/* Información del sistema */}
              <div className="bg-gradient-to-br from-accent/50 to-accent/20 rounded-xl p-5 shadow-lg border border-border/50">
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground/80 mb-4">
                  Información del Sistema
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <DetailField label="Creado" value={createdAt} />
                  <DetailField label="Actualizado" value={updatedAt} />
                </div>
              </div>

              {/* Notas (si existen) */}
              {animal.notes && (
                <div className="bg-gradient-to-br from-accent/50 to-accent/20 rounded-xl p-5 shadow-lg border border-border/50">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-foreground/80 mb-3">
                    Notas
                  </h3>
                  <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                    {animal.notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Contenido personalizado (si se proporciona) */}
          {children && (
            <div className="border-t pt-6">
              {children}
            </div>
          )}
        </div>

        {/* Footer con botones */}
        <div className="sticky bottom-0 bg-background border-t px-6 py-4">
          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="min-w-[100px]"
            >
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Campo de detalle individual
 */
function DetailField({ label, value }: { label: string; value: any }) {
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/70">
        {label}
      </div>
      <div className="text-sm font-semibold text-foreground">
        {value ?? '-'}
      </div>
    </div>
  );
}
