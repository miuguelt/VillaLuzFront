import { useEffect } from 'react';
import { useForm, FieldError } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { breedsService } from '@/entities/breed/api/breeds.service';

export type BreedFormFields = {
  name: string;
  species_id: number;
};

export default function BreedForm() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<BreedFormFields>();

  useEffect(() => {
    if (id) {
      breedsService.getBreedById(id).then((breed: any) => {
        setValue('name', breed.name);
        setValue('species_id', breed.species_id);
      });
    }
  }, [id, setValue]);

  const onSubmit = async (data: BreedFormFields) => {
    try {
      if (id) {
        await breedsService.updateBreed(id, { name: data.name, species_id: data.species_id });
      } else {
        await breedsService.createBreed({ name: data.name, species_id: data.species_id });
      }
      navigate('/admin/breeds');
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Error al guardar raza';
      alert(msg);
    }
  };

  const renderError = (err: unknown) => {
    if (!err) return null;
    if (typeof err === 'string') return <span>{err}</span>;
    if (typeof err === 'object' && err && 'message' in err) return <span>{(err as FieldError).message}</span>;
    return null;
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <label>Nombre de la raza</label>
        <input {...register('name', { required: 'El nombre es obligatorio' })} />
        {renderError(errors.name)}
      </div>
      <div>
        <label>ID de especie</label>
        <input type="number" {...register('species_id', { required: 'El ID de especie es obligatorio', valueAsNumber: true })} />
        {renderError(errors.species_id)}
      </div>
      <button type="submit" disabled={isSubmitting}>{id ? 'Actualizar' : 'Crear'} raza</button>
    </form>
  );
}
