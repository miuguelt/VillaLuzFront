import React, { useState, useEffect } from 'react';
import { GenericModal } from '@/components/common/GenericModal';
import { fieldService } from '@/services/fieldService';
import { AnimalCard } from '@/components/dashboard/animals/AnimalCard';
import { AnimalResponse, FieldResponse } from '@/types/swaggerTypes';
import { Button } from '@/components/ui/button';
import { Eye, Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AnimalActionsMenu } from '@/components/dashboard/AnimalActionsMenu';
import { AnimalModalContent } from '@/components/dashboard/animals/AnimalModalContent';
import { animalsService } from '@/services/animalService';

interface FieldAnimalsModalProps {
    field: FieldResponse | null;
    isOpen: boolean;
    onClose: () => void;
}

export const FieldAnimalsModal: React.FC<FieldAnimalsModalProps> = ({ field, isOpen, onClose }) => {
    const [animals, setAnimals] = useState<AnimalResponse[]>([]);
    const [loading, setLoading] = useState(false);
    const [detailAnimal, setDetailAnimal] = useState<AnimalResponse | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (isOpen && field?.id) {
            loadAnimals();
        } else {
            setAnimals([]);
        }
    }, [isOpen, field?.id]);

    const loadAnimals = async () => {
        if (!field?.id) return;
        setLoading(true);
        try {
            const data = await fieldService.getAnimalsByField(field.id);
            setAnimals(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error loading field animals:', error);
            setAnimals([]);
        } finally {
            setLoading(false);
        }
    };

    const getBreedLabel = (animal: any) =>
        animal.breed?.name || animal.breed_name || `ID ${animal.breed_id ?? animal.breeds_id ?? '-'}`;

    const getFatherLabel = (animal: any) =>
        animal.father?.record || animal.father_record || `${animal.idFather ?? animal.father_id ?? '-'}`;

    const getMotherLabel = (animal: any) =>
        animal.mother?.record || animal.mother_record || `${animal.idMother ?? animal.mother_id ?? '-'}`;

    const handleRemoveFromField = async (animalId: number) => {
        if (!confirm('¿Estás seguro de que quieres quitar este animal del potrero?')) return;

        try {
            await animalsService.update(animalId, { field_id: null } as any);
            // Remove locally
            setAnimals(prev => prev.filter(a => Number(a.id) !== Number(animalId)));
        } catch (error) {
            console.error('Error removing animal from field:', error);
            alert('Error al quitar el animal del potrero');
        }
    };

    return (
        <>
            <GenericModal
                isOpen={isOpen}
                onOpenChange={(open) => !open && onClose()}
                title={field ? `Animales en ${field.name || 'Potrero'} (${animals.length})` : 'Animales en Potrero'}
                description={field ? `Ubicación: ${(field as any).ubication || field.location || '-'}` : undefined}
                size="5xl"
                enableBackdropBlur
            >
                {loading ? (
                    <div className="py-10 text-center text-sm text-muted-foreground">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                        Cargando animales...
                    </div>
                ) : animals.length === 0 ? (
                    <div className="py-10 text-center text-sm text-muted-foreground">
                        No hay animales registrados en este potrero.
                    </div>
                ) : (

                    <div className="grid auto-cols-[minmax(260px,1fr)] grid-flow-col gap-4 overflow-x-auto pb-4 px-1 snap-x snap-mandatory md:auto-cols-auto md:grid-flow-row md:grid-cols-2 lg:grid-cols-3 md:overflow-visible">
                        {animals.map((animal) => (
                            <div
                                key={animal.id}
                                className="snap-center h-full"
                            >
                                <AnimalCard
                                    animal={animal}
                                    breedLabel={getBreedLabel(animal)}
                                    fatherLabel={getFatherLabel(animal)}
                                    motherLabel={getMotherLabel(animal)}
                                    onCardClick={() => setDetailAnimal(animal)}
                                    onRemoveFromField={() => handleRemoveFromField(Number(animal.id))}
                                    actions={
                                        <div className="flex items-center gap-2 w-full justify-between px-2">
                                            {/* Ver Detalle */}
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 w-8 p-0 rounded-md border-border/60 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                                onClick={(e) => { e.stopPropagation(); setDetailAnimal(animal); }}
                                                title="Ver Detalle"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>

                                            {/* Editar */}
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 w-8 p-0 rounded-md border-border/60 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                                                onClick={(e) => { e.stopPropagation(); navigate(`/admin/animals?edit=${animal.id}`); }}
                                                title="Editar"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>

                                            {/* Eliminar del Campo */}
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 w-8 p-0 rounded-md border-border/60 hover:border-red-300 hover:bg-red-50 hover:text-red-600 transition-colors"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRemoveFromField(Number(animal.id));
                                                }}
                                                title="Quitar del campo"
                                            >
                                                <span className="sr-only">Quitar</span>
                                                {/* Usando un icono de basura o 'x' para representar quitar del grupo */}
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>
                                            </Button>

                                            {/* Más Acciones */}
                                            <AnimalActionsMenu animal={animal} />
                                        </div>
                                    }
                                    onFatherClick={async (fatherId) => {
                                        try {
                                            const father = await animalsService.getById(fatherId);
                                            if (father) setDetailAnimal(father);
                                        } catch (e) {
                                            console.error('Error fetching father', e);
                                        }
                                    }}
                                    onMotherClick={async (motherId) => {
                                        try {
                                            const mother = await animalsService.getById(motherId);
                                            if (mother) setDetailAnimal(mother);
                                        } catch (e) {
                                            console.error('Error fetching mother', e);
                                        }
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </GenericModal>

            {/* Detail Modal */}
            {detailAnimal && (
                <GenericModal
                    isOpen={!!detailAnimal}
                    onOpenChange={(open) => !open && setDetailAnimal(null)}
                    title={`Detalle del Animal: ${detailAnimal.record || detailAnimal.id}`}
                    size="5xl"
                    enableBackdropBlur
                >
                    <AnimalModalContent
                        animal={detailAnimal as any}
                        breedLabel={getBreedLabel(detailAnimal)}
                        fatherLabel={getFatherLabel(detailAnimal)}
                        motherLabel={getMotherLabel(detailAnimal)}
                    />
                </GenericModal>
            )}
        </>
    );
};
