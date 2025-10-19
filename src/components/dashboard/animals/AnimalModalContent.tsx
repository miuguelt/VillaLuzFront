import React, { useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AnimalResponse } from '@/types/swaggerTypes';
import { AnimalImageBanner } from './AnimalImageBanner';
import { AnimalImageGallery } from './AnimalImageGallery';
import { AnimalImageUpload } from './AnimalImageUpload';

interface AnimalModalContentProps {
  animal: AnimalResponse & { [k: string]: any };
  breedLabel: string;
  fatherLabel: string;
  motherLabel: string;
  onFatherClick?: (fatherId: number) => void;
  onMotherClick?: (motherId: number) => void;
}

export function AnimalModalContent({
  animal,
  breedLabel,
  fatherLabel,
  motherLabel,
  onFatherClick,
  onMotherClick
}: AnimalModalContentProps) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showUpload, setShowUpload] = useState(false);

  const gender = animal.sex || animal.gender;
  const birthDate = animal.birth_date
    ? new Date(animal.birth_date).toLocaleDateString('es-ES')
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
    <div className="space-y-6">
      {/* Banner de carrusel - Al principio */}
      <div className="relative -mx-6 -mt-6">
        <AnimalImageBanner
          animalId={animal.id}
          height="400px"
          showControls={true}
          autoPlayInterval={5000}
          hideWhenEmpty={false}
          objectFit="cover"
          refreshTrigger={refreshTrigger}
        />
      </div>

      {/* Información del animal - En el centro */}
      <div className="space-y-6">
        {/* Grid responsive: 1 columna en móvil, 2 columnas en pantallas grandes */}
        <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6">
          {/* Información Básica */}
          <div className="bg-gradient-to-br from-accent/50 to-accent/20 rounded-xl p-5 shadow-lg border border-border/50">
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground/80 mb-4">
              Información Básica
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <DetailField label="ID" value={animal.id} />
              <DetailField label="Registro" value={animal.record || '-'} />
              <DetailField label="Raza" value={breedLabel} />
              <DetailField label="Sexo" value={gender || '-'}>
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
              </DetailField>
              <DetailField label="Estado" value={status}>
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
              </DetailField>
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
              <div className="space-y-1.5">
                <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/70">
                  Padre
                </div>
                {onFatherClick && (animal.idFather || animal.father_id) ? (
                  <button
                    onClick={() => onFatherClick(animal.idFather || animal.father_id)}
                    className="text-sm font-semibold text-primary hover:text-primary/80 hover:underline text-left transition-colors"
                  >
                    {fatherLabel}
                  </button>
                ) : (
                  <div className="text-sm font-semibold text-foreground">
                    {fatherLabel ?? '-'}
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/70">
                  Madre
                </div>
                {onMotherClick && (animal.idMother || animal.mother_id) ? (
                  <button
                    onClick={() => onMotherClick(animal.idMother || animal.mother_id)}
                    className="text-sm font-semibold text-primary hover:text-primary/80 hover:underline text-left transition-colors"
                  >
                    {motherLabel}
                  </button>
                ) : (
                  <div className="text-sm font-semibold text-foreground">
                    {motherLabel ?? '-'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Notas - ancho completo */}
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

      {/* Galería e imágenes - Al final */}
      <div className="bg-gradient-to-br from-accent/50 to-accent/20 rounded-xl p-5 shadow-lg border border-border/50">
        <h3 className="text-sm font-bold uppercase tracking-wider text-foreground/80 mb-4">
          Galería
        </h3>

        {/* Galería con controles de eliminación siempre habilitados */}
        <AnimalImageGallery
          animalId={animal.id}
          showControls={true}
          refreshTrigger={refreshTrigger}
          onGalleryUpdate={() => setRefreshTrigger(prev => prev + 1)}
        />

        {/* Botón para cargar imágenes - siempre disponible */}
        {!showUpload && (
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

        {/* Sistema de carga de imágenes */}
        {showUpload && (
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
  );
}

function DetailField({
  label,
  value,
  children
}: {
  label: string;
  value: any;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/70">
        {label}
      </div>
      {children || (
        <div className="text-sm font-semibold text-foreground">
          {value ?? '-'}
        </div>
      )}
    </div>
  );
}
