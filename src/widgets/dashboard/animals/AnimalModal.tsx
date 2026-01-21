import React, { useState, useCallback, useEffect } from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { AnimalResponse } from '@/shared/api/generated/swaggerTypes';
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

import { GenericModal } from '@/shared/ui/common/GenericModal';

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

  const footer = (
    <div className="flex items-center justify-end gap-3 p-4 bg-background/50 backdrop-blur-md border-t">
      <Button
        type="button"
        variant="outline"
        onClick={onClose}
        className="min-w-[100px]"
      >
        Cerrar
      </Button>
    </div>
  );

  return (
    <GenericModal
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title={animal.record || `Animal #${animal.id}`}
      description="Información detallada del animal"
      size="7xl"
      footer={footer}
    >
      <div className="space-y-6">
        {/* Chips de estado superior */}
        <div className="flex items-center gap-2 mb-4">
          <Badge
            variant="outline"
            className={`text-xs font-semibold shadow-sm ${status === 'Sano' ? 'bg-green-50/50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400' :
              status === 'Enfermo' ? 'bg-red-50/50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400' :
                'bg-blue-50/50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400'
              }`}
          >
            {status}
          </Badge>
          <Badge
            variant="secondary"
            className={`text-xs font-semibold shadow-sm ${gender === 'Macho' ? 'bg-blue-100/50 text-blue-800 dark:bg-blue-950/30 dark:text-blue-300' :
              gender === 'Hembra' ? 'bg-pink-100/50 text-pink-800 dark:bg-pink-950/30 dark:text-pink-300' :
                'bg-purple-100/50 text-purple-800 dark:bg-purple-950/30 dark:text-purple-300'
              }`}
          >
            {gender || '-'}
          </Badge>
        </div>

        {/* Layout: Columna de imágenes + Columnas de atributos */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna de imágenes (1/3 en desktop, full en mobile) */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-gradient-to-br from-accent/30 to-accent/10 rounded-xl p-4 shadow-lg border border-border/30 backdrop-blur-sm">
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
                <div className="mt-4 bg-card/50 rounded-lg p-4 border border-border/30 shadow-sm backdrop-blur-sm">
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
            <div className="bg-white/40 dark:bg-slate-800/20 rounded-xl p-5 shadow-lg border border-border/30 backdrop-blur-md">
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground/80 mb-4">
                Información Básica
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
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
            <div className="bg-white/40 dark:bg-slate-800/20 rounded-xl p-5 shadow-lg border border-border/30 backdrop-blur-md">
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground/80 mb-4">
                Genealogía
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <DetailField label="Padre" value={fatherLabel} />
                <DetailField label="Madre" value={motherLabel} />
              </div>
            </div>

            {/* Información del sistema */}
            <div className="bg-white/40 dark:bg-slate-800/20 rounded-xl p-5 shadow-lg border border-border/30 backdrop-blur-md">
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
              <div className="bg-white/40 dark:bg-slate-800/20 rounded-xl p-5 shadow-lg border border-border/30 backdrop-blur-md">
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
          <div className="border-t border-border/30 pt-6">
            {children}
          </div>
        )}
      </div>
    </GenericModal>
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
