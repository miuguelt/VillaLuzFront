import React from 'react';
import { Badge } from '@/components/ui/badge';
import { AnimalResponse } from '@/types/swaggerTypes';
import { AnimalImageBanner } from './AnimalImageBanner';

interface AnimalCardProps {
  animal: AnimalResponse & { [k: string]: any };
  breedLabel: string;
  fatherLabel: string;
  motherLabel: string;
  onCardClick?: () => void;
  actions?: React.ReactNode;
  onFatherClick?: (fatherId: number) => void;
  onMotherClick?: (motherId: number) => void;
}

export function AnimalCard({
  animal,
  breedLabel,
  fatherLabel,
  motherLabel,
  onCardClick,
  actions,
  onFatherClick,
  onMotherClick
}: AnimalCardProps) {
  const gender = animal.sex || animal.gender;
  const birthDate = animal.birth_date
    ? new Date(animal.birth_date).toLocaleDateString('es-ES')
    : '-';
  const ageMonths = animal.age_in_months ?? '-';
  const weight = animal.weight ?? '-';
  const status = animal.status || '-';
  const isAdult = animal.is_adult === true ? 'Sí' : animal.is_adult === false ? 'No' : '-';

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Banner de imágenes - LO PRIMERO, sin padding, llega al borde */}
      <div className="relative flex-shrink-0">
        <AnimalImageBanner
          animalId={animal.id}
          height="220px"
          showControls={true}
          autoPlayInterval={4000}
          hideWhenEmpty={false}
          objectFit="cover"
        />

        {/* Barra de color superior según género */}
        <div
          className={`absolute top-0 left-0 right-0 h-1 z-10 ${
            gender === 'Macho' ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
            gender === 'Hembra' ? 'bg-gradient-to-r from-pink-500 to-pink-600' :
            'bg-gradient-to-r from-purple-500 to-purple-600'
          }`}
        />

        {/* Menú de acciones flotante */}
        {actions && (
          <div className="absolute top-2 right-2 z-10" onClick={(e) => e.stopPropagation()}>
            {actions}
          </div>
        )}
      </div>

      {/* Contenido de la tarjeta - MÁXIMO APROVECHAMIENTO DEL ESPACIO */}
      <div className="flex-1 flex flex-col px-2.5 py-2.5 space-y-2 min-h-0">
        {/* Registro del animal e identificación - Ocupa todo el ancho */}
        <div className="flex items-center justify-between gap-2 -mx-0.5">
          <h3 className="text-base font-bold text-foreground truncate flex-1 min-w-0">
            {animal.record || `#${animal.id}`}
          </h3>
          <Badge
            variant="outline"
            className={`text-xs font-semibold px-2 py-0.5 flex-shrink-0 ${
              status === 'Sano' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800' :
              status === 'Enfermo' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800' :
              'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800'
            }`}
          >
            {gender === 'Macho' ? '♂' : gender === 'Hembra' ? '♀' : '•'}
          </Badge>
        </div>

        {/* Grid de información - 2 columnas optimizado para máximo ancho */}
        <div className="grid grid-cols-2 gap-x-2 gap-y-2">
          <InfoField label="Raza" value={breedLabel} truncate />
          <InfoField label="Peso" value={`${weight} kg`} />
          <InfoField label="Nacimiento" value={birthDate} small />
          <InfoField label="Edad" value={`${ageMonths} meses`} />
        </div>

        {/* Genealogía - si existe - Ocupa todo el ancho */}
        {(fatherLabel !== '-' || motherLabel !== '-') && (
          <>
            <div className="border-t border-border/30 -mx-0.5" />
            <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
              {fatherLabel !== '-' && (
                <div className="min-w-0">
                  <div className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground/70 mb-0.5">
                    Padre
                  </div>
                  {onFatherClick && (animal.idFather || animal.father_id) ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onFatherClick(animal.idFather || animal.father_id);
                      }}
                      className="text-xs font-medium text-primary hover:text-primary/80 hover:underline truncate w-full text-left transition-colors"
                      title={fatherLabel}
                    >
                      {fatherLabel}
                    </button>
                  ) : (
                    <div className="text-xs font-medium text-foreground truncate" title={fatherLabel}>
                      {fatherLabel}
                    </div>
                  )}
                </div>
              )}

              {motherLabel !== '-' && (
                <div className="min-w-0">
                  <div className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground/70 mb-0.5">
                    Madre
                  </div>
                  {onMotherClick && (animal.idMother || animal.mother_id) ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMotherClick(animal.idMother || animal.mother_id);
                      }}
                      className="text-xs font-medium text-primary hover:text-primary/80 hover:underline truncate w-full text-left transition-colors"
                      title={motherLabel}
                    >
                      {motherLabel}
                    </button>
                  ) : (
                    <div className="text-xs font-medium text-foreground truncate" title={motherLabel}>
                      {motherLabel}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Componente auxiliar para campos de información
function InfoField({
  label,
  value,
  truncate = false,
  small = false
}: {
  label: string;
  value: string;
  truncate?: boolean;
  small?: boolean;
}) {
  return (
    <div className="min-w-0">
      <div className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground/70 mb-0.5">
        {label}
      </div>
      <div
        className={`font-semibold text-foreground ${truncate ? 'truncate' : ''} ${small ? 'text-xs' : 'text-sm'}`}
        title={truncate ? value : undefined}
      >
        {value}
      </div>
    </div>
  );
}
