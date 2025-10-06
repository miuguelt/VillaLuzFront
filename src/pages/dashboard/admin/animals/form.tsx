
import { useEffect, useState } from 'react';
import { useForm, FieldError } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { animalsService } from '@/services/animalService';
import { breedsService } from '@/services/breedsService';
import { useSpecies } from '@/hooks/species/useSpecies';
import { useBreeds } from '@/hooks/breed/useBreeds';
import { useForeignKeySelect } from '@/hooks/useForeignKeySelect';
import { Combobox } from '@/components/ui/combobox';
import { Plus, Edit } from 'lucide-react';
import { getTodayColombia } from '@/utils/dateUtils';

type AnimalStatus = 'Sano' | 'Enfermo' | 'En tratamiento' | 'En observación' | 'Cuarentena' | 'Vendido' | 'Fallecido';
type AnimalGender = 'Macho' | 'Hembra' | 'Castrado';
type AnimalFormFields = {
  // eliminado: name
  species_id: number;
  breed_id: number;
  record: string;
  birth_date: string;
  weight: number;
  gender: AnimalGender;
  status: AnimalStatus;
  notes?: string;
};

export default function AnimalForm() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<AnimalFormFields>();
  
  // Cargar especies disponibles
  const { species } = useSpecies();
  
  // Estado para razas filtradas por especie
  const [breeds, setBreeds] = useState<any[]>([]);
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<number | null>(null);
  const [selectedBreedId, setSelectedBreedId] = useState<number | null>(null);
  const [loadingBreeds, setLoadingBreeds] = useState(false);

  useEffect(() => {
    if (id) {
      animalsService.getAnimalById(Number(id)).then((animal: any) => {
        // eliminado: setValue('name', animal.name)
        setValue('species_id', animal.species_id);
        setSelectedSpeciesId(animal.species_id);
        setValue('breed_id', animal.breed_id);
        setSelectedBreedId(animal.breed_id);
        // Mapear estado del detalle a opciones válidas del formulario
        const s = String(animal.status || '').toLowerCase();
        const mappedStatus: AnimalStatus = s === 'sano' ? 'Sano'
          : s === 'enfermo' ? 'Enfermo'
          : s === 'en tratamiento' ? 'En tratamiento'
          : s === 'en observación' ? 'En observación'
          : s === 'cuarentena' ? 'Cuarentena'
          : s === 'vendido' ? 'Vendido'
          : s === 'fallecido' || s === 'muerto' ? 'Fallecido'
          : 'Sano';
        setValue('status', mappedStatus);
        setValue('record', animal.record);
        setValue('birth_date', animal.birth_date);
        setValue('weight', animal.weight || 0);
        setValue('gender', animal.gender);
        setValue('notes', animal.notes);

        // Cargar razas para la especie seleccionada
        if (animal.species_id) {
          loadBreedsBySpecies(animal.species_id);
        }
      });
    }
  }, [id, setValue]);

  // Función para cargar razas por especie
  const loadBreedsBySpecies = async (speciesId: number) => {
    setLoadingBreeds(true);
    try {
      const breedsData = await breedsService.getBreedsBySpecies(speciesId.toString());
      setBreeds(breedsData);
    } catch (error) {
      console.error('Error al cargar razas:', error);
      setBreeds([]);
    } finally {
      setLoadingBreeds(false);
    }
  };

  const onSubmit = async (data: AnimalFormFields) => {
    try {
      if (id) {
        await animalsService.updateAnimal(Number(id), data);
      } else {
        await animalsService.createAnimal(data);
      }
      navigate('/admin/animals');
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Error al guardar animal';
      alert(msg);
    }
  };

  const renderError = (err: unknown) => {
    if (!err) return null;
    if (typeof err === 'string') return <span>{err}</span>;
    if (typeof err === 'object' && err && 'message' in err) return <span>{(err as FieldError).message}</span>;
    return null;
  };

  const speciesOptions = species.map((specie) => ({
    value: String(specie.id),
    label: specie.name
  }));

  const breedOptions = breeds.map((breed) => ({
    value: String(breed.id),
    label: breed.name
  }));

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* eliminado: campo Nombre */}
      <div>
        <label>Especie</label>
        <input type="hidden" {...register('species_id', { required: 'La especie es obligatoria' })} />
        <Combobox
          options={speciesOptions}
          value={selectedSpeciesId ? String(selectedSpeciesId) : undefined}
          onValueChange={(value) => {
            const speciesId = Number(value);
            setSelectedSpeciesId(speciesId);
            setValue('species_id', speciesId);
            setValue('breed_id', 0);
            setSelectedBreedId(null);

            if (speciesId) {
              loadBreedsBySpecies(speciesId);
            } else {
              setBreeds([]);
            }
          }}
          placeholder="Seleccionar"
          searchPlaceholder="Buscar"
          emptyMessage="Sin resultados"
        />
        {renderError(errors.species_id)}
      </div>
      <div>
        <label>Raza</label>
        <input type="hidden" {...register('breed_id', { required: 'La raza es obligatoria' })} />
        <Combobox
          options={breedOptions}
          value={selectedBreedId ? String(selectedBreedId) : undefined}
          onValueChange={(value) => {
            const breedId = Number(value);
            setSelectedBreedId(breedId);
            setValue('breed_id', breedId);
          }}
          placeholder="Seleccionar"
          searchPlaceholder="Buscar"
          emptyMessage={loadingBreeds ? "Cargando..." : "Sin resultados"}
          disabled={!selectedSpeciesId || loadingBreeds}
        />
        {renderError(errors.breed_id)}
      </div>
      <div>
        <label>Registro</label>
        <input {...register('record', { required: 'El registro es obligatorio' })} />
        {renderError(errors.record)}
      </div>
      <div>
        <label>Fecha de nacimiento</label>
        <input
          type="date"
          max={getTodayColombia()}
          {...register('birth_date', {
            required: 'La fecha de nacimiento es obligatoria',
            validate: value => {
              if (!value) return true;
              const selectedDate = new Date(value);
              const today = new Date();
              today.setHours(0, 0, 0, 0); // Resetear hora para comparación justa
              return selectedDate <= today || 'La fecha de nacimiento no puede ser futura';
            }
          })}
        />
        {renderError(errors.birth_date)}
      </div>
      <div>
        <label>Peso (kg)</label>
        <input type="number" step="0.01" {...register('weight', { required: 'El peso es obligatorio', min: { value: 0.01, message: 'El peso debe ser mayor a 0' } })} />
        {renderError(errors.weight)}
      </div>
      <div>
        <label>Género</label>
        <select {...register('gender', { required: 'El género es obligatorio' })}>
          <option value="">Seleccione</option>
          <option value="Macho">Macho</option>
          <option value="Hembra">Hembra</option>
        </select>
        {renderError(errors.gender)}
      </div>
      <div>
        <label>Estado</label>
        <select {...register('status', { required: 'El estado es obligatorio' })}>
          <option value="">Seleccione</option>
          <option value="Vivo">Vivo</option>
          <option value="Muerto">Muerto</option>
          <option value="Vendido">Vendido</option>
        </select>
        {renderError(errors.status)}
      </div>
      <div>
        <label>Notas</label>
        <textarea {...register('notes')} placeholder="Observaciones o notas adicionales" />
        {renderError(errors.notes)}
      </div>
      <button type="submit" disabled={isSubmitting} className="flex items-center gap-2" aria-label={id ? 'Actualizar animal' : 'Crear animal'}>
        {id ? <><Edit className="h-4 w-4" /> Actualizar animal</> : <><Plus className="h-4 w-4" /> Crear animal</>}
      </button>
    </form>
  );
}
