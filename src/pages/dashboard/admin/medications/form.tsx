import { useEffect } from 'react';
import { useForm, FieldError } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { medicationsService } from '@/services/medicationsService';

export type MedicationFormFields = {
  name: string;
};

export default function MedicationForm() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<MedicationFormFields>();

  useEffect(() => {
    if (id) {
      medicationsService.getMedicationById(id).then((medication: any) => {
        setValue('name', medication.name);
      });
    }
  }, [id, setValue]);

  const onSubmit = async (data: MedicationFormFields) => {
    try {
      if (id) {
        await medicationsService.updateMedication(id, { name: data.name });
      } else {
        await medicationsService.createMedication({ name: data.name });
      }
      navigate('/admin/medications')
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Error al guardar medicamento';
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
        <label>Nombre del medicamento</label>
        <input {...register('name', { required: 'El nombre es obligatorio' })} />
        {renderError(errors.name)}
      </div>
      <button type="submit" disabled={isSubmitting}>{id ? 'Actualizar' : 'Crear'} medicamento</button>
    </form>
  );
}
