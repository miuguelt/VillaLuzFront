import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
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
    <Card
      className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:scale-[1.02] border-border/50 bg-card backdrop-blur-sm p-0"
      onClick={onCardClick}
    >
      <div className="relative">
        <AnimalImageBanner
          animalId={animal.id}
          height="200px"
          showControls={true}
          autoPlayInterval={4000}
          hideWhenEmpty={false}
          objectFit="cover"
        />

        <div
          className={`absolute top-0 left-0 right-0 h-1 z-10 ${
            gender === 'Macho' ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
            gender === 'Hembra' ? 'bg-gradient-to-r from-pink-500 to-pink-600' :
            'bg-gradient-to-r from-purple-500 to-purple-600'
          }`}
        />

        {actions && (
          <div className="absolute top-2 right-2 z-10" onClick={(e) => e.stopPropagation()}>
            {actions}
          </div>
        )}
      </div>

      <div className="px-4 pt-3 pb-4">
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <Badge
            variant="outline"
            className={`text-xs font-semibold shadow-sm ${
              status === 'Vivo' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800' :
              status === 'Sano' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800' :
              status === 'Enfermo' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800' :
              'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800'
            }`}
          >
            {status}
          </Badge>
          <Badge
            variant="secondary"
            className={`text-xs font-semibold shadow-sm ${
              gender === 'Macho' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800' :
              gender === 'Hembra' ? 'bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300 border-pink-200 dark:border-pink-800' :
              'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200 dark:border-purple-800'
            }`}
          >
            {gender || '-'}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
          <div>
            <div className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground/70 mb-1">
              Raza
            </div>
            <div className="text-sm font-semibold text-foreground truncate" title={breedLabel}>
              {breedLabel}
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground/70 mb-1">
              Peso
            </div>
            <div className="text-sm font-semibold text-foreground">
              {weight} <span className="text-xs text-muted-foreground">kg</span>
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground/70 mb-1">
              Nacimiento
            </div>
            <div className="text-xs text-foreground">
              {birthDate}
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground/70 mb-1">
              Edad
            </div>
            <div className="text-sm font-semibold text-foreground">
              {ageMonths} <span className="text-xs text-muted-foreground">meses</span>
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground/70 mb-1">
              Adulto
            </div>
            <div className="text-sm font-semibold text-foreground">
              {isAdult}
            </div>
          </div>
        </div>

        {(fatherLabel !== '-' || motherLabel !== '-') && (
          <>
            <div className="border-t border-border/50 my-2.5" />
            <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
              {fatherLabel !== '-' && (
                <div>
                  <div className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground/70 mb-1">
                    Padre
                  </div>
                  {onFatherClick && (animal.idFather || animal.father_id) ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onFatherClick(animal.idFather || animal.father_id);
                      }}
                      className="text-xs font-medium text-primary hover:text-primary/80 hover:underline truncate text-left transition-colors"
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
                <div>
                  <div className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground/70 mb-1">
                    Madre
                  </div>
                  {onMotherClick && (animal.idMother || animal.mother_id) ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onMotherClick(animal.idMother || animal.mother_id);
                      }}
                      className="text-xs font-medium text-primary hover:text-primary/80 hover:underline truncate text-left transition-colors"
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
    </Card>
  );
}
