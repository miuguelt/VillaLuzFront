import React, { useState } from 'react';
import { MoreVertical, PawPrint } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { GenericModal } from '@/shared/ui/common/GenericModal';
import { BreedResponse } from '@/shared/api/generated/swaggerTypes';
import { Badge } from '@/shared/ui/badge';

// Importar servicios
import { animalsService } from '@/entities/animal/api/animal.service';

interface BreedActionsMenuProps {
  breed: BreedResponse;
}

export const BreedActionsMenu: React.FC<BreedActionsMenuProps> = ({ breed }) => {
  const [showAnimalsModal, setShowAnimalsModal] = useState(false);
  const [animals, setAnimals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadAnimals = async () => {
    setLoading(true);
    try {
      const result = await animalsService.getAnimals({ page: 1, limit: 1000 });
      const animalsData = Array.isArray(result) ? result : (result?.data || result?.items || []);

      // Filtrar animales por breed_id
      const filteredAnimals = animalsData.filter((animal: any) => animal.breed_id === breed.id);
      setAnimals(filteredAnimals);
    } catch (err) {
      console.error('Error loading animals:', err);
      setAnimals([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAnimalsModal = () => {
    setShowAnimalsModal(true);
    loadAnimals();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Sano':
        return 'bg-green-100 text-green-800';
      case 'Enfermo':
        return 'bg-red-100 text-red-800';
      case 'En tratamiento':
        return 'bg-yellow-100 text-yellow-800';
      case 'En observación':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderAnimalsList = () => {
    if (loading) {
      return (
        <div className="py-10 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando animales...</p>
        </div>
      );
    }

    if (animals.length === 0) {
      return (
        <div className="py-10 text-center">
          <p className="text-muted-foreground">No hay animales registrados para esta raza</p>
        </div>
      );
    }

    return (
      <div className="space-y-3 max-h-[500px] overflow-y-auto">
        {animals.map((animal, index) => (
          <div
            key={animal.id || index}
            className="border border-border rounded-lg p-4 bg-card hover:bg-accent/50 transition-colors"
          >
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="font-medium text-foreground">Registro:</span>
                <span className="text-muted-foreground font-semibold">{animal.record || '-'}</span>
              </div>

              {animal.name && (
                <div className="flex justify-between">
                  <span className="font-medium text-foreground">Nombre:</span>
                  <span className="text-muted-foreground">{animal.name}</span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="font-medium text-foreground">Estado:</span>
                <Badge className={`text-xs ${getStatusColor(animal.status)}`}>
                  {animal.status || 'Sin estado'}
                </Badge>
              </div>

              <div className="flex justify-between">
                <span className="font-medium text-foreground">Género:</span>
                <span className="text-muted-foreground">{animal.gender || '-'}</span>
              </div>

              <div className="flex justify-between">
                <span className="font-medium text-foreground">Fecha de Nacimiento:</span>
                <span className="text-muted-foreground">
                  {animal.birth_date ? new Date(animal.birth_date).toLocaleDateString('es-ES') : '-'}
                </span>
              </div>

              {animal.weight && (
                <div className="flex justify-between">
                  <span className="font-medium text-foreground">Peso:</span>
                  <span className="text-muted-foreground">{animal.weight} kg</span>
                </div>
              )}

              {animal.notes && (
                <div>
                  <span className="font-medium text-foreground">Notas:</span>
                  <p className="text-muted-foreground mt-1">{animal.notes}</p>
                </div>
              )}

              <div className="flex justify-between">
                <span className="font-medium text-foreground">Creado:</span>
                <span className="text-muted-foreground">
                  {animal.created_at ? new Date(animal.created_at).toLocaleDateString('es-ES') : '-'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="icon-btn p-1.5 hover:bg-accent rounded-md transition-colors"
            onClick={(e) => e.stopPropagation()}
            title="Más acciones"
            aria-label="Más acciones"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              handleOpenAnimalsModal();
            }}
            className="cursor-pointer"
          >
            <PawPrint className="mr-2 h-4 w-4" />
            Ver Animales
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <GenericModal
        isOpen={showAnimalsModal}
        onOpenChange={setShowAnimalsModal}
        title={`Animales de la raza ${breed.name || 'Raza'}`}
        description={`Listado de animales registrados`}
        size="2xl"
        enableBackdropBlur
        className="bg-card/95 backdrop-blur-md text-card-foreground border-border/50"
      >
        <div className="space-y-4">
          {renderAnimalsList()}
        </div>
      </GenericModal>
    </>
  );
};
