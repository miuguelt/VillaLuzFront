import { useEffect } from 'react';
import { useForm, FieldError } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { speciesService } from '@/entities/species/api/species.service';
import type { SpeciesInput } from '@/shared/api/generated/swaggerTypes';

// Reducimos el formulario a los campos realmente soportados por el backend
export type SpeciesFormFields = Pick<SpeciesInput, 'name'>;

export default function SpeciesForm() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SpeciesFormFields>();

  useEffect(() => {
    if (id) {
      speciesService.getSpeciesById(id).then((species: any) => {
        setValue('name', species.name || '');
      });
    }
  }, [id, setValue]);

  const onSubmit = async (data: SpeciesFormFields) => {
    try {
      const payload: SpeciesInput = {
        name: data.name,
      };
      if (id) {
        await speciesService.updateSpecies(id, payload);
      } else {
        await speciesService.createSpecies(payload);
      }
      navigate('/admin/species');
    } catch (error: any) {
      const msg =
        error?.response?.data?.message || error?.message || 'Error al guardar especie';
      alert(msg);
    }
  };

  const renderError = (err: unknown) => {
    if (!err) return null;
    if (typeof err === 'string') return <span>{err}</span>;
    if (typeof err === 'object' && err && 'message' in err)
      return <span>{(err as FieldError).message}</span>;
    return null;
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium">Nombre de la especie</label>
        <input
          className="mt-1 w-full border rounded px-3 py-2"
          {...register('name', { required: 'El nombre es obligatorio' })}
        />
        <p className="text-red-600 text-sm">{renderError(errors.name)}</p>
      </div>
      <button type="submit" disabled={isSubmitting} className="btn btn-primary">
        {id ? 'Actualizar' : 'Crear'} especie
      </button>
    </form>
  );
}
