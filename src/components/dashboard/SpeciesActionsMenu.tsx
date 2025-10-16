import React, { useState, useEffect } from 'react';
import { MoreVertical, List } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { GenericModal } from '@/components/common/GenericModal';
import { SpeciesResponse } from '@/types/swaggerTypes';

// Importar servicios
import { breedsService } from '@/services/breedsService';

interface SpeciesActionsMenuProps {
  species: SpeciesResponse;
}

export const SpeciesActionsMenu: React.FC<SpeciesActionsMenuProps> = ({ species }) => {
  const [showBreedsModal, setShowBreedsModal] = useState(false);
  const [breeds, setBreeds] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadBreeds = async () => {
    setLoading(true);
    try {
      const result = await breedsService.getBreeds({ page: 1, limit: 1000 });
      const breedsData = Array.isArray(result) ? result : (result?.data || result?.items || []);

      // Filtrar razas por species_id
      const filteredBreeds = breedsData.filter((breed: any) => breed.species_id === species.id);
      setBreeds(filteredBreeds);
    } catch (err) {
      console.error('Error loading breeds:', err);
      setBreeds([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenBreedsModal = () => {
    setShowBreedsModal(true);
    loadBreeds();
  };

  const renderBreedsList = () => {
    if (loading) {
      return (
        <div className="py-10 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando razas...</p>
        </div>
      );
    }

    if (breeds.length === 0) {
      return (
        <div className="py-10 text-center">
          <p className="text-muted-foreground">No hay razas registradas para esta especie</p>
        </div>
      );
    }

    return (
      <div className="space-y-3 max-h-[500px] overflow-y-auto">
        {breeds.map((breed, index) => (
          <div
            key={breed.id || index}
            className="border border-border rounded-lg p-4 bg-card hover:bg-accent/50 transition-colors"
          >
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="font-medium text-foreground">Nombre:</span>
                <span className="text-muted-foreground">{breed.name || '-'}</span>
              </div>
              {breed.description && (
                <div>
                  <span className="font-medium text-foreground">Descripción:</span>
                  <p className="text-muted-foreground mt-1">{breed.description}</p>
                </div>
              )}
              {breed.characteristics && (
                <div>
                  <span className="font-medium text-foreground">Características:</span>
                  <p className="text-muted-foreground mt-1">{breed.characteristics}</p>
                </div>
              )}
              <div className="flex justify-between">
                <span className="font-medium text-foreground">Creado:</span>
                <span className="text-muted-foreground">
                  {breed.created_at ? new Date(breed.created_at).toLocaleDateString('es-ES') : '-'}
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
              handleOpenBreedsModal();
            }}
            className="cursor-pointer"
          >
            <List className="mr-2 h-4 w-4" />
            Ver Razas
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <GenericModal
        isOpen={showBreedsModal}
        onOpenChange={setShowBreedsModal}
        title={`Razas de ${species.name || 'Especie'}`}
        description={`Listado de razas registradas`}
        size="2xl"
        enableBackdropBlur
        className="bg-card/95 backdrop-blur-md text-card-foreground border-border/50"
      >
        <div className="space-y-4">
          {renderBreedsList()}
        </div>
      </GenericModal>
    </>
  );
};
