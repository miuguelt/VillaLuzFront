import React from 'react';
import { Badge } from '@/shared/ui/badge';
import { AnimalResponse } from '@/shared/api/generated/swaggerTypes';
import { AnimalImageBanner } from './AnimalImageBanner';
import { Button } from '@/shared/ui/button';
import { Eye, Trash2 } from 'lucide-react';
import { AnimalActionsMenu } from '@/widgets/dashboard/AnimalActionsMenu';

interface AnimalCardProps {
  animal: AnimalResponse & { [k: string]: any };
  breedLabel: string;
  fatherLabel: string;
  motherLabel: string;
  onCardClick?: () => void;
  actions?: React.ReactNode;
  onFatherClick?: (fatherId: number) => void;
  onMotherClick?: (motherId: number) => void;
  hasAlerts?: boolean;
  onRemoveFromField?: () => void;
  hideFooterActions?: boolean;
}

export function AnimalCard({
  animal,
  breedLabel,
  fatherLabel,
  motherLabel,
  onCardClick,
  actions,
  onFatherClick,
  onMotherClick,
  hasAlerts = false,
  onRemoveFromField,
  hideFooterActions = false
}: AnimalCardProps) {
  const gender = animal.sex || animal.gender;
  const birthDate = animal.birth_date
    ? new Date(animal.birth_date).toLocaleDateString('es-ES')
    : '-';
  // Calculate age more accurately if possible, otherwise use age_in_months
  const ageMonths = animal.age_in_months ?? '-';
  const weight = animal.weight ? `${animal.weight} kg` : '-';
  const status = animal.status || '-';

  const handleCardClick = () => {
    if (onCardClick) {
      onCardClick();
    }
  };

  return (
    <div
      className="flex flex-col h-full bg-card rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group"
      onClick={onCardClick ? handleCardClick : undefined}
    >
      {/* Banner de Imagen */}
      <div className="relative w-full aspect-[4/3] overflow-hidden">
        <AnimalImageBanner
          animalId={animal.id}
          height="100%"
          showControls={false}
          autoPlayInterval={0}
          hideWhenEmpty={false}
          objectFit="cover"
        />

        {/* Overlay de gradiente sutil al fondo */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-50" />

        {/* Badge de Estado Absoluto */}
        {hasAlerts && (
          <div className="absolute top-2 left-2 z-10">
            <Badge variant="destructive" className="animate-pulse shadow-sm">
              ALERTA
            </Badge>
          </div>
        )}
      </div>

      {/* Contenido */}
      <div className="flex flex-col flex-1 p-4 space-y-4">

        {/* Header: Nombre y Sexo */}
        <div className="flex items-start justify-between">
          <div className="space-y-0.5">
            <h3 className="text-lg font-bold text-foreground leading-tight line-clamp-1" title={animal.record || `#${animal.id}`}>
              {animal.record || animal.name || `Animal #${animal.id}`}
            </h3>
            {/* Status Badge pequeño */}
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${status === 'Sano' ? 'bg-green-500' :
                  status === 'Enfermo' ? 'bg-red-500' :
                    'bg-blue-500'
                }`} />
              <span className="text-xs text-muted-foreground font-medium">{status}</span>
            </div>
          </div>

          <div className={`
                        flex items-center justify-center w-8 h-8 rounded-full border shadow-sm
                        ${gender === 'Macho'
              ? 'bg-blue-50 border-blue-100 text-blue-600'
              : gender === 'Hembra'
                ? 'bg-pink-50 border-pink-100 text-pink-600'
                : 'bg-gray-50 border-gray-100 text-gray-600'
            }
                    `}>
            {gender === 'Macho' ? '♂' : gender === 'Hembra' ? '♀' : '?'}
          </div>
        </div>

        {/* Grid de Datos */}
        <div className="grid grid-cols-2 gap-y-3 gap-x-2">
          <div className="space-y-0.5">
            <p className="text-[10px] uppercase font-bold text-muted-foreground/70 tracking-wider">Raza</p>
            <p className="text-sm font-semibold text-foreground truncate" title={breedLabel}>{breedLabel}</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] uppercase font-bold text-muted-foreground/70 tracking-wider">Peso</p>
            <p className="text-sm font-semibold text-foreground truncate">{weight}</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] uppercase font-bold text-muted-foreground/70 tracking-wider">Nacimiento</p>
            <p className="text-sm font-semibold text-foreground truncate">{birthDate}</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] uppercase font-bold text-muted-foreground/70 tracking-wider">Edad</p>
            <p className="text-sm font-semibold text-foreground truncate">{ageMonths} meses</p>
          </div>
        </div>

        {/* Separator */}
        <div className="h-px bg-border/40 w-full" />

        {/* Padres */}
        <div className="grid grid-cols-2 gap-4 pt-1">
          <div className="space-y-0.5">
            <p className="text-[10px] uppercase font-bold text-muted-foreground/70 tracking-wider">Padre</p>
            {onFatherClick && (animal.idFather || animal.father_id) ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onFatherClick(animal.idFather || animal.father_id);
                }}
                className="text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:underline truncate w-full text-left transition-colors"
              >
                {fatherLabel}
              </button>
            ) : (
              <p className="text-sm text-muted-foreground font-medium truncate">{fatherLabel}</p>
            )}
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] uppercase font-bold text-muted-foreground/70 tracking-wider">Madre</p>
            {onMotherClick && (animal.idMother || animal.mother_id) ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMotherClick(animal.idMother || animal.mother_id);
                }}
                className="text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:underline truncate w-full text-left transition-colors"
              >
                {motherLabel}
              </button>
            ) : (
              <p className="text-sm text-muted-foreground font-medium truncate">{motherLabel}</p>
            )}
          </div>
        </div>

        {/* Acciones Footer */}
        {!hideFooterActions && (
          <div className="mt-auto pt-3 flex items-center justify-center gap-2">
            {/* Si se pasan acciones personalizadas (legacy), las mostramos, sino usamos el nuevo layout */}
            {actions ? (
              actions
            ) : (
              // Default actions if no 'actions' prop provided, o layout mixto
              <div className="flex items-center gap-2 w-full justify-evenly">
                {/* Ver Detalle */}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 p-0 rounded-lg border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                  onClick={(e) => { e.stopPropagation(); onCardClick?.(); }}
                  title="Ver Detalle"
                >
                  <Eye className="h-4 w-4" />
                </Button>

                {/* Eliminar del Campo - SÓLO si se pasa la función */}
                {onRemoveFromField && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 w-9 p-0 rounded-lg border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveFromField();
                    }}
                    title="Quitar del campo"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                <AnimalActionsMenu animal={animal} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
